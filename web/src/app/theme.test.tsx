import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import { ThemeProvider, useTheme } from './theme'
import { ThemeToggle } from './theme-toggle'

let media: MediaQueryList
beforeEach(() => {
  const target = new EventTarget()
  media = Object.assign(target, { matches: false, media: '(prefers-color-scheme: dark)', onchange: null, addListener: vi.fn(), removeListener: vi.fn() })
  vi.stubGlobal('matchMedia', vi.fn(() => media))
})
it('theme switch shows the preference and changes it with the keyboard', async () => {
  const user = userEvent.setup()
  render(<ThemeProvider><ThemeToggle /></ThemeProvider>)
  expect(screen.getByRole('group', { name: 'Theme' })).toBeVisible()
  const light = screen.getByRole('button', { name: 'Light theme' })
  const dark = screen.getByRole('button', { name: 'Dark theme' })
  const system = screen.getByRole('button', { name: 'System theme' })
  expect(system).toHaveAttribute('aria-pressed', 'true')
  expect(light).toHaveAttribute('aria-pressed', 'false')
  act(() => dark.focus())
  await user.keyboard('{Enter}')
  expect(localStorage.getItem('merdeck.theme')).toBe('dark')
  expect(document.documentElement).toHaveClass('dark')
  expect(document.documentElement.style.colorScheme).toBe('dark')
  expect(dark).toHaveAttribute('aria-pressed', 'true')
  expect(system).toHaveAttribute('aria-pressed', 'false')
  await user.keyboard('{ArrowLeft}')
  expect(light).toHaveFocus()
  await user.keyboard(' ')
  expect(localStorage.getItem('merdeck.theme')).toBe('light')
  expect(document.documentElement).not.toHaveClass('dark')
  // Pressing the current preference again keeps it selected.
  await user.keyboard(' ')
  expect(light).toHaveAttribute('aria-pressed', 'true')
  expect(localStorage.getItem('merdeck.theme')).toBe('light')
  await user.click(system)
  expect(localStorage.getItem('merdeck.theme')).toBe('system')
  expect(system).toHaveAttribute('aria-pressed', 'true')
})
it('system follows OS changes and removes listeners on unmount', () => {
  const remove = vi.spyOn(media, 'removeEventListener')
  const { unmount } = render(<ThemeProvider><ThemeToggle /></ThemeProvider>)
  act(() => {
    Object.defineProperty(media, 'matches', { value: true, configurable: true })
    media.dispatchEvent(new Event('change'))
  })
  expect(document.documentElement).toHaveClass('dark')
  unmount()
  expect(remove).toHaveBeenCalledWith('change', expect.any(Function))
})
it('loads a stored preference and tolerates unavailable storage', async () => {
  localStorage.setItem('merdeck.theme', 'dark')
  const { unmount } = render(<ThemeProvider><ThemeToggle /></ThemeProvider>)
  expect(document.documentElement).toHaveClass('dark')
  expect(screen.getByRole('button', { name: 'Dark theme' })).toHaveAttribute('aria-pressed', 'true')
  unmount()
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('Unavailable')
  })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Unavailable')
  })
  render(<ThemeProvider><ThemeToggle /></ThemeProvider>)
  expect(screen.getByRole('button', { name: 'System theme' })).toHaveAttribute('aria-pressed', 'true')
  await userEvent.click(screen.getByRole('button', { name: 'Light theme' }))
  expect(screen.getByRole('button', { name: 'Light theme' })).toHaveAttribute('aria-pressed', 'true')
})
it('rejects usage outside the provider', () => {
  function InvalidConsumer() {
    useTheme()
    return null
  }
  expect(() => render(<InvalidConsumer />)).toThrow('useTheme requires ThemeProvider')
})
