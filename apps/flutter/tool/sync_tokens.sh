#!/usr/bin/env bash
# 同步 design-tokens 生成的 Dart 令牌到 App 内。
# 设计令牌生成物位于包目录之外，Dart 分析器不允许跨包相对导入，
# 因此以「原样复制 + 同步脚本」的方式保持唯一来源。
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
SRC="$ROOT/design-tokens/generated/tokens.dart"
DST_DIR="$SCRIPT_DIR/../lib/core/theme"

{
  echo "// 由 tool/sync_tokens.sh 自动同步自 design-tokens/generated/tokens.dart，请勿手工修改。"
  cat "$SRC"
} > "$DST_DIR/app_tokens.dart"

python3 "$SCRIPT_DIR/generate_theme_tokens.py" "$SRC" "$DST_DIR/generated_app_tokens.dart"
echo "synced: $SRC -> $DST_DIR"
