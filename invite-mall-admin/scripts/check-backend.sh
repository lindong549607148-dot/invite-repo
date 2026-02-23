#!/usr/bin/env bash
# 自检脚本：确认后端 invite-mall 在 3000 端口运行，且 admin 接口可用
# 用法：在 invite-mall 已启动后，于前端项目根目录执行：./scripts/check-backend.sh

set -e
BASE="${1:-http://127.0.0.1:3000}"
ADMIN_KEY="${VITE_ADMIN_KEY:-dev-admin-key}"

echo "=== 1. 检查 3000 端口是否在监听 ==="
if command -v lsof >/dev/null 2>&1; then
  if lsof -i :3000 -sTCP:LISTEN >/dev/null 2>&1; then
    echo "OK: 端口 3000 正在监听"
  else
    echo "WARN: lsof 未发现 3000 监听（可能环境限制），继续用 curl 检测"
  fi
else
  echo "跳过 lsof（未安装），继续用 curl 检测"
fi

echo ""
echo "=== 2. 健康检查 GET $BASE/health ==="
HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/health" 2>/dev/null || echo "000")
if [ "$HTTP" = "200" ]; then
  echo "OK: 健康检查返回 200"
else
  echo "FAIL: 健康检查返回 $HTTP（预期 200）"
  exit 1
fi

echo ""
echo "=== 3. Admin 接口 GET $BASE/api/admin/refund/list（带 x-admin-key） ==="
HTTP=$(curl -s -o /dev/null -w "%{http_code}" -H "x-admin-key: $ADMIN_KEY" "$BASE/api/admin/refund/list" 2>/dev/null || echo "000")
if [ "$HTTP" = "200" ]; then
  echo "OK: /api/admin/refund/list 返回 200"
else
  echo "FAIL: /api/admin/refund/list 返回 $HTTP（预期 200）。请确认后端 ADMIN_KEY 与前端 VITE_ADMIN_KEY 一致（如 dev-admin-key）"
  exit 1
fi

echo ""
echo "=== 自检通过：后端 3000 可用，admin 鉴权正常 ==="
