import { describe, expect, it } from 'vitest'
import { createShareUrl, decodeSharePayload, encodeSharePayload, getShareValueFromHash } from './codec'

describe('share codec', () => {
  it('round-trips a share payload', async () => {
    const payload = {
      version: 1 as const,
      base: { presetId: 'lab-2026', revision: '2026-06-27' },
      selected: { tap: ['homebrew/cask-fonts'], brew: ['git'], cask: ['zotero'] },
    }

    await expect(decodeSharePayload(await encodeSharePayload(payload))).resolves.toEqual(payload)
  })

  it('reads and writes share hash values', () => {
    const url = createShareUrl('json.abc', { href: 'https://example.com/p/lab-2026' })

    expect(url).toBe('https://example.com/p/lab-2026#share=json.abc')
    expect(getShareValueFromHash('#share=json.abc')).toBe('json.abc')
  })
})
