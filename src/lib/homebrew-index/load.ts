import type { PackageIndex } from '../schemas/packageIndex'

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function parsePackageIndexForBrowser(input: unknown): PackageIndex {
  if (!isRecord(input)) {
    throw new Error('package-index must be an object')
  }
  if (input.schemaVersion !== 1) {
    throw new Error('unsupported package-index schema version')
  }
  if (!isRecord(input.counts) || typeof input.counts.formula !== 'number' || typeof input.counts.cask !== 'number') {
    throw new Error('package-index counts are invalid')
  }
  if (!isRecord(input.formula) || !isRecord(input.cask)) {
    throw new Error('package-index package maps are invalid')
  }

  return input as PackageIndex
}

export async function loadPackageIndex(path = '/package-index.json'): Promise<PackageIndex | null> {
  const response = await fetch(path, {
    headers: {
      accept: 'application/json',
    },
  })

  if (response.status === 404) {
    return null
  }
  if (!response.ok) {
    throw new Error(`Failed to load package index: ${response.status} ${response.statusText}`)
  }

  return parsePackageIndexForBrowser(await response.json())
}
