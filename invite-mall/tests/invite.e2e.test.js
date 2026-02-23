/**
 * 邀请2人助力免单 - 集成测试（Jest + supertest）
 * 不启动真实端口，直接挂载 app
 * 测试6/7 需 AUTO_RECEIVE_DAYS=0、PAYOUT_DELAY_DAYS=0，在首次 require 前设置
 */
process.env.AUTO_RECEIVE_DAYS = '0';
process.env.PAYOUT_DELAY_DAYS = '0';
process.env.ADMIN_KEY = 'e2e-admin-key';

const request = require('supertest');
const app = require('../src/server');
const { store } = require('../src/store/memory');
const config = require('../src/config');
const orderService = require('../src/services/orderService');
const { createScheduler } = require('../src/schedulers');

function tokenHeader(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

describe('invite-mall e2e', () => {
  describe('测试1：健康检查', () => {
    it('GET /health 返回 code=0', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.msg).toBe('ok');
    });
  });

  describe('测试2：完整裂变闭环', () => {
    let tokenA;
    let tokenB;
    let tokenC;
    let taskId;
    let taskNo;
    let orderIdA;
    let orderIdB;
    let orderIdC;

    it('按顺序执行完整流程并断言任务达标', async () => {
      // 1. 登录 A、B、C
      let res = await request(app).post('/api/users/login').send({ userName: 'e2eUserA' });
      expect(res.body.code).toBe(0);
      tokenA = res.body.data.token;
      const userIdA = res.body.data.userId;
      console.log('[e2e] 1. 登录 A、B、C，拿到 token');

      res = await request(app).post('/api/users/login').send({ userName: 'e2eUserB' });
      expect(res.body.code).toBe(0);
      tokenB = res.body.data.token;

      res = await request(app).post('/api/users/login').send({ userName: 'e2eUserC' });
      expect(res.body.code).toBe(0);
      tokenC = res.body.data.token;

      // 2. A 下单 → start task
      res = await request(app)
        .post('/api/orders/create')
        .set(tokenHeader(tokenA))
        .send({ amount: 99 });
      expect(res.body.code).toBe(0);
      orderIdA = res.body.data.orderId;

      res = await request(app)
        .post('/api/tasks/start')
        .set(tokenHeader(tokenA))
        .send({ orderId: orderIdA });
      expect(res.body.code).toBe(0);
      taskId = res.body.data.taskId;
      taskNo = res.body.data.taskNo;
      console.log('[e2e] 2. A 下单并发起任务', { taskId, taskNo });

      // 3. B bind-helper, 4. C bind-helper
      res = await request(app)
        .post('/api/tasks/bind-helper')
        .set(tokenHeader(tokenB))
        .send({ taskNo });
      expect(res.body.code).toBe(0);
      res = await request(app)
        .post('/api/tasks/bind-helper')
        .set(tokenHeader(tokenC))
        .send({ taskNo });
      expect(res.body.code).toBe(0);
      console.log('[e2e] 3-4. B、C 绑定助力');

      // 5. B 下单 + bind-order, 6. C 下单 + bind-order
      res = await request(app)
        .post('/api/orders/create')
        .set(tokenHeader(tokenB))
        .send({ amount: 50 });
      expect(res.body.code).toBe(0);
      orderIdB = res.body.data.orderId;

      res = await request(app)
        .post('/api/orders/create')
        .set(tokenHeader(tokenC))
        .send({ amount: 50 });
      expect(res.body.code).toBe(0);
      orderIdC = res.body.data.orderId;

      res = await request(app)
        .post('/api/tasks/bind-order')
        .set(tokenHeader(tokenB))
        .send({ taskNo, orderId: orderIdB });
      expect(res.body.code).toBe(0);
      res = await request(app)
        .post('/api/tasks/bind-order')
        .set(tokenHeader(tokenC))
        .send({ taskNo, orderId: orderIdC });
      expect(res.body.code).toBe(0);
      console.log('[e2e] 5-6. B、C 下单并绑定订单到助力');

      // 7. B/C ship
      res = await request(app)
        .post('/api/orders/ship')
        .set(tokenHeader(tokenB))
        .send({ orderId: orderIdB, expressCompanyCode: 'SF', trackingNo: 'SF001' });
      expect(res.body.code).toBe(0);
      res = await request(app)
        .post('/api/orders/ship')
        .set(tokenHeader(tokenC))
        .send({ orderId: orderIdC, expressCompanyCode: 'YT', trackingNo: 'YT001' });
      expect(res.body.code).toBe(0);
      console.log('[e2e] 7. B、C 发货');

      // 8. B/C receive (manual)
      res = await request(app)
        .post('/api/orders/receive')
        .set(tokenHeader(tokenB))
        .send({ orderId: orderIdB, mode: 'manual' });
      expect(res.body.code).toBe(0);
      res = await request(app)
        .post('/api/orders/receive')
        .set(tokenHeader(tokenC))
        .send({ orderId: orderIdC, mode: 'manual' });
      expect(res.body.code).toBe(0);
      console.log('[e2e] 8. B、C 确认收货(manual)');

      // 9. 查询 task detail
      res = await request(app)
        .get(`/api/tasks/detail?taskId=${taskId}`)
        .set(tokenHeader(tokenA));
      expect(res.body.code).toBe(0);
      const detail = res.body.data;

      expect(detail.progress).toBe(2);
      expect(['QUALIFIED', 'PENDING_PAYOUT', 'PAID_OUT']).toContain(detail.status);
      expect(detail.qualified_at).toBeDefined();
      expect(detail.qualified_at).toBeTruthy();
      expect(detail.payout_at).toBeDefined();
      expect(detail.payout_at).toBeTruthy();
      expect(detail.required_helpers).toBeDefined();
      expect(detail.required_helpers).toBe(2);
      expect(typeof detail.countdown_seconds).toBe('number');
      expect(Array.isArray(detail.helpers)).toBe(true);
      expect(detail.risk_flags).toBeDefined();
      expect(typeof detail.risk_flags.enabled).toBe('boolean');
      expect(Array.isArray(detail.risk_flags.reasons)).toBe(true);
      expect(detail.helpers.length).toBeGreaterThanOrEqual(1);
      const h0 = detail.helpers[0];
      expect(h0.helperUserId).toBeDefined();
      expect(h0.nickname).toBeDefined();
      expect(h0.avatar).toBeDefined();
      expect(h0.status).toBeDefined();
      console.log('[e2e] 9. 任务详情', { progress: detail.progress, status: detail.status, required_helpers: detail.required_helpers, countdown_seconds: detail.countdown_seconds, risk_flags: detail.risk_flags });
    });
  });

  describe('测试3：权限校验', () => {
    it('未带 token 调用受保护接口返回 401', async () => {
      const res = await request(app).get('/api/users/me');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe(4010);
      expect(res.body.msg).toBe('unauthorized');
    });
  });

  describe('测试4：重复助力防护', () => {
    it('同一 helper 再次 bind-helper 应失败', async () => {
      const resLoginA = await request(app).post('/api/users/login').send({ userName: 'e2eQuotaA' });
      const resLoginB = await request(app).post('/api/users/login').send({ userName: 'e2eQuotaB' });
      const tokenA = resLoginA.body.data.token;
      const tokenB = resLoginB.body.data.token;

      let res = await request(app).post('/api/orders/create').set(tokenHeader(tokenA)).send({ amount: 88 });
      const orderId = res.body.data.orderId;
      res = await request(app).post('/api/tasks/start').set(tokenHeader(tokenA)).send({ orderId });
      expect(res.body.code).toBe(0);
      const taskNo = res.body.data.taskNo;

      res = await request(app).post('/api/tasks/bind-helper').set(tokenHeader(tokenB)).send({ taskNo });
      expect(res.body.code).toBe(0);

      res = await request(app).post('/api/tasks/bind-helper').set(tokenHeader(tokenB)).send({ taskNo });
      expect(res.body.code).not.toBe(0);
      console.log('[e2e] 同一 helper 再次 bind-helper 返回', res.body.code, res.body.msg);
    });
  });

  describe('测试5：quota 基础', () => {
    it('默认每日只能 start 1 次，第二次 start 应失败', async () => {
      const resLogin = await request(app).post('/api/users/login').send({ userName: 'e2eQuotaOnly' });
      const token = resLogin.body.data.token;

      let res = await request(app).post('/api/orders/create').set(tokenHeader(token)).send({ amount: 10 });
      const orderId1 = res.body.data.orderId;
      res = await request(app).post('/api/tasks/start').set(tokenHeader(token)).send({ orderId: orderId1 });
      expect(res.body.code).toBe(0);
      console.log('[e2e] 第一次 start 成功');

      res = await request(app).post('/api/orders/create').set(tokenHeader(token)).send({ amount: 20 });
      const orderId2 = res.body.data.orderId;
      res = await request(app).post('/api/tasks/start').set(tokenHeader(token)).send({ orderId: orderId2 });
      expect(res.body.code).not.toBe(0);
      expect(res.body.msg).toBe('quota_exceeded');
      console.log('[e2e] 第二次 start 失败，msg=', res.body.msg);
    });
  });

  describe('测试6：自动收货（AUTO_RECEIVE_DAYS=0）', () => {
    it('ship 后不调 receive，scheduler.tick() 后订单自动 RECEIVED、任务达标', async () => {
      let res = await request(app).post('/api/users/login').send({ userName: 'e2eAutoA' });
      expect(res.body.code).toBe(0);
      const tokenA = res.body.data.token;
      res = await request(app).post('/api/users/login').send({ userName: 'e2eAutoB' });
      expect(res.body.code).toBe(0);
      const tokenB = res.body.data.token;
      res = await request(app).post('/api/users/login').send({ userName: 'e2eAutoC' });
      expect(res.body.code).toBe(0);
      const tokenC = res.body.data.token;

      res = await request(app).post('/api/orders/create').set(tokenHeader(tokenA)).send({ amount: 99 });
      const orderIdA = res.body.data.orderId;
      res = await request(app).post('/api/tasks/start').set(tokenHeader(tokenA)).send({ orderId: orderIdA });
      expect(res.body.code).toBe(0);
      const taskId = res.body.data.taskId;
      const taskNo = res.body.data.taskNo;

      await request(app).post('/api/tasks/bind-helper').set(tokenHeader(tokenB)).send({ taskNo });
      await request(app).post('/api/tasks/bind-helper').set(tokenHeader(tokenC)).send({ taskNo });

      res = await request(app).post('/api/orders/create').set(tokenHeader(tokenB)).send({ amount: 50 });
      const orderIdB = res.body.data.orderId;
      res = await request(app).post('/api/orders/create').set(tokenHeader(tokenC)).send({ amount: 50 });
      const orderIdC = res.body.data.orderId;

      await request(app).post('/api/tasks/bind-order').set(tokenHeader(tokenB)).send({ taskNo, orderId: orderIdB });
      await request(app).post('/api/tasks/bind-order').set(tokenHeader(tokenC)).send({ taskNo, orderId: orderIdC });

      await request(app)
        .post('/api/orders/ship')
        .set(tokenHeader(tokenB))
        .send({ orderId: orderIdB, expressCompanyCode: 'SF', trackingNo: 'SFA' });
      await request(app)
        .post('/api/orders/ship')
        .set(tokenHeader(tokenC))
        .send({ orderId: orderIdC, expressCompanyCode: 'YT', trackingNo: 'YTA' });
      console.log('[e2e] 测试6: B/C ship 完成，不调用 receive');

      const scheduler = createScheduler({ store, services: { orderService }, config, logger: console });
      await scheduler.tick();

      const orderB = orderService.getOrder(orderIdB);
      const orderC = orderService.getOrder(orderIdC);
      expect(orderB).toBeDefined();
      expect(orderB.status).toBe('RECEIVED');
      expect(orderB.receiveMode).toBe('auto');
      expect(orderC).toBeDefined();
      expect(orderC.status).toBe('RECEIVED');
      expect(orderC.receiveMode).toBe('auto');
      console.log('[e2e] 测试6: tick 后 B/C 订单 RECEIVED, receiveMode=auto');

      res = await request(app).get(`/api/tasks/detail?taskId=${taskId}`).set(tokenHeader(tokenA));
      expect(res.body.code).toBe(0);
      const detail = res.body.data;
      expect(detail.progress).toBe(2);
      expect(['QUALIFIED', 'PENDING_PAYOUT', 'PAID_OUT']).toContain(detail.status);
      expect(detail.qualified_at).toBeDefined();
      expect(detail.qualified_at).toBeTruthy();
      console.log('[e2e] 测试6: 任务 progress=2, status=', detail.status, 'qualified_at 存在');
    });
  });

  describe('测试7：到期任务进入审核池（PAYOUT_DELAY_DAYS=0）', () => {
    it('达标后 tick 使任务进入 PENDING_PAYOUT，admin/refund/list 包含该任务', async () => {
      let res = await request(app).post('/api/users/login').send({ userName: 'e2ePayoutA' });
      expect(res.body.code).toBe(0);
      const tokenA = res.body.data.token;
      res = await request(app).post('/api/users/login').send({ userName: 'e2ePayoutB' });
      expect(res.body.code).toBe(0);
      const tokenB = res.body.data.token;
      res = await request(app).post('/api/users/login').send({ userName: 'e2ePayoutC' });
      expect(res.body.code).toBe(0);
      const tokenC = res.body.data.token;

      res = await request(app).post('/api/orders/create').set(tokenHeader(tokenA)).send({ amount: 88 });
      const orderIdA = res.body.data.orderId;
      res = await request(app).post('/api/tasks/start').set(tokenHeader(tokenA)).send({ orderId: orderIdA });
      expect(res.body.code).toBe(0);
      const taskId = res.body.data.taskId;
      const taskNo = res.body.data.taskNo;

      await request(app).post('/api/tasks/bind-helper').set(tokenHeader(tokenB)).send({ taskNo });
      await request(app).post('/api/tasks/bind-helper').set(tokenHeader(tokenC)).send({ taskNo });

      res = await request(app).post('/api/orders/create').set(tokenHeader(tokenB)).send({ amount: 40 });
      const orderIdB = res.body.data.orderId;
      res = await request(app).post('/api/orders/create').set(tokenHeader(tokenC)).send({ amount: 40 });
      const orderIdC = res.body.data.orderId;

      await request(app).post('/api/tasks/bind-order').set(tokenHeader(tokenB)).send({ taskNo, orderId: orderIdB });
      await request(app).post('/api/tasks/bind-order').set(tokenHeader(tokenC)).send({ taskNo, orderId: orderIdC });

      await request(app)
        .post('/api/orders/ship')
        .set(tokenHeader(tokenB))
        .send({ orderId: orderIdB, expressCompanyCode: 'SF', trackingNo: 'SF7' });
      await request(app)
        .post('/api/orders/ship')
        .set(tokenHeader(tokenC))
        .send({ orderId: orderIdC, expressCompanyCode: 'YT', trackingNo: 'YT7' });

      const scheduler = createScheduler({ store, services: { orderService }, config, logger: console });
      await scheduler.tick();
      await scheduler.tick();
      console.log('[e2e] 测试7: 两次 tick（自动收货 + 到期进审核池）');

      res = await request(app)
        .get('/api/admin/refund/list')
        .set('x-admin-key', process.env.ADMIN_KEY || 'e2e-admin-key');
      expect(res.body.code).toBe(0);
      const list = res.body.data || [];
      const found = list.find((t) => t.taskId === taskId);
      expect(found).toBeDefined();
      expect(found.status).toBe('PENDING_PAYOUT');
      console.log('[e2e] 测试7: admin/refund/list 包含 taskId', taskId, 'status=PENDING_PAYOUT');
    });
  });

  describe('测试8：detail 返回 required_helpers/countdown_seconds/helpers/risk_flags', () => {
    it('GET /api/tasks/detail 含 required_helpers、countdown_seconds、helpers、risk_flags，helpers[0] 含 helperUserId/nickname/avatar/status', async () => {
      let res = await request(app).post('/api/users/login').send({ userName: 'e2eDetailViewA' });
      const tokenA = res.body.data.token;
      res = await request(app).post('/api/orders/create').set(tokenHeader(tokenA)).send({ amount: 1 });
      const orderId = res.body.data.orderId;
      res = await request(app).post('/api/tasks/start').set(tokenHeader(tokenA)).send({ orderId });
      expect(res.body.code).toBe(0);
      const taskId = res.body.data.taskId;
      res = await request(app).get(`/api/tasks/detail?taskId=${taskId}`).set(tokenHeader(tokenA));
      expect(res.body.code).toBe(0);
      const d = res.body.data;
      expect(d.required_helpers).toBeDefined();
      expect(d.countdown_seconds).toBeDefined();
      expect(Array.isArray(d.helpers)).toBe(true);
      expect(d.risk_flags).toBeDefined();
      expect(d.risk_flags).toHaveProperty('enabled');
      expect(d.risk_flags).toHaveProperty('has_pending_review');
      expect(d.risk_flags).toHaveProperty('reasons');
      if (d.helpers.length > 0) {
        expect(d.helpers[0]).toHaveProperty('helperUserId');
        expect(d.helpers[0]).toHaveProperty('nickname');
        expect(d.helpers[0]).toHaveProperty('avatar');
        expect(d.helpers[0]).toHaveProperty('status');
      }
    });
  });

  describe('测试9：灰度开关 DAILY_START_QUOTA=0 可同日多次 start', () => {
    it('DAILY_START_QUOTA=0 时同日第二次 start 成功', async () => {
      const prev = process.env.DAILY_START_QUOTA;
      process.env.DAILY_START_QUOTA = '0';
      let res = await request(app).post('/api/users/login').send({ userName: 'e2eUnlimitQuota' });
      const token = res.body.data.token;
      res = await request(app).post('/api/orders/create').set(tokenHeader(token)).send({ amount: 1 });
      const orderId1 = res.body.data.orderId;
      res = await request(app).post('/api/tasks/start').set(tokenHeader(token)).send({ orderId: orderId1 });
      expect(res.body.code).toBe(0);
      res = await request(app).post('/api/orders/create').set(tokenHeader(token)).send({ amount: 2 });
      const orderId2 = res.body.data.orderId;
      res = await request(app).post('/api/tasks/start').set(tokenHeader(token)).send({ orderId: orderId2 });
      expect(res.body.code).toBe(0);
      if (prev !== undefined) process.env.DAILY_START_QUOTA = prev;
      else delete process.env.DAILY_START_QUOTA;
    });
  });

  describe('测试10：灰度开关 RISK_ENABLED=0 时 risk_flags.enabled 为 false', () => {
    it('RISK_ENABLED=0 时 detail.risk_flags.enabled === false', async () => {
      const prev = process.env.RISK_ENABLED;
      process.env.RISK_ENABLED = '0';
      let res = await request(app).post('/api/users/login').send({ userName: 'e2eRiskOffA' });
      const token = res.body.data.token;
      res = await request(app).post('/api/orders/create').set(tokenHeader(token)).send({ amount: 1 });
      const orderId = res.body.data.orderId;
      res = await request(app).post('/api/tasks/start').set(tokenHeader(token)).send({ orderId });
      expect(res.body.code).toBe(0);
      const taskId = res.body.data.taskId;
      res = await request(app).get(`/api/tasks/detail?taskId=${taskId}`).set(tokenHeader(token));
      expect(res.body.code).toBe(0);
      expect(res.body.data.risk_flags.enabled).toBe(false);
      if (prev !== undefined) process.env.RISK_ENABLED = prev;
      else delete process.env.RISK_ENABLED;
    });
  });
});
