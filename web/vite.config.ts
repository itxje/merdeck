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
  // Prefer package exports' worker condition over its DOM-only browser entry.
  resolve: { tsconfigPaths: true, conditions: ['worker'] },
  server: { host: '127.0.0.1', strictPort: true },
}))
