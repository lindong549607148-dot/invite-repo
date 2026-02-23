# 1. 当前项目结构
- invite-mall（后端）：Node.js + Express，端口 3000；启动 `cd invite-mall && npm run dev`
- invite-mall-admin（后台前端）：Vite + React，端口 5173；启动 `cd invite-mall-admin && npm run dev`
- 前后端 proxy：admin 使用 `VITE_API_BASE_URL=/api`，Vite 代理到 `http://127.0.0.1:3000`

# 2. 今日已完成能力（按模块列清单）
- 灰度开关（feature flags）：
  - ENABLE_PAYMENT=1（支付骨架）
  - ENABLE_AUTO_RECEIVE=1（自动收货）
  - ENABLE_STOCK_DEDUCT=1（库存预占）
  - ENABLE_ORDER_SHIP=1（后台发货）
  - ENABLE_PRODUCT_MODULE=1（商品模块）
  - ENABLE_RISK_DEVICE=1（设备风控标记）
  - ENABLE_RISK_ADDRESS=1（地址风控标记）
  - ENABLE_RISK_PHONE=1（手机号风控标记）
  - ENABLE_ORDER_EXPIRE_CLOSE=1（超时关单）
  - ENABLE_PAYOUT_LEDGER=1（结算账本）
  - ENABLE_RISK_BLOCKING=0（风险拦截阀门，默认关闭）
  - ENABLE_TASK_PROGRESS_API=1（任务进度聚合 API）
  - ENABLE_LOGISTICS_API=1（物流查询 API）
  - 开关支持 admin 动态更新，持久化到 memory snapshot
- 裂变任务链路：start → bind-helper → bind-order → ship → receive → qualified → payout
- payoutLedger：
  - QUALIFIED / PENDING_PAYOUT 时 upsert（status=PENDING）
  - approve/reject 时更新 status/operator/note
  - taskView 新增 ledger 摘要（payoutStatus/qualifiedAt/payoutAt）
- 风控：device/address/phone 只标记不拦截；riskLevel 输出；ENABLE_RISK_BLOCKING 高风险可拦截
- 商品：products/skus 基础；下单支持 amount 兼容 + skuId 模式（需 idempotencyKey）
- 订单：状态机、取消、超时关单、库存预占/释放（幂等）
- 支付：/api/pay/create、/api/pay/notify（mock 骨架）
- 物流：/api/orders/:id/logistics（mock traces）
- 任务聚合：/api/tasks/progress（进度/风险/倒计时）
- 管理端：refund/list、approve/reject、tasks/detail、dashboard/stats、feature-flags、audit、risk stats、products/sku 管理
- 测试：npm run lint / npm test / npm run e2e:admin 已通过

# 3. 当前“可上线”模式（手动运营）
- 运营流程：PENDING_PAYOUT → 管理后台审核 → payoutLedger 状态更新
- 风控流程：默认只标记；开启 ENABLE_RISK_BLOCKING 后 HIGH 风险拦截，MEDIUM 延迟 payoutAt
- 支付/退款：当前为 mock 结构，不做真实打款（需对接支付/退款网关）

# 4. UI 开发优先级（给 Cursor）
P0（必须先做）：
- 审核工作台：待审核列表 → 详情 → 通过/拒绝/备注 → 风险等级展示
  - 用到 API：/api/admin/refund/list、/api/admin/tasks/detail、/api/admin/refund/approve、/api/admin/refund/reject、/api/admin/feature-flags
P1：
- 订单管理（用户/订单状态/物流）
  - 用到 API：/api/orders/my、/api/orders/:id、/api/orders/:id/logistics
- 商品管理（上下架/库存/价格/新建 SKU）
  - 用到 API：/api/admin/products/create|update|toggle、/api/admin/sku/create|update-stock
P2：
- 风控面板（HIGH 风险队列、命中原因）
  - 用到 API：/api/admin/risk/stats、/api/admin/feature-flags/audit

# 5. 已知问题 & TODO
- 目前为 memory store，重启清空；持久化计划见 `docs/persistence-plan.md`
- 真实支付/退款未接入
- 需注意 `x-admin-key` 与 `VITE_USE_MOCK` 配置；admin 默认走 Vite proxy `/api`
- e2e admin 已做进程清理，历史端口递增问题已修复
