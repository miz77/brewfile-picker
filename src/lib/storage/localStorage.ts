import * as v from 'valibot'
import { createPickerStateFromPreset, packageKey, type PickerPackage, type PickerState } from '../selection/state'
import { PackageTypeSchema, type Preset } from '../schemas/preset'

export const STORAGE_KEY = 'brewfile-picker:state:v1'

const StoredPackageSchema = v.object({
  type: PackageTypeSchema,
  token: v.string(),
  selected: v.boolean(),
  source: v.union([v.literal('preset'), v.literal('manual'), v.literal('import')]),
  order: v.number(),
  masId: v.optional(v.number()),
})

const StoredPassthroughSchema = v.object({
  id: v.string(),
  line: v.string(),
  source: v.union([v.literal('manual'), v.literal('import')]),
})

const StoredPickerStateSchema = v.object({
  schemaVersion: v.literal(1),
  basePresetId: v.string(),
  basePresetRevision: v.string(),
  savedAt: v.string(),
  packages: v.array(StoredPackageSchema),
  passthrough: v.array(StoredPassthroughSchema),
})

export type StoredPickerState = v.InferOutput<typeof StoredPickerStateSchema>

function compactPackage(pkg: PickerPackage): v.InferOutput<typeof StoredPackageSchema> {
  return {
    type: pkg.type,
    token: pkg.token,
    selected: pkg.selected,
    source: pkg.source,
    order: pkg.order,
    masId: pkg.masId,
  }
}

export function createStoredPickerState(state: PickerState, savedAt = new Date().toISOString()): StoredPickerState {
  return {
    schemaVersion: 1,
    basePresetId: state.basePresetId,
    basePresetRevision: state.basePresetRevision,
    savedAt,
    packages: state.packages.map(compactPackage),
    passthrough: state.passthrough,
  }
}

export function parseStoredPickerState(input: unknown): StoredPickerState {
  return v.parse(StoredPickerStateSchema, input)
}

export function restorePickerStateFromStored(preset: Preset, stored: StoredPickerState): PickerState {
  const base = createPickerStateFromPreset(preset)
  const storedByKey = new Map(stored.packages.map((pkg) => [packageKey(pkg), pkg]))
  const baseKeys = new Set(base.packages.map(packageKey))
  const restoredBasePackages = base.packages.map((pkg) => {
    const storedPackage = storedByKey.get(packageKey(pkg))
    return storedPackage ? { ...pkg, selected: storedPackage.selected } : pkg
  })
  const extraPackages = stored.packages
    .filter((pkg) => !baseKeys.has(packageKey(pkg)))
    .map((pkg) => ({
      type: pkg.type,
      token: pkg.token,
      selected: pkg.selected,
      source: pkg.source,
      order: pkg.order,
      masId: pkg.masId,
    }))

  return {
    ...base,
    basePresetRevision: stored.basePresetRevision,
    packages: [...restoredBasePackages, ...extraPackages],
    passthrough: stored.passthrough,
  }
}

export function loadStoredPickerState(key = STORAGE_KEY): StoredPickerState | null {
  const raw = globalThis.localStorage?.getItem(key)
  if (!raw) {
    return null
  }

  return parseStoredPickerState(JSON.parse(raw))
}

export function saveStoredPickerState(state: PickerState, key = STORAGE_KEY) {
  globalThis.localStorage?.setItem(key, JSON.stringify(createStoredPickerState(state)))
}

export function clearStoredPickerState(key = STORAGE_KEY) {
  globalThis.localStorage?.removeItem(key)
}
