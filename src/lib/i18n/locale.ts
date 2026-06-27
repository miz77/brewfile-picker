import { writable } from 'svelte/store'
import type { LocaleText } from '../schemas/preset'

export type Locale = 'ja' | 'en'

export const defaultLocale: Locale = 'ja'
export const supportedLocales: readonly Locale[] = ['ja', 'en']

const localeStorageKey = 'brewfile-picker:locale:v1'

export function isLocale(value: unknown): value is Locale {
  return value === 'ja' || value === 'en'
}

function loadStoredLocale(): Locale {
  try {
    const stored = globalThis.localStorage?.getItem(localeStorageKey)
    return isLocale(stored) ? stored : defaultLocale
  } catch {
    return defaultLocale
  }
}

export const locale = writable<Locale>(loadStoredLocale())

export function setLocale(nextLocale: Locale) {
  locale.set(nextLocale)
  try {
    globalThis.localStorage?.setItem(localeStorageKey, nextLocale)
  } catch {
    // Ignore storage failures; the in-memory locale still changes for this session.
  }
}

export function formatLocalText(text: LocaleText, currentLocale: Locale = defaultLocale): string {
  const localeKey = currentLocale as keyof LocaleText
  return text[localeKey] ?? text.ja
}

export function intlLocale(currentLocale: Locale): string {
  return currentLocale === 'ja' ? 'ja-JP' : 'en-US'
}
