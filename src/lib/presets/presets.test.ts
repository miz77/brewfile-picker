import { describe, expect, it } from 'vitest'
import { getPresetById, listPresets } from './presets'

describe('presets', () => {
  it('loads the lab preset', () => {
    const presets = listPresets()
    expect(presets).toHaveLength(2)
    expect(presets[0].id).toBe('lab-2026')
    expect(presets[1].id).toBe('blank')
  })

  it('falls back to the default preset for unknown ids', () => {
    expect(getPresetById('missing').id).toBe('lab-2026')
  })
})
