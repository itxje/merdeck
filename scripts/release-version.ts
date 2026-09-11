import { z } from 'zod'

// Build metadata is deliberately excluded: each admitted version has one canonical tag.
export function releaseVersion(tag: string) {
  const match = /^v(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?$/.exec(tag)
  if (!match || match[0] !== tag || tag.length > 128)
    throw new Error('Expected a canonical vMAJOR.MINOR.PATCH tag with optional SemVer prerelease (no build metadata)')
  return { tag, version: tag.slice(1), prerelease: Boolean(match[1]) }
}

export const targets = ['bun-linux-x64', 'bun-linux-arm64'] as const
export const targetSchema = z.enum(targets)
export type ReleaseTarget = z.infer<typeof targetSchema>
export const commitSchema = z.string().regex(/^[a-f0-9]{40}$/)
export function binaryName(tag: string, target: ReleaseTarget) {
  return `merdeck-${releaseVersion(tag).version}-${target.slice(4)}`
}

export function releaseArguments(args: string[]) {
  const values = args[0] === '--' ? args.slice(1) : args
  if (values.length !== 4 || values[0] !== '--tag' || !values[1] || values[2] !== '--target')
    throw new Error('Usage: --tag vMAJOR.MINOR.PATCH[-prerelease] --target bun-linux-x64|bun-linux-arm64')
  return { ...releaseVersion(values[1]), target: targetSchema.parse(values[3]) }
}

if (import.meta.main)
  process.stdout.write(`${JSON.stringify(releaseVersion(process.argv[2] ?? ''))}\n`)
