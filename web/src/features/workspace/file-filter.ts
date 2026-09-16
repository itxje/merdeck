import * as React from 'react'

export type FileFilter = 'all' | 'mermaid' | 'markdown' | 'html'
export const fileExtensions: Record<FileFilter, string[]> = {
  all: ['.mmd', '.mermaid', '.md', '.html', '.htm'],
  mermaid: ['.mmd', '.mermaid'],
  markdown: ['.md'],
  html: ['.html', '.htm'],
}
const storageKey = 'merdeck.file-filter'

function storedFilter(): FileFilter {
  try {
    const value = localStorage.getItem(storageKey)
    return value === 'mermaid' || value === 'markdown' || value === 'html' ? value : 'all'
  }
  catch {
    return 'all'
  }
}

// Which file types the explorer lists is a view preference, kept per browser like the colour scheme.
export function useFileFilter(): [FileFilter, (next: FileFilter) => void] {
  const [kinds, setKinds] = React.useState<FileFilter>(storedFilter)
  const choose = React.useCallback((next: FileFilter) => {
    setKinds(next)
    try {
      localStorage.setItem(storageKey, next)
    }
    catch { /* The chosen types still apply when browser storage is unavailable. */ }
  }, [])
  return [kinds, choose]
}
