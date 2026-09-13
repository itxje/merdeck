import type { DiagramService, DiagramServiceOptions, FileConfig } from '../../../src/modules/diagrams'
import { lstat, mkdir, mkdtemp, realpath, rm, statfs } from 'node:fs/promises'
import { isAbsolute, join, resolve } from 'node:path'
import { createDiagramService } from '../../../src/modules/diagrams'

const fixtureServices = new Map<string, DiagramService[]>()
export async function createFixtureService(config: FileConfig, options?: DiagramServiceOptions): Promise<DiagramService> {
  const service = await createDiagramService(config, options)
  const list = fixtureServices.get(config.projectRoot) ?? []
  list.push(service)
  fixtureServices.set(config.projectRoot, list)
  return service
}

export const fixtureLimits: FileConfig['limits'] = { maxFileBytes: 8192, maxTreeEntries: 100, maxTreeDepth: 8, maxPathDepth: 64, maxBlocks: 20, pollIntervalMs: 1000, sessionTtlSeconds: 3600, maxSessions: 100 }

export async function fixtureParent(unsupported = false): Promise<string> {
  const key = unsupported ? 'MERDECK_TEST_UNSUPPORTED_PARENT' : 'MERDECK_TEST_FIXTURE_PARENT'
  const configured = process.env[key]
  const path = configured ?? resolve('tmp')
  if (!configured)
    await mkdir(path, { recursive: true })
  if (!isAbsolute(path) || resolve(path) !== path || await realpath(path) !== path || !(await lstat(path)).isDirectory())
    throw new Error(`${key} must name an existing canonical absolute directory`)
  return path
}

export async function describeFixture(path: string) {
  const stat = await lstat(path, { bigint: true })
  const fs = await statfs(path, { bigint: true })
  const description = { root: path, filesystemType: `0x${fs.type.toString(16)}`, device: String(stat.dev) }
  process.stdout.write(`${JSON.stringify(description)}\n`)
  return description
}

export async function createFixture(prefix: string, unsupported = false): Promise<string> {
  if (!/^files-[a-z-]+-$/.test(prefix))
    throw new Error('Invalid fixture prefix')
  const path = await mkdtemp(join(await fixtureParent(unsupported), prefix))
  await describeFixture(path)
  return path
}

export async function removeFixture(path: string): Promise<void> {
  for (const [root, services] of fixtureServices) {
    if (root === path || root.startsWith(`${path}/`)) {
      await Promise.all(services.map(service => service.close()))
      fixtureServices.delete(root)
    }
  }
  await rm(path, { recursive: true, force: true })
  try {
    await lstat(path)
  }
  catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      process.stdout.write(`${JSON.stringify({ fixtureRemoved: path })}\n`)
      return
    }
    throw error
  }
  throw new Error('Fixture cleanup did not remove the owned directory')
}
