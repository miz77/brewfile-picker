import * as v from 'valibot'

export const LocaleTextSchema = v.object({
  ja: v.string(),
  en: v.optional(v.string()),
})

export const PackageTypeSchema = v.union([
  v.literal('brew'),
  v.literal('cask'),
  v.literal('tap'),
  v.literal('mas'),
])

export const PresetPackageSchema = v.object({
  type: PackageTypeSchema,
  token: v.string(),
  selected: v.optional(v.boolean()),
})

export const PresetSectionSchema = v.object({
  id: v.string(),
  name: LocaleTextSchema,
  packages: v.array(PresetPackageSchema),
})

export const PresetSchema = v.object({
  id: v.string(),
  revision: v.string(),
  name: LocaleTextSchema,
  description: LocaleTextSchema,
  sections: v.array(PresetSectionSchema),
})

export type LocaleText = v.InferOutput<typeof LocaleTextSchema>
export type PackageType = v.InferOutput<typeof PackageTypeSchema>
export type PresetPackage = v.InferOutput<typeof PresetPackageSchema>
export type PresetSection = v.InferOutput<typeof PresetSectionSchema>
export type Preset = v.InferOutput<typeof PresetSchema>

export function parsePreset(input: unknown): Preset {
  return v.parse(PresetSchema, input)
}
