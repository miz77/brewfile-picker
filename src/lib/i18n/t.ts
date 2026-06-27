import messages from '../../locales/ja.json'

type MessageKey = keyof typeof messages

export function t(key: MessageKey): string {
  return messages[key]
}
