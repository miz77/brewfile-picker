import type { LocaleText } from '../schemas/preset'

export function formatLocalText(text: LocaleText, locale = 'ja'): string {
  return text[locale as keyof LocaleText] ?? text.ja
}
