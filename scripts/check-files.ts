import { inspectFilesystem } from '../src/modules/diagrams/filesystem'
import { describeFixture, fixtureParent } from '../tests/integration/files/fixtures'

if (Bun.version !== '1.4.2')
  throw new Error('check:files requires the pinned Bun 1.4.2 runtime')

for (const unsupported of [false, true]) {
  const parent = await fixtureParent(unsupported)
  process.stdout.write(`${unsupported ? 'Unsupported write refusal' : 'Practical acceptance'} fixture parent: ${parent}\n`)
  const info = await describeFixture(parent)
  const expected = unsupported ? process.env.MERDECK_TEST_UNSUPPORTED_FS ?? '0x6a656a63' : process.env.MERDECK_TEST_EXPECTED_FS ?? '0x794c7630'
  if (info.filesystemType !== expected)
    throw new Error(`Fixture filesystem mismatch: expected ${expected}, observed ${info.filesystemType}`)
  const capability = await inspectFilesystem(parent, BigInt(info.device), BigInt(info.device))
  if (capability.writable === unsupported)
    throw new Error(unsupported ? 'MERDECK_TEST_UNSUPPORTED_PARENT must actually refuse writes' : 'The configured fixture parent is not admitted by production storage policy; fixtures are never silently relocated')
}

const commands = [
  ['node_modules/typescript/bin/tsc', '--project', 'tests/integration/files/tsconfig.json'],
  ['test', './src/modules/diagrams'],
  ['tests/integration/files/domain-smoke.ts'],
]
for (const args of commands) {
  process.stdout.write(`File acceptance command: bun ${args.join(' ')}\n`)
  const child = Bun.spawn([process.execPath, ...args], { stdout: 'inherit', stderr: 'inherit', timeout: 60000 })
  const exit = await child.exited
  process.stdout.write(`${JSON.stringify({ command: args, exit, signal: child.signalCode })}\n`)
  if (exit !== 0 || child.signalCode)
    process.exit(exit || 1)
}
process.stdout.write('Practical file acceptance passed. The separate final-window diagnostic retains applicationSafetyPassed=false.\n')
