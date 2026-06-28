import type { PackageType } from '../schemas/preset'

export type ParsedPackage = {
  type: PackageType
  token: string
  lineNumber: number
  masId?: string
}

export type ParsedPassthrough = {
  id: string
  line: string
  lineNumber: number
}

export type ParsedBrewfile = {
  packages: ParsedPackage[]
  passthrough: ParsedPassthrough[]
}

const SIMPLE_PACKAGE_PATTERNS: Array<[Extract<PackageType, 'tap' | 'brew' | 'cask'>, RegExp]> = [
  ['tap', /^\s*tap\s+["']([^"'\n\r]+)["']\s*$/],
  ['brew', /^\s*brew\s+["']([^"'\n\r]+)["']\s*$/],
  ['cask', /^\s*cask\s+["']([^"'\n\r]+)["']\s*$/],
]
const MAS_PATTERN = /^\s*mas\s+["']([^"'\n\r]+)["']\s*,\s*id:\s*([1-9]\d*)\s*$/

function parsePackageLine(line: string, lineNumber: number): ParsedPackage | null {
  for (const [type, pattern] of SIMPLE_PACKAGE_PATTERNS) {
    const match = line.match(pattern)
    if (match?.[1]) {
      return { type, token: match[1], lineNumber }
    }
  }

  const masMatch = line.match(MAS_PATTERN)
  if (masMatch?.[1] && masMatch[2]) {
    return { type: 'mas', token: masMatch[1], masId: masMatch[2], lineNumber }
  }

  return null
}

export function parseBrewfile(content: string): ParsedBrewfile {
  const packages: ParsedPackage[] = []
  const passthrough: ParsedPassthrough[] = []
  const pendingComments: Array<{ line: string; lineNumber: number }> = []

  content.split(/\r?\n/).forEach((line, index) => {
    const lineNumber = index + 1
    const trimmed = line.trim()

    if (trimmed.length === 0) {
      pendingComments.length = 0
      return
    }
    if (trimmed.startsWith('#')) {
      pendingComments.push({ line, lineNumber })
      return
    }

    const parsedPackage = parsePackageLine(line, lineNumber)
    if (parsedPackage) {
      pendingComments.length = 0
      packages.push(parsedPackage)
      return
    }

    const blockLines = [...pendingComments.map((comment) => comment.line), line]
    const firstLineNumber = pendingComments[0]?.lineNumber ?? lineNumber
    passthrough.push({
      id: `line-${firstLineNumber}`,
      line: blockLines.join('\n'),
      lineNumber: firstLineNumber,
    })
    pendingComments.length = 0
  })

  return { packages, passthrough }
}
