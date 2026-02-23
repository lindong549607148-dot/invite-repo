/**
 * 风控第一层 e2e：IP 限制拦截、ADDRESS 限制 review
 * 需在 require app 前设置对应 env，故单独文件并先设置 env
 */
process.env.RISK_GLOBAL_PERCENT = '100';
process.env.ADMIN_KEY = 'e2e-admin-key';
process.env.RISK_ENABLED = '1';

const request = require('supertest');
const app = require('../src/server');

function tokenHeader(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function ipHeader(ip) {
  return ip ? { 'X-Forwarded-For': ip } : {};
}

describe('risk e2e', () => {
  describe('用例1：IP 限制 + intercept，max=1', () => {
    beforeAll(() => {
      process.env.RISK_IP_LIMIT_ENABLED = 'true';
      process.env.RISK_IP_MODE = 'intercept';
      process.env.RISK_IP_HELPER_MAX_PER_DAY = '1';
    });

    it('同 IP 下第二人 bind-helper 被拦截 code=4501', async () => {
      const sameIp = '192.168.1.100';

      let res = await request(app).post('/api/users/login').send({ userName: 'riskIpA' });
      const tokenA = res.body.data.token;
      res = await request(app).post('/api/users/login').send({ userName: 'riskIpB' });
      const tokenB = res.body.data.token;
      res = await request(app).post('/api/users/login').send({ userName: 'riskIpC' });
      const tokenC = res.body.data.token;

      res = await request(app).post('/api/orders/create').set(tokenHeader(tokenA)).send({ amount: 10 });
      const orderIdA = res.body.data.orderId;
      res = await request(app).post('/api/tasks/start').set(tokenHeader(tokenA)).send({ orderId: orderIdA });
      const taskNo1 = res.body.data.taskNo;

      res = await request(app)
        .post('/api/tasks/bind-helper')
        .set(tokenHeader(tokenB))
        .set(ipHeader(sameIp))
        .send({ taskNo: taskNo1 });
      expect(res.body.code).toBe(0);

      res = await request(app).post('/api/users/login').send({ userName: 'riskIpA2' });
      const tokenA2 = res.body.data.token;
      res = await request(app).post('/api/orders/create').set(tokenHeader(tokenA2)).send({ amount: 20 });
      const orderIdA2 = res.body.data.orderId;
      res = await request(app).post('/api/tasks/start').set(tokenHeader(tokenA2)).send({ orderId: orderIdA2 });
      const taskNo2 = res.body.data.taskNo;

      res = await request(app)
        .post('/api/tasks/bind-helper')
        .set(tokenHeader(tokenC))
        .set(ipHeader(sameIp))
        .send({ taskNo: taskNo2 });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(4501);
    });
  });

  describe('用例2：ADDRESS 限制 + review，max=1', () => {
    beforeAll(() => {
      process.env.RISK_IP_LIMIT_ENABLED = 'false';
      process.env.RISK_DEVICE_LIMIT_ENABLED = 'false';
      process.env.RISK_GRAPH_ENABLED = 'false';
      process.env.RISK_ADDRESS_LIMIT_ENABLED = 'true';
      process.env.RISK_ADDRESS_MODE = 'review';
      process.env.RISK_ADDRESS_MAX_PER_DAY = '1';
    });

    it('两订单同 addressHash，第二人 bind-order 进入 PENDING_REVIEW，detail 含 helperStatus', async () => {
      const sameHash = 'addr_hash_risk_e2e';

      let res = await request(app).post('/api/users/login').send({ userName: 'riskAddrA' });
      const tokenA = res.body.data.token;
      res = await request(app).post('/api/users/login').send({ userName: 'riskAddrB' });
      const tokenB = res.body.data.token;
      const userIdB = res.body.data.userId;
      res = await request(app).post('/api/users/login').send({ userName: 'riskAddrC' });
      const tokenC = res.body.data.token;
      const userIdC = res.body.data.userId;

      res = await request(app).post('/api/orders/create').set(tokenHeader(tokenA)).send({ amount: 30 });
      const orderIdA = res.body.data.orderId;
      res = await request(app).post('/api/tasks/start').set(tokenHeader(tokenA)).send({ orderId: orderIdA });
      const taskId = res.body.data.taskId;
      const taskNo = res.body.data.taskNo;

      await request(app).post('/api/tasks/bind-helper').set(tokenHeader(tokenB)).send({ taskNo });
      await request(app).post('/api/tasks/bind-helper').set(tokenHeader(tokenC)).send({ taskNo });

      res = await request(app)
        .post('/api/orders/create')
        .set(tokenHeader(tokenB))
        .send({ amount: 5, addressHash: sameHash });
      const orderIdB = res.body.data.orderId;
      res = await request(app)
        .post('/api/orders/create')
        .set(tokenHeader(tokenC))
        .send({ amount: 5, addressHash: sameHash });
      const orderIdC = res.body.data.orderId;

      res = await request(app)
        .post('/api/tasks/bind-order')
        .set(tokenHeader(tokenB))
        .send({ taskNo, orderId: orderIdB });
      expect(res.body.code).toBe(0);
      expect(res.body.data.helperStatus).toBe('BOUND');

      res = await request(app)
        .post('/api/tasks/bind-order')
        .set(tokenHeader(tokenC))
        .send({ taskNo, orderId: orderIdC });
      expect(res.body.code).toBe(0);
      expect(res.body.data.helperStatus).toBe('PENDING_REVIEW');

      res = await request(app).get(`/api/tasks/detail?taskId=${taskId}`).set(tokenHeader(tokenA));
      expect(res.body.code).toBe(0);
      const detail = res.body.data;
      const helpers = detail.helpers || [];
      const byOrderB = helpers.find((h) => h.orderId === orderIdB || h.helperUserId === userIdB);
      const byOrderC = helpers.find((h) => h.orderId === orderIdC || h.helperUserId === userIdC);
      expect(byOrderB && byOrderB.status).toBeTruthy();
      expect(['BOUND', 'ORDER_BOUND', 'SHIPPED', 'RECEIVED']).toContain(byOrderB.status);
      expect(byOrderC && byOrderC.status).toBe('PENDING_REVIEW');
      expect(detail.progress).toBe(0);
    });
  });
});
