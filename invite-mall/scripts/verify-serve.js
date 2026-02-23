/**
 * 种子 + 启动 3000 端口并常驻，供 admin e2e 使用。
 * 与 verify.js 相同环境与 seed，但不执行 HTTP 检查、不退出。
 */
process.env.NODE_ENV = 'test';
process.env.PAYOUT_DELAY_DAYS = '0';
process.env.DAILY_BASE_QUOTA = '10';
process.env.DAILY_START_QUOTA = '10';

const http = require('http');
const path = require('path');
const PORT = 3000;
const projectRoot = path.resolve(__dirname, '..');
const seedPath = path.join(__dirname, 'seed-invite-flow.js');
const runSeed = require(seedPath).runSeed;

console.log('========== Verify-Serve: 运行种子 ==========');
runSeed();

console.log('========== Verify-Serve: 启动 HTTP 服务 (端口 %s，常驻) ==========', PORT);
const app = require(path.join(projectRoot, 'src', 'server'));
const server = http.createServer(app);
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('\n[VERIFY-SERVE] 端口 %s 已被占用，请先停止占用该端口的进程。', PORT);
    process.exit(1);
  }
  throw err;
});
server.listen(PORT, () => {
  console.log('后端已就绪: http://127.0.0.1:%s', PORT);
});
