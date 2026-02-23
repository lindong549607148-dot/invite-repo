import { test as setup, expect } from '@playwright/test'

const authFile = 'tests/.auth/user.json'

setup('登录并保存 auth 状态', { timeout: 45_000 }, async ({ page }) => {
  await page.goto('/login')
  const enterBtn = page.getByRole('button', { name: /继续进入|进入后台/ }).first()
  await expect(enterBtn).toBeVisible({ timeout: 30000 })
  await enterBtn.click()
  await page.waitForURL(/\/(dashboard)?$/, { timeout: 15000 })
  await page.context().storageState({ path: authFile })
})
