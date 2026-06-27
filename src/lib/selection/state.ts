import type { LocaleText, PackageType, Preset } from '../schemas/preset'

export const PICKER_STATE_SCHEMA_VERSION = 1 as const

export type PackageSource = 'preset' | 'manual' | 'import'

export type PickerPackage = {
  type: PackageType
  token: string
  selected: boolean
  source: PackageSource
  order: number
  presetId?: string
  sectionId?: string
  sectionName?: LocaleText
  masId?: number
}

export type PassthroughEntry = {
  id: string
  line: string
  source: 'manual' | 'import'
}

export type PickerState = {
  schemaVersion: typeof PICKER_STATE_SCHEMA_VERSION
  basePresetId: string
  basePresetRevision: string
  packages: PickerPackage[]
  passthrough: PassthroughEntry[]
}

type PackageKeyInput = Pick<PickerPackage, 'type' | 'token' | 'masId'>

export function packageKey(pkg: PackageKeyInput): string {
  const token = pkg.type === 'mas' && pkg.masId !== undefined ? String(pkg.masId) : pkg.token.trim()
  return `${pkg.type}:${token}`
}

export function createPickerStateFromPreset(preset: Preset): PickerState {
  let order = 0
  return {
    schemaVersion: PICKER_STATE_SCHEMA_VERSION,
    basePresetId: preset.id,
    basePresetRevision: preset.revision,
    packages: preset.sections.flatMap((section) =>
      section.packages.map((pkg) => ({
        type: pkg.type,
        token: pkg.token,
        selected: pkg.selected === true,
        source: 'preset' as const,
        order: order++,
        presetId: preset.id,
        sectionId: section.id,
        sectionName: section.name,
      })),
    ),
    passthrough: [],
  }
}

export function getSelectedPackages(state: PickerState): PickerPackage[] {
  return state.packages.filter((pkg) => pkg.selected)
}

export function getPackageByKey(state: PickerState, key: string): PickerPackage | undefined {
  return state.packages.find((pkg) => packageKey(pkg) === key)
}

export function setPackageSelected(state: PickerState, key: string, selected: boolean): PickerState {
  return {
    ...state,
    packages: state.packages.map((pkg) => (packageKey(pkg) === key ? { ...pkg, selected } : pkg)),
  }
}

export function upsertPackage(
  state: PickerState,
  pkg: Pick<PickerPackage, 'type' | 'token'> & Partial<Pick<PickerPackage, 'selected' | 'source' | 'masId'>>,
): PickerState {
  const normalized: PickerPackage = {
    type: pkg.type,
    token: pkg.token.trim(),
    selected: pkg.selected ?? true,
    source: pkg.source ?? 'manual',
    order: Number.MAX_SAFE_INTEGER,
    masId: pkg.masId,
  }
  const key = packageKey(normalized)
  const existing = getPackageByKey(state, key)

  if (existing) {
    return setPackageSelected(state, key, normalized.selected)
  }

  return {
    ...state,
    packages: [...state.packages, normalized],
  }
}
