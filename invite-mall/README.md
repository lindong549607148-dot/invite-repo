# 邀请2人助力免单 - 裂变电商后端

Express 后端骨架，内存存储，支持后续替换为数据库。

## 技术栈

- Node.js + Express
- cors / dotenv
- CommonJS，无数据库（内存 store，重启清空）

## 启动

```bash
npm install
cp .env.example .env   # 按需改 PORT、JWT_SECRET、ADMIN_KEY、DAILY_BONUS_MAX 等
npm run dev
```

启动后控制台输出：`Listening on http://localhost:3000`

## 调度器说明

- **开关与间隔**：由 `.env` 中 `SCHED_ENABLED=1`、`SCHED_INTERVAL_SEC=30` 控制。若 `SCHED_ENABLED` 不为 `1`，调度器不启动，启动时打印 `SCHED disabled`；否则打印 `SCHED enabled, interval N sec`。
- **自动收货**：每轮扫描 `store.orders`，对 `status=SHIPPED` 且 `shippedAt` 已超过 `AUTO_RECEIVE_DAYS` 天的订单，调用 `orderService.receive(orderId, 'auto', { bypassOwnerCheck: true })`，写入 `receivedAt`、`receiveMode=auto`，并触发原有“订单收货 → 任务进度 → 达标计算”逻辑。
- **到期审核扫描**：任务达标后先进入 `QUALIFIED`（已达标、未到结算日）。每轮扫描 `store.tasks`，对 `status=QUALIFIED` 且 `now >= payout_at` 的任务，将状态更新为 `PENDING_PAYOUT` 并写入 `store.adminRefundQueue`（按 `taskId` 幂等，不重复入队）。`GET /api/admin/refund/list` 返回的即为这些待审核任务。

**快速验证（自动收货 + 很快进审核池）**：在 `.env` 中设置：

```bash
AUTO_RECEIVE_DAYS=0
PAYOUT_DELAY_DAYS=0
SCHED_INTERVAL_SEC=2
```

重启后：完成 B/C 的 ship，约 2 秒内调度器会自动将这两单设为 RECEIVED，任务变为 `QUALIFIED` 并因 `payout_at` 已到而进入 `PENDING_PAYOUT`，随后在 `GET /api/admin/refund/list`（带 `x-admin-key`）中即可看到该任务。

## 风控第一层（可灰度、可开关）

- **灰度**：`RISK_GLOBAL_PERCENT=0..100`，按 userId 稳定 hash 命中。
- **规则**：同 IP/同设备/同收货地址( addressHash )/助力图谱，每项可配置 `*_ENABLED`、`*_MODE`（off/log/review/intercept）、阈值。默认均为关闭，见 `.env.example`。
- **接入点**：仅 `POST /api/tasks/bind-helper`、`POST /api/tasks/bind-order` 进入前校验。`review` 时允许绑定但 `helperStatus=PENDING_REVIEW`，不计入 progress；`intercept` 时直接返回 4501。
- **客户端**：IP 优先 `X-Forwarded-For` 首段，否则 `req.ip`；设备从 `x-device-id` 取。订单创建可传 `addressHash` 用于同地址限制。
- **Admin**：`GET /api/admin/risk/review/list` 列出含待审助力的任务；`POST /api/admin/risk/review/approve` / `reject` 传 `taskId, helperUserId`。

## 统一规范

- 所有业务 API 前缀：`/api`
- 统一返回：`{ code: 0, msg: "ok", data: ... }`；失败 `code !== 0`
- 缺参数：`{ code: 4001, msg: "bad_request" }`
- 鉴权失败：`{ code: 4010, msg: "unauthorized" }`；管理员：`{ code: 4011, msg: "admin_unauthorized" }`
- 无权限操作：`{ code: 4030, msg: "forbidden" }`
- 额度 bonus 达当日上限：`{ code: 4091, msg: "quota_bonus_limit" }`
- 风控拦截：`{ code: 4501, msg: "ip_limit"|"device_limit"|"address_limit"|"graph_limit", detail: { rules } }`
- 内部错误：`{ code: 5000, msg: "internal_error" }`，并打印 stack
- 请求带 requestId（时间戳+随机数）打印日志
- 除 `/health`、`POST /api/users/login` 外，其余 `/api/**` 需请求头 `Authorization: Bearer <token>`；`/api/admin/**` 还需 `x-admin-key: <ADMIN_KEY>`

## 接口一览

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | /health | 无 | 健康检查 |
| POST | /api/users/login | 无 | body: `{ userName }` → `{ userId, token }` |
| GET | /api/users/me | Bearer | 用户信息 + 今日额度（base/bonus/used/available） |
| POST | /api/orders/create | Bearer | body: `{ amount }` → orderId（userId 从 token 取） |
| POST | /api/orders/ship | Bearer | body: `{ orderId, expressCompanyCode, trackingNo }`；须为订单所有者 |
| POST | /api/orders/receive | Bearer | body: `{ orderId, mode }`；须为订单所有者 |
| POST | /api/orders/refund | Bearer | body: `{ orderId, reason }`；须为订单所有者 |
| POST | /api/tasks/start | Bearer | body: `{ orderId }` → taskId、taskNo（userId 从 token 取） |
| POST | /api/tasks/bind-helper | Bearer | body: `{ taskNo }`（helperUserId 从 token 取） |
| POST | /api/tasks/bind-order | Bearer | body: `{ taskNo, orderId }`；orderId 须属于当前用户 |
| GET | /api/tasks/detail?taskId=xxx | Bearer | 仅可查本人任务 |
| GET | /api/tasks/list | Bearer | 当前用户任务列表 |
| POST | /api/quota/claim-bonus | Bearer | body: `{ type: "share"\|"invite" }`，当日领取次数受 DAILY_BONUS_MAX 限制 |
| GET | /api/admin/refund/list | x-admin-key | 待审核任务 |
| POST | /api/admin/refund/approve | x-admin-key | body: `{ taskId, note? }` → PAID_OUT |
| POST | /api/admin/refund/reject | x-admin-key | body: `{ taskId, note? }` → REVOKED |
| GET | /api/admin/risk/review/list | x-admin-key | 含 PENDING_REVIEW 助力的任务列表 |
| POST | /api/admin/risk/review/approve | x-admin-key | body: `{ taskId, helperUserId }` → 该助力改为 BOUND 并重算进度 |
| POST | /api/admin/risk/review/reject | x-admin-key | body: `{ taskId, helperUserId }` → 该助力改为 REJECTED |

### 关键接口返回示例

**POST /api/tasks/bind-order**（正常）：
```json
{ "code": 0, "msg": "ok", "data": { "helpId": "1", "helperStatus": "BOUND" } }
```
**POST /api/tasks/bind-order**（风控 review）：
```json
{ "code": 0, "msg": "ok", "data": { "helpId": "2", "helperStatus": "PENDING_REVIEW" } }
```
**POST /api/tasks/bind-order**（风控 intercept）：
```json
{ "code": 4501, "msg": "ip_limit", "detail": { "rules": [{ "rule": "ip", "count": 1, "max": 1 }] } }
```

**GET /api/tasks/detail**（含 helperStatus）：
```json
{
  "code": 0,
  "msg": "ok",
  "data": {
    "taskId": "1",
    "progress": 1,
    "required": 2,
    "helpers": [
      { "helpId": "1", "helperUserId": "2", "orderId": "2", "status": "BOUND", "helperStatus": "BOUND", "receivedAt": null },
      { "helpId": "2", "helperUserId": "3", "orderId": "3", "status": "BOUND", "helperStatus": "PENDING_REVIEW", "receivedAt": null }
    ],
    "qualified_at": null,
    "payout_at": null
  }
}
```

## 用 curl 完整走通一次流程（带鉴权）

先登录拿 token，后续请求均带 `Authorization: Bearer <token>`；admin 请求另加 `x-admin-key: <ADMIN_KEY>`（与 .env 中 ADMIN_KEY 一致）。

```bash
# 0. 健康检查
curl -s http://localhost:3000/health

# 1. 登录 A、B、C，记下各自的 token 和 userId
curl -s -X POST http://localhost:3000/api/users/login -H "Content-Type: application/json" -d '{"userName":"userA"}'
# 返回示例: {"code":0,"msg":"ok","data":{"userId":"1","token":"eyJhbGc..."}}
# 将 A 的 token 存为 TOKEN_A，下同
curl -s -X POST http://localhost:3000/api/users/login -H "Content-Type: application/json" -d '{"userName":"userB"}'
curl -s -X POST http://localhost:3000/api/users/login -H "Content-Type: application/json" -d '{"userName":"userC"}'

# 以下 TOKEN_A、TOKEN_B、TOKEN_C 替换为上面返回的 token；ADMIN_KEY 与 .env 中一致

# 2. A 下单并发起免单任务（带 A 的 token）
curl -s -X POST http://localhost:3000/api/orders/create \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_A" -d '{"amount":99}'
# 得到 orderId，如 "1"
curl -s -X POST http://localhost:3000/api/tasks/start \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_A" -d '{"orderId":"1"}'
# 得到 taskId、taskNo

# 3. B、C 绑定为助力人（各自带自己的 token，body 仅 taskNo）
curl -s -X POST http://localhost:3000/api/tasks/bind-helper \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_B" -d '{"taskNo":"<上一步的 taskNo>"}'
curl -s -X POST http://localhost:3000/api/tasks/bind-helper \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_C" -d '{"taskNo":"<上一步的 taskNo>"}'

# 4. B、C 各自下单（带各自 token，body 仅 amount）
curl -s -X POST http://localhost:3000/api/orders/create \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_B" -d '{"amount":50}'
curl -s -X POST http://localhost:3000/api/orders/create \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_C" -d '{"amount":50}'
# 记下 B、C 的 orderId，如 "2"、"3"

# 5. B、C 将订单绑到任务（body: taskNo + orderId，须为本人订单）
curl -s -X POST http://localhost:3000/api/tasks/bind-order \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_B" -d '{"taskNo":"<taskNo>","orderId":"2"}'
curl -s -X POST http://localhost:3000/api/tasks/bind-order \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_C" -d '{"taskNo":"<taskNo>","orderId":"3"}'

# 6. 发货（B、C 各自对自己的订单操作）
curl -s -X POST http://localhost:3000/api/orders/ship \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_B" \
  -d '{"orderId":"2","expressCompanyCode":"SF","trackingNo":"SF123"}'
curl -s -X POST http://localhost:3000/api/orders/ship \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_C" \
  -d '{"orderId":"3","expressCompanyCode":"YT","trackingNo":"YT456"}'

# 7. 确认收货（B、C 各自对自己的订单）
curl -s -X POST http://localhost:3000/api/orders/receive \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_B" -d '{"orderId":"2","mode":"manual"}'
curl -s -X POST http://localhost:3000/api/orders/receive \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_C" -d '{"orderId":"3","mode":"manual"}'

# 8. A 查看任务详情（带 A 的 token）
curl -s "http://localhost:3000/api/tasks/detail?taskId=<taskId>" -H "Authorization: Bearer $TOKEN_A"

# 9. Admin 待审核列表（需 x-admin-key）
curl -s http://localhost:3000/api/admin/refund/list -H "x-admin-key: $ADMIN_KEY"

# 10. Admin 审核通过
curl -s -X POST http://localhost:3000/api/admin/refund/approve \
  -H "Content-Type: application/json" -H "x-admin-key: $ADMIN_KEY" -d '{"taskId":"<taskId>","note":"已打款"}'
```

### curl 测试流程摘要

1. **GET /health** → 健康检查  
2. **POST /api/users/login**（A/B/C）→ 拿到 `userId`、`token`  
3. **POST /api/orders/create**（Header: Bearer TOKEN_A, body: `{ amount }`）→ orderA  
4. **POST /api/tasks/start**（Header: Bearer TOKEN_A, body: `{ orderId }`）→ taskId、taskNo  
5. **POST /api/tasks/bind-helper**（Header: Bearer TOKEN_B/TOKEN_C, body: `{ taskNo }`）  
6. **POST /api/orders/create**（B、C 各带己 token）→ 两个 orderId  
7. **POST /api/tasks/bind-order**（B、C 各带己 token, body: `{ taskNo, orderId }`，orderId 须本人）  
8. **POST /api/orders/ship** / **receive**（B、C 各对己订单，带己 token）  
9. **GET /api/tasks/detail?taskId=**（Bearer TOKEN_A）  
10. **GET /api/admin/refund/list**（Header: x-admin-key）  
11. **POST /api/admin/refund/approve**（Header: x-admin-key, body: `{ taskId, note? }`）  

为快速测“到期进入审核”，可将 `.env` 中 `PAYOUT_DELAY_DAYS=0`，重启后再执行步骤 7～11。

### 关键接口 curl 示例（鉴权 + Admin）

```bash
# 登录拿 token
curl -s -X POST http://localhost:3000/api/users/login -H "Content-Type: application/json" -d '{"userName":"userA"}'

# 带 token 请求（TOKEN 替换为上面 data.token）
curl -s http://localhost:3000/api/users/me -H "Authorization: Bearer $TOKEN"
curl -s -X POST http://localhost:3000/api/orders/create -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"amount":99}'
curl -s -X POST http://localhost:3000/api/tasks/start -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"orderId":"1"}'
curl -s -X POST http://localhost:3000/api/tasks/bind-helper -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"taskNo":"TXXX"}'
curl -s -X POST http://localhost:3000/api/tasks/bind-order -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"taskNo":"TXXX","orderId":"2"}'
curl -s -X POST http://localhost:3000/api/quota/claim-bonus -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"type":"share"}'

# Admin（ADMIN_KEY 与 .env 一致）
curl -s http://localhost:3000/api/admin/refund/list -H "x-admin-key: $ADMIN_KEY"
curl -s -X POST http://localhost:3000/api/admin/refund/approve -H "Content-Type: application/json" -H "x-admin-key: $ADMIN_KEY" -d '{"taskId":"1","note":"已打款"}'
```
