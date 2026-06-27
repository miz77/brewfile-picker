import { createPickerStateFromPreset, packageKey, upsertPackage, type PickerState } from '../selection/state'
import type { Preset } from '../schemas/preset'
import type { ParsedBrewfile } from './parser'

function addParsedPackages(state: PickerState, parsed: ParsedBrewfile): PickerState {
  return parsed.packages.reduce(
    (nextState, pkg) =>
      upsertPackage(nextState, {
        type: pkg.type,
        token: pkg.token,
        selected: true,
        source: 'import',
        masId: pkg.masId,
      }),
    state,
  )
}

function addPassthrough(state: PickerState, parsed: ParsedBrewfile): PickerState {
  const existing = new Set(state.passthrough.map((entry) => entry.line))
  const nextPassthrough = [
    ...state.passthrough,
    ...parsed.passthrough
      .filter((entry) => !existing.has(entry.line))
      .map((entry) => ({ id: `import-${entry.id}`, line: entry.line, source: 'import' as const })),
  ]

  return { ...state, passthrough: nextPassthrough }
}

export function createStateFromParsedBrewfile(preset: Preset, parsed: ParsedBrewfile): PickerState {
  const base = createPickerStateFromPreset(preset)
  const cleared: PickerState = {
    ...base,
    packages: base.packages.map((pkg) => ({ ...pkg, selected: false })),
  }

  return addPassthrough(addParsedPackages(cleared, parsed), parsed)
}

export function mergeParsedBrewfileIntoState(state: PickerState, parsed: ParsedBrewfile): PickerState {
  const withPackages = addParsedPackages(state, parsed)
  const selectedKeys = new Set(withPackages.packages.filter((pkg) => pkg.selected).map(packageKey))

  return {
    ...addPassthrough(withPackages, parsed),
    packages: withPackages.packages.map((pkg) => ({ ...pkg, selected: pkg.selected || selectedKeys.has(packageKey(pkg)) })),
  }
}
