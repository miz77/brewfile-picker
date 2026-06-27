import { describe, expect, it } from 'vitest'
import { createPackageIndex } from '../homebrew-index/normalize'
import { packageKey } from '../selection/state'
import { searchPackageIndex } from './search'

describe('searchPackageIndex', () => {
  it('searches formulae and casks by token, aliases, and names', () => {
    const index = createPackageIndex(
      [{ name: 'python@3.14', aliases: ['python'], desc: 'Interpreted language' }],
      [{ token: 'visual-studio-code', name: ['Visual Studio Code'], desc: 'Code editor' }],
      '2026-06-27T00:00:00.000Z',
    )

    expect(searchPackageIndex(index, 'python').map((result) => result.token)).toContain('python@3.14')
    expect(searchPackageIndex(index, 'visual').map((result) => result.token)).toContain('visual-studio-code')
  })

  it('marks selected and preset packages', () => {
    const index = createPackageIndex([{ name: 'git', desc: 'Version control' }], [], '2026-06-27T00:00:00.000Z')
    const keys = new Set([packageKey({ type: 'brew', token: 'git' })])
    const [result] = searchPackageIndex(index, 'git', { selectedKeys: keys, presetKeys: keys })

    expect(result.selected).toBe(true)
    expect(result.inPreset).toBe(true)
  })

  it('uses aliases when checking selected and preset state', () => {
    const index = createPackageIndex(
      [{ name: 'python@3.14', aliases: ['python'], desc: 'Interpreted language' }],
      [],
      '2026-06-27T00:00:00.000Z',
    )
    const keys = new Set([packageKey({ type: 'brew', token: 'python' })])
    const [result] = searchPackageIndex(index, 'python', { selectedKeys: keys, presetKeys: keys })

    expect(result.token).toBe('python@3.14')
    expect(result.selected).toBe(true)
    expect(result.inPreset).toBe(true)
  })
})
