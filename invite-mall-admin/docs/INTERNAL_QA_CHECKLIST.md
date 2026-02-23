# 内测 Checklist（Invite Mall）

## 环境准备
- 操作：启动后端 `npm run dev`
  - 期望结果：`http://127.0.0.1:3000/health` 返回 code=0
  - PASS 标准：接口可访问
- 操作：启动管理端 `npm run dev`
  - 期望结果：`http://localhost:5173` 可访问
  - PASS 标准：页面正常渲染
- 操作：打开 user-miniapp（微信开发者工具/真机）
  - 期望结果：小程序首页可用
  - PASS 标准：商品列表可加载
- 操作：生成审核数据 `npm run verify`
  - 期望结果：控制台提示 `PENDING_PAYOUT`
  - PASS 标准：`/api/admin/refund/list` 有数据

## 必测链路（逐步 checklist）
1) 商品浏览
- 操作：打开商品列表 → 点击商品
- 期望结果：商品卡片可点，详情页显示标题/价格/规格
- PASS 标准：`/api/products`、`/api/products/:id` 返回正常

2) 下单
- 操作：选择 SKU → 提交订单
- 期望结果：下单成功，跳转支付页
- PASS 标准：`/api/orders/create` 返回 orderId

3) 支付（模拟）
- 操作：点击“模拟支付”
- 期望结果：支付成功，订单状态 PAID
- PASS 标准：`/api/pay/create` 与 `/api/pay/notify` 返回成功

4) 订单列表
- 操作：进入订单列表
- 期望结果：订单存在，状态正确
- PASS 标准：`/api/orders/my` 返回订单

5) 订单详情
- 操作：打开订单详情
- 期望结果：可查看物流/状态
- PASS 标准：`/api/orders/:id` 返回详情

6) 任务进度
- 操作：打开任务进度页
- 期望结果：展示进度（0/2、1/2、2/2）
- PASS 标准：`/api/tasks/progress` 返回 progress

7) 分享
- 操作：点击分享
- 期望结果：分享卡片含 taskNo/inviter
- PASS 标准：分享链接打开可识别 inviter

8) 助力（如可测）
- 操作：邀请用户B进入 → 下单 → 支付
- 期望结果：任务进度+1
- PASS 标准：`/api/tasks/bind-helper` 成功

9) 管理端审核
- 操作：进入审核工作台 → 通过/拒绝
- 期望结果：任务状态变更，列表减少
- PASS 标准：`/api/admin/refund/approve` 或 `/reject` 返回成功

## 高风险专项检查
- 幂等校验：
  - 操作：重复点击下单/支付/审核
  - 期望：无重复状态推进
- 超时关单：
  - 操作：创建未支付订单，等待过期
  - 期望：订单自动 CLOSE，库存释放
- 库存释放：
  - 操作：取消/过期订单
  - 期望：库存回滚
- 风控标记：
  - 操作：触发 device/address/phone 限制
  - 期望：只标记不拦截
- payoutLedger 状态流转：
  - 操作：达标 → 审核 → 付款
  - 期望：ledger 状态 PENDING → APPROVED → PAID
