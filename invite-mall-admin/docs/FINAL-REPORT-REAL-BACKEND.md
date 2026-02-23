# 最终报告：前端 5173 切换真实后端 3000

## Step 0 项目目录

| 项目 | 绝对路径 |
|------|----------|
| 后端 | `/root/projects/invite-mall` |
| 前端 | `/root/projects/invite-mall-admin` |

---

## 验收结果

### 后端 3000 是否正常

- **健康检查**：`curl -i http://127.0.0.1:3000/health` → **HTTP/1.1 200 OK**
- Body：`{"code":0,"msg":"ok","data":{"status":"up"}}`
- 控制台：`Listening on http://localhost:3000`

### 前端是否已关闭 Mock

- **证据**：`.env.development.local` 存在且含 `VITE_USE_MOCK=0`（覆盖 `.env.development` 的 `VITE_USE_MOCK=1`）
- **代码**：`src/main.tsx` 仅在 `import.meta.env.VITE_USE_MOCK === '1'` 时调用 `setupMock()`，故 `VITE_USE_MOCK=0` 时**不会**注册 axios-mock-adapter
- 重启前端后，浏览器 Console 可临时看到 `[env] VITE_USE_MOCK= 0`（若保留打印）

### /api proxy 是否生效

- **配置**：`vite.config.ts` 中 `server.proxy['/api']` → `target: 'http://127.0.0.1:3000'`, `changeOrigin: true`
- **证据**：浏览器请求发往 `http://localhost:5173/api/...`，由 Vite 转发到 3000；后端终端会打印对应 `GET /api/admin/refund/list` 等日志
- **curl 直连 3000**：`curl -H "x-admin-key: dev-admin-key" http://127.0.0.1:3000/api/admin/refund/list` → 200，body `{"code":0,"msg":"ok","data":[]}`

### refund/list 和 task detail 是否真实可用

- **refund/list**：直连 3000 返回 200，data 为数组（可为空 `[]`）
- **tasks/detail**：直连 `http://127.0.0.1:3000/api/admin/tasks/detail?taskId=xxx` 带 `x-admin-key` 返回 200（当 taskId 存在）；taskId 不存在时 400 bad_request，属预期

### approve/reject 是否能成功并刷新页面

- 后端已实现 `POST /api/admin/refund/approve`、`POST /api/admin/refund/reject`，前端详情页「审核通过」「拒绝」会调用上述接口
- 成功后前端会 toast、重新拉取 detail；返回列表后刷新会再次请求 refund/list，数据来自 3000

---

## 若仍失败：可能原因与修复

| 原因 | 现象 | 修复 |
|------|------|------|
| **仍在 mock** | Network 无 `/api/` 或响应像 mock 数据 | 确认 `.env.development.local` 含 `VITE_USE_MOCK=0`，保存后**重启前端**（Ctrl+C 再 `npm run dev`） |
| **proxy 未命中** | 请求发往 3000 或 404 | 确认 `VITE_API_BASE_URL=/api`（相对路径），且 `vite.config.ts` 中 proxy 配置正确 |
| **后端路由不一致** | 404 / 405 | 核对后端路由：`GET /api/admin/refund/list`、`GET /api/admin/tasks/detail`、`POST /api/admin/refund/approve`、`POST /api/admin/refund/reject` |
| **x-admin-key 不匹配** | 401/403 | 前端 `VITE_ADMIN_KEY=dev-admin-key`，后端默认接受 `dev-admin-key`（见 `invite-mall/src/middlewares/adminAuth.js`） |
| **CORS** | 浏览器报 CORS 错误 | 仅在前端直连 3000 时会出现；应使用 `baseURL=/api` 走 Vite proxy，则无 CORS |

---

## 从零启动命令序列

```bash
# 终端 1：后端
cd /root/projects/invite-mall
npm install
npm run dev
# 看到 Listening on http://localhost:3000

# 终端 2：前端
cd /root/projects/invite-mall-admin
# 确认 .env.development.local 存在且 VITE_USE_MOCK=0
npm install
npm run dev
# 浏览器打开 http://localhost:5173（或终端显示的端口）
# 登录页点「继续进入」→ 任务管理 → 待审核 → 查看详情 → 审核通过/拒绝
```

---

## 自检脚本（可选）

后端启动后，在前端项目根目录执行：

```bash
chmod +x scripts/check-backend.sh
./scripts/check-backend.sh
```

应输出：`自检通过：后端 3000 可用，admin 鉴权正常`。
