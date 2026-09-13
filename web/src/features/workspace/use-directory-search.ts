import type { DirectorySearch } from '../../../../src/shared/contracts'
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

// Searches below the browsed folder once typing pauses; clearing the text returns to the folder view.
export function useDirectorySearch(directory: string, enabled: boolean) {
  const client = useQueryClient()
  const [text, setText] = React.useState('')
  const [query, setQuery] = React.useState('')
  React.useEffect(() => {
    const timer = window.setTimeout(() => setQuery(text.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [text])
  const search = useQuery({
    queryKey: ['search', directory, query],
    queryFn: ({ signal }) => api.search(directory, query, signal),
    enabled: enabled && query.length > 0,
    retry: false,
    staleTime: 3000,
  })
  const view: SearchView = { query, pending: text.trim() !== query || search.isFetching, error: search.error, result: search.data }
  const refresh = React.useCallback(() => void client.invalidateQueries({ queryKey: ['search'] }), [client])
  return { view, onQueryChange: setText, refresh }
}
