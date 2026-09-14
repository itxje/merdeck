import type { DirectorySearch } from '../../../../src/shared/contracts'
import type { FileFilter } from './file-filter'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as React from 'react'
import { api } from './api'

export interface SearchView {
  // The text the result belongs to, so a view never pairs a stale result with newer input.
  query: string
  pending: boolean
  error: unknown
  result: DirectorySearch | undefined
}

// Searches below the browsed folder once typing pauses or a file type is chosen; clearing the text with
// every type chosen returns to the folder view.
export function useDirectorySearch(directory: string, kinds: FileFilter, enabled: boolean) {
  const client = useQueryClient()
  const [text, setText] = React.useState('')
  const [query, setQuery] = React.useState('')
  React.useEffect(() => {
    const timer = window.setTimeout(() => setQuery(text.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [text])
  const kind = kinds === 'all' ? null : kinds
  const search = useQuery({
    queryKey: ['search', directory, query, kind],
    queryFn: ({ signal }) => api.search(directory, query, kind, signal),
    enabled: enabled && (query.length > 0 || kind !== null),
    retry: false,
    staleTime: 3000,
  })
  const view: SearchView = { query, pending: text.trim() !== query || search.isFetching, error: search.error, result: search.data }
  const refresh = React.useCallback(() => void client.invalidateQueries({ queryKey: ['search'] }), [client])
  return { view, onQueryChange: setText, refresh }
}
