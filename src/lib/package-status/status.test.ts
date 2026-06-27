import { describe, expect, it } from 'vitest'
import { createPackageIndex } from '../homebrew-index/normalize'
import { getPackageWarnings } from './status'

describe('getPackageWarnings', () => {
  it('warns about unknown brew and cask packages when an index is available', () => {
    const index = createPackageIndex([], [], '2026-06-27T00:00:00.000Z')

    expect(getPackageWarnings({ type: 'brew', token: 'missing' }, index).map((warning) => warning.code)).toEqual([
      'unknown',
    ])
  })

  it('accepts formula aliases as known packages', () => {
    const index = createPackageIndex(
      [{ name: 'python@3.14', aliases: ['python'], deprecated: false, disabled: false }],
      [],
      '2026-06-27T00:00:00.000Z',
    )

    expect(getPackageWarnings({ type: 'brew', token: 'python' }, index)).toEqual([])
  })

  it('warns about disabled packages', () => {
    const index = createPackageIndex(
      [{ name: 'old-tool', disabled: true, disable_replacement_formula: 'new-tool' }],
      [],
      '2026-06-27T00:00:00.000Z',
    )

    expect(getPackageWarnings({ type: 'brew', token: 'old-tool' }, index).map((warning) => warning.code)).toEqual([
      'disabled',
    ])
  })

  it('validates tap syntax without requiring index membership', () => {
    expect(getPackageWarnings({ type: 'tap', token: 'homebrew/cask-fonts' }, null)).toEqual([])
    expect(getPackageWarnings({ type: 'tap', token: 'not-a-tap' }, null).map((warning) => warning.code)).toEqual([
      'invalid-tap',
    ])
  })
})
