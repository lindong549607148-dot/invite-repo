# GET /api/tasks/detail 前端对接文档

## 接口说明

- **方法**: `GET`
- **路径**: `/api/tasks/detail`
- **鉴权**: 需登录，且仅能查询本人发起的任务
- **请求参数**: Query

| 参数名   | 类型   | 必填 | 说明     |
|----------|--------|------|----------|
| taskId   | string | 是   | 任务 ID  |

**响应**: 标准 `{ code, msg, data }`，成功时 `code === 0`，`data` 为任务详情对象（见下文字段说明与示例）。

---

## 1. 字段说明表

| 字段 | 类型 | 说明 |
|------|------|------|
| taskId | string | 任务 ID |
| taskNo | string | 任务编号（用于分享/绑定等） |
| status | string | 任务状态（见下方 status 枚举） |
| progress | number | 当前已达标助力数（仅 RECEIVED 且非 PENDING_REVIEW/REJECTED 的助力计入） |
| required_helpers | number | 需要助力人数（默认 2，可灰度配置） |
| qualified_at | number \| null | 达标时间戳（ms），未达标为 null |
| payout_at | number \| null | 结算截止时间戳（ms），到期后进入待审核列表 |
| countdown_seconds | number | 倒计时秒数，见「倒计时展示规则」 |
| helpers | array | 助力墙列表，每项见 helpers 元素说明 |
| risk_flags | object | 风控提示，见 risk_flags 说明 |

### helpers 数组元素

| 字段 | 类型 | 说明 |
|------|------|------|
| helperUserId | string | 助力用户 ID |
| nickname | string | 昵称，无则 `"用户{id}"` |
| avatar | string | 头像 URL，无则默认头像 |
| status | string | 助力状态（见 helpers.status 枚举） |
| boundAt | number \| null | 绑定时间戳（ms） |
| orderId | string \| null | 绑定订单 ID |
| orderStatus | string \| null | 订单状态（CREATED/SHIPPED/RECEIVED/REFUNDED 等） |

### risk_flags

| 字段 | 类型 | 说明 |
|------|------|------|
| enabled | boolean | 是否启用风控（灰度开关 RISK_ENABLED=1 时为 true） |
| has_pending_review | boolean | 是否存在处于「待审核」的助力人 |
| reasons | string[] | 命中规则名数组（当前可为空） |

---

## 2. status 枚举含义（任务状态）

| 值 | 含义 | 说明 |
|----|------|------|
| HELPING | 助力中 | 任务进行中，未达标 |
| QUALIFIED | 已达标 | 助力人数已满，未到结算日 |
| PENDING_PAYOUT | 待结算 | 已达标且已到 payout_at，等待 admin 审核打款 |
| PAID_OUT | 已打款 | 已审核通过并打款 |
| REJECTED | 已拒绝/已撤销 | 任务被撤销或拒绝 |

---

## 3. helpers.status 枚举含义（助力人状态）

| 值 | 含义 | 说明 |
|----|------|------|
| BOUND | 已绑定 | 已绑定助力，未下单或订单未创建 |
| ORDER_BOUND | 已下单 | 已绑定订单，订单未发货 |
| SHIPPED | 已发货 | 订单已发货，未收货 |
| RECEIVED | 已收货 | 已确认收货，**计入 progress** |
| PENDING_REVIEW | 待审核 | 风控命中，待管理员审核，不计入 progress |
| REJECTED | 已拒绝 | 风控拒绝或订单退款，不计入 progress |

---

## 4. 倒计时展示规则

- **含义**: `countdown_seconds` 表示「距离 payout_at 还剩多少秒」。
- **计算**: `countdown_seconds = max(0, floor((payout_at - now) / 1000))`；无 `payout_at` 时为 `0`。
- **展示建议**:
  - `countdown_seconds === 0`：不展示倒计时，或展示「已到期」「等待结算」等。
  - `countdown_seconds > 0`：可格式化为「DD 天 HH 时 mm 分 ss 秒」或「HH:mm:ss」，前端每秒减 1 或按需轮询接口。
- **业务含义**: 仅在任务已达标（status 为 QUALIFIED）时，倒计时才有意义；到期后任务会变为 PENDING_PAYOUT，由后台进入审核列表。

---

## 5. 前端进度条计算方式

- **已达标人数**: 使用接口返回的 `progress`。
- **需要人数**: 使用接口返回的 `required_helpers`。
- **进度条百分比**（用于展示）:
  - `percent = Math.min(100, Math.round((progress / required_helpers) * 100))`
- **还差几人**: `remaining = Math.max(0, required_helpers - progress)`。
- **是否已满**: `progress >= required_helpers` 时视为已满，可配合 status 显示「已达标」「等待结算」等。

---

## 6. 拼多多风格 UI 渲染建议

1. **顶部进度**
   - 大数字展示「已 X/Y 人助力」或「还差 N 人」，配圆形/条形进度条，颜色随进度变化（如未满橙色、已满绿色）。

2. **助力墙（helpers）**
   - 横向或网格展示头像 + 昵称；可按 `status` 区分样式：
     - RECEIVED：正常色 + 可选「已助力」角标
     - ORDER_BOUND / SHIPPED：灰色或「进行中」标签
     - PENDING_REVIEW：橙色/黄色「审核中」
     - REJECTED：灰色或隐藏/折叠
   - 空位可用灰色头像 +「邀请好友」占位，点击分享 taskNo。

3. **倒计时**
   - 在 status 为 QUALIFIED 且 `countdown_seconds > 0` 时，显眼展示倒计时；到期后改为「等待结算」或「审核中」。

4. **风控提示**
   - 当 `risk_flags.enabled === true` 且 `risk_flags.has_pending_review === true` 时，可展示「部分助力正在审核中，通过后即可达标」等文案。
   - `risk_flags.reasons.length > 0` 时，可按需展示简要原因（当前接口多为空数组）。

5. **状态条**
   - 根据 `status` 显示不同状态条：HELPING → 助力中；QUALIFIED → 已达标，等待结算时间；PENDING_PAYOUT → 审核中；PAID_OUT → 已完成。

---

## 7. 示例返回 JSON

```json
{
  "code": 0,
  "msg": "ok",
  "data": {
    "taskId": "1",
    "taskNo": "TMLVYQ63Ohmhm",
    "status": "QUALIFIED",
    "progress": 2,
    "required_helpers": 2,
    "qualified_at": 1739123456789,
    "payout_at": 1739210000000,
    "countdown_seconds": 86400,
    "helpers": [
      {
        "helperUserId": "2",
        "nickname": "用户2",
        "avatar": "https://cdn.example.com/default-avatar.png",
        "status": "RECEIVED",
        "boundAt": 1739123400000,
        "orderId": "ord_001",
        "orderStatus": "RECEIVED"
      },
      {
        "helperUserId": "3",
        "nickname": "小明",
        "avatar": "https://cdn.example.com/avatar3.png",
        "status": "RECEIVED",
        "boundAt": 1739123410000,
        "orderId": "ord_002",
        "orderStatus": "RECEIVED"
      }
    ],
    "risk_flags": {
      "enabled": false,
      "has_pending_review": false,
      "reasons": []
    }
  }
}
```

**助力中、含待审核的示例片段**（仅 data 部分）：

```json
{
  "taskId": "2",
  "taskNo": "TMLVYABC123",
  "status": "HELPING",
  "progress": 1,
  "required_helpers": 2,
  "qualified_at": null,
  "payout_at": null,
  "countdown_seconds": 0,
  "helpers": [
    {
      "helperUserId": "4",
      "nickname": "用户4",
      "avatar": "https://cdn.example.com/default-avatar.png",
      "status": "ORDER_BOUND",
      "boundAt": 1739123500000,
      "orderId": "ord_003",
      "orderStatus": "CREATED"
    },
    {
      "helperUserId": "5",
      "nickname": "小红",
      "avatar": "https://cdn.example.com/avatar5.png",
      "status": "PENDING_REVIEW",
      "boundAt": 1739123600000,
      "orderId": "ord_004",
      "orderStatus": "CREATED"
    }
  ],
  "risk_flags": {
    "enabled": true,
    "has_pending_review": true,
    "reasons": []
  }
}
```

---

*文档对应后端 `taskView.buildTaskDetail` 返回结构，如有字段变更以实际接口为准。*
