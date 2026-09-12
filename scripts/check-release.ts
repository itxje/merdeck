import { join } from 'node:path'
import { project } from './ci/process'
import { releaseArguments } from './release-version'
import { archiveName } from './release/archive'
import { releaseFiles } from './release/manifest'

const args = releaseArguments(process.argv.slice(2))
const { manifest } = await releaseFiles(join(project, 'dist/release'), args.tag)
if (manifest.target !== args.target)
  throw new Error('Target mismatch')
process.stdout.write(`Release inventory, version, ELF architecture, archive contents and SHA-256 verified: ${archiveName} holding ${manifest.filename}\n`)
