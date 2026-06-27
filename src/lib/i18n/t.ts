import enMessages from '../../locales/en.json'
import jaMessages from '../../locales/ja.json'
import type { Locale } from './locale'

export type MessageKey = keyof typeof jaMessages
export type Translator = (key: MessageKey) => string

type MessageCatalog = Record<MessageKey, string>

export const messageCatalogs = {
  ja: jaMessages,
  en: enMessages,
} satisfies Record<Locale, MessageCatalog>

export function translate(locale: Locale, key: MessageKey): string {
  return messageCatalogs[locale][key] ?? messageCatalogs.ja[key]
}

export function createTranslator(locale: Locale): Translator {
  return (key) => translate(locale, key)
}
