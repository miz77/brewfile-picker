import { parseSharePayload, type SharePayload } from '../schemas/share'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function bytesToBinary(bytes: Uint8Array): string {
  const chunkSize = 0x8000
  let binary = ''
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(index, index + chunkSize))
  }
  return binary
}

function base64urlEncode(bytes: Uint8Array): string {
  return btoa(bytesToBinary(bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

function base64urlDecode(value: string): Uint8Array {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/')
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
  const binary = atob(padded)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  return buffer
}

async function gzip(bytes: Uint8Array): Promise<Uint8Array | null> {
  if (!('CompressionStream' in globalThis) || typeof Blob.prototype.stream !== 'function') {
    return null
  }

  const stream = new Blob([toArrayBuffer(bytes)]).stream().pipeThrough(new CompressionStream('gzip'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function gunzip(bytes: Uint8Array): Promise<Uint8Array> {
  if (!('DecompressionStream' in globalThis) || typeof Blob.prototype.stream !== 'function') {
    throw new Error('This browser cannot decode gzip share URLs.')
  }

  const stream = new Blob([toArrayBuffer(bytes)]).stream().pipeThrough(new DecompressionStream('gzip'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

export async function encodeSharePayload(payload: SharePayload): Promise<string> {
  const jsonBytes = encoder.encode(JSON.stringify(payload))
  const compressed = await gzip(jsonBytes)
  if (compressed) {
    return `gz.${base64urlEncode(compressed)}`
  }

  return `json.${base64urlEncode(jsonBytes)}`
}

export async function decodeSharePayload(value: string): Promise<SharePayload> {
  const separatorIndex = value.indexOf('.')
  if (separatorIndex < 0) {
    throw new Error('Invalid share payload.')
  }

  const codec = value.slice(0, separatorIndex)
  const payload = value.slice(separatorIndex + 1)
  const bytes = base64urlDecode(payload)

  if (codec === 'gz') {
    return parseSharePayload(JSON.parse(decoder.decode(await gunzip(bytes))))
  }
  if (codec === 'json') {
    return parseSharePayload(JSON.parse(decoder.decode(bytes)))
  }

  throw new Error(`Unsupported share codec: ${codec}`)
}

export function getShareValueFromHash(hash: string): string | null {
  const normalized = hash.startsWith('#') ? hash.slice(1) : hash
  return new URLSearchParams(normalized).get('share')
}

export function createShareUrl(encodedPayload: string, location: { href: string }): string {
  const url = new URL(location.href)
  url.hash = new URLSearchParams({ share: encodedPayload }).toString()
  return url.toString()
}
