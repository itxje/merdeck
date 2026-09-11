import { requireSession, run } from '../ci/process'

requireSession()
await run(['node_modules/typescript/bin/tsc', '--project', 'tests/release/tsconfig.json'])
await run(['node_modules/typescript/bin/tsc', '--project', 'tests/ci/tsconfig.json'])
await run(['test', '--timeout', '60000', './tests/release', './tests/ci'])
