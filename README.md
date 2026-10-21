# ShopStack 电商中台

一套可运行的中大型电商全栈系统：**9 个 Go 微服务 + API 网关 + 4 个前端端**，覆盖从浏览、加购、下单、支付、发货到退款的完整业务闭环。

| 端 | 技术栈 | 目录 | 页面数 |
| --- | --- | --- | --- |
| 移动端 App | Flutter 3 + Riverpod + go_router + dio | `apps/flutter` | 80 |
| 微信小程序 | 原生小程序（WXML/WXSS/JS） | `apps/miniapp` | 80（主包 26 + 3 分包 54） |
| Web 用户端 | Vue 3 + TypeScript + Pinia + Vue Router + Axios | `apps/web-vue` | 80 |
| Web 后台管理 | React 18 + TypeScript + Ant Design 5 + Vite | `apps/admin-react` | 82 |
| 后端 | Go 1.25 + gRPC + Protobuf + GORM + MySQL + Redis + RabbitMQ | `backend` | 9 服务 / 203 接口 |

**合计 322 个页面**（4 个前端端各 80～82 页），全部可交互、无占位实现、后端未就绪时有 Mock 兜底。

页面清单由 `node scripts/gen-page-list.mjs --write` 自动生成。

---

## 目录

- [页面截图](#页面截图)
- [架构概览](#架构概览)
- [快速启动](#快速启动)
- [演示账号](#演示账号)
- [页面清单](#页面清单)
- [目录结构](#目录结构)
- [关键约定](#关键约定)
- [验证与测试](#验证与测试)
- [第三方服务降级策略](#第三方服务降级策略)
- [文档索引](#文档索引)

---

## 页面截图

四端全部页面都在**真实后端**（9 个微服务 + API 网关）下实机跑通并逐页截图，共 **320 张单页截图 + 13 张总览册**。截图不是设计稿，是运行时截屏——巡检结果 **0 渲染失败、0 页面异常、0 控制台报错**。

| 端 | 截图数 | 巡检结果 | 截图环境 |
| --- | --- | --- | --- |
| Flutter 移动端 | 80 张 | 0 异常 | iOS 模拟器（`flutter drive` 集成测试） |
| 微信小程序 | 80 张 | 80/80 ok，0 控制台报错 | 微信开发者工具（automator 自动化） |
| Vue3 Web 用户端 | 79 张 | 79/79 ok，0 控制台报错 | Chromium（Playwright） |
| React 后台管理 | 81 张 | 81/81 ok，0 控制台报错 | Chromium（Playwright） |

> 页面清单口径为 322 个路由，自动巡检实际渲染 320 个页面，差额为个别未纳入巡检的中间态路由。

### 截图总览册

<img src="docs/screenshots/_sheets/_cover.png" width="900" alt="ShopStack 四端页面截图总览封面">

### Flutter 移动端（80 页）

<img src="docs/screenshots/_sheets/flutter-1.png" width="900" alt="Flutter 移动端截图总览册 1">
<img src="docs/screenshots/_sheets/flutter-2.png" width="900" alt="Flutter 移动端截图总览册 2">

<table>
  <tr>
    <td align="center"><img src="docs/screenshots/flutter/03-home.png" width="230"><br><sub>首页</sub></td>
    <td align="center"><img src="docs/screenshots/flutter/08-product-7.png" width="230"><br><sub>商品详情</sub></td>
    <td align="center"><img src="docs/screenshots/flutter/05-cart.png" width="230"><br><sub>购物车</sub></td>
    <td align="center"><img src="docs/screenshots/flutter/12-order-1.png" width="230"><br><sub>订单详情</sub></td>
  </tr>
</table>

### 微信小程序（80 页）

<img src="docs/screenshots/_sheets/miniapp-1.png" width="900" alt="微信小程序截图总览册 1">
<img src="docs/screenshots/_sheets/miniapp-2.png" width="900" alt="微信小程序截图总览册 2">

<table>
  <tr>
    <td align="center"><img src="docs/screenshots/miniapp/01-pages-index-index.png" width="230"><br><sub>首页</sub></td>
    <td align="center"><img src="docs/screenshots/miniapp/11-pages-detail-detail.png" width="230"><br><sub>商品详情</sub></td>
    <td align="center"><img src="docs/screenshots/miniapp/12-pages-cart-cart.png" width="230"><br><sub>购物车</sub></td>
    <td align="center"><img src="docs/screenshots/miniapp/68-subpkg-order-order-confirm-order-confirm.png" width="230"><br><sub>确认订单</sub></td>
  </tr>
</table>

### Vue3 Web 用户端（79 页）

<img src="docs/screenshots/_sheets/vue3-1.png" width="900" alt="Vue3 用户端截图总览册 1">
<img src="docs/screenshots/_sheets/vue3-2.png" width="900" alt="Vue3 用户端截图总览册 2">
<img src="docs/screenshots/_sheets/vue3-3.png" width="900" alt="Vue3 用户端截图总览册 3">
<img src="docs/screenshots/_sheets/vue3-4.png" width="900" alt="Vue3 用户端截图总览册 4">

<table>
  <tr>
    <td align="center"><img src="docs/screenshots/vue3/01-home.png" width="230"><br><sub>首页</sub></td>
    <td align="center"><img src="docs/screenshots/vue3/03-product-7.png" width="230"><br><sub>商品详情</sub></td>
    <td align="center"><img src="docs/screenshots/vue3/05-cart.png" width="230"><br><sub>购物车</sub></td>
    <td align="center"><img src="docs/screenshots/vue3/09-order-1.png" width="230"><br><sub>订单详情</sub></td>
  </tr>
</table>

### React 后台管理（81 页）

<img src="docs/screenshots/_sheets/react-1.png" width="900" alt="React 后台管理截图总览册 1">
<img src="docs/screenshots/_sheets/react-2.png" width="900" alt="React 后台管理截图总览册 2">
<img src="docs/screenshots/_sheets/react-3.png" width="900" alt="React 后台管理截图总览册 3">
<img src="docs/screenshots/_sheets/react-4.png" width="900" alt="React 后台管理截图总览册 4">

<table>
  <tr>
    <td align="center"><img src="docs/screenshots/react/03-dashboard.png" width="230"><br><sub>数据看板</sub></td>
    <td align="center"><img src="docs/screenshots/react/04-products.png" width="230"><br><sub>商品管理</sub></td>
    <td align="center"><img src="docs/screenshots/react/07-orders.png" width="230"><br><sub>订单管理</sub></td>
    <td align="center"><img src="docs/screenshots/react/45-orders-stats-channel.png" width="230"><br><sub>订单统计</sub></td>
  </tr>
</table>

### 全量截图

320 张单页截图按端分目录存放，附一个可直接打开的缩略图浏览页和逐页巡检报告：

```text
docs/screenshots/
├── index.html      # 320 缩略图网格浏览页（点击缩略图看原图）
├── _sheets/        # 13 张总览册（含 _cover.png 封面）
├── _reports/       # 3 份自动巡检报告（JSON：逐页状态 + 控制台报错）
├── flutter/        # 80 张
├── miniapp/        # 80 张
├── react/          # 81 张
└── vue3/           # 79 张
```

克隆后用浏览器打开浏览页即可翻阅全部截图：

```bash
open docs/screenshots/index.html
```

---

## 架构概览

```
                        ┌──────────────────────┐
   Flutter / 小程序 /    │   API 网关 :8080     │
   Vue3 / React  ───────▶│  JWT 鉴权 · 限流     │
                        │  信封包装 · REST/JSON │
                        └──────────┬───────────┘
                                   │ gRPC (Protobuf)
        ┌──────────┬──────────┬───┴────┬──────────┬──────────┐
        ▼          ▼          ▼        ▼          ▼          ▼
     user(9001) product(9002) cart(9003) order(9004) payment(9005)
     积分/发票   分类/素材   购物车    订单/退款   支付单
                                        │
     inventory(9006) marketing(9007) logistics(9008) notification(9009)
     三段式库存    券/活动      发货/轨迹     站内信/短信/审计
        │              │            │             │
        └──────────────┴───── RabbitMQ 事件总线 ────┘

              MySQL 8 · Redis 7 · RabbitMQ 3.13 · Nacos 2.3（可选）
```

- **对外只有网关一个入口**。所有前端只调 REST/JSON；服务之间用 gRPC + Protobuf 通信。
- **契约单一来源**：`proto/shopstack/<pkg>/v1/*.proto`，用 buf 生成 Go 代码与 grpc-gateway 路由，网关的 HTTP 路径直接来自 proto 注解，不会与契约漂移。
- **事件驱动**：订单创建/支付/取消等状态变化通过 RabbitMQ topic 交换机广播，库存扣减、券核销、发货异常、站内通知都是 MQ 消费者。

---

## 快速启动

### 方式一：Docker Compose（推荐，一键编排）

```bash
# 启动中间件（MySQL / Redis / RabbitMQ / Nacos）
docker compose -f deploy/docker-compose.yml up -d mysql redis rabbitmq nacos

# 启动全部后端服务 + 网关（首次会构建镜像）
docker compose -f deploy/docker-compose.yml up -d --build

# 查看状态
docker compose -f deploy/docker-compose.yml ps

# 健康检查
curl http://127.0.0.1:8080/healthz
curl http://127.0.0.1:8080/readyz      # 会列出 9 个服务的连接状态
```

MySQL 首次启动会自动执行 `deploy/mysql/init/` 下的 `01-schema.sql`（37 张表）与 `02-seed.sql`（种子数据）。

### 方式二：本地开发（不依赖 Docker 跑业务服务）

需要本机已有 MySQL / Redis / RabbitMQ：

```bash
# 1. 起中间件（用 Docker 只起中间件即可）
docker run -d --name shopstack-mysql -e MYSQL_ROOT_PASSWORD=root123456 \
  -e MYSQL_DATABASE=shopstack -e MYSQL_USER=shopstack -e MYSQL_PASSWORD=shopstack \
  -p 3306:3306 -v "$PWD/deploy/mysql/init:/docker-entrypoint-initdb.d:ro" \
  mysql:8.0 --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci

docker run -d --name shopstack-redis -p 6379:6379 redis:7-alpine
docker run -d --name shopstack-rabbit -p 5672:5672 -p 15672:15672 \
  -e RABBITMQ_DEFAULT_USER=shopstack -e RABBITMQ_DEFAULT_PASS=shopstack \
  rabbitmq:3.13-management-alpine

# 2. 起全部后端服务 + 网关
./scripts/dev-up.sh

# 3. 停止
./scripts/dev-down.sh
```

`dev-up.sh` 会把二进制编译到 `/tmp/shopstack-bin/`，日志写到 `/tmp/shopstack-logs/`。

> **端口提示**：项目默认网关端口是 **8080**。如果本机 8080 已被其它进程占用，用 `SHOP_HTTP_ADDR=":8090"` 覆盖，前端侧用 `VITE_API_BASE_URL` / `VITE_GATEWAY_URL` 指向实际地址即可。

### 启动前端

```bash
# Web 用户端
cd apps/web-vue && npm install && npm run dev

# Web 后台管理
cd apps/admin-react && npm install && npm run dev

# 微信小程序
# 用微信开发者工具打开 apps/miniapp 目录，AppID 填自己的

# Flutter
cd apps/flutter && flutter pub get && flutter run
```

前端默认通过 Vite 代理把 `/api` 转发到 `http://localhost:8080`，避免跨域。

---

## 演示账号

| 账号 | 密码 | 角色 | 说明 |
| --- | --- | --- | --- |
| `demo` | `demo123456` | 普通用户 | 积分 1200，有地址/收藏/优惠券 |
| `admin` | `admin123456` | 超级管理员 | 25 个权限码，可进后台管理 |
| `service` | `demo123456` | 客服专员 | 权限受限，用于验证菜单/路由权限拦截 |

**后端未就绪时前端不会白屏**：接口层内置 Mock 数据，页面顶部显示「演示数据模式」提示条，所有页面照常可用。

---

<!-- PAGE_LIST_START -->

## 页面清单

> 本章节由 `node scripts/gen-page-list.mjs --write` 自动生成，请勿手工编辑。

四端**各自** 80 / 80 / 80 / 82 页，合计 **322 个页面**。

### 微信小程序（80 页）

| 页面 | 目录 |
| --- | --- |
| address-edit | `apps/miniapp/pages/address-edit/address-edit` |
| address | `apps/miniapp/pages/address/address` |
| cart | `apps/miniapp/pages/cart/cart` |
| category | `apps/miniapp/pages/category/category` |
| checkout | `apps/miniapp/pages/checkout/checkout` |
| coupon-center | `apps/miniapp/pages/coupon-center/coupon-center` |
| coupons | `apps/miniapp/pages/coupons/coupons` |
| detail | `apps/miniapp/pages/detail/detail` |
| favorites | `apps/miniapp/pages/favorites/favorites` |
| history | `apps/miniapp/pages/history/history` |
| index | `apps/miniapp/pages/index/index` |
| invoices | `apps/miniapp/pages/invoices/invoices` |
| login | `apps/miniapp/pages/login/login` |
| logistics | `apps/miniapp/pages/logistics/logistics` |
| notifications | `apps/miniapp/pages/notifications/notifications` |
| order-all | `apps/miniapp/pages/order-all/order-all` |
| order-detail | `apps/miniapp/pages/order-detail/order-detail` |
| order | `apps/miniapp/pages/order/order` |
| pay-result | `apps/miniapp/pages/pay-result/pay-result` |
| pay | `apps/miniapp/pages/pay/pay` |
| points | `apps/miniapp/pages/points/points` |
| profile | `apps/miniapp/pages/profile/profile` |
| refund | `apps/miniapp/pages/refund/refund` |
| reviews | `apps/miniapp/pages/reviews/reviews` |
| search | `apps/miniapp/pages/search/search` |
| sign-in | `apps/miniapp/pages/sign-in/sign-in` |
| after-sale-apply （subpkg-order 分包） | `apps/miniapp/subpkg-order/after-sale-apply/after-sale-apply` |
| after-sale-detail （subpkg-order 分包） | `apps/miniapp/subpkg-order/after-sale-detail/after-sale-detail` |
| after-sale-list （subpkg-order 分包） | `apps/miniapp/subpkg-order/after-sale-list/after-sale-list` |
| group-buy-detail （subpkg-order 分包） | `apps/miniapp/subpkg-order/group-buy-detail/group-buy-detail` |
| group-buy-join （subpkg-order 分包） | `apps/miniapp/subpkg-order/group-buy-join/group-buy-join` |
| group-buy-list （subpkg-order 分包） | `apps/miniapp/subpkg-order/group-buy-list/group-buy-list` |
| logistics-trace （subpkg-order 分包） | `apps/miniapp/subpkg-order/logistics-trace/logistics-trace` |
| logistics-track （subpkg-order 分包） | `apps/miniapp/subpkg-order/logistics-track/logistics-track` |
| my-group-buy （subpkg-order 分包） | `apps/miniapp/subpkg-order/my-group-buy/my-group-buy` |
| order-cancel （subpkg-order 分包） | `apps/miniapp/subpkg-order/order-cancel/order-cancel` |
| order-confirm （subpkg-order 分包） | `apps/miniapp/subpkg-order/order-confirm/order-confirm` |
| order-done （subpkg-order 分包） | `apps/miniapp/subpkg-order/order-done/order-done` |
| order-pay （subpkg-order 分包） | `apps/miniapp/subpkg-order/order-pay/order-pay` |
| order-receive （subpkg-order 分包） | `apps/miniapp/subpkg-order/order-receive/order-receive` |
| order-refunding （subpkg-order 分包） | `apps/miniapp/subpkg-order/order-refunding/order-refunding` |
| order-ship （subpkg-order 分包） | `apps/miniapp/subpkg-order/order-ship/order-ship` |
| promotion-flash （subpkg-order 分包） | `apps/miniapp/subpkg-order/promotion-flash/promotion-flash` |
| promotion-list （subpkg-order 分包） | `apps/miniapp/subpkg-order/promotion-list/promotion-list` |
| promotion-presale （subpkg-order 分包） | `apps/miniapp/subpkg-order/promotion-presale/promotion-presale` |
| promotion-session （subpkg-order 分包） | `apps/miniapp/subpkg-order/promotion-session/promotion-session` |
| refund-reason （subpkg-order 分包） | `apps/miniapp/subpkg-order/refund-reason/refund-reason` |
| sign-in-calendar （subpkg-order 分包） | `apps/miniapp/subpkg-order/sign-in-calendar/sign-in-calendar` |
| task-center （subpkg-order 分包） | `apps/miniapp/subpkg-order/task-center/task-center` |
| task-detail （subpkg-order 分包） | `apps/miniapp/subpkg-order/task-detail/task-detail` |
| channel-clearance （subpkg-shop 分包） | `apps/miniapp/subpkg-shop/channel-clearance/channel-clearance` |
| channel-cross （subpkg-shop 分包） | `apps/miniapp/subpkg-shop/channel-cross/channel-cross` |
| channel-flash （subpkg-shop 分包） | `apps/miniapp/subpkg-shop/channel-flash/channel-flash` |
| channel-freeship （subpkg-shop 分包） | `apps/miniapp/subpkg-shop/channel-freeship/channel-freeship` |
| channel-fresh （subpkg-shop 分包） | `apps/miniapp/subpkg-shop/channel-fresh/channel-fresh` |
| channel-hot （subpkg-shop 分包） | `apps/miniapp/subpkg-shop/channel-hot/channel-hot` |
| channel-newest （subpkg-shop 分包） | `apps/miniapp/subpkg-shop/channel-newest/channel-newest` |
| channel-presale （subpkg-shop 分包） | `apps/miniapp/subpkg-shop/channel-presale/channel-presale` |
| channel-recommend （subpkg-shop 分包） | `apps/miniapp/subpkg-shop/channel-recommend/channel-recommend` |
| channels （subpkg-shop 分包） | `apps/miniapp/subpkg-shop/channels/channels` |
| my-reviews （subpkg-shop 分包） | `apps/miniapp/subpkg-shop/my-reviews/my-reviews` |
| product-params （subpkg-shop 分包） | `apps/miniapp/subpkg-shop/product-params/product-params` |
| product-questions （subpkg-shop 分包） | `apps/miniapp/subpkg-shop/product-questions/product-questions` |
| review-all （subpkg-shop 分包） | `apps/miniapp/subpkg-shop/review-all/review-all` |
| review-bad （subpkg-shop 分包） | `apps/miniapp/subpkg-shop/review-bad/review-bad` |
| review-good （subpkg-shop 分包） | `apps/miniapp/subpkg-shop/review-good/review-good` |
| review-image （subpkg-shop 分包） | `apps/miniapp/subpkg-shop/review-image/review-image` |
| review-medium （subpkg-shop 分包） | `apps/miniapp/subpkg-shop/review-medium/review-medium` |
| review-reply （subpkg-shop 分包） | `apps/miniapp/subpkg-shop/review-reply/review-reply` |
| review-tags （subpkg-shop 分包） | `apps/miniapp/subpkg-shop/review-tags/review-tags` |
| account-security （subpkg-user 分包） | `apps/miniapp/subpkg-user/account-security/account-security` |
| feedback （subpkg-user 分包） | `apps/miniapp/subpkg-user/feedback/feedback` |
| growth-logs （subpkg-user 分包） | `apps/miniapp/subpkg-user/growth-logs/growth-logs` |
| help-article （subpkg-user 分包） | `apps/miniapp/subpkg-user/help-article/help-article` |
| help-center （subpkg-user 分包） | `apps/miniapp/subpkg-user/help-center/help-center` |
| invoice-template （subpkg-user 分包） | `apps/miniapp/subpkg-user/invoice-template/invoice-template` |
| notification-setting （subpkg-user 分包） | `apps/miniapp/subpkg-user/notification-setting/notification-setting` |
| realname （subpkg-user 分包） | `apps/miniapp/subpkg-user/realname/realname` |
| region （subpkg-user 分包） | `apps/miniapp/subpkg-user/region/region` |
| user-level （subpkg-user 分包） | `apps/miniapp/subpkg-user/user-level/user-level` |

### Flutter 移动端（80 页）

| 页面 | 文件 |
| --- | --- |
| account_security | `apps/flutter/lib/pages/account_security/account_security_page.dart` |
| address_edit | `apps/flutter/lib/pages/address_edit/address_edit_page.dart` |
| address_list | `apps/flutter/lib/pages/address_list/address_list_page.dart` |
| after_sale_apply | `apps/flutter/lib/pages/after_sale_apply/after_sale_apply_page.dart` |
| after_sale_detail | `apps/flutter/lib/pages/after_sale_detail/after_sale_detail_page.dart` |
| after_sale_list | `apps/flutter/lib/pages/after_sale_list/after_sale_list_page.dart` |
| cart | `apps/flutter/lib/pages/cart/cart_page.dart` |
| category | `apps/flutter/lib/pages/category/category_page.dart` |
| channel_clearance | `apps/flutter/lib/pages/channel_clearance/channel_clearance_page.dart` |
| channel_cross | `apps/flutter/lib/pages/channel_cross/channel_cross_page.dart` |
| channel_flash | `apps/flutter/lib/pages/channel_flash/channel_flash_page.dart` |
| channel_freeship | `apps/flutter/lib/pages/channel_freeship/channel_freeship_page.dart` |
| channel_fresh | `apps/flutter/lib/pages/channel_fresh/channel_fresh_page.dart` |
| channel_hot | `apps/flutter/lib/pages/channel_hot/channel_hot_page.dart` |
| channel_list | `apps/flutter/lib/pages/channel_list/channel_list_page.dart` |
| channel_newest | `apps/flutter/lib/pages/channel_newest/channel_newest_page.dart` |
| channel_presale | `apps/flutter/lib/pages/channel_presale/channel_presale_page.dart` |
| channel_recommend | `apps/flutter/lib/pages/channel_recommend/channel_recommend_page.dart` |
| checkout | `apps/flutter/lib/pages/checkout/checkout_page.dart` |
| coupon_center | `apps/flutter/lib/pages/coupon_center/coupon_center_page.dart` |
| coupons | `apps/flutter/lib/pages/coupons/coupons_page.dart` |
| favorites | `apps/flutter/lib/pages/favorites/favorites_page.dart` |
| feedback | `apps/flutter/lib/pages/feedback/feedback_page.dart` |
| group_buy_detail | `apps/flutter/lib/pages/group_buy_detail/group_buy_detail_page.dart` |
| group_buy_join | `apps/flutter/lib/pages/group_buy_join/group_buy_join_page.dart` |
| group_buy_list | `apps/flutter/lib/pages/group_buy_list/group_buy_list_page.dart` |
| growth_logs | `apps/flutter/lib/pages/growth_logs/growth_logs_page.dart` |
| help_article | `apps/flutter/lib/pages/help_article/help_article_page.dart` |
| help_center | `apps/flutter/lib/pages/help_center/help_center_page.dart` |
| home | `apps/flutter/lib/pages/home/home_page.dart` |
| invoice_template | `apps/flutter/lib/pages/invoice_template/invoice_template_page.dart` |
| invoices | `apps/flutter/lib/pages/invoices/invoices_page.dart` |
| login | `apps/flutter/lib/pages/login/login_page.dart` |
| logistics | `apps/flutter/lib/pages/logistics/logistics_page.dart` |
| logistics_trace | `apps/flutter/lib/pages/logistics_trace/logistics_trace_page.dart` |
| logistics_track | `apps/flutter/lib/pages/logistics_track/logistics_track_page.dart` |
| my_group_buy | `apps/flutter/lib/pages/my_group_buy/my_group_buy_page.dart` |
| my_reviews | `apps/flutter/lib/pages/my_reviews/my_reviews_page.dart` |
| notification_setting | `apps/flutter/lib/pages/notification_setting/notification_setting_page.dart` |
| notifications | `apps/flutter/lib/pages/notifications/notifications_page.dart` |
| order_all | `apps/flutter/lib/pages/order_all/order_all_page.dart` |
| order_cancel | `apps/flutter/lib/pages/order_cancel/order_cancel_page.dart` |
| order_confirm | `apps/flutter/lib/pages/order_confirm/order_confirm_page.dart` |
| order_detail | `apps/flutter/lib/pages/order_detail/order_detail_page.dart` |
| order_done | `apps/flutter/lib/pages/order_done/order_done_page.dart` |
| order_list | `apps/flutter/lib/pages/order_list/order_list_page.dart` |
| order_pay | `apps/flutter/lib/pages/order_pay/order_pay_page.dart` |
| order_receive | `apps/flutter/lib/pages/order_receive/order_receive_page.dart` |
| order_refunding | `apps/flutter/lib/pages/order_refunding/order_refunding_page.dart` |
| order_ship | `apps/flutter/lib/pages/order_ship/order_ship_page.dart` |
| payment | `apps/flutter/lib/pages/payment/payment_page.dart` |
| points | `apps/flutter/lib/pages/points/points_page.dart` |
| product_detail | `apps/flutter/lib/pages/product_detail/product_detail_page.dart` |
| product_params | `apps/flutter/lib/pages/product_params/product_params_page.dart` |
| product_questions | `apps/flutter/lib/pages/product_questions/product_questions_page.dart` |
| profile | `apps/flutter/lib/pages/profile/profile_page.dart` |
| promotion_flash | `apps/flutter/lib/pages/promotion_flash/promotion_flash_page.dart` |
| promotion_list | `apps/flutter/lib/pages/promotion_list/promotion_list_page.dart` |
| promotion_presale | `apps/flutter/lib/pages/promotion_presale/promotion_presale_page.dart` |
| promotion_session | `apps/flutter/lib/pages/promotion_session/promotion_session_page.dart` |
| realname | `apps/flutter/lib/pages/realname/realname_page.dart` |
| refund | `apps/flutter/lib/pages/refund/refund_page.dart` |
| refund_reason | `apps/flutter/lib/pages/refund_reason/refund_reason_page.dart` |
| region | `apps/flutter/lib/pages/region/region_page.dart` |
| review | `apps/flutter/lib/pages/review/review_page.dart` |
| review_all | `apps/flutter/lib/pages/review_all/review_all_page.dart` |
| review_bad | `apps/flutter/lib/pages/review_bad/review_bad_page.dart` |
| review_good | `apps/flutter/lib/pages/review_good/review_good_page.dart` |
| review_image | `apps/flutter/lib/pages/review_image/review_image_page.dart` |
| review_medium | `apps/flutter/lib/pages/review_medium/review_medium_page.dart` |
| review_reply | `apps/flutter/lib/pages/review_reply/review_reply_page.dart` |
| review_tags | `apps/flutter/lib/pages/review_tags/review_tags_page.dart` |
| search | `apps/flutter/lib/pages/search/search_page.dart` |
| settings | `apps/flutter/lib/pages/settings/settings_page.dart` |
| sign_in | `apps/flutter/lib/pages/sign_in/sign_in_page.dart` |
| sign_in_calendar | `apps/flutter/lib/pages/sign_in_calendar/sign_in_calendar_page.dart` |
| splash | `apps/flutter/lib/pages/splash/splash_page.dart` |
| task_center | `apps/flutter/lib/pages/task_center/task_center_page.dart` |
| task_detail | `apps/flutter/lib/pages/task_detail/task_detail_page.dart` |
| user_level | `apps/flutter/lib/pages/user_level/user_level_page.dart` |

### Vue3 Web 用户端（80 页 / 80 条路由）

| 页面 | 文件 |
| --- | --- |
| AccountSecurity | `apps/web-vue/src/views/AccountSecurityView.vue` |
| Address | `apps/web-vue/src/views/AddressView.vue` |
| AfterSaleApply | `apps/web-vue/src/views/AfterSaleApplyView.vue` |
| AfterSaleDetail | `apps/web-vue/src/views/AfterSaleDetailView.vue` |
| AfterSaleList | `apps/web-vue/src/views/AfterSaleListView.vue` |
| Cart | `apps/web-vue/src/views/CartView.vue` |
| Categories | `apps/web-vue/src/views/CategoriesView.vue` |
| Category | `apps/web-vue/src/views/CategoryView.vue` |
| ChannelClearance | `apps/web-vue/src/views/ChannelClearanceView.vue` |
| ChannelCross | `apps/web-vue/src/views/ChannelCrossView.vue` |
| ChannelFlash | `apps/web-vue/src/views/ChannelFlashView.vue` |
| ChannelFreeship | `apps/web-vue/src/views/ChannelFreeshipView.vue` |
| ChannelFresh | `apps/web-vue/src/views/ChannelFreshView.vue` |
| ChannelHot | `apps/web-vue/src/views/ChannelHotView.vue` |
| ChannelHub | `apps/web-vue/src/views/ChannelHubView.vue` |
| ChannelNewest | `apps/web-vue/src/views/ChannelNewestView.vue` |
| ChannelPresale | `apps/web-vue/src/views/ChannelPresaleView.vue` |
| ChannelRecommend | `apps/web-vue/src/views/ChannelRecommendView.vue` |
| Checkout | `apps/web-vue/src/views/CheckoutView.vue` |
| Compare | `apps/web-vue/src/views/CompareView.vue` |
| CouponCenter | `apps/web-vue/src/views/CouponCenterView.vue` |
| Coupons | `apps/web-vue/src/views/CouponsView.vue` |
| Favorites | `apps/web-vue/src/views/FavoritesView.vue` |
| Feedback | `apps/web-vue/src/views/FeedbackView.vue` |
| FlashSale | `apps/web-vue/src/views/FlashSaleView.vue` |
| FlashSaleList | `apps/web-vue/src/views/FlashSaleListView.vue` |
| FreightCalc | `apps/web-vue/src/views/FreightCalcView.vue` |
| GroupBuy | `apps/web-vue/src/views/GroupBuyView.vue` |
| GroupBuyDetail | `apps/web-vue/src/views/GroupBuyDetailView.vue` |
| GroupBuyList | `apps/web-vue/src/views/GroupBuyListView.vue` |
| GrowthLogs | `apps/web-vue/src/views/GrowthLogsView.vue` |
| HelpArticle | `apps/web-vue/src/views/HelpArticleView.vue` |
| HelpCenter | `apps/web-vue/src/views/HelpCenterView.vue` |
| History | `apps/web-vue/src/views/HistoryView.vue` |
| Home | `apps/web-vue/src/views/HomeView.vue` |
| Invoices | `apps/web-vue/src/views/InvoicesView.vue` |
| InvoiceTemplate | `apps/web-vue/src/views/InvoiceTemplateView.vue` |
| Login | `apps/web-vue/src/views/LoginView.vue` |
| Logistics | `apps/web-vue/src/views/LogisticsView.vue` |
| LogisticsTraceList | `apps/web-vue/src/views/LogisticsTraceListView.vue` |
| Member | `apps/web-vue/src/views/MemberView.vue` |
| MyReviews | `apps/web-vue/src/views/MyReviewsView.vue` |
| NotFound | `apps/web-vue/src/views/NotFoundView.vue` |
| Notification | `apps/web-vue/src/views/NotificationView.vue` |
| NotificationSetting | `apps/web-vue/src/views/NotificationSettingView.vue` |
| OrderAll | `apps/web-vue/src/views/OrderAllView.vue` |
| OrderDetail | `apps/web-vue/src/views/OrderDetailView.vue` |
| OrderDone | `apps/web-vue/src/views/OrderDoneView.vue` |
| OrderList | `apps/web-vue/src/views/OrderListView.vue` |
| OrderPay | `apps/web-vue/src/views/OrderPayView.vue` |
| OrderReceive | `apps/web-vue/src/views/OrderReceiveView.vue` |
| OrderRefunding | `apps/web-vue/src/views/OrderRefundingView.vue` |
| OrderShip | `apps/web-vue/src/views/OrderShipView.vue` |
| OrderTrace | `apps/web-vue/src/views/OrderTraceView.vue` |
| Payment | `apps/web-vue/src/views/PaymentView.vue` |
| PayResult | `apps/web-vue/src/views/PayResultView.vue` |
| Points | `apps/web-vue/src/views/PointsView.vue` |
| Presale | `apps/web-vue/src/views/PresaleView.vue` |
| ProductDetail | `apps/web-vue/src/views/ProductDetailView.vue` |
| ProductParams | `apps/web-vue/src/views/ProductParamsView.vue` |
| ProductQuestions | `apps/web-vue/src/views/ProductQuestionsView.vue` |
| PromotionList | `apps/web-vue/src/views/PromotionListView.vue` |
| PromotionSession | `apps/web-vue/src/views/PromotionSessionView.vue` |
| RealName | `apps/web-vue/src/views/RealNameView.vue` |
| Recharge | `apps/web-vue/src/views/RechargeView.vue` |
| Refund | `apps/web-vue/src/views/RefundView.vue` |
| RefundReason | `apps/web-vue/src/views/RefundReasonView.vue` |
| Region | `apps/web-vue/src/views/RegionView.vue` |
| ReviewAll | `apps/web-vue/src/views/ReviewAllView.vue` |
| ReviewBad | `apps/web-vue/src/views/ReviewBadView.vue` |
| ReviewGood | `apps/web-vue/src/views/ReviewGoodView.vue` |
| ReviewImage | `apps/web-vue/src/views/ReviewImageView.vue` |
| ReviewMedium | `apps/web-vue/src/views/ReviewMediumView.vue` |
| ReviewReply | `apps/web-vue/src/views/ReviewReplyView.vue` |
| ReviewTag | `apps/web-vue/src/views/ReviewTagView.vue` |
| Search | `apps/web-vue/src/views/SearchView.vue` |
| SignIn | `apps/web-vue/src/views/SignInView.vue` |
| TaskCenter | `apps/web-vue/src/views/TaskCenterView.vue` |
| UserCenter | `apps/web-vue/src/views/UserCenterView.vue` |
| UserLevel | `apps/web-vue/src/views/UserLevelView.vue` |

### React 后台管理（82 页 / 83 条路由）

| 组件 | 文件 |
| --- | --- |
| AfterSaleDetail | `apps/admin-react/src/pages/AfterSaleDetail.tsx` |
| AfterSales | `apps/admin-react/src/pages/AfterSales.tsx` |
| Analytics | `apps/admin-react/src/pages/Analytics.tsx` |
| AuditLogs | `apps/admin-react/src/pages/system/AuditLogs.tsx` |
| BalanceLogs | `apps/admin-react/src/pages/BalanceLogs.tsx` |
| Banners | `apps/admin-react/src/pages/Banners.tsx` |
| Categories | `apps/admin-react/src/pages/Categories.tsx` |
| ChannelProducts | `apps/admin-react/src/pages/ChannelProducts.tsx` |
| Channels | `apps/admin-react/src/pages/Channels.tsx` |
| Coupons | `apps/admin-react/src/pages/Coupons.tsx` |
| Dashboard | `apps/admin-react/src/pages/Dashboard.tsx` |
| DeliveryRanges | `apps/admin-react/src/pages/DeliveryRanges.tsx` |
| FeedbackDetail | `apps/admin-react/src/pages/FeedbackDetail.tsx` |
| Feedbacks | `apps/admin-react/src/pages/Feedbacks.tsx` |
| Forbidden | `apps/admin-react/src/pages/Forbidden.tsx` |
| FreightCalc | `apps/admin-react/src/pages/FreightCalc.tsx` |
| GroupBuyDetail | `apps/admin-react/src/pages/GroupBuyDetail.tsx` |
| GroupBuyMembers | `apps/admin-react/src/pages/GroupBuyMembers.tsx` |
| GroupBuys | `apps/admin-react/src/pages/GroupBuys.tsx` |
| GrowthLogs | `apps/admin-react/src/pages/GrowthLogs.tsx` |
| Guarantees | `apps/admin-react/src/pages/Guarantees.tsx` |
| InboundOrderCreate | `apps/admin-react/src/pages/InboundOrderCreate.tsx` |
| InboundOrderDetail | `apps/admin-react/src/pages/InboundOrderDetail.tsx` |
| InboundOrders | `apps/admin-react/src/pages/InboundOrders.tsx` |
| Inventory | `apps/admin-react/src/pages/Inventory.tsx` |
| InventoryLogs | `apps/admin-react/src/pages/system/InventoryLogs.tsx` |
| Invoices | `apps/admin-react/src/pages/Invoices.tsx` |
| Login | `apps/admin-react/src/pages/Login.tsx` |
| Logistics | `apps/admin-react/src/pages/Logistics.tsx` |
| LogisticsCompanies | `apps/admin-react/src/pages/LogisticsCompanies.tsx` |
| LogisticsTemplateDetail | `apps/admin-react/src/pages/LogisticsTemplateDetail.tsx` |
| LogisticsTemplates | `apps/admin-react/src/pages/LogisticsTemplates.tsx` |
| LogisticsTrack | `apps/admin-react/src/pages/LogisticsTrack.tsx` |
| MarketingTasks | `apps/admin-react/src/pages/MarketingTasks.tsx` |
| Materials | `apps/admin-react/src/pages/Materials.tsx` |
| NotFound | `apps/admin-react/src/pages/NotFound.tsx` |
| NotificationCategories | `apps/admin-react/src/pages/NotificationCategories.tsx` |
| NotificationTemplates | `apps/admin-react/src/pages/NotificationTemplates.tsx` |
| OrderList | `apps/admin-react/src/pages/OrderList.tsx` |
| OrderLogs | `apps/admin-react/src/pages/OrderLogs.tsx` |
| Orders | `apps/admin-react/src/pages/Orders.tsx` |
| OrderStatsChannel | `apps/admin-react/src/pages/OrderStatsChannel.tsx` |
| OrderStatsHour | `apps/admin-react/src/pages/OrderStatsHour.tsx` |
| OrderStatsRegion | `apps/admin-react/src/pages/OrderStatsRegion.tsx` |
| OutboundOrderCreate | `apps/admin-react/src/pages/OutboundOrderCreate.tsx` |
| OutboundOrderDetail | `apps/admin-react/src/pages/OutboundOrderDetail.tsx` |
| OutboundOrders | `apps/admin-react/src/pages/OutboundOrders.tsx` |
| PayChannels | `apps/admin-react/src/pages/PayChannels.tsx` |
| Payments | `apps/admin-react/src/pages/Payments.tsx` |
| Permissions | `apps/admin-react/src/pages/system/Permissions.tsx` |
| ProductDetail | `apps/admin-react/src/pages/ProductDetail.tsx` |
| ProductParams | `apps/admin-react/src/pages/ProductParams.tsx` |
| Products | `apps/admin-react/src/pages/Products.tsx` |
| Promotions | `apps/admin-react/src/pages/Promotions.tsx` |
| PromotionSessions | `apps/admin-react/src/pages/PromotionSessions.tsx` |
| QuestionAnswer | `apps/admin-react/src/pages/QuestionAnswer.tsx` |
| Questions | `apps/admin-react/src/pages/Questions.tsx` |
| RechargeOrders | `apps/admin-react/src/pages/RechargeOrders.tsx` |
| RefundReasons | `apps/admin-react/src/pages/RefundReasons.tsx` |
| Refunds | `apps/admin-react/src/pages/Refunds.tsx` |
| ReturnShipments | `apps/admin-react/src/pages/ReturnShipments.tsx` |
| Reviews | `apps/admin-react/src/pages/Reviews.tsx` |
| ReviewTags | `apps/admin-react/src/pages/ReviewTags.tsx` |
| Roles | `apps/admin-react/src/pages/system/Roles.tsx` |
| SensitiveWords | `apps/admin-react/src/pages/SensitiveWords.tsx` |
| Settings | `apps/admin-react/src/pages/Settings.tsx` |
| ShipmentDetail | `apps/admin-react/src/pages/ShipmentDetail.tsx` |
| Shipments | `apps/admin-react/src/pages/Shipments.tsx` |
| SignInConfig | `apps/admin-react/src/pages/SignInConfig.tsx` |
| Skus | `apps/admin-react/src/pages/Skus.tsx` |
| SmsRecords | `apps/admin-react/src/pages/system/SmsRecords.tsx` |
| SmsSend | `apps/admin-react/src/pages/system/SmsSend.tsx` |
| SmsTemplates | `apps/admin-react/src/pages/SmsTemplates.tsx` |
| StockCheckDetail | `apps/admin-react/src/pages/StockCheckDetail.tsx` |
| StockCheckItems | `apps/admin-react/src/pages/StockCheckItems.tsx` |
| StockChecks | `apps/admin-react/src/pages/StockChecks.tsx` |
| UserLevelDetail | `apps/admin-react/src/pages/UserLevelDetail.tsx` |
| UserLevels | `apps/admin-react/src/pages/UserLevels.tsx` |
| UserLevelStats | `apps/admin-react/src/pages/UserLevelStats.tsx` |
| Users | `apps/admin-react/src/pages/Users.tsx` |
| UsersByLevel | `apps/admin-react/src/pages/UsersByLevel.tsx` |
| Warehouses | `apps/admin-react/src/pages/Warehouses.tsx` |

<!-- PAGE_LIST_END -->

---

## 目录结构

```
shopstack/
├── proto/                     # 【契约单一来源】10 个 proto，buf lint 通过
│   └── shopstack/<pkg>/v1/*.proto
├── gen/go/                    # buf 生成的 Go 代码（pb.go / pb.gw.go / _grpc.pb.go）
├── backend/
│   ├── cmd/                   # 9 个微服务 + gateway + smoketest 入口
│   ├── internal/
│   │   ├── config/            # YAML + 环境变量覆盖
│   │   ├── logger/            # zap 结构化日志
│   │   ├── errs/              # 业务错误码（1000-9999 分段）
│   │   ├── auth/              # JWT 双密钥（用户/管理员）+ 身份上下文
│   │   ├── database/          # GORM 初始化
│   │   ├── cache/             # Redis + 分布式锁
│   │   ├── mq/                # RabbitMQ topic 交换机 + 事件常量
│   │   ├── registry/          # 轻量 Nacos 客户端（失败自动降级静态地址）
│   │   ├── client/            # gRPC 连接池 + 身份透传拦截器
│   │   ├── server/            # gRPC 拦截器链 + 优雅停机
│   │   ├── thirdparty/        # 微信/短信/OSS Provider + Mock
│   │   ├── httpx/             # 信封/中间件/CORS/限流
│   │   ├── bootstrap/         # 统一服务启动脚手架
│   │   ├── gateway/           # API 网关
│   │   ├── user/ product/ cart/ order/ payment/
│   │   └── inventory/ marketing/ logistics/ notification/
│   ├── configs/*.yaml         # 10 个服务的配置
│   └── Dockerfile             # 多阶段构建，--build-arg SERVICE=xxx
├── apps/
│   ├── flutter/               # 移动端（80 页）
│   ├── miniapp/               # 微信小程序（80 页：主包 26 + 3 分包 54）
│   ├── web-vue/               # Web 用户端（80 页）
│   └── admin-react/           # Web 后台管理（82 页）
├── design-tokens/
│   ├── tokens.json            # 176 个设计令牌（单一数据源）
│   ├── build.mjs              # 生成 CSS/SCSS/TS/Dart/WXSS
│   └── generated/
├── deploy/
│   ├── docker-compose.yml     # 9 服务 + 网关 + 4 中间件
│   ├── mysql/init/            # 01-schema + 02-seed + 03-extend + 04-extend-seed
│   └── nginx/nginx.conf       # 生产反向代理配置
├── scripts/
│   ├── dev-up.sh / dev-down.sh
│   ├── extend-proto.py        # 幂等的契约扩展脚本
│   ├── gen-api-docs.mjs       # 从 proto 生成 docs/api.md
│   └── gen-page-list.mjs      # 扫描四端生成 README 页面清单
└── docs/
    ├── api.md                 # 接口参考（自动生成）
    ├── architecture.md        # 架构设计
    ├── getting-started.md     # 启动指南
    ├── page-expansion-plan.md # 四端页面清单规范
    └── frontend-worker-brief.md # 前端实现通用规则
```

---

## 关键约定

### 统一响应信封

```json
{ "code": 0, "message": "ok", "data": { }, "trace_id": "a1b2c3d4" }
```

`code === 0` 表示成功。错误码按域分段：1000 基础 / 2000 用户 / 3000 商品 / 4000 购物车 / 5000 订单 / 6000 支付 / 7000 库存 / 8000 营销 / 9000 物流通知。

### 字段与单位

- JSON 字段名**一律 snake_case**，与 `.proto` 完全一致。
- 64 位整数（`id`、`*_cents`、`*_id`）在 JSON 中是**数字**而非字符串——网关用描述符级转换实现，不误伤订单号这类纯数字字符串。
- 金额单位是**分**（int64），杜绝浮点精度问题；前端用 `formatYuan(cents)` 格式化。

### 分页

请求用点号嵌套形式，响应带 `meta`：

```
GET /api/v1/products?page.page=1&page.page_size=20
→ { "data": { "products": [...], "meta": { "page":1, "page_size":20, "total":12, "total_pages":1 } } }
```

### 鉴权

```
Authorization: Bearer <access_token>
```

网关是唯一鉴权入口，校验后通过 gRPC metadata 把身份（`x-user-id` / `x-username` / `x-subject` / `x-permissions`）透传给下游服务，内部服务信任该 metadata。

### 设计令牌

`design-tokens/tokens.json` 是唯一数据源，176 个令牌（色板、圆角、阴影、间距、字号）。改一次令牌，4 个端同时更新：

```bash
node design-tokens/build.mjs
# → generated/tokens.css / tokens.scss / tokens.ts / tokens.dart / tokens.wxss
```

---

## 验证与测试

```bash
# 编译 + 静态检查
go build ./backend/... && go vet ./backend/... && gofmt -l backend/

# gRPC 直连冒烟（14 项）
go run ./backend/cmd/smoketest --mode=grpc

# 完整购买链路（经网关，12 项）
go run ./backend/cmd/smoketest --mode=flow --gateway=http://127.0.0.1:8080

# 全接口巡检（经网关，210 项，覆盖全部 203 个接口 + 内部接口拒绝校验）
go run ./backend/cmd/smoketest --mode=ext --gateway=http://127.0.0.1:8080

# 重新生成 proto 代码
cd proto && buf dep update && buf lint && buf generate

# 重新生成 API 文档
node scripts/gen-api-docs.mjs

# 重新生成 README 页面清单
node scripts/gen-page-list.mjs --write

# 前端自检
cd apps/miniapp && node tools/validate-miniapp.js   # 小程序 80 页 / 375 事件绑定零死按钮
cd apps/flutter && flutter analyze && flutter test   # 移动端 80 页
cd apps/web-vue && npm run build                     # 用户端 80 页
cd apps/admin-react && npm run build                 # 后台 82 页
```

`--mode=flow` 覆盖的链路：登录 → 加购 → 下单 → 创建支付单 → Mock 通道自动结算 → 订单变已付款 → 购物车清理。当前 **12/12 全绿**。

`--mode=ext` 逐个巡检 9 个微服务对外暴露的接口（用户/商品/购物车/订单/营销/物流/通知 + 全部后台接口），
覆盖读接口、写接口与「库存内部接口必须被网关拒绝」的安全校验，当前 **201 通过 / 9 预期内业务拦截 / 0 失败**。

巡检清单的判定规则分三档，不再把「接口返回了业务错误」笼统算成通过：

| 判定 | 含义 | 结果标记 |
| --- | --- | --- |
| 业务码 0 | 接口正常返回 | ✅ 通过 |
| 业务码在 `allowCodes` 白名单 | 业务规则主动拦截（如「今日已签到」），属预期行为 | ⚠️ 警告 |
| 其它业务码 | 接口行为不符合预期 | ❌ 失败 |

用例清单覆盖 proto 声明的**全部 203 个 HTTP 路由**（新建 → 拿到 id → 再更新/删除的链式用例，
以及依赖异步结算的「下单 → 支付 → 轮询等待已付款 → 申请退款 → 后台审核」链路）。
写用例带唯一键的用 `{{uniq}}` 占位符取本次巡检专属 token，因此**可重复执行**，连跑多遍结果一致。

> 巡检一轮约 200 次请求，网关按 IP 限制每分钟 600 次。连续执行多轮时，
> 巡检会自动等待限流窗口重置（⚠️ 警告）后继续，不会把限流误判成接口故障。

> **端口提示**：本机 8080 端口可能被其它进程占用，本地验证可改用 8090：
> `SHOP_HTTP_ADDR=":8090"` 启动网关，冒烟加 `--gateway=http://127.0.0.1:8090`，
> 前端用 `VITE_GATEWAY_URL` / `VITE_API_BASE_URL` 指向 `http://127.0.0.1:8090`。

---

## 第三方服务降级策略

所有第三方都实现为「Provider 接口 + Mock 实现」，**没有密钥也能跑通全流程**：

| 能力 | 真实实现 | 无密钥时的 Mock 行为 |
| --- | --- | --- |
| 微信登录 | `POST /sns/jscode2session` | 由 code 派生稳定 openid，直接登录 |
| 微信支付 | APIv3 统一下单（保留调用骨架） | Mock 通道自动结算成功 |
| 短信验证码 | 阿里云 / 腾讯云 Provider | 直接在响应里返回验证码 |
| 对象存储 | OSS / S3 Provider | 返回占位图 URL |

配置了密钥就自动切换到真实实现，代码路径不变。相关配置见 `backend/configs/*.yaml` 与 `backend/internal/thirdparty/`。

---

## 文档索引

| 文档 | 内容 |
| --- | --- |
| [docs/architecture.md](docs/architecture.md) | 架构设计、服务拆分、数据流、技术选型理由 |
| [docs/api.md](docs/api.md) | 全部接口参考（由 proto 自动生成） |
| [docs/getting-started.md](docs/getting-started.md) | 详细启动步骤、常见问题排查 |
| `proto/shopstack/<pkg>/v1/*.proto` | 契约源头，字段级说明写在 proto 注释里 |
