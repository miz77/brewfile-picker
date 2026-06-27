import type { CaskIndexEntry, FormulaIndexEntry, PackageIndex } from '../schemas/packageIndex'
import type { PackageType } from '../schemas/preset'

export type IndexedPackageType = Extract<PackageType, 'brew' | 'cask'>
export type IndexedPackageEntry = FormulaIndexEntry | CaskIndexEntry

export function findFormulaEntry(token: string, index: PackageIndex): FormulaIndexEntry | undefined {
  const normalizedToken = token.trim()
  return (
    index.formula[normalizedToken] ??
    Object.values(index.formula).find(
      (entry) => entry.aliases.includes(normalizedToken) || entry.oldNames.includes(normalizedToken),
    )
  )
}

export function findCaskEntry(token: string, index: PackageIndex): CaskIndexEntry | undefined {
  const normalizedToken = token.trim()
  return (
    index.cask[normalizedToken] ??
    Object.values(index.cask).find((entry) => entry.oldTokens.includes(normalizedToken))
  )
}

export function findIndexEntry(
  type: PackageType,
  token: string,
  index: PackageIndex,
): IndexedPackageEntry | undefined {
  if (type === 'brew') {
    return findFormulaEntry(token, index)
  }
  if (type === 'cask') {
    return findCaskEntry(token, index)
  }
  return undefined
}
