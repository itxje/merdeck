import { readFile } from 'node:fs/promises'
import { expect, test } from 'bun:test'
import { actionPins } from '../../scripts/ci/tools'
import { verifyReferences } from '../../scripts/verify-workflows'

test('workflow references reject floating versions, missing comments and unchecked actions', () => {
  const pin = actionPins['actions/checkout']
  expect(() => verifyReferences(`uses: actions/checkout@${pin.sha} # ${pin.version}`)).not.toThrow()
  for (const text of ['uses: actions/checkout@v7', `uses: actions/checkout@${pin.sha}`, `uses: actions/checkout@${'0'.repeat(40)} # ${pin.version}`, 'pull_request_target:', 'continue-on-error: true'])
    expect(() => verifyReferences(text)).toThrow()
})

test('real workflow exposes nonpublishing candidate checks and gates the only writer on verified tag output', async () => {
  const yaml = await readFile('.github/workflows/verify.yml', 'utf8')
  verifyReferences(yaml)
  expect(yaml).toContain('branches: [main, verify/native-readiness]')
  expect(yaml).toContain('pull_request:')
  expect(yaml).toContain('workflow_dispatch:')
  expect(yaml.match(/contents: write/g)).toHaveLength(1)
  expect(yaml).toContain('needs: verify')
  expect(yaml).toContain('github.event_name == \'push\' && github.ref_type == \'tag\'')
  expect(yaml).toContain('hashFiles(\'bun.lock\', \'web/bun.lock\', \'.bun-version\', \'.node-version\')')
  const publisher = yaml.split('\n  publish:')[1]!
  expect(publisher).not.toContain('actions/cache@')
  expect(publisher).toMatch(/artifact-ids: \$\{\{ needs\.verify\.outputs\.artifact-id \}\}/)
  expect(publisher).toContain('cancel-in-progress: false')
  expect(publisher).toContain('--ignore-scripts')
})
