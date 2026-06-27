import { describe, expect, it } from 'vitest'
import { createPickerStateFromPreset, upsertPackage } from '../selection/state'
import type { Preset } from '../schemas/preset'
import { createStoredPickerState, restorePickerStateFromStored } from './localStorage'

const preset: Preset = {
  id: 'lab-2026',
  revision: '2026-06-27',
  name: { ja: '研究室標準' },
  description: { ja: '説明' },
  sections: [
    {
      id: 'base',
      name: { ja: '基本' },
      packages: [
        { type: 'brew', token: 'git', selected: true },
        { type: 'cask', token: 'zotero', selected: false },
      ],
    },
  ],
}

describe('stored picker state', () => {
  it('stores compact state and restores it over the current preset', () => {
    const state = upsertPackage(createPickerStateFromPreset(preset), {
      type: 'brew',
      token: 'node',
      selected: true,
    })
    const stored = createStoredPickerState(state, '2026-06-27T00:00:00.000Z')
    const restored = restorePickerStateFromStored(preset, stored)

    expect(stored.savedAt).toBe('2026-06-27T00:00:00.000Z')
    expect(restored.packages.filter((pkg) => pkg.selected).map((pkg) => pkg.token)).toEqual(['git', 'node'])
  })
})
