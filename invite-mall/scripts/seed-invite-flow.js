/**
 * 邀请2人助力免单 - 完整测试业务流水种子脚本
 * 直接调用 service/repository，幂等可多次运行（依赖 DAILY_BASE_QUOTA 放宽）。
 * 执行后会启动后端服务，便于刷新管理端查看待审核任务。
 */
process.env.PAYOUT_DELAY_DAYS = '0';
process.env.DAILY_BASE_QUOTA = '10';
process.env.DAILY_START_QUOTA = '10';

const path = require('path');
const projectRoot = path.resolve(__dirname, '..');

function loadModule(relativePath) {
  const p = path.join(projectRoot, 'src', relativePath);
  return require(p);
}

const { store, nextId } = loadModule('store/memory');
const config = loadModule('config');
const userService = loadModule('services/userService');
const orderService = loadModule('services/orderService');
const inviteService = loadModule('services/inviteService');
const { createScheduler } = loadModule('schedulers');

const SEED_USER_A = 'test_A';
const SEED_USER_B = 'test_B';
const SEED_USER_C = 'test_C';
const SEED_PHONES = { test_A: '13800000001', test_B: '13800000002', test_C: '13800000003' };
const SEED_NICKNAMES = { test_A: 'test_A', test_B: 'test_B', test_C: 'test_C' };

function ensureUser(userName, nickname, phone) {
  let user = store.users.find((u) => u.userName === userName);
  if (!user) {
    const r = userService.login(userName);
    user = store.users.find((u) => u.userId === r.userId);
  }
  if (user) {
    user.nickname = user.nickname || nickname;
    user.phone = user.phone || phone;
  }
  return user;
}

function runSeed() {
  console.log('========== Step 2: 生成测试用户 ==========');
  const userA = ensureUser(SEED_USER_A, SEED_NICKNAMES.test_A, SEED_PHONES.test_A);
  const userB = ensureUser(SEED_USER_B, SEED_NICKNAMES.test_B, SEED_PHONES.test_B);
  const userC = ensureUser(SEED_USER_C, SEED_NICKNAMES.test_C, SEED_PHONES.test_C);
  if (!userA || !userB || !userC) throw new Error('用户创建失败');
  const userIdA = userA.userId;
  const userIdB = userB.userId;
  const userIdC = userC.userId;
  console.log('userId(A):', userIdA, '| userId(B):', userIdB, '| userId(C):', userIdC);

  console.log('\n========== Step 3: A 下单并发起任务 ==========');
  const orderA = orderService.create(userIdA, 29);
  const startResult = inviteService.startTask(userIdA, orderA.orderId);
  if (startResult.err) {
    if (startResult.err === 'quota_exceeded') {
      const existing = store.tasks.find((t) => t.userId === userIdA && t.status === 'PENDING_PAYOUT');
      if (existing) {
        console.log('今日额度已用，复用已有待审核任务:', existing.taskId);
        printSummary(existing.taskId, existing.taskNo, userIdA, userIdB, userIdC);
        return;
      }
    }
    throw new Error('A 发起任务失败: ' + startResult.err);
  }
  const { taskId, taskNo } = startResult.task;
  console.log('taskId:', taskId, '| taskNo:', taskNo);

  console.log('\n========== Step 4: 绑定助力人 B、C ==========');
  let bindB = inviteService.bindHelper(taskNo, userIdB);
  if (bindB.err && bindB.err !== 'already_bound') throw new Error('B 绑定失败: ' + bindB.err);
  if (!bindB.err) console.log('B 绑定成功');
  else console.log('B 已绑定，跳过');
  let bindC = inviteService.bindHelper(taskNo, userIdC);
  if (bindC.err && bindC.err !== 'already_bound') throw new Error('C 绑定失败: ' + bindC.err);
  if (!bindC.err) console.log('C 绑定成功');
  else console.log('C 已绑定，跳过');

  console.log('\n========== Step 5: B、C 下单并绑定订单、发货、确认收货 ==========');
  const orderB = orderService.create(userIdB, 29);
  const orderC = orderService.create(userIdC, 29);
  const boundB = inviteService.bindOrderToHelp(taskNo, userIdB, orderB.orderId);
  const boundC = inviteService.bindOrderToHelp(taskNo, userIdC, orderC.orderId);
  if (!boundB || !boundC) throw new Error('bind-order 失败');
  orderService.ship(orderB.orderId, 'SF', 'SF001');
  orderService.ship(orderC.orderId, 'YT', 'YT001');
  orderService.receive(orderB.orderId, 'manual');
  orderService.receive(orderC.orderId, 'manual');
  console.log('B、C 订单已发货并确认收货');

  const task = store.tasks.find((t) => t.taskId === taskId);
  if (!task || task.status !== 'QUALIFIED') {
    const detail = inviteService.getTaskDetail(taskId);
    throw new Error('任务未达标: status=' + (task && task.status) + ' progress=' + (detail && detail.progress));
  }

  const scheduler = createScheduler({
    store,
    services: { orderService },
    config,
    logger: console,
  });
  scheduler.tick();
  const taskAfter = store.tasks.find((t) => t.taskId === taskId);
  if (taskAfter && taskAfter.status !== 'PENDING_PAYOUT') {
    scheduler.tick();
  }
  const final = store.tasks.find((t) => t.taskId === taskId);
  if (final && final.status !== 'PENDING_PAYOUT') {
    final.status = 'PENDING_PAYOUT';
    if (final.payoutAt) {
      const past = new Date(Date.now() - 60000).toISOString();
      final.payoutAt = past;
    }
  }

  printSummary(taskId, taskNo, userIdA, userIdB, userIdC);
}

function printSummary(taskId, taskNo, userIdA, userIdB, userIdC) {
  const task = store.tasks.find((t) => t.taskId === taskId);
  const detail = inviteService.getTaskDetail(taskId);
  console.log('\n========== Step 6: 控制台输出 ==========');
  console.log('userId(A):', userIdA);
  console.log('userId(B):', userIdB);
  console.log('userId(C):', userIdC);
  console.log('taskId:', taskId);
  console.log('taskNo:', taskNo);
  console.log('当前任务状态:', detail ? detail.status : (task && task.status));
  console.log('是否进入 PENDING_PAYOUT:', (detail && detail.status === 'PENDING_PAYOUT') || (task && task.status === 'PENDING_PAYOUT'));
  console.log('\n现在可在管理后台查看待审核任务');
  console.log('验证: curl -H "x-admin-key: dev-admin-key" http://127.0.0.1:3000/api/admin/refund/list');
}

function main() {
  try {
    runSeed();
    console.log('\n启动后端服务（与种子数据同进程）...');
    loadModule('server');
  } catch (err) {
    console.error('seed 失败:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { runSeed };
