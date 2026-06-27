import { describe, expect, it } from 'vitest'
import type { Preset } from '../schemas/preset'
import { createPickerStateFromPreset } from '../selection/state'
import { createStateFromParsedBrewfile, mergeParsedBrewfileIntoState } from './importState'
import type { ParsedBrewfile } from './parser'

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

const parsed: ParsedBrewfile = {
  packages: [
    { type: 'brew', token: 'node', lineNumber: 1 },
    { type: 'cask', token: 'zotero', lineNumber: 2 },
  ],
  passthrough: [{ id: 'line-3', line: 'brew "node", args: ["with-icu4c"]', lineNumber: 3 }],
}

describe('Brewfile import state', () => {
  it('replaces preset defaults with parsed packages', () => {
    const state = createStateFromParsedBrewfile(preset, parsed)

    expect(state.packages.filter((pkg) => pkg.selected).map((pkg) => pkg.token)).toEqual(['zotero', 'node'])
    expect(state.passthrough.map((entry) => entry.line)).toEqual(['brew "node", args: ["with-icu4c"]'])
  })

  it('merges parsed packages into existing state', () => {
    const state = mergeParsedBrewfileIntoState(createPickerStateFromPreset(preset), parsed)

    expect(state.packages.filter((pkg) => pkg.selected).map((pkg) => pkg.token)).toEqual(['git', 'zotero', 'node'])
  })
})
