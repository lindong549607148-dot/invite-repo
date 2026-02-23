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

## 🔥 转化异常排查
- 用户下单不涨：
  - 排查步骤：检查商品列表/详情是否正常展示；确认下单按钮触发
  - 看哪个接口：`POST /api/orders/create`
  - 看哪段日志：order create 日志、库存扣减日志
  - 常见原因：库存不足、skuId 错误、幂等 key 重复
- 支付成功不到账：
  - 排查步骤：确认支付回调是否触发；订单状态是否 PAID
  - 看哪个接口：`POST /api/pay/notify`
  - 看哪段日志：pay notify 日志、订单状态机日志
  - 常见原因：notify 未调用、状态不允许
- 助力不增长：
  - 排查步骤：确认分享入口参数；检查 bind-helper 是否成功
  - 看哪个接口：`POST /api/tasks/bind-helper`
  - 看哪段日志：inviteService bind-helper 日志
  - 常见原因：taskNo 缺失、重复助力、风控标记
- 达标未进入 PENDING_PAYOUT：
  - 排查步骤：确认 helper 订单收货状态；检查调度器 tick
  - 看哪个接口：`GET /api/tasks/progress`
  - 看哪段日志：scheduler payout queue 日志
  - 常见原因：未收货/未触发自动收货
- 管理端看不到待审核：
  - 排查步骤：确认 task 状态是否 PENDING_PAYOUT；检查 refund/list
  - 看哪个接口：`GET /api/admin/refund/list`
  - 看哪段日志：admin refund/list 日志
  - 常见原因：未达标、筛选条件过严、时钟不同步
