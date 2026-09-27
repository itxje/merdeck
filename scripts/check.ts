const commands = [
  ['run', 'lint'],
  ['run', 'typecheck'],
  ['node_modules/typescript/bin/tsc', '--project', 'tests/integration/acceptance/tsconfig.json'],
  ['test', './tests/integration/acceptance'],
  ['run', 'test:coverage'],
  ['run', '--cwd', 'web', 'lint'],
  ['run', '--cwd', 'web', 'typecheck'],
  ['run', '--cwd', 'web', 'test:coverage'],
  ['run', 'build'],
]
for (const args of commands) {
  const child = Bun.spawn([process.execPath, ...args], { stdout: 'inherit', stderr: 'inherit' })
  const status = await child.exited
  if (status !== 0)
    process.exit(status)
}
