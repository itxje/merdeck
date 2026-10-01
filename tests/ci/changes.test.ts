import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from 'bun:test'
import { changeRange } from '../../scripts/ci/changes'
import { ciMode } from '../../scripts/ci/mode'

async function repository(check: (root: string, git: (...args: string[]) => string, commit: (path: string, content: string) => Promise<string>) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), 'merdeck-ci-changes-'))
  const git = (...args: string[]) => {
    const result = Bun.spawnSync(['git', ...args], { cwd: root, stdout: 'pipe', stderr: 'pipe' })
    if (result.exitCode !== 0)
      throw new Error(result.stderr.toString())
    return result.stdout.toString().trim()
  }
  const commit = async (path: string, content: string) => {
    const file = join(root, path)
    await mkdir(join(file, '..'), { recursive: true })
    await writeFile(file, content)
    git('add', '--all')
    git('commit', '--quiet', '-m', 'fixture')
    return git('rev-parse', 'HEAD')
  }
  try {
    git('init', '--quiet', '--initial-branch=main')
    git('config', 'user.name', 'CI fixture')
    git('config', 'user.email', 'ci@example.invalid')
    await check(root, git, commit)
  }
  finally { await rm(root, { recursive: true, force: true }) }
}

test('a multi-commit push includes earlier source changes and preserves unusual path bytes', async () => {
  await repository(async (root, git, commit) => {
    const before = await commit('README.md', 'initial\n')
    await commit('src/a\nquoted "file".ts', 'source\n')
    const after = await commit('docs/latest.md', 'last commit is docs\n')
    const range = changeRange(root, 'push', { before, after })
    expect(range.paths).toEqual(['docs/latest.md', 'src/a\nquoted "file".ts'])
    expect(ciMode('push', 'refs/heads/main', range.paths)).toBe('source')
    expect(git('rev-parse', 'HEAD')).toBe(after)
  })
})

test('renaming source into docs, renaming docs into source and deleting source require checks', async () => {
  await repository(async (root, git, commit) => {
    const original = await commit('source.ts', 'source\n')
    await mkdir(join(root, 'docs'), { recursive: true })
    git('mv', 'source.ts', 'docs/source.md')
    const movedToDocs = await commit('README.md', 'docs\n')
    expect(changeRange(root, 'push', { before: original, after: movedToDocs }).paths).toEqual(['README.md', 'docs/source.md', 'source.ts'])
    git('mv', 'docs/source.md', 'restored.ts')
    const restored = await commit('README.md', 'restored\n')
    expect(ciMode('push', 'refs/heads/main', changeRange(root, 'push', { before: movedToDocs, after: restored }).paths)).toBe('source')
    git('rm', 'restored.ts')
    const deleted = await commit('README.md', 'deleted\n')
    expect(ciMode('push', 'refs/heads/main', changeRange(root, 'push', { before: restored, after: deleted }).paths)).toBe('source')
  })
})

test('new branches compare against the empty tree, and incomplete or mismatched push metadata fails', async () => {
  await repository(async (root, git, commit) => {
    const after = await commit('src/main.ts', 'source\n')
    const range = changeRange(root, 'push', { before: '0'.repeat(40), after })
    expect(range.paths).toEqual(['src/main.ts'])
    for (const payload of [null, {}, { before: after, after: '--all' }, { before: '1'.repeat(40), after }])
      expect(() => changeRange(root, 'push', payload)).toThrow()
    const next = await commit('README.md', 'next\n')
    expect(() => changeRange(root, 'push', { before: after, after })).toThrow('checked-out commit')
    expect(git('rev-parse', 'HEAD')).toBe(next)
  })
})

test('pull request classification uses the merge base without including target-only changes', async () => {
  await repository(async (root, git, commit) => {
    await commit('README.md', 'initial\n')
    git('checkout', '--quiet', '-b', 'docs')
    const head = await commit('docs/guide.md', 'guide\n')
    git('checkout', '--quiet', 'main')
    const base = await commit('src/new.ts', 'target changed\n')
    git('merge', '--quiet', '--no-edit', 'docs')
    const range = changeRange(root, 'pull_request', { pull_request: { head: { sha: head }, base: { sha: base } } })
    expect(range.paths).toEqual(['docs/guide.md'])
    expect(ciMode('pull_request', 'refs/pull/1/merge', range.paths)).toBe('docs')
    expect(() => changeRange(root, 'pull_request', { pull_request: { head: null } })).toThrow()
  })
})
