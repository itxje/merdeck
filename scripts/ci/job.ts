import { writeFileSync } from 'node:fs'
import { readFile, rename, writeFile } from 'node:fs/promises'
import { z } from 'zod'
import { run } from './process'

const config = z.strictObject({ environment: z.record(z.string(), z.string()), marker: z.string() }).parse(JSON.parse(await readFile(process.argv[2]!, 'utf8')))
Object.assign(process.env, config.environment)
let exit = 1
process.on('exit', () => writeFileSync(`${config.marker}.exit`, String(exit)))
try {
  await run(['run', 'check:ci', '--native'], 1200000)
  const diff = Bun.spawnSync(['git', 'diff', '--check'], { stdout: 'inherit', stderr: 'inherit' })
  if (diff.exitCode)
    throw new Error('Whitespace gate failed')
  exit = 0
}
catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : 'Hosted checks failed'}\n`)
}
finally {
  await writeFile(`${config.marker}.pending`, String(exit))
  await rename(`${config.marker}.pending`, config.marker)
}
process.exitCode = exit
