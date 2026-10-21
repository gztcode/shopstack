#!/usr/bin/env node
/**
 * 导出本次 AI 协作会话记录到 docs/ai-session/
 *
 * 产出：
 *   transcript.md            主会话完整对话记录（可读 Markdown）
 *   compaction-summaries.md  上下文压缩摘要（早期历史唯一留存）
 *   subagents/*.md           各子 Agent 的独立会话记录
 *   stats.json               机器可读的用量统计
 *
 * 用法：node scripts/export-ai-session.mjs [sessionId]
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, statSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, basename, dirname } from 'node:path';

const DATA_DIR = process.env.MINIMAX_DATA_DIR || join(homedir(), '.minimax');
const SESSIONS_ROOT = join(DATA_DIR, 'v2', 'sessions');
const OUT_DIR = join(process.cwd(), 'docs', 'ai-session');
const MODEL = 'MiniMax-M3.1-Flash';

// ---------- 脱敏：把本机绝对路径换成占位符，避免公开仓库泄露本地目录结构 ----------
const REDACTIONS = [
  [/Users\/[^\s"'`/]+\/\.minimax\/sessions\/[^\s"'`/]+\/workspace/g, '<WORKSPACE>'],
  [/Users\/[^\s"'`/]+\/\.minimax/g, '<MINIMAX_DATA_DIR>'],
  [/Users\/[^\s"'`/]+/g, '<HOME>'],
  // macOS ls -la 的属主/属组列
  [/\btom\s+staff\b/g, '<user> <group>'],
];

function redact(text) {
  if (typeof text !== 'string') return text;
  let out = text;
  for (const [re, to] of REDACTIONS) out = out.replace(re, to);
  return out;
}

// ---------- 消息读取 ----------
function readJsonl(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

/** 汇总文本：兼容 string 与 content 数组两种形态 */
function textOf(message) {
  const c = message?.content;
  if (typeof c === 'string') return c;
  if (!Array.isArray(c)) return '';
  return c
    .filter((p) => p && (p.type === 'text' || p.type === 'thinking'))
    .map((p) => (p.type === 'thinking' ? p.thinking : p.text))
    .join('\n');
}

/** 拆分 assistant 消息里的思考过程与正式回复 */
function splitAssistant(message) {
  const c = message?.content;
  if (!Array.isArray(c)) return { thinking: '', text: textOf(message) };
  const thinking = c.filter((p) => p?.type === 'thinking').map((p) => p.thinking || '').join('\n');
  const text = c.filter((p) => p?.type === 'text').map((p) => p.text || '').join('\n');
  return { thinking, text };
}

/** 去掉运行时注入的 system-reminder 噪声，只留用户真实输入 */
function stripReminders(text) {
  return text
    .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '')
    .replace(/<mavis-context-appendix[\s\S]*?<\/mavis-context-appendix>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** 子 Agent 的任务描述往往在首条 user 消息里，但注入的 system-reminder 会把它顶掉 */
function firstTaskText(messages) {
  for (const raw of messages) {
    const m = raw.message || raw;
    if (m.role !== 'user') continue;
    const body = stripReminders(textOf(m));
    if (body) return body;
  }
  // 上下文被压缩过的子会话，首条任务是压缩摘要里的 Goal 段
  for (const raw of messages) {
    const m = raw.message || raw;
    if (m.role === 'compactionSummary' && m.summary) {
      const goal = m.summary.match(/##\s*Goal\s*\n([\s\S]*?)(?=\n##\s|$)/);
      if (goal) return goal[1].trim();
    }
  }
  // 兜底：部分子会话首条就是路径或系统提示，从 assistant 首条回复里取线索
  for (const raw of messages) {
    const m = raw.message || raw;
    if (m.role === 'assistant') {
      const { thinking, text } = splitAssistant(m);
      const body = (text || thinking || '').trim();
      if (body) return body;
    }
  }
  return '';
}

/** 只保留与本项目相关的子会话 */
function belongsToProject(messages) {
  const probe = messages
    .slice(0, 40)
    .map((raw) => {
      const m = raw.message || raw;
      return textOf(m);
    })
    .join('\n');
  return /ShopStack|shopstack|apps\/(flutter|miniapp|web-vue|admin-react)|backend\/internal/.test(probe);
}

/** 为子 Agent 生成可读且稳定的短标识 */
function slugFor(brief) {
  const rules = [
    [/Vue3\s*用户端|Web\s*用户端|web-vue/i, 'vue3-用户端'],
    [/Flutter\s*移动端|移动端\s*App|Flutter/i, 'flutter-移动端'],
    [/微信小程序|miniapp/i, 'miniapp-小程序端'],
    [/React\s*后台|后台管理端|admin-react/i, 'react-后台管理端'],
    [/3 个 Go 微服务|营销服务.*物流服务.*通知服务/i, 'go-微服务-营销物流通知'],
    [/\buser\b\s*域/i, 'backend-user-域'],
    [/\bproduct\b\s*域/i, 'backend-product-域'],
    [/\border\b\s*域/i, 'backend-order-域'],
    [/\binventory\b\s*域/i, 'backend-inventory-域'],
    [/\bmarketing\b\s*域/i, 'backend-marketing-域'],
  ];
  for (const [re, slug] of rules) if (re.test(brief)) return slug;

  // 没有命中规则时，取首句里较长的中文/英文词组
  const head = brief.split(/[。！\n]/)[0].trim();
  const cleaned = head
    .replace(/[\\/:*?"<>|#`~\[\]{}()]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 40);
  return cleaned || 'subagent';
}

function findSessionDirs() {
  const out = [];
  // 目录按「年 / 月 / 日 / 会话」分层，逐层下钻直到找到 messages.jsonl
  const walk = (dir, depth) => {
    if (depth > 4) return;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const child = join(dir, e.name);
      if (existsSync(join(child, 'messages.jsonl'))) out.push(child);
      else walk(child, depth + 1);
    }
  };
  walk(SESSIONS_ROOT, 0);
  return out.sort();
}

/** 主会话 = messages.jsonl 最新的那个；其余为子 Agent 会话 */
function splitMainAndSubs(sessionDirs) {
  let main = null;
  let newest = -1;
  for (const dir of sessionDirs) {
    const st = statSafe(join(dir, 'messages.jsonl'));
    if (st && st.mtimeMs > newest) {
      newest = st.mtimeMs;
      main = dir;
    }
  }
  return { main, subs: sessionDirs.filter((d) => d !== main) };
}

function statSafe(path) {
  try {
    return statSync(path);
  } catch {
    return null;
  }
}

// ---------- Markdown 渲染 ----------
function fence(text, lang = '') {
  const body = String(text ?? '');
  // 反引号围栏需要比正文里最长的连续反引号更长，否则代码块会被提前闭合
  const longest = (body.match(/`+/g) || []).reduce((m, s) => Math.max(m, s.length), 0);
  const tick = '`'.repeat(Math.max(3, longest + 1));
  return `${tick}${lang}\n${body}\n${tick}`;
}

function fmtTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

// GitHub 对单个 Markdown 的渲染上限约 512KB，超出会显示「文件过大，无法显示」
const MAX_VOLUME_BYTES = 380 * 1024;

/** 单条消息偶尔非常大（超长工具输出），需要按行二次切分并各自补齐代码围栏 */
function splitOversized(block) {
  if (Buffer.byteLength(block, 'utf8') <= MAX_VOLUME_BYTES) return [block];

  const lines = block.split('\n');
  const fenceStart = /^\s*(`{3,})/.test(lines[0] || '') ? lines[0] : null;
  const fenceEnd = fenceStart && /^\s*`{3,}\s*$/.test(lines[lines.length - 1] || '') ? lines[lines.length - 1] : null;
  const body = fenceStart && fenceEnd ? lines.slice(1, -1) : lines;

  const pieces = [];
  let current = [];
  let size = 0;
  for (const line of body) {
    const len = Buffer.byteLength(line, 'utf8') + 1;
    if (size + len > MAX_VOLUME_BYTES && current.length) {
      pieces.push(current);
      current = [];
      size = 0;
    }
    current.push(line);
    size += len;
  }
  if (current.length) pieces.push(current);

  return pieces.map((p, i) => {
    const label = pieces.length > 1 ? `（第 ${i + 1}/${pieces.length} 段）` : '';
    if (fenceStart && fenceEnd) {
      return [fenceStart, `${label}`, ...p, fenceEnd].join('\n');
    }
    return [`**${label}**`, ...p].join('\n');
  });
}

/** 渲染消息为若干「消息块」，每块对应一条消息，便于后续分卷 */
function renderBlocks(messages, { showTools = true } = {}) {
  const blocks = [];

  for (const raw of messages) {
    const m = raw.message || raw;
    const role = m.role;

    if (role === 'compactionSummary') {
      blocks.push(
        ['## 上下文压缩摘要', '', '> 上下文超限触发压缩，以下是压缩器保留的关键信息：', '', fence(redact(m.summary || '')), ''].join('\n'),
      );
      continue;
    }

    if (role === 'custom') {
      // 运行时注入提示（工具定义、后台任务提醒等），单独折叠，不淹没正文
      const body = redact(textOf(m));
      if (!body) continue;
      blocks.push(
        ['<details><summary>💡 运行时提示 · ' + (m.customType || 'custom') + '</summary>', '', fence(body), '', '</details>', ''].join('\n'),
      );
      continue;
    }

    if (role === 'user') {
      const body = redact(stripReminders(textOf(m)));
      if (!body) continue;
      blocks.push(['## 👤 用户 · ' + fmtTime(m.timestamp), '', body, ''].join('\n'));
      continue;
    }

    if (role === 'assistant') {
      const { thinking, text } = splitAssistant(m);
      const parts = ['## 🤖 ' + MODEL + ' · ' + fmtTime(m.timestamp), ''];
      if (thinking.trim()) {
        parts.push('<details><summary>🧠 思考过程</summary>', '', fence(redact(thinking)), '', '</details>', '');
      }
      if (text.trim()) parts.push(redact(text), '');
      blocks.push(parts.join('\n'));
      continue;
    }

    if (role === 'toolResult' && showTools) {
      const body = redact(stripReminders(textOf(m)));
      const err = m.isError ? ' · 出错' : '';
      blocks.push(
        ['<details><summary>🛠 ' + (m.toolName || 'tool') + err + '</summary>', '', fence(body), '', '</details>', ''].join('\n'),
      );
    }
  }

  return blocks;
}

/** 把消息块按体积上限切成多个卷；单卷时保持原文件名 */
function writeVolumes(outDir, baseName, title, blocks) {
  const volumes = [];
  let current = [];
  let size = 0;

  const flush = () => {
    if (!current.length) return;
    volumes.push(current.join('\n'));
    current = [];
    size = 0;
  };

  for (const raw of blocks) {
    for (const b of splitOversized(raw)) {
      const len = Buffer.byteLength(b, 'utf8');
      if (size + len > MAX_VOLUME_BYTES && current.length) flush();
      current.push(b);
      size += len;
    }
  }
  flush();

  const multi = volumes.length > 1;
  const files = volumes.map((body, i) => {
    const name = multi ? `${baseName}-${String(i + 1).padStart(2, '0')}.md` : `${baseName}.md`;
    const header = [`# ${title}`, '', multi ? `> 第 ${i + 1} / ${volumes.length} 卷` : '', ''].join('\n');
    writeFileSync(join(outDir, name), header + '\n' + body);
    return { file: name, bytes: Buffer.byteLength(header + body, 'utf8') };
  });

  return files;
}

// ---------- 统计 ----------
function computeStats(messages) {
  const stats = {
    model: MODEL,
    messages: 0,
    byRole: {},
    userTurns: 0,
    assistantTurns: 0,
    toolResults: 0,
    toolCalls: new Map(),
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    totalTokens: 0,
    firstMessageAt: null,
    lastMessageAt: null,
  };

  for (const raw of messages) {
    const m = raw.message || raw;
    stats.messages += 1;
    stats.byRole[m.role] = (stats.byRole[m.role] || 0) + 1;

    if (m.role === 'user') stats.userTurns += 1;
    if (m.role === 'assistant') stats.assistantTurns += 1;
    if (m.role === 'toolResult') {
      stats.toolResults += 1;
      const name = m.toolName || 'unknown';
      stats.toolCalls.set(name, (stats.toolCalls.get(name) || 0) + 1);
    }

    const u = m.usage;
    if (u) {
      stats.inputTokens += u.input_tokens ?? u.input ?? 0;
      stats.outputTokens += u.output_tokens ?? u.output ?? 0;
      stats.cacheReadTokens += u.cache_read ?? u.cacheRead ?? 0;
      stats.totalTokens += u.total_tokens ?? u.totalTokens ?? 0;
    }

    if (m.timestamp) {
      if (!stats.firstMessageAt || m.timestamp < stats.firstMessageAt) stats.firstMessageAt = m.timestamp;
      if (!stats.lastMessageAt || m.timestamp > stats.lastMessageAt) stats.lastMessageAt = m.timestamp;
    }
  }

  stats.toolCalls = Object.fromEntries([...stats.toolCalls.entries()].sort((a, b) => b[1] - a[1]));
  return stats;
}

// ---------- 主流程 ----------
function main() {
  const sessionDirs = findSessionDirs();
  if (!sessionDirs.length) {
    console.error(`未在 ${SESSIONS_ROOT} 找到任何会话记录`);
    process.exit(1);
  }

  const { main: mainDir, subs } = splitMainAndSubs(sessionDirs);
  console.log(`主会话: ${basename(mainDir)}`);
  console.log(`子会话: ${subs.length} 个`);

  // 重跑时清空旧产物，避免残留上一轮的文件名
  rmSync(join(OUT_DIR, 'subagents'), { recursive: true, force: true });
  mkdirSync(join(OUT_DIR, 'subagents'), { recursive: true });

  // --- 主会话：合并「全部压缩快照 + 当前消息文件」，得到压缩前后的完整历史 ---
  const snapDir = join(mainDir, 'snapshots');
  const snapshots = existsSync(snapDir)
    ? readdirSync(snapDir)
        .filter((f) => /^g\d+.*\.jsonl$/.test(f))
        .sort()
    : [];

  // 每一代快照都是当时完整的消息流，跨代合并去重才能覆盖最早的对话
  const seen = new Set();
  const merged = [];
  for (const f of snapshots) {
    for (const m of readJsonl(join(snapDir, f))) {
      const id = m.message_id || JSON.stringify(m).slice(0, 80);
      if (seen.has(id)) continue;
      seen.add(id);
      merged.push(m);
    }
  }
  const snapshotCount = merged.length;
  for (const m of readJsonl(join(mainDir, 'messages.jsonl'))) {
    const id = m.message_id || JSON.stringify(m).slice(0, 80);
    if (seen.has(id)) continue;
    seen.add(id);
    merged.push(m);
  }
  console.log(`合并后主会话消息: ${merged.length} 条（${snapshots.length} 代快照 ${snapshotCount} + 当前 ${merged.length - snapshotCount}）`);

  const mainVolumes = writeVolumes(
    OUT_DIR,
    'transcript',
    'ShopStack 主会话记录（MiniMax Code × MiniMax M3.1-Flash）',
    renderBlocks(merged),
  );
  // 上一轮若是单卷、这轮变多卷，旧的单文件要清掉
  if (mainVolumes.length > 1) rmSync(join(OUT_DIR, 'transcript.md'), { force: true });
  console.log(`主会话分卷: ${mainVolumes.length} 个`);

  // --- 压缩摘要：每个快照一份，这是被压缩掉的早期历史 ---
  const summaries = [];
  for (const f of snapshots) {
    for (const m of readJsonl(join(snapDir, f))) {
      const msg = m.message || m;
      if (msg.role === 'compactionSummary' && msg.summary) {
        summaries.push({ generation: f.match(/^g(\d+)/)?.[1] ?? '?', summary: msg.summary, tokensBefore: msg.tokensBefore });
      }
    }
  }
  const latestByGen = new Map();
  for (const s of summaries) latestByGen.set(s.generation, s);
  const summaryLines = ['# 上下文压缩摘要', '', '上下文超出模型窗口时会触发压缩，压缩器会保留目标、进展、关键决策与踩坑记录。', '这是被压缩掉的早期对话历史唯一的留存形式。', ''];
  for (const s of [...latestByGen.values()].sort((a, b) => Number(a.generation) - Number(b.generation))) {
    summaryLines.push(`## 第 ${s.generation} 代压缩（压缩前 ${s.tokensBefore ?? '?'} tokens）`, '', fence(redact(s.summary)), '');
  }
  writeFileSync(join(OUT_DIR, 'compaction-summaries.md'), summaryLines.join('\n'));
  console.log(`压缩摘要: ${latestByGen.size} 代`);

  // --- 子 Agent 会话 ---
  const subIndex = [];
  const usedSlugs = new Map();
  for (const dir of subs) {
    const msgs = readJsonl(join(dir, 'messages.jsonl'));
    if (!msgs.length) continue;
    // 排除与本项目无关的会话（例如其它技能的独立试用）
    if (!belongsToProject(msgs)) {
      console.log(`跳过无关会话: ${basename(dir)}`);
      continue;
    }

    const brief = firstTaskText(msgs);
    const title = redact(brief.split('\n')[0].replace(/^#+\s*/, '').trim().slice(0, 70)) || basename(dir);

    let slug = slugFor(brief);
    const seen = usedSlugs.get(slug) || 0;
    usedSlugs.set(slug, seen + 1);
    if (seen > 0) slug = `${slug}-${seen + 1}`;

    const file = `subagents/${slug}.md`;
    const volumes = writeVolumes(
      join(OUT_DIR, 'subagents'),
      slug,
      `子 Agent · ${title}`,
      renderBlocks(msgs),
    );
    if (volumes.length > 1) {
      // 多卷时移除单卷文件，只保留带序号的分卷
      rmSync(join(OUT_DIR, file), { force: true });
    }

    const st = computeStats(msgs);
    subIndex.push({
      file: volumes.length > 1 ? volumes[0].file : file,
      files: volumes.map((v) => `subagents/${v.file}`),
      volumes: volumes.length,
      slug,
      title,
      sessionId: basename(dir),
      messages: st.messages,
      userTurns: st.userTurns,
      toolResults: st.toolResults,
      startedAt: st.firstMessageAt ? fmtTime(st.firstMessageAt) : null,
      endedAt: st.lastMessageAt ? fmtTime(st.lastMessageAt) : null,
    });
  }
  subIndex.sort((a, b) => (a.startedAt || '').localeCompare(b.startedAt || ''));
  console.log(`子 Agent 记录: ${subIndex.length} 份`);

  // --- 统计 ---
  const mainStats = computeStats(merged);
  const stats = {
    model: MODEL,
    generatedBy: 'scripts/export-ai-session.mjs',
    main: {
      messages: mainStats.messages,
      byRole: mainStats.byRole,
      userTurns: mainStats.userTurns,
      assistantTurns: mainStats.assistantTurns,
      toolResults: mainStats.toolResults,
      toolCalls: mainStats.toolCalls,
      inputTokens: mainStats.inputTokens,
      outputTokens: mainStats.outputTokens,
      cacheReadTokens: mainStats.cacheReadTokens,
      totalTokens: mainStats.totalTokens,
      startedAt: mainStats.firstMessageAt ? fmtTime(mainStats.firstMessageAt) : null,
      endedAt: mainStats.lastMessageAt ? fmtTime(mainStats.lastMessageAt) : null,
    },
    subagents: subIndex,
    subagentTotals: {
      sessions: subIndex.length,
      messages: subIndex.reduce((a, s) => a + s.messages, 0),
      toolResults: subIndex.reduce((a, s) => a + s.toolResults, 0),
    },
  };
  writeFileSync(join(OUT_DIR, 'stats.json'), JSON.stringify(stats, null, 2) + '\n');

  // --- 目录说明 ---
  const roleText = Object.entries(mainStats.byRole)
    .map(([k, v]) => `| ${k} | ${v} |`)
    .join('\n');
  const toolText = Object.entries(mainStats.toolCalls)
    .slice(0, 15)
    .map(([k, v]) => `| \`${k}\` | ${v} |`)
    .join('\n');
  // --- 目录内容表 ---
  const volRows = mainVolumes
    .map((v) => `| [${v.file}](${v.file}) | ${(v.bytes / 1024).toFixed(0)} KB |`)
    .join('\n');
  const subText = subIndex
    .map(
      (s) =>
        `| [${s.title}](${s.files[0]}) | ${s.messages} | ${s.userTurns} | ${s.toolResults} | ${s.volumes > 1 ? s.volumes + ' 卷' : '1 卷'} | ${s.startedAt || ''} |`,
    )
    .join('\n');

  const readme = `# AI 协作会话记录

本目录是 ShopStack 项目从零到交付的**完整 AI 协作过程留档**，由 \`scripts/export-ai-session.mjs\` 从 MiniMax Code 本地运行时导出。

## 使用的 AI 技术

| 项 | 值 |
| --- | --- |
| 编码助手 | **MiniMax Code**（MCode） |
| 驱动模型 | **MiniMax M3.1-Flash**（\`${MODEL}\`） |
| 上下文窗口 | 512,000 tokens |
| 协作模式 | 主 Agent（root）+ ${subIndex.length} 个并行子 Agent（worker / explore / verifier） |
| 工具面 | Bash、Read/Write/Edit、Glob/Grep、Task（多 Agent 调度）、Task 管理、MCP 工具、浏览器控制 |

## 目录内容

| 文件 | 内容 |
| --- | --- |
| [index.md](index.md) | 全部记录的分卷索引 |
| [compaction-summaries.md](compaction-summaries.md) | ${latestByGen.size} 代上下文压缩摘要——被压缩掉的早期历史唯一留存 |
| [stats.json](stats.json) | 机器可读统计：消息数、Token 用量、工具调用分布、子 Agent 清单 |

## 主会话统计

| 指标 | 值 |
| --- | --- |
| 消息总数 | ${mainStats.messages} |
| 用户轮次 | ${mainStats.userTurns} |
| AI 回复 | ${mainStats.assistantTurns} |
| 工具返回 | ${mainStats.toolResults} |
| 累计 Token | ${mainStats.totalTokens.toLocaleString('en-US')} |
| 时间跨度 | ${stats.main.startedAt} → ${stats.main.endedAt} |

### 主会话记录分卷

单文件超过 400KB 会超出 GitHub 的 Markdown 渲染上限，故按卷拆分：

| 分卷 | 大小 |
| --- | --- |
${volRows}

### 消息角色分布

| 角色 | 条数 |
| --- | --- |
${roleText}

### 工具调用分布

| 工具 | 次数 |
| --- | --- |
${toolText}

## 子 Agent 会话

主 Agent 把四端开发、契约扩展、后端补齐等可并行的子任务分派给子 Agent 执行，每个子 Agent 有独立上下文与文件所有权。

| 子 Agent | 消息数 | 用户轮次 | 工具返回 | 分卷 | 开始时间 |
| --- | --- | --- | --- | --- | --- |
${subText}

合计 **${stats.subagentTotals.messages}** 条子 Agent 消息、**${stats.subagentTotals.toolResults}** 次工具返回。

## 说明

- 记录中的本机绝对路径已替换为 \`<WORKSPACE>\` / \`<MINIMAX_DATA_DIR>\` / \`<HOME>\` 占位符。
- 工具输出与思考过程放在 \`<details>\` 折叠块内，点击即可展开原文。
- 重新生成：\`node scripts/export-ai-session.mjs\`
`;

  writeFileSync(join(OUT_DIR, 'README.md'), readme);

  // --- 分卷索引页 ---
  const indexLines = [
    '# 会话记录索引',
    '',
    `全部 ${mainStats.messages} 条主会话消息与 ${stats.subagentTotals.messages} 条子 Agent 消息。`,
    '',
    '## 主会话',
    '',
    ...mainVolumes.map((v, i) => `- [${v.file}](${v.file}) — ${(v.bytes / 1024).toFixed(0)} KB`),
    '',
    '## 子 Agent',
    '',
  ];
  for (const s of subIndex) {
    indexLines.push(`### ${s.title}`, '');
    indexLines.push(`${s.messages} 条消息 · ${s.toolResults} 次工具返回 · ${s.startedAt || ''} → ${s.endedAt || ''}`, '');
    for (const f of s.files) indexLines.push(`- [${f.split('/').pop()}](${f})`);
    indexLines.push('');
  }
  writeFileSync(join(OUT_DIR, 'index.md'), indexLines.join('\n'));
  console.log(`输出目录: ${OUT_DIR}`);
}

main();
