import { readFile } from 'node:fs/promises'
import { parsePackageIndex } from '../src/lib/schemas/packageIndex'
import { getArgValue } from './args'

const MIB = 1024 * 1024
const WARNING_BYTES = 10 * MIB
const ERROR_BYTES = 20 * MIB
const MIN_FORMULA_COUNT = 1000
const MIN_CASK_COUNT = 1000

function getNumberArg(args: string[], name: string, fallback: number): number {
  const rawValue = getArgValue(args, name, String(fallback))
  const value = Number(rawValue)
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be a number`)
  }
  return value
}

async function main() {
  const args = process.argv.slice(2)
  const indexPath = getArgValue(args, '--index', 'public/package-index.json')
  const minFormulaCount = getNumberArg(args, '--min-formula-count', MIN_FORMULA_COUNT)
  const minCaskCount = getNumberArg(args, '--min-cask-count', MIN_CASK_COUNT)
  const content = await readFile(indexPath, 'utf8')
  const index = parsePackageIndex(JSON.parse(content))
  const size = Buffer.byteLength(content)

  if (index.counts.formula < minFormulaCount) {
    throw new Error(`formula count is too small: ${index.counts.formula}`)
  }
  if (index.counts.cask < minCaskCount) {
    throw new Error(`cask count is too small: ${index.counts.cask}`)
  }
  if (size > ERROR_BYTES) {
    throw new Error(`${indexPath} is too large: ${formatBytes(size)} > ${formatBytes(ERROR_BYTES)}`)
  }
  if (size > WARNING_BYTES) {
    console.warn(`${indexPath} is larger than warning threshold: ${formatBytes(size)} > ${formatBytes(WARNING_BYTES)}`)
  }

  console.log(`${indexPath}: ${formatBytes(size)}; ${index.counts.formula} formulae, ${index.counts.cask} casks`)
}

function formatBytes(bytes: number): string {
  return `${(bytes / MIB).toFixed(2)} MiB`
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
