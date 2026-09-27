import antfu from '@antfu/eslint-config'

export default antfu({
  react: true,
  typescript: true,
  ignores: ['dist/**', 'coverage/**', 'src/app/routeTree.gen.ts'],
}, { rules: { 'node/prefer-global/process': ['error', 'always'], 'react-refresh/only-export-components': ['error', { allowExportNames: ['Route', 'useTheme', 'buttonVariants', 'tabsListVariants', 'toggleVariants'] }] } })
