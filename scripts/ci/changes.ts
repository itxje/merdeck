import { appendFile, readFile } from 'node:fs/promises'
import { ciMode } from './mode'

function git(repository: string, args: string[], input?: Uint8Array) {
  const result = Bun.spawnSync(['git', ...args], { cwd: repository, stdin: input ?? 'ignore', stdout: 'pipe', stderr: 'pipe', timeout: 15000 })
  if (result.exitCode !== 0 || result.signalCode)
    throw new Error('Unable to compute the complete CI change set')
  return result.stdout.toString()
}

function field(value: unknown, name: string): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid CI event payload')
  return (value as Record<string, unknown>)[name]
}

function commit(value: unknown) {
  if (typeof value !== 'string' || !/^[a-f0-9]{40}$/.test(value))
    throw new Error('CI event requires an exact commit')
  return value
}

export function changeRange(repository: string, event: string, payload: unknown) {
  let base: string
  let head: string
  if (event === 'push') {
    head = commit(field(payload, 'after'))
    const before = commit(field(payload, 'before'))
    base = before === '0'.repeat(40) ? git(repository, ['hash-object', '-t', 'tree', '--stdin'], new Uint8Array()).trim() : before
    if (head !== git(repository, ['rev-parse', 'HEAD']).trim())
      throw new Error('Push event does not match the checked-out commit')
  }
  else if (event === 'pull_request') {
    const pull = field(payload, 'pull_request')
    head = commit(field(field(pull, 'head'), 'sha'))
    const target = commit(field(field(pull, 'base'), 'sha'))
    base = git(repository, ['merge-base', target, head]).trim()
  }
  else { throw new Error('Change ranges are only defined for pushes and pull requests') }
  // Disabling rename detection includes both the old and new names. NUL separators preserve every path.
  const paths = git(repository, ['diff', '--no-renames', '--name-only', '-z', base, head]).split('\0').filter(Boolean)
  return { base, head, paths }
}

if (import.meta.main) {
  const event = process.env.GITHUB_EVENT_NAME ?? ''
  const ref = process.env.GITHUB_REF ?? ''
  let mode = ciMode(event, ref, [])
  if (mode !== 'native') {
    const payloadPath = process.env.GITHUB_EVENT_PATH
    if (!payloadPath)
      throw new Error('CI event payload is missing')
    const range = changeRange(process.cwd(), event, JSON.parse(await readFile(payloadPath, 'utf8')) as unknown)
    mode = ciMode(event, ref, range.paths)
    if (mode === 'docs')
      git(process.cwd(), ['diff', '--check', range.base, range.head])
  }
  const output = process.env.GITHUB_OUTPUT
  if (!output)
    throw new Error('CI output destination is missing')
  await appendFile(output, `mode=${mode}\n`)
  process.stdout.write(`CI mode: ${mode}${mode === 'docs' ? '; documentation diff passed whitespace checks' : ''}\n`)
}
