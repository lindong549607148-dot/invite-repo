/**
 * 一键验收：同进程跑种子 + 启动服务 + 3 个 HTTP 检查
 * 使用 Node 原生 fetch（Node 18+），无重型依赖
 */
process.env.NODE_ENV = 'test';
process.env.PAYOUT_DELAY_DAYS = '0';
process.env.DAILY_BASE_QUOTA = '10';
process.env.DAILY_START_QUOTA = '10';

const http = require('http');
const PORT = 3000;
const BASE = `http://127.0.0.1:${PORT}`;
const ADMIN_KEY = 'dev-admin-key';
const REQUEST_TIMEOUT_MS = 10000;

function fail(step, message, res) {
  console.error('\n[VERIFY FAIL]', step);
  console.error('原因:', message);
  if (res) {
    console.error('HTTP status:', res.status);
    console.error('body:', typeof res.body === 'object' ? JSON.stringify(res.body, null, 2) : res.body);
  }
  process.exit(1);
}

function httpGet(url, options = {}) {
  const timeout = options.timeout ?? REQUEST_TIMEOUT_MS;
  const headers = options.headers ?? {};
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = http.request(
      {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers,
      },
      (res) => {
        let body = '';
        res.on('data', (ch) => (body += ch));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(body);
          } catch {
            parsed = body;
          }
          resolve({ status: res.statusCode, body: parsed, raw: body });
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(timeout, () => {
      req.destroy();
      reject(new Error(`请求超时 ${timeout}ms`));
    });
    req.end();
  });
}

async function runChecks() {
  console.log('\n--- Step1: GET /health ---');
  let res;
  try {
    res = await httpGet(BASE + '/health');
  } catch (e) {
    fail('检查1', e.message || String(e));
  }
  if (res.status !== 200) fail('检查1', '期望 status 200', res);
  if (res.body && res.body.code !== undefined && res.body.code !== 0) fail('检查1', '期望 body.code === 0', res);
  console.log('  status:', res.status, 'body.code:', res.body?.code, 'OK');

  console.log('\n--- Step2: GET /api/dashboard/stats (x-admin-key) ---');
  try {
    res = await httpGet(BASE + '/api/dashboard/stats', {
      headers: { 'x-admin-key': ADMIN_KEY },
    });
  } catch (e) {
    fail('检查2', e.message || String(e));
  }
  if (res.status !== 200) fail('检查2', '期望 status 200', res);
  if (res.body && res.body.code !== undefined && res.body.code !== 0) fail('检查2', '期望 body.code === 0', res);
  console.log('  status:', res.status, 'body.code:', res.body?.code, 'OK');

  console.log('\n--- Step3: GET /api/admin/refund/list (x-admin-key, data.length >= 1) ---');
  try {
    res = await httpGet(BASE + '/api/admin/refund/list', {
      headers: { 'x-admin-key': ADMIN_KEY },
    });
  } catch (e) {
    fail('检查3', e.message || String(e));
  }
  if (res.status !== 200) fail('检查3', '期望 status 200', res);
  if (res.body && res.body.code !== undefined && res.body.code !== 0) fail('检查3', '期望 body.code === 0', res);
  const data = res.body && res.body.data;
  if (!Array.isArray(data) || data.length < 1) fail('检查3', '期望 data 为数组且 data.length >= 1', res);
  console.log('  status:', res.status, 'body.code:', res.body?.code, 'data.length:', data.length, 'OK');
}

function main() {
  console.log('========== Verify: 运行种子流水（同进程） ==========');
  const path = require('path');
  const projectRoot = path.resolve(__dirname, '..');
  const seedPath = path.join(__dirname, 'seed-invite-flow.js');
  const runSeed = require(seedPath).runSeed;
  runSeed();

  console.log('\n========== Verify: 启动本进程 HTTP 服务 ==========');
  const app = require(path.join(projectRoot, 'src', 'server'));
  const server = http.createServer(app);
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error('\n[VERIFY FAIL] 端口 3000 已被占用，请先停止占用该端口的进程后再运行 verify。');
      process.exit(1);
    }
    throw err;
  });
  server.listen(PORT, async () => {
    try {
      await runChecks();
      console.log('\n========== VERIFY PASS ==========\n');
      server.close();
      process.exit(0);
    } catch (e) {
      console.error(e);
      server.close();
      process.exit(1);
    }
  });
}

main();
