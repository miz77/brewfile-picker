import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { createPackageIndex, HOMEBREW_CASK_API_URL, HOMEBREW_FORMULA_API_URL } from '../src/lib/homebrew-index/normalize'
import { getArgValue } from './args'

async function readJsonArrayFromFile(path: string): Promise<unknown[]> {
  const content = await readFile(path, 'utf8')
  const parsed: unknown = JSON.parse(content)
  if (!Array.isArray(parsed)) {
    throw new Error(`${path} must contain a JSON array`)
  }
  return parsed
}

async function fetchJsonArray(url: string): Promise<unknown[]> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`)
  }

  const parsed: unknown = await response.json()
  if (!Array.isArray(parsed)) {
    throw new Error(`${url} returned non-array JSON`)
  }
  return parsed
}

async function main() {
  const args = process.argv.slice(2)
  const output = getArgValue(args, '--output', 'public/package-index.json')
  const formulaFile = getArgValue(args, '--formula-file', '')
  const caskFile = getArgValue(args, '--cask-file', '')

  const formulaRaw = formulaFile
    ? await readJsonArrayFromFile(formulaFile)
    : await fetchJsonArray(HOMEBREW_FORMULA_API_URL)
  const caskRaw = caskFile ? await readJsonArrayFromFile(caskFile) : await fetchJsonArray(HOMEBREW_CASK_API_URL)
  const index = createPackageIndex(formulaRaw, caskRaw)

  await mkdir(dirname(output), { recursive: true })
  await writeFile(output, `${JSON.stringify(index)}\n`)

  console.log(
    `Wrote ${output}: ${index.counts.formula} formulae, ${index.counts.cask} casks, generated at ${index.generatedAt}`,
  )
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
