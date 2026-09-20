import { expect, test } from './support'

const url = process.env.MERDECK_OPEN_URL
test.skip(!url, 'Set MERDECK_OPEN_URL to a disposable service without an access token.')

// Below the phone breakpoint the assistant's resize handle reports its position as a percentage of
// the viewport height (aria-valuenow, driven by the same ArrowUp/ArrowDown keys used at desktop
// width). The panel's actual rendered height is separately capped by a max-height that accounts for
// the phone bar and status bar, so once that cap is reached, further keyboard presses keep raising
// the reported value while the panel's real height stops moving — the handle no longer reports what
// the layout actually does.
test('the assistant resize handle keyboard value must match the panel\'s actual rendered height', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(url!)
  await page.getByRole('banner').getByRole('button', { name: 'More options', exact: true }).click()
  await page.getByRole('menu').getByRole('button', { name: 'Open AI file editor', exact: true }).click()
  const editor = page.getByRole('complementary', { name: 'AI file editor', exact: true })
  await expect(editor).toBeVisible()
  const handle = page.getByRole('separator', { name: 'Resize AI file editor', exact: true })
  await handle.focus()
  // Drive it to its reported maximum.
  for (let i = 0; i < 12; i++) await page.keyboard.press('ArrowUp')
  await expect(handle).toHaveAttribute('aria-valuenow', '85')
  const box = (await editor.boundingBox())!
  const actualPercent = (box.height / 844) * 100
  expect(actualPercent).toBeCloseTo(85, 0)
})
