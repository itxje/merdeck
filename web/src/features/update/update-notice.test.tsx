import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { UpdateNotice } from './update-notice'
import { useApplicationUpdate } from './use-application-update'

vi.mock('./use-application-update', () => ({ useApplicationUpdate: vi.fn() }))
it('offers an explicit reload only when no work would be lost', async () => {
  const dismiss = vi.fn()
  const reload = vi.fn()
  vi.mocked(useApplicationUpdate).mockReturnValue({ available: false, failed: true, dismiss })
  const { rerender } = render(<UpdateNotice blocked={false} reload={reload} />)
  expect(screen.queryByRole('complementary', { name: 'Application update' })).toBeNull()
  vi.mocked(useApplicationUpdate).mockReturnValue({ available: true, failed: false, dismiss })
  rerender(<UpdateNotice blocked reload={reload} />)
  expect(screen.getByRole('complementary', { name: 'Application update' })).toBeVisible()
  expect(screen.getByRole('status')).toHaveTextContent('before reloading')
  expect(screen.getByRole('button', { name: 'Reload application' })).toBeDisabled()
  rerender(<UpdateNotice blocked={false} reload={reload} />)
  expect(screen.getByRole('status')).toHaveTextContent('Reload to use the new version')
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Reload application' }))
  expect(reload).toHaveBeenCalledOnce()
  await user.click(screen.getByRole('button', { name: 'Dismiss update' }))
  expect(dismiss).toHaveBeenCalledOnce()
})
