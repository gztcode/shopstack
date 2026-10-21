# ShopStack 用户端前台（web-vue）

面向消费者的 Web 商城前端，基于 **Vite + Vue 3 + TypeScript + Pinia + Vue Router + Axios**，
对接 ShopStack 电商中台网关（`/api/v1`）。

## 快速开始

```bash
npm install
npm run dev      # 开发服务器，默认 http://localhost:5173
npm run build    # 生产构建，产物在 dist/
npm run preview  # 预览构建产物
```

开发环境通过 Vite 代理把 `/api` 转发到 `http://localhost:8080`（可用 `VITE_GATEWAY_URL` 覆盖），
避免浏览器跨域限制。例如本机项目网关跑在 8090 时：

```bash
VITE_GATEWAY_URL=http://127.0.0.1:8090 npm run dev
```

## 目录结构

```
src/
├── api/          # 接口层（按业务域拆分，统一走 client.ts）
│   ├── client.ts # Axios 实例：信封拆解、令牌注入、401 刷新、Mock 兜底
│   └── auth / product / cart / order / payment / marketing / logistics / user / notification
├── components/   # 通用组件（ProductCard / PriceText / QuantityStepper / AppHeader …）
├── composables/  # 组合式逻辑（useAddToCart）
├── mock/         # 内置演示数据，字段结构与 proto 完全一致
├── router/       # 路由表与登录守卫
├── stores/       # Pinia：auth / cart / user / app
├── types/        # 与 proto 对齐的 TS 类型定义
├── utils/        # format（金额时间）/ enums（枚举中文）/ auth（令牌存取）/ image
└── views/        # 页面
```

## 约定

- **金额单位为「分」**，展示时用 `formatYuan()` 转成 `¥1,299.00`。
- **响应信封**为 `{ code, message, data, trace_id }`，`code === 0` 视为成功。
- **枚举字段为字符串**（如 `ORDER_STATUS_PAID`），用 `utils/enums.ts` 转中文文案。
- **时间字段为 RFC3339 字符串**，用 `utils/format.ts` 格式化。
- **演示数据模式**：后端未启动或接口不可用时，接口层自动回退到 `src/mock/` 的内置数据，
  页面顶部会显示醒目的提示条，功能仍可完整走通。

## 页面

| 路由 | 说明 |
| --- | --- |
| `/` | 首页：搜索、分类导航、轮播、限时秒杀、促销与热销推荐 |
| `/category/:id?` | 分类页：左侧分类导航 + 排序 / 价格区间 / 有货筛选 |
| `/product/:id` | 商品详情：图集、SKU 规格、参数、评价、相关推荐、底部操作栏 |
| `/cart` | 购物车：分类分组、步进器、失效商品、底部结算栏 |
| `/checkout` | 结算确认：地址、清单、优惠券试算、金额明细、提交订单 |
| `/payment/:orderId` | 收银台：支付方式、支付参数、模拟支付与结果 |
| `/order` `/order/:id` | 订单列表（状态 Tab）与订单详情（时间线、物流、售后操作） |
| `/user` 及子路由 | 个人中心、地址管理、我的收藏、我的优惠券、消息通知 |
| `/login` | 登录 / 注册 / 微信登录 |
| `/search?q=` | 搜索结果页 |

### 新增页面（16 → 30）

| 路由 | 页面名 | 主要接口 |
| --- | --- | --- |
| `/points` | 积分中心 | `GET /api/v1/users/points-logs` |
| `/invoices` | 发票管理 | `GET / POST /api/v1/users/invoices` |
| `/logistics` | 物流跟踪 | `GET /api/v1/logistics/tracks`、`GET /api/v1/logistics/order/{id}` |
| `/coupon-center` | 领券中心 | `GET /api/v1/coupons`、`POST /api/v1/coupons/{id}/receive` |
| `/reviews` | 我的评价 | `GET /api/v1/reviews`、`POST /api/v1/reviews` |
| `/refund` | 售后申请 | `GET /api/v1/orders`、`POST /api/v1/orders/{id}/refund` |
| `/pay-result` | 支付结果 | `GET /api/v1/payments/query` |
| `/flash-sale` | 限时秒杀 | `GET /api/v1/promotions`、`GET /api/v1/products` |
| `/group-buy` | 拼团专区 | `GET /api/v1/promotions`、`GET /api/v1/products` |
| `/member` | 会员中心 | `GET /api/v1/users/me`、`/users/points-logs`、`/users/coupons` |
| `/history` | 浏览足迹 | 本地存储（localStorage） |
| `/compare` | 商品对比 | 本地存储 + `GET /api/v1/products/{id}` |
| `/categories` | 全部分类 | `GET /api/v1/categories`、`GET /api/v1/products` |
| `/order-trace` | 订单轨迹 | `GET /api/v1/orders/{id}/logs` |

> 注意：`/coupons`（我的优惠券，走 `/api/v1/users/coupons`）与 `/coupon-center`
> （领券中心，走 `/api/v1/coupons`）是两个不同的页面。
