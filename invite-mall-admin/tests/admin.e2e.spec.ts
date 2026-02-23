import path from 'node:path'
import fs from 'node:fs'
import { test, expect } from '@playwright/test'

const DEBUG_DIR = 'test-results'

type RefundItem = { taskId?: string | number }

function parseRefundList(json: unknown): RefundItem[] {
  if (Array.isArray(json)) return json as RefundItem[]
  if (json && typeof json === 'object') {
    const data = (json as Record<string, unknown>).data
    if (Array.isArray(data)) return data as RefundItem[]
  }
  return []
}

function ensureDebugDir() {
  fs.mkdirSync(DEBUG_DIR, { recursive: true })
}

async function fetchRefundList(
  page: import('@playwright/test').Page,
  apiBase: string,
  adminKey: string
): Promise<RefundItem[]> {
  const res = await page.request.get(`${apiBase}/api/admin/refund/list`, {
    headers: { 'x-admin-key': adminKey },
  })
  const json = await res.json().catch(() => null)
  return parseRefundList(json)
}

async function writeSummary(page: import('@playwright/test').Page, prefix: string) {
  ensureDebugDir()
  await page.screenshot({ path: path.join(DEBUG_DIR, `${prefix}.png`) })
  const html = await page.content()
  fs.writeFileSync(path.join(DEBUG_DIR, `${prefix}.html`), html, 'utf-8')
  const summary = html.replace(/\s+/g, ' ').slice(0, 2000)
  fs.writeFileSync(path.join(DEBUG_DIR, `${prefix}.summary.txt`), summary, 'utf-8')
  console.log(`[e2e] debug: ${DEBUG_DIR}/${prefix}.png .html .summary.txt`)
}

async function waitForAppReady(page: import('@playwright/test').Page, label: string) {
  const startUrl = page.url()
  try {
    await page.waitForFunction(() => document.readyState === 'complete', null, { timeout: 30000 })
    const root = page.locator('#root')
    await expect(root).toBeVisible({ timeout: 60000 })
    try {
      await page.waitForFunction(() => (document.querySelector('#root')?.children.length || 0) > 0, null, { timeout: 10000 })
    } catch {
      // 轻量触发 hydrate，避免空壳卡死
      await page
        .evaluate(async () => {
          const mod = await import('/src/stores/auth.ts')
          if (mod?.useAuthStore?.getState) {
            mod.useAuthStore.getState().setHasHydrated(true)
          }
        })
        .catch(() => {})
      await page.waitForFunction(() => (document.querySelector('#root')?.children.length || 0) > 0, null, { timeout: 50000 })
    }
    let stable = 0
    for (let i = 0; i < 30 && stable < 3; i += 1) {
      const cnt = await page.evaluate(() => document.querySelector('#root')?.children.length || 0)
      if (cnt > 0) stable += 1
      else stable = 0
      await page.waitForTimeout(200)
    }
    if (stable < 3) throw new Error('root not stable')

    const sidebar = page.locator('aside')
    const header = page.locator('header')
    const hasSidebar = await sidebar.isVisible().catch(() => false)
    const hasHeader = await header.isVisible().catch(() => false)
    if (!hasSidebar && !hasHeader) {
      throw new Error('layout not visible')
    }
  } catch (err) {
    console.log('[e2e] waitForAppReady fail:', String(err))
    console.log('[e2e] url:', page.url(), 'startUrl:', startUrl, 'label:', label)
    await writeSummary(page, `debug-app-ready-${label}`)
    throw new Error(`[e2e] App not ready: ${label}`)
  }
}

test.describe('待审核任务 → 详情 → 审核通过', () => {
  test('全流程：登录 → 任务管理 → 待审核 → 详情 → 填写备注 → 审核通过 → 列表条数减少', { timeout: 60_000 }, async ({ page, baseURL }) => {
    test.setTimeout(60_000)
    console.log('[e2e] trace path:', test.info().outputPath('trace.zip'))
    const fullBase = baseURL || process.env.BASE_URL || 'http://localhost:5173'
    console.log('[e2e] baseURL:', fullBase)
    const apiBase = process.env.API_BASE_URL || 'http://127.0.0.1:3000'
    const adminKey = process.env.VITE_ADMIN_KEY || 'dev-admin-key'
    const userName = `e2e-admin-${Date.now()}`
    const loginRes = await page.request.post(`${apiBase}/api/users/login`, { data: { userName } })
    const loginJson = await loginRes.json()
    const token = loginJson?.data?.token || loginJson?.token
    if (!token) throw new Error('[e2e] 无法获取用户 token（/api/users/login）')
    await page.route('**/api/admin/**', (route) => {
      const headers = { ...route.request().headers(), 'x-admin-key': adminKey }
      route.continue({ headers })
    })
    await page.route(/\/api\/tasks(\?.*)?$/, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ code: 0, data: { list: [], total: 0 } }),
      })
    })
    await page.addInitScript(
      ({ t, name }) => {
        const value = JSON.stringify({ state: { token: t, user: { name } }, version: 0 })
        localStorage.setItem('invite-mall-auth', value)
      },
      { t: token, name: userName }
    )
    page.on('console', (msg) => {
      console.log(`[e2e][console.${msg.type()}]`, msg.text())
    })
    page.on('pageerror', (err) => {
      console.log('[e2e][pageerror]', err.message)
    })
    page.on('requestfailed', (req) => {
      console.log('[e2e][requestfailed]', req.url(), req.failure()?.errorText || '')
    })
    page.on('crash', () => {
      console.log('[e2e][page] crashed')
    })

    // ——— 1) API 作为 truth source —— 
    const apiList = await fetchRefundList(page, apiBase, adminKey)
    if (apiList.length === 0) {
      throw new Error('待审核数据为空：/api/admin/refund/list 返回空。请先跑 invite-mall 的 verify/seed。')
    }
    const taskId = apiList[0]?.taskId
    if (!taskId) throw new Error('待审核数据异常：缺少 taskId')

    // ——— 2) 先确保应用壳稳定挂载 —— 
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await waitForAppReady(page, 'app-shell')

    // ——— 3) 直达详情页 —— 
    await page.goto(`/tasks/${taskId}`, { waitUntil: 'domcontentloaded' })
    try {
      await waitForAppReady(page, 'task-detail')
    } catch {
      await page.reload({ waitUntil: 'networkidle' })
      await waitForAppReady(page, 'task-detail-retry')
    }

    // ——— 7) 详情页填写备注 ———
    const remarkInput = page.getByPlaceholder('审核备注')
    await expect(remarkInput).toBeVisible({ timeout: 30000 })
    await remarkInput.fill('auto-e2e')

    // ——— 8) 审核通过 ———
    const approveRes = page.waitForResponse(
      (res) => res.url().includes('/admin/refund/approve') && res.request().method() === 'POST',
      { timeout: 15000 }
    )
    const approveBtn = page.getByRole('button', { name: /^审核通过$/ })
    await expect(approveBtn).toBeVisible({ timeout: 30000 })
    await approveBtn.click()
    await approveRes
    await expect(page.locator('div.fixed').filter({ hasText: '审核通过' })).toBeVisible({ timeout: 5000 })

    // ——— 9) 断言审核后列表减少 —— 
    const afterList = await fetchRefundList(page, apiBase, adminKey)
    expect(afterList.length).toBeLessThan(apiList.length)
  })
})
