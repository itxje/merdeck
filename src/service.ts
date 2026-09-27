import type { DiagramService } from './modules/diagrams'
import type { BuildInfo } from './shared/build-info'
import type { StaticAssets } from './shared/static-assets'
import { resolve } from 'node:path'
import { createApp } from './app'
import { ConfigError, loadConfig } from './config'
import { createDiagramService } from './modules/diagrams'
import { developmentBuild } from './shared/build-info'
import { loadStaticAssets } from './shared/static-assets'

export async function startService(options: { assets?: StaticAssets, buildInfo?: BuildInfo } = {}) {
  const info = options.buildInfo ?? developmentBuild
  if (process.argv.includes('--version')) {
    process.stdout.write(`Merdeck ${info.version}\n`)
    return
  }
  if (process.argv.includes('--build-info')) {
    process.stdout.write(`${JSON.stringify({ ...info, bun: Bun.version, standalone: Bun.isStandaloneExecutable })}\n`)
    return
  }
  let diagrams: DiagramService | undefined
  try {
    const config = await loadConfig(process.env)
    diagrams = await createDiagramService(config)
    if (Bun.isStandaloneExecutable && !options.assets)
      throw new Error('Embedded assets are missing')
    const services = config.apiBasePath === '/api'
      ? { diagrams, buildInfo: info, assets: options.assets ?? await loadStaticAssets(resolve(import.meta.dir, '../web/dist')) }
      : { diagrams, buildInfo: info }
    const app = createApp(config, services)
    const server = Bun.serve({ hostname: config.host, port: config.port, idleTimeout: 15, fetch: app.fetch })
    let stopping = false
    const shutdown = () => {
      if (stopping)
        return
      stopping = true
      // Reject new work; graceful stop lets in-flight atomic saves finish.
      void Promise.all([app.close(), server.stop(false)]).catch(() => {
        process.exitCode = 1
      })
    }
    process.once('SIGINT', shutdown)
    process.once('SIGTERM', shutdown)
  }
  catch (error) {
    await diagrams?.close()
    process.stderr.write(`${error instanceof ConfigError ? error.message : 'Service startup failed.'}\n`)
    process.exitCode = 1
  }
}
