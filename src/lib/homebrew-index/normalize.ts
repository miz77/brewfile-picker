import { parsePackageIndex, type CaskIndexEntry, type FormulaIndexEntry } from '../schemas/packageIndex'

export const HOMEBREW_FORMULA_API_URL = 'https://formulae.brew.sh/api/formula.json'
export const HOMEBREW_CASK_API_URL = 'https://formulae.brew.sh/api/cask.json'

type UnknownRecord = Record<string, unknown>

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : {}
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter((item): item is string => typeof item === 'string')
}

function asBoolean(value: unknown): boolean {
  return value === true
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.length > 0) {
      return value
    }
  }
  return null
}

export function normalizeFormula(raw: unknown): FormulaIndexEntry {
  const formula = asRecord(raw)
  const token = asString(formula.name)

  return {
    type: 'brew',
    token,
    fullName: asString(formula.full_name, token),
    tap: asString(formula.tap, 'homebrew/core'),
    desc: asString(formula.desc),
    homepage: asString(formula.homepage),
    aliases: asStringArray(formula.aliases),
    oldNames: asStringArray(formula.oldnames),
    deprecated: asBoolean(formula.deprecated),
    disabled: asBoolean(formula.disabled),
    deprecationReason: firstString(formula.deprecation_reason),
    disableReason: firstString(formula.disable_reason),
    replacement: firstString(
      formula.deprecation_replacement_formula,
      formula.deprecation_replacement_cask,
      formula.disable_replacement_formula,
      formula.disable_replacement_cask,
    ),
  }
}

export function normalizeCask(raw: unknown): CaskIndexEntry {
  const cask = asRecord(raw)
  const token = asString(cask.token)
  const name = asStringArray(cask.name)

  return {
    type: 'cask',
    token,
    fullToken: asString(cask.full_token, token),
    name: name.length > 0 ? name : [token],
    desc: asString(cask.desc),
    homepage: asString(cask.homepage),
    oldTokens: asStringArray(cask.old_tokens),
    deprecated: asBoolean(cask.deprecated),
    disabled: asBoolean(cask.disabled),
    deprecationReason: firstString(cask.deprecation_reason),
    disableReason: firstString(cask.disable_reason),
    replacement: firstString(
      cask.deprecation_replacement_formula,
      cask.deprecation_replacement_cask,
      cask.disable_replacement_formula,
      cask.disable_replacement_cask,
    ),
  }
}

export function createPackageIndex(formulaRaw: unknown[], caskRaw: unknown[], generatedAt = new Date().toISOString()) {
  const formulaEntries = formulaRaw
    .map(normalizeFormula)
    .filter((entry) => entry.token.length > 0)
    .map((entry) => [entry.token, entry] as const)
  const caskEntries = caskRaw
    .map(normalizeCask)
    .filter((entry) => entry.token.length > 0)
    .map((entry) => [entry.token, entry] as const)

  return parsePackageIndex({
    schemaVersion: 1,
    generatedAt,
    counts: {
      formula: formulaEntries.length,
      cask: caskEntries.length,
    },
    source: {
      formula: HOMEBREW_FORMULA_API_URL,
      cask: HOMEBREW_CASK_API_URL,
    },
    formula: Object.fromEntries(formulaEntries),
    cask: Object.fromEntries(caskEntries),
  })
}
