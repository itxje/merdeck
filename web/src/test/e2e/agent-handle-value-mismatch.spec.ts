import { expect, test } from './support'

const url = process.env.MERDECK_OPEN_URL
test.skip(!url, 'Set MERDECK_OPEN_URL to a disposable service without an access token.')

// Below the phone breakpoint the assistant's resize handle reports its position as a percentage of
// the viewport height (aria-valuenow, driven by the same ArrowUp/ArrowDown keys used at desktop
// width). The panel's actual rendered height must be capped by the same figure the handle reports
// (aria-valuemax), computed from the header, the phone bar, the status bar and the device's own
// bottom safe area together, so that once the cap is reached, the reported value and the panel's
// real height stop moving together rather than one outrunning the other. The exact number is not
// asserted here — it depends on the viewport and the device's safe area — only that the two agree.
test('the assistant resize handle keyboard value must match the panel\'s actual rendered height', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(url!)
  await page.getByRole('banner').getByRole('button', { name: 'Open AI file editor', exact: true }).click()
  const editor = page.getByRole('complementary', { name: 'AI file editor', exact: true })
  await expect(editor).toBeVisible()
  const handle = page.getByRole('separator', { name: 'Resize AI file editor', exact: true })
  await handle.focus()
  // Drive it well past its reported maximum; further presses must not move it further.
  for (let i = 0; i < 20; i++) await page.keyboard.press('ArrowUp')
  const max = Number(await handle.getAttribute('aria-valuemax'))
  await expect(handle).toHaveAttribute('aria-valuenow', String(Math.round(max)))
  const box = (await editor.boundingBox())!
  const actualPercent = (box.height / 844) * 100
  expect(actualPercent).toBeCloseTo(max, 0)
})
