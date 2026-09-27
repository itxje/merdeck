import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig(({ command }) => ({
  plugins: [
    tanstackRouter({
      target: 'react',
      routesDirectory: 'src/app/routes',
      generatedRouteTree: 'src/app/routeTree.gen.ts',
      autoCodeSplitting: true,
      enableRouteGeneration: command !== 'build',
    }),
    react(),
    tailwindcss(),
  ],
  // This direct, exact dependency has a DOM-only `browser` export. Alias only this
  // parser dependency to its worker-safe entry; do not alter global export conditions.
  resolve: {
    tsconfigPaths: true,
    alias: {
      'decode-named-character-reference': fileURLToPath(new URL('./node_modules/decode-named-character-reference/index.js', import.meta.url)),
    },
  },
  server: { host: '127.0.0.1', strictPort: true },
}))
