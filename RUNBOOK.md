# RUNBOOK

## 1. 环境变量
参考 `invite-mall/.env.example`（后端）与 `invite-mall-admin/README.md`（前端）。关键字段：
- `PORT=3000`
- `ADMIN_KEY=...`
- `JWT_SECRET=...`
- `AUTO_RECEIVE_DAYS=10`
- `PAYOUT_DELAY_DAYS=3`
- `PAYOUT_DELAY_RISK_MEDIUM_DAYS=3`
- `ORDER_PAY_EXPIRE_MINUTES=30`
- `ENABLE_*` feature flags（默认多为 1，`ENABLE_RISK_BLOCKING=0`）

前端（admin）关键配置：
- `VITE_USE_MOCK=0`
- `VITE_API_BASE_URL=/api`
- `VITE_ADMIN_KEY=dev-admin-key`

示例：`invite-mall-admin/.env.development.local`
```
VITE_USE_MOCK=0
VITE_API_BASE_URL=/api
VITE_ADMIN_KEY=dev-admin-key
```

## 2. 启动（开发）
后端（3000）：
```
cd invite-mall
npm install
npm run dev
```

前端 admin（5173）：
```
cd invite-mall-admin
npm install
npm run dev
```

生成待审核数据：
```
cd invite-mall
npm run verify
# 或
npm run verify:serve
```

## 3. 一键验收
```
cd invite-mall
npm run lint
npm test

cd ../invite-mall-admin
npm run e2e:admin
```

预期关键字：
- lint：无报错
- test：`PASS`
- e2e：`e2e:admin PASS`

## 4. 常见故障排查
- 端口占用（3000/5173）：
  - 停止占用进程后重启服务
- admin-key 不对：
  - 后端 `ADMIN_KEY` 与请求头 `x-admin-key` 一致
- 仍在走 Mock：
  - 确认 `VITE_USE_MOCK=0` 且重启前端
- e2e 找不到待审核数据：
  - 先运行 `npm run verify` 或 `npm run verify:serve`
