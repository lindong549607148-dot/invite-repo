#!/usr/bin/env node
/**
 * 一键运行 admin 端 Playwright 验收：先启动后端 verify:serve，再启动前端 dev，最后跑 e2e。
 * 适用于 WSL/Linux，端口占用会友好提示。
 */
const { spawn, spawnSync } = require('child_process');
const path = require('path');
const http = require('http');
const fs = require('fs');
const net = require('net');

const ADMIN_ROOT = path.resolve(__dirname, '..');
const MALL_ROOT = path.resolve(ADMIN_ROOT, '..', 'invite-mall');
const BACKEND_PORT = 3000;
const DEFAULT_FRONTEND_PORT = 5173;
const HEALTH_URL = `http://127.0.0.1:${BACKEND_PORT}/health`;
const PID_FILE = path.join(ADMIN_ROOT, '.e2e-admin.pids.json');
// 只从 "Local:   http://localhost:5173/" 这类行解析端口，避免把 "ready in 446 ms" 里的数字当端口
const FRONTEND_PORT_REG = /Local:\s*http:\/\/[^:]+:(\d+)/;

let backendProc = null;
let frontendProc = null;
let cleaning = false;
const isWindows = process.platform === 'win32';
const pidState = { backendPid: null, frontendPid: null };

function log(msg, tag = 'e2e') {
  const ts = new Date().toISOString().slice(11, 23);
  console.log(`[${ts}] [${tag}] ${msg}`);
}

function fail(msg) {
  log(msg, 'e2e:error');
  process.exitCode = 1;
  cleanupSync();
  process.exit(1);
}

function readPidFile() {
  try {
    const raw = fs.readFileSync(PID_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writePidFile() {
  try {
    fs.writeFileSync(PID_FILE, JSON.stringify(pidState), 'utf-8');
  } catch {}
}

function clearPidFile() {
  try {
    fs.unlinkSync(PID_FILE);
  } catch {}
}

function getCmdLine(pid) {
  try {
    if (isWindows) {
      const res = spawnSync('wmic', ['process', 'where', `processid=${pid}`, 'get', 'CommandLine'], {
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      return (res.stdout || '').trim();
    }
    const res = spawnSync('ps', ['-p', String(pid), '-o', 'command='], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return (res.stdout || '').trim();
  } catch {
    return '';
  }
}

function shouldKill(pid, kind) {
  const cmd = getCmdLine(pid).toLowerCase();
  if (!cmd) return false;
  if (kind === 'frontend') return cmd.includes('vite') && cmd.includes('invite-mall-admin');
  if (kind === 'backend') return cmd.includes('verify-serve') && cmd.includes('invite-mall');
  return false;
}

function cleanupStalePids() {
  const prev = readPidFile();
  if (!prev) return;
  const checks = [
    { pid: prev.frontendPid, kind: 'frontend', label: '前端 dev(上次残留)' },
    { pid: prev.backendPid, kind: 'backend', label: '后端 verify:serve(上次残留)' },
  ];
  checks.forEach(({ pid, kind, label }) => {
    if (!pid) return;
    try {
      process.kill(pid, 0);
    } catch {
      return;
    }
    if (shouldKill(pid, kind)) {
      killTreeSync({ pid }, label);
    } else {
      log(`检测到 pid=${pid} 但命令不匹配，跳过清理`, 'e2e:warn');
    }
  });
}

function checkPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => {
      if (err && err.code === 'EADDRINUSE') return resolve(true);
      return resolve(false);
    });
    server.once('listening', () => {
      server.close(() => resolve(false));
    });
    server.listen(port, '0.0.0.0');
  });
}

function killTreeSync(proc, label) {
  if (!proc || !proc.pid) return;
  const pid = proc.pid;
  try {
    log(`关闭${label} 进程 (pid=${pid})`);
    if (isWindows) {
      spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      try {
        process.kill(-pid, 'SIGTERM');
      } catch {
        process.kill(pid, 'SIGTERM');
      }
    }
  } catch {}
}

function waitForExit(proc, timeoutMs = 5000) {
  if (!proc || proc.exitCode !== null) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, timeoutMs);
    proc.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

async function killTree(proc, label) {
  if (!proc || !proc.pid) return;
  const pid = proc.pid;
  try {
    log(`关闭${label} 进程 (pid=${pid})`);
    if (isWindows) {
      spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      try {
        process.kill(-pid, 'SIGTERM');
      } catch {
        process.kill(pid, 'SIGTERM');
      }
    }
  } catch {}
  await waitForExit(proc, 3000);
  if (proc.exitCode === null) {
    try {
      if (isWindows) {
        spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
      } else {
        try {
          process.kill(-pid, 'SIGKILL');
        } catch {
          process.kill(pid, 'SIGKILL');
        }
      }
    } catch {}
    await waitForExit(proc, 2000);
  }
}

function cleanupSync() {
  killTreeSync(frontendProc, '前端 dev');
  frontendProc = null;
  pidState.frontendPid = null;
  killTreeSync(backendProc, '后端 verify:serve');
  backendProc = null;
  pidState.backendPid = null;
  clearPidFile();
}

async function cleanup() {
  if (cleaning) return;
  cleaning = true;
  await killTree(frontendProc, '前端 dev');
  frontendProc = null;
  pidState.frontendPid = null;
  await killTree(backendProc, '后端 verify:serve');
  backendProc = null;
  pidState.backendPid = null;
  clearPidFile();
}

function waitForHealth(timeoutMs = 20000) {
  const step = 500;
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      http.get(HEALTH_URL, (res) => {
        if (res.statusCode === 200) return resolve();
        if (Date.now() - start > timeoutMs) return reject(new Error(`health 返回 ${res.statusCode}`));
        setTimeout(tick, step);
      }).on('error', (err) => {
        if (Date.now() - start > timeoutMs) return reject(err);
        setTimeout(tick, step);
      });
    };
    tick();
  });
}

function runVerifyFirst() {
  return new Promise((resolve, reject) => {
    log('在 invite-mall 执行 npm run verify（校验后端）...');
    const cwd = MALL_ROOT;
    if (!fs.existsSync(path.join(cwd, 'package.json'))) {
      return reject(new Error('未找到 ../invite-mall，请确保 invite-mall 与 invite-mall-admin 同级'));
    }
    const child = spawn('npm', ['run', 'verify'], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
      env: { ...process.env, FORCE_COLOR: '0' },
    });
    let out = '';
    let err = '';
    child.stdout.on('data', (c) => { out += c; process.stdout.write(c); });
    child.stderr.on('data', (c) => { err += c; process.stderr.write(c); });
    child.on('close', (code) => {
      if (code !== 0) {
        log('verify 失败，退出码: ' + code, 'e2e:error');
        return reject(new Error('npm run verify 失败，请先解决后端问题'));
      }
      log('verify 通过');
      resolve();
    });
  });
}

function startBackend() {
  return new Promise((resolve, reject) => {
    log('启动后端 verify:serve（常驻 3000）...');
    backendProc = spawn('npm', ['run', 'verify:serve'], {
      cwd: MALL_ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
      detached: !isWindows,
      env: { ...process.env, FORCE_COLOR: '0' },
    });
    pidState.backendPid = backendProc.pid;
    writePidFile();
    let stderr = '';
    backendProc.stderr.on('data', (c) => { stderr += c; });
    backendProc.stdout.on('data', (c) => {
      process.stdout.write(c);
    });
    backendProc.on('error', (err) => {
      log('后端启动错误: ' + err.message, 'e2e:error');
      reject(err);
    });
    backendProc.on('exit', (code, signal) => {
      if (code !== null && code !== 0 && !frontendProc) {
        if (stderr.includes('EADDRINUSE')) {
          log('端口 3000 已被占用，请先停止占用该端口的进程。', 'e2e:error');
        }
        reject(new Error('后端进程异常退出: ' + code));
      }
    });
    waitForHealth(25000)
      .then(() => {
        log('后端已就绪: http://127.0.0.1:' + BACKEND_PORT);
        resolve();
      })
      .catch((err) => {
        if (stderr.includes('EADDRINUSE')) {
          log('端口 3000 已被占用，请先停止占用该端口的进程。', 'e2e:error');
        }
        reject(err);
      });
  });
}

function startFrontend() {
  return new Promise((resolve, reject) => {
    log('启动前端 dev（--host，解析端口）...');
    const env = { ...process.env, VITE_ADMIN_KEY: 'dev-admin-key', FORCE_COLOR: '0' };
    frontendProc = spawn('npm', ['run', 'dev', '--', '--host'], {
      cwd: ADMIN_ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
      detached: !isWindows,
      env,
    });
    pidState.frontendPid = frontendProc.pid;
    writePidFile();
    let resolved = false;
    let port = DEFAULT_FRONTEND_PORT;
    const onLine = (line) => {
      const m = line.match(FRONTEND_PORT_REG);
      if (m && m[1]) {
        port = parseInt(m[1], 10);
        if (!resolved) {
          resolved = true;
          log('前端已就绪，端口: ' + port);
          resolve(port);
        }
      }
    };
    let buf = '';
    frontendProc.stdout.on('data', (c) => {
      buf += c;
      process.stdout.write(c);
      const lines = buf.split(/\r?\n/);
      buf = lines.pop() || '';
      lines.forEach(onLine);
    });
    frontendProc.stderr.on('data', (c) => {
      process.stderr.write(c);
      buf += c;
      const lines = buf.split(/\r?\n/);
      buf = lines.pop() || '';
      lines.forEach(onLine);
    });
    frontendProc.on('error', (err) => {
      if (!resolved) reject(err);
    });
    frontendProc.on('exit', (code, signal) => {
      if (!resolved && (code !== null || signal)) {
        reject(new Error('前端进程提前退出'));
      }
    });
    // 若 15s 内未解析到端口，用默认 5173
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        log('使用默认前端端口: ' + port);
        resolve(port);
      }
    }, 15000);
  });
}

function runPlaywright(port) {
  return new Promise((resolve, reject) => {
    const baseURL = `http://localhost:${port}`;
    log('运行 Playwright: baseURL=' + baseURL);
    const child = spawn(
      'npx',
      ['playwright', 'test', 'tests/admin.e2e.spec.ts', '--config=playwright.config.ts'],
      {
        cwd: ADMIN_ROOT,
        stdio: 'inherit',
        shell: true,
        env: { ...process.env, PLAYWRIGHT_BASE_URL: baseURL },
      }
    );
    child.on('close', (code) => {
      if (code !== 0) reject(new Error('Playwright 测试失败'));
      else resolve();
    });
  });
}

async function main() {
  cleanupStalePids();
  const handleFatal = async (err) => {
    if (err) log(String(err), 'e2e:error');
    await cleanup();
    process.exit(1);
  };
  process.on('SIGINT', () => handleFatal('SIGINT'));
  process.on('SIGTERM', () => handleFatal('SIGTERM'));
  process.on('uncaughtException', (err) => handleFatal(err));
  process.on('unhandledRejection', (err) => handleFatal(err));
  process.on('exit', () => {
    cleanupSync();
  });

  try {
    await runVerifyFirst();
  } catch (e) {
    fail(e.message || String(e));
  }

  try {
    await startBackend();
  } catch (e) {
    fail(e.message || String(e));
  }

  let port;
  try {
    const inUse = await checkPortInUse(DEFAULT_FRONTEND_PORT);
    if (inUse) {
      console.warn('[e2e-admin] Port 5173 is already in use, Vite may switch to another port.');
    }
    port = await startFrontend();
  } catch (e) {
    cleanup();
    fail(e.message || String(e));
  }

  try {
    await runPlaywright(port);
    log('========== e2e:admin PASS ==========');
  } catch (e) {
    log('Playwright 执行未通过', 'e2e:error');
    process.exitCode = 1;
  } finally {
    await cleanup();
  }
}

main();
