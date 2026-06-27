import { describe, expect, it } from 'vitest'
import { messageCatalogs } from './t'

describe('messageCatalogs', () => {
  it('keeps locale dictionaries aligned', () => {
    const baselineKeys = Object.keys(messageCatalogs.ja).toSorted()

    for (const [locale, messages] of Object.entries(messageCatalogs)) {
      expect(Object.keys(messages).toSorted(), locale).toEqual(baselineKeys)
      expect(
        Object.entries(messages).filter(([, message]) => message.trim().length === 0),
        locale,
      ).toEqual([])
    }
  })
})
