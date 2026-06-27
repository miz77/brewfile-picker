export function getPresetIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/p\/([a-z0-9-]+)\/?$/)
  return match?.[1] ?? null
}
