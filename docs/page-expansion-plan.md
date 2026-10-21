# ShopStack 四端页面扩展规范（阶段 3）

本文件是阶段 3（前端扩量）的**唯一页面清单来源**。四个前端 worker 必须严格按本文件实现，
不得自行增删页面，不得留下 TODO / 占位页 / 空壳页。

## 目标口径

| 端 | 实际基线 | 目标 | 需新增 |
|---|---|---|---|
| Flutter 移动端 (`apps/flutter`) | 24 | **80** | +56 |
| 微信小程序 (`apps/miniapp`) | 24 | **80** | +56 |
| Vue3 Web 用户端 (`apps/web-vue`) | 30 | **80** | +50 |
| React 后台管理 (`apps/admin-react`) | 29 | **80～82** | +53 |

> React 端实际基线是 **29** 个 tsx 文件（原口径 27 只数了路由，漏算 `Forbidden.tsx` 与 `NotFound.tsx`）。
> 严格按本文清单实现 53 个新页面后为 **29 + 53 = 82** 页，仍落在「80～100 页」目标区间内，
> 且页面数与路由数严格 1:1。

**每端各自独立达到 80 页**，不是四端相加。计数口径：

- Flutter：`lib/pages/` 下 `*_page.dart` 文件数（`splash_page` 与 `login_page` 计入）
- 小程序：`app.json` 的 `pages[]` 长度 **加上** `subPackages[].pages[]` 长度之和
- Vue3：`src/views/` 下 `*View.vue` 文件数
- React：`src/pages/` 下 `*.tsx` 文件数（含 `system/` 子目录，`NotFound.tsx` / `Forbidden.tsx` / `Login.tsx` 计入）

## 通用规则

### 1. 参数化页面策略（本轮扩量的核心）

页面数量从 30 扩到 80，**主要靠同一后端接口的不同筛选维度参数化出多个独立页面**，
而不是发明新业务。每个页面必须有真实数据来源（后端接口），不允许假数据页。

允许的参数化维度（示例）：
- 频道类型：`recommend` / `newest` / `hot` / `flash` / `presale` / `clearance` / `freeship` / `cross` / `fresh`
- 订单状态：`pending_pay` / `pending_ship` / `shipped` / `completed` / `cancelled` / `refunding`
- 优惠券类型：`discount` / `cash` / `gift` / `shipping` / `category`
- 评价筛选：`all` / `good` / `medium` / `bad` / `has_image` / `has_reply` / `<tag_id>`
- 售后状态：`pending` / `approved` / `rejected` / `refunding` / `completed`
- 活动类型：`coupon` / `discount` / `flash` / `presale` / `groupbuy` / `seckill`

### 2. Mock 兜底（强制）

前端**不依赖后端实现完成**。后端某个接口返回 `code != 0` 或网络失败时，
该页面必须回落到本地 Mock 数据并显示「演示数据模式」提示条。

各端已有 Mock 机制沿用原实现（Flutter：`lib/api/`；小程序：`utils/mock.js`；
Vue3：`src/api/mock`；React：`src/mock/`）。Mock 数据必须与真实接口的 JSON 结构完全一致
（snake_case 字段名）。

### 3. 禁止事项（硬性）

- 禁止 TODO / FIXME / 占位符文案 / 点了没反应的按钮 / 空列表不提示
- 禁止把同一个页面复制粘贴改个标题当成多个页面（参数化页面必须共用组件，路径/标题/筛选条件不同）
- 禁止留空 `onClick` / `@click` 无处理函数 / 路由指向不存在的页面
- 禁止页面里出现「敬请期待」「开发中」这类占位文案

### 4. 金额显示

后端一律返回**分**（int64）。各端必须用已有的 `formatYuan(cents)` 之类的工具转换后展示，
禁止直接展示数字。

### 5. 路由与页面的对应

- Vue3：`src/views/` 每个 `*View.vue` 必须有且仅有一条对应路由（`src/router/index.ts`），
  路由数 == view 数，保持严格 1:1。404 页（`*` 路由）不计入 view 数。
- React：`src/pages/` 每个 `*.tsx` 必须有对应 `<Route>`，`src/router/index.tsx` 路由数 == 页面数。
- 小程序：`app.json` 的 `pages[]` 每项必须存在对应的 `.js` + `.json` + `.wxml` + `.wxss` 四件套，
  且 `app.json` 里 `pages[]` 长度 == 实际页面目录数。
- Flutter：每个 `*_page.dart` 必须在 `MaterialApp.routes` 或路由表里注册。

### 6. 环境变量

- Vue3：`VITE_GATEWAY_URL`（默认 `http://localhost:8080`）
- React：`VITE_API_BASE_URL`（默认 `http://localhost:8080`）

> **重要**：本机 **8080 端口被无关进程占用**（`books-api`，非本项目）。
> 本地验证后端请用 **8090**：
> `VITE_GATEWAY_URL=http://127.0.0.1:8090` / `VITE_API_BASE_URL=http://127.0.0.1:8090`
> 若连不上 8090 看到「登录被拦截」，那是端口问题不是后端故障，不要去改后端。

---

## 一、Flutter 移动端（24 → 80，新增 56 页）

现有 24 页保留不动，新增以下 56 页。目录 `apps/flutter/lib/pages/<name>/<name>_page.dart`。

### 分组 A — 频道与商品浏览（12 页）

| # | 页面 | 路由/文件 | 数据来源 |
|---|---|---|---|
| 1 | 频道列表 | `channel_list_page.dart` | `GET /api/v1/channels` |
| 2 | 频道详情-推荐 | `channel_recommend_page.dart` | `GET /api/v1/channels/{id}/products` |
| 3 | 频道详情-新品 | `channel_newest_page.dart` | 同上 |
| 4 | 频道详情-热销 | `channel_hot_page.dart` | 同上 |
| 5 | 频道详情-限时 | `channel_flash_page.dart` | 同上 |
| 6 | 频道详情-预售 | `channel_presale_page.dart` | 同上 |
| 7 | 频道详情-清仓 | `channel_clearance_page.dart` | 同上 |
| 8 | 频道详情-包邮 | `channel_freeship_page.dart` | 同上 |
| 9 | 频道详情-跨境 | `channel_cross_page.dart` | 同上 |
| 10 | 频道详情-生鲜 | `channel_fresh_page.dart` | 同上 |
| 11 | 商品参数 | `product_params_page.dart` | `GET /api/v1/products/{id}/params` |
| 12 | 商品问答 | `product_questions_page.dart` | `GET /api/v1/products/{id}/questions` |

### 分组 B — 评价体系（8 页）

| # | 页面 | 文件 | 说明 |
|---|---|---|---|
| 13 | 全部评价 | `review_all_page.dart` | 筛选参数 `filter=all` |
| 14 | 好评 | `review_good_page.dart` | `filter=good` |
| 15 | 中评 | `review_medium_page.dart` | `filter=medium` |
| 16 | 差评 | `review_bad_page.dart` | `filter=bad` |
| 17 | 有图评价 | `review_image_page.dart` | `filter=has_image` |
| 18 | 已回复评价 | `review_reply_page.dart` | `filter=has_reply` |
| 19 | 我的评价 | `my_reviews_page.dart` | 当前用户发表过的评价 |
| 20 | 评价标签 | `review_tags_page.dart` | `GET /api/v1/reviews/tags` |

### 分组 C — 营销与活动（12 页）

| # | 页面 | 文件 | 说明 |
|---|---|---|---|
| 21 | 签到中心 | `sign_in_page.dart` | `POST /api/v1/marketing/sign-in` |
| 22 | 签到日历 | `sign_in_calendar_page.dart` | `GET /api/v1/marketing/sign-in` |
| 23 | 任务中心 | `task_center_page.dart` | `GET /api/v1/marketing/tasks` |
| 24 | 任务详情 | `task_detail_page.dart` | 任务进度与领奖 |
| 25 | 活动列表 | `promotion_list_page.dart` | `GET /api/v1/promotions` |
| 26 | 限时秒杀 | `promotion_flash_page.dart` | `promotion_type=flash` |
| 27 | 预售专区 | `promotion_presale_page.dart` | `promotion_type=presale` |
| 28 | 拼团列表 | `group_buy_list_page.dart` | `GET /api/v1/group-buys` |
| 29 | 拼团详情 | `group_buy_detail_page.dart` | `GET /api/v1/group-buys/{id}` |
| 30 | 参团下单 | `group_buy_join_page.dart` | `POST /api/v1/group-buys/{id}/join` |
| 31 | 活动场次 | `promotion_session_page.dart` | `GET /api/v1/promotions/{id}/sessions` |
| 32 | 我的拼团 | `my_group_buy_page.dart` | 我参与的拼团 |

### 分组 D — 订单与售后（14 页）

| # | 页面 | 文件 | 说明 |
|---|---|---|---|
| 33 | 全部订单 | `order_all_page.dart` | `status=` 空 |
| 34 | 待付款 | `order_pay_page.dart` | `status=pending_pay` |
| 35 | 待发货 | `order_ship_page.dart` | `status=pending_ship` |
| 36 | 待收货 | `order_receive_page.dart` | `status=shipped` |
| 37 | 已完成 | `order_done_page.dart` | `status=completed` |
| 38 | 已取消 | `order_cancel_page.dart` | `status=cancelled` |
| 39 | 退款/售后中 | `order_refunding_page.dart` | `status=refunding` |
| 40 | 售后列表 | `after_sale_list_page.dart` | `GET /api/v1/after-sales` |
| 41 | 售后详情 | `after_sale_detail_page.dart` | `GET /api/v1/after-sales/{id}` |
| 42 | 申请售后 | `after_sale_apply_page.dart` | 提交售后申请 |
| 43 | 退款原因 | `refund_reason_page.dart` | `GET /api/v1/refund-reasons` |
| 44 | 订单确认 | `order_confirm_page.dart` | 下单前确认页 |
| 45 | 物流轨迹 | `logistics_trace_page.dart` | `GET /api/v1/logistics/tracks` |
| 46 | 物流查询 | `logistics_track_page.dart` | 按运单号查 `GET /api/v1/logistics/tracking/{no}` |

### 分组 E — 用户中心与账户（10 页）

| # | 页面 | 文件 | 说明 |
|---|---|---|---|
| 47 | 会员等级 | `user_level_page.dart` | `GET /api/v1/users/level` + `GET /api/v1/marketing/levels` |
| 48 | 成长值明细 | `growth_logs_page.dart` | `GET /api/v1/users/growth-logs` |
| 49 | 发票抬头模板 | `invoice_template_page.dart` | `GET/POST/DELETE /api/v1/users/invoice-templates` |
| 50 | 通知设置 | `notification_setting_page.dart` | `GET/PUT /api/v1/users/notification-settings` |
| 51 | 账号安全 | `account_security_page.dart` | `GET /api/v1/users/security` |
| 52 | 实名认证 | `realname_page.dart` | `POST /api/v1/users/realname` |
| 53 | 意见反馈 | `feedback_page.dart` | `POST /api/v1/users/feedback` |
| 54 | 帮助中心 | `help_center_page.dart` | `GET /api/v1/help/articles` |
| 55 | 帮助文章 | `help_article_page.dart` | `GET /api/v1/help/articles/{id}` |
| 56 | 收货地区 | `region_page.dart` | `GET /api/v1/regions` |

### 分组 F — 资金与其他（补齐到 80 页后仍需补足差额时按此顺序加）

| # | 页面 | 文件 | 说明 |
|---|---|---|---|
| 57 | 余额充值 | `recharge_page.dart` | `GET /api/v1/payments/recharge-config` + `POST /api/v1/payments/recharge` |
| 58 | 充值记录 | `recharge_list_page.dart` | `GET /api/v1/payments/recharges` |
| 59 | 余额流水 | `balance_logs_page.dart` | `GET /api/v1/payments/balance-logs` |
| 60 | 支付方式 | `pay_channel_page.dart` | `GET /api/v1/admin/pay-channels`（公开读部分） |
| 61 | 运费试算 | `freight_calculate_page.dart` | `GET /api/v1/logistics/freight` |
| 62 | 快递公司 | `logistics_company_page.dart` | `GET /api/v1/logistics/companies` |
| 63 | 配送范围 | `delivery_range_page.dart` | `GET /api/v1/logistics/ranges` |
| 64 | 商品对比 | `product_compare_page.dart` | 多商品参数对比 |
| 65 | 浏览历史 | `history_page.dart` | 本地历史 + 服务端 |
| 66 | 优惠券中心 | `coupon_center_all_page.dart` | `coupon_category` 各类型 |
| 67 | 券-折扣券 | `coupon_discount_page.dart` | `coupon_category=discount` |
| 68 | 券-现金券 | `coupon_cash_page.dart` | `coupon_category=cash` |
| 69 | 券-礼品券 | `coupon_gift_page.dart` | `coupon_category=gift` |
| 70 | 券-运费券 | `coupon_shipping_page.dart` | `coupon_category=shipping` |
| 71 | 券-品类券 | `coupon_category_page.dart` | `coupon_category=category` |
| 72 | 消息中心 | `message_center_page.dart` | 通知分类聚合 |
| 73 | 通知分类 | `notification_category_page.dart` | `GET /api/v1/notifications/categories` |
| 74 | 分享邀请 | `invite_page.dart` | 邀请海报/文案 |
| 75 | 客服 | `customer_service_page.dart` | FAQ 快捷入口 |
| 76 | 积分商城 | `points_mall_page.dart` | 积分兑换（可 Mock） |
| 77 | 绑定手机 | `bind_phone_page.dart` | 换绑手机 |
| 78 | 隐私政策 | `privacy_page.dart` | 静态合规页（内容真实，非占位） |
| 79 | 用户协议 | `agreement_page.dart` | 静态合规页 |
| 80 | 发票抬头选择 | `invoice_title_page.dart` | 下单时选抬头 |

---

## 二、微信小程序（24 → 80，新增 56 页）

现有 24 页保留不动，新增以下 56 页，目录 `apps/miniapp/pages/<name>/`。
小程序建议用**分包**（`subPackages`）组织新增页面，避免主包体积超限：

```
pages/          ← 保留现有 24 页 + 少量高频新增
subpkg-shop/    ← 频道、商品浏览、评价
subpkg-order/   ← 订单状态、售后
subpkg-user/    ← 用户中心、账户、资金
```

> 注意：分包后 `app.json` 的 `pages[]` 只算主包页面。**计数时需把 `subPackages[].pages[]` 一并计入**，
> 否则小程序页面数达不到 80。校验脚本必须统计两者之和。

### 分组 A — 频道与浏览（12 页）

| # | 页面 | 数据来源 |
|---|---|---|
| 1 | 频道列表 | `GET /api/v1/channels` |
| 2 | 频道-推荐 | `GET /api/v1/channels/{id}/products` |
| 3 | 频道-新品 | 同上 |
| 4 | 频道-热销 | 同上 |
| 5 | 频道-限时 | 同上 |
| 6 | 频道-预售 | 同上 |
| 7 | 频道-清仓 | 同上 |
| 8 | 频道-包邮 | 同上 |
| 9 | 频道-跨境 | 同上 |
| 10 | 频道-生鲜 | 同上 |
| 11 | 商品参数 | `GET /api/v1/products/{id}/params` |
| 12 | 商品问答 | `GET /api/v1/products/{id}/questions` |

### 分组 B — 评价（8 页）

13. 全部评价 / 14. 好评 / 15. 中评 / 16. 差评 / 17. 有图评价 / 18. 已回复评价
19. 我的评价 / 20. 评价标签

### 分组 C — 营销活动（12 页）

21. 签到中心 / 22. 签到日历 / 23. 任务中心 / 24. 任务详情
25. 活动列表 / 26. 限时秒杀 / 27. 预售专区 / 28. 拼团列表 / 29. 拼团详情 / 30. 参团下单
31. 活动场次 / 32. 我的拼团

### 分组 D — 订单售后（14 页）

33. 全部订单 / 34. 待付款 / 35. 待发货 / 36. 待收货 / 37. 已完成 / 38. 已取消 / 39. 售后中
40. 售后列表 / 41. 售后详情 / 42. 申请售后 / 43. 退款原因 / 44. 订单确认
45. 物流轨迹 / 46. 物流查询

### 分组 E — 用户账户（10 页）

47. 会员等级 / 48. 成长值明细 / 49. 发票抬头模板 / 50. 通知设置 / 51. 账号安全
52. 实名认证 / 53. 意见反馈 / 54. 帮助中心 / 55. 帮助文章 / 56. 收货地区

### 分组 F — 资金与其他（24 页，用于补齐到 80）

57. 余额充值 / 58. 充值记录 / 59. 余额流水 / 60. 支付方式
61. 运费试算 / 62. 快递公司 / 63. 配送范围 / 64. 商品对比 / 65. 浏览历史
66. 优惠券中心 / 67. 折扣券 / 68. 现金券 / 69. 礼品券 / 70. 运费券 / 71. 品类券
72. 消息中心 / 73. 通知分类 / 74. 分享邀请 / 75. 客服
76. 积分商城 / 77. 绑定手机 / 78. 隐私政策 / 79. 用户协议 / 80. 发票抬头选择

---

## 三、Vue3 Web 用户端（30 → 80，新增 50 页）

现有 30 页保留不动，新增以下 50 页，目录 `apps/web-vue/src/views/`。
Vue3 端页面更宽，适合做**大而全的独立页面**（不共用同一套卡片列表）。

| # | 页面 | View 文件 | 说明 |
|---|---|---|---|
| 1 | 频道首页 | `ChannelHubView.vue` | 全部频道入口 |
| 2 | 频道-推荐 | `ChannelRecommendView.vue` | |
| 3 | 频道-新品 | `ChannelNewestView.vue` | |
| 4 | 频道-热销 | `ChannelHotView.vue` | |
| 5 | 频道-限时 | `ChannelFlashView.vue` | |
| 6 | 频道-预售 | `ChannelPresaleView.vue` | |
| 7 | 频道-清仓 | `ChannelClearanceView.vue` | |
| 8 | 频道-包邮 | `ChannelFreeshipView.vue` | |
| 9 | 频道-跨境 | `ChannelCrossView.vue` | |
| 10 | 频道-生鲜 | `ChannelFreshView.vue` | |
| 11 | 商品参数 | `ProductParamsView.vue` | |
| 12 | 商品问答 | `ProductQuestionsView.vue` | |
| 13 | 评价-全部 | `ReviewAllView.vue` | |
| 14 | 评价-好评 | `ReviewGoodView.vue` | |
| 15 | 评价-中评 | `ReviewMediumView.vue` | |
| 16 | 评价-差评 | `ReviewBadView.vue` | |
| 17 | 评价-有图 | `ReviewImageView.vue` | |
| 18 | 评价-已回复 | `ReviewReplyView.vue` | |
| 19 | 评价-标签 | `ReviewTagView.vue` | |
| 20 | 签到中心 | `SignInView.vue` | |
| 21 | 任务中心 | `TaskCenterView.vue` | |
| 22 | 活动列表 | `PromotionListView.vue` | |
| 23 | 限时秒杀 | `FlashSaleListView.vue` | |
| 24 | 预售专区 | `PresaleView.vue` | |
| 25 | 拼团列表 | `GroupBuyListView.vue` | |
| 26 | 拼团详情 | `GroupBuyDetailView.vue` | |
| 27 | 活动场次 | `PromotionSessionView.vue` | |
| 28 | 订单-全部 | `OrderAllView.vue` | |
| 29 | 订单-待付款 | `OrderPayView.vue` | |
| 30 | 订单-待发货 | `OrderShipView.vue` | |
| 31 | 订单-待收货 | `OrderReceiveView.vue` | |
| 32 | 订单-已完成 | `OrderDoneView.vue` | |
| 33 | 订单-售后中 | `OrderRefundingView.vue` | |
| 34 | 售后列表 | `AfterSaleListView.vue` | |
| 35 | 售后详情 | `AfterSaleDetailView.vue` | |
| 36 | 申请售后 | `AfterSaleApplyView.vue` | |
| 37 | 退款原因 | `RefundReasonView.vue` | |
| 38 | 物流轨迹 | `LogisticsTraceListView.vue` | |
| 39 | 运费试算 | `FreightCalcView.vue` | |
| 40 | 会员等级 | `UserLevelView.vue` | |
| 41 | 成长值明细 | `GrowthLogsView.vue` | |
| 42 | 发票抬头模板 | `InvoiceTemplateView.vue` | |
| 43 | 通知设置 | `NotificationSettingView.vue` | |
| 44 | 账号安全 | `AccountSecurityView.vue` | |
| 45 | 实名认证 | `RealNameView.vue` | |
| 46 | 意见反馈 | `FeedbackView.vue` | |
| 47 | 帮助中心 | `HelpCenterView.vue` | |
| 48 | 帮助文章 | `HelpArticleView.vue` | |
| 49 | 收货地区 | `RegionView.vue` | |
| 50 | 余额充值 | `RechargeView.vue` | |

> Vue3 端已有 `CompareView.vue`、`HistoryView.vue`、`MemberView.vue`、`FlashSaleView.vue`、
> `GroupBuyView.vue`、`CouponsView.vue` 等页，扩量时**允许复用其组件但必须新建文件**，
> 不能直接把已有路由改指向新页面（否则 view 数与路由数不再 1:1 或页面缺失）。

---

## 四、React 后台管理（27 → 80，新增 53 页）

现有 27 页保留不动。新增页面全部挂在 `/admin/**` 下的路由树，目录 `apps/admin-react/src/pages/`。
后台菜单需同步补齐（`src/layouts/` 里的菜单定义）。

### 分组 A — 商品与内容（12 页）

| # | 页面 | 文件 | 说明 |
|---|---|---|---|
| 1 | 频道管理 | `Channels.tsx` | `GET/POST/DELETE /api/v1/admin/channels` |
| 2 | 频道商品 | `ChannelProducts.tsx` | 频道内商品配置 |
| 3 | 评价标签 | `ReviewTags.tsx` | `GET/POST/DELETE /api/v1/admin/review-tags` |
| 4 | 服务保障 | `Guarantees.tsx` | `GET/POST/DELETE /api/v1/admin/guarantees` |
| 5 | 商品问答 | `Questions.tsx` | `GET /api/v1/admin/questions` |
| 6 | 问答回复 | `QuestionAnswer.tsx` | `POST /api/v1/admin/questions/{id}/answer` |
| 7 | 活动场次 | `PromotionSessions.tsx` | `GET/POST /api/v1/admin/promotion-sessions` |
| 8 | 拼团管理 | `GroupBuys.tsx` | `GET/POST /api/v1/admin/group-buys` |
| 9 | 拼团详情 | `GroupBuyDetail.tsx` | |
| 10 | 营销任务 | `MarketingTasks.tsx` | 任务定义管理 |
| 11 | 签到配置 | `SignInConfig.tsx` | 签到规则配置 |
| 12 | 商品参数 | `ProductParams.tsx` | 商品参数模板管理 |

### 分组 B — 交易与售后（12 页）

| # | 页面 | 文件 | 说明 |
|---|---|---|---|
| 13 | 售后管理 | `AfterSales.tsx` | `GET /api/v1/admin/after-sales` |
| 14 | 售后详情 | `AfterSaleDetail.tsx` | `PUT /api/v1/admin/after-sales/{id}/status` |
| 15 | 退款原因 | `RefundReasons.tsx` | `GET/POST /api/v1/admin/refund-reasons` |
| 16 | 全部订单 | `OrderList.tsx` | `GET /api/v1/admin/orders`（多维筛选） |
| 17 | 订单-渠道统计 | `OrderStatsChannel.tsx` | `GET /api/v1/admin/orders/stats/channels` |
| 18 | 订单-时段统计 | `OrderStatsHour.tsx` | `GET /api/v1/admin/orders/stats/hours` |
| 19 | 订单-地区统计 | `OrderStatsRegion.tsx` | `GET /api/v1/admin/orders/stats/regions` |
| 20 | 订单日志 | `OrderLogs.tsx` | `GET /api/v1/admin/order-logs` |
| 21 | 支付渠道 | `PayChannels.tsx` | `GET/POST/DELETE /api/v1/admin/pay-channels` |
| 22 | 充值订单 | `RechargeOrders.tsx` | `GET /api/v1/admin/payments/recharges`（若接口需登录态可用管理员 token） |
| 23 | 余额流水 | `BalanceLogs.tsx` | `GET /api/v1/payments/balance-logs` |
| 24 | 退货运单 | `ReturnShipments.tsx` | `GET /api/v1/admin/return-shipments` |

### 分组 C — 库存与仓储（10 页）

| # | 页面 | 文件 | 说明 |
|---|---|---|---|
| 25 | 仓库管理 | `Warehouses.tsx` | `GET/POST/DELETE /api/v1/admin/warehouses` |
| 26 | 入库单列表 | `InboundOrders.tsx` | `GET /api/v1/admin/inbound-orders` |
| 27 | 入库单详情 | `InboundOrderDetail.tsx` | |
| 28 | 新建入库单 | `InboundOrderCreate.tsx` | `POST /api/v1/admin/inbound-orders` |
| 29 | 出库单列表 | `OutboundOrders.tsx` | `GET /api/v1/admin/outbound-orders` |
| 30 | 出库单详情 | `OutboundOrderDetail.tsx` | |
| 31 | 新建出库单 | `OutboundOrderCreate.tsx` | `POST /api/v1/admin/outbound-orders` |
| 32 | 盘点单列表 | `StockChecks.tsx` | `GET /api/v1/admin/stock-checks` |
| 33 | 盘点单详情 | `StockCheckDetail.tsx` | `GET /api/v1/admin/stock-checks/{id}` |
| 34 | 盘点明细 | `StockCheckItems.tsx` | `GET /api/v1/admin/stock-checks/{id}/items` |

### 分组 D — 用户与营销（8 页）

| # | 页面 | 文件 | 说明 |
|---|---|---|---|
| 35 | 会员等级管理 | `UserLevels.tsx` | `GET/POST /api/v1/admin/user-levels` |
| 36 | 用户等级详情 | `UserLevelDetail.tsx` | |
| 37 | 成长值流水 | `GrowthLogs.tsx` | `GET /api/v1/users/growth-logs` |
| 38 | 用户反馈 | `Feedbacks.tsx` | `GET /api/v1/admin/feedbacks` |
| 39 | 反馈处理 | `FeedbackDetail.tsx` | `PUT /api/v1/admin/feedbacks/{id}/status` |
| 40 | 拼团成员 | `GroupBuyMembers.tsx` | |
| 41 | 用户等级分布 | `UserLevelStats.tsx` | 统计图表 |
| 42 | 用户列表-按等级 | `UsersByLevel.tsx` | `GET /api/v1/admin/users?level=N` |

### 分组 E — 物流与通知（11 页）

| # | 页面 | 文件 | 说明 |
|---|---|---|---|
| 43 | 快递公司 | `LogisticsCompanies.tsx` | `GET/POST/DELETE /api/v1/admin/logistics/companies` |
| 44 | 配送范围 | `DeliveryRanges.tsx` | `GET/POST /api/v1/admin/logistics/ranges` |
| 45 | 运费试算 | `FreightCalc.tsx` | `GET /api/v1/logistics/freight` |
| 46 | 运费模板管理 | `LogisticsTemplates.tsx` | 已有运费模板入口的完整版 |
| 47 | 通知模板 | `NotificationTemplates.tsx` | `GET/POST/DELETE /api/v1/admin/notification-templates` |
| 48 | 短信模板 | `SmsTemplates.tsx` | `GET/POST/DELETE /api/v1/admin/sms-templates` |
| 49 | 敏感词管理 | `SensitiveWords.tsx` | `GET/POST/DELETE /api/v1/admin/sensitive-words` |
| 50 | 通知分类 | `NotificationCategories.tsx` | `GET /api/v1/notifications/categories` |
| 51 | 发货单管理 | `Shipments.tsx` | `GET /api/v1/admin/shipments` |
| 52 | 发货单详情 | `ShipmentDetail.tsx` | `PUT /api/v1/admin/shipments/{id}/status` |
| 53 | 运费模板详情 | `LogisticsTemplateDetail.tsx` | |

---

## 验收标准（每个前端 worker 必须自检并汇报）

### Flutter
```bash
cd apps/flutter && flutter analyze           # 0 error, 0 warning
cd apps/flutter && flutter test              # 全部通过
ls lib/pages/*/*_page.dart | wc -l           # == 80
```

### 小程序
```bash
cd apps/miniapp && node scripts/validate.js  # 若无该脚本则自写校验
# 校验：app.json pages[] 长度 + subPackages[].pages[] 长度之和 == 80
# 每页 .js/.json/.wxml/.wxss 四件套齐全，JSON 可解析
# 所有 bindtap/catchtap 绑定的事件都有对应处理函数（无死按钮）
```

### Vue3
```bash
cd apps/web-vue && npm run build             # 构建通过，无 chunk 体积告警
# views 数 == routes 数 == 80
```

### React
```bash
cd apps/admin-react && npm run build          # 构建通过
# pages 数（含 system/）== routes 数 == 80
```

### 通用
- 每个页面的按钮都能触发真实行为（跳转 / 调接口 / 弹层），没有空 `onClick`
- Mock 模式下页面有明确「演示数据模式」提示
- 金额展示为「¥xx.xx」而非分
- 页面在 375px 宽（移动端）/ 1440px 宽（Web）下无横向滚动、无元素重叠
