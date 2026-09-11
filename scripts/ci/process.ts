import { createHash } from 'node:crypto'
import { basename, resolve } from 'node:path'
import { redactedOutput } from './redact'

export const project = resolve(import.meta.dir, '../..')
export const session = `${basename(project).replaceAll('.', '-')}-${createHash('md5').update(project).digest('hex').slice(0, 6)}`
export const quote = (value: string) => `'${value.replaceAll('\'', '\'\\\'\'')}'`
export function tmux(args: string[]) {
  const result = Bun.spawnSync(['tmux', ...args], { cwd: project, timeout: 5000 })
  if (result.exitCode !== 0)
    throw new Error(`tmux operation failed: ${args[0]}`)
  return result.stdout.toString().trim()
}
export function requireSession() {
  if (Bun.version !== '1.4.2' || process.cwd() !== project || !process.env.TMUX || tmux(['display-message', '-p', '#S']) !== session)
    throw new Error(`Use Bun 1.4.2 from the project root inside tmux session ${session}`)
}
export async function run(args: string[], timeout = 360000, environment: NodeJS.ProcessEnv = process.env, secrets: readonly string[] = []) {
  process.stdout.write(`Running: ${args.join(' ')}\n`)
  const child = Bun.spawn([process.execPath, ...args], { cwd: project, env: environment, stdout: 'pipe', stderr: 'pipe', timeout })
  let exit: number
  try {
    [exit] = await Promise.all([
      child.exited,
      redactedOutput(child.stdout, secrets, (text) => { process.stdout.write(text) }),
      redactedOutput(child.stderr, secrets, (text) => { process.stderr.write(text) }),
    ])
  }
  catch (error) {
    child.kill('SIGTERM')
    await child.exited
    throw error
  }
  if (exit !== 0 || child.signalCode)
    throw new Error(`Command failed (${exit}, ${child.signalCode ?? 'no signal'}): ${args.join(' ')}`)
}
