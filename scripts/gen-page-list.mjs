#!/usr/bin/env node
/**
 * 生成 README 的「页面清单」章节。
 *
 * 用法：node scripts/gen-page-list.mjs [--write]
 *
 * 不带 --write 时只打印统计结果；带 --write 时直接改写 README.md 中
 * `<!-- PAGE_LIST_START -->` 与 `<!-- PAGE_LIST_END -->` 之间的内容。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const write = process.argv.includes('--write')

// ---------------------------------------------------------------------------
// 采集各端页面
// ---------------------------------------------------------------------------

/** 递归列出目录下匹配后缀的文件。 */
function walk(dir, ext) {
  const out = []
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...walk(full, ext))
    } else if (entry.name.endsWith(ext)) {
      out.push(full)
    }
  }
  return out
}

/** 小程序：统计主包 pages[] 与分包 subPackages[].pages[] 之和。 */
function collectMiniapp() {
  const appJsonPath = path.join(root, 'apps/miniapp/app.json')
  const app = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'))
  const rows = []
  for (const p of app.pages ?? []) {
    rows.push({ name: path.basename(p), dir: `apps/miniapp/${p}` })
  }
  for (const sp of app.subPackages ?? []) {
    for (const p of sp.pages ?? []) {
      rows.push({
        name: path.basename(p),
        dir: `apps/miniapp/${sp.root}/${p}`,
        pkg: sp.root,
      })
    }
  }
  return rows.sort((a, b) => a.dir.localeCompare(b.dir))
}

/** Flutter：lib/pages 下的 *_page.dart。 */
function collectFlutter() {
  const dir = path.join(root, 'apps/flutter/lib/pages')
  return walk(dir, '_page.dart')
    .map((f) => ({
      name: path.basename(f, '.dart').replace(/_page$/, ''),
      file: path.relative(root, f),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** Vue3：src/views 下的 *View.vue。 */
function collectVue() {
  const dir = path.join(root, 'apps/web-vue/src/views')
  return walk(dir, 'View.vue')
    .map((f) => ({
      name: path.basename(f, '.vue').replace(/View$/, ''),
      file: path.relative(root, f),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** React：src/pages 下的 *.tsx。 */
function collectReact() {
  const dir = path.join(root, 'apps/admin-react/src/pages')
  return walk(dir, '.tsx')
    .map((f) => ({
      name: path.basename(f, '.tsx'),
      file: path.relative(root, f),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** 统计路由表里的路由条数（Vue3 / React）。 */
function countRoutes(file, pattern) {
  if (!fs.existsSync(file)) return 0
  const src = fs.readFileSync(file, 'utf8')
  const matches = src.match(pattern)
  return matches ? matches.length : 0
}

// ---------------------------------------------------------------------------
// 渲染
// ---------------------------------------------------------------------------

function render() {
  const mini = collectMiniapp()
  const flutter = collectFlutter()
  const vue = collectVue()
  const react = collectReact()

  const vueRoutes = countRoutes(
    path.join(root, 'apps/web-vue/src/router/index.ts'),
    /path:\s*'/g,
  )
  const reactRoutes = countRoutes(
    path.join(root, 'apps/admin-react/src/router/index.tsx'),
    /<Route\s+path=/g,
  )

  const lines = []
  lines.push('## 页面清单')
  lines.push('')
  lines.push('> 本章节由 `node scripts/gen-page-list.mjs --write` 自动生成，请勿手工编辑。')
  lines.push('')
  lines.push(
    `四端**各自** ${mini.length} / ${flutter.length} / ${vue.length} / ${react.length} 页，` +
      `合计 **${mini.length + flutter.length + vue.length + react.length} 个页面**。`,
  )
  lines.push('')

  lines.push(`### 微信小程序（${mini.length} 页）`)
  lines.push('')
  lines.push('| 页面 | 目录 |')
  lines.push('| --- | --- |')
  for (const p of mini) {
    lines.push(`| ${p.name}${p.pkg ? ` （${p.pkg} 分包）` : ''} | \`${p.dir}\` |`)
  }
  lines.push('')

  lines.push(`### Flutter 移动端（${flutter.length} 页）`)
  lines.push('')
  lines.push('| 页面 | 文件 |')
  lines.push('| --- | --- |')
  for (const p of flutter) {
    lines.push(`| ${p.name} | \`${p.file}\` |`)
  }
  lines.push('')

  lines.push(`### Vue3 Web 用户端（${vue.length} 页 / ${vueRoutes} 条路由）`)
  lines.push('')
  lines.push('| 页面 | 文件 |')
  lines.push('| --- | --- |')
  for (const p of vue) {
    lines.push(`| ${p.name} | \`${p.file}\` |`)
  }
  lines.push('')

  lines.push(`### React 后台管理（${react.length} 页 / ${reactRoutes} 条路由）`)
  lines.push('')
  lines.push('| 组件 | 文件 |')
  lines.push('| --- | --- |')
  for (const p of react) {
    lines.push(`| ${p.name.replace(/\.tsx$/, '')} | \`${p.file}\` |`)
  }
  lines.push('')

  return {
    text: lines.join('\n'),
    stats: { mini: mini.length, flutter: flutter.length, vue: vue.length, react: react.length },
  }
}

// ---------------------------------------------------------------------------
// 入口
// ---------------------------------------------------------------------------

const { text, stats } = render()

console.log('页面统计：')
console.log(`  微信小程序 : ${stats.mini}`)
console.log(`  Flutter    : ${stats.flutter}`)
console.log(`  Vue3       : ${stats.vue}`)
console.log(`  React      : ${stats.react}`)
console.log(`  合计       : ${stats.mini + stats.flutter + stats.vue + stats.react}`)

if (!write) {
  process.exit(0)
}

const readmePath = path.join(root, 'README.md')
const readme = fs.readFileSync(readmePath, 'utf8')
const startMark = '<!-- PAGE_LIST_START -->'
const endMark = '<!-- PAGE_LIST_END -->'

const startIdx = readme.indexOf(startMark)
const endIdx = readme.indexOf(endMark)
if (startIdx === -1 || endIdx === -1) {
  console.error('README.md 中找不到 PAGE_LIST_START / PAGE_LIST_END 标记')
  process.exit(1)
}

const next =
  readme.slice(0, startIdx + startMark.length) +
  '\n\n' +
  text +
  '\n' +
  readme.slice(endIdx)

fs.writeFileSync(readmePath, next, 'utf8')
console.log('README.md 页面清单章节已更新')
