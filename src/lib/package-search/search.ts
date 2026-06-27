import { packageKey } from '../selection/state'
import type { PackageIndex } from '../schemas/packageIndex'
import type { PackageType } from '../schemas/preset'

export type PackageSearchResult = {
  type: Extract<PackageType, 'brew' | 'cask'>
  token: string
  title: string
  description: string
  aliases: string[]
  selected: boolean
  inPreset: boolean
  score: number
}

type SearchOptions = {
  selectedKeys?: Set<string>
  presetKeys?: Set<string>
  limit?: number
}

type SearchCandidate = Omit<PackageSearchResult, 'selected' | 'inPreset' | 'score'> & {
  terms: string[]
}

function normalize(value: string): string {
  return value.toLowerCase().trim()
}

function scoreCandidate(candidate: SearchCandidate, query: string): number | null {
  const token = normalize(candidate.token)
  const title = normalize(candidate.title)
  const terms = candidate.terms.map(normalize).filter(Boolean)

  if (token === query) {
    return 0
  }
  if (terms.some((term) => term === query) || title === query) {
    return 1
  }
  if (token.startsWith(query)) {
    return 10
  }
  if (title.startsWith(query) || terms.some((term) => term.startsWith(query))) {
    return 12
  }
  if (token.includes(query)) {
    return 20
  }
  if (title.includes(query) || terms.some((term) => term.includes(query))) {
    return 24
  }
  if (normalize(candidate.description).includes(query)) {
    return 40
  }

  return null
}

function createCandidates(index: PackageIndex): SearchCandidate[] {
  const formulae = Object.values(index.formula).map((entry) => ({
    type: 'brew' as const,
    token: entry.token,
    title: entry.token,
    description: entry.desc,
    aliases: [...entry.aliases, ...entry.oldNames],
    terms: [entry.fullName, entry.tap, ...entry.aliases, ...entry.oldNames],
  }))
  const casks = Object.values(index.cask).map((entry) => ({
    type: 'cask' as const,
    token: entry.token,
    title: entry.name[0] ?? entry.token,
    description: entry.desc,
    aliases: entry.oldTokens,
    terms: [entry.fullToken, ...entry.name, ...entry.oldTokens],
  }))

  return [...formulae, ...casks]
}

function hasCandidateKey(keys: Set<string>, candidate: SearchCandidate): boolean {
  if (keys.has(packageKey(candidate))) {
    return true
  }
  return candidate.aliases.some((alias) => keys.has(packageKey({ type: candidate.type, token: alias })))
}

export function searchPackageIndex(
  index: PackageIndex | null,
  query: string,
  options: SearchOptions = {},
): PackageSearchResult[] {
  const normalizedQuery = normalize(query)
  if (!index || normalizedQuery.length < 2) {
    return []
  }

  const selectedKeys = options.selectedKeys ?? new Set<string>()
  const presetKeys = options.presetKeys ?? new Set<string>()
  const limit = options.limit ?? 20

  return createCandidates(index)
    .map((candidate) => {
      const key = packageKey(candidate)
      const baseScore = scoreCandidate(candidate, normalizedQuery)
      if (baseScore === null) {
        return null
      }
      const inPreset = presetKeys.has(key) || hasCandidateKey(presetKeys, candidate)
      return {
        type: candidate.type,
        token: candidate.token,
        title: candidate.title,
        description: candidate.description,
        aliases: candidate.aliases,
        selected: selectedKeys.has(key) || hasCandidateKey(selectedKeys, candidate),
        inPreset,
        score: baseScore + (inPreset ? -2 : 0),
      } satisfies PackageSearchResult
    })
    .filter((result): result is PackageSearchResult => result !== null)
    .sort((a, b) => a.score - b.score || a.token.localeCompare(b.token))
    .slice(0, limit)
}
