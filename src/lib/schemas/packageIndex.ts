import * as v from 'valibot'

const NullableStringSchema = v.nullable(v.string())

export const FormulaIndexEntrySchema = v.object({
  type: v.literal('brew'),
  token: v.string(),
  fullName: v.string(),
  tap: v.string(),
  desc: v.string(),
  homepage: v.string(),
  aliases: v.array(v.string()),
  oldNames: v.array(v.string()),
  deprecated: v.boolean(),
  disabled: v.boolean(),
  deprecationReason: NullableStringSchema,
  disableReason: NullableStringSchema,
  replacement: NullableStringSchema,
})

export const CaskIndexEntrySchema = v.object({
  type: v.literal('cask'),
  token: v.string(),
  fullToken: v.string(),
  name: v.array(v.string()),
  desc: v.string(),
  homepage: v.string(),
  oldTokens: v.array(v.string()),
  deprecated: v.boolean(),
  disabled: v.boolean(),
  deprecationReason: NullableStringSchema,
  disableReason: NullableStringSchema,
  replacement: NullableStringSchema,
})

export const PackageIndexSchema = v.object({
  schemaVersion: v.literal(1),
  generatedAt: v.string(),
  counts: v.object({
    formula: v.number(),
    cask: v.number(),
  }),
  source: v.object({
    formula: v.string(),
    cask: v.string(),
  }),
  formula: v.record(v.string(), FormulaIndexEntrySchema),
  cask: v.record(v.string(), CaskIndexEntrySchema),
})

export type FormulaIndexEntry = v.InferOutput<typeof FormulaIndexEntrySchema>
export type CaskIndexEntry = v.InferOutput<typeof CaskIndexEntrySchema>
export type PackageIndex = v.InferOutput<typeof PackageIndexSchema>

export function parsePackageIndex(input: unknown): PackageIndex {
  return v.parse(PackageIndexSchema, input)
}
