#!/usr/bin/env python3
"""从 design-tokens/generated/tokens.dart 生成可 const 使用的颜色 / 尺寸常量。"""
import re
import sys
from pathlib import Path

SRC = Path(sys.argv[1])
DST = Path(sys.argv[2])

text = SRC.read_text(encoding='utf-8')

hex_colors = re.findall(r'static const String (color\w+)\s*=\s*"(#[0-9A-Fa-f]{6})"', text)
sizes = re.findall(r'static const String (radius\w+)\s*=\s*"(\d+(?:\.\d+)?)px"', text)

lines = [
    '// 由 tool/sync_tokens.sh 自动生成，请勿手工修改。',
    '// 来源：design-tokens/generated/tokens.dart',
    "import 'package:flutter/material.dart';",
    '',
    '/// 设计令牌颜色常量（与 AppColors 的十六进制值一一对应）。',
    'class AppColorTokens {',
    '  AppColorTokens._();',
    '',
]
for name, value in hex_colors:
    lines.append(f"  static const Color {name} = Color(0xFF{value[1:].upper()});")
lines += [
    '}',
    '',
    '/// 圆角等尺寸类令牌。',
    'class AppSizeTokens {',
    '  AppSizeTokens._();',
    '',
]
for name, value in sizes:
    lines.append(f"  static const double {name} = {value};")
lines += [
    '}',
    '',
]

DST.write_text('\n'.join(lines), encoding='utf-8')
print(f'generated {len(hex_colors)} colors, {len(sizes)} sizes -> {DST}')
