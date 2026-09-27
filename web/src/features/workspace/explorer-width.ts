import * as React from 'react'

export const explorerWidth = { minimum: 180, maximum: 520, default: 232 }
const storageKey = 'merdeck.explorer-width'

export function boundedWidth(value: number): number {
  return Math.min(explorerWidth.maximum, Math.max(explorerWidth.minimum, Math.round(value)))
}

function storedWidth(): number {
  try {
    const value = Number(localStorage.getItem(storageKey))
    return Number.isFinite(value) && value > 0 ? boundedWidth(value) : explorerWidth.default
  }
  catch {
    return explorerWidth.default
  }
}

// How wide the explorer sits is a view preference, kept per browser like the colour scheme.
export function useExplorerWidth(): [number, (next: number) => void] {
  const [width, setWidth] = React.useState<number>(storedWidth)
  const resize = React.useCallback((next: number) => {
    const bounded = boundedWidth(next)
    setWidth(bounded)
    try {
      localStorage.setItem(storageKey, String(bounded))
    }
    catch { /* The chosen width still applies when browser storage is unavailable. */ }
  }, [])
  return [width, resize]
}
