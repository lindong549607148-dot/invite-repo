# 1. 鉴权规则
- 用户端：`Authorization: Bearer <token>`（JWT）
- 管理端：`x-admin-key: <ADMIN_KEY>`
- 失败响应：
  - 用户端未登录：HTTP 401，`{ code: 4010, msg: 'unauthorized' }`
  - 管理端 key 错误：HTTP 401，`{ code: 4011, msg: 'admin_unauthorized' }`

# 2. 用户端 API（按模块）

## Health
- `GET /health`
  - Auth: 无
  - Resp: `{ code:0, msg:'ok' }`

## 用户
- `POST /api/users/login`
  - Auth: 无
  - Body: `{ userName, phone? }`
  - Resp data: `{ userId, token }`

## 商品
- `GET /api/products`
  - Auth: 无
  - Resp data: `Product[]`
- `GET /api/products/:id`
  - Auth: 无
  - Resp data: `Product`
- `GET /api/products/:id/skus`
  - Auth: 无
  - Resp data: `Sku[]`

## 订单
- `POST /api/orders/create`
  - Auth: Bearer
  - Body (amount 兼容): `{ amount }`
  - Body (sku 模式): `{ skuId, qty, idempotencyKey }`
  - 幂等：同 `idempotencyKey` 返回同 orderId
  - Resp data: `{ orderId }`
- `GET /api/orders/my`
  - Auth: Bearer
  - Resp data: `Order[]`
- `GET /api/orders/:id`
  - Auth: Bearer（仅本人）
  - Resp data: `Order`
- `POST /api/orders/cancel`
  - Auth: Bearer（仅本人）
  - Body: `{ orderId }`
  - 仅 CREATED 可取消；否则 `code=4003 msg=invalid_state`
  - Resp data: `{ orderId }`
- `GET /api/orders/:id/logistics`
  - Auth: Bearer（仅本人）
  - 仅 SHIPPED/RECEIVED；否则 `code=4003 msg=invalid_state`
  - Resp data: `{ carrier, trackingNo, status, traces[] }`

## 支付（mock）
- `POST /api/pay/create`
  - Auth: Bearer
  - Body: `{ orderId }`
  - Resp data: `{ payId, jsapiParams }`
- `POST /api/pay/notify`
  - Auth: Bearer
  - Body: `{ orderId }`
  - 幂等，成功推进订单状态
  - Resp data: `{ status }`

## 任务
- `POST /api/tasks/start`
  - Auth: Bearer
  - Body: `{ orderId }`
- `POST /api/tasks/bind-helper`
  - Auth: Bearer
  - Body: `{ taskNo }`
- `POST /api/tasks/bind-order`
  - Auth: Bearer
  - Body: `{ taskNo, orderId }`
- `GET /api/tasks/detail?taskId=xxx`
  - Auth: Bearer
  - Resp data: 任务详情（含 risk_flags / ledger 等新增字段）
- `GET /api/tasks/list`
  - Auth: Bearer
- `GET /api/tasks/progress?taskId=xxx`
  - Auth: Bearer
  - Resp data: `{ taskId, taskNo, status, target, progress, helpers[], qualifiedAt, payoutAt, riskLevel, riskReasons }`

# 3. 管理端 API（按模块）

## 审核
- `GET /api/admin/refund/list`
- `POST /api/admin/refund/approve` body `{ taskId, note? }`
- `POST /api/admin/refund/reject` body `{ taskId, note? }`
- `GET /api/admin/tasks/detail?taskId=xxx`

## 灰度
- `GET /api/admin/feature-flags`
- `POST /api/admin/feature-flags/update` body `{ key, value }`
- `GET /api/admin/feature-flags/audit`

## 风控统计
- `GET /api/admin/risk/stats`

## 商品管理
- `POST /api/admin/products/create`
- `POST /api/admin/products/update`
- `POST /api/admin/products/toggle`
- `POST /api/admin/sku/create`
- `POST /api/admin/sku/update-stock`

## 面板
- `GET /api/dashboard/stats`

# 4. 示例 curl（可复制）

1) 登录拿 token
```bash
curl -s -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"userName":"demo"}'
```

2) 拉商品
```bash
curl -s http://localhost:3000/api/products
```

3) sku 下单（幂等）
```bash
curl -s -X POST http://localhost:3000/api/orders/create \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"skuId":"1","qty":1,"idempotencyKey":"order-001"}'
```

4) create pay
```bash
curl -s -X POST http://localhost:3000/api/pay/create \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"orderId":"1"}'
```

5) pay notify
```bash
curl -s -X POST http://localhost:3000/api/pay/notify \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"orderId":"1"}'
```

6) 订单物流
```bash
curl -s http://localhost:3000/api/orders/1/logistics \
  -H "Authorization: Bearer <token>"
```

7) tasks progress
```bash
curl -s "http://localhost:3000/api/tasks/progress?taskId=1" \
  -H "Authorization: Bearer <token>"
```

8) admin refund/list
```bash
curl -s http://localhost:3000/api/admin/refund/list \
  -H "x-admin-key: dev-admin-key"
```

9) admin approve/reject
```bash
curl -s -X POST http://localhost:3000/api/admin/refund/approve \
  -H "x-admin-key: dev-admin-key" -H "Content-Type: application/json" \
  -d '{"taskId":"1","note":"ok"}'
```
