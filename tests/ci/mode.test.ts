import { expect, test } from 'bun:test'
import { ciMode, ciOptions } from '../../scripts/ci/mode'

test('documentation-only changes avoid heavy checks, and unknown paths require source verification', () => {
  for (const paths of [[], ['README.md'], ['LICENSE', 'docs/task/release.md'], ['docs/notes with\na newline.md']])
    expect(ciMode('push', 'refs/heads/main', paths)).toBe('docs')
  for (const path of ['src/index.ts', 'web/src/index.css', '.github/workflows/verify.yml', 'bun.lock', '.bun-version', 'AGENTS.md', 'examples/project/welcome.mmd'])
    expect(ciMode('push', 'refs/heads/main', ['docs/plan/ci.md', path])).toBe('source')
  expect(ciMode('pull_request', 'refs/pull/1/merge', ['web/src/app.tsx'])).toBe('source')
})

test('tags, manual checks and native-readiness always require full native verification', () => {
  expect(ciMode('push', 'refs/tags/v1.2.3', ['README.md'])).toBe('native')
  expect(ciMode('workflow_dispatch', 'refs/heads/main', [])).toBe('native')
  expect(ciMode('push', 'refs/heads/verify/native-readiness', [])).toBe('native')
  expect(() => ciMode('unexpected', 'refs/heads/main', [])).toThrow()
})

test('source-only mode cannot certify a real release, and invalid or duplicate flags fail', () => {
  expect(ciOptions(['--native', '--source-only'], 'v0.0.0-ci.fixture')).toEqual({ native: true, sourceOnly: true })
  expect(ciOptions(['--native'], 'v1.2.3')).toEqual({ native: true, sourceOnly: false })
  for (const args of [[], ['--source-only'], ['--native', '--source-only']])
    expect(() => ciOptions(args, 'v1.2.3')).toThrow()
  for (const args of [['--native', '--native'], ['--source-only', '--source-only'], ['--unknown']])
    expect(() => ciOptions(args, 'v0.0.0-ci.fixture')).toThrow()
})
