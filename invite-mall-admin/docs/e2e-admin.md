# Admin 端 Playwright E2E 验收说明

## 修改/新增文件清单

### invite-mall-admin

| 文件 | 说明 |
|------|------|
| `playwright.config.ts` | Playwright 配置：baseURL 默认 `http://localhost:5173`，timeout 30s，支持 headless/headed（`PWHEADLESS=0` 为 headed） |
| `tests/admin.e2e.spec.ts` | 单用例：打开 / → 进入后台 → /tasks → 待审核 Tab → 记录条数 n1 → 第一条查看详情 → 填写备注 "auto-e2e" → 审核通过 → 返回列表刷新 → 断言 n2 < n1 |
| `scripts/e2e-admin.cjs` | 一键脚本：先在 `../invite-mall` 执行 `npm run verify`；再 spawn 后端 `verify:serve`、前端 `npm run dev -- --host`，解析端口后跑 Playwright，最后清理进程 |
| `package.json` | 新增脚本 `e2e:admin`: `node scripts/e2e-admin.cjs`，devDependencies 增加 `@playwright/test` |

### invite-mall（后端）

| 文件 | 说明 |
|------|------|
| `scripts/verify-serve.js` | 与 verify 相同环境与 seed，启动 3000 端口并常驻，供 admin e2e 使用 |
| `package.json` | 新增脚本 `verify:serve`: `node scripts/verify-serve.js` |

## 如何运行

在 **invite-mall-admin** 项目根目录执行（建议在 WSL 中）：

```bash
npm install
npx playwright install
npm run e2e:admin
```

仅此一条命令即可完成：后端校验 → 后端常驻 → 前端启动 → Playwright 执行 → 进程清理。

## PASS 输出示例

```
[13:20:01.234] [e2e] 在 invite-mall 执行 npm run verify（校验后端）...

========== Verify: 运行种子流水（同进程） ==========
...
========== VERIFY PASS ==========

[13:20:05.567] [e2e] verify 通过
[13:20:05.568] [e2e] 启动后端 verify:serve（常驻 3000）...
========== Verify-Serve: 运行种子 ==========
========== Verify-Serve: 启动 HTTP 服务 (端口 3000，常驻) ==========
后端已就绪: http://127.0.0.1:3000
[13:20:06.123] [e2e] 后端已就绪: http://127.0.0.1:3000
[13:20:06.124] [e2e] 启动前端 dev（--host，解析端口）...

  VITE v5.x.x  ready in xxx ms
  ➜  Local:   http://localhost:5173/

[13:20:08.456] [e2e] 前端已就绪，端口: 5173
[13:20:08.457] [e2e] 运行 Playwright: baseURL=http://localhost:5173

Running 1 test using 1 worker
  1 passed (12.3s)
[13:20:21.789] [e2e] ========== e2e:admin PASS ==========
[13:20:21.790] [e2e] 关闭前端 dev 进程
[13:20:21.791] [e2e] 关闭后端 verify:serve 进程
```

## 注意

- 端口 3000 / 5173 被占用时，脚本会给出友好提示并退出。
- Windows + WSL：请在 WSL 内执行 `npm run e2e:admin`。
- 仅跑 Playwright（不启动前后端）：先手动启动后端（如 `invite-mall` 下 `npm run verify:serve`）和前端（`npm run dev`），再执行 `PLAYWRIGHT_BASE_URL=http://localhost:5173 npx playwright test tests/admin.e2e.spec.ts`。
