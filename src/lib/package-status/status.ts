import { findIndexEntry } from '../homebrew-index/lookup'
import type { MessageKey } from '../i18n/t'
import type { PackageIndex } from '../schemas/packageIndex'
import type { PackageType } from '../schemas/preset'

export type PackageWarningCode = 'invalid-token' | 'invalid-tap' | 'unknown' | 'deprecated' | 'disabled'

export type PackageWarning = {
  code: PackageWarningCode
  severity: 'warning' | 'danger'
  messageKey: MessageKey
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
        messageKey: 'warning.invalidToken',
      },
    ]
  }
  if (pkg.type === 'tap' && !TAP_PATTERN.test(token)) {
    return [
      {
        code: 'invalid-tap',
        severity: 'warning',
        messageKey: 'warning.invalidTap',
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
        messageKey: 'warning.unknown',
      },
    ]
  }
  if (entry.deprecated) {
    warnings.push({
      code: 'deprecated',
      severity: 'warning',
      messageKey: 'warning.deprecated',
      replacement: entry.replacement,
    })
  }
  if (entry.disabled) {
    warnings.push({
      code: 'disabled',
      severity: 'danger',
      messageKey: 'warning.disabled',
      replacement: entry.replacement,
    })
  }

  return warnings
}

export function hasDisabledWarning(warnings: PackageWarning[]): boolean {
  return warnings.some((warning) => warning.code === 'disabled')
}
