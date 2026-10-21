# 阶段 3 前端 worker 通用须知

以下 4 个 brief 共同引用本文件内容。派发时请把本文件路径告诉 worker：
`docs/page-expansion-plan.md`（页面清单，唯一来源）

## 共同背景

ShopStack 是中大型电商项目：Go 微服务后端（9 服务）+ Flutter 移动端 + 微信小程序 +
Vue3 Web 用户端 + React 后台管理端。本轮任务是把**每一端**从当前页面数扩到 **80 页**。

工作目录：`/Users/tom/.minimax/sessions/mvs_b9363bc959cf4444a9f3910b86b35e0d/workspace/shopstack`

## 页面清单来源

**必须先读 `docs/page-expansion-plan.md`**，里面有每一端需要新增的页面的完整清单
（编号、页面名、文件路径、数据来源接口）。严格按清单实现，不要自行增删页面。

## 目录所有权（互不重叠，禁止越界）

| Worker | 可写目录 | 禁止触碰 |
|---|---|---|
| Flutter | `apps/flutter/**` | 其他三个前端目录、backend/、proto/、gen/、docs/、scripts/、deploy/ |
| 小程序 | `apps/miniapp/**` | 同上 |
| Vue3 | `apps/web-vue/**` | 同上 |
| React | `apps/admin-react/**` | 同上 |

各 worker 之间**不得互相修改对方的目录**。后端目录 `backend/` 已被阶段 2 的 worker 修改，
前端 worker 一律不得改动。

## 硬性规则（违反即返工）

### 1. 禁止占位

- 禁止 TODO / FIXME / 「敬请期待」/「开发中」/「功能上线中」等占位文案
- 禁止空 `onClick` / `@click` 不带处理函数 / 点了没反应的死按钮
- 禁止「暂无数据」之外的无意义空状态（空状态必须有引导操作）
- 禁止复制粘贴同一个页面改标题充数（参数化页面必须共用组件，只有路径/标题/筛选参数不同）

### 2. Mock 兜底（必须）

后端可能还没就绪或部分接口未实现。前端必须有 Mock 兜底：
- 请求失败 / `code != 0` / 超时 → 回落到本地 Mock 数据
- 页面顶部显示「演示数据模式」提示（各端已有 `DemoBanner` / `DemoModeAlert` 等组件，沿用）
- Mock 数据的 JSON 结构必须与真实接口**完全一致**（snake_case 字段名）

各端 Mock 机制位置：
- Flutter：`lib/mock/`，API 层 `lib/api/*.dart`
- 小程序：`utils/mock.js`（内存态，写操作会真实改变状态），`utils/request.js` 里已有兜底逻辑
- Vue3：`src/api/client.ts` 里有 Mock 分支，各 `src/api/*.ts` 提供数据
- React：`src/mock/`（`data.ts` + `index.ts`），`src/store/mock` 控制开关

### 3. 金额

后端返回**分**（int64）。展示时必须用各端已有的 `formatYuan(cents)`（Vue3/小程序）
或 `PriceText` 组件（Vue3）/ 等价工具（Flutter `lib/utils/`、React `src/utils/`）。
禁止直接展示 `12345` 这种数字。

### 4. 接口调用规范

- 分页 query 用**点号嵌套**：`?page.page=1&page.page_size=20`
- 响应信封：`{ code, message, data, trace_id }`，`code === 0` 为成功
- JSON 字段名 **snake_case**（与 proto 一致）
- 64 位整数是 JSON **数字**

### 5. 端口提示（重要，别误判）

本机 **8080 端口被无关进程占用**（进程名 `books-api`，不是本项目）。
本地连后端请用 **8090**：
```bash
VITE_GATEWAY_URL=http://127.0.0.1:8090     # Vue3
VITE_API_BASE_URL=http://127.0.0.1:8090    # React
```
如果你连 8090 看到「登录被拦截 / 401」，先确认后端是否在跑：
```bash
curl -s http://127.0.0.1:8090/healthz
```
返回 `{"status":"ok"}` 说明后端正常。**不要因此去改后端代码**。

### 6. 设计令牌

设计令牌在 `design-tokens/generated/`，各端已有对应的样式文件（CSS 变量 / TS 常量 /
Dart 常量 / WXSS 变量）。新增页面必须用已有令牌，**不要硬编码颜色和间距**。

### 7. 视觉与响应式

- 移动端（Flutter / 小程序）：375px 宽下无横向滚动、无元素重叠
- Web（Vue3 / React）：1440px 宽下布局正常；后台表格在窄屏下可横向滚动
- 沿用各端现有的卡片、列表、表格、空状态、加载态组件

### 8. 交付自检（必须在最终回复里给出实际输出）

每个 worker 交付时必须报告：
1. 新增了哪些页面（逐个列出）
2. 新建/修改了哪些文件（路径列表）
3. 自检命令的**实际输出**（不是"应该没问题"）
4. 页面数统计结果（用什么命令数的）
5. 诚实说明没做完或有疑问的部分

**禁止虚报**。如果某个页面没做完或某个命令失败了，如实说。

## 验收命令速查

```bash
# Flutter
cd apps/flutter && flutter analyze          # 必须 0 error 0 warning
cd apps/flutter && flutter test             # 必须全绿
ls lib/pages/*/*_page.dart | wc -l          # == 80

# 小程序
node scripts/validate-miniapp.mjs           # 若项目内无此脚本则自写校验
# 校验 app.json pages[] + subPackages[].pages[] 合计 == 80
# 每页 .js/.json/.wxml/.wxss 四件套齐全且 JSON 可解析
# 所有 bindtap/catchtap 绑定的事件都有对应处理函数

# Vue3
cd apps/web-vue && npm run build            # 必须成功
# views 数 == routes 数 == 80

# React
cd apps/admin-react && npm run build        # 必须成功
# pages 数（含 system/）== routes 数 == 80
```
