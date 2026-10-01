import * as React from 'react'

export type FileFilter = 'all' | 'mermaid' | 'markdown' | 'html'
export const fileExtensions: Record<FileFilter, string[]> = {
  all: ['.mmd', '.mermaid', '.md', '.html', '.htm'],
  mermaid: ['.mmd', '.mermaid'],
  markdown: ['.md'],
  html: ['.html', '.htm'],
}
// Each page opens the directory listing; type searches belong to the current page.
export function useFileFilter(): [FileFilter, (next: FileFilter) => void] {
  const [kinds, setKinds] = React.useState<FileFilter>('all')
  return [kinds, setKinds]
}
