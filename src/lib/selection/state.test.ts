import { describe, expect, it } from 'vitest'
import { createPickerStateFromPreset, getSelectedPackages, packageKey, setPackageSelected, upsertPackage } from './state'
import type { Preset } from '../schemas/preset'

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

describe('picker state', () => {
  it('creates selection state from a preset', () => {
    const state = createPickerStateFromPreset(preset)

    expect(getSelectedPackages(state).map((pkg) => pkg.token)).toEqual(['git'])
    expect(state.packages[0].source).toBe('preset')
  })

  it('toggles an existing package by key', () => {
    const state = createPickerStateFromPreset(preset)
    const updated = setPackageSelected(state, packageKey({ type: 'cask', token: 'zotero' }), true)

    expect(getSelectedPackages(updated).map((pkg) => pkg.token)).toEqual(['git', 'zotero'])
  })

  it('adds a manual package without duplicating an existing preset package', () => {
    const state = createPickerStateFromPreset(preset)
    const withGit = upsertPackage(state, { type: 'brew', token: 'git', selected: true })
    const withNode = upsertPackage(withGit, { type: 'brew', token: 'node', selected: true })

    expect(withGit.packages).toHaveLength(2)
    expect(withNode.packages).toHaveLength(3)
    expect(getSelectedPackages(withNode).map((pkg) => pkg.token)).toEqual(['git', 'node'])
  })
})
