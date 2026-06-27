import { describe, expect, it } from 'vitest'
import { parseBrewfile } from './parser'

describe('parseBrewfile', () => {
  it('parses simple tap, brew, cask, and mas lines', () => {
    const parsed = parseBrewfile(
      [
        'tap "homebrew/cask-fonts"',
        "brew 'git'",
        'cask "visual-studio-code"',
        'mas "Xcode", id: 497799835',
      ].join('\n'),
    )

    expect(parsed.packages).toEqual([
      { type: 'tap', token: 'homebrew/cask-fonts', lineNumber: 1 },
      { type: 'brew', token: 'git', lineNumber: 2 },
      { type: 'cask', token: 'visual-studio-code', lineNumber: 3 },
      { type: 'mas', token: 'Xcode', masId: 497799835, lineNumber: 4 },
    ])
    expect(parsed.passthrough).toEqual([])
  })

  it('keeps option lines and their immediate comments as passthrough', () => {
    const parsed = parseBrewfile(
      [
        '# keep options',
        'brew "node", args: ["with-icu4c"]',
        '',
        '# section comment',
        'brew "git"',
      ].join('\n'),
    )

    expect(parsed.packages).toEqual([{ type: 'brew', token: 'git', lineNumber: 5 }])
    expect(parsed.passthrough).toEqual([
      {
        id: 'line-1',
        line: '# keep options\nbrew "node", args: ["with-icu4c"]',
        lineNumber: 1,
      },
    ])
  })

  it('does not parse escaped quote lines as simple packages', () => {
    const parsed = parseBrewfile('brew "weird\\"name"')

    expect(parsed.packages).toEqual([])
    expect(parsed.passthrough[0].line).toBe('brew "weird\\"name"')
  })
})
