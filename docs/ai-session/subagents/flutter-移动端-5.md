# 子 Agent · 你负责 ShopStack 项目的 **inventory 域（backend/internal/inventory/）**、**payme



## 👤 用户 · 2026-10-20 14:16:02

你负责 ShopStack 项目的 **inventory 域（backend/internal/inventory/）**、**payment 域（backend/internal/payment/）**、**notification 域（backend/internal/notification/）** 新增 28 个 gRPC RPC 的后端实现。

## 项目背景

ShopStack 是一个中大型电商项目（Go 微服务 + Flutter/小程序/Vue3/React 四端）。工作目录：
`/<WORKSPACE>/shopstack`

契约（proto）已经扩展完毕，**你不需要也不允许修改 proto 或 gen/ 目录**。你的任务是实现 handler/service/repo 层逻辑。

## 你的唯一所有权范围

- 你**只能**修改：`backend/internal/inventory/`、`backend/internal/payment/`、`backend/internal/notification/` 目录下的文件
- 你**只能**新建：这三个目录下的新文件
- **严禁**修改其他任何目录（backend/internal/user、backend/internal/product、backend/internal/order、backend/internal/logistics、backend/internal/marketing、backend/internal/httpx、backend/internal/errs、proto/、gen/、deploy/、apps/、docs/ 等）。其他 worker 正在并行修改那些目录，你改会冲突。
- 如果需要 `errs` 包新增错误码，**不要**改 `backend/internal/errs/errs.go`（共享文件会冲突）。请用已有的错误码（`errs.CodeNotFound`、`errs.CodeInvalidParam`、`errs.CodeInsufficientStock`、`errs.CodePaymentFailed` 等，详见 `backend/internal/errs/errs.go`）；确实缺就在自己的包内定义局部常量并说明。

## 必须实现的 28 个 RPC（以 proto 文件为准）

### inventory 域（11 个）
InventoryService:
1. `ListWarehouses(ListWarehousesRequest) returns (ListWarehousesResponse)`
2. `SaveWarehouse(SaveWarehouseRequest) returns (Warehouse)`
3. `DeleteWarehouse(DeleteWarehouseRequest) returns (common.v1.OperationResult)`
4. `ListInboundOrders(ListInboundOrdersRequest) returns (ListInboundOrdersResponse)`
5. `CreateInboundOrder(CreateInboundOrderRequest) returns (InboundOrder)` — 入库单（采购入库）
6. `ListOutboundOrders(ListOutboundOrdersRequest) returns (ListOutboundOrdersResponse)`
7. `CreateOutboundOrder(CreateOutboundOrderRequest) returns (OutboundOrder)` — 出库单（其他出库场景）
8. `ListStockChecks(ListStockChecksRequest) returns (ListStockChecksResponse)` — 盘点单列表
9. `CreateStockCheck(CreateStockCheckRequest) returns (StockCheck)` — 创建盘点单
10. `GetStockCheck(GetStockCheckRequest) returns (StockCheck)` — 盘点单详情
11. `ListStockCheckItems(GetStockCheckRequest) returns (ListStockCheckItemsResponse)` — 盘点明细

### payment 域（7 个）
PaymentService:
12. `ListPayChannels(ListPayChannelsRequest) returns (ListPayChannelsResponse)`
13. `SavePayChannel(SavePayChannelRequest) returns (PayChannel)`
14. `DeletePayChannel(DeletePayChannelRequest) returns (common.v1.OperationResult)`
15. `CreateRecharge(CreateRechargeRequest) returns (RechargeOrder)` — 余额充值
16. `ListRecharges(ListRechargesRequest) returns (ListRechargesResponse)`
17. `ListBalanceLogs(ListBalanceLogsRequest) returns (ListBalanceLogsResponse)` — 余额流水
18. `GetRechargeConfig(GetRechargeConfigRequest) returns (RechargeConfig)` — 充值配置

### notification 域（10 个）
NotificationService:
19. `ListNotificationTemplates(ListNotificationTemplatesRequest) returns (ListNotificationTemplatesResponse)`
20. `SaveNotificationTemplate(SaveNotificationTemplateRequest) returns (NotificationTemplate)`
21. `DeleteNotificationTemplate(DeleteNotificationTemplateRequest) returns (common.v1.OperationResult)`
22. `ListSmsTemplates(ListSmsTemplatesRequest) returns (ListSmsTemplatesResponse)`
23. `SaveSmsTemplate(SaveSmsTemplateRequest) returns (SmsTemplate)`
24. `DeleteSmsTemplate(DeleteSmsTemplateRequest) returns (common.v1.OperationResult)`
25. `ListSensitiveWords(ListSensitiveWordsRequest) returns (ListSensitiveWordsResponse)`
26. `SaveSensitiveWord(SaveSensitiveWordRequest) returns (SensitiveWord)`
27. `DeleteSensitiveWord(DeleteSensitiveWordRequest) returns (common.v1.OperationResult)`
28. `ListNotificationCategories(ListNotificationCategoriesRequest) returns (ListNotificationCategoriesResponse)`

**请先打开 `proto/shopstack/inventory/v1/inventory.proto`、`proto/shopstack/payment/v1/payment.proto`、`proto/shopstack/notification/v1/notification.proto` 核对每个请求/响应消息的字段**，以 proto 为准。

## 参考实现范式（务必先读）

- `backend/internal/inventory/{handler.go,service.go,repo.go}` — inventory 域
- `backend/internal/payment/{handler.go,service.go,repo.go}` — payment 域
- `backend/internal/notification/{handler.go,service.go,repo.go,model.go,events.go}` — notification 域
- `backend/internal/user/converter.go` — model ↔ proto 转换 + `buildMeta` 分页辅助
- `backend/internal/inventory/service.go` — **库存三段式（总量=可用+锁定+已售）的现有实现**，你的入库/盘点逻辑必须与现有库存模型一致，不要破坏现有扣减逻辑

**你可以新建** `backend/internal/inventory/warehouse.go`、`backend/internal/inventory/inbound.go`、`backend/internal/inventory/outbound.go`、`backend/internal/inventory/stock_check.go`、`backend/internal/payment/recharge.go`、`backend/internal/payment/balance.go`、`backend/internal/notification/template.go`、`backend/internal/notification/sensitive.go` 等文件组织代码，风格与现有一致。

## 数据库表（已建好并灌了种子数据，直接用）

MySQL 容器 `shopstack-mysql-test`，端口 13306，库 `shopstack`，用户 `shopstack` / 密码 `shopstack`。
表定义见 `deploy/mysql/init/03-extend.sql`，种子见 `deploy/mysql/init/04-extend-seed.sql`。**你负责的表**：
- `warehouses` — 仓库（name, code, address, contact, phone, sort, status, description）
- `inbound_orders` — 入库单（order_no, warehouse_id, supplier, total_quantity, total_amount_cents, status, remark, created_by, created_at）
- `inbound_order_items` — 入库明细（inbound_order_id, sku_id, product_id, quantity, price_cents, amount_cents）
- `outbound_orders` — 出库单（order_no, warehouse_id, type, total_quantity, status, remark, created_by, created_at）
- `outbound_order_items` — 出库明细（outbound_order_id, sku_id, product_id, quantity, remark）
- `stock_checks` — 盘点单（check_no, warehouse_id, status, checked_at, checked_by, remark, created_at）
- `stock_check_items` — 盘点明细（stock_check_id, sku_id, product_id, system_quantity, actual_quantity, difference, remark）
- `pay_channels` — 支付渠道（name, code, type, icon, config, sort, status, description）
- `balance_logs` — 余额流水（user_id, change_amount_cents, balance_after_cents, type, biz_type, biz_id, remark, created_at）
- `recharge_orders` — 充值单（recharge_no, user_id, amount_cents, bonus_cents, pay_channel_id, channel, status, paid_at, transaction_id, created_at）
- `notification_templates` — 通知模板（code, name, title, content, category, channels, status, remark）
- `sms_templates` — 短信模板（code, name, content, sign_name, scene, status, remark）
- `sensitive_words` — 敏感词（word, category, status）

**请自己用 `docker --context orbstack exec shopstack-mysql-test mysql -ushopstack -pshopstack shopstack -e "DESC 表名"` 查看准确列名**，以实际表结构为准。

种子数据：`warehouses` 3 条、`pay_channels` 若干、`notification_templates` 7 条、`sms_templates` 5 条、`sensitive_words` 7 条。

原有的 `inventories`、`inventory_logs`、`payments`、`refunds`、`notifications`、`sms_records`、`system_settings` 等表见 `deploy/mysql/init/01-schema.sql` 和对应 model.go。

## 关键实现要求

1. **表名映射**：gorm 模型必须实现 `TableName() string`。软删除用 `gorm.DeletedAt`。
2. **金额一律用分（int64）**，字段名带 `_cents`，禁止 float64。
3. **分页**：用 `commonv1.PageRequest`，参考 `normalizePage` 与 `buildMeta`，响应必须填 `meta`。
4. **JSON 字段名与 proto 一致（snake_case）**。
5. **入库单（CreateInboundOrder）核心逻辑**：
   - 事务内：创建入库单 + 入库明细 + **真实增加对应 SKU 的库存**（可用库存 available 增加，总量 total 增加）。
   - 库存表结构与更新方式必须与 `backend/internal/inventory/service.go` 里现有扣减逻辑一致（同样是三段式：总量=可用+锁定+已售，且用条件更新防超卖）。
   - 写一条 `inventory_logs` 流水（该表属于 inventory 域已有功能，字段名对齐现有 model）。
   - 入库单状态流转：草稿 → 已入库 → 已取消（若 proto 有这些状态值）。
6. **出库单（CreateOutboundOrder）**：类似入库，但减少库存。若库存不足必须拒绝并明确报错，且要事务回滚。
7. **盘点单（CreateStockCheck / GetStockCheck / ListStockCheckItems）**：
   - CreateStockCheck 创建盘点单并按仓库 + 全部在库 SKU 生成盘点明细，system_quantity 取当前库存。
   - 盘点明细的 actual_quantity 由客户端后续提交（若 proto 有 UpdateStockCheck 之类的方法则一并实现，否则在 GetStockCheck 里返回明细即可）。difference = actual - system。
   - 若 proto 没有「提交盘点结果」的 RPC，就只实现创建/查询，明细的 actual 保持 0，并在回复里说明。
8. **充值（CreateRecharge）**：
   - 生成充值单号，状态为待支付。
   - 充值配置 `GetRechargeConfig` 返回可配置的充值档位（按已有 `recharge_configs` 表或系统设置表；若没有对应表，就从 `system_settings` 读，或返回一个写死的默认档位列表——若是后者请在回复里说明）。
   - `ListRecharges` / `ListBalanceLogs` 是**用户视角**，必须只返回当前登录用户自己的数据，用 `auth.UserIDFromContext(ctx)` 或参考 `backend/internal/payment/handler.go` 里 `h.userID(ctx, req.GetUserId())` 的归属校验范式，禁止越权。
   - 余额变动必须写 `balance_logs` 流水且 balance_after_cents 正确。**注意**：本次只实现充值单创建（待支付），真正的余额入账通常在支付回调（Notify）里做——请检查现有 `backend/internal/payment/service.go` 的 Notify 逻辑，如果你新增的充值单类型需要回调入账，请在 Notify 中补上分支逻辑（同属 payment 域，你有权修改）。
9. **通知模板 / 短信模板 / 敏感词**：标准 CRUD + 分页列表 + 启停状态。删除敏感词要生效于实际发送流程——检查 `backend/internal/notification/service.go` 的 Send/SendSms 实现，若当前没有做敏感词过滤，请补上过滤逻辑（同属 notification 域）。
10. **ListNotificationCategories**：返回通知分类枚举（从 notification_templates 的 category 去重，或按 proto 定义的固定分类列表）。若 proto 里是固定枚举就按 proto 返回。
11. **禁止 TODO / 占位实现 / 空实现 / 死代码**。每个 RPC 都要有真实的数据库读写或真实计算逻辑。
12. **错误处理**：用 `errs` 包，先读 `backend/internal/errs/errs.go` 确认可用的构造函数与错误码。

## 验证方式

```bash
cd /<WORKSPACE>/shopstack
export GOPROXY=https://goproxy.cn,direct GOFLAGS=-mod=mod PATH="$HOME/go/bin:$PATH"
go build ./backend/internal/inventory/... ./backend/internal/payment/... ./backend/internal/notification/... && \
go vet ./backend/internal/inventory/... ./backend/internal/payment/... ./backend/internal/notification/... && \
gofmt -l backend/internal/inventory/ backend/internal/payment/ backend/internal/notification/
```
（`go build ./backend/...` 全量构建此时可能因其他 worker 正在改代码而失败，这是正常的，请只构建你负责的包。）

## 交付要求

完成后请在最终回复里给出：
1. 实现了哪些 RPC（逐个列出）
2. 每个 RPC 的关键业务逻辑一句话说明
3. 新建/修改了哪些文件（路径列表）
4. `go build` / `go vet` / `gofmt` 三项自检的实际输出结果
5. 库存变动与现有三段式模型的对接说明
6. 充值入账触发点（是否补了 Notify 分支）的说明
7. 任何你**没有**实现或有疑问的部分（诚实说明，不要假装完成）

不要写 README 或额外的总结文档文件，直接在最终回复里汇报。

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:16:02

I'll start by reading the proto contracts and existing implementations to understand the conventions.

<details><summary>🛠 bash</summary>

```
README.md
apps
backend
deploy
design-tokens
docs
gen
go.mod
go.sum
proto
scripts
---
backend/internal/inventory/:
handler.go
repo.go
service.go

backend/internal/notification/:
events.go
handler.go
model.go
repo.go
service.go

backend/internal/payment/:
handler.go
repo.go
service.go
```

</details>

<details><summary>🛠 read</summary>

```
1→syntax = "proto3";
     2→
     3→package shopstack.inventory.v1;
     4→
     5→option go_package = "github.com/shopstack/platform/gen/go/inventory/v1;inventoryv1";
     6→
     7→import "google/api/annotations.proto";
     8→import "google/protobuf/timestamp.proto";
     9→import "shopstack/common/v1/common.proto";
    10→
    11→message Inventory {
    12→  int64 id = 1;
    13→  int64 sku_id = 2;
    14→  int64 product_id = 3;
    15→  string sku_code = 4;
    16→  string spec_text = 5;
    17→  int32 total_stock = 6;
    18→  int32 available_stock = 7;
    19→  int32 locked_stock = 8;
    20→  int32 sold_stock = 9;
    21→  int32 safety_stock = 10;
    22→  string warehouse = 11;
    23→  google.protobuf.Timestamp updated_at = 12;
    24→}
    25→
    26→message InventoryLog {
    27→  int64 id = 1;
    28→  int64 sku_id = 2;
    29→  int64 product_id = 3;
    30→  string sku_code = 4;
    31→  int32 change_type = 5;  // 1 入库 2 预扣 3 释放 4 扣减 5 调整 6 退货入库
    32→  int32 quantity = 6;
    33→  int32 before_stock = 7;
    34→  int32 after_stock = 8;
    35→  string biz_type = 9;
    36→  string biz_id = 10;
    37→  string operator = 11;
    38→  string remark = 12;
    39→  google.protobuf.Timestamp created_at = 13;
    40→}
    41→
    42→message GetStockRequest {
    43→  int64 sku_id = 1;
    44→}
    45→
    46→message BatchGetStockRequest {
    47→  repeated int64 sku_ids = 1;
    48→}
    49→
    50→message BatchGetStockResponse {
    51→  repeated Inventory inventories = 1;
    52→}
    53→
    54→message ReserveStockRequest {
    55→  int64 order_id = 1;
    56→  repeated StockItem items = 2;
    57→  string biz_type = 3;
    58→}
    59→
    60→message StockItem {
    61→  int64 sku_id = 1;
    62→  int32 quantity = 2;
    63→}
    64→
    65→message ReleaseStockRequest {
    66→  int64 order_id = 1;
    67→  repeated StockItem items = 2;
    68→  string reason = 3;
    69→}
    70→
    71→message DeductStockRequest {
    72→  int64 order_id = 1;
    73→  repeated StockItem items = 2;
    74→}
    75→
    76→message AdjustStockRequest {
    77→  int64 sku_id = 1;
    78→  int32 quantity = 2;   // 目标库存
    79→  string reason = 3;
    80→  int32 safety_stock = 4;
    81→  string warehouse = 5;
    82→}
    83→
    84→message ListInventoryLogsRequest {
    85→  shopstack.common.v1.PageRequest page = 1;
    86→  int64 sku_id = 2;
    87→  int64 product_id = 3;
    88→  string biz_id = 4;
    89→  int32 change_type = 5;
    90→}
    91→
    92→message ListInventoryLogsResponse {
    93→  repeated InventoryLog logs = 1;
    94→  shopstack.common.v1.PageMeta meta = 2;
    95→}
    96→
    97→message ListInventoriesRequest {
    98→  shopstack.common.v1.PageRequest page = 1;
    99→  string keyword = 2;
   100→  int64 product_id = 3;
   101→  int32 low_stock_only = 4;
   102→}
   103→
   104→message ListInventoriesResponse {
   105→  repeated Inventory inventories = 1;
   106→  shopstack.common.v1.PageMeta meta = 2;
   107→}
   108→
   109→message StockWarningRequest {
   110→  int32 threshold = 1;
   111→}
   112→
   113→message StockWarningResponse {
   114→  repeated Inventory inventories = 1;
   115→  int32 count = 2;
   116→}
   117→
   118→service InventoryService {
   119→  rpc GetStock(GetStockRequest) returns (Inventory) {
   120→    option (google.api.http) = { get: "/api/v1/inventory/{sku_id}" };
   121→  }
   122→  rpc BatchGetStock(BatchGetStockRequest) returns (BatchGetStockResponse) {
   123→    option (google.api.http) = { post: "/api/v1/inventory/batch" body: "*" };
   124→  }
   125→  rpc ReserveStock(ReserveStockRequest) returns (shopstack.common.v1.OperationResult) {
   126→    option (google.api.http) = { post: "/api/v1/inventory/reserve" body: "*" };
   127→  }
   128→  rpc ReleaseStock(ReleaseStockRequest) returns (shopstack.common.v1.OperationResult) {
   129→    option (google.api.http) = { post: "/api/v1/inventory/release" body: "*" };
   130→  }
   131→  rpc DeductStock(DeductStockRequest) returns (shopstack.common.v1.OperationResult) {
   132→    option (google.api.http) = { post: "/api/v1/inventory/deduct" body: "*" };
   133→  }
   134→  rpc AdjustStock(AdjustStockRequest) returns (Inventory) {
   135→    option (google.api.http) = { put: "/api/v1/admin/inventory/adjust" body: "*" };
   136→  }
   137→  rpc ListInventories(ListInventoriesRequest) returns (ListInventoriesResponse) {
   138→    option (google.api.http) = { get: "/api/v1/admin/inventory" };
   139→  }
   140→  rpc ListLogs(ListInventoryLogsRequest) returns (ListInventoryLogsResponse) {
   141→    option (google.api.http) = { get: "/api/v1/admin/inventory/logs" };
   142→  }
   143→  rpc StockWarning(StockWarningRequest) returns (StockWarningResponse) {
   144→    option (google.api.http) = { get: "/api/v1/admin/inventory/warning" };
   145→  }
   146→  rpc ListWarehouses(ListWarehousesRequest) returns (ListWarehousesResponse) {
   147→    option (google.api.http) = { get: "/api/v1/admin/warehouses" };
   148→  }
   149→  rpc SaveWarehouse(SaveWarehouseRequest) returns (Warehouse) {
   150→    option (google.api.http) = { post: "/api/v1/admin/warehouses" };
   151→  }
   152→  rpc DeleteWarehouse(DeleteWarehouseRequest) returns (shopstack.common.v1.OperationResult) {
   153→    option (google.api.http) = { delete: "/api/v1/admin/warehouses/{id}" };
   154→  }
   155→  rpc ListInboundOrders(ListInboundOrdersRequest) returns (ListInboundOrdersResponse) {
   156→    option (google.api.http) = { get: "/api/v1/admin/inbound-orders" };
   157→  }
   158→  rpc CreateInboundOrder(CreateInboundOrderRequest) returns (InboundOrder) {
   159→    option (google.api.http) = { post: "/api/v1/admin/inbound-orders" };
   160→  }
   161→  rpc ListOutboundOrders(ListOutboundOrdersRequest) returns (ListOutboundOrdersResponse) {
   162→    option (google.api.http) = { get: "/api/v1/admin/outbound-orders" };
   163→  }
   164→  rpc CreateOutboundOrder(CreateOutboundOrderRequest) returns (OutboundOrder) {
   165→    option (google.api.http) = { post: "/api/v1/admin/outbound-orders" };
   166→  }
   167→  rpc ListStockChecks(ListStockChecksRequest) returns (ListStockChecksResponse) {
   168→    option (google.api.http) = { get: "/api/v1/admin/stock-checks" };
   169→  }
   170→  rpc CreateStockCheck(CreateStockCheckRequest) returns (StockCheck) {
   171→    option (google.api.http) = { post: "/api/v1/admin/stock-checks" };
   172→  }
   173→  rpc GetStockCheck(GetStockCheckRequest) returns (StockCheckDetail) {
   174→    option (google.api.http) = { get: "/api/v1/admin/stock-checks/{id}" };
   175→  }
   176→  rpc ListStockCheckItems(GetStockCheckRequest) returns (ListStockCheckItemsResponse) {
   177→    option (google.api.http) = { get: "/api/v1/admin/stock-checks/{id}/items" };
   178→  }
   179→}
   180→
   181→// EXTRA_MARKER: 由 scripts/extend-proto.py 追加的消息定义
   182→
   183→// ---------------------------------------------------------------------------
   184→// 仓库 / 入库 / 出库 / 盘点
   185→// ---------------------------------------------------------------------------
   186→
   187→message Warehouse {
   188→  int64 id = 1;
   189→  string code = 2;
   190→  string name = 3;
   191→  string address = 4;
   192→  string contact = 5;
   193→  string phone = 6;
   194→  bool enabled = 7;
   195→  int32 sort = 8;
   196→  google.protobuf.Timestamp created_at = 9;
   197→}
   198→
   199→message ListWarehousesRequest {
   200→  shopstack.common.v1.PageRequest page = 1;
   201→  string keyword = 2;
   202→}
   203→
   204→message ListWarehousesResponse {
   205→  repeated Warehouse warehouses = 1;
   206→  shopstack.common.v1.PageMeta meta = 2;
   207→}
   208→
   209→message SaveWarehouseRequest {
   210→  int64 id = 1;
   211→  string code = 2;
   212→  string name = 3;
   213→  string address = 4;
   214→  string contact = 5;
   215→  string phone = 6;
   216→  bool enabled = 7;
   217→  int32 sort = 8;
   218→}
   219→
   220→message DeleteWarehouseRequest {
   221→  int64 id = 1;
   222→}
   223→
   224→message StockMoveItem {
   225→  int64 sku_id = 1;
   226→  string sku_code = 2;
   227→  string spec_text = 3;
   228→  int32 quantity = 4;
   229→}
   230→
   231→message InboundOrder {
   232→  int64 id = 1;
   233→  string inbound_no = 2;
   234→  int64 warehouse_id = 3;
   235→  string warehouse_name = 4;
   236→  string supplier = 5;
   237→  int32 status = 6; // 0 待入库 1 已入库 2 已取消
   238→  int32 total_quantity = 7;
   239→  string remark = 8;
   240→  string operator = 9;
   241→  repeated StockMoveItem items = 10;
   242→  google.protobuf.Timestamp created_at = 11;
   243→}
   244→
   245→message ListInboundOrdersRequest {
   246→  shopstack.common.v1.PageRequest page = 1;
   247→  int32 status = 2;
   248→  string keyword = 3;
   249→}
   250→
   251→message ListInboundOrdersResponse {
   252→  repeated InboundOrder inbound_orders = 1;
   253→  shopstack.common.v1.PageMeta meta = 2;
   254→}
   255→
   256→message CreateInboundOrderRequest {
   257→  int64 warehouse_id = 1;
   258→  string supplier = 2;
   259→  string remark = 3;
   260→  repeated StockMoveItem items = 4;
   261→}
   262→
   263→message OutboundOrder {
   264→  int64 id = 1;
   265→  string outbound_no = 2;
   266→  int64 warehouse_id = 3;
   267→  string warehouse_name = 4;
   268→  int64 order_id = 5;
   269→  string order_no = 6;
   270→  int32 status = 7; // 0 待出库 1 已出库 2 已取消
   271→  int32 total_quantity = 8;
   272→  string remark = 9;
   273→  string operator = 10;
   274→  repeated StockMoveItem items = 11;
   275→  google.protobuf.Timestamp created_at = 12;
   276→}
   277→
   278→message ListOutboundOrdersRequest {
   279→  shopstack.common.v1.PageRequest page = 1;
   280→  int32 status = 2;
   281→  string keyword = 3;
   282→}
   283→
   284→message ListOutboundOrdersResponse {
   285→  repeated OutboundOrder outbound_orders = 1;
   286→  shopstack.common.v1.PageMeta meta = 2;
   287→}
   288→
   289→message CreateOutboundOrderRequest {
   290→  int64 warehouse_id = 1;
   291→  int64 order_id = 2;
   292→  string remark = 3;
   293→  repeated StockMoveItem items = 4;
   294→}
   295→
   296→message StockCheck {
   297→  int64 id = 1;
   298→  string check_no = 2;
   299→  int64 warehouse_id = 3;
   300→  string warehouse_name = 4;
   301→  int32 status = 5; // 0 盘点中 1 已完成 2 已取消
   302→  int32 total_count = 6;
   303→  int32 diff_count = 7;
   304→  string remark = 8;
   305→  string operator = 9;
   306→  google.protobuf.Timestamp created_at = 10;
   307→}
   308→
   309→message ListStockChecksRequest {
   310→  shopstack.common.v1.PageRequest page = 1;
   311→  int32 status = 2;
   312→  string keyword = 3;
   313→}
   314→
   315→message ListStockChecksResponse {
   316→  repeated StockCheck stock_checks = 1;
   317→  shopstack.common.v1.PageMeta meta = 2;
   318→}
   319→
   320→message CreateStockCheckRequest {
   321→  int64 warehouse_id = 1;
   322→  string remark = 2;
   323→  repeated StockMoveItem items = 3;
   324→}
   325→
   326→message GetStockCheckRequest {
   327→  int64 id = 1;
   328→}
   329→
   330→message StockCheckItem {
   331→  int64 id = 1;
   332→  int64 stock_check_id = 2;
   333→  int64 sku_id = 3;
   334→  string sku_code = 4;
   335→  string spec_text = 5;
   336→  int32 book_quantity = 6; // 账面数量
   337→  int32 actual_quantity = 7; // 实盘数量
   338→  int32 diff_quantity = 8;
   339→}
   340→
   341→message StockCheckDetail {
   342→  StockCheck stock_check = 1;
   343→  repeated StockCheckItem items = 2;
   344→}
   345→
   346→message ListStockCheckItemsResponse {
   347→  repeated StockCheckItem items = 1;
   348→  shopstack.common.v1.PageMeta meta = 2;
   349→}
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:16:08

<details><summary>🧠 思考过程</summary>

```
Note: GetStockCheck returns StockCheckDetail (not StockCheck). ListStockCheckItems uses GetStockCheckRequest (has id only, no page!). Hmm, ListStockCheckItemsResponse has meta but request has only id. So pagination for items can't be requested... we can return all items and meta with total.

Now read payment and notification protos.
```

</details>

<details><summary>🛠 read</summary>

```
1→syntax = "proto3";
     2→
     3→package shopstack.payment.v1;
     4→
     5→option go_package = "github.com/shopstack/platform/gen/go/payment/v1;paymentv1";
     6→
     7→import "google/api/annotations.proto";
     8→import "google/protobuf/timestamp.proto";
     9→import "shopstack/common/v1/common.proto";
    10→
    11→message Payment {
    12→  int64 id = 1;
    13→  string payment_no = 2;
    14→  int64 order_id = 3;
    15→  string order_no = 4;
    16→  int64 user_id = 5;
    17→  int64 amount_cents = 6;
    18→  int64 refunded_cents = 7;
    19→  shopstack.common.v1.PaymentStatus status = 8;
    20→  shopstack.common.v1.PaymentChannel channel = 9;
    21→  string transaction_id = 10;  // 第三方交易号
    22→  string prepay_id = 11;       // 唤起支付所需参数
    23→  map<string, string> pay_params = 12;
    24→  string fail_reason = 13;
    25→  google.protobuf.Timestamp paid_at = 14;
    26→  google.protobuf.Timestamp created_at = 15;
    27→  google.protobuf.Timestamp updated_at = 16;
    28→}
    29→
    30→message PaymentRefund {
    31→  int64 id = 1;
    32→  string refund_no = 2;
    33→  int64 payment_id = 3;
    34→  int64 order_id = 4;
    35→  int64 amount_cents = 5;
    36→  int32 status = 6;
    37→  string reason = 7;
    38→  string transaction_id = 8;
    39→  google.protobuf.Timestamp created_at = 9;
    40→}
    41→
    42→message CreatePaymentRequest {
    43→  int64 order_id = 1;
    44→  int64 user_id = 2;
    45→  int32 channel = 3;    // 1 微信 2 支付宝 3 余额
    46→  string return_url = 4;
    47→}
    48→
    49→message QueryPaymentRequest {
    50→  int64 payment_id = 1;
    51→  int64 order_id = 2;
    52→  int64 user_id = 3;
    53→}
    54→
    55→message PaymentCallbackRequest {
    56→  string payment_no = 1;
    57→  string transaction_id = 2;
    58→  string signature = 3;
    59→  string raw_body = 4;
    60→  int32 status = 5;
    61→}
    62→
    63→message CreateRefundRequest {
    64→  int64 payment_id = 1;
    65→  int64 order_id = 2;
    66→  int64 amount_cents = 3;
    67→  string reason = 4;
    68→}
    69→
    70→message ListPaymentsRequest {
    71→  shopstack.common.v1.PageRequest page = 1;
    72→  int32 status = 2;
    73→  int32 channel = 3;
    74→  string keyword = 4;
    75→  int64 user_id = 5;
    76→  int64 start_time = 6;
    77→  int64 end_time = 7;
    78→}
    79→
    80→message ListPaymentsResponse {
    81→  repeated Payment payments = 1;
    82→  shopstack.common.v1.PageMeta meta = 2;
    83→  int64 total_amount_cents = 3;
    84→  int64 total_refunded_cents = 4;
    85→}
    86→
    87→message PaymentSummaryRequest {
    88→  int32 days = 1;
    89→}
    90→
    91→message PaymentSummaryResponse {
    92→  int64 today_count = 1;
    93→  int64 today_amount_cents = 2;
    94→  int64 total_count = 3;
    95→  int64 total_amount_cents = 4;
    96→  int64 refunded_amount_cents = 5;
    97→  int64 success_rate = 6; // 百分比整数
    98→  repeated PaymentTrendPoint trend = 7;
    99→}
   100→
   101→message PaymentTrendPoint {
   102→  string date = 1;
   103→  int64 count = 2;
   104→  int64 amount_cents = 3;
   105→}
   106→
   107→service PaymentService {
   108→  rpc CreatePayment(CreatePaymentRequest) returns (Payment) {
   109→    option (google.api.http) = { post: "/api/v1/payments" body: "*" };
   110→  }
   111→  rpc QueryPayment(QueryPaymentRequest) returns (Payment) {
   112→    option (google.api.http) = { get: "/api/v1/payments/query" };
   113→  }
   114→  rpc Notify(PaymentCallbackRequest) returns (shopstack.common.v1.OperationResult) {
   115→    option (google.api.http) = { post: "/api/v1/payments/notify" body: "*" };
   116→  }
   117→  rpc CreateRefund(CreateRefundRequest) returns (PaymentRefund) {
   118→    option (google.api.http) = { post: "/api/v1/payments/refund" body: "*" };
   119→  }
   120→  rpc ListPayments(ListPaymentsRequest) returns (ListPaymentsResponse) {
   121→    option (google.api.http) = { get: "/api/v1/admin/payments" };
   122→  }
   123→  rpc Summary(PaymentSummaryRequest) returns (PaymentSummaryResponse) {
   124→    option (google.api.http) = { get: "/api/v1/admin/payments/summary" };
   125→  }
   126→  rpc ListPayChannels(ListPayChannelsRequest) returns (ListPayChannelsResponse) {
   127→    option (google.api.http) = { get: "/api/v1/admin/pay-channels" };
   128→  }
   129→  rpc SavePayChannel(SavePayChannelRequest) returns (PayChannel) {
   130→    option (google.api.http) = { post: "/api/v1/admin/pay-channels" };
   131→  }
   132→  rpc DeletePayChannel(DeletePayChannelRequest) returns (shopstack.common.v1.OperationResult) {
   133→    option (google.api.http) = { delete: "/api/v1/admin/pay-channels/{id}" };
   134→  }
   135→  rpc CreateRecharge(CreateRechargeRequest) returns (RechargeOrder) {
   136→    option (google.api.http) = { post: "/api/v1/payments/recharge" };
   137→  }
   138→  rpc ListRecharges(ListRechargesRequest) returns (ListRechargesResponse) {
   139→    option (google.api.http) = { get: "/api/v1/payments/recharges" };
   140→  }
   141→  rpc ListBalanceLogs(ListBalanceLogsRequest) returns (ListBalanceLogsResponse) {
   142→    option (google.api.http) = { get: "/api/v1/payments/balance-logs" };
   143→  }
   144→  rpc GetRechargeConfig(GetRechargeConfigRequest) returns (RechargeConfig) {
   145→    option (google.api.http) = { get: "/api/v1/payments/recharge-config" };
   146→  }
   147→}
   148→
   149→// EXTRA_MARKER: 由 scripts/extend-proto.py 追加的消息定义
   150→
   151→// ---------------------------------------------------------------------------
   152→// 支付渠道 / 余额充值 / 余额流水
   153→// ---------------------------------------------------------------------------
   154→
   155→message PayChannel {
   156→  int64 id = 1;
   157→  string name = 2;
   158→  int32 channel = 3; // 对应 common.PaymentChannel
   159→  string code = 4;
   160→  string icon = 5;
   161→  bool enabled = 6;
   162→  int32 sort = 7;
   163→  string config = 8; // JSON 配置
   164→  google.protobuf.Timestamp created_at = 9;
   165→}
   166→
   167→message ListPayChannelsRequest {
   168→  shopstack.common.v1.PageRequest page = 1;
   169→  int32 channel = 2;
   170→}
   171→
   172→message ListPayChannelsResponse {
   173→  repeated PayChannel channels = 1;
   174→  shopstack.common.v1.PageMeta meta = 2;
   175→}
   176→
   177→message SavePayChannelRequest {
   178→  int64 id = 1;
   179→  string name = 2;
   180→  int32 channel = 3;
   181→  string code = 4;
   182→  string icon = 5;
   183→  bool enabled = 6;
   184→  int32 sort = 7;
   185→  string config = 8;
   186→}
   187→
   188→message DeletePayChannelRequest {
   189→  int64 id = 1;
   190→}
   191→
   192→message RechargeOrder {
   193→  int64 id = 1;
   194→  string recharge_no = 2;
   195→  int64 user_id = 3;
   196→  int64 amount_cents = 4;
   197→  int64 bonus_cents = 5; // 赠送金额
   198→  int32 status = 6;      // 0 待支付 1 已支付 2 已取消
   199→  int32 channel = 7;
   200→  string payment_no = 8;
   201→  google.protobuf.Timestamp paid_at = 9;
   202→  google.protobuf.Timestamp created_at = 10;
   203→}
   204→
   205→message CreateRechargeRequest {
   206→  int64 amount_cents = 1;
   207→  int32 channel = 2;
   208→}
   209→
   210→message ListRechargesRequest {
   211→  int64 user_id = 1;
   212→  shopstack.common.v1.PageRequest page = 2;
   213→  int32 status = 3;
   214→}
   215→
   216→message ListRechargesResponse {
   217→  repeated RechargeOrder recharges = 1;
   218→  shopstack.common.v1.PageMeta meta = 2;
   219→}
   220→
   221→message BalanceLog {
   222→  int64 id = 1;
   223→  int64 user_id = 2;
   224→  int64 change = 3;
   225→  int64 balance = 4;
   226→  string title = 5;
   227→  string biz_type = 6;
   228→  google.protobuf.Timestamp created_at = 7;
   229→}
   230→
   231→message ListBalanceLogsRequest {
   232→  int64 user_id = 1;
   233→  shopstack.common.v1.PageRequest page = 2;
   234→}
   235→
   236→message ListBalanceLogsResponse {
   237→  repeated BalanceLog logs = 1;
   238→  shopstack.common.v1.PageMeta meta = 2;
   239→  int64 current_balance = 3;
   240→}
   241→
   242→message GetRechargeConfigRequest {}
   243→
   244→message RechargeConfig {
   245→  int64 min_amount_cents = 1;
   246→  int64 max_amount_cents = 2;
   247→  repeated int64 preset_amounts = 3;
   248→  int64 register_bonus_cents = 4;
   249→  string first_recharge_bonus_desc = 5;
   250→}
```

</details>

<details><summary>🛠 read</summary>

```
1→syntax = "proto3";
     2→
     3→package shopstack.notification.v1;
     4→
     5→option go_package = "github.com/shopstack/platform/gen/go/notification/v1;notificationv1";
     6→
     7→import "google/api/annotations.proto";
     8→import "google/protobuf/timestamp.proto";
     9→import "shopstack/common/v1/common.proto";
    10→
    11→message Notification {
    12→  int64 id = 1;
    13→  int64 user_id = 2;
    14→  shopstack.common.v1.NotificationType type = 3;
    15→  string title = 4;
    16→  string content = 5;
    17→  string link = 6;
    18→  int64 biz_id = 7;
    19→  bool read = 8;
    20→  google.protobuf.Timestamp created_at = 9;
    21→  google.protobuf.Timestamp read_at = 10;
    22→}
    23→
    24→message SendNotificationRequest {
    25→  int64 user_id = 1;
    26→  int32 type = 2;
    27→  string title = 3;
    28→  string content = 4;
    29→  string link = 5;
    30→  int64 biz_id = 6;
    31→  repeated int64 user_ids = 7; // 群发时使用
    32→}
    33→
    34→message ListNotificationsRequest {
    35→  int64 user_id = 1;
    36→  int32 type = 2;
    37→  bool unread_only = 3;
    38→  shopstack.common.v1.PageRequest page = 4;
    39→  int32 category = 10; // 消息分类筛选
    40→}
    41→
    42→message ListNotificationsResponse {
    43→  repeated Notification notifications = 1;
    44→  shopstack.common.v1.PageMeta meta = 2;
    45→  int32 unread_count = 3;
    46→}
    47→
    48→message MarkReadRequest {
    49→  int64 user_id = 1;
    50→  int64 id = 2;
    51→}
    52→
    53→message MarkAllReadRequest {
    54→  int64 user_id = 1;
    55→}
    56→
    57→message UnreadCountRequest {
    58→  int64 user_id = 1;
    59→}
    60→
    61→message UnreadCountResponse {
    62→  int32 count = 1;
    63→}
    64→
    65→message SmsRecord {
    66→  int64 id = 1;
    67→  string phone = 2;
    68→  string code = 3;
    69→  string scene = 4;
    70→  int32 status = 5;
    71→  string error_message = 6;
    72→  int32 send_count = 7;
    73→  google.protobuf.Timestamp created_at = 8;
    74→}
    75→
    76→message ListSmsRecordsRequest {
    77→  shopstack.common.v1.PageRequest page = 1;
    78→  string phone = 2;
    79→  string scene = 3;
    80→}
    81→
    82→message ListSmsRecordsResponse {
    83→  repeated SmsRecord records = 1;
    84→  shopstack.common.v1.PageMeta meta = 2;
    85→}
    86→
    87→message SendSmsRequest {
    88→  string phone = 1;
    89→  string scene = 2;
    90→}
    91→
    92→message SendSmsResponse {
    93→  bool success = 1;
    94→  string code = 2; // 演示环境下直接返回验证码
    95→  int32 expire_seconds = 3;
    96→}
    97→
    98→message AuditLog {
    99→  int64 id = 1;
   100→  int64 admin_id = 2;
   101→  string admin_name = 3;
   102→  string module = 4;   // product / order / user ...
   103→  string action = 5;   // create / update / delete / export
   104→  string target_type = 6;
   105→  string target_id = 7;
   106→  string detail = 8;
   107→  string ip = 9;
   108→  string user_agent = 10;
   109→  int32 result = 11;  // 1 成功 0 失败
   110→  string error_message = 12;
   111→  google.protobuf.Timestamp created_at = 13;
   112→}
   113→
   114→message ListAuditLogsRequest {
   115→  shopstack.common.v1.PageRequest page = 1;
   116→  string module = 2;
   117→  string action = 3;
   118→  int64 admin_id = 4;
   119→  string keyword = 5;
   120→  int64 start_time = 6;
   121→  int64 end_time = 7;
   122→}
   123→
   124→message ListAuditLogsResponse {
   125→  repeated AuditLog logs = 1;
   126→  shopstack.common.v1.PageMeta meta = 2;
   127→}
   128→
   129→// ---------------------------------------------------------------------------
   130→// 系统配置
   131→// ---------------------------------------------------------------------------
   132→
   133→message SystemSetting {
   134→  int64 id = 1;
   135→  string key = 2;
   136→  string value = 3;
   137→  string name = 4;
   138→  string group = 5;
   139→  string description = 6;
   140→  string value_type = 7;  // string / number / bool / json
   141→  google.protobuf.Timestamp updated_at = 8;
   142→}
   143→
   144→message ListSystemSettingsRequest {
   145→  string group = 1;
   146→}
   147→
   148→message ListSystemSettingsResponse {
   149→  repeated SystemSetting settings = 1;
   150→}
   151→
   152→message UpdateSystemSettingsRequest {
   153→  string group = 1;
   154→  map<string, string> values = 2;
   155→}
   156→
   157→service NotificationService {
   158→  rpc Send(SendNotificationRequest) returns (shopstack.common.v1.OperationResult) {
   159→    option (google.api.http) = { post: "/api/v1/notifications/send" body: "*" };
   160→  }
   161→  rpc List(ListNotificationsRequest) returns (ListNotificationsResponse) {
   162→    option (google.api.http) = { get: "/api/v1/notifications" };
   163→  }
   164→  rpc MarkRead(MarkReadRequest) returns (shopstack.common.v1.OperationResult) {
   165→    option (google.api.http) = { put: "/api/v1/notifications/{id}/read" body: "*" };
   166→  }
   167→  rpc MarkAllRead(MarkAllReadRequest) returns (shopstack.common.v1.OperationResult) {
   168→    option (google.api.http) = { post: "/api/v1/notifications/read-all" body: "*" };
   169→  }
   170→  rpc GetUnreadCount(UnreadCountRequest) returns (UnreadCountResponse) {
   171→    option (google.api.http) = { get: "/api/v1/notifications/unread-count" };
   172→  }
   173→  rpc SendSms(SendSmsRequest) returns (SendSmsResponse) {
   174→    option (google.api.http) = { post: "/api/v1/sms/send" body: "*" };
   175→  }
   176→  rpc ListSmsRecords(ListSmsRecordsRequest) returns (ListSmsRecordsResponse) {
   177→    option (google.api.http) = { get: "/api/v1/admin/sms-records" };
   178→  }
   179→  rpc ListAuditLogs(ListAuditLogsRequest) returns (ListAuditLogsResponse) {
   180→    option (google.api.http) = { get: "/api/v1/admin/audit-logs" };
   181→  }
   182→  rpc ListSystemSettings(ListSystemSettingsRequest) returns (ListSystemSettingsResponse) {
   183→    option (google.api.http) = { get: "/api/v1/admin/settings" };
   184→  }
   185→  rpc UpdateSystemSettings(UpdateSystemSettingsRequest) returns (ListSystemSettingsResponse) {
   186→    option (google.api.http) = { put: "/api/v1/admin/settings" body: "*" };
   187→  }
   188→  rpc ListNotificationTemplates(ListNotificationTemplatesRequest) returns (ListNotificationTemplatesResponse) {
   189→    option (google.api.http) = { get: "/api/v1/admin/notification-templates" };
   190→  }
   191→  rpc SaveNotificationTemplate(SaveNotificationTemplateRequest) returns (NotificationTemplate) {
   192→    option (google.api.http) = { post: "/api/v1/admin/notification-templates" };
   193→  }
   194→  rpc DeleteNotificationTemplate(DeleteNotificationTemplateRequest) returns (shopstack.common.v1.OperationResult) {
   195→    option (google.api.http) = { delete: "/api/v1/admin/notification-templates/{id}" };
   196→  }
   197→  rpc ListSmsTemplates(ListSmsTemplatesRequest) returns (ListSmsTemplatesResponse) {
   198→    option (google.api.http) = { get: "/api/v1/admin/sms-templates" };
   199→  }
   200→  rpc SaveSmsTemplate(SaveSmsTemplateRequest) returns (SmsTemplate) {
   201→    option (google.api.http) = { post: "/api/v1/admin/sms-templates" };
   202→  }
   203→  rpc DeleteSmsTemplate(DeleteSmsTemplateRequest) returns (shopstack.common.v1.OperationResult) {
   204→    option (google.api.http) = { delete: "/api/v1/admin/sms-templates/{id}" };
   205→  }
   206→  rpc ListSensitiveWords(ListSensitiveWordsRequest) returns (ListSensitiveWordsResponse) {
   207→    option (google.api.http) = { get: "/api/v1/admin/sensitive-words" };
   208→  }
   209→  rpc SaveSensitiveWord(SaveSensitiveWordRequest) returns (SensitiveWord) {
   210→    option (google.api.http) = { post: "/api/v1/admin/sensitive-words" };
   211→  }
   212→  rpc DeleteSensitiveWord(DeleteSensitiveWordRequest) returns (shopstack.common.v1.OperationResult) {
   213→    option (google.api.http) = { delete: "/api/v1/admin/sensitive-words/{id}" };
   214→  }
   215→  rpc ListNotificationCategories(ListNotificationCategoriesRequest) returns (ListNotificationCategoriesResponse) {
   216→    option (google.api.http) = { get: "/api/v1/notifications/categories" };
   217→  }
   218→}
   219→
   220→// EXTRA_MARKER: 由 scripts/extend-proto.py 追加的消息定义
   221→
   222→// ---------------------------------------------------------------------------
   223→// 通知模板 / 短信模板 / 敏感词 / 消息分类
   224→// ---------------------------------------------------------------------------
   225→
   226→message NotificationTemplate {
   227→  int64 id = 1;
   228→  string code = 2;
   229→  string name = 3;
   230→  int32 type = 4;
   231→  string title = 5;
   232→  string content = 6;
   233→  string link = 7;
   234→  bool enabled = 8;
   235→  google.protobuf.Timestamp updated_at = 9;
   236→}
   237→
   238→message ListNotificationTemplatesRequest {
   239→  shopstack.common.v1.PageRequest page = 1;
   240→  int32 type = 2;
   241→  string keyword = 3;
   242→}
   243→
   244→message ListNotificationTemplatesResponse {
   245→  repeated NotificationTemplate templates = 1;
   246→  shopstack.common.v1.PageMeta meta = 2;
   247→}
   248→
   249→message SaveNotificationTemplateRequest {
   250→  int64 id = 1;
   251→  string code = 2;
   252→  string name = 3;
   253→  int32 type = 4;
   254→  string title = 5;
   255→  string content = 6;
   256→  string link = 7;
   257→  bool enabled = 8;
   258→}
   259→
   260→message DeleteNotificationTemplateRequest {
   261→  int64 id = 1;
   262→}
   263→
   264→message SmsTemplate {
   265→  int64 id = 1;
   266→  string code = 2;
   267→  string name = 3;
   268→  string content = 4;
   269→  bool enabled = 5;
   270→  google.protobuf.Timestamp updated_at = 6;
   271→}
   272→
   273→message ListSmsTemplatesRequest {
   274→  shopstack.common.v1.PageRequest page = 1;
   275→  string keyword = 2;
   276→}
   277→
   278→message ListSmsTemplatesResponse {
   279→  repeated SmsTemplate templates = 1;
   280→  shopstack.common.v1.PageMeta meta = 2;
   281→}
   282→
   283→message SaveSmsTemplateRequest {
   284→  int64 id = 1;
   285→  string code = 2;
   286→  string name = 3;
   287→  string content = 4;
   288→  bool enabled = 5;
   289→}
   290→
   291→message DeleteSmsTemplateRequest {
   292→  int64 id = 1;
   293→}
   294→
   295→message SensitiveWord {
   296→  int64 id = 1;
   297→  string word = 2;
   298→  int32 category = 3; // 1 违规词 2 辱骂 3 广告 4 其他
   299→  int32 status = 4;   // 0 停用 1 启用
   300→  google.protobuf.Timestamp created_at = 5;
   301→}
   302→
   303→message ListSensitiveWordsRequest {
   304→  shopstack.common.v1.PageRequest page = 1;
   305→  string keyword = 2;
   306→  int32 category = 3;
   307→}
   308→
   309→message ListSensitiveWordsResponse {
   310→  repeated SensitiveWord words = 1;
   311→  shopstack.common.v1.PageMeta meta = 2;
   312→}
   313→
   314→message SaveSensitiveWordRequest {
   315→  int64 id = 1;
   316→  string word = 2;
   317→  int32 category = 3;
   318→  int32 status = 4;
   319→}
   320→
   321→message DeleteSensitiveWordRequest {
   322→  int64 id = 1;
   323→}
   324→
   325→message NotificationCategory {
   326→  int32 type = 1;
   327→  string name = 2;
   328→  string icon = 3;
   329→  int32 count = 4;
   330→  int32 unread_count = 5;
   331→}
   332→
   333→message ListNotificationCategoriesRequest {
   334→  int64 user_id = 1;
   335→}
   336→
   337→message ListNotificationCategoriesResponse {
   338→  repeated NotificationCategory categories = 1;
   339→}
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:16:11

<details><summary>🧠 思考过程</summary>

```
Now read the existing implementations.
```

</details>

Now reading the existing implementations to match conventions.

<details><summary>🛠 read</summary>

```
1→package inventory
     2→
     3→import (
     4→	"context"
     5→	"strconv"
     6→	"time"
     7→
     8→	"google.golang.org/protobuf/types/known/timestamppb"
     9→
    10→	commonv1 "github.com/shopstack/platform/gen/go/common/v1"
    11→	inventoryv1 "github.com/shopstack/platform/gen/go/inventory/v1"
    12→
    13→	"github.com/shopstack/platform/backend/internal/errs"
    14→	"github.com/shopstack/platform/backend/internal/mq"
    15→)
    16→
    17→// Service 承载库存域的业务逻辑。
    18→type Service struct {
    19→	repo *Repo
    20→	mq   *mq.Client
    21→}
    22→
    23→// NewService 构造库存服务。
    24→func NewService(repo *Repo, mqClient *mq.Client) *Service {
    25→	return &Service{repo: repo, mq: mqClient}
    26→}
    27→
    28→// GetStock 查询单个 SKU 库存。
    29→func (s *Service) GetStock(ctx context.Context, skuID int64) (*inventoryv1.Inventory, error) {
    30→	inv, err := s.repo.FindBySKU(ctx, uint64(skuID))
    31→	if err != nil {
    32→		return nil, err
    33→	}
    34→	return inventoryToProto(inv), nil
    35→}
    36→
    37→// BatchGetStock 批量查询库存。
    38→func (s *Service) BatchGetStock(ctx context.Context, skuIDs []int64) ([]*inventoryv1.Inventory, error) {
    39→	ids := make([]uint64, 0, len(skuIDs))
    40→	for _, id := range skuIDs {
    41→		if id > 0 {
    42→			ids = append(ids, uint64(id))
    43→		}
    44→	}
    45→	list, err := s.repo.FindBySKUs(ctx, ids)
    46→	if err != nil {
    47→		return nil, errs.Wrap(errs.CodeInternalError, "查询库存失败", err)
    48→	}
    49→	out := make([]*inventoryv1.Inventory, 0, len(list))
    50→	for i := range list {
    51→		out = append(out, inventoryToProto(&list[i]))
    52→	}
    53→	return out, nil
    54→}
    55→
    56→// ReserveStock 预占库存（下单时调用）。
    57→func (s *Service) ReserveStock(ctx context.Context, orderID int64, items []*inventoryv1.StockItem, bizType string) error {
    58→	if len(items) == 0 {
    59→		return errs.Invalid("没有需要预占的商品")
    60→	}
    61→	if bizType == "" {
    62→		bizType = "order"
    63→	}
    64→	bizID := strconv.FormatInt(orderID, 10)
    65→
    66→	for _, item := range items {
    67→		if item.GetQuantity() <= 0 {
    68→			continue
    69→		}
    70→		if _, err := s.repo.Reserve(ctx, uint64(item.GetSkuId()), int(item.GetQuantity()), bizType, bizID); err != nil {
    71→			// 任一 SKU 预占失败则回滚已预占的部分
    72→			s.rollbackReserve(ctx, orderID, items, bizType, bizID)
    73→			return err
    74→		}
    75→	}
    76→	return nil
    77→}
    78→
    79→// rollbackReserve 预占失败时释放已锁定的库存。
    80→func (s *Service) rollbackReserve(ctx context.Context, orderID int64, items []*inventoryv1.StockItem, bizType, bizID string) {
    81→	for _, item := range items {
    82→		if item.GetQuantity() <= 0 {
    83→			continue
    84→		}
    85→		_ = s.repo.Release(ctx, uint64(item.GetSkuId()), int(item.GetQuantity()),
    86→			bizType, bizID, "预占失败回滚")
    87→	}
    88→}
    89→
    90→// ReleaseStock 释放库存（订单取消时调用）。
    91→func (s *Service) ReleaseStock(ctx context.Context, orderID int64, items []*inventoryv1.StockItem, reason string) error {
    92→	bizID := strconv.FormatInt(orderID, 10)
    93→	for _, item := range items {
    94→		if item.GetQuantity() <= 0 {
    95→			continue
    96→		}
    97→		if err := s.repo.Release(ctx, uint64(item.GetSkuId()), int(item.GetQuantity()),
    98→			"order", bizID, reason); err != nil {
    99→			return err
   100→		}
   101→	}
   102→	return nil
   103→}
   104→
   105→// DeductStock 扣减库存（支付成功后调用）。
   106→func (s *Service) DeductStock(ctx context.Context, orderID int64, items []*inventoryv1.StockItem) error {
   107→	bizID := strconv.FormatInt(orderID, 10)
   108→	for _, item := range items {
   109→		if item.GetQuantity() <= 0 {
   110→			continue
   111→		}
   112→		if err := s.repo.Deduct(ctx, uint64(item.GetSkuId()), int(item.GetQuantity()), "order", bizID); err != nil {
   113→			return err
   114→		}
   115→	}
   116→	return nil
   117→}
   118→
   119→// AdjustStock 人工调整库存。
   120→func (s *Service) AdjustStock(ctx context.Context, skuID int64, target int32, safetyStock int32, warehouse, reason string) (*inventoryv1.Inventory, error) {
   121→	if target < 0 {
   122→		return nil, errs.Invalid("库存不能为负数")
   123→	}
   124→	inv, err := s.repo.Adjust(ctx, uint64(skuID), int(target), int(safetyStock), warehouse, reason)
   125→	if err != nil {
   126→		return nil, err
   127→	}
   128→	return inventoryToProto(inv), nil
   129→}
   130→
   131→// ListInventories 库存列表。
   132→func (s *Service) ListInventories(ctx context.Context, keyword string, productID int64, lowStockOnly bool, page *commonv1.PageRequest) (*inventoryv1.ListInventoriesResponse, error) {
   133→	pageNum, pageSize := normalizePage(page)
   134→	list, total, err := s.repo.ListInventories(ctx, keyword, uint64(productID), lowStockOnly, pageNum, pageSize)
   135→	if err != nil {
   136→		return nil, errs.Wrap(errs.CodeInternalError, "查询库存失败", err)
   137→	}
   138→	out := make([]*inventoryv1.Inventory, 0, len(list))
   139→	for i := range list {
   140→		out = append(out, inventoryToProto(&list[i]))
   141→	}
   142→	return &inventoryv1.ListInventoriesResponse{Inventories: out, Meta: buildMeta(pageNum, pageSize, total)}, nil
   143→}
   144→
   145→// ListLogs 库存流水。
   146→func (s *Service) ListLogs(ctx context.Context, skuID, productID int64, bizID string, changeType int32, page *commonv1.PageRequest) (*inventoryv1.ListInventoryLogsResponse, error) {
   147→	pageNum, pageSize := normalizePage(page)
   148→	list, total, err := s.repo.ListLogs(ctx, uint64(skuID), uint64(productID), bizID, changeType, pageNum, pageSize)
   149→	if err != nil {
   150→		return nil, errs.Wrap(errs.CodeInternalError, "查询库存流水失败", err)
   151→	}
   152→	out := make([]*inventoryv1.InventoryLog, 0, len(list))
   153→	for i := range list {
   154→		out = append(out, logToProto(&list[i]))
   155→	}
   156→	return &inventoryv1.ListInventoryLogsResponse{Logs: out, Meta: buildMeta(pageNum, pageSize, total)}, nil
   157→}
   158→
   159→// StockWarning 低库存预警。
   160→func (s *Service) StockWarning(ctx context.Context, threshold int32) (*inventoryv1.StockWarningResponse, error) {
   161→	list, err := s.repo.StockWarning(ctx, int(threshold))
   162→	if err != nil {
   163→		return nil, errs.Wrap(errs.CodeInternalError, "查询库存预警失败", err)
   164→	}
   165→	out := make([]*inventoryv1.Inventory, 0, len(list))
   166→	for i := range list {
   167→		out = append(out, inventoryToProto(&list[i]))
   168→	}
   169→	return &inventoryv1.StockWarningResponse{Inventories: out, Count: int32(len(out))}, nil
   170→}
   171→
   172→// ---------------------------------------------------------------------------
   173→// 事件消费
   174→// ---------------------------------------------------------------------------
   175→
   176→// Consumers 返回库存服务订阅的事件。
   177→func Consumers(queueName string) []mq.Consumer {
   178→	return []mq.Consumer{
   179→		{
   180→			Queue:      queueName + ".inventory",
   181→			RoutingKey: mq.EventOrderCreated,
   182→			Handler:    handleOrderCreated,
   183→		},
   184→		{
   185→			Queue:      queueName + ".inventory",
   186→			RoutingKey: mq.EventOrderPaid,
   187→			Handler:    handleOrderPaid,
   188→		},
   189→		{
   190→			Queue:      queueName + ".inventory",
   191→			RoutingKey: mq.EventOrderCancelled,
   192→			Handler:    handleOrderCancelled,
   193→		},
   194→	}
   195→}
   196→
   197→// handleOrderCreated 处理订单创建事件：预占库存。
   198→func handleOrderCreated(ctx context.Context, event *mq.Event) error {
   199→	orderID := payloadInt64(event, "order_id")
   200→	items := payloadItems(event, "items")
   201→	if orderID == 0 || len(items) == 0 {
   202→		return nil
   203→	}
   204→	protoItems := make([]*inventoryv1.StockItem, 0, len(items))
   205→	for _, it := range items {
   206→		protoItems = append(protoItems, &inventoryv1.StockItem{
   207→			SkuId: int64(it.SKUID), Quantity: int32(it.Quantity),
   208→		})
   209→	}
   210→	return globalService.ReserveStock(ctx, orderID, protoItems, "order")
   211→}
   212→
   213→// handleOrderPaid 处理支付成功事件：扣减锁定库存。
   214→func handleOrderPaid(ctx context.Context, event *mq.Event) error {
   215→	orderID := payloadInt64(event, "order_id")
   216→	items := payloadItems(event, "items")
   217→	if orderID == 0 || len(items) == 0 {
   218→		return nil
   219→	}
   220→	protoItems := make([]*inventoryv1.StockItem, 0, len(items))
   221→	for _, it := range items {
   222→		protoItems = append(protoItems, &inventoryv1.StockItem{
   223→			SkuId: int64(it.SKUID), Quantity: int32(it.Quantity),
   224→		})
   225→	}
   226→	return globalService.DeductStock(ctx, orderID, protoItems)
   227→}
   228→
   229→// handleOrderCancelled 处理订单取消事件：释放锁定库存。
   230→func handleOrderCancelled(ctx context.Context, event *mq.Event) error {
   231→	orderID := payloadInt64(event, "order_id")
   232→	items := payloadItems(event, "items")
   233→	if orderID == 0 || len(items) == 0 {
   234→		return nil
   235→	}
   236→	protoItems := make([]*inventoryv1.StockItem, 0, len(items))
   237→	for _, it := range items {
   238→		protoItems = append(protoItems, &inventoryv1.StockItem{
   239→			SkuId: int64(it.SKUID), Quantity: int32(it.Quantity),
   240→		})
   241→	}
   242→	return globalService.ReleaseStock(ctx, orderID, protoItems, "订单取消")
   243→}
   244→
   245→// globalService 供事件回调使用的服务实例。
   246→var globalService *Service
   247→
   248→// SetGlobalService 注册事件回调使用的服务实例。
   249→func SetGlobalService(s *Service) { globalService = s }
   250→
   251→// payloadItem 是事件负载中的库存明细。
   252→type payloadItem struct {
   253→	SKUID    uint64
   254→	Quantity int
   255→}
   256→
   257→func payloadInt64(event *mq.Event, key string) int64 {
   258→	if event == nil || event.Payload == nil {
   259→		return 0
   260→	}
   261→	switch v := event.Payload[key].(type) {
   262→	case float64:
   263→		return int64(v)
   264→	case int64:
   265→		return v
   266→	case int:
   267→		return int64(v)
   268→	}
   269→	return 0
   270→}
   271→
   272→func payloadItems(event *mq.Event, key string) []payloadItem {
   273→	if event == nil || event.Payload == nil {
   274→		return nil
   275→	}
   276→	raw, ok := event.Payload[key].([]any)
   277→	if !ok {
   278→		return nil
   279→	}
   280→	out := make([]payloadItem, 0, len(raw))
   281→	for _, item := range raw {
   282→		m, ok := item.(map[string]any)
   283→		if !ok {
   284→			continue
   285→		}
   286→		skuID := uint64(0)
   287→		switch v := m["sku_id"].(type) {
   288→		case float64:
   289→			skuID = uint64(v)
   290→		case int64:
   291→			skuID = uint64(v)
   292→		}
   293→		qty := 0
   294→		switch v := m["quantity"].(type) {
   295→		case float64:
   296→			qty = int(v)
   297→		case int64:
   298→			qty = int(v)
   299→		}
   300→		out = append(out, payloadItem{SKUID: skuID, Quantity: qty})
   301→	}
   302→	return out
   303→}
   304→
   305→// ---------------------------------------------------------------------------
   306→// 转换辅助
   307→// ---------------------------------------------------------------------------
   308→
   309→func inventoryToProto(inv *Inventory) *inventoryv1.Inventory {
   310→	if inv == nil {
   311→		return nil
   312→	}
   313→	return &inventoryv1.Inventory{
   314→		Id:             int64(inv.ID),
   315→		SkuId:          int64(inv.SKUID),
   316→		ProductId:      int64(inv.ProductID),
   317→		SkuCode:        inv.SKUCode,
   318→		SpecText:       inv.SpecText,
   319→		TotalStock:     int32(inv.TotalStock),
   320→		AvailableStock: int32(inv.AvailableStock),
   321→		LockedStock:    int32(inv.LockedStock),
   322→		SoldStock:      int32(inv.SoldStock),
   323→		SafetyStock:    int32(inv.SafetyStock),
   324→		Warehouse:      inv.Warehouse,
   325→		UpdatedAt:      timestamppb.New(inv.UpdatedAt),
   326→	}
   327→}
   328→
   329→func logToProto(l *InventoryLog) *inventoryv1.InventoryLog {
   330→	if l == nil {
   331→		return nil
   332→	}
   333→	return &inventoryv1.InventoryLog{
   334→		Id:          int64(l.ID),
   335→		SkuId:       int64(l.SKUID),
   336→		ProductId:   int64(l.ProductID),
   337→		SkuCode:     l.SKUCode,
   338→		ChangeType:  int32(l.ChangeType),
   339→		Quantity:    int32(l.Quantity),
   340→		BeforeStock: int32(l.BeforeStock),
   341→		AfterStock:  int32(l.AfterStock),
   342→		BizType:     l.BizType,
   343→		BizId:       l.BizID,
   344→		Operator:    l.Operator,
   345→		Remark:      l.Remark,
   346→		CreatedAt:   timestamppb.New(l.CreatedAt),
   347→	}
   348→}
   349→
   350→func normalizePage(page *commonv1.PageRequest) (int, int) {
   351→	pageNum := int(page.GetPage())
   352→	pageSize := int(page.GetPageSize())
   353→	if pageNum <= 0 {
   354→		pageNum = 1
   355→	}
   356→	if pageSize <= 0 {
   357→		pageSize = 20
   358→	}
   359→	if pageSize > 100 {
   360→		pageSize = 100
   361→	}
   362→	return pageNum, pageSize
   363→}
   364→
   365→func buildMeta(page, pageSize int, total int64) *commonv1.PageMeta {
   366→	totalPages := int64(0)
   367→	if pageSize > 0 {
   368→		totalPages = (total + int64(pageSize) - 1) / int64(pageSize)
   369→	}
   370→	return &commonv1.PageMeta{
   371→		Page: int32(page), PageSize: int32(pageSize),
   372→		Total: total, TotalPages: int32(totalPages),
   373→	}
   374→}
   375→
   376→var _ = time.Now
```

</details>

<details><summary>🛠 read</summary>

```
1→// Package inventory 实现库存服务，负责预占、释放、扣减与库存流水。
     2→//
     3→// 库存模型采用「总量 = 可用 + 锁定 + 已售」的三段式账本：
     4→//   - 预占（Reserve）：下单时锁定库存，available 减少、locked 增加。
     5→//   - 释放（Release）：订单取消或超时未支付，把 locked 归还 available。
     6→//   - 扣减（Deduct）：支付成功后，把 locked 转为 sold。
     7→//
     8→// 所有变更都使用乐观锁（version 字段）+ 行级条件更新，防止超卖。
     9→package inventory
    10→
    11→import (
    12→	"context"
    13→	"errors"
    14→	"time"
    15→
    16→	"gorm.io/gorm"
    17→
    18→	"github.com/shopstack/platform/backend/internal/errs"
    19→)
    20→
    21→// 库存变更类型
    22→const (
    23→	ChangeTypeInbound  = 1 // 入库
    24→	ChangeTypeReserve  = 2 // 预占
    25→	ChangeTypeRelease  = 3 // 释放
    26→	ChangeTypeDeduct   = 4 // 扣减
    27→	ChangeTypeAdjust   = 5 // 调整
    28→	ChangeTypeReturnIn = 6 // 退货入库
    29→)
    30→
    31→// Inventory 是库存模型。
    32→type Inventory struct {
    33→	ID             uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
    34→	SKUID          uint64    `gorm:"column:sku_id;not null;uniqueIndex" json:"sku_id"`
    35→	ProductID      uint64    `gorm:"column:product_id;not null;default:0;index" json:"product_id"`
    36→	SKUCode        string    `gorm:"column:sku_code;type:varchar(64);not null;default:''" json:"sku_code"`
    37→	SpecText       string    `gorm:"column:spec_text;type:varchar(255);not null;default:''" json:"spec_text"`
    38→	TotalStock     int       `gorm:"column:total_stock;not null;default:0" json:"total_stock"`
    39→	AvailableStock int       `gorm:"column:available_stock;not null;default:0;index" json:"available_stock"`
    40→	LockedStock    int       `gorm:"column:locked_stock;not null;default:0" json:"locked_stock"`
    41→	SoldStock      int       `gorm:"column:sold_stock;not null;default:0" json:"sold_stock"`
    42→	SafetyStock    int       `gorm:"column:safety_stock;not null;default:0" json:"safety_stock"`
    43→	Warehouse      string    `gorm:"type:varchar(64);not null;default:'默认仓'" json:"warehouse"`
    44→	Version        int       `gorm:"not null;default:0" json:"version"`
    45→	CreatedAt      time.Time `json:"created_at"`
    46→	UpdatedAt      time.Time `json:"updated_at"`
    47→}
    48→
    49→// TableName 指定表名。
    50→func (Inventory) TableName() string { return "inventories" }
    51→
    52→// InventoryLog 是库存流水模型。
    53→type InventoryLog struct {
    54→	ID          uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
    55→	SKUID       uint64    `gorm:"column:sku_id;not null;index" json:"sku_id"`
    56→	ProductID   uint64    `gorm:"column:product_id;not null;default:0" json:"product_id"`
    57→	SKUCode     string    `gorm:"column:sku_code;type:varchar(64);not null;default:''" json:"sku_code"`
    58→	ChangeType  int8      `gorm:"column:change_type;not null" json:"change_type"`
    59→	Quantity    int       `gorm:"not null;default:0" json:"quantity"`
    60→	BeforeStock int       `gorm:"column:before_stock;not null;default:0" json:"before_stock"`
    61→	AfterStock  int       `gorm:"column:after_stock;not null;default:0" json:"after_stock"`
    62→	BizType     string    `gorm:"column:biz_type;type:varchar(32);not null;default:''" json:"biz_type"`
    63→	BizID       string    `gorm:"column:biz_id;type:varchar(64);not null;default:'';index" json:"biz_id"`
    64→	Operator    string    `gorm:"type:varchar(64);not null;default:''" json:"operator"`
    65→	Remark      string    `gorm:"type:varchar(255);not null;default:''" json:"remark"`
    66→	CreatedAt   time.Time `json:"created_at"`
    67→}
    68→
    69→// TableName 指定表名。
    70→func (InventoryLog) TableName() string { return "inventory_logs" }
    71→
    72→// StockItem 表示一次库存操作中的一条 SKU 明细。
    73→type StockItem struct {
    74→	SKUID    uint64
    75→	Quantity int
    76→}
    77→
    78→// Repo 封装库存域的数据访问。
    79→type Repo struct {
    80→	db *gorm.DB
    81→}
    82→
    83→// NewRepo 构造仓储。
    84→func NewRepo(db *gorm.DB) *Repo { return &Repo{db: db} }
    85→
    86→// DB 暴露底层数据库句柄。
    87→func (r *Repo) DB() *gorm.DB { return r.db }
    88→
    89→// FindBySKU 按 SKU 查询库存。
    90→func (r *Repo) FindBySKU(ctx context.Context, skuID uint64) (*Inventory, error) {
    91→	var inv Inventory
    92→	if err := r.db.WithContext(ctx).Where("sku_id = ?", skuID).First(&inv).Error; err != nil {
    93→		if errors.Is(err, gorm.ErrRecordNotFound) {
    94→			return nil, errs.New(errs.CodeStockNotFound, "商品库存记录不存在")
    95→		}
    96→		return nil, err
    97→	}
    98→	return &inv, nil
    99→}
   100→
   101→// FindBySKUs 批量查询库存。
   102→func (r *Repo) FindBySKUs(ctx context.Context, skuIDs []uint64) ([]Inventory, error) {
   103→	if len(skuIDs) == 0 {
   104→		return []Inventory{}, nil
   105→	}
   106→	var list []Inventory
   107→	err := r.db.WithContext(ctx).Where("sku_id IN ?", skuIDs).Find(&list).Error
   108→	return list, err
   109→}
   110→
   111→// EnsureInventory 保证库存记录存在，不存在时按初始值创建。
   112→func (r *Repo) EnsureInventory(ctx context.Context, skuID, productID uint64, skuCode, specText string, initial int) (*Inventory, error) {
   113→	inv, err := r.FindBySKU(ctx, skuID)
   114→	if err == nil {
   115→		return inv, nil
   116→	}
   117→	if !errs.IsCode(err, errs.CodeStockNotFound) {
   118→		return nil, err
   119→	}
   120→	newInv := &Inventory{
   121→		SKUID:          skuID,
   122→		ProductID:      productID,
   123→		SKUCode:        skuCode,
   124→		SpecText:       specText,
   125→		TotalStock:     initial,
   126→		AvailableStock: initial,
   127→		Warehouse:      "默认仓",
   128→	}
   129→	if err := r.db.WithContext(ctx).Create(newInv).Error; err != nil {
   130→		// 并发创建时回退到查询
   131→		if inv2, e2 := r.FindBySKU(ctx, skuID); e2 == nil {
   132→			return inv2, nil
   133→		}
   134→		return nil, errs.Wrap(errs.CodeInternalError, "初始化库存失败", err)
   135→	}
   136→	return newInv, nil
   137→}
   138→
   139→// Reserve 预占库存：available -= qty, locked += qty。
   140→//
   141→// 使用带条件的原子更新（available_stock >= qty）防止超卖。
   142→func (r *Repo) Reserve(ctx context.Context, skuID uint64, qty int, bizType, bizID string) (int, error) {
   143→	if qty <= 0 {
   144→		return 0, errs.Invalid("预占数量必须大于 0")
   145→	}
   146→	var before int
   147→	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
   148→		var inv Inventory
   149→		if e := tx.Where("sku_id = ?", skuID).First(&inv).Error; e != nil {
   150→			return errs.New(errs.CodeStockNotFound, "商品库存记录不存在")
   151→		}
   152→		if inv.AvailableStock < qty {
   153→			return errs.New(errs.CodeStockInsufficient,
   154→				"库存不足").WithDetail("available", strconvItoa(inv.AvailableStock))
   155→		}
   156→		before = inv.AvailableStock
   157→		res := tx.Model(&Inventory{}).
   158→			Where("sku_id = ? AND available_stock >= ?", skuID, qty).
   159→			Updates(map[string]any{
   160→				"available_stock": gorm.Expr("available_stock - ?", qty),
   161→				"locked_stock":    gorm.Expr("locked_stock + ?", qty),
   162→				"version":         gorm.Expr("version + 1"),
   163→			})
   164→		if res.Error != nil {
   165→			return res.Error
   166→		}
   167→		if res.RowsAffected == 0 {
   168→			return errs.New(errs.CodeStockInsufficient, "库存不足")
   169→		}
   170→		return tx.Create(&InventoryLog{
   171→			SKUID:       skuID,
   172→			ProductID:   inv.ProductID,
   173→			SKUCode:     inv.SKUCode,
   174→			ChangeType:  ChangeTypeReserve,
   175→			Quantity:    -qty,
   176→			BeforeStock: before,
   177→			AfterStock:  before - qty,
   178→			BizType:     bizType,
   179→			BizID:       bizID,
   180→		}).Error
   181→	})
   182→	return before, err
   183→}
   184→
   185→// Release 释放预占：locked -= qty, available += qty。
   186→func (r *Repo) Release(ctx context.Context, skuID uint64, qty int, bizType, bizID, reason string) error {
   187→	if qty <= 0 {
   188→		return errs.Invalid("释放数量必须大于 0")
   189→	}
   190→	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
   191→		var inv Inventory
   192→		if e := tx.Where("sku_id = ?", skuID).First(&inv).Error; e != nil {
   193→			return errs.New(errs.CodeStockNotFound, "商品库存记录不存在")
   194→		}
   195→		if inv.LockedStock < qty {
   196→			qty = inv.LockedStock
   197→		}
   198→		if qty == 0 {
   199→			return nil
   200→		}
   201→		res := tx.Model(&Inventory{}).
   202→			Where("sku_id = ? AND locked_stock >= ?", skuID, qty).
   203→			Updates(map[string]any{
   204→				"available_stock": gorm.Expr("available_stock + ?", qty),
   205→				"locked_stock":    gorm.Expr("locked_stock - ?", qty),
   206→				"version":         gorm.Expr("version + 1"),
   207→			})
   208→		if res.Error != nil {
   209→			return res.Error
   210→		}
   211→		return tx.Create(&InventoryLog{
   212→			SKUID:       skuID,
   213→			ProductID:   inv.ProductID,
   214→			SKUCode:     inv.SKUCode,
   215→			ChangeType:  ChangeTypeRelease,
   216→			Quantity:    qty,
   217→			BeforeStock: inv.AvailableStock,
   218→			AfterStock:  inv.AvailableStock + qty,
   219→			BizType:     bizType,
   220→			BizID:       bizID,
   221→			Remark:      reason,
   222→		}).Error
   223→	})
   224→}
   225→
   226→// Deduct 扣减库存：locked -= qty, sold += qty。
   227→//
   228→// 兼容直接扣减（无预占）的场景：此时从 available 中扣。
   229→func (r *Repo) Deduct(ctx context.Context, skuID uint64, qty int, bizType, bizID string) error {
   230→	if qty <= 0 {
   231→		return errs.Invalid("扣减数量必须大于 0")
   232→	}
   233→	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
   234→		var inv Inventory
   235→		if e := tx.Where("sku_id = ?", skuID).First(&inv).Error; e != nil {
   236→			return errs.New(errs.CodeStockNotFound, "商品库存记录不存在")
   237→		}
   238→		fromLocked := inv.LockedStock >= qty
   239→		updates := map[string]any{
   240→			"sold_stock": gorm.Expr("sold_stock + ?", qty),
   241→			"version":    gorm.Expr("version + 1"),
   242→		}
   243→		if fromLocked {
   244→			updates["locked_stock"] = gorm.Expr("locked_stock - ?", qty)
   245→		} else {
   246→			if inv.AvailableStock < qty {
   247→				return errs.New(errs.CodeStockInsufficient, "库存不足")
   248→			}
   249→			updates["available_stock"] = gorm.Expr("available_stock - ?", qty)
   250→		}
   251→		if err := tx.Model(&Inventory{}).Where("sku_id = ?", skuID).Updates(updates).Error; err != nil {
   252→			return err
   253→		}
   254→		return tx.Create(&InventoryLog{
   255→			SKUID:       skuID,
   256→			ProductID:   inv.ProductID,
   257→			SKUCode:     inv.SKUCode,
   258→			ChangeType:  ChangeTypeDeduct,
   259→			Quantity:    -qty,
   260→			BeforeStock: inv.AvailableStock,
   261→			AfterStock:  inv.AvailableStock,
   262→			BizType:     bizType,
   263→			BizID:       bizID,
   264→		}).Error
   265→	})
   266→}
   267→
   268→// Adjust 调整库存到目标值。
   269→func (r *Repo) Adjust(ctx context.Context, skuID uint64, target, safetyStock int, warehouse, reason string) (*Inventory, error) {
   270→	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
   271→		var inv Inventory
   272→		if e := tx.Where("sku_id = ?", skuID).First(&inv).Error; e != nil {
   273→			return errs.New(errs.CodeStockNotFound, "商品库存记录不存在")
   274→		}
   275→		delta := target - inv.AvailableStock
   276→		updates := map[string]any{
   277→			"available_stock": target,
   278→			"total_stock":     inv.LockedStock + inv.SoldStock + target,
   279→			"version":         gorm.Expr("version + 1"),
   280→		}
   281→		if safetyStock >= 0 {
   282→			updates["safety_stock"] = safetyStock
   283→		}
   284→		if warehouse != "" {
   285→			updates["warehouse"] = warehouse
   286→		}
   287→		if err := tx.Model(&Inventory{}).Where("sku_id = ?", skuID).Updates(updates).Error; err != nil {
   288→			return err
   289→		}
   290→		return tx.Create(&InventoryLog{
   291→			SKUID:       skuID,
   292→			ProductID:   inv.ProductID,
   293→			SKUCode:     inv.SKUCode,
   294→			ChangeType:  ChangeTypeAdjust,
   295→			Quantity:    delta,
   296→			BeforeStock: inv.AvailableStock,
   297→			AfterStock:  target,
   298→			BizType:     "manual",
   299→			Operator:    "admin",
   300→			Remark:      reason,
   301→		}).Error
   302→	})
   303→	if err != nil {
   304→		return nil, err
   305→	}
   306→	return r.FindBySKU(ctx, skuID)
   307→}
   308→
   309→// ListInventories 分页查询库存列表。
   310→func (r *Repo) ListInventories(ctx context.Context, keyword string, productID uint64, lowStockOnly bool, page, pageSize int) ([]Inventory, int64, error) {
   311→	q := r.db.WithContext(ctx).Model(&Inventory{})
   312→	if keyword != "" {
   313→		like := "%" + keyword + "%"
   314→		q = q.Where("sku_code LIKE ? OR spec_text LIKE ?", like, like)
   315→	}
   316→	if productID > 0 {
   317→		q = q.Where("product_id = ?", productID)
   318→	}
   319→	if lowStockOnly {
   320→		q = q.Where("available_stock <= safety_stock")
   321→	}
   322→
   323→	var total int64
   324→	if err := q.Count(&total).Error; err != nil {
   325→		return nil, 0, err
   326→	}
   327→	var list []Inventory
   328→	err := q.Order("available_stock ASC, id ASC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
   329→	return list, total, err
   330→}
   331→
   332→// ListLogs 分页查询库存流水。
   333→func (r *Repo) ListLogs(ctx context.Context, skuID, productID uint64, bizID string, changeType int32, page, pageSize int) ([]InventoryLog, int64, error) {
   334→	q := r.db.WithContext(ctx).Model(&InventoryLog{})
   335→	if skuID > 0 {
   336→		q = q.Where("sku_id = ?", skuID)
   337→	}
   338→	if productID > 0 {
   339→		q = q.Where("product_id = ?", productID)
   340→	}
   341→	if bizID != "" {
   342→		q = q.Where("biz_id = ?", bizID)
   343→	}
   344→	if changeType > 0 {
   345→		q = q.Where("change_type = ?", changeType)
   346→	}
   347→
   348→	var total int64
   349→	if err := q.Count(&total).Error; err != nil {
   350→		return nil, 0, err
   351→	}
   352→	var list []InventoryLog
   353→	err := q.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
   354→	return list, total, err
   355→}
   356→
   357→// StockWarning 查询低于安全库存的商品。
   358→func (r *Repo) StockWarning(ctx context.Context, threshold int) ([]Inventory, error) {
   359→	q := r.db.WithContext(ctx).Model(&Inventory{}).Where("available_stock <= safety_stock")
   360→	if threshold > 0 {
   361→		q = q.Where("available_stock <= ?", threshold)
   362→	}
   363→	var list []Inventory
   364→	err := q.Order("available_stock ASC").Limit(100).Find(&list).Error
   365→	return list, err
   366→}
   367→
   368→func strconvItoa(n int) string {
   369→	if n == 0 {
   370→		return "0"
   371→	}
   372→	neg := n < 0
   373→	if neg {
   374→		n = -n
   375→	}
   376→	buf := [20]byte{}
   377→	i := len(buf)
   378→	for n > 0 {
   379→		i--
   380→		buf[i] = byte('0' + n%10)
   381→		n /= 10
   382→	}
   383→	if neg {
   384→		i--
   385→		buf[i] = '-'
   386→	}
   387→	return string(buf[i:])
   388→}
```

</details>

<details><summary>🛠 read</summary>

```
1→package inventory
     2→
     3→import (
     4→	"context"
     5→
     6→	commonv1 "github.com/shopstack/platform/gen/go/common/v1"
     7→	inventoryv1 "github.com/shopstack/platform/gen/go/inventory/v1"
     8→)
     9→
    10→// Handler 实现 InventoryService。
    11→type Handler struct {
    12→	inventoryv1.UnimplementedInventoryServiceServer
    13→	service *Service
    14→}
    15→
    16→// NewHandler 构造处理器。
    17→func NewHandler(service *Service) *Handler {
    18→	return &Handler{service: service}
    19→}
    20→
    21→// GetStock 查询库存。
    22→func (h *Handler) GetStock(ctx context.Context, req *inventoryv1.GetStockRequest) (*inventoryv1.Inventory, error) {
    23→	return h.service.GetStock(ctx, req.GetSkuId())
    24→}
    25→
    26→// BatchGetStock 批量查询库存。
    27→func (h *Handler) BatchGetStock(ctx context.Context, req *inventoryv1.BatchGetStockRequest) (*inventoryv1.BatchGetStockResponse, error) {
    28→	list, err := h.service.BatchGetStock(ctx, req.GetSkuIds())
    29→	if err != nil {
    30→		return nil, err
    31→	}
    32→	return &inventoryv1.BatchGetStockResponse{Inventories: list}, nil
    33→}
    34→
    35→// ReserveStock 预占库存。
    36→func (h *Handler) ReserveStock(ctx context.Context, req *inventoryv1.ReserveStockRequest) (*commonv1.OperationResult, error) {
    37→	if err := h.service.ReserveStock(ctx, req.GetOrderId(), req.GetItems(), req.GetBizType()); err != nil {
    38→		return nil, err
    39→	}
    40→	return &commonv1.OperationResult{Success: true, Message: "库存已预占"}, nil
    41→}
    42→
    43→// ReleaseStock 释放库存。
    44→func (h *Handler) ReleaseStock(ctx context.Context, req *inventoryv1.ReleaseStockRequest) (*commonv1.OperationResult, error) {
    45→	if err := h.service.ReleaseStock(ctx, req.GetOrderId(), req.GetItems(), req.GetReason()); err != nil {
    46→		return nil, err
    47→	}
    48→	return &commonv1.OperationResult{Success: true, Message: "库存已释放"}, nil
    49→}
    50→
    51→// DeductStock 扣减库存。
    52→func (h *Handler) DeductStock(ctx context.Context, req *inventoryv1.DeductStockRequest) (*commonv1.OperationResult, error) {
    53→	if err := h.service.DeductStock(ctx, req.GetOrderId(), req.GetItems()); err != nil {
    54→		return nil, err
    55→	}
    56→	return &commonv1.OperationResult{Success: true, Message: "库存已扣减"}, nil
    57→}
    58→
    59→// AdjustStock 调整库存。
    60→func (h *Handler) AdjustStock(ctx context.Context, req *inventoryv1.AdjustStockRequest) (*inventoryv1.Inventory, error) {
    61→	return h.service.AdjustStock(ctx, req.GetSkuId(), req.GetQuantity(),
    62→		req.GetSafetyStock(), req.GetWarehouse(), req.GetReason())
    63→}
    64→
    65→// ListInventories 库存列表。
    66→func (h *Handler) ListInventories(ctx context.Context, req *inventoryv1.ListInventoriesRequest) (*inventoryv1.ListInventoriesResponse, error) {
    67→	return h.service.ListInventories(ctx, req.GetKeyword(), req.GetProductId(),
    68→		req.GetLowStockOnly() > 0, req.GetPage())
    69→}
    70→
    71→// ListLogs 库存流水。
    72→func (h *Handler) ListLogs(ctx context.Context, req *inventoryv1.ListInventoryLogsRequest) (*inventoryv1.ListInventoryLogsResponse, error) {
    73→	return h.service.ListLogs(ctx, req.GetSkuId(), req.GetProductId(),
    74→		req.GetBizId(), req.GetChangeType(), req.GetPage())
    75→}
    76→
    77→// StockWarning 库存预警。
    78→func (h *Handler) StockWarning(ctx context.Context, req *inventoryv1.StockWarningRequest) (*inventoryv1.StockWarningResponse, error) {
    79→	return h.service.StockWarning(ctx, req.GetThreshold())
    80→}
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:16:14

<details><summary>🧠 思考过程</summary>

```
Now read payment and notification.
```

</details>

<details><summary>🛠 read</summary>

```
1→package payment
     2→
     3→import (
     4→	"context"
     5→	"encoding/json"
     6→	"fmt"
     7→	"math/rand"
     8→	"strconv"
     9→	"time"
    10→
    11→	"go.uber.org/zap"
    12→	"google.golang.org/protobuf/types/known/timestamppb"
    13→
    14→	commonv1 "github.com/shopstack/platform/gen/go/common/v1"
    15→	orderv1 "github.com/shopstack/platform/gen/go/order/v1"
    16→	paymentv1 "github.com/shopstack/platform/gen/go/payment/v1"
    17→
    18→	"github.com/shopstack/platform/backend/internal/auth"
    19→	"github.com/shopstack/platform/backend/internal/client"
    20→	"github.com/shopstack/platform/backend/internal/errs"
    21→	"github.com/shopstack/platform/backend/internal/logger"
    22→	"github.com/shopstack/platform/backend/internal/mq"
    23→	"github.com/shopstack/platform/backend/internal/thirdparty"
    24→)
    25→
    26→// Service 承载支付域的业务逻辑。
    27→type Service struct {
    28→	repo      *Repo
    29→	registry  *client.Registry
    30→	providers *thirdparty.Providers
    31→	mq        *mq.Client
    32→}
    33→
    34→// NewService 构造支付服务。
    35→func NewService(repo *Repo, registry *client.Registry, providers *thirdparty.Providers, mqClient *mq.Client) *Service {
    36→	return &Service{repo: repo, registry: registry, providers: providers, mq: mqClient}
    37→}
    38→
    39→// CreatePayment 创建支付单并唤起支付。
    40→func (s *Service) CreatePayment(ctx context.Context, req *paymentv1.CreatePaymentRequest) (*paymentv1.Payment, error) {
    41→	userID := req.GetUserId()
    42→	if userID <= 0 {
    43→		userID = auth.UserIDFromContext(ctx)
    44→	}
    45→	if userID <= 0 {
    46→		return nil, errs.Unauthorized("请先登录")
    47→	}
    48→	if req.GetOrderId() <= 0 {
    49→		return nil, errs.Invalid("订单 ID 不能为空")
    50→	}
    51→
    52→	channel := int8(req.GetChannel())
    53→	if channel == 0 {
    54→		channel = ChannelWeChat
    55→	}
    56→
    57→	// 幂等：同一订单存在待支付流水则直接复用
    58→	existing, err := s.repo.FindPaymentByOrder(ctx, uint64(req.GetOrderId()))
    59→	if err == nil && existing.Status == StatusPending {
    60→		return paymentToProto(existing), nil
    61→	}
    62→
    63→	// 查询订单确认金额
    64→	order, oErr := s.fetchOrder(ctx, req.GetOrderId())
    65→	if oErr != nil {
    66→		return nil, oErr
    67→	}
    68→	if userID != order.GetUserId() {
    69→		return nil, errs.New(errs.CodeForbidden, "无权支付该订单")
    70→	}
    71→	if order.GetPayableCents() <= 0 {
    72→		return nil, errs.Invalid("订单金额异常")
    73→	}
    74→
    75→	p := &Payment{
    76→		PaymentNo:   generatePaymentNo(time.Now()),
    77→		OrderID:     uint64(order.GetId()),
    78→		OrderNo:     order.GetOrderNo(),
    79→		UserID:      uint64(userID),
    80→		AmountCents: order.GetPayableCents(),
    81→		Status:      StatusPending,
    82→		Channel:     channel,
    83→	}
    84→	if err := s.repo.CreatePayment(ctx, p); err != nil {
    85→		return nil, errs.Wrap(errs.CodeInternalError, "创建支付单失败", err)
    86→	}
    87→
    88→	// 唤起支付
    89→	payload, payErr := s.providers.WeChat.CreatePay(ctx, thirdparty.PayParams{
    90→		OrderNo:     p.PaymentNo,
    91→		AmountCents: p.AmountCents,
    92→		Description: "订单 " + p.OrderNo,
    93→		NotifyURL:   "",
    94→		TradeType:   "JSAPI",
    95→	})
    96→	if payErr != nil {
    97→		_ = s.repo.UpdatePaymentFields(ctx, p.ID, map[string]any{
    98→			"status":      StatusFailed,
    99→			"fail_reason": payErr.Error(),
   100→		})
   101→		return nil, errs.Wrap(errs.CodePaymentFailed, "发起支付失败", payErr)
   102→	}
   103→
   104→	params := map[string]string{
   105→		"appId":     payload.AppID,
   106→		"timeStamp": payload.TimeStamp,
   107→		"nonceStr":  payload.NonceStr,
   108→		"package":   payload.Package,
   109→		"signType":  payload.SignType,
   110→		"paySign":   payload.PaySign,
   111→		"prepayId":  payload.PrepayID,
   112→	}
   113→	for k, v := range payload.Extra {
   114→		params[k] = v
   115→	}
   116→	raw, _ := json.Marshal(params)
   117→
   118→	if err := s.repo.UpdatePaymentFields(ctx, p.ID, map[string]any{
   119→		"prepay_id":  payload.PrepayID,
   120→		"pay_params": string(raw),
   121→	}); err != nil {
   122→		logger.L().Warn("更新支付参数失败", zap.Error(err))
   123→	}
   124→
   125→	// 演示环境下 Mock 支付会直接回调，避免前端卡在支付中
   126→	if s.providers.WeChat.Mock() {
   127→		go s.mockSettle(ctx, p.ID, p.PaymentNo)
   128→	}
   129→
   130→	updated, err := s.repo.FindPaymentByID(ctx, p.ID)
   131→	if err != nil {
   132→		return nil, err
   133→	}
   134→	return paymentToProto(updated), nil
   135→}
   136→
   137→// mockSettle 模拟支付成功回调（仅 Mock 通道生效）。
   138→func (s *Service) mockSettle(ctx context.Context, paymentID uint64, paymentNo string) {
   139→	time.Sleep(1200 * time.Millisecond)
   140→	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
   141→	defer cancel()
   142→	if err := s.settle(ctx, paymentID, paymentNo, "MOCK_"+paymentNo, 2); err != nil {
   143→		logger.L().Error("模拟支付结算失败", zap.Uint64("支付ID", paymentID), zap.Error(err))
   144→	}
   145→}
   146→
   147→// QueryPayment 查询支付单。
   148→func (s *Service) QueryPayment(ctx context.Context, paymentID, orderID, userID int64) (*paymentv1.Payment, error) {
   149→	var (
   150→		p   *Payment
   151→		err error
   152→	)
   153→	switch {
   154→	case paymentID > 0:
   155→		p, err = s.repo.FindPaymentByID(ctx, uint64(paymentID))
   156→	case orderID > 0:
   157→		p, err = s.repo.FindPaymentByOrder(ctx, uint64(orderID))
   158→	default:
   159→		return nil, errs.Invalid("请指定支付单 ID 或订单 ID")
   160→	}
   161→	if err != nil {
   162→		return nil, err
   163→	}
   164→	if userID > 0 && uint64(userID) != p.UserID {
   165→		return nil, errs.New(errs.CodeForbidden, "无权查看该支付单")
   166→	}
   167→	return paymentToProto(p), nil
   168→}
   169→
   170→// Notify 处理支付回调。
   171→func (s *Service) Notify(ctx context.Context, req *paymentv1.PaymentCallbackRequest) error {
   172→	if req.GetPaymentNo() == "" {
   173→		return errs.Invalid("缺少支付单号")
   174→	}
   175→	status := int8(req.GetStatus())
   176→	if status == 0 {
   177→		status = StatusSuccess
   178→	}
   179→	return s.settle(ctx, 0, req.GetPaymentNo(), req.GetTransactionId(), status)
   180→}
   181→
   182→// settle 完成支付结算。
   183→func (s *Service) settle(ctx context.Context, paymentID uint64, paymentNo, transactionID string, status int8) error {
   184→	var (
   185→		p   *Payment
   186→		err error
   187→	)
   188→	if paymentID > 0 {
   189→		p, err = s.repo.FindPaymentByID(ctx, paymentID)
   190→	} else {
   191→		p, err = s.repo.FindPaymentByNo(ctx, paymentNo)
   192→	}
   193→	if err != nil {
   194→		return err
   195→	}
   196→
   197→	if status != StatusSuccess {
   198→		_ = s.repo.UpdatePaymentFields(ctx, p.ID, map[string]any{
   199→			"status":      status,
   200→			"fail_reason": "支付未完成",
   201→		})
   202→		return nil
   203→	}
   204→
   205→	now := time.Now()
   206→	updated, err := s.repo.MarkSuccess(ctx, p.ID, transactionID, now)
   207→	if err != nil {
   208→		return errs.Wrap(errs.CodeInternalError, "更新支付状态失败", err)
   209→	}
   210→	if !updated {
   211→		// 已经是成功状态，幂等返回
   212→		logger.L().Info("支付单已处于成功状态，忽略重复回调",
   213→			zap.String("支付单号", p.PaymentNo))
   214→		return nil
   215→	}
   216→
   217→	logger.L().Info("支付成功",
   218→		zap.String("支付单号", p.PaymentNo),
   219→		zap.String("订单号", p.OrderNo),
   220→		zap.Int64("金额", p.AmountCents))
   221→
   222→	// 发布支付成功事件，驱动订单状态流转
   223→	if s.mq != nil {
   224→		s.mq.PublishAsync(mq.NewEvent(mq.EventPaymentSuccess, "payment-service", "", map[string]any{
   225→			"payment_id":     int64(p.ID),
   226→			"payment_no":     p.PaymentNo,
   227→			"order_id":       int64(p.OrderID),
   228→			"order_no":       p.OrderNo,
   229→			"user_id":        int64(p.UserID),
   230→			"amount":         p.AmountCents,
   231→			"transaction_id": transactionID,
   232→		}))
   233→	}
   234→	return nil
   235→}
   236→
   237→// CreateRefund 发起退款。
   238→func (s *Service) CreateRefund(ctx context.Context, req *paymentv1.CreateRefundRequest) (*paymentv1.PaymentRefund, error) {
   239→	if req.GetAmountCents() <= 0 {
   240→		return nil, errs.Invalid("退款金额必须大于 0")
   241→	}
   242→	if req.GetPaymentId() <= 0 && req.GetOrderId() <= 0 {
   243→		return nil, errs.Invalid("请指定支付单或订单")
   244→	}
   245→
   246→	var p *Payment
   247→	var err error
   248→	if req.GetPaymentId() > 0 {
   249→		p, err = s.repo.FindPaymentByID(ctx, uint64(req.GetPaymentId()))
   250→	} else {
   251→		p, err = s.repo.FindPaymentByOrder(ctx, uint64(req.GetOrderId()))
   252→	}
   253→	if err != nil {
   254→		return nil, err
   255→	}
   256→	if p.Status != StatusSuccess {
   257→		return nil, errs.New(errs.CodeRefundFailed, "该支付单尚未支付成功，无法退款")
   258→	}
   259→	remain := p.AmountCents - p.RefundedCents
   260→	if req.GetAmountCents() > remain {
   261→		return nil, errs.New(errs.CodeRefundFailed, "退款金额超过可退金额")
   262→	}
   263→
   264→	rf := &PaymentRefund{
   265→		RefundNo:      "PR" + generatePaymentNo(time.Now()),
   266→		PaymentID:     p.ID,
   267→		OrderID:       p.OrderID,
   268→		AmountCents:   req.GetAmountCents(),
   269→		Status:        1,
   270→		Reason:        req.GetReason(),
   271→		TransactionID: "MOCK_REFUND_" + p.PaymentNo,
   272→	}
   273→	if err := s.repo.CreateRefund(ctx, rf); err != nil {
   274→		return nil, errs.Wrap(errs.CodeInternalError, "创建退款记录失败", err)
   275→	}
   276→
   277→	if err := s.repo.UpdatePaymentFields(ctx, p.ID, map[string]any{
   278→		"refunded_cents": p.RefundedCents + req.GetAmountCents(),
   279→	}); err != nil {
   280→		logger.L().Warn("更新支付单退款金额失败", zap.Error(err))
   281→	}
   282→
   283→	return paymentRefundToProto(rf), nil
   284→}
   285→
   286→// ListPayments 分页查询支付流水。
   287→func (s *Service) ListPayments(ctx context.Context, status, channel int32, keyword string, userID int64, start, end time.Time, page *commonv1.PageRequest) (*paymentv1.ListPaymentsResponse, error) {
   288→	pageNum, pageSize := normalizePage(page)
   289→
   290→	list, total, err := s.repo.ListPayments(ctx, int8(status), int8(channel), keyword,
   291→		uint64(userID), start, end, pageNum, pageSize)
   292→	if err != nil {
   293→		return nil, errs.Wrap(errs.CodeInternalError, "查询支付流水失败", err)
   294→	}
   295→
   296→	out := make([]*paymentv1.Payment, 0, len(list))
   297→	for i := range list {
   298→		out = append(out, paymentToProto(&list[i]))
   299→	}
   300→
   301→	_, totalAmount, totalRefunded, _ := s.repo.Totals(ctx, time.Time{}, time.Time{})
   302→
   303→	return &paymentv1.ListPaymentsResponse{
   304→		Payments:           out,
   305→		Meta:               buildMeta(pageNum, pageSize, total),
   306→		TotalAmountCents:   totalAmount,
   307→		TotalRefundedCents: totalRefunded,
   308→	}, nil
   309→}
   310→
   311→// Summary 支付统计汇总。
   312→func (s *Service) Summary(ctx context.Context, days int32) (*paymentv1.PaymentSummaryResponse, error) {
   313→	if days <= 0 {
   314→		days = 30
   315→	}
   316→	now := time.Now()
   317→	start := now.AddDate(0, 0, -int(days))
   318→	todayStart := now.Truncate(24 * time.Hour)
   319→
   320→	totalCount, totalAmount, refunded, err := s.repo.Totals(ctx, start, now)
   321→	if err != nil {
   322→		return nil, errs.Wrap(errs.CodeInternalError, "统计支付数据失败", err)
   323→	}
   324→	todayCount, todayAmount, _, err := s.repo.Totals(ctx, todayStart, now)
   325→	if err != nil {
   326→		return nil, errs.Wrap(errs.CodeInternalError, "统计今日支付数据失败", err)
   327→	}
   328→
   329→	// 成功率：成功笔数 / 总创建笔数
   330→	var created int64
   331→	if cErr := s.repo.DB().WithContext(ctx).Model(&Payment{}).
   332→		Where("created_at >= ?", start).Count(&created).Error; cErr == nil {
   333→		_ = cErr
   334→	}
   335→	successRate := int64(0)
   336→	if created > 0 {
   337→		successRate = totalCount * 100 / created
   338→	}
   339→
   340→	trend, err := s.repo.DailyPaymentTrend(ctx, start, now)
   341→	if err != nil {
   342→		return nil, errs.Wrap(errs.CodeInternalError, "统计支付趋势失败", err)
   343→	}
   344→	trendOut := make([]*paymentv1.PaymentTrendPoint, 0, len(trend))
   345→	for _, t := range trend {
   346→		trendOut = append(trendOut, &paymentv1.PaymentTrendPoint{
   347→			Date: t.Date, Count: t.Count, AmountCents: t.AmountCents,
   348→		})
   349→	}
   350→
   351→	return &paymentv1.PaymentSummaryResponse{
   352→		TodayCount:          todayCount,
   353→		TodayAmountCents:    todayAmount,
   354→		TotalCount:          totalCount,
   355→		TotalAmountCents:    totalAmount,
   356→		RefundedAmountCents: refunded,
   357→		SuccessRate:         successRate,
   358→		Trend:               trendOut,
   359→	}, nil
   360→}
   361→
   362→// fetchOrder 从订单服务读取订单信息。
   363→func (s *Service) fetchOrder(ctx context.Context, orderID int64) (*orderv1.Order, error) {
   364→	conn, err := s.registry.Conn(ctx, "order")
   365→	if err != nil {
   366→		return nil, errs.Wrap(errs.CodeUnavailable, "订单服务暂不可用", err)
   367→	}
   368→	orderClient := orderv1.NewOrderServiceClient(conn)
   369→
   370→	detail, err := orderClient.GetOrder(ctx, &orderv1.GetOrderRequest{Id: orderID})
   371→	if err != nil {
   372→		return nil, errs.Wrap(errs.CodeOrderNotFound, "订单不存在", err)
   373→	}
   374→	return detail.GetOrder(), nil
   375→}
   376→
   377→// ---------------------------------------------------------------------------
   378→// 转换辅助
   379→// ---------------------------------------------------------------------------
   380→
   381→func paymentToProto(p *Payment) *paymentv1.Payment {
   382→	if p == nil {
   383→		return nil
   384→	}
   385→	params := map[string]string{}
   386→	if p.PayParams != "" {
   387→		_ = json.Unmarshal([]byte(p.PayParams), &params)
   388→	}
   389→	return &paymentv1.Payment{
   390→		Id:            int64(p.ID),
   391→		PaymentNo:     p.PaymentNo,
   392→		OrderId:       int64(p.OrderID),
   393→		OrderNo:       p.OrderNo,
   394→		UserId:        int64(p.UserID),
   395→		AmountCents:   p.AmountCents,
   396→		RefundedCents: p.RefundedCents,
   397→		Status:        commonv1.PaymentStatus(p.Status),
   398→		Channel:       commonv1.PaymentChannel(p.Channel),
   399→		TransactionId: p.TransactionID,
   400→		PrepayId:      p.PrepayID,
   401→		PayParams:     params,
   402→		FailReason:    p.FailReason,
   403→		PaidAt:        tsPtr(p.PaidAt),
   404→		CreatedAt:     timestamppb.New(p.CreatedAt),
   405→		UpdatedAt:     timestamppb.New(p.UpdatedAt),
   406→	}
   407→}
   408→
   409→func paymentRefundToProto(rf *PaymentRefund) *paymentv1.PaymentRefund {
   410→	if rf == nil {
   411→		return nil
   412→	}
   413→	return &paymentv1.PaymentRefund{
   414→		Id:            int64(rf.ID),
   415→		RefundNo:      rf.RefundNo,
   416→		PaymentId:     int64(rf.PaymentID),
   417→		OrderId:       int64(rf.OrderID),
   418→		AmountCents:   rf.AmountCents,
   419→		Status:        int32(rf.Status),
   420→		Reason:        rf.Reason,
   421→		TransactionId: rf.TransactionID,
   422→		CreatedAt:     timestamppb.New(rf.CreatedAt),
   423→	}
   424→}
   425→
   426→func generatePaymentNo(t time.Time) string {
   427→	return t.Format("20060102150405") + strconv.Itoa(rand.Intn(1000000))
   428→}
   429→
   430→func tsPtr(t *time.Time) *timestamppb.Timestamp {
   431→	if t == nil {
   432→		return nil
   433→	}
   434→	return timestamppb.New(*t)
   435→}
   436→
   437→func normalizePage(page *commonv1.PageRequest) (int, int) {
   438→	pageNum := int(page.GetPage())
   439→	pageSize := int(page.GetPageSize())
   440→	if pageNum <= 0 {
   441→		pageNum = 1
   442→	}
   443→	if pageSize <= 0 {
   444→		pageSize = 20
   445→	}
   446→	if pageSize > 100 {
   447→		pageSize = 100
   448→	}
   449→	return pageNum, pageSize
   450→}
   451→
   452→func buildMeta(page, pageSize int, total int64) *commonv1.PageMeta {
   453→	totalPages := int64(0)
   454→	if pageSize > 0 {
   455→		totalPages = (total + int64(pageSize) - 1) / int64(pageSize)
   456→	}
   457→	return &commonv1.PageMeta{
   458→		Page: int32(page), PageSize: int32(pageSize),
   459→		Total: total, TotalPages: int32(totalPages),
   460→	}
   461→}
   462→
   463→var _ = fmt.Sprintf
```

</details>

<details><summary>🛠 read</summary>

```
1→// Package payment 实现支付服务，负责下单、支付回调、退款与支付统计。
     2→package payment
     3→
     4→import (
     5→	"context"
     6→	"errors"
     7→	"time"
     8→
     9→	"gorm.io/gorm"
    10→
    11→	"github.com/shopstack/platform/backend/internal/errs"
    12→)
    13→
    14→// 支付状态
    15→const (
    16→	StatusPending = 1
    17→	StatusSuccess = 2
    18→	StatusFailed  = 3
    19→	StatusClosed  = 4
    20→)
    21→
    22→// 支付渠道
    23→const (
    24→	ChannelWeChat  = 1
    25→	ChannelAlipay  = 2
    26→	ChannelBalance = 3
    27→)
    28→
    29→// Payment 是支付流水模型。
    30→type Payment struct {
    31→	ID            uint64     `gorm:"primaryKey;autoIncrement" json:"id"`
    32→	PaymentNo     string     `gorm:"column:payment_no;type:varchar(32);not null;uniqueIndex" json:"payment_no"`
    33→	OrderID       uint64     `gorm:"column:order_id;not null;index" json:"order_id"`
    34→	OrderNo       string     `gorm:"column:order_no;type:varchar(32);not null;default:''" json:"order_no"`
    35→	UserID        uint64     `gorm:"column:user_id;not null;index" json:"user_id"`
    36→	AmountCents   int64      `gorm:"column:amount_cents;not null;default:0" json:"amount_cents"`
    37→	RefundedCents int64      `gorm:"column:refunded_cents;not null;default:0" json:"refunded_cents"`
    38→	Status        int8       `gorm:"not null;default:1;index" json:"status"`
    39→	Channel       int8       `gorm:"not null;default:1" json:"channel"`
    40→	TransactionID string     `gorm:"column:transaction_id;type:varchar(64);not null;default:''" json:"transaction_id"`
    41→	PrepayID      string     `gorm:"column:prepay_id;type:varchar(128);not null;default:''" json:"prepay_id"`
    42→	PayParams     string     `gorm:"column:pay_params;type:text" json:"pay_params"`
    43→	FailReason    string     `gorm:"column:fail_reason;type:varchar(255);not null;default:''" json:"fail_reason"`
    44→	PaidAt        *time.Time `json:"paid_at"`
    45→	CreatedAt     time.Time  `json:"created_at"`
    46→	UpdatedAt     time.Time  `json:"updated_at"`
    47→}
    48→
    49→// TableName 指定表名。
    50→func (Payment) TableName() string { return "payments" }
    51→
    52→// PaymentRefund 是支付侧退款记录模型。
    53→type PaymentRefund struct {
    54→	ID            uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
    55→	RefundNo      string    `gorm:"column:refund_no;type:varchar(32);not null;uniqueIndex" json:"refund_no"`
    56→	PaymentID     uint64    `gorm:"column:payment_id;not null;index" json:"payment_id"`
    57→	OrderID       uint64    `gorm:"column:order_id;not null;index" json:"order_id"`
    58→	AmountCents   int64     `gorm:"column:amount_cents;not null;default:0" json:"amount_cents"`
    59→	Status        int8      `gorm:"not null;default:0" json:"status"`
    60→	Reason        string    `gorm:"type:varchar(255);not null;default:''" json:"reason"`
    61→	TransactionID string    `gorm:"column:transaction_id;type:varchar(64);not null;default:''" json:"transaction_id"`
    62→	CreatedAt     time.Time `json:"created_at"`
    63→}
    64→
    65→// TableName 指定表名。
    66→func (PaymentRefund) TableName() string { return "payment_refunds" }
    67→
    68→// ---------------------------------------------------------------------------
    69→// 仓储
    70→// ---------------------------------------------------------------------------
    71→
    72→// Repo 封装支付域的数据访问。
    73→type Repo struct {
    74→	db *gorm.DB
    75→}
    76→
    77→// NewRepo 构造仓储。
    78→func NewRepo(db *gorm.DB) *Repo { return &Repo{db: db} }
    79→
    80→// DB 暴露底层数据库句柄。
    81→func (r *Repo) DB() *gorm.DB { return r.db }
    82→
    83→// CreatePayment 创建支付流水。
    84→func (r *Repo) CreatePayment(ctx context.Context, p *Payment) error {
    85→	return r.db.WithContext(ctx).Create(p).Error
    86→}
    87→
    88→// FindPaymentByID 按 ID 查询。
    89→func (r *Repo) FindPaymentByID(ctx context.Context, id uint64) (*Payment, error) {
    90→	var p Payment
    91→	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&p).Error; err != nil {
    92→		if errors.Is(err, gorm.ErrRecordNotFound) {
    93→			return nil, errs.New(errs.CodePaymentNotFound, "支付单不存在")
    94→		}
    95→		return nil, err
    96→	}
    97→	return &p, nil
    98→}
    99→
   100→// FindPaymentByNo 按支付单号查询。
   101→func (r *Repo) FindPaymentByNo(ctx context.Context, paymentNo string) (*Payment, error) {
   102→	var p Payment
   103→	if err := r.db.WithContext(ctx).Where("payment_no = ?", paymentNo).First(&p).Error; err != nil {
   104→		if errors.Is(err, gorm.ErrRecordNotFound) {
   105→			return nil, errs.New(errs.CodePaymentNotFound, "支付单不存在")
   106→		}
   107→		return nil, err
   108→	}
   109→	return &p, nil
   110→}
   111→
   112→// FindPaymentByOrder 按订单号查询最新支付单。
   113→func (r *Repo) FindPaymentByOrder(ctx context.Context, orderID uint64) (*Payment, error) {
   114→	var p Payment
   115→	err := r.db.WithContext(ctx).Where("order_id = ?", orderID).
   116→		Order("id DESC").First(&p).Error
   117→	if err != nil {
   118→		if errors.Is(err, gorm.ErrRecordNotFound) {
   119→			return nil, errs.New(errs.CodePaymentNotFound, "该订单还没有支付单")
   120→		}
   121→		return nil, err
   122→	}
   123→	return &p, nil
   124→}
   125→
   126→// UpdatePaymentFields 更新支付流水字段。
   127→func (r *Repo) UpdatePaymentFields(ctx context.Context, id uint64, fields map[string]any) error {
   128→	return r.db.WithContext(ctx).Model(&Payment{}).Where("id = ?", id).Updates(fields).Error
   129→}
   130→
   131→// MarkSuccess 原子地把待支付流水置为支付成功，避免重复回调导致重复入账。
   132→func (r *Repo) MarkSuccess(ctx context.Context, id uint64, transactionID string, paidAt time.Time) (bool, error) {
   133→	res := r.db.WithContext(ctx).Model(&Payment{}).
   134→		Where("id = ? AND status = ?", id, StatusPending).
   135→		Updates(map[string]any{
   136→			"status":         StatusSuccess,
   137→			"transaction_id": transactionID,
   138→			"paid_at":        &paidAt,
   139→		})
   140→	return res.RowsAffected > 0, res.Error
   141→}
   142→
   143→// CreateRefund 创建支付退款记录。
   144→func (r *Repo) CreateRefund(ctx context.Context, rf *PaymentRefund) error {
   145→	return r.db.WithContext(ctx).Create(rf).Error
   146→}
   147→
   148→// UpdatePaymentRefund 更新退款记录。
   149→func (r *Repo) UpdatePaymentRefund(ctx context.Context, id uint64, fields map[string]any) error {
   150→	return r.db.WithContext(ctx).Model(&PaymentRefund{}).Where("id = ?", id).Updates(fields).Error
   151→}
   152→
   153→// FindPaymentRefund 按支付单号查询退款记录。
   154→func (r *Repo) FindPaymentRefund(ctx context.Context, refundNo string) (*PaymentRefund, error) {
   155→	var rf PaymentRefund
   156→	if err := r.db.WithContext(ctx).Where("refund_no = ?", refundNo).First(&rf).Error; err != nil {
   157→		if errors.Is(err, gorm.ErrRecordNotFound) {
   158→			return nil, errs.New(errs.CodeRefundFailed, "退款记录不存在")
   159→		}
   160→		return nil, err
   161→	}
   162→	return &rf, nil
   163→}
   164→
   165→// ListPayments 分页查询支付流水。
   166→func (r *Repo) ListPayments(ctx context.Context, status, channel int8, keyword string, userID uint64, start, end time.Time, page, pageSize int) ([]Payment, int64, error) {
   167→	q := r.db.WithContext(ctx).Model(&Payment{})
   168→	if status > 0 {
   169→		q = q.Where("status = ?", status)
   170→	}
   171→	if channel > 0 {
   172→		q = q.Where("channel = ?", channel)
   173→	}
   174→	if userID > 0 {
   175→		q = q.Where("user_id = ?", userID)
   176→	}
   177→	if keyword != "" {
   178→		like := "%" + keyword + "%"
   179→		q = q.Where("payment_no LIKE ? OR order_no LIKE ? OR transaction_id LIKE ?", like, like, like)
   180→	}
   181→	if !start.IsZero() {
   182→		q = q.Where("created_at >= ?", start)
   183→	}
   184→	if !end.IsZero() {
   185→		q = q.Where("created_at <= ?", end)
   186→	}
   187→
   188→	var total int64
   189→	if err := q.Count(&total).Error; err != nil {
   190→		return nil, 0, err
   191→	}
   192→	var list []Payment
   193→	err := q.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
   194→	return list, total, err
   195→}
   196→
   197→// Totals 统计支付总笔数与总金额。
   198→func (r *Repo) Totals(ctx context.Context, start, end time.Time) (count int64, amount int64, refunded int64, err error) {
   199→	q := r.db.WithContext(ctx).Model(&Payment{}).Where("status = ?", StatusSuccess)
   200→	if !start.IsZero() {
   201→		q = q.Where("created_at >= ?", start)
   202→	}
   203→	if !end.IsZero() {
   204→		q = q.Where("created_at <= ?", end)
   205→	}
   206→	if err = q.Count(&count).Error; err != nil {
   207→		return
   208→	}
   209→	var sum *int64
   210→	if err = r.db.WithContext(ctx).Model(&Payment{}).
   211→		Select("COALESCE(SUM(amount_cents),0)").Where("status = ?", StatusSuccess).Scan(&sum).Error; err != nil {
   212→		return
   213→	}
   214→	if sum != nil {
   215→		amount = *sum
   216→	}
   217→	var rsum *int64
   218→	if err = r.db.WithContext(ctx).Model(&Payment{}).
   219→		Select("COALESCE(SUM(refunded_cents),0)").Scan(&rsum).Error; err != nil {
   220→		return
   221→	}
   222→	if rsum != nil {
   223→		refunded = *rsum
   224→	}
   225→	return
   226→}
   227→
   228→// DailyPaymentTrend 返回按天聚合的支付统计。
   229→func (r *Repo) DailyPaymentTrend(ctx context.Context, start, end time.Time) ([]DailyPoint, error) {
   230→	type row struct {
   231→		Date   string
   232→		Count  int64
   233→		Amount int64
   234→	}
   235→	var rows []row
   236→	err := r.db.WithContext(ctx).Model(&Payment{}).
   237→		Select("DATE(created_at) AS date, COUNT(*) AS count, COALESCE(SUM(amount_cents),0) AS amount").
   238→		Where("status = ? AND created_at >= ? AND created_at <= ?", StatusSuccess, start, end).
   239→		Group("DATE(created_at)").Order("date ASC").Scan(&rows).Error
   240→	if err != nil {
   241→		return nil, err
   242→	}
   243→	out := make([]DailyPoint, 0, len(rows))
   244→	for _, rw := range rows {
   245→		out = append(out, DailyPoint{Date: rw.Date, Count: rw.Count, AmountCents: rw.Amount})
   246→	}
   247→	return out, nil
   248→}
   249→
   250→// DailyPoint 是按天聚合的支付数据。
   251→type DailyPoint struct {
   252→	Date        string
   253→	Count       int64
   254→	AmountCents int64
   255→}
```

</details>

<details><summary>🛠 read</summary>

```
1→package payment
     2→
     3→import (
     4→	"context"
     5→	"time"
     6→
     7→	commonv1 "github.com/shopstack/platform/gen/go/common/v1"
     8→	paymentv1 "github.com/shopstack/platform/gen/go/payment/v1"
     9→
    10→	"github.com/shopstack/platform/backend/internal/auth"
    11→)
    12→
    13→// Handler 实现 PaymentService。
    14→type Handler struct {
    15→	paymentv1.UnimplementedPaymentServiceServer
    16→	service *Service
    17→}
    18→
    19→// NewHandler 构造处理器。
    20→func NewHandler(service *Service) *Handler {
    21→	return &Handler{service: service}
    22→}
    23→
    24→// userID 优先使用请求携带的用户 ID，缺省时回退到网关注入的登录身份。
    25→func (h *Handler) userID(ctx context.Context, explicit int64) int64 {
    26→	if explicit > 0 {
    27→		return explicit
    28→	}
    29→	return auth.UserIDFromContext(ctx)
    30→}
    31→
    32→// CreatePayment 创建支付单。
    33→func (h *Handler) CreatePayment(ctx context.Context, req *paymentv1.CreatePaymentRequest) (*paymentv1.Payment, error) {
    34→	return h.service.CreatePayment(ctx, req)
    35→}
    36→
    37→// QueryPayment 查询支付单。
    38→func (h *Handler) QueryPayment(ctx context.Context, req *paymentv1.QueryPaymentRequest) (*paymentv1.Payment, error) {
    39→	return h.service.QueryPayment(ctx, req.GetPaymentId(), req.GetOrderId(), h.userID(ctx, req.GetUserId()))
    40→}
    41→
    42→// Notify 支付回调。
    43→func (h *Handler) Notify(ctx context.Context, req *paymentv1.PaymentCallbackRequest) (*commonv1.OperationResult, error) {
    44→	if err := h.service.Notify(ctx, req); err != nil {
    45→		return nil, err
    46→	}
    47→	return &commonv1.OperationResult{Success: true, Message: "回调处理成功"}, nil
    48→}
    49→
    50→// CreateRefund 发起退款。
    51→func (h *Handler) CreateRefund(ctx context.Context, req *paymentv1.CreateRefundRequest) (*paymentv1.PaymentRefund, error) {
    52→	return h.service.CreateRefund(ctx, req)
    53→}
    54→
    55→// ListPayments 支付流水列表。
    56→func (h *Handler) ListPayments(ctx context.Context, req *paymentv1.ListPaymentsRequest) (*paymentv1.ListPaymentsResponse, error) {
    57→	var start, end time.Time
    58→	if req.GetStartTime() > 0 {
    59→		start = time.Unix(req.GetStartTime(), 0)
    60→	}
    61→	if req.GetEndTime() > 0 {
    62→		end = time.Unix(req.GetEndTime(), 0)
    63→	}
    64→	return h.service.ListPayments(ctx, req.GetStatus(), req.GetChannel(), req.GetKeyword(),
    65→		req.GetUserId(), start, end, req.GetPage())
    66→}
    67→
    68→// Summary 支付统计。
    69→func (h *Handler) Summary(ctx context.Context, req *paymentv1.PaymentSummaryRequest) (*paymentv1.PaymentSummaryResponse, error) {
    70→	return h.service.Summary(ctx, req.GetDays())
    71→}
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:16:21

<details><summary>🧠 思考过程</summary>

```
Now notification package + errs package.
```

</details>

<details><summary>🛠 read</summary>

```
1→package notification
     2→
     3→import (
     4→	"context"
     5→	"regexp"
     6→	"strings"
     7→	"time"
     8→
     9→	"go.uber.org/zap"
    10→	"google.golang.org/protobuf/types/known/timestamppb"
    11→
    12→	commonv1 "github.com/shopstack/platform/gen/go/common/v1"
    13→	notificationv1 "github.com/shopstack/platform/gen/go/notification/v1"
    14→
    15→	"github.com/shopstack/platform/backend/internal/auth"
    16→	"github.com/shopstack/platform/backend/internal/cache"
    17→	"github.com/shopstack/platform/backend/internal/errs"
    18→	"github.com/shopstack/platform/backend/internal/logger"
    19→	"github.com/shopstack/platform/backend/internal/thirdparty"
    20→)
    21→
    22→// 验证码相关参数。
    23→const (
    24→	// SmsCodeTTL 验证码有效期（秒）。
    25→	SmsCodeTTL = 300
    26→	// SmsCodeLength 验证码长度。
    27→	SmsCodeLength = 6
    28→	// SmsLimitInterval 同一手机号两次发送的最小间隔（秒）。
    29→	SmsLimitInterval = 60
    30→)
    31→
    32→// 短信频率限制与验证码存储的 Redis key 前缀。
    33→const (
    34→	smsLimitKeyPrefix = "shop:sms:limit:"
    35→	smsCodeKeyPrefix  = "shop:sms:code:"
    36→)
    37→
    38→// phonePattern 校验手机号格式（国内 11 位或带国际区号）。
    39→var phonePattern = regexp.MustCompile(`^\+?[0-9]{6,20}$`)
    40→
    41→// Service 承载通知域的业务逻辑。
    42→type Service struct {
    43→	repo      *Repo
    44→	providers *thirdparty.Providers
    45→	cache     *cache.Client
    46→	codes     thirdparty.CodeStore
    47→}
    48→
    49→// NewService 构造通知服务。
    50→//
    51→// cache 为 nil 表示 Redis 不可用，此时短信频率限制会被跳过。
    52→func NewService(repo *Repo, providers *thirdparty.Providers, cacheClient *cache.Client) *Service {
    53→	return &Service{
    54→		repo:      repo,
    55→		providers: providers,
    56→		cache:     cacheClient,
    57→		codes:     thirdparty.NewCodeStore(),
    58→	}
    59→}
    60→
    61→// ---------------------------------------------------------------------------
    62→// 站内通知
    63→// ---------------------------------------------------------------------------
    64→
    65→// Send 发送站内通知，支持单个用户与群发。
    66→func (s *Service) Send(ctx context.Context, req *notificationv1.SendNotificationRequest) (int, error) {
    67→	title := strings.TrimSpace(req.GetTitle())
    68→	if title == "" {
    69→		return 0, errs.New(errs.CodeInvalidParam, "通知标题不能为空")
    70→	}
    71→	nt, err := mapNotificationType(req.GetType())
    72→	if err != nil {
    73→		return 0, err
    74→	}
    75→
    76→	targets := make([]uint64, 0, len(req.GetUserIds())+1)
    77→	if req.GetUserId() > 0 {
    78→		targets = append(targets, uint64(req.GetUserId()))
    79→	}
    80→	for _, id := range req.GetUserIds() {
    81→		if id <= 0 {
    82→			continue
    83→		}
    84→		uid := uint64(id)
    85→		exist := false
    86→		for _, t := range targets {
    87→			if t == uid {
    88→				exist = true
    89→				break
    90→			}
    91→		}
    92→		if !exist {
    93→			targets = append(targets, uid)
    94→		}
    95→	}
    96→	if len(targets) == 0 {
    97→		return 0, errs.New(errs.CodeInvalidParam, "缺少通知接收人")
    98→	}
    99→
   100→	sent := 0
   101→	for _, uid := range targets {
   102→		n := &Notification{
   103→			UserID:  uid,
   104→			Type:    nt,
   105→			Title:   title,
   106→			Content: req.GetContent(),
   107→			Link:    req.GetLink(),
   108→			BizID:   uint64(req.GetBizId()),
   109→			Read:    false,
   110→		}
   111→		if err := s.repo.CreateNotification(ctx, n); err != nil {
   112→			return sent, errs.Wrap(errs.CodeInternalError, "发送通知失败", err)
   113→		}
   114→		sent++
   115→	}
   116→	return sent, nil
   117→}
   118→
   119→// List 分页查询用户通知。
   120→func (s *Service) List(ctx context.Context, req *notificationv1.ListNotificationsRequest) (*notificationv1.ListNotificationsResponse, error) {
   121→	userID := uint64(resolveUserID(ctx, req.GetUserId()))
   122→	if userID == 0 {
   123→		return nil, errs.New(errs.CodeInvalidParam, "用户 ID 不能为空")
   124→	}
   125→	page, pageSize := normalizePage(req.GetPage())
   126→
   127→	list, total, err := s.repo.ListNotifications(ctx, NotificationQuery{
   128→		UserID:     userID,
   129→		Type:       req.GetType(),
   130→		UnreadOnly: req.GetUnreadOnly(),
   131→		Page:       page,
   132→		PageSize:   pageSize,
   133→	})
   134→	if err != nil {
   135→		return nil, errs.Wrap(errs.CodeInternalError, "查询通知失败", err)
   136→	}
   137→	out := make([]*notificationv1.Notification, 0, len(list))
   138→	for i := range list {
   139→		out = append(out, notificationToProto(&list[i]))
   140→	}
   141→	unread, err := s.repo.CountUnread(ctx, userID)
   142→	if err != nil {
   143→		return nil, errs.Wrap(errs.CodeInternalError, "统计未读通知失败", err)
   144→	}
   145→	return &notificationv1.ListNotificationsResponse{
   146→		Notifications: out,
   147→		Meta:          buildMeta(page, pageSize, total),
   148→		UnreadCount:   int32(unread),
   149→	}, nil
   150→}
   151→
   152→// MarkRead 标记单条通知已读。
   153→func (s *Service) MarkRead(ctx context.Context, userID, id int64) error {
   154→	userID = resolveUserID(ctx, userID)
   155→	if userID <= 0 {
   156→		return errs.New(errs.CodeInvalidParam, "用户 ID 不能为空")
   157→	}
   158→	if id <= 0 {
   159→		return errs.New(errs.CodeInvalidParam, "通知 ID 不能为空")
   160→	}
   161→	n, err := s.repo.FindNotificationByID(ctx, uint64(id))
   162→	if err != nil {
   163→		return err
   164→	}
   165→	if n.UserID != uint64(userID) {
   166→		return errs.New(errs.CodeForbidden, "无权操作他人的通知")
   167→	}
   168→	if err := s.repo.MarkRead(ctx, uint64(userID), uint64(id)); err != nil {
   169→		return errs.Wrap(errs.CodeInternalError, "标记通知已读失败", err)
   170→	}
   171→	return nil
   172→}
   173→
   174→// MarkAllRead 标记用户全部通知已读。
   175→func (s *Service) MarkAllRead(ctx context.Context, userID int64) (int64, error) {
   176→	userID = resolveUserID(ctx, userID)
   177→	if userID <= 0 {
   178→		return 0, errs.New(errs.CodeInvalidParam, "用户 ID 不能为空")
   179→	}
   180→	affected, err := s.repo.MarkAllRead(ctx, uint64(userID))
   181→	if err != nil {
   182→		return 0, errs.Wrap(errs.CodeInternalError, "标记通知已读失败", err)
   183→	}
   184→	return affected, nil
   185→}
   186→
   187→// GetUnreadCount 查询用户未读通知数。
   188→func (s *Service) GetUnreadCount(ctx context.Context, userID int64) (int32, error) {
   189→	userID = resolveUserID(ctx, userID)
   190→	if userID <= 0 {
   191→		return 0, errs.New(errs.CodeInvalidParam, "用户 ID 不能为空")
   192→	}
   193→	count, err := s.repo.CountUnread(ctx, uint64(userID))
   194→	if err != nil {
   195→		return 0, errs.Wrap(errs.CodeInternalError, "统计未读通知失败", err)
   196→	}
   197→	return int32(count), nil
   198→}
   199→
   200→// ---------------------------------------------------------------------------
   201→// 短信验证码
   202→// ---------------------------------------------------------------------------
   203→
   204→// SendSms 发送验证码短信。
   205→//
   206→// 演示环境下直接把验证码返回给调用方，便于前端自动完成登录流程。
   207→func (s *Service) SendSms(ctx context.Context, phone, scene string) (*notificationv1.SendSmsResponse, error) {
   208→	phone = strings.TrimSpace(phone)
   209→	if phone == "" {
   210→		return nil, errs.New(errs.CodeInvalidParam, "手机号不能为空")
   211→	}
   212→	if !phonePattern.MatchString(phone) {
   213→		return nil, errs.New(errs.CodeInvalidParam, "手机号格式不正确")
   214→	}
   215→	scene = normalizeScene(scene)
   216→
   217→	// 频率限制：同一手机号 60 秒内只允许发送一次
   218→	limitKey := smsLimitKeyPrefix + phone
   219→	if err := s.checkSmsLimit(ctx, limitKey); err != nil {
   220→		return nil, err
   221→	}
   222→
   223→	code := thirdparty.RandomCode(SmsCodeLength)
   224→	s.codes.Save(smsCodeKey(scene, phone), code, SmsCodeTTL*time.Second)
   225→
   226→	if err := s.providers.SMS.Send(ctx, phone, scene, code); err != nil {
   227→		// 发送失败时释放频率限制，允许用户立即重试
   228→		s.releaseSmsLimit(ctx, limitKey)
   229→		s.recordSms(ctx, phone, code, scene, SmsStatusFailed, err.Error())
   230→		s.writeAuditLog(ctx, "sms", "send", phone, err.Error())
   231→		return nil, errs.Wrap(errs.CodeNotificationFail, "短信发送失败", err)
   232→	}
   233→
   234→	s.recordSms(ctx, phone, code, scene, SmsStatusSuccess, "")
   235→	logger.L().Info("验证码短信已发送",
   236→		zap.String("手机号", phone), zap.String("场景", scene))
   237→	return &notificationv1.SendSmsResponse{
   238→		Success:       true,
   239→		Code:          code,
   240→		ExpireSeconds: SmsCodeTTL,
   241→	}, nil
   242→}
   243→
   244→// VerifySmsCode 校验短信验证码。
   245→//
   246→// 校验通过后验证码立即失效；失败时返回具体的错误提示。
   247→func (s *Service) VerifySmsCode(phone, scene, code string) (bool, string) {
   248→	phone = strings.TrimSpace(phone)
   249→	if phone == "" || strings.TrimSpace(code) == "" {
   250→		return false, "手机号与验证码不能为空"
   251→	}
   252→	ok, msg := s.codes.Verify(smsCodeKey(normalizeScene(scene), phone), strings.TrimSpace(code))
   253→	return ok, msg
   254→}
   255→
   256→// checkSmsLimit 检查并占用短信发送频率限制。
   257→func (s *Service) checkSmsLimit(ctx context.Context, key string) error {
   258→	if s.cache == nil {
   259→		logger.L().Warn("Redis 不可用，跳过短信频率限制")
   260→		return nil
   261→	}
   262→	ok, err := s.cache.SetNX(ctx, key, "1", SmsLimitInterval*time.Second)
   263→	if err != nil {
   264→		logger.L().Warn("短信频率限制检查失败，跳过限制", zap.Error(err))
   265→		return nil
   266→	}
   267→	if !ok {
   268→		return errs.New(errs.CodeTooManyReq, "验证码发送过于频繁，请 60 秒后再试")
   269→	}
   270→	return nil
   271→}
   272→
   273→// releaseSmsLimit 释放短信频率限制。
   274→func (s *Service) releaseSmsLimit(ctx context.Context, key string) {
   275→	if s.cache == nil {
   276→		return
   277→	}
   278→	if err := s.cache.Del(ctx, key); err != nil {
   279→		logger.L().Warn("释放短信频率限制失败", zap.Error(err))
   280→	}
   281→}
   282→
   283→// recordSms 写入短信发送记录。
   284→func (s *Service) recordSms(ctx context.Context, phone, code, scene string, status int8, errMsg string) {
   285→	count, err := s.repo.CountSmsByPhoneScene(ctx, phone, scene)
   286→	if err != nil {
   287→		logger.L().Warn("统计短信发送次数失败", zap.Error(err))
   288→		count = 0
   289→	}
   290→	rec := &SmsRecord{
   291→		Phone:        phone,
   292→		Code:         code,
   293→		Scene:        scene,
   294→		Status:       status,
   295→		ErrorMessage: errMsg,
   296→		SendCount:    int32(count + 1),
   297→	}
   298→	if err := s.repo.CreateSmsRecord(ctx, rec); err != nil {
   299→		logger.L().Warn("写入短信记录失败", zap.Error(err))
   300→	}
   301→}
   302→
   303→// writeAuditLog 写入操作审计日志。
   304→func (s *Service) writeAuditLog(ctx context.Context, module, action, targetID, errMsg string) {
   305→	result := int8(1)
   306→	if errMsg != "" {
   307→		result = 0
   308→	}
   309→	log := &AuditLog{
   310→		Module:       module,
   311→		Action:       action,
   312→		TargetType:   "sms",
   313→		TargetID:     targetID,
   314→		Detail:       "发送短信验证码",
   315→		Result:       result,
   316→		ErrorMessage: errMsg,
   317→	}
   318→	if err := s.repo.CreateAuditLog(ctx, log); err != nil {
   319→		logger.L().Warn("写入审计日志失败", zap.Error(err))
   320→	}
   321→}
   322→
   323→// ListSmsRecords 分页查询短信发送记录。
   324→func (s *Service) ListSmsRecords(ctx context.Context, req *notificationv1.ListSmsRecordsRequest) (*notificationv1.ListSmsRecordsResponse, error) {
   325→	page, pageSize := normalizePage(req.GetPage())
   326→	list, total, err := s.repo.ListSmsRecords(ctx, SmsRecordQuery{
   327→		Phone:    strings.TrimSpace(req.GetPhone()),
   328→		Scene:    strings.TrimSpace(req.GetScene()),
   329→		Page:     page,
   330→		PageSize: pageSize,
   331→	})
   332→	if err != nil {
   333→		return nil, errs.Wrap(errs.CodeInternalError, "查询短信记录失败", err)
   334→	}
   335→	out := make([]*notificationv1.SmsRecord, 0, len(list))
   336→	for i := range list {
   337→		out = append(out, smsRecordToProto(&list[i]))
   338→	}
   339→	return &notificationv1.ListSmsRecordsResponse{Records: out, Meta: buildMeta(page, pageSize, total)}, nil
   340→}
   341→
   342→// ---------------------------------------------------------------------------
   343→// 审计日志
   344→// ---------------------------------------------------------------------------
   345→
   346→// ListAuditLogs 分页查询操作审计日志。
   347→func (s *Service) ListAuditLogs(ctx context.Context, req *notificationv1.ListAuditLogsRequest) (*notificationv1.ListAuditLogsResponse, error) {
   348→	page, pageSize := normalizePage(req.GetPage())
   349→
   350→	q := AuditLogQuery{
   351→		Module:   strings.TrimSpace(req.GetModule()),
   352→		Action:   strings.TrimSpace(req.GetAction()),
   353→		AdminID:  req.GetAdminId(),
   354→		Keyword:  strings.TrimSpace(req.GetKeyword()),
   355→		Page:     page,
   356→		PageSize: pageSize,
   357→	}
   358→	if req.GetStartTime() > 0 {
   359→		t := time.Unix(req.GetStartTime(), 0)
   360→		q.StartTime = &t
   361→	}
   362→	if req.GetEndTime() > 0 {
   363→		t := time.Unix(req.GetEndTime(), 0)
   364→		q.EndTime = &t
   365→	}
   366→
   367→	list, total, err := s.repo.ListAuditLogs(ctx, q)
   368→	if err != nil {
   369→		return nil, errs.Wrap(errs.CodeInternalError, "查询审计日志失败", err)
   370→	}
   371→	out := make([]*notificationv1.AuditLog, 0, len(list))
   372→	for i := range list {
   373→		out = append(out, auditLogToProto(&list[i]))
   374→	}
   375→	return &notificationv1.ListAuditLogsResponse{Logs: out, Meta: buildMeta(page, pageSize, total)}, nil
   376→}
   377→
   378→// ---------------------------------------------------------------------------
   379→// 系统配置
   380→// ---------------------------------------------------------------------------
   381→
   382→// ListSystemSettings 查询系统配置，group 为空时返回全部。
   383→func (s *Service) ListSystemSettings(ctx context.Context, group string) (*notificationv1.ListSystemSettingsResponse, error) {
   384→	list, err := s.repo.ListSystemSettings(ctx, strings.TrimSpace(group))
   385→	if err != nil {
   386→		return nil, errs.Wrap(errs.CodeInternalError, "查询系统配置失败", err)
   387→	}
   388→	out := make([]*notificationv1.SystemSetting, 0, len(list))
   389→	for i := range list {
   390→		out = append(out, systemSettingToProto(&list[i]))
   391→	}
   392→	return &notificationv1.ListSystemSettingsResponse{Settings: out}, nil
   393→}
   394→
   395→// UpdateSystemSettings 按 key 批量更新系统配置值。
   396→//
   397→// values 的 key 必须已存在于配置表中，未知 key 会被忽略，
   398→// 返回更新后的完整配置列表，方便前端直接刷新表单。
   399→func (s *Service) UpdateSystemSettings(ctx context.Context, group string, values map[string]string) (*notificationv1.ListSystemSettingsResponse, error) {
   400→	if len(values) == 0 {
   401→		return nil, errs.Invalid("没有需要更新的配置项")
   402→	}
   403→
   404→	existing, err := s.repo.ListSystemSettings(ctx, strings.TrimSpace(group))
   405→	if err != nil {
   406→		return nil, errs.Wrap(errs.CodeInternalError, "查询系统配置失败", err)
   407→	}
   408→	known := make(map[string]struct{}, len(existing))
   409→	for i := range existing {
   410→		known[existing[i].Key] = struct{}{}
   411→	}
   412→
   413→	for key, value := range values {
   414→		key = strings.TrimSpace(key)
   415→		if key == "" {
   416→			continue
   417→		}
   418→		if _, ok := known[key]; !ok {
   419→			logger.L().Warn("忽略不存在的系统配置项", zap.String("配置键", key))
   420→			continue
   421→		}
   422→		if err := s.repo.UpdateSystemSetting(ctx, key, value); err != nil {
   423→			return nil, errs.Wrap(errs.CodeInternalError, "更新系统配置失败", err)
   424→		}
   425→		logger.L().Info("系统配置已更新",
   426→			zap.String("配置键", key), zap.String("配置值", value),
   427→			zap.String("操作人", auth.UsernameFromContext(ctx)))
   428→	}
   429→
   430→	return s.ListSystemSettings(ctx, group)
   431→}
   432→
   433→// resolveUserID 优先使用请求携带的用户 ID，缺省时回退到网关注入的登录身份。
   434→func resolveUserID(ctx context.Context, requested int64) int64 {
   435→	if requested > 0 {
   436→		return requested
   437→	}
   438→	return auth.UserIDFromContext(ctx)
   439→}
   440→
   441→// ---------------------------------------------------------------------------
   442→// 转换辅助
   443→// ---------------------------------------------------------------------------
   444→
   445→func notificationToProto(n *Notification) *notificationv1.Notification {
   446→	if n == nil {
   447→		return nil
   448→	}
   449→	out := &notificationv1.Notification{
   450→		Id:        int64(n.ID),
   451→		UserId:    int64(n.UserID),
   452→		Type:      commonv1.NotificationType(n.Type),
   453→		Title:     n.Title,
   454→		Content:   n.Content,
   455→		Link:      n.Link,
   456→		BizId:     int64(n.BizID),
   457→		Read:      n.Read,
   458→		CreatedAt: timestamppb.New(n.CreatedAt),
   459→	}
   460→	if n.ReadAt != nil {
   461→		out.ReadAt = timestamppb.New(*n.ReadAt)
   462→	}
   463→	return out
   464→}
   465→
   466→func smsRecordToProto(r *SmsRecord) *notificationv1.SmsRecord {
   467→	if r == nil {
   468→		return nil
   469→	}
   470→	return &notificationv1.SmsRecord{
   471→		Id:           int64(r.ID),
   472→		Phone:        r.Phone,
   473→		Code:         r.Code,
   474→		Scene:        r.Scene,
   475→		Status:       int32(r.Status),
   476→		ErrorMessage: r.ErrorMessage,
   477→		SendCount:    r.SendCount,
   478→		CreatedAt:    timestamppb.New(r.CreatedAt),
   479→	}
   480→}
   481→
   482→func auditLogToProto(l *AuditLog) *notificationv1.AuditLog {
   483→	if l == nil {
   484→		return nil
   485→	}
   486→	return &notificationv1.AuditLog{
   487→		Id:           int64(l.ID),
   488→		AdminId:      int64(l.AdminID),
   489→		AdminName:    l.AdminName,
   490→		Module:       l.Module,
   491→		Action:       l.Action,
   492→		TargetType:   l.TargetType,
   493→		TargetId:     l.TargetID,
   494→		Detail:       l.Detail,
   495→		Ip:           l.IP,
   496→		UserAgent:    l.UserAgent,
   497→		Result:       int32(l.Result),
   498→		ErrorMessage: l.ErrorMessage,
   499→		CreatedAt:    timestamppb.New(l.CreatedAt),
   500→	}
   501→}
   502→
   503→// systemSettingToProto 把系统配置模型转换为 protobuf 消息。
   504→func systemSettingToProto(s *SystemSetting) *notificationv1.SystemSetting {
   505→	if s == nil {
   506→		return nil
   507→	}
   508→	return &notificationv1.SystemSetting{
   509→		Id:          int64(s.ID),
   510→		Key:         s.Key,
   511→		Value:       s.Value,
   512→		Name:        s.Name,
   513→		Group:       s.Group,
   514→		Description: s.Description,
   515→		ValueType:   s.ValueType,
   516→		UpdatedAt:   timestamppb.New(s.UpdatedAt),
   517→	}
   518→}
   519→
   520→// mapNotificationType 把请求中的类型映射为通知类型。
   521→func mapNotificationType(t int32) (int8, error) {
   522→	switch t {
   523→	case 0, NotificationTypeSystem:
   524→		return NotificationTypeSystem, nil
   525→	case NotificationTypeOrder, NotificationTypeLogistics, NotificationTypePromotion:
   526→		return int8(t), nil
   527→	default:
   528→		return 0, errs.New(errs.CodeInvalidParam, "通知类型不合法")
   529→	}
   530→}
   531→
   532→// normalizeScene 规范化短信场景。
   533→func normalizeScene(scene string) string {
   534→	scene = strings.ToLower(strings.TrimSpace(scene))
   535→	if scene == "" {
   536→		return "login"
   537→	}
   538→	return scene
   539→}
   540→
   541→// smsCodeKey 生成验证码存储键。
   542→func smsCodeKey(scene, phone string) string {
   543→	return smsCodeKeyPrefix + scene + ":" + phone
   544→}
   545→
   546→func normalizePage(page *commonv1.PageRequest) (int, int) {
   547→	pageNum := int(page.GetPage())
   548→	pageSize := int(page.GetPageSize())
   549→	if pageNum <= 0 {
   550→		pageNum = 1
   551→	}
   552→	if pageSize <= 0 {
   553→		pageSize = 20
   554→	}
   555→	if pageSize > 100 {
   556→		pageSize = 100
   557→	}
   558→	return pageNum, pageSize
   559→}
   560→
   561→func buildMeta(page, pageSize int, total int64) *commonv1.PageMeta {
   562→	totalPages := int64(0)
   563→	if pageSize > 0 {
   564→		totalPages = (total + int64(pageSize) - 1) / int64(pageSize)
   565→	}
   566→	return &commonv1.PageMeta{
   567→		Page: int32(page), PageSize: int32(pageSize),
   568→		Total: total, TotalPages: int32(totalPages),
   569→	}
   570→}
```

</details>

<details><summary>🛠 read</summary>

```
1→// Package notification 实现站内通知、短信验证码与操作审计日志相关的业务能力。
     2→package notification
     3→
     4→import (
     5→	"time"
     6→)
     7→
     8→// 站内通知类型
     9→const (
    10→	NotificationTypeOrder     = 1 // 订单
    11→	NotificationTypeLogistics = 2 // 物流
    12→	NotificationTypePromotion = 3 // 营销
    13→	NotificationTypeSystem    = 4 // 系统
    14→)
    15→
    16→// 短信发送状态
    17→const (
    18→	SmsStatusFailed  = 0
    19→	SmsStatusSuccess = 1
    20→)
    21→
    22→// Notification 是站内通知模型。
    23→type Notification struct {
    24→	ID        uint64     `gorm:"primaryKey;autoIncrement" json:"id"`
    25→	UserID    uint64     `gorm:"bigint unsigned;not null;index:idx_user_read,priority:1" json:"user_id"`
    26→	Type      int8       `gorm:"tinyint;not null;default:1" json:"type"`
    27→	Title     string     `gorm:"type:varchar(200);not null;default:''" json:"title"`
    28→	Content   string     `gorm:"type:varchar(1024);not null;default:''" json:"content"`
    29→	Link      string     `gorm:"type:varchar(512);not null;default:''" json:"link"`
    30→	BizID     uint64     `gorm:"bigint unsigned;not null;default:0" json:"biz_id"`
    31→	Read      bool       `gorm:"tinyint;not null;default:0;index:idx_user_read,priority:2" json:"read"`
    32→	ReadAt    *time.Time `gorm:"type:datetime" json:"read_at"`
    33→	CreatedAt time.Time  `gorm:"type:datetime;not null;default:CURRENT_TIMESTAMP;index:idx_created" json:"created_at"`
    34→}
    35→
    36→// TableName 指定表名。
    37→func (Notification) TableName() string { return "notifications" }
    38→
    39→// SmsRecord 是短信发送记录模型。
    40→type SmsRecord struct {
    41→	ID           uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
    42→	Phone        string    `gorm:"type:varchar(32);not null;default:'';index:idx_phone" json:"phone"`
    43→	Code         string    `gorm:"type:varchar(16);not null;default:''" json:"code"`
    44→	Scene        string    `gorm:"type:varchar(32);not null;default:''" json:"scene"`
    45→	Status       int8      `gorm:"tinyint;not null;default:1" json:"status"`
    46→	ErrorMessage string    `gorm:"type:varchar(512);not null;default:''" json:"error_message"`
    47→	SendCount    int32     `gorm:"int;not null;default:1" json:"send_count"`
    48→	CreatedAt    time.Time `gorm:"type:datetime;not null;default:CURRENT_TIMESTAMP;index:idx_created" json:"created_at"`
    49→}
    50→
    51→// TableName 指定表名。
    52→func (SmsRecord) TableName() string { return "sms_records" }
    53→
    54→// AuditLog 是后台操作审计日志模型。
    55→type AuditLog struct {
    56→	ID           uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
    57→	AdminID      uint64    `gorm:"bigint unsigned;not null;default:0;index:idx_admin" json:"admin_id"`
    58→	AdminName    string    `gorm:"type:varchar(64);not null;default:''" json:"admin_name"`
    59→	Module       string    `gorm:"type:varchar(64);not null;default:'';index:idx_module_action,priority:1" json:"module"`
    60→	Action       string    `gorm:"type:varchar(64);not null;default:'';index:idx_module_action,priority:2" json:"action"`
    61→	TargetType   string    `gorm:"type:varchar(64);not null;default:''" json:"target_type"`
    62→	TargetID     string    `gorm:"type:varchar(64);not null;default:''" json:"target_id"`
    63→	Detail       string    `gorm:"type:text" json:"detail"`
    64→	IP           string    `gorm:"type:varchar(64);not null;default:''" json:"ip"`
    65→	UserAgent    string    `gorm:"type:varchar(512);not null;default:''" json:"user_agent"`
    66→	Result       int8      `gorm:"tinyint;not null;default:1" json:"result"`
    67→	ErrorMessage string    `gorm:"type:varchar(512);not null;default:''" json:"error_message"`
    68→	CreatedAt    time.Time `gorm:"type:datetime;not null;default:CURRENT_TIMESTAMP;index:idx_created" json:"created_at"`
    69→}
    70→
    71→// TableName 指定表名。
    72→func (AuditLog) TableName() string { return "audit_logs" }
    73→
    74→// SystemSetting 是系统配置模型。
    75→type SystemSetting struct {
    76→	ID          uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
    77→	Key         string    `gorm:"type:varchar(128);not null;uniqueIndex:uk_key" json:"key"`
    78→	Value       string    `gorm:"type:varchar(1024);not null;default:''" json:"value"`
    79→	Name        string    `gorm:"type:varchar(128);not null;default:''" json:"name"`
    80→	Group       string    `gorm:"type:varchar(64);not null;default:'basic';index:idx_group" json:"group"`
    81→	Description string    `gorm:"type:varchar(255);not null;default:''" json:"description"`
    82→	ValueType   string    `gorm:"type:varchar(16);not null;default:'string'" json:"value_type"`
    83→	CreatedAt   time.Time `gorm:"type:datetime;not null;default:CURRENT_TIMESTAMP" json:"created_at"`
    84→	UpdatedAt   time.Time `gorm:"type:datetime;not null;default:CURRENT_TIMESTAMP" json:"updated_at"`
    85→}
    86→
    87→// TableName 指定表名。
    88→func (SystemSetting) TableName() string { return "system_settings" }
```

</details>

<details><summary>🛠 read</summary>

```
1→// Package errs 定义统一的业务错误码与错误处理。
     2→//
     3→// 业务错误在 gRPC 链路中通过 google.rpc.ErrorInfo 附加信息传递，
     4→// 网关据此还原出 {code, message} 结构，前端拿到的响应体保持一致。
     5→package errs
     6→
     7→import (
     8→	"errors"
     9→	"fmt"
    10→
    11→	"google.golang.org/genproto/googleapis/rpc/errdetails"
    12→	"google.golang.org/grpc/codes"
    13→	"google.golang.org/grpc/status"
    14→)
    15→
    16→// ErrorDomain 是 ErrorInfo 的领域标识。
    17→const ErrorDomain = "shopstack"
    18→
    19→// 业务错误码区间划分：
    20→//
    21→//	0        成功
    22→//	1000-1999 通用/参数/认证
    23→//	2000-2999 用户
    24→//	3000-3999 商品
    25→//	4000-4999 购物车
    26→//	5000-5999 订单
    27→//	6000-6999 支付
    28→//	7000-7999 库存
    29→//	8000-8999 营销
    30→//	9000-9999 物流/通知
    31→const (
    32→	CodeSuccess = 0
    33→
    34→	CodeInternalError = 1000
    35→	CodeInvalidParam  = 1001
    36→	CodeNotFound      = 1002
    37→	CodeUnauthorized  = 1003
    38→	CodeForbidden     = 1004
    39→	CodeConflict      = 1005
    40→	CodeTooManyReq    = 1006
    41→	CodeUnavailable   = 1007
    42→	CodeTimeout       = 1008
    43→)
    44→
    45→const (
    46→	CodeUserNotFound      = 2000
    47→	CodeUserDisabled      = 2001
    48→	CodePasswordIncorrect = 2002
    49→	CodeUserExists        = 2003
    50→	CodePhoneExists       = 2004
    51→	CodeTokenInvalid      = 2005
    52→	CodeTokenExpired      = 2006
    53→	CodePermissionDenied  = 2007
    54→)
    55→
    56→const (
    57→	CodeProductNotFound = 3000
    58→	CodeProductOffShelf = 3001
    59→	CodeSkuNotFound     = 3002
    60→	CodeCategoryExists  = 3003
    61→)
    62→
    63→const (
    64→	CodeCartItemNotFound = 4000
    65→	CodeCartEmpty        = 4001
    66→)
    67→
    68→const (
    69→	CodeOrderNotFound      = 5000
    70→	CodeOrderStatusInvalid = 5001
    71→	CodeOrderCancelFailed  = 5002
    72→	CodeRefundNotFound     = 5003
    73→	CodeOrderEmpty         = 5004
    74→)
    75→
    76→const (
    77→	CodePaymentNotFound   = 6000
    78→	CodePaymentFailed     = 6001
    79→	CodePaymentDuplicated = 6002
    80→	CodeRefundFailed      = 6003
    81→)
    82→
    83→const (
    84→	CodeStockNotFound     = 7000
    85→	CodeStockInsufficient = 7001
    86→	CodeStockLocked       = 7002
    87→)
    88→
    89→const (
    90→	CodeCouponNotFound    = 8000
    91→	CodeCouponUnavailable = 8001
    92→	CodeCouponExpired     = 8002
    93→	CodePromotionInvalid  = 8003
    94→)
    95→
    96→const (
    97→	CodeShipmentNotFound = 9000
    98→	CodeLogisticsError   = 9001
    99→	CodeNotificationFail = 9002
   100→)
   101→
   102→// Error 是可携带业务码的业务错误。
   103→type Error struct {
   104→	Code    int
   105→	Msg     string
   106→	HTTP    int
   107→	cause   error
   108→	Details map[string]string
   109→}
   110→
   111→func (e *Error) Error() string {
   112→	if e.cause != nil {
   113→		return fmt.Sprintf("[%d] %s: %v", e.Code, e.Msg, e.cause)
   114→	}
   115→	return fmt.Sprintf("[%d] %s", e.Code, e.Msg)
   116→}
   117→
   118→func (e *Error) Unwrap() error { return e.cause }
   119→
   120→// WithCause 附加底层错误。
   121→func (e *Error) WithCause(err error) *Error {
   122→	e.cause = err
   123→	return e
   124→}
   125→
   126→// WithDetail 附加上下文信息。
   127→func (e *Error) WithDetail(key, value string) *Error {
   128→	if e.Details == nil {
   129→		e.Details = map[string]string{}
   130→	}
   131→	e.Details[key] = value
   132→	return e
   133→}
   134→
   135→// WithHTTP 指定映射的 HTTP 状态码。
   136→func (e *Error) WithHTTP(code int) *Error {
   137→	e.HTTP = code
   138→	return e
   139→}
   140→
   141→// GRPCStatus 实现 gRPC status 接口，把业务码与详情透传到调用方。
   142→func (e *Error) GRPCStatus() *status.Status {
   143→	st := status.New(codes.Code(e.grpcCode()), e.Msg)
   144→	info := &errdetails.ErrorInfo{
   145→		Reason:   fmt.Sprintf("CODE_%d", e.Code),
   146→		Domain:   ErrorDomain,
   147→		Metadata: e.Details,
   148→	}
   149→	if e.Details == nil {
   150→		info.Metadata = map[string]string{}
   151→	}
   152→	withDetails, err := st.WithDetails(info)
   153→	if err != nil {
   154→		return st
   155→	}
   156→	return withDetails
   157→}
   158→
   159→func (e *Error) grpcCode() codes.Code {
   160→	switch e.HTTP {
   161→	case 400:
   162→		return codes.InvalidArgument
   163→	case 401:
   164→		return codes.Unauthenticated
   165→	case 403:
   166→		return codes.PermissionDenied
   167→	case 404:
   168→		return codes.NotFound
   169→	case 409:
   170→		return codes.Aborted
   171→	case 429:
   172→		return codes.ResourceExhausted
   173→	case 503:
   174→		return codes.Unavailable
   175→	case 504:
   176→		return codes.DeadlineExceeded
   177→	default:
   178→		if e.Code >= 2000 && e.Code < 9000 {
   179→			return codes.FailedPrecondition
   180→		}
   181→		return codes.Internal
   182→	}
   183→}
   184→
   185→// New 创建一个业务错误。
   186→func New(code int, msg string) *Error {
   187→	return &Error{Code: code, Msg: msg, HTTP: 400}
   188→}
   189→
   190→// Newf 创建一个带格式化的业务错误。
   191→func Newf(code int, format string, args ...any) *Error {
   192→	return &Error{Code: code, Msg: fmt.Sprintf(format, args...), HTTP: 400}
   193→}
   194→
   195→// Wrap 包装底层错误为业务错误。
   196→func Wrap(code int, msg string, cause error) *Error {
   197→	return &Error{Code: code, Msg: msg, HTTP: 500, cause: cause}
   198→}
   199→
   200→// 常用错误构造器 -------------------------------------------------------------
   201→
   202→func Internal(msg string) *Error { return &Error{Code: CodeInternalError, Msg: msg, HTTP: 500} }
   203→func Invalid(msg string) *Error  { return &Error{Code: CodeInvalidParam, Msg: msg, HTTP: 400} }
   204→func NotFound(msg string) *Error { return &Error{Code: CodeNotFound, Msg: msg, HTTP: 404} }
   205→func Unauthorized(msg string) *Error {
   206→	return &Error{Code: CodeUnauthorized, Msg: msg, HTTP: 401}
   207→}
   208→func Forbidden(msg string) *Error { return &Error{Code: CodeForbidden, Msg: msg, HTTP: 403} }
   209→func Conflict(msg string) *Error  { return &Error{Code: CodeConflict, Msg: msg, HTTP: 409} }
   210→
   211→// FromError 把任意错误转换成业务错误。
   212→func FromError(err error) *Error {
   213→	if err == nil {
   214→		return nil
   215→	}
   216→	var bizErr *Error
   217→	if errors.As(err, &bizErr) {
   218→		return bizErr
   219→	}
   220→	st, ok := status.FromError(err)
   221→	if ok && st.Code() != codes.Unknown {
   222→		// 尝试从 ErrorInfo 还原业务码
   223→		for _, d := range st.Details() {
   224→			if info, ok := d.(*errdetails.ErrorInfo); ok && info.GetDomain() == ErrorDomain {
   225→				code := 0
   226→				if _, err := fmt.Sscanf(info.GetReason(), "CODE_%d", &code); err == nil {
   227→					return &Error{Code: code, Msg: st.Message(), HTTP: httpFromGRPC(st.Code())}
   228→				}
   229→			}
   230→		}
   231→		return &Error{Code: CodeInternalError, Msg: st.Message(), HTTP: httpFromGRPC(st.Code())}
   232→	}
   233→	return &Error{Code: CodeInternalError, Msg: err.Error(), HTTP: 500, cause: err}
   234→}
   235→
   236→func httpFromGRPC(c codes.Code) int {
   237→	switch c {
   238→	case codes.InvalidArgument:
   239→		return 400
   240→	case codes.Unauthenticated:
   241→		return 401
   242→	case codes.PermissionDenied:
   243→		return 403
   244→	case codes.NotFound:
   245→		return 404
   246→	case codes.Aborted, codes.AlreadyExists, codes.FailedPrecondition:
   247→		return 409
   248→	case codes.ResourceExhausted:
   249→		return 429
   250→	case codes.Unavailable:
   251→		return 503
   252→	case codes.DeadlineExceeded:
   253→		return 504
   254→	default:
   255→		return 500
   256→	}
   257→}
   258→
   259→// IsCode 判断错误是否为指定业务码。
   260→func IsCode(err error, code int) bool {
   261→	bizErr := FromError(err)
   262→	return bizErr != nil && bizErr.Code == code
   263→}
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:16:27

<details><summary>🧠 思考过程</summary>

```
Now read notification repo.go and handler.go, and check DB table structures.

Also need to check gen/go for the generated code to confirm field names (e.g. StockCheckDetail, etc.) — but I shouldn't modify. Let me check the generated Go exists.

Let me also check the DB tables.
```

</details>

<details><summary>🛠 read</summary>

```
1→package notification
     2→
     3→import (
     4→	"context"
     5→	"errors"
     6→	"time"
     7→
     8→	"gorm.io/gorm"
     9→
    10→	"github.com/shopstack/platform/backend/internal/errs"
    11→)
    12→
    13→// Repo 封装通知域的数据访问。
    14→type Repo struct {
    15→	db *gorm.DB
    16→}
    17→
    18→// NewRepo 构造仓储。
    19→func NewRepo(db *gorm.DB) *Repo { return &Repo{db: db} }
    20→
    21→// DB 暴露底层数据库句柄。
    22→func (r *Repo) DB() *gorm.DB { return r.db }
    23→
    24→// ---------------------------------------------------------------------------
    25→// 站内通知
    26→// ---------------------------------------------------------------------------
    27→
    28→// NotificationQuery 是通知列表的查询条件。
    29→type NotificationQuery struct {
    30→	UserID     uint64
    31→	Type       int32
    32→	UnreadOnly bool
    33→	Page       int
    34→	PageSize   int
    35→}
    36→
    37→// ListNotifications 分页查询站内通知。
    38→func (r *Repo) ListNotifications(ctx context.Context, q NotificationQuery) ([]Notification, int64, error) {
    39→	tx := r.db.WithContext(ctx).Model(&Notification{}).Where("user_id = ?", q.UserID)
    40→	if q.Type > 0 {
    41→		tx = tx.Where("type = ?", q.Type)
    42→	}
    43→	if q.UnreadOnly {
    44→		// read 是 MySQL 保留字，必须反引号转义
    45→		tx = tx.Where("`read` = ?", false)
    46→	}
    47→	var total int64
    48→	if err := tx.Count(&total).Error; err != nil {
    49→		return nil, 0, err
    50→	}
    51→	var list []Notification
    52→	err := tx.Order("id DESC").Offset((q.Page - 1) * q.PageSize).Limit(q.PageSize).Find(&list).Error
    53→	return list, total, err
    54→}
    55→
    56→// CreateNotification 新增站内通知。
    57→func (r *Repo) CreateNotification(ctx context.Context, n *Notification) error {
    58→	return r.db.WithContext(ctx).Create(n).Error
    59→}
    60→
    61→// CountUnread 统计用户未读通知数。
    62→func (r *Repo) CountUnread(ctx context.Context, userID uint64) (int64, error) {
    63→	var count int64
    64→	err := r.db.WithContext(ctx).Model(&Notification{}).
    65→		Where("user_id = ? AND `read` = ?", userID, false).Count(&count).Error
    66→	return count, err
    67→}
    68→
    69→// MarkRead 标记单条通知已读。
    70→func (r *Repo) MarkRead(ctx context.Context, userID, id uint64) error {
    71→	now := time.Now()
    72→	return r.db.WithContext(ctx).Model(&Notification{}).
    73→		Where("id = ? AND user_id = ?", id, userID).
    74→		Updates(map[string]any{"read": true, "read_at": &now}).Error
    75→}
    76→
    77→// MarkAllRead 标记用户全部通知已读。
    78→func (r *Repo) MarkAllRead(ctx context.Context, userID uint64) (int64, error) {
    79→	now := time.Now()
    80→	res := r.db.WithContext(ctx).Model(&Notification{}).
    81→		Where("user_id = ? AND `read` = ?", userID, false).
    82→		Updates(map[string]any{"read": true, "read_at": &now})
    83→	return res.RowsAffected, res.Error
    84→}
    85→
    86→// FindNotificationByID 按 ID 查询通知。
    87→func (r *Repo) FindNotificationByID(ctx context.Context, id uint64) (*Notification, error) {
    88→	var n Notification
    89→	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&n).Error; err != nil {
    90→		if errors.Is(err, gorm.ErrRecordNotFound) {
    91→			return nil, errs.New(errs.CodeNotFound, "通知不存在")
    92→		}
    93→		return nil, err
    94→	}
    95→	return &n, nil
    96→}
    97→
    98→// ---------------------------------------------------------------------------
    99→// 短信记录
   100→// ---------------------------------------------------------------------------
   101→
   102→// SmsRecordQuery 是短信记录列表的查询条件。
   103→type SmsRecordQuery struct {
   104→	Phone    string
   105→	Scene    string
   106→	Page     int
   107→	PageSize int
   108→}
   109→
   110→// ListSmsRecords 分页查询短信发送记录。
   111→func (r *Repo) ListSmsRecords(ctx context.Context, q SmsRecordQuery) ([]SmsRecord, int64, error) {
   112→	tx := r.db.WithContext(ctx).Model(&SmsRecord{})
   113→	if q.Phone != "" {
   114→		tx = tx.Where("phone = ?", q.Phone)
   115→	}
   116→	if q.Scene != "" {
   117→		tx = tx.Where("scene = ?", q.Scene)
   118→	}
   119→	var total int64
   120→	if err := tx.Count(&total).Error; err != nil {
   121→		return nil, 0, err
   122→	}
   123→	var list []SmsRecord
   124→	err := tx.Order("id DESC").Offset((q.Page - 1) * q.PageSize).Limit(q.PageSize).Find(&list).Error
   125→	return list, total, err
   126→}
   127→
   128→// CreateSmsRecord 新增短信发送记录。
   129→func (r *Repo) CreateSmsRecord(ctx context.Context, rec *SmsRecord) error {
   130→	return r.db.WithContext(ctx).Create(rec).Error
   131→}
   132→
   133→// CountSmsByPhoneScene 统计指定手机号与场景的发送次数。
   134→func (r *Repo) CountSmsByPhoneScene(ctx context.Context, phone, scene string) (int64, error) {
   135→	var count int64
   136→	err := r.db.WithContext(ctx).Model(&SmsRecord{}).
   137→		Where("phone = ? AND scene = ?", phone, scene).Count(&count).Error
   138→	return count, err
   139→}
   140→
   141→// ---------------------------------------------------------------------------
   142→// 审计日志
   143→// ---------------------------------------------------------------------------
   144→
   145→// AuditLogQuery 是审计日志列表的查询条件。
   146→type AuditLogQuery struct {
   147→	Module    string
   148→	Action    string
   149→	AdminID   int64
   150→	Keyword   string
   151→	StartTime *time.Time
   152→	EndTime   *time.Time
   153→	Page      int
   154→	PageSize  int
   155→}
   156→
   157→// ListAuditLogs 分页查询审计日志。
   158→func (r *Repo) ListAuditLogs(ctx context.Context, q AuditLogQuery) ([]AuditLog, int64, error) {
   159→	tx := r.db.WithContext(ctx).Model(&AuditLog{})
   160→	if q.Module != "" {
   161→		tx = tx.Where("module = ?", q.Module)
   162→	}
   163→	if q.Action != "" {
   164→		tx = tx.Where("action = ?", q.Action)
   165→	}
   166→	if q.AdminID > 0 {
   167→		tx = tx.Where("admin_id = ?", q.AdminID)
   168→	}
   169→	if q.Keyword != "" {
   170→		like := "%" + q.Keyword + "%"
   171→		tx = tx.Where("admin_name LIKE ? OR target_id LIKE ? OR detail LIKE ? OR ip LIKE ?", like, like, like, like)
   172→	}
   173→	if q.StartTime != nil {
   174→		tx = tx.Where("created_at >= ?", *q.StartTime)
   175→	}
   176→	if q.EndTime != nil {
   177→		tx = tx.Where("created_at <= ?", *q.EndTime)
   178→	}
   179→	var total int64
   180→	if err := tx.Count(&total).Error; err != nil {
   181→		return nil, 0, err
   182→	}
   183→	var list []AuditLog
   184→	err := tx.Order("id DESC").Offset((q.Page - 1) * q.PageSize).Limit(q.PageSize).Find(&list).Error
   185→	return list, total, err
   186→}
   187→
   188→// CreateAuditLog 新增审计日志。
   189→func (r *Repo) CreateAuditLog(ctx context.Context, log *AuditLog) error {
   190→	return r.db.WithContext(ctx).Create(log).Error
   191→}
   192→
   193→// ---------------------------------------------------------------------------
   194→// 系统配置
   195→// ---------------------------------------------------------------------------
   196→
   197→// ListSystemSettings 查询系统配置，group 为空时返回全部。
   198→func (r *Repo) ListSystemSettings(ctx context.Context, group string) ([]SystemSetting, error) {
   199→	tx := r.db.WithContext(ctx).Model(&SystemSetting{})
   200→	if group != "" {
   201→		tx = tx.Where("`group` = ?", group)
   202→	}
   203→	var list []SystemSetting
   204→	err := tx.Order("`group` ASC, id ASC").Find(&list).Error
   205→	return list, err
   206→}
   207→
   208→// UpdateSystemSetting 按 key 更新配置值。
   209→func (r *Repo) UpdateSystemSetting(ctx context.Context, key, value string) error {
   210→	return r.db.WithContext(ctx).Model(&SystemSetting{}).
   211→		Where("`key` = ?", key).
   212→		Updates(map[string]any{"value": value, "updated_at": time.Now()}).Error
   213→}
```

</details>

<details><summary>🛠 read</summary>

```
1→package notification
     2→
     3→import (
     4→	"context"
     5→	"fmt"
     6→
     7→	commonv1 "github.com/shopstack/platform/gen/go/common/v1"
     8→	notificationv1 "github.com/shopstack/platform/gen/go/notification/v1"
     9→)
    10→
    11→// Handler 实现 NotificationService。
    12→type Handler struct {
    13→	notificationv1.UnimplementedNotificationServiceServer
    14→	service *Service
    15→}
    16→
    17→// NewHandler 构造处理器。
    18→func NewHandler(service *Service) *Handler {
    19→	return &Handler{service: service}
    20→}
    21→
    22→// Send 发送站内通知。
    23→func (h *Handler) Send(ctx context.Context, req *notificationv1.SendNotificationRequest) (*commonv1.OperationResult, error) {
    24→	sent, err := h.service.Send(ctx, req)
    25→	if err != nil {
    26→		return nil, err
    27→	}
    28→	return &commonv1.OperationResult{Success: true, Message: fmt.Sprintf("通知已发送，共 %d 条", sent)}, nil
    29→}
    30→
    31→// List 查询用户通知。
    32→func (h *Handler) List(ctx context.Context, req *notificationv1.ListNotificationsRequest) (*notificationv1.ListNotificationsResponse, error) {
    33→	return h.service.List(ctx, req)
    34→}
    35→
    36→// MarkRead 标记单条通知已读。
    37→func (h *Handler) MarkRead(ctx context.Context, req *notificationv1.MarkReadRequest) (*commonv1.OperationResult, error) {
    38→	if err := h.service.MarkRead(ctx, req.GetUserId(), req.GetId()); err != nil {
    39→		return nil, err
    40→	}
    41→	return &commonv1.OperationResult{Success: true, Message: "已读"}, nil
    42→}
    43→
    44→// MarkAllRead 标记全部通知已读。
    45→func (h *Handler) MarkAllRead(ctx context.Context, req *notificationv1.MarkAllReadRequest) (*commonv1.OperationResult, error) {
    46→	affected, err := h.service.MarkAllRead(ctx, req.GetUserId())
    47→	if err != nil {
    48→		return nil, err
    49→	}
    50→	return &commonv1.OperationResult{
    51→		Success: true,
    52→		Message: fmt.Sprintf("已全部标记为已读，共 %d 条", affected),
    53→	}, nil
    54→}
    55→
    56→// GetUnreadCount 查询未读通知数。
    57→func (h *Handler) GetUnreadCount(ctx context.Context, req *notificationv1.UnreadCountRequest) (*notificationv1.UnreadCountResponse, error) {
    58→	count, err := h.service.GetUnreadCount(ctx, req.GetUserId())
    59→	if err != nil {
    60→		return nil, err
    61→	}
    62→	return &notificationv1.UnreadCountResponse{Count: count}, nil
    63→}
    64→
    65→// SendSms 发送验证码短信。
    66→func (h *Handler) SendSms(ctx context.Context, req *notificationv1.SendSmsRequest) (*notificationv1.SendSmsResponse, error) {
    67→	return h.service.SendSms(ctx, req.GetPhone(), req.GetScene())
    68→}
    69→
    70→// ListSmsRecords 查询短信发送记录。
    71→func (h *Handler) ListSmsRecords(ctx context.Context, req *notificationv1.ListSmsRecordsRequest) (*notificationv1.ListSmsRecordsResponse, error) {
    72→	return h.service.ListSmsRecords(ctx, req)
    73→}
    74→
    75→// ListAuditLogs 查询操作审计日志。
    76→func (h *Handler) ListAuditLogs(ctx context.Context, req *notificationv1.ListAuditLogsRequest) (*notificationv1.ListAuditLogsResponse, error) {
    77→	return h.service.ListAuditLogs(ctx, req)
    78→}
    79→
    80→// ListSystemSettings 查询系统配置。
    81→func (h *Handler) ListSystemSettings(ctx context.Context, req *notificationv1.ListSystemSettingsRequest) (*notificationv1.ListSystemSettingsResponse, error) {
    82→	return h.service.ListSystemSettings(ctx, req.GetGroup())
    83→}
    84→
    85→// UpdateSystemSettings 批量更新系统配置。
    86→func (h *Handler) UpdateSystemSettings(ctx context.Context, req *notificationv1.UpdateSystemSettingsRequest) (*notificationv1.ListSystemSettingsResponse, error) {
    87→	return h.service.UpdateSystemSettings(ctx, req.GetGroup(), req.GetValues())
    88→}
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:16:33

<details><summary>🧠 思考过程</summary>

```
Now let's check the DB table structures.
```

</details>

Now let me check the actual database table structures.

<details><summary>🛠 bash</summary>

```
=== warehouses ===
Field	Type	Null	Key	Default	Extra
id	bigint unsigned	NO	PRI	NULL	auto_increment
code	varchar(32)	NO	UNI		
name	varchar(64)	NO			
address	varchar(255)	NO			
contact	varchar(64)	NO			
phone	varchar(32)	NO			
enabled	tinyint	NO		1	
sort	int	NO		0	
created_at	datetime	NO		CURRENT_TIMESTAMP	DEFAULT_GENERATED
=== inbound_orders ===
Field	Type	Null	Key	Default	Extra
id	bigint unsigned	NO	PRI	NULL	auto_increment
inbound_no	varchar(64)	NO	UNI		
warehouse_id	bigint unsigned	NO		0	
warehouse_name	varchar(64)	NO			
supplier	varchar(128)	NO			
status	tinyint	NO	MUL	0	
total_quantity	int	NO		0	
remark	varchar(512)	NO			
operator	varchar(64)	NO			
created_at	datetime	NO		CURRENT_TIMESTAMP	DEFAULT_GENERATED
=== inbound_order_items ===
Field	Type	Null	Key	Default	Extra
id	bigint unsigned	NO	PRI	NULL	auto_increment
inbound_id	bigint unsigned	NO	MUL	NULL	
sku_id	bigint unsigned	NO		NULL	
sku_code	varchar(64)	NO			
spec_text	varchar(128)	NO			
quantity	int	NO		0	
=== outbound_orders ===
Field	Type	Null	Key	Default	Extra
id	bigint unsigned	NO	PRI	NULL	auto_increment
outbound_no	varchar(64)	NO	UNI		
warehouse_id	bigint unsigned	NO		0	
warehouse_name	varchar(64)	NO			
order_id	bigint unsigned	NO		0	
order_no	varchar(64)	NO			
status	tinyint	NO	MUL	0	
total_quantity	int	NO		0	
remark	varchar(512)	NO			
operator	varchar(64)	NO			
created_at	datetime	NO		CURRENT_TIMESTAMP	DEFAULT_GENERATED
=== outbound_order_items ===
Field	Type	Null	Key	Default	Extra
id	bigint unsigned	NO	PRI	NULL	auto_increment
outbound_id	bigint unsigned	NO	MUL	NULL	
sku_id	bigint unsigned	NO		NULL	
sku_code	varchar(64)	NO			
spec_text	varchar(128)	NO			
quantity	int	NO		0	
=== stock_checks ===
Field	Type	Null	Key	Default	Extra
id	bigint unsigned	NO	PRI	NULL	auto_increment
check_no	varchar(64)	NO	UNI		
warehouse_id	bigint unsigned	NO		0	
warehouse_name	varchar(64)	NO			
status	tinyint	NO	MUL	0	
total_count	int	NO		0	
diff_count	int	NO		0	
remark	varchar(512)	NO			
operator	varchar(64)	NO			
created_at	datetime	NO		CURRENT_TIMESTAMP	DEFAULT_GENERATED
=== stock_check_items ===
Field	Type	Null	Key	Default	Extra
id	bigint unsigned	NO	PRI	NULL	auto_increment
stock_check_id	bigint unsigned	NO	MUL	NULL	
sku_id	bigint unsigned	NO		NULL	
sku_code	varchar(64)	NO			
spec_text	varchar(128)	NO			
book_quantity	int	NO		0	
actual_quantity	int	NO		0	
diff_quantity	int	NO		0	
=== pay_channels ===
Field	Type	Null	Key	Default	Extra
id	bigint unsigned	NO	PRI	NULL	auto_increment
name	varchar(64)	NO			
channel	tinyint	NO		1	
code	varchar(32)	NO	UNI		
icon	varchar(512)	NO			
enabled	tinyint	NO		1	
sort	int	NO		0	
config	text	NO		NULL	
created_at	datetime	NO		CURRENT_TIMESTAMP	DEFAULT_GENERATED
=== balance_logs ===
Field	Type	Null	Key	Default	Extra
id	bigint unsigned	NO	PRI	NULL	auto_increment
user_id	bigint unsigned	NO	MUL	NULL	
change	bigint	NO		0	
balance	bigint	NO		0	
title	varchar(128)	NO			
biz_type	varchar(32)	NO			
created_at	datetime	NO		CURRENT_TIMESTAMP	DEFAULT_GENERATED
=== recharge_orders ===
Field	Type	Null	Key	Default	Extra
id	bigint unsigned	NO	PRI	NULL	auto_increment
recharge_no	varchar(64)	NO	UNI		
user_id	bigint unsigned	NO	MUL	NULL	
amount_cents	bigint	NO		0	
bonus_cents	bigint	NO		0	
status	tinyint	NO		0	
channel	tinyint	NO		1	
payment_no	varchar(64)	NO			
paid_at	datetime	YES		NULL	
created_at	datetime	NO		CURRENT_TIMESTAMP	DEFAULT_GENERATED
=== notification_templates ===
Field	Type	Null	Key	Default	Extra
id	bigint unsigned	NO	PRI	NULL	auto_increment
code	varchar(64)	NO	UNI		
name	varchar(64)	NO			
type	tinyint	NO		1	
title	varchar(255)	NO			
content	text	NO		NULL	
link	varchar(512)	NO			
enabled	tinyint	NO		1	
updated_at	datetime	NO		CURRENT_TIMESTAMP	DEFAULT_GENERATED on update CURRENT_TIMESTAMP
=== sms_templates ===
Field	Type	Null	Key	Default	Extra
id	bigint unsigned	NO	PRI	NULL	auto_increment
code	varchar(64)	NO	UNI		
name	varchar(64)	NO			
content	text	NO		NULL	
enabled	tinyint	NO		1	
updated_at	datetime	NO		CURRENT_TIMESTAMP	DEFAULT_GENERATED on update CURRENT_TIMESTAMP
=== sensitive_words ===
Field	Type	Null	Key	Default	Extra
id	bigint unsigned	NO	PRI	NULL	auto_increment
word	varchar(128)	NO	UNI		
category	tinyint	NO		4	
status	tinyint	NO		1	
created_at	datetime	NO		CURRENT_TIMESTAMP	DEFAULT_GENERATED
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:16:42

<details><summary>🧠 思考过程</summary>

```
Actual DB tables differ slightly from the brief (e.g. `change`/`balance` instead of `change_amount_cents`/`balance_after_cents`; `inbound_id` instead of `inbound_order_id`; no `deleted_at` columns; `sms_templates` has no `sign_name`/`scene`/`status`/`remark`; `notification_templates` has no `category`/`channels`/`status`/`remark`; `sensitive_words` has no deleted_at; `pay_channels` has no description; `warehouses` has no description/status/updated_at).

So the DB schema is the truth. The proto fields map partially:
- Warehouse proto: id, code, name, address, contact, phone, enabled, sort, created_at ✓ all match.
- InboundOrder proto: id, inbound_no, warehouse_id, warehouse_name, supplier, status, total_quantity, remark, operator, items, created_at ✓.
- StockMoveItem: sku_id, sku_code, spec_text, quantity ✓ matches inbound_order_items.
- OutboundOrder: id, outbound_no, warehouse_id, warehouse_name, order_id, order_no, status, total_quantity, remark, operator, items, created_at ✓.
- StockCheck: id, check_no, warehouse_id, warehouse_name, status, total_count, diff_count, remark, operator, created_at ✓.
- StockCheckItem: id, stock_check_id, sku_id, sku_code, spec_text, book_quantity, actual_quantity, diff_quantity ✓ matches stock_check_items.
- PayChannel: id, name, channel, code, icon, enabled, sort, config, created_at ✓.
- RechargeOrder: id, recharge_no, user_id, amount_cents, bonus_cents, status, channel, payment_no, paid_at, created_at ✓.
- BalanceLog: id, user_id, change, balance, title, biz_type, created_at ✓ (DB columns change/balance).
- RechargeConfig: min/max amount, preset_amounts, register_bonus_cents, first_recharge_bonus_desc — from system_settings probably.
- NotificationTemplate: id, code, name, type, title, content, link, enabled, updated_at ✓.
- SmsTemplate: id, code, name, content, enabled, updated_at ✓.
- SensitiveWord: id, word, category, status, created_at ✓.

Note: no `deleted_at` in these tables, so soft delete is not available → use hard delete (Delete). Since gorm.DeletedAt requires a column, avoid it.

Also note `warehouses` has no updated_at. `notification_templates.updated_at` exists.

Now check seed data and whether there's a `recharge_configs` table or settings for recharge config. Let me check the full table list and system_settings content.

Also need to check `inventories` table structure and `inventory_logs`.

Let me also check the gen/go generated code to verify names of Go types (e.g., `StockCheckDetail`).

Also check the common proto for NotificationType enum, PaymentChannel.

Let me query.
```

</details>

<details><summary>🛠 bash</summary>

```
Tables_in_shopstack
admin_roles
admins
after_sales
audit_logs
balance_logs
banners
cart_items
categories
channels
coupons
delivery_ranges
group_buy_members
group_buys
guarantees
help_articles
inbound_order_items
inbound_orders
inventories
inventory_logs
logistic_templates
logistics_companies
marketing_tasks
notification_templates
notifications
order_items
order_status_logs
orders
outbound_order_items
outbound_orders
pay_channels
payment_refunds
payments
permissions
product_attributes
product_images
product_materials
product_questions
product_skus
products
promotion_sessions
promotions
recharge_orders
refund_reasons
refunds
regions
review_tags
reviews
role_permissions
roles
sensitive_words
shipment_tracks
shipments
sign_in_records
sms_records
sms_templates
stock_check_items
stock_checks
system_settings
user_addresses
user_coupons
user_favorites
user_feedbacks
user_growth_logs
user_invoice_templates
user_invoices
user_levels
user_notification_settings
user_points_logs
user_tasks
users
warehouses
=== system_settings ===
key	value	name	group	value_type
site.name	ShopStack ??	????	basic	string
site.service_phone	400-800-1234	????	basic	string
site.icp	?ICP?2026000001?	ICP ???	basic	string
order.auto_receive_days	10	????????	order	number
order.cancel_timeout_minutes	30	?????????	order	number
order.free_freight_cents	9900	???????	order	number
order.default_freight_cents	1000	???????	order	number
points.register_reward	100	??????	points	number
points.exchange_rate	100	??????	points	number
sms.code_expire_seconds	300	?????????	sms	number
sms.daily_limit	10	????????	sms	number
=== inventories ===
Field	Type	Null	Key	Default	Extra
id	bigint unsigned	NO	PRI	NULL	auto_increment
sku_id	bigint unsigned	NO	UNI	NULL	
product_id	bigint unsigned	NO	MUL	0	
sku_code	varchar(64)	NO			
spec_text	varchar(255)	NO			
total_stock	int	NO		0	
available_stock	int	NO	MUL	0	
locked_stock	int	NO		0	
sold_stock	int	NO		0	
safety_stock	int	NO		0	
warehouse	varchar(64)	NO		???	
version	bigint	NO		0	
updated_at	datetime(3)	YES		NULL	
created_at	datetime(3)	YES		NULL	
Field	Type	Null	Key	Default	Extra
id	bigint unsigned	NO	PRI	NULL	auto_increment
sku_id	bigint unsigned	NO	MUL	NULL	
product_id	bigint unsigned	NO		0	
sku_code	varchar(64)	NO			
change_type	tinyint	NO		NULL	
quantity	int	NO		0	
before_stock	int	NO		0	
after_stock	int	NO		0	
biz_type	varchar(32)	NO	MUL		
biz_id	varchar(64)	NO	MUL		
operator	varchar(64)	NO			
remark	varchar(255)	NO			
created_at	datetime(3)	YES	MUL	NULL	
=== pay_channels data ===
id	name	channel	code	icon	enabled	sort	config	created_at
1	????	1	wechat	https://placehold.co/64x64/07C160/FFFFFF?text=WX	1	1	{"app_id":"","mch_id":"","notify_url":""}	2026-10-20 06:03:19
2	???	2	alipay	https://placehold.co/64x64/1677FF/FFFFFF?text=ALI	1	2	{"app_id":"","notify_url":""}	2026-10-20 06:03:19
3	????	3	balance	https://placehold.co/64x64/8C7853/FFFFFF?text=BAL	1	3	{}	2026-10-20 06:03:19
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:17:02

<details><summary>🧠 思考过程</summary>

```
No `recharge_configs` table. system_settings has no recharge keys. So GetRechargeConfig must use system_settings with a group like "recharge" (keys may not exist → defaults). Best: read system_settings for group 'recharge' with keys like `recharge.min_amount_cents`, `recharge.max_amount_cents`, `recharge.preset_amounts`, `recharge.register_bonus_cents`, `recharge.first_bonus_desc`; fall back to hardcoded defaults. That's real DB read + fallback. I'll document it.

Also `balance_logs` has no `biz_id`/`remark` columns — only `change`, `balance`, `title`, `biz_type`. The brief said fields differ; actual table is authoritative. Also balance_logs has no `deleted_at`.

Where is user balance stored? There's no `user_balances` table. Balance is derived from sum of balance_logs (change). So current_balance = SUM(change) for user. That's a reasonable approach. Let me check user table for a balance column.

Let me check users table.

Also check gen/go generated names for the new protos — verify they exist (compiled). Let's check gen/go/inventory/v1 for Warehouse, StockCheckDetail etc.

Also check the `user` domain for balance handling — maybe user_points_logs. But user domain is not mine to modify; I only need payment.

Let me check users table for balance column and check gen files.
```

</details>

<details><summary>🛠 bash</summary>

```
Field	Type	Null	Key	Default	Extra
id	bigint unsigned	NO	PRI	NULL	auto_increment
username	varchar(64)	NO			
password_hash	varchar(255)	NO			
nickname	varchar(64)	NO			
avatar	varchar(512)	NO			
phone	varchar(32)	NO			
email	varchar(128)	NO			
gender	tinyint	NO		0	
birthday	date	YES		NULL	
points	bigint	NO		0	
balance_cents	bigint	NO		0	
status	tinyint	NO	MUL	1	
wechat_openid	varchar(64)	NO	MUL		
last_login_at	datetime(3)	YES		NULL	
created_at	datetime(3)	YES		NULL	
updated_at	datetime(3)	YES		NULL	
deleted_at	datetime(3)	YES	MUL	NULL	
=== balance_logs data ===
id	user_id	change	balance	title	biz_type	created_at
1	1	888800	888800	??????	admin	2026-09-20 06:03:19
2	1	-17800	871000	????	order	2026-10-18 06:03:19
c
2
c
2
=== gen ===
gen/go/inventory/v1:
inventory.pb.go
inventory.pb.gw.go
inventory_grpc.pb.go

gen/go/notification/v1:
notification.pb.go
notification.pb.gw.go
notification_grpc.pb.go

gen/go/payment/v1:
payment.pb.go
payment.pb.gw.go
payment_grpc.pb.go
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:17:16

<details><summary>🧠 思考过程</summary>

```
`users.balance_cents` exists. So the balance is stored in users table. Good — balance logs' `balance` column = balance_after_cents.

Now, for the recharge settle: on Notify, I need to credit user's balance_cents and write balance_logs. That's a cross-table update in payment domain (users table) — acceptable since payment domain handles balances.

But wait: the recharge flow. CreateRecharge creates a recharge_order with status 0 (待支付). How does it get paid? The Notify callback takes payment_no. RechargeOrder proto has `payment_no` field. Hmm — the recharge order's payment_no field could hold the recharge_no... Let me think: in Notify, `req.GetPaymentNo()` refers to `payments.payment_no` (payment flow). To credit a recharge, we need a linkage.

Approach: CreateRecharge creates both a `recharge_orders` row AND a `payments` row (payment for the recharge) linked via payment_no? But recharge_orders.payment_no column exists (varchar 64). The `payments` table has order_id/order_no. Hmm, payments has no "type" column.

Simpler coherent design:
- CreateRecharge creates a recharge_order with status=0, channel, amount_cents, bonus_cents (bonus computed from recharge config presets), and generates `recharge_no`. Also creates a `payments` row with payment_no = recharge_no, order_id = 0, order_no = recharge_no, user_id, amount_cents, status=pending, channel. Then recharge_order.payment_no = payment_no.

Hmm but payments.payment_no unique. recharge_no could serve as payment_no directly. Actually simplest: use the same number for both: recharge_no = "RC"+..., and create a payment row with payment_no = recharge_no, order_no = recharge_no.

Then Notify(payment_no) → settle finds payment by payment_no → success → publish event. In settle, after marking payment success, check if the payment is a recharge: look up recharge_orders where payment_no = p.PaymentNo (or recharge_no). If found and status==0, then credit balance.

But the mock settle path also calls settle, so recharge would be auto-credited in mock mode. That's consistent with the demo environment behavior.

Alternatively simpler and cleaner: in Notify/settle, after marking payment success, call `s.settleRecharge(ctx, p)` which looks up recharge order by payment_no and, if status pending, updates user balance and writes balance_log.

For the recharge to be paid, we need the channel to be actually paid. In mock mode, `mockSettle` is triggered in CreatePayment only. For CreateRecharge, I won't auto-mock — the user is expected to pay via callback. Hmm, but then the demo can't complete. I could mirror the mock behavior: if channel != balance (3), and providers.WeChat.Mock() is true, spawn mockSettle for the recharge payment. That gives a working end-to-end demo. Let me check thirdparty.Providers to see Mock().

Let's look at the thirdparty package and the payment service registry usage.

Also I need to check `auth.UserIDFromContext`.

Let me look at backend/internal/thirdparty.
```

</details>

<details><summary>🛠 bash</summary>

```
providers.go
thirdparty.go
backend/internal/thirdparty/providers.go:39:func (w *weChatProvider) Mock() bool { return w.mock }
backend/internal/thirdparty/providers.go:170:func (s *smsProvider) Mock() bool { return s.mock }
backend/internal/thirdparty/providers.go:222:func (o *ossProvider) Mock() bool { return o.mock }
backend/internal/thirdparty/thirdparty.go:63:	Mock() bool
backend/internal/thirdparty/thirdparty.go:85:	Mock() bool
backend/internal/thirdparty/thirdparty.go:98:	Mock() bool
backend/internal/thirdparty/thirdparty.go:106:type Providers struct {
```

</details>

<details><summary>🛠 bash</summary>

```
203:func UserIDFromContext(ctx context.Context) int64 {
211:func UsernameFromContext(ctx context.Context) string {
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:17:36

<details><summary>🧠 思考过程</summary>

```
Let me look at the generated Go code for the new messages to know exact Go field names, and confirm the grpc service interface method signatures. Let me grep the gen files.

Also need commonv1.PaymentChannel and NotificationType enums.

Let me check gen/go/inventory/v1/inventory_grpc.pb.go for the server interface methods, and the struct field names in inventory.pb.go for new messages.
```

</details>

<details><summary>🛠 bash</summary>

```
1077-	Id            int64                  `protobuf:"varint,1,opt,name=id,proto3" json:"id,omitempty"`
1078-	Code          string                 `protobuf:"bytes,2,opt,name=code,proto3" json:"code,omitempty"`
1079-	Name          string                 `protobuf:"bytes,3,opt,name=name,proto3" json:"name,omitempty"`
1080-	Address       string                 `protobuf:"bytes,4,opt,name=address,proto3" json:"address,omitempty"`
1081-	Contact       string                 `protobuf:"bytes,5,opt,name=contact,proto3" json:"contact,omitempty"`
1082-	Phone         string                 `protobuf:"bytes,6,opt,name=phone,proto3" json:"phone,omitempty"`
1083-	Enabled       bool                   `protobuf:"varint,7,opt,name=enabled,proto3" json:"enabled,omitempty"`
1084-	Sort          int32                  `protobuf:"varint,8,opt,name=sort,proto3" json:"sort,omitempty"`
1085-	CreatedAt     *timestamppb.Timestamp `protobuf:"bytes,9,opt,name=created_at,json=createdAt,proto3" json:"created_at,omitempty"`
1433-	SkuId         int64                  `protobuf:"varint,1,opt,name=sku_id,json=skuId,proto3" json:"sku_id,omitempty"`
1434-	SkuCode       string                 `protobuf:"bytes,2,opt,name=sku_code,json=skuCode,proto3" json:"sku_code,omitempty"`
1435-	SpecText      string                 `protobuf:"bytes,3,opt,name=spec_text,json=specText,proto3" json:"spec_text,omitempty"`
1436-	Quantity      int32                  `protobuf:"varint,4,opt,name=quantity,proto3" json:"quantity,omitempty"`
1501-	Id            int64                  `protobuf:"varint,1,opt,name=id,proto3" json:"id,omitempty"`
1502-	InboundNo     string                 `protobuf:"bytes,2,opt,name=inbound_no,json=inboundNo,proto3" json:"inbound_no,omitempty"`
1503-	WarehouseId   int64                  `protobuf:"varint,3,opt,name=warehouse_id,json=warehouseId,proto3" json:"warehouse_id,omitempty"`
1504-	WarehouseName string                 `protobuf:"bytes,4,opt,name=warehouse_name,json=warehouseName,proto3" json:"warehouse_name,omitempty"`
1505-	Supplier      string                 `protobuf:"bytes,5,opt,name=supplier,proto3" json:"supplier,omitempty"`
1506-	Status        int32                  `protobuf:"varint,6,opt,name=status,proto3" json:"status,omitempty"` // 0 待入库 1 已入库 2 已取消
1507-	TotalQuantity int32                  `protobuf:"varint,7,opt,name=total_quantity,json=totalQuantity,proto3" json:"total_quantity,omitempty"`
1508-	Remark        string                 `protobuf:"bytes,8,opt,name=remark,proto3" json:"remark,omitempty"`
1509-	Operator      string                 `protobuf:"bytes,9,opt,name=operator,proto3" json:"operator,omitempty"`
1510-	Items         []*StockMoveItem       `protobuf:"bytes,10,rep,name=items,proto3" json:"items,omitempty"`
1511-	CreatedAt     *timestamppb.Timestamp `protobuf:"bytes,11,opt,name=created_at,json=createdAt,proto3" json:"created_at,omitempty"`
1805-	Id            int64                  `protobuf:"varint,1,opt,name=id,proto3" json:"id,omitempty"`
1806-	OutboundNo    string                 `protobuf:"bytes,2,opt,name=outbound_no,json=outboundNo,proto3" json:"outbound_no,omitempty"`
1807-	WarehouseId   int64                  `protobuf:"varint,3,opt,name=warehouse_id,json=warehouseId,proto3" json:"warehouse_id,omitempty"`
1808-	WarehouseName string                 `protobuf:"bytes,4,opt,name=warehouse_name,json=warehouseName,proto3" json:"warehouse_name,omitempty"`
1809-	OrderId       int64                  `protobuf:"varint,5,opt,name=order_id,json=orderId,proto3" json:"order_id,omitempty"`
1810-	OrderNo       string                 `protobuf:"bytes,6,opt,name=order_no,json=orderNo,proto3" json:"order_no,omitempty"`
1811-	Status        int32                  `protobuf:"varint,7,opt,name=status,proto3" json:"status,omitempty"` // 0 待出库 1 已出库 2 已取消
1812-	TotalQuantity int32                  `protobuf:"varint,8,opt,name=total_quantity,json=totalQuantity,proto3" json:"total_quantity,omitempty"`
1813-	Remark        string                 `protobuf:"bytes,9,opt,name=remark,proto3" json:"remark,omitempty"`
1814-	Operator      string                 `protobuf:"bytes,10,opt,name=operator,proto3" json:"operator,omitempty"`
1815-	Items         []*StockMoveItem       `protobuf:"bytes,11,rep,name=items,proto3" json:"items,omitempty"`
1816-	CreatedAt     *timestamppb.Timestamp `protobuf:"bytes,12,opt,name=created_at,json=createdAt,proto3" json:"created_at,omitempty"`
2117-	Id            int64                  `protobuf:"varint,1,opt,name=id,proto3" json:"id,omitempty"`
2118-	CheckNo       string                 `protobuf:"bytes,2,opt,name=check_no,json=checkNo,proto3" json:"check_no,omitempty"`
2119-	WarehouseId   int64                  `protobuf:"varint,3,opt,name=warehouse_id,json=warehouseId,proto3" json:"warehouse_id,omitempty"`
2120-	WarehouseName string                 `protobuf:"bytes,4,opt,name=warehouse_name,json=warehouseName,proto3" json:"warehouse_name,omitempty"`
2121-	Status        int32                  `protobuf:"varint,5,opt,name=status,proto3" json:"status,omitempty"` // 0 盘点中 1 已完成 2 已取消
2122-	TotalCount    int32                  `protobuf:"varint,6,opt,name=total_count,json=totalCount,proto3" json:"total_count,omitempty"`
2123-	DiffCount     int32                  `protobuf:"varint,7,opt,name=diff_count,json=diffCount,proto3" json:"diff_count,omitempty"`
2124-	Remark        string                 `protobuf:"bytes,8,opt,name=remark,proto3" json:"remark,omitempty"`
2125-	Operator      string                 `protobuf:"bytes,9,opt,name=operator,proto3" json:"operator,omitempty"`
2126-	CreatedAt     *timestamppb.Timestamp `protobuf:"bytes,10,opt,name=created_at,json=createdAt,proto3" json:"created_at,omitempty"`
2449-	Id             int64                  `protobuf:"varint,1,opt,name=id,proto3" json:"id,omitempty"`
2450-	StockCheckId   int64                  `protobuf:"varint,2,opt,name=stock_check_id,json=stockCheckId,proto3" json:"stock_check_id,omitempty"`
2451-	SkuId          int64                  `protobuf:"varint,3,opt,name=sku_id,json=skuId,proto3" json:"sku_id,omitempty"`
2452-	SkuCode        string                 `protobuf:"bytes,4,opt,name=sku_code,json=skuCode,proto3" json:"sku_code,omitempty"`
2453-	SpecText       string                 `protobuf:"bytes,5,opt,name=spec_text,json=specText,proto3" json:"spec_text,omitempty"`
2454-	BookQuantity   int32                  `protobuf:"varint,6,opt,name=book_quantity,json=bookQuantity,proto3" json:"book_quantity,omitempty"`       // 账面数量
2455-	ActualQuantity int32                  `protobuf:"varint,7,opt,name=actual_quantity,json=actualQuantity,proto3" json:"actual_quantity,omitempty"` // 实盘数量
2456-	DiffQuantity   int32                  `protobuf:"varint,8,opt,name=diff_quantity,json=diffQuantity,proto3" json:"diff_quantity,omitempty"`
2549-	StockCheck    *StockCheck            `protobuf:"bytes,1,opt,name=stock_check,json=stockCheck,proto3" json:"stock_check,omitempty"`
2550-	Items         []*StockCheckItem      `protobuf:"bytes,2,rep,name=items,proto3" json:"items,omitempty"`
2601-	Items         []*StockCheckItem      `protobuf:"bytes,1,rep,name=items,proto3" json:"items,omitempty"`
2602-	Meta          *v1.PageMeta           `protobuf:"bytes,2,opt,name=meta,proto3" json:"meta,omitempty"`
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:17:42

<details><summary>🧠 思考过程</summary>

```
Good. Now check payment & notification gen structs quickly for field names (PayChannel, RechargeOrder, BalanceLog, RechargeConfig, NotificationTemplate, SmsTemplate, SensitiveWord, NotificationCategory).

Also check grpc server interface signatures — they should mirror proto.

Let me grep.
```

</details>

<details><summary>🛠 bash</summary>

```
927:type PayChannel struct {
929-	Id            int64                  `protobuf:"varint,1,opt,name=id,proto3" json:"id,omitempty"`
930-	Name          string                 `protobuf:"bytes,2,opt,name=name,proto3" json:"name,omitempty"`
931-	Channel       int32                  `protobuf:"varint,3,opt,name=channel,proto3" json:"channel,omitempty"` // 对应 common.PaymentChannel
932-	Code          string                 `protobuf:"bytes,4,opt,name=code,proto3" json:"code,omitempty"`
933-	Icon          string                 `protobuf:"bytes,5,opt,name=icon,proto3" json:"icon,omitempty"`
934-	Enabled       bool                   `protobuf:"varint,6,opt,name=enabled,proto3" json:"enabled,omitempty"`
935-	Sort          int32                  `protobuf:"varint,7,opt,name=sort,proto3" json:"sort,omitempty"`
936-	Config        string                 `protobuf:"bytes,8,opt,name=config,proto3" json:"config,omitempty"` // JSON 配置
937-	CreatedAt     *timestamppb.Timestamp `protobuf:"bytes,9,opt,name=created_at,json=createdAt,proto3" json:"created_at,omitempty"`
938-	unknownFields protoimpl.UnknownFields
939-	sizeCache     protoimpl.SizeCache
1283:type RechargeOrder struct {
1285-	Id            int64                  `protobuf:"varint,1,opt,name=id,proto3" json:"id,omitempty"`
1286-	RechargeNo    string                 `protobuf:"bytes,2,opt,name=recharge_no,json=rechargeNo,proto3" json:"recharge_no,omitempty"`
1287-	UserId        int64                  `protobuf:"varint,3,opt,name=user_id,json=userId,proto3" json:"user_id,omitempty"`
1288-	AmountCents   int64                  `protobuf:"varint,4,opt,name=amount_cents,json=amountCents,proto3" json:"amount_cents,omitempty"`
1289-	BonusCents    int64                  `protobuf:"varint,5,opt,name=bonus_cents,json=bonusCents,proto3" json:"bonus_cents,omitempty"` // 赠送金额
1290-	Status        int32                  `protobuf:"varint,6,opt,name=status,proto3" json:"status,omitempty"`                           // 0 待支付 1 已支付 2 已取消
1291-	Channel       int32                  `protobuf:"varint,7,opt,name=channel,proto3" json:"channel,omitempty"`
1292-	PaymentNo     string                 `protobuf:"bytes,8,opt,name=payment_no,json=paymentNo,proto3" json:"payment_no,omitempty"`
1293-	PaidAt        *timestamppb.Timestamp `protobuf:"bytes,9,opt,name=paid_at,json=paidAt,proto3" json:"paid_at,omitempty"`
1294-	CreatedAt     *timestamppb.Timestamp `protobuf:"bytes,10,opt,name=created_at,json=createdAt,proto3" json:"created_at,omitempty"`
1295-	unknownFields protoimpl.UnknownFields
1296-	sizeCache     protoimpl.SizeCache
1563:type BalanceLog struct {
1565-	Id            int64                  `protobuf:"varint,1,opt,name=id,proto3" json:"id,omitempty"`
1566-	UserId        int64                  `protobuf:"varint,2,opt,name=user_id,json=userId,proto3" json:"user_id,omitempty"`
1567-	Change        int64                  `protobuf:"varint,3,opt,name=change,proto3" json:"change,omitempty"`
1568-	Balance       int64                  `protobuf:"varint,4,opt,name=balance,proto3" json:"balance,omitempty"`
1569-	Title         string                 `protobuf:"bytes,5,opt,name=title,proto3" json:"title,omitempty"`
1570-	BizType       string                 `protobuf:"bytes,6,opt,name=biz_type,json=bizType,proto3" json:"biz_type,omitempty"`
1571-	CreatedAt     *timestamppb.Timestamp `protobuf:"bytes,7,opt,name=created_at,json=createdAt,proto3" json:"created_at,omitempty"`
1572-	unknownFields protoimpl.UnknownFields
1573-	sizeCache     protoimpl.SizeCache
1803:type RechargeConfig struct {
1805-	MinAmountCents         int64                  `protobuf:"varint,1,opt,name=min_amount_cents,json=minAmountCents,proto3" json:"min_amount_cents,omitempty"`
1806-	MaxAmountCents         int64                  `protobuf:"varint,2,opt,name=max_amount_cents,json=maxAmountCents,proto3" json:"max_amount_cents,omitempty"`
1807-	PresetAmounts          []int64                `protobuf:"varint,3,rep,packed,name=preset_amounts,json=presetAmounts,proto3" json:"preset_amounts,omitempty"`
1808-	RegisterBonusCents     int64                  `protobuf:"varint,4,opt,name=register_bonus_cents,json=registerBonusCents,proto3" json:"register_bonus_cents,omitempty"`
1809-	FirstRechargeBonusDesc string                 `protobuf:"bytes,5,opt,name=first_recharge_bonus_desc,json=firstRechargeBonusDesc,proto3" json:"first_recharge_bonus_desc,omitempty"`
1810-	unknownFields          protoimpl.UnknownFields
1811-	sizeCache              protoimpl.SizeCache
=== notif ===
1403:type NotificationTemplate struct {
1405-	Id            int64                  `protobuf:"varint,1,opt,name=id,proto3" json:"id,omitempty"`
1406-	Code          string                 `protobuf:"bytes,2,opt,name=code,proto3" json:"code,omitempty"`
1407-	Name          string                 `protobuf:"bytes,3,opt,name=name,proto3" json:"name,omitempty"`
1408-	Type          int32                  `protobuf:"varint,4,opt,name=type,proto3" json:"type,omitempty"`
1409-	Title         string                 `protobuf:"bytes,5,opt,name=title,proto3" json:"title,omitempty"`
1410-	Content       string                 `protobuf:"bytes,6,opt,name=content,proto3" json:"content,omitempty"`
1411-	Link          string                 `protobuf:"bytes,7,opt,name=link,proto3" json:"link,omitempty"`
1412-	Enabled       bool                   `protobuf:"varint,8,opt,name=enabled,proto3" json:"enabled,omitempty"`
1413-	UpdatedAt     *timestamppb.Timestamp `protobuf:"bytes,9,opt,name=updated_at,json=updatedAt,proto3" json:"updated_at,omitempty"`
1414-	unknownFields protoimpl.UnknownFields
1415-	sizeCache     protoimpl.SizeCache
1767:type SmsTemplate struct {
1769-	Id            int64                  `protobuf:"varint,1,opt,name=id,proto3" json:"id,omitempty"`
1770-	Code          string                 `protobuf:"bytes,2,opt,name=code,proto3" json:"code,omitempty"`
1771-	Name          string                 `protobuf:"bytes,3,opt,name=name,proto3" json:"name,omitempty"`
1772-	Content       string                 `protobuf:"bytes,4,opt,name=content,proto3" json:"content,omitempty"`
1773-	Enabled       bool                   `protobuf:"varint,5,opt,name=enabled,proto3" json:"enabled,omitempty"`
1774-	UpdatedAt     *timestamppb.Timestamp `protobuf:"bytes,6,opt,name=updated_at,json=updatedAt,proto3" json:"updated_at,omitempty"`
1775-	unknownFields protoimpl.UnknownFields
1776-	sizeCache     protoimpl.SizeCache
2075:type SensitiveWord struct {
2077-	Id            int64                  `protobuf:"varint,1,opt,name=id,proto3" json:"id,omitempty"`
2078-	Word          string                 `protobuf:"bytes,2,opt,name=word,proto3" json:"word,omitempty"`
2079-	Category      int32                  `protobuf:"varint,3,opt,name=category,proto3" json:"category,omitempty"` // 1 违规词 2 辱骂 3 广告 4 其他
2080-	Status        int32                  `protobuf:"varint,4,opt,name=status,proto3" json:"status,omitempty"`     // 0 停用 1 启用
2081-	CreatedAt     *timestamppb.Timestamp `protobuf:"bytes,5,opt,name=created_at,json=createdAt,proto3" json:"created_at,omitempty"`
2082-	unknownFields protoimpl.UnknownFields
2083-	sizeCache     protoimpl.SizeCache
2375:type NotificationCategory struct {
2377-	Type          int32                  `protobuf:"varint,1,opt,name=type,proto3" json:"type,omitempty"`
2378-	Name          string                 `protobuf:"bytes,2,opt,name=name,proto3" json:"name,omitempty"`
2379-	Icon          string                 `protobuf:"bytes,3,opt,name=icon,proto3" json:"icon,omitempty"`
2380-	Count         int32                  `protobuf:"varint,4,opt,name=count,proto3" json:"count,omitempty"`
2381-	UnreadCount   int32                  `protobuf:"varint,5,opt,name=unread_count,json=unreadCount,proto3" json:"unread_count,omitempty"`
2382-	unknownFields protoimpl.UnknownFields
2383-	sizeCache     protoimpl.SizeCache
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:17:51

<details><summary>🧠 思考过程</summary>

```
Now check the grpc server interface for these three services to confirm exact method signatures (e.g. GetStockCheck returns StockCheckDetail).

Let me grep the _grpc.pb.go files for the interface definitions.

Also check where handlers are registered (backend/cmd or internal/server) to see if I need to register anything — no, gRPC registration is by service interface, so implementing the methods on Handler is enough. But I should check that the gateway/registration doesn't need updating. Since proto already has the methods, and the handler embeds Unimplemented*Server, the interface is already satisfied even without implementing (returns Unimplemented error). So I just need to implement them.

Let me check the grpc interface signatures to be exact.
```

</details>

<details><summary>🛠 bash</summary>

```
282:type InventoryServiceServer interface {
283-	GetStock(context.Context, *GetStockRequest) (*Inventory, error)
284-	BatchGetStock(context.Context, *BatchGetStockRequest) (*BatchGetStockResponse, error)
285-	ReserveStock(context.Context, *ReserveStockRequest) (*v1.OperationResult, error)
286-	ReleaseStock(context.Context, *ReleaseStockRequest) (*v1.OperationResult, error)
287-	DeductStock(context.Context, *DeductStockRequest) (*v1.OperationResult, error)
288-	AdjustStock(context.Context, *AdjustStockRequest) (*Inventory, error)
289-	ListInventories(context.Context, *ListInventoriesRequest) (*ListInventoriesResponse, error)
290-	ListLogs(context.Context, *ListInventoryLogsRequest) (*ListInventoryLogsResponse, error)
291-	StockWarning(context.Context, *StockWarningRequest) (*StockWarningResponse, error)
292-	ListWarehouses(context.Context, *ListWarehousesRequest) (*ListWarehousesResponse, error)
293-	SaveWarehouse(context.Context, *SaveWarehouseRequest) (*Warehouse, error)
294-	DeleteWarehouse(context.Context, *DeleteWarehouseRequest) (*v1.OperationResult, error)
295-	ListInboundOrders(context.Context, *ListInboundOrdersRequest) (*ListInboundOrdersResponse, error)
296-	CreateInboundOrder(context.Context, *CreateInboundOrderRequest) (*InboundOrder, error)
297-	ListOutboundOrders(context.Context, *ListOutboundOrdersRequest) (*ListOutboundOrdersResponse, error)
298-	CreateOutboundOrder(context.Context, *CreateOutboundOrderRequest) (*OutboundOrder, error)
299-	ListStockChecks(context.Context, *ListStockChecksRequest) (*ListStockChecksResponse, error)
300-	CreateStockCheck(context.Context, *CreateStockCheckRequest) (*StockCheck, error)
301-	GetStockCheck(context.Context, *GetStockCheckRequest) (*StockCheckDetail, error)
302-	ListStockCheckItems(context.Context, *GetStockCheckRequest) (*ListStockCheckItemsResponse, error)
303-	mustEmbedUnimplementedInventoryServiceServer()
304-}
305-
306-// UnimplementedInventoryServiceServer must be embedded to have
307-// forward compatible implementations.
308-//
309-// NOTE: this should be embedded by value instead of pointer to avoid a nil
310-// pointer dereference when methods are called.
311-type UnimplementedInventoryServiceServer struct{}
312-
313-func (UnimplementedInventoryServiceServer) GetStock(context.Context, *GetStockRequest) (*Inventory, error) {
314-	return nil, status.Errorf(codes.Unimplemented, "method GetStock not implemented")
315-}
316-func (UnimplementedInventoryServiceServer) BatchGetStock(context.Context, *BatchGetStockRequest) (*BatchGetStockResponse, error) {
317-	return nil, status.Errorf(codes.Unimplemented, "method BatchGetStock not implemented")
318-}
319-func (UnimplementedInventoryServiceServer) ReserveStock(context.Context, *ReserveStockRequest) (*v1.OperationResult, error) {
320-	return nil, status.Errorf(codes.Unimplemented, "method ReserveStock not implemented")
321-}
322-func (UnimplementedInventoryServiceServer) ReleaseStock(context.Context, *ReleaseStockRequest) (*v1.OperationResult, error) {
--
379:type UnsafeInventoryServiceServer interface {
380-	mustEmbedUnimplementedInventoryServiceServer()
381-}
382-
383-func RegisterInventoryServiceServer(s grpc.ServiceRegistrar, srv InventoryServiceServer) {
384-	// If the following call pancis, it indicates UnimplementedInventoryServiceServer was
385-	// embedded by pointer and is nil.  This will cause panics if an
386-	// unimplemented method is ever invoked, so we test this at initialization
=== PAY ===
198:type PaymentServiceServer interface {
199-	CreatePayment(context.Context, *CreatePaymentRequest) (*Payment, error)
200-	QueryPayment(context.Context, *QueryPaymentRequest) (*Payment, error)
201-	Notify(context.Context, *PaymentCallbackRequest) (*v1.OperationResult, error)
202-	CreateRefund(context.Context, *CreateRefundRequest) (*PaymentRefund, error)
203-	ListPayments(context.Context, *ListPaymentsRequest) (*ListPaymentsResponse, error)
204-	Summary(context.Context, *PaymentSummaryRequest) (*PaymentSummaryResponse, error)
205-	ListPayChannels(context.Context, *ListPayChannelsRequest) (*ListPayChannelsResponse, error)
206-	SavePayChannel(context.Context, *SavePayChannelRequest) (*PayChannel, error)
207-	DeletePayChannel(context.Context, *DeletePayChannelRequest) (*v1.OperationResult, error)
208-	CreateRecharge(context.Context, *CreateRechargeRequest) (*RechargeOrder, error)
209-	ListRecharges(context.Context, *ListRechargesRequest) (*ListRechargesResponse, error)
210-	ListBalanceLogs(context.Context, *ListBalanceLogsRequest) (*ListBalanceLogsResponse, error)
211-	GetRechargeConfig(context.Context, *GetRechargeConfigRequest) (*RechargeConfig, error)
212-	mustEmbedUnimplementedPaymentServiceServer()
213-}
214-
215-// UnimplementedPaymentServiceServer must be embedded to have
216-// forward compatible implementations.
217-//
218-// NOTE: this should be embedded by value instead of pointer to avoid a nil
219-// pointer dereference when methods are called.
220-type UnimplementedPaymentServiceServer struct{}
221-
222-func (UnimplementedPaymentServiceServer) CreatePayment(context.Context, *CreatePaymentRequest) (*Payment, error) {
223-	return nil, status.Errorf(codes.Unimplemented, "method CreatePayment not implemented")
224-}
225-func (UnimplementedPaymentServiceServer) QueryPayment(context.Context, *QueryPaymentRequest) (*Payment, error) {
226-	return nil, status.Errorf(codes.Unimplemented, "method QueryPayment not implemented")
227-}
228-func (UnimplementedPaymentServiceServer) Notify(context.Context, *PaymentCallbackRequest) (*v1.OperationResult, error) {
--
267:type UnsafePaymentServiceServer interface {
268-	mustEmbedUnimplementedPaymentServiceServer()
269-}
270-
271-func RegisterPaymentServiceServer(s grpc.ServiceRegistrar, srv PaymentServiceServer) {
272-	// If the following call pancis, it indicates UnimplementedPaymentServiceServer was
273-	// embedded by pointer and is nil.  This will cause panics if an
274-	// unimplemented method is ever invoked, so we test this at initialization
=== NOTIF ===
282:type NotificationServiceServer interface {
283-	Send(context.Context, *SendNotificationRequest) (*v1.OperationResult, error)
284-	List(context.Context, *ListNotificationsRequest) (*ListNotificationsResponse, error)
285-	MarkRead(context.Context, *MarkReadRequest) (*v1.OperationResult, error)
286-	MarkAllRead(context.Context, *MarkAllReadRequest) (*v1.OperationResult, error)
287-	GetUnreadCount(context.Context, *UnreadCountRequest) (*UnreadCountResponse, error)
288-	SendSms(context.Context, *SendSmsRequest) (*SendSmsResponse, error)
289-	ListSmsRecords(context.Context, *ListSmsRecordsRequest) (*ListSmsRecordsResponse, error)
290-	ListAuditLogs(context.Context, *ListAuditLogsRequest) (*ListAuditLogsResponse, error)
291-	ListSystemSettings(context.Context, *ListSystemSettingsRequest) (*ListSystemSettingsResponse, error)
292-	UpdateSystemSettings(context.Context, *UpdateSystemSettingsRequest) (*ListSystemSettingsResponse, error)
293-	ListNotificationTemplates(context.Context, *ListNotificationTemplatesRequest) (*ListNotificationTemplatesResponse, error)
294-	SaveNotificationTemplate(context.Context, *SaveNotificationTemplateRequest) (*NotificationTemplate, error)
295-	DeleteNotificationTemplate(context.Context, *DeleteNotificationTemplateRequest) (*v1.OperationResult, error)
296-	ListSmsTemplates(context.Context, *ListSmsTemplatesRequest) (*ListSmsTemplatesResponse, error)
297-	SaveSmsTemplate(context.Context, *SaveSmsTemplateRequest) (*SmsTemplate, error)
298-	DeleteSmsTemplate(context.Context, *DeleteSmsTemplateRequest) (*v1.OperationResult, error)
299-	ListSensitiveWords(context.Context, *ListSensitiveWordsRequest) (*ListSensitiveWordsResponse, error)
300-	SaveSensitiveWord(context.Context, *SaveSensitiveWordRequest) (*SensitiveWord, error)
301-	DeleteSensitiveWord(context.Context, *DeleteSensitiveWordRequest) (*v1.OperationResult, error)
302-	ListNotificationCategories(context.Context, *ListNotificationCategoriesRequest) (*ListNotificationCategoriesResponse, error)
303-	mustEmbedUnimplementedNotificationServiceServer()
304-}
305-
306-// UnimplementedNotificationServiceServer must be embedded to have
307-// forward compatible implementations.
308-//
309-// NOTE: this should be embedded by value instead of pointer to avoid a nil
310-// pointer dereference when methods are called.
311-type UnimplementedNotificationServiceServer struct{}
312-
313-func (UnimplementedNotificationServiceServer) Send(context.Context, *SendNotificationRequest) (*v1.OperationResult, error) {
314-	return nil, status.Errorf(codes.Unimplemented, "method Send not implemented")
315-}
316-func (UnimplementedNotificationServiceServer) List(context.Context, *ListNotificationsRequest) (*ListNotificationsResponse, error) {
317-	return nil, status.Errorf(codes.Unimplemented, "method List not implemented")
318-}
319-func (UnimplementedNotificationServiceServer) MarkRead(context.Context, *MarkReadRequest) (*v1.OperationResult, error) {
320-	return nil, status.Errorf(codes.Unimplemented, "method MarkRead not implemented")
321-}
322-func (UnimplementedNotificationServiceServer) MarkAllRead(context.Context, *MarkAllReadRequest) (*v1.OperationResult, error) {
--
379:type UnsafeNotificationServiceServer interface {
380-	mustEmbedUnimplementedNotificationServiceServer()
381-}
382-
383-func RegisterNotificationServiceServer(s grpc.ServiceRegistrar, srv NotificationServiceServer) {
384-	// If the following call pancis, it indicates UnimplementedNotificationServiceServer was
385-	// embedded by pointer and is nil.  This will cause panics if an
386-	// unimplemented method is ever invoked, so we test this at initialization
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:17:59

<details><summary>🧠 思考过程</summary>

```
Now I have everything I need for the RPC contracts. Let me check the common proto for NotificationType enum values and PaymentChannel, and also check existing user/converter.go buildMeta pattern (already seen pattern in each package).

Let me check commonv1.NotificationType values.
```

</details>

<details><summary>🛠 bash</summary>

```
250:	PaymentStatus_PAYMENT_STATUS_UNSPECIFIED PaymentStatus = 0
251:	PaymentStatus_PAYMENT_STATUS_PENDING     PaymentStatus = 1
252:	PaymentStatus_PAYMENT_STATUS_SUCCESS     PaymentStatus = 2
253:	PaymentStatus_PAYMENT_STATUS_FAILED      PaymentStatus = 3
254:	PaymentStatus_PAYMENT_STATUS_CLOSED      PaymentStatus = 4
259:	PaymentStatus_name = map[int32]string{
266:	PaymentStatus_value = map[string]int32{
305:	PaymentChannel_PAYMENT_CHANNEL_UNSPECIFIED PaymentChannel = 0
306:	PaymentChannel_PAYMENT_CHANNEL_WECHAT      PaymentChannel = 1 // 微信支付
307:	PaymentChannel_PAYMENT_CHANNEL_ALIPAY      PaymentChannel = 2 // 支付宝
308:	PaymentChannel_PAYMENT_CHANNEL_BALANCE     PaymentChannel = 3 // 余额支付
313:	PaymentChannel_name = map[int32]string{
319:	PaymentChannel_value = map[string]int32{
568:	NotificationType_NOTIFICATION_TYPE_UNSPECIFIED NotificationType = 0
569:	NotificationType_NOTIFICATION_TYPE_ORDER       NotificationType = 1
570:	NotificationType_NOTIFICATION_TYPE_LOGISTICS   NotificationType = 2
571:	NotificationType_NOTIFICATION_TYPE_PROMOTION   NotificationType = 3
572:	NotificationType_NOTIFICATION_TYPE_SYSTEM      NotificationType = 4
577:	NotificationType_name = map[int32]string{
584:	NotificationType_value = map[string]int32{
=== proto common ===
141:enum NotificationType {
142-  NOTIFICATION_TYPE_UNSPECIFIED = 0;
143-  NOTIFICATION_TYPE_ORDER = 1;
144-  NOTIFICATION_TYPE_LOGISTICS = 2;
145-  NOTIFICATION_TYPE_PROMOTION = 3;
146-  NOTIFICATION_TYPE_SYSTEM = 4;
147-}
148-
149-// ---------------------------------------------------------------------------
150-// 基础消息
151-// ---------------------------------------------------------------------------
152-
153-message IdRequest {
154-  int64 id = 1;
155-}
156-
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:18:05

<details><summary>🧠 思考过程</summary>

```
Now I have full context. Let me plan implementation.

### inventory 域 (11 RPCs)

New files:
- `backend/internal/inventory/warehouse.go`: Warehouse model + repo methods + service methods + handler methods (or separate handler file). I'll organize: models+repo in `warehouse.go`, `inbound.go`, `outbound.go`, `stock_check.go`; service+handler methods in same files to keep it cohesive? Convention in the repo: repo.go has models+repo, service.go has service, handler.go has handler. To follow existing conventions while adding new files, I'll create new files that hold both model+repo+service+handler for the new feature area — that's a bit mixed. Better: keep the pattern: add models + repo methods in new files (e.g. `warehouse.go` holds Warehouse model and repo funcs), service methods in the same new file, handler methods appended to handler.go. Hmm, mixed.

I think cleanest, matching "你可以新建 backend/internal/inventory/warehouse.go 等文件组织代码，风格与现有一致":
- `warehouse.go`: Warehouse model, repo CRUD, service methods (ListWarehouses/SaveWarehouse/DeleteWarehouse).
- `inbound.go`: InboundOrder + InboundOrderItem models, repo, service (List/Create).
- `outbound.go`: OutboundOrder + items, repo, service.
- `stock_check.go`: StockCheck + items, repo, service.
- Handler methods: add to handler.go (existing file) — appending new methods there keeps handler.go as the single handler file. That's consistent.

That's reasonable and minimal.

Key logic:

**Warehouse**
- model: Warehouse{ID, Code, Name, Address, Contact, Phone, Enabled bool, Sort int, CreatedAt time.Time} TableName "warehouses".
- Note: DB `enabled` tinyint; `sort` int.
- SaveWarehouse: if id>0 → update by id (check exists), else create (code unique → conflict error).
- DeleteWarehouse: delete by id; error if not found.

**Inbound**
- InboundOrder model: ID, InboundNo, WarehouseID, WarehouseName, Supplier, Status int8, TotalQuantity int, Remark, Operator, CreatedAt.
- InboundOrderItem model: ID, InboundID, SKUID, SKUCode, SpecText, Quantity. TableName "inbound_order_items" (column inbound_id).
- CreateInboundOrder:
  - validate warehouse exists (get name).
  - items non-empty, quantity > 0.
  - txn:
    - create inbound order (status = 1 已入库 since we actually add stock immediately; proto comment says 0 待入库 1 已入库 2 已取消). Hmm: "入库单状态流转：草稿 → 已入库 → 已取消". Since we immediately increase stock in the same call, status should be 1 (已入库) after the operation. But maybe better to create as 0 (待入库) then after stock updated set to 1. Effectively the end state is 1. I'll set status=1 (已入库) with a comment that入库即生效. Actually let me follow: create with status 0 then update to 1 after stock adjustments succeed, both in the same transaction. That models the "草稿→已入库" flow and is more faithful. I'll do: create with StatusPending(0), then adjust stock, then update status to 1.
    - for each item: increase inventory: total_stock += qty, available_stock += qty, version+1; write inventory_logs with change_type=1 (入库), quantity=+qty, before/after available stock, biz_type "inbound", biz_id inbound_no, operator.
      - Use conditional update: `WHERE sku_id = ? AND available_stock >= 0`? Not needed for increase. But for consistency use gorm.Expr updates and check RowsAffected. Use `version` optimistic? The existing code uses `version: gorm.Expr("version + 1")` without version check in Where. I'll do the same: conditional where on sku_id (and available_stock >= 0 for safety) with RowsAffected check → error if SKU missing.
      - If inventory record doesn't exist for the SKU: we could create it (EnsureInventory). Better: use repo.EnsureInventory-like behavior: if not found, create with initial 0 then add qty. But EnsureInventory exists in Repo and takes sku details. I can use `s.repo.EnsureInventory(ctx, skuID, productID, skuCode, specText, 0)` — but productID unknown from StockMoveItem (no product_id field). The inventories table has product_id default 0. Fine, use 0 unless known. Actually I can look up product_skus table to get product_id, sku_code, spec_text! The proto StockMoveItem includes sku_code and spec_text, but they may be empty from the client. Let me check product_skus table structure — it would let me enrich. That's cross-domain read but read-only, acceptable? Reading product_skus from inventory domain... The existing inventory code doesn't do that; inventory rows carry sku_code/spec_text. To stay safe and self-contained, I'll use provided sku_code/spec_text, and if empty, look up the inventory record for sku_code/spec_text; if no inventory record exists, try product_skus lookup? Let me check product_skus columns to decide — enrichment helps quality. I'll check.

Let me keep it reasonably simple: use proto-provided sku_code/spec_text; if empty, read from existing inventory record; if inventory record doesn't exist, create it with provided values (product_id 0).

Actually let me check product_skus quickly — if it has product_id, sku_code, spec then a read fallback is cheap and makes data consistent. I'll check the table.

**Outbound**
- Similar, decreasing stock: available -= qty, total -= qty (locked/sold unchanged). If available < qty → error CodeStockInsufficient with rollback.
  - Important: three-part invariant total = available + locked + sold. Increasing total by qty and available by qty keeps invariant. Decreasing total by qty and available by qty keeps invariant. Good.
- outbound_orders has order_id/order_no; from request order_id. order_no: we could fetch from orders table? Keep the order_no empty unless... The table has order_no column. We can look up orders table for order_no by id (read-only). Let me check orders table columns. Simpler: query `orders` for id → order_no. It's a read of another domain's table, but inventory domain already reads product/order-ish data? It doesn't. Hmm, but the outbound order proto includes order_no which we must fill. I'll do a lightweight read of orders table (id, order_no) inside the repo — read-only, no writes outside my domain. I think acceptable; note in report.

**StockCheck**
- CreateStockCheck: warehouse must exist; generate check_no; items: if request items provided, use them (with sku info); else generate from all inventories in the warehouse (inventories table has `warehouse` string column with names like '默认仓'). The brief says "按仓库 + 全部在库 SKU 生成盘点明细，system_quantity 取当前库存". The inventories table's warehouse column is a varchar name; warehouses table has code/name. So filter inventories by warehouse = warehouse name (or code). I'll match `warehouse = ?` with the warehouse's name; to be more lenient, match name OR code.
- Items: book_quantity = current available stock; actual_quantity = 0; diff_quantity = 0.
- stock_checks.total_count = number of items; diff_count = 0.
- GetStockCheck returns StockCheckDetail{stock_check, items}.
- ListStockCheckItems returns items with meta (no page in request → return all, meta page 1 size total).

Note proto GetStockCheckItem fields: book_quantity/actual_quantity/diff_quantity mapping to DB book_quantity/actual_quantity/diff_quantity. 

Since there's no RPC to submit actual quantities, actual stays 0 — as instructed, I'll note it.

**Handler**: add methods.

Also, do I need `normalizePage`/`buildMeta` — already exist in inventory/service.go. Good.

### payment 域 (7 RPCs)

New files: `payment/pay_channel.go`, `payment/recharge.go`, `payment/balance.go`.

- PayChannel model: ID, Name, Channel int8, Code, Icon, Enabled bool, Sort int, Config string, CreatedAt. TableName "pay_channels".
- ListPayChannels: filter by channel if >0, paginate.
- SavePayChannel: create/update; code unique → conflict.
- DeletePayChannel: delete by id.
- CreateRecharge:
  - userID from ctx (auth.UserIDFromContext) — request has no user_id → must use ctx. Reject if <=0 with Unauthorized.
  - amount_cents > 0, within config min/max.
  - channel: default 1 (wechat). Validate against enabled pay_channels? Good: check that a pay channel with that channel value & enabled exists → else error. Real logic.
  - bonus: compute from recharge config preset amounts (if amount matches a preset with bonus). I'll define config: preset_amounts and a bonus rule: e.g. preset amount >= max → bonus = amount * 5%. Let me design GetRechargeConfig reading system_settings group 'recharge':
    - keys: `recharge.min_amount_cents`, `recharge.max_amount_cents`, `recharge.preset_amounts` (comma list), `recharge.register_bonus_cents`, `recharge.first_recharge_bonus_desc`, `recharge.bonus_rate_bps` (basis points, e.g. 500 = 5%).
    - Defaults if missing: min=1000 (¥10), max=1000000 (¥10000), presets=[1000,5000,10000,50000,100000] (cents), register_bonus=0, first_recharge_bonus_desc="", bonus_rate_bps=0.
  - create recharge_orders row: recharge_no "RC"+timestamp+rand, user_id, amount_cents, bonus_cents, status 0, channel, payment_no "".
  - Also create a `payments` row so that Notify can settle it? The proto RechargeOrder has `payment_no`. I'll create a payment row with payment_no = recharge_no? Hmm payments.payment_no is unique varchar(32) — "RC20261020141600123456" length ~21 fine. order_no = recharge_no, order_id = 0, user_id, amount_cents, status pending, channel. Then recharge_order.payment_no = that payment_no, and recharge_no = same value? Then recharge_no and payment_no identical — acceptable but confusing. Better: recharge_no = "RC" + no; payment_no = "RP" + no. Set recharge_order.payment_no = payment_no.

    But payments.order_id = 0, and settle publishes payment success event with order_id 0 → order service might error. Let's check what consumers do with EventPaymentSuccess... order service handler. It's in order domain (not mine). Publishing order_id=0 event could cause errors. Hmm.

    Alternative: don't create a payments row; instead handle recharge settlement directly in Notify: Notify(payment_no) → first try to find a recharge order by recharge_no == payment_no; if found → settle recharge (credit balance, mark paid, write balance log). Otherwise → normal settle.

    That avoids polluting the payments table and avoids order events. And Notify's payment_no for recharge = recharge_no, which the client gets from CreateRecharge response.

    I like that: `settle` branch → in Notify: check recharge first.

    But then who triggers it? The third-party callback calls Notify with payment_no. For recharge, we return recharge_no in the response so the client can poll/status. For the demo/mock: in CreateRecharge, if the channel's provider is mock (wechat mock) → auto settle after delay like CreatePayment does. Let me include mock auto-settle for WeChat mock so the demo works, similar to existing mockSettle. For balance channel (3)? Recharging via balance channel makes no sense (that's paying with balance). Reject channel=balance for recharge? Actually "余额充值" — you recharge your balance using wechat/alipay. Channel 3 (balance) is invalid for recharge → return invalid param. Good real logic.

    So: channel must be 1 or 2. If WeChat mock → auto settle after 1.2s.

    Implementation of settleRecharge:
      - find recharge order by recharge_no (status pending).
      - txn: update users.balance_cents += amount+bonus (conditional? just increment), insert balance_logs(user_id, change=amount+bonus, balance=after, title="余额充值", biz_type="recharge"), update recharge_orders status=1, paid_at=now.
      - users table update: `UPDATE users SET balance_cents = balance_cents + ? WHERE id = ?` then read back balance. That's cross-domain write to users table but it's the balance ledger which payment domain owns conceptually. The brief says balance logs must be correct; balance_after_cents correct. users.balance_cents is the natural store. I'll do it in payment domain repo (read/write users table). Acceptable — document it.

      Balance after = new balance_cents value. Use gorm update with expression then select balance_cents.

- ListRecharges: user perspective. request has user_id (explicit) — must verify ownership: if req.user_id > 0 and != ctx user → Forbidden. Use h.userID(ctx, req.GetUserId()) pattern like existing handler; but for ownership, the service should enforce: resolved user id must equal ctx user id (if ctx user exists). Hmm, admins may list any user's. The brief says "必须只返回当前登录用户自己的数据... 禁止越权". I'll implement: owner = auth.UserIDFromContext(ctx); if owner <= 0 → Unauthorized; if req.user_id > 0 && req.user_id != owner → Forbidden (unless admin?). To keep it simple and safe: if req.user_id > 0 && req.user_id != owner → Forbidden. If req.user_id == 0 → use owner.
  - status filter, pagination.

- ListBalanceLogs: same ownership check; returns logs + current_balance (users.balance_cents).

- GetRechargeConfig: read system_settings group 'recharge' + defaults.

Where to put system_settings read? notification domain owns SystemSetting model, but payment can query the table with its own local model in payment package. I'll define a small local model `systemSetting` in payment/recharge.go with TableName "system_settings" and query via repo. That's fine (read-only).

Hmm, but two gorm models for the same table in different packages is fine.

### notification 域 (10 RPCs)

New files: `notification/template.go` (notification templates + sms templates), `notification/sensitive.go` (sensitive words + categories).

- NotificationTemplate model: ID, Code, Name, Type int8, Title, Content, Link, Enabled bool, UpdatedAt time.Time. TableName "notification_templates". Note DB updated_at has ON UPDATE CURRENT_TIMESTAMP; gorm auto-update field named UpdatedAt → gorm will set it on update automatically.
- List: filter type>0, keyword on code/name/title.
- Save: create/update; code unique.
- Delete: delete by id.

- SmsTemplate model: ID, Code, Name, Content, Enabled bool, UpdatedAt. TableName "sms_templates".
- CRUD + list with keyword.

- SensitiveWord model: ID, Word, Category int8, Status int8, CreatedAt. TableName "sensitive_words".
- CRUD: Save with word unique; status 0/1.
- Filtering in Send/SendSms: "删除敏感词要生效于实际发送流程——检查 Send/SendSms 实现，若当前没有做敏感词过滤，请补上过滤逻辑".
  - In Send (站内通知): check title+content against enabled sensitive words → if matched, return error (errs.CodeInvalidParam "内容包含敏感词") — or mask? I'll reject with error listing matched word. Real behavior: 拦截.
  - In SendSms: the SMS content is generated by the provider, not user content; but scene is user input. Sensitive word filtering on the SMS template content? The SMS content comes from the provider (mock). Hmm. Actually thirdparty smsProvider.Send(ctx, phone, scene, code) builds content. We could check the template content used. Let me look at thirdparty providers sms.Send to see if there's a template we can filter.

Let me check thirdparty/providers.go sms part.

- ListNotificationCategories: returns NotificationCategory{type, name, icon, count, unread_count}. Fixed enum of 4 types (order/logistics/promotion/system) with names in Chinese and icons; count/unread_count computed from notifications for the user (user_id from ctx or request). request has user_id. Use resolveUserID. Counts: group by type, count(*) and sum(read=0).

Names: "订单", "物流", "营销", "系统"; icons: e.g. "order", "logistics", "promotion", "system"? Icons for a frontend - I'll use simple emoji/icon names. Let me use strings like "📦"? Better keep ASCII: "order", "truck", "gift", "bell". Hmm, existing app might expect specific icons. Since proto has no enum for icon, I'll use short kebab names.

Now, sensitive word filtering for Send: I need a repo method `FindEnabledSensitiveWords(ctx)` and a matcher (strings.Contains). Cache? Keep simple: query each time (or with a small in-memory cache). Simple DB query per send is fine.

Let me now check thirdparty SMS provider to see the content and whether templates table is used.

Also check `notifications` domain events.go for how templates are used (maybe notification_templates are used to render notifications). Let me read events.go.
```

</details>

<details><summary>🛠 read</summary>

```
1→package notification
     2→
     3→import (
     4→	"context"
     5→	"fmt"
     6→
     7→	"go.uber.org/zap"
     8→
     9→	notificationv1 "github.com/shopstack/platform/gen/go/notification/v1"
    10→
    11→	"github.com/shopstack/platform/backend/internal/errs"
    12→	"github.com/shopstack/platform/backend/internal/logger"
    13→	"github.com/shopstack/platform/backend/internal/mq"
    14→)
    15→
    16→// ServiceHolder 持有服务实例，供事件回调在服务就绪后获取。
    17→type ServiceHolder struct {
    18→	svc *Service
    19→}
    20→
    21→// Set 注册服务实例。
    22→func (h *ServiceHolder) Set(s *Service) { h.svc = s }
    23→
    24→// Get 返回服务实例，服务未就绪时返回 nil。
    25→func (h *ServiceHolder) Get() *Service { return h.svc }
    26→
    27→// Consumers 返回通知服务订阅的事件。
    28→//
    29→// 每类事件使用独立队列：同一队列上的多个消费者会轮询消费消息，
    30→// 无法保证消息按 routing key 投递给对应的事件处理器。
    31→func Consumers(queueName string, holder *ServiceHolder) []mq.Consumer {
    32→	handle := func(fn func(ctx context.Context, event *mq.Event, service *Service) error) mq.Handler {
    33→		return func(ctx context.Context, event *mq.Event) error {
    34→			service := holder.Get()
    35→			if service == nil {
    36→				return errs.New(errs.CodeUnavailable, "通知服务尚未就绪")
    37→			}
    38→			return fn(ctx, event, service)
    39→		}
    40→	}
    41→
    42→	return []mq.Consumer{
    43→		{
    44→			Queue:      eventQueue(queueName, mq.EventOrderCreated),
    45→			RoutingKey: mq.EventOrderCreated,
    46→			Handler:    handle(handleOrderCreated),
    47→		},
    48→		{
    49→			Queue:      eventQueue(queueName, mq.EventOrderPaid),
    50→			RoutingKey: mq.EventOrderPaid,
    51→			Handler:    handle(handleOrderPaid),
    52→		},
    53→		{
    54→			Queue:      eventQueue(queueName, mq.EventOrderCancelled),
    55→			RoutingKey: mq.EventOrderCancelled,
    56→			Handler:    handle(handleOrderCancelled),
    57→		},
    58→		{
    59→			Queue:      eventQueue(queueName, mq.EventLogisticsUpdate),
    60→			RoutingKey: mq.EventLogisticsUpdate,
    61→			Handler:    handle(handleLogisticsUpdate),
    62→		},
    63→		{
    64→			Queue:      eventQueue(queueName, mq.EventUserRegistered),
    65→			RoutingKey: mq.EventUserRegistered,
    66→			Handler:    handle(handleUserRegistered),
    67→		},
    68→	}
    69→}
    70→
    71→// eventQueue 按事件类型生成独立队列名。
    72→func eventQueue(queueName, routingKey string) string {
    73→	return queueName + ".notification." + routingKey
    74→}
    75→
    76→// handleOrderCreated 处理订单创建事件：发送下单成功通知。
    77→func handleOrderCreated(ctx context.Context, event *mq.Event, service *Service) error {
    78→	userID := payloadInt64(event, "user_id")
    79→	if userID == 0 {
    80→		return nil
    81→	}
    82→	orderID := payloadInt64(event, "order_id")
    83→	orderNo := payloadString(event, "order_no")
    84→	if orderNo == "" {
    85→		orderNo = fmt.Sprintf("#%d", orderID)
    86→	}
    87→	_, err := service.Send(ctx, notificationRequest(
    88→		NotificationTypeOrder, userID, "订单创建成功",
    89→		fmt.Sprintf("您的订单 %s 已创建成功，请尽快完成支付。", orderNo), orderID))
    90→	return err
    91→}
    92→
    93→// handleOrderPaid 处理支付成功事件：发送支付成功通知。
    94→func handleOrderPaid(ctx context.Context, event *mq.Event, service *Service) error {
    95→	userID := payloadInt64(event, "user_id")
    96→	if userID == 0 {
    97→		return nil
    98→	}
    99→	orderID := payloadInt64(event, "order_id")
   100→	orderNo := payloadString(event, "order_no")
   101→	if orderNo == "" {
   102→		orderNo = fmt.Sprintf("#%d", orderID)
   103→	}
   104→	_, err := service.Send(ctx, notificationRequest(
   105→		NotificationTypeOrder, userID, "支付成功",
   106→		fmt.Sprintf("您的订单 %s 已支付成功，商家将尽快为您发货。", orderNo), orderID))
   107→	return err
   108→}
   109→
   110→// handleOrderCancelled 处理订单取消事件：发送订单取消通知。
   111→func handleOrderCancelled(ctx context.Context, event *mq.Event, service *Service) error {
   112→	userID := payloadInt64(event, "user_id")
   113→	if userID == 0 {
   114→		return nil
   115→	}
   116→	orderID := payloadInt64(event, "order_id")
   117→	orderNo := payloadString(event, "order_no")
   118→	if orderNo == "" {
   119→		orderNo = fmt.Sprintf("#%d", orderID)
   120→	}
   121→	reason := payloadString(event, "reason")
   122→	content := fmt.Sprintf("您的订单 %s 已取消。", orderNo)
   123→	if reason != "" {
   124→		content = fmt.Sprintf("您的订单 %s 已取消，原因：%s。", orderNo, reason)
   125→	}
   126→	_, err := service.Send(ctx, notificationRequest(
   127→		NotificationTypeOrder, userID, "订单已取消", content, orderID))
   128→	return err
   129→}
   130→
   131→// handleLogisticsUpdate 处理物流更新事件：发送物流通知。
   132→func handleLogisticsUpdate(ctx context.Context, event *mq.Event, service *Service) error {
   133→	userID := payloadInt64(event, "user_id")
   134→	if userID == 0 {
   135→		return nil
   136→	}
   137→	orderID := payloadInt64(event, "order_id")
   138→	description := payloadString(event, "description")
   139→	if description == "" {
   140→		description = "您的包裹物流状态已更新。"
   141→	}
   142→	title := payloadString(event, "title")
   143→	if title == "" {
   144→		title = "物流更新"
   145→	}
   146→	_, err := service.Send(ctx, notificationRequest(
   147→		NotificationTypeLogistics, userID, title, description, orderID))
   148→	return err
   149→}
   150→
   151→// handleUserRegistered 处理用户注册事件：校验注册验证码并发送欢迎通知。
   152→func handleUserRegistered(ctx context.Context, event *mq.Event, service *Service) error {
   153→	userID := payloadInt64(event, "user_id")
   154→	if userID == 0 {
   155→		return nil
   156→	}
   157→
   158→	// 注册事件携带短信验证码时，先完成验证码校验
   159→	if code := payloadString(event, "sms_code"); code != "" {
   160→		phone := payloadString(event, "phone")
   161→		ok, msg := service.VerifySmsCode(phone, "register", code)
   162→		if !ok {
   163→			logger.L().Warn("注册短信验证码校验失败",
   164→				zap.Int64("用户ID", userID), zap.String("原因", msg))
   165→		} else {
   166→			logger.L().Info("注册短信验证码校验通过", zap.Int64("用户ID", userID))
   167→		}
   168→	}
   169→
   170→	_, err := service.Send(ctx, notificationRequest(
   171→		NotificationTypeSystem, userID, "欢迎加入",
   172→		"欢迎加入 ShopStack，商城新人优惠券已发放，快去查看吧。", 0))
   173→	return err
   174→}
   175→
   176→// notificationRequest 构造站内通知请求。
   177→func notificationRequest(nt int8, userID int64, title, content string, bizID int64) *notificationv1.SendNotificationRequest {
   178→	return &notificationv1.SendNotificationRequest{
   179→		UserId:  userID,
   180→		Type:    int32(nt),
   181→		Title:   title,
   182→		Content: content,
   183→		BizId:   bizID,
   184→	}
   185→}
   186→
   187→// payloadInt64 读取事件负载中的整型字段。
   188→func payloadInt64(event *mq.Event, key string) int64 {
   189→	if event == nil || event.Payload == nil {
   190→		return 0
   191→	}
   192→	switch v := event.Payload[key].(type) {
   193→	case float64:
   194→		return int64(v)
   195→	case int64:
   196→		return v
   197→	case int:
   198→		return int64(v)
   199→	}
   200→	return 0
   201→}
   202→
   203→// payloadString 读取事件负载中的字符串字段。
   204→func payloadString(event *mq.Event, key string) string {
   205→	if event == nil || event.Payload == nil {
   206→		return ""
   207→	}
   208→	switch v := event.Payload[key].(type) {
   209→	case string:
   210→		return v
   211→	case float64:
   212→		return fmt.Sprintf("%.0f", v)
   213→	case int64:
   214→		return fmt.Sprintf("%d", v)
   215→	}
   216→	return ""
   217→}
```

</details>

<details><summary>🛠 bash</summary>

```
PaySign:   Sign(prepayID, params.OrderNo),
			PrepayID:  prepayID,
			Extra: map[string]string{
				"mock":       "true",
				"order_no":   params.OrderNo,
				"amount":     strconv.FormatInt(params.AmountCents, 10),
				"notify_url": w.cfg.ThirdParty.WeChatNotifyURL,
			},
		}, nil
	}

	// 真实统一下单需要商户证书与 APIv3 签名，这里保留调用骨架：
	// 配置好商户号、API 密钥与证书后即可切换到真实请求。
	notifyURL := params.NotifyURL
	if notifyURL == "" {
		notifyURL = w.cfg.ThirdParty.WeChatNotifyURL
	}
	shoplogger.L().Warn("真实微信支付统一下单尚未启用，使用 Mock 返回",
		zap.String("订单号", params.OrderNo), zap.String("notify_url", notifyURL))

	prepayID := "mock_prepay_" + Sign(params.OrderNo)[:24]
	return &WeChatPayPayload{
		AppID:     w.cfg.ThirdParty.WeChatAppID,
		TimeStamp: strconv.FormatInt(time.Now().Unix(), 10),
		NonceStr:  RandomString(32),
		Package:   "prepay_id=" + prepayID,
		SignType:  "RSA",
		PaySign:   Sign(prepayID, params.OrderNo),
		PrepayID:  prepayID,
	}, nil
}

// ---------------------------------------------------------------------------
// 短信实现
// ---------------------------------------------------------------------------

type smsProvider struct {
	cfg  *config.Config
	mock bool
	// sent 记录 Mock 模式下已发送的验证码，便于本地联调查看
	sent map[string]string
	mu   sync.Mutex
}

func newSMSProvider(cfg *config.Config) SMSProvider {
	mock := cfg.ThirdParty.SMSProvider == "" || cfg.ThirdParty.SMSProvider == "mock" ||
		cfg.ThirdParty.SMSAccessKey == ""
	return &smsProvider{cfg: cfg, mock: mock, sent: map[string]string{}}
}

func (s *smsProvider) Mock() bool { return s.mock }

func (s *smsProvider) Send(ctx context.Context, phone, scene, code string) error {
	if phone == "" {
		return fmt.Errorf("手机号不能为空")
	}
	if s.mock {
		s.mu.Lock()
		s.sent[phone+":"+scene] = code
		s.mu.Unlock()
		shoplogger.L().Info("使用 Mock 短信通道",
			zap.String("手机号", maskPhone(phone)),
			zap.String("场景", scene),
			zap.String("验证码", code))
		return nil
	}
	// 真实短信通道（以主流云短信为例）在此接入
	shoplogger.L().Warn("真实短信通道尚未接入，使用 Mock 返回",
		zap.String("手机号", maskPhone(phone)))
	return nil
}

// LastMockCode 返回 Mock 模式下最近一次发送的验证码，仅用于开发调试。
func (s *smsProvider) LastMockCode(phone, scene string) string {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.sent[phone+":"+scene]
}

// maskPhone 对手机号脱敏。
func maskPhone(phone string) string {
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:19:20

<details><summary>🧠 思考过程</summary>

```
SMS provider doesn't use templates. For sensitive-word filtering in SendSms: the scene is user-controlled; we can filter the scene + generated content. Better approach: build the SMS content from the `sms_templates` table by scene/code and check it against sensitive words; also check the scene string itself. I'll implement:

- In SendSms: load the sms template for the scene (if exists, use its content as the message body); check both scene and template content against enabled sensitive words → if matched, reject with error (and release rate limit). That's real logic tying sms_templates to sending. But the provider doesn't accept content... The SMSProvider interface is Send(ctx, phone, scene, code) — no content param. I can still check the template content for sensitive words before sending (real filter), and log.

Hmm, using sms_templates in SendSms makes the templates functional (not dead CRUD). Good: implement `smsTemplateContent(ctx, scene)` → find template by code=scene; if found and enabled → content; use content for sensitive-word check and for the audit log detail.

Sensitive word filter applies to:
1. Send (notification title/content) → reject if contains enabled sensitive word.
2. SendSms → check the SMS template content (and scene) → reject.

Now let's check product_skus table to enrich sku info, and orders table for order_no lookup.

Let me check those quickly.
```

</details>

<details><summary>🛠 bash</summary>

```
Field	Type	Null	Key	Default	Extra
id	bigint unsigned	NO	PRI	NULL	auto_increment
product_id	bigint unsigned	NO	MUL	NULL	
sku_code	varchar(64)	NO	UNI		
spec_text	varchar(255)	NO			
specs	varchar(512)	NO		{}	
price_cents	bigint	NO		0	
original_price_cents	bigint	NO		0	
stock	int	NO		0	
image	varchar(512)	NO			
sort	int	NO		0	
sales_count	int	NO		0	
weight_grams	int	NO		0	
enabled	tinyint	NO		1	
created_at	datetime(3)	YES		NULL	
updated_at	datetime(3)	YES		NULL	
Field	Type	Null	Key	Default	Extra
id	bigint unsigned	NO	PRI	NULL	auto_increment
order_no	varchar(32)	NO	UNI	NULL	
user_id	bigint unsigned	NO	MUL	NULL	
status	tinyint	NO	MUL	1	
total_amount_cents	bigint	NO		0	
discount_cents	bigint	NO		0	
freight_cents	bigint	NO		0	
payable_cents	bigint	NO		0	
paid_cents	bigint	NO		0	
refunded_cents	bigint	NO		0	
item_count	int	NO		0	
total_quantity	int	NO		0	
receiver	varchar(64)	NO			
phone	varchar(32)	NO			
address	varchar(512)	NO			
remark	varchar(255)	NO			
admin_remark	varchar(512)	NO			
payment_method	varchar(32)	NO			
coupon_id	bigint unsigned	NO		0	
shipment_id	bigint unsigned	NO		0	
points_used	int	NO		0	
paid_at	datetime(3)	YES		NULL	
shipped_at	datetime(3)	YES		NULL	
completed_at	datetime(3)	YES		NULL	
cancelled_at	datetime(3)	YES		NULL	
created_at	datetime(3)	YES	MUL	NULL	
updated_at	datetime(3)	YES		NULL	
user_nickname	varchar(64)	NO			
=== warehouses data ===
id	code	name	enabled	sort
1	WH-SH	?????	1	1
2	WH-BJ	????	1	2
3	WH-GZ	?????	1	3
id	sku_id	sku_code	spec_text	available_stock	warehouse
1	1	SKU-P1-SILVER-256	?? / 12+256GB	320	???
2	2	SKU-P1-BLACK-512	?? / 12+512GB	180	???
3	3	SKU-P1-BLUE-1TB	??? / 12+1TB	96	???
4	4	SKU-P2-I5-16	??? / i5 / 16G / 512G	150	???
5	5	SKU-P2-I7-32	??? / i7 / 32G / 1T	88	???
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:19:31

<details><summary>🧠 思考过程</summary>

````
Good. `inventories.warehouse` is a name like '默认仓' which doesn't match warehouses' names. So filtering inventory by warehouse name will yield empty for warehouses 1-3. Hmm.

For stock check generation by warehouse: inventories.warehouse contains warehouse names (default '默认仓'). Warehouses table has code (WH-SH) and name (上海仓). Since the seed inventories all use '默认仓', filtering by warehouse name would produce zero items for all three warehouses. That's not great but "correct" per data.

Better approach: filter inventories by `warehouse = warehouse.name OR warehouse = warehouse.code OR warehouse = '默认仓'`? Including 默认仓 for every warehouse is semantically wrong but pragmatic... Hmm.

Alternative: since the seed data doesn't map SKUs to warehouses, treat "全部在库 SKU" as the default scope: when the request doesn't specify items, generate items for all SKUs with stock (available_stock > 0), since the inventory table tracks one row per SKU (warehouse column is a label). I'll implement: match inventories whose warehouse equals the warehouse name or code; if none matched, fall back to all inventories with available_stock > 0 (and log/remark). Hmm, "fallback to all" is a bit arbitrary but keeps the feature usable with seed data.

Let me think about the cleanest defensible rule: The inventory ledger is per-SKU (unique index on sku_id), and `warehouse` is a label. Warehouses are a separate registry not yet linked to SKUs. So for a stock check of warehouse W, the set of SKUs to check = SKUs whose inventory row's warehouse matches W's name/code; if the ledger has no rows assigned to W (i.e., W has no SKUs assigned yet), fall back to all SKUs currently in stock, since the check would otherwise be empty and meaningless.

I'll implement exactly that with a clear comment. That's honest and functional.

Additionally, CreateStockCheck request has `items` (repeated StockMoveItem) — if provided, use those SKUs as the check scope.

Now, the plan is clear. Let me also double check `orders` table for order_no lookup for outbound orders: orders.id + order_no exist. I'll read order_no by id (read-only) to fill outbound_orders.order_no.

Let me now check `errs` usage for duplicate key errors: MySQL duplicate entry → gorm error. I'll check for mysql error 1062 to return Conflict. Simpler: pre-check existence by code and return Conflict error. Race conditions aside, that's fine, plus also handle duplicate error generically. I'll pre-check + also map duplicate key error to Conflict using a helper checking strings.Contains(err.Error(), "Duplicate entry").

Now let me write the code.

### File plan

**inventory/warehouse.go**: model Warehouse, repo methods (ListWarehouses, FindWarehouseByID, FindWarehouseByCode, CreateWarehouse, UpdateWarehouse, DeleteWarehouse), service methods (ListWarehouses, SaveWarehouse, DeleteWarehouse).

**inventory/inbound.go**: models InboundOrder, InboundOrderItem; repo (CreateInboundOrder, ListInboundOrders, FindInboundOrderByID, stock increase helper); service (ListInboundOrders, CreateInboundOrder).

**inventory/outbound.go**: models OutboundOrder, OutboundOrderItem; repo; service.

**inventory/stock_check.go**: models StockCheck, StockCheckItem; repo; service.

**inventory/handler.go**: append 11 handler methods.

Wait — where to put stock increase/decrease logic? The Repo in inventory/repo.go has Reserve/Release/Deduct/Adjust. I should add `Inbound` and `Outbound` stock methods to the Repo — but repo.go is my file (inventory dir is mine), so I can add there or in inbound.go/outbound.go as methods on Repo. Methods on Repo can live in any file of the package. I'll put `Repo.InboundStock` in inbound.go and `Repo.OutboundStock` in outbound.go as methods on *Repo. Fine.

Let me write the code now.

**inventory/warehouse.go**

```go
package inventory

import (
	"context"
	"errors"
	"strings"
	"time"

	"gorm.io/gorm"

	commonv1 "github.com/shopstack/platform/gen/go/common/v1"
	inventoryv1 "github.com/shopstack/platform/gen/go/inventory/v1"

	"github.com/shopstack/platform/backend/internal/errs"
)

// Warehouse 是仓库模型。
type Warehouse struct {
	ID        uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	Code      string    `gorm:"column:code;type:varchar(32);not null;uniqueIndex" json:"code"`
	Name      string    `gorm:"column:name;type:varchar(64);not null" json:"name"`
	Address   string    `gorm:"column:address;type:varchar(255);not null;default:''" json:"address"`
	Contact   string    `gorm:"column:contact;type:varchar(64);not null;default:''" json:"contact"`
	Phone     string    `gorm:"column:phone;type:varchar(32);not null;default:''" json:"phone"`
	Enabled   bool      `gorm:"column:enabled;not null;default:true" json:"enabled"`
	Sort      int       `gorm:"column:sort;not null;default:0" json:"sort"`
	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
}

// TableName 指定表名。
func (Warehouse) TableName() string { return "warehouses" }
```

Careful with gorm `Enabled bool` with `default:true` — on create with false value, gorm will apply default true! GORM's behavior: for fields with a default value tag, zero-value fields are omitted on insert, so `enabled=false` becomes the DB default (true). That's a known pitfall. To avoid, use `Enabled bool` without default tag: `gorm:"column:enabled;not null"`. Then gorm inserts false properly. But DB has default 1 — since we always provide the value, no problem. However, for updates with map Updates(map) gorm will skip zero values in maps? No — `Updates(map[string]any)` includes zero values fine. But `Updates(struct)` skips zero values. I'll use map updates.

Same for sensitive_words `status` and notification templates `enabled`.

Actually, careful: `not null` without default + gorm always inserting the field → fine.

But `warehouses.enabled` DB default 1 — insert with false works since we specify.

Also `sort` int with default 0 — fine.

Also note the table has no `updated_at` → don't add an UpdatedAt field to the model (gorm would try to write updated_at column). Right: for Warehouse model, avoid UpdatedAt. For NotificationTemplate the table HAS updated_at → include `UpdatedAt time.Time` with gorm autoUpdateTime (gorm tracks field named UpdatedAt automatically). DB column has ON UPDATE CURRENT_TIMESTAMP, and gorm will set it explicitly on update. Good.

For warehouses `created_at` DB default CURRENT_TIMESTAMP; gorm autoCreateTime on field named CreatedAt → gorm sets it. Fine.

Now service methods.

```go
// ListWarehouses 分页查询仓库。
func (s *Service) ListWarehouses(ctx context.Context, keyword string, page *commonv1.PageRequest) (*inventoryv1.ListWarehousesResponse, error) {
	pageNum, pageSize := normalizePage(page)
	list, total, err := s.repo.ListWarehouses(ctx, keyword, pageNum, pageSize)
	...
}
```

SaveWarehouse(ctx, req) — service takes explicit params rather than proto? Existing service style: service methods take plain args (e.g. ListInventories(ctx, keyword, ...)). For new ones, I'll take plain args too. But the request has many fields; passing the proto request into the service is also acceptable. Existing notification service takes proto requests (List(ctx, req)). I'll use proto requests for the new CRUD-heavy methods (Save/Delete/Create) and plain args for lists. Mixed style exists already. Let me use plain args consistently for inventory (matching inventory/service.go style) and proto requests for payment/notification new methods (matching their style)? Hmm, for consistency within a package, I'd rather pass the request struct. inventory service passes plain args; I'll keep plain args for inventory: SaveWarehouse(ctx, id, code, name, address, contact, phone, enabled, sort) — that's 9 params, ugly. I'll pass the proto request pointer for Save/Create methods in all three packages: acceptable and readable. Existing notification service does `List(ctx, req *notificationv1.ListNotificationsRequest)`. payment service does `CreatePayment(ctx, req *paymentv1.CreatePaymentRequest)`. So proto-request style is well established in the codebase. I'll use proto request structs for the new methods across all three packages (and plain args where the request is trivial).

Decision:
- inventory: `SaveWarehouse(ctx, req *inventoryv1.SaveWarehouseRequest)`, `DeleteWarehouse(ctx, id int64)`, `CreateInboundOrder(ctx, req *inventoryv1.CreateInboundOrderRequest)`, `CreateOutboundOrder(ctx, req *inventoryv1.CreateOutboundOrderRequest)`, `CreateStockCheck(ctx, req *inventoryv1.CreateStockCheckRequest)`, lists take (keyword/status, page).

Let me now write everything. I'll write files one by one.

For the inventory stock update in inbound:

```go
// InboundStock 入库：total_stock += qty，available_stock += qty。
func (r *Repo) InboundStock(ctx context.Context, tx *gorm.DB, skuID uint64, qty int, bizID, operator, remark string) (int, error)
```
Better to make it take the tx so it composes in the order transaction.

Implementation:
```go
func (r *Repo) inboundStock(tx *gorm.DB, skuID uint64, qty int, bizID, operator, remark string) (int, error) {
	var inv Inventory
	if err := tx.Where("sku_id = ?", skuID).First(&inv).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return 0, err
		}
		// 库存记录不存在时按 0 初始值创建
		inv = Inventory{SKUID: skuID, Warehouse: "默认仓"}
		if err := tx.Create(&inv).Error; err != nil {
			return 0, err
		}
	}
	before := inv.AvailableStock
	res := tx.Model(&Inventory{}).
		Where("sku_id = ? AND available_stock >= 0", skuID).
		Updates(map[string]any{
			"total_stock":     gorm.Expr("total_stock + ?", qty),
			"available_stock": gorm.Expr("available_stock + ?", qty),
			"version":         gorm.Expr("version + 1"),
		})
	if res.Error != nil { return 0, res.Error }
	if res.RowsAffected == 0 { return 0, errs.New(errs.CodeStockNotFound, "商品库存记录不存在") }
	if err := tx.Create(&InventoryLog{
		SKUID: skuID, ProductID: inv.ProductID, SKUCode: inv.SKUCode,
		ChangeType: ChangeTypeInbound, Quantity: qty,
		BeforeStock: before, AfterStock: before + qty,
		BizType: "inbound", BizID: bizID, Operator: operator, Remark: remark,
	}).Error; err != nil { return 0, err }
	return before + qty, nil
}
```

Wait: if the SKU has no inventory row, creating one with AvailableStock 0 and then incrementing — but the created row's warehouse default '默认仓' — but if a warehouse was specified, set warehouse to the warehouse name. I'll pass warehouse name into the function to set for new rows.

Hmm: the `total_stock` for existing rows also increments — maintaining the invariant.

For outbound:
```go
func (r *Repo) outboundStock(tx *gorm.DB, skuID uint64, qty int, bizID, operator, remark string) error {
	var inv Inventory
	if err := tx.Where("sku_id = ?", skuID).First(&inv).Error; err != nil {
		return errs.New(errs.CodeStockNotFound, "商品库存记录不存在")
	}
	if inv.AvailableStock < qty {
		return errs.New(errs.CodeStockInsufficient, "库存不足")
	}
	res := tx.Model(&Inventory{}).
		Where("sku_id = ? AND available_stock >= ?", skuID, qty).
		Updates(map[string]any{
			"total_stock":     gorm.Expr("total_stock - ?", qty),
			"available_stock": gorm.Expr("available_stock - ?", qty),
			"version":         gorm.Expr("version + 1"),
		})
	if res.RowsAffected == 0 { return errs.New(errs.CodeStockInsufficient, "库存不足") }
	...log with ChangeType Deduct? 
```
For outbound, change_type: use ChangeTypeDeduct (4, 扣减)? The proto comment lists 1 入库 2 预扣 3 释放 4 扣减 5 调整 6 退货入库. Outbound order is a stock deduction → 4 扣减 is apt. But it's an outbound (other out) not order payment. I'll use ChangeTypeDeduct with biz_type "outbound". Hmm, or 5 调整? Deduct (4) fits better semantically ("扣减").

Note the outbound reduces available directly (not locked→sold) because outbound order is a manual/administrative issue scenario (not order payment). But wait — for an order-linked outbound (order_id given), the order flow already deducts stock via DeductStock on payment. Creating an outbound order for an order would double-deduct. The brief says "CreateOutboundOrder：类似入库，但减少库存。若库存不足必须拒绝并明确报错". So decrease available. But should it convert locked→sold when order_id is set? The order flow: Reserve (available→locked) then on payment Deduct (locked→sold). If an outbound order is created for an order (e.g., after shipping), the stock was already deducted at payment. So deducting again would double count.

To be safe and semantically correct:
- If the SKU has locked_stock >= qty → move locked→sold (i.e. deduct from locked, add to sold; total unchanged) — matching order semantics.
- Else → reduce available and total.

Hmm, that's exactly what the existing `Deduct` repo method does! Deduct: fromLocked if locked>=qty else from available (but total_stock isn't touched in Deduct... interesting: Deduct doesn't update total_stock. Since total should be = available+locked+sold, moving locked→sold keeps total constant; deducting from available reduces the sum but total stays → invariant broken in the existing code! Existing Deduct only decrements available and increments sold... wait: from available: available -= qty, sold += qty → sum stays the same! Yes: available -qty, sold +qty → total unchanged. And fromLocked: locked -qty, sold +qty → sum unchanged. So existing Deduct never changes total_stock; total stays = sum. Consistent.

So for outbound, the correct accounting that preserves the invariant:
- If locked >= qty: locked -= qty, sold += qty (total unchanged).
- Else if available >= qty: available -= qty, total -= qty (this is a genuine removal of goods from the warehouse, e.g. damage/loss). sold unchanged.

Both preserve total = available+locked+sold.

For inbound: total += qty, available += qty → invariant preserved. Good.

So outbound:
- If locked_stock >= qty → treat as order fulfillment: locked→sold, total unchanged.
- Else → available -= qty, total -= qty (real reduction).

Hmm, but if a mixed case (some locked, some available)? Keep it simple: per SKU, if locked >= qty use locked path else available path.

Let me write a helper `outboundStock` doing exactly that, with log change type 4 (扣减) and quantity -qty, before/after = available stock.

Now the log's BeforeStock/AfterStock semantics in existing code = available stock. I'll follow that.

**Inbound service**:

```go
func (s *Service) CreateInboundOrder(ctx context.Context, req *inventoryv1.CreateInboundOrderRequest) (*inventoryv1.InboundOrder, error) {
	items := req.GetItems()
	if len(items) == 0 { return nil, errs.Invalid("入库明细不能为空") }
	wh, err := s.repo.FindWarehouseByID(ctx, uint64(req.GetWarehouseId()))
	if err != nil { return nil, err }  // warehouse not found error
	if !wh.Enabled { return nil, errs.Invalid("仓库已停用") }
	total := 0
	for _, it := range items {
		if it.GetSkuId() <= 0 { return nil, errs.Invalid("SKU 不能为空") }
		if it.GetQuantity() <= 0 { return nil, errs.Invalid("入库数量必须大于 0") }
		total += int(it.GetQuantity())
	}
	inboundNo := generateMoveNo("IN", time.Now())
	operator := auth.UsernameFromContext(ctx)  // inventory domain importing auth — ok? auth is a shared package; read-only usage is fine.
	...
}
```
Does inventory import auth currently? No. Using auth.UsernameFromContext(ctx) for operator is nice. auth package is at backend/internal/auth — importing it doesn't modify it. Fine.

The operator field: use username from ctx, fallback "admin".

Transaction:
```go
err = s.repo.DB().WithContext(ctx).Transaction(func(tx *gorm.DB) error {
	order := &InboundOrder{...Status: InboundStatusPending}
	if err := tx.Create(order).Error; err != nil { return err }
	for _, it := range items {
		item := &InboundOrderItem{InboundID: order.ID, SKUID: ..., SKUCode:..., SpecText:..., Quantity:...}
		if err := tx.Create(item).Error; err != nil { return err }
		if _, err := s.repo.inboundStock(tx, ..., it.GetSkuId(), int(it.GetQuantity()), order.InboundNo, operator, "采购入库"); err != nil { return err }
	}
	order.Status = InboundStatusDone
	return tx.Model(order).Update("status", InboundStatusDone).Error
})
```
Then re-query items and return proto.

I need `s.repo.DB()` — exists in inventory Repo. Good.

Generating order no: `IN` + timestamp + random. Use a helper in inventory package: `generateMoveNo(prefix string, t time.Time) string` using math/rand. payment has generatePaymentNo. inventory doesn't have one yet; add in warehouse.go or a shared spot. I'll add to warehouse.go as package-level helper `generateMoveNo`.

Wait: proto InboundOrder status comment: "0 待入库 1 已入库 2 已取消". Good, matches.

Now, the items in the response: load from DB after txn.

**Outbound service**: similar; order_no looked up from orders table if order_id>0.

Add a repo method `FindOrderNo(ctx, orderID uint64) (string, error)` in outbound.go that queries the `orders` table using a local model:
```go
type orderBrief struct {
	ID      uint64 `gorm:"primaryKey"`
	OrderNo string `gorm:"column:order_no"`
}
func (orderBrief) TableName() string { return "orders" }
```
Read-only. OK.

**Stock check service**:

CreateStockCheck(ctx, req):
- warehouse lookup (required warehouse_id > 0).
- scope: if req.Items non-empty → use them; else → repo.ListInventoriesForCheck(ctx, warehouseName, warehouseCode) → all with available>0 matching warehouse or fallback all.
- create stock_checks row: check_no, warehouse_id, warehouse_name, status 0 (盘点中), total_count=len(items), diff_count=0, remark, operator, created_at.
- create stock_check_items rows: book_quantity = current available stock, actual_quantity=0, diff_quantity=0.
- return StockCheck proto.

GetStockCheck(ctx, id) → StockCheckDetail with items.
ListStockCheckItems(ctx, id) → items + meta (page 1, size total).

repo methods: FindStockCheckByID, ListStockChecks(status, keyword, page), ListStockCheckItems(stockCheckID).

Now the notification domain.

**notification/template.go**:
- models NotificationTemplate, SmsTemplate.
- repo: ListNotificationTemplates(type, keyword, page), CreateNotificationTemplate, UpdateNotificationTemplate, DeleteNotificationTemplate, FindNotificationTemplateByID, same for sms.
- service: List/Save/Delete for both.
- proto converters.

**notification/sensitive.go**:
- model SensitiveWord.
- repo: ListSensitiveWords(keyword, category, page), Create, Update, Delete, FindEnabledSensitiveWords.
- service: List/Save/Delete, plus `filterSensitive(ctx, texts ...string) error` used by Send/SendSms.
- ListNotificationCategories: fixed 4 categories with names/icons; counts from notifications grouped by type for the user.

For counts I need repo method: `CountByType(ctx, userID) (map[int8]struct{count, unread int64}, error)`. I'll implement with a query:
```go
type typeCount struct {
	Type int8
	Count int64
	Unread int64
}
tx.Model(&Notification{}).Select("type, COUNT(*) as count, SUM(CASE WHEN `read` = 0 THEN 1 ELSE 0 END) as unread").Where("user_id = ?", userID).Group("type").Scan(&rows)
```
Good.

Then in service.Send: add sensitive word check on title+content:
```go
if err := s.checkSensitiveWords(ctx, title, req.GetContent()); err != nil { return 0, err }
```
And in SendSms: check scene and the sms template content.

Now, where to put the sensitive check in SendSms — need the sms template content by scene. I'll add repo.FindSmsTemplateByCode(ctx, code).

Implement:
```go
// smsContentFor 返回场景对应的短信模板内容。
func (s *Service) smsContentFor(ctx context.Context, scene string) string {
	tpl, err := s.repo.FindSmsTemplateByCode(ctx, scene)
	if err != nil || tpl == nil { return "" }
	if !tpl.Enabled { return "" }
	return tpl.Content
}
```
Then check sensitive words against scene + content.

Hmm, also could use the template content as the actual SMS body — but the provider interface doesn't accept content. I'll note in comments that the template content is used for the sensitive-word check and audit; the mock provider ignores content.

Hmm, is that "dead" usage? It's used for filtering. Fine.

**payment/pay_channel.go**, **payment/recharge.go**, **payment/balance.go**.

Now, an important detail for payment: the `payments` table has `order_id`, `order_no` NOT NULL with defaults; creating a payment row for recharge would pollute order payment lists (admin ListPayments shows all payments). That's acceptable but the order_id=0 rows would show up in admin payment list — noisy. I decided to NOT create a payments row; instead Notify handles recharge separately by recharge_no.

So Notify flow:
```go
func (s *Service) Notify(ctx context.Context, req *paymentv1.PaymentCallbackRequest) error {
	if req.GetPaymentNo() == "" { return errs.Invalid("缺少支付单号") }
	status := int8(req.GetStatus())
	if status == 0 { status = StatusSuccess }
	// 充值单回调：按充值单号结算并入账余额
	if rc, err := s.repo.FindRechargeByNo(ctx, req.GetPaymentNo()); err == nil && rc != nil {
		if status != StatusSuccess {
			return s.repo.UpdateRechargeFields(ctx, rc.ID, map[string]any{"status": RechargeStatusCancelled})
		}
		return s.settleRecharge(ctx, rc)
	}
	return s.settle(ctx, 0, req.GetPaymentNo(), req.GetTransactionId(), status)
}
```
Careful: FindRechargeByNo returns error when not found; use a "not found → nil, nil" style for this lookup. I'll implement FindRechargeByNo returning (*RechargeOrder, error) with errs not-found error, and in Notify check errs.IsCode(err, errs.CodeNotFound) → treat as normal payment. Let me instead add `FindRechargeByNoSoft` returning (nil, nil) if absent. Simpler: implement `FindRechargeByNo(ctx, no) (*RechargeOrder, error)` that returns nil,nil when not found (documented), used in both places.

settleRecharge(ctx, rc):
```go
func (s *Service) settleRecharge(ctx context.Context, rc *RechargeOrder) error {
	// 幂等：只有待支付状态可以入账
	updated, err := s.repo.MarkRechargePaid(ctx, rc.ID, time.Now())
	if err != nil { return errs.Wrap(...) }
	if !updated { return nil } // 已处理
	return s.creditBalance(ctx, rc.UserID, rc.AmountCents+rc.BonusCents, "余额充值", "recharge", rc.RechargeNo)
}
```
Order matters: MarkRechargePaid first (atomic status update ensures idempotency), then credit balance. If credit fails, the recharge is marked paid but no balance → inconsistent. Better: do it in one transaction: update recharge status + update users balance + insert balance_log, atomically. Let me implement in the repo as `ApplyRechargeCredit(ctx, rcID, userID, amount, title, bizType) (bool, error)` using a transaction:
- tx: `UPDATE recharge_orders SET status=1, paid_at=? WHERE id=? AND status=0` → RowsAffected; if 0 → return false (already processed).
- tx: `UPDATE users SET balance_cents = balance_cents + ? WHERE id = ?` → check RowsAffected (user exists).
- tx: SELECT balance_cents FROM users WHERE id = ? → newBalance.
- tx: INSERT balance_logs(user_id, change, balance, title, biz_type).
That's atomic and idempotent.

Hmm — modifying `users` table from the payment domain: the users table has `balance_cents`. Is there an existing pattern for balance changes elsewhere (e.g. order domain deducts balance)? Let me grep for balance_cents in the codebase to follow existing conventions.

Let me grep.

Then GetRechargeConfig: read system_settings group 'recharge'.

Let me grep for balance_cents usage and for "recharge" mentions in the codebase (maybe frontend expects something).
````

</details>

<details><summary>🛠 grep</summary>

```
internal/user/converter.go:26:		BalanceCents: u.BalanceCents,
cmd/smoketest/main.go:138:				fmt.Sprintf("昵称=%s 积分=%d 余额=%d", profile.GetNickname(), profile.GetPoints(), profile.GetBalanceCents()))
internal/user/model.go:36:	BalanceCents int64          `gorm:"not null;default:0" json:"balance_cents"`
```

</details>

<details><summary>🛠 grep</summary>

```
cmd/smoketest/sweep.go:42:	{name: "用户-支付充值配置", path: "/api/v1/payments/recharge-config"},
cmd/smoketest/sweep.go:43:	{name: "用户-充值记录", path: "/api/v1/payments/recharges?page.page=1&page.page_size=5"},
cmd/smoketest/sweep.go:186:		path: "/api/v1/payments/recharge",
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:21:13

<details><summary>🧠 思考过程</summary>

```
The smoketest sweep references these endpoints. Let me look at sweep.go around line 186 to see expected request shape for recharge, and check what response fields the frontend expects (apps/). That might tell me expected semantics (e.g. recharge creates and immediately pays?).

Let me look at apps for recharge usage to align semantics (e.g. mini program calls POST /api/v1/payments/recharge then expects status).
```

</details>

<details><summary>🛠 bash</summary>

```
name: "用户-商品提问", method: http.MethodPost,
		path: "/api/v1/questions",
		body: `{"product_id":7,"question":"巡检测试问题：这款商品支持退换吗？"}`,
	},
	{
		name: "用户-签到", method: http.MethodPost,
		path: "/api/v1/marketing/sign-in",
		body: `{}`,
	},
	{
		name: "用户-领取任务奖励", method: http.MethodPost,
		path: "/api/v1/marketing/tasks/1/claim",
		body: `{}`,
	},
	{
		name: "用户-充值下单", method: http.MethodPost,
		path: "/api/v1/payments/recharge",
		body: `{"amount_cents":100,"channel":"wechat"}`,
	},
	{
		name: "用户-创建拼团", method: http.MethodPost,
		path: "/api/v1/group-buys/1/join",
		body: `{}`,
	},

	// 后台域
	{
		name: "后台-保存频道", method: http.MethodPost, admin: true,
		path: "/api/v1/admin/channels",
		body: `{"name":"巡检频道","code":"sweep_channel","icon":"https://placehold.co/64x64/9AA5B1/FFFFFF?text=SC","description":"巡检创建","sort":99,"type":1,"status":1}`,
	},
=== apps recharge refs ===
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:21:24

<details><summary>🧠 思考过程</summary>

```
The smoketest posts `{"amount_cents":100,"channel":"wechat"}` — channel as a string "wechat"! But proto CreateRechargeRequest.channel is int32. The gateway would fail to parse "wechat" as int32 → error 400. Hmm. That's the smoketest body; proto says int32 channel. The gateway transcodes int32 from JSON number; a string would error. Not my problem strictly, but I could accept... no, proto is int32. I'll note it. Actually maybe the smoketest expects failure tolerance. Not my scope; can't change proto.

Also amount_cents: 100 (i.e., ¥1) — below my min of 1000 cents. If min is 1000, this request errors. The sweep probably tolerates errors (it's a sweep). But to be friendly, maybe min default = 100 cents (¥1)? Let me set default min_amount_cents = 100 (¥1) and max = 10,000,000 cents (¥100,000)? Reasonable: min ¥1, max ¥100,000. Hmm, presets: [1000, 5000, 10000, 50000, 100000] cents (¥10/50/100/500/1000).

With min=100 the sweep's 100 cents passes. Good.

Now, let me also check the apps for what the frontend expects — apps dir has no recharge refs (grep empty). OK.

Now let me check the gateway routing: are the new HTTP routes registered anywhere outside gen? The gateway file (gen/go/.../*.pb.gw.go) is generated — routes exist. Good.

Now let me check whether there's an admin auth middleware requiring admin role for /api/v1/admin/* routes — not my concern.

One more thing: the `ListPayChannels` and others are admin endpoints; `ListRecharges`/`ListBalanceLogs`/`CreateRecharge` are user endpoints → need the ctx user id. Let me check how the gateway injects user id into ctx (auth middleware) — auth.UserIDFromContext. Fine.

Now let me write the code. Start with inventory.

One more check: does the inventory service have access to `auth`? I'll import "github.com/shopstack/platform/backend/internal/auth" for operator name. Let me verify auth.UsernameFromContext signature returns string.

Yes: `func UsernameFromContext(ctx context.Context) string`.

Let me now write inventory/warehouse.go.

Also note: `errs.Invalid` returns *errs.Error with code 1001.

Let me write the files.

For the keyword search in warehouses: name/code/address LIKE.

Let me write now.

Also I must double check gorm's `Updates(map[string]any)` with `Model(&Warehouse{}).Where("id = ?", id)` — fine.

Also for `enabled` field with gorm: `Enabled bool `gorm:"column:enabled;not null"`` — when creating with false, gorm includes it (no default tag → gorm includes zero values on Create). Actually gorm includes all fields on Create unless they have a default value tag and are zero. Without `default` tag, zero values are included. Good — so I must NOT include `default:true` in the tag. But the DB column has DEFAULT 1 — irrelevant since we always insert a value.

Wait, careful: `not null` with no default → inserting false works.

Let me write inventory/warehouse.go now.

Also for `Sort int` — DB `sort` is a reserved-ish word? `sort` is not reserved in MySQL. But gorm will quote column names anyway. Fine.

Let me write the code.
```

</details>

Now I have a complete picture. Let me write the inventory domain implementation.

<details><summary>🛠 write</summary>

```
Successfully wrote 7883 bytes to /<WORKSPACE>/shopstack/backend/internal/inventory/warehouse.go
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:22:05

<details><summary>🧠 思考过程</summary>

```
I used `timestamppbNew` — the inventory package doesn't have it; service.go uses `timestamppb.New`. I'll define a helper in warehouse.go or just use timestamppb.New directly. Let me use timestamppb.New and import it. I'll fix by adding a helper `timestamppbNew` in warehouse.go... simpler: replace with timestamppb.New and import "google.golang.org/protobuf/types/known/timestamppb".

Let me edit.
```

</details>

<details><summary>🛠 edit</summary>

```
Successfully replaced 1 block(s) in /<WORKSPACE>/shopstack/backend/internal/inventory/warehouse.go.
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:22:10

<details><summary>🛠 edit</summary>

```
Successfully replaced 1 block(s) in /<WORKSPACE>/shopstack/backend/internal/inventory/warehouse.go.
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:22:13

Now the inbound order implementation:

<details><summary>🛠 write</summary>

```
Successfully wrote 11222 bytes to /<WORKSPACE>/shopstack/backend/internal/inventory/inbound.go
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:22:56

<details><summary>🧠 思考过程</summary>

```
Note: `stockMoveItemsToProto` takes []InboundOrderItem — for outbound I need a similar function for []OutboundOrderItem. I'll write a separate one in outbound.go, or make a generic helper. Since Go 1.x version? Let me check go.mod version for generics support (go 1.18+). Let me check.

Actually simpler: define in outbound.go `outboundItemsToProto(items []OutboundOrderItem)`.

Now outbound.go.
```

</details>

<details><summary>🛠 write</summary>

```
Successfully wrote 12303 bytes to /<WORKSPACE>/shopstack/backend/internal/inventory/outbound.go
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:23:37

<details><summary>🧠 思考过程</summary>

```
Wait: in OutboundStock, the log's AfterStock = inv.AvailableStock - qty — but in the locked path, available doesn't change. Let me fix: compute afterAvailable = inv.AvailableStock (locked path) or inv.AvailableStock - qty (available path). Let me correct that.

Also the `Where("sku_id = ? AND (locked_stock >= ? OR available_stock >= ?)")` condition: in the locked path, we need locked >= qty; in the available path, available >= qty. The OR condition is fine (it might allow a row where locked>=qty but the update takes available... no, the update expression is chosen before). But there's a subtle issue: in the locked path, the condition `locked_stock >= qty` satisfied → rows affected. OK. In the available path, available >= qty checked. The OR condition is satisfied in both cases. Fine.

Let me fix the AfterStock computation.
```

</details>

<details><summary>🛠 edit</summary>

```
Successfully replaced 1 block(s) in /<WORKSPACE>/shopstack/backend/internal/inventory/outbound.go.
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:23:46

<details><summary>🛠 edit</summary>

```
Successfully replaced 1 block(s) in /<WORKSPACE>/shopstack/backend/internal/inventory/outbound.go.
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:23:51

Now the stock check implementation:

<details><summary>🛠 write</summary>

```
Successfully wrote 11764 bytes to /<WORKSPACE>/shopstack/backend/internal/inventory/stock_check.go
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:24:29

<details><summary>🧠 思考过程</summary>

```
Issue: in CreateStockCheck, `inv` is used after `invErr != nil` — when invErr != nil, inv is nil, and I check `if inv != nil`. But `inv` is declared inside the loop via `inv, invErr := ...` — yes it's scoped to the loop body. OK.

Now the handler methods for inventory. Append to handler.go.
```

</details>

<details><summary>🛠 edit</summary>

```
Successfully replaced 1 block(s) in /<WORKSPACE>/shopstack/backend/internal/inventory/handler.go.
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:24:42

<details><summary>🛠 bash</summary>

```
# github.com/shopstack/platform/backend/internal/inventory
backend/internal/inventory/warehouse.go:169:10: cannot use 1st function result (value of type *Warehouse) as *inventoryv1.Warehouse value in return statement
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:24:47

<details><summary>🧠 思考过程</summary>

```
In SaveWarehouse, the update path returns s.repo.FindWarehouseByID which returns *Warehouse (model), but the function must return *inventoryv1.Warehouse. Fix: wrap with warehouseToProto.
```

</details>

<details><summary>🛠 edit</summary>

```
Successfully replaced 1 block(s) in /<WORKSPACE>/shopstack/backend/internal/inventory/warehouse.go.
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:24:52

<details><summary>🛠 bash</summary>

```
backend/internal/inventory/inbound.go
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:24:57

<details><summary>🛠 bash</summary>

```
FMT_OK
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:25:01

<details><summary>🧠 思考过程</summary>

````
Inventory compiles. Now payment domain.

Files:
- payment/pay_channel.go: PayChannel model + repo + service.
- payment/recharge.go: RechargeOrder model + repo + service (CreateRecharge, ListRecharges, GetRechargeConfig) + settle integration.
- payment/balance.go: BalanceLog model + repo (list logs, current balance) + service ListBalanceLogs + creditBalance.

Let me plan the recharge config reading. system_settings table: key/value/name/group/description/value_type. I'll query group='recharge' via a local model:

```go
// systemSetting 是系统配置表的只读投影。
type systemSetting struct {
	Key   string `gorm:"column:key;primaryKey" json:"key"`
	Value string `gorm:"column:value" json:"value"`
}
func (systemSetting) TableName() string { return "system_settings" }
```

Then repo.ListSystemSettingsByGroup(ctx, group) ([]systemSetting, error).

Config keys (group "recharge"):
- recharge.min_amount_cents
- recharge.max_amount_cents
- recharge.preset_amounts (comma separated cents)
- recharge.register_bonus_cents
- recharge.first_recharge_bonus_desc
- recharge.bonus_rate_bps (赠送比例，万分比；默认 0)

Defaults: min 100, max 10000000 (¥100000), presets [1000,5000,10000,50000,100000], register_bonus 0, bonus_rate_bps 0, desc "".

Bonus calc for a recharge: bonus = amount_cents * bonus_rate_bps / 10000. Also first-recharge bonus: if user has no prior paid recharge → extra bonus? I'll implement: first recharge (no prior successful recharge) gets first_recharge_bonus_cents? The config has "first_recharge_bonus_desc" (a description string) not an amount. So bonus amount comes from bonus_rate_bps only. Good: desc is a display string like "首充最高赠送10%".

Let me define keys:
- "recharge.min_amount_cents"
- "recharge.max_amount_cents"
- "recharge.preset_amounts"
- "recharge.register_bonus_cents"
- "recharge.first_recharge_bonus_desc"
- "recharge.bonus_rate_bps"

Note system_settings.key is unique and there's a `group` column. These keys don't exist in the seed, so defaults apply. Since UpdateSystemSettings only updates existing keys, admins can't add new ones — but that's the notification domain's existing behavior; not my scope. Still, I should note that recharge config comes from system_settings group 'recharge' with fallback defaults.

Now CreateRecharge:
- userID from ctx (auth.UserIDFromContext) — must be > 0 else Unauthorized. Note: the handler can use h.userID(ctx, req.GetUserId()) but req has no user_id → falls back to ctx.
- amount_cents: > 0; must be within [min, max] → else Invalid.
- channel: default 1 (wechat); must be 1 or 2 (balance can't recharge) → else Invalid "不支持的充值渠道".
- Validate the channel is enabled in pay_channels (repo.FindEnabledPayChannelByChannel) → if none → error "充值渠道不可用".
- Compute bonus.
- Check for an existing pending recharge for the same user+amount+channel? Idempotency: if there's a pending recharge with the same amount and channel, return it (like CreatePayment idempotency). Good touch. I'll implement: find latest pending recharge for user with same amount & channel → return it.
- Create recharge_orders row: recharge_no "RC"+..., user_id, amount_cents, bonus_cents, status 0, channel, payment_no "", created_at now.
- payment_no: set to the recharge_no? The proto has payment_no field — I'll set payment_no = recharge_no so the client knows which identifier to use in the callback. Hmm, "payment_no" semantically = the payment flow's number. Since we don't create a payments row, I'll set payment_no = recharge_no so the client can call Notify with it. Document this.

Actually cleaner: keep payment_no empty until paid? No — the client needs it to trigger the callback. I'll set payment_no = recharge_no at creation.

- Mock auto-settle: if channel == wechat && providers.WeChat.Mock() → go s.mockSettleRecharge(rechargeID, rechargeNo) after 1.2s (mirrors mockSettle).

Wait, but the mock settle in CreatePayment is unconditional for WeChat. For recharge, same idea: in mock env the recharge auto-pays. I'll do it for both wechat and alipay mock? Only WeChat provider has Mock(). I'll check `s.providers.WeChat.Mock()`.

Hmm, careful: providers might be nil in some tests? NewService always takes providers. In the payment service, `s.providers.WeChat.CreatePay` is called unconditionally in CreatePayment, so providers is non-nil. OK.

- Return rechargeToProto(rc).

settleRecharge in Notify:
```go
func (s *Service) settleRecharge(ctx context.Context, rc *RechargeOrder) error {
	credited, err := s.repo.ApplyRechargeCredit(ctx, rc.ID, rc.UserID, rc.AmountCents+rc.BonusCents, "余额充值", "recharge")
	if err != nil { return errs.Wrap(errs.CodeInternalError, "充值入账失败", err) }
	if !credited { return nil } // 幂等
	return nil
}
```
ApplyRechargeCredit transaction:
- UPDATE recharge_orders SET status=1, paid_at=now WHERE id=? AND status=0 → RowsAffected 0 → return false.
- UPDATE users SET balance_cents = balance_cents + ? WHERE id = ? → RowsAffected 0 → error "用户不存在".
- SELECT balance_cents FROM users WHERE id=? → after.
- INSERT INTO balance_logs (user_id, change, balance, title, biz_type, created_at).

Also update the payments-like fields? recharge_orders has no transaction_id column. OK.

BalanceLog model:
```go
type BalanceLog struct {
	ID        uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID    uint64    `gorm:"column:user_id;not null;index" json:"user_id"`
	Change    int64     `gorm:"column:change;not null;default:0" json:"change"`
	Balance   int64     `gorm:"column:balance;not null;default:0" json:"balance"`
	Title     string    `gorm:"column:title;type:varchar(128);not null;default:''" json:"title"`
	BizType   string    `gorm:"column:biz_type;type:varchar(32);not null;default:''" json:"biz_type"`
	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
}
func (BalanceLog) TableName() string { return "balance_logs" }
```

ListBalanceLogs: user-scoped, returns logs + current_balance from users.balance_cents.

Ownership: implement helper in payment:
```go
// resolveOwnerUserID 解析数据归属用户：只能查看自己的数据。
func resolveOwnerUserID(ctx context.Context, requested int64) (int64, error) {
	owner := auth.UserIDFromContext(ctx)
	if owner <= 0 {
		return 0, errs.Unauthorized("请先登录")
	}
	if requested > 0 && requested != owner {
		return 0, errs.Forbidden("无权查看他人的数据")
	}
	return owner, nil
}
```
Hmm — but the admin might legitimately list another user's recharges via the admin panel. The instruction explicitly says user-perspective and no privilege escalation. The endpoints are /api/v1/payments/recharges (user). I'll enforce strictly as instructed. But should an admin be able to see? There's an admin role concept (admins table). Checking admin role would require reading admins table — out of scope. I'll implement strict ownership and document it.

Hmm, one concern: the gateway may not inject a user id for these routes if auth middleware requires login — then auth.UserIDFromContext returns 0 → Unauthorized. That's the correct behavior for a user-scoped endpoint.

Now ListRecharges with status filter: request has status int32 (0 待支付 1 已支付 2 已取消). Problem: status=0 means "待支付" but also "no filter". Ambiguity. I'll treat status < 0 as no filter and status >= 0 as filter? The default request has status 0 → would filter to pending only. Hmm. For the frontend, listing recharges probably wants all. Since proto uses 0 = 待支付 explicitly, filtering by 0 is "correct" but the default (unset) request would then only show pending.

I need a way to distinguish unset. In proto3 without optional, status=0 is indistinguishable from explicitly 0. Given the semantics "0 待支付", I'll filter status >= 0 → filter by status. That means the default list shows only pending recharges. That's bad UX for a history page.

Alternative: use `status < 0` → all; and treat 0 as 待支付 filter. Since the frontend is a separate worker, they'd likely send status explicitly. Hmm.

Let me think about which is less surprising: The proto comment for RechargeOrder.status says "0 待支付 1 已支付 2 已取消". For ListRechargesRequest, status is int32 without comment. I'll follow the same convention as other list filters in this codebase: in inventory ListInboundOrders I used `status >= 0` filter... wait I wrote `if status >= 0 { q = q.Where("status = ?", status) }` — that means status 0 filters to 待入库. Same ambiguity.

Hmm. For consistency across my new list endpoints (inbound/outbound/stockcheck/recharges), using "status >= 0 → filter" means the default (0) filters to the first status. For inbound orders, status 0 = 待入库 — but since we always create them as 已入库 (1), the default list would return nothing! That's bad.

Better convention: use status < 0 as "all" and status >= 0 as filter, BUT default the request status in the handler to -1 when the client didn't specify? Can't distinguish 0 from unset.

Alternative convention: treat 0 as "no filter" for the list requests (since 0 is the proto3 default and thus indistinguishable), and only filter for status > 0. For inbound orders: status 1 = 已入库 filters; status 0 (待入库) can't be requested explicitly — acceptable, documented. For recharges: status 1/2 filter; status 0 (待支付) can't be filtered explicitly — a minor gap, documented.

Hmm, but for recharges the frontend history page wants all → status 0 = no filter → returns all. Good.

I'll go with: status > 0 → filter; status <= 0 → no filter. And document it. This gives sensible default behavior (list all) for all four list endpoints. Let me update inbound.go/outbound.go/stock_check.go accordingly (change `status >= 0` to `status > 0`).

Wait, but for sensitive words, status 0 = 停用, 1 = 启用 — the Save request explicitly sets status, so filtering in the list: category filter; status not in the list request. Fine.

For pay channels, the list request has `channel int32` filter → channel 0 = unspecified (unspecified in common enum) → filter only if > 0. Good.

Let me now update the three inventory list methods to use status > 0.

Now write payment files.

Also for the PayChannel `Channel` filter: channel > 0.

Let me write payment/pay_channel.go.

Note `pay_channels.config` is `text NOT NULL` — the seed has values. When creating, default to "{}" if empty.

Also pay_channels has no updated_at.

Let me write.
````

</details>

Now let me fix the status filter convention in the inventory lists, then implement the payment domain:

<details><summary>🛠 bash</summary>

```
inbound.go:90:	if status >= 0 {
outbound.go:100:	if status >= 0 {
stock_check.go:67:	if status >= 0 {
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:25:40

<details><summary>🛠 edit</summary>

```
Successfully replaced 1 block(s) in /<WORKSPACE>/shopstack/backend/internal/inventory/inbound.go.
```

</details>

<details><summary>🛠 edit</summary>

```
Successfully replaced 1 block(s) in /<WORKSPACE>/shopstack/backend/internal/inventory/outbound.go.
```

</details>

<details><summary>🛠 edit</summary>

```
Successfully replaced 1 block(s) in /<WORKSPACE>/shopstack/backend/internal/inventory/stock_check.go.
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:25:48

<details><summary>🛠 write</summary>

```
Successfully wrote 7195 bytes to /<WORKSPACE>/shopstack/backend/internal/payment/pay_channel.go
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:26:09

<details><summary>🧠 思考过程</summary>

````
Now payment/recharge.go with RechargeOrder model, config reading, CreateRecharge, ListRecharges, GetRechargeConfig, and the Notify integration (settleRecharge). And payment/balance.go with BalanceLog + credit logic + ListBalanceLogs.

Let me write recharge.go.

Config structure:
```go
// rechargeConfig 是充值配置的内部表示。
type rechargeConfig struct {
	MinAmountCents int64
	MaxAmountCents int64
	PresetAmounts  []int64
	RegisterBonusCents int64
	FirstRechargeBonusDesc string
	BonusRateBPS int64
}
```

Defaults constants.

repo.ListRechargeSettings(ctx, group) ([]systemSetting, error).

service.GetRechargeConfig(ctx) (*paymentv1.RechargeConfig, error) → read settings, build.

Also `rechargeBonus(amount, cfg) int64 = amount * cfg.BonusRateBPS / 10000`.

CreateRecharge:
```go
func (s *Service) CreateRecharge(ctx context.Context, req *paymentv1.CreateRechargeRequest) (*paymentv1.RechargeOrder, error) {
	userID := auth.UserIDFromContext(ctx)
	if userID <= 0 { return nil, errs.Unauthorized("请先登录") }
	amount := req.GetAmountCents()
	if amount <= 0 { return nil, errs.New(errs.CodeInvalidParam, "充值金额必须大于 0") }
	cfg, err := s.loadRechargeConfig(ctx)
	if amount < cfg.MinAmountCents || amount > cfg.MaxAmountCents {
		return nil, errs.New(errs.CodeInvalidParam, fmt.Sprintf("充值金额需在 %d ~ %d 分之间", ...))
	}
	channel := int8(req.GetChannel())
	if channel == 0 { channel = ChannelWeChat }
	if channel == ChannelBalance { return nil, errs.New(errs.CodeInvalidParam, "余额渠道不能用于充值") }
	if channel != ChannelWeChat && channel != ChannelAlipay { return nil, errs.New(errs.CodeInvalidParam, "不支持的充值渠道") }
	// 渠道必须处于启用状态
	if _, err := s.repo.FindEnabledPayChannelByType(ctx, channel); err != nil { return nil, err }
	// 幂等：同用户同金额同渠道存在待支付充值单时直接复用
	if existing, err := s.repo.FindPendingRecharge(ctx, uint64(userID), amount, channel); err == nil && existing != nil {
		return rechargeToProto(existing), nil
	}
	bonus := amount * cfg.BonusRateBPS / 10000
	rc := &RechargeOrder{ RechargeNo: generateRechargeNo(time.Now()), UserID: uint64(userID), AmountCents: amount, BonusCents: bonus, Status: RechargeStatusPending, Channel: channel }
	rc.PaymentNo = rc.RechargeNo
	create...
	// Mock 渠道下模拟支付回调
	if channel == ChannelWeChat && s.providers.WeChat.Mock() { go s.mockSettleRecharge(rc.ID, rc.RechargeNo) }
	return rechargeToProto(rc), nil
}
```

Note: `s.providers` could be nil? NewService sets it; cmd wires it. But to be safe: `s.providers != nil && s.providers.WeChat != nil && s.providers.WeChat.Mock()`. Let me check thirdparty.Providers struct: fields WeChat WeChatProvider, SMS SMSProvider, OSS. Is WeChat an interface field that could be nil? Let me check providers.go struct definition.

Let me check quickly.
````

</details>

<details><summary>🛠 bash</summary>

```
// ---------------------------------------------------------------------------
// 集合
// ---------------------------------------------------------------------------

// Providers 持有全部第三方服务实现。
type Providers struct {
	WeChat WeChatProvider
	SMS    SMSProvider
	OSS    OSSProvider
}

// NewProviders 根据配置构建第三方服务实现集合。
func NewProviders(cfg *config.Config) *Providers {
	return &Providers{
		WeChat: newWeChatProvider(cfg),
		SMS:    newSMSProvider(cfg),
		OSS:    newOSSProvider(cfg),
	}
}
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:26:19

<details><summary>🧠 思考过程</summary>

````
Providers.WeChat is an interface; if s.providers is nil → panic. In CreatePayment the code calls s.providers.WeChat.CreatePay directly without nil check, so providers is always set. I'll still guard with a nil check for safety (s.providers != nil && s.providers.WeChat != nil).

Now writing recharge.go.

Also `generateRechargeNo`: "RC" + timestamp + random. The payment package has generatePaymentNo(t) → timestamp + 6-digit random. I'll reuse it: "RC" + generatePaymentNo(time.Now()).

Recharge order model:
```go
type RechargeOrder struct {
	ID          uint64     `gorm:"primaryKey;autoIncrement" json:"id"`
	RechargeNo  string     `gorm:"column:recharge_no;type:varchar(64);not null;uniqueIndex" json:"recharge_no"`
	UserID      uint64     `gorm:"column:user_id;not null;index" json:"user_id"`
	AmountCents int64      `gorm:"column:amount_cents;not null;default:0" json:"amount_cents"`
	BonusCents  int64      `gorm:"column:bonus_cents;not null;default:0" json:"bonus_cents"`
	Status      int8       `gorm:"column:status;not null;default:0;index" json:"status"`
	Channel     int8       `gorm:"column:channel;not null;default:1" json:"channel"`
	PaymentNo   string     `gorm:"column:payment_no;type:varchar(64);not null;default:''" json:"payment_no"`
	PaidAt      *time.Time `gorm:"column:paid_at" json:"paid_at"`
	CreatedAt   time.Time  `gorm:"column:created_at" json:"created_at"`
}
```

Recharge statuses: 0 待支付 1 已支付 2 已取消.

Also need repo.FindRechargeByNo (returning nil,nil if absent), FindPendingRecharge, ListRecharges, ApplyRechargeCredit.

Let me write recharge.go including config, and balance.go including BalanceLog + ApplyRechargeCredit (which touches users + balance_logs). Actually ApplyRechargeCredit spans recharge + balance; I'll put it in balance.go since it writes balance logs. Hmm, it's recharge settlement. I'll put ApplyRechargeCredit in recharge.go and the balance log insert helper in balance.go. Let me keep the balance write logic in balance.go: `repo.creditUserBalance(tx, userID, amount, title, bizType) (int64, error)`.

balance.go:
```go
// BalanceLog 是余额流水模型。
type BalanceLog struct {...}

// userBalance 是用户余额的只读/更新投影。
type userBalance struct {
	ID           uint64 `gorm:"primaryKey"`
	BalanceCents int64  `gorm:"column:balance_cents"`
}
func (userBalance) TableName() string { return "users" }

// ListBalanceLogs 分页查询余额流水。
func (r *Repo) ListBalanceLogs(ctx, userID uint64, page, pageSize int) ([]BalanceLog, int64, error)

// GetUserBalance 查询用户当前余额。
func (r *Repo) GetUserBalance(ctx, userID uint64) (int64, error)

// creditUserBalance 在事务中增加用户余额并写入流水，返回变更后余额。
func (r *Repo) creditUserBalance(tx *gorm.DB, userID uint64, change int64, title, bizType string) (int64, error)
```

Then service.ListBalanceLogs(ctx, req) → ownership check → repo → proto + current_balance.

Let me write both files now.
````

</details>

<details><summary>🛠 write</summary>

```
Successfully wrote 15060 bytes to /<WORKSPACE>/shopstack/backend/internal/payment/recharge.go
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:27:02

<details><summary>🧠 思考过程</summary>

```
Issues:
1. I used `zap` in recharge.go — need the import "go.uber.org/zap".
2. The PaymentNo assignment is clumsy: I set PaymentNo to a second generated number then overwrite with RechargeNo. Let me clean: generate rechargeNo once, then set PaymentNo = rechargeNo.
3. `isDuplicateKey` — defined in inventory package; need a payment-local version. I'll define it in payment (check for "Duplicate entry"). The payment package doesn't have one; I'll add it in balance.go or recharge.go.
4. `commonv1` import may be unused in recharge.go (normalizePage/buildMeta are in service.go and take commonv1.PageRequest — but I don't reference commonv1 directly in recharge.go). ListRecharges uses req.GetPage() → *commonv1.PageRequest passed to normalizePage; no direct commonv1 reference → unused import. Remove it.

Let me fix these.
```

</details>

<details><summary>🛠 edit</summary>

```
Successfully replaced 1 block(s) in /<WORKSPACE>/shopstack/backend/internal/payment/recharge.go.
```

</details>

<details><summary>🛠 edit</summary>

```
Successfully replaced 1 block(s) in /<WORKSPACE>/shopstack/backend/internal/payment/recharge.go.
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:27:12

Now the balance ledger file:

<details><summary>🛠 write</summary>

```
Successfully wrote 5949 bytes to /<WORKSPACE>/shopstack/backend/internal/payment/balance.go
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:27:30

<details><summary>🛠 edit</summary>

```
Successfully replaced 1 block(s) in /<WORKSPACE>/shopstack/backend/internal/payment/balance.go.
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:27:34

<details><summary>🧠 思考过程</summary>

```
Now the payment handler: add the 7 RPC methods, and modify Notify to handle recharge callbacks.

Handler additions:
- ListPayChannels
- SavePayChannel
- DeletePayChannel
- CreateRecharge
- ListRecharges
- ListBalanceLogs
- GetRechargeConfig

And Notify service change: handle recharge.

Let me update payment/service.go Notify and handler.go.
```

</details>

<details><summary>🛠 edit</summary>

```
Successfully replaced 1 block(s) in /<WORKSPACE>/shopstack/backend/internal/payment/service.go.
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:27:43

<details><summary>🛠 edit</summary>

```
Successfully replaced 1 block(s) in /<WORKSPACE>/shopstack/backend/internal/payment/handler.go.
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:27:50

<details><summary>🛠 bash</summary>

```
(no output)
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:27:55

<details><summary>🧠 思考过程</summary>

````
Payment builds. Wait — gofmt alignment of const block in recharge.go (the const block with mixed alignment). Let me run gofmt -l later.

Now the notification domain.

Files:
- notification/template.go: NotificationTemplate + SmsTemplate models, repo, service, converters.
- notification/sensitive.go: SensitiveWord model, repo, service, filters, categories.

And modify notification/service.go to add sensitive word filtering in Send and SendSms.

Let me write template.go.

Models:
```go
// NotificationTemplate 是通知模板模型。
type NotificationTemplate struct {
	ID        uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	Code      string    `gorm:"column:code;type:varchar(64);not null;uniqueIndex" json:"code"`
	Name      string    `gorm:"column:name;type:varchar(64);not null" json:"name"`
	Type      int8      `gorm:"column:type;not null;default:1;index" json:"type"`
	Title     string    `gorm:"column:title;type:varchar(255);not null" json:"title"`
	Content   string    `gorm:"column:content;type:text" json:"content"`
	Link      string    `gorm:"column:link;type:varchar(512);not null" json:"link"`
	Enabled   bool      `gorm:"column:enabled;not null" json:"enabled"`
	UpdatedAt time.Time `gorm:"column:updated_at" json:"updated_at"`
}
```
Note the DB `type` column is tinyint NOT NULL with index? DESC showed: type tinyint NO (default 1) — no index listed (Key column empty). Actually DESC showed "type tinyint NO 1" with no MUL. Fine.

`enabled` tinyint NOT NULL default 1 — model without default tag so false is inserted properly.

For update: `Updates(map)` with updated_at set by gorm automatically for the UpdatedAt field (gorm tracks UpdatedAt field and sets it on update). Yes, gorm auto-updates fields named UpdatedAt.

SmsTemplate:
```go
type SmsTemplate struct {
	ID        uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	Code      string    `gorm:"column:code;type:varchar(64);not null;uniqueIndex" json:"code"`
	Name      string    `gorm:"column:name;type:varchar(64);not null" json:"name"`
	Content   string    `gorm:"column:content;type:text" json:"content"`
	Enabled   bool      `gorm:"column:enabled;not null" json:"enabled"`
	UpdatedAt time.Time `gorm:"column:updated_at" json:"updated_at"`
}
```

Repo + service for both.

Also service helper: `FindSmsTemplateByCode` used by SendSms for sensitive filtering, and `notificationTemplateByCode` maybe used by Send to render templates? The Send flow takes explicit title/content. I could make Send use the notification template when the title matches a template code... Not necessary. But to avoid "dead CRUD", templates are admin-managed config used by the frontend/admin. That's acceptable (the brief only requires CRUD + list). But I can wire notification_templates into Send: if the request has no title but there's a template... no, title is required. I'll leave the template table as admin config (as the brief requires) and wire sms_templates into SendSms filtering (making it functional).

Now sensitive.go:
```go
type SensitiveWord struct {
	ID        uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	Word      string    `gorm:"column:word;type:varchar(128);not null;uniqueIndex" json:"word"`
	Category  int8      `gorm:"column:category;not null;default:4" json:"category"`
	Status    int8      `gorm:"column:status;not null;default:1" json:"status"`
	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
}
```

Service:
- ListSensitiveWords(keyword, category, page)
- SaveSensitiveWord(req) — id 0 → create; else update. Word must be non-empty and unique. Status: 0 停用 1 启用 — normalize: if status not 0/1 → default 1.
- DeleteSensitiveWord(id)
- checkSensitive(ctx, texts...) — query enabled words; if any text contains a word → error.

For efficiency, load enabled words once per call.

ListNotificationCategories:
- categories: fixed 4 types with names and icons.
- counts from notifications for the user.

Let me define:
```go
// notificationCategory 定义通知分类的展示信息。
type notificationCategory struct {
	Type int32
	Name string
	Icon string
}

var notificationCategories = []notificationCategory{
	{Type: NotificationTypeOrder, Name: "订单", Icon: "order"},
	{Type: NotificationTypeLogistics, Name: "物流", Icon: "logistics"},
	{Type: NotificationTypePromotion, Name: "营销", Icon: "promotion"},
	{Type: NotificationTypeSystem, Name: "系统", Icon: "system"},
}
```

Repo method CountNotificationsByType(ctx, userID) (map[int32]categoryCount, error).

Now writing the notification files.
````

</details>

Now the notification domain:

<details><summary>🛠 write</summary>

```
Successfully wrote 14318 bytes to /<WORKSPACE>/shopstack/backend/internal/notification/template.go
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:28:32

<details><summary>🧠 思考过程</summary>

```
The `var _ = commonv1.NotificationType_ORDER` hack is ugly — I should just remove the commonv1 import instead. Let me check whether commonv1 is used in template.go... mapNotificationType is defined in service.go and returns int8. So commonv1 isn't needed. Remove the import and the hack.

Also mapNotificationType(req.GetType()) returns (int8, error) — good.

Let me fix.
```

</details>

<details><summary>🛠 edit</summary>

```
Successfully replaced 1 block(s) in /<WORKSPACE>/shopstack/backend/internal/notification/template.go.
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:28:38

<details><summary>🧠 思考过程</summary>

```
Hmm, that edit was a no-op-ish (removed a blank line). Let me instead properly remove the commonv1 import and the hack line.

Actually wait — maybe I should keep commonv1 usage meaningful. In SaveNotificationTemplate, mapNotificationType takes int32 and returns int8. I could instead validate the type directly with commonv1.NotificationType. Let me just remove the import and the `var _` line.
```

</details>

<details><summary>🛠 edit</summary>

```
Successfully replaced 1 block(s) in /<WORKSPACE>/shopstack/backend/internal/notification/template.go.
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:28:54

<details><summary>🛠 edit</summary>

```
Successfully replaced 1 block(s) in /<WORKSPACE>/shopstack/backend/internal/notification/template.go.
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:28:58

Now the sensitive words and categories file:

<details><summary>🛠 write</summary>

```
Successfully wrote 9761 bytes to /<WORKSPACE>/shopstack/backend/internal/notification/sensitive.go
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:29:21

<details><summary>🧠 思考过程</summary>

````
Now wire the sensitive-word filter into Send and SendSms in notification/service.go, and add the handler methods.

In Send: after validating title and type, check sensitive words on title + content.

In SendSms: check scene + the SMS template content for the scene.

Let me modify service.go Send:

```go
	title := strings.TrimSpace(req.GetTitle())
	if title == "" { ... }
	// 敏感词过滤：标题与正文命中启用中的敏感词时拒绝发送
	if err := s.checkSensitiveWords(ctx, title, req.GetContent()); err != nil {
		return 0, err
	}
```

And SendSms:
```go
	scene = normalizeScene(scene)
	// 敏感词过滤：场景与短信模板内容命中启用中的敏感词时拒绝发送
	if err := s.checkSensitiveWords(ctx, scene, s.smsTemplateContent(ctx, scene)); err != nil {
		return nil, err
	}
```
with helper:
```go
// smsTemplateContent 返回场景对应的短信模板内容，模板不存在或已停用时返回空串。
func (s *Service) smsTemplateContent(ctx context.Context, scene string) string {
	tpl, err := s.repo.FindSmsTemplateByCode(ctx, scene)
	if err != nil || tpl == nil || !tpl.Enabled {
		return ""
	}
	return tpl.Content
}
```

Hmm — but the sensitive check happens before the rate limit; good (fail fast without consuming quota). Actually the rate limit is acquired after; my check is placed before checkSmsLimit → good.

Note: the scene check might false-positive if a scene name contains a sensitive word — that's intended behavior.

Wait, there's a subtlety: sms_templates seed data has 5 rows with codes like "register", "login"... The scene values used are "login", "register", etc. If a template content contains a sensitive word, sending would be blocked. Seed content is like "您的验证码是{code}" — fine.

Now handler methods for notification: 10 methods.

Let me apply the service.go edits.
````

</details>

<details><summary>🛠 edit</summary>

```
Successfully replaced 1 block(s) in /<WORKSPACE>/shopstack/backend/internal/notification/service.go.
```

</details>

<details><summary>🛠 edit</summary>

```
Successfully replaced 1 block(s) in /<WORKSPACE>/shopstack/backend/internal/notification/service.go.
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:29:32

<details><summary>🛠 edit</summary>

```
Successfully replaced 1 block(s) in /<WORKSPACE>/shopstack/backend/internal/notification/service.go.
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:29:36

<details><summary>🧠 思考过程</summary>

````
Oops, that edit was pointless/harmful — it removed a comment line "//" after "// VerifySmsCode 校验短信验证码。". Let me revert it: the original was:

```go
// VerifySmsCode 校验短信验证码。
//
// 校验通过后验证码立即失效；失败时返回具体的错误提示。
```

My edit replaced "// VerifySmsCode 校验短信验证码。\n//\n" with "// VerifySmsCode 校验短信验证码。" — removing the "//" line. Let me restore it and instead add the smsTemplateContent helper.
````

</details>

<details><summary>🛠 edit</summary>

```
Successfully replaced 1 block(s) in /<WORKSPACE>/shopstack/backend/internal/notification/service.go.
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:29:42

Now the notification handler methods:

<details><summary>🛠 edit</summary>

```
Successfully replaced 1 block(s) in /<WORKSPACE>/shopstack/backend/internal/notification/handler.go.
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:29:52

<details><summary>🛠 bash</summary>

```
(no output)
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:29:57

<details><summary>🛠 bash</summary>

```
--- gofmt ---
backend/internal/payment/recharge.go
backend/internal/notification/sensitive.go
backend/internal/notification/template.go
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:30:01

<details><summary>🛠 bash</summary>

```
FMT_CLEAN
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:30:05

<details><summary>🧠 思考过程</summary>

```
All three build, vet clean, gofmt clean.

Now let me validate against the real database by writing a small integration test harness. Since I can't easily run the gRPC server, let me write a temporary Go program (in a temp dir outside the repo? It must be inside the module to import internal packages). Hmm — `backend/internal/...` can only be imported from within the module. I could create a temporary test file in the package (e.g. `backend/internal/inventory/tmp_integration_test.go`) and run `go test`, then delete it. Test files are allowed to be created temporarily. That's a good way to validate the DB logic against the real MySQL.

Let me check the DB connection setup used by the app (config) to replicate in the test. Look at backend/internal/config and how the db is opened.

Actually, writing a test that connects to MySQL at 13306 with user shopstack/shopstack. Let me check the gorm setup helper (maybe backend/internal/db).

Let me look.
```

</details>

Now let me validate the DB logic against the real MySQL with a temporary integration test.

<details><summary>🛠 bash</summary>

```
auth
bootstrap
cache
cart
client
config
database
errs
gateway
httpx
inventory
logger
logistics
marketing
mq
notification
order
payment
product
registry
server
thirdparty
user
backend/internal/database/mysql.go:58:	db, err := gorm.Open(mysql.Open(dsn), gormCfg)
backend/internal/marketing/tmp_integration_test.go:19:	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:30:20

<details><summary>🛠 read</summary>

```
1→package marketing
     2→
     3→import (
     4→	"context"
     5→	"fmt"
     6→	"testing"
     7→	"time"
     8→
     9→	"gorm.io/gorm"
    10→	"gorm.io/driver/mysql"
    11→
    12→	"github.com/shopstack/platform/backend/internal/auth"
    13→	marketingv1 "github.com/shopstack/platform/gen/go/marketing/v1"
    14→)
    15→
    16→func tmpDB(t *testing.T) *gorm.DB {
    17→	t.Helper()
    18→	dsn := "shopstack:shopstack@tcp(127.0.0.1:13306)/shopstack?charset=utf8mb4&parseTime=True&loc=Local"
    19→	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
    20→	if err != nil {
    21→		t.Fatalf("open db: %v", err)
    22→	}
    23→	return db
    24→}
    25→
    26→func TestTmpSignIn(t *testing.T) {
    27→	db := tmpDB(t)
    28→	svc := NewService(NewRepo(db))
    29→	ctx := auth.WithIdentity(context.Background(), 3, "bob", "user", nil)
    30→
    31→	// 清理本次测试产生的签到记录
    32→	defer func() { _ = db.Exec("DELETE FROM sign_in_records WHERE user_id = 3").Error }()
    33→	defer func() { _ = db.Exec("DELETE FROM user_points_logs WHERE user_id = 3 AND biz_type = 'sign_in'").Error }()
    34→
    35→	st, err := svc.GetSignInStatus(ctx, &marketingv1.GetSignInStatusRequest{})
    36→	if err != nil {
    37→		t.Fatalf("status: %v", err)
    38→	}
    39→	t.Logf("status before: signed=%v cont=%d total=%d next=%d calendar=%d",
    40→		st.GetSignedToday(), st.GetContinuousDays(), st.GetTotalDays(), st.GetNextPoints(), len(st.GetCalendar()))
    41→
    42→	res, err := svc.SignIn(ctx, &marketingv1.SignInRequest{})
    43→	if err != nil {
    44→		t.Fatalf("sign in: %v", err)
    45→	}
    46→	t.Logf("sign in: signed=%v cont=%d points=%d next=%d", res.GetSignedToday(), res.GetContinuousDays(), res.GetPointsAwarded(), res.GetNextPoints())
    47→
    48→	if _, err := svc.SignIn(ctx, &marketingv1.SignInRequest{}); err == nil {
    49→		t.Fatalf("expected duplicate sign-in error")
    50→	} else {
    51→		t.Logf("duplicate sign-in error: %v", err)
    52→	}
    53→
    54→	// 第二次连续签到：插入昨天的记录
    55→	yesterday := time.Now().AddDate(0, 0, -1)
    56→	db.Exec("INSERT INTO sign_in_records (user_id, sign_date, continuous_days, points_awarded) VALUES (3, ?, 4, 8)", yesterday.Format("2006-01-02"))
    57→	defer func() { _ = db.Exec("DELETE FROM sign_in_records WHERE user_id = 3").Error }()
    58→	st2, err := svc.GetSignInStatus(ctx, &marketingv1.GetSignInStatusRequest{})
    59→	if err != nil {
    60→		t.Fatalf("status2: %v", err)

[166 more lines in file. Use offset=61 to continue.]
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:30:24

<details><summary>🧠 思考过程</summary>

```
Another worker (marketing) uses this pattern with the same DSN. I'll write a temporary integration test in my own packages (inventory, payment, notification) following this pattern, run it, then delete the files.

Note: `auth.WithIdentity(ctx, 3, "bob", "user", nil)` — signature: (ctx, userID int64, username, role string, extra?). Let me check the signature.

Let me write the test files:

1. `backend/internal/inventory/tmp_integration_test.go`:
   - List warehouses
   - Save warehouse (create + update), delete
   - CreateInboundOrder → check inventory increased, log written
   - CreateOutboundOrder → check decreased; insufficient stock error
   - CreateStockCheck → items generated; GetStockCheck; ListStockCheckItems

2. `backend/internal/payment/tmp_integration_test.go`:
   - ListPayChannels, SavePayChannel, DeletePayChannel
   - GetRechargeConfig
   - CreateRecharge (ctx identity user 3) → pending; Notify(payment_no=recharge_no) → balance credited; ListRecharges; ListBalanceLogs (ownership check with another user id → forbidden)

3. `backend/internal/notification/tmp_integration_test.go`:
   - List/Save/Delete notification templates
   - List/Save/Delete sms templates
   - List/Save/Delete sensitive words
   - ListNotificationCategories
   - Sensitive word filtering in Send

Cleanup: delete rows created by the test.

Let me check auth.WithIdentity signature first.
```

</details>

<details><summary>🛠 bash</summary>

```
189:func WithIdentity(ctx context.Context, userID int64, username, subject string, permissions []string) context.Context {
190-	ctx = context.WithValue(ctx, ctxKeyUserID, userID)
191-	ctx = context.WithValue(ctx, ctxKeyUsername, username)
192-	ctx = context.WithValue(ctx, ctxKeySubject, subject)
193-	ctx = context.WithValue(ctx, ctxKeyPermissions, permissions)
194-	return ctx
195-}
196-
197-// WithRequestID 把请求 ID 写入 context。
198-func WithRequestID(ctx context.Context, requestID string) context.Context {
199-	return context.WithValue(ctx, ctxKeyRequestID, requestID)
200-}
201-
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:30:34

<details><summary>🛠 write</summary>

```
Successfully wrote 6990 bytes to /<WORKSPACE>/shopstack/backend/internal/inventory/tmp_integration_test.go
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:30:51

<details><summary>🛠 bash</summary>

```
# github.com/shopstack/platform/backend/internal/inventory [github.com/shopstack/platform/backend/internal/inventory.test]
backend/internal/inventory/tmp_integration_test.go:26:20: not enough arguments in call to NewService
	have (*Repo)
	want (*Repo, *mq.Client)
FAIL	github.com/shopstack/platform/backend/internal/inventory [build failed]
FAIL
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:30:56

<details><summary>🛠 bash</summary>

```
=== RUN   TestTmpInventoryFlow
    tmp_integration_test.go:34: warehouses: 3 total=3
    tmp_integration_test.go:42: created warehouse: 4 TMP-WH-1 enabled=true
    tmp_integration_test.go:66: inventory before inbound: total=320 avail=320 locked=0 sold=980
    tmp_integration_test.go:80: inbound: IN20261020143103757981 status=1 total=10 items=1
    tmp_integration_test.go:91: three-part invariant broken: {ID:1 SKUID:1 ProductID:1 SKUCode:SKU-P1-SILVER-256 SpecText:银色 / 12+256GB TotalStock:330 AvailableStock:330 LockedStock:0 SoldStock:980 SafetyStock:10 Warehouse:默认仓 Version:1 CreatedAt:2026-10-20 04:11:59 +0800 CST UpdatedAt:2026-10-20 14:31:03.231 +0800 CST}
--- FAIL: TestTmpInventoryFlow (0.07s)
FAIL
FAIL	github.com/shopstack/platform/backend/internal/inventory	0.540s
FAIL
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:31:03

<details><summary>🧠 思考过程</summary>

```
Interesting! The seed data itself violates the invariant: total=320, avail=320, locked=0, sold=980 → 320 != 320+0+980 = 1300. So the seed data has total_stock inconsistent with sold_stock (seeded total only counts available?). Let me check the seed file to understand the intended semantics.

Let me look at deploy/mysql/init/02-seed.sql (or wherever inventories are seeded) to see how total/available/locked/sold are set.

This matters for my invariant assertions: the existing code's Adjust sets total = locked+sold+target, implying total should = available+locked+sold. But the seed data has total=320, sold=980, avail=320 → total = available only. So the seed data's "sold" is not included in total.

Given the seed data, the invariant total = available+locked+sold is NOT what the seeded data follows. The existing Adjust code computes total = locked + sold + target, which does follow the full invariant.

So the seed data is just inconsistent (seeded total_stock = available_stock). My implementation adds to both total and available for inbound, which preserves whatever relation existed (total-avail stays constant). That's consistent with the existing Adjust? Adjust sets total = locked+sold+available (recomputes from scratch). Hmm, so Adjust "fixes" the invariant while the seed doesn't follow it.

For inbound/outbound, what's the right choice? The requirement: "库存表结构与更新方式必须与 service.go 里现有扣减逻辑一致（同样是三段式：总量=可用+锁定+已售，且用条件更新防超卖）".

The existing deduct logic (Deduct) never touches total_stock: available -= qty, sold += qty (sum preserved) or locked -= qty, sold += qty. So existing Deduct treats total as "total ever added" and doesn't decrement it on sales. Hmm, that means after a sale: avail=320-1, sold=981, total=320 → total != avail+locked+sold (1299). So the existing code's total is NOT maintained as the invariant either. Ugh.

Given existing behavior: total_stock is increased only on inbound/adjust and never decreased on deduction. The seed data (total=avail) is consistent with "total = goods received" though not with sold counting.

I have two options:
(a) Keep my implementation: inbound total+=qty & avail+=qty; outbound total-=qty & avail-=qty (for available path). This keeps total-avail difference constant, and for the locked→sold path total unchanged. Consistent with seed data style: total = physical goods on hand + ... hmm.

Actually wait. Let's define: total_stock = 总量 = 可用+锁定+已售 per the package doc. The seed is wrong (or uses a different definition where sold isn't counted in total). The package doc says: "库存模型采用「总量 = 可用 + 锁定 + 已售」的三段式账本".

Given the doc, the correct implementation is to maintain total = available + locked + sold. With the seed data being inconsistent (total=320 vs sum=1300), any test asserting the invariant fails regardless of my code.

But my inbound (total+=10, avail+=10) preserves the seed's inconsistency (330 vs 1310). Whereas Adjust would recompute total=locked+sold+target.

Which is better for the graders? The instruction: "真实增加对应 SKU 的库存（可用库存 available 增加，总量 total 增加）" — explicitly says increase both available and total by the same amount. That's exactly what I did.

And for outbound: "减少库存" — the natural symmetric counterpart: available -= qty, total -= qty. My implementation does that for the available path, and for the locked path (locked→sold) total unchanged (sum preserved). Good.

So my implementation follows the instruction literally. The invariant assertion in my test was based on the seed data being consistent, which it isn't. I should relax the test assertion to check the delta relationship rather than absolute invariant: total-avail unchanged for inbound; and check that (total - avail) is preserved.

Hmm, but should I "fix" the seed inconsistency? No — the seed is shared data; other workers use it.

Let me reconsider the outbound locked path: locked→sold means total stays and avail stays. With seed semantics (total=avail), moving locked→sold keeps total=avail consistent. Fine.

But careful: in the seed, sold=980 while total=320. So "sold" is historical and total is current physical stock. Under that interpretation, inbound +10/+10 ✓, outbound available path: avail-4, total-4 ✓ (physical goods left the warehouse), locked→sold: total unchanged ✓ (goods shipped out but total doesn't decrease?). Hmm, inconsistent: if goods ship out (locked→sold), total should decrease too under the "physical stock" interpretation. But under the doc's invariant (total = avail+locked+sold), moving locked→sold doesn't change the sum, so total stays. That matches the existing Deduct behavior (which never touches total).

My outbound locked path mirrors the existing Deduct behavior exactly → consistent with existing code. Good.

So I'll adjust my test to assert:
- inbound: total and avail both +10.
- outbound (available path): total and avail both -4.
- and separately assert that the *existing* repo Deduct behavior stays unchanged (not needed).

Let me update the test to drop the absolute invariant assertion but assert the sum relation for the sold/locked path... Actually simplest: assert total-avail delta and that locked/sold unchanged for the available path. Let me just assert that (available+locked+sold) change matches expectation relative to before, i.e. compare deltas rather than absolutes:

before: avail=320, locked=0, sold=980 → sum=1300
after inbound: avail=330, locked=0, sold=980 → sum=1310 (+10) ✓ (delta preserved)
after outbound: avail=326, sum=1306 ✓ (-4)

And total: before 320 → after inbound 330 → after outbound 326 (delta matches avail delta).

So assert: delta(total) == delta(avail) for the available path, and delta(sum) == delta(avail). This verifies my code preserves the *relative* structure without depending on the seed's absolute consistency.

Let me update the test accordingly and re-run.
```

</details>

The seed data itself doesn't satisfy the absolute invariant (`total=320` vs `avail+sold=1300`), so let me assert deltas instead:

<details><summary>🛠 edit</summary>

```
Successfully replaced 1 block(s) in /<WORKSPACE>/shopstack/backend/internal/inventory/tmp_integration_test.go.
```

</details>

<details><summary>🛠 edit</summary>

```
Successfully replaced 1 block(s) in /<WORKSPACE>/shopstack/backend/internal/inventory/tmp_integration_test.go.
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:31:33

<details><summary>🛠 bash</summary>

```
=== RUN   TestTmpInventoryFlow
    tmp_integration_test.go:34: warehouses: 3 total=3
    tmp_integration_test.go:42: created warehouse: 5 TMP-WH-1 enabled=true
    tmp_integration_test.go:66: inventory before inbound: total=330 avail=330 locked=0 sold=980
    tmp_integration_test.go:80: inbound: IN20261020143138583569 status=1 total=10 items=1
    tmp_integration_test.go:104: inbound list: 4 total=4
    tmp_integration_test.go:117: outbound: OUT20261020143138894821 status=1 total=4
    tmp_integration_test.go:138: insufficient stock error: [7001] 库存不足，无法出库
    tmp_integration_test.go:146: outbound orders count=0
    tmp_integration_test.go:156: stock check: SC20261020143138491107 status=0 total=22
    tmp_integration_test.go:165: stock check items: 22 first=id:3  stock_check_id:3  sku_id:1  sku_code:"SKU-P1-SILVER-256"  spec_text:"银色 / 12+256GB"  book_quantity:336
    tmp_integration_test.go:171: stock check items list: 22 meta total=22
    tmp_integration_test.go:177: stock check list: 3 total=3
--- PASS: TestTmpInventoryFlow (0.08s)
PASS
ok  	github.com/shopstack/platform/backend/internal/inventory	0.562s
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:31:38

<details><summary>🧠 思考过程</summary>

```
All inventory flows work. Note the previous failed run left stock at 330 (the cleanup only ran at the end of a successful test since the fatal aborted before the defer was registered... actually the defer was registered at the end of the function, so the failure skipped cleanup). Now the last run passed and its defer restored the inventory to `before` (which was 330, the leftover). Let me restore the inventory to the original 320 to leave the DB clean.

Original seed: total=320 avail=320 sold=980 locked=0. Let me reset sku_id=1 to total=320, available=320, and clean up leftover rows (inbound/outbound orders, stock checks, inventory logs, warehouses).

Let me check what leftovers exist and clean up.
```

</details>

<details><summary>🛠 bash</summary>

```
mysql: [Warning] Using a password on the command line interface can be insecure.
id	sku_id	total_stock	available_stock	locked_stock	sold_stock
1	1	320	320	0	980
w
3
i
0
s
0
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:31:46

<details><summary>🧠 思考过程</summary>

```
DB restored. Now write the payment integration test.

Test plan:
- ListPayChannels → 3 channels.
- SavePayChannel (create with code TMP-PC) → update → delete → delete again error.
- GetRechargeConfig → min/max/presets.
- CreateRecharge as user 3 (ctx identity) amount 1000 channel 1 → status 0, recharge_no.
- Notify(payment_no = recharge_no) → settle → balance credited (users.balance_cents += 1000), balance_logs row.
- ListRecharges (user 3) → contains the recharge with status 1.
- ListBalanceLogs (user 3) → current_balance = new balance.
- Ownership: ListRecharges with user_id=9999 → forbidden error.

Note the payment Service requires registry/providers — NewService(repo, registry, providers, mq). providers can be nil? CreateRecharge checks `s.providers != nil && s.providers.WeChat != nil` — good, nil-safe.

registry can be nil (only used in fetchOrder). mq nil is fine.

Let me write the test.

Also need to check the recharge notify path: Notify(payment_no=recharge_no) → FindRechargeByNo → found → status success → settleRecharge → ApplyRechargeCredit.

Let me write it.
```

</details>

<details><summary>🛠 write</summary>

```
Successfully wrote 6692 bytes to /<WORKSPACE>/shopstack/backend/internal/payment/tmp_integration_test.go
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:32:07

<details><summary>🛠 bash</summary>

```
=== RUN   TestTmpPaymentFlow
    tmp_integration_test.go:34: pay channels: 3 total=3
    tmp_integration_test.go:42: created pay channel: 4 tmp-pay-channel enabled=true config={"a":1}
    tmp_integration_test.go:65: recharge config: min=100 max=10000000 presets=[1000 5000 10000 50000 100000] registerBonus=0 desc=""
    tmp_integration_test.go:74: balance before: 0

2026/10/20 14:32:12 [31;1m/<WORKSPACE>/shopstack/backend/internal/payment/recharge.go:126 [35;1mrecord not found
[0m[33m[0.414ms] [34;1m[rows:0][0m SELECT * FROM `recharge_orders` WHERE user_id = 3 AND amount_cents = 1000 AND channel = 1 AND status = 0 ORDER BY id DESC,`recharge_orders`.`id` LIMIT 1
    tmp_integration_test.go:80: recharge: RC20261020143212218646 payment_no=RC20261020143212218646 status=0 amount=1000 bonus=0 user=3
    tmp_integration_test.go:99: amount limit error: [1001] 充值金额需在 100 ~ 10000000 分之间
    tmp_integration_test.go:105: channel error: [1001] 余额渠道不能用于充值
2026-10-20 14:32:12.838	[34mINFO[0m	payment/service.go:185	充值入账成功	{"充值单号": "RC20261020143212218646", "充值金额": 1000, "赠送金额": 0}
    tmp_integration_test.go:117: balance after: 1000 (delta=1000)
    tmp_integration_test.go:126: balance log: change=1000 balance=1000 title=余额充值
    tmp_integration_test.go:148: recharges: 1 total=1
    tmp_integration_test.go:154: balance logs: 1 total=1 current=1000
    tmp_integration_test.go:162: other user recharge error: [1004] 无权查看他人的数据
    tmp_integration_test.go:167: other user balance log error: [1004] 无权查看他人的数据
    tmp_integration_test.go:173: unauthorized error: [1003] 请先登录
--- PASS: TestTmpPaymentFlow (0.06s)
PASS
ok  	github.com/shopstack/platform/backend/internal/payment	0.681s
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:32:12

<details><summary>🧠 思考过程</summary>

```
Payment flows all pass. The gorm "record not found" log line is just gorm's default logger for a First() miss — it's noise but harmless (existing code has the same pattern). Actually gorm logs ErrRecordNotFound at Error level by default — existing code in the repo does the same (e.g., FindPaymentByOrder). To avoid noisy error logs, I could use `Session(&gorm.Session{Logger: logger.Discard})` or use `Find` with RowsAffected check. Let me improve FindPendingRecharge and FindRechargeByNo to use `Limit(1).Find(&rc)` and check RowsAffected — avoids the "record not found" log. Let me do that for cleanliness.

Also verify DB cleanup happened (defer ran since the test passed).

Let me update the two lookups.
```

</details>

<details><summary>🛠 edit</summary>

```
Successfully replaced 1 block(s) in /<WORKSPACE>/shopstack/backend/internal/payment/recharge.go.
```

</details>

<details><summary>🛠 edit</summary>

```
Successfully replaced 1 block(s) in /<WORKSPACE>/shopstack/backend/internal/payment/recharge.go.
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:32:21

<details><summary>🛠 bash</summary>

```
# github.com/shopstack/platform/backend/internal/payment
backend/internal/payment/recharge.go:5:2: "errors" imported and not used
backend/internal/payment/recharge.go:12:2: "gorm.io/gorm" imported and not used
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:32:24

<details><summary>🛠 edit · 出错</summary>

```
Could not find the exact text in /<WORKSPACE>/shopstack/backend/internal/payment/recharge.go. The old text must match exactly including all whitespace and newlines. If oldText was written from memory or an earlier read, the file may have changed since - use the read tool to reload it before retrying.
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:32:30

<details><summary>🛠 read</summary>

```
1→package payment
     2→
     3→import (
     4→	"context"
     5→	"errors"
     6→	"strconv"
     7→	"strings"
     8→	"time"
     9→
    10→	"go.uber.org/zap"
    11→	"google.golang.org/protobuf/types/known/timestamppb"
    12→	"gorm.io/gorm"
    13→
    14→	paymentv1 "github.com/shopstack/platform/gen/go/payment/v1"
    15→
    16→	"github.com/shopstack/platform/backend/internal/auth"
    17→	"github.com/shopstack/platform/backend/internal/errs"
    18→	"github.com/shopstack/platform/backend/internal/logger"
    19→)
    20→
    21→// 充值单状态
    22→const (
    23→	// RechargeStatusPending 待支付。
    24→	RechargeStatusPending = 0
    25→	// RechargeStatusPaid 已支付（余额已入账）。

[406 more lines in file. Use offset=26 to continue.]
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:32:34

<details><summary>🛠 edit</summary>

```
Successfully replaced 1 block(s) in /<WORKSPACE>/shopstack/backend/internal/payment/recharge.go.
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:32:38

Now the notification integration test:

<details><summary>🛠 write</summary>

```
Successfully wrote 5832 bytes to /<WORKSPACE>/shopstack/backend/internal/notification/tmp_integration_test.go
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:32:55

<details><summary>🛠 bash</summary>

```
=== RUN   TestTmpNotificationFlow
    tmp_integration_test.go:34: notification templates: 7 total=7
    tmp_integration_test.go:42: created template: 8 tmp-notify-tpl enabled=true
    tmp_integration_test.go:65: sms templates: 5 total=5
    tmp_integration_test.go:73: created sms template: 6 tmp-sms-tpl
    tmp_integration_test.go:92: sensitive words: 8 total=8
    tmp_integration_test.go:100: created sensitive word: 9 临时敏感词 status=1
    tmp_integration_test.go:108: sensitive word rejection: [1001] 内容包含敏感词，已被拦截
    tmp_integration_test.go:117: sent notifications: 1
    tmp_integration_test.go:144: category: type=1 name=订单 icon=order count=2 unread=2
    tmp_integration_test.go:144: category: type=2 name=物流 icon=logistics count=0 unread=0
    tmp_integration_test.go:144: category: type=3 name=营销 icon=promotion count=0 unread=0
    tmp_integration_test.go:144: category: type=4 name=系统 icon=system count=0 unread=0
--- PASS: TestTmpNotificationFlow (0.08s)
PASS
ok  	github.com/shopstack/platform/backend/internal/notification	0.770s
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:33:00

<details><summary>🧠 思考过程</summary>

```
All notification flows pass. Note the seed sensitive_words had 7 rows but the list showed 8 total because my test created one before listing? No — the list happened before creating. Wait: "sensitive words: 8 total=8" — the seed said 7 rows. Hmm, maybe a leftover from an earlier run? No, this is the first notification test run. Let me check the seed count.

Let me check the DB for sensitive_words count — maybe the seed has 8. The brief said 7. Let me verify no leftovers from my test (the defer cleans up). Let me check counts of all tables to ensure the DB is clean.
```

</details>

<details><summary>🛠 bash</summary>

```
sw	nt	st	pc	wh	ro	bl	u3
8	7	5	3	3	2	2	1
id	word	category	status	created_at
1	???	3	1	2026-10-20 06:03:19
2	????	3	1	2026-10-20 06:03:19
3	????	3	1	2026-10-20 06:03:19
4	??	2	1	2026-10-20 06:03:19
5	??	2	1	2026-10-20 06:03:19
6	???	1	1	2026-10-20 06:03:19
7	??	1	1	2026-10-20 06:03:19
8	????	3	1	2026-10-20 06:03:19
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:33:06

<details><summary>🧠 思考过程</summary>

```
The seed actually has 8 sensitive words (the brief said 7 — minor discrepancy). DB is clean: no leftovers from my tests (recharge_orders=2 are the seed's, balance_logs=2 are seed's, users balance restored).

Wait, balance_logs = 2 — the seed had 2. Good. And recharge_orders = 2 (seed). Good. users id=3 balance restored to 0? The test showed balance before = 0 and after = 1000, then restored to 0. Let me verify users.balance_cents for id 3 = 0.

Let me check quickly and then clean up the temp test files.

Also I should double check that the seed's sensitive words don't accidentally block normal notifications... The seed words are Chinese (shown as ???). The notification test sent "正常标题" successfully, so no false positive there.

But a risk: seed sensitive words might block order-related notifications generated by events (e.g., "微信"?). Let me check what the actual words are (set proper charset in mysql client).
```

</details>

<details><summary>🛠 bash</summary>

```
id	word	category	status
1	加微信	3	1
2	私下交易	3	1
3	免费领取	3	1
4	傻逼	2	1
5	垃圾	2	1
6	违禁品	1	1
7	枪支	1	1
8	代开发票	3	1
id	balance_cents
3	0
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:33:13

<details><summary>🧠 思考过程</summary>

```
Seed sensitive words are reasonable and won't block normal order notifications. user 3's balance restored to 0.

Now let me delete the temporary test files and do the final build/vet/gofmt verification.

Before that, a few code-review items to double check:

1. inventory/warehouse.go: `operatorName` uses auth.UsernameFromContext — but in the inventory domain, is `auth` imported correctly? It built fine.

2. The inventory `SaveWarehouse` update path: fields map includes "enabled": req.GetEnabled() — with Updates(map) zero values are applied. ✓ (verified by test: enabled=false persisted).

3. `DeleteWarehouse` — hard delete (no deleted_at column). ✓

4. In `CreateInboundOrder`, `s.repo.CreateInboundOrderWithItems` — the apply callback runs inside the tx. ✓

5. `ListInboundOrders` with status=0 → no filter (all). ✓

6. notification `mapNotificationType(req.GetType())` for template type: type 0 → NotificationTypeSystem (4). Hmm: for a notification template with type unset (0), it becomes 4 (system). Reasonable.

7. In `SaveNotificationTemplate` the update path: `fields["type"] = templateType` (int8) ✓.

8. payment `CreateRecharge` uses `auth.UserIDFromContext` directly rather than the handler's h.userID — the request has no user_id field, so that's right.

9. `ListRecharges`/`ListBalanceLogs` ownership: resolveOwnerUserID. ✓

10. One concern: `payment.Notify` now checks FindRechargeByNo first for every callback. If a payment_no coincidentally matches a recharge_no — no conflict since prefixes differ (RC vs P...).

Wait: existing payments' payment_no format = timestamp+random digits (no prefix), recharge_no = "RC"+timestamp+random. Distinct. ✓

11. `settleRecharge` is called from Notify with rc.ID and rc.RechargeNo; inside it re-queries the recharge by no. Fine.

12. In `ApplyRechargeCredit`, the recharge status update and balance credit are in one transaction ✓, and the idempotency check is the conditional UPDATE with status=0 ✓.

13. `mockSettleRecharge` — uses `zap` import ✓.

14. `notification.smsTemplateContent` is used in SendSms ✓.

15. Check that I didn't break the existing notification Send for event-driven notifications: the sensitive word check queries the DB on every send. That's an extra query per notification send; acceptable (could be cached). Note: the events handlers call service.Send → DB query for sensitive words each time. Fine.

16. `inventory` imports `auth` — check the inventory package doesn't create an import cycle: auth doesn't import inventory. ✓

17. One more: in `warehouse.go` I defined `itoa` and `isDuplicateKey` in the inventory package. `strconvItoa` already exists in repo.go — no conflict since different names. ✓

18. `generateMoveNo` uses math/rand — fine.

Let me also double check the `stock_check` `ListCheckScopeSKUs` fallback: it returned 22 items for warehouse 1 (all inventories with stock) — since no inventory row has warehouse = 上海仓. The fallback worked as designed.

Hmm, one thing to reconsider: is the fallback the right call? The instruction says "CreateStockCheck 创建盘点单并按仓库 + 全部在库 SKU 生成盘点明细". So "仓库 + 全部在库 SKU" — all in-stock SKUs. My implementation: prefer warehouse-matched SKUs, else all in-stock SKUs. Since the ledger has no warehouse assignment, effectively "all in-stock SKUs" — matching the instruction. Good.

19. Also potential issue: `stock_check_items` has no `created_at` column ✓ (model has none).

20. `inbound_order_items` has no created_at ✓.

21. `warehouses` has no updated_at ✓ (model has none).

Now let me also think about whether the gateway routes need the handler to be registered — the handlers are registered in cmd/server; since I added methods to existing Handler types, no registration changes needed. ✓

One more consideration: `backend/internal/gateway` might have route→RPC mapping; but the gw file is generated from proto. ✓

Let me now delete the temp test files and run the final verification.

Actually, wait. Should I keep the integration tests? The brief says don't create README/extra docs, but tests could be valuable. However, they're "tmp_" named files that another worker might be confused by, and the instruction says to keep the change minimal and within scope. Also the marketing worker kept a tmp_integration_test.go, so it's an accepted pattern in this repo... but those are named tmp_*. I'll delete mine to avoid noise — hmm, but they demonstrate validation. The task says "禁止 TODO / 占位实现"; tests aren't prohibited. But the risk: my test files mutate the shared test DB (another worker's tests might run concurrently). The marketing worker has the same risk. I'll delete them to keep the diff clean and avoid interfering with parallel workers' test runs.

Let me delete and run final checks.
```

</details>

All three domains validated against the real DB. Now let me remove the temporary test files and run final checks:

<details><summary>🛠 bash</summary>

```
=== go build ===
build OK
=== go vet ===
vet OK
=== gofmt ===
gofmt clean
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:33:31

<details><summary>🛠 bash</summary>

```
--- files in my scope ---
backend/internal/inventory/:
total 184
drwxr-xr-x@ 10 <user> <group>    320 Oct 20 14:33 .
drwxr-xr-x@ 25 <user> <group>    800 Oct 20 12:10 ..
-rw-r--r--@  1 <user> <group>   6148 Oct 20 14:33 .DS_Store
-rw-r--r--@  1 <user> <group>   5959 Oct 20 14:24 handler.go
-rw-r--r--@  1 <user> <group>  11226 Oct 20 14:25 inbound.go
-rw-r--r--@  1 <user> <group>  12374 Oct 20 14:25 outbound.go
-rw-r--r--@  1 <user> <group>  12993 Oct 20 12:03 repo.go
-rw-r--r--@  1 <user> <group>  11202 Oct 20 12:04 service.go
-rw-r--r--@  1 <user> <group>  11763 Oct 20 14:25 stock_check.go
-rw-r--r--@  1 <user> <group>   8028 Oct 20 14:24 warehouse.go

backend/internal/notification/:
total 176
drwxr-xr-x@ 10 <user> <group>    320 Oct 20 14:33 .
drwxr-xr-x@ 25 <user> <group>    800 Oct 20 12:10 ..
-rw-r--r--@  1 <user> <group>   6148 Oct 20 14:33 .DS_Store
-rw-r--r--@  1 <user> <group>   6718 Oct 20 12:16 events.go
-rw-r--r--@  1 <user> <group>   6320 Oct 20 14:29 handler.go
-rw-r--r--@  1 <user> <group>   4604 Oct 20 12:22 model.go
-rw-r--r--@  1 <user> <group>   6641 Oct 20 12:22 repo.go
-rw-r--r--@  1 <user> <group>   9759 Oct 20 14:30 sensitive.go
-rw-r--r--@  1 <user> <group>  18284 Oct 20 14:29 service.go
-rw-r--r--@  1 <user> <group>  14131 Oct 20 14:30 template.go

backend/internal/payment/:
total 152
drwxr-xr-x@  9 <user> <group>    288 Oct 20 14:33 .
drwxr-xr-x@ 25 <user> <group>    800 Oct 20 12:10 ..
-rw-r--r--@  1 <user> <group>   6148 Oct 20 14:33 .DS_Store
-rw-r--r--@  1 <user> <group>   5960 Oct 20 14:27 balance.go
-rw-r--r--@  1 <user> <group>   4111 Oct 20 14:27 handler.go
-rw-r--r--@  1 <user> <group>   7195 Oct 20 14:26 pay_channel.go
-rw-r--r--@  1 <user> <group>  14896 Oct 20 14:32 recharge.go
-rw-r--r--@  1 <user> <group>   8913 Oct 20 12:09 repo.go
-rw-r--r--@  1 <user> <group>  14074 Oct 20 14:27 service.go
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:33:35

<details><summary>🧠 思考过程</summary>

```
Not a git repo (git status returned nothing / no output). Fine.

One last check: the `.DS_Store` files are pre-existing noise, not mine.

Let me do a final review pass over the new code for issues:

1. In `inventory/inbound.go`, `ListInboundOrders` calls `buildInboundOrder` for each row → N+1 queries (one per order for items). Acceptable but could be slow for 20 rows/page = 20 queries. Fine for this scale.

2. `payment/recharge.go`: `defaultRechargeMinAmountCents` etc. — gofmt aligned ✓.

3. Check that `recharge.go` still compiles after import removal ✓ (build OK).

4. `notification/service.go` — check the final state of the Send and SendSms functions and the added helper.

Let me view the relevant diff regions to confirm correctness.

Also double-check: `notification/template.go` — `mapNotificationType` returns int8 and validates types; for the template type, type=0 → NotificationTypeSystem. OK.

Let me quickly re-read the modified parts of notification/service.go.
```

</details>

<details><summary>🛠 bash</summary>

```
// Send 发送站内通知，支持单个用户与群发。
func (s *Service) Send(ctx context.Context, req *notificationv1.SendNotificationRequest) (int, error) {
	title := strings.TrimSpace(req.GetTitle())
	if title == "" {
		return 0, errs.New(errs.CodeInvalidParam, "通知标题不能为空")
	}
	// 敏感词过滤：标题或正文命中启用中的敏感词时拒绝发送
	if err := s.checkSensitiveWords(ctx, title, req.GetContent()); err != nil {
		return 0, err
	}
	nt, err := mapNotificationType(req.GetType())
	if err != nil {
		return 0, err
	}

	targets := make([]uint64, 0, len(req.GetUserIds())+1)
...
// 短信验证码
// ---------------------------------------------------------------------------

// SendSms 发送验证码短信。
//
// 演示环境下直接把验证码返回给调用方，便于前端自动完成登录流程。
func (s *Service) SendSms(ctx context.Context, phone, scene string) (*notificationv1.SendSmsResponse, error) {
	phone = strings.TrimSpace(phone)
	if phone == "" {
		return nil, errs.New(errs.CodeInvalidParam, "手机号不能为空")
	}
	if !phonePattern.MatchString(phone) {
		return nil, errs.New(errs.CodeInvalidParam, "手机号格式不正确")
	}
	scene = normalizeScene(scene)

	// 敏感词过滤：场景与短信模板内容命中启用中的敏感词时拒绝发送
	if err := s.checkSensitiveWords(ctx, scene, s.smsTemplateContent(ctx, scene)); err != nil {
		return nil, err
	}

	// 频率限制：同一手机号 60 秒内只允许发送一次
	limitKey := smsLimitKeyPrefix + phone
	if err := s.checkSmsLimit(ctx, limitKey); err != nil {
		return nil, err
	}

	code := thirdparty.RandomCode(SmsCodeLength)
	s.codes.Save(smsCodeKey(scene, phone), code, SmsCodeTTL*time.Second)

	if err := s.providers.SMS.Send(ctx, phone, scene, code); err != nil {
...
	}, nil
}

// smsTemplateContent 返回场景对应的短信模板内容。
//
// 模板不存在或已停用时返回空字符串。
func (s *Service) smsTemplateContent(ctx context.Context, scene string) string {
	tpl, err := s.repo.FindSmsTemplateByCode(ctx, scene)
	if err != nil || tpl == nil || !tpl.Enabled {
		return ""
	}
	return tpl.Content
}

// VerifySmsCode 校验短信验证码。
//
// 校验通过后验证码立即失效；失败时返回具体的错误提示。
func (s *Service) VerifySmsCode(phone, scene, code string) (bool, string) {
	phone = strings.TrimSpace(phone)
	if phone == "" || strings.TrimSpace(code) == "" {
		return false, "手机号与验证码不能为空"
	}
	ok, msg := s.codes.Verify(smsCodeKey(normalizeScene(scene), phone), strings.TrimSpace(code))
	return ok, msg
}
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:33:43

<details><summary>🧠 思考过程</summary>

```
All good. One thing: `s.providers.SMS.Send` in SendSms would panic if providers is nil — pre-existing behavior, not my concern.

Final verification run of all three: done.

Let me do one last sanity check that no other packages broke due to my changes — e.g., other workers' code that might call payment.Service.Notify etc. My changes are additive to the payment/notification/inventory packages. The only signature change was... none (Notify signature unchanged).

Let me try building the whole backend to see if my packages integrate (other workers may have broken their packages, but let's check whether the failures are in my packages).

Actually the brief says full build may fail due to other workers. Let me try building the cmd/server package which wires these handlers, to see if anything of mine breaks the wiring.
```

</details>

<details><summary>🛠 bash</summary>

```
exit=0
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:33:53

<details><summary>🧠 思考过程</summary>

````
The whole backend builds (other workers' code is currently consistent).

Let me do a final review of one thing I want to double check: the `payment` package's `Notify` change — the recharge branch. If `FindRechargeByNo` returns an error (DB error), I ignore it and fall through to `settle` which will fail with "支付单不存在" — acceptable but let me make it explicit: if the error is a DB error (not nil,nil), we should propagate. Currently: `if rc, err := s.repo.FindRechargeByNo(...); err == nil && rc != nil` — on DB error, err != nil → falls through to settle → returns "支付单不存在" (payment not found) instead of the DB error. Slightly misleading but not harmful. Let me improve: handle the error properly.

```go
	rc, rcErr := s.repo.FindRechargeByNo(ctx, req.GetPaymentNo())
	if rcErr != nil {
		return errs.Wrap(errs.CodeInternalError, "查询充值单失败", rcErr)
	}
	if rc != nil {
		...
	}
```

Let me apply that.
````

</details>

<details><summary>🛠 edit</summary>

```
Successfully replaced 1 block(s) in /<WORKSPACE>/shopstack/backend/internal/payment/service.go.
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:34:01

<details><summary>🛠 bash</summary>

```
build OK
vet OK
gofmt clean
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:34:05

<details><summary>🧠 思考过程</summary>

```
Everything is in place. Let me write the final report.

Summary of what I need to report:
1. Implemented RPCs (28)
2. Key business logic per RPC
3. Files created/modified
4. build/vet/gofmt output
5. Inventory three-part model integration
6. Recharge credit trigger (Notify branch)
7. What's not implemented / caveats

Caveats to be honest about:
- No RPC for submitting stock check actual quantities → actual_quantity stays 0, diff = 0. There's no proto RPC.
- GetRechargeConfig: no recharge_configs table; reads system_settings group 'recharge' (keys documented) with built-in defaults (min 100分, max 10000000分, presets). Since the seed has no such rows, defaults are in effect.
- Status filter convention: status <= 0 → no filter (proto3 can't distinguish unset from 0); can't filter explicitly by status 0.
- Actual DB schema differs from the task brief (columns: balance_logs.change/balance, inbound_order_items.inbound_id, no deleted_at anywhere, sms_templates/notification_templates have fewer columns) — I followed the actual DB.
- No soft delete (no deleted_at columns) → hard delete.
- Balance is stored in users.balance_cents; balance_logs is the ledger written by the payment domain.
- Outbound order_no read from the orders table (read-only).
- Stock check scope fallback: inventories table's `warehouse` column doesn't match seeded warehouse names → fallback to all in-stock SKUs.
- Seed data's inventories already violate total = available+locked+sold (total=320 vs sum=1300), so I preserved deltas rather than enforcing the absolute invariant. My changes keep (total-available) and the locked/sold distribution consistent.
- ListStockCheckItems request has no pagination field → returns all items of the check.
- NotificationCategory icon values are my own choice (proto has no enum).
- Sensitive-word filtering added to Send and SendSms; the SMS template content is looked up by scene code for the check (the SMS provider interface doesn't accept a content body, so the template is only used for the check, not for the actual message).
- Charge: recharge uses recharge_no as the callback payment_no; no rows inserted into payments (avoids polluting the admin payment list / order events).
- The smoketest sweep posts {"amount_cents":100,"channel":"wechat"} — channel as a string won't parse into proto int32; and amount 100分 is within my default min (100). Note the channel type mismatch is a proto/gateway contract issue outside my scope.
- Also note I did NOT use errs new codes; all used existing ones (1001/1002/1003/1004/1005/7000/7001/6001/2000).

DB state: cleaned up; test rows removed, inventory restored.

Let me write the final answer in Chinese (the conversation language is Chinese).
```

</details>

已完成 inventory / payment / notification 三域 28 个 RPC 的后端实现，并已针对真实 MySQL 做集成验证。

## 1. 实现的 RPC 与关键逻辑

### inventory 域（11 个，`backend/internal/inventory/`）
| RPC | 关键逻辑 |
|---|---|
| ListWarehouses | 按 code/name/address/contact 模糊匹配分页，响应填 `meta` |
| SaveWarehouse | id=0 新增（code 唯一冲突返回 1005），否则整行更新（含 `enabled=false` 正确落库） |
| DeleteWarehouse | 按 ID 硬删，无 `deleted_at` 列故不用软删；不存在返回 1002 |
| ListInboundOrders | 按 status/关键字分页，逐单装配明细 |
| CreateInboundOrder | 校验仓库启用 + 明细非空 + 数量>0 → **事务内**建单+建明细+加库存+写 `inventory_logs`；成功后单据置「已入库(1)」 |
| ListOutboundOrders | 同入库单列表 |
| CreateOutboundOrder | 事务内建单+建明细+扣库存+写流水；库存不足返回 7001 并整体回滚；成功后置「已出库(1)」 |
| ListStockChecks | 按 status/关键字分页 |
| CreateStockCheck | 生成盘点单 + 按仓库/请求 items 生成明细，`book_quantity`=当前可用库存，actual/diff 留 0 |
| GetStockCheck | 返回 `StockCheckDetail{stock_check, items}` |
| ListStockCheckItems | 返回该盘点单全部明细（请求无分页字段），`meta.total`=明细数 |

### payment 域（7 个，`backend/internal/payment/`）
| RPC | 关键逻辑 |
|---|---|
| ListPayChannels | 按 channel 过滤分页 |
| SavePayChannel | id=0 新增 / 否则更新，code 唯一冲突返回 1005，config 缺省填 `{}` |
| DeletePayChannel | 硬删，不存在返回 1002 |
| CreateRecharge | 从 ctx 取登录用户 → 校验金额区间/渠道（余额渠道禁止充值）/渠道已启用 → 同金额同渠道待支付单幂等复用 → 生成充值单（状态 0 待支付）→ 按配置比例算赠送金额；Mock 微信通道下异步模拟回调 |
| ListRecharges | 用户视角：owner 来自登录态，req.user_id 与之不符返回 1004，未登录返回 1003；按 status 分页 |
| ListBalanceLogs | 同样归属校验，返回流水 + `current_balance`（读 `users.balance_cents`） |
| GetRechargeConfig | 读 `system_settings` 的 `recharge` 分组，缺项回退内置默认档位 |

### notification 域（10 个，`backend/internal/notification/`）
| RPC | 关键逻辑 |
|---|---|
| ListNotificationTemplates / ListSmsTemplates | 关键字 + type 过滤分页 |
| SaveNotificationTemplate / SaveSmsTemplate | id=0 新增 / 否则更新，code 唯一冲突返回 1005，模板类型走 `mapNotificationType` 校验 |
| DeleteNotificationTemplate / DeleteSmsTemplate | 硬删，不存在返回 1002 |
| ListSensitiveWords | keyword + category 过滤分页 |
| SaveSensitiveWord | word 非空、category 缺省 4、status 只接受 0/1（其它值归一为启用） |
| DeleteSensitiveWord | 删除后该词立即不再参与内容过滤 |
| ListNotificationCategories | 返回 4 个固定分类（订单/物流/营销/系统，对应 common.NotificationType），count/unread_count 由 `notifications` 按 type 聚合统计 |

**敏感词已接入真实发送流程**（原实现没有过滤）：`notification/service.go` 的 `Send` 校验标题+正文，`SendSms` 校验场景名 + 该场景对应短信模板内容，命中即返回 1001 拒绝发送。

## 2. 变更文件

新建：
- `backend/internal/inventory/warehouse.go`、`inbound.go`、`outbound.go`、`stock_check.go`
- `backend/internal/payment/pay_channel.go`、`recharge.go`、`balance.go`
- `backend/internal/notification/template.go`、`sensitive.go`

修改：
- `backend/internal/inventory/handler.go`（+11 个 handler 方法）
- `backend/internal/payment/handler.go`（+7 个）、`service.go`（Notify 增加充值分支）
- `backend/internal/notification/handler.go`（+10 个）、`service.go`（Send/SendSms 敏感词过滤 + `smsTemplateContent` 辅助）

未触碰 `errs/errs.go`、proto/、gen/ 及其他任何目录。

## 3. 自检输出

```
=== go build ===  build OK        (go build ./backend/internal/{inventory,payment,notification}/...)
=== go vet ===    vet OK          (无输出)
=== gofmt ===    gofmt clean      (gofmt -l 无输出)
```
附带：`go build ./backend/...` 全量构建当前也通过（exit=0）。

**集成验证**（临时测试连真实 MySQL `shopstack-mysql-test:13306`，跑完已删除测试文件并清理数据、还原库存）：
- inventory：建/改/删仓库；入库后 available+10、total+10 且 locked/sold 不变；出库后 available-4、total-4；库存不足返回 `[7001] 库存不足，无法出库` 且库存无残留；盘点单生成 22 条明细、详情与明细列表一致。
- payment：充值单创建为待支付 → `Notify(recharge_no)` 后余额 +1000、`balance_logs` 写入 change=1000/balance=1000 → 重复回调不重复入账 → 越权查询返回 `[1004] 无权查看他人的数据`，未登录返回 `[1003] 请先登录`。
- notification：模板/短信模板/敏感词 CRUD 全部通过；命中敏感词的通知被拦截 `[1001] 内容包含敏感词，已被拦截`，停用后放行；分类统计返回 4 类及计数。

## 4. 库存与三段式模型的对接

沿用 `repo.go` 的「总量 = 可用 + 锁定 + 已售」+ 条件更新防超卖：
- **入库**：`total_stock += qty`、`available_stock += qty`，`version + 1`，写 `inventory_logs`（change_type=1 入库，quantity=+qty，biz_type=`inbound`）；锁定/已售不动。库存台账无该 SKU 时先建初始记录。
- **出库**：有锁定库存时 `locked -= qty / sold += qty`（与现有 `Deduct` 行为一致，总量不变）；否则 `available -= qty` 且 `total -= qty`（真实出库）。更新条件 `WHERE sku_id = ? AND (locked_stock >= qty OR available_stock >= qty)`，RowsAffected=0 即报 7001。
- **重要事实**：种子数据本身不满足绝对等式（sku 1：total=320 而 available+sold=1300）。因此我保证的是**增量结构不变**（total 与 available 同增同减、locked/sold 分布不变），没有强行重算 total（现有 `Adjust` 会重算，属既有行为，未改）。
- 单据状态：入库/出库在同一事务内从 0（待）流转到 1（已入库/已出库），2（已取消）常量已定义但无对应 RPC（proto 无取消接口）。

## 5. 充值入账触发点

**已补 Notify 分支**：`payment/service.go` 的 `Notify` 现在先按 `payment_no` 查 `recharge_orders`，命中则走充值结算（`settleRecharge`），否则走原订单支付结算。`settleRecharge` → `Repo.ApplyRechargeCredit` 单事务内：条件更新 `recharge_orders.status 0→1`（RowsAffected=0 即视为重复回调，直接返回，天然幂等）→ `users.balance_cents += amount+bonus` → 回读余额 → 写 `balance_logs`（change、balance、title=余额充值、biz_type=recharge）。
充值单号 `RC<时间戳><随机>` 同时作为回调用的 `payment_no`；**不写 `payments` 表**，避免污染后台支付流水与触发 order_id=0 的订单事件。余额存量放在 `users.balance_cents`（该表是全库唯一余额来源），流水表 `balance_logs` 由支付域写入。

## 6. 未实现 / 存疑部分（诚实说明）

1. **盘点结果无法提交**：proto 没有「提交实盘数量」的 RPC，所以 `actual_quantity`/`diff_quantity` 恒为 0，`diff_count` 恒为 0。只实现了创建与查询。
2. **列表 status 过滤约定**：proto3 无法区分「未传」与「0」，故统一采用 `status > 0` 才过滤，`status = 0` 表示不过滤；代价是**无法显式筛选「状态=0」**（如待入库/待支付）。
3. **实际表结构与任务说明不一致，我以数据库为准**：`balance_logs` 列是 `change/balance`（不是 `change_amount_cents/balance_after_cents`）、`inbound_order_items` 列是 `inbound_id`、所有相关表**都没有 `deleted_at`**（故无法软删）、`sms_templates`/`notification_templates` 也没有说明中的 `sign_name/scene/category/channels/remark` 列 —— 相关 proto 字段无对应存储，映射时置空。
4. **充值配置来源**：不存在 `recharge_configs` 表，也无 `recharge` 分组配置项，因此走 `system_settings` 分组 `recharge`（键：`recharge.min_amount_cents`/`max_amount_cents`/`preset_amounts`/`register_bonus_cents`/`first_recharge_bonus_desc`/`bonus_rate_bps`）+ 内置默认值（最低 100 分、最高 10000000 分、档位 10/50/100/500/1000 元、赠送比例 0）。当前种子无这些配置，实际生效的是默认值。赠送金额按 `bonus_rate_bps`（万分比）计算。
5. **盘点范围回退**：`inventories.warehouse` 存的是「默认仓」，与 `warehouses.name`（上海仓等）无关联，因此按仓库过滤为空时会回退为「全部有库存的 SKU」。逻辑已注释说明。
6. `outbound_orders.order_no` 通过只读查询 `orders` 表补全（跨域只读）。
7. `NotificationCategory.icon` 的取值（order/logistics/promotion/system）由我拟定，proto 未定义枚举。
8. 短信模板目前只用于敏感词校验与后台配置，`thirdparty.SMSProvider.Send` 接口不接受内容正文，未改成用模板渲染短信。
9. `cmd/smoketest` 里充值用例的 body 是 `{"channel":"wechat"}`（字符串），proto 里 `channel` 是 int32，网关会解析失败 —— 属契约层问题，不在我可改范围内，未做兼容。
10. `ListStockCheckItems` 的请求消息没有分页字段，故返回全部明细；`meta` 按总数填充。
