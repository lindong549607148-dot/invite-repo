# 验收：前端 5173 走真实后端 3000

## 一、从零启动命令序列

### 1. 启动后端 invite-mall（端口 3000）

```bash
cd /path/to/invite-mall
npm install
npm run dev
```

看到 `Listening on http://localhost:3000` 即表示后端已启动。

**可选**：后端如需自定义 ADMIN_KEY，在 invite-mall 根目录创建 `.env`，增加一行：
```bash
ADMIN_KEY=dev-admin-key
```
（与前端 `.env.development.local` 的 `VITE_ADMIN_KEY` 一致。若未设置，后端默认接受 `dev-admin-key`。）

### 2. 自检后端（可选，后端已启动后执行）

```bash
cd /path/to/invite-mall-admin
chmod +x scripts/check-backend.sh
./scripts/check-backend.sh
```

应输出：`自检通过：后端 3000 可用，admin 鉴权正常`。若未启动后端，脚本会在健康检查或 admin 接口处报 FAIL。

### 3. 启动前端 invite-mall-admin（端口 5173）

确认已存在 `.env.development.local` 且内容为：

```
VITE_USE_MOCK=0
VITE_API_BASE_URL=/api
VITE_ADMIN_KEY=dev-admin-key
```

然后：

```bash
cd /path/to/invite-mall-admin
npm install
npm run dev
```

浏览器打开：http://localhost:5173  
登录页点击「继续进入」或输入用户名后「进入后台」，进入后打开：http://localhost:5173/tasks 。

---

## 二、验收截图要求（3 张）

### 截图 1：前端 /tasks 页面 Network 中出现 `/api/admin/refund/list` 且状态 200

- 打开 http://localhost:5173/tasks
- 点击 Tab「待审核（PENDING_PAYOUT）」
- 打开 DevTools -> Network -> 勾选 Fetch/XHR
- 刷新或等待请求完成
- **要求**：列表中能看到请求 `refund/list`，Request URL 为 `http://localhost:5173/api/admin/refund/list`，Status 为 **200**

（说明：URL 显示 5173 是正常的，因为浏览器只和 Vite 对话，实际由 Vite proxy 转发到 3000。）

### 截图 2：后端终端日志出现对应请求

- 在后端 invite-mall 运行 `npm run dev` 的终端里
- **要求**：在点击「待审核」或刷新后，能看到类似：
  `[xxx] GET /api/admin/refund/list`
（说明：请求确实被转发到了 3000 端口的后端。）

### 截图 3：点击「查看详情」后 `/api/admin/tasks/detail` 返回 200

- 在「待审核」列表中点某条任务的「查看详情」
- 在 Network 中
- **要求**：出现请求 `tasks/detail?taskId=xxx`，Status 为 **200**

---

## 三、常见问题排查

| 现象 | 原因 | 处理 |
|------|------|------|
| 5173 有数据但 Network 里没有 `/api/` 请求 | 仍在走 Mock | 确认 `.env.development.local` 存在且 `VITE_USE_MOCK=0`，保存后**重启前端**（Ctrl+C 再 `npm run dev`） |
| Network 有 `/api/` 但 status 404 | 后端没有该路由或路径不一致 | 核对后端路由：`GET /api/admin/refund/list`、`GET /api/admin/tasks/detail` 等，路径需与前端请求一致 |
| status 401 / 403 | x-admin-key 错误或后端未读到 | 前端 `.env.development.local` 中 `VITE_ADMIN_KEY=dev-admin-key`；后端默认接受该值，若有 `.env` 则 `ADMIN_KEY=dev-admin-key`；改完**重启前后端** |
| 5173 报 CORS 错误 | 没走 Vite proxy，前端直连 3000 | 前端 `VITE_API_BASE_URL=/api`（相对路径），不要写成 `http://127.0.0.1:3000`；请求由 Vite 代理到 3000 |
| 待审核列表为空 | 后端暂无 PENDING_PAYOUT 任务 | 属业务数据问题：先按 invite-mall 流程产生达标任务并等调度器将其变为 PENDING_PAYOUT，或通过接口/数据造数 |

---

## 四、确认「已关闭 Mock」

- `src/main.tsx` 中有：`if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === '1') setupMock()`
- 当 `VITE_USE_MOCK=0` 时，不会执行 `setupMock()`，不会走 axios-mock-adapter
- 在 DevTools -> Network 中能看到发往 `http://localhost:5173/api/...` 的请求且后端终端有对应日志，即说明走的是真实后端 3000
