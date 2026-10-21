#!/usr/bin/env bash
# 停止所有本地开发服务。
set -uo pipefail

BIN_DIR="${SHOP_BIN_DIR:-/tmp/shopstack-bin}"

for name in gateway user-service product-service cart-service order-service \
            payment-service inventory-service marketing-service logistics-service \
            notification-service; do
  pkill -f "$BIN_DIR/$name" 2>/dev/null && echo "已停止 $name"
done

echo "全部服务已停止"
