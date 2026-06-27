import { describe, expect, it } from 'vitest'
import { getPresetIdFromPath } from './presetRoute'

describe('getPresetIdFromPath', () => {
  it('extracts preset id from preset routes', () => {
    expect(getPresetIdFromPath('/p/lab-2026')).toBe('lab-2026')
    expect(getPresetIdFromPath('/p/lab-python/')).toBe('lab-python')
  })

  it('returns null for non-preset routes', () => {
    expect(getPresetIdFromPath('/')).toBeNull()
    expect(getPresetIdFromPath('/packages/lab-2026')).toBeNull()
  })
})
