import { getSelectedPackages, packageKey, type PickerPackage, type PickerState } from '../selection/state'
import type { PackageType } from '../schemas/preset'

const TYPE_ORDER: Record<PackageType, number> = {
  tap: 0,
  brew: 1,
  cask: 2,
  mas: 3,
}

function orderRank(pkg: PickerPackage): number {
  return pkg.source === 'preset' ? pkg.order : Number.MAX_SAFE_INTEGER
}

function comparePackages(a: PickerPackage, b: PickerPackage): number {
  return (
    TYPE_ORDER[a.type] - TYPE_ORDER[b.type] ||
    orderRank(a) - orderRank(b) ||
    a.token.localeCompare(b.token)
  )
}

function packageLine(pkg: PickerPackage): string {
  if (pkg.type === 'tap') {
    return `tap "${pkg.token}"`
  }
  if (pkg.type === 'mas') {
    return pkg.masId === undefined ? `mas "${pkg.token}"` : `mas "${pkg.token}", id: ${pkg.masId}`
  }
  return `${pkg.type} "${pkg.token}"`
}

export function createBrewfileLines(state: PickerState): string[] {
  const seen = new Set<string>()
  const packageLines = getSelectedPackages(state)
    .toSorted(comparePackages)
    .filter((pkg) => {
      const key = packageKey(pkg)
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
    .map(packageLine)

  const passthroughLines = state.passthrough.map((entry) => entry.line)
  if (packageLines.length > 0 && passthroughLines.length > 0) {
    return [...packageLines, '', ...passthroughLines]
  }

  return [...packageLines, ...passthroughLines]
}

export function exportBrewfile(state: PickerState): string {
  return createBrewfileLines(state).join('\n')
}
