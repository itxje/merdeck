import { Buffer } from 'node:buffer'
import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

async function main() {
  const directory = dirname(fileURLToPath(import.meta.url))
  const root = resolve(directory, '../..')
  const fromWeb = createRequire(resolve(root, 'web/package.json'))
  const { build } = await import(fromWeb.resolve('vite')) as typeof import('vite')
  const { default: tailwind } = await import(fromWeb.resolve('@tailwindcss/vite')) as typeof import('@tailwindcss/vite')
  const aliases = ['react', 'react-dom', 'lucide-react', 'mermaid', 'dompurify', 'cn', 'class-variance-authority', '@base-ui/react'].map(name => ({ find: name, replacement: resolve(root, 'web/node_modules', name) }))
  const result = await build({
    configFile: false,
    root: directory,
    plugins: [tailwind()],
    resolve: { alias: [{ find: '@', replacement: resolve(root, 'web/src') }, ...aliases] },
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
    build: {
      write: false,
      target: 'es2022',
      minify: true,
      cssCodeSplit: false,
      lib: { entry: resolve(directory, 'app.tsx'), name: 'MerdeckPrototype', formats: ['iife'] },
    },
  })
  const bundle = Array.isArray(result) ? result[0] : result
  if (!bundle || !('output' in bundle))
    throw new Error('Expected one build output')
  const scripts: string[] = []
  const styles: string[] = []
  for (const output of bundle.output) {
    if (output.type === 'chunk') {
      if (output.imports.length || output.dynamicImports.some(name => name !== output.fileName) || /\bimport\s*\(/.test(output.code))
        throw new Error(`Bundle still references JavaScript: ${JSON.stringify({ file: output.fileName, imports: output.imports, dynamicImports: output.dynamicImports })}`)
      scripts.push(output.code)
    }
    else if (output.fileName.endsWith('.css')) {
      styles.push(String(output.source))
    }
    else {
      throw new Error(`Unexpected external asset: ${output.fileName}`)
    }
  }
  if (!scripts.length || !styles.length)
    throw new Error('Missing bundled script or styles')
  const embeddedScript = JSON.stringify(scripts.join('\n')).replace(/</g, '\\u003c')
  const bootstrap = `const script = document.createElement('script');script.textContent=${embeddedScript};document.body.append(script);`
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'"><title>Merdeck — Project diagrams</title><link rel="icon" href="data:,"><style>${styles.join('\n').replace(/<\/style/gi, '<\\/style')}</style></head><body><div id="root"></div><script>${bootstrap}</script></body></html>\n`
  await writeFile(resolve(directory, 'Merdeck.html'), html)
  await mkdir(resolve(root, 'tmp/design'), { recursive: true })
  await writeFile(resolve(root, 'tmp/design/build-resources.json'), `${JSON.stringify({ bytes: Buffer.byteLength(html), scripts: scripts.length, styles: styles.length, externalAssets: 0, toolchain: fromWeb.resolve('vite') }, null, 2)}\n`)
  process.stdout.write(`Built Merdeck.html (${Buffer.byteLength(html)} bytes; scripts and styles embedded)\n`)
}
main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
