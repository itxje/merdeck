import { QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import { ThemeProvider } from '@/app/theme'
import { HttpError } from '@/shared/lib/http'
import { createQueryClient } from '@/shared/lib/query'
import { api } from './api'
import { Workspace } from './workspace'

vi.mock('@/features/preview/preview', () => ({ Preview: () => <div>Diagram canvas</div> }))
beforeEach(() => {
  const media = Object.assign(new EventTarget(), { matches: false })
  vi.stubGlobal('matchMedia', () => media)
})
it('labels login controls, keeps tokens out of persistence and clears failed submissions', async () => {
  vi.spyOn(api, 'session').mockResolvedValue({ authenticated: false })
  vi.spyOn(api, 'login').mockRejectedValue(new HttpError(401, 'unauthorized', 'Invalid token'))
  const client = createQueryClient()
  const { unmount } = render(<QueryClientProvider client={client}><ThemeProvider><Workspace path="" block={0} navigate={vi.fn()} /></ThemeProvider></QueryClientProvider>)
  const input = await screen.findByLabelText('Access token', { exact: true })
  expect(input).toHaveAttribute('type', 'password')
  expect(input).toHaveAttribute('autocomplete', 'off')
  const user = userEvent.setup()
  await user.click(input)
  await user.type(input, 'private-access-value-private-access-value')
  await user.keyboard('{Enter}')
  await waitFor(() => expect(api.login).toHaveBeenCalledTimes(1))
  expect(input).toHaveValue('')
  expect(await screen.findByRole('alert')).toBeVisible()
  expect(localStorage.length).toBe(0)
  await waitFor(() => expect(client.getMutationCache().getAll()).toHaveLength(0))
  unmount()

  client.clear()
})
it('opens directly with open access, without sign-in or Log out, and names the mode in the status bar', async () => {
  vi.spyOn(api, 'session').mockResolvedValue({ authenticated: true, access: 'open', version: '0.0.0-test', pollIntervalMs: 30000, maxSourceBytes: 1048576, storage: { writable: true, identity: 'stable', filesystemType: 'test', supportedFilesystem: 'linux-overlayfs' } })
  vi.spyOn(api, 'tree').mockResolvedValue({ entries: [], revision: 'a'.repeat(64), truncated: false, pollIntervalMs: 30000 })
  const client = createQueryClient()
  const { unmount } = render(<QueryClientProvider client={client}><ThemeProvider><Workspace path="" block={0} navigate={vi.fn()} /></ThemeProvider></QueryClientProvider>)
  expect(await screen.findByText('Open access')).toBeVisible()
  expect(screen.queryByText('Connected')).toBeNull()
  expect(screen.queryByLabelText('Access token')).toBeNull()
  expect(screen.queryByRole('button', { name: 'Log out' })).toBeNull()
  unmount()

  client.clear()
})
it('asks for a token only once the session check shows that one is needed', async () => {
  let resolve: (value: { authenticated: false }) => void = () => {}
  vi.spyOn(api, 'session').mockImplementation(() => new Promise((done) => {
    resolve = done
  }))
  const client = createQueryClient()
  const { unmount } = render(<QueryClientProvider client={client}><ThemeProvider><Workspace path="" block={0} navigate={vi.fn()} /></ThemeProvider></QueryClientProvider>)
  expect(await screen.findByText('Checking your session…')).toBeVisible()
  expect(screen.queryByText(/access token/i)).toBeNull()
  await act(async () => resolve({ authenticated: false }))
  expect(await screen.findByText(/Enter the access token provided by your operator/)).toBeVisible()
  expect(screen.getByLabelText('Access token', { exact: true })).toBeVisible()
  unmount()

  client.clear()
})
