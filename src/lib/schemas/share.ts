import * as v from 'valibot'

export const SharePayloadSchema = v.object({
  version: v.literal(1),
  base: v.object({
    presetId: v.string(),
    revision: v.string(),
  }),
  selected: v.object({
    tap: v.array(v.string()),
    brew: v.array(v.string()),
    cask: v.array(v.string()),
  }),
})

export type SharePayload = v.InferOutput<typeof SharePayloadSchema>

export function parseSharePayload(input: unknown): SharePayload {
  return v.parse(SharePayloadSchema, input)
}
