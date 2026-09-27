import { Buffer } from 'node:buffer'

const inheritedEnvironment = [
  'HOME',
  'USER',
  'LOGNAME',
  'PATH',
  'LANG',
  'LC_ALL',
  'SSL_CERT_FILE',
  'SSL_CERT_DIR',
  'XDG_CONFIG_HOME',
  'XDG_CACHE_HOME',
  'XDG_DATA_HOME',
  'XDG_RUNTIME_DIR',
] as const

export function providerEnvironment(environment: NodeJS.ProcessEnv = process.env): Record<string, string> {
  const safe: Record<string, string> = { CI: '1', NO_COLOR: '1', TERM: 'dumb' }
  for (const name of inheritedEnvironment) {
    const value = environment[name]
    if (value && !/[\r\n\0]/.test(value))
      safe[name] = value
  }
  return safe
}

export function spawnProvider(executable: string, args: string[], projectRoot: string): Bun.PipedSubprocess {
  return Bun.spawn({
    cmd: [executable, ...args],
    cwd: projectRoot,
    env: providerEnvironment(),
    stdin: 'pipe',
    stdout: 'pipe',
    stderr: 'pipe',
  })
}

export async function writeJsonLine(process: Bun.PipedSubprocess, value: unknown): Promise<void> {
  if (process.exitCode !== null)
    throw new Error('Provider process exited')
  await process.stdin.write(`${JSON.stringify(value)}\n`)
  await process.stdin.flush()
}

export async function readJsonLines(stream: ReadableStream<Uint8Array>, onValue: (value: unknown) => void, maximumLineBytes = 256 * 1024): Promise<void> {
  const decoder = new TextDecoder('utf-8', { fatal: true })
  let pending = ''
  for await (const chunk of stream) {
    pending += decoder.decode(chunk, { stream: true })
    if (Buffer.byteLength(pending) > maximumLineBytes && !pending.includes('\n'))
      throw new Error('Provider output line is too large')
    let newline = pending.indexOf('\n')
    while (newline >= 0) {
      const line = pending.slice(0, newline).replace(/\r$/, '')
      pending = pending.slice(newline + 1)
      if (Buffer.byteLength(line) > maximumLineBytes)
        throw new Error('Provider output line is too large')
      if (line)
        onValue(JSON.parse(line) as unknown)
      newline = pending.indexOf('\n')
    }
  }
  pending += decoder.decode()
  if (pending.trim()) {
    if (Buffer.byteLength(pending) > maximumLineBytes)
      throw new Error('Provider output line is too large')
    onValue(JSON.parse(pending) as unknown)
  }
}

export async function drain(stream: ReadableStream<Uint8Array>): Promise<void> {
  for await (const _chunk of stream) {
    // Provider stderr is intentionally discarded: it can contain paths, prompts and credentials.
  }
}

export async function terminate(process: Bun.PipedSubprocess): Promise<void> {
  if (process.exitCode !== null)
    return
  try {
    process.kill('SIGTERM')
  }
  catch {
    return
  }
  const exited = await Promise.race([
    process.exited.then(() => true),
    new Promise<false>(resolve => setTimeout(resolve, 1500, false)),
  ])
  if (!exited && process.exitCode === null) {
    try {
      process.kill('SIGKILL')
    }
    catch {
      // The process exited between the state check and signal.
    }
    await process.exited.catch(() => undefined)
  }
}

export function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined
}

export function boundedText(value: unknown, maximum = 4096): string | undefined {
  return typeof value === 'string' && value.length <= maximum ? value : undefined
}
