import { createPickerStateFromPreset, getSelectedPackages, upsertPackage, type PickerState } from '../selection/state'
import type { PackageType, Preset } from '../schemas/preset'
import type { SharePayload } from '../schemas/share'

type ShareableType = Extract<PackageType, 'tap' | 'brew' | 'cask'>

function isShareableType(type: PackageType): type is ShareableType {
  return type === 'tap' || type === 'brew' || type === 'cask'
}

function uniquePush(values: string[], value: string) {
  if (!values.includes(value)) {
    values.push(value)
  }
}

export function createSharePayload(state: PickerState): SharePayload {
  const selected: SharePayload['selected'] = {
    tap: [],
    brew: [],
    cask: [],
  }

  for (const pkg of getSelectedPackages(state)) {
    if (isShareableType(pkg.type)) {
      uniquePush(selected[pkg.type], pkg.token)
    }
  }

  return {
    version: 1,
    base: {
      presetId: state.basePresetId,
      revision: state.basePresetRevision,
    },
    selected,
  }
}

export function createStateFromSharePayload(preset: Preset, payload: SharePayload): PickerState {
  let state: PickerState = {
    ...createPickerStateFromPreset(preset),
    packages: createPickerStateFromPreset(preset).packages.map((pkg) => ({ ...pkg, selected: false })),
  }

  for (const type of ['tap', 'brew', 'cask'] as const) {
    for (const token of payload.selected[type]) {
      state = upsertPackage(state, { type, token, selected: true })
    }
  }

  return state
}

export function countUnsharedSelectedPackages(state: PickerState): number {
  return getSelectedPackages(state).filter((pkg) => !isShareableType(pkg.type)).length + state.passthrough.length
}
