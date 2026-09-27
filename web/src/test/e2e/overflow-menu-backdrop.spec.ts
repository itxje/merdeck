import { expect, test } from './support'

const url = process.env.MERDECK_OPEN_URL
test.skip(!url, 'Set MERDECK_OPEN_URL to a disposable service without an access token.')

// Below the phone breakpoint, the theme switch and the assistant toggle sit inside the header's
// overflow menu as plain toggles rather than menu items, so selecting one does not tell the menu a
// selection happened and the menu stays open. A full-viewport pointer-events layer then remains in
// place behind it, so the very next tap anywhere else on the page — including on a completely
// unrelated control such as the phone bottom bar's pane tabs — never reaches its target.
test('a toggle inside the phone overflow menu must not leave the rest of the page unresponsive to touch', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(url!)
  await page.getByRole('button', { name: 'Open project files', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Project files', exact: true })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'welcome.mmd', exact: true }).click()
  await expect(dialog).toBeHidden()
  const sourceTab = page.getByRole('tab', { name: 'Source', exact: true })
  const previewTab = page.getByRole('tab', { name: 'Preview', exact: true })
  await expect(previewTab).toHaveAttribute('aria-selected', 'true')

  await page.getByRole('banner').getByRole('button', { name: 'More options', exact: true }).click()
  const menu = page.getByRole('menu')
  await expect(menu).toBeVisible()
  await menu.getByRole('button', { name: 'Dark theme', exact: true }).click()
  await expect(page.locator('html')).toHaveClass('dark')

  // The menu was never told a selection happened, so it is still open here.
  await expect(menu).toBeVisible()

  // A person on a phone would now tap the pane tab they actually meant to use. That tap must land.
  await sourceTab.click({ timeout: 5000 })
  await expect(sourceTab).toHaveAttribute('aria-selected', 'true')
})
