# 邀请商城 - 用户端小程序 (user-miniapp)

小红书风格（粉/白/奶油色、圆角卡片、轻阴影、大按钮），与后端 invite-mall HTTP API 打通最小闭环。

## 目录结构

```
user-miniapp/
├── app.js, app.json, app.wxss
├── project.config.json
├── utils/
│   ├── config.js    # API_BASE_URL 环境配置
│   └── request.js   # 统一请求：baseURL、Authorization、错误 toast
├── pages/
│   ├── products/list    # 商品列表
│   ├── products/detail  # 商品详情
│   ├── checkout/index   # 确认下单
│   ├── pay/index        # 支付（模拟）
│   ├── orders/list      # 我的订单
│   ├── orders/detail    # 订单详情
│   └── tasks/my         # 我的任务（占位）
└── README.md
```

## 本地联调配置

### 1. 后端运行

- 后端项目：`invite-mall`，端口 **3000**
- 在仓库根目录执行：
  ```bash
  cd invite-mall
  npm install
  npm run dev
  ```
- 确保 `.env` 中已配置（如 `ENABLE_PRODUCT_MODULE=1` 等），并有商品/SKU 数据（可先跑 seed 或后台创建）。

### 2. 小程序指向本机

- **开发者工具调试**：在 `utils/config.js` 中：
  - `isDev = true` 时使用 `DEV_BASE = 'http://127.0.0.1:3000'`
  - 微信开发者工具中：详情 → 本地设置 → **不校验合法域名**
- **真机预览**：将 `DEV_BASE` 改为本机局域网 IP，例如：
  - `const DEV_BASE = 'http://192.168.1.100:3000'`
  - 确保手机与电脑在同一局域网，且后端监听 `0.0.0.0`（或对应网卡）。

### 3. 登录与鉴权

- 小程序启动时自动调用 `POST /api/users/login`，传 `userName: 'wx_' + openid/时间戳`，拿到 `token` 和 `userId` 存 storage。
- 所有需鉴权请求在 `utils/request.js` 中统一加 Header：`Authorization: Bearer <token>`。

---

## 六步手工验收流程

1. **商品列表能拉到数据**
   - 打开小程序，首页为商品列表。
   - 确认列表接口 `GET /api/products` 成功，卡片展示商品图（或占位图）、标题、价格、原价、活动 tag「助力免单」。

2. **商品详情能选 SKU**
   - 点击某商品进入详情页。
   - 确认 `GET /api/products/:id`、`GET /api/products/:id/skus` 成功。
   - 选择不同 SKU、改数量，点击「立即下单」进入确认页。

3. **下单成功拿到 orderId**
   - 在确认下单页点击「提交订单」。
   - 确认 `POST /api/orders/create` 携带 `skuId、qty、idempotencyKey`（格式：`order-{userId}-{skuId}-yyyyMMddHHmmss`）。
   - 成功后跳转支付页，URL 带 `orderId`。

4. **模拟支付后订单状态变更**
   - 在支付页点击「模拟支付成功」。
   - 确认先 `POST /api/pay/create` 再 `POST /api/pay/notify`，toast 提示「支付成功」后跳转订单详情。
   - 在订单详情或「我的订单」中确认订单状态为已支付（或已发货，视后端逻辑）。

5. **我的订单能看到订单**
   - 从首页「我的订单」或底部/入口进入订单列表。
   - 确认 `GET /api/orders/my` 成功，列表展示订单号、金额、状态、创建时间，点击可进订单详情。

6. **订单详情能展示状态 + 物流，任务入口可进**
   - 在订单详情确认 `GET /api/orders/:id` 成功，展示状态与金额。
   - 若订单已发货/已收货，确认 `GET /api/orders/:id/logistics` 成功并展示物流（未发货时提示合理）。
   - 点击「去助力免单 / 查看我的任务进度」进入任务占位页（进度条 + 规则说明）。

---

## 页面路由与接口调用

| 页面 | 路径 | 主要接口 |
|------|------|----------|
| 商品列表 | /pages/products/list | GET /api/products |
| 商品详情 | /pages/products/detail?id= | GET /api/products/:id, GET /api/products/:id/skus |
| 确认下单 | /pages/checkout/index?productId=&skuId=&qty= | POST /api/orders/create (skuId, qty, idempotencyKey) |
| 支付 | /pages/pay/index?orderId= | POST /api/pay/create, POST /api/pay/notify |
| 我的订单 | /pages/orders/list | GET /api/orders/my |
| 订单详情 | /pages/orders/detail?id= | GET /api/orders/:id, GET /api/orders/:id/logistics（已发货时） |
| 我的任务 | /pages/tasks/my | 占位，后续接 tasks/progress 或 tasks/detail |

---

## 注意

- 小程序未配置 AppID 时可在开发者工具中选择「测试号」或「游客模式」。
- 真机调试务必使用局域网 IP，且后端允许跨域（invite-mall 已使用 CORS）。
