import type { PropsWithChildren } from 'react'
import * as React from 'react'

export type Theme = 'light' | 'dark' | 'system'
interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
}
const ThemeContext = React.createContext<ThemeContextValue | null>(null)
const storageKey = 'merdeck.theme'
function readTheme(): Theme {
  try {
    const value = localStorage.getItem(storageKey)
    return value === 'light' || value === 'dark' ? value : 'system'
  }
  catch {
    return 'system'
  }
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [preference, setPreference] = React.useState<Theme>(readTheme)
  React.useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const resolved = preference === 'system' ? (media.matches ? 'dark' : 'light') : preference
      document.documentElement.classList.toggle('dark', resolved === 'dark')
      document.documentElement.style.colorScheme = resolved
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [preference])
  const setTheme = React.useCallback((next: Theme) => {
    setPreference(next)
    try {
      localStorage.setItem(storageKey, next)
    }
    catch { /* Theme changes still work when browser storage is unavailable. */ }
  }, [])
  return <ThemeContext value={{ theme: preference, setTheme }}>{children}</ThemeContext>
}

export function useTheme() {
  const value = React.use(ThemeContext)
  if (!value)
    throw new Error('useTheme requires ThemeProvider')
  return value
}
