import antfu from '@antfu/eslint-config'

export default antfu({
  typescript: true,
  ignores: ['web/**', 'tmp/**', '.cache/**', 'dist/**', 'coverage/**', 'docs/**', 'examples/**', 'AGENTS.md', 'CLAUDE.md', 'README.md'],
}, { files: ['src/index.ts', 'scripts/**/*.ts'], rules: { 'antfu/no-top-level-await': 'off' } }, { rules: { 'node/prefer-global/process': ['error', 'always'] } })
