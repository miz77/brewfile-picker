import { describe, expect, it } from 'vitest'
import { createPackageIndex } from './normalize'

describe('createPackageIndex', () => {
  it('normalizes formula and cask API records', () => {
    const index = createPackageIndex(
      [
        {
          name: 'git',
          full_name: 'git',
          tap: 'homebrew/core',
          desc: 'Distributed revision control system',
          homepage: 'https://git-scm.com',
          aliases: ['git@latest'],
          oldnames: ['git-old'],
          deprecated: false,
          disabled: false,
          versions: { stable: '2.0.0' },
        },
      ],
      [
        {
          token: 'visual-studio-code',
          full_token: 'homebrew/cask/visual-studio-code',
          name: ['Visual Studio Code'],
          desc: 'Code editor',
          homepage: 'https://code.visualstudio.com/',
          old_tokens: ['vscode'],
          deprecated: false,
          disabled: false,
        },
      ],
      '2026-06-27T00:00:00.000Z',
    )

    expect(index.counts).toEqual({ formula: 1, cask: 1 })
    expect(index.formula.git.aliases).toEqual(['git@latest'])
    expect(index.formula.git.oldNames).toEqual(['git-old'])
    expect(index.cask['visual-studio-code'].name).toEqual(['Visual Studio Code'])
    expect(index.cask['visual-studio-code'].oldTokens).toEqual(['vscode'])
  })

  it('keeps replacement metadata for disabled entries', () => {
    const index = createPackageIndex(
      [
        {
          name: 'old-tool',
          disabled: true,
          disable_reason: 'does not build',
          disable_replacement_formula: 'new-tool',
        },
      ],
      [],
      '2026-06-27T00:00:00.000Z',
    )

    expect(index.formula['old-tool'].disabled).toBe(true)
    expect(index.formula['old-tool'].disableReason).toBe('does not build')
    expect(index.formula['old-tool'].replacement).toBe('new-tool')
  })
})
