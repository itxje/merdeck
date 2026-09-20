import { expect, test } from './support'

const url = process.env.MERDECK_OPEN_URL
test.skip(!url, 'Set MERDECK_OPEN_URL to a disposable service without an access token.')

// The shared phone touch-target floor keys off `[data-slot="button"]`, which the shadcn Button
// component sets on itself. The header's overflow menu trigger wraps that same Button through
// DropdownMenuTrigger's `render` prop, but the resulting element ends up with
// `data-slot="dropdown-menu-trigger"` instead, so the floor selector never matches it. Below the
// phone breakpoint every other control in the header reaches 44px except the one that opens the
// menu holding them.
test('the header overflow menu trigger must reach the phone touch-target floor', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(url!)
  const trigger = page.getByRole('banner').getByRole('button', { name: 'More options', exact: true })
  await expect(trigger).toBeVisible()
  const box = (await trigger.boundingBox())!
  expect(box.width).toBeGreaterThanOrEqual(44)
  expect(box.height).toBeGreaterThanOrEqual(44)
})
