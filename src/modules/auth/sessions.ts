import type { AppConfig } from '../../config'
import { Buffer } from 'node:buffer'
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { AppError } from '../../shared/errors'

export const sessionCookie = 'merdeck_session'
const digest = (value: string) => createHash('sha256').update(value).digest()
export const secretEqual = (first: string, second: string) => timingSafeEqual(digest(first), digest(second))
// `<id>.<expiry ms>.<signature>`; the signature also covers the issuing origin, which the cookie does not carry.
const signedCookie = /^([a-f0-9]{64})\.(\d{1,15})\.([a-f0-9]{64})$/
// Cookies issued before signed sessions carry only an id and can no longer authenticate.
const unsignedCookie = /^[a-f0-9]{64}$/

export interface Session {
  id: string
  csrfToken: string
  origin: string
  expiresAt: number
}

/**
 * Sessions are signed rather than stored, so a restart with the same access token and project root keeps
 * them valid until expiry, while a new token or root signs everyone out. Only issuance capacity and
 * revocations are kept in process memory; a restart forgets revocations of still-unexpired sessions.
 */
export class Sessions {
  private readonly issued = new Map<string, number>()
  private readonly revoked = new Map<string, number>()
  private attempts = 0
  private windowEnd = 0
  private closed = false
  private readonly tokenHash: ReturnType<typeof digest>
  private readonly key: Buffer

  constructor(private readonly config: AppConfig, token: string, private readonly clock: () => number = Date.now) {
    this.tokenHash = digest(token)
    this.key = createHmac('sha256', token).update(`merdeck session v1\n${config.projectRoot}`).digest()
  }

  attempt(): void {
    if (this.closed)
      throw new AppError('unavailable')
    const now = this.clock()
    if (now >= this.windowEnd) {
      this.attempts = 0
      this.windowEnd = now + 60000
    }
    if (++this.attempts > 10)
      throw new AppError('rate_limited')
  }

  create(token: string, origin: string): Session {
    if (this.closed)
      throw new AppError('unavailable')
    if (!timingSafeEqual(digest(token), this.tokenHash))
      throw new AppError('unauthorized')
    this.prune()
    if (this.issued.size >= this.config.limits.maxSessions)
      throw new AppError('rate_limited')
    const id = randomBytes(32).toString('hex')
    const expiresAt = this.clock() + this.config.limits.sessionTtlSeconds * 1000
    this.issued.set(id, expiresAt)
    return this.session(id, origin, expiresAt)
  }

  cookieValue(session: Session): string {
    return `${session.id}.${session.expiresAt}.${this.sign(session.id, session.expiresAt, session.origin).toString('hex')}`
  }

  get(request: Request, origin: string): Session | undefined {
    this.prune()
    const cookie = request.headers.get('cookie')
    if (!cookie)
      return undefined
    const values = cookie.split(';').map(part => part.trim()).filter(part => part.startsWith(`${sessionCookie}=`))
    if (values.length > 1)
      throw new AppError('invalid_request')
    const value = values[0]?.slice(sessionCookie.length + 1)
    if (!value || unsignedCookie.test(value))
      return undefined
    const match = signedCookie.exec(value)
    if (!match)
      throw new AppError('invalid_request')
    const id = match[1]!
    const expiresAt = Number(match[2])
    if (this.clock() >= expiresAt || this.revoked.has(id) || !timingSafeEqual(Buffer.from(match[3]!, 'hex'), this.sign(id, expiresAt, origin)))
      return undefined
    return this.session(id, origin, expiresAt)
  }

  remove(session: Session | undefined): void {
    if (!session)
      return
    this.issued.delete(session.id)
    this.revoked.set(session.id, session.expiresAt)
  }

  private session(id: string, origin: string, expiresAt: number): Session {
    return { id, origin, expiresAt, csrfToken: createHmac('sha256', this.key).update(`csrf\n${id}`).digest('hex') }
  }

  private sign(id: string, expiresAt: number, origin: string): Buffer {
    return createHmac('sha256', this.key).update(`session\n${id}\n${expiresAt}\n${origin}`).digest()
  }

  private prune(): void {
    const now = this.clock()
    for (const records of [this.issued, this.revoked]) {
      for (const [id, expiresAt] of records) {
        if (now >= expiresAt)
          records.delete(id)
      }
    }
  }

  close(): void {
    this.closed = true
    this.issued.clear()
    this.revoked.clear()
    this.tokenHash.fill(0)
    this.key.fill(0)
  }
}
