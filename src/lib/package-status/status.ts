import { findIndexEntry } from '../homebrew-index/lookup'
import type { PackageIndex } from '../schemas/packageIndex'
import type { PackageType } from '../schemas/preset'

export type PackageWarningCode = 'invalid-token' | 'invalid-tap' | 'unknown' | 'deprecated' | 'disabled'

export type PackageWarning = {
  code: PackageWarningCode
  severity: 'warning' | 'danger'
  message: string
  replacement?: string | null
}

type WarningInput = {
  type: PackageType
  token: string
}

const TAP_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/

function hasUnsafeTokenCharacter(token: string): boolean {
  return /[\s"'`\n\r]/.test(token)
}

function validateToken(pkg: WarningInput): PackageWarning[] {
  const token = pkg.token.trim()
  if (token.length === 0 || hasUnsafeTokenCharacter(token)) {
    return [
      {
        code: 'invalid-token',
        severity: 'danger',
        message: 'token に空白、引用符、改行は使えません。',
      },
    ]
  }
  if (pkg.type === 'tap' && !TAP_PATTERN.test(token)) {
    return [
      {
        code: 'invalid-tap',
        severity: 'warning',
        message: 'tap は owner/repo 形式で入力してください。',
      },
    ]
  }
  return []
}

export function getPackageWarnings(pkg: WarningInput, index: PackageIndex | null): PackageWarning[] {
  const warnings = validateToken(pkg)
  if (warnings.some((warning) => warning.severity === 'danger')) {
    return warnings
  }
  if (!index || (pkg.type !== 'brew' && pkg.type !== 'cask')) {
    return warnings
  }

  const entry = findIndexEntry(pkg.type, pkg.token, index)
  if (!entry) {
    return [
      ...warnings,
      {
        code: 'unknown',
        severity: 'warning',
        message: '現在の package-index に見つかりません。名前を確認してください。',
      },
    ]
  }
  if (entry.deprecated) {
    warnings.push({
      code: 'deprecated',
      severity: 'warning',
      message: 'Homebrew 側で deprecated とされています。',
      replacement: entry.replacement,
    })
  }
  if (entry.disabled) {
    warnings.push({
      code: 'disabled',
      severity: 'danger',
      message: 'Homebrew 側で disabled とされています。',
      replacement: entry.replacement,
    })
  }

  return warnings
}

export function hasDisabledWarning(warnings: PackageWarning[]): boolean {
  return warnings.some((warning) => warning.code === 'disabled')
}
