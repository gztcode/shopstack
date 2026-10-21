# ShopStack 电商中台 · 运营后台（admin-react）

基于 React 18 + TypeScript + Vite 5 + Ant Design 5 的电商中台管理控制台。
接口契约严格对齐 `shopstack/proto/shopstack/**/v1/*.proto` 与 `shopstack/design-tokens/tokens.json`。

## 快速开始

```bash
npm install
npm run dev      # http://localhost:5174
npm run build    # 产出 dist/
npm run preview  # 本地预览构建产物
```

演示账号：`admin / admin123456`（种子数据见 `deploy/mysql/init/02-seed.sql`）。

## 后端联调

- 网关默认地址 `http://localhost:8080`，前缀 `/api/v1`。
- 开发环境通过 `vite.config.ts` 的 `/api` 代理转发到网关，浏览器侧同源请求，无跨域问题。
- 如需指向其它地址（例如独立部署的网关），设置环境变量：

  ```bash
  VITE_API_BASE_URL=http://localhost:8080/api/v1 npm run dev
  ```

- 统一响应信封 `{ code, message, data, trace_id }`，`code === 0` 视为成功，其余按 `message` 提示。
- 请求自动携带 `Authorization: Bearer <token>`；401 时用 `refresh_token` 刷新并重放一次。

## 演示数据模式（Mock 兜底）

后端并行开发中，若网关不可用或返回 401/5xx，`src/api/client.ts` 的 `withMock` 会自动回退到
`src/mock/` 内的内置数据（字段与 proto 完全一致），页面顶部展示「演示数据模式」提示条。
该模式下写操作只作用于内存数据，不会持久化；点击提示条上的「重试连接」可重新请求真实接口。

## 目录结构

```
src/
├── api/          # 按域拆分的接口层
│   ├── client.ts # axios 实例、拦截器、信封解包、401 刷新、Mock 兜底
│   ├── admin.ts  # 登录、用户、角色、权限、看板
│   ├── product.ts# 商品、分类、评价、轮播
│   ├── order.ts  # 订单、发货、退款
│   ├── payment.ts# 支付流水与汇总
│   ├── user.ts   # 用户资料
│   ├── marketing.ts # 优惠券、活动
│   ├── inventory.ts # 库存、流水、预警
│   ├── logistics.ts # 运费模板、发货单
│   └── notification.ts # 通知、短信、操作日志
├── components/   # PageContainer / StatCard / SearchForm / TableToolbar / StatusTag / EChart / DemoModeAlert
├── hooks/        # useApiQuery / useApiMutation / usePermission
├── layouts/      # 侧边菜单、顶栏（搜索 / 通知 / 用户菜单）
├── mock/         # 演示数据源
├── pages/        # 17 个页面
├── router/       # 路由与登录 / 权限守卫
├── store/        # zustand：登录态、Mock 状态
├── theme/        # 设计令牌 → AntD ThemeConfig
├── types/        # 与 proto 对齐的 TS 类型
└── utils/        # 金额/时间格式化、枚举中文映射、权限判定
```

## 路由与权限

| 路由 | 页面 | 所需权限码 |
| --- | --- | --- |
| `/login` | 登录 | 公开 |
| `/dashboard` | 数据看板 | `system:dashboard` |
| `/products` | 商品管理 | `product:view`（新增 `product:create` / 编辑 `product:update` / 删除 `product:delete`） |
| `/categories` | 分类管理 | `category:view`（编辑 `category:update`） |
| `/reviews` | 评价审核 | `review:audit` |
| `/orders` | 订单管理 | `order:view`（发货 `order:ship` / 备注 `order:update`） |
| `/refunds` | 退款审核 | `refund:audit` |
| `/payments` | 支付管理 | `payment:view` |
| `/users` | 用户管理 | `user:view`（启停 `user:update`） |
| `/inventory` | 库存管理 | `inventory:view`（调整 `inventory:adjust`） |
| `/coupons` | 优惠券 | `coupon:update` |
| `/promotions` | 活动管理 | `promotion:update` |
| `/banners` | 轮播管理 | `banner:update` |
| `/logistics` | 运费与发货 | `logistics:view` |
| `/system/roles` | 角色权限 | `system:role` |
| `/system/audit-logs` | 操作日志 | `system:audit` |
| `/system/sms` | 短信记录 | `system:audit` |

无权限的菜单项不渲染，直接访问路由会展示 403 页面。

## 说明

- 图表基于 `echarts` 核心库自封装 `EChart` 组件（当前 npm 源无法安装 `react-echarts`，仅提供 0.1.1 旧版本）。
- 金额单位统一为「分」，展示层通过 `formatYuan()` 换算为「元」。
- 枚举值在 JSON 中为字符串（如 `ORDER_STATUS_PAID`），`StatusTag` 依据前缀自动映射中文与配色。
