# ShopStack API 参考

> 本文件由 `scripts/gen-api-docs.mjs` 从 `proto/shopstack/*/v1/*.proto` 自动生成，请勿手工编辑。

## 通用约定

### 响应信封

所有接口返回统一信封，`code === 0` 表示成功：

```json
{
  "code": 0,
  "message": "ok",
  "data": { },
  "trace_id": "a1b2c3d4"
}
```

失败时 `code !== 0`，`data` 为 `null`，`message` 是可直接展示给用户的中文提示。

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

- JSON 字段名一律 **snake_case**，与 `.proto` 契约完全一致。
- 64 位整数（`id`、`*_cents`、`*_id`）在 JSON 中是**数字**，不是字符串。
- 所有金额字段单位是**分**（int64），前端展示时除以 100。
- 时间字段是 RFC3339 字符串（UTC）。

### 鉴权

```
Authorization: Bearer <access_token>
```

无需鉴权的路径：`/api/v1/auth/*`、`/api/v1/admin/auth/login`、`/healthz`、`/readyz`。

### 分页

请求参数用点号嵌套形式：

```
GET /api/v1/products?page.page=1&page.page_size=20
```

响应里的 `meta`：

```json
{ "page": 1, "page_size": 20, "total": 123, "total_pages": 7 }
```

### 状态枚举

| 枚举 | 取值 |
| --- | --- |
| 订单状态 | `ORDER_STATUS_PENDING_PAYMENT` / `PAID` / `SHIPPED` / `COMPLETED` / `CANCELLED` / `REFUNDING` / `REFUNDED` / `CLOSED` |
| 支付状态 | `PAYMENT_STATUS_PENDING` / `SUCCESS` / `FAILED` / `CLOSED` |
| 商品状态 | `PRODUCT_STATUS_ON_SHELF` / `OFF_SHELF` |
| 用户券状态 | `USER_COUPON_STATUS_UNUSED` / `USED` / `EXPIRED` |
| 发票状态 | `0` 待开票 / `1` 已开票 / `2` 已驳回 |

### 演示账号

| 账号 | 密码 | 说明 |
| --- | --- | --- |
| `demo` | `demo123456` | 普通用户，积分 1200 |
| `admin` | `admin123456` | 超级管理员，25 个权限码 |

### 常见校验规则

| 场景 | 规则 | 违反时的错误 |
| --- | --- | --- |
| 申请退款 | `amount_cents` 必须 `> 0` 且 `<= payable_cents - refunded_cents` | 1001 退款金额不合法 |
| 申请退款 | `reason` 必填 | 1001 请选择退款原因 |
| 领取优惠券 | 同一张券每人限领一次，重复领取被拒 | 1005 您已领取过该优惠券 |
| 领取优惠券 | 券需已启用、未过期、未领完 | 8000 券不可用 / 已过期 |
| 结算试算 | `items` 不能为空，`price_cents * quantity` 总额必须 > 0 | 1001 结算商品不能为空 |
| 积分抵扣 | 抵扣金额不超过商品总额的 50% | 1001 |
| 收货地址 | 最多保存 20 条，其中一条为默认地址 | 1001 |
| 用户名 | 3-20 位字母/数字/下划线 | 1001 |
| 密码 | 至少 6 位 | 1001 |

### 身份传递

网关校验 JWT 后，把身份通过 gRPC metadata 透传给下游服务：

| metadata | 含义 |
| --- | --- |
| `x-user-id` | 当前登录用户 ID |
| `x-username` | 当前登录用户名 |
| `x-subject` | 主体（user / admin） |
| `x-permissions` | 权限码，逗号分隔 |

因此 `user_id` / `admin_id` 这类字段**在请求体里不需要传**，服务端会从登录身份推导（管理员接口则取全部）。个别以 `user_id` 为筛选条件的列表接口（如 `GET /api/v1/admin/users`）才需要显式传。

---

## 接口总览

| 服务 | 模块 | 端口 | 接口数 | 说明 |
| --- | --- | --- | --- | --- |
| CartService | 购物车域 | 9003 | 7 | 加购、改量、选中、删除、清空、角标计数 |
| InventoryService | 库存域 | 9006 | 20 | 库存查询、预占/释放/扣减/调整、流水、低库存预警 |
| LogisticsService | 物流域 | 9008 | 16 | 发货单、轨迹、运费模板 |
| MarketingService | 营销域 | 9007 | 22 | 优惠券领取核销、活动管理、结算试算 |
| NotificationService | 通知域 | 9009 | 20 | 站内通知、短信验证码、审计日志、系统配置 |
| OrderService | 订单域 | 9004 | 23 | 下单、查询、状态流转、退款申请与审核、订单轨迹、后台统计 |
| PaymentService | 支付域 | 9005 | 13 | 支付单创建、查询、回调、退款、后台列表与汇总 |
| ProductService | 商品域 | 9002 | 25 | 商品 SPU/SKU、上下架、轮播、素材库 |
| CategoryService | 分类域 | 9002 | 4 | 商品分类树的增删改查 |
| ReviewService | 评价域 | 9002 | 7 | 商品评价列表、发表与后台审核 |
| UserService | 用户域 | 9001 | 31 | 注册登录、资料地址、收藏、积分、发票，以及后台用户/角色/权限/看板 |
| AdminService | 后台用户域 | 9001 | 15 | 管理员登录、用户列表与状态、角色权限、系统看板、发票审核 |

全部接口经 API 网关暴露，基址 `http://localhost:8080/api/v1`。

## CartService（购物车域）

加购、改量、选中、删除、清空、角标计数

| 方法 | 路径 | RPC | 请求体 | 响应 |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/cart` | `GetCart` | — | `Cart` |
| POST | `/api/v1/cart/items` | `AddToCart` | `*` | `Cart` |
| POST | `/api/v1/cart/clear` | `ClearCart` | `*` | `OperationResult` |
| PUT | `/api/v1/cart/select-all` | `SetAllSelected` | `*` | `Cart` |
| GET | `/api/v1/cart/count` | `GetCount` | — | `GetCartCountResponse` |

## InventoryService（库存域）

库存查询、预占/释放/扣减/调整、流水、低库存预警

| 方法 | 路径 | RPC | 请求体 | 响应 |
| --- | --- | --- | --- | --- |
| POST | `/api/v1/inventory/batch` | `BatchGetStock` | `*` | `BatchGetStockResponse` |
| POST | `/api/v1/inventory/reserve` | `ReserveStock` | `*` | `OperationResult` |
| POST | `/api/v1/inventory/release` | `ReleaseStock` | `*` | `OperationResult` |
| POST | `/api/v1/inventory/deduct` | `DeductStock` | `*` | `OperationResult` |
| PUT | `/api/v1/admin/inventory/adjust` | `AdjustStock` | `*` | `Inventory` |
| GET | `/api/v1/admin/inventory` | `ListInventories` | — | `ListInventoriesResponse` |
| GET | `/api/v1/admin/inventory/logs` | `ListLogs` | — | `ListInventoryLogsResponse` |
| GET | `/api/v1/admin/inventory/warning` | `StockWarning` | — | `StockWarningResponse` |
| GET | `/api/v1/admin/warehouses` | `ListWarehouses` | — | `ListWarehousesResponse` |
| POST | `/api/v1/admin/warehouses` | `SaveWarehouse` | `*` | `Warehouse` |
| GET | `/api/v1/admin/inbound-orders` | `ListInboundOrders` | — | `ListInboundOrdersResponse` |
| POST | `/api/v1/admin/inbound-orders` | `CreateInboundOrder` | `*` | `InboundOrder` |
| GET | `/api/v1/admin/outbound-orders` | `ListOutboundOrders` | — | `ListOutboundOrdersResponse` |
| POST | `/api/v1/admin/outbound-orders` | `CreateOutboundOrder` | `*` | `OutboundOrder` |
| GET | `/api/v1/admin/stock-checks` | `ListStockChecks` | — | `ListStockChecksResponse` |
| POST | `/api/v1/admin/stock-checks` | `CreateStockCheck` | `*` | `StockCheck` |

## LogisticsService（物流域）

发货单、轨迹、运费模板

| 方法 | 路径 | RPC | 请求体 | 响应 |
| --- | --- | --- | --- | --- |
| POST | `/api/v1/admin/shipments` | `CreateShipment` | `*` | `Shipment` |
| GET | `/api/v1/admin/shipments` | `ListShipments` | — | `ListShipmentsResponse` |
| GET | `/api/v1/logistics/tracks` | `ListTracks` | — | `ListShipmentTracksResponse` |
| GET | `/api/v1/logistics/templates` | `ListTemplates` | — | `ListTemplatesResponse` |
| POST | `/api/v1/admin/logistics/templates` | `SaveTemplate` | `*` | `LogisticTemplate` |
| GET | `/api/v1/logistics/companies` | `ListLogisticsCompanies` | — | `ListLogisticsCompaniesResponse` |
| POST | `/api/v1/logistics/freight` | `CalculateFreight` | `*` | `CalculateFreightResponse` |
| GET | `/api/v1/logistics/ranges` | `ListDeliveryRanges` | — | `ListDeliveryRangesResponse` |
| POST | `/api/v1/admin/logistics/companies` | `SaveLogisticsCompany` | `*` | `LogisticsCompany` |
| POST | `/api/v1/admin/logistics/ranges` | `SaveDeliveryRange` | `*` | `DeliveryRange` |
| GET | `/api/v1/admin/return-shipments` | `ListReturnShipments` | — | `ListShipmentsResponse` |

## MarketingService（营销域）

优惠券领取核销、活动管理、结算试算

| 方法 | 路径 | RPC | 请求体 | 响应 |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/coupons` | `ListCoupons` | — | `ListCouponsResponse` |
| POST | `/api/v1/admin/coupons` | `SaveCoupon` | `*` | `Coupon` |
| GET | `/api/v1/users/coupons` | `ListUserCoupons` | — | `ListUserCouponsResponse` |
| GET | `/api/v1/promotions` | `ListPromotions` | — | `ListPromotionsResponse` |
| POST | `/api/v1/admin/promotions` | `SavePromotion` | `*` | `Promotion` |
| POST | `/api/v1/marketing/preview` | `PreviewCheckout` | `*` | `PreviewCheckoutResponse` |
| POST | `/api/v1/marketing/sign-in` | `SignIn` | `*` | `GetSignInStatusResponse` |
| GET | `/api/v1/marketing/sign-in` | `GetSignInStatus` | — | `GetSignInStatusResponse` |
| GET | `/api/v1/marketing/tasks` | `ListTasks` | — | `ListTasksResponse` |
| POST | `/api/v1/admin/promotion-sessions` | `SavePromotionSession` | `*` | `PromotionSession` |
| GET | `/api/v1/group-buys` | `ListGroupBuys` | — | `ListGroupBuysResponse` |
| POST | `/api/v1/admin/group-buys` | `SaveGroupBuy` | `*` | `GroupBuy` |
| GET | `/api/v1/marketing/levels` | `ListUserLevels` | — | `ListUserLevelsResponse` |

## NotificationService（通知域）

站内通知、短信验证码、审计日志、系统配置

| 方法 | 路径 | RPC | 请求体 | 响应 |
| --- | --- | --- | --- | --- |
| POST | `/api/v1/notifications/send` | `Send` | `*` | `OperationResult` |
| GET | `/api/v1/notifications` | `List` | — | `ListNotificationsResponse` |
| POST | `/api/v1/notifications/read-all` | `MarkAllRead` | `*` | `OperationResult` |
| GET | `/api/v1/notifications/unread-count` | `GetUnreadCount` | — | `UnreadCountResponse` |
| POST | `/api/v1/sms/send` | `SendSms` | `*` | `SendSmsResponse` |
| GET | `/api/v1/admin/sms-records` | `ListSmsRecords` | — | `ListSmsRecordsResponse` |
| GET | `/api/v1/admin/audit-logs` | `ListAuditLogs` | — | `ListAuditLogsResponse` |
| GET | `/api/v1/admin/settings` | `ListSystemSettings` | — | `ListSystemSettingsResponse` |
| PUT | `/api/v1/admin/settings` | `UpdateSystemSettings` | `*` | `ListSystemSettingsResponse` |
| GET | `/api/v1/admin/notification-templates` | `ListNotificationTemplates` | — | `ListNotificationTemplatesResponse` |
| POST | `/api/v1/admin/notification-templates` | `SaveNotificationTemplate` | `*` | `NotificationTemplate` |
| GET | `/api/v1/admin/sms-templates` | `ListSmsTemplates` | — | `ListSmsTemplatesResponse` |
| POST | `/api/v1/admin/sms-templates` | `SaveSmsTemplate` | `*` | `SmsTemplate` |
| GET | `/api/v1/admin/sensitive-words` | `ListSensitiveWords` | — | `ListSensitiveWordsResponse` |
| POST | `/api/v1/admin/sensitive-words` | `SaveSensitiveWord` | `*` | `SensitiveWord` |
| GET | `/api/v1/notifications/categories` | `ListNotificationCategories` | — | `ListNotificationCategoriesResponse` |

## OrderService（订单域）

下单、查询、状态流转、退款申请与审核、订单轨迹、后台统计

| 方法 | 路径 | RPC | 请求体 | 响应 |
| --- | --- | --- | --- | --- |
| POST | `/api/v1/orders` | `CreateOrder` | `*` | `Order` |
| GET | `/api/v1/orders` | `ListOrders` | — | `ListOrdersResponse` |
| GET | `/api/v1/admin/refunds` | `ListRefunds` | — | `ListRefundsResponse` |
| GET | `/api/v1/orders/count` | `GetOrderCount` | — | `OrderCountResponse` |
| GET | `/api/v1/admin/orders/stats` | `AdminOrderStats` | — | `AdminOrderStatsResponse` |
| GET | `/api/v1/after-sales` | `ListAfterSales` | — | `ListAfterSalesResponse` |
| GET | `/api/v1/refund-reasons` | `ListRefundReasons` | — | `ListRefundReasonsResponse` |
| GET | `/api/v1/admin/after-sales` | `AdminListAfterSales` | — | `ListAfterSalesResponse` |
| GET | `/api/v1/admin/orders` | `AdminListOrders` | — | `ListOrdersResponse` |
| GET | `/api/v1/admin/orders/stats/channels` | `AdminOrderStatsByChannel` | — | `AdminOrderStatsByChannelResponse` |
| GET | `/api/v1/admin/orders/stats/hours` | `AdminOrderStatsByHour` | — | `AdminOrderStatsByHourResponse` |
| GET | `/api/v1/admin/orders/stats/regions` | `AdminOrderStatsByRegion` | — | `AdminOrderStatsByRegionResponse` |
| GET | `/api/v1/admin/order-logs` | `AdminListOrderLogs` | — | `ListOrderLogsResponse` |
| POST | `/api/v1/admin/refund-reasons` | `SaveRefundReason` | `*` | `RefundReason` |

## PaymentService（支付域）

支付单创建、查询、回调、退款、后台列表与汇总

| 方法 | 路径 | RPC | 请求体 | 响应 |
| --- | --- | --- | --- | --- |
| POST | `/api/v1/payments` | `CreatePayment` | `*` | `Payment` |
| GET | `/api/v1/payments/query` | `QueryPayment` | — | `Payment` |
| POST | `/api/v1/payments/notify` | `Notify` | `*` | `OperationResult` |
| POST | `/api/v1/payments/refund` | `CreateRefund` | `*` | `PaymentRefund` |
| GET | `/api/v1/admin/payments` | `ListPayments` | — | `ListPaymentsResponse` |
| GET | `/api/v1/admin/payments/summary` | `Summary` | — | `PaymentSummaryResponse` |
| GET | `/api/v1/admin/pay-channels` | `ListPayChannels` | — | `ListPayChannelsResponse` |
| POST | `/api/v1/admin/pay-channels` | `SavePayChannel` | `*` | `PayChannel` |
| POST | `/api/v1/payments/recharge` | `CreateRecharge` | `*` | `RechargeOrder` |
| GET | `/api/v1/payments/recharges` | `ListRecharges` | — | `ListRechargesResponse` |
| GET | `/api/v1/payments/balance-logs` | `ListBalanceLogs` | — | `ListBalanceLogsResponse` |
| GET | `/api/v1/payments/recharge-config` | `GetRechargeConfig` | — | `RechargeConfig` |

## ProductService（商品域）

商品 SPU/SKU、上下架、轮播、素材库

| 方法 | 路径 | RPC | 请求体 | 响应 |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/products` | `ListProducts` | — | `ListProductsResponse` |
| POST | `/api/v1/admin/products` | `CreateProduct` | `*` | `Product` |
| PUT | `/api/v1/admin/products` | `UpdateProduct` | `*` | `Product` |
| POST | `/api/v1/admin/skus` | `SaveSku` | `*` | `ProductSku` |
| GET | `/api/v1/banners` | `ListBanners` | — | `ListBannersResponse` |
| POST | `/api/v1/admin/banners` | `SaveBanner` | `*` | `Banner` |
| GET | `/api/v1/admin/materials` | `ListMaterials` | — | `ListMaterialsResponse` |
| POST | `/api/v1/admin/materials` | `SaveMaterial` | `*` | `Material` |
| GET | `/api/v1/channels` | `ListChannels` | — | `ListChannelsResponse` |
| POST | `/api/v1/admin/channels` | `SaveChannel` | `*` | `Channel` |
| GET | `/api/v1/reviews/tags` | `ListReviewTags` | — | `ListReviewTagsResponse` |
| POST | `/api/v1/admin/review-tags` | `SaveReviewTag` | `*` | `ReviewTag` |
| GET | `/api/v1/guarantees` | `ListGuarantees` | — | `ListGuaranteesResponse` |
| POST | `/api/v1/admin/guarantees` | `SaveGuarantee` | `*` | `Guarantee` |

## CategoryService（分类域）

商品分类树的增删改查

| 方法 | 路径 | RPC | 请求体 | 响应 |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/categories` | `ListCategories` | — | `ListCategoriesResponse` |
| POST | `/api/v1/admin/categories` | `CreateCategory` | `*` | `Category` |
| PUT | `/api/v1/admin/categories` | `UpdateCategory` | `*` | `Category` |

## ReviewService（评价域）

商品评价列表、发表与后台审核

| 方法 | 路径 | RPC | 请求体 | 响应 |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/reviews` | `ListReviews` | — | `ListReviewsResponse` |
| POST | `/api/v1/reviews` | `CreateReview` | `*` | `Review` |
| POST | `/api/v1/questions` | `CreateQuestion` | `*` | `ProductQuestion` |
| GET | `/api/v1/admin/questions` | `ListQuestions` | — | `ListQuestionsResponse` |

## UserService（用户域）

注册登录、资料地址、收藏、积分、发票，以及后台用户/角色/权限/看板

| 方法 | 路径 | RPC | 请求体 | 响应 |
| --- | --- | --- | --- | --- |
| POST | `/api/v1/auth/register` | `Register` | `*` | `AuthResponse` |
| POST | `/api/v1/auth/login` | `Login` | `*` | `AuthResponse` |
| POST | `/api/v1/auth/wechat` | `LoginWithWeChat` | `*` | `AuthResponse` |
| POST | `/api/v1/auth/refresh` | `RefreshToken` | `*` | `AuthResponse` |
| POST | `/api/v1/auth/logout` | `Logout` | `*` | `OperationResult` |
| GET | `/api/v1/users/me` | `GetProfile` | — | `User` |
| PUT | `/api/v1/users/me` | `UpdateProfile` | `*` | `User` |
| POST | `/api/v1/users/password` | `ChangePassword` | `*` | `OperationResult` |
| GET | `/api/v1/users/addresses` | `ListAddresses` | — | `ListAddressesResponse` |
| POST | `/api/v1/users/addresses` | `SaveAddress` | `*` | `Address` |
| GET | `/api/v1/users/favorites` | `ListFavorites` | — | `ListFavoritesResponse` |
| POST | `/api/v1/users/favorites/toggle` | `ToggleFavorite` | `*` | `ToggleFavoriteResponse` |
| GET | `/api/v1/users/points-logs` | `ListPointsLogs` | — | `ListPointsLogsResponse` |
| GET | `/api/v1/users/invoices` | `ListInvoices` | — | `ListInvoicesResponse` |
| POST | `/api/v1/users/invoices` | `CreateInvoice` | `*` | `Invoice` |
| GET | `/api/v1/users/level` | `GetUserLevel` | — | `UserLevelInfo` |
| GET | `/api/v1/users/levels` | `ListUserLevels` | — | `ListUserLevelsResponse` |
| GET | `/api/v1/users/growth-logs` | `ListGrowthLogs` | — | `ListGrowthLogsResponse` |
| GET | `/api/v1/regions` | `ListRegions` | — | `ListRegionsResponse` |
| GET | `/api/v1/users/invoice-templates` | `ListInvoiceTemplates` | — | `ListInvoiceTemplatesResponse` |
| POST | `/api/v1/users/invoice-templates` | `SaveInvoiceTemplate` | `*` | `InvoiceTemplate` |
| GET | `/api/v1/users/notification-settings` | `GetNotificationSettings` | — | `UserNotificationSettings` |
| PUT | `/api/v1/users/notification-settings` | `UpdateNotificationSettings` | `*` | `UserNotificationSettings` |
| GET | `/api/v1/users/security` | `GetAccountSecurity` | — | `AccountSecurityInfo` |
| POST | `/api/v1/users/realname` | `RealNameAuth` | `*` | `User` |
| POST | `/api/v1/users/feedback` | `SubmitFeedback` | `*` | `OperationResult` |
| GET | `/api/v1/help/articles` | `ListHelpArticles` | — | `ListHelpArticlesResponse` |

## AdminService（后台用户域）

管理员登录、用户列表与状态、角色权限、系统看板、发票审核

| 方法 | 路径 | RPC | 请求体 | 响应 |
| --- | --- | --- | --- | --- |
| POST | `/api/v1/admin/auth/login` | `Login` | `*` | `AuthResponse` |
| GET | `/api/v1/admin/me` | `GetProfile` | — | `Admin` |
| PUT | `/api/v1/admin/me` | `UpdateProfile` | `*` | `Admin` |
| GET | `/api/v1/admin/users` | `ListUsers` | — | `AdminListUsersResponse` |
| GET | `/api/v1/admin/roles` | `ListRoles` | — | `AdminListRolesResponse` |
| POST | `/api/v1/admin/roles` | `SaveRole` | `*` | `Role` |
| GET | `/api/v1/admin/permissions` | `ListPermissions` | — | `AdminListPermissionsResponse` |
| GET | `/api/v1/admin/dashboard/overview` | `DashboardOverview` | — | `AdminDashboardOverviewResponse` |
| GET | `/api/v1/admin/invoices` | `ListInvoices` | — | `ListInvoicesResponse` |
| GET | `/api/v1/admin/feedbacks` | `ListFeedbacks` | — | `ListFeedbacksResponse` |
| POST | `/api/v1/admin/user-levels` | `SaveUserLevel` | `*` | `UserLevel` |

---

## 消息定义

完整消息定义见 `proto/shopstack/<pkg>/v1/<pkg>.proto`，下列为主要消息的字段一览。

### cart.v1

#### `CartItem`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `user_id` | `int64` | #2 |
| `product_id` | `int64` | #3 |
| `sku_id` | `int64` | #4 |
| `product_title` | `string` | #5 |
| `spec_text` | `string` | #6 |
| `image` | `string` | #7 |
| `price_cents` | `int64` | #8 |
| `quantity` | `int32` | #9 |
| `stock` | `int32` | #10 |
| `selected` | `bool` | #11 |
| `available` | `bool` | #12 |
| `subtotal_cents` | `int64` | #13 |
| `created_at` | `google.protobuf.Timestamp` | #14 |
| `updated_at` | `google.protobuf.Timestamp` | #15 |

#### `Cart`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `user_id` | `int64` | #1 |
| `items` | repeated `CartItem` | #2 |
| `total_count` | `int32` | #3 |
| `selected_count` | `int32` | #4 |
| `selected_amount_cents` | `int64` | #5 |
| `selected_discount_cents` | `int64` | #6 |
| `selected_payable_cents` | `int64` | #7 |

#### `GetCartRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `user_id` | `int64` | #1 |

#### `AddToCartRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `user_id` | `int64` | #1 |
| `product_id` | `int64` | #2 |
| `sku_id` | `int64` | #3 |
| `quantity` | `int32` | #4 |
| `selected` | `bool` | #5 |

#### `UpdateCartItemRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `user_id` | `int64` | #1 |
| `id` | `int64` | #2 |
| `quantity` | `int32` | #3 |
| `selected` | `bool` | #4 |

#### `RemoveCartItemRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `user_id` | `int64` | #1 |
| `id` | `int64` | #2 |

#### `ClearCartRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `user_id` | `int64` | #1 |

#### `SetAllSelectedRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `user_id` | `int64` | #1 |
| `selected` | `bool` | #2 |

#### `GetCartCountRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `user_id` | `int64` | #1 |

#### `GetCartCountResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `count` | `int32` | #1 |

### common.v1

#### `PageRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `page` | `int32` | #1 |
| `page_size` | `int32` | #2 |
| `order_by` | `string` | #3 |
| `order_dir` | `string` | #4 |

#### `PageMeta`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `page` | `int32` | #1 |
| `page_size` | `int32` | #2 |
| `total` | `int64` | #3 |
| `total_pages` | `int32` | #4 |

#### `Money`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `amount_cents` | `int64` | #1 |
| `currency` | `string` | #2 |

#### `Image`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `url` | `string` | #1 |
| `alt` | `string` | #2 |

#### `Address`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `receiver` | `string` | #2 |
| `phone` | `string` | #3 |
| `province` | `string` | #4 |
| `city` | `string` | #5 |
| `district` | `string` | #6 |
| `detail` | `string` | #7 |
| `postal_code` | `string` | #8 |
| `tag` | `string` | #9 |
| `is_default` | `bool` | #10 |

#### `ImageItem`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `url` | `string` | #1 |
| `alt` | `string` | #2 |
| `sort` | `int32` | #3 |

#### `IdRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |

#### `BatchIdsRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `ids` | repeated `int64` | #1 |

#### `OperationResult`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `success` | `bool` | #1 |
| `message` | `string` | #2 |

### inventory.v1

#### `Inventory`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `sku_id` | `int64` | #2 |
| `product_id` | `int64` | #3 |
| `sku_code` | `string` | #4 |
| `spec_text` | `string` | #5 |
| `total_stock` | `int32` | #6 |
| `available_stock` | `int32` | #7 |
| `locked_stock` | `int32` | #8 |
| `sold_stock` | `int32` | #9 |
| `safety_stock` | `int32` | #10 |
| `warehouse` | `string` | #11 |
| `updated_at` | `google.protobuf.Timestamp` | #12 |

#### `InventoryLog`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `sku_id` | `int64` | #2 |
| `product_id` | `int64` | #3 |
| `sku_code` | `string` | #4 |
| `change_type` | `int32` | #5 |
| `quantity` | `int32` | #6 |
| `before_stock` | `int32` | #7 |
| `after_stock` | `int32` | #8 |
| `biz_type` | `string` | #9 |
| `biz_id` | `string` | #10 |
| `operator` | `string` | #11 |
| `remark` | `string` | #12 |
| `created_at` | `google.protobuf.Timestamp` | #13 |

#### `GetStockRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `sku_id` | `int64` | #1 |

#### `BatchGetStockRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `sku_ids` | repeated `int64` | #1 |

#### `BatchGetStockResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `inventories` | repeated `Inventory` | #1 |

#### `ReserveStockRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `order_id` | `int64` | #1 |
| `items` | repeated `StockItem` | #2 |
| `biz_type` | `string` | #3 |

#### `StockItem`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `sku_id` | `int64` | #1 |
| `quantity` | `int32` | #2 |

#### `ReleaseStockRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `order_id` | `int64` | #1 |
| `items` | repeated `StockItem` | #2 |
| `reason` | `string` | #3 |

#### `DeductStockRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `order_id` | `int64` | #1 |
| `items` | repeated `StockItem` | #2 |

#### `AdjustStockRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `sku_id` | `int64` | #1 |
| `quantity` | `int32` | #2 |
| `reason` | `string` | #3 |
| `safety_stock` | `int32` | #4 |
| `warehouse` | `string` | #5 |

#### `ListInventoryLogsRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `page` | `shopstack.common.v1.PageRequest` | #1 |
| `sku_id` | `int64` | #2 |
| `product_id` | `int64` | #3 |
| `biz_id` | `string` | #4 |
| `change_type` | `int32` | #5 |

#### `ListInventoryLogsResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `logs` | repeated `InventoryLog` | #1 |
| `meta` | `shopstack.common.v1.PageMeta` | #2 |

#### `ListInventoriesRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `page` | `shopstack.common.v1.PageRequest` | #1 |
| `keyword` | `string` | #2 |
| `product_id` | `int64` | #3 |
| `low_stock_only` | `int32` | #4 |

#### `ListInventoriesResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `inventories` | repeated `Inventory` | #1 |
| `meta` | `shopstack.common.v1.PageMeta` | #2 |

#### `StockWarningRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `threshold` | `int32` | #1 |

#### `StockWarningResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `inventories` | repeated `Inventory` | #1 |
| `count` | `int32` | #2 |

#### `Warehouse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `code` | `string` | #2 |
| `name` | `string` | #3 |
| `address` | `string` | #4 |
| `contact` | `string` | #5 |
| `phone` | `string` | #6 |
| `enabled` | `bool` | #7 |
| `sort` | `int32` | #8 |
| `created_at` | `google.protobuf.Timestamp` | #9 |

#### `ListWarehousesRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `page` | `shopstack.common.v1.PageRequest` | #1 |
| `keyword` | `string` | #2 |

#### `ListWarehousesResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `warehouses` | repeated `Warehouse` | #1 |
| `meta` | `shopstack.common.v1.PageMeta` | #2 |

#### `SaveWarehouseRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `code` | `string` | #2 |
| `name` | `string` | #3 |
| `address` | `string` | #4 |
| `contact` | `string` | #5 |
| `phone` | `string` | #6 |
| `enabled` | `bool` | #7 |
| `sort` | `int32` | #8 |

#### `DeleteWarehouseRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |

#### `StockMoveItem`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `sku_id` | `int64` | #1 |
| `sku_code` | `string` | #2 |
| `spec_text` | `string` | #3 |
| `quantity` | `int32` | #4 |

#### `InboundOrder`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `inbound_no` | `string` | #2 |
| `warehouse_id` | `int64` | #3 |
| `warehouse_name` | `string` | #4 |
| `supplier` | `string` | #5 |
| `status` | `int32` | #6 |
| `total_quantity` | `int32` | #7 |
| `remark` | `string` | #8 |
| `operator` | `string` | #9 |
| `items` | repeated `StockMoveItem` | #10 |
| `created_at` | `google.protobuf.Timestamp` | #11 |

#### `ListInboundOrdersRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `page` | `shopstack.common.v1.PageRequest` | #1 |
| `status` | `int32` | #2 |
| `keyword` | `string` | #3 |

#### `ListInboundOrdersResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `inbound_orders` | repeated `InboundOrder` | #1 |
| `meta` | `shopstack.common.v1.PageMeta` | #2 |

#### `CreateInboundOrderRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `warehouse_id` | `int64` | #1 |
| `supplier` | `string` | #2 |
| `remark` | `string` | #3 |
| `items` | repeated `StockMoveItem` | #4 |

#### `OutboundOrder`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `outbound_no` | `string` | #2 |
| `warehouse_id` | `int64` | #3 |
| `warehouse_name` | `string` | #4 |
| `order_id` | `int64` | #5 |
| `order_no` | `string` | #6 |
| `status` | `int32` | #7 |
| `total_quantity` | `int32` | #8 |
| `remark` | `string` | #9 |
| `operator` | `string` | #10 |
| `items` | repeated `StockMoveItem` | #11 |
| `created_at` | `google.protobuf.Timestamp` | #12 |

#### `ListOutboundOrdersRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `page` | `shopstack.common.v1.PageRequest` | #1 |
| `status` | `int32` | #2 |
| `keyword` | `string` | #3 |

#### `ListOutboundOrdersResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `outbound_orders` | repeated `OutboundOrder` | #1 |
| `meta` | `shopstack.common.v1.PageMeta` | #2 |

#### `CreateOutboundOrderRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `warehouse_id` | `int64` | #1 |
| `order_id` | `int64` | #2 |
| `remark` | `string` | #3 |
| `items` | repeated `StockMoveItem` | #4 |

#### `StockCheck`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `check_no` | `string` | #2 |
| `warehouse_id` | `int64` | #3 |
| `warehouse_name` | `string` | #4 |
| `status` | `int32` | #5 |
| `total_count` | `int32` | #6 |
| `diff_count` | `int32` | #7 |
| `remark` | `string` | #8 |
| `operator` | `string` | #9 |
| `created_at` | `google.protobuf.Timestamp` | #10 |

#### `ListStockChecksRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `page` | `shopstack.common.v1.PageRequest` | #1 |
| `status` | `int32` | #2 |
| `keyword` | `string` | #3 |

#### `ListStockChecksResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `stock_checks` | repeated `StockCheck` | #1 |
| `meta` | `shopstack.common.v1.PageMeta` | #2 |

#### `CreateStockCheckRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `warehouse_id` | `int64` | #1 |
| `remark` | `string` | #2 |
| `items` | repeated `StockMoveItem` | #3 |

#### `GetStockCheckRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |

#### `StockCheckItem`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `stock_check_id` | `int64` | #2 |
| `sku_id` | `int64` | #3 |
| `sku_code` | `string` | #4 |
| `spec_text` | `string` | #5 |
| `book_quantity` | `int32` | #6 |
| `actual_quantity` | `int32` | #7 |
| `diff_quantity` | `int32` | #8 |

#### `StockCheckDetail`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `stock_check` | `StockCheck` | #1 |
| `items` | repeated `StockCheckItem` | #2 |

#### `ListStockCheckItemsResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `items` | repeated `StockCheckItem` | #1 |
| `meta` | `shopstack.common.v1.PageMeta` | #2 |

### logistics.v1

#### `Shipment`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `order_id` | `int64` | #2 |
| `order_no` | `string` | #3 |
| `tracking_no` | `string` | #4 |
| `company` | `string` | #5 |
| `company_code` | `string` | #6 |
| `status` | `shopstack.common.v1.ShipmentStatus` | #7 |
| `receiver` | `string` | #8 |
| `phone` | `string` | #9 |
| `address` | `string` | #10 |
| `freight_cents` | `int64` | #11 |
| `item_count` | `int32` | #12 |
| `shipped_at` | `google.protobuf.Timestamp` | #13 |
| `delivered_at` | `google.protobuf.Timestamp` | #14 |
| `created_at` | `google.protobuf.Timestamp` | #15 |
| `remark` | `string` | #16 |

#### `ShipmentTrack`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `shipment_id` | `int64` | #2 |
| `tracking_no` | `string` | #3 |
| `location` | `string` | #4 |
| `description` | `string` | #5 |
| `occurred_at` | `google.protobuf.Timestamp` | #6 |
| `sort` | `int32` | #7 |

#### `LogisticTemplate`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `name` | `string` | #2 |
| `company` | `string` | #3 |
| `company_code` | `string` | #4 |
| `freight_cents` | `int64` | #5 |
| `free_freight_amount_cents` | `int64` | #6 |
| `enabled` | `bool` | #7 |
| `sort` | `int32` | #8 |
| `regions` | `string` | #9 |

#### `GetShipmentRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `order_id` | `int64` | #1 |
| `user_id` | `int64` | #2 |

#### `CreateShipmentRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `order_id` | `int64` | #1 |
| `company` | `string` | #2 |
| `company_code` | `string` | #3 |
| `tracking_no` | `string` | #4 |
| `freight_cents` | `int64` | #5 |
| `remark` | `string` | #6 |

#### `ListShipmentsRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `page` | `shopstack.common.v1.PageRequest` | #1 |
| `status` | `int32` | #2 |
| `keyword` | `string` | #3 |
| `order_id` | `int64` | #4 |

#### `ListShipmentsResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `shipments` | repeated `Shipment` | #1 |
| `meta` | `shopstack.common.v1.PageMeta` | #2 |

#### `ListShipmentTracksRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `shipment_id` | `int64` | #1 |
| `order_id` | `int64` | #2 |

#### `ListShipmentTracksResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `tracks` | repeated `ShipmentTrack` | #1 |
| `shipment` | `Shipment` | #2 |

#### `ListTemplatesRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `templates` | repeated `LogisticTemplate` | #1 |

#### `SaveTemplateRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `name` | `string` | #2 |
| `company` | `string` | #3 |
| `company_code` | `string` | #4 |
| `freight_cents` | `int64` | #5 |
| `free_freight_amount_cents` | `int64` | #6 |
| `enabled` | `bool` | #7 |
| `sort` | `int32` | #8 |
| `regions` | `string` | #9 |

#### `DeleteTemplateRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |

#### `UpdateShipmentStatusRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `status` | `int32` | #2 |
| `location` | `string` | #3 |
| `description` | `string` | #4 |

#### `LogisticsCompany`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `name` | `string` | #2 |
| `code` | `string` | #3 |
| `logo` | `string` | #4 |
| `phone` | `string` | #5 |
| `enabled` | `bool` | #6 |
| `sort` | `int32` | #7 |
| `supports_cod` | `bool` | #8 |

#### `ListLogisticsCompaniesRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `page` | `shopstack.common.v1.PageRequest` | #1 |
| `keyword` | `string` | #2 |

#### `ListLogisticsCompaniesResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `companies` | repeated `LogisticsCompany` | #1 |
| `meta` | `shopstack.common.v1.PageMeta` | #2 |

#### `SaveLogisticsCompanyRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `name` | `string` | #2 |
| `code` | `string` | #3 |
| `logo` | `string` | #4 |
| `phone` | `string` | #5 |
| `enabled` | `bool` | #6 |
| `sort` | `int32` | #7 |
| `supports_cod` | `bool` | #8 |

#### `DeleteLogisticsCompanyRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |

#### `CalculateFreightRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `template_id` | `int64` | #1 |
| `amount_cents` | `int64` | #2 |
| `region` | `string` | #3 |
| `quantity` | `int32` | #4 |

#### `CalculateFreightResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `freight_cents` | `int64` | #1 |
| `free_freight_amount_cents` | `int64` | #2 |
| `free` | `bool` | #3 |
| `template_name` | `string` | #4 |
| `remark` | `string` | #5 |

#### `DeliveryRange`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `template_id` | `int64` | #2 |
| `template_name` | `string` | #3 |
| `regions` | `string` | #4 |
| `freight_cents` | `int64` | #5 |
| `free_freight_amount_cents` | `int64` | #6 |
| `enabled` | `bool` | #7 |

#### `ListDeliveryRangesRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `template_id` | `int64` | #1 |
| `page` | `shopstack.common.v1.PageRequest` | #2 |

#### `ListDeliveryRangesResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `ranges` | repeated `DeliveryRange` | #1 |
| `meta` | `shopstack.common.v1.PageMeta` | #2 |

#### `SaveDeliveryRangeRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `template_id` | `int64` | #2 |
| `regions` | `string` | #3 |
| `freight_cents` | `int64` | #4 |
| `free_freight_amount_cents` | `int64` | #5 |
| `enabled` | `bool` | #6 |

#### `GetShipmentByTrackingNoRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `tracking_no` | `string` | #1 |

### marketing.v1

#### `Coupon`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `name` | `string` | #2 |
| `code` | `string` | #3 |
| `type` | `shopstack.common.v1.CouponType` | #4 |
| `face_value_cents` | `int64` | #5 |
| `percent` | `int32` | #6 |
| `min_amount_cents` | `int64` | #7 |
| `max_discount_cents` | `int64` | #8 |
| `total_quantity` | `int64` | #9 |
| `received_quantity` | `int64` | #10 |
| `used_quantity` | `int64` | #11 |
| `per_user_limit` | `int64` | #12 |
| `start_time` | `int64` | #13 |
| `end_time` | `int64` | #14 |
| `category_id` | `int64` | #15 |
| `enabled` | `bool` | #16 |
| `created_at` | `google.protobuf.Timestamp` | #17 |

#### `UserCoupon`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `user_id` | `int64` | #2 |
| `coupon_id` | `int64` | #3 |
| `coupon` | `Coupon` | #4 |
| `status` | `shopstack.common.v1.UserCouponStatus` | #5 |
| `order_id` | `int64` | #6 |
| `received_at` | `google.protobuf.Timestamp` | #7 |
| `used_at` | `google.protobuf.Timestamp` | #8 |

#### `Promotion`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `name` | `string` | #2 |
| `description` | `string` | #3 |
| `type` | `int32` | #4 |
| `status` | `int32` | #5 |
| `start_time` | `int64` | #6 |
| `end_time` | `int64` | #7 |
| `min_amount_cents` | `int64` | #8 |
| `discount_cents` | `int64` | #9 |
| `percent` | `int32` | #10 |
| `product_id` | `int64` | #11 |
| `limit_per_user` | `int32` | #12 |
| `sold_count` | `int64` | #13 |
| `banner_image` | `string` | #14 |
| `created_at` | `google.protobuf.Timestamp` | #15 |

#### `ListCouponsRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `page` | `shopstack.common.v1.PageRequest` | #1 |
| `keyword` | `string` | #2 |
| `type` | `int32` | #3 |
| `enabled` | `bool` | #4 |
| `available` | `bool` | #5 |
| `min_amount_cents` | `int64` | #10 |
| `coupon_category` | `int32` | #11 |

#### `ListCouponsResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `coupons` | repeated `Coupon` | #1 |
| `meta` | `shopstack.common.v1.PageMeta` | #2 |

#### `SaveCouponRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `name` | `string` | #2 |
| `code` | `string` | #3 |
| `type` | `int32` | #4 |
| `face_value_cents` | `int64` | #5 |
| `percent` | `int32` | #6 |
| `min_amount_cents` | `int64` | #7 |
| `max_discount_cents` | `int64` | #8 |
| `total_quantity` | `int64` | #9 |
| `per_user_limit` | `int64` | #10 |
| `start_time` | `int64` | #11 |
| `end_time` | `int64` | #12 |
| `category_id` | `int64` | #13 |
| `enabled` | `bool` | #14 |

#### `DeleteCouponRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |

#### `ReceiveCouponRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `user_id` | `int64` | #1 |
| `coupon_id` | `int64` | #2 |

#### `ListUserCouponsRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `user_id` | `int64` | #1 |
| `status` | `int32` | #2 |
| `page` | `shopstack.common.v1.PageRequest` | #3 |

#### `ListUserCouponsResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `coupons` | repeated `UserCoupon` | #1 |
| `meta` | `shopstack.common.v1.PageMeta` | #2 |
| `available_count` | `int32` | #3 |

#### `ListPromotionsRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `page` | `shopstack.common.v1.PageRequest` | #1 |
| `status` | `int32` | #2 |
| `keyword` | `string` | #3 |
| `type` | `int32` | #4 |
| `product_id` | `int64` | #10 |
| `promotion_type` | `int32` | #11 |

#### `ListPromotionsResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `promotions` | repeated `Promotion` | #1 |
| `meta` | `shopstack.common.v1.PageMeta` | #2 |

#### `SavePromotionRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `name` | `string` | #2 |
| `description` | `string` | #3 |
| `type` | `int32` | #4 |
| `status` | `int32` | #5 |
| `start_time` | `int64` | #6 |
| `end_time` | `int64` | #7 |
| `min_amount_cents` | `int64` | #8 |
| `discount_cents` | `int64` | #9 |
| `percent` | `int32` | #10 |
| `product_id` | `int64` | #11 |
| `limit_per_user` | `int32` | #12 |
| `banner_image` | `string` | #13 |

#### `DeletePromotionRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |

#### `PreviewCheckoutRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `user_id` | `int64` | #1 |
| `items` | repeated `StockItem` | #2 |
| `address_id` | `int64` | #3 |
| `coupon_id` | `int64` | #4 |
| `points_used` | `int64` | #5 |

#### `StockItem`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `sku_id` | `int64` | #1 |
| `product_id` | `int64` | #2 |
| `quantity` | `int32` | #3 |
| `price_cents` | `int64` | #4 |

#### `PreviewCheckoutResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `total_amount_cents` | `int64` | #1 |
| `discount_cents` | `int64` | #2 |
| `coupon_discount_cents` | `int64` | #3 |
| `points_discount_cents` | `int64` | #4 |
| `freight_cents` | `int64` | #5 |
| `payable_cents` | `int64` | #6 |
| `available_coupons` | repeated `UserCoupon` | #7 |
| `active_promotions` | repeated `Promotion` | #8 |

#### `SignInRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `date` | `string` | #1 |
| `signed` | `bool` | #2 |
| `points` | `int32` | #3 |

#### `GetSignInStatusRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `signed_today` | `bool` | #1 |
| `continuous_days` | `int32` | #2 |
| `total_days` | `int32` | #3 |
| `points_awarded` | `int32` | #4 |
| `next_points` | `int32` | #5 |
| `calendar` | repeated `SignInCalendarDay` | #6 |

#### `MarketingTask`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `name` | `string` | #2 |
| `description` | `string` | #3 |
| `type` | `int32` | #4 |
| `target_count` | `int32` | #5 |
| `reward_points` | `int32` | #6 |
| `reward_coupon_id` | `int64` | #7 |
| `sort` | `int32` | #8 |
| `enabled` | `bool` | #9 |
| `icon` | `string` | #10 |

#### `UserTask`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `task_id` | `int64` | #1 |
| `name` | `string` | #2 |
| `description` | `string` | #3 |
| `type` | `int32` | #4 |
| `progress` | `int32` | #5 |
| `target_count` | `int32` | #6 |
| `completed` | `bool` | #7 |
| `claimed` | `bool` | #8 |
| `reward_points` | `int32` | #9 |
| `reward_coupon_id` | `int64` | #10 |
| `icon` | `string` | #11 |

#### `ListTasksRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `page` | `shopstack.common.v1.PageRequest` | #1 |

#### `ListTasksResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `tasks` | repeated `UserTask` | #1 |
| `meta` | `shopstack.common.v1.PageMeta` | #2 |

#### `ClaimTaskRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `task_id` | `int64` | #1 |

#### `PromotionProduct`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `title` | `string` | #2 |
| `image` | `string` | #3 |
| `min_price_cents` | `int64` | #4 |
| `max_price_cents` | `int64` | #5 |
| `stock_total` | `int32` | #6 |
| `sales` | `int32` | #7 |
| `status` | `int32` | #8 |

#### `GetPromotionRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |

#### `GetPromotionResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `promotion` | `Promotion` | #1 |
| `products` | repeated `PromotionProduct` | #2 |
| `sessions` | repeated `PromotionSession` | #3 |

#### `ListPromotionProductsRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `promotion_id` | `int64` | #1 |
| `page` | `shopstack.common.v1.PageRequest` | #2 |

#### `ListPromotionProductsResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `products` | repeated `PromotionProduct` | #1 |
| `meta` | `shopstack.common.v1.PageMeta` | #2 |

#### `PromotionSession`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `promotion_id` | `int64` | #2 |
| `name` | `string` | #3 |
| `start_time` | `int64` | #4 |
| `end_time` | `int64` | #5 |
| `stock` | `int32` | #6 |
| `sold_count` | `int32` | #7 |
| `status` | `int32` | #8 |

#### `ListPromotionSessionsRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `promotion_id` | `int64` | #1 |
| `page` | `shopstack.common.v1.PageRequest` | #2 |

#### `ListPromotionSessionsResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `sessions` | repeated `PromotionSession` | #1 |
| `meta` | `shopstack.common.v1.PageMeta` | #2 |

#### `SavePromotionSessionRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `promotion_id` | `int64` | #2 |
| `name` | `string` | #3 |
| `start_time` | `int64` | #4 |
| `end_time` | `int64` | #5 |
| `stock` | `int32` | #6 |

#### `GroupBuy`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `name` | `string` | #2 |
| `description` | `string` | #3 |
| `promotion_id` | `int64` | #4 |
| `product_id` | `int64` | #5 |
| `product_title` | `string` | #6 |
| `product_image` | `string` | #7 |
| `price_cents` | `int64` | #8 |
| `original_price_cents` | `int64` | #9 |
| `required_members` | `int32` | #10 |
| `joined_members` | `int32` | #11 |
| `group_size` | `int32` | #12 |
| `status` | `int32` | #13 |
| `start_time` | `int64` | #14 |
| `end_time` | `int64` | #15 |
| `banner_image` | `string` | #16 |

#### `GroupBuyMember`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `group_buy_id` | `int64` | #2 |
| `user_id` | `int64` | #3 |
| `user_nickname` | `string` | #4 |
| `joined_at` | `google.protobuf.Timestamp` | #5 |

#### `ListGroupBuysRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `page` | `shopstack.common.v1.PageRequest` | #1 |
| `keyword` | `string` | #2 |
| `status` | `int32` | #3 |

#### `ListGroupBuysResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `group_buys` | repeated `GroupBuy` | #1 |
| `meta` | `shopstack.common.v1.PageMeta` | #2 |

#### `GetGroupBuyRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |

#### `GetGroupBuyResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `group_buy` | `GroupBuy` | #1 |
| `members` | repeated `GroupBuyMember` | #2 |

#### `JoinGroupBuyRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `quantity` | `int32` | #2 |

#### `SaveGroupBuyRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `name` | `string` | #2 |
| `description` | `string` | #3 |
| `promotion_id` | `int64` | #4 |
| `product_id` | `int64` | #5 |
| `price_cents` | `int64` | #6 |
| `required_members` | `int32` | #7 |
| `start_time` | `int64` | #8 |
| `end_time` | `int64` | #9 |
| `banner_image` | `string` | #10 |

#### `MarketingUserLevel`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `name` | `string` | #2 |
| `level` | `int32` | #3 |
| `min_growth` | `int32` | #4 |
| `max_growth` | `int32` | #5 |
| `discount_percent` | `int32` | #6 |
| `icon` | `string` | #7 |
| `description` | `string` | #8 |
| `benefits` | repeated `string` | #9 |
| `sort` | `int32` | #10 |

#### `ListUserLevelsRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `levels` | repeated `MarketingUserLevel` | #1 |

### notification.v1

#### `Notification`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `user_id` | `int64` | #2 |
| `type` | `shopstack.common.v1.NotificationType` | #3 |
| `title` | `string` | #4 |
| `content` | `string` | #5 |
| `link` | `string` | #6 |
| `biz_id` | `int64` | #7 |
| `read` | `bool` | #8 |
| `created_at` | `google.protobuf.Timestamp` | #9 |
| `read_at` | `google.protobuf.Timestamp` | #10 |

#### `SendNotificationRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `user_id` | `int64` | #1 |
| `type` | `int32` | #2 |
| `title` | `string` | #3 |
| `content` | `string` | #4 |
| `link` | `string` | #5 |
| `biz_id` | `int64` | #6 |
| `user_ids` | repeated `int64` | #7 |

#### `ListNotificationsRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `user_id` | `int64` | #1 |
| `type` | `int32` | #2 |
| `unread_only` | `bool` | #3 |
| `page` | `shopstack.common.v1.PageRequest` | #4 |
| `category` | `int32` | #10 |

#### `ListNotificationsResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `notifications` | repeated `Notification` | #1 |
| `meta` | `shopstack.common.v1.PageMeta` | #2 |
| `unread_count` | `int32` | #3 |

#### `MarkReadRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `user_id` | `int64` | #1 |
| `id` | `int64` | #2 |

#### `MarkAllReadRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `user_id` | `int64` | #1 |

#### `UnreadCountRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `user_id` | `int64` | #1 |

#### `UnreadCountResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `count` | `int32` | #1 |

#### `SmsRecord`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `phone` | `string` | #2 |
| `code` | `string` | #3 |
| `scene` | `string` | #4 |
| `status` | `int32` | #5 |
| `error_message` | `string` | #6 |
| `send_count` | `int32` | #7 |
| `created_at` | `google.protobuf.Timestamp` | #8 |

#### `ListSmsRecordsRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `page` | `shopstack.common.v1.PageRequest` | #1 |
| `phone` | `string` | #2 |
| `scene` | `string` | #3 |

#### `ListSmsRecordsResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `records` | repeated `SmsRecord` | #1 |
| `meta` | `shopstack.common.v1.PageMeta` | #2 |

#### `SendSmsRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `phone` | `string` | #1 |
| `scene` | `string` | #2 |

#### `SendSmsResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `success` | `bool` | #1 |
| `code` | `string` | #2 |
| `expire_seconds` | `int32` | #3 |

#### `AuditLog`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `admin_id` | `int64` | #2 |
| `admin_name` | `string` | #3 |
| `module` | `string` | #4 |
| `action` | `string` | #5 |
| `target_type` | `string` | #6 |
| `target_id` | `string` | #7 |
| `detail` | `string` | #8 |
| `ip` | `string` | #9 |
| `user_agent` | `string` | #10 |
| `result` | `int32` | #11 |
| `error_message` | `string` | #12 |
| `created_at` | `google.protobuf.Timestamp` | #13 |

#### `ListAuditLogsRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `page` | `shopstack.common.v1.PageRequest` | #1 |
| `module` | `string` | #2 |
| `action` | `string` | #3 |
| `admin_id` | `int64` | #4 |
| `keyword` | `string` | #5 |
| `start_time` | `int64` | #6 |
| `end_time` | `int64` | #7 |

#### `ListAuditLogsResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `logs` | repeated `AuditLog` | #1 |
| `meta` | `shopstack.common.v1.PageMeta` | #2 |

#### `SystemSetting`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `key` | `string` | #2 |
| `value` | `string` | #3 |
| `name` | `string` | #4 |
| `group` | `string` | #5 |
| `description` | `string` | #6 |
| `value_type` | `string` | #7 |
| `updated_at` | `google.protobuf.Timestamp` | #8 |

#### `ListSystemSettingsRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `group` | `string` | #1 |

#### `ListSystemSettingsResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `settings` | repeated `SystemSetting` | #1 |

#### `UpdateSystemSettingsRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `group` | `string` | #1 |

#### `NotificationTemplate`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `code` | `string` | #2 |
| `name` | `string` | #3 |
| `type` | `int32` | #4 |
| `title` | `string` | #5 |
| `content` | `string` | #6 |
| `link` | `string` | #7 |
| `enabled` | `bool` | #8 |
| `updated_at` | `google.protobuf.Timestamp` | #9 |

#### `ListNotificationTemplatesRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `page` | `shopstack.common.v1.PageRequest` | #1 |
| `type` | `int32` | #2 |
| `keyword` | `string` | #3 |

#### `ListNotificationTemplatesResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `templates` | repeated `NotificationTemplate` | #1 |
| `meta` | `shopstack.common.v1.PageMeta` | #2 |

#### `SaveNotificationTemplateRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `code` | `string` | #2 |
| `name` | `string` | #3 |
| `type` | `int32` | #4 |
| `title` | `string` | #5 |
| `content` | `string` | #6 |
| `link` | `string` | #7 |
| `enabled` | `bool` | #8 |

#### `DeleteNotificationTemplateRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |

#### `SmsTemplate`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `code` | `string` | #2 |
| `name` | `string` | #3 |
| `content` | `string` | #4 |
| `enabled` | `bool` | #5 |
| `updated_at` | `google.protobuf.Timestamp` | #6 |

#### `ListSmsTemplatesRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `page` | `shopstack.common.v1.PageRequest` | #1 |
| `keyword` | `string` | #2 |

#### `ListSmsTemplatesResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `templates` | repeated `SmsTemplate` | #1 |
| `meta` | `shopstack.common.v1.PageMeta` | #2 |

#### `SaveSmsTemplateRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `code` | `string` | #2 |
| `name` | `string` | #3 |
| `content` | `string` | #4 |
| `enabled` | `bool` | #5 |

#### `DeleteSmsTemplateRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |

#### `SensitiveWord`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `word` | `string` | #2 |
| `category` | `int32` | #3 |
| `status` | `int32` | #4 |
| `created_at` | `google.protobuf.Timestamp` | #5 |

#### `ListSensitiveWordsRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `page` | `shopstack.common.v1.PageRequest` | #1 |
| `keyword` | `string` | #2 |
| `category` | `int32` | #3 |

#### `ListSensitiveWordsResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `words` | repeated `SensitiveWord` | #1 |
| `meta` | `shopstack.common.v1.PageMeta` | #2 |

#### `SaveSensitiveWordRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `word` | `string` | #2 |
| `category` | `int32` | #3 |
| `status` | `int32` | #4 |

#### `DeleteSensitiveWordRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |

#### `NotificationCategory`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `type` | `int32` | #1 |
| `name` | `string` | #2 |
| `icon` | `string` | #3 |
| `count` | `int32` | #4 |
| `unread_count` | `int32` | #5 |

#### `ListNotificationCategoriesRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `user_id` | `int64` | #1 |

#### `ListNotificationCategoriesResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `categories` | repeated `NotificationCategory` | #1 |

### order.v1

#### `OrderItem`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `order_id` | `int64` | #2 |
| `product_id` | `int64` | #3 |
| `sku_id` | `int64` | #4 |
| `product_title` | `string` | #5 |
| `spec_text` | `string` | #6 |
| `image` | `string` | #7 |
| `price_cents` | `int64` | #8 |
| `quantity` | `int32` | #9 |
| `subtotal_cents` | `int64` | #10 |
| `refunded_cents` | `int64` | #11 |
| `reviewed` | `bool` | #12 |

#### `Order`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `order_no` | `string` | #2 |
| `user_id` | `int64` | #3 |
| `user_nickname` | `string` | #4 |
| `status` | `shopstack.common.v1.OrderStatus` | #5 |
| `total_amount_cents` | `int64` | #6 |
| `discount_cents` | `int64` | #7 |
| `freight_cents` | `int64` | #8 |
| `payable_cents` | `int64` | #9 |
| `paid_cents` | `int64` | #10 |
| `refunded_cents` | `int64` | #11 |
| `item_count` | `int32` | #12 |
| `total_quantity` | `int32` | #13 |
| `address` | `shopstack.common.v1.Address` | #14 |
| `remark` | `string` | #15 |
| `payment_method` | `string` | #16 |
| `paid_at` | `google.protobuf.Timestamp` | #17 |
| `shipped_at` | `google.protobuf.Timestamp` | #18 |
| `completed_at` | `google.protobuf.Timestamp` | #19 |
| `cancelled_at` | `google.protobuf.Timestamp` | #20 |
| `created_at` | `google.protobuf.Timestamp` | #21 |
| `updated_at` | `google.protobuf.Timestamp` | #22 |
| `admin_remark` | `string` | #23 |
| `shipment_id` | `int64` | #24 |

#### `OrderDetail`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `order` | `Order` | #1 |
| `items` | repeated `OrderItem` | #2 |
| `logs` | repeated `OrderStatusLog` | #3 |
| `coupon_id` | `int64` | #4 |
| `coupon_name` | `string` | #5 |
| `payment_id` | `int64` | #6 |
| `shipment_id` | `int64` | #7 |
| `tracking_no` | `string` | #8 |
| `logistics_company` | `string` | #9 |
| `logistics_tracks` | repeated `string` | #10 |
| `can_cancel` | `bool` | #11 |
| `can_pay` | `bool` | #12 |
| `can_confirm` | `bool` | #13 |
| `can_refund` | `bool` | #14 |
| `can_review` | `bool` | #15 |

#### `OrderStatusLog`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `order_id` | `int64` | #2 |
| `from_status` | `int32` | #3 |
| `to_status` | `int32` | #4 |
| `action` | `string` | #5 |
| `operator` | `string` | #6 |
| `remark` | `string` | #7 |
| `created_at` | `google.protobuf.Timestamp` | #8 |

#### `Refund`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `refund_no` | `string` | #2 |
| `order_id` | `int64` | #3 |
| `order_no` | `string` | #4 |
| `user_id` | `int64` | #5 |
| `amount_cents` | `int64` | #6 |
| `reason` | `string` | #7 |
| `description` | `string` | #8 |
| `item_ids` | repeated `int64` | #9 |
| `status` | `int32` | #10 |
| `admin_remark` | `string` | #11 |
| `created_at` | `google.protobuf.Timestamp` | #12 |
| `processed_at` | `google.protobuf.Timestamp` | #13 |

#### `CreateOrderItem`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `product_id` | `int64` | #1 |
| `sku_id` | `int64` | #2 |
| `quantity` | `int32` | #3 |

#### `CreateOrderRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `user_id` | `int64` | #1 |
| `items` | repeated `CreateOrderItem` | #2 |
| `from_cart` | `bool` | #3 |
| `cart_item_ids` | repeated `int64` | #4 |
| `address_id` | `int64` | #5 |
| `coupon_id` | `int64` | #6 |
| `remark` | `string` | #7 |
| `payment_method` | `string` | #8 |
| `points_used` | `int64` | #9 |

#### `GetOrderRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `user_id` | `int64` | #2 |

#### `ListOrdersRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `page` | `shopstack.common.v1.PageRequest` | #1 |
| `user_id` | `int64` | #2 |
| `status` | `int32` | #3 |
| `keyword` | `string` | #4 |
| `start_time` | `int64` | #5 |
| `end_time` | `int64` | #6 |
| `payment_method` | `int32` | #10 |
| `refund_status` | `int32` | #11 |

#### `ListOrdersResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `orders` | repeated `Order` | #1 |
| `meta` | `shopstack.common.v1.PageMeta` | #2 |
| `pending_payment_count` | `int64` | #3 |
| `pending_shipment_count` | `int64` | #4 |
| `pending_receipt_count` | `int64` | #5 |
| `refunding_count` | `int64` | #6 |

#### `CancelOrderRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `order_id` | `int64` | #1 |
| `user_id` | `int64` | #2 |
| `reason` | `string` | #3 |

#### `ConfirmReceiptRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `order_id` | `int64` | #1 |
| `user_id` | `int64` | #2 |

#### `ApplyRefundRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `order_id` | `int64` | #1 |
| `user_id` | `int64` | #2 |
| `item_ids` | repeated `int64` | #3 |
| `amount_cents` | `int64` | #4 |
| `reason` | `string` | #5 |
| `description` | `string` | #6 |

#### `ListRefundsRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `page` | `shopstack.common.v1.PageRequest` | #1 |
| `status` | `int32` | #2 |
| `user_id` | `int64` | #3 |
| `keyword` | `string` | #4 |

#### `ListRefundsResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `refunds` | repeated `Refund` | #1 |
| `meta` | `shopstack.common.v1.PageMeta` | #2 |

#### `SetRefundStatusRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `status` | `int32` | #2 |
| `admin_remark` | `string` | #3 |

#### `AdminUpdateOrderRemarkRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `admin_remark` | `string` | #2 |

#### `ListOrderLogsRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `order_id` | `int64` | #1 |

#### `ListOrderLogsResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `logs` | repeated `OrderStatusLog` | #1 |

#### `OrderCountRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `user_id` | `int64` | #1 |

#### `OrderCountResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `pending_payment` | `int64` | #1 |
| `pending_shipment` | `int64` | #2 |
| `pending_receipt` | `int64` | #3 |
| `refunding` | `int64` | #4 |

#### `AdminOrderStatsRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `days` | `int32` | #1 |

#### `AdminOrderStatsResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `total_orders` | `int64` | #1 |
| `paid_orders` | `int64` | #2 |
| `pending_payment` | `int64` | #3 |
| `pending_shipment` | `int64` | #4 |
| `pending_receipt` | `int64` | #5 |
| `refunding` | `int64` | #6 |
| `cancelled` | `int64` | #7 |
| `completed` | `int64` | #8 |
| `total_revenue_cents` | `int64` | #9 |
| `today_revenue_cents` | `int64` | #10 |
| `today_orders` | `int64` | #11 |
| `total_users` | `int64` | #12 |
| `trend` | repeated `OrderTrendPoint` | #13 |
| `category_stats` | repeated `OrderCategoryStat` | #14 |
| `top_products` | repeated `OrderTopProduct` | #15 |

#### `OrderTrendPoint`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `date` | `string` | #1 |
| `order_count` | `int64` | #2 |
| `revenue_cents` | `int64` | #3 |
| `new_users` | `int64` | #4 |

#### `OrderCategoryStat`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `category_id` | `int64` | #1 |
| `category_name` | `string` | #2 |
| `sales_count` | `int64` | #3 |
| `revenue_cents` | `int64` | #4 |

#### `OrderTopProduct`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `product_id` | `int64` | #1 |
| `title` | `string` | #2 |
| `cover` | `string` | #3 |
| `sales_count` | `int64` | #4 |
| `revenue_cents` | `int64` | #5 |

#### `AfterSale`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `after_sale_no` | `string` | #2 |
| `order_id` | `int64` | #3 |
| `order_no` | `string` | #4 |
| `user_id` | `int64` | #5 |
| `user_nickname` | `string` | #6 |
| `type` | `int32` | #7 |
| `amount_cents` | `int64` | #8 |
| `reason` | `string` | #9 |
| `description` | `string` | #10 |
| `item_ids` | repeated `int64` | #11 |
| `status` | `int32` | #12 |
| `admin_remark` | `string` | #13 |
| `refund_id` | `int64` | #14 |
| `created_at` | `google.protobuf.Timestamp` | #15 |
| `processed_at` | `google.protobuf.Timestamp` | #16 |

#### `ListAfterSalesRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `user_id` | `int64` | #1 |
| `status` | `int32` | #2 |
| `type` | `int32` | #3 |
| `page` | `shopstack.common.v1.PageRequest` | #4 |

#### `ListAfterSalesResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `after_sales` | repeated `AfterSale` | #1 |
| `meta` | `shopstack.common.v1.PageMeta` | #2 |

#### `GetAfterSaleRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `user_id` | `int64` | #2 |

#### `AdminListAfterSalesRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `page` | `shopstack.common.v1.PageRequest` | #1 |
| `status` | `int32` | #2 |
| `type` | `int32` | #3 |
| `keyword` | `string` | #4 |

#### `SetAfterSaleStatusRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `status` | `int32` | #2 |
| `admin_remark` | `string` | #3 |

#### `RefundReason`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `name` | `string` | #2 |
| `type` | `int32` | #3 |
| `sort` | `int32` | #4 |
| `enabled` | `bool` | #5 |

#### `ListRefundReasonsRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `type` | `int32` | #1 |

#### `ListRefundReasonsResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `reasons` | repeated `RefundReason` | #1 |

#### `SaveRefundReasonRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `name` | `string` | #2 |
| `type` | `int32` | #3 |
| `sort` | `int32` | #4 |
| `enabled` | `bool` | #5 |

#### `AdminListOrdersRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `page` | `shopstack.common.v1.PageRequest` | #1 |
| `keyword` | `string` | #2 |
| `status` | `int32` | #3 |
| `payment_method` | `int32` | #4 |
| `user_id` | `int64` | #5 |
| `start_time` | `int64` | #6 |
| `end_time` | `int64` | #7 |

#### `AdminOrderStatsByChannelResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `channel_stats` | repeated `OrderChannelStat` | #1 |

#### `OrderChannelStat`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `channel` | `int32` | #1 |
| `channel_name` | `string` | #2 |
| `order_count` | `int64` | #3 |
| `amount_cents` | `int64` | #4 |

#### `AdminOrderStatsByHourResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `hour_stats` | repeated `OrderHourStat` | #1 |

#### `OrderHourStat`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `hour` | `int32` | #1 |
| `order_count` | `int64` | #2 |
| `amount_cents` | `int64` | #3 |

#### `AdminOrderStatsByRegionResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `region_stats` | repeated `OrderRegionStat` | #1 |

#### `OrderRegionStat`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `region` | `string` | #1 |
| `order_count` | `int64` | #2 |
| `amount_cents` | `int64` | #3 |

### payment.v1

#### `Payment`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `payment_no` | `string` | #2 |
| `order_id` | `int64` | #3 |
| `order_no` | `string` | #4 |
| `user_id` | `int64` | #5 |
| `amount_cents` | `int64` | #6 |
| `refunded_cents` | `int64` | #7 |
| `status` | `shopstack.common.v1.PaymentStatus` | #8 |
| `channel` | `shopstack.common.v1.PaymentChannel` | #9 |
| `transaction_id` | `string` | #10 |
| `prepay_id` | `string` | #11 |
| `fail_reason` | `string` | #13 |
| `paid_at` | `google.protobuf.Timestamp` | #14 |
| `created_at` | `google.protobuf.Timestamp` | #15 |
| `updated_at` | `google.protobuf.Timestamp` | #16 |

#### `PaymentRefund`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `refund_no` | `string` | #2 |
| `payment_id` | `int64` | #3 |
| `order_id` | `int64` | #4 |
| `amount_cents` | `int64` | #5 |
| `status` | `int32` | #6 |
| `reason` | `string` | #7 |
| `transaction_id` | `string` | #8 |
| `created_at` | `google.protobuf.Timestamp` | #9 |

#### `CreatePaymentRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `order_id` | `int64` | #1 |
| `user_id` | `int64` | #2 |
| `channel` | `int32` | #3 |
| `return_url` | `string` | #4 |

#### `QueryPaymentRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `payment_id` | `int64` | #1 |
| `order_id` | `int64` | #2 |
| `user_id` | `int64` | #3 |

#### `PaymentCallbackRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `payment_no` | `string` | #1 |
| `transaction_id` | `string` | #2 |
| `signature` | `string` | #3 |
| `raw_body` | `string` | #4 |
| `status` | `int32` | #5 |

#### `CreateRefundRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `payment_id` | `int64` | #1 |
| `order_id` | `int64` | #2 |
| `amount_cents` | `int64` | #3 |
| `reason` | `string` | #4 |

#### `ListPaymentsRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `page` | `shopstack.common.v1.PageRequest` | #1 |
| `status` | `int32` | #2 |
| `channel` | `int32` | #3 |
| `keyword` | `string` | #4 |
| `user_id` | `int64` | #5 |
| `start_time` | `int64` | #6 |
| `end_time` | `int64` | #7 |

#### `ListPaymentsResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `payments` | repeated `Payment` | #1 |
| `meta` | `shopstack.common.v1.PageMeta` | #2 |
| `total_amount_cents` | `int64` | #3 |
| `total_refunded_cents` | `int64` | #4 |

#### `PaymentSummaryRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `days` | `int32` | #1 |

#### `PaymentSummaryResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `today_count` | `int64` | #1 |
| `today_amount_cents` | `int64` | #2 |
| `total_count` | `int64` | #3 |
| `total_amount_cents` | `int64` | #4 |
| `refunded_amount_cents` | `int64` | #5 |
| `success_rate` | `int64` | #6 |
| `trend` | repeated `PaymentTrendPoint` | #7 |

#### `PaymentTrendPoint`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `date` | `string` | #1 |
| `count` | `int64` | #2 |
| `amount_cents` | `int64` | #3 |

#### `PayChannel`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `name` | `string` | #2 |
| `channel` | `int32` | #3 |
| `code` | `string` | #4 |
| `icon` | `string` | #5 |
| `enabled` | `bool` | #6 |
| `sort` | `int32` | #7 |
| `config` | `string` | #8 |
| `created_at` | `google.protobuf.Timestamp` | #9 |

#### `ListPayChannelsRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `page` | `shopstack.common.v1.PageRequest` | #1 |
| `channel` | `int32` | #2 |

#### `ListPayChannelsResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `channels` | repeated `PayChannel` | #1 |
| `meta` | `shopstack.common.v1.PageMeta` | #2 |

#### `SavePayChannelRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `name` | `string` | #2 |
| `channel` | `int32` | #3 |
| `code` | `string` | #4 |
| `icon` | `string` | #5 |
| `enabled` | `bool` | #6 |
| `sort` | `int32` | #7 |
| `config` | `string` | #8 |

#### `DeletePayChannelRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |

#### `RechargeOrder`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `recharge_no` | `string` | #2 |
| `user_id` | `int64` | #3 |
| `amount_cents` | `int64` | #4 |
| `bonus_cents` | `int64` | #5 |
| `status` | `int32` | #6 |
| `channel` | `int32` | #7 |
| `payment_no` | `string` | #8 |
| `paid_at` | `google.protobuf.Timestamp` | #9 |
| `created_at` | `google.protobuf.Timestamp` | #10 |

#### `CreateRechargeRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `amount_cents` | `int64` | #1 |
| `channel` | `int32` | #2 |

#### `ListRechargesRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `user_id` | `int64` | #1 |
| `page` | `shopstack.common.v1.PageRequest` | #2 |
| `status` | `int32` | #3 |

#### `ListRechargesResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `recharges` | repeated `RechargeOrder` | #1 |
| `meta` | `shopstack.common.v1.PageMeta` | #2 |

#### `BalanceLog`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `user_id` | `int64` | #2 |
| `change` | `int64` | #3 |
| `balance` | `int64` | #4 |
| `title` | `string` | #5 |
| `biz_type` | `string` | #6 |
| `created_at` | `google.protobuf.Timestamp` | #7 |

#### `ListBalanceLogsRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `user_id` | `int64` | #1 |
| `page` | `shopstack.common.v1.PageRequest` | #2 |

#### `ListBalanceLogsResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `logs` | repeated `BalanceLog` | #1 |
| `meta` | `shopstack.common.v1.PageMeta` | #2 |
| `current_balance` | `int64` | #3 |

#### `GetRechargeConfigRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `min_amount_cents` | `int64` | #1 |
| `max_amount_cents` | `int64` | #2 |
| `preset_amounts` | repeated `int64` | #3 |
| `register_bonus_cents` | `int64` | #4 |
| `first_recharge_bonus_desc` | `string` | #5 |

### product.v1

#### `Category`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `name` | `string` | #2 |
| `parent_id` | `int64` | #3 |
| `icon` | `string` | #4 |
| `description` | `string` | #5 |
| `sort` | `int32` | #6 |
| `visible` | `bool` | #7 |
| `product_count` | `int32` | #8 |
| `children` | repeated `Category` | #9 |

#### `Product`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `title` | `string` | #2 |
| `subtitle` | `string` | #3 |
| `cover` | `string` | #4 |
| `category_id` | `int64` | #5 |
| `category_name` | `string` | #6 |
| `min_price_cents` | `int64` | #7 |
| `max_price_cents` | `int64` | #8 |
| `sales_count` | `int64` | #9 |
| `stock_total` | `int32` | #10 |
| `status` | `shopstack.common.v1.ProductStatus` | #11 |
| `description` | `string` | #12 |
| `tags` | repeated `string` | #13 |
| `created_at` | `google.protobuf.Timestamp` | #14 |
| `updated_at` | `google.protobuf.Timestamp` | #15 |

#### `ProductSku`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `product_id` | `int64` | #2 |
| `sku_code` | `string` | #3 |
| `spec_text` | `string` | #4 |
| `price_cents` | `int64` | #6 |
| `original_price_cents` | `int64` | #7 |
| `stock` | `int32` | #8 |
| `locked_stock` | `int32` | #9 |
| `image` | `string` | #10 |
| `sort` | `int32` | #11 |
| `sales_count` | `int32` | #12 |
| `enabled` | `bool` | #13 |
| `weight_grams` | `int64` | #14 |

#### `ProductDetail`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `product` | `Product` | #1 |
| `skus` | repeated `ProductSku` | #2 |
| `images` | repeated `shopstack.common.v1.ImageItem` | #3 |
| `attributes` | repeated `ProductAttribute` | #4 |
| `reviews` | repeated `Review` | #5 |
| `review_count` | `int32` | #6 |
| `review_rating` | `double` | #7 |
| `related` | repeated `Product` | #8 |
| `review_summary` | `ReviewSummary` | #9 |

#### `ProductAttribute`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `product_id` | `int64` | #2 |
| `name` | `string` | #3 |
| `value` | `string` | #4 |
| `sort` | `int32` | #5 |

#### `Banner`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `title` | `string` | #2 |
| `image` | `string` | #3 |
| `link` | `string` | #4 |
| `sort` | `int32` | #5 |
| `position` | `string` | #6 |
| `visible` | `bool` | #7 |
| `created_at` | `google.protobuf.Timestamp` | #8 |

#### `Review`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `product_id` | `int64` | #2 |
| `product_title` | `string` | #3 |
| `user_id` | `int64` | #4 |
| `user_nickname` | `string` | #5 |
| `user_avatar` | `string` | #6 |
| `rating` | `int32` | #7 |
| `content` | `string` | #8 |
| `images` | repeated `string` | #9 |
| `sku_id` | `int32` | #10 |
| `sku_text` | `string` | #11 |
| `status` | `shopstack.common.v1.ReviewStatus` | #12 |
| `admin_reply` | `string` | #13 |
| `like_count` | `int32` | #14 |
| `created_at` | `google.protobuf.Timestamp` | #15 |

#### `ReviewSummary`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `total` | `int32` | #1 |
| `good` | `int32` | #2 |
| `medium` | `int32` | #3 |
| `bad` | `int32` | #4 |
| `average` | `double` | #5 |

#### `ListProductsRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `page` | `shopstack.common.v1.PageRequest` | #1 |
| `keyword` | `string` | #2 |
| `category_id` | `int64` | #3 |
| `status` | `int32` | #4 |
| `min_price_cents` | `int64` | #5 |
| `max_price_cents` | `int64` | #6 |
| `sort` | `string` | #7 |
| `only_in_stock` | `bool` | #8 |
| `tags` | repeated `string` | #9 |
| `channel_id` | `int64` | #10 |
| `sale_type` | `int32` | #11 |

#### `ListProductsResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `products` | repeated `Product` | #1 |
| `meta` | `shopstack.common.v1.PageMeta` | #2 |

#### `GetProductRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |

#### `SaveProductRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `title` | `string` | #2 |
| `subtitle` | `string` | #3 |
| `cover` | `string` | #4 |
| `category_id` | `int64` | #5 |
| `min_price_cents` | `int64` | #6 |
| `max_price_cents` | `int64` | #7 |
| `description` | `string` | #8 |
| `tags` | repeated `string` | #9 |
| `status` | `int32` | #10 |
| `images` | repeated `shopstack.common.v1.ImageItem` | #11 |
| `attributes` | repeated `ProductAttribute` | #12 |
| `skus` | repeated `ProductSku` | #13 |

#### `DeleteProductRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |

#### `SetProductStatusRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `status` | `int32` | #2 |

#### `SaveSkuRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `product_id` | `int64` | #2 |
| `sku_code` | `string` | #3 |
| `spec_text` | `string` | #4 |
| `price_cents` | `int64` | #6 |
| `original_price_cents` | `int64` | #7 |
| `stock` | `int32` | #8 |
| `image` | `string` | #9 |
| `sort` | `int32` | #10 |
| `enabled` | `bool` | #11 |
| `weight_grams` | `int64` | #12 |

#### `ListCategoriesRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `parent_id` | `int64` | #1 |
| `tree` | `bool` | #2 |

#### `ListCategoriesResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `categories` | repeated `Category` | #1 |

#### `SaveCategoryRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `name` | `string` | #2 |
| `parent_id` | `int64` | #3 |
| `icon` | `string` | #4 |
| `description` | `string` | #5 |
| `sort` | `int32` | #6 |
| `visible` | `bool` | #7 |

#### `DeleteCategoryRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |

#### `ListBannersRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `position` | `string` | #1 |

#### `ListBannersResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `banners` | repeated `Banner` | #1 |

#### `SaveBannerRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `title` | `string` | #2 |
| `image` | `string` | #3 |
| `link` | `string` | #4 |
| `sort` | `int32` | #5 |
| `position` | `string` | #6 |
| `visible` | `bool` | #7 |

#### `DeleteBannerRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |

#### `ListReviewsRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `page` | `shopstack.common.v1.PageRequest` | #1 |
| `product_id` | `int64` | #2 |
| `status` | `int32` | #3 |
| `user_id` | `int64` | #4 |
| `keyword` | `string` | #5 |
| `filter` | `int32` | #10 |
| `sku_id` | `int64` | #11 |

#### `ListReviewsResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `reviews` | repeated `Review` | #1 |
| `meta` | `shopstack.common.v1.PageMeta` | #2 |
| `summary` | `ReviewSummary` | #3 |

#### `CreateReviewRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `user_id` | `int64` | #1 |
| `product_id` | `int64` | #2 |
| `sku_id` | `int64` | #3 |
| `rating` | `int32` | #4 |
| `content` | `string` | #5 |
| `images` | repeated `string` | #6 |

#### `SetReviewStatusRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `status` | `int32` | #2 |
| `admin_reply` | `string` | #3 |

#### `ListProductAttributesRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `product_id` | `int64` | #1 |

#### `Material`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `name` | `string` | #2 |
| `url` | `string` | #3 |
| `type` | `string` | #4 |
| `size` | `int64` | #5 |
| `folder` | `string` | #6 |
| `sort` | `int32` | #7 |
| `created_at` | `google.protobuf.Timestamp` | #8 |

#### `ListMaterialsRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `page` | `shopstack.common.v1.PageRequest` | #1 |
| `keyword` | `string` | #2 |
| `type` | `string` | #3 |
| `folder` | `string` | #4 |

#### `ListMaterialsResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `materials` | repeated `Material` | #1 |
| `meta` | `shopstack.common.v1.PageMeta` | #2 |

#### `SaveMaterialRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `name` | `string` | #2 |
| `url` | `string` | #3 |
| `type` | `string` | #4 |
| `size` | `int64` | #5 |
| `folder` | `string` | #6 |
| `sort` | `int32` | #7 |

#### `DeleteMaterialRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |

#### `Channel`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `name` | `string` | #2 |
| `code` | `string` | #3 |
| `icon` | `string` | #4 |
| `banner_url` | `string` | #5 |
| `description` | `string` | #6 |
| `sort` | `int32` | #7 |
| `type` | `int32` | #8 |
| `status` | `int32` | #9 |
| `product_count` | `int32` | #10 |
| `created_at` | `google.protobuf.Timestamp` | #11 |

#### `ListChannelsRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `page` | `shopstack.common.v1.PageRequest` | #1 |
| `keyword` | `string` | #2 |
| `type` | `int32` | #3 |

#### `ListChannelsResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `channels` | repeated `Channel` | #1 |
| `meta` | `shopstack.common.v1.PageMeta` | #2 |

#### `GetChannelRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |

#### `ListChannelProductsRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `channel_id` | `int64` | #1 |
| `page` | `shopstack.common.v1.PageRequest` | #2 |
| `keyword` | `string` | #3 |
| `sort` | `string` | #4 |

#### `ListChannelProductsResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `channel` | `Channel` | #1 |
| `products` | repeated `Product` | #2 |
| `meta` | `shopstack.common.v1.PageMeta` | #3 |

#### `SaveChannelRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `name` | `string` | #2 |
| `code` | `string` | #3 |
| `icon` | `string` | #4 |
| `banner_url` | `string` | #5 |
| `description` | `string` | #6 |
| `sort` | `int32` | #7 |
| `type` | `int32` | #8 |
| `status` | `int32` | #9 |

#### `DeleteChannelRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |

#### `ReviewTag`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `name` | `string` | #2 |
| `sort` | `int32` | #3 |
| `enabled` | `bool` | #4 |

#### `ListReviewTagsRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `page` | `shopstack.common.v1.PageRequest` | #1 |
| `keyword` | `string` | #2 |

#### `ListReviewTagsResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `tags` | repeated `ReviewTag` | #1 |
| `meta` | `shopstack.common.v1.PageMeta` | #2 |

#### `SaveReviewTagRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `name` | `string` | #2 |
| `sort` | `int32` | #3 |
| `enabled` | `bool` | #4 |

#### `DeleteReviewTagRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |

#### `Guarantee`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `name` | `string` | #2 |
| `icon` | `string` | #3 |
| `description` | `string` | #4 |
| `sort` | `int32` | #5 |
| `enabled` | `bool` | #6 |

#### `ListGuaranteesRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `page` | `shopstack.common.v1.PageRequest` | #1 |

#### `ListGuaranteesResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `guarantees` | repeated `Guarantee` | #1 |
| `meta` | `shopstack.common.v1.PageMeta` | #2 |

#### `SaveGuaranteeRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `name` | `string` | #2 |
| `icon` | `string` | #3 |
| `description` | `string` | #4 |
| `sort` | `int32` | #5 |
| `enabled` | `bool` | #6 |

#### `DeleteGuaranteeRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |

#### `ListProductParamsRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `product_id` | `int64` | #1 |

#### `ListProductParamsResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `params` | repeated `ProductAttribute` | #1 |

#### `ProductQuestion`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `product_id` | `int64` | #2 |
| `product_title` | `string` | #3 |
| `user_id` | `int64` | #4 |
| `user_nickname` | `string` | #5 |
| `content` | `string` | #6 |
| `images` | repeated `string` | #7 |
| `reply` | `string` | #8 |
| `reply_at` | `string` | #9 |
| `created_at` | `google.protobuf.Timestamp` | #10 |

#### `ListProductQuestionsRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `product_id` | `int64` | #1 |
| `page` | `shopstack.common.v1.PageRequest` | #2 |

#### `ListProductQuestionsResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `questions` | repeated `ProductQuestion` | #1 |
| `meta` | `shopstack.common.v1.PageMeta` | #2 |

#### `CreateQuestionRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `product_id` | `int64` | #1 |
| `content` | `string` | #2 |
| `images` | repeated `string` | #3 |

#### `AnswerQuestionRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `reply` | `string` | #2 |

#### `ListQuestionsRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `page` | `shopstack.common.v1.PageRequest` | #1 |
| `keyword` | `string` | #2 |
| `product_id` | `int64` | #3 |

#### `ListQuestionsResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `questions` | repeated `ProductQuestion` | #1 |
| `meta` | `shopstack.common.v1.PageMeta` | #2 |

### user.v1

#### `User`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `username` | `string` | #2 |
| `nickname` | `string` | #3 |
| `avatar` | `string` | #4 |
| `phone` | `string` | #5 |
| `email` | `string` | #6 |
| `gender` | `shopstack.common.v1.Gender` | #7 |
| `birthday` | `string` | #8 |
| `points` | `int32` | #9 |
| `balance_cents` | `int64` | #10 |
| `status` | `shopstack.common.v1.UserStatus` | #11 |
| `wechat_openid` | `string` | #12 |
| `created_at` | `google.protobuf.Timestamp` | #13 |
| `last_login_at` | `google.protobuf.Timestamp` | #14 |
| `level` | `int32` | #15 |
| `growth` | `int32` | #16 |
| `real_name` | `string` | #17 |
| `realname_status` | `int32` | #18 |

#### `Admin`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `username` | `string` | #2 |
| `real_name` | `string` | #3 |
| `avatar` | `string` | #4 |
| `email` | `string` | #5 |
| `phone` | `string` | #6 |
| `role_ids` | repeated `int64` | #7 |
| `role_names` | repeated `string` | #8 |
| `status` | `int32` | #9 |
| `created_at` | `google.protobuf.Timestamp` | #10 |
| `last_login_at` | `google.protobuf.Timestamp` | #11 |

#### `Role`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `name` | `string` | #2 |
| `code` | `string` | #3 |
| `description` | `string` | #4 |
| `permission_ids` | repeated `int64` | #5 |
| `permission_codes` | repeated `string` | #6 |
| `user_count` | `int32` | #7 |
| `created_at` | `google.protobuf.Timestamp` | #8 |

#### `Permission`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `name` | `string` | #2 |
| `code` | `string` | #3 |
| `group` | `string` | #4 |
| `type` | `string` | #5 |
| `parent_code` | `string` | #6 |
| `sort` | `int32` | #7 |

#### `AuthResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `access_token` | `string` | #1 |
| `refresh_token` | `string` | #2 |
| `expires_in` | `int64` | #3 |
| `token_type` | `string` | #4 |
| `user` | `User` | #5 |
| `admin` | `Admin` | #6 |
| `permissions` | repeated `string` | #7 |

#### `RegisterRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `username` | `string` | #1 |
| `password` | `string` | #2 |
| `phone` | `string` | #3 |
| `nickname` | `string` | #4 |
| `sms_code` | `string` | #5 |

#### `LoginRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `username` | `string` | #1 |
| `password` | `string` | #2 |

#### `WeChatLoginRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `code` | `string` | #1 |
| `nickname` | `string` | #2 |
| `avatar` | `string` | #3 |

#### `RefreshTokenRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `refresh_token` | `string` | #1 |

#### `ChangePasswordRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `old_password` | `string` | #1 |
| `new_password` | `string` | #2 |

#### `GetProfileRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `user_id` | `int64` | #1 |

#### `UpdateProfileRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `user_id` | `int64` | #1 |
| `nickname` | `string` | #2 |
| `avatar` | `string` | #3 |
| `email` | `string` | #4 |
| `gender` | `shopstack.common.v1.Gender` | #5 |
| `birthday` | `string` | #6 |

#### `ListAddressesRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `user_id` | `int64` | #1 |

#### `ListAddressesResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `addresses` | repeated `shopstack.common.v1.Address` | #1 |

#### `SaveAddressRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `user_id` | `int64` | #1 |
| `id` | `int64` | #2 |
| `receiver` | `string` | #3 |
| `phone` | `string` | #4 |
| `province` | `string` | #5 |
| `city` | `string` | #6 |
| `district` | `string` | #7 |
| `detail` | `string` | #8 |
| `postal_code` | `string` | #9 |
| `tag` | `string` | #10 |
| `is_default` | `bool` | #11 |

#### `DeleteAddressRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `user_id` | `int64` | #1 |
| `id` | `int64` | #2 |

#### `SetDefaultAddressRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `user_id` | `int64` | #1 |
| `id` | `int64` | #2 |

#### `ListFavoritesRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `user_id` | `int64` | #1 |
| `page` | `shopstack.common.v1.PageRequest` | #2 |

#### `ListFavoritesResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `products` | repeated `FavoriteProduct` | #1 |
| `meta` | `shopstack.common.v1.PageMeta` | #2 |

#### `FavoriteProduct`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `product_id` | `int64` | #2 |
| `title` | `string` | #3 |
| `cover` | `string` | #4 |
| `price_cents` | `int64` | #5 |
| `created_at` | `google.protobuf.Timestamp` | #6 |

#### `ToggleFavoriteRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `user_id` | `int64` | #1 |
| `product_id` | `int64` | #2 |

#### `ToggleFavoriteResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `favorited` | `bool` | #1 |

#### `PointsLog`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `user_id` | `int64` | #2 |
| `title` | `string` | #3 |
| `change` | `int32` | #4 |
| `balance` | `int32` | #5 |
| `biz_type` | `string` | #6 |
| `biz_id` | `string` | #7 |
| `created_at` | `google.protobuf.Timestamp` | #8 |

#### `ListPointsLogsRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `user_id` | `int64` | #1 |
| `page` | `shopstack.common.v1.PageRequest` | #2 |

#### `ListPointsLogsResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `logs` | repeated `PointsLog` | #1 |
| `meta` | `shopstack.common.v1.PageMeta` | #2 |
| `current_points` | `int32` | #3 |

#### `Invoice`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `user_id` | `int64` | #2 |
| `order_no` | `string` | #3 |
| `title` | `string` | #4 |
| `tax_no` | `string` | #5 |
| `type` | `string` | #6 |
| `email` | `string` | #7 |
| `amount_cents` | `int64` | #8 |
| `status` | `int32` | #9 |
| `invoice_url` | `string` | #10 |
| `remark` | `string` | #11 |
| `created_at` | `google.protobuf.Timestamp` | #12 |

#### `ListInvoicesRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `user_id` | `int64` | #1 |
| `page` | `shopstack.common.v1.PageRequest` | #2 |
| `status` | `int32` | #3 |

#### `SetInvoiceStatusRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `status` | `int32` | #2 |
| `invoice_url` | `string` | #3 |
| `remark` | `string` | #4 |

#### `ListInvoicesResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `invoices` | repeated `Invoice` | #1 |
| `meta` | `shopstack.common.v1.PageMeta` | #2 |

#### `CreateInvoiceRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `user_id` | `int64` | #1 |
| `order_no` | `string` | #2 |
| `title` | `string` | #3 |
| `tax_no` | `string` | #4 |
| `type` | `string` | #5 |
| `email` | `string` | #6 |
| `amount_cents` | `int64` | #7 |
| `remark` | `string` | #8 |

#### `AdminLoginRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `username` | `string` | #1 |
| `password` | `string` | #2 |

#### `AdminListUsersRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `page` | `shopstack.common.v1.PageRequest` | #1 |
| `keyword` | `string` | #2 |
| `status` | `int32` | #3 |
| `level` | `int32` | #10 |

#### `AdminListUsersResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `users` | repeated `User` | #1 |
| `meta` | `shopstack.common.v1.PageMeta` | #2 |

#### `AdminUpdateUserStatusRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `user_id` | `int64` | #1 |
| `status` | `int32` | #2 |
| `reason` | `string` | #3 |

#### `AdminListRolesRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `roles` | repeated `Role` | #1 |

#### `SaveRoleRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `name` | `string` | #2 |
| `code` | `string` | #3 |
| `description` | `string` | #4 |
| `permission_ids` | repeated `int64` | #5 |

#### `DeleteRoleRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |

#### `AdminListPermissionsRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `permissions` | repeated `Permission` | #1 |

#### `AdminUpdateProfileRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `admin_id` | `int64` | #1 |
| `real_name` | `string` | #2 |
| `avatar` | `string` | #3 |
| `email` | `string` | #4 |
| `phone` | `string` | #5 |

#### `AdminDashboardOverviewRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `days` | `int32` | #1 |

#### `AdminDashboardOverviewResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `total_users` | `int64` | #1 |
| `new_users` | `int64` | #2 |
| `total_products` | `int64` | #3 |
| `on_shelf_products` | `int64` | #4 |
| `total_orders` | `int64` | #5 |
| `pending_shipment` | `int64` | #6 |
| `paid_orders` | `int64` | #7 |
| `total_revenue_cents` | `int64` | #8 |
| `today_revenue_cents` | `int64` | #9 |
| `pending_refunds` | `int64` | #10 |
| `trend` | repeated `AdminTrendPoint` | #11 |
| `category_stats` | repeated `AdminCategoryStat` | #12 |
| `top_products` | repeated `AdminTopProduct` | #13 |

#### `AdminTrendPoint`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `date` | `string` | #1 |
| `order_count` | `int64` | #2 |
| `revenue_cents` | `int64` | #3 |
| `new_users` | `int64` | #4 |

#### `AdminCategoryStat`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `category_id` | `int64` | #1 |
| `category_name` | `string` | #2 |
| `sales_count` | `int64` | #3 |
| `revenue_cents` | `int64` | #4 |

#### `AdminTopProduct`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `product_id` | `int64` | #1 |
| `title` | `string` | #2 |
| `cover` | `string` | #3 |
| `sales_count` | `int64` | #4 |
| `revenue_cents` | `int64` | #5 |

#### `UserLevel`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `name` | `string` | #2 |
| `level` | `int32` | #3 |
| `min_growth` | `int32` | #4 |
| `max_growth` | `int32` | #5 |
| `discount_percent` | `int32` | #6 |
| `icon` | `string` | #7 |
| `description` | `string` | #8 |
| `benefits` | repeated `string` | #9 |
| `sort` | `int32` | #10 |

#### `GetUserLevelRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `user_id` | `int64` | #1 |

#### `UserLevelInfo`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `level` | `int32` | #1 |
| `level_name` | `string` | #2 |
| `growth` | `int32` | #3 |
| `current_min_growth` | `int32` | #4 |
| `next_min_growth` | `int32` | #5 |
| `growth_to_next` | `int32` | #6 |
| `discount_percent` | `int32` | #7 |
| `next_level_name` | `string` | #8 |
| `levels` | repeated `UserLevel` | #9 |

#### `ListUserLevelsRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `levels` | repeated `UserLevel` | #1 |

#### `ListGrowthLogsRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `user_id` | `int64` | #1 |
| `page` | `shopstack.common.v1.PageRequest` | #2 |

#### `GrowthLog`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `user_id` | `int64` | #2 |
| `change` | `int32` | #3 |
| `balance` | `int32` | #4 |
| `title` | `string` | #5 |
| `biz_type` | `string` | #6 |
| `created_at` | `google.protobuf.Timestamp` | #7 |

#### `ListGrowthLogsResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `logs` | repeated `GrowthLog` | #1 |
| `meta` | `shopstack.common.v1.PageMeta` | #2 |
| `current_growth` | `int32` | #3 |

#### `SaveUserLevelRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `name` | `string` | #2 |
| `level` | `int32` | #3 |
| `min_growth` | `int32` | #4 |
| `max_growth` | `int32` | #5 |
| `discount_percent` | `int32` | #6 |
| `icon` | `string` | #7 |
| `description` | `string` | #8 |
| `benefits` | repeated `string` | #9 |
| `sort` | `int32` | #10 |

#### `Region`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `parent_id` | `int64` | #2 |
| `name` | `string` | #3 |
| `code` | `string` | #4 |
| `level` | `int32` | #5 |
| `sort` | `int32` | #6 |

#### `ListRegionsRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `parent_id` | `int64` | #1 |
| `tree` | `bool` | #2 |

#### `ListRegionsResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `regions` | repeated `Region` | #1 |

#### `InvoiceTemplate`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `user_id` | `int64` | #2 |
| `title` | `string` | #3 |
| `tax_no` | `string` | #4 |
| `type` | `string` | #5 |
| `email` | `string` | #6 |
| `phone` | `string` | #7 |
| `address` | `string` | #8 |
| `bank_name` | `string` | #9 |
| `bank_account` | `string` | #10 |
| `is_default` | `bool` | #11 |
| `created_at` | `google.protobuf.Timestamp` | #12 |

#### `ListInvoiceTemplatesRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `user_id` | `int64` | #1 |

#### `ListInvoiceTemplatesResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `templates` | repeated `InvoiceTemplate` | #1 |

#### `SaveInvoiceTemplateRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `title` | `string` | #2 |
| `tax_no` | `string` | #3 |
| `type` | `string` | #4 |
| `email` | `string` | #5 |
| `phone` | `string` | #6 |
| `address` | `string` | #7 |
| `bank_name` | `string` | #8 |
| `bank_account` | `string` | #9 |
| `is_default` | `bool` | #10 |

#### `DeleteInvoiceTemplateRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |

#### `UserNotificationSettings`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `user_id` | `int64` | #1 |
| `order_notice` | `bool` | #2 |
| `logistics_notice` | `bool` | #3 |
| `marketing_notice` | `bool` | #4 |
| `system_notice` | `bool` | #5 |
| `sms_notice` | `bool` | #6 |
| `email_notice` | `bool` | #7 |
| `wechat_notice` | `bool` | #8 |

#### `GetNotificationSettingsRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `user_id` | `int64` | #1 |

#### `UpdateNotificationSettingsRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `user_id` | `int64` | #1 |
| `order_notice` | `bool` | #2 |
| `logistics_notice` | `bool` | #3 |
| `marketing_notice` | `bool` | #4 |
| `system_notice` | `bool` | #5 |
| `sms_notice` | `bool` | #6 |
| `email_notice` | `bool` | #7 |
| `wechat_notice` | `bool` | #8 |

#### `GetAccountSecurityRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `user_id` | `int64` | #1 |

#### `AccountSecurityInfo`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `phone_bound` | `bool` | #1 |
| `email_bound` | `bool` | #2 |
| `wechat_bound` | `bool` | #3 |
| `realname_verified` | `bool` | #4 |
| `risk_level` | `int32` | #5 |
| `password_changed_at` | `google.protobuf.Timestamp` | #6 |
| `warnings` | repeated `string` | #7 |

#### `RealNameAuthRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `real_name` | `string` | #1 |
| `id_card` | `string` | #2 |

#### `SubmitFeedbackRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `type` | `int32` | #1 |
| `content` | `string` | #2 |
| `images` | repeated `string` | #3 |
| `contact` | `string` | #4 |

#### `Feedback`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `user_id` | `int64` | #2 |
| `user_nickname` | `string` | #3 |
| `type` | `int32` | #4 |
| `content` | `string` | #5 |
| `images` | repeated `string` | #6 |
| `contact` | `string` | #7 |
| `status` | `int32` | #8 |
| `reply` | `string` | #9 |
| `created_at` | `google.protobuf.Timestamp` | #10 |
| `processed_at` | `google.protobuf.Timestamp` | #11 |

#### `ListFeedbacksRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `page` | `shopstack.common.v1.PageRequest` | #1 |
| `status` | `int32` | #2 |
| `keyword` | `string` | #3 |

#### `ListFeedbacksResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `feedbacks` | repeated `Feedback` | #1 |
| `meta` | `shopstack.common.v1.PageMeta` | #2 |

#### `SetFeedbackStatusRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `status` | `int32` | #2 |
| `reply` | `string` | #3 |

#### `HelpArticle`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |
| `category_id` | `int64` | #2 |
| `category_name` | `string` | #3 |
| `title` | `string` | #4 |
| `content` | `string` | #5 |
| `sort` | `int32` | #6 |
| `enabled` | `bool` | #7 |
| `view_count` | `int32` | #8 |
| `created_at` | `google.protobuf.Timestamp` | #9 |

#### `ListHelpArticlesRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `category_id` | `int64` | #1 |
| `page` | `shopstack.common.v1.PageRequest` | #2 |
| `keyword` | `string` | #3 |

#### `ListHelpArticlesResponse`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `articles` | repeated `HelpArticle` | #1 |
| `meta` | `shopstack.common.v1.PageMeta` | #2 |

#### `GetHelpArticleRequest`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `int64` | #1 |

