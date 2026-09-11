import { watch } from 'node:fs'
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, test } from 'bun:test'
import { project } from '../../scripts/ci/process'
import { compile } from '../../scripts/compile'
import { sha256 } from '../../scripts/release/manifest'
import { fixtureTag } from './fixtures'

const compileScratch = async () => (await readdir(join(project, 'tmp'))).filter(name => name.startsWith('compile-')).sort()

test('real bundler failure removes generated inputs and partial output without rewriting startup', async () => {
  const output = await mkdtemp(join(project, 'tmp/compile-failure-test-'))
  const before = await compileScratch()
  const startup = sha256(await readFile(join(project, 'src/index.ts')))
  try {
    await expect(compile(fixtureTag, process.arch === 'arm64' ? 'bun-linux-arm64' : 'bun-linux-x64', { built: true, output, failBuild: true })).rejects.toThrow('compilation failed')
    expect(await readdir(output)).toEqual([])
    expect(await compileScratch()).toEqual(before)
    expect(sha256(await readFile(join(project, 'src/index.ts')))).toBe(startup)
  }
  finally { await rm(output, { recursive: true, force: true }) }
})

test('interruption during generated-input preparation removes its scratch and preserves source', async () => {
  const output = await mkdtemp(join(project, 'tmp/compile-interruption-test-'))
  const before = await compileScratch()
  const controller = new AbortController()
  let observed = false
  const watcher = watch(join(project, 'tmp'), (_event, name) => {
    if (name?.startsWith('compile-') && !before.includes(name)) {
      observed = true
      controller.abort(new Error('Synthetic interruption'))
    }
  })
  try {
    await expect(compile(fixtureTag, process.arch === 'arm64' ? 'bun-linux-arm64' : 'bun-linux-x64', { built: true, output, signal: controller.signal })).rejects.toThrow()
    expect(observed).toBe(true)
    expect(await readdir(output)).toEqual([])
    expect(await compileScratch()).toEqual(before)
  }
  finally {
    watcher.close()
    await rm(output, { recursive: true, force: true })
  }
})
