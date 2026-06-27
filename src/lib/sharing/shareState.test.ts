import { describe, expect, it } from 'vitest'
import { createPickerStateFromPreset } from '../selection/state'
import type { Preset } from '../schemas/preset'
import { countUnsharedSelectedPackages, createSharePayload, createStateFromSharePayload } from './shareState'

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
        { type: 'mas', token: 'Xcode', selected: true },
      ],
    },
  ],
}

describe('share state', () => {
  it('serializes only shareable package types', () => {
    const state = {
      ...createPickerStateFromPreset(preset),
      passthrough: [{ id: 'raw-1', line: 'vscode "svelte.svelte-vscode"', source: 'manual' as const }],
    }
    const payload = createSharePayload(state)

    expect(payload.selected).toEqual({ tap: [], brew: ['git'], cask: [] })
    expect(countUnsharedSelectedPackages(state)).toBe(2)
  })

  it('rebuilds picker state from a share payload', () => {
    const state = createStateFromSharePayload(preset, {
      version: 1,
      base: { presetId: 'lab-2026', revision: '2026-06-27' },
      selected: { tap: ['homebrew/services'], brew: ['node'], cask: ['zotero'] },
    })

    expect(state.packages.filter((pkg) => pkg.selected).map((pkg) => `${pkg.type}:${pkg.token}`)).toEqual([
      'cask:zotero',
      'tap:homebrew/services',
      'brew:node',
    ])
  })
})
