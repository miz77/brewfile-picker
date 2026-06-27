import { describe, expect, it } from 'vitest'
import { exportBrewfile } from './exporter'
import type { PickerState } from '../selection/state'

describe('exportBrewfile', () => {
  it('exports packages in Brewfile order and keeps passthrough last', () => {
    const state: PickerState = {
      schemaVersion: 1,
      basePresetId: 'lab-2026',
      basePresetRevision: '2026-06-27',
      packages: [
        { type: 'cask', token: 'zotero', selected: true, source: 'preset', order: 2 },
        { type: 'brew', token: 'git', selected: true, source: 'preset', order: 1 },
        { type: 'tap', token: 'homebrew/cask-fonts', selected: true, source: 'manual', order: Number.MAX_SAFE_INTEGER },
        { type: 'brew', token: 'node', selected: true, source: 'manual', order: Number.MAX_SAFE_INTEGER },
        { type: 'mas', token: 'Xcode', selected: true, source: 'manual', order: Number.MAX_SAFE_INTEGER, masId: 497799835 },
      ],
      passthrough: [{ id: 'raw-1', line: 'vscode "svelte.svelte-vscode"', source: 'import' }],
    }

    expect(exportBrewfile(state)).toBe(
      [
        'tap "homebrew/cask-fonts"',
        'brew "git"',
        'brew "node"',
        'cask "zotero"',
        'mas "Xcode", id: 497799835',
        '',
        'vscode "svelte.svelte-vscode"',
      ].join('\n'),
    )
  })

  it('deduplicates repeated packages by type and token', () => {
    const state: PickerState = {
      schemaVersion: 1,
      basePresetId: 'lab-2026',
      basePresetRevision: '2026-06-27',
      packages: [
        { type: 'brew', token: 'git', selected: true, source: 'preset', order: 0 },
        { type: 'brew', token: 'git', selected: true, source: 'manual', order: Number.MAX_SAFE_INTEGER },
      ],
      passthrough: [],
    }

    expect(exportBrewfile(state)).toBe('brew "git"')
  })
})
