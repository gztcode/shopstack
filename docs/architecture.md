# ShopStack 架构设计

> 面向中大型电商场景的多端全栈系统。本文说明系统分层、服务拆分、关键数据流，以及若干值得解释的技术选型理由。

## 目录

- [设计目标](#设计目标)
- [整体分层](#整体分层)
- [服务拆分](#服务拆分)
- [关键数据流](#关键数据流)
- [API 网关](#api-网关)
- [契约与代码生成](#契约与代码生成)
- [数据模型](#数据模型)
- [库存模型](#库存模型)
- [消息驱动](#消息驱动)
- [设计系统](#设计系统)
- [技术选型理由](#技术选型理由)
- [可靠性与可观测性](#可靠性与可观测性)
- [已知边界与后续演进](#已知边界与后续演进)

---

## 设计目标

1. **完整闭环**——从浏览商品到收到货的全链路可跑通，不是 CRUD 拼盘。
2. **契约先行**——前后端共享同一份 Protobuf 契约，字段名、类型、单位只有一处定义。
3. **开箱即跑**——没有微信/短信/OSS 密钥也能启动并演示全部业务流程。
4. **多端一致**——4 个前端端共享同一套设计令牌与接口语义。

---

## 整体分层

```
┌─────────────────────────────────────────────────────────────────┐
│  接入层    Flutter · 微信小程序 · Vue3 用户端 · React 后台管理      │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTP/JSON  (统一信封 · snake_case)
┌───────────────────────────────▼─────────────────────────────────┐
│  网关层    API Gateway :8080                                      │
│            路由转发 · JWT 校验 · 限流 · CORS · 响应信封 · 聚合      │
└───────────────────────────────┬─────────────────────────────────┘
                                │ gRPC (Protobuf)
┌───────────────────────────────▼─────────────────────────────────┐
│  领域层    user · product · cart · order · payment ·              │
│            inventory · marketing · logistics · notification       │
└───────────────┬──────────────────────────────┬──────────────────┘
                │                              │
┌───────────────▼──────────────┐   ┌───────────▼──────────────────┐
│  数据层  MySQL 8 / Redis 7   │   │  消息层  RabbitMQ 3.13        │
└──────────────────────────────┘   └──────────────────────────────┘
```

接入层到网关是同步 HTTP；网关到领域层是同步 gRPC；领域层之间的**状态变化**通过 RabbitMQ 异步广播。

---

## 服务拆分

| 服务 | 端口 | 职责 | 拥有的表 |
| --- | --- | --- | --- |
| `user-service` | 9001 | 用户注册登录、微信登录、资料、地址、收藏、积分、发票；后台用户/角色/权限/看板 | `users`, `user_addresses`, `user_favorites`, `user_points_logs`, `user_invoices`, `roles`, `permissions`, `role_permissions`, `admin_users` |
| `product-service` | 9002 | 商品 SPU/SKU、分类树、轮播位、评价、素材库 | `products`, `product_skus`, `product_images`, `product_attributes`, `categories`, `banners`, `reviews`, `product_materials` |
| `cart-service` | 9003 | 购物车条目、选中态、角标计数 | `cart_items` |
| `inventory-service` | 9006 | 库存预占/释放/扣减/调整、流水、低库存预警 | `inventories`, `inventory_logs` |
| `order-service` | 9004 | 下单、订单查询、状态流转、退款申请与审核、订单轨迹、经营统计 | `orders`, `order_items`, `order_logs`, `refunds` |
| `payment-service` | 9005 | 支付单、回调、退款、渠道汇总 | `payments`, `payment_logs` |
| `marketing-service` | 9007 | 优惠券领取与核销、活动管理、结算试算 | `coupons`, `user_coupons`, `promotions` |
| `logistics-service` | 9008 | 发货单、物流轨迹、运费模板 | `shipments`, `shipment_tracks`, `logistic_templates` |
| `notification-service` | 9009 | 站内通知、短信验证码、操作审计、系统配置 | `notifications`, `sms_records`, `audit_logs`, `system_settings` |
| `api-gateway` | 8080 | 唯一对外入口 | 无 |

### 拆分依据

- **按业务能力切，不按数据表切**。一个表只归属一个服务，其它服务要数据就走 gRPC。例如后台看板放在 `user-service`，它通过 gRPC 调 `order-service` 的 `AdminOrderStats` 与 `product-service` 的计数接口，而不是跨服务直连他方数据库。
- **`cart-service` 独立**，因为购物车是高频写、且要跨服务取实时价格与库存，放进订单服务会让订单域被高频读写拖垮。
- **`inventory-service` 独立**，因为防超卖是强一致要求，必须有独立的原子更新边界，不能被订单服务的事务牵连。
- **`marketing` / `logistics` / `notification` 独立**，三者的迭代节奏与订单主流程不同，独立部署互不阻塞。

### 禁止跨域直连

服务之间**只能**通过 gRPC 通信。网关在 metadata 里透传身份（`x-user-id` / `x-username` / `x-subject` / `x-permissions`），内部服务信任这份身份，但仍然只暴露自己领域的数据。

---

## 关键数据流

### 下单 → 支付 → 发货 → 收货

```
用户端                网关        order-service    inventory    payment     marketing   notification
  │                   │              │               │            │            │            │
  ├─ POST /orders ───▶│──────────────▶│               │            │            │            │
  │                   │              │ ① 校验购物车    │            │            │            │
  │                   │              │ ② 试算价格 ───────────────────────────────────▶│
  │                   │              │ ③ 预占库存 ───▶│            │            │            │
  │                   │              │ ④ 落库订单    │            │            │            │
  │                   │              │ ⑤ 发 order.created ────────────────────────────▶│
  │◀── 订单号/应付 ────│◀─────────────┤                │            │            │   站内通知  │
  │                   │              │                │            │            │            │
  ├─ POST /payments ─▶│───────────────────────────────▶│            │            │            │
  │                   │              │ ⑥ 发 order.paid ─────────────────────────────────▶│
  │                   │              │ ⑦ 扣减库存 ───▶│            │            │            │
  │                   │              │                │  ⑧ 券核销 ─────────────▶│            │
  │                   │              │ ⑨ 订单→已付款  │            │            │            │
  │◀── 支付成功 ───────│◀──────────────────────────────────────────────────────────────┤
```

关键点：

- **库存三段式**：下单时预占（`locked`），支付成功后扣减（`locked → sold`），取消时释放（`locked → available`）。用条件更新 `available >= n` 保证不超卖。
- **券核销是异步的**：支付成功事件驱动 `marketing-service` 把用户券置为已用并绑定订单号。这样订单主流程不必等待营销域。
- **通知完全异步**：下单、支付、取消、发货状态变化都发事件，`notification-service` 消费后写站内信，不阻塞主链路。

### 后台操作审计

```
后台请求 → 网关 → 目标服务 → 发 audit 事件 → notification-service 写 audit_logs
```

审计日志落在 `notification-service`（与其它运维类数据同域），后台管理端通过 `GET /api/v1/admin/audit-logs` 查询。

---

## API 网关

网关是**唯一对外入口**，承担五件事：

1. **路由聚合**——把 9 个服务的 grpc-gateway 路由挂到同一个 `ServeMux`。
2. **鉴权**——校验 JWT，按路径前缀区分用户令牌与管理员令牌（双密钥）。公开路径只有 `/api/v1/auth/*`、`/api/v1/admin/auth/login`、`/healthz`、`/readyz`。
3. **限流**——按 IP 令牌桶，600 次/分钟。
4. **响应信封**——所有响应统一包成 `{code, message, data, trace_id}`。
5. **64 位整数转换**——见下。

### int64 → JSON 数字

`protojson` 默认把 `int64` / `uint64` 输出成**字符串**（为了不丢精度）。但电商前端几乎所有 ID 和金额都是 64 位，若都变字符串，JS 端处理成本很高且容易出错。

本项目实现了 `ProtoJSONMarshaler`：按 protobuf 描述符逐字段判断 kind，**只把真正的 64 位整型转成数字**，字符串类型（订单号等纯数字字符串）保持原样。

```go
// 伪代码
if fd.Kind() == protoreflect.Int64Kind || fd.Kind() == protoreflect.Uint64Kind {
    return json.Number(strconv.FormatInt(v.Int(), 10))
}
```

实测结果：`product.id = 7`（数字）、`min_price_cents = 8900`（数字）、`order_no = "20261020122332364122"`（字符串）。

### 信封包装位置

信封必须在 `Marshal` 里包，不能在 `NewEncoder` 里包——`ForwardResponseMessage` 走的是 `Marshal()` 路径，包装点放错位置会导致响应被套两层或一层都没有。

---

## 契约与代码生成

```
proto/shopstack/<pkg>/v1/*.proto
        │
        ├─ buf lint（强制 PACKAGE_DIRECTORY_MATCH 等规则）
        │
        └─ buf generate
             ├─ gen/go/<pkg>/v1/*.pb.go        消息与服务定义
             ├─ gen/go/<pkg>/v1/*_grpc.pb.go   gRPC 客户端/服务端
             └─ gen/go/<pkg>/v1/*.pb.gw.go     HTTP 路由（网关直接挂载）
```

**契约是唯一事实来源**。HTTP 路径不是手写的，而是写在 proto 的 `google.api.http` 注解里：

```protobuf
rpc GetProduct(GetProductRequest) returns (ProductDetail) {
  option (google.api.http) = { get: "/api/v1/products/{id}" };
}
```

改一处注解，网关路由和 API 文档（`scripts/gen-api-docs.mjs` 从 proto 抽取）同时更新。

### JSON 字段命名

`UseProtoNames: true`——JSON 字段名与 proto 字段名完全一致（snake_case）。理由是 4 个前端中有 3 个以 snake_case 为主，且这样读 proto 就能直接知道接口长什么样。

---

## 数据模型

37 张表，按域分组：

| 域 | 表 |
| --- | --- |
| 用户 | `users`, `user_addresses`, `user_favorites`, `user_points_logs`, `user_invoices`, `admin_users`, `roles`, `permissions`, `role_permissions` |
| 商品 | `products`, `product_skus`, `product_images`, `product_attributes`, `categories`, `banners`, `reviews`, `product_materials` |
| 交易 | `cart_items`, `orders`, `order_items`, `order_logs`, `refunds`, `payments`, `payment_logs` |
| 库存 | `inventories`, `inventory_logs` |
| 营销 | `coupons`, `user_coupons`, `promotions` |
| 物流 | `shipments`, `shipment_tracks`, `logistic_templates` |
| 通知 | `notifications`, `sms_records`, `audit_logs`, `system_settings` |

### 金额一律用分

所有金额字段是 `BIGINT`/`INT`，单位为分。**不存浮点数、不存字符串**。这避免了浮点累加误差，也避免了单位歧义。

### 时间字段

数据库用 `DATETIME`，proto 用 `google.protobuf.Timestamp`（UTC）。服务层负责转换，proto 里的时间字段是 Unix 秒语义。

### 中文乱码的坑

MySQL 初始化脚本如果客户端默认字符集是 latin1，UTF-8 内容会被二次编码。修复方式是在每个 SQL 文件开头显式声明：

```sql
SET NAMES utf8mb4;
```

容器启动参数同时加上 `--character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci`。

---

## 库存模型

三段式账本：

```
总库存 = 可用(available) + 锁定(locked) + 已售(sold)
```

| 操作 | 触发时机 | 账本变化 |
| --- | --- | --- |
| 预占 Reserve | 下单时 | `available -= n`，`locked += n` |
| 释放 Release | 订单取消/超时 | `locked -= n`，`available += n` |
| 扣减 Deduct | 支付成功 | `locked -= n`，`sold += n` |
| 调整 Adjust | 后台人工 | 直接调整 `available` |

防超卖靠**条件更新**而不是先查后写：

```sql
UPDATE inventories
SET available = available - ?, locked = locked + ?
WHERE sku_id = ? AND available >= ?
```

影响行数为 0 即库存不足，直接失败。配合乐观锁版本号避免并发覆盖。

---

## 消息驱动

### 交换机与队列

- 交换机：topic 类型 `shop.events`
- 事件以 `order.created` / `order.paid` / `order.cancelled` / `logistics.updated` 等 routing key 广播
- **每类事件一个独立队列**（而不是多消费者共享一个队列）

> 踩坑记录：最初多个消费者共用一个队列，RabbitMQ 会按轮询投递，与 routing key 无关，导致「订单事件被物流服务消费掉了」。改为每类事件独立队列后路由才正确。

### 事件清单

| 事件 | 生产者 | 消费者 | 作用 |
| --- | --- | --- | --- |
| `order.created` | order | notification | 生成「订单创建成功」站内信 |
| `order.paid` | order / payment | marketing, notification | 券核销 + 支付成功通知 |
| `order.cancelled` | order | logistics, notification | 发货单异常标注 + 取消通知 |
| `logistics.updated` | logistics | notification | 物流状态变更通知 |
| `inventory.deducted` | inventory | order | 库存扣减确认 |

### 消费侧可靠性

- 消费失败重试 + 死信队列
- 幂等：消费者按业务唯一键（订单号 + 事件类型）去重
- 消费不抛异常到主链路，失败只记日志 + 重试

---

## 设计系统

`design-tokens/tokens.json` 是**唯一数据源**，176 个令牌：

```
色板 primary/success/warning/danger/info + 中性色阶
圆角 sm/md/lg/xl/pill
阴影 xs/sm/md/lg
间距 4/8/12/16/20/24/32/40/48
字号 caption/body/subtitle/title/display
```

`node design-tokens/build.mjs` 一次生成 6 种产物：

| 产物 | 用途 |
| --- | --- |
| `tokens.css` | Vue3 / React |
| `tokens.scss` | 需要 SCSS 的场景 |
| `tokens.ts` | TypeScript 常量 |
| `tokens.dart` | Flutter `AppColors` |
| `tokens.wxss` | 微信小程序 |
| `tokens.json` | 运行时读取 |

改一次令牌，4 个端同步更新，视觉天然一致。

---

## 技术选型理由

### 为什么用 buf 而不是裸 protoc

buf 自带依赖管理、lint 规则、破坏性变更检测。`PACKAGE_DIRECTORY_MATCH` 规则强制目录结构与包名一致，避免了目录散乱问题。BSR（Buf Schema Registry）提供 googleapis 依赖，省去 vendor 目录。

### 为什么放弃 nacos-sdk-go

`nacos-sdk-go v2.3.0` 会把 `google.golang.org/grpc` 拉到 `v1.73.0-dev` 这种预发布版本，且引入 30+ 个重量级传递依赖。改用自写的 Nacos v1 开放 API HTTP 客户端（`backend/internal/registry`），更轻、零版本风险、行为完全可控。

### 为什么服务发现默认走静态地址

静态地址零外部依赖、开箱即用。Nacos 是**可选增强**：`SHOP_NACOS_ENABLED=true` 时启用，连不上自动降级回静态地址，不会让服务起不来。

Nacos 客户端是自己实现的轻量 HTTP 客户端（`backend/internal/registry/nacos.go`），只依赖 Nacos v1 开放 API，不引入 SDK，因此没有 SDK 带来的传递依赖与版本冲突。实测 9 个服务全部能注册到 Nacos，网关也能通过 Nacos 完成服务发现。

### 为什么选 gRPC + REST 双层

- **内部**：gRPC + Protobuf，强类型、流式、低开销，跨 9 个服务的调用量能扛住。
- **对外**：REST/JSON，四个前端端（尤其小程序）接入成本最低。
- 两者由**同一份 proto** 生成，grpc-gateway 保证了行为一致。

### 为什么金额用分

浮点数在累加场景必然产生误差。电商订单涉及多次加减（商品金额 - 优惠券 - 积分 + 运费），用分存储是行业标准做法。

---

## 可靠性与可观测性

| 能力 | 实现 |
| --- | --- |
| 优雅停机 | gRPC `GracefulStop` + HTTP `Shutdown`，等在途请求处理完再退出 |
| 限流 | 网关令牌桶 600 次/分钟（按 IP） |
| 熔断降级 | 下游不可用时该模块路由返回 503，不影响其它模块 |
| 分布式锁 | Redis 锁，库存预占等临界区使用 |
| 日志 | zap 结构化日志，每条带 `trace_id` |
| 健康检查 | `/healthz`（进程存活）、`/readyz`（9 个下游连接状态） |
| 链路追踪 | `trace_id` 从网关注入，贯穿 gRPC metadata 与响应信封 |

---

## 已知边界与后续演进

诚实记录当前实现的边界，便于后续迭代：

1. **微信支付**——保留了 APIv3 统一下单的调用骨架与签名流程，但当前走 Mock 通道自动结算。接入真实支付需要商户证书与 APIv3 密钥。
2. **短信验证码校验**——验证码存在 `notification-service` 进程内（Redis），跨服务登录校验链路未打通。
3. **优惠券发放上限**——`user_coupons` 唯一键使每人每券仅 1 张，`per_user_limit > 1` 暂无法落库。
4. **运费模板门槛**——`logistic_templates` 缺 `min_amount` 列，门槛暂用免邮门槛字段代替。
5. **物流发货单**——`CreateShipmentRequest` 无 `order_no` / `item_count` 字段，后者默认 1。
6. **并发上限**——当前按单请求串行处理订单创建，尚未引入分布式事务或 Saga；跨服务一致性依赖「本地事务 + MQ 最终一致」。
7. **前端契约校验**——4 个前端各自维护类型定义，没有从 proto 自动生成 TypeScript / Dart 类型。后续可接入 `protoc-gen-ts` / `protoc-gen-dart` 消除漂移风险。
8. **Nacos 镜像架构**——`nacos/nacos-server:2.3.2` 没有 `linux/arm64` 镜像，Apple Silicon 上拉不下来。compose 已固定为 `v2.4.3`（支持 arm64）。
