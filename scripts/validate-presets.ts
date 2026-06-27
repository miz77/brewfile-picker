import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parse } from 'yaml'
import { hasFlag, getArgValue } from './args'
import { parsePackageIndex, type PackageIndex } from '../src/lib/schemas/packageIndex'
import { parsePreset, type Preset, type PresetPackage } from '../src/lib/schemas/preset'

async function readPackageIndex(path: string): Promise<PackageIndex> {
  const content = await readFile(path, 'utf8')
  return parsePackageIndex(JSON.parse(content))
}

async function readPresets(directory: string): Promise<Array<{ file: string; preset: Preset }>> {
  const files = (await readdir(directory)).filter((file) => file.endsWith('.yml') || file.endsWith('.yaml')).sort()
  return Promise.all(
    files.map(async (file) => {
      const content = await readFile(join(directory, file), 'utf8')
      return {
        file,
        preset: parsePreset(parse(content)),
      }
    }),
  )
}

function findFormula(token: string, index: PackageIndex) {
  return (
    index.formula[token] ??
    Object.values(index.formula).find(
      (entry) => entry.aliases.includes(token) || entry.oldNames.includes(token),
    )
  )
}

function findCask(token: string, index: PackageIndex) {
  return index.cask[token] ?? Object.values(index.cask).find((entry) => entry.oldTokens.includes(token))
}

function packageExists(pkg: PresetPackage, index: PackageIndex): boolean {
  if (pkg.type === 'brew') {
    return findFormula(pkg.token, index) !== undefined
  }
  if (pkg.type === 'cask') {
    return findCask(pkg.token, index) !== undefined
  }
  return true
}

function isDisabled(pkg: PresetPackage, index: PackageIndex): boolean {
  if (pkg.type === 'brew') {
    return findFormula(pkg.token, index)?.disabled === true
  }
  if (pkg.type === 'cask') {
    return findCask(pkg.token, index)?.disabled === true
  }
  return false
}

function validateUniqueIds(items: Array<{ id: string }>, label: string, errors: string[]) {
  const seen = new Set<string>()
  for (const item of items) {
    if (seen.has(item.id)) {
      errors.push(`duplicate ${label} id: ${item.id}`)
    }
    seen.add(item.id)
  }
}

async function main() {
  const args = process.argv.slice(2)
  const presetDir = getArgValue(args, '--presets', 'presets')
  const indexPath = getArgValue(args, '--index', 'public/package-index.json')
  const skipIndex = hasFlag(args, '--skip-index')
  const index = skipIndex ? null : await readPackageIndex(indexPath)
  const presets = await readPresets(presetDir)
  const errors: string[] = []
  const warnings: string[] = []

  validateUniqueIds(
    presets.map(({ preset }) => preset),
    'preset',
    errors,
  )

  for (const { file, preset } of presets) {
    validateUniqueIds(preset.sections, `${preset.id} section`, errors)

    for (const section of preset.sections) {
      for (const pkg of section.packages) {
        if (pkg.token.trim().length === 0) {
          errors.push(`${file}: ${section.id} has an empty package token`)
        }
        if (index && !packageExists(pkg, index)) {
          warnings.push(`${file}: ${pkg.type} "${pkg.token}" is not in package-index`)
        }
        if (index && isDisabled(pkg, index)) {
          warnings.push(`${file}: ${pkg.type} "${pkg.token}" is disabled`)
        }
      }
    }
  }

  for (const warning of warnings) {
    console.warn(`warning: ${warning}`)
  }
  if (errors.length > 0) {
    throw new Error(errors.join('\n'))
  }

  console.log(`Validated ${presets.length} preset file(s)${skipIndex ? ' without package-index' : ` against ${indexPath}`}`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
