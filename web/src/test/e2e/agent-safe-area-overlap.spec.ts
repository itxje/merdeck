import { expect, test } from './support'

const url = process.env.MERDECK_OPEN_URL
test.skip(!url, 'Set MERDECK_OPEN_URL to a disposable service without an access token.')

// The assistant panel's reachable maximum height is computed in JS from a fixed 86px of phone
// chrome (the status bar plus the phone bar), which is also what the CSS bottom offset used to
// derive before it grew an extra env(safe-area-inset-bottom) term. On a device that actually reports
// a bottom safe area (almost every modern phone without a physical home button), the CSS reserves
// more space at the bottom than the JS thinks it does. The panel's max-height clamp that used to
// backstop this was removed in the same change that introduced the shared calculation, so nothing
// stops the panel from rendering tall enough to push its top edge up over the header.
test('the assistant panel must not overlap the header when driven to its maximum height with a bottom safe area', async ({ page }) => {
  const client = await page.context().newCDPSession(page)
  await client.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 0, left: 0, bottom: 34, right: 0 } })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(url!)
  await page.getByRole('banner').getByRole('button', { name: 'More options', exact: true }).click()
  await page.getByRole('menu').getByRole('button', { name: 'Open AI file editor', exact: true }).click()
  const editor = page.getByRole('complementary', { name: 'AI file editor', exact: true })
  await expect(editor).toBeVisible()
  const handle = page.getByRole('separator', { name: 'Resize AI file editor', exact: true })
  await handle.focus()
  for (let i = 0; i < 15; i++) await page.keyboard.press('ArrowUp')

  const header = (await page.getByRole('banner').boundingBox())!
  const box = (await editor.boundingBox())!
  expect(box.y).toBeGreaterThanOrEqual(header.y + header.height)
})
