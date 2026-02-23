# 邀请裂变商城 - 后台管理系统

基于 Vite + React + TypeScript + TailwindCSS 的小红书风格后台管理项目，支持 Mock 与真实后端 invite-mall 一键切换。

## 技术栈

- **Vite** - 构建工具
- **React 18** + **TypeScript**
- **TailwindCSS** - 样式（小红书粉白配色）
- **React Router v6** - 路由
- **Zustand** - 状态管理（登录态持久化）
- **Axios** - HTTP 请求（封装 + Mock / 真实 API）

## 快速开始

```bash
npm install
npm run dev
```

浏览器访问：http://localhost:5173

## Mock / 真实后端切换

| 模式 | 环境变量 | 说明 |
|------|----------|------|
| **Mock** | `VITE_USE_MOCK=1` | 使用 axios-mock-adapter，无需后端即可运行 |
| **真实后端** | `VITE_USE_MOCK=0` | 请求通过 Vite 代理到 `http://127.0.0.1:3000`，需先启动 invite-mall 后端 |

### 方式一：使用默认配置（Mock）

项目根目录已有 `.env.development`：

- `VITE_USE_MOCK=1`
- `VITE_API_BASE_URL=/api`
- `VITE_ADMIN_KEY=dev-admin-key`

直接 `npm run dev` 即走 Mock。

### 方式二：连接真实后端

1. 启动 invite-mall 后端（如 `cd invite-mall && npm run dev`，默认端口 3000）。
2. 在项目根目录创建 `.env.development.local`（不提交，已在 .gitignore）：
   ```bash
   VITE_USE_MOCK=0
   VITE_API_BASE_URL=/api
   VITE_ADMIN_KEY=dev-admin-key
   ```
3. 重启前端：`npm run dev`。
4. 登录页点击「继续进入」或输入任意用户名后「进入后台」（真实后端用 x-admin-key 鉴权，无需真实登录）。

**验收与自检**：见 [docs/ACCEPTANCE-REAL-BACKEND.md](docs/ACCEPTANCE-REAL-BACKEND.md)。自检脚本：`./scripts/check-backend.sh`（后端已启动后执行）。

### 说明

- `.env.development.local` 会覆盖 `.env.development` 中的同名变量。
- 真实后端时，Vite 会把 `/api` 代理到 `http://127.0.0.1:3000`（见 `vite.config.ts` 的 `server.proxy`）。

## 核心能力（与 invite-mall 对接）

- **登录**：Mock 时任意用户名/密码；真实时用 x-admin-key，登录页可「继续进入」或「进入后台」。
- **待审核列表**：`GET /api/admin/refund/list`，任务管理 → Tab「待审核（PENDING_PAYOUT）」。
- **任务详情**：`GET /api/admin/tasks/detail?taskId=`，点击「查看详情」进入 `/tasks/:taskId`。
- **审核通过**：`POST /api/admin/refund/approve`，详情页填写备注后点击「审核通过」。
- **审核拒绝**：`POST /api/admin/refund/reject`，详情页填写备注后点击「拒绝」。

## 脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发环境（根据 VITE_USE_MOCK 决定 Mock 或真实 API） |
| `npm run build` | 生产构建 |
| `npm run preview` | 预览构建产物 |
| `npm run e2e:admin` | 一键 Playwright 验收：自动启动后端 verify:serve、前端 dev，跑「待审核→详情→审核通过」全流程后清理进程 |

### E2E 验收（Playwright）

- **前置**：与 `invite-mall` 同级目录，且 `invite-mall` 已具备 `npm run verify`、`npm run verify:serve`。
- **运行**：首次请先执行 `npx playwright install` 安装浏览器，再在 **WSL/Linux** 下执行 `npm run e2e:admin`。脚本会依次：执行 `invite-mall` 的 `verify`、启动后端 `verify:serve`（3000）、启动前端 dev（解析 5173/5174 等端口）、执行 `tests/admin.e2e.spec.ts`，最后关闭前后端进程。
- **仅跑用例**：若已手动启动后端与前端，可设置 `PLAYWRIGHT_BASE_URL=http://localhost:5173` 后执行 `npx playwright test tests/admin.e2e.spec.ts`。

## 目录结构

```
src/
├── api/           # 请求封装与接口（request.ts、admin.ts、taskDetail.ts 等）
├── components/    # 公共组件（Layout）
├── layouts/       # 主布局
├── mock/          # Mock 数据与 axios-mock-adapter（VITE_USE_MOCK=1 时启用）
├── pages/         # 页面（Login、Dashboard、任务管理/待审核、任务详情、用户/订单管理）
├── router/       # 路由与鉴权
├── stores/       # Zustand（auth）
├── App.tsx
├── main.tsx
└── index.css
```

## 后端说明（invite-mall）

- 后台新增接口：`GET /api/admin/tasks/detail?taskId=`，用于管理员查看任意任务详情（与 `GET /api/tasks/detail` 返回结构一致，鉴权为 x-admin-key）。
- 其余 admin 接口见 invite-mall README：`/api/admin/refund/list`、`/api/admin/refund/approve`、`/api/admin/refund/reject`。
