#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# ShopStack 本地开发启动脚本（不依赖 Docker Compose）
#
# 用法:
#   ./scripts/dev-up.sh            # 启动全部后端服务 + 网关
#   ./scripts/dev-up.sh --no-gw    # 只启动微服务
#   ./scripts/dev-down.sh          # 停止全部
#
# 前置条件：MySQL(13306) / Redis(6379) / RabbitMQ(5672) 已就绪
# ---------------------------------------------------------------------------
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN_DIR="${SHOP_BIN_DIR:-/tmp/shopstack-bin}"
LOG_DIR="${SHOP_LOG_DIR:-/tmp/shopstack-logs}"

export SHOP_MYSQL_PORT="${SHOP_MYSQL_PORT:-13306}"
export SHOP_REDIS_ADDR="${SHOP_REDIS_ADDR:-127.0.0.1:6379}"
export SHOP_RABBITMQ_URL="${SHOP_RABBITMQ_URL:-amqp://shopstack:shopstack@127.0.0.1:5672/}"
export SHOP_NACOS_ENABLED="${SHOP_NACOS_ENABLED:-false}"
export SHOP_LOG_LEVEL="${SHOP_LOG_LEVEL:-info}"

mkdir -p "$BIN_DIR" "$LOG_DIR"

SERVICES=(
  "user-service:9001"
  "product-service:9002"
  "cart-service:9003"
  "order-service:9004"
  "payment-service:9005"
  "inventory-service:9006"
  "marketing-service:9007"
  "logistics-service:9008"
  "notification-service:9009"
)

echo "==> 编译后端服务"
cd "$ROOT"
export GOPROXY="${GOPROXY:-https://goproxy.cn,direct}"
export GOFLAGS="${GOFLAGS:--mod=mod}"
for entry in "${SERVICES[@]}"; do
  name="${entry%%:*}"
  echo "    - $name"
  go build -o "$BIN_DIR/$name" "./backend/cmd/$name"
done
if [[ "${1:-}" != "--no-gw" ]]; then
  echo "    - gateway"
  go build -o "$BIN_DIR/gateway" "./backend/cmd/gateway"
fi

echo "==> 启动服务"
start_service() {
  local name="$1" port="$2"
  pkill -f "$BIN_DIR/$name" 2>/dev/null || true
  sleep 0.3
  SHOP_GRPC_ADDR=":$port" SHOP_SERVICE_NAME="$name" \
    "$BIN_DIR/$name" > "$LOG_DIR/$name.log" 2>&1 &
  echo "    $name  :$port  (日志: $LOG_DIR/$name.log)"
}

for entry in "${SERVICES[@]}"; do
  start_service "${entry%%:*}" "${entry##*:}"
done
sleep 4

if [[ "${1:-}" != "--no-gw" ]]; then
  pkill -f "$BIN_DIR/gateway" 2>/dev/null || true
  sleep 0.3
  GATEWAY_PORT="${SHOP_HTTP_PORT:-8080}"
  SHOP_HTTP_ADDR=":${GATEWAY_PORT}" SHOP_SERVICE_NAME="gateway" \
    "$BIN_DIR/gateway" > "$LOG_DIR/gateway.log" 2>&1 &
  echo "    gateway  :${GATEWAY_PORT}  (日志: $LOG_DIR/gateway.log)"
  sleep 2
fi

echo
echo "==> 启动完成"
echo "    健康检查: curl http://127.0.0.1:${SHOP_HTTP_PORT:-8080}/healthz"
echo "    就绪检查: curl http://127.0.0.1:${SHOP_HTTP_PORT:-8080}/readyz"
echo "    冒烟测试: cd $ROOT && go run ./backend/cmd/smoketest --mode=grpc"
