export type CiMode = 'docs' | 'source' | 'native'

export function ciMode(event: string, ref: string, paths: readonly string[]): CiMode {
  if (!['push', 'pull_request', 'workflow_dispatch'].includes(event))
    throw new Error('Unsupported CI event')
  if (event === 'workflow_dispatch' || (event === 'push' && (ref.startsWith('refs/tags/') || ref === 'refs/heads/verify/native-readiness')))
    return 'native'
  return paths.every(path => path.startsWith('docs/') || ['README.md', 'LICENSE'].includes(path)) ? 'docs' : 'source'
}

export function ciOptions(args: readonly string[], tag: string) {
  if (new Set(args).size !== args.length || args.some(value => !['--native', '--source-only'].includes(value)))
    throw new Error('Usage: bun run check:ci [--native] [--source-only]')
  const native = args.includes('--native')
  const sourceOnly = args.includes('--source-only')
  if (tag !== 'v0.0.0-ci.fixture' && (!native || sourceOnly))
    throw new Error('Real tag verification requires complete --native acceptance')
  return { native, sourceOnly }
}
