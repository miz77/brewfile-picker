import { describe, expect, it } from 'vitest'
import { parseBrewfile } from './parser'

describe('parseBrewfile', () => {
  it('parses simple tap, brew, cask, and mas lines', () => {
    const parsed = parseBrewfile(
      [
        'tap "homebrew/services"',
        "brew 'git'",
        'cask "visual-studio-code"',
        'mas "Xcode", id: 497799835',
      ].join('\n'),
    )

    expect(parsed.packages).toEqual([
      { type: 'tap', token: 'homebrew/services', lineNumber: 1 },
      { type: 'brew', token: 'git', lineNumber: 2 },
      { type: 'cask', token: 'visual-studio-code', lineNumber: 3 },
      { type: 'mas', token: 'Xcode', masId: '497799835', lineNumber: 4 },
    ])
    expect(parsed.passthrough).toEqual([])
  })

  it('preserves MAS IDs outside JavaScript safe integer range', () => {
    const parsed = parseBrewfile('mas "Huge", id: 9007199254740993')

    expect(parsed.packages).toEqual([
      { type: 'mas', token: 'Huge', masId: '9007199254740993', lineNumber: 1 },
    ])
    expect(parsed.passthrough).toEqual([])
  })

  it('keeps MAS lines with non-positive IDs as passthrough', () => {
    const parsed = parseBrewfile('mas "Zero", id: 0')

    expect(parsed.packages).toEqual([])
    expect(parsed.passthrough[0].line).toBe('mas "Zero", id: 0')
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
