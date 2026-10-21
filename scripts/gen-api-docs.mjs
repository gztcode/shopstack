/**
 * 从 proto 契约生成 docs/api.md。
 *
 * 用法：node scripts/gen-api-docs.mjs
 *
 * 直接读 proto/shopstack/<pkg>/v1/*.proto，抽取每个 rpc 的
 * google.api.http 注解、请求/响应消息名，按服务分组输出 Markdown。
 * 这样 API 文档永远和契约一致，不会手写漂移。
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const protoRoot = join(root, 'proto', 'shopstack')

/** 收集所有 proto 文件 */
function collectProtos(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...collectProtos(full))
    else if (entry.endsWith('.proto')) out.push(full)
  }
  return out
}

/** 去掉行注释，方便解析 */
function stripComments(text) {
  return text.replace(/\/\/.*$/gm, '')
}

/** 解析单个 proto 文件 */
function parseProto(file) {
  const raw = stripComments(readFileSync(file, 'utf8'))
  const pkg = (raw.match(/^package\s+([\w.]+);/m) || [, ''])[1]

  // 收集消息定义：名 -> 字段列表
  const messages = new Map()
  const msgRe = /message\s+(\w+)\s*\{([\s\S]*?)\n\}/g
  let m
  while ((m = msgRe.exec(raw)) !== null) {
    const fields = []
    const fieldRe = /^\s*(repeated\s+|optional\s+)?([\w.]+)\s+(\w+)\s*=\s*(\d+)\s*;/gm
    let f
    while ((f = fieldRe.exec(m[2])) !== null) {
      fields.push({ label: (f[1] || '').trim(), type: f[2], name: f[3], num: Number(f[4]) })
    }
    messages.set(m[1], fields)
  }

  // 收集 service 与 rpc
  const services = []
  const svcRe = /service\s+(\w+)\s*\{([\s\S]*?)\n\}/g
  while ((m = svcRe.exec(raw)) !== null) {
    const svcName = m[1]
    const rpcs = []
    const rpcRe = /rpc\s+(\w+)\s*\(\s*([\w.]+)\s*\)\s*returns\s*\(\s*([\w.]+)\s*\)\s*\{([\s\S]*?)\}/g
    let r
    while ((r = rpcRe.exec(m[2])) !== null) {
      const [, rpcName, reqType, resType, body] = r
      const http = {}
      const verbRe = /(get|post|put|delete|patch):\s*"([^"]+)"/g
      let v
      while ((v = verbRe.exec(body)) !== null) http[v[1]] = v[2]
      const bm = body.match(/body:\s*"([^"]+)"/)
      rpcs.push({
        name: rpcName,
        req: reqType.split('.').pop(),
        res: resType.split('.').pop(),
        http,
        body: bm ? bm[1] : '',
        comment: '',
      })
    }
    services.push({ name: svcName, rpcs })
  }

  return { file, pkg, messages, services }
}

/** 提取 rpc 上方的注释（还原时用原文重新抽） */
function attachComments(file) {
  const lines = readFileSync(file, 'utf8').split('\n')
  return lines
}

const protos = collectProtos(protoRoot)
const parsed = protos.map(parseProto)

// 服务名 -> 中文说明
const SERVICE_DESC = {
  UserService: ['用户域', '注册登录、资料地址、收藏、积分、发票，以及后台用户/角色/权限/看板'],
  AdminService: ['后台用户域', '管理员登录、用户列表与状态、角色权限、系统看板、发票审核'],
  ProductService: ['商品域', '商品 SPU/SKU、上下架、轮播、素材库'],
  CategoryService: ['分类域', '商品分类树的增删改查'],
  ReviewService: ['评价域', '商品评价列表、发表与后台审核'],
  CartService: ['购物车域', '加购、改量、选中、删除、清空、角标计数'],
  OrderService: ['订单域', '下单、查询、状态流转、退款申请与审核、订单轨迹、后台统计'],
  PaymentService: ['支付域', '支付单创建、查询、回调、退款、后台列表与汇总'],
  InventoryService: ['库存域', '库存查询、预占/释放/扣减/调整、流水、低库存预警'],
  MarketingService: ['营销域', '优惠券领取核销、活动管理、结算试算'],
  LogisticsService: ['物流域', '发货单、轨迹、运费模板'],
  NotificationService: ['通知域', '站内通知、短信验证码、审计日志、系统配置'],
}

const ENUM_DOC = `
## 通用约定

### 响应信封

所有接口返回统一信封，\`code === 0\` 表示成功：

\`\`\`json
{
  "code": 0,
  "message": "ok",
  "data": { },
  "trace_id": "a1b2c3d4"
}
\`\`\`

失败时 \`code !== 0\`，\`data\` 为 \`null\`，\`message\` 是可直接展示给用户的中文提示。

| 错误码 | 含义 |
| --- | --- |
| 1000 | 服务器内部错误 |
| 1001 | 参数不合法 |
| 1002 | 资源不存在 |
| 1003 | 未登录或令牌失效 |
| 1004 | 没有权限 |
| 1005 | 状态冲突（如重复提交） |
| 1006 | 请求过于频繁（限流） |
| 1007 | 下游服务暂不可用 |

### 字段与单位

- JSON 字段名一律 **snake_case**，与 \`.proto\` 契约完全一致。
- 64 位整数（\`id\`、\`*_cents\`、\`*_id\`）在 JSON 中是**数字**，不是字符串。
- 所有金额字段单位是**分**（int64），前端展示时除以 100。
- 时间字段是 RFC3339 字符串（UTC）。

### 鉴权

\`\`\`
Authorization: Bearer <access_token>
\`\`\`

无需鉴权的路径：\`/api/v1/auth/*\`、\`/api/v1/admin/auth/login\`、\`/healthz\`、\`/readyz\`。

### 分页

请求参数用点号嵌套形式：

\`\`\`
GET /api/v1/products?page.page=1&page.page_size=20
\`\`\`

响应里的 \`meta\`：

\`\`\`json
{ "page": 1, "page_size": 20, "total": 123, "total_pages": 7 }
\`\`\`

### 状态枚举

| 枚举 | 取值 |
| --- | --- |
| 订单状态 | \`ORDER_STATUS_PENDING_PAYMENT\` / \`PAID\` / \`SHIPPED\` / \`COMPLETED\` / \`CANCELLED\` / \`REFUNDING\` / \`REFUNDED\` / \`CLOSED\` |
| 支付状态 | \`PAYMENT_STATUS_PENDING\` / \`SUCCESS\` / \`FAILED\` / \`CLOSED\` |
| 商品状态 | \`PRODUCT_STATUS_ON_SHELF\` / \`OFF_SHELF\` |
| 用户券状态 | \`USER_COUPON_STATUS_UNUSED\` / \`USED\` / \`EXPIRED\` |
| 发票状态 | \`0\` 待开票 / \`1\` 已开票 / \`2\` 已驳回 |

### 演示账号

| 账号 | 密码 | 说明 |
| --- | --- | --- |
| \`demo\` | \`demo123456\` | 普通用户，积分 1200 |
| \`admin\` | \`admin123456\` | 超级管理员，25 个权限码 |

### 常见校验规则

| 场景 | 规则 | 违反时的错误 |
| --- | --- | --- |
| 申请退款 | \`amount_cents\` 必须 \`> 0\` 且 \`<= payable_cents - refunded_cents\` | 1001 退款金额不合法 |
| 申请退款 | \`reason\` 必填 | 1001 请选择退款原因 |
| 领取优惠券 | 同一张券每人限领一次，重复领取被拒 | 1005 您已领取过该优惠券 |
| 领取优惠券 | 券需已启用、未过期、未领完 | 8000 券不可用 / 已过期 |
| 结算试算 | \`items\` 不能为空，\`price_cents * quantity\` 总额必须 > 0 | 1001 结算商品不能为空 |
| 积分抵扣 | 抵扣金额不超过商品总额的 50% | 1001 |
| 收货地址 | 最多保存 20 条，其中一条为默认地址 | 1001 |
| 用户名 | 3-20 位字母/数字/下划线 | 1001 |
| 密码 | 至少 6 位 | 1001 |

### 身份传递

网关校验 JWT 后，把身份通过 gRPC metadata 透传给下游服务：

| metadata | 含义 |
| --- | --- |
| \`x-user-id\` | 当前登录用户 ID |
| \`x-username\` | 当前登录用户名 |
| \`x-subject\` | 主体（user / admin） |
| \`x-permissions\` | 权限码，逗号分隔 |

因此 \`user_id\` / \`admin_id\` 这类字段**在请求体里不需要传**，服务端会从登录身份推导（管理员接口则取全部）。个别以 \`user_id\` 为筛选条件的列表接口（如 \`GET /api/v1/admin/users\`）才需要显式传。
`

const out = []
out.push('# ShopStack API 参考')
out.push('')
out.push('> 本文件由 `scripts/gen-api-docs.mjs` 从 `proto/shopstack/*/v1/*.proto` 自动生成，请勿手工编辑。')
out.push('')
out.push(ENUM_DOC.trim())
out.push('')
out.push('---')
out.push('')
out.push('## 接口总览')
out.push('')
out.push('| 服务 | 模块 | 端口 | 接口数 | 说明 |')
out.push('| --- | --- | --- | --- | --- |')
const portMap = {
  UserService: 9001, AdminService: 9001, ProductService: 9002, CategoryService: 9002,
  ReviewService: 9002, CartService: 9003, OrderService: 9004, PaymentService: 9005,
  InventoryService: 9006, MarketingService: 9007, LogisticsService: 9008, NotificationService: 9009,
}
for (const p of parsed) {
  for (const svc of p.services) {
    const [mod, desc] = SERVICE_DESC[svc.name] || [svc.name, '']
    out.push(`| ${svc.name} | ${mod} | ${portMap[svc.name] || '-'} | ${svc.rpcs.length} | ${desc} |`)
  }
}
out.push('')
out.push('全部接口经 API 网关暴露，基址 `http://localhost:8080/api/v1`。')
out.push('')

for (const p of parsed) {
  for (const svc of p.services) {
    const [mod, desc] = SERVICE_DESC[svc.name] || [svc.name, '']
    out.push(`## ${svc.name}（${mod}）`)
    out.push('')
    out.push(desc)
    out.push('')
    out.push('| 方法 | 路径 | RPC | 请求体 | 响应 |')
    out.push('| --- | --- | --- | --- | --- |')
    for (const r of svc.rpcs) {
      for (const verb of ['get', 'post', 'put', 'delete', 'patch']) {
        const path = r.http[verb]
        if (!path) continue
        const method = verb.toUpperCase()
        const bodyCell = r.body ? `\`${r.body}\`` : '—'
        out.push(`| ${method} | \`${path}\` | \`${r.name}\` | ${bodyCell} | \`${r.res}\` |`)
      }
    }
    out.push('')
  }
}

out.push('---')
out.push('')
out.push('## 消息定义')
out.push('')
out.push('完整消息定义见 `proto/shopstack/<pkg>/v1/<pkg>.proto`，下列为主要消息的字段一览。')
out.push('')

for (const p of parsed) {
  out.push(`### ${p.pkg.split('.').slice(-2).join('.')}`)
  out.push('')
  for (const [name, fields] of p.messages) {
    if (!fields.length) continue
    out.push(`#### \`${name}\``)
    out.push('')
    out.push('| 字段 | 类型 | 说明 |')
    out.push('| --- | --- | --- |')
    for (const f of fields) {
      const label = f.label === 'repeated' ? 'repeated ' : ''
      out.push(`| \`${f.name}\` | ${label}\`${f.type}\` | #${f.num} |`)
    }
    out.push('')
  }
}

writeFileSync(join(root, 'docs', 'api.md'), out.join('\n') + '\n', 'utf8')
console.log(`已生成 docs/api.md（${out.length} 行）`)
