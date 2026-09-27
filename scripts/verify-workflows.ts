import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { project } from './ci/process'
import { actionlint, actionPins } from './ci/tools'

export function verifyReferences(yaml: string) {
  const references = [...yaml.matchAll(/\buses:\s*(\S+)\s*#\s*(v\S+)/g)]
  if (references.length !== [...yaml.matchAll(/\buses:/g)].length)
    throw new Error('Every action must have an immutable reference and version comment')
  for (const match of references) {
    const [name, sha] = match[1]!.split('@')
    const pin = actionPins[name as keyof typeof actionPins]
    if (!pin || sha !== pin.sha || match[2] !== pin.version)
      throw new Error(`Unverified action reference: ${name}`)
  }
  if (/pull_request_target/.test(yaml) || /continue-on-error:\s*true/.test(yaml))
    throw new Error('Unsafe or failure-masking workflow configuration')
}

export async function verifyWorkflows() {
  const directory = join(project, '.github/workflows')
  const paths = (await readdir(directory)).filter(name => /\.ya?ml$/.test(name)).sort().map(name => join(directory, name))
  if (!paths.length)
    throw new Error('No workflows found')
  for (const path of paths)
    verifyReferences(await readFile(path, 'utf8'))
  const binary = join(project, '.cache/actionlint', actionlint.version, 'actionlint')
  if (!await Bun.file(binary).exists())
    throw new Error('Run bun scripts/setup-ci-tools.ts before lint:workflows')
  const version = Bun.spawnSync([binary, '-version'], { timeout: 5000 })
  if (version.exitCode || !version.stdout.toString().startsWith(actionlint.version))
    throw new Error('Wrong actionlint version')
  const child = Bun.spawn([binary, '-color', ...paths], { cwd: project, stdout: 'inherit', stderr: 'inherit', timeout: 30000 })
  if (await child.exited !== 0)
    throw new Error('Workflow validation failed')
  process.stdout.write(`actionlint ${actionlint.version}: ${paths.length} workflows passed; all action pins verified\n`)
}
if (import.meta.main)
  await verifyWorkflows()
