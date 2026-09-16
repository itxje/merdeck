import { constants } from 'node:fs'
import { access, realpath, stat } from 'node:fs/promises'
import { isIP } from 'node:net'
import { isAbsolute, relative, sep } from 'node:path'
import { z } from 'zod'

const integer = (minimum: number, maximum: number, fallback: number) => z.coerce.number().int().min(minimum).max(maximum).default(fallback)
const executablePath = z.union([z.literal(''), z.string().min(1).refine(isAbsolute).refine(value => !value.includes('\0'))]).optional().transform(value => value || undefined)
const originSchema = z.url().refine((value) => {
  if (!URL.canParse(value))
    return false
  const url = new URL(value)
  return ['http:', 'https:'].includes(url.protocol) && url.origin === value
})
// Accepts bind addresses and URL hostnames, which bracket IPv6 addresses.
const loopback = (host: string) => host === 'localhost' || host === '::1' || host === '[::1]' || (isIP(host) === 4 && host.startsWith('127.'))
const environmentSchema = z.object({
  MERDECK_ROOT: z.string().min(1).refine(isAbsolute).refine(value => !value.includes('\0')),
  MERDECK_HOST: z.string().min(1).default('127.0.0.1').refine(value => isIP(value) !== 0 || /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i.test(value)),
  PORT: integer(1, 65535, 8787),
  // An empty token, as left by an unfilled `.env` entry, counts as unset.
  MERDECK_TOKEN: z.union([z.literal(''), z.string().min(32).max(256).regex(/^[\x21-\x7E]+$/)]).optional().transform(value => value || undefined),
  MERDECK_OPEN_ACCESS: z.enum(['true', 'false']).default('false'),
  MERDECK_ALLOWED_ORIGINS: z.string().default('').transform(value => value ? value.split(',').map(item => item.trim()) : []).pipe(z.array(originSchema).max(16)),
  MERDECK_COOKIE_SECURE: z.enum(['auto', 'true']).default('auto'),
  MERDECK_API_MODE: z.enum(['prefixed', 'stripped']).default('prefixed'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('production'),
  MERDECK_MAX_FILE_BYTES: integer(1024, 8 * 1024 * 1024, 1024 * 1024),
  // A project root often sits beside unrelated directories, so the default scan is wide but shallow:
  // it lists four levels completely rather than a thousand entries of an arbitrarily deep walk.
  MERDECK_MAX_TREE_ENTRIES: integer(1, 10000, 8000),
  MERDECK_MAX_TREE_DEPTH: integer(1, 32, 4),
  MERDECK_MAX_PATH_DEPTH: integer(1, 64, 64),
  MERDECK_MAX_BLOCKS: integer(1, 1000, 100),
  MERDECK_POLL_INTERVAL_MS: integer(1000, 30000, 3000),
  MERDECK_SESSION_TTL_SECONDS: integer(60, 86400, 3600),
  MERDECK_MAX_SESSIONS: integer(1, 1000, 100),
  MERDECK_CODEX_PATH: executablePath,
  MERDECK_CLAUDE_PATH: executablePath,
})

export class ConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigError'
  }
}

async function canonicalExecutable(value: string | undefined, name: 'MERDECK_CODEX_PATH' | 'MERDECK_CLAUDE_PATH', projectRoot: string): Promise<string | undefined> {
  if (!value)
    return undefined
  try {
    const canonical = await realpath(value)
    const metadata = await stat(canonical)
    if (!metadata.isFile() || (metadata.mode & 0o111) === 0)
      throw new Error('Not a file')
    await access(canonical, constants.X_OK)
    const fromRoot = relative(projectRoot, canonical)
    if (fromRoot === '' || (fromRoot !== '..' && !fromRoot.startsWith(`..${sep}`) && !isAbsolute(fromRoot)))
      throw new Error('Project-owned executable')
    return canonical
  }
  catch {
    throw new ConfigError(`${name} must be an accessible executable file`)
  }
}

export async function loadConfig(environment: Record<string, string | undefined>) {
  const result = environmentSchema.safeParse(environment)
  if (!result.success)
    throw new ConfigError(`Invalid configuration: ${[...new Set(result.error.issues.map(issue => issue.path[0]))].join(', ')}`)
  const env = result.data
  if (env.MERDECK_API_MODE === 'stripped' && env.NODE_ENV !== 'development')
    throw new ConfigError('Stripped API mode requires NODE_ENV=development')
  let projectRoot: string
  try {
    projectRoot = await realpath(env.MERDECK_ROOT)
    if (!(await stat(projectRoot)).isDirectory())
      throw new Error('Not a directory')
    await access(projectRoot, constants.R_OK | constants.X_OK)
  }
  catch {
    throw new ConfigError('MERDECK_ROOT must be an accessible directory')
  }
  const host = env.MERDECK_HOST
  const originHost = host.includes(':') && !host.startsWith('[') ? `[${host}]` : host
  const allowedOrigins = env.MERDECK_ALLOWED_ORIGINS.length ? env.MERDECK_ALLOWED_ORIGINS : [`http://${originHost}:${env.PORT}`]
  if (new Set(allowedOrigins.map(value => new URL(value).host)).size !== allowedOrigins.length)
    throw new ConfigError('Allowed origins must have distinct authorities')
  if (allowedOrigins.some(value => value.startsWith('https:')) && allowedOrigins.some(value => value.startsWith('http:')))
    throw new ConfigError('HTTP and HTTPS origins cannot share a service')
  if (env.MERDECK_COOKIE_SECURE === 'true' && allowedOrigins.some(value => value.startsWith('http:')))
    throw new ConfigError('Secure cookies require HTTPS origins')
  const token = env.MERDECK_TOKEN
  const openAccess = env.MERDECK_OPEN_ACCESS === 'true'
  if (token && openAccess)
    throw new ConfigError('MERDECK_OPEN_ACCESS cannot be combined with MERDECK_TOKEN')
  // Without a token anyone who can connect may change project files, so wider exposure must be deliberate.
  if (!token && !openAccess && !(loopback(host) && allowedOrigins.every(value => loopback(new URL(value).hostname))))
    throw new ConfigError('A service reachable beyond loopback requires MERDECK_TOKEN or MERDECK_OPEN_ACCESS=true')
  if (!token && (env.MERDECK_CODEX_PATH || env.MERDECK_CLAUDE_PATH))
    throw new ConfigError('Agent providers require MERDECK_TOKEN')
  const agents = Object.freeze({
    codex: await canonicalExecutable(env.MERDECK_CODEX_PATH, 'MERDECK_CODEX_PATH', projectRoot),
    claude: await canonicalExecutable(env.MERDECK_CLAUDE_PATH, 'MERDECK_CLAUDE_PATH', projectRoot),
  })
  return Object.freeze({
    projectRoot,
    host,
    port: env.PORT,
    // Undefined runs the service with open access: no sign-in, sessions or CSRF tokens.
    token,
    secureCookie: env.MERDECK_COOKIE_SECURE === 'true' || allowedOrigins.every(value => value.startsWith('https:')),
    allowedOrigins: Object.freeze(allowedOrigins),
    apiBasePath: env.MERDECK_API_MODE === 'stripped' ? '/' as const : '/api' as const,
    agents,
    limits: Object.freeze({
      maxFileBytes: env.MERDECK_MAX_FILE_BYTES,
      maxTreeEntries: env.MERDECK_MAX_TREE_ENTRIES,
      maxTreeDepth: env.MERDECK_MAX_TREE_DEPTH,
      maxPathDepth: env.MERDECK_MAX_PATH_DEPTH,
      maxBlocks: env.MERDECK_MAX_BLOCKS,
      pollIntervalMs: env.MERDECK_POLL_INTERVAL_MS,
      sessionTtlSeconds: env.MERDECK_SESSION_TTL_SECONDS,
      maxSessions: env.MERDECK_MAX_SESSIONS,
    }),
  })
}

export type AppConfig = Awaited<ReturnType<typeof loadConfig>>
