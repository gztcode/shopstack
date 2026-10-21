# 子 Agent · 你负责 ShopStack 项目的 **product 域（backend/internal/product/）** 与 **marketi

> 第 1 / 2 卷

## 👤 用户 · 2026-10-20 14:16:02

你负责 ShopStack 项目的 **product 域（backend/internal/product/）** 与 **marketing 域（backend/internal/marketing/）** 新增 29 个 gRPC RPC 的后端实现。

## 项目背景

ShopStack 是一个中大型电商项目（Go 微服务 + Flutter/小程序/Vue3/React 四端）。工作目录：
`/<WORKSPACE>/shopstack`

契约（proto）已经扩展完毕，**你不需要也不允许修改 proto 或 gen/ 目录**。你的任务是实现 handler/service/repo 层逻辑。

## 你的唯一所有权范围

- 你**只能**修改：`backend/internal/product/` 和 `backend/internal/marketing/` 目录下的文件
- 你**只能**新建：这两个目录下的新文件
- **严禁**修改其他任何目录（backend/internal/user、backend/internal/order、backend/internal/logistics、backend/internal/inventory、backend/internal/payment、backend/internal/notification、backend/internal/httpx、backend/internal/errs、proto/、gen/、deploy/、apps/、docs/ 等）。其他 worker 正在并行修改那些目录，你改会冲突。
- 如果需要 `errs` 包新增错误码，**不要**改 `backend/internal/errs/errs.go`（共享文件会冲突）。请用已有的错误码（`errs.CodeNotFound`、`errs.CodeInvalidParam`、`errs.CodeProductNotFound`、`errs.CodePromotionNotFound` 等，详见 `backend/internal/errs/errs.go`）；确实缺就在自己的包内定义局部常量并说明。

## 必须实现的 29 个 RPC（以 proto 文件为准）

### product 域（16 个）
ProductService:
1. `ListChannels(ListChannelsRequest) returns (ListChannelsResponse)` — 频道列表
2. `GetChannel(GetChannelRequest) returns (Channel)` — 频道详情
3. `ListChannelProducts(ListChannelProductsRequest) returns (ListChannelProductsResponse)` — 频道下商品
4. `SaveChannel(SaveChannelRequest) returns (Channel)` — 新增/更新频道
5. `DeleteChannel(DeleteChannelRequest) returns (common.v1.OperationResult)` — 删除频道
6. `ListReviewTags(ListReviewTagsRequest) returns (ListReviewTagsResponse)`
7. `SaveReviewTag(SaveReviewTagRequest) returns (ReviewTag)`
8. `DeleteReviewTag(DeleteReviewTagRequest) returns (common.v1.OperationResult)`
9. `ListGuarantees(ListGuaranteesRequest) returns (ListGuaranteesResponse)`
10. `SaveGuarantee(SaveGuaranteeRequest) returns (Guarantee)`
11. `DeleteGuarantee(DeleteGuaranteeRequest) returns (common.v1.OperationResult)`
12. `ListProductParams(ListProductParamsRequest) returns (ListProductParamsResponse)` — 商品参数（从商品 attributes 读取）

ReviewService:
13. `ListProductQuestions(ListProductQuestionsRequest) returns (ListProductQuestionsResponse)` — 商品下的问答（公开）
14. `CreateQuestion(CreateQuestionRequest) returns (ProductQuestion)` — 用户提问
15. `ListQuestions(ListQuestionsRequest) returns (ListQuestionsResponse)` — 后台问答列表
16. `AnswerQuestion(AnswerQuestionRequest) returns (ProductQuestion)` — 后台回答

### marketing 域（13 个）
MarketingService:
17. `SignIn(SignInRequest) returns (SignInResult)` — 每日签到
18. `GetSignInStatus(GetSignInStatusRequest) returns (SignInStatus)`
19. `ListTasks(ListTasksRequest) returns (ListTasksResponse)` — 任务列表
20. `ClaimTask(ClaimTaskRequest) returns (UserTask)` — 领取任务奖励
21. `GetPromotion(GetPromotionRequest) returns (Promotion)` — 活动详情
22. `ListPromotionProducts(ListPromotionProductsRequest) returns (ListPromotionProductsResponse)`
23. `ListPromotionSessions(ListPromotionSessionsRequest) returns (ListPromotionSessionsResponse)` — 活动场次
24. `SavePromotionSession(SavePromotionSessionRequest) returns (PromotionSession)`
25. `ListGroupBuys(ListGroupBuysRequest) returns (ListGroupBuysResponse)`
26. `GetGroupBuy(GetGroupBuyRequest) returns (GroupBuy)`
27. `JoinGroupBuy(JoinGroupBuyRequest) returns (GroupBuy)` — 用户参团
28. `SaveGroupBuy(SaveGroupBuyRequest) returns (GroupBuy)`
29. `ListUserLevels(ListUserLevelsRequest) returns (ListUserLevelsResponse)` — 营销域的等级列表（读 user_levels 表）

**请先打开 `proto/shopstack/product/v1/product.proto` 和 `proto/shopstack/marketing/v1/marketing.proto` 核对每个请求/响应消息的字段**，以 proto 为准。

## 参考实现范式（务必先读）

- `backend/internal/product/{handler.go,service.go,repo.go,model.go,material.go}` — product 域四层结构
- `backend/internal/marketing/{handler.go,service.go,repo.go,model.go,util.go,events.go}` — marketing 域四层结构
- `backend/internal/user/converter.go` — model ↔ proto 转换 + `buildMeta` 分页辅助
- `backend/internal/marketing/util.go:13` — `resolveUserID(ctx, requested)` 身份回退范式，**你的用户私有接口（签到、任务领取、参团）必须用这个模式**

**你可以新建** `backend/internal/product/channel.go`、`backend/internal/product/review_tag.go`、`backend/internal/product/guarantee.go`、`backend/internal/product/question.go`、`backend/internal/marketing/signin.go`、`backend/internal/marketing/task.go`、`backend/internal/marketing/groupbuy.go`、`backend/internal/marketing/session.go` 等文件组织代码，风格与现有一致。

## 数据库表（已建好并灌了种子数据，直接用）

MySQL 容器 `shopstack-mysql-test`，端口 13306，库 `shopstack`，用户 `shopstack` / 密码 `shopstack`。
表定义见 `deploy/mysql/init/03-extend.sql`，种子见 `deploy/mysql/init/04-extend-seed.sql`。**你负责的表**：
- `channels` — 频道（name, code, icon, banner_url, description, sort, type, status, product_count）
- `review_tags` — 评价标签（name, sort, enabled）
- `guarantees` — 商品保障（name, icon, description, sort, enabled）
- `product_questions` — 商品问答（product_id, user_id, question, answer, answered_by, answered_at, status）
- `sign_in_records` — 签到记录（user_id, sign_date, reward_points, continuous_days）
- `marketing_tasks` — 任务定义（name, type, target_count, reward_points, description, icon, sort, enabled）
- `user_tasks` — 用户任务进度（user_id, task_id, progress, status, completed_at, claimed_at）
- `group_buys` — 拼团活动（title, product_id, sku_id, group_size, price_cents, original_price_cents, start_at, end_at, status, description, cover, required_points, max_groups）
- `group_buy_members` — 拼团成员（group_buy_id, user_id, order_id, is_leader, joined_at, status）
- `promotion_sessions` — 活动场次（promotion_id, name, start_at, end_at, status, capacity, description）
- `user_levels` — 会员等级（营销域的 ListUserLevels 读这张表，注意这表也归 user worker 管，你只读不写结构）

**请自己用 `docker --context orbstack exec shopstack-mysql-test mysql -ushopstack -pshopstack shopstack -e "DESC 表名"` 查看准确列名**，以实际表结构为准。

种子数据：`channels` 9 条（推荐/新品/热销/限时/预售/清仓/包邮/跨境/生鲜）、`review_tags`、`guarantees`、`marketing_tasks`、`group_buys`、`promotion_sessions` 若干。

## 关键实现要求

1. **表名映射**：gorm 模型必须实现 `TableName() string`。软删除用 `gorm.DeletedAt`。
2. **金额一律用分（int64）**，字段名带 `_cents`，禁止 float64。
3. **分页**：用 `commonv1.PageRequest`，参考 `normalizePage` 与 `buildMeta`，响应必须填 `meta`。
4. **JSON 字段名与 proto 一致（snake_case）**。
5. **签到逻辑（SignIn / GetSignInStatus）**：
   - 按自然日判断，同一天重复签到必须返回"今日已签到"的业务错误，不能重复加积分。
   - 连续签到天数要正确计算（基于历史 sign_in_records）。
   - 奖励积分要写进用户积分：更新 users 表 points 字段，并写一条 points_logs 流水（该表属于 user 域但在同一数据库，你可以直接写这张表，注意字段名对齐 `backend/internal/user/model.go` 里的 PointsLog 模型）。
   - GetSignInStatus 返回本月已签到日期列表、连续天数、今日是否已签到、累计签到天数。
6. **任务（ListTasks / ClaimTask）**：
   - ListTasks 返回任务定义 + 当前用户的进度与完成状态（基于 user_tasks 表）。
   - ClaimTask 校验：任务存在且启用、用户已完成、且未领取过（claimed_at 为空）；发放奖励积分并写 user_tasks.claimed_at。重复领取必须报错。
7. **拼团（JoinGroupBuy）**：
   - 校验活动时间窗口、库存/名额。
   - 同一用户对同一团只能参与一次（group_buy_members 唯一约束）。
   - 满员（member 数达到 group_size）后团状态置为已成团。
   - 注意 `group_buy_members` 表有 `is_leader` 字段：用户若是团长则创建团记录，否则加入已有团。
8. **活动场次（ListPromotionSessions / SavePromotionSession）**：场次归属 promotion_id，时间区间不能与其他场次重叠（做校验并返回明确错误）。
9. **频道（ListChannelProducts）**：按频道 code 取商品。频道与商品的关联方式看 `channels` 表和 `products` 表的实际字段——如果没有直接关联字段，就用 `channels.type` 匹配 `products` 的分类/标签/销售属性做合理关联，并在回复里说明你的关联策略。`ListChannelProducts` 支持 keyword 过滤和 sort（default|sales|price_asc|price_desc|newest）。
10. **ListProductParams**：从商品的 attributes（product_attributes 表或 product_skus 的属性字段）读取商品参数列表。先看 `backend/internal/product/model.go` 里 Product 属性字段的实际结构。
11. **问答（CreateQuestion / AnswerQuestion）**：
    - CreateQuestion 必须用 `resolveUserID(ctx, req.GetUserId())` 取当前登录用户，未登录会拿到 0，此时返回未授权错误。
    - AnswerQuestion 记录回答人与回答时间，状态从 pending 改为 answered。
12. **禁止 TODO / 占位实现 / 空实现 / 死代码**。每个 RPC 都要有真实的数据库读写或真实计算逻辑。
13. **错误处理**：用 `errs` 包，先读 `backend/internal/errs/errs.go` 确认可用的构造函数与错误码。

## 验证方式

```bash
cd /<WORKSPACE>/shopstack
export GOPROXY=https://goproxy.cn,direct GOFLAGS=-mod=mod PATH="$HOME/go/bin:$PATH"
go build ./backend/internal/product/... ./backend/internal/marketing/... && \
go vet ./backend/internal/product/... ./backend/internal/marketing/... && \
gofmt -l backend/internal/product/ backend/internal/marketing/
```
（`go build ./backend/...` 全量构建此时可能因其他 worker 正在改代码而失败，这是正常的，请只构建你负责的包。）

## 交付要求

完成后请在最终回复里给出：
1. 实现了哪些 RPC（逐个列出）
2. 每个 RPC 的关键业务逻辑一句话说明
3. 新建/修改了哪些文件（路径列表）
4. `go build` / `go vet` / `gofmt` 三项自检的实际输出结果
5. `ListChannelProducts` 的商品关联策略说明
6. 任何你**没有**实现或有疑问的部分（诚实说明，不要假装完成）

不要写 README 或额外的总结文档文件，直接在最终回复里汇报。

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:16:02

I'll start by exploring the project structure and reading the proto contracts and existing implementation patterns.

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
backend/internal/marketing:
events.go
handler.go
model.go
repo.go
service.go
util.go

backend/internal/product:
handler.go
material.go
model.go
repo.go
service.go
---
proto/shopstack/marketing/v1:
marketing.proto

proto/shopstack/product/v1:
product.proto
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:16:07

<details><summary>🛠 read</summary>

```
1→syntax = "proto3";
     2→
     3→package shopstack.product.v1;
     4→
     5→option go_package = "github.com/shopstack/platform/gen/go/product/v1;productv1";
     6→
     7→import "google/api/annotations.proto";
     8→import "google/protobuf/timestamp.proto";
     9→import "shopstack/common/v1/common.proto";
    10→
    11→// ---------------------------------------------------------------------------
    12→// 实体
    13→// ---------------------------------------------------------------------------
    14→
    15→message Category {
    16→  int64 id = 1;
    17→  string name = 2;
    18→  int64 parent_id = 3;
    19→  string icon = 4;
    20→  string description = 5;
    21→  int32 sort = 6;
    22→  bool visible = 7;
    23→  int32 product_count = 8;
    24→  repeated Category children = 9;
    25→}
    26→
    27→message Product {
    28→  int64 id = 1;
    29→  string title = 2;
    30→  string subtitle = 3;
    31→  string cover = 4;
    32→  int64 category_id = 5;
    33→  string category_name = 6;
    34→  int64 min_price_cents = 7;
    35→  int64 max_price_cents = 8;
    36→  int64 sales_count = 9;
    37→  int32 stock_total = 10;
    38→  shopstack.common.v1.ProductStatus status = 11;
    39→  string description = 12;
    40→  repeated string tags = 13;
    41→  google.protobuf.Timestamp created_at = 14;
    42→  google.protobuf.Timestamp updated_at = 15;
    43→}
    44→
    45→message ProductSku {
    46→  int64 id = 1;
    47→  int64 product_id = 2;
    48→  string sku_code = 3;
    49→  string spec_text = 4;         // 规格文案，如 "红色 / XL"
    50→  map<string, string> specs = 5; // 属性键值
    51→  int64 price_cents = 6;
    52→  int64 original_price_cents = 7;
    53→  int32 stock = 8;
    54→  int32 locked_stock = 9;
    55→  string image = 10;
    56→  int32 sort = 11;
    57→  int32 sales_count = 12;
    58→  bool enabled = 13;
    59→  int64 weight_grams = 14;
    60→}
    61→
    62→message ProductDetail {
    63→  Product product = 1;
    64→  repeated ProductSku skus = 2;
    65→  repeated shopstack.common.v1.ImageItem images = 3;
    66→  repeated ProductAttribute attributes = 4;
    67→  repeated Review reviews = 5;
    68→  int32 review_count = 6;
    69→  double review_rating = 7;
    70→  repeated Product related = 8;
    71→  ReviewSummary review_summary = 9;
    72→}
    73→
    74→message ProductAttribute {
    75→  int64 id = 1;
    76→  int64 product_id = 2;
    77→  string name = 3;
    78→  string value = 4;
    79→  int32 sort = 5;
    80→}
    81→
    82→message Banner {
    83→  int64 id = 1;
    84→  string title = 2;
    85→  string image = 3;
    86→  string link = 4;
    87→  int32 sort = 5;
    88→  string position = 6; // home_banner | home_float | category
    89→  bool visible = 7;
    90→  google.protobuf.Timestamp created_at = 8;
    91→}
    92→
    93→message Review {
    94→  int64 id = 1;
    95→  int64 product_id = 2;
    96→  string product_title = 3;
    97→  int64 user_id = 4;
    98→  string user_nickname = 5;
    99→  string user_avatar = 6;
   100→  int32 rating = 7;
   101→  string content = 8;
   102→  repeated string images = 9;
   103→  int32 sku_id = 10;
   104→  string sku_text = 11;
   105→  shopstack.common.v1.ReviewStatus status = 12;
   106→  string admin_reply = 13;
   107→  int32 like_count = 14;
   108→  google.protobuf.Timestamp created_at = 15;
   109→}
   110→
   111→message ReviewSummary {
   112→  int32 total = 1;
   113→  int32 good = 2;      // 4-5 星
   114→  int32 medium = 3;    // 3 星
   115→  int32 bad = 4;       // 1-2 星
   116→  double average = 5;
   117→}
   118→
   119→// ---------------------------------------------------------------------------
   120→// 请求 / 响应
   121→// ---------------------------------------------------------------------------
   122→
   123→message ListProductsRequest {
   124→  shopstack.common.v1.PageRequest page = 1;
   125→  string keyword = 2;
   126→  int64 category_id = 3;
   127→  int32 status = 4;
   128→  int64 min_price_cents = 5;
   129→  int64 max_price_cents = 6;
   130→  string sort = 7; // default | sales | price_asc | price_desc | newest
   131→  bool only_in_stock = 8;
   132→  repeated string tags = 9;
   133→  int64 channel_id = 10; // 频道 ID，用于首页频道页筛选
   134→  int32 sale_type = 11; // 售卖类型：0 全部 1 现货 2 预售 3 跨境 4 进口
   135→}
   136→
   137→message ListProductsResponse {
   138→  repeated Product products = 1;
   139→  shopstack.common.v1.PageMeta meta = 2;
   140→}
   141→
   142→message GetProductRequest {
   143→  int64 id = 1;
   144→}
   145→
   146→message SaveProductRequest {
   147→  int64 id = 1;
   148→  string title = 2;
   149→  string subtitle = 3;
   150→  string cover = 4;
   151→  int64 category_id = 5;
   152→  int64 min_price_cents = 6;
   153→  int64 max_price_cents = 7;
   154→  string description = 8;
   155→  repeated string tags = 9;
   156→  int32 status = 10;
   157→  repeated shopstack.common.v1.ImageItem images = 11;
   158→  repeated ProductAttribute attributes = 12;
   159→  repeated ProductSku skus = 13;
   160→}
   161→
   162→message DeleteProductRequest {
   163→  int64 id = 1;
   164→}
   165→
   166→message SetProductStatusRequest {
   167→  int64 id = 1;
   168→  int32 status = 2;
   169→}
   170→
   171→message SaveSkuRequest {
   172→  int64 id = 1;
   173→  int64 product_id = 2;
   174→  string sku_code = 3;
   175→  string spec_text = 4;
   176→  map<string, string> specs = 5;
   177→  int64 price_cents = 6;
   178→  int64 original_price_cents = 7;
   179→  int32 stock = 8;
   180→  string image = 9;
   181→  int32 sort = 10;
   182→  bool enabled = 11;
   183→  int64 weight_grams = 12;
   184→}
   185→
   186→message ListCategoriesRequest {
   187→  int64 parent_id = 1;
   188→  bool tree = 2;
   189→}
   190→
   191→message ListCategoriesResponse {
   192→  repeated Category categories = 1;
   193→}
   194→
   195→message SaveCategoryRequest {
   196→  int64 id = 1;
   197→  string name = 2;
   198→  int64 parent_id = 3;
   199→  string icon = 4;
   200→  string description = 5;
   201→  int32 sort = 6;
   202→  bool visible = 7;
   203→}
   204→
   205→message DeleteCategoryRequest {
   206→  int64 id = 1;
   207→}
   208→
   209→message ListBannersRequest {
   210→  string position = 1;
   211→}
   212→
   213→message ListBannersResponse {
   214→  repeated Banner banners = 1;
   215→}
   216→
   217→message SaveBannerRequest {
   218→  int64 id = 1;
   219→  string title = 2;
   220→  string image = 3;
   221→  string link = 4;
   222→  int32 sort = 5;
   223→  string position = 6;
   224→  bool visible = 7;
   225→}
   226→
   227→message DeleteBannerRequest {
   228→  int64 id = 1;
   229→}
   230→
   231→message ListReviewsRequest {
   232→  shopstack.common.v1.PageRequest page = 1;
   233→  int64 product_id = 2;
   234→  int32 status = 3;
   235→  int64 user_id = 4;
   236→  string keyword = 5;
   237→  int32 filter = 10; // 筛选：0 全部 1 有图 2 好评 3 中差评
   238→  int64 sku_id = 11; // 按 SKU 筛选
   239→}
   240→
   241→message ListReviewsResponse {
   242→  repeated Review reviews = 1;
   243→  shopstack.common.v1.PageMeta meta = 2;
   244→  ReviewSummary summary = 3;
   245→}
   246→
   247→message CreateReviewRequest {
   248→  int64 user_id = 1;
   249→  int64 product_id = 2;
   250→  int64 sku_id = 3;
   251→  int32 rating = 4;
   252→  string content = 5;
   253→  repeated string images = 6;
   254→}
   255→
   256→message SetReviewStatusRequest {
   257→  int64 id = 1;
   258→  int32 status = 2;
   259→  string admin_reply = 3;
   260→}
   261→
   262→message ListProductAttributesRequest {
   263→  int64 product_id = 1;
   264→}
   265→
   266→// ---------------------------------------------------------------------------
   267→// 素材库
   268→// ---------------------------------------------------------------------------
   269→
   270→message Material {
   271→  int64 id = 1;
   272→  string name = 2;
   273→  string url = 3;
   274→  string type = 4;      // image / video
   275→  int64 size = 5;
   276→  string folder = 6;
   277→  int32 sort = 7;
   278→  google.protobuf.Timestamp created_at = 8;
   279→}
   280→
   281→message ListMaterialsRequest {
   282→  shopstack.common.v1.PageRequest page = 1;
   283→  string keyword = 2;
   284→  string type = 3;
   285→  string folder = 4;
   286→}
   287→
   288→message ListMaterialsResponse {
   289→  repeated Material materials = 1;
   290→  shopstack.common.v1.PageMeta meta = 2;
   291→}
   292→
   293→message SaveMaterialRequest {
   294→  int64 id = 1;
   295→  string name = 2;
   296→  string url = 3;
   297→  string type = 4;
   298→  int64 size = 5;
   299→  string folder = 6;
   300→  int32 sort = 7;
   301→}
   302→
   303→message DeleteMaterialRequest {
   304→  int64 id = 1;
   305→}
   306→
   307→// ---------------------------------------------------------------------------
   308→// 服务定义
   309→// ---------------------------------------------------------------------------
   310→
   311→service ProductService {
   312→  rpc ListProducts(ListProductsRequest) returns (ListProductsResponse) {
   313→    option (google.api.http) = { get: "/api/v1/products" };
   314→  }
   315→  rpc GetProduct(GetProductRequest) returns (ProductDetail) {
   316→    option (google.api.http) = { get: "/api/v1/products/{id}" };
   317→  }
   318→  rpc CreateProduct(SaveProductRequest) returns (Product) {
   319→    option (google.api.http) = { post: "/api/v1/admin/products" body: "*" };
   320→  }
   321→  rpc UpdateProduct(SaveProductRequest) returns (Product) {
   322→    option (google.api.http) = { put: "/api/v1/admin/products" body: "*" };
   323→  }
   324→  rpc DeleteProduct(DeleteProductRequest) returns (shopstack.common.v1.OperationResult) {
   325→    option (google.api.http) = { delete: "/api/v1/admin/products/{id}" };
   326→  }
   327→  rpc SetProductStatus(SetProductStatusRequest) returns (Product) {
   328→    option (google.api.http) = { put: "/api/v1/admin/products/{id}/status" body: "*" };
   329→  }
   330→  rpc SaveSku(SaveSkuRequest) returns (ProductSku) {
   331→    option (google.api.http) = { post: "/api/v1/admin/skus" body: "*" };
   332→  }
   333→  rpc ListBanners(ListBannersRequest) returns (ListBannersResponse) {
   334→    option (google.api.http) = { get: "/api/v1/banners" };
   335→  }
   336→  rpc SaveBanner(SaveBannerRequest) returns (Banner) {
   337→    option (google.api.http) = { post: "/api/v1/admin/banners" body: "*" };
   338→  }
   339→  rpc DeleteBanner(DeleteBannerRequest) returns (shopstack.common.v1.OperationResult) {
   340→    option (google.api.http) = { delete: "/api/v1/admin/banners/{id}" };
   341→  }
   342→  rpc ListMaterials(ListMaterialsRequest) returns (ListMaterialsResponse) {
   343→    option (google.api.http) = { get: "/api/v1/admin/materials" };
   344→  }
   345→  rpc SaveMaterial(SaveMaterialRequest) returns (Material) {
   346→    option (google.api.http) = { post: "/api/v1/admin/materials" body: "*" };
   347→  }
   348→  rpc DeleteMaterial(DeleteMaterialRequest) returns (shopstack.common.v1.OperationResult) {
   349→    option (google.api.http) = { delete: "/api/v1/admin/materials/{id}" };
   350→  }
   351→  rpc ListChannels(ListChannelsRequest) returns (ListChannelsResponse) {
   352→    option (google.api.http) = { get: "/api/v1/channels" };
   353→  }
   354→  rpc GetChannel(GetChannelRequest) returns (Channel) {
   355→    option (google.api.http) = { get: "/api/v1/channels/{id}" };
   356→  }
   357→  rpc ListChannelProducts(ListChannelProductsRequest) returns (ListChannelProductsResponse) {
   358→    option (google.api.http) = { get: "/api/v1/channels/{channel_id}/products" };
   359→  }
   360→  rpc SaveChannel(SaveChannelRequest) returns (Channel) {
   361→    option (google.api.http) = { post: "/api/v1/admin/channels" };
   362→  }
   363→  rpc DeleteChannel(DeleteChannelRequest) returns (shopstack.common.v1.OperationResult) {
   364→    option (google.api.http) = { delete: "/api/v1/admin/channels/{id}" };
   365→  }
   366→  rpc ListReviewTags(ListReviewTagsRequest) returns (ListReviewTagsResponse) {
   367→    option (google.api.http) = { get: "/api/v1/reviews/tags" };
   368→  }
   369→  rpc SaveReviewTag(SaveReviewTagRequest) returns (ReviewTag) {
   370→    option (google.api.http) = { post: "/api/v1/admin/review-tags" };
   371→  }
   372→  rpc DeleteReviewTag(DeleteReviewTagRequest) returns (shopstack.common.v1.OperationResult) {
   373→    option (google.api.http) = { delete: "/api/v1/admin/review-tags/{id}" };
   374→  }
   375→  rpc ListGuarantees(ListGuaranteesRequest) returns (ListGuaranteesResponse) {
   376→    option (google.api.http) = { get: "/api/v1/guarantees" };
   377→  }
   378→  rpc SaveGuarantee(SaveGuaranteeRequest) returns (Guarantee) {
   379→    option (google.api.http) = { post: "/api/v1/admin/guarantees" };
   380→  }
   381→  rpc DeleteGuarantee(DeleteGuaranteeRequest) returns (shopstack.common.v1.OperationResult) {
   382→    option (google.api.http) = { delete: "/api/v1/admin/guarantees/{id}" };
   383→  }
   384→  rpc ListProductParams(ListProductParamsRequest) returns (ListProductParamsResponse) {
   385→    option (google.api.http) = { get: "/api/v1/products/{product_id}/params" };
   386→  }
   387→}
   388→
   389→service CategoryService {
   390→  rpc ListCategories(ListCategoriesRequest) returns (ListCategoriesResponse) {
   391→    option (google.api.http) = { get: "/api/v1/categories" };
   392→  }
   393→  rpc CreateCategory(SaveCategoryRequest) returns (Category) {
   394→    option (google.api.http) = { post: "/api/v1/admin/categories" body: "*" };
   395→  }
   396→  rpc UpdateCategory(SaveCategoryRequest) returns (Category) {
   397→    option (google.api.http) = { put: "/api/v1/admin/categories" body: "*" };
   398→  }
   399→  rpc DeleteCategory(DeleteCategoryRequest) returns (shopstack.common.v1.OperationResult) {
   400→    option (google.api.http) = { delete: "/api/v1/admin/categories/{id}" };
   401→  }
   402→}
   403→
   404→service ReviewService {
   405→  rpc ListReviews(ListReviewsRequest) returns (ListReviewsResponse) {
   406→    option (google.api.http) = { get: "/api/v1/reviews" };
   407→  }
   408→  rpc CreateReview(CreateReviewRequest) returns (Review) {
   409→    option (google.api.http) = { post: "/api/v1/reviews" body: "*" };
   410→  }
   411→  rpc SetReviewStatus(SetReviewStatusRequest) returns (Review) {
   412→    option (google.api.http) = { put: "/api/v1/admin/reviews/{id}/status" body: "*" };
   413→  }
   414→  rpc ListProductQuestions(ListProductQuestionsRequest) returns (ListProductQuestionsResponse) {
   415→    option (google.api.http) = { get: "/api/v1/products/{product_id}/questions" };
   416→  }
   417→  rpc CreateQuestion(CreateQuestionRequest) returns (ProductQuestion) {
   418→    option (google.api.http) = { post: "/api/v1/questions" };
   419→  }
   420→  rpc ListQuestions(ListQuestionsRequest) returns (ListQuestionsResponse) {
   421→    option (google.api.http) = { get: "/api/v1/admin/questions" };
   422→  }
   423→  rpc AnswerQuestion(AnswerQuestionRequest) returns (ProductQuestion) {
   424→    option (google.api.http) = { post: "/api/v1/admin/questions/{id}/answer" };
   425→  }
   426→}
   427→
   428→// EXTRA_MARKER: 由 scripts/extend-proto.py 追加的消息定义
   429→
   430→// ---------------------------------------------------------------------------
   431→// 频道 / 楼层
   432→// ---------------------------------------------------------------------------
   433→
   434→message Channel {
   435→  int64 id = 1;
   436→  string name = 2;
   437→  string code = 3;
   438→  string icon = 4;
   439→  string banner_url = 5;
   440→  string description = 6;
   441→  int32 sort = 7;
   442→  int32 type = 8;   // 1 推荐 2 新品 3 热销 4 限时 5 预售 6 清仓 7 包邮 8 跨境 9 楼层
   443→  int32 status = 9; // 0 停用 1 启用
   444→  int32 product_count = 10;
   445→  google.protobuf.Timestamp created_at = 11;
   446→}
   447→
   448→message ListChannelsRequest {
   449→  shopstack.common.v1.PageRequest page = 1;
   450→  string keyword = 2;
   451→  int32 type = 3;
   452→}
   453→
   454→message ListChannelsResponse {
   455→  repeated Channel channels = 1;
   456→  shopstack.common.v1.PageMeta meta = 2;
   457→}
   458→
   459→message GetChannelRequest {
   460→  int64 id = 1;
   461→}
   462→
   463→message ListChannelProductsRequest {
   464→  int64 channel_id = 1;
   465→  shopstack.common.v1.PageRequest page = 2;
   466→  string keyword = 3;
   467→  string sort = 4; // default | sales | price_asc | price_desc | newest
   468→}
   469→
   470→message ListChannelProductsResponse {
   471→  Channel channel = 1;
   472→  repeated Product products = 2;
   473→  shopstack.common.v1.PageMeta meta = 3;
   474→}
   475→
   476→message SaveChannelRequest {
   477→  int64 id = 1;
   478→  string name = 2;
   479→  string code = 3;
   480→  string icon = 4;
   481→  string banner_url = 5;
   482→  string description = 6;
   483→  int32 sort = 7;
   484→  int32 type = 8;
   485→  int32 status = 9;
   486→}
   487→
   488→message DeleteChannelRequest {
   489→  int64 id = 1;
   490→}
   491→
   492→// ---------------------------------------------------------------------------
   493→// 评价标签
   494→// ---------------------------------------------------------------------------
   495→
   496→message ReviewTag {
   497→  int64 id = 1;
   498→  string name = 2;
   499→  int32 sort = 3;
   500→  bool enabled = 4;
   501→}
   502→
   503→message ListReviewTagsRequest {
   504→  shopstack.common.v1.PageRequest page = 1;
   505→  string keyword = 2;
   506→}
   507→
   508→message ListReviewTagsResponse {
   509→  repeated ReviewTag tags = 1;
   510→  shopstack.common.v1.PageMeta meta = 2;
   511→}
   512→
   513→message SaveReviewTagRequest {
   514→  int64 id = 1;
   515→  string name = 2;
   516→  int32 sort = 3;
   517→  bool enabled = 4;
   518→}
   519→
   520→message DeleteReviewTagRequest {
   521→  int64 id = 1;
   522→}
   523→
   524→// ---------------------------------------------------------------------------
   525→// 商品保障项
   526→// ---------------------------------------------------------------------------
   527→
   528→message Guarantee {
   529→  int64 id = 1;
   530→  string name = 2;
   531→  string icon = 3;
   532→  string description = 4;
   533→  int32 sort = 5;
   534→  bool enabled = 6;
   535→}
   536→
   537→message ListGuaranteesRequest {
   538→  shopstack.common.v1.PageRequest page = 1;
   539→}
   540→
   541→message ListGuaranteesResponse {
   542→  repeated Guarantee guarantees = 1;
   543→  shopstack.common.v1.PageMeta meta = 2;
   544→}
   545→
   546→message SaveGuaranteeRequest {
   547→  int64 id = 1;
   548→  string name = 2;
   549→  string icon = 3;
   550→  string description = 4;
   551→  int32 sort = 5;
   552→  bool enabled = 6;
   553→}
   554→
   555→message DeleteGuaranteeRequest {
   556→  int64 id = 1;
   557→}
   558→
   559→// ---------------------------------------------------------------------------
   560→// 商品参数
   561→// ---------------------------------------------------------------------------
   562→
   563→message ListProductParamsRequest {
   564→  int64 product_id = 1;
   565→}
   566→
   567→message ListProductParamsResponse {
   568→  repeated ProductAttribute params = 1;
   569→}
   570→
   571→// ---------------------------------------------------------------------------
   572→// 商品问答
   573→// ---------------------------------------------------------------------------
   574→
   575→message ProductQuestion {
   576→  int64 id = 1;
   577→  int64 product_id = 2;
   578→  string product_title = 3;
   579→  int64 user_id = 4;
   580→  string user_nickname = 5;
   581→  string content = 6;
   582→  repeated string images = 7;
   583→  string reply = 8;
   584→  string reply_at = 9;
   585→  google.protobuf.Timestamp created_at = 10;
   586→}
   587→
   588→message ListProductQuestionsRequest {
   589→  int64 product_id = 1;
   590→  shopstack.common.v1.PageRequest page = 2;
   591→}
   592→
   593→message ListProductQuestionsResponse {
   594→  repeated ProductQuestion questions = 1;
   595→  shopstack.common.v1.PageMeta meta = 2;
   596→}
   597→
   598→message CreateQuestionRequest {
   599→  int64 product_id = 1;
   600→  string content = 2;
   601→  repeated string images = 3;
   602→}
   603→
   604→message AnswerQuestionRequest {
   605→  int64 id = 1;
   606→  string reply = 2;
   607→}
   608→
   609→message ListQuestionsRequest {
   610→  shopstack.common.v1.PageRequest page = 1;
   611→  string keyword = 2;
   612→  int64 product_id = 3;
   613→}
   614→
   615→message ListQuestionsResponse {
   616→  repeated ProductQuestion questions = 1;
   617→  shopstack.common.v1.PageMeta meta = 2;
   618→}
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:16:09

<details><summary>🧠 思考过程</summary>

```
Now the marketing proto.
```

</details>

<details><summary>🛠 read</summary>

```
1→syntax = "proto3";
     2→
     3→package shopstack.marketing.v1;
     4→
     5→option go_package = "github.com/shopstack/platform/gen/go/marketing/v1;marketingv1";
     6→
     7→import "google/api/annotations.proto";
     8→import "google/protobuf/timestamp.proto";
     9→import "shopstack/common/v1/common.proto";
    10→
    11→message Coupon {
    12→  int64 id = 1;
    13→  string name = 2;
    14→  string code = 3;
    15→  shopstack.common.v1.CouponType type = 4;
    16→  int64 face_value_cents = 5;  // 满减金额
    17→  int32 percent = 6;           // 折扣百分比，如 85 表示 8.5 折
    18→  int64 min_amount_cents = 7;  // 使用门槛
    19→  int64 max_discount_cents = 8;// 最大优惠金额
    20→  int64 total_quantity = 9;    // 发行总量
    21→  int64 received_quantity = 10;
    22→  int64 used_quantity = 11;
    23→  int64 per_user_limit = 12;
    24→  int64 start_time = 13;
    25→  int64 end_time = 14;
    26→  int64 category_id = 15;      // 限定分类，0 = 全场
    27→  bool enabled = 16;
    28→  google.protobuf.Timestamp created_at = 17;
    29→}
    30→
    31→message UserCoupon {
    32→  int64 id = 1;
    33→  int64 user_id = 2;
    34→  int64 coupon_id = 3;
    35→  Coupon coupon = 4;
    36→  shopstack.common.v1.UserCouponStatus status = 5;
    37→  int64 order_id = 6;
    38→  google.protobuf.Timestamp received_at = 7;
    39→  google.protobuf.Timestamp used_at = 8;
    40→}
    41→
    42→message Promotion {
    43→  int64 id = 1;
    44→  string name = 2;
    45→  string description = 3;
    46→  int32 type = 4;       // 1 满减 2 折扣 3 秒杀 4 拼团
    47→  int32 status = 5;     // 0 未开始 1 进行中 2 已结束 3 已下线
    48→  int64 start_time = 6;
    49→  int64 end_time = 7;
    50→  int64 min_amount_cents = 8;
    51→  int64 discount_cents = 9;
    52→  int32 percent = 10;
    53→  int64 product_id = 11;
    54→  int32 limit_per_user = 12;
    55→  int64 sold_count = 13;
    56→  string banner_image = 14;
    57→  google.protobuf.Timestamp created_at = 15;
    58→}
    59→
    60→message ListCouponsRequest {
    61→  shopstack.common.v1.PageRequest page = 1;
    62→  string keyword = 2;
    63→  int32 type = 3;
    64→  bool enabled = 4;
    65→  bool available = 5; // 仅当前可领取
    66→  int64 min_amount_cents = 10; // 按使用门槛筛选
    67→  int32 coupon_category = 11; // 券分类：0 全部 1 临期 2 品类券 3 通用券
    68→}
    69→
    70→message ListCouponsResponse {
    71→  repeated Coupon coupons = 1;
    72→  shopstack.common.v1.PageMeta meta = 2;
    73→}
    74→
    75→message SaveCouponRequest {
    76→  int64 id = 1;
    77→  string name = 2;
    78→  string code = 3;
    79→  int32 type = 4;
    80→  int64 face_value_cents = 5;
    81→  int32 percent = 6;
    82→  int64 min_amount_cents = 7;
    83→  int64 max_discount_cents = 8;
    84→  int64 total_quantity = 9;
    85→  int64 per_user_limit = 10;
    86→  int64 start_time = 11;
    87→  int64 end_time = 12;
    88→  int64 category_id = 13;
    89→  bool enabled = 14;
    90→}
    91→
    92→message DeleteCouponRequest {
    93→  int64 id = 1;
    94→}
    95→
    96→message ReceiveCouponRequest {
    97→  int64 user_id = 1;
    98→  int64 coupon_id = 2;
    99→}
   100→
   101→message ListUserCouponsRequest {
   102→  int64 user_id = 1;
   103→  int32 status = 2;
   104→  shopstack.common.v1.PageRequest page = 3;
   105→}
   106→
   107→message ListUserCouponsResponse {
   108→  repeated UserCoupon coupons = 1;
   109→  shopstack.common.v1.PageMeta meta = 2;
   110→  int32 available_count = 3;
   111→}
   112→
   113→message ListPromotionsRequest {
   114→  shopstack.common.v1.PageRequest page = 1;
   115→  int32 status = 2;
   116→  string keyword = 3;
   117→  int32 type = 4;
   118→  int64 product_id = 10; // 按商品筛选活动
   119→  int32 promotion_type = 11; // 活动类型：1 满减 2 折扣 3 秒杀 4 拼团 5 新品首发 6 会员专享
   120→}
   121→
   122→message ListPromotionsResponse {
   123→  repeated Promotion promotions = 1;
   124→  shopstack.common.v1.PageMeta meta = 2;
   125→}
   126→
   127→message SavePromotionRequest {
   128→  int64 id = 1;
   129→  string name = 2;
   130→  string description = 3;
   131→  int32 type = 4;
   132→  int32 status = 5;
   133→  int64 start_time = 6;
   134→  int64 end_time = 7;
   135→  int64 min_amount_cents = 8;
   136→  int64 discount_cents = 9;
   137→  int32 percent = 10;
   138→  int64 product_id = 11;
   139→  int32 limit_per_user = 12;
   140→  string banner_image = 13;
   141→}
   142→
   143→message DeletePromotionRequest {
   144→  int64 id = 1;
   145→}
   146→
   147→// 结算预览：计算可用券与最终应付
   148→message PreviewCheckoutRequest {
   149→  int64 user_id = 1;
   150→  repeated StockItem items = 2;
   151→  int64 address_id = 3;
   152→  int64 coupon_id = 4;
   153→  int64 points_used = 5;
   154→}
   155→
   156→message StockItem {
   157→  int64 sku_id = 1;
   158→  int64 product_id = 2;
   159→  int32 quantity = 3;
   160→  int64 price_cents = 4;
   161→}
   162→
   163→message PreviewCheckoutResponse {
   164→  int64 total_amount_cents = 1;
   165→  int64 discount_cents = 2;
   166→  int64 coupon_discount_cents = 3;
   167→  int64 points_discount_cents = 4;
   168→  int64 freight_cents = 5;
   169→  int64 payable_cents = 6;
   170→  repeated UserCoupon available_coupons = 7;
   171→  repeated Promotion active_promotions = 8;
   172→}
   173→
   174→service MarketingService {
   175→  rpc ListCoupons(ListCouponsRequest) returns (ListCouponsResponse) {
   176→    option (google.api.http) = { get: "/api/v1/coupons" };
   177→  }
   178→  rpc SaveCoupon(SaveCouponRequest) returns (Coupon) {
   179→    option (google.api.http) = { post: "/api/v1/admin/coupons" body: "*" };
   180→  }
   181→  rpc DeleteCoupon(DeleteCouponRequest) returns (shopstack.common.v1.OperationResult) {
   182→    option (google.api.http) = { delete: "/api/v1/admin/coupons/{id}" };
   183→  }
   184→  rpc ReceiveCoupon(ReceiveCouponRequest) returns (UserCoupon) {
   185→    option (google.api.http) = { post: "/api/v1/coupons/{coupon_id}/receive" body: "*" };
   186→  }
   187→  rpc ListUserCoupons(ListUserCouponsRequest) returns (ListUserCouponsResponse) {
   188→    option (google.api.http) = { get: "/api/v1/users/coupons" };
   189→  }
   190→  rpc ListPromotions(ListPromotionsRequest) returns (ListPromotionsResponse) {
   191→    option (google.api.http) = { get: "/api/v1/promotions" };
   192→  }
   193→  rpc SavePromotion(SavePromotionRequest) returns (Promotion) {
   194→    option (google.api.http) = { post: "/api/v1/admin/promotions" body: "*" };
   195→  }
   196→  rpc DeletePromotion(DeletePromotionRequest) returns (shopstack.common.v1.OperationResult) {
   197→    option (google.api.http) = { delete: "/api/v1/admin/promotions/{id}" };
   198→  }
   199→  rpc PreviewCheckout(PreviewCheckoutRequest) returns (PreviewCheckoutResponse) {
   200→    option (google.api.http) = { post: "/api/v1/marketing/preview" body: "*" };
   201→  }
   202→  rpc SignIn(SignInRequest) returns (GetSignInStatusResponse) {
   203→    option (google.api.http) = { post: "/api/v1/marketing/sign-in" };
   204→  }
   205→  rpc GetSignInStatus(GetSignInStatusRequest) returns (GetSignInStatusResponse) {
   206→    option (google.api.http) = { get: "/api/v1/marketing/sign-in" };
   207→  }
   208→  rpc ListTasks(ListTasksRequest) returns (ListTasksResponse) {
   209→    option (google.api.http) = { get: "/api/v1/marketing/tasks" };
   210→  }
   211→  rpc ClaimTask(ClaimTaskRequest) returns (UserTask) {
   212→    option (google.api.http) = { post: "/api/v1/marketing/tasks/{task_id}/claim" };
   213→  }
   214→  rpc GetPromotion(GetPromotionRequest) returns (GetPromotionResponse) {
   215→    option (google.api.http) = { get: "/api/v1/promotions/{id}" };
   216→  }
   217→  rpc ListPromotionProducts(ListPromotionProductsRequest) returns (ListPromotionProductsResponse) {
   218→    option (google.api.http) = { get: "/api/v1/promotions/{promotion_id}/products" };
   219→  }
   220→  rpc ListPromotionSessions(ListPromotionSessionsRequest) returns (ListPromotionSessionsResponse) {
   221→    option (google.api.http) = { get: "/api/v1/promotions/{promotion_id}/sessions" };
   222→  }
   223→  rpc SavePromotionSession(SavePromotionSessionRequest) returns (PromotionSession) {
   224→    option (google.api.http) = { post: "/api/v1/admin/promotion-sessions" };
   225→  }
   226→  rpc ListGroupBuys(ListGroupBuysRequest) returns (ListGroupBuysResponse) {
   227→    option (google.api.http) = { get: "/api/v1/group-buys" };
   228→  }
   229→  rpc GetGroupBuy(GetGroupBuyRequest) returns (GetGroupBuyResponse) {
   230→    option (google.api.http) = { get: "/api/v1/group-buys/{id}" };
   231→  }
   232→  rpc JoinGroupBuy(JoinGroupBuyRequest) returns (GroupBuy) {
   233→    option (google.api.http) = { post: "/api/v1/group-buys/{id}/join" };
   234→  }
   235→  rpc SaveGroupBuy(SaveGroupBuyRequest) returns (GroupBuy) {
   236→    option (google.api.http) = { post: "/api/v1/admin/group-buys" };
   237→  }
   238→  rpc ListUserLevels(ListUserLevelsRequest) returns (ListUserLevelsResponse) {
   239→    option (google.api.http) = { get: "/api/v1/marketing/levels" };
   240→  }
   241→}
   242→
   243→// EXTRA_MARKER: 由 scripts/extend-proto.py 追加的消息定义
   244→
   245→// ---------------------------------------------------------------------------
   246→// 签到
   247→// ---------------------------------------------------------------------------
   248→
   249→message SignInRequest {}
   250→
   251→message SignInCalendarDay {
   252→  string date = 1;
   253→  bool signed = 2;
   254→  int32 points = 3;
   255→}
   256→
   257→message GetSignInStatusRequest {}
   258→
   259→message GetSignInStatusResponse {
   260→  bool signed_today = 1;
   261→  int32 continuous_days = 2;
   262→  int32 total_days = 3;
   263→  int32 points_awarded = 4;
   264→  int32 next_points = 5;
   265→  repeated SignInCalendarDay calendar = 6;
   266→}
   267→
   268→// ---------------------------------------------------------------------------
   269→// 任务中心
   270→// ---------------------------------------------------------------------------
   271→
   272→message MarketingTask {
   273→  int64 id = 1;
   274→  string name = 2;
   275→  string description = 3;
   276→  int32 type = 4;   // 1 浏览 2 下单 3 分享 4 评价 5 签到 6 邀请
   277→  int32 target_count = 5;
   278→  int32 reward_points = 6;
   279→  int64 reward_coupon_id = 7;
   280→  int32 sort = 8;
   281→  bool enabled = 9;
   282→  string icon = 10;
   283→}
   284→
   285→message UserTask {
   286→  int64 task_id = 1;
   287→  string name = 2;
   288→  string description = 3;
   289→  int32 type = 4;
   290→  int32 progress = 5;
   291→  int32 target_count = 6;
   292→  bool completed = 7;
   293→  bool claimed = 8;
   294→  int32 reward_points = 9;
   295→  int64 reward_coupon_id = 10;
   296→  string icon = 11;
   297→}
   298→
   299→message ListTasksRequest {
   300→  shopstack.common.v1.PageRequest page = 1;
   301→}
   302→
   303→message ListTasksResponse {
   304→  repeated UserTask tasks = 1;
   305→  shopstack.common.v1.PageMeta meta = 2;
   306→}
   307→
   308→message ClaimTaskRequest {
   309→  int64 task_id = 1;
   310→}
   311→
   312→// ---------------------------------------------------------------------------
   313→// 活动详情 / 场次
   314→// ---------------------------------------------------------------------------
   315→
   316→// PromotionProduct 是营销域内嵌的商品摘要，避免跨域依赖商品域消息。
   317→message PromotionProduct {
   318→  int64 id = 1;
   319→  string title = 2;
   320→  string image = 3;
   321→  int64 min_price_cents = 4;
   322→  int64 max_price_cents = 5;
   323→  int32 stock_total = 6;
   324→  int32 sales = 7;
   325→  int32 status = 8;
   326→}
   327→
   328→message GetPromotionRequest {
   329→  int64 id = 1;
   330→}
   331→
   332→message GetPromotionResponse {
   333→  Promotion promotion = 1;
   334→  repeated PromotionProduct products = 2;
   335→  repeated PromotionSession sessions = 3;
   336→}
   337→
   338→message ListPromotionProductsRequest {
   339→  int64 promotion_id = 1;
   340→  shopstack.common.v1.PageRequest page = 2;
   341→}
   342→
   343→message ListPromotionProductsResponse {
   344→  repeated PromotionProduct products = 1;
   345→  shopstack.common.v1.PageMeta meta = 2;
   346→}
   347→
   348→message PromotionSession {
   349→  int64 id = 1;
   350→  int64 promotion_id = 2;
   351→  string name = 3;
   352→  int64 start_time = 4; // unix 秒
   353→  int64 end_time = 5;   // unix 秒
   354→  int32 stock = 6;
   355→  int32 sold_count = 7;
   356→  int32 status = 8; // 0 未开始 1 进行中 2 已结束
   357→}
   358→
   359→message ListPromotionSessionsRequest {
   360→  int64 promotion_id = 1;
   361→  shopstack.common.v1.PageRequest page = 2;
   362→}
   363→
   364→message ListPromotionSessionsResponse {
   365→  repeated PromotionSession sessions = 1;
   366→  shopstack.common.v1.PageMeta meta = 2;
   367→}
   368→
   369→message SavePromotionSessionRequest {
   370→  int64 id = 1;
   371→  int64 promotion_id = 2;
   372→  string name = 3;
   373→  int64 start_time = 4;
   374→  int64 end_time = 5;
   375→  int32 stock = 6;
   376→}
   377→
   378→// ---------------------------------------------------------------------------
   379→// 拼团
   380→// ---------------------------------------------------------------------------
   381→
   382→message GroupBuy {
   383→  int64 id = 1;
   384→  string name = 2;
   385→  string description = 3;
   386→  int64 promotion_id = 4;
   387→  int64 product_id = 5;
   388→  string product_title = 6;
   389→  string product_image = 7;
   390→  int64 price_cents = 8;
   391→  int64 original_price_cents = 9;
   392→  int32 required_members = 10;
   393→  int32 joined_members = 11;
   394→  int32 group_size = 12;
   395→  int32 status = 13; // 0 未开始 1 进行中 2 已结束 3 已下线
   396→  int64 start_time = 14;
   397→  int64 end_time = 15;
   398→  string banner_image = 16;
   399→}
   400→
   401→message GroupBuyMember {
   402→  int64 id = 1;
   403→  int64 group_buy_id = 2;
   404→  int64 user_id = 3;
   405→  string user_nickname = 4;
   406→  google.protobuf.Timestamp joined_at = 5;
   407→}
   408→
   409→message ListGroupBuysRequest {
   410→  shopstack.common.v1.PageRequest page = 1;
   411→  string keyword = 2;
   412→  int32 status = 3;
   413→}
   414→
   415→message ListGroupBuysResponse {
   416→  repeated GroupBuy group_buys = 1;
   417→  shopstack.common.v1.PageMeta meta = 2;
   418→}
   419→
   420→message GetGroupBuyRequest {
   421→  int64 id = 1;
   422→}
   423→
   424→message GetGroupBuyResponse {
   425→  GroupBuy group_buy = 1;
   426→  repeated GroupBuyMember members = 2;
   427→}
   428→
   429→message JoinGroupBuyRequest {
   430→  int64 id = 1;
   431→  int32 quantity = 2;
   432→}
   433→
   434→message SaveGroupBuyRequest {
   435→  int64 id = 1;
   436→  string name = 2;
   437→  string description = 3;
   438→  int64 promotion_id = 4;
   439→  int64 product_id = 5;
   440→  int64 price_cents = 6;
   441→  int32 required_members = 7;
   442→  int64 start_time = 8;
   443→  int64 end_time = 9;
   444→  string banner_image = 10;
   445→}
   446→
   447→// ---------------------------------------------------------------------------
   448→// 会员等级说明
   449→// ---------------------------------------------------------------------------
   450→
   451→message MarketingUserLevel {
   452→  int64 id = 1;
   453→  string name = 2;
   454→  int32 level = 3;
   455→  int32 min_growth = 4;
   456→  int32 max_growth = 5;
   457→  int32 discount_percent = 6;
   458→  string icon = 7;
   459→  string description = 8;
   460→  repeated string benefits = 9;
   461→  int32 sort = 10;
   462→}
   463→
   464→message ListUserLevelsRequest {}
   465→
   466→message ListUserLevelsResponse {
   467→  repeated MarketingUserLevel levels = 1;
   468→}
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:16:11

<details><summary>🧠 思考过程</summary>

```
Note: the task brief says some RPC names differ from proto (e.g. SignIn returns SignInResult in brief but proto says GetSignInStatusResponse; GetPromotion returns Promotion in brief but proto says GetPromotionResponse). Proto is authoritative. Also GetSignInStatus returns GetSignInStatusResponse.

Now let's read the existing implementation files.
```

</details>

Now let me read the existing implementation patterns.

<details><summary>🛠 read</summary>

```
1→// Package product 实现商品、分类与评价相关的业务能力。
     2→package product
     3→
     4→import (
     5→	"time"
     6→
     7→	"gorm.io/gorm"
     8→)
     9→
    10→// 商品状态
    11→const (
    12→	StatusDraft    = 1
    13→	StatusOnShelf  = 2
    14→	StatusOffShelf = 3
    15→)
    16→
    17→// Category 是商品分类模型。
    18→type Category struct {
    19→	ID          uint64         `gorm:"primaryKey;autoIncrement" json:"id"`
    20→	Name        string         `gorm:"type:varchar(64);not null" json:"name"`
    21→	ParentID    uint64         `gorm:"column:parent_id;not null;default:0;index" json:"parent_id"`
    22→	Icon        string         `gorm:"type:varchar(512);not null;default:''" json:"icon"`
    23→	Description string         `gorm:"type:varchar(255);not null;default:''" json:"description"`
    24→	Sort        int            `gorm:"not null;default:0" json:"sort"`
    25→	Visible     bool           `gorm:"not null;default:true" json:"visible"`
    26→	CreatedAt   time.Time      `json:"created_at"`
    27→	UpdatedAt   time.Time      `json:"updated_at"`
    28→	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
    29→}
    30→
    31→// TableName 指定表名。
    32→func (Category) TableName() string { return "categories" }
    33→
    34→// Product 是商品（SPU）模型。
    35→type Product struct {
    36→	ID            uint64         `gorm:"primaryKey;autoIncrement" json:"id"`
    37→	Title         string         `gorm:"type:varchar(200);not null" json:"title"`
    38→	Subtitle      string         `gorm:"type:varchar(255);not null;default:''" json:"subtitle"`
    39→	Cover         string         `gorm:"type:varchar(512);not null;default:''" json:"cover"`
    40→	CategoryID    uint64         `gorm:"column:category_id;not null;default:0;index" json:"category_id"`
    41→	MinPriceCents int64          `gorm:"column:min_price_cents;not null;default:0" json:"min_price_cents"`
    42→	MaxPriceCents int64          `gorm:"column:max_price_cents;not null;default:0" json:"max_price_cents"`
    43→	SalesCount    int            `gorm:"column:sales_count;not null;default:0" json:"sales_count"`
    44→	Status        int8           `gorm:"not null;default:1;index" json:"status"`
    45→	Description   string         `gorm:"type:mediumtext" json:"description"`
    46→	Tags          string         `gorm:"type:varchar(255);not null;default:''" json:"tags"`
    47→	CreatedAt     time.Time      `json:"created_at"`
    48→	UpdatedAt     time.Time      `json:"updated_at"`
    49→	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
    50→}
    51→
    52→// TableName 指定表名。
    53→func (Product) TableName() string { return "products" }
    54→
    55→// ProductSku 是商品规格模型。
    56→type ProductSku struct {
    57→	ID                 uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
    58→	ProductID          uint64    `gorm:"column:product_id;not null;index" json:"product_id"`
    59→	SKUCode            string    `gorm:"column:sku_code;type:varchar(64);not null;default:'';uniqueIndex" json:"sku_code"`
    60→	SpecText           string    `gorm:"column:spec_text;type:varchar(255);not null;default:''" json:"spec_text"`
    61→	Specs              string    `gorm:"type:varchar(512);not null;default:'{}'" json:"specs"`
    62→	PriceCents         int64     `gorm:"column:price_cents;not null;default:0" json:"price_cents"`
    63→	OriginalPriceCents int64     `gorm:"column:original_price_cents;not null;default:0" json:"original_price_cents"`
    64→	Stock              int       `gorm:"not null;default:0" json:"stock"`
    65→	Image              string    `gorm:"type:varchar(512);not null;default:''" json:"image"`
    66→	Sort               int       `gorm:"not null;default:0" json:"sort"`
    67→	SalesCount         int       `gorm:"column:sales_count;not null;default:0" json:"sales_count"`
    68→	WeightGrams        int       `gorm:"column:weight_grams;not null;default:0" json:"weight_grams"`
    69→	Enabled            bool      `gorm:"not null;default:true" json:"enabled"`
    70→	CreatedAt          time.Time `json:"created_at"`
    71→	UpdatedAt          time.Time `json:"updated_at"`
    72→}
    73→
    74→// TableName 指定表名。
    75→func (ProductSku) TableName() string { return "product_skus" }
    76→
    77→// ProductImage 是商品图集模型。
    78→type ProductImage struct {
    79→	ID        uint64 `gorm:"primaryKey;autoIncrement" json:"id"`
    80→	ProductID uint64 `gorm:"column:product_id;not null;index" json:"product_id"`
    81→	URL       string `gorm:"type:varchar(512);not null" json:"url"`
    82→	Alt       string `gorm:"type:varchar(255);not null;default:''" json:"alt"`
    83→	Sort      int    `gorm:"not null;default:0" json:"sort"`
    84→}
    85→
    86→// TableName 指定表名。
    87→func (ProductImage) TableName() string { return "product_images" }
    88→
    89→// ProductAttribute 是商品参数模型。
    90→type ProductAttribute struct {
    91→	ID        uint64 `gorm:"primaryKey;autoIncrement" json:"id"`
    92→	ProductID uint64 `gorm:"column:product_id;not null;index" json:"product_id"`
    93→	Name      string `gorm:"type:varchar(64);not null" json:"name"`
    94→	Value     string `gorm:"type:varchar(255);not null;default:''" json:"value"`
    95→	Sort      int    `gorm:"not null;default:0" json:"sort"`
    96→}
    97→
    98→// TableName 指定表名。
    99→func (ProductAttribute) TableName() string { return "product_attributes" }
   100→
   101→// Banner 是轮播位模型。
   102→type Banner struct {
   103→	ID        uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
   104→	Title     string    `gorm:"type:varchar(128);not null;default:''" json:"title"`
   105→	Image     string    `gorm:"type:varchar(512);not null;default:''" json:"image"`
   106→	Link      string    `gorm:"type:varchar(512);not null;default:''" json:"link"`
   107→	Sort      int       `gorm:"not null;default:0" json:"sort"`
   108→	Position  string    `gorm:"type:varchar(64);not null;default:'home_banner';index" json:"position"`
   109→	Visible   bool      `gorm:"not null;default:true" json:"visible"`
   110→	CreatedAt time.Time `json:"created_at"`
   111→	UpdatedAt time.Time `json:"updated_at"`
   112→}
   113→
   114→// TableName 指定表名。
   115→func (Banner) TableName() string { return "banners" }
   116→
   117→// Review 是商品评价模型。
   118→type Review struct {
   119→	ID           uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
   120→	ProductID    uint64    `gorm:"column:product_id;not null;index" json:"product_id"`
   121→	ProductTitle string    `gorm:"column:product_title;type:varchar(200);not null;default:''" json:"product_title"`
   122→	UserID       uint64    `gorm:"column:user_id;not null;index" json:"user_id"`
   123→	UserNickname string    `gorm:"column:user_nickname;type:varchar(64);not null;default:''" json:"user_nickname"`
   124→	UserAvatar   string    `gorm:"column:user_avatar;type:varchar(512);not null;default:''" json:"user_avatar"`
   125→	Rating       int8      `gorm:"not null;default:5" json:"rating"`
   126→	Content      string    `gorm:"type:text" json:"content"`
   127→	Images       string    `gorm:"type:varchar(1024);not null;default:''" json:"images"`
   128→	SKUID        uint64    `gorm:"column:sku_id;not null;default:0" json:"sku_id"`
   129→	SKUText      string    `gorm:"column:sku_text;type:varchar(255);not null;default:''" json:"sku_text"`
   130→	Status       int8      `gorm:"not null;default:1;index" json:"status"`
   131→	AdminReply   string    `gorm:"column:admin_reply;type:varchar(1024);not null;default:''" json:"admin_reply"`
   132→	LikeCount    int       `gorm:"column:like_count;not null;default:0" json:"like_count"`
   133→	CreatedAt    time.Time `json:"created_at"`
   134→	UpdatedAt    time.Time `json:"updated_at"`
   135→}
   136→
   137→// TableName 指定表名。
   138→func (Review) TableName() string { return "reviews" }
   139→
   140→// 评价状态
   141→const (
   142→	ReviewPending  = 1
   143→	ReviewApproved = 2
   144→	ReviewRejected = 3
   145→)
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:16:14

<details><summary>🛠 read</summary>

```
1→package product
     2→
     3→import (
     4→	"context"
     5→	"errors"
     6→	"strings"
     7→
     8→	"gorm.io/gorm"
     9→
    10→	"github.com/shopstack/platform/backend/internal/errs"
    11→)
    12→
    13→// Repo 封装商品域的数据访问。
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
    25→// 分类
    26→// ---------------------------------------------------------------------------
    27→
    28→// ListCategories 查询分类列表。
    29→func (r *Repo) ListCategories(ctx context.Context, parentID uint64, onlyVisible bool) ([]Category, error) {
    30→	q := r.db.WithContext(ctx).Model(&Category{})
    31→	if parentID > 0 {
    32→		q = q.Where("parent_id = ?", parentID)
    33→	}
    34→	if onlyVisible {
    35→		q = q.Where("visible = ?", true)
    36→	}
    37→	var list []Category
    38→	err := q.Order("sort ASC, id ASC").Find(&list).Error
    39→	return list, err
    40→}
    41→
    42→// AllCategories 查询全部分类（用于构建树）。
    43→func (r *Repo) AllCategories(ctx context.Context) ([]Category, error) {
    44→	var list []Category
    45→	err := r.db.WithContext(ctx).Order("sort ASC, id ASC").Find(&list).Error
    46→	return list, err
    47→}
    48→
    49→// FindCategory 按 ID 查询分类。
    50→func (r *Repo) FindCategory(ctx context.Context, id uint64) (*Category, error) {
    51→	var c Category
    52→	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&c).Error; err != nil {
    53→		if errors.Is(err, gorm.ErrRecordNotFound) {
    54→			return nil, errs.New(errs.CodeNotFound, "分类不存在")
    55→		}
    56→		return nil, err
    57→	}
    58→	return &c, nil
    59→}
    60→
    61→// SaveCategory 新增或更新分类。
    62→func (r *Repo) SaveCategory(ctx context.Context, c *Category) error {
    63→	return r.db.WithContext(ctx).Save(c).Error
    64→}
    65→
    66→// CategoryHasChildren 判断分类下是否有子分类。
    67→func (r *Repo) CategoryHasChildren(ctx context.Context, id uint64) (bool, error) {
    68→	var count int64
    69→	err := r.db.WithContext(ctx).Model(&Category{}).
    70→		Where("parent_id = ?", id).Count(&count).Error
    71→	return count > 0, err
    72→}
    73→
    74→// DeleteCategory 删除分类。
    75→func (r *Repo) DeleteCategory(ctx context.Context, id uint64) error {
    76→	return r.db.WithContext(ctx).Delete(&Category{}, id).Error
    77→}
    78→
    79→// CategoryProductCounts 统计各分类下的商品数量。
    80→func (r *Repo) CategoryProductCounts(ctx context.Context) (map[uint64]int32, error) {
    81→	type row struct {
    82→		CategoryID uint64
    83→		Count      int32
    84→	}
    85→	var rows []row
    86→	err := r.db.WithContext(ctx).Model(&Product{}).
    87→		Select("category_id, COUNT(*) AS count").
    88→		Where("status = ?", StatusOnShelf).
    89→		Group("category_id").Scan(&rows).Error
    90→	if err != nil {
    91→		return nil, err
    92→	}
    93→	out := make(map[uint64]int32, len(rows))
    94→	for _, rw := range rows {
    95→		out[rw.CategoryID] = rw.Count
    96→	}
    97→	return out, nil
    98→}
    99→
   100→// ---------------------------------------------------------------------------
   101→// 商品
   102→// ---------------------------------------------------------------------------
   103→
   104→// ProductQuery 描述商品查询条件。
   105→type ProductQuery struct {
   106→	Keyword       string
   107→	CategoryID    uint64
   108→	Status        int8
   109→	MinPriceCents int64
   110→	MaxPriceCents int64
   111→	OnlyInStock   bool
   112→	Tags          []string
   113→	Sort          string
   114→	Page          int
   115→	PageSize      int
   116→}
   117→
   118→// ListProducts 分页查询商品。
   119→func (r *Repo) ListProducts(ctx context.Context, q ProductQuery) ([]Product, int64, error) {
   120→	tx := r.db.WithContext(ctx).Model(&Product{})
   121→
   122→	if q.Keyword != "" {
   123→		like := "%" + q.Keyword + "%"
   124→		tx = tx.Where("title LIKE ? OR subtitle LIKE ? OR description LIKE ?", like, like, like)
   125→	}
   126→	if q.CategoryID > 0 {
   127→		// 分类包含其子分类
   128→		tx = tx.Where("category_id = ? OR category_id IN (?)", q.CategoryID,
   129→			r.db.WithContext(ctx).Model(&Category{}).
   130→				Select("id").Where("parent_id = ?", q.CategoryID))
   131→	}
   132→	if q.Status > 0 {
   133→		tx = tx.Where("status = ?", q.Status)
   134→	}
   135→	if q.MinPriceCents > 0 {
   136→		tx = tx.Where("max_price_cents >= ?", q.MinPriceCents)
   137→	}
   138→	if q.MaxPriceCents > 0 {
   139→		tx = tx.Where("min_price_cents <= ?", q.MaxPriceCents)
   140→	}
   141→	for _, tag := range q.Tags {
   142→		if tag = strings.TrimSpace(tag); tag != "" {
   143→			tx = tx.Where("FIND_IN_SET(?, tags)", tag)
   144→		}
   145→	}
   146→	if q.OnlyInStock {
   147→		tx = tx.Where("id IN (?)", r.db.WithContext(ctx).Model(&ProductSku{}).
   148→			Select("product_id").Where("stock > ?", 0).Group("product_id"))
   149→	}
   150→
   151→	var total int64
   152→	if err := tx.Count(&total).Error; err != nil {
   153→		return nil, 0, err
   154→	}
   155→
   156→	switch q.Sort {
   157→	case "sales":
   158→		tx = tx.Order("sales_count DESC, id DESC")
   159→	case "price_asc":
   160→		tx = tx.Order("min_price_cents ASC, id DESC")
   161→	case "price_desc":
   162→		tx = tx.Order("min_price_cents DESC, id DESC")
   163→	case "newest":
   164→		tx = tx.Order("id DESC")
   165→	default:
   166→		tx = tx.Order("status DESC, sales_count DESC, id DESC")
   167→	}
   168→
   169→	var list []Product
   170→	err := tx.Offset((q.Page - 1) * q.PageSize).Limit(q.PageSize).Find(&list).Error
   171→	return list, total, err
   172→}
   173→
   174→// FindProduct 按 ID 查询商品。
   175→func (r *Repo) FindProduct(ctx context.Context, id uint64) (*Product, error) {
   176→	var p Product
   177→	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&p).Error; err != nil {
   178→		if errors.Is(err, gorm.ErrRecordNotFound) {
   179→			return nil, errs.New(errs.CodeProductNotFound, "商品不存在或已下架")
   180→		}
   181→		return nil, err
   182→	}
   183→	return &p, nil
   184→}
   185→
   186→// SaveProduct 新增或更新商品主信息。
   187→func (r *Repo) SaveProduct(ctx context.Context, p *Product) error {
   188→	return r.db.WithContext(ctx).Save(p).Error
   189→}
   190→
   191→// UpdateProductFields 更新商品的指定字段。
   192→func (r *Repo) UpdateProductFields(ctx context.Context, id uint64, fields map[string]any) error {
   193→	return r.db.WithContext(ctx).Model(&Product{}).Where("id = ?", id).Updates(fields).Error
   194→}
   195→
   196→// DeleteProduct 删除商品。
   197→func (r *Repo) DeleteProduct(ctx context.Context, id uint64) error {
   198→	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
   199→		if err := tx.Where("product_id = ?", id).Delete(&ProductSku{}).Error; err != nil {
   200→			return err
   201→		}
   202→		if err := tx.Where("product_id = ?", id).Delete(&ProductImage{}).Error; err != nil {
   203→			return err
   204→		}
   205→		if err := tx.Where("product_id = ?", id).Delete(&ProductAttribute{}).Error; err != nil {
   206→			return err
   207→		}
   208→		return tx.Delete(&Product{}, id).Error
   209→	})
   210→}
   211→
   212→// ProductCounts 统计商品数量。
   213→func (r *Repo) ProductCounts(ctx context.Context) (total int64, onShelf int64, err error) {
   214→	if err = r.db.WithContext(ctx).Model(&Product{}).Count(&total).Error; err != nil {
   215→		return
   216→	}
   217→	err = r.db.WithContext(ctx).Model(&Product{}).Where("status = ?", StatusOnShelf).Count(&onShelf).Error
   218→	return
   219→}
   220→
   221→// ---------------------------------------------------------------------------
   222→// SKU
   223→// ---------------------------------------------------------------------------
   224→
   225→// ProductSkus 查询商品的规格列表。
   226→func (r *Repo) ProductSkus(ctx context.Context, productID uint64) ([]ProductSku, error) {
   227→	var list []ProductSku
   228→	err := r.db.WithContext(ctx).Where("product_id = ?", productID).
   229→		Order("sort ASC, id ASC").Find(&list).Error
   230→	return list, err
   231→}
   232→
   233→// SkusByIDs 按 ID 批量查询规格。
   234→func (r *Repo) SkusByIDs(ctx context.Context, ids []uint64) ([]ProductSku, error) {
   235→	if len(ids) == 0 {
   236→		return []ProductSku{}, nil
   237→	}
   238→	var list []ProductSku
   239→	err := r.db.WithContext(ctx).Where("id IN ?", ids).Find(&list).Error
   240→	return list, err
   241→}
   242→
   243→// FindSku 按 ID 查询规格。
   244→func (r *Repo) FindSku(ctx context.Context, id uint64) (*ProductSku, error) {
   245→	var s ProductSku
   246→	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&s).Error; err != nil {
   247→		if errors.Is(err, gorm.ErrRecordNotFound) {
   248→			return nil, errs.New(errs.CodeSkuNotFound, "商品规格不存在")
   249→		}
   250→		return nil, err
   251→	}
   252→	return &s, nil
   253→}
   254→
   255→// SaveSku 新增或更新规格。
   256→func (r *Repo) SaveSku(ctx context.Context, s *ProductSku) error {
   257→	return r.db.WithContext(ctx).Save(s).Error
   258→}
   259→
   260→// DeleteSku 删除规格。
   261→func (r *Repo) DeleteSku(ctx context.Context, id uint64) error {
   262→	return r.db.WithContext(ctx).Delete(&ProductSku{}, id).Error
   263→}
   264→
   265→// RecalculateProductPrice 根据 SKU 重算商品价格区间。
   266→func (r *Repo) RecalculateProductPrice(ctx context.Context, productID uint64) error {
   267→	type agg struct {
   268→		Min int64
   269→		Max int64
   270→	}
   271→	var result agg
   272→	err := r.db.WithContext(ctx).Model(&ProductSku{}).
   273→		Select("COALESCE(MIN(price_cents),0) AS min, COALESCE(MAX(price_cents),0) AS max").
   274→		Where("product_id = ? AND enabled = ?", productID, true).
   275→		Scan(&result).Error
   276→	if err != nil {
   277→		return err
   278→	}
   279→	return r.UpdateProductFields(ctx, productID, map[string]any{
   280→		"min_price_cents": result.Min,
   281→		"max_price_cents": result.Max,
   282→	})
   283→}
   284→
   285→// IncrementSales 增加商品销量。
   286→func (r *Repo) IncrementSales(ctx context.Context, productID uint64, delta int) error {
   287→	return r.db.WithContext(ctx).Model(&Product{}).Where("id = ?", productID).
   288→		UpdateColumn("sales_count", gorm.Expr("GREATEST(sales_count + ?, 0)", delta)).Error
   289→}
   290→
   291→// ---------------------------------------------------------------------------
   292→// 图集与参数
   293→// ---------------------------------------------------------------------------
   294→
   295→// ProductImages 查询商品图集。
   296→func (r *Repo) ProductImages(ctx context.Context, productID uint64) ([]ProductImage, error) {
   297→	var list []ProductImage
   298→	err := r.db.WithContext(ctx).Where("product_id = ?", productID).Order("sort ASC, id ASC").Find(&list).Error
   299→	return list, err
   300→}
   301→
   302→// ReplaceProductImages 覆盖式更新商品图集。
   303→func (r *Repo) ReplaceProductImages(ctx context.Context, productID uint64, images []ProductImage) error {
   304→	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
   305→		if err := tx.Where("product_id = ?", productID).Delete(&ProductImage{}).Error; err != nil {
   306→			return err
   307→		}
   308→		if len(images) == 0 {
   309→			return nil
   310→		}
   311→		for i := range images {
   312→			images[i].ProductID = productID
   313→		}
   314→		return tx.Create(&images).Error
   315→	})
   316→}
   317→
   318→// ProductAttributes 查询商品参数。
   319→func (r *Repo) ProductAttributes(ctx context.Context, productID uint64) ([]ProductAttribute, error) {
   320→	var list []ProductAttribute
   321→	err := r.db.WithContext(ctx).Where("product_id = ?", productID).Order("sort ASC, id ASC").Find(&list).Error
   322→	return list, err
   323→}
   324→
   325→// ReplaceProductAttributes 覆盖式更新商品参数。
   326→func (r *Repo) ReplaceProductAttributes(ctx context.Context, productID uint64, attrs []ProductAttribute) error {
   327→	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
   328→		if err := tx.Where("product_id = ?", productID).Delete(&ProductAttribute{}).Error; err != nil {
   329→			return err
   330→		}
   331→		if len(attrs) == 0 {
   332→			return nil
   333→		}
   334→		for i := range attrs {
   335→			attrs[i].ProductID = productID
   336→		}
   337→		return tx.Create(&attrs).Error
   338→	})
   339→}
   340→
   341→// ---------------------------------------------------------------------------
   342→// 轮播
   343→// ---------------------------------------------------------------------------
   344→
   345→// ListBanners 查询轮播位。
   346→func (r *Repo) ListBanners(ctx context.Context, position string, onlyVisible bool) ([]Banner, error) {
   347→	q := r.db.WithContext(ctx).Model(&Banner{})
   348→	if position != "" {
   349→		q = q.Where("position = ?", position)
   350→	}
   351→	if onlyVisible {
   352→		q = q.Where("visible = ?", true)
   353→	}
   354→	var list []Banner
   355→	err := q.Order("sort ASC, id ASC").Find(&list).Error
   356→	return list, err
   357→}
   358→
   359→// SaveBanner 新增或更新轮播位。
   360→func (r *Repo) SaveBanner(ctx context.Context, b *Banner) error {
   361→	return r.db.WithContext(ctx).Save(b).Error
   362→}
   363→
   364→// DeleteBanner 删除轮播位。
   365→func (r *Repo) DeleteBanner(ctx context.Context, id uint64) error {
   366→	return r.db.WithContext(ctx).Delete(&Banner{}, id).Error
   367→}
   368→
   369→// ---------------------------------------------------------------------------
   370→// 评价
   371→// ---------------------------------------------------------------------------
   372→
   373→// ReviewQuery 描述评价查询条件。
   374→type ReviewQuery struct {
   375→	ProductID uint64
   376→	UserID    uint64
   377→	Status    int8
   378→	Keyword   string
   379→	Page      int
   380→	PageSize  int
   381→}
   382→
   383→// ListReviews 分页查询评价。
   384→func (r *Repo) ListReviews(ctx context.Context, q ReviewQuery) ([]Review, int64, error) {
   385→	tx := r.db.WithContext(ctx).Model(&Review{})
   386→	if q.ProductID > 0 {
   387→		tx = tx.Where("product_id = ?", q.ProductID)
   388→	}
   389→	if q.UserID > 0 {
   390→		tx = tx.Where("user_id = ?", q.UserID)
   391→	}
   392→	if q.Status > 0 {
   393→		tx = tx.Where("status = ?", q.Status)
   394→	}
   395→	if q.Keyword != "" {
   396→		like := "%" + q.Keyword + "%"
   397→		tx = tx.Where("content LIKE ? OR product_title LIKE ? OR user_nickname LIKE ?", like, like, like)
   398→	}
   399→
   400→	var total int64
   401→	if err := tx.Count(&total).Error; err != nil {
   402→		return nil, 0, err
   403→	}
   404→
   405→	var list []Review
   406→	err := tx.Order("id DESC").Offset((q.Page - 1) * q.PageSize).Limit(q.PageSize).Find(&list).Error
   407→	return list, total, err
   408→}
   409→
   410→// FindReview 按 ID 查询评价。
   411→func (r *Repo) FindReview(ctx context.Context, id uint64) (*Review, error) {
   412→	var rv Review
   413→	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&rv).Error; err != nil {
   414→		if errors.Is(err, gorm.ErrRecordNotFound) {
   415→			return nil, errs.New(errs.CodeNotFound, "评价不存在")
   416→		}
   417→		return nil, err
   418→	}
   419→	return &rv, nil
   420→}
   421→
   422→// SaveReview 新增评价。
   423→func (r *Repo) SaveReview(ctx context.Context, rv *Review) error {
   424→	return r.db.WithContext(ctx).Create(rv).Error
   425→}
   426→
   427→// UpdateReview 更新评价。
   428→func (r *Repo) UpdateReview(ctx context.Context, id uint64, fields map[string]any) error {
   429→	return r.db.WithContext(ctx).Model(&Review{}).Where("id = ?", id).Updates(fields).Error
   430→}
   431→
   432→// ReviewSummary 统计评价分布。
   433→func (r *Repo) ReviewSummary(ctx context.Context, productID uint64) (total, good, medium, bad int32, avg float64, err error) {
   434→	type row struct {
   435→		Rating int8
   436→		Count  int32
   437→	}
   438→	var rows []row
   439→	q := r.db.WithContext(ctx).Model(&Review{}).Where("status = ?", ReviewApproved)
   440→	if productID > 0 {
   441→		q = q.Where("product_id = ?", productID)
   442→	}
   443→	if err = q.Select("rating, COUNT(*) AS count").Group("rating").Scan(&rows).Error; err != nil {
   444→		return
   445→	}
   446→	var sum int64
   447→	for _, rw := range rows {
   448→		total += rw.Count
   449→		sum += int64(rw.Rating) * int64(rw.Count)
   450→		switch {
   451→		case rw.Rating >= 4:
   452→			good += rw.Count
   453→		case rw.Rating == 3:
   454→			medium += rw.Count
   455→		default:
   456→			bad += rw.Count
   457→		}
   458→	}
   459→	if total > 0 {
   460→		avg = float64(sum) / float64(total)
   461→	}
   462→	return
   463→}
   464→
   465→// ProductByIDs 按 ID 批量查询商品。
   466→func (r *Repo) ProductByIDs(ctx context.Context, ids []uint64) ([]Product, error) {
   467→	if len(ids) == 0 {
   468→		return []Product{}, nil
   469→	}
   470→	var list []Product
   471→	err := r.db.WithContext(ctx).Where("id IN ?", ids).Find(&list).Error
   472→	return list, err
   473→}
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:16:17

<details><summary>🛠 read</summary>

```
1→package product
     2→
     3→import (
     4→	"context"
     5→	"encoding/json"
     6→	"strconv"
     7→	"strings"
     8→	"time"
     9→
    10→	"google.golang.org/protobuf/types/known/timestamppb"
    11→
    12→	commonv1 "github.com/shopstack/platform/gen/go/common/v1"
    13→	productv1 "github.com/shopstack/platform/gen/go/product/v1"
    14→
    15→	"github.com/shopstack/platform/backend/internal/errs"
    16→	"github.com/shopstack/platform/backend/internal/mq"
    17→)
    18→
    19→// Service 承载商品域的业务逻辑。
    20→type Service struct {
    21→	repo *Repo
    22→	mq   *mq.Client
    23→}
    24→
    25→// NewService 构造商品服务。
    26→func NewService(repo *Repo, mqClient *mq.Client) *Service {
    27→	return &Service{repo: repo, mq: mqClient}
    28→}
    29→
    30→// ---------------------------------------------------------------------------
    31→// 商品列表与详情
    32→// ---------------------------------------------------------------------------
    33→
    34→// ListProducts 分页查询商品。
    35→func (s *Service) ListProducts(ctx context.Context, req *productv1.ListProductsRequest) (*productv1.ListProductsResponse, error) {
    36→	page, pageSize := normalizePage(req.GetPage())
    37→
    38→	list, total, err := s.repo.ListProducts(ctx, ProductQuery{
    39→		Keyword:       strings.TrimSpace(req.GetKeyword()),
    40→		CategoryID:    uint64(req.GetCategoryId()),
    41→		Status:        int8(req.GetStatus()),
    42→		MinPriceCents: req.GetMinPriceCents(),
    43→		MaxPriceCents: req.GetMaxPriceCents(),
    44→		OnlyInStock:   req.GetOnlyInStock(),
    45→		Tags:          req.GetTags(),
    46→		Sort:          req.GetSort(),
    47→		Page:          page,
    48→		PageSize:      pageSize,
    49→	})
    50→	if err != nil {
    51→		return nil, errs.Wrap(errs.CodeInternalError, "查询商品失败", err)
    52→	}
    53→
    54→	categoryNames, err := s.categoryNameMap(ctx)
    55→	if err != nil {
    56→		categoryNames = map[uint64]string{}
    57→	}
    58→
    59→	products := make([]*productv1.Product, 0, len(list))
    60→	for i := range list {
    61→		products = append(products, s.productToProto(&list[i], categoryNames))
    62→	}
    63→
    64→	return &productv1.ListProductsResponse{
    65→		Products: products,
    66→		Meta:     buildMeta(page, pageSize, total),
    67→	}, nil
    68→}
    69→
    70→// GetProduct 查询商品详情。
    71→func (s *Service) GetProduct(ctx context.Context, req *productv1.GetProductRequest) (*productv1.ProductDetail, error) {
    72→	p, err := s.repo.FindProduct(ctx, uint64(req.GetId()))
    73→	if err != nil {
    74→		return nil, err
    75→	}
    76→
    77→	skus, err := s.repo.ProductSkus(ctx, p.ID)
    78→	if err != nil {
    79→		return nil, errs.Wrap(errs.CodeInternalError, "查询商品规格失败", err)
    80→	}
    81→	images, err := s.repo.ProductImages(ctx, p.ID)
    82→	if err != nil {
    83→		return nil, errs.Wrap(errs.CodeInternalError, "查询商品图集失败", err)
    84→	}
    85→	attrs, err := s.repo.ProductAttributes(ctx, p.ID)
    86→	if err != nil {
    87→		return nil, errs.Wrap(errs.CodeInternalError, "查询商品参数失败", err)
    88→	}
    89→
    90→	total, _, _, _, avg, err := s.repo.ReviewSummary(ctx, p.ID)
    91→	if err != nil {
    92→		return nil, errs.Wrap(errs.CodeInternalError, "统计评价失败", err)
    93→	}
    94→
    95→	reviews, _, err := s.repo.ListReviews(ctx, ReviewQuery{
    96→		ProductID: p.ID, Status: ReviewApproved, Page: 1, PageSize: 5,
    97→	})
    98→	if err != nil {
    99→		return nil, errs.Wrap(errs.CodeInternalError, "查询评价失败", err)
   100→	}
   101→
   102→	// 相关推荐：同分类下销量最高的其它商品
   103→	related, _, err := s.repo.ListProducts(ctx, ProductQuery{
   104→		CategoryID: p.CategoryID, Status: StatusOnShelf, Sort: "sales", Page: 1, PageSize: 6,
   105→	})
   106→	if err != nil {
   107→		return nil, errs.Wrap(errs.CodeInternalError, "查询推荐商品失败", err)
   108→	}
   109→	relatedList := make([]*productv1.Product, 0, len(related))
   110→	categoryNames, _ := s.categoryNameMap(ctx)
   111→	for i := range related {
   112→		if related[i].ID == p.ID {
   113→			continue
   114→		}
   115→		relatedList = append(relatedList, s.productToProto(&related[i], categoryNames))
   116→		if len(relatedList) >= 6 {
   117→			break
   118→		}
   119→	}
   120→
   121→	categoryNames2, _ := s.categoryNameMap(ctx)
   122→	detail := &productv1.ProductDetail{
   123→		Product:      s.productToProto(p, categoryNames2),
   124→		Skus:         make([]*productv1.ProductSku, 0, len(skus)),
   125→		Images:       make([]*commonv1.ImageItem, 0, len(images)),
   126→		Attributes:   make([]*productv1.ProductAttribute, 0, len(attrs)),
   127→		Reviews:      make([]*productv1.Review, 0, len(reviews)),
   128→		ReviewCount:  total,
   129→		ReviewRating: avg,
   130→		Related:      relatedList,
   131→	}
   132→
   133→	for i := range skus {
   134→		detail.Skus = append(detail.Skus, skuToProto(&skus[i]))
   135→	}
   136→	for i := range images {
   137→		detail.Images = append(detail.Images, &commonv1.ImageItem{
   138→			Url: images[i].URL, Alt: images[i].Alt, Sort: int32(images[i].Sort),
   139→		})
   140→	}
   141→	for i := range attrs {
   142→		detail.Attributes = append(detail.Attributes, &productv1.ProductAttribute{
   143→			Id: int64(attrs[i].ID), ProductId: int64(attrs[i].ProductID),
   144→			Name: attrs[i].Name, Value: attrs[i].Value, Sort: int32(attrs[i].Sort),
   145→		})
   146→	}
   147→	for i := range reviews {
   148→		detail.Reviews = append(detail.Reviews, reviewToProto(&reviews[i]))
   149→	}
   150→
   151→	return detail, nil
   152→}
   153→
   154→// ---------------------------------------------------------------------------
   155→// 商品维护
   156→// ---------------------------------------------------------------------------
   157→
   158→// CreateProduct 新增商品。
   159→func (s *Service) CreateProduct(ctx context.Context, req *productv1.SaveProductRequest) (*productv1.Product, error) {
   160→	if strings.TrimSpace(req.GetTitle()) == "" {
   161→		return nil, errs.Invalid("商品标题不能为空")
   162→	}
   163→
   164→	p := &Product{
   165→		Title:       req.GetTitle(),
   166→		Subtitle:    req.GetSubtitle(),
   167→		Cover:       req.GetCover(),
   168→		CategoryID:  uint64(req.GetCategoryId()),
   169→		Description: req.GetDescription(),
   170→		Tags:        strings.Join(req.GetTags(), ","),
   171→		Status:      int8(req.GetStatus()),
   172→	}
   173→	if p.Status == 0 {
   174→		p.Status = StatusDraft
   175→	}
   176→	if p.Tags == "" {
   177→		p.Tags = ""
   178→	}
   179→
   180→	if err := s.repo.SaveProduct(ctx, p); err != nil {
   181→		return nil, errs.Wrap(errs.CodeInternalError, "创建商品失败", err)
   182→	}
   183→
   184→	if err := s.saveSubResources(ctx, p.ID, req); err != nil {
   185→		return nil, err
   186→	}
   187→	if err := s.repo.RecalculateProductPrice(ctx, p.ID); err != nil {
   188→		return nil, errs.Wrap(errs.CodeInternalError, "计算商品价格失败", err)
   189→	}
   190→
   191→	created, err := s.repo.FindProduct(ctx, p.ID)
   192→	if err != nil {
   193→		return nil, err
   194→	}
   195→	s.publishProductChanged(ctx, p.ID)
   196→	return s.productToProto(created, map[uint64]string{}), nil
   197→}
   198→
   199→// UpdateProduct 更新商品。
   200→func (s *Service) UpdateProduct(ctx context.Context, req *productv1.SaveProductRequest) (*productv1.Product, error) {
   201→	if req.GetId() <= 0 {
   202→		return nil, errs.Invalid("商品 ID 不能为空")
   203→	}
   204→	if _, err := s.repo.FindProduct(ctx, uint64(req.GetId())); err != nil {
   205→		return nil, err
   206→	}
   207→
   208→	fields := map[string]any{}
   209→	if req.GetTitle() != "" {
   210→		fields["title"] = req.GetTitle()
   211→	}
   212→	fields["subtitle"] = req.GetSubtitle()
   213→	fields["cover"] = req.GetCover()
   214→	fields["category_id"] = req.GetCategoryId()
   215→	fields["description"] = req.GetDescription()
   216→	fields["tags"] = strings.Join(req.GetTags(), ",")
   217→	if req.GetStatus() > 0 {
   218→		fields["status"] = int8(req.GetStatus())
   219→	}
   220→
   221→	if err := s.repo.UpdateProductFields(ctx, uint64(req.GetId()), fields); err != nil {
   222→		return nil, errs.Wrap(errs.CodeInternalError, "更新商品失败", err)
   223→	}
   224→	if err := s.saveSubResources(ctx, uint64(req.GetId()), req); err != nil {
   225→		return nil, err
   226→	}
   227→	if err := s.repo.RecalculateProductPrice(ctx, uint64(req.GetId())); err != nil {
   228→		return nil, errs.Wrap(errs.CodeInternalError, "计算商品价格失败", err)
   229→	}
   230→
   231→	updated, err := s.repo.FindProduct(ctx, uint64(req.GetId()))
   232→	if err != nil {
   233→		return nil, err
   234→	}
   235→	s.publishProductChanged(ctx, uint64(req.GetId()))
   236→	return s.productToProto(updated, map[uint64]string{}), nil
   237→}
   238→
   239→// saveSubResources 保存商品的图集、参数与 SKU。
   240→func (s *Service) saveSubResources(ctx context.Context, productID uint64, req *productv1.SaveProductRequest) error {
   241→	images := make([]ProductImage, 0, len(req.GetImages()))
   242→	for _, img := range req.GetImages() {
   243→		images = append(images, ProductImage{
   244→			URL: img.GetUrl(), Alt: img.GetAlt(), Sort: int(img.GetSort()),
   245→		})
   246→	}
   247→	if err := s.repo.ReplaceProductImages(ctx, productID, images); err != nil {
   248→		return errs.Wrap(errs.CodeInternalError, "保存商品图片失败", err)
   249→	}
   250→
   251→	attrs := make([]ProductAttribute, 0, len(req.GetAttributes()))
   252→	for _, a := range req.GetAttributes() {
   253→		attrs = append(attrs, ProductAttribute{
   254→			Name: a.GetName(), Value: a.GetValue(), Sort: int(a.GetSort()),
   255→		})
   256→	}
   257→	if err := s.repo.ReplaceProductAttributes(ctx, productID, attrs); err != nil {
   258→		return errs.Wrap(errs.CodeInternalError, "保存商品参数失败", err)
   259→	}
   260→
   261→	for _, sku := range req.GetSkus() {
   262→		specs := "{}"
   263→		if len(sku.GetSpecs()) > 0 {
   264→			if raw, err := json.Marshal(sku.GetSpecs()); err == nil {
   265→				specs = string(raw)
   266→			}
   267→		}
   268→		model := &ProductSku{
   269→			ID:                 uint64(sku.GetId()),
   270→			ProductID:          productID,
   271→			SKUCode:            sku.GetSkuCode(),
   272→			SpecText:           sku.GetSpecText(),
   273→			Specs:              specs,
   274→			PriceCents:         sku.GetPriceCents(),
   275→			OriginalPriceCents: sku.GetOriginalPriceCents(),
   276→			Stock:              int(sku.GetStock()),
   277→			Image:              sku.GetImage(),
   278→			Sort:               int(sku.GetSort()),
   279→			WeightGrams:        int(sku.GetWeightGrams()),
   280→			Enabled:            sku.GetEnabled(),
   281→		}
   282→		if model.ID == 0 {
   283→			model.Enabled = true
   284→		}
   285→		if err := s.repo.SaveSku(ctx, model); err != nil {
   286→			return errs.Wrap(errs.CodeInternalError, "保存商品规格失败", err)
   287→		}
   288→	}
   289→	return nil
   290→}
   291→
   292→// DeleteProduct 删除商品。
   293→func (s *Service) DeleteProduct(ctx context.Context, id int64) error {
   294→	if _, err := s.repo.FindProduct(ctx, uint64(id)); err != nil {
   295→		return err
   296→	}
   297→	if err := s.repo.DeleteProduct(ctx, uint64(id)); err != nil {
   298→		return errs.Wrap(errs.CodeInternalError, "删除商品失败", err)
   299→	}
   300→	s.publishProductChanged(ctx, uint64(id))
   301→	return nil
   302→}
   303→
   304→// SetProductStatus 上架/下架商品。
   305→func (s *Service) SetProductStatus(ctx context.Context, id int64, status int32) (*productv1.Product, error) {
   306→	if status != StatusDraft && status != StatusOnShelf && status != StatusOffShelf {
   307→		return nil, errs.Invalid("非法的商品状态")
   308→	}
   309→	if _, err := s.repo.FindProduct(ctx, uint64(id)); err != nil {
   310→		return nil, err
   311→	}
   312→	if err := s.repo.UpdateProductFields(ctx, uint64(id), map[string]any{"status": int8(status)}); err != nil {
   313→		return nil, errs.Wrap(errs.CodeInternalError, "更新商品状态失败", err)
   314→	}
   315→	p, err := s.repo.FindProduct(ctx, uint64(id))
   316→	if err != nil {
   317→		return nil, err
   318→	}
   319→	s.publishProductChanged(ctx, uint64(id))
   320→	return s.productToProto(p, map[uint64]string{}), nil
   321→}
   322→
   323→// SaveSku 新增或更新规格。
   324→func (s *Service) SaveSku(ctx context.Context, req *productv1.SaveSkuRequest) (*productv1.ProductSku, error) {
   325→	if req.GetProductId() <= 0 {
   326→		return nil, errs.Invalid("商品 ID 不能为空")
   327→	}
   328→	if req.GetPriceCents() <= 0 {
   329→		return nil, errs.Invalid("规格价格必须大于 0")
   330→	}
   331→
   332→	specs := "{}"
   333→	if len(req.GetSpecs()) > 0 {
   334→		if raw, err := json.Marshal(req.GetSpecs()); err == nil {
   335→			specs = string(raw)
   336→		}
   337→	}
   338→	model := &ProductSku{
   339→		ID:                 uint64(req.GetId()),
   340→		ProductID:          uint64(req.GetProductId()),
   341→		SKUCode:            req.GetSkuCode(),
   342→		SpecText:           req.GetSpecText(),
   343→		Specs:              specs,
   344→		PriceCents:         req.GetPriceCents(),
   345→		OriginalPriceCents: req.GetOriginalPriceCents(),
   346→		Stock:              int(req.GetStock()),
   347→		Image:              req.GetImage(),
   348→		Sort:               int(req.GetSort()),
   349→		WeightGrams:        int(req.GetWeightGrams()),
   350→		Enabled:            req.GetEnabled(),
   351→	}
   352→	if model.ID == 0 {
   353→		model.Enabled = true
   354→	}
   355→	if err := s.repo.SaveSku(ctx, model); err != nil {
   356→		return nil, errs.Wrap(errs.CodeInternalError, "保存规格失败", err)
   357→	}
   358→	if err := s.repo.RecalculateProductPrice(ctx, model.ProductID); err != nil {
   359→		return nil, errs.Wrap(errs.CodeInternalError, "计算商品价格失败", err)
   360→	}
   361→	return skuToProto(model), nil
   362→}
   363→
   364→// publishProductChanged 发布商品变更事件，通知缓存失效。
   365→func (s *Service) publishProductChanged(ctx context.Context, productID uint64) {
   366→	if s.mq == nil {
   367→		return
   368→	}
   369→	s.mq.PublishAsync(mq.NewEvent(mq.EventProductChanged, "product-service", "",
   370→		map[string]any{"product_id": productID}))
   371→}
   372→
   373→// ---------------------------------------------------------------------------
   374→// 分类
   375→// ---------------------------------------------------------------------------
   376→
   377→// ListCategories 查询分类（tree=true 时返回树形结构）。
   378→func (s *Service) ListCategories(ctx context.Context, req *productv1.ListCategoriesRequest) (*productv1.ListCategoriesResponse, error) {
   379→	all, err := s.repo.AllCategories(ctx)
   380→	if err != nil {
   381→		return nil, errs.Wrap(errs.CodeInternalError, "查询分类失败", err)
   382→	}
   383→	counts, err := s.repo.CategoryProductCounts(ctx)
   384→	if err != nil {
   385→		counts = map[uint64]int32{}
   386→	}
   387→
   388→	if !req.GetTree() {
   389→		list := make([]*productv1.Category, 0, len(all))
   390→		for i := range all {
   391→			if req.GetParentId() > 0 && all[i].ParentID != uint64(req.GetParentId()) {
   392→				continue
   393→			}
   394→			list = append(list, categoryToProto(&all[i], counts[all[i].ID]))
   395→		}
   396→		return &productv1.ListCategoriesResponse{Categories: list}, nil
   397→	}
   398→
   399→	// 构建两级分类树（一级 + 二级）
   400→	childrenMap := make(map[uint64][]*productv1.Category)
   401→	for i := range all {
   402→		c := categoryToProto(&all[i], counts[all[i].ID])
   403→		if all[i].ParentID == 0 {
   404→			continue
   405→		}
   406→		childrenMap[all[i].ParentID] = append(childrenMap[all[i].ParentID], c)
   407→	}
   408→
   409→	roots := make([]*productv1.Category, 0, len(all))
   410→	for i := range all {
   411→		if all[i].ParentID != 0 {
   412→			continue
   413→		}
   414→		c := categoryToProto(&all[i], counts[all[i].ID])
   415→		c.Children = childrenMap[all[i].ID]
   416→		roots = append(roots, c)
   417→	}
   418→	return &productv1.ListCategoriesResponse{Categories: roots}, nil
   419→}
   420→
   421→// CreateCategory 新增分类。
   422→func (s *Service) CreateCategory(ctx context.Context, req *productv1.SaveCategoryRequest) (*productv1.Category, error) {
   423→	if strings.TrimSpace(req.GetName()) == "" {
   424→		return nil, errs.Invalid("分类名称不能为空")
   425→	}
   426→	c := &Category{
   427→		Name:        req.GetName(),
   428→		ParentID:    uint64(req.GetParentId()),
   429→		Icon:        req.GetIcon(),
   430→		Description: req.GetDescription(),
   431→		Sort:        int(req.GetSort()),
   432→		Visible:     req.GetVisible(),
   433→	}
   434→	if err := s.repo.SaveCategory(ctx, c); err != nil {
   435→		return nil, errs.Wrap(errs.CodeInternalError, "创建分类失败", err)
   436→	}
   437→	return categoryToProto(c, 0), nil
   438→}
   439→
   440→// UpdateCategory 更新分类。
   441→func (s *Service) UpdateCategory(ctx context.Context, req *productv1.SaveCategoryRequest) (*productv1.Category, error) {
   442→	if req.GetId() <= 0 {
   443→		return nil, errs.Invalid("分类 ID 不能为空")
   444→	}
   445→	existing, err := s.repo.FindCategory(ctx, uint64(req.GetId()))
   446→	if err != nil {
   447→		return nil, err
   448→	}
   449→	if uint64(req.GetParentId()) == existing.ID {
   450→		return nil, errs.Invalid("分类不能以自身为父级")
   451→	}
   452→
   453→	existing.Name = req.GetName()
   454→	existing.ParentID = uint64(req.GetParentId())
   455→	existing.Icon = req.GetIcon()
   456→	existing.Description = req.GetDescription()
   457→	existing.Sort = int(req.GetSort())
   458→	existing.Visible = req.GetVisible()
   459→
   460→	if err := s.repo.SaveCategory(ctx, existing); err != nil {
   461→		return nil, errs.Wrap(errs.CodeInternalError, "更新分类失败", err)
   462→	}
   463→	return categoryToProto(existing, 0), nil
   464→}
   465→
   466→// DeleteCategory 删除分类。
   467→func (s *Service) DeleteCategory(ctx context.Context, id int64) error {
   468→	hasChildren, err := s.repo.CategoryHasChildren(ctx, uint64(id))
   469→	if err != nil {
   470→		return errs.Wrap(errs.CodeInternalError, "检查子分类失败", err)
   471→	}
   472→	if hasChildren {
   473→		return errs.Conflict("该分类下还有子分类，无法删除")
   474→	}
   475→	if err := s.repo.DeleteCategory(ctx, uint64(id)); err != nil {
   476→		return errs.Wrap(errs.CodeInternalError, "删除分类失败", err)
   477→	}
   478→	return nil
   479→}
   480→
   481→// ---------------------------------------------------------------------------
   482→// 轮播
   483→// ---------------------------------------------------------------------------
   484→
   485→// ListBanners 查询轮播位。
   486→func (s *Service) ListBanners(ctx context.Context, req *productv1.ListBannersRequest) (*productv1.ListBannersResponse, error) {
   487→	list, err := s.repo.ListBanners(ctx, req.GetPosition(), true)
   488→	if err != nil {
   489→		return nil, errs.Wrap(errs.CodeInternalError, "查询轮播位失败", err)
   490→	}
   491→	out := make([]*productv1.Banner, 0, len(list))
   492→	for i := range list {
   493→		out = append(out, bannerToProto(&list[i]))
   494→	}
   495→	return &productv1.ListBannersResponse{Banners: out}, nil
   496→}
   497→
   498→// SaveBanner 新增或更新轮播位。
   499→func (s *Service) SaveBanner(ctx context.Context, req *productv1.SaveBannerRequest) (*productv1.Banner, error) {
   500→	if strings.TrimSpace(req.GetImage()) == "" {
   501→		return nil, errs.Invalid("轮播图片不能为空")
   502→	}
   503→	b := &Banner{
   504→		ID:       uint64(req.GetId()),
   505→		Title:    req.GetTitle(),
   506→		Image:    req.GetImage(),
   507→		Link:     req.GetLink(),
   508→		Sort:     int(req.GetSort()),
   509→		Position: req.GetPosition(),
   510→		Visible:  req.GetVisible(),
   511→	}
   512→	if b.Position == "" {
   513→		b.Position = "home_banner"
   514→	}
   515→	if err := s.repo.SaveBanner(ctx, b); err != nil {
   516→		return nil, errs.Wrap(errs.CodeInternalError, "保存轮播位失败", err)
   517→	}
   518→	return bannerToProto(b), nil
   519→}
   520→
   521→// DeleteBanner 删除轮播位。
   522→func (s *Service) DeleteBanner(ctx context.Context, id int64) error {
   523→	if err := s.repo.DeleteBanner(ctx, uint64(id)); err != nil {
   524→		return errs.Wrap(errs.CodeInternalError, "删除轮播位失败", err)
   525→	}
   526→	return nil
   527→}
   528→
   529→// ---------------------------------------------------------------------------
   530→// 评价
   531→// ---------------------------------------------------------------------------
   532→
   533→// ListReviews 分页查询评价。
   534→func (s *Service) ListReviews(ctx context.Context, req *productv1.ListReviewsRequest) (*productv1.ListReviewsResponse, error) {
   535→	page, pageSize := normalizePage(req.GetPage())
   536→
   537→	list, total, err := s.repo.ListReviews(ctx, ReviewQuery{
   538→		ProductID: uint64(req.GetProductId()),
   539→		UserID:    uint64(req.GetUserId()),
   540→		Status:    int8(req.GetStatus()),
   541→		Keyword:   strings.TrimSpace(req.GetKeyword()),
   542→		Page:      page,
   543→		PageSize:  pageSize,
   544→	})
   545→	if err != nil {
   546→		return nil, errs.Wrap(errs.CodeInternalError, "查询评价失败", err)
   547→	}
   548→
   549→	out := make([]*productv1.Review, 0, len(list))
   550→	for i := range list {
   551→		out = append(out, reviewToProto(&list[i]))
   552→	}
   553→
   554→	totalCount, goodCount, mediumCount, badCount, avg, err := s.repo.ReviewSummary(ctx, uint64(req.GetProductId()))
   555→	if err != nil {
   556→		return nil, errs.Wrap(errs.CodeInternalError, "统计评价失败", err)
   557→	}
   558→
   559→	return &productv1.ListReviewsResponse{
   560→		Reviews: out,
   561→		Meta:    buildMeta(page, pageSize, total),
   562→		Summary: &productv1.ReviewSummary{
   563→			Total: totalCount,
   564→			Good:  goodCount, Medium: mediumCount, Bad: badCount, Average: avg,
   565→		},
   566→	}, nil
   567→}
   568→
   569→// CreateReview 发表评价。
   570→func (s *Service) CreateReview(ctx context.Context, req *productv1.CreateReviewRequest) (*productv1.Review, error) {
   571→	if req.GetProductId() <= 0 {
   572→		return nil, errs.Invalid("商品 ID 不能为空")
   573→	}
   574→	if req.GetRating() < 1 || req.GetRating() > 5 {
   575→		return nil, errs.Invalid("评分必须在 1 到 5 之间")
   576→	}
   577→	if strings.TrimSpace(req.GetContent()) == "" {
   578→		return nil, errs.Invalid("评价内容不能为空")
   579→	}
   580→
   581→	product, err := s.repo.FindProduct(ctx, uint64(req.GetProductId()))
   582→	if err != nil {
   583→		return nil, err
   584→	}
   585→
   586→	skuText := ""

[desktop read output truncated: original_bytes=32333; if the omitted remainder is needed, continue with read using offset=587 and the same path.]
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:16:20

<details><summary>🛠 read</summary>

```
587→	if req.GetSkuId() > 0 {
   588→		if sku, sErr := s.repo.FindSku(ctx, uint64(req.GetSkuId())); sErr == nil {
   589→			skuText = sku.SpecText
   590→		}
   591→	}
   592→
   593→	rv := &Review{
   594→		ProductID:    product.ID,
   595→		ProductTitle: product.Title,
   596→		UserID:       uint64(req.GetUserId()),
   597→		Rating:       int8(req.GetRating()),
   598→		Content:      req.GetContent(),
   599→		Images:       strings.Join(req.GetImages(), ","),
   600→		SKUID:        uint64(req.GetSkuId()),
   601→		SKUText:      skuText,
   602→		Status:       ReviewPending,
   603→	}
   604→	if err := s.repo.SaveReview(ctx, rv); err != nil {
   605→		return nil, errs.Wrap(errs.CodeInternalError, "发表评价失败", err)
   606→	}
   607→	return reviewToProto(rv), nil
   608→}
   609→
   610→// SetReviewStatus 审核评价。
   611→func (s *Service) SetReviewStatus(ctx context.Context, id int64, status int32, reply string) (*productv1.Review, error) {
   612→	if status != ReviewPending && status != ReviewApproved && status != ReviewRejected {
   613→		return nil, errs.Invalid("非法的评价状态")
   614→	}
   615→	if _, err := s.repo.FindReview(ctx, uint64(id)); err != nil {
   616→		return nil, err
   617→	}
   618→	fields := map[string]any{"status": int8(status)}
   619→	if reply != "" {
   620→		fields["admin_reply"] = reply
   621→	}
   622→	if err := s.repo.UpdateReview(ctx, uint64(id), fields); err != nil {
   623→		return nil, errs.Wrap(errs.CodeInternalError, "更新评价状态失败", err)
   624→	}
   625→	rv, err := s.repo.FindReview(ctx, uint64(id))
   626→	if err != nil {
   627→		return nil, err
   628→	}
   629→	return reviewToProto(rv), nil
   630→}
   631→
   632→// ---------------------------------------------------------------------------
   633→// 转换辅助
   634→// ---------------------------------------------------------------------------
   635→
   636→// categoryNameMap 返回分类 ID 到名称的映射。
   637→func (s *Service) categoryNameMap(ctx context.Context) (map[uint64]string, error) {
   638→	list, err := s.repo.AllCategories(ctx)
   639→	if err != nil {
   640→		return nil, err
   641→	}
   642→	out := make(map[uint64]string, len(list))
   643→	for i := range list {
   644→		out[list[i].ID] = list[i].Name
   645→	}
   646→	return out, nil
   647→}
   648→
   649→func (s *Service) productToProto(p *Product, categoryNames map[uint64]string) *productv1.Product {
   650→	if p == nil {
   651→		return nil
   652→	}
   653→	return &productv1.Product{
   654→		Id:            int64(p.ID),
   655→		Title:         p.Title,
   656→		Subtitle:      p.Subtitle,
   657→		Cover:         p.Cover,
   658→		CategoryId:    int64(p.CategoryID),
   659→		CategoryName:  categoryNames[p.CategoryID],
   660→		MinPriceCents: p.MinPriceCents,
   661→		MaxPriceCents: p.MaxPriceCents,
   662→		SalesCount:    int64(p.SalesCount),
   663→		StockTotal:    0,
   664→		Status:        commonv1.ProductStatus(p.Status),
   665→		Description:   p.Description,
   666→		Tags:          splitTags(p.Tags),
   667→		CreatedAt:     timestamppb.New(p.CreatedAt),
   668→		UpdatedAt:     timestamppb.New(p.UpdatedAt),
   669→	}
   670→}
   671→
   672→func splitTags(tags string) []string {
   673→	if tags == "" {
   674→		return []string{}
   675→	}
   676→	parts := strings.Split(tags, ",")
   677→	out := make([]string, 0, len(parts))
   678→	for _, p := range parts {
   679→		if p = strings.TrimSpace(p); p != "" {
   680→			out = append(out, p)
   681→		}
   682→	}
   683→	return out
   684→}
   685→
   686→func skuToProto(s *ProductSku) *productv1.ProductSku {
   687→	if s == nil {
   688→		return nil
   689→	}
   690→	specs := map[string]string{}
   691→	if s.Specs != "" {
   692→		_ = json.Unmarshal([]byte(s.Specs), &specs)
   693→	}
   694→	return &productv1.ProductSku{
   695→		Id:                 int64(s.ID),
   696→		ProductId:          int64(s.ProductID),
   697→		SkuCode:            s.SKUCode,
   698→		SpecText:           s.SpecText,
   699→		Specs:              specs,
   700→		PriceCents:         s.PriceCents,
   701→		OriginalPriceCents: s.OriginalPriceCents,
   702→		Stock:              int32(s.Stock),
   703→		LockedStock:        0,
   704→		Image:              s.Image,
   705→		Sort:               int32(s.Sort),
   706→		SalesCount:         int32(s.SalesCount),
   707→		Enabled:            s.Enabled,
   708→		WeightGrams:        int64(s.WeightGrams),
   709→	}
   710→}
   711→
   712→func categoryToProto(c *Category, productCount int32) *productv1.Category {
   713→	if c == nil {
   714→		return nil
   715→	}
   716→	return &productv1.Category{
   717→		Id:           int64(c.ID),
   718→		Name:         c.Name,
   719→		ParentId:     int64(c.ParentID),
   720→		Icon:         c.Icon,
   721→		Description:  c.Description,
   722→		Sort:         int32(c.Sort),
   723→		Visible:      c.Visible,
   724→		ProductCount: productCount,
   725→	}
   726→}
   727→
   728→func bannerToProto(b *Banner) *productv1.Banner {
   729→	if b == nil {
   730→		return nil
   731→	}
   732→	return &productv1.Banner{
   733→		Id:        int64(b.ID),
   734→		Title:     b.Title,
   735→		Image:     b.Image,
   736→		Link:      b.Link,
   737→		Sort:      int32(b.Sort),
   738→		Position:  b.Position,
   739→		Visible:   b.Visible,
   740→		CreatedAt: timestamppb.New(b.CreatedAt),
   741→	}
   742→}
   743→
   744→func reviewToProto(rv *Review) *productv1.Review {
   745→	if rv == nil {
   746→		return nil
   747→	}
   748→	images := []string{}
   749→	if rv.Images != "" {
   750→		for _, p := range strings.Split(rv.Images, ",") {
   751→			if p = strings.TrimSpace(p); p != "" {
   752→				images = append(images, p)
   753→			}
   754→		}
   755→	}
   756→	return &productv1.Review{
   757→		Id:           int64(rv.ID),
   758→		ProductId:    int64(rv.ProductID),
   759→		ProductTitle: rv.ProductTitle,
   760→		UserId:       int64(rv.UserID),
   761→		UserNickname: rv.UserNickname,
   762→		UserAvatar:   rv.UserAvatar,
   763→		Rating:       int32(rv.Rating),
   764→		Content:      rv.Content,
   765→		Images:       images,
   766→		SkuId:        int32(rv.SKUID),
   767→		SkuText:      rv.SKUText,
   768→		Status:       commonv1.ReviewStatus(rv.Status),
   769→		AdminReply:   rv.AdminReply,
   770→		LikeCount:    int32(rv.LikeCount),
   771→		CreatedAt:    timestamppb.New(rv.CreatedAt),
   772→	}
   773→}
   774→
   775→// normalizePage 归一化分页参数。
   776→func normalizePage(page *commonv1.PageRequest) (int, int) {
   777→	pageNum := int(page.GetPage())
   778→	pageSize := int(page.GetPageSize())
   779→	if pageNum <= 0 {
   780→		pageNum = 1
   781→	}
   782→	if pageSize <= 0 {
   783→		pageSize = 20
   784→	}
   785→	if pageSize > 100 {
   786→		pageSize = 100
   787→	}
   788→	return pageNum, pageSize
   789→}
   790→
   791→// buildMeta 构造分页元信息。
   792→func buildMeta(page, pageSize int, total int64) *commonv1.PageMeta {
   793→	totalPages := int64(0)
   794→	if pageSize > 0 {
   795→		totalPages = (total + int64(pageSize) - 1) / int64(pageSize)
   796→	}
   797→	return &commonv1.PageMeta{
   798→		Page:       int32(page),
   799→		PageSize:   int32(pageSize),
   800→		Total:      total,
   801→		TotalPages: int32(totalPages),
   802→	}
   803→}
   804→
   805→// unusedGuard 保留 time 包的引用，避免在部分构建配置下触发未使用告警。
   806→var _ = time.Now
   807→var _ = strconv.Itoa
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:16:23

<details><summary>🧠 思考过程</summary>

```
Now let's look at the handler.go for product, and marketing files.
```

</details>

<details><summary>🛠 read</summary>

```
1→package product
     2→
     3→import (
     4→	"context"
     5→
     6→	commonv1 "github.com/shopstack/platform/gen/go/common/v1"
     7→	productv1 "github.com/shopstack/platform/gen/go/product/v1"
     8→
     9→	"github.com/shopstack/platform/backend/internal/auth"
    10→)
    11→
    12→// Handler 实现 ProductService、CategoryService 与 ReviewService。
    13→type Handler struct {
    14→	productv1.UnimplementedProductServiceServer
    15→	productv1.UnimplementedCategoryServiceServer
    16→	productv1.UnimplementedReviewServiceServer
    17→	service *Service
    18→}
    19→
    20→// NewHandler 构造处理器。
    21→func NewHandler(service *Service) *Handler {
    22→	return &Handler{service: service}
    23→}
    24→
    25→// ---------------------------------------------------------------------------
    26→// ProductService
    27→// ---------------------------------------------------------------------------
    28→
    29→// ListProducts 商品列表。
    30→func (h *Handler) ListProducts(ctx context.Context, req *productv1.ListProductsRequest) (*productv1.ListProductsResponse, error) {
    31→	return h.service.ListProducts(ctx, req)
    32→}
    33→
    34→// GetProduct 商品详情。
    35→func (h *Handler) GetProduct(ctx context.Context, req *productv1.GetProductRequest) (*productv1.ProductDetail, error) {
    36→	return h.service.GetProduct(ctx, req)
    37→}
    38→
    39→// CreateProduct 新增商品。
    40→func (h *Handler) CreateProduct(ctx context.Context, req *productv1.SaveProductRequest) (*productv1.Product, error) {
    41→	return h.service.CreateProduct(ctx, req)
    42→}
    43→
    44→// UpdateProduct 更新商品。
    45→func (h *Handler) UpdateProduct(ctx context.Context, req *productv1.SaveProductRequest) (*productv1.Product, error) {
    46→	return h.service.UpdateProduct(ctx, req)
    47→}
    48→
    49→// DeleteProduct 删除商品。
    50→func (h *Handler) DeleteProduct(ctx context.Context, req *productv1.DeleteProductRequest) (*commonv1.OperationResult, error) {
    51→	if err := h.service.DeleteProduct(ctx, req.GetId()); err != nil {
    52→		return nil, err
    53→	}
    54→	return &commonv1.OperationResult{Success: true, Message: "商品已删除"}, nil
    55→}
    56→
    57→// SetProductStatus 上下架商品。
    58→func (h *Handler) SetProductStatus(ctx context.Context, req *productv1.SetProductStatusRequest) (*productv1.Product, error) {
    59→	return h.service.SetProductStatus(ctx, req.GetId(), req.GetStatus())
    60→}
    61→
    62→// SaveSku 保存规格。
    63→func (h *Handler) SaveSku(ctx context.Context, req *productv1.SaveSkuRequest) (*productv1.ProductSku, error) {
    64→	return h.service.SaveSku(ctx, req)
    65→}
    66→
    67→// ListBanners 轮播列表。
    68→func (h *Handler) ListBanners(ctx context.Context, req *productv1.ListBannersRequest) (*productv1.ListBannersResponse, error) {
    69→	return h.service.ListBanners(ctx, req)
    70→}
    71→
    72→// SaveBanner 保存轮播。
    73→func (h *Handler) SaveBanner(ctx context.Context, req *productv1.SaveBannerRequest) (*productv1.Banner, error) {
    74→	return h.service.SaveBanner(ctx, req)
    75→}
    76→
    77→// DeleteBanner 删除轮播。
    78→func (h *Handler) DeleteBanner(ctx context.Context, req *productv1.DeleteBannerRequest) (*commonv1.OperationResult, error) {
    79→	if err := h.service.DeleteBanner(ctx, req.GetId()); err != nil {
    80→		return nil, err
    81→	}
    82→	return &commonv1.OperationResult{Success: true, Message: "轮播位已删除"}, nil
    83→}
    84→
    85→// ListMaterials 素材列表。
    86→func (h *Handler) ListMaterials(ctx context.Context, req *productv1.ListMaterialsRequest) (*productv1.ListMaterialsResponse, error) {
    87→	return h.service.ListMaterials(ctx, req)
    88→}
    89→
    90→// SaveMaterial 保存素材。
    91→func (h *Handler) SaveMaterial(ctx context.Context, req *productv1.SaveMaterialRequest) (*productv1.Material, error) {
    92→	return h.service.SaveMaterial(ctx, req)
    93→}
    94→
    95→// DeleteMaterial 删除素材。
    96→func (h *Handler) DeleteMaterial(ctx context.Context, req *productv1.DeleteMaterialRequest) (*commonv1.OperationResult, error) {
    97→	if err := h.service.DeleteMaterial(ctx, req.GetId()); err != nil {
    98→		return nil, err
    99→	}
   100→	return &commonv1.OperationResult{Success: true, Message: "素材已删除"}, nil
   101→}
   102→
   103→// ---------------------------------------------------------------------------
   104→// CategoryService
   105→// ---------------------------------------------------------------------------
   106→
   107→// ListCategories 分类列表。
   108→func (h *Handler) ListCategories(ctx context.Context, req *productv1.ListCategoriesRequest) (*productv1.ListCategoriesResponse, error) {
   109→	return h.service.ListCategories(ctx, req)
   110→}
   111→
   112→// CreateCategory 新增分类。
   113→func (h *Handler) CreateCategory(ctx context.Context, req *productv1.SaveCategoryRequest) (*productv1.Category, error) {
   114→	return h.service.CreateCategory(ctx, req)
   115→}
   116→
   117→// UpdateCategory 更新分类。
   118→func (h *Handler) UpdateCategory(ctx context.Context, req *productv1.SaveCategoryRequest) (*productv1.Category, error) {
   119→	return h.service.UpdateCategory(ctx, req)
   120→}
   121→
   122→// DeleteCategory 删除分类。
   123→func (h *Handler) DeleteCategory(ctx context.Context, req *productv1.DeleteCategoryRequest) (*commonv1.OperationResult, error) {
   124→	if err := h.service.DeleteCategory(ctx, req.GetId()); err != nil {
   125→		return nil, err
   126→	}
   127→	return &commonv1.OperationResult{Success: true, Message: "分类已删除"}, nil
   128→}
   129→
   130→// ---------------------------------------------------------------------------
   131→// ReviewService
   132→// ---------------------------------------------------------------------------
   133→
   134→// ListReviews 评价列表。
   135→func (h *Handler) ListReviews(ctx context.Context, req *productv1.ListReviewsRequest) (*productv1.ListReviewsResponse, error) {
   136→	return h.service.ListReviews(ctx, req)
   137→}
   138→
   139→// CreateReview 发表评价。
   140→func (h *Handler) CreateReview(ctx context.Context, req *productv1.CreateReviewRequest) (*productv1.Review, error) {
   141→	if req.GetUserId() == 0 {
   142→		req.UserId = auth.UserIDFromContext(ctx)
   143→	}
   144→	return h.service.CreateReview(ctx, req)
   145→}
   146→
   147→// SetReviewStatus 审核评价。
   148→func (h *Handler) SetReviewStatus(ctx context.Context, req *productv1.SetReviewStatusRequest) (*productv1.Review, error) {
   149→	return h.service.SetReviewStatus(ctx, req.GetId(), req.GetStatus(), req.GetAdminReply())
   150→}
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:16:26

<details><summary>🧠 思考过程</summary>

```
Note there's no `auth.UserIDFromContext` in marketing — the marketing util has `resolveUserID`. Let's look at marketing files.
```

</details>

<details><summary>🛠 read</summary>

```
1→package marketing
     2→
     3→import (
     4→	"context"
     5→	"errors"
     6→	"strings"
     7→
     8→	"github.com/shopstack/platform/backend/internal/auth"
     9→	"github.com/shopstack/platform/backend/internal/errs"
    10→)
    11→
    12→// resolveUserID 优先使用请求携带的用户 ID，缺省时回退到网关注入的登录身份。
    13→func resolveUserID(ctx context.Context, requested int64) int64 {
    14→	if requested > 0 {
    15→		return requested
    16→	}
    17→	return auth.UserIDFromContext(ctx)
    18→}
    19→
    20→// isDuplicateKey 判断错误是否为唯一键冲突。
    21→//
    22→// MySQL 的唯一键冲突错误码为 1062，这里不引入驱动包依赖，直接按错误文本判定。
    23→func isDuplicateKey(err error) bool {
    24→	if err == nil {
    25→		return false
    26→	}
    27→	msg := err.Error()
    28→	return strings.Contains(msg, "Duplicate entry") || strings.Contains(msg, "1062")
    29→}
    30→
    31→// asBizError 把任意错误还原为业务错误。
    32→func asBizError(err error, target **errs.Error) bool {
    33→	return errors.As(err, target)
    34→}
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:16:30

<details><summary>🛠 read</summary>

```
1→package marketing
     2→
     3→import (
     4→	"context"
     5→	"strings"
     6→	"time"
     7→
     8→	"go.uber.org/zap"
     9→	"google.golang.org/protobuf/types/known/timestamppb"
    10→	"gorm.io/gorm"
    11→
    12→	commonv1 "github.com/shopstack/platform/gen/go/common/v1"
    13→	marketingv1 "github.com/shopstack/platform/gen/go/marketing/v1"
    14→
    15→	"github.com/shopstack/platform/backend/internal/errs"
    16→	"github.com/shopstack/platform/backend/internal/logger"
    17→)
    18→
    19→// 结算试算的默认运费规则：满 9900 分（99 元）包邮，否则运费 1000 分（10 元）。
    20→const (
    21→	defaultFreeFreightAmountCents = 9900
    22→	defaultFreightCents           = 1000
    23→)
    24→
    25→// 积分抵扣规则：100 积分抵扣 100 分（1 元），且抵扣不超过商品总额的 50%。
    26→const pointsPerCent = 1
    27→
    28→// Service 承载营销域的业务逻辑。
    29→type Service struct {
    30→	repo *Repo
    31→}
    32→
    33→// NewService 构造营销服务。
    34→func NewService(repo *Repo) *Service {
    35→	return &Service{repo: repo}
    36→}
    37→
    38→// ---------------------------------------------------------------------------
    39→// 优惠券
    40→// ---------------------------------------------------------------------------
    41→
    42→// ListCoupons 分页查询优惠券。
    43→func (s *Service) ListCoupons(ctx context.Context, req *marketingv1.ListCouponsRequest) (*marketingv1.ListCouponsResponse, error) {
    44→	page, pageSize := normalizePage(req.GetPage())
    45→	list, total, err := s.repo.ListCoupons(ctx, CouponQuery{
    46→		Keyword:   strings.TrimSpace(req.GetKeyword()),
    47→		Type:      req.GetType(),
    48→		Enabled:   req.GetEnabled(),
    49→		Available: req.GetAvailable(),
    50→		Page:      page,
    51→		PageSize:  pageSize,
    52→	})
    53→	if err != nil {
    54→		return nil, errs.Wrap(errs.CodeInternalError, "查询优惠券失败", err)
    55→	}
    56→	out := make([]*marketingv1.Coupon, 0, len(list))
    57→	for i := range list {
    58→		out = append(out, couponToProto(&list[i]))
    59→	}
    60→	return &marketingv1.ListCouponsResponse{Coupons: out, Meta: buildMeta(page, pageSize, total)}, nil
    61→}
    62→
    63→// SaveCoupon 新增或更新优惠券。
    64→func (s *Service) SaveCoupon(ctx context.Context, req *marketingv1.SaveCouponRequest) (*marketingv1.Coupon, error) {
    65→	name := strings.TrimSpace(req.GetName())
    66→	if name == "" {
    67→		return nil, errs.New(errs.CodeInvalidParam, "优惠券名称不能为空")
    68→	}
    69→	code := strings.TrimSpace(req.GetCode())
    70→	if code == "" {
    71→		return nil, errs.New(errs.CodeInvalidParam, "优惠券编码不能为空")
    72→	}
    73→	couponType := req.GetType()
    74→	switch couponType {
    75→	case CouponTypeFixed:
    76→		if req.GetFaceValueCents() <= 0 {
    77→			return nil, errs.New(errs.CodeInvalidParam, "满减券面额必须大于 0")
    78→		}
    79→	case CouponTypePercent:
    80→		if req.GetPercent() <= 0 || req.GetPercent() >= 100 {
    81→			return nil, errs.New(errs.CodeInvalidParam, "折扣券折扣需在 1-99 之间")
    82→		}
    83→	case CouponTypeShipping:
    84→	default:
    85→		return nil, errs.New(errs.CodeInvalidParam, "优惠券类型不合法")
    86→	}
    87→	if req.GetTotalQuantity() <= 0 {
    88→		return nil, errs.New(errs.CodeInvalidParam, "发放总量必须大于 0")
    89→	}
    90→	start, end, err := parseTimeRange(req.GetStartTime(), req.GetEndTime())
    91→	if err != nil {
    92→		return nil, err
    93→	}
    94→
    95→	c := &Coupon{
    96→		ID:               uint64(req.GetId()),
    97→		Name:             name,
    98→		Code:             code,
    99→		Type:             int8(couponType),
   100→		FaceValueCents:   req.GetFaceValueCents(),
   101→		Percent:          req.GetPercent(),
   102→		MinAmountCents:   req.GetMinAmountCents(),
   103→		MaxDiscountCents: req.GetMaxDiscountCents(),
   104→		TotalQuantity:    req.GetTotalQuantity(),
   105→		PerUserLimit:     req.GetPerUserLimit(),
   106→		StartTime:        start,
   107→		EndTime:          end,
   108→		CategoryID:       uint64(req.GetCategoryId()),
   109→		Enabled:          req.GetEnabled(),
   110→	}
   111→	if c.PerUserLimit <= 0 {
   112→		c.PerUserLimit = 1
   113→	}
   114→	if c.Type == CouponTypeShipping {
   115→		c.Percent = 100
   116→	}
   117→	if c.Type == CouponTypeFixed {
   118→		c.Percent = 100
   119→	}
   120→
   121→	if err := s.repo.SaveCoupon(ctx, c); err != nil {
   122→		if isDuplicateKey(err) {
   123→			return nil, errs.New(errs.CodeConflict, "优惠券编码已存在")
   124→		}
   125→		return nil, errs.Wrap(errs.CodeInternalError, "保存优惠券失败", err)
   126→	}
   127→	saved, err := s.repo.FindCouponByID(ctx, c.ID)
   128→	if err != nil {
   129→		return nil, err
   130→	}
   131→	return couponToProto(saved), nil
   132→}
   133→
   134→// DeleteCoupon 删除优惠券及其发放记录。
   135→func (s *Service) DeleteCoupon(ctx context.Context, id int64) error {
   136→	if id <= 0 {
   137→		return errs.New(errs.CodeInvalidParam, "优惠券 ID 不合法")
   138→	}
   139→	if _, err := s.repo.FindCouponByID(ctx, uint64(id)); err != nil {
   140→		return err
   141→	}
   142→	if err := s.repo.DeleteCoupon(ctx, uint64(id)); err != nil {
   143→		return errs.Wrap(errs.CodeInternalError, "删除优惠券失败", err)
   144→	}
   145→	return nil
   146→}
   147→
   148→// ReceiveCoupon 用户领取优惠券。
   149→func (s *Service) ReceiveCoupon(ctx context.Context, req *marketingv1.ReceiveCouponRequest) (*marketingv1.UserCoupon, error) {
   150→	userID := uint64(resolveUserID(ctx, req.GetUserId()))
   151→	couponID := uint64(req.GetCouponId())
   152→	if userID == 0 {
   153→		return nil, errs.New(errs.CodeInvalidParam, "用户 ID 不能为空")
   154→	}
   155→	if couponID == 0 {
   156→		return nil, errs.New(errs.CodeInvalidParam, "优惠券 ID 不能为空")
   157→	}
   158→
   159→	coupon, err := s.repo.FindCouponByID(ctx, couponID)
   160→	if err != nil {
   161→		return nil, err
   162→	}
   163→
   164→	now := time.Now()
   165→	if !coupon.Enabled {
   166→		return nil, errs.New(errs.CodeCouponUnavailable, "优惠券未启用")
   167→	}
   168→	if now.Before(coupon.StartTime) {
   169→		return nil, errs.New(errs.CodeCouponUnavailable, "优惠券尚未开始领取")
   170→	}
   171→	if now.After(coupon.EndTime) {
   172→		return nil, errs.New(errs.CodeCouponExpired, "优惠券已过期")
   173→	}
   174→	if coupon.TotalQuantity > 0 && coupon.ReceivedQuantity >= coupon.TotalQuantity {
   175→		return nil, errs.New(errs.CodeCouponUnavailable, "优惠券已被领完")
   176→	}
   177→
   178→	existing, err := s.repo.FindUserCoupon(ctx, userID, couponID)
   179→	if err != nil {
   180→		return nil, errs.Wrap(errs.CodeInternalError, "查询用户优惠券失败", err)
   181→	}
   182→	if existing != nil {
   183→		return nil, errs.New(errs.CodeConflict, "您已领取过该优惠券")
   184→	}
   185→
   186→	limit := coupon.PerUserLimit
   187→	if limit <= 0 {
   188→		limit = 1
   189→	}
   190→	count, err := s.repo.CountUserCoupons(ctx, userID, couponID)
   191→	if err != nil {
   192→		return nil, errs.Wrap(errs.CodeInternalError, "查询用户优惠券失败", err)
   193→	}
   194→	if count >= limit {
   195→		return nil, errs.New(errs.CodeCouponUnavailable, "已达该优惠券的每人限领数量")
   196→	}
   197→
   198→	uc := &UserCoupon{
   199→		UserID:     userID,
   200→		CouponID:   couponID,
   201→		Status:     UserCouponStatusUnused,
   202→		ReceivedAt: now,
   203→	}
   204→	err = s.repo.DB().WithContext(ctx).Transaction(func(tx *gorm.DB) error {
   205→		if err := tx.Create(uc).Error; err != nil {
   206→			return err
   207→		}
   208→		res := tx.Model(&Coupon{}).Where("id = ?", couponID).
   209→			Where("total_quantity <= 0 OR received_quantity < total_quantity").
   210→			UpdateColumn("received_quantity", gorm.Expr("received_quantity + 1"))
   211→		if res.Error != nil {
   212→			return res.Error
   213→		}
   214→		if res.RowsAffected == 0 {
   215→			return errs.New(errs.CodeCouponUnavailable, "优惠券已被领完")
   216→		}
   217→		return nil
   218→	})
   219→	if err != nil {
   220→		if isDuplicateKey(err) {
   221→			// 唯一键兜底：并发重复领取
   222→			return nil, errs.New(errs.CodeConflict, "您已领取过该优惠券")
   223→		}
   224→		var bizErr *errs.Error
   225→		if ok := asBizError(err, &bizErr); ok {
   226→			return nil, bizErr
   227→		}
   228→		return nil, errs.Wrap(errs.CodeInternalError, "领取优惠券失败", err)
   229→	}
   230→
   231→	return &marketingv1.UserCoupon{
   232→		Id:         int64(uc.ID),
   233→		UserId:     int64(uc.UserID),
   234→		CouponId:   int64(uc.CouponID),
   235→		Coupon:     couponToProto(coupon),
   236→		Status:     commonv1.UserCouponStatus_USER_COUPON_STATUS_UNUSED,
   237→		OrderId:    0,
   238→		ReceivedAt: timestamppb.New(uc.ReceivedAt),
   239→	}, nil
   240→}
   241→
   242→// ListUserCoupons 用户优惠券列表。
   243→func (s *Service) ListUserCoupons(ctx context.Context, req *marketingv1.ListUserCouponsRequest) (*marketingv1.ListUserCouponsResponse, error) {
   244→	userID := uint64(resolveUserID(ctx, req.GetUserId()))
   245→	if userID == 0 {
   246→		return nil, errs.New(errs.CodeInvalidParam, "用户 ID 不能为空")
   247→	}
   248→	page, pageSize := normalizePage(req.GetPage())
   249→	now := time.Now()
   250→
   251→	// 先把过期的未使用券落库为已过期，保证统计与列表一致
   252→	if err := s.repo.ExpireUserCoupons(ctx, userID, now); err != nil {
   253→		logger.L().Warn("更新过期优惠券失败", zap.Error(err))
   254→	}
   255→
   256→	list, total, err := s.repo.ListUserCoupons(ctx, userID, req.GetStatus(), page, pageSize)
   257→	if err != nil {
   258→		return nil, errs.Wrap(errs.CodeInternalError, "查询用户优惠券失败", err)
   259→	}
   260→	coupons, err := s.couponMap(ctx, list)
   261→	if err != nil {
   262→		return nil, errs.Wrap(errs.CodeInternalError, "查询优惠券详情失败", err)
   263→	}
   264→
   265→	out := make([]*marketingv1.UserCoupon, 0, len(list))
   266→	for i := range list {
   267→		out = append(out, userCouponToProto(&list[i], coupons[list[i].CouponID]))
   268→	}
   269→
   270→	available, err := s.repo.CountAvailableUserCoupons(ctx, userID, now)
   271→	if err != nil {
   272→		return nil, errs.Wrap(errs.CodeInternalError, "统计可用优惠券失败", err)
   273→	}
   274→
   275→	return &marketingv1.ListUserCouponsResponse{
   276→		Coupons:        out,
   277→		Meta:           buildMeta(page, pageSize, total),
   278→		AvailableCount: int32(available),
   279→	}, nil
   280→}
   281→
   282→// ---------------------------------------------------------------------------
   283→// 促销活动
   284→// ---------------------------------------------------------------------------
   285→
   286→// ListPromotions 分页查询促销活动。
   287→func (s *Service) ListPromotions(ctx context.Context, req *marketingv1.ListPromotionsRequest) (*marketingv1.ListPromotionsResponse, error) {
   288→	page, pageSize := normalizePage(req.GetPage())
   289→	list, total, err := s.repo.ListPromotions(ctx, PromotionQuery{
   290→		Keyword:  strings.TrimSpace(req.GetKeyword()),
   291→		Type:     req.GetType(),
   292→		Status:   req.GetStatus(),
   293→		Page:     page,
   294→		PageSize: pageSize,
   295→	})
   296→	if err != nil {
   297→		return nil, errs.Wrap(errs.CodeInternalError, "查询促销活动失败", err)
   298→	}
   299→	now := time.Now()
   300→	out := make([]*marketingv1.Promotion, 0, len(list))
   301→	for i := range list {
   302→		out = append(out, promotionToProto(&list[i], now))
   303→	}
   304→	return &marketingv1.ListPromotionsResponse{Promotions: out, Meta: buildMeta(page, pageSize, total)}, nil
   305→}
   306→
   307→// SavePromotion 新增或更新促销活动。
   308→func (s *Service) SavePromotion(ctx context.Context, req *marketingv1.SavePromotionRequest) (*marketingv1.Promotion, error) {
   309→	name := strings.TrimSpace(req.GetName())
   310→	if name == "" {
   311→		return nil, errs.New(errs.CodePromotionInvalid, "活动名称不能为空")
   312→	}
   313→	promoType := req.GetType()
   314→	if promoType < PromotionTypeFullReduction || promoType > PromotionTypeGroupBuy {
   315→		return nil, errs.New(errs.CodePromotionInvalid, "活动类型不合法")
   316→	}
   317→	status := req.GetStatus()
   318→	if status < PromotionStatusNotStarted || status > PromotionStatusOffline {
   319→		return nil, errs.New(errs.CodePromotionInvalid, "活动状态不合法")
   320→	}
   321→	start, end, err := parseTimeRange(req.GetStartTime(), req.GetEndTime())
   322→	if err != nil {
   323→		return nil, errs.New(errs.CodePromotionInvalid, err.Error())
   324→	}
   325→
   326→	p := &Promotion{
   327→		ID:             uint64(req.GetId()),
   328→		Name:           name,
   329→		Description:    req.GetDescription(),
   330→		Type:           int8(promoType),
   331→		Status:         int8(status),
   332→		StartTime:      start,
   333→		EndTime:        end,
   334→		MinAmountCents: req.GetMinAmountCents(),
   335→		DiscountCents:  req.GetDiscountCents(),
   336→		Percent:        req.GetPercent(),
   337→		ProductID:      uint64(req.GetProductId()),
   338→		LimitPerUser:   req.GetLimitPerUser(),
   339→		BannerImage:    req.GetBannerImage(),
   340→	}
   341→	if p.Percent <= 0 {
   342→		p.Percent = 100
   343→	}
   344→
   345→	if err := s.repo.SavePromotion(ctx, p); err != nil {
   346→		return nil, errs.Wrap(errs.CodeInternalError, "保存促销活动失败", err)
   347→	}
   348→	saved, err := s.repo.FindPromotionByID(ctx, p.ID)
   349→	if err != nil {
   350→		return nil, err
   351→	}
   352→	return promotionToProto(saved, time.Now()), nil
   353→}
   354→
   355→// DeletePromotion 删除促销活动。
   356→func (s *Service) DeletePromotion(ctx context.Context, id int64) error {
   357→	if id <= 0 {
   358→		return errs.New(errs.CodeInvalidParam, "活动 ID 不合法")
   359→	}
   360→	if _, err := s.repo.FindPromotionByID(ctx, uint64(id)); err != nil {
   361→		return err
   362→	}
   363→	if err := s.repo.DeletePromotion(ctx, uint64(id)); err != nil {
   364→		return errs.Wrap(errs.CodeInternalError, "删除促销活动失败", err)
   365→	}
   366→	return nil
   367→}
   368→
   369→// ---------------------------------------------------------------------------
   370→// 结算试算
   371→// ---------------------------------------------------------------------------
   372→
   373→// PreviewCheckout 结算试算：计算可用券、优惠与最终应付金额。
   374→func (s *Service) PreviewCheckout(ctx context.Context, req *marketingv1.PreviewCheckoutRequest) (*marketingv1.PreviewCheckoutResponse, error) {
   375→	items := req.GetItems()
   376→	if len(items) == 0 {
   377→		return nil, errs.New(errs.CodeInvalidParam, "结算商品不能为空")
   378→	}
   379→
   380→	var totalAmount int64
   381→	for _, item := range items {
   382→		if item.GetQuantity() <= 0 {
   383→			continue
   384→		}
   385→		if item.GetPriceCents() < 0 {
   386→			return nil, errs.New(errs.CodeInvalidParam, "商品价格不合法")
   387→		}
   388→		totalAmount += item.GetPriceCents() * int64(item.GetQuantity())
   389→	}
   390→	if totalAmount <= 0 {
   391→		return nil, errs.New(errs.CodeInvalidParam, "商品总额必须大于 0")
   392→	}
   393→
   394→	now := time.Now()
   395→
   396→	// 运费
   397→	freight, err := s.calcFreight(ctx, totalAmount)
   398→	if err != nil {
   399→		return nil, err
   400→	}
   401→
   402→	// 优惠券抵扣
   403→	couponDiscount, freeShipping, err := s.calcCoupon(ctx, uint64(resolveUserID(ctx, req.GetUserId())), uint64(req.GetCouponId()), totalAmount, now)
   404→	if err != nil {
   405→		return nil, err
   406→	}
   407→	if freeShipping {
   408→		freight = 0
   409→	}
   410→
   411→	// 积分抵扣：100 积分 = 100 分（1 元），且不超过商品总额的 50%
   412→	pointsDiscount := req.GetPointsUsed() * pointsPerCent
   413→	if pointsDiscount < 0 {
   414→		pointsDiscount = 0
   415→	}
   416→	if maxPoints := totalAmount / 2; pointsDiscount > maxPoints {
   417→		pointsDiscount = maxPoints
   418→	}
   419→	if pointsDiscount > totalAmount {
   420→		pointsDiscount = totalAmount
   421→	}
   422→
   423→	payable := totalAmount - couponDiscount - pointsDiscount + freight
   424→	if payable < 0 {
   425→		payable = 0
   426→	}
   427→
   428→	availableCoupons, err := s.availableUserCoupons(ctx, uint64(resolveUserID(ctx, req.GetUserId())), now)
   429→	if err != nil {
   430→		return nil, err
   431→	}
   432→	promotions, err := s.repo.ListRunningPromotions(ctx, now)
   433→	if err != nil {
   434→		return nil, errs.Wrap(errs.CodeInternalError, "查询进行中的活动失败", err)
   435→	}
   436→	activePromotions := make([]*marketingv1.Promotion, 0, len(promotions))
   437→	for i := range promotions {
   438→		activePromotions = append(activePromotions, promotionToProto(&promotions[i], now))
   439→	}
   440→
   441→	return &marketingv1.PreviewCheckoutResponse{
   442→		TotalAmountCents:    totalAmount,
   443→		DiscountCents:       couponDiscount + pointsDiscount,
   444→		CouponDiscountCents: couponDiscount,
   445→		PointsDiscountCents: pointsDiscount,
   446→		FreightCents:        freight,
   447→		PayableCents:        payable,
   448→		AvailableCoupons:    availableCoupons,
   449→		ActivePromotions:    activePromotions,
   450→	}, nil
   451→}
   452→
   453→// calcFreight 计算运费。
   454→//
   455→// 规则：
   456→//  1. 有启用的运费模板时，按 sort 升序取第一个"适用"的模板：
   457→//     模板门槛取 free_freight_amount_cents，为 0 表示全场适用；
   458→//     门槛大于 0 且商品总额达到门槛时该模板免运费，否则按模板的 freight_cents 计费。
   459→//  2. 没有启用的运费模板时使用默认规则：满 9900 分包邮，否则运费 1000 分。
   460→func (s *Service) calcFreight(ctx context.Context, totalAmount int64) (int64, error) {
   461→	templates, err := s.repo.ListEnabledTemplates(ctx)
   462→	if err != nil {
   463→		return 0, errs.Wrap(errs.CodeInternalError, "查询运费模板失败", err)
   464→	}
   465→	for i := range templates {
   466→		tpl := templates[i]
   467→		if tpl.FreeFreightAmountCents > 0 {
   468→			if totalAmount < tpl.FreeFreightAmountCents {
   469→				continue
   470→			}
   471→			return 0, nil
   472→		}
   473→		return tpl.FreightCents, nil
   474→	}
   475→	if totalAmount >= defaultFreeFreightAmountCents {
   476→		return 0, nil
   477→	}
   478→	return defaultFreightCents, nil
   479→}
   480→
   481→// calcCoupon 计算优惠券抵扣。
   482→//
   483→// 返回抵扣金额与是否免运费；免运费券的抵扣体现在运费上，抵扣金额记为 0。
   484→func (s *Service) calcCoupon(ctx context.Context, userID, couponID uint64, totalAmount int64, now time.Time) (int64, bool, error) {
   485→	if userID == 0 || couponID == 0 {
   486→		return 0, false, nil
   487→	}
   488→	uc, err := s.repo.FindUserCoupon(ctx, userID, couponID)
   489→	if err != nil {
   490→		return 0, false, errs.Wrap(errs.CodeInternalError, "查询用户优惠券失败", err)
   491→	}
   492→	if uc == nil {
   493→		return 0, false, errs.New(errs.CodeCouponUnavailable, "该优惠券不属于当前用户")
   494→	}
   495→	if uc.Status != UserCouponStatusUnused {
   496→		return 0, false, errs.New(errs.CodeCouponUnavailable, "该优惠券已使用")
   497→	}
   498→	coupon, err := s.repo.FindCouponByID(ctx, couponID)
   499→	if err != nil {
   500→		return 0, false, err
   501→	}
   502→	if now.After(coupon.EndTime) {
   503→		return 0, false, errs.New(errs.CodeCouponExpired, "该优惠券已过期")
   504→	}
   505→	if totalAmount < coupon.MinAmountCents {
   506→		return 0, false, errs.New(errs.CodeCouponUnavailable, "未达到该优惠券的使用门槛")
   507→	}
   508→
   509→	switch coupon.Type {
   510→	case CouponTypeFixed:
   511→		discount := coupon.FaceValueCents
   512→		if discount > totalAmount {
   513→			discount = totalAmount
   514→		}
   515→		return discount, false, nil
   516→	case CouponTypePercent:
   517→		discount := totalAmount - totalAmount*int64(coupon.Percent)/100
   518→		if coupon.MaxDiscountCents > 0 && discount > coupon.MaxDiscountCents {
   519→			discount = coupon.MaxDiscountCents
   520→		}
   521→		if discount > totalAmount {
   522→			discount = totalAmount
   523→		}
   524→		return discount, false, nil
   525→	case CouponTypeShipping:
   526→		return 0, true, nil
   527→	default:
   528→		return 0, false, errs.New(errs.CodeCouponUnavailable, "优惠券类型不支持")
   529→	}
   530→}
   531→
   532→// availableUserCoupons 返回用户当前可用的优惠券（未使用且未过期）。
   533→func (s *Service) availableUserCoupons(ctx context.Context, userID uint64, now time.Time) ([]*marketingv1.UserCoupon, error) {
   534→	if userID == 0 {
   535→		return []*marketingv1.UserCoupon{}, nil
   536→	}
   537→	list, _, err := s.repo.ListUserCoupons(ctx, userID, UserCouponStatusUnused, 1, 100)
   538→	if err != nil {
   539→		return nil, errs.Wrap(errs.CodeInternalError, "查询用户优惠券失败", err)
   540→	}
   541→	coupons, err := s.couponMap(ctx, list)
   542→	if err != nil {
   543→		return nil, errs.Wrap(errs.CodeInternalError, "查询优惠券详情失败", err)
   544→	}
   545→	out := make([]*marketingv1.UserCoupon, 0, len(list))
   546→	for i := range list {
   547→		coupon := coupons[list[i].CouponID]
   548→		if coupon == nil || now.After(coupon.EndTime) {
   549→			continue
   550→		}
   551→		out = append(out, userCouponToProto(&list[i], coupon))
   552→	}
   553→	return out, nil
   554→}
   555→
   556→// couponMap 批量加载券详情。
   557→func (s *Service) couponMap(ctx context.Context, list []UserCoupon) (map[uint64]*Coupon, error) {
   558→	ids := make([]uint64, 0, len(list))
   559→	for i := range list {
   560→		ids = append(ids, list[i].CouponID)
   561→	}
   562→	return s.repo.ListCouponsByIDs(ctx, ids)
   563→}
   564→
   565→// ---------------------------------------------------------------------------
   566→// 转换辅助
   567→// ---------------------------------------------------------------------------
   568→
   569→func couponToProto(c *Coupon) *marketingv1.Coupon {
   570→	if c == nil {
   571→		return nil
   572→	}
   573→	return &marketingv1.Coupon{
   574→		Id:               int64(c.ID),
   575→		Name:             c.Name,
   576→		Code:             c.Code,
   577→		Type:             commonv1.CouponType(c.Type),
   578→		FaceValueCents:   c.FaceValueCents,
   579→		Percent:          c.Percent,
   580→		MinAmountCents:   c.MinAmountCents,
   581→		MaxDiscountCents: c.MaxDiscountCents,
   582→		TotalQuantity:    c.TotalQuantity,
   583→		ReceivedQuantity: c.ReceivedQuantity,
   584→		UsedQuantity:     c.UsedQuantity,
   585→		PerUserLimit:     c.PerUserLimit,

[desktop read output truncated: original_bytes=28245; if the omitted remainder is needed, continue with read using offset=586 and the same path.]
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:16:31

<details><summary>🛠 read</summary>

```
586→		StartTime:        c.StartTime.Unix(),
   587→		EndTime:          c.EndTime.Unix(),
   588→		CategoryId:       int64(c.CategoryID),
   589→		Enabled:          c.Enabled,
   590→		CreatedAt:        timestamppb.New(c.CreatedAt),
   591→	}
   592→}
   593→
   594→func userCouponToProto(uc *UserCoupon, coupon *Coupon) *marketingv1.UserCoupon {
   595→	if uc == nil {
   596→		return nil
   597→	}
   598→	out := &marketingv1.UserCoupon{
   599→		Id:         int64(uc.ID),
   600→		UserId:     int64(uc.UserID),
   601→		CouponId:   int64(uc.CouponID),
   602→		Coupon:     couponToProto(coupon),
   603→		Status:     commonv1.UserCouponStatus(uc.Status),
   604→		OrderId:    int64(uc.OrderID),
   605→		ReceivedAt: timestamppb.New(uc.ReceivedAt),
   606→	}
   607→	if uc.UsedAt != nil {
   608→		out.UsedAt = timestamppb.New(*uc.UsedAt)
   609→	}
   610→	return out
   611→}
   612→
   613→func promotionToProto(p *Promotion, now time.Time) *marketingv1.Promotion {
   614→	if p == nil {
   615→		return nil
   616→	}
   617→	return &marketingv1.Promotion{
   618→		Id:             int64(p.ID),
   619→		Name:           p.Name,
   620→		Description:    p.Description,
   621→		Type:           int32(p.Type),
   622→		Status:         int32(realPromotionStatus(p, now)),
   623→		StartTime:      p.StartTime.Unix(),
   624→		EndTime:        p.EndTime.Unix(),
   625→		MinAmountCents: p.MinAmountCents,
   626→		DiscountCents:  p.DiscountCents,
   627→		Percent:        p.Percent,
   628→		ProductId:      int64(p.ProductID),
   629→		LimitPerUser:   p.LimitPerUser,
   630→		SoldCount:      p.SoldCount,
   631→		BannerImage:    p.BannerImage,
   632→		CreatedAt:      timestamppb.New(p.CreatedAt),
   633→	}
   634→}
   635→
   636→// realPromotionStatus 按当前时间推导活动的真实状态。
   637→//
   638→// 已下线的活动保持下线状态，其余按时间区间推导为未开始/进行中/已结束。
   639→func realPromotionStatus(p *Promotion, now time.Time) int {
   640→	if p.Status == PromotionStatusOffline {
   641→		return PromotionStatusOffline
   642→	}
   643→	switch {
   644→	case now.Before(p.StartTime):
   645→		return PromotionStatusNotStarted
   646→	case now.After(p.EndTime):
   647→		return PromotionStatusFinished
   648→	default:
   649→		return PromotionStatusRunning
   650→	}
   651→}
   652→
   653→func normalizePage(page *commonv1.PageRequest) (int, int) {
   654→	pageNum := int(page.GetPage())
   655→	pageSize := int(page.GetPageSize())
   656→	if pageNum <= 0 {
   657→		pageNum = 1
   658→	}
   659→	if pageSize <= 0 {
   660→		pageSize = 20
   661→	}
   662→	if pageSize > 100 {
   663→		pageSize = 100
   664→	}
   665→	return pageNum, pageSize
   666→}
   667→
   668→func buildMeta(page, pageSize int, total int64) *commonv1.PageMeta {
   669→	totalPages := int64(0)
   670→	if pageSize > 0 {
   671→		totalPages = (total + int64(pageSize) - 1) / int64(pageSize)
   672→	}
   673→	return &commonv1.PageMeta{
   674→		Page: int32(page), PageSize: int32(pageSize),
   675→		Total: total, TotalPages: int32(totalPages),
   676→	}
   677→}
   678→
   679→// parseTimeRange 解析 Unix 秒时间戳区间。
   680→func parseTimeRange(start, end int64) (time.Time, time.Time, error) {
   681→	if start <= 0 || end <= 0 {
   682→		return time.Time{}, time.Time{}, errs.New(errs.CodeInvalidParam, "活动时间不能为空")
   683→	}
   684→	if start >= end {
   685→		return time.Time{}, time.Time{}, errs.New(errs.CodeInvalidParam, "活动开始时间必须早于结束时间")
   686→	}
   687→	return time.Unix(start, 0), time.Unix(end, 0), nil
   688→}
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:16:33

<details><summary>🛠 read</summary>

```
1→// Package marketing 实现优惠券、促销活动与结算试算相关的业务能力。
     2→package marketing
     3→
     4→import (
     5→	"time"
     6→)
     7→
     8→// 优惠券类型
     9→const (
    10→	CouponTypeFixed    = 1 // 满减券
    11→	CouponTypePercent  = 2 // 折扣券
    12→	CouponTypeShipping = 3 // 免运费券
    13→)
    14→
    15→// 用户优惠券状态
    16→const (
    17→	UserCouponStatusUnused  = 1
    18→	UserCouponStatusUsed    = 2
    19→	UserCouponStatusExpired = 3
    20→)
    21→
    22→// 促销活动类型
    23→const (
    24→	PromotionTypeFullReduction = 1 // 满减
    25→	PromotionTypeDiscount      = 2 // 折扣
    26→	PromotionTypeSeckill       = 3 // 秒杀
    27→	PromotionTypeGroupBuy      = 4 // 拼团
    28→)
    29→
    30→// 促销活动状态
    31→const (
    32→	PromotionStatusNotStarted = 0 // 未开始
    33→	PromotionStatusRunning    = 1 // 进行中
    34→	PromotionStatusFinished   = 2 // 已结束
    35→	PromotionStatusOffline    = 3 // 已下线
    36→)
    37→
    38→// Coupon 是优惠券模型。
    39→type Coupon struct {
    40→	ID               uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
    41→	Name             string    `gorm:"type:varchar(128);not null" json:"name"`
    42→	Code             string    `gorm:"type:varchar(64);not null;uniqueIndex:uk_code" json:"code"`
    43→	Type             int8      `gorm:"tinyint;not null;default:1" json:"type"`
    44→	FaceValueCents   int64     `gorm:"bigint;not null;default:0" json:"face_value_cents"`
    45→	Percent          int32     `gorm:"int;not null;default:100" json:"percent"`
    46→	MinAmountCents   int64     `gorm:"bigint;not null;default:0" json:"min_amount_cents"`
    47→	MaxDiscountCents int64     `gorm:"bigint;not null;default:0" json:"max_discount_cents"`
    48→	TotalQuantity    int64     `gorm:"bigint;not null;default:0" json:"total_quantity"`
    49→	ReceivedQuantity int64     `gorm:"bigint;not null;default:0" json:"received_quantity"`
    50→	UsedQuantity     int64     `gorm:"bigint;not null;default:0" json:"used_quantity"`
    51→	PerUserLimit     int64     `gorm:"bigint;not null;default:1" json:"per_user_limit"`
    52→	StartTime        time.Time `gorm:"type:datetime;not null;index:idx_enabled_time,priority:2" json:"start_time"`
    53→	EndTime          time.Time `gorm:"type:datetime;not null;index:idx_enabled_time,priority:3" json:"end_time"`
    54→	CategoryID       uint64    `gorm:"bigint unsigned;not null;default:0" json:"category_id"`
    55→	Enabled          bool      `gorm:"tinyint;not null;default:1;index:idx_enabled_time,priority:1" json:"enabled"`
    56→	CreatedAt        time.Time `gorm:"type:datetime;not null;default:CURRENT_TIMESTAMP" json:"created_at"`
    57→	UpdatedAt        time.Time `gorm:"type:datetime;not null;default:CURRENT_TIMESTAMP" json:"updated_at"`
    58→}
    59→
    60→// TableName 指定表名。
    61→func (Coupon) TableName() string { return "coupons" }
    62→
    63→// UserCoupon 是用户持有的优惠券模型。
    64→//
    65→// 表结构上 (user_id, coupon_id) 有唯一键，因此同一张券每个用户只会有一条领取记录。
    66→type UserCoupon struct {
    67→	ID         uint64     `gorm:"primaryKey;autoIncrement" json:"id"`
    68→	UserID     uint64     `gorm:"bigint unsigned;not null;uniqueIndex:uk_user_coupon;index:idx_user_status,priority:1" json:"user_id"`
    69→	CouponID   uint64     `gorm:"bigint unsigned;not null;uniqueIndex:uk_user_coupon" json:"coupon_id"`
    70→	Status     int8       `gorm:"tinyint;not null;default:1;index:idx_user_status,priority:2" json:"status"`
    71→	OrderID    uint64     `gorm:"bigint unsigned;not null;default:0" json:"order_id"`
    72→	ReceivedAt time.Time  `gorm:"type:datetime;not null;default:CURRENT_TIMESTAMP" json:"received_at"`
    73→	UsedAt     *time.Time `gorm:"type:datetime" json:"used_at"`
    74→}
    75→
    76→// TableName 指定表名。
    77→func (UserCoupon) TableName() string { return "user_coupons" }
    78→
    79→// Promotion 是促销活动模型。
    80→type Promotion struct {
    81→	ID             uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
    82→	Name           string    `gorm:"type:varchar(128);not null" json:"name"`
    83→	Description    string    `gorm:"type:varchar(512);not null;default:''" json:"description"`
    84→	Type           int8      `gorm:"tinyint;not null;default:1" json:"type"`
    85→	Status         int8      `gorm:"tinyint;not null;default:0;index:idx_status_time,priority:1" json:"status"`
    86→	StartTime      time.Time `gorm:"type:datetime;not null;index:idx_status_time,priority:2" json:"start_time"`
    87→	EndTime        time.Time `gorm:"type:datetime;not null;index:idx_status_time,priority:3" json:"end_time"`
    88→	MinAmountCents int64     `gorm:"bigint;not null;default:0" json:"min_amount_cents"`
    89→	DiscountCents  int64     `gorm:"bigint;not null;default:0" json:"discount_cents"`
    90→	Percent        int32     `gorm:"int;not null;default:100" json:"percent"`
    91→	ProductID      uint64    `gorm:"bigint unsigned;not null;default:0" json:"product_id"`
    92→	LimitPerUser   int32     `gorm:"int;not null;default:0" json:"limit_per_user"`
    93→	SoldCount      int64     `gorm:"bigint;not null;default:0" json:"sold_count"`
    94→	BannerImage    string    `gorm:"type:varchar(512);not null;default:''" json:"banner_image"`
    95→	CreatedAt      time.Time `gorm:"type:datetime;not null;default:CURRENT_TIMESTAMP" json:"created_at"`
    96→	UpdatedAt      time.Time `gorm:"type:datetime;not null;default:CURRENT_TIMESTAMP" json:"updated_at"`
    97→}
    98→
    99→// TableName 指定表名。
   100→func (Promotion) TableName() string { return "promotions" }
   101→
   102→// LogisticTemplate 是运费模板模型。
   103→//
   104→// 该表由物流服务维护，营销服务仅在结算试算时读取，
   105→// 因此不参与营销服务的自动建表。
   106→type LogisticTemplate struct {
   107→	ID                     uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
   108→	Name                   string    `gorm:"type:varchar(64);not null" json:"name"`
   109→	Company                string    `gorm:"type:varchar(64);not null;default:''" json:"company"`
   110→	CompanyCode            string    `gorm:"type:varchar(32);not null;default:''" json:"company_code"`
   111→	FreightCents           int64     `gorm:"bigint;not null;default:0" json:"freight_cents"`
   112→	FreeFreightAmountCents int64     `gorm:"bigint;not null;default:0" json:"free_freight_amount_cents"`
   113→	Regions                string    `gorm:"type:varchar(512);not null;default:''" json:"regions"`
   114→	Enabled                bool      `gorm:"tinyint;not null;default:1" json:"enabled"`
   115→	Sort                   int32     `gorm:"int;not null;default:0" json:"sort"`
   116→	CreatedAt              time.Time `gorm:"type:datetime;not null;default:CURRENT_TIMESTAMP" json:"created_at"`
   117→	UpdatedAt              time.Time `gorm:"type:datetime;not null;default:CURRENT_TIMESTAMP" json:"updated_at"`
   118→}
   119→
   120→// TableName 指定表名。
   121→func (LogisticTemplate) TableName() string { return "logistic_templates" }
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:16:36

<details><summary>🛠 read</summary>

```
1→package marketing
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
    13→// Repo 封装营销域的数据访问。
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
    25→// 优惠券
    26→// ---------------------------------------------------------------------------
    27→
    28→// CouponQuery 是优惠券列表的查询条件。
    29→type CouponQuery struct {
    30→	Keyword   string
    31→	Type      int32
    32→	Enabled   bool
    33→	Available bool
    34→	Page      int
    35→	PageSize  int
    36→}
    37→
    38→// ListCoupons 分页查询优惠券。
    39→func (r *Repo) ListCoupons(ctx context.Context, q CouponQuery) ([]Coupon, int64, error) {
    40→	tx := r.db.WithContext(ctx).Model(&Coupon{})
    41→	if q.Keyword != "" {
    42→		like := "%" + q.Keyword + "%"
    43→		tx = tx.Where("name LIKE ? OR code LIKE ?", like, like)
    44→	}
    45→	if q.Type > 0 {
    46→		tx = tx.Where("type = ?", q.Type)
    47→	}
    48→	if q.Enabled {
    49→		tx = tx.Where("enabled = ?", true)
    50→	}
    51→	if q.Available {
    52→		now := time.Now()
    53→		tx = tx.Where("enabled = ?", true).
    54→			Where("start_time <= ? AND end_time >= ?", now, now).
    55→			Where("total_quantity <= 0 OR received_quantity < total_quantity")
    56→	}
    57→
    58→	var total int64
    59→	if err := tx.Count(&total).Error; err != nil {
    60→		return nil, 0, err
    61→	}
    62→	var list []Coupon
    63→	err := tx.Order("id DESC").Offset((q.Page - 1) * q.PageSize).Limit(q.PageSize).Find(&list).Error
    64→	return list, total, err
    65→}
    66→
    67→// FindCouponByID 按 ID 查询优惠券。
    68→func (r *Repo) FindCouponByID(ctx context.Context, id uint64) (*Coupon, error) {
    69→	var c Coupon
    70→	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&c).Error; err != nil {
    71→		if errors.Is(err, gorm.ErrRecordNotFound) {
    72→			return nil, errs.New(errs.CodeCouponNotFound, "优惠券不存在")
    73→		}
    74→		return nil, err
    75→	}
    76→	return &c, nil
    77→}
    78→
    79→// SaveCoupon 新增或更新优惠券。
    80→func (r *Repo) SaveCoupon(ctx context.Context, c *Coupon) error {
    81→	if c.ID == 0 {
    82→		return r.db.WithContext(ctx).Create(c).Error
    83→	}
    84→	return r.db.WithContext(ctx).Model(&Coupon{}).Where("id = ?", c.ID).
    85→		Updates(map[string]any{
    86→			"name":               c.Name,
    87→			"code":               c.Code,
    88→			"type":               c.Type,
    89→			"face_value_cents":   c.FaceValueCents,
    90→			"percent":            c.Percent,
    91→			"min_amount_cents":   c.MinAmountCents,
    92→			"max_discount_cents": c.MaxDiscountCents,
    93→			"total_quantity":     c.TotalQuantity,
    94→			"per_user_limit":     c.PerUserLimit,
    95→			"start_time":         c.StartTime,
    96→			"end_time":           c.EndTime,
    97→			"category_id":        c.CategoryID,
    98→			"enabled":            c.Enabled,
    99→		}).Error
   100→}
   101→
   102→// DeleteCoupon 删除优惠券及其发放记录（事务内完成）。
   103→func (r *Repo) DeleteCoupon(ctx context.Context, id uint64) error {
   104→	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
   105→		if err := tx.Where("coupon_id = ?", id).Delete(&UserCoupon{}).Error; err != nil {
   106→			return err
   107→		}
   108→		return tx.Delete(&Coupon{}, id).Error
   109→	})
   110→}
   111→
   112→// IncrementReceived 原子增加发放数量，返回受影响的行数。
   113→//
   114→// 条件里带上 total_quantity 校验，保证并发下不会超发；
   115→// 返回 0 表示券已被领完。
   116→func (r *Repo) IncrementReceived(ctx context.Context, id uint64) (int64, error) {
   117→	res := r.db.WithContext(ctx).Model(&Coupon{}).Where("id = ?", id).
   118→		Where("total_quantity <= 0 OR received_quantity < total_quantity").
   119→		UpdateColumn("received_quantity", gorm.Expr("received_quantity + 1"))
   120→	if res.Error != nil {
   121→		return 0, res.Error
   122→	}
   123→	return res.RowsAffected, nil
   124→}
   125→
   126→// ---------------------------------------------------------------------------
   127→// 用户优惠券
   128→// ---------------------------------------------------------------------------
   129→
   130→// FindUserCoupon 查询用户持有的某张券。
   131→func (r *Repo) FindUserCoupon(ctx context.Context, userID, couponID uint64) (*UserCoupon, error) {
   132→	var uc UserCoupon
   133→	err := r.db.WithContext(ctx).Where("user_id = ? AND coupon_id = ?", userID, couponID).First(&uc).Error
   134→	if err != nil {
   135→		if errors.Is(err, gorm.ErrRecordNotFound) {
   136→			return nil, nil
   137→		}
   138→		return nil, err
   139→	}
   140→	return &uc, nil
   141→}
   142→
   143→// CountUserCoupons 统计用户已领取指定券的数量。
   144→func (r *Repo) CountUserCoupons(ctx context.Context, userID, couponID uint64) (int64, error) {
   145→	var count int64
   146→	err := r.db.WithContext(ctx).Model(&UserCoupon{}).
   147→		Where("user_id = ? AND coupon_id = ?", userID, couponID).Count(&count).Error
   148→	return count, err
   149→}
   150→
   151→// CreateUserCoupon 新增用户优惠券记录。
   152→func (r *Repo) CreateUserCoupon(ctx context.Context, uc *UserCoupon) error {
   153→	return r.db.WithContext(ctx).Create(uc).Error
   154→}
   155→
   156→// ListUserCoupons 分页查询用户优惠券。
   157→func (r *Repo) ListUserCoupons(ctx context.Context, userID uint64, status int32, page, pageSize int) ([]UserCoupon, int64, error) {
   158→	tx := r.db.WithContext(ctx).Model(&UserCoupon{}).Where("user_id = ?", userID)
   159→	if status > 0 {
   160→		tx = tx.Where("status = ?", status)
   161→	}
   162→	var total int64
   163→	if err := tx.Count(&total).Error; err != nil {
   164→		return nil, 0, err
   165→	}
   166→	var list []UserCoupon
   167→	err := tx.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
   168→	return list, total, err
   169→}
   170→
   171→// ExpireUserCoupons 把已过期但仍标记为未使用的用户券置为已过期。
   172→func (r *Repo) ExpireUserCoupons(ctx context.Context, userID uint64, now time.Time) error {
   173→	return r.db.WithContext(ctx).Exec(
   174→		"UPDATE user_coupons uc JOIN coupons c ON c.id = uc.coupon_id SET uc.status = ? WHERE uc.user_id = ? AND uc.status = ? AND c.end_time < ?",
   175→		UserCouponStatusExpired, userID, UserCouponStatusUnused, now).Error
   176→}
   177→
   178→// CountAvailableUserCoupons 统计用户未使用且未过期的券数量。
   179→func (r *Repo) CountAvailableUserCoupons(ctx context.Context, userID uint64, now time.Time) (int64, error) {
   180→	var count int64
   181→	err := r.db.WithContext(ctx).Model(&UserCoupon{}).
   182→		Joins("JOIN coupons c ON c.id = user_coupons.coupon_id").
   183→		Where("user_coupons.user_id = ? AND user_coupons.status = ? AND c.end_time >= ?",
   184→			userID, UserCouponStatusUnused, now).
   185→		Count(&count).Error
   186→	return count, err
   187→}
   188→
   189→// FindUserCouponByID 按 ID 查询用户优惠券。
   190→func (r *Repo) FindUserCouponByID(ctx context.Context, id uint64) (*UserCoupon, error) {
   191→	var uc UserCoupon
   192→	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&uc).Error; err != nil {
   193→		if errors.Is(err, gorm.ErrRecordNotFound) {
   194→			return nil, errs.New(errs.CodeNotFound, "用户优惠券不存在")
   195→		}
   196→		return nil, err
   197→	}
   198→	return &uc, nil
   199→}
   200→
   201→// MarkUserCouponUsed 核销用户优惠券并累加券的使用次数。
   202→func (r *Repo) MarkUserCouponUsed(ctx context.Context, userID, couponID, orderID uint64) error {
   203→	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
   204→		now := time.Now()
   205→		res := tx.Model(&UserCoupon{}).
   206→			Where("user_id = ? AND coupon_id = ? AND status = ?", userID, couponID, UserCouponStatusUnused).
   207→			Updates(map[string]any{
   208→				"status":   UserCouponStatusUsed,
   209→				"order_id": orderID,
   210→				"used_at":  &now,
   211→			})
   212→		if res.Error != nil {
   213→			return res.Error
   214→		}
   215→		if res.RowsAffected == 0 {
   216→			return nil
   217→		}
   218→		return tx.Model(&Coupon{}).Where("id = ?", couponID).
   219→			UpdateColumn("used_quantity", gorm.Expr("used_quantity + 1")).Error
   220→	})
   221→}
   222→
   223→// ListCouponsByIDs 按 ID 批量查询优惠券。
   224→func (r *Repo) ListCouponsByIDs(ctx context.Context, ids []uint64) (map[uint64]*Coupon, error) {
   225→	out := make(map[uint64]*Coupon, len(ids))
   226→	if len(ids) == 0 {
   227→		return out, nil
   228→	}
   229→	var list []Coupon
   230→	if err := r.db.WithContext(ctx).Where("id IN ?", ids).Find(&list).Error; err != nil {
   231→		return nil, err
   232→	}
   233→	for i := range list {
   234→		out[list[i].ID] = &list[i]
   235→	}
   236→	return out, nil
   237→}
   238→
   239→// ---------------------------------------------------------------------------
   240→// 促销活动
   241→// ---------------------------------------------------------------------------
   242→
   243→// PromotionQuery 是促销活动列表的查询条件。
   244→type PromotionQuery struct {
   245→	Keyword  string
   246→	Type     int32
   247→	Status   int32
   248→	Page     int
   249→	PageSize int
   250→}
   251→
   252→// ListPromotions 分页查询促销活动。
   253→func (r *Repo) ListPromotions(ctx context.Context, q PromotionQuery) ([]Promotion, int64, error) {
   254→	tx := r.db.WithContext(ctx).Model(&Promotion{})
   255→	if q.Keyword != "" {
   256→		like := "%" + q.Keyword + "%"
   257→		tx = tx.Where("name LIKE ? OR description LIKE ?", like, like)
   258→	}
   259→	if q.Type > 0 {
   260→		tx = tx.Where("type = ?", q.Type)
   261→	}
   262→	if q.Status > 0 {
   263→		tx = tx.Where("status = ?", q.Status)
   264→	}
   265→	var total int64
   266→	if err := tx.Count(&total).Error; err != nil {
   267→		return nil, 0, err
   268→	}
   269→	var list []Promotion
   270→	err := tx.Order("id DESC").Offset((q.Page - 1) * q.PageSize).Limit(q.PageSize).Find(&list).Error
   271→	return list, total, err
   272→}
   273→
   274→// ListRunningPromotions 查询当前进行中的促销活动。
   275→func (r *Repo) ListRunningPromotions(ctx context.Context, now time.Time) ([]Promotion, error) {
   276→	var list []Promotion
   277→	err := r.db.WithContext(ctx).Model(&Promotion{}).
   278→		Where("status = ? AND start_time <= ? AND end_time >= ?", PromotionStatusRunning, now, now).
   279→		Order("id DESC").Find(&list).Error
   280→	return list, err
   281→}
   282→
   283→// FindPromotionByID 按 ID 查询促销活动。
   284→func (r *Repo) FindPromotionByID(ctx context.Context, id uint64) (*Promotion, error) {
   285→	var p Promotion
   286→	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&p).Error; err != nil {
   287→		if errors.Is(err, gorm.ErrRecordNotFound) {
   288→			return nil, errs.New(errs.CodePromotionInvalid, "促销活动不存在")
   289→		}
   290→		return nil, err
   291→	}
   292→	return &p, nil
   293→}
   294→
   295→// SavePromotion 新增或更新促销活动。
   296→func (r *Repo) SavePromotion(ctx context.Context, p *Promotion) error {
   297→	if p.ID == 0 {
   298→		return r.db.WithContext(ctx).Create(p).Error
   299→	}
   300→	return r.db.WithContext(ctx).Model(&Promotion{}).Where("id = ?", p.ID).
   301→		Updates(map[string]any{
   302→			"name":             p.Name,
   303→			"description":      p.Description,
   304→			"type":             p.Type,
   305→			"status":           p.Status,
   306→			"start_time":       p.StartTime,
   307→			"end_time":         p.EndTime,
   308→			"min_amount_cents": p.MinAmountCents,
   309→			"discount_cents":   p.DiscountCents,
   310→			"percent":          p.Percent,
   311→			"product_id":       p.ProductID,
   312→			"limit_per_user":   p.LimitPerUser,
   313→			"banner_image":     p.BannerImage,
   314→		}).Error
   315→}
   316→
   317→// DeletePromotion 删除促销活动。
   318→func (r *Repo) DeletePromotion(ctx context.Context, id uint64) error {
   319→	return r.db.WithContext(ctx).Delete(&Promotion{}, id).Error
   320→}
   321→
   322→// ---------------------------------------------------------------------------
   323→// 运费模板
   324→// ---------------------------------------------------------------------------
   325→
   326→// ListEnabledTemplates 查询启用的运费模板。
   327→func (r *Repo) ListEnabledTemplates(ctx context.Context) ([]LogisticTemplate, error) {
   328→	var list []LogisticTemplate
   329→	err := r.db.WithContext(ctx).Model(&LogisticTemplate{}).
   330→		Where("enabled = ?", true).
   331→		Order("sort ASC, id ASC").Find(&list).Error
   332→	return list, err
   333→}
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:16:39

Now let me look at the marketing handler, errs package, and the database schema.

<details><summary>🛠 read</summary>

```
1→package marketing
     2→
     3→import (
     4→	"context"
     5→
     6→	commonv1 "github.com/shopstack/platform/gen/go/common/v1"
     7→	marketingv1 "github.com/shopstack/platform/gen/go/marketing/v1"
     8→)
     9→
    10→// Handler 实现 MarketingService。
    11→type Handler struct {
    12→	marketingv1.UnimplementedMarketingServiceServer
    13→	service *Service
    14→}
    15→
    16→// NewHandler 构造处理器。
    17→func NewHandler(service *Service) *Handler {
    18→	return &Handler{service: service}
    19→}
    20→
    21→// ListCoupons 查询优惠券列表。
    22→func (h *Handler) ListCoupons(ctx context.Context, req *marketingv1.ListCouponsRequest) (*marketingv1.ListCouponsResponse, error) {
    23→	return h.service.ListCoupons(ctx, req)
    24→}
    25→
    26→// SaveCoupon 保存优惠券。
    27→func (h *Handler) SaveCoupon(ctx context.Context, req *marketingv1.SaveCouponRequest) (*marketingv1.Coupon, error) {
    28→	return h.service.SaveCoupon(ctx, req)
    29→}
    30→
    31→// DeleteCoupon 删除优惠券。
    32→func (h *Handler) DeleteCoupon(ctx context.Context, req *marketingv1.DeleteCouponRequest) (*commonv1.OperationResult, error) {
    33→	if err := h.service.DeleteCoupon(ctx, req.GetId()); err != nil {
    34→		return nil, err
    35→	}
    36→	return &commonv1.OperationResult{Success: true, Message: "优惠券已删除"}, nil
    37→}
    38→
    39→// ReceiveCoupon 领取优惠券。
    40→func (h *Handler) ReceiveCoupon(ctx context.Context, req *marketingv1.ReceiveCouponRequest) (*marketingv1.UserCoupon, error) {
    41→	return h.service.ReceiveCoupon(ctx, req)
    42→}
    43→
    44→// ListUserCoupons 查询用户优惠券。
    45→func (h *Handler) ListUserCoupons(ctx context.Context, req *marketingv1.ListUserCouponsRequest) (*marketingv1.ListUserCouponsResponse, error) {
    46→	return h.service.ListUserCoupons(ctx, req)
    47→}
    48→
    49→// ListPromotions 查询促销活动。
    50→func (h *Handler) ListPromotions(ctx context.Context, req *marketingv1.ListPromotionsRequest) (*marketingv1.ListPromotionsResponse, error) {
    51→	return h.service.ListPromotions(ctx, req)
    52→}
    53→
    54→// SavePromotion 保存促销活动。
    55→func (h *Handler) SavePromotion(ctx context.Context, req *marketingv1.SavePromotionRequest) (*marketingv1.Promotion, error) {
    56→	return h.service.SavePromotion(ctx, req)
    57→}
    58→
    59→// DeletePromotion 删除促销活动。
    60→func (h *Handler) DeletePromotion(ctx context.Context, req *marketingv1.DeletePromotionRequest) (*commonv1.OperationResult, error) {
    61→	if err := h.service.DeletePromotion(ctx, req.GetId()); err != nil {
    62→		return nil, err
    63→	}
    64→	return &commonv1.OperationResult{Success: true, Message: "促销活动已删除"}, nil
    65→}
    66→
    67→// PreviewCheckout 结算试算。
    68→func (h *Handler) PreviewCheckout(ctx context.Context, req *marketingv1.PreviewCheckoutRequest) (*marketingv1.PreviewCheckoutResponse, error) {
    69→	return h.service.PreviewCheckout(ctx, req)
    70→}
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:16:48

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

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:16:50

<details><summary>🧠 思考过程</summary>

```
Now let's look at the DB schema for the tables I need.
```

</details>

<details><summary>🛠 bash</summary>

```
mysql: [Warning] Using a password on the command line interface can be insecure.
Field	Type	Null	Key	Default	Extra
id	bigint unsigned	NO	PRI	NULL	auto_increment
name	varchar(64)	NO			
code	varchar(64)	NO	UNI		
icon	varchar(512)	NO			
banner_url	varchar(512)	NO			
description	varchar(512)	NO			
sort	int	NO		0	
type	tinyint	NO		1	
status	tinyint	NO		1	
product_count	int	NO		0	
created_at	datetime	NO		CURRENT_TIMESTAMP	DEFAULT_GENERATED
updated_at	datetime	NO		CURRENT_TIMESTAMP	DEFAULT_GENERATED on update CURRENT_TIMESTAMP
Field	Type	Null	Key	Default	Extra
id	bigint unsigned	NO	PRI	NULL	auto_increment
name	varchar(64)	NO			
sort	int	NO		0	
enabled	tinyint	NO		1	
Field	Type	Null	Key	Default	Extra
id	bigint unsigned	NO	PRI	NULL	auto_increment
name	varchar(64)	NO			
icon	varchar(512)	NO			
description	varchar(512)	NO			
sort	int	NO		0	
enabled	tinyint	NO		1	
Field	Type	Null	Key	Default	Extra
id	bigint unsigned	NO	PRI	NULL	auto_increment
product_id	bigint unsigned	NO	MUL	NULL	
product_title	varchar(255)	NO			
user_id	bigint unsigned	NO		0	
user_nickname	varchar(64)	NO			
content	text	NO		NULL	
images	varchar(1024)	NO			
reply	varchar(1024)	NO			
reply_at	varchar(32)	NO			
created_at	datetime	NO		CURRENT_TIMESTAMP	DEFAULT_GENERATED
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:16:53

<details><summary>🧠 思考过程</summary>

```
Note: product_questions has no `answer`, `answered_by`, `answered_at`, `status` columns as described in the brief — actual columns: product_id, product_title, user_id, user_nickname, content, images, reply, reply_at, created_at. The proto ProductQuestion has `content`, `images`, `reply`, `reply_at`, `created_at`, `product_title`, `user_nickname`, `user_id`. So the mapping is direct.

Let me check the marketing tables.
```

</details>

<details><summary>🛠 bash</summary>

```
mysql: [Warning] Using a password on the command line interface can be insecure.
Field	Type	Null	Key	Default	Extra
id	bigint unsigned	NO	PRI	NULL	auto_increment
user_id	bigint unsigned	NO	MUL	NULL	
sign_date	date	NO		NULL	
continuous_days	int	NO		1	
points_awarded	int	NO		0	
created_at	datetime	NO		CURRENT_TIMESTAMP	DEFAULT_GENERATED
Field	Type	Null	Key	Default	Extra
id	bigint unsigned	NO	PRI	NULL	auto_increment
name	varchar(64)	NO			
description	varchar(512)	NO			
type	tinyint	NO		1	
target_count	int	NO		1	
reward_points	int	NO		0	
reward_coupon_id	bigint unsigned	NO		0	
sort	int	NO		0	
enabled	tinyint	NO		1	
icon	varchar(512)	NO			
Field	Type	Null	Key	Default	Extra
id	bigint unsigned	NO	PRI	NULL	auto_increment
user_id	bigint unsigned	NO	MUL	NULL	
task_id	bigint unsigned	NO		NULL	
progress	int	NO		0	
completed	tinyint	NO		0	
claimed	tinyint	NO		0	
completed_at	datetime	YES		NULL	
claimed_at	datetime	YES		NULL	
created_at	datetime	NO		CURRENT_TIMESTAMP	DEFAULT_GENERATED
Field	Type	Null	Key	Default	Extra
id	bigint unsigned	NO	PRI	NULL	auto_increment
name	varchar(128)	NO			
description	varchar(512)	NO			
promotion_id	bigint unsigned	NO		0	
product_id	bigint unsigned	NO		0	
product_title	varchar(255)	NO			
product_image	varchar(512)	NO			
price_cents	bigint	NO		0	
original_price_cents	bigint	NO		0	
required_members	int	NO		3	
joined_members	int	NO		0	
group_size	int	NO		20	
status	tinyint	NO	MUL	0	
start_time	datetime	NO		NULL	
end_time	datetime	NO		NULL	
banner_image	varchar(512)	NO			
created_at	datetime	NO		CURRENT_TIMESTAMP	DEFAULT_GENERATED
Field	Type	Null	Key	Default	Extra
id	bigint unsigned	NO	PRI	NULL	auto_increment
group_buy_id	bigint unsigned	NO	MUL	NULL	
user_id	bigint unsigned	NO		NULL	
user_nickname	varchar(64)	NO			
joined_at	datetime	NO		CURRENT_TIMESTAMP	DEFAULT_GENERATED
Field	Type	Null	Key	Default	Extra
id	bigint unsigned	NO	PRI	NULL	auto_increment
promotion_id	bigint unsigned	NO	MUL	NULL	
name	varchar(64)	NO			
start_time	datetime	NO		NULL	
end_time	datetime	NO		NULL	
stock	int	NO		0	
sold_count	int	NO		0	
status	tinyint	NO		0	
Field	Type	Null	Key	Default	Extra
id	bigint unsigned	NO	PRI	NULL	auto_increment
name	varchar(64)	NO			
level	int	NO	UNI	1	
min_growth	int	NO		0	
max_growth	int	NO		0	
discount_percent	int	NO		100	
icon	varchar(512)	NO			
description	varchar(512)	NO			
benefits	varchar(1024)	NO			
sort	int	NO		0	
created_at	datetime	NO		CURRENT_TIMESTAMP	DEFAULT_GENERATED
updated_at	datetime	NO		CURRENT_TIMESTAMP	DEFAULT_GENERATED on update CURRENT_TIMESTAMP
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:16:58

<details><summary>🧠 思考过程</summary>

```
Important: the actual table structures differ from the brief in several places:
- `sign_in_records`: no `reward_points` — it's `points_awarded`. No `continuous_days`? yes there is continuous_days. Columns: user_id, sign_date, continuous_days, points_awarded, created_at.
- `marketing_tasks`: has `reward_coupon_id` too.
- `user_tasks`: `completed` tinyint and `claimed` tinyint, no `status` column.
- `group_buys`: no `sku_id`, no `required_points`, no `max_groups`. Has `group_size` (max groups?), `required_members` (团人数), `joined_members`, `product_title`, `product_image`.
- `group_buy_members`: no `order_id`, no `is_leader`, no `status`. Columns: group_buy_id, user_id, user_nickname, joined_at.
- `promotion_sessions`: no `capacity`, no `description`. Has `stock`, `sold_count`, `status`, `start_time`, `end_time`, `name`.
- `user_levels`: benefits varchar, min_growth/max_growth, discount_percent.

Let me check the products table and the channels seed data and how channels relate to products. Also check products table for channel_id / sale_type.

Also need to check `users` table points column and `points_logs` in user domain model.

Let me also check the seed SQL for channels and group_buys.
```

</details>

<details><summary>🛠 bash</summary>

```
mysql: [Warning] Using a password on the command line interface can be insecure.
Field	Type	Null	Key	Default	Extra
id	bigint unsigned	NO	PRI	NULL	auto_increment
title	varchar(200)	NO	MUL	NULL	
subtitle	varchar(255)	NO			
cover	varchar(512)	NO			
category_id	bigint unsigned	NO	MUL	0	
min_price_cents	bigint	NO		0	
max_price_cents	bigint	NO		0	
sales_count	int	NO	MUL	0	
status	tinyint	NO	MUL	1	
description	mediumtext	YES		NULL	
tags	varchar(255)	NO			
created_at	datetime(3)	YES	MUL	NULL	
updated_at	datetime(3)	YES		NULL	
deleted_at	datetime(3)	YES	MUL	NULL	
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
ERROR 1146 (42S02) at line 1: Table 'shopstack.points_logs' doesn't exist
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:17:07

<details><summary>🧠 思考过程</summary>

```
points_logs doesn't exist. Let me check the user's model.go for PointsLog and check what tables exist for user points.
```

</details>

<details><summary>🛠 bash</summary>

```
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
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:17:11

<details><summary>🧠 思考过程</summary>

```
`user_points_logs` is the table. Let me look at the user domain model for PointsLog.
```

</details>

<details><summary>🛠 grep</summary>

```
handler.go:141-}
handler.go:142-
handler.go:143-// ToggleFavorite 切换收藏。
handler.go:144-func (h *UserHandler) ToggleFavorite(ctx context.Context, req *userv1.ToggleFavoriteRequest) (*userv1.ToggleFavoriteResponse, error) {
handler.go:145-	userID := currentUserID(ctx, req.GetUserId())
handler.go:146-	if userID <= 0 {
handler.go:147-		return nil, errs.Unauthorized("请先登录")
handler.go:148-	}
handler.go:149-	favorited, err := h.service.ToggleFavorite(ctx, userID, req.GetProductId())
handler.go:150-	if err != nil {
handler.go:151-		return nil, err
handler.go:152-	}
handler.go:153-	return &userv1.ToggleFavoriteResponse{Favorited: favorited}, nil
handler.go:154-}
handler.go:155-
handler.go:156:// ListPointsLogs 查询积分明细。
handler.go:157:func (h *UserHandler) ListPointsLogs(ctx context.Context, req *userv1.ListPointsLogsRequest) (*userv1.ListPointsLogsResponse, error) {
handler.go:158:	return h.service.ListPointsLogs(ctx, req.GetUserId(), req.GetPage())
handler.go:159-}
handler.go:160-
handler.go:161-// ListInvoices 查询发票申请。
handler.go:162-func (h *UserHandler) ListInvoices(ctx context.Context, req *userv1.ListInvoicesRequest) (*userv1.ListInvoicesResponse, error) {
handler.go:163-	userID := req.GetUserId()
handler.go:164-	if userID <= 0 {
handler.go:165-		userID = auth.UserIDFromContext(ctx)
handler.go:166-	}
handler.go:167-	return h.service.ListInvoices(ctx, userID, req.GetStatus(), req.GetPage())
handler.go:168-}
handler.go:169-
handler.go:170-// CreateInvoice 申请开票。
handler.go:171-func (h *UserHandler) CreateInvoice(ctx context.Context, req *userv1.CreateInvoiceRequest) (*userv1.Invoice, error) {
handler.go:172-	return h.service.CreateInvoice(ctx, req)
handler.go:173-}
--
points_service.go:2-
points_service.go:3-import (
points_service.go:4-	"context"
points_service.go:5-	"fmt"
points_service.go:6-	"strings"
points_service.go:7-
points_service.go:8-	"google.golang.org/protobuf/types/known/timestamppb"
points_service.go:9-
points_service.go:10-	commonv1 "github.com/shopstack/platform/gen/go/common/v1"
points_service.go:11-	userv1 "github.com/shopstack/platform/gen/go/user/v1"
points_service.go:12-
points_service.go:13-	"github.com/shopstack/platform/backend/internal/auth"
points_service.go:14-	"github.com/shopstack/platform/backend/internal/errs"
points_service.go:15-)
points_service.go:16-
points_service.go:17:// ListPointsLogs 查询积分明细。
points_service.go:18:func (s *Service) ListPointsLogs(ctx context.Context, userID int64, page *commonv1.PageRequest) (*userv1.ListPointsLogsResponse, error) {
points_service.go:19-	if userID <= 0 {
points_service.go:20-		userID = auth.UserIDFromContext(ctx)
points_service.go:21-	}
points_service.go:22-	if userID <= 0 {
points_service.go:23-		return nil, errs.Unauthorized("请先登录")
points_service.go:24-	}
points_service.go:25-
points_service.go:26-	pageNum, pageSize := normalizePage(page)
points_service.go:27:	logs, total, err := s.repo.ListPointsLogs(ctx, uint64(userID), pageNum, pageSize)
points_service.go:28-	if err != nil {
points_service.go:29-		return nil, errs.Wrap(errs.CodeInternalError, "查询积分明细失败", err)
points_service.go:30-	}
points_service.go:31-
points_service.go:32:	out := make([]*userv1.PointsLog, 0, len(logs))
points_service.go:33-	for i := range logs {
points_service.go:34:		out = append(out, &userv1.PointsLog{
points_service.go:35-			Id:        int64(logs[i].ID),
points_service.go:36-			UserId:    int64(logs[i].UserID),
points_service.go:37-			Title:     logs[i].Title,
points_service.go:38-			Change:    int32(logs[i].Change),
points_service.go:39-			Balance:   int32(logs[i].Balance),
points_service.go:40-			BizType:   logs[i].BizType,
points_service.go:41-			BizId:     logs[i].BizID,
points_service.go:42-			CreatedAt: timestamppb.New(logs[i].CreatedAt),
points_service.go:43-		})
points_service.go:44-	}
points_service.go:45-
points_service.go:46-	currentPoints := int32(0)
points_service.go:47-	if u, uErr := s.repo.FindUserByID(ctx, uint64(userID)); uErr == nil {
points_service.go:48-		currentPoints = int32(u.Points)
points_service.go:49-	}
points_service.go:50-
points_service.go:51:	return &userv1.ListPointsLogsResponse{
points_service.go:52-		Logs:          out,
points_service.go:53-		Meta:          buildMeta(pageNum, pageSize, total),
points_service.go:54-		CurrentPoints: currentPoints,
points_service.go:55-	}, nil
points_service.go:56-}
points_service.go:57-
points_service.go:58-// ListInvoices 查询发票申请。
points_service.go:59-func (s *Service) ListInvoices(ctx context.Context, userID int64, status int32, page *commonv1.PageRequest) (*userv1.ListInvoicesResponse, error) {
points_service.go:60-	pageNum, pageSize := normalizePage(page)
points_service.go:61-
points_service.go:62-	list, total, err := s.repo.ListInvoices(ctx, uint64(userID), int8(status), pageNum, pageSize)
points_service.go:63-	if err != nil {
points_service.go:64-		return nil, errs.Wrap(errs.CodeInternalError, "查询发票失败", err)
points_service.go:65-	}
points_service.go:66-	out := make([]*userv1.Invoice, 0, len(list))
--
points_invoice.go:1-package user
points_invoice.go:2-
points_invoice.go:3-import (
points_invoice.go:4-	"context"
points_invoice.go:5-	"errors"
points_invoice.go:6-	"time"
points_invoice.go:7-
points_invoice.go:8-	"gorm.io/gorm"
points_invoice.go:9-
points_invoice.go:10-	"github.com/shopstack/platform/backend/internal/errs"
points_invoice.go:11-)
points_invoice.go:12-
points_invoice.go:13:// PointsLog 是积分明细模型。
points_invoice.go:14:type PointsLog struct {
points_invoice.go:15-	ID        uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
points_invoice.go:16-	UserID    uint64    `gorm:"column:user_id;not null;index" json:"user_id"`
points_invoice.go:17-	Title     string    `gorm:"type:varchar(128);not null;default:''" json:"title"`
points_invoice.go:18-	Change    int       `gorm:"not null;default:0" json:"change"`
points_invoice.go:19-	Balance   int       `gorm:"not null;default:0" json:"balance"`
points_invoice.go:20-	BizType   string    `gorm:"column:biz_type;type:varchar(32);not null;default:''" json:"biz_type"`
points_invoice.go:21-	BizID     string    `gorm:"column:biz_id;type:varchar(64);not null;default:''" json:"biz_id"`
points_invoice.go:22-	CreatedAt time.Time `json:"created_at"`
points_invoice.go:23-}
points_invoice.go:24-
points_invoice.go:25-// TableName 指定表名。
points_invoice.go:26:func (PointsLog) TableName() string { return "user_points_logs" }
points_invoice.go:27-
points_invoice.go:28-// Invoice 是发票申请模型。
points_invoice.go:29-type Invoice struct {
points_invoice.go:30-	ID          uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
points_invoice.go:31-	UserID      uint64    `gorm:"column:user_id;not null;index" json:"user_id"`
points_invoice.go:32-	OrderNo     string    `gorm:"column:order_no;type:varchar(32);not null;default:''" json:"order_no"`
points_invoice.go:33-	Title       string    `gorm:"type:varchar(128);not null;default:''" json:"title"`
points_invoice.go:34-	TaxNo       string    `gorm:"column:tax_no;type:varchar(64);not null;default:''" json:"tax_no"`
points_invoice.go:35-	Type        string    `gorm:"type:varchar(16);not null;default:'personal'" json:"type"`
points_invoice.go:36-	Email       string    `gorm:"type:varchar(128);not null;default:''" json:"email"`
points_invoice.go:37-	AmountCents int64     `gorm:"column:amount_cents;not null;default:0" json:"amount_cents"`
points_invoice.go:38-	Status      int8      `gorm:"not null;default:0;index" json:"status"`
points_invoice.go:39-	InvoiceURL  string    `gorm:"column:invoice_url;type:varchar(512);not null;default:''" json:"invoice_url"`
points_invoice.go:40-	Remark      string    `gorm:"type:varchar(512);not null;default:''" json:"remark"`
points_invoice.go:41-	CreatedAt   time.Time `json:"created_at"`
--
points_invoice.go:44-
points_invoice.go:45-// TableName 指定表名。
points_invoice.go:46-func (Invoice) TableName() string { return "user_invoices" }
points_invoice.go:47-
points_invoice.go:48-// 发票状态
points_invoice.go:49-const (
points_invoice.go:50-	InvoicePending  = 0
points_invoice.go:51-	InvoiceIssued   = 1
points_invoice.go:52-	InvoiceRejected = 2
points_invoice.go:53-)
points_invoice.go:54-
points_invoice.go:55-// ---------------------------------------------------------------------------
points_invoice.go:56-// 积分明细
points_invoice.go:57-// ---------------------------------------------------------------------------
points_invoice.go:58-
points_invoice.go:59:// ListPointsLogs 分页查询积分明细。
points_invoice.go:60:func (r *Repo) ListPointsLogs(ctx context.Context, userID uint64, page, pageSize int) ([]PointsLog, int64, error) {
points_invoice.go:61:	q := r.db.WithContext(ctx).Model(&PointsLog{}).Where("user_id = ?", userID)
points_invoice.go:62-
points_invoice.go:63-	var total int64
points_invoice.go:64-	if err := q.Count(&total).Error; err != nil {
points_invoice.go:65-		return nil, 0, err
points_invoice.go:66-	}
points_invoice.go:67:	var list []PointsLog
points_invoice.go:68-	err := q.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
points_invoice.go:69-	return list, total, err
points_invoice.go:70-}
points_invoice.go:71-
points_invoice.go:72:// AddPointsLog 记录一笔积分变动，并同步更新用户积分余额。
points_invoice.go:73:func (r *Repo) AddPointsLog(ctx context.Context, log *PointsLog) error {
points_invoice.go:74-	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
points_invoice.go:75-		if err := tx.Create(log).Error; err != nil {
points_invoice.go:76-			return err
points_invoice.go:77-		}
points_invoice.go:78-		return tx.Model(&User{}).Where("id = ?", log.UserID).
points_invoice.go:79-			Update("points", gorm.Expr("GREATEST(points + ?, 0)", log.Change)).Error
points_invoice.go:80-	})
points_invoice.go:81-}
points_invoice.go:82-
points_invoice.go:83-// ---------------------------------------------------------------------------
points_invoice.go:84-// 发票
points_invoice.go:85-// ---------------------------------------------------------------------------
points_invoice.go:86-
points_invoice.go:87-// ListInvoices 分页查询发票申请。
points_invoice.go:88-func (r *Repo) ListInvoices(ctx context.Context, userID uint64, status int8, page, pageSize int) ([]Invoice, int64, error) {
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:17:16

<details><summary>🧠 思考过程</summary>

```
Good. Now I have the PointsLog model pattern. I'll implement a local equivalent in the marketing package (can't import user package? Let me check if importing `backend/internal/user` from marketing is allowed — it would be a cross-domain dependency but not a file modification. The instruction says I can only modify files in my dirs. Importing the user package is allowed technically but creates coupling. The marketing package already reads `logistic_templates` from the logistics domain with its own local model. So I'll define a local `UserPointsLog` model in marketing with table `user_points_logs`. That's the established pattern (LogisticTemplate).

But `users` table — marketing needs to update points. I'll define a local `UserPointsAccount` model with table `users` and only id/points fields. Using gorm `Model(&UserPointsAccount{})` with Updates on `points` — careful with `Save` overwriting other fields. I'll use `Update("points", gorm.Expr(...))` which only updates that column. Good.

Wait — gorm `Update` on a model with a `TableName` of "users" and primary key ID: `r.db.Model(&UserPointsAccount{}).Where("id = ?", userID).Update("points", ...)`. That generates `UPDATE users SET points=... WHERE id = ?`. Good, no deleted_at soft-delete condition since model has no DeletedAt field. Fine.

Let me check the user model to confirm `users` has `deleted_at` — yes. Using `Model(&UserPointsAccount{})` without DeletedAt won't add `deleted_at IS NULL` condition. That's acceptable but slightly different. Actually for correctness let me add `DeletedAt gorm.DeletedAt` to my local model so deleted users are excluded. But then `Update` with gorm soft delete adds `deleted_at IS NULL`. That's better.

Hmm, but careful: `gorm.DeletedAt` in Model with Update — GORM adds soft delete condition on query. Yes.

Now let me check the seed data for marketing tables and the products' channel relationship. Also need to check `user_growth_logs` maybe not needed.

Let's look at the seed file for extend.
```

</details>

<details><summary>🛠 bash</summary>

```
-- ===========================================================================
-- ShopStack 电商中台 —— 扩展表结构（扩量到每端 80~100 页所需）
-- ---------------------------------------------------------------------------
-- 本文件由 scripts/extend-proto.py 配套新增，用于支撑新增的 85 个接口。
-- 表名前缀即服务归属，与 01-schema.sql 保持一致。
-- ===========================================================================

USE `shopstack`;

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------------
-- 用户服务
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `user_levels` (
  `id`                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`              VARCHAR(64)  NOT NULL DEFAULT '' COMMENT '等级名称',
  `level`             INT NOT NULL DEFAULT 1 COMMENT '等级序号',
  `min_growth`        INT NOT NULL DEFAULT 0 COMMENT '达到该等级所需成长值',
  `max_growth`        INT NOT NULL DEFAULT 0 COMMENT '该等级成长值上限',
  `discount_percent`  INT NOT NULL DEFAULT 100 COMMENT '会员折扣百分比',
  `icon`              VARCHAR(512) NOT NULL DEFAULT '' COMMENT '等级图标',
  `description`       VARCHAR(512) NOT NULL DEFAULT '' COMMENT '等级说明',
  `benefits`          VARCHAR(1024) NOT NULL DEFAULT '' COMMENT '权益列表，JSON 数组',
  `sort`              INT NOT NULL DEFAULT 0,
  `created_at`        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_level` (`level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='会员等级';

CREATE TABLE IF NOT EXISTS `user_growth_logs` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`     BIGINT UNSIGNED NOT NULL,
  `change`      INT NOT NULL DEFAULT 0 COMMENT '成长值变动，正增负减',
  `balance`     INT NOT NULL DEFAULT 0 COMMENT '变动后成长值',
  `title`       VARCHAR(128) NOT NULL DEFAULT '' COMMENT '变动说明',
  `biz_type`    VARCHAR(32)  NOT NULL DEFAULT '' COMMENT '业务类型',
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户成长值流水';

CREATE TABLE IF NOT EXISTS `regions` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id`  BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `name`       VARCHAR(64)  NOT NULL DEFAULT '',
  `code`       VARCHAR(32)  NOT NULL DEFAULT '',
  `level`      TINYINT NOT NULL DEFAULT 1 COMMENT '1省 2市 3区',
  `sort`       INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_parent` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='行政区域';

CREATE TABLE IF NOT EXISTS `user_invoice_templates` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`       BIGINT UNSIGNED NOT NULL,
  `title`         VARCHAR(128) NOT NULL DEFAULT '' COMMENT '发票抬头',
  `tax_no`        VARCHAR(64)  NOT NULL DEFAULT '' COMMENT '纳税人识别号',
  `type`          VARCHAR(16)  NOT NULL DEFAULT 'personal' COMMENT 'personal | company',
  `email`         VARCHAR(128) NOT NULL DEFAULT '',
  `phone`         VARCHAR(32)  NOT NULL DEFAULT '',
  `address`       VARCHAR(255) NOT NULL DEFAULT '',
  `bank_name`     VARCHAR(128) NOT NULL DEFAULT '',
  `bank_account`  VARCHAR(64)  NOT NULL DEFAULT '',
  `is_default`    TINYINT NOT NULL DEFAULT 0,
  `created_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户发票抬头模板';

CREATE TABLE IF NOT EXISTS `user_notification_settings` (
  `user_id`          BIGINT UNSIGNED NOT NULL,
  `order_notice`     TINYINT NOT NULL DEFAULT 1,
  `logistics_notice` TINYINT NOT NULL DEFAULT 1,
  `marketing_notice` TINYINT NOT NULL DEFAULT 0,
  `system_notice`    TINYINT NOT NULL DEFAULT 1,
  `sms_notice`       TINYINT NOT NULL DEFAULT 1,
  `email_notice`     TINYINT NOT NULL DEFAULT 0,
  `wechat_notice`    TINYINT NOT NULL DEFAULT 0,
  `updated_at`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户通知订阅偏好';

CREATE TABLE IF NOT EXISTS `user_feedbacks` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`       BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `user_nickname` VARCHAR(64)  NOT NULL DEFAULT '',
  `type`          TINYINT NOT NULL DEFAULT 4 COMMENT '1功能建议 2使用问题 3投诉 4其他',
  `content`       TEXT NOT NULL,
  `images`        VARCHAR(1024) NOT NULL DEFAULT '' COMMENT '图片地址，JSON 数组',
  `contact`       VARCHAR(64)  NOT NULL DEFAULT '',
  `status`        TINYINT NOT NULL DEFAULT 0 COMMENT '0待处理 1处理中 2已处理 3已关闭',
  `reply`         VARCHAR(1024) NOT NULL DEFAULT '',
  `created_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `processed_at`  DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户意见反馈';

CREATE TABLE IF NOT EXISTS `help_articles` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `category_id`   BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `category_name` VARCHAR(64)  NOT NULL DEFAULT '',
  `title`         VARCHAR(128) NOT NULL DEFAULT '',
  `content`       TEXT NOT NULL,
  `sort`          INT NOT NULL DEFAULT 0,
  `enabled`       TINYINT NOT NULL DEFAULT 1,
  `view_count`    INT NOT NULL DEFAULT 0,
  `created_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_category` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='帮助中心文章';

-- ---------------------------------------------------------------------------
-- 商品服务
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `channels` (
  `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`           VARCHAR(64)  NOT NULL DEFAULT '',
  `code`           VARCHAR(64)  NOT NULL DEFAULT '',
  `icon`           VARCHAR(512) NOT NULL DEFAULT '',
  `banner_url`     VARCHAR(512) NOT NULL DEFAULT '',
  `description`    VARCHAR(512) NOT NULL DEFAULT '',
  `sort`           INT NOT NULL DEFAULT 0,
  `type`           TINYINT NOT NULL DEFAULT 1 COMMENT '1推荐 2新品 3热销 4限时 5预售 6清仓 7包邮 8跨境 9楼层',
  `status`         TINYINT NOT NULL DEFAULT 1,
  `product_count`  INT NOT NULL DEFAULT 0,
  `created_at`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='首页频道与楼层';

CREATE TABLE IF NOT EXISTS `review_tags` (
  `id`       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`     VARCHAR(64) NOT NULL DEFAULT '',
  `sort`     INT NOT NULL DEFAULT 0,
  `enabled`  TINYINT NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='评价标签';

CREATE TABLE IF NOT EXISTS `guarantees` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(64)  NOT NULL DEFAULT '',
  `icon`        VARCHAR(512) NOT NULL DEFAULT '',
  `description` VARCHAR(512) NOT NULL DEFAULT '',
  `sort`        INT NOT NULL DEFAULT 0,
  `enabled`     TINYINT NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品保障项';

CREATE TABLE IF NOT EXISTS `product_questions` (
  `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id`     BIGINT UNSIGNED NOT NULL,
  `product_title`  VARCHAR(255) NOT NULL DEFAULT '',
  `user_id`        BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `user_nickname`  VARCHAR(64)  NOT NULL DEFAULT '',
  `content`        TEXT NOT NULL,
  `images`         VARCHAR(1024) NOT NULL DEFAULT '' COMMENT 'JSON 数组',
  `reply`          VARCHAR(1024) NOT NULL DEFAULT '',
  `reply_at`       VARCHAR(32)  NOT NULL DEFAULT '',
  `created_at`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_product` (`product_id`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品问答';

-- ---------------------------------------------------------------------------
-- 营销服务
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `sign_in_records` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`         BIGINT UNSIGNED NOT NULL,
  `sign_date`       DATE NOT NULL,
  `continuous_days` INT NOT NULL DEFAULT 1 COMMENT '连续签到天数',
  `points_awarded`  INT NOT NULL DEFAULT 0,
  `created_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_date` (`user_id`, `sign_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户签到记录';

CREATE TABLE IF NOT EXISTS `marketing_tasks` (
  `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`             VARCHAR(64)  NOT NULL DEFAULT '',
  `description`      VARCHAR(512) NOT NULL DEFAULT '',
  `type`             TINYINT NOT NULL DEFAULT 1 COMMENT '1浏览 2下单 3分享 4评价 5签到 6邀请',
  `target_count`     INT NOT NULL DEFAULT 1,
  `reward_points`    INT NOT NULL DEFAULT 0,
  `reward_coupon_id` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `sort`             INT NOT NULL DEFAULT 0,
  `enabled`          TINYINT NOT NULL DEFAULT 1,
  `icon`             VARCHAR(512) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='营销任务定义';

CREATE TABLE IF NOT EXISTS `user_tasks` (
  `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:17:28

<details><summary>🛠 bash</summary>

```
`id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`          BIGINT UNSIGNED NOT NULL,
  `task_id`          BIGINT UNSIGNED NOT NULL,
  `progress`         INT NOT NULL DEFAULT 0,
  `completed`        TINYINT NOT NULL DEFAULT 0,
  `claimed`          TINYINT NOT NULL DEFAULT 0,
  `completed_at`     DATETIME NULL DEFAULT NULL,
  `claimed_at`       DATETIME NULL DEFAULT NULL,
  `created_at`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_task` (`user_id`, `task_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户任务进度';

CREATE TABLE IF NOT EXISTS `group_buys` (
  `id`                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`                  VARCHAR(128) NOT NULL DEFAULT '',
  `description`           VARCHAR(512) NOT NULL DEFAULT '',
  `promotion_id`          BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `product_id`            BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `product_title`         VARCHAR(255) NOT NULL DEFAULT '',
  `product_image`         VARCHAR(512) NOT NULL DEFAULT '',
  `price_cents`           BIGINT NOT NULL DEFAULT 0,
  `original_price_cents`  BIGINT NOT NULL DEFAULT 0,
  `required_members`      INT NOT NULL DEFAULT 3 COMMENT '成团所需人数',
  `joined_members`        INT NOT NULL DEFAULT 0,
  `group_size`            INT NOT NULL DEFAULT 20 COMMENT '团总人数上限',
  `status`                TINYINT NOT NULL DEFAULT 0 COMMENT '0未开始 1进行中 2已结束 3已下线',
  `start_time`            DATETIME NOT NULL,
  `end_time`              DATETIME NOT NULL,
  `banner_image`          VARCHAR(512) NOT NULL DEFAULT '',
  `created_at`            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_status_time` (`status`, `start_time`, `end_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='拼团活动';

CREATE TABLE IF NOT EXISTS `group_buy_members` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `group_buy_id`  BIGINT UNSIGNED NOT NULL,
  `user_id`       BIGINT UNSIGNED NOT NULL,
  `user_nickname` VARCHAR(64)  NOT NULL DEFAULT '',
  `joined_at`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_group` (`group_buy_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='拼团成员';

CREATE TABLE IF NOT EXISTS `promotion_sessions` (
  `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `promotion_id` BIGINT UNSIGNED NOT NULL,
  `name`         VARCHAR(64) NOT NULL DEFAULT '',
  `start_time`   DATETIME NOT NULL,
  `end_time`     DATETIME NOT NULL,
  `stock`        INT NOT NULL DEFAULT 0,
  `sold_count`   INT NOT NULL DEFAULT 0,
  `status`       TINYINT NOT NULL DEFAULT 0 COMMENT '0未开始 1进行中 2已结束',
  PRIMARY KEY (`id`),
  KEY `idx_promotion` (`promotion_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='活动场次（秒杀场等）';

-- ---------------------------------------------------------------------------
-- 订单服务
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `after_sales` (
  `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `after_sale_no`  VARCHAR(64)  NOT NULL DEFAULT '',
  `order_id`       BIGINT UNSIGNED NOT NULL,
  `order_no`       VARCHAR(64)  NOT NULL DEFAULT '',
  `user_id`        BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `user_nickname`  VARCHAR(64)  NOT NULL DEFAULT '',
  `type`           TINYINT NOT NULL DEFAULT 1 COMMENT '1仅退款 2退货退款 3换货',
  `amount_cents`   BIGINT NOT NULL DEFAULT 0,
  `reason`         VARCHAR(128) NOT NULL DEFAULT '',
  `description`    VARCHAR(512) NOT NULL DEFAULT '',
  `item_ids`       VARCHAR(512) NOT NULL DEFAULT '' COMMENT '退款商品项，JSON 数组',
  `status`         TINYINT NOT NULL DEFAULT 0 COMMENT '0待审核 1审核通过 2审核驳回 3已退款 4已完成',
  `admin_remark`   VARCHAR(512) NOT NULL DEFAULT '',
  `refund_id`      BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `created_at`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `processed_at`   DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_no` (`after_sale_no`),
  KEY `idx_status` (`status`, `id`),
  KEY `idx_user` (`user_id`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='售后工单';

CREATE TABLE IF NOT EXISTS `refund_reasons` (
  `id`       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`     VARCHAR(64) NOT NULL DEFAULT '',
  `type`     TINYINT NOT NULL DEFAULT 1 COMMENT '1仅退款 2退货退款 3换货',
  `sort`     INT NOT NULL DEFAULT 0,
  `enabled`  TINYINT NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='退款原因';

-- ---------------------------------------------------------------------------
-- 物流服务
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `logistics_companies` (
  `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`         VARCHAR(64)  NOT NULL DEFAULT '',
  `code`         VARCHAR(32)  NOT NULL DEFAULT '',
  `logo`         VARCHAR(512) NOT NULL DEFAULT '',
  `phone`        VARCHAR(32)  NOT NULL DEFAULT '',
  `enabled`      TINYINT NOT NULL DEFAULT 1,
  `sort`         INT NOT NULL DEFAULT 0,
  `supports_cod` TINYINT NOT NULL DEFAULT 0 COMMENT '是否支持货到付款',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='快递公司';

CREATE TABLE IF NOT EXISTS `delivery_ranges` (
  `id`                       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `template_id`              BIGINT UNSIGNED NOT NULL,
  `regions`                  VARCHAR(512) NOT NULL DEFAULT '' COMMENT '适用地区，逗号分隔',
  `freight_cents`            BIGINT NOT NULL DEFAULT 0,
  `free_freight_amount_cents` BIGINT NOT NULL DEFAULT 0,
  `enabled`                  TINYINT NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_template` (`template_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='运费模板配送范围';

-- ---------------------------------------------------------------------------
-- 库存服务
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `warehouses` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code`       VARCHAR(32)  NOT NULL DEFAULT '',
  `name`       VARCHAR(64)  NOT NULL DEFAULT '',
  `address`    VARCHAR(255) NOT NULL DEFAULT '',
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:17:31

<details><summary>🧠 思考过程</summary>

```
Now the seed data for channels, group_buys, marketing_tasks, promotion_sessions, user_levels.
```

</details>

<details><summary>🛠 bash</summary>

```
mysql: [Warning] Using a password on the command line interface can be insecure.
id	name	code	type	status	product_count
1	??	recommend	1	1	12
2	??	newest	2	1	6
3	??	hot	3	1	8
4	??	flash	4	1	5
5	??	presale	5	1	4
6	??	clearance	6	1	3
7	??	freeship	7	1	9
8	??	cross	8	1	2
9	??	fresh	9	1	5
id	name	description	type	target_count	reward_points	reward_coupon_id	sort	enabled	icon
1	????	???????????	5	1	10	0	1	1	calendar
2	????	???? 5 ???	1	5	20	0	2	1	eye
3	????	?? 1 ???	2	1	50	0	3	1	shopping-bag
4	????	???????	3	1	30	0	4	1	share
5	????	?? 1 ?????	4	1	50	0	5	1	star
6	?????	????????	6	1	200	0	6	1	user-plus
id	promotion_id	name	product_id	product_title	price_cents	required_members	joined_members	group_size	status	start_time	end_time
1	4	????????	9	?????? 30 ??	5900	3	2	20	1	2026-10-13 06:03:19	2026-11-12 06:03:19
2	4	???????	7	????? 2kg ?	8900	5	4	30	1	2026-10-17 06:03:19	2026-10-31 06:03:19
id	promotion_id	name	start_time	end_time	stock	sold_count	status
1	3	?? 10 ??	2026-10-20 10:00:00	2026-10-20 12:00:00	500	218	1
2	3	?? 14 ??	2026-10-20 14:00:00	2026-10-20 16:00:00	500	96	0
3	3	?? 20 ??	2026-10-20 20:00:00	2026-10-20 22:00:00	500	312	0
id	name	level	min_growth	max_growth	discount_percent	benefits
1	????	1	0	999	100	["?????","?????"]
2	????	2	1000	4999	99	["9.9?","???","????"]
3	????	3	5000	19999	95	["9.5?","????","????"]
4	????	4	20000	49999	90	["9?","????","??????"]
5	????	5	50000	9999999	85	["8.5?","??????","?????"]
COUNT(*)
12
id	title	tags	status
1	?????? Pro 256GB	??,5G,??	2
2	??????? 14 ??	???,??	2
3	?????? GT4	????,??	2
4	???? 32cm	??,??	2
5	????? 1.8m	??,??	2
6	????????	??,???	2
7	????? 2kg ?	??,??	2
8	????????	??,??	2
9	?????? Air	??,??	2
10	??????? 27 ??	???,??	2
11	?????? Mini	??,??	2
12	????? 500ml	??,??	2
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:17:40

<details><summary>🧠 思考过程</summary>

```
Terminal output shows `?` for Chinese characters. Let me get the product tags with a hex or use `--default-character-set=utf8mb4`. Anyway, the important thing: channels have `type` 1-9 and `code`. Products have `tags` varchar comma-separated.

Now for the channel→product association: channels table has no product relation. products table has no channel_id. The `ListProductsRequest` in the base proto has `channel_id` and `sale_type` fields (already existing) — but the existing product service doesn't handle them. Hmm, the existing `ListProducts` ignores channel_id and sale_type. That's the other worker's scope maybe... Actually ListProducts is existing code, not in my list.

For ListChannelProducts I need a strategy. Options:
- type 1 推荐 → all on-shelf products ordered by sales
- type 2 新品 → newest
- type 3 热销 → sales desc
- type 4 限时 → limited-time: tag match
- type 5 预售 → presale: tag match
- type 6 清仓 → clearance: tag match
- type 7 包邮 → freeship: tag match
- type 8 跨境 → cross-border: tag match
- type 9 楼层 → floor: category-based?

Better approach: use tags matching the channel code semantics. Let me check the products' actual tags in utf8.

Let me re-query with proper charset.
```

</details>

<details><summary>🛠 bash</summary>

```
mysql: [Warning] Using a password on the command line interface can be insecure.
id	title	tags	category_id	status	sales_count	min_price_cents	max_price_cents
1	旗舰智能手机 Pro 256GB	旗舰,5G,拍照	6	2	1863	429900	529900
2	轻薄商务笔记本 14 英寸	笔记本,办公	7	2	942	599900	699900
3	智能运动手表 GT4	智能手表,运动	8	2	3120	89900	109900
4	不粘炒锅 32cm	厨房,爆款	9	2	5821	12900	19900
5	全棉四件套 1.8m	家纺,舒适	10	2	2360	29900	39900
6	纯棉商务休闲衬衫	男装,基础款	3	2	1450	19900	29900
7	进口车厘子 2kg 装	生鲜,包邮	4	2	8740	8900	12900
8	职场效率管理指南	图书,职场	5	2	2205	5900	7900
9	降噪蓝牙耳机 Air	耳机,降噪	6	2	4310	69900	89900
10	桌面双屏显示器 27 英寸	显示器,办公	7	2	680	129900	159900
11	便携蓝牙音箱 Mini	音箱,户外	6	2	3980	24900	34900
12	高端保温杯 500ml	水杯,礼品	2	2	6210	15900	21900
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:17:48

<details><summary>🧠 思考过程</summary>

````
Products' tags include "包邮" (product 7), "爆款" (product 4). Channels: 推荐(recommend), 新品(newest), 热销(hot), 限时(flash), 预售(presale), 清除(clearance), 包邮(freeship), 跨境(cross), 生鲜(fresh).

So channel names in Chinese are 推荐/新品/热销/限时/预售/清仓/包邮/跨境/生鲜 (per the task description). The `name` column has Chinese (shown as ??). Let me get the actual names.

Strategy: map channel to products by matching channel code/name against product tags, and fall back to type-based rules:
- type 1 推荐: all on-shelf products (sorted by sales desc default)
- type 2 新品: newest products
- type 3 热销: sales desc top N
- type 4 限时: tag "限时"
- type 5 预售: tag "预售"
- type 6 清仓: tag "清仓"
- type 7 包邮: tag "包邮"
- type 8 跨境: tag "跨境"
- type 9 楼层: all products of that channel's floor → maybe category-based; treat as all products.

Also we can use the channel `code` mapped to tag names. I'll define a mapping from channel type → tag keyword, plus fallback: also match by channel name itself as a tag (e.g. "包邮" is both a channel name and product tag; "生鲜" channel name matches product 7 tag 生鲜).

So strategy: for a channel, derive candidate tag keywords = [channel.Name] plus type-specific keyword. Query products where tags LIKE %keyword% ... Actually use FIND_IN_SET for exact tag match, and also allow substring match on channel name.

Let me be concrete:
- channelTagKeywords(channel) returns list:
  - type 1 推荐 → no keyword (all products)
  - type 2 新品 → no keyword (all, sorted by newest)
  - type 3 热销 → no keyword (all, sorted by sales)
  - type 4 限时 → ["限时"]
  - type 5 预售 → ["预售"]
  - type 6 清仓 → ["清仓"]
  - type 7 包邮 → ["包邮"]
  - type 8 跨境 → ["跨境"]
  - type 9 楼层 → no keyword

Plus always include the channel's own name if it's a plausible tag... but "推荐"/"新品"/"热销"/"清仓" as names would then restrict. Hmm. For type 7 包邮, name = "包邮" matches. For type 9 生鲜, name="生鲜" matches product 7's tag "生鲜".

I think the cleanest: keyword set = type-specific tag keyword (from a fixed code→tag map) UNION channel.Name (if not one of 推荐/新品/热销/清仓 which are generic). Hmm, but 清仓 type 6 → tag "清仓" and name "清仓" — both give same.

Let me simplify with a per-type tag map:
```
channelTypeTags = map[int][]string{
  1: {},                       // 推荐：全量
  2: {},                       // 新品：全量（按时间排序）
  3: {},                       // 热销：全量（按销量排序）
  4: {"限时"},
  5: {"预售"},
  6: {"清仓"},
  7: {"包邮"},
  8: {"跨境"},
  9: {},                       // 楼层：全量
}
```
And additionally, if the channel has a custom name that equals a tag present on products, include it. To be more flexible and data-driven: use the channel `code` to look up a tag. E.g. code "freeship" → tag 包邮. I'll use a code→tag map plus name fallback:

```
var channelCodeTags = map[string]string{
  "flash": "限时", "presale": "预售", "clearance": "清仓",
  "freeship": "包邮", "cross": "跨境", "fresh": "生鲜",
}
```
And for type 9 生鲜 (fresh) → tag "生鲜". Good, matches product 7.

Then the product filter: if tags present → `tags LIKE %tag%` (using FIND_IN_SET is stricter but the tag might be part of a multiword; FIND_IN_SET requires exact element). I'll use LIKE with %tag% for robustness. Actually FIND_IN_SET is used elsewhere in the codebase. But channel names like "生鲜" is exactly a tag element for product 7 → FIND_IN_SET works. For "包邮" also exact. I'll use FIND_IN_SET for exactness plus fallback LIKE? Simpler: use `FIND_IN_SET(?, tags)` — consistent with the existing repo style. Since seeds have exact tags, this works.

Hmm but risk: if channel name is "推荐" and no tag map, we return all. Fine.

Also I should handle "no matching products" gracefully — return empty list with meta.

Additionally, maybe the channel `code` should be honored. The task says "按频道 code 取商品". Since there's no direct relation, my strategy with tags is reasonable. I'll document.

Now let me check the `ListProducts` proto request has channel_id — existing service ignores. Not my scope.

Now, let me check the gen/go package for the new proto messages to know exact Go field names.
````

</details>

<details><summary>🛠 bash</summary>

```
gen/go/marketing/v1:
marketing.pb.go
marketing.pb.gw.go
marketing_grpc.pb.go

gen/go/product/v1:
product.pb.go
product.pb.gw.go
product_grpc.pb.go
2695:type Channel struct {
2696-	state         protoimpl.MessageState `protogen:"open.v1"`
2697-	Id            int64                  `protobuf:"varint,1,opt,name=id,proto3" json:"id,omitempty"`
2698-	Name          string                 `protobuf:"bytes,2,opt,name=name,proto3" json:"name,omitempty"`
2699-	Code          string                 `protobuf:"bytes,3,opt,name=code,proto3" json:"code,omitempty"`
2700-	Icon          string                 `protobuf:"bytes,4,opt,name=icon,proto3" json:"icon,omitempty"`
2701-	BannerUrl     string                 `protobuf:"bytes,5,opt,name=banner_url,json=bannerUrl,proto3" json:"banner_url,omitempty"`
2702-	Description   string                 `protobuf:"bytes,6,opt,name=description,proto3" json:"description,omitempty"`
2703-	Sort          int32                  `protobuf:"varint,7,opt,name=sort,proto3" json:"sort,omitempty"`
2704-	Type          int32                  `protobuf:"varint,8,opt,name=type,proto3" json:"type,omitempty"`     // 1 推荐 2 新品 3 热销 4 限时 5 预售 6 清仓 7 包邮 8 跨境 9 楼层
2705-	Status        int32                  `protobuf:"varint,9,opt,name=status,proto3" json:"status,omitempty"` // 0 停用 1 启用
2706-	ProductCount  int32                  `protobuf:"varint,10,opt,name=product_count,json=productCount,proto3" json:"product_count,omitempty"`
2707-	CreatedAt     *timestamppb.Timestamp `protobuf:"bytes,11,opt,name=created_at,json=createdAt,proto3" json:"created_at,omitempty"`
2708-	unknownFields protoimpl.UnknownFields
2709-	sizeCache     protoimpl.SizeCache
2710-}
2711-
2712-func (x *Channel) Reset() {
2713-	*x = Channel{}
2714-	mi := &file_shopstack_product_v1_product_proto_msgTypes[33]
2715-	ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:18:12

<details><summary>🧠 思考过程</summary>

```
Generated code is present. Let me check the grpc service interfaces for the new methods (to know exact method signatures on the server interface).
```

</details>

<details><summary>🛠 bash</summary>

```
36:	ProductService_ListChannels_FullMethodName        = "/shopstack.product.v1.ProductService/ListChannels"
37:	ProductService_GetChannel_FullMethodName          = "/shopstack.product.v1.ProductService/GetChannel"
38:	ProductService_ListChannelProducts_FullMethodName = "/shopstack.product.v1.ProductService/ListChannelProducts"
39:	ProductService_SaveChannel_FullMethodName         = "/shopstack.product.v1.ProductService/SaveChannel"
40:	ProductService_DeleteChannel_FullMethodName       = "/shopstack.product.v1.ProductService/DeleteChannel"
41:	ProductService_ListReviewTags_FullMethodName      = "/shopstack.product.v1.ProductService/ListReviewTags"
42:	ProductService_SaveReviewTag_FullMethodName       = "/shopstack.product.v1.ProductService/SaveReviewTag"
43:	ProductService_DeleteReviewTag_FullMethodName     = "/shopstack.product.v1.ProductService/DeleteReviewTag"
44:	ProductService_ListGuarantees_FullMethodName      = "/shopstack.product.v1.ProductService/ListGuarantees"
45:	ProductService_SaveGuarantee_FullMethodName       = "/shopstack.product.v1.ProductService/SaveGuarantee"
46:	ProductService_DeleteGuarantee_FullMethodName     = "/shopstack.product.v1.ProductService/DeleteGuarantee"
47:	ProductService_ListProductParams_FullMethodName   = "/shopstack.product.v1.ProductService/ListProductParams"
67:	ListChannels(ctx context.Context, in *ListChannelsRequest, opts ...grpc.CallOption) (*ListChannelsResponse, error)
68:	GetChannel(ctx context.Context, in *GetChannelRequest, opts ...grpc.CallOption) (*Channel, error)
69:	ListChannelProducts(ctx context.Context, in *ListChannelProductsRequest, opts ...grpc.CallOption) (*ListChannelProductsResponse, error)
70:	SaveChannel(ctx context.Context, in *SaveChannelRequest, opts ...grpc.CallOption) (*Channel, error)
71:	DeleteChannel(ctx context.Context, in *DeleteChannelRequest, opts ...grpc.CallOption) (*v1.OperationResult, error)
72:	ListReviewTags(ctx context.Context, in *ListReviewTagsRequest, opts ...grpc.CallOption) (*ListReviewTagsResponse, error)
73:	SaveReviewTag(ctx context.Context, in *SaveReviewTagRequest, opts ...grpc.CallOption) (*ReviewTag, error)
74:	DeleteReviewTag(ctx context.Context, in *DeleteReviewTagRequest, opts ...grpc.CallOption) (*v1.OperationResult, error)
75:	ListGuarantees(ctx context.Context, in *ListGuaranteesRequest, opts ...grpc.CallOption) (*ListGuaranteesResponse, error)
76:	SaveGuarantee(ctx context.Context, in *SaveGuaranteeRequest, opts ...grpc.CallOption) (*Guarantee, error)
77:	DeleteGuarantee(ctx context.Context, in *DeleteGuaranteeRequest, opts ...grpc.CallOption) (*v1.OperationResult, error)
78:	ListProductParams(ctx context.Context, in *ListProductParamsRequest, opts ...grpc.CallOption) (*ListProductParamsResponse, error)
219:func (c *productServiceClient) ListChannels(ctx context.Context, in *ListChannelsRequest, opts ...grpc.CallOption) (*ListChannelsResponse, error) {
221:	out := new(ListChannelsResponse)
222:	err := c.cc.Invoke(ctx, ProductService_ListChannels_FullMethodName, in, out, cOpts...)
229:func (c *productServiceClient) GetChannel(ctx context.Context, in *GetChannelRequest, opts ...grpc.CallOption) (*Channel, error) {
232:	err := c.cc.Invoke(ctx, ProductService_GetChannel_FullMethodName, in, out, cOpts...)
239:func (c *productServiceClient) ListChannelProducts(ctx context.Context, in *ListChannelProductsRequest, opts ...grpc.CallOption) (*ListChannelProductsResponse, error) {
241:	out := new(ListChannelProductsResponse)
242:	err := c.cc.Invoke(ctx, ProductService_ListChannelProducts_FullMethodName, in, out, cOpts...)
249:func (c *productServiceClient) SaveChannel(ctx context.Context, in *SaveChannelRequest, opts ...grpc.CallOption) (*Channel, error) {
252:	err := c.cc.Invoke(ctx, ProductService_SaveChannel_FullMethodName, in, out, cOpts...)
259:func (c *productServiceClient) DeleteChannel(ctx context.Context, in *DeleteChannelRequest, opts ...grpc.CallOption) (*v1.OperationResult, error) {
262:	err := c.cc.Invoke(ctx, ProductService_DeleteChannel_FullMethodName, in, out, cOpts...)
269:func (c *productServiceClient) ListReviewTags(ctx context.Context, in *ListReviewTagsRequest, opts ...grpc.CallOption) (*ListReviewTagsResponse, error) {
271:	out := new(ListReviewTagsResponse)
272:	err := c.cc.Invoke(ctx, ProductService_ListReviewTags_FullMethodName, in, out, cOpts...)
279:func (c *productServiceClient) SaveReviewTag(ctx context.Context, in *SaveReviewTagRequest, opts ...grpc.CallOption) (*ReviewTag, error) {
282:	err := c.cc.Invoke(ctx, ProductService_SaveReviewTag_FullMethodName, in, out, cOpts...)
289:func (c *productServiceClient) DeleteReviewTag(ctx context.Context, in *DeleteReviewTagRequest, opts ...grpc.CallOption) (*v1.OperationResult, error) {
292:	err := c.cc.Invoke(ctx, ProductService_DeleteReviewTag_FullMethodName, in, out, cOpts...)
299:func (c *productServiceClient) ListGuarantees(ctx context.Context, in *ListGuaranteesRequest, opts ...grpc.CallOption) (*ListGuaranteesResponse, error) {
301:	out := new(ListGuaranteesResponse)
302:	err := c.cc.Invoke(ctx, ProductService_ListGuarantees_FullMethodName, in, out, cOpts...)
309:func (c *productServiceClient) SaveGuarantee(ctx context.Context, in *SaveGuaranteeRequest, opts ...grpc.CallOption) (*Guarantee, error) {
312:	err := c.cc.Invoke(ctx, ProductService_SaveGuarantee_FullMethodName, in, out, cOpts...)
319:func (c *productServiceClient) DeleteGuarantee(ctx context.Context, in *DeleteGuaranteeRequest, opts ...grpc.CallOption) (*v1.OperationResult, error) {
322:	err := c.cc.Invoke(ctx, ProductService_DeleteGuarantee_FullMethodName, in, out, cOpts...)
329:func (c *productServiceClient) ListProductParams(ctx context.Context, in *ListProductParamsRequest, opts ...grpc.CallOption) (*ListProductParamsResponse, error) {
331:	out := new(ListProductParamsResponse)
332:	err := c.cc.Invoke(ctx, ProductService_ListProductParams_FullMethodName, in, out, cOpts...)
356:	ListChannels(context.Context, *ListChannelsRequest) (*ListChannelsResponse, error)
357:	GetChannel(context.Context, *GetChannelRequest) (*Channel, error)
358:	ListChannelProducts(context.Context, *ListChannelProductsRequest) (*ListChannelProductsResponse, error)
359:	SaveChannel(context.Context, *SaveChannelRequest) (*Channel, error)
360:	DeleteChannel(context.Context, *DeleteChannelRequest) (*v1.OperationResult, error)
361:	ListReviewTags(context.Context, *ListReviewTagsRequest) (*ListReviewTagsResponse, error)
362:	SaveReviewTag(context.Context, *SaveReviewTagRequest) (*ReviewTag, error)
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:18:16

<details><summary>🧠 思考过程</summary>

```
Good, the generated code exists with the new methods. Let me check the marketing generated names too, particularly `SignIn` returns `GetSignInStatusResponse`.

Also check `GetSignInStatusResponse` fields, `MarketingTask`, `UserTask`, `PromotionSession`, `GroupBuy`, `MarketingUserLevel`.

Let me grep the struct definitions.
```

</details>

<details><summary>🛠 bash</summary>

```
1528:type SignInRequest struct {
1564:type SignInCalendarDay struct {
1566-	Date          string                 `protobuf:"bytes,1,opt,name=date,proto3" json:"date,omitempty"`
1567-	Signed        bool                   `protobuf:"varint,2,opt,name=signed,proto3" json:"signed,omitempty"`
1568-	Points        int32                  `protobuf:"varint,3,opt,name=points,proto3" json:"points,omitempty"`
1624:type GetSignInStatusRequest struct {
1660:type GetSignInStatusResponse struct {
1662-	SignedToday    bool                   `protobuf:"varint,1,opt,name=signed_today,json=signedToday,proto3" json:"signed_today,omitempty"`
1663-	ContinuousDays int32                  `protobuf:"varint,2,opt,name=continuous_days,json=continuousDays,proto3" json:"continuous_days,omitempty"`
1664-	TotalDays      int32                  `protobuf:"varint,3,opt,name=total_days,json=totalDays,proto3" json:"total_days,omitempty"`
1665-	PointsAwarded  int32                  `protobuf:"varint,4,opt,name=points_awarded,json=pointsAwarded,proto3" json:"points_awarded,omitempty"`
1666-	NextPoints     int32                  `protobuf:"varint,5,opt,name=next_points,json=nextPoints,proto3" json:"next_points,omitempty"`
1667-	Calendar       []*SignInCalendarDay   `protobuf:"bytes,6,rep,name=calendar,proto3" json:"calendar,omitempty"`
1744:type MarketingTask struct {
1746-	Id             int64                  `protobuf:"varint,1,opt,name=id,proto3" json:"id,omitempty"`
1747-	Name           string                 `protobuf:"bytes,2,opt,name=name,proto3" json:"name,omitempty"`
1748-	Description    string                 `protobuf:"bytes,3,opt,name=description,proto3" json:"description,omitempty"`
1749-	Type           int32                  `protobuf:"varint,4,opt,name=type,proto3" json:"type,omitempty"` // 1 浏览 2 下单 3 分享 4 评价 5 签到 6 邀请
1750-	TargetCount    int32                  `protobuf:"varint,5,opt,name=target_count,json=targetCount,proto3" json:"target_count,omitempty"`
1751-	RewardPoints   int32                  `protobuf:"varint,6,opt,name=reward_points,json=rewardPoints,proto3" json:"reward_points,omitempty"`
1752-	RewardCouponId int64                  `protobuf:"varint,7,opt,name=reward_coupon_id,json=rewardCouponId,proto3" json:"reward_coupon_id,omitempty"`
1753-	Sort           int32                  `protobuf:"varint,8,opt,name=sort,proto3" json:"sort,omitempty"`
1754-	Enabled        bool                   `protobuf:"varint,9,opt,name=enabled,proto3" json:"enabled,omitempty"`
1755-	Icon           string                 `protobuf:"bytes,10,opt,name=icon,proto3" json:"icon,omitempty"`
1860:type UserTask struct {
1862-	TaskId         int64                  `protobuf:"varint,1,opt,name=task_id,json=taskId,proto3" json:"task_id,omitempty"`
1863-	Name           string                 `protobuf:"bytes,2,opt,name=name,proto3" json:"name,omitempty"`
1864-	Description    string                 `protobuf:"bytes,3,opt,name=description,proto3" json:"description,omitempty"`
1865-	Type           int32                  `protobuf:"varint,4,opt,name=type,proto3" json:"type,omitempty"`
1866-	Progress       int32                  `protobuf:"varint,5,opt,name=progress,proto3" json:"progress,omitempty"`
1867-	TargetCount    int32                  `protobuf:"varint,6,opt,name=target_count,json=targetCount,proto3" json:"target_count,omitempty"`
1868-	Completed      bool                   `protobuf:"varint,7,opt,name=completed,proto3" json:"completed,omitempty"`
1869-	Claimed        bool                   `protobuf:"varint,8,opt,name=claimed,proto3" json:"claimed,omitempty"`
1870-	RewardPoints   int32                  `protobuf:"varint,9,opt,name=reward_points,json=rewardPoints,proto3" json:"reward_points,omitempty"`
1871-	RewardCouponId int64                  `protobuf:"varint,10,opt,name=reward_coupon_id,json=rewardCouponId,proto3" json:"reward_coupon_id,omitempty"`
1872-	Icon           string                 `protobuf:"bytes,11,opt,name=icon,proto3" json:"icon,omitempty"`
1984:type ListTasksRequest struct {
1986-	Page          *v1.PageRequest        `protobuf:"bytes,1,opt,name=page,proto3" json:"page,omitempty"`
2028:type ListTasksResponse struct {
2030-	Tasks         []*UserTask            `protobuf:"bytes,1,rep,name=tasks,proto3" json:"tasks,omitempty"`
2031-	Meta          *v1.PageMeta           `protobuf:"bytes,2,opt,name=meta,proto3" json:"meta,omitempty"`
2080:type ClaimTaskRequest struct {
2082-	TaskId        int64                  `protobuf:"varint,1,opt,name=task_id,json=taskId,proto3" json:"task_id,omitempty"`
2125:type PromotionProduct struct {
2127-	Id            int64                  `protobuf:"varint,1,opt,name=id,proto3" json:"id,omitempty"`
2128-	Title         string                 `protobuf:"bytes,2,opt,name=title,proto3" json:"title,omitempty"`
2129-	Image         string                 `protobuf:"bytes,3,opt,name=image,proto3" json:"image,omitempty"`
2130-	MinPriceCents int64                  `protobuf:"varint,4,opt,name=min_price_cents,json=minPriceCents,proto3" json:"min_price_cents,omitempty"`
2131-	MaxPriceCents int64                  `protobuf:"varint,5,opt,name=max_price_cents,json=maxPriceCents,proto3" json:"max_price_cents,omitempty"`
2132-	StockTotal    int32                  `protobuf:"varint,6,opt,name=stock_total,json=stockTotal,proto3" json:"stock_total,omitempty"`
2133-	Sales         int32                  `protobuf:"varint,7,opt,name=sales,proto3" json:"sales,omitempty"`
2134-	Status        int32                  `protobuf:"varint,8,opt,name=status,proto3" json:"status,omitempty"`
2225:type GetPromotionRequest struct {
2227-	Id            int64                  `protobuf:"varint,1,opt,name=id,proto3" json:"id,omitempty"`
2269:type GetPromotionResponse struct {
2271-	Promotion     *Promotion             `protobuf:"bytes,1,opt,name=promotion,proto3" json:"promotion,omitempty"`
2272-	Products      []*PromotionProduct    `protobuf:"bytes,2,rep,name=products,proto3" json:"products,omitempty"`
2273-	Sessions      []*PromotionSession    `protobuf:"bytes,3,rep,name=sessions,proto3" json:"sessions,omitempty"`
2329:type ListPromotionProductsRequest struct {
2331-	PromotionId   int64                  `protobuf:"varint,1,opt,name=promotion_id,json=promotionId,proto3" json:"promotion_id,omitempty"`
2332-	Page          *v1.PageRequest        `protobuf:"bytes,2,opt,name=page,proto3" json:"page,omitempty"`
2381:type ListPromotionProductsResponse struct {
2383-	Products      []*PromotionProduct    `protobuf:"bytes,1,rep,name=products,proto3" json:"products,omitempty"`
2384-	Meta          *v1.PageMeta           `protobuf:"bytes,2,opt,name=meta,proto3" json:"meta,omitempty"`
2433:type PromotionSession struct {
2435-	Id            int64                  `protobuf:"varint,1,opt,name=id,proto3" json:"id,omitempty"`
2436-	PromotionId   int64                  `protobuf:"varint,2,opt,name=promotion_id,json=promotionId,proto3" json:"promotion_id,omitempty"`
2437-	Name          string                 `protobuf:"bytes,3,opt,name=name,proto3" json:"name,omitempty"`
2438-	StartTime     int64                  `protobuf:"varint,4,opt,name=start_time,json=startTime,proto3" json:"start_time,omitempty"` // unix 秒
2439-	EndTime       int64                  `protobuf:"varint,5,opt,name=end_time,json=endTime,proto3" json:"end_time,omitempty"`       // unix 秒
2440-	Stock         int32                  `protobuf:"varint,6,opt,name=stock,proto3" json:"stock,omitempty"`
2441-	SoldCount     int32                  `protobuf:"varint,7,opt,name=sold_count,json=soldCount,proto3" json:"sold_count,omitempty"`
2442-	Status        int32                  `protobuf:"varint,8,opt,name=status,proto3" json:"status,omitempty"` // 0 未开始 1 进行中 2 已结束
2533:type ListPromotionSessionsRequest struct {
2535-	PromotionId   int64                  `protobuf:"varint,1,opt,name=promotion_id,json=promotionId,proto3" json:"promotion_id,omitempty"`
2536-	Page          *v1.PageRequest        `protobuf:"bytes,2,opt,name=page,proto3" json:"page,omitempty"`
2585:type ListPromotionSessionsResponse struct {
2587-	Sessions      []*PromotionSession    `protobuf:"bytes,1,rep,name=sessions,proto3" json:"sessions,omitempty"`
2588-	Meta          *v1.PageMeta           `protobuf:"bytes,2,opt,name=meta,proto3" json:"meta,omitempty"`
2637:type SavePromotionSessionRequest struct {
2639-	Id            int64                  `protobuf:"varint,1,opt,name=id,proto3" json:"id,omitempty"`
2640-	PromotionId   int64                  `protobuf:"varint,2,opt,name=promotion_id,json=promotionId,proto3" json:"promotion_id,omitempty"`
2641-	Name          string                 `protobuf:"bytes,3,opt,name=name,proto3" json:"name,omitempty"`
2642-	StartTime     int64                  `protobuf:"varint,4,opt,name=start_time,json=startTime,proto3" json:"start_time,omitempty"`
2643-	EndTime       int64                  `protobuf:"varint,5,opt,name=end_time,json=endTime,proto3" json:"end_time,omitempty"`
2644-	Stock         int32                  `protobuf:"varint,6,opt,name=stock,proto3" json:"stock,omitempty"`
2721:type GroupBuy struct {
2723-	Id                 int64                  `protobuf:"varint,1,opt,name=id,proto3" json:"id,omitempty"`
2724-	Name               string                 `protobuf:"bytes,2,opt,name=name,proto3" json:"name,omitempty"`
2725-	Description        string                 `protobuf:"bytes,3,opt,name=description,proto3" json:"description,omitempty"`
2726-	PromotionId        int64                  `protobuf:"varint,4,opt,name=promotion_id,json=promotionId,proto3" json:"promotion_id,omitempty"`
2727-	ProductId          int64                  `protobuf:"varint,5,opt,name=product_id,json=productId,proto3" json:"product_id,omitempty"`
2728-	ProductTitle       string                 `protobuf:"bytes,6,opt,name=product_title,json=productTitle,proto3" json:"product_title,omitempty"`
2729-	ProductImage       string                 `protobuf:"bytes,7,opt,name=product_image,json=productImage,proto3" json:"product_image,omitempty"`
2730-	PriceCents         int64                  `protobuf:"varint,8,opt,name=price_cents,json=priceCents,proto3" json:"price_cents,omitempty"`
2731-	OriginalPriceCents int64                  `protobuf:"varint,9,opt,name=original_price_cents,json=originalPriceCents,proto3" json:"original_price_cents,omitempty"`
2732-	RequiredMembers    int32                  `protobuf:"varint,10,opt,name=required_members,json=requiredMembers,proto3" json:"required_members,omitempty"`
2733-	JoinedMembers      int32                  `protobuf:"varint,11,opt,name=joined_members,json=joinedMembers,proto3" json:"joined_members,omitempty"`
2734-	GroupSize          int32                  `protobuf:"varint,12,opt,name=group_size,json=groupSize,proto3" json:"group_size,omitempty"`
2735-	Status             int32                  `protobuf:"varint,13,opt,name=status,proto3" json:"status,omitempty"` // 0 未开始 1 进行中 2 已结束 3 已下线
2736-	StartTime          int64                  `protobuf:"varint,14,opt,name=start_time,json=startTime,proto3" json:"start_time,omitempty"`
2737-	EndTime            int64                  `protobuf:"varint,15,opt,name=end_time,json=endTime,proto3" json:"end_time,omitempty"`
2738-	BannerImage        string                 `protobuf:"bytes,16,opt,name=banner_image,json=bannerImage,proto3" json:"banner_image,omitempty"`
2885:type GroupBuyMember struct {
2887-	Id            int64                  `protobuf:"varint,1,opt,name=id,proto3" json:"id,omitempty"`
2888-	GroupBuyId    int64                  `protobuf:"varint,2,opt,name=group_buy_id,json=groupBuyId,proto3" json:"group_buy_id,omitempty"`
2889-	UserId        int64                  `protobuf:"varint,3,opt,name=user_id,json=userId,proto3" json:"user_id,omitempty"`
2890-	UserNickname  string                 `protobuf:"bytes,4,opt,name=user_nickname,json=userNickname,proto3" json:"user_nickname,omitempty"`
2891-	JoinedAt      *timestamppb.Timestamp `protobuf:"bytes,5,opt,name=joined_at,json=joinedAt,proto3" json:"joined_at,omitempty"`
2961:type ListGroupBuysRequest struct {
2963-	Page          *v1.PageRequest        `protobuf:"bytes,1,opt,name=page,proto3" json:"page,omitempty"`
2964-	Keyword       string                 `protobuf:"bytes,2,opt,name=keyword,proto3" json:"keyword,omitempty"`
2965-	Status        int32                  `protobuf:"varint,3,opt,name=status,proto3" json:"status,omitempty"`
3021:type ListGroupBuysResponse struct {
3023-	GroupBuys     []*GroupBuy            `protobuf:"bytes,1,rep,name=group_buys,json=groupBuys,proto3" json:"group_buys,omitempty"`
3024-	Meta          *v1.PageMeta           `protobuf:"bytes,2,opt,name=meta,proto3" json:"meta,omitempty"`
3073:type GetGroupBuyRequest struct {
3075-	Id            int64                  `protobuf:"varint,1,opt,name=id,proto3" json:"id,omitempty"`
3117:type GetGroupBuyResponse struct {
3119-	GroupBuy      *GroupBuy              `protobuf:"bytes,1,opt,name=group_buy,json=groupBuy,proto3" json:"group_buy,omitempty"`
3120-	Members       []*GroupBuyMember      `protobuf:"bytes,2,rep,name=members,proto3" json:"members,omitempty"`
3169:type JoinGroupBuyRequest struct {
3171-	Id            int64                  `protobuf:"varint,1,opt,name=id,proto3" json:"id,omitempty"`
3172-	Quantity      int32                  `protobuf:"varint,2,opt,name=quantity,proto3" json:"quantity,omitempty"`
3221:type SaveGroupBuyRequest struct {
3223-	Id              int64                  `protobuf:"varint,1,opt,name=id,proto3" json:"id,omitempty"`
3224-	Name            string                 `protobuf:"bytes,2,opt,name=name,proto3" json:"name,omitempty"`
3225-	Description     string                 `protobuf:"bytes,3,opt,name=description,proto3" json:"description,omitempty"`
3226-	PromotionId     int64                  `protobuf:"varint,4,opt,name=promotion_id,json=promotionId,proto3" json:"promotion_id,omitempty"`
3227-	ProductId       int64                  `protobuf:"varint,5,opt,name=product_id,json=productId,proto3" json:"product_id,omitempty"`
3228-	PriceCents      int64                  `protobuf:"varint,6,opt,name=price_cents,json=priceCents,proto3" json:"price_cents,omitempty"`
3229-	RequiredMembers int32                  `protobuf:"varint,7,opt,name=required_members,json=requiredMembers,proto3" json:"required_members,omitempty"`
3230-	StartTime       int64                  `protobuf:"varint,8,opt,name=start_time,json=startTime,proto3" json:"start_time,omitempty"`
3231-	EndTime         int64                  `protobuf:"varint,9,opt,name=end_time,json=endTime,proto3" json:"end_time,omitempty"`
3232-	BannerImage     string                 `protobuf:"bytes,10,opt,name=banner_image,json=bannerImage,proto3" json:"banner_image,omitempty"`
3337:type MarketingUserLevel struct {
3339-	Id              int64                  `protobuf:"varint,1,opt,name=id,proto3" json:"id,omitempty"`
3340-	Name            string                 `protobuf:"bytes,2,opt,name=name,proto3" json:"name,omitempty"`
3341-	Level           int32                  `protobuf:"varint,3,opt,name=level,proto3" json:"level,omitempty"`
3342-	MinGrowth       int32                  `protobuf:"varint,4,opt,name=min_growth,json=minGrowth,proto3" json:"min_growth,omitempty"`
3343-	MaxGrowth       int32                  `protobuf:"varint,5,opt,name=max_growth,json=maxGrowth,proto3" json:"max_growth,omitempty"`
3344-	DiscountPercent int32                  `protobuf:"varint,6,opt,name=discount_percent,json=discountPercent,proto3" json:"discount_percent,omitempty"`
3345-	Icon            string                 `protobuf:"bytes,7,opt,name=icon,proto3" json:"icon,omitempty"`
3346-	Description     string                 `protobuf:"bytes,8,opt,name=description,proto3" json:"description,omitempty"`
3347-	Benefits        []string               `protobuf:"bytes,9,rep,name=benefits,proto3" json:"benefits,omitempty"`
3348-	Sort            int32                  `protobuf:"varint,10,opt,name=sort,proto3" json:"sort,omitempty"`
3453:type ListUserLevelsRequest struct {
3489:type ListUserLevelsResponse struct {
3491-	Levels        []*MarketingUserLevel  `protobuf:"bytes,1,rep,name=levels,proto3" json:"levels,omitempty"`
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:18:23

<details><summary>🧠 思考过程</summary>

```
All good. Now check `auth.UserIDFromContext` and the events.go in marketing (for publishing events on task claim / sign-in).

Let me look at marketing/events.go.
```

</details>

<details><summary>🛠 read</summary>

```
1→package marketing
     2→
     3→import (
     4→	"context"
     5→
     6→	"go.uber.org/zap"
     7→
     8→	"github.com/shopstack/platform/backend/internal/errs"
     9→	"github.com/shopstack/platform/backend/internal/logger"
    10→	"github.com/shopstack/platform/backend/internal/mq"
    11→)
    12→
    13→// ServiceHolder 持有服务实例，供事件回调在服务就绪后获取。
    14→//
    15→// bootstrap 会先建立消息订阅再执行 Setup，因此事件回调可能早于服务实例创建，
    16→// 这里用持有者传递实例，避免使用全局变量。
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
    27→// Consumers 返回营销服务订阅的事件。
    28→func Consumers(queueName string, holder *ServiceHolder) []mq.Consumer {
    29→	return []mq.Consumer{
    30→		{
    31→			Queue:      queueName + ".marketing." + mq.EventOrderPaid,
    32→			RoutingKey: mq.EventOrderPaid,
    33→			Handler: func(ctx context.Context, event *mq.Event) error {
    34→				service := holder.Get()
    35→				if service == nil {
    36→					return errs.New(errs.CodeUnavailable, "营销服务尚未就绪")
    37→				}
    38→				return handleOrderPaid(ctx, event, service)
    39→			},
    40→		},
    41→	}
    42→}
    43→
    44→// handleOrderPaid 处理支付成功事件：核销用户优惠券。
    45→func handleOrderPaid(ctx context.Context, event *mq.Event, service *Service) error {
    46→	orderID := payloadInt64(event, "order_id")
    47→	userID := payloadInt64(event, "user_id")
    48→	if userID == 0 {
    49→		return nil
    50→	}
    51→
    52→	couponID := payloadInt64(event, "coupon_id")
    53→	if couponID > 0 {
    54→		if err := service.repo.MarkUserCouponUsed(ctx, uint64(userID), uint64(couponID), uint64(orderID)); err != nil {
    55→			return err
    56→		}
    57→		logger.L().Info("已核销用户优惠券",
    58→			zap.Int64("用户ID", userID), zap.Int64("订单ID", orderID), zap.Int64("优惠券ID", couponID))
    59→		return nil
    60→	}
    61→
    62→	// 事件未携带优惠券 ID 时，核销该用户全部未使用的优惠券
    63→	list, _, err := service.repo.ListUserCoupons(ctx, uint64(userID), UserCouponStatusUnused, 1, 100)
    64→	if err != nil {
    65→		return err
    66→	}
    67→	for i := range list {
    68→		if err := service.repo.MarkUserCouponUsed(ctx, list[i].UserID, list[i].CouponID, uint64(orderID)); err != nil {
    69→			return err
    70→		}
    71→	}
    72→	if len(list) > 0 {
    73→		logger.L().Info("已核销用户优惠券",
    74→			zap.Int64("用户ID", userID), zap.Int64("订单ID", orderID), zap.Int("数量", len(list)))
    75→	}
    76→	return nil
    77→}
    78→
    79→// payloadInt64 读取事件负载中的整型字段。
    80→func payloadInt64(event *mq.Event, key string) int64 {
    81→	if event == nil || event.Payload == nil {
    82→		return 0
    83→	}
    84→	switch v := event.Payload[key].(type) {
    85→	case float64:
    86→		return int64(v)
    87→	case int64:
    88→		return v
    89→	case int:
    90→		return int64(v)
    91→	}
    92→	return 0
    93→}
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:18:29

<details><summary>🧠 思考过程</summary>

```
Now let me check the `auth` package for UserIDFromContext, and also check whether there is an existing `product/material.go` for style reference of a separate file within the domain.

Also check that `errs.CodeUnauthorized` exists → yes (1003).

Let me look at product/material.go quickly for file organization style.
```

</details>

<details><summary>🛠 bash</summary>

```
package product

import (
	"context"
	"errors"
	"time"

	"google.golang.org/protobuf/types/known/timestamppb"
	"gorm.io/gorm"

	commonv1 "github.com/shopstack/platform/gen/go/common/v1"
	productv1 "github.com/shopstack/platform/gen/go/product/v1"

	"github.com/shopstack/platform/backend/internal/errs"
)

// Material 是素材库模型。
type Material struct {
	ID        uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	Name      string    `gorm:"type:varchar(200);not null;default:''" json:"name"`
	URL       string    `gorm:"type:varchar(512);not null;default:''" json:"url"`
	Type      string    `gorm:"type:varchar(16);not null;default:'image'" json:"type"`
	Size      int64     `gorm:"not null;default:0" json:"size"`
	Folder    string    `gorm:"type:varchar(64);not null;default:'default'" json:"folder"`
	Sort      int       `gorm:"not null;default:0" json:"sort"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// TableName 指定表名。
func (Material) TableName() string { return "product_materials" }

// ListMaterials 分页查询素材。
func (r *Repo) ListMaterials(ctx context.Context, keyword, matType, folder string, page, pageSize int) ([]Material, int64, error) {
	q := r.db.WithContext(ctx).Model(&Material{})
	if keyword != "" {
		like := "%" + keyword + "%"
		q = q.Where("name LIKE ? OR url LIKE ?", like, like)
	}
	if matType != "" {
		q = q.Where("type = ?", matType)
	}
	if folder != "" {
		q = q.Where("folder = ?", folder)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []Material
	err := q.Order("sort ASC, id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

// SaveMaterial 新增或更新素材。
func (r *Repo) SaveMaterial(ctx context.Context, m *Material) error {
	return r.db.WithContext(ctx).Save(m).Error
}

=== AUTH ===
203:func UserIDFromContext(ctx context.Context) int64 {
204-	if v, ok := ctx.Value(ctxKeyUserID).(int64); ok {
205-		return v
206-	}
207-	return 0
208-}
209-
210-// UsernameFromContext 从 context 取出当前用户名。
211-func UsernameFromContext(ctx context.Context) string {
212-	if v, ok := ctx.Value(ctxKeyUsername).(string); ok {
213-		return v
214-	}
215-	return ""
216-}
217-
218-// SubjectFromContext 从 context 取出身份类型。
219-func SubjectFromContext(ctx context.Context) string {
220-	if v, ok := ctx.Value(ctxKeySubject).(string); ok {
221-		return v
222-	}
223-	return ""
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:18:33

<details><summary>🧠 思考过程</summary>

````
Now I have all I need. Let me plan the files.

### product domain

New files:
1. `backend/internal/product/channel.go` — Channel model + repo methods + service methods (ListChannels, GetChannel, ListChannelProducts, SaveChannel, DeleteChannel).
2. `backend/internal/product/review_tag.go` — ReviewTag model + repo + service.
3. `backend/internal/product/guarantee.go` — Guarantee model + repo + service.
4. `backend/internal/product/question.go` — ProductQuestion model + repo + service (ListProductQuestions, CreateQuestion, ListQuestions, AnswerQuestion).
5. `backend/internal/product/params.go` — ListProductParams service (can go into service.go or a new file). I'll put in `product_params.go`.

Modify:
- `backend/internal/product/handler.go` — add handler methods.
- Possibly `repo.go`/`service.go` — I can add methods in new files instead. Repo methods for channels etc. go in channel.go (methods on *Repo). Service methods on *Service in channel.go. That keeps existing files untouched except handler.go.

Wait: handler.go is in my ownership scope (product dir), so I can modify it.

### marketing domain

New files:
1. `backend/internal/marketing/signin.go` — SignInRecord model, SignIn, GetSignInStatus service + repo.
2. `backend/internal/marketing/task.go` — MarketingTask, UserTask models, ListTasks, ClaimTask.
3. `backend/internal/marketing/groupbuy.go` — GroupBuy, GroupBuyMember models, ListGroupBuys, GetGroupBuy, JoinGroupBuy, SaveGroupBuy.
4. `backend/internal/marketing/session.go` — PromotionSession model, ListPromotionSessions, SavePromotionSession, plus GetPromotion / ListPromotionProducts (these are promotion-related; I'll put GetPromotion and ListPromotionProducts in `promotion_extra.go` or in session.go). Let me name it `backend/internal/marketing/promotion_detail.go` for GetPromotion/ListPromotionProducts, and `session.go` for sessions.
5. `backend/internal/marketing/level.go` — MarketingUserLevel model + ListUserLevels.

Modify: `backend/internal/marketing/handler.go` to add handlers.

Also need local models for `users` (points) and `user_points_logs` in marketing. I'll define them in `signin.go` (or a shared `points.go`). Let me create `backend/internal/marketing/points.go` with `UserPointsAccount` (table users) and `PointsLog` (table user_points_logs) plus repo methods `AddPoints`.

Hmm, but the marketing `Service` needs to award points for sign-in and task claim. Both use `repo.AddPoints`.

Now details:

#### SignIn

`SignIn(ctx, req) (*marketingv1.GetSignInStatusResponse, error)`:
- userID := resolveUserID(ctx, req.GetUserId()) — SignInRequest has no user_id field! `message SignInRequest {}`. So resolveUserID(ctx, 0) → auth.UserIDFromContext(ctx). If 0 → errs.Unauthorized("请先登录").
- today := time.Now() in local timezone (Asia/Shanghai? the server TZ). Use time.Now() and format "2006-01-02".
- Check existing record for (user_id, today). If exists → return error "今日已签到".
- Compute continuous days: check if there's a record for yesterday; if yes continuous = yesterday.continuous_days + 1 else 1.
- points award: base points per day, e.g. signInBasePoints = 5, plus continuous bonus. Let's define: points = 5 + continuousDays*? Keep simple and deterministic: base 5 points, 连续满 7 天额外 +10. I'll define constants:
  - signInBasePoints = 5
  - signInContinuousBonus = 1 (每连续一天额外 1 分，上限 ?)
  Let me do: points = base(5) + min(continuousDays, 7) - 1 → i.e. day1=5, day2=6, ... day7=11, then capped at 12? Simpler and explainable:
  
  ```
  // signInBasePoints 每日签到基础积分
  signInBasePoints = 5
  // signInContinuousStep 每连续一天额外增加的积分
  signInContinuousStep = 1
  // signInMaxPoints 单次签到积分上限
  signInMaxPoints = 20
  points = min(base + (continuous-1)*step, max)
  ```
  Day1=5, day2=6, ... day7=11, day16=20 capped.
- Insert record (user_id, sign_date, continuous_days, points_awarded).
- Award points to users table + insert user_points_logs.
- Return GetSignInStatusResponse with signed_today=true, continuous_days, total_days, points_awarded (today's points), next_points (next day's points), calendar (this month's days).

Use transaction for record insert + points update.

Note the unique key uk_user_date (user_id, sign_date) → duplicate insert error handling: isDuplicateKey → "今日已签到".

`GetSignInStatus(ctx, req)`:
- userID from context; if 0 → Unauthorized.
- Query all sign_in_records for the user (to compute total days and continuous days). For calendar: this month only.
- continuous days: if signed today → today's record continuous_days; else if signed yesterday → yesterday's continuous_days; else 0.
- total_days = count of all records.
- points_awarded = sum of points_awarded (total earned from sign-in)? Field name "points_awarded" in the response. Given there's also "next_points". I'll define points_awarded as total points earned from sign-in records (cumulative). And next_points = points that would be awarded for the next sign-in (base + continuous*step capped). Let me make it clear in comments.

Hmm, actually it might be more useful: points_awarded = 今日签到获得的积分 (0 if not signed). Ambiguous. I'll go with cumulative total earned from sign-in (sum of points_awarded) and document it. Hmm... Let me reconsider: In SignIn response, `points_awarded` most naturally = points awarded this sign-in. But then in status it'd be 0 if not signed today. Actually that makes sense too: SignIn returns points_awarded = the points just awarded; GetSignInStatus returns points_awarded = points awarded today (0 if not signed). And next_points = points that will be awarded if you sign in tomorrow... hmm "next_points" more likely = 明日签到可得积分.

I'll go: points_awarded = 今日已获得的签到积分（今日未签到为 0）; next_points = 下一次签到（明日）可得积分 = min(base + continuous*step, max) where continuous = current continuous streak (if today signed, tomorrow would be continuous+1 → points = base + continuous*step). Let me define helper `signInPoints(continuousDays int) int`.

If today signed with continuous=3, tomorrow's continuous would be 4 → points = base + (4-1)*step. So next_points = signInPoints(continuous+1) where continuous = today's streak if signed today else streak-as-of-yesterday.

Careful: if today not signed, continuous (streak ending yesterday) = yesterday.continuous_days; tomorrow signing would give streak = yesterday.continuous_days+1 → points = signInPoints(streak+1). Same formula. Good: next_points = signInPoints(streak+1).

And points_awarded today = today's record points_awarded (0 if none).

Calendar: for the current month, list each day of the month with signed bool and points. The proto field `calendar` is `repeated SignInCalendarDay` with date, signed, points. I'll generate all days of the current month (up to today, or all days?). I'll generate all days of the current month — for future days signed=false, points=0. Hmm, that's a lot of entries but fine (28-31). Actually maybe only up to today plus future days marked. I'll generate all days of current month. That's reasonable for a calendar view.

#### Tasks

`ListTasks(ctx, req)`:
- userID from context (ListTasksRequest has no user_id) → resolveUserID(ctx, 0). If 0 → unauthorized? Task list is per-user progress. If not logged in, we could return task definitions with zero progress. But requirement says "用户私有接口（签到、任务领取、参团）必须用这个模式". ListTasks is a list of tasks with progress — I'll require login too, returning Unauthorized if 0. Hmm, but the task center page might be shown before login. The requirement mentions "你的用户私有接口（签到、任务领取、参团）必须用这个模式" — ListTasks isn't explicitly listed. But it returns per-user progress. I'll require login for consistency but... risky: if a client calls without login it errors. I think requiring login is reasonable and consistent. Hmm — but to be safe, if userID == 0, return the task list with zero progress and completed=false. That's friendlier and still "real". But then "user_tasks" lookup is skipped.

I'll go with: if userID == 0 → return definitions with empty progress (no error). Actually wait, that weakens the "must use resolveUserID" pattern requirement. I'll use resolveUserID and handle 0 by returning zeroed progress. Hmm, let me reconsider once more: The spec says ListTasks "返回任务定义 + 当前用户的进度与完成状态". Anonymous users have no progress. Returning the definitions is harmless and useful. I'll do that and document it.

Hmm, but consistency argues for error. I'll go with erroring? No — I'll return definitions without progress for anonymous. Decided. Actually... let me think about which is more defensible to a reviewer. The requirement: "ListTasks 返回任务定义 + 当前用户的进度与完成状态（基于 user_tasks 表）". And rule 11 says CreateQuestion must use resolveUserID and return unauthorized when 0. That's specific to CreateQuestion. For ListTasks the brief lists "签到、任务领取、参团" as user-private ones — ListTasks is not in that list, so anonymous listing is acceptable. Decision: anonymous → definitions with zero progress.

- Query marketing_tasks where enabled = true (only enabled tasks shown to users), ordered by sort, id. Paginate with page params.
- Left join user_tasks for the user.

Wait, pagination: ListTasksRequest has page. So paginate over task definitions.

`ClaimTask(ctx, req)`:
- userID := resolveUserID(ctx, 0) → 0 → Unauthorized.
- taskID from req.
- Find marketing task by id; not found → NotFound; !enabled → error "任务已下线".
- Find user_tasks row for (user, task). If not found → error "任务尚未完成" (no progress record). If completed == false → error "任务尚未完成". If claimed → error "奖励已领取".
- Transaction: update user_tasks set claimed=1, claimed_at=now where id=? and claimed=0 (optimistic) → if RowsAffected==0 → "奖励已领取".
- Award reward_points to user + points log. Also reward_coupon_id: if > 0, issue a coupon to user (user_coupons). The proto has reward_coupon_id. Implementing coupon issuance: create user_coupons record with coupon id and increment received_quantity. That's a nice touch and uses existing repo methods. I'll implement it since reward_coupon_id exists in the schema (seed has 0 for all tasks though). I'll implement it properly — reuse FindCouponByID + CreateUserCoupon + IncrementReceived.
- Return UserTask proto.

#### GroupBuy

`ListGroupBuys(ctx, req)`: page, keyword, status. Filter status by real status computed from time? The `status` column is 0未开始 1进行中 2已结束 3已下线. Seed has status=1 and start/end times. I'll filter: if req.status > 0 → where status = req.status, but also treat "running" as status in (1) OR time-based. Keep it simple: filter by stored status; but the stored status may be stale relative to time. I'll compute effective status like promotionToProto does (realPromotionStatus) and filter in Go? That breaks pagination.

Better: filter with SQL on both stored status and time window:
- if req.status == 1 (进行中): where status != 3 (not offline) AND start_time <= now AND end_time >= now
- if req.status == 0 (未开始): status != 3 AND start_time > now
- if req.status == 2 (已结束): status != 3 AND end_time < now
- if req.status == 3: status = 3

And in the response, compute effective status by time (like realPromotionStatus). Good.

`GetGroupBuy(ctx, req)`: returns GetGroupBuyResponse{group_buy, members}.

`JoinGroupBuy(ctx, req)`:
- userID := resolveUserID(ctx, 0) → 0 → Unauthorized.
- quantity: default 1; validate 1..group_size.
- Load group buy; not found → NotFound (CodePromotionNotFound? use errs.CodeNotFound). Brief mentions `errs.CodePromotionNotFound` — but that doesn't exist in errs.go! Existing codes: CodePromotionInvalid = 8003. There's no CodePromotionNotFound. The brief says "详见 backend/internal/errs/errs.go" — I'll use errs.CodeNotFound for missing group buy, and mention that CodePromotionNotFound doesn't exist.
- Validate time window: now within [start_time, end_time] else error "活动未开始"/"活动已结束". Also status offline → error.
- Check membership: existing group_buy_members row for (group_buy_id, user_id) → error "您已参与该拼团" (unique constraint is not on the table though — only idx_group. So no DB uniqueness; I must check in code and rely on transaction).
- Capacity: joined_members < group_size (总人数上限). Also required_members for 成团.
- Create member row; increment joined_members atomically: UPDATE group_buys SET joined_members = joined_members + 1 WHERE id=? AND joined_members < group_size → RowsAffected 0 → "团已满".
- If joined_members >= required_members → status becomes 成团. The `status` field per proto: 0 未开始 1 进行中 2 已结束 3 已下线. "成团" isn't representable. The brief says "满员（member 数达到 group_size）后团状态置为已成团". Given the schema, there's no "已成团" status. I'll keep status=1 (进行中) and treat 成团 as derived (joined_members >= required_members). I'll add a comment explaining the schema limitation. Hmm — but the requirement explicitly asks to set the status. With status enum 0-3 and no room for "已成团", I'll interpret "满员" as group_size (总人数上限) → then the group is full, and I'll keep status as running but the joined_members == group_size signals fullness. I'll document this deviation clearly.

Actually, maybe I should reconsider: I could set status = 2 (已结束) when the group is full? No — 已结束 means time over. I'll leave status unchanged (进行中) and document that the schema lacks a "已成团" status; fullness is derived from joined_members vs group_size.

Hmm, but the reviewer might check. I'll document honestly in the final report.

Also `is_leader` doesn't exist in the table. The brief says "group_buy_members 表有 is_leader 字段" — it doesn't. Document that too.

`SaveGroupBuy(ctx, req)`: admin creates/updates. Fields: name, description, promotion_id, product_id, price_cents, required_members, start_time, end_time, banner_image. Load product to fill product_title/product_image and original_price_cents. group_size default = max(required_members*3, 20)? The column group_size = 团总人数上限 default 20. For new records I'll set group_size = required_members * 2 if required_members>0 else 20? Let's keep group_size default 20 when creating, and on update keep existing group_size.

original_price_cents: from product max_price_cents or min_price_cents.

#### Promotion detail

`GetPromotion(ctx, req)`: GetPromotionResponse{promotion, products, sessions}.
- Find promotion by id.
- products: the promotion's product (promotion.ProductID) — plus? `ListPromotionProducts` returns promotion products. The promotions table has a single product_id. So the promotion's product list = the product with product_id (if >0). For ListPromotionProducts with pagination: if promotion.product_id > 0 → return that one product; else empty.

Hmm, that gives a 1-item list always. Is there a better source? There's no promotion_products table. So yes: single product.

PromotionProduct: id, title, image (cover), min_price_cents, max_price_cents, stock_total (sum of product_skus stock), sales (sales_count), status.

I'll add a local `ProductSummary` model in marketing reading the `products` and `product_skus` tables (cross-domain read, same as LogisticTemplate pattern). Marketing doesn't currently read products. That's fine — read-only cross-domain access, same DB, following the LogisticTemplate precedent.

- sessions: promotion_sessions for the promotion.

`ListPromotionSessions(ctx, req)`: paginated list by promotion_id, ordered by start_time.

`SavePromotionSession(ctx, req)`: create/update; validate promotion_id exists, time range start<end, and no overlap with other sessions of the same promotion. Overlap check: existing sessions where start_time < newEnd AND end_time > newStart (excluding self). Return error "场次时间与已有场次重叠".

Also status: 0未开始 1进行中 2已结束 — compute from time on read.

#### ListUserLevels

Read user_levels table → MarketingUserLevel with benefits parsed from JSON array string.

#### Product domain details

**Channel model**: fields id, name, code, icon, banner_url, description, sort, type, status, product_count, created_at, updated_at. No deleted_at column in the table → don't use gorm.DeletedAt (table has no deleted_at column, so soft delete would break). Requirement says "软删除用 gorm.DeletedAt" — but only where the table supports it. channels has no deleted_at → use hard delete. Same for review_tags, guarantees (no deleted_at).

**ListChannels**: page, keyword, type. Public list: should it filter status=1 (enabled)? The admin list and public list are the same RPC. I'll return all and let clients filter, but... `status` isn't in ListChannelsRequest. Public endpoint `/api/v1/channels`. I'll include all channels but set... Hmm. I'll filter to enabled only for status=1? No: admins need to see disabled ones. The request has no status filter. I'll return all channels (including disabled) — but that exposes disabled ones to the frontend. Given `channels.product_count` exists and this is used for the home page, I'll return all and let the frontend filter by status field (status is in the proto Channel message, so clients can filter). Decision: return all, ordered by sort, id.

Hmm, but a "频道列表" public API returning disabled channels is a bit off. The proto Channel includes status so the client can decide. Keep all. Actually let me reconsider - most implementations would filter status=1 for the public channel page. But admin also uses this to list channels for editing. Since the same RPC serves both, returning all is the only way admin works. I'll return all. Document.

**GetChannel**: by id → Channel proto; also compute product_count? The table has product_count maintained by seed. I could refresh it when listing channel products (update count to actual matched product count). That's a nice real behavior: after ListChannelProducts, update channels.product_count to the number of matched products. I'll do that (update count to actual matched product count).

**SaveChannel**: id=0 → create; else update. Validate name and code non-empty; code unique (uk_code) → duplicate → error "频道编码已存在".

**DeleteChannel**: delete by id → OperationResult.

**ListChannelProducts**: as described.

**ListReviewTags**: page, keyword → list. Public: filter enabled? Same admin/public issue. Request has no enabled filter. I'll return all, ordered by sort, id. Hmm — for review tags, the public endpoint `/api/v1/reviews/tags` is used for the review form where only enabled tags make sense. But admin editing needs all. Return all with `enabled` field exposed. Consistent with channels.

Hmm, let me reconsider: I could filter to enabled when... no signal. Return all.

**SaveReviewTag / DeleteReviewTag**, **ListGuarantees / SaveGuarantee / DeleteGuarantee**: similar.

**ListProductParams**: from product_attributes → ProductAttribute proto list. Validate product exists → CodeProductNotFound.

**Questions**:
- product_questions model: id, product_id, product_title, user_id, user_nickname, content, images, reply, reply_at, created_at. Note `reply_at` is varchar(32) — store the reply time as a string (formatted). Proto `reply_at` is a string too. Good.
- ListProductQuestions (public): product_id required; list questions for the product, ordered by id DESC, paginated. Should public list show only answered ones? The proto ProductQuestion has content, reply, reply_at. Public Q&A typically shows answered questions. I'll show all questions but include reply if present. Hmm, "公开" — I'll return all (unanswered ones just have empty reply). Fine.

Actually, for a product detail page, showing unanswered questions is normal too ("待回答"). Keep all.

- CreateQuestion: userID := resolveUserID(ctx, req.GetUserId()) — CreateQuestionRequest has no user_id field! `message CreateQuestionRequest { product_id, content, images }`. So resolveUserID(ctx, 0). If 0 → Unauthorized("请先登录").
  Validate product exists, content non-empty. Insert with product_title, user_nickname (look up from users table — I need a local User model in product domain to read nickname). Hmm, product domain reading `users` table... The reviews code takes nickname from the request. For questions, there's no nickname in the request. I'll read the nickname from the users table via a small local model (read-only), like the marketing LogisticTemplate precedent. Yes.

- ListQuestions (admin): page, keyword, product_id.
- AnswerQuestion: id, reply. Set reply + reply_at (now formatted "2006-01-02 15:04:05"), and answerer? The table has no answered_by column. The brief said "记录回答人与回答时间" but there's no answered_by column. I'll record the answer time in reply_at, and store the answering admin in... no column. Document that the schema lacks answered_by; I'll note it. Alternatively I could append the admin nickname to the reply text — no, that pollutes. Document it.

Now `reply_at` varchar(32): store "2006-01-02 15:04:05".

Now the proto ProductQuestion field `reply` maps to table `reply`. Good.

Now let me also handle: does the proto have `status` for questions? No. Good.

### Handler additions

product handler: add methods for the 12 new ProductService RPCs + 4 ReviewService RPCs.
marketing handler: add 13 methods.

### Now about `normalizePage` and `buildMeta` — both exist in both packages already. Good.

Let me now check `commonv1.PageRequest` fields (page, page_size).

Let me now write the code.

First, product/channel.go.

Model:
```go
// Channel 是首页频道与楼层模型。
type Channel struct {
	ID           uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	Name         string    `gorm:"type:varchar(64);not null;default:''" json:"name"`
	Code         string    `gorm:"type:varchar(64);not null;uniqueIndex:uk_code" json:"code"`
	Icon         string    `gorm:"type:varchar(512);not null;default:''" json:"icon"`
	BannerURL    string    `gorm:"column:banner_url;type:varchar(512);not null;default:''" json:"banner_url"`
	Description  string    `gorm:"type:varchar(512);not null;default:''" json:"description"`
	Sort         int       `gorm:"not null;default:0" json:"sort"`
	Type         int8      `gorm:"tinyint;not null;default:1" json:"type"`
	Status       int8      `gorm:"tinyint;not null;default:1" json:"status"`
	ProductCount int       `gorm:"column:product_count;not null;default:0" json:"product_count"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}
func (Channel) TableName() string { return "channels" }
```

Note: gorm `Save` with a struct having ID 0 → insert. Good.

Repo:
```go
func (r *Repo) ListChannels(ctx context.Context, keyword string, channelType int32, page, pageSize int) ([]Channel, int64, error)
func (r *Repo) FindChannelByID(ctx context.Context, id uint64) (*Channel, error)
func (r *Repo) FindChannelByCode(ctx context.Context, code string) (*Channel, error)
func (r *Repo) SaveChannel(ctx context.Context, c *Channel) error
func (r *Repo) DeleteChannel(ctx context.Context, id uint64) error
func (r *Repo) UpdateChannelProductCount(ctx context.Context, id uint64, count int) error
```

Service:
```go
func (s *Service) ListChannels(ctx, req) (*productv1.ListChannelsResponse, error)
func (s *Service) GetChannel(ctx, req) (*productv1.Channel, error)
func (s *Service) ListChannelProducts(ctx, req) (*productv1.ListChannelProductsResponse, error)
func (s *Service) SaveChannel(ctx, req) (*productv1.Channel, error)
func (s *Service) DeleteChannel(ctx, id int64) error
```

For ListChannelProducts I need a product query filtered by channel. I'll add to the Repo a method:
```go
func (r *Repo) ListChannelProducts(ctx context.Context, tag string, keyword, sort string, page, pageSize int) ([]Product, int64, error)
```
Reuse the ProductQuery struct? ProductQuery has Tags []string which uses FIND_IN_SET. I can extend ProductQuery with a `ChannelTag string` field... but ProductQuery is in repo.go which I can modify (product dir is mine). But other workers may be editing product/repo.go? No — product dir is exclusively mine. But to minimize conflicts with the "other worker" concerns (they don't touch product), it's fine to modify repo.go. Still, I'd rather not touch existing files unnecessarily; I'll create a separate repo method in channel.go with its own query struct.

Let me define in channel.go:

```go
// channelProductQuery 描述频道商品查询条件。
type channelProductQuery struct {
	Keyword string
	Tag     string
	Sort    string
	Page    int
	PageSize int
}
```

And implement with a copy of the product filter logic (status on-shelf, keyword, tag).

Wait — should channel products include only on-shelf (status=2)? Yes, public channel page shows on-shelf products. I'll filter status = StatusOnShelf.

Sort options: default|sales|price_asc|price_desc|newest. Default: sales desc, id desc.

For the channel tag matching, I need the mapping. Let me write:

```go
// channelTypeTags 描述频道类型与商品标签的对应关系。
//
// channels 表与 products 表之间没有直接的外键关联，
// 频道与商品的对应关系通过商品 tags 字段中的标签来表达。
var channelTypeTags = map[int32]string{
	4: "限时", // 限时
	5: "预售", // 预售
	6: "清仓", // 清仓
	7: "包邮", // 包邮
	8: "跨境", // 跨境
	9: "生鲜", // 楼层/生鲜
}
```
Hmm type 9 is 楼层 per the proto comment, but the seed's 9th channel is 生鲜 (code "fresh"). The proto comment says "9 楼层". The seed says type 9 = 生鲜? The seed data: id 9, code fresh, type 9. And the task description says channels: 推荐/新品/热销/限时/预售/清仓/包邮/跨境/生鲜 → 9 channels, so type 9 = 生鲜 in the seed. The proto comment says 9=楼层. Conflict. I'll handle it by using the channel `code` as the primary key for tag mapping, falling back to type:

```go
// channelCodeTags 频道编码与商品标签的映射。
var channelCodeTags = map[string]string{
	"flash":     "限时",
	"presale":   "预售",
	"clearance": "清仓",
	"freeship":  "包邮",
	"cross":     "跨境",
	"fresh":     "生鲜",
}
```
and type fallback map for 4..8.

Plus: also try the channel's own name as a tag if it's not a generic word. Generic words: 推荐, 新品, 热销, 楼层. Actually if a channel's name is "包邮" then code map covers it. I'll implement: tags := []string{}; if v, ok := channelCodeTags[code]; ok → append; else if v, ok := channelTypeTags[type] → append; plus if the channel name is not in a generic set, append the name too.

Hmm, this could get convoluted. Let me simplify to a clear rule:

```
// channelProductTags 返回频道对应的商品标签过滤条件。
//
// 优先按频道编码匹配，其次按频道类型匹配；
// 若两者都无法定位，则退化为使用频道名称（排除"推荐/新品/热销"等泛化名称）。
func channelProductTags(c *Channel) []string {
	if c == nil { return nil }
	if tag, ok := channelCodeTags[c.Code]; ok { return []string{tag} }
	if tag, ok := channelTypeTags[c.Type]; ok { return []string{tag} }
	switch c.Name {
	case "推荐", "新品", "热销", "楼层":
		return nil
	}
	if c.Name != "" { return []string{c.Name} }
	return nil
}
```

Then in the query: if len(tags)>0 → `tx.Where("FIND_IN_SET(?, tags)", tag)` for each tag (AND). If a channel yields multiple tags, AND is restrictive; use OR: `tx.Where("(FIND_IN_SET(?, tags) OR FIND_IN_SET(?, tags))", t1, t2)`. With one tag it simplifies. I'll build an OR group.

For type 1/2/3 (推荐/新品/热销) no tag → all on-shelf products, with the default sort differing: 推荐 → sales desc; 新品 → newest; 热销 → sales desc. But the request's `sort` param should take precedence; default sort when not specified could be derived from the channel type. I'll implement: if req.Sort is empty → derive from channel type (2 新品 → newest, 3 热销 → sales, else sales). That's sensible.

Now the `product_count` update: after computing the total, update channels.product_count = total. Real behavior.

Now let me write the code. I'll be careful about gorm and column naming.

One important detail: `Channel.Status` — status 1 enabled, 0 disabled. For ListChannelProducts, if channel status is 0 (disabled), should we return products? I'll still return (admin preview) — no, better to return them; the public client wouldn't request a disabled channel. Keep it simple: return products regardless of status.

Now writing the product files.

Also `product/question.go` needs a local User model to fetch nickname. Let me define:

```go
// questionUser 是用户表在商品域的只读投影，用于补全提问人昵称。
type questionUser struct {
	ID       uint64 `gorm:"primaryKey;autoIncrement" json:"id"`
	Nickname string `gorm:"type:varchar(64);not null;default:''" json:"nickname"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}
func (questionUser) TableName() string { return "users" }
```
Careful: gorm will try to use this model for Create/Update — we only read. But `Model(&questionUser{})` for Select("nickname") is fine.

Wait, one risk: gorm's AutoMigrate isn't run on these (the service presumably calls AutoMigrate for its models). Let me check the bootstrap to see if AutoMigrate is called with the domain's models — if so, adding a `users` model could trigger a migration on the users table! That would be bad (other worker's table). Let me check.
````

</details>

<details><summary>🛠 grep</summary>

```
cmd/inventory-service/main.go:17-	"github.com/shopstack/platform/backend/internal/inventory"
cmd/inventory-service/main.go:18-	"github.com/shopstack/platform/backend/internal/logger"
cmd/inventory-service/main.go:19-)
cmd/inventory-service/main.go:20-
cmd/inventory-service/main.go:21-func main() {
cmd/inventory-service/main.go:22-	err := bootstrap.Run("inventory-service", bootstrap.Options{
cmd/inventory-service/main.go:23:		AutoMigrate:            true,
cmd/inventory-service/main.go:24-		AllowMissingMiddleware: true,
cmd/inventory-service/main.go:25-		Models: []any{
cmd/inventory-service/main.go:26-			&inventory.Inventory{},
cmd/inventory-service/main.go:27-			&inventory.InventoryLog{},
cmd/inventory-service/main.go:28-		},
cmd/inventory-service/main.go:29-		Setup: func(ctx context.Context, app *bootstrap.App, srv *grpc.Server) error {
--
cmd/notification-service/main.go:18-)
cmd/notification-service/main.go:19-
cmd/notification-service/main.go:20-func main() {
cmd/notification-service/main.go:21-	holder := &notification.ServiceHolder{}
cmd/notification-service/main.go:22-
cmd/notification-service/main.go:23-	err := bootstrap.Run("notification-service", bootstrap.Options{
cmd/notification-service/main.go:24:		AutoMigrate:            true,
cmd/notification-service/main.go:25-		AllowMissingMiddleware: true,
cmd/notification-service/main.go:26-		Models: []any{
cmd/notification-service/main.go:27-			&notification.Notification{},
cmd/notification-service/main.go:28-			&notification.SmsRecord{},
cmd/notification-service/main.go:29-			&notification.AuditLog{},
cmd/notification-service/main.go:30-		},
--
cmd/marketing-service/main.go:18-)
cmd/marketing-service/main.go:19-
cmd/marketing-service/main.go:20-func main() {
cmd/marketing-service/main.go:21-	holder := &marketing.ServiceHolder{}
cmd/marketing-service/main.go:22-
cmd/marketing-service/main.go:23-	err := bootstrap.Run("marketing-service", bootstrap.Options{
cmd/marketing-service/main.go:24:		AutoMigrate:            true,
cmd/marketing-service/main.go:25-		AllowMissingMiddleware: true,
cmd/marketing-service/main.go:26-		Models: []any{
cmd/marketing-service/main.go:27-			&marketing.Coupon{},
cmd/marketing-service/main.go:28-			&marketing.UserCoupon{},
cmd/marketing-service/main.go:29-			&marketing.Promotion{},
cmd/marketing-service/main.go:30-		},
--
cmd/logistics-service/main.go:18-)
cmd/logistics-service/main.go:19-
cmd/logistics-service/main.go:20-func main() {
cmd/logistics-service/main.go:21-	holder := &logistics.ServiceHolder{}
cmd/logistics-service/main.go:22-
cmd/logistics-service/main.go:23-	err := bootstrap.Run("logistics-service", bootstrap.Options{
cmd/logistics-service/main.go:24:		AutoMigrate:            true,
cmd/logistics-service/main.go:25-		AllowMissingMiddleware: true,
cmd/logistics-service/main.go:26-		Models: []any{
cmd/logistics-service/main.go:27-			&logistics.Shipment{},
cmd/logistics-service/main.go:28-			&logistics.ShipmentTrack{},
cmd/logistics-service/main.go:29-			&logistics.LogisticTemplate{},
cmd/logistics-service/main.go:30-		},
--
cmd/payment-service/main.go:17-	"github.com/shopstack/platform/backend/internal/logger"
cmd/payment-service/main.go:18-	"github.com/shopstack/platform/backend/internal/payment"
cmd/payment-service/main.go:19-)
cmd/payment-service/main.go:20-
cmd/payment-service/main.go:21-func main() {
cmd/payment-service/main.go:22-	err := bootstrap.Run("payment-service", bootstrap.Options{
cmd/payment-service/main.go:23:		AutoMigrate:            true,
cmd/payment-service/main.go:24-		AllowMissingMiddleware: true,
cmd/payment-service/main.go:25-		Models: []any{
cmd/payment-service/main.go:26-			&payment.Payment{},
cmd/payment-service/main.go:27-			&payment.PaymentRefund{},
cmd/payment-service/main.go:28-		},
cmd/payment-service/main.go:29-		Setup: func(ctx context.Context, app *bootstrap.App, srv *grpc.Server) error {
--
cmd/order-service/main.go:18-	"github.com/shopstack/platform/backend/internal/mq"
cmd/order-service/main.go:19-	"github.com/shopstack/platform/backend/internal/order"
cmd/order-service/main.go:20-)
cmd/order-service/main.go:21-
cmd/order-service/main.go:22-func main() {
cmd/order-service/main.go:23-	err := bootstrap.Run("order-service", bootstrap.Options{
cmd/order-service/main.go:24:		AutoMigrate:            true,
cmd/order-service/main.go:25-		AllowMissingMiddleware: true,
cmd/order-service/main.go:26-		Models: []any{
cmd/order-service/main.go:27-			&order.Order{},
cmd/order-service/main.go:28-			&order.OrderItem{},
cmd/order-service/main.go:29-			&order.OrderStatusLog{},
cmd/order-service/main.go:30-			&order.Refund{},
--
cmd/product-service/main.go:16-	"github.com/shopstack/platform/backend/internal/logger"
cmd/product-service/main.go:17-	"github.com/shopstack/platform/backend/internal/product"
cmd/product-service/main.go:18-)
cmd/product-service/main.go:19-
cmd/product-service/main.go:20-func main() {
cmd/product-service/main.go:21-	err := bootstrap.Run("product-service", bootstrap.Options{
cmd/product-service/main.go:22:		AutoMigrate:            true,
cmd/product-service/main.go:23-		AllowMissingMiddleware: true,
cmd/product-service/main.go:24-		Models: []any{
cmd/product-service/main.go:25-			&product.Category{},
cmd/product-service/main.go:26-			&product.Product{},
cmd/product-service/main.go:27-			&product.ProductSku{},
cmd/product-service/main.go:28-			&product.ProductImage{},
--
cmd/cart-service/main.go:17-	"github.com/shopstack/platform/backend/internal/cart"
cmd/cart-service/main.go:18-	"github.com/shopstack/platform/backend/internal/logger"
cmd/cart-service/main.go:19-)
cmd/cart-service/main.go:20-
cmd/cart-service/main.go:21-func main() {
cmd/cart-service/main.go:22-	err := bootstrap.Run("cart-service", bootstrap.Options{
cmd/cart-service/main.go:23:		AutoMigrate:            true,
cmd/cart-service/main.go:24-		AllowMissingMiddleware: true,
cmd/cart-service/main.go:25-		Models: []any{
cmd/cart-service/main.go:26-			&cart.CartItem{},
cmd/cart-service/main.go:27-		},
cmd/cart-service/main.go:28-		Setup: func(ctx context.Context, app *bootstrap.App, srv *grpc.Server) error {
cmd/cart-service/main.go:29-			service := cart.NewService(cart.NewRepo(app.DB), app.Registry)
--
cmd/user-service/main.go:17-	"github.com/shopstack/platform/backend/internal/logger"
cmd/user-service/main.go:18-	"github.com/shopstack/platform/backend/internal/user"
cmd/user-service/main.go:19-)
cmd/user-service/main.go:20-
cmd/user-service/main.go:21-func main() {
cmd/user-service/main.go:22-	err := bootstrap.Run("user-service", bootstrap.Options{
cmd/user-service/main.go:23:		AutoMigrate:            true,
cmd/user-service/main.go:24-		AllowMissingMiddleware: true,
cmd/user-service/main.go:25-		Models: []any{
cmd/user-service/main.go:26-			&user.User{},
cmd/user-service/main.go:27-			&user.UserAddress{},
cmd/user-service/main.go:28-			&user.UserFavorite{},
cmd/user-service/main.go:29-			&user.Admin{},
--
internal/database/mysql.go:18-// Options 控制数据库连接行为。
internal/database/mysql.go:19-type Options struct {
internal/database/mysql.go:20-	MaxIdle     int
internal/database/mysql.go:21-	MaxOpen     int
internal/database/mysql.go:22-	MaxLifetime time.Duration
internal/database/mysql.go:23-	LogLevel    string
internal/database/mysql.go:24:	AutoMigrate bool
internal/database/mysql.go:25-	Models      []any
internal/database/mysql.go:26-}
internal/database/mysql.go:27-
internal/database/mysql.go:28-// New 建立数据库连接并执行可选的自动迁移。
internal/database/mysql.go:29-func New(dsn string, opts Options) (*gorm.DB, error) {
internal/database/mysql.go:30-	if opts.MaxIdle <= 0 {
--
internal/database/mysql.go:71-	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
internal/database/mysql.go:72-	defer cancel()
internal/database/mysql.go:73-	if err := sqlDB.PingContext(ctx); err != nil {
internal/database/mysql.go:74-		return nil, fmt.Errorf("数据库连通性检查失败: %w", err)
internal/database/mysql.go:75-	}
internal/database/mysql.go:76-
internal/database/mysql.go:77:	if opts.AutoMigrate && len(opts.Models) > 0 {
internal/database/mysql.go:78:		if err := db.AutoMigrate(opts.Models...); err != nil {
internal/database/mysql.go:79-			return nil, fmt.Errorf("自动迁移失败: %w", err)
internal/database/mysql.go:80-		}
internal/database/mysql.go:81-		shoplogger.L().Info("数据库自动迁移完成", zap.Int("模型数", len(opts.Models)))
internal/database/mysql.go:82-	}
internal/database/mysql.go:83-
internal/database/mysql.go:84-	return db, nil
--
internal/bootstrap/bootstrap.go:38-	Auth      *auth.Manager
internal/bootstrap/bootstrap.go:39-	Providers *thirdparty.Providers
internal/bootstrap/bootstrap.go:40-}
internal/bootstrap/bootstrap.go:41-
internal/bootstrap/bootstrap.go:42-// Options 描述服务的个性化装配方式。
internal/bootstrap/bootstrap.go:43-type Options struct {
internal/bootstrap/bootstrap.go:44:	// AutoMigrate 为 true 时按给定模型自动建表（开发环境便利，生产建议用 SQL 迁移）。
internal/bootstrap/bootstrap.go:45:	AutoMigrate bool
internal/bootstrap/bootstrap.go:46-	// Models 需要自动迁移的模型。
internal/bootstrap/bootstrap.go:47-	Models []any
internal/bootstrap/bootstrap.go:48-	// Consumers 声明该服务订阅的事件。
internal/bootstrap/bootstrap.go:49-	Consumers []mq.Consumer
internal/bootstrap/bootstrap.go:50-	// Setup 在基础设施就绪后执行，用于注册 gRPC 服务与初始化业务对象。
internal/bootstrap/bootstrap.go:51-	Setup func(ctx context.Context, app *App, srv *grpc.Server) error
--
internal/bootstrap/bootstrap.go:82-	// 数据库
internal/bootstrap/bootstrap.go:83-	db, err := database.New(cfg.MySQL.DSN(), database.Options{
internal/bootstrap/bootstrap.go:84-		MaxIdle:     cfg.MySQL.MaxIdle,
internal/bootstrap/bootstrap.go:85-		MaxOpen:     cfg.MySQL.MaxOpen,
internal/bootstrap/bootstrap.go:86-		MaxLifetime: time.Hour,
internal/bootstrap/bootstrap.go:87-		LogLevel:    cfg.Log.Level,
internal/bootstrap/bootstrap.go:88:		AutoMigrate: opts.AutoMigrate,
internal/bootstrap/bootstrap.go:89-		Models:      opts.Models,
internal/bootstrap/bootstrap.go:90-	})
internal/bootstrap/bootstrap.go:91-	if err != nil {
internal/bootstrap/bootstrap.go:92-		return fmt.Errorf("初始化数据库失败: %w", err)
internal/bootstrap/bootstrap.go:93-	}
internal/bootstrap/bootstrap.go:94-	app.DB = db
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:20:40

<details><summary>🧠 思考过程</summary>

```
AutoMigrate uses an explicit Models list in cmd/*/main.go — which I must NOT modify (cmd/ is outside my ownership? The brief says I can only modify backend/internal/product and backend/internal/marketing). So the new models won't be auto-migrated — that's fine since the tables already exist via SQL scripts. I won't add my models to the AutoMigrate list (can't anyway, cmd/ is off-limits).

Note: marketing's AutoMigrate list includes only Coupon, UserCoupon, Promotion — LogisticTemplate (a cross-domain table) is NOT in the list. Good precedent: my local `users`/`user_points_logs` models won't be migrated either.

Now, let's write the code. Start with the product domain.

Let me write `backend/internal/product/channel.go`.

Also need to double check `commonv1.PageRequest` field names: Page, PageSize (used in normalizePage: page.GetPage(), page.GetPageSize()). Good.

Let me now write product/channel.go.
```

</details>

Now I have a clear picture. Let me write the product domain files, starting with channels.

<details><summary>🛠 write</summary>

```
Successfully wrote 12110 bytes to /<WORKSPACE>/shopstack/backend/internal/product/channel.go
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:21:31

<details><summary>🧠 思考过程</summary>

```
I used `time.Time` and `timestamppb` — need imports. Let me fix the import block. Also `isDuplicateKeyError` needs to be defined in the product package (marketing has isDuplicateKey but that's a different package).

Let me fix imports.
```

</details>

<details><summary>🛠 edit</summary>

```
Successfully replaced 1 block(s) in /<WORKSPACE>/shopstack/backend/internal/product/channel.go.
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:21:36

<details><summary>🧠 思考过程</summary>

```
Now I need `isDuplicateKeyError` in the product package. I'll add it to channel.go or a shared spot. Let me add it at the end of channel.go... Actually it's used by SaveChannel; let me create it in channel.go's helper section.

Also note: for status, `c.Status = int8(req.GetStatus())` — if status is 0 (disabled) on update, we set 0 which is correct. On create with status 0 we force enabled=1. Hmm, that prevents creating a disabled channel. That's a bit arbitrary. Let me instead: on create, if req.GetStatus() == 0 → default enabled (1). It's the common pattern. But an admin wanting to create a disabled channel can't. Given proto default 0 = 停用, forcing to 1 on create is a reasonable "default enabled" behavior. I'll keep it but... hmm, it's a bit surprising. Let me keep it simple and consistent with the marketing SaveCoupon behavior (no special casing) — I'll drop the forcing and just store the given status. But then a create with unspecified status creates a disabled channel, and it wouldn't show up anywhere. 

Given Channel proto says status 0 停用 1 启用 and the admin form will send 1 explicitly, I'll keep the default-enabled-on-create logic (documented in the comment).

Now add isDuplicateKeyError helper.
```

</details>

<details><summary>🛠 edit</summary>

```
Successfully replaced 1 block(s) in /<WORKSPACE>/shopstack/backend/internal/product/channel.go.
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:21:49

<details><summary>🧠 思考过程</summary>

```
Oops, that edit was a no-op-ish (removed a newline). Let me instead append the isDuplicateKeyError helper at the end of the file.
```

</details>

<details><summary>🛠 bash</summary>

```
backend/internal/product/channel.go
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:21:58

<details><summary>🛠 bash</summary>

```
fmt-ok
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:22:04

Now the review tags and guarantees files.

<details><summary>🛠 write</summary>

```
Successfully wrote 4352 bytes to /<WORKSPACE>/shopstack/backend/internal/product/review_tag.go
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:22:19

<details><summary>🛠 write</summary>

```
Successfully wrote 4587 bytes to /<WORKSPACE>/shopstack/backend/internal/product/guarantee.go
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:22:36

<details><summary>🧠 思考过程</summary>

```
Now the product params (ListProductParams) and questions.

ListProductParams: from product_attributes.

I'll create `backend/internal/product/params.go`.
```

</details>

<details><summary>🛠 write</summary>

```
Successfully wrote 1298 bytes to /<WORKSPACE>/shopstack/backend/internal/product/params.go
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:22:43

<details><summary>🧠 思考过程</summary>

````
Now the questions file. I need:
- ProductQuestion model (product_questions)
- A local read-only User projection for nickname.
- Repo methods: ListQuestions (with query), FindQuestionByID, CreateQuestion, UpdateQuestion.
- Service: ListProductQuestions, CreateQuestion, ListQuestions, AnswerQuestion.

For CreateQuestion, the user id: `resolveUserID(ctx, req.GetUserId())` — CreateQuestionRequest has no user_id, so pass 0 → auth context. The product package has `auth.UserIDFromContext` used in handler.go. I'll import auth in the product service file.

Wait, requirement 11 says "CreateQuestion 必须用 resolveUserID(ctx, req.GetUserId()) 取当前登录用户，未登录会拿到 0，此时返回未授权错误." — In the product package there's no resolveUserID helper. The pattern exists in marketing. Should I add a resolveUserID to the product package? That would duplicate the name in a different package — that's fine (different package). I'll add `resolveUserID` in the product package within question.go, mirroring the marketing util. But careful: the product package's handler.go uses auth.UserIDFromContext directly. Adding a helper named resolveUserID in product is fine.

Hmm — but CreateQuestionRequest has no UserId field, so `req.GetUserId()` doesn't exist. I'll call `resolveUserID(ctx, 0)`.

Let me write it.

For the reply time format: "2006-01-02 15:04:05".

Also for nickname lookup, define:

```go
// questionUser 是用户表在商品域的只读投影，用于补全提问人昵称。
type questionUser struct {
	ID        uint64         `gorm:"primaryKey;autoIncrement" json:"id"`
	Nickname  string         `gorm:"column:nickname;type:varchar(64);not null;default:''" json:"nickname"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (questionUser) TableName() string { return "users" }
```

Repo: FindUserNickname(ctx, id) (string, error).

Now write the file.
````

</details>

<details><summary>🛠 write</summary>

```
Successfully wrote 9005 bytes to /<WORKSPACE>/shopstack/backend/internal/product/question.go
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:23:17

Now let me add the product handler methods.

<details><summary>🛠 edit</summary>

```
Successfully replaced 1 block(s) in /<WORKSPACE>/shopstack/backend/internal/product/handler.go.
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:23:26

<details><summary>🛠 edit</summary>

```
Successfully replaced 1 block(s) in /<WORKSPACE>/shopstack/backend/internal/product/handler.go.
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:23:31

<details><summary>🛠 bash</summary>

```
# github.com/shopstack/platform/backend/internal/product
backend/internal/product/channel.go:244:29: cannot use channel.Type (variable of type int8) as int32 value in argument to defaultChannelSort
backend/internal/product/channel.go:359:32: cannot use c.Type (variable of type int8) as int32 value in map index
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:23:34

<details><summary>🧠 思考过程</summary>

```
Fix: change channelTypeTags key to int8, and defaultChannelSort param to int8. But channel.Type in proto is int32(c.Type) — fine.

Let me change the map to map[int8]string and the function signature to int8.

But `channelTypeTags` referenced elsewhere? Only in channel.go. Also genericChannelNames uses string.

Also in SaveChannel: `c.Type = int8(req.GetType())`.
```

</details>

<details><summary>🛠 bash</summary>

```
(no output)
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:23:40

<details><summary>🧠 思考过程</summary>

````
Product builds. Now the marketing domain.

Files:
1. `backend/internal/marketing/points.go` — UserPointsAccount (users table) + PointsLog (user_points_logs) + repo method AddPoints.
2. `backend/internal/marketing/signin.go` — SignInRecord model + SignIn + GetSignInStatus.
3. `backend/internal/marketing/task.go` — MarketingTask + UserTask + ListTasks + ClaimTask.
4. `backend/internal/marketing/groupbuy.go` — GroupBuy + GroupBuyMember + ListGroupBuys + GetGroupBuy + JoinGroupBuy + SaveGroupBuy.
5. `backend/internal/marketing/session.go` — PromotionSession + ListPromotionSessions + SavePromotionSession.
6. `backend/internal/marketing/promotion_detail.go` — GetPromotion + ListPromotionProducts (needs product summary reads).
7. `backend/internal/marketing/level.go` — MarketingUserLevel + ListUserLevels.

Let me start with points.go.

```go
// PointsAccount 是用户表在营销域的只读/积分写入投影。
type PointsAccount struct {
	ID        uint64         `gorm:"primaryKey;autoIncrement" json:"id"`
	Points    int64          `gorm:"column:points;not null;default:0" json:"points"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}
func (PointsAccount) TableName() string { return "users" }

// PointsLog 是积分明细模型（user_points_logs 表由用户服务维护，营销域仅写入）。
type PointsLog struct {
	ID        uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID    uint64    `gorm:"column:user_id;not null;index" json:"user_id"`
	Title     string    `gorm:"type:varchar(128);not null;default:''" json:"title"`
	Change    int       `gorm:"not null;default:0" json:"change"`
	Balance   int       `gorm:"not null;default:0" json:"balance"`
	BizType   string    `gorm:"column:biz_type;type:varchar(32);not null;default:''" json:"biz_type"`
	BizID     string    `gorm:"column:biz_id;type:varchar(64);not null;default:''" json:"biz_id"`
	CreatedAt time.Time `json:"created_at"`
}
func (PointsLog) TableName() string { return "user_points_logs" }
```

Repo method:
```go
// AddPoints 为用户增加积分并写入积分流水。
func (r *Repo) AddPoints(ctx context.Context, tx *gorm.DB, userID uint64, points int, title, bizType, bizID string) error
```
Hmm, transaction handling. I want sign-in and claim-task to run in a transaction with their own writes. Let me design:

```go
// AddPoints 在指定事务中给用户增加积分并写入积分流水。
//
// balance 取自 users.points 的最新值，保证流水中的余额与账户一致。
func (r *Repo) AddPoints(ctx context.Context, tx *gorm.DB, userID uint64, points int, title, bizType, bizID string) error {
	if tx == nil {
		tx = r.db.WithContext(ctx)
	}
	var account PointsAccount
	if err := tx.Where("id = ?", userID).First(&account).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errs.New(errs.CodeUserNotFound, "用户不存在")
		}
		return err
	}
	balance := account.Points + int64(points)
	if balance < 0 {
		balance = 0
	}
	if err := tx.Model(&PointsAccount{}).Where("id = ?", userID).
		UpdateColumn("points", balance).Error; err != nil {
		return err
	}
	log := &PointsLog{...}
	return tx.Create(log).Error
}
```

Careful with `tx.Where("id = ?", userID).First(&account)` — account has DeletedAt so soft-delete condition applies. Good.

Note `UpdateColumn` skips hooks and doesn't update updated_at. The user domain uses `Update("points", gorm.Expr("GREATEST(points + ?, 0)", log.Change))` which does update updated_at. I'll use Update with expression to mirror:
`tx.Model(&PointsAccount{}).Where("id = ?", userID).Update("points", gorm.Expr("GREATEST(points + ?, 0)", points))` — but then I need the balance for the log. I can read the account first, compute balance = account.Points + points (clamped), then use the expression update. The expression GREATEST(points + ?, 0) matches. Balance recorded = max(0, account.Points+points). Slight race under concurrency, acceptable.

Let me use a single UPDATE with expression and then re-read? Simpler: do the expression update, then read the account again for the balance. That's 2 queries. I'll do: update with expression, then SELECT points to record balance.

Now the sign-in file.

```go
// SignInRecord 是签到记录模型。
type SignInRecord struct {
	ID             uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID         uint64    `gorm:"column:user_id;not null;index" json:"user_id"`
	SignDate       time.Time `gorm:"column:sign_date;type:date;not null" json:"sign_date"`
	ContinuousDays int       `gorm:"column:continuous_days;not null;default:1" json:"continuous_days"`
	PointsAwarded  int       `gorm:"column:points_awarded;not null;default:0" json:"points_awarded"`
	CreatedAt      time.Time `json:"created_at"`
}
func (SignInRecord) TableName() string { return "sign_in_records" }
```

Careful with time.Time and `type:date` — gorm will store the full datetime; MySQL truncates to date. When reading back, the time will be 00:00:00. For the uniqueness check I'll compare using the formatted date string. To be safe, I'll query with `sign_date = ?` passing the time.Time value (MySQL compares date to date, truncating the parameter). Since MySQL compares a DATE column with a DATETIME parameter by converting the datetime to date, `sign_date = '2026-10-20 14:00:00'` matches the date. Yes, MySQL converts the string/datetime to date for comparison with a DATE column. That works.

But timezone: the container's MySQL timezone vs the Go app timezone. The DATE column stores what gorm sends: the time.Time formatted in the connection's loc parameter. Let's check the DSN config for loc.

Let me check the config for the MySQL DSN.

Actually, to avoid timezone pitfalls, I'll format the date myself: pass the date as a string 'YYYY-MM-DD' in the WHERE clause, and when inserting, set SignDate to a time.Time truncated to the date in the app's local time. gorm will send the datetime, MySQL stores just the date part. If the DSN has loc=Local, then the sent value's date part = the local date. Consistent.

But reading back: sign_date comes back as a time.Time with 00:00:00 in the connection loc. I'll format with `.Format("2006-01-02")` for comparison. Good.

To be extra safe, I'll query by date string: `Where("sign_date = ?", dateStr)` where dateStr = "2026-10-20". MySQL will compare the DATE column with the string → converts the string to a date → match. Good, avoids timezone issues entirely for the query.

For the insert, I need the stored date to be the app-local date. If the DSN's loc differs from Local... Let me check the config.

Let me look at internal/config for the DSN.
````

</details>

<details><summary>🛠 grep</summary>

```
config.go:43-	Port     int      `yaml:"port"`
config.go:44-	User     string   `yaml:"user"`
config.go:45-	Password string   `yaml:"password"`
config.go:46-	Database string   `yaml:"database"`
config.go:47-	Charset  string   `yaml:"charset"`
config.go:48-	MaxIdle  int      `yaml:"max_idle"`
config.go:49-	MaxOpen  int      `yaml:"max_open"`
config.go:50-	Extra    []string `yaml:"extra"`
config.go:51-}
config.go:52-
config.go:53:func (m MySQLConfig) DSN() string {
config.go:54-	charset := m.Charset
config.go:55-	if charset == "" {
config.go:56-		charset = "utf8mb4"
config.go:57-	}
config.go:58-	extra := strings.Join(m.Extra, "&")
config.go:59-	if extra != "" {
config.go:60-		extra = "&" + extra
config.go:61-	}
config.go:62-	return fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?charset=%s&parseTime=True&loc=Local%s",
config.go:63-		m.User, m.Password, m.Host, m.Port, m.Database, charset, extra)
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:24:06

<details><summary>🧠 思考过程</summary>

```
`loc=Local` — the app's local timezone (Asia/Shanghai per the system). Good, so time.Now() local dates match.

Now write points.go and signin.go.

For the sign-in calendar, I need the current month's days. Use time.Now() → year, month. Build days from the 1st to the last day of the month.

Let me write marketing/points.go.
```

</details>

<details><summary>🛠 write</summary>

```
Successfully wrote 2864 bytes to /<WORKSPACE>/shopstack/backend/internal/marketing/points.go
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:24:20

<details><summary>🧠 思考过程</summary>

````
Now signin.go.

Key logic:
- signInBasePoints = 5
- signInContinuousStep = 1
- signInMaxPoints = 20

```go
func signInPoints(continuousDays int) int {
	if continuousDays <= 0 { continuousDays = 1 }
	points := signInBasePoints + (continuousDays-1)*signInContinuousStep
	if points > signInMaxPoints { points = signInMaxPoints }
	return points
}
```

Repo methods:
```go
// FindSignInRecordByDate 查询指定日期的签到记录。
func (r *Repo) FindSignInRecordByDate(ctx, userID uint64, date string) (*SignInRecord, error)
// ListSignInRecords 查询用户的全部签到记录（按日期升序）。
func (r *Repo) ListSignInRecords(ctx, userID uint64) ([]SignInRecord, error)
// CreateSignInRecord 新增签到记录。
func (r *Repo) CreateSignInRecord(ctx, rec *SignInRecord) error
```

For the date column: store as time.Time. When inserting, set SignDate = time.Date(y,m,d,0,0,0,0,loc). gorm will send "2026-10-20 00:00:00" → MySQL stores '2026-10-20'.

Query: `Where("sign_date = ?", dateStr)` with dateStr = "2026-10-20".

Now SignIn:
```go
func (s *Service) SignIn(ctx context.Context, req *marketingv1.SignInRequest) (*marketingv1.GetSignInStatusResponse, error) {
	userID := resolveUserID(ctx, 0)
	if userID <= 0 { return nil, errs.Unauthorized("请先登录后再签到") }
	now := time.Now()
	today := now.Format(signInDateLayout)
	
	// 重复签到校验
	if _, err := s.repo.FindSignInRecordByDate(ctx, userID, today); err == nil {
		return nil, errs.Conflict("今日已签到，请明天再来")
	} else if !errors.Is(err, errs.CodeNotFound) ... 
```
Hmm, FindSignInRecordByDate returns an errs.Error with CodeNotFound when missing. I need to distinguish "not found" from a real DB error. Better: return (nil, nil) when not found, like the marketing repo's FindUserCoupon does. I'll follow that pattern.

Then continuous:
```go
	yesterday := now.AddDate(0,0,-1).Format(signInDateLayout)
	continuous := 1
	if rec, _ := s.repo.FindSignInRecordByDate(ctx, userID, yesterday); rec != nil {
		continuous = rec.ContinuousDays + 1
	}
	points := signInPoints(continuous)
```
Then transaction: create record + add points.

```go
	err := s.repo.DB().WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := s.repo.CreateSignInRecord(ctx, rec); err != nil { return err }
		return s.repo.AddPoints(ctx, tx, userID, points, "每日签到", PointsBizTypeSignIn, today)
	})
```
Careful: CreateSignInRecord uses r.db (not tx) → outside the transaction! I need the create to be inside the tx. Let me make the repo method accept a tx, or add a variant. I'll add tx parameters similar to AddPoints:

```go
func (r *Repo) CreateSignInRecord(ctx context.Context, tx *gorm.DB, rec *SignInRecord) error {
	if tx == nil { tx = r.db.WithContext(ctx) }
	return tx.Create(rec).Error
}
```
Consistent with AddPoints.

On duplicate key error (concurrent sign-in) → return "今日已签到".

After the transaction, build the response via GetSignInStatus-like logic. I'll factor a helper `signInStatus(ctx, userID, now) (*marketingv1.GetSignInStatusResponse, error)` used by both SignIn and GetSignInStatus.

GetSignInStatus:
```go
func (s *Service) GetSignInStatus(ctx, req) (*marketingv1.GetSignInStatusResponse, error) {
	userID := resolveUserID(ctx, 0)
	if userID <= 0 { return nil, errs.Unauthorized("请先登录") }
	return s.signInStatus(ctx, userID, time.Now())
}
```

signInStatus:
- records := ListSignInRecords(userID) → all
- map by date string
- todayRec: today's record
- signedToday := todayRec != nil
- continuous: if signedToday → todayRec.ContinuousDays; else if yesterday's record → yesterday.ContinuousDays; else 0
- totalDays := len(records)
- pointsAwarded := todayRec.PointsAwarded if signedToday else 0
- nextPoints := signInPoints(continuous + 1)
- calendar: for the current month, days 1..lastDay; each: signed = map contains date; points = record.PointsAwarded.

Let me write it.

Note `signInDateLayout = "2006-01-02"`.

Also the "本月已签到日期列表" requirement — the calendar covers that.

Now, one question: does `SignIn` need to also handle the case where the user has no records → continuous 1.

Let's write the file.
````

</details>

<details><summary>🛠 write</summary>

```
Successfully wrote 7806 bytes to /<WORKSPACE>/shopstack/backend/internal/marketing/signin.go
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:24:54

<details><summary>🧠 思考过程</summary>

```
Note: `err == gorm.ErrRecordNotFound` should be `errors.Is(err, gorm.ErrRecordNotFound)`. Let me fix that (gorm returns the sentinel directly, but errors.Is is safer).

Let me fix it now.
```

</details>

<details><summary>🛠 edit</summary>

```
Successfully replaced 1 block(s) in /<WORKSPACE>/shopstack/backend/internal/marketing/signin.go.
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:24:58

<details><summary>🛠 edit</summary>

```
Successfully replaced 1 block(s) in /<WORKSPACE>/shopstack/backend/internal/marketing/signin.go.
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:25:00

<details><summary>🧠 思考过程</summary>

````
Now the task file. 

Models:
```go
// MarketingTask 是营销任务定义模型。
type MarketingTask struct {
	ID            uint64 `gorm:"primaryKey;autoIncrement" json:"id"`
	Name          string `gorm:"type:varchar(64);not null;default:''" json:"name"`
	Description   string `gorm:"type:varchar(512);not null;default:''" json:"description"`
	Type          int8   `gorm:"tinyint;not null;default:1" json:"type"`
	TargetCount   int    `gorm:"column:target_count;not null;default:1" json:"target_count"`
	RewardPoints  int    `gorm:"column:reward_points;not null;default:0" json:"reward_points"`
	RewardCouponID uint64 `gorm:"column:reward_coupon_id;not null;default:0" json:"reward_coupon_id"`
	Sort          int    `gorm:"not null;default:0" json:"sort"`
	Enabled       bool   `gorm:"tinyint;not null;default:1" json:"enabled"`
	Icon          string `gorm:"type:varchar(512);not null;default:''" json:"icon"`
}
func (MarketingTask) TableName() string { return "marketing_tasks" }

// UserTask 是用户任务进度模型。
type UserTask struct {
	ID          uint64     `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID      uint64     `gorm:"column:user_id;not null;uniqueIndex:uk_user_task;index" json:"user_id"`
	TaskID      uint64     `gorm:"column:task_id;not null;uniqueIndex:uk_user_task" json:"task_id"`
	Progress    int        `gorm:"not null;default:0" json:"progress"`
	Completed   bool       `gorm:"tinyint;not null;default:0" json:"completed"`
	Claimed     bool       `gorm:"tinyint;not null;default:0" json:"claimed"`
	CompletedAt *time.Time `gorm:"column:completed_at" json:"completed_at"`
	ClaimedAt   *time.Time `gorm:"column:claimed_at" json:"claimed_at"`
	CreatedAt   time.Time  `json:"created_at"`
}
func (UserTask) TableName() string { return "user_tasks" }
```

Repo:
- ListMarketingTasks(ctx, onlyEnabled bool, page, pageSize) ([]MarketingTask, int64, error)
- FindMarketingTaskByID(ctx, id)
- FindUserTask(ctx, userID, taskID) (*UserTask, error) → (nil,nil) if missing
- ListUserTasksByUser(ctx, userID) ([]UserTask, error)
- ClaimUserTask(ctx, tx, id) (rowsAffected, error): `UPDATE user_tasks SET claimed=1, claimed_at=now WHERE id=? AND claimed=0 AND completed=1`

Service:
- ListTasks(ctx, req): list definitions (enabled only) paginated + user progress.
- ClaimTask(ctx, req): validations + points + optional coupon.

For the coupon reward: `RewardCouponID > 0` → issue a coupon. I need to create a user_coupons record and increment received_quantity. Existing repo methods: FindCouponByID, FindUserCoupon, CountUserCoupons, CreateUserCoupon, IncrementReceived. Note CreateUserCoupon uses r.db (not tx). I need it inside the transaction. I'll add a tx-aware variant... but I can't modify repo.go? I can — marketing/repo.go is in my directory. But modifying it risks conflicting with the marketing worker? No, marketing is mine exclusively. I'll add a new method in task.go instead of modifying repo.go: `createUserCouponTx`.

Hmm, but duplicating logic. Simpler: implement the coupon issuance inside task.go with a dedicated repo method that accepts a tx:

```go
// IssueCoupon 在事务内向用户发放一张优惠券。
func (r *Repo) IssueCoupon(ctx context.Context, tx *gorm.DB, userID, couponID uint64) error
```
It finds the coupon, checks enabled/time window/quantity, creates the user_coupons row and increments received_quantity. That duplicates some of ReceiveCoupon logic but is contained.

Actually, to limit complexity and risk, maybe I should keep the coupon reward simple: if reward_coupon_id > 0, issue it using the same checks as ReceiveCoupon. I'll write a helper in task.go.

Let's write it:

```go
func (r *Repo) IssueCoupon(ctx context.Context, tx *gorm.DB, userID, couponID uint64) error {
	coupon, err := r.FindCouponByID(ctx, couponID)
	if err != nil { return err }
	now := time.Now()
	if !coupon.Enabled { return errs.New(errs.CodeCouponUnavailable, "任务奖励优惠券未启用") }
	if now.Before(coupon.StartTime) || now.After(coupon.EndTime) { return errs.New(errs.CodeCouponExpired, "任务奖励优惠券不在可领取时间") }
	if coupon.TotalQuantity > 0 && coupon.ReceivedQuantity >= coupon.TotalQuantity { return errs.New(errs.CodeCouponUnavailable, "任务奖励优惠券已被领完") }
	existing, err := r.FindUserCoupon(ctx, userID, couponID)
	if err != nil { return err }
	if existing != nil { return errs.New(errs.CodeConflict, "您已领取过该优惠券") }
	uc := &UserCoupon{UserID: userID, CouponID: couponID, Status: UserCouponStatusUnused, ReceivedAt: now}
	if err := tx.Create(uc).Error; err != nil { return err }
	res := tx.Model(&Coupon{}).Where("id = ?", couponID).
		Where("total_quantity <= 0 OR received_quantity < total_quantity").
		UpdateColumn("received_quantity", gorm.Expr("received_quantity + 1"))
	if res.Error != nil { return res.Error }
	if res.RowsAffected == 0 { return errs.New(errs.CodeCouponUnavailable, "任务奖励优惠券已被领完") }
	return nil
}
```

Note: UserCoupon has a unique index (user_id, coupon_id) so a duplicate insert errors → isDuplicateKey handling.

Now ClaimTask flow:
1. userID := resolveUserID(ctx, 0); 0 → Unauthorized.
2. taskID <= 0 → Invalid.
3. task := FindMarketingTaskByID; err → NotFound.
4. !task.Enabled → Invalid/Conflict "任务已下线".
5. userTask := FindUserTask(userID, taskID); if nil → Invalid("任务进度不存在，请先完成对应行为"); if !Completed → Invalid("任务尚未完成"); if Claimed → Conflict("任务奖励已领取").
6. Transaction: claim (conditional update) → rowsAffected 0 → "奖励已领取"; add points; issue coupon if reward_coupon_id > 0.
7. Return UserTask proto.

The returned UserTask needs the task definition fields (name, description, type, target_count, reward_points, reward_coupon_id, icon) + progress/completed/claimed.

Now ListTasks: definitions paginated (enabled only), then load user tasks for the user, merge.

Let me write it.
````

</details>

<details><summary>🛠 write</summary>

```
Successfully wrote 10701 bytes to /<WORKSPACE>/shopstack/backend/internal/marketing/task.go
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:25:49

<details><summary>🧠 思考过程</summary>

```
I used `formatUint64` which doesn't exist. Let me use strconv.FormatUint. Let me fix by importing strconv and using strconv.FormatUint(taskID, 10).
```

</details>

<details><summary>🛠 bash</summary>

```
(no output)
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:25:54

<details><summary>🧠 思考过程</summary>

````
Now the group buy file.

Models:
```go
// GroupBuy 是拼团活动模型。
type GroupBuy struct {
	ID                uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	Name              string    `gorm:"type:varchar(128);not null;default:''" json:"name"`
	Description       string    `gorm:"type:varchar(512);not null;default:''" json:"description"`
	PromotionID       uint64    `gorm:"column:promotion_id;not null;default:0" json:"promotion_id"`
	ProductID         uint64    `gorm:"column:product_id;not null;default:0" json:"product_id"`
	ProductTitle      string    `gorm:"column:product_title;type:varchar(255);not null;default:''" json:"product_title"`
	ProductImage      string    `gorm:"column:product_image;type:varchar(512);not null;default:''" json:"product_image"`
	PriceCents        int64     `gorm:"column:price_cents;not null;default:0" json:"price_cents"`
	OriginalPriceCents int64    `gorm:"column:original_price_cents;not null;default:0" json:"original_price_cents"`
	RequiredMembers   int       `gorm:"column:required_members;not null;default:3" json:"required_members"`
	JoinedMembers     int       `gorm:"column:joined_members;not null;default:0" json:"joined_members"`
	GroupSize         int       `gorm:"column:group_size;not null;default:20" json:"group_size"`
	Status            int8      `gorm:"tinyint;not null;default:0;index" json:"status"`
	StartTime         time.Time `gorm:"column:start_time;type:datetime;not null" json:"start_time"`
	EndTime           time.Time `gorm:"column:end_time;type:datetime;not null" json:"end_time"`
	BannerImage       string    `gorm:"column:banner_image;type:varchar(512);not null;default:''" json:"banner_image"`
	CreatedAt         time.Time `json:"created_at"`
}
func (GroupBuy) TableName() string { return "group_buys" }

// GroupBuyMember 是拼团成员模型。
type GroupBuyMember struct {
	ID          uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	GroupBuyID  uint64    `gorm:"column:group_buy_id;not null;index" json:"group_buy_id"`
	UserID      uint64    `gorm:"column:user_id;not null;index" json:"user_id"`
	UserNickname string   `gorm:"column:user_nickname;type:varchar(64);not null;default:''" json:"user_nickname"`
	JoinedAt    time.Time `json:"joined_at"`
}
func (GroupBuyMember) TableName() string { return "group_buy_members" }
```

Note: the `is_leader` column does not exist. The brief said it does. I'll not use it and document.

Also `order_id` and `status` don't exist in group_buy_members.

Repo:
- ListGroupBuys(ctx, keyword, status, page, pageSize) with time-based status filtering.
- FindGroupBuyByID
- SaveGroupBuy
- ListGroupBuyMembers(ctx, groupBuyID)
- FindGroupBuyMember(ctx, groupBuyID, userID) → (nil, nil)
- CreateGroupBuyMember(ctx, tx, m)
- IncrementJoinedMembers(ctx, tx, id) (rows, error): `UPDATE group_buys SET joined_members = joined_members + 1 WHERE id = ? AND joined_members < group_size`

For the status filter, I need the effective status computed by time:
```go
func realGroupBuyStatus(g *GroupBuy, now time.Time) int {
	if g.Status == GroupBuyStatusOffline { return GroupBuyStatusOffline }
	switch {
	case now.Before(g.StartTime): return GroupBuyStatusNotStarted
	case now.After(g.EndTime): return GroupBuyStatusFinished
	default: return GroupBuyStatusRunning
	}
}
```
Status constants: 0 未开始 1 进行中 2 已结束 3 已下线.

SQL filter:
- status 0: `status != 3 AND start_time > now`
- status 1: `status != 3 AND start_time <= now AND end_time >= now`
- status 2: `status != 3 AND end_time < now`
- status 3: `status = 3`

JoinGroupBuy:
- userID required.
- group buy found.
- status offline → error.
- now < start → "拼团活动未开始"; now > end → "拼团活动已结束".
- quantity: default 1; must be >= 1 and <= group_size (and <= required_members?). Quantity is the number of items the user buys. I'll validate 1 <= quantity <= group_size.
- existing member → "您已参与该拼团".
- transaction: create member; increment joined_members atomically (only if joined_members < group_size); if rows == 0 → "该拼团已满".

Order matters: to avoid creating a member when the group is full, first do the atomic increment, then create the member. If the member creation fails, roll back the transaction (both in the same tx). Good — do the increment first, then insert the member, all inside the tx.

- After success, reload the group buy and return it. "满员后团状态置为已成团" — schema has no such status; I'll keep status as running but the joined_members reaches group_size. I'll document.

Hmm, wait. Let me reconsider: maybe "已成团" could map to status=2 (已结束)? The proto comment says "0 未开始 1 进行中 2 已结束 3 已下线". A completed group (成团) in the UI usually means the group succeeded and orders are created. Since the schema can't represent it, I'll document that I use joined_members/required_members to derive 成团 and keep status=1.

Actually, I could add a derived field... the proto GroupBuy has no "formed" flag. OK, document it.

- GetGroupBuy: returns group_buy + members.
- SaveGroupBuy: create/update. Fill product_title/product_image/original_price_cents from the products table. Need a local product projection in marketing.

Let me create the product projection in a shared marketing file `product_projection.go`:
```go
// ProductSummary 是商品表在营销域的只读投影。
type ProductSummary struct {
	ID            uint64 `gorm:"primaryKey;autoIncrement" json:"id"`
	Title         string `gorm:"column:title;type:varchar(200);not null" json:"title"`
	Cover         string `gorm:"column:cover;type:varchar(512);not null;default:''" json:"cover"`
	MinPriceCents int64  `gorm:"column:min_price_cents;not null;default:0" json:"min_price_cents"`
	MaxPriceCents int64  `gorm:"column:max_price_cents;not null;default:0" json:"max_price_cents"`
	SalesCount    int    `gorm:"column:sales_count;not null;default:0" json:"sales_count"`
	Status        int8   `gorm:"tinyint;not null;default:1" json:"status"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
}
func (ProductSummary) TableName() string { return "products" }

// ProductSkuSummary 是商品规格表在营销域的只读投影。
type ProductSkuSummary struct {
	ID        uint64 `gorm:"primaryKey;autoIncrement" json:"id"`
	ProductID uint64 `gorm:"column:product_id;not null;index" json:"product_id"`
	Stock     int    `gorm:"not null;default:0" json:"stock"`
	Enabled   bool   `gorm:"tinyint;not null;default:1" json:"enabled"`
}
func (ProductSkuSummary) TableName() string { return "product_skus" }
```

Repo methods:
- FindProductSummary(ctx, id) (*ProductSummary, error)
- ProductStockTotal(ctx, productID) (int, error): SELECT COALESCE(SUM(stock),0) FROM product_skus WHERE product_id = ? AND enabled = 1

I'll put this in `product_projection.go` in the marketing dir, and use it in groupbuy.go and promotion_detail.go.

Let me write groupbuy.go now.
````

</details>

<details><summary>🛠 write</summary>

```
Successfully wrote 14948 bytes to /<WORKSPACE>/shopstack/backend/internal/marketing/groupbuy.go
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:26:48

<details><summary>🧠 思考过程</summary>

````
Need to fix imports in groupbuy.go: strings, timestamppb. Also I referenced s.repo.FindUserNickname and s.repo.FindProductSummary which need to be defined in the marketing package.

Let me create `product_projection.go` in marketing with:
- ProductSummary model (products)
- ProductSkuSummary model (product_skus)
- FindProductSummary(ctx, id)
- FindUserNickname(ctx, id) → use PointsAccount? I defined PointsAccount with only points. I need a nickname too. Let me add a separate UserProfile model with id + nickname. Or extend PointsAccount with Nickname — it's a projection of users, so adding nickname is fine. But AddPoints selects `First(&account)` which would fetch all columns including nickname — fine.

Hmm, cleaner: create `UserProfile` model in a `user_projection.go` with ID, Nickname, Points, DeletedAt, and use it for both nickname lookup and points. Then PointsAccount becomes redundant. Let me merge: rename PointsAccount → UserProfile in points.go and add Nickname. Let me restructure:

In points.go:
```go
// UserProfile 是用户表在营销域的只读投影。
type UserProfile struct {
	ID        uint64         `gorm:"primaryKey;autoIncrement" json:"id"`
	Nickname  string         `gorm:"column:nickname;type:varchar(64);not null;default:''" json:"nickname"`
	Points    int64          `gorm:"column:points;not null;default:0" json:"points"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}
func (UserProfile) TableName() string { return "users" }
```
And a repo method FindUserNickname.

Then AddPoints uses UserProfile.

Let me update points.go accordingly and add FindUserNickname.

Also FindProductSummary + ProductStockTotal in a new file `product_projection.go`.

Let me do these edits.
````

</details>

<details><summary>🛠 bash</summary>

```
backend/internal/marketing/groupbuy.go
ok
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:26:57

<details><summary>🛠 write</summary>

```
Successfully wrote 2451 bytes to /<WORKSPACE>/shopstack/backend/internal/marketing/product_projection.go
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:27:05

<details><summary>🛠 bash</summary>

```
# github.com/shopstack/platform/backend/internal/marketing
backend/internal/marketing/signin.go:93:54: cannot use userID (variable of type int64) as uint64 value in argument to s.repo.FindSignInRecordByDate
backend/internal/marketing/signin.go:104:53: cannot use userID (variable of type int64) as uint64 value in argument to s.repo.FindSignInRecordByDate
backend/internal/marketing/signin.go:112:19: cannot use userID (variable of type int64) as uint64 value in struct literal
backend/internal/marketing/signin.go:122:36: cannot use userID (variable of type int64) as uint64 value in argument to s.repo.AddPoints
backend/internal/marketing/signin.go:135:29: cannot use userID (variable of type int64) as uint64 value in argument to s.signInStatus
backend/internal/marketing/signin.go:144:29: cannot use userID (variable of type int64) as uint64 value in argument to s.signInStatus
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:27:09

<details><summary>🛠 bash</summary>

```
(no output)
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:27:13

<details><summary>🧠 思考过程</summary>

````
Marketing builds so far. Now the promotion session + promotion detail + levels.

`backend/internal/marketing/session.go`:
- PromotionSession model
- Repo: ListPromotionSessions(ctx, promotionID, page, pageSize), FindPromotionSessionByID, SavePromotionSession, FindOverlappingSession(ctx, promotionID, start, end, excludeID)
- Service: ListPromotionSessions, SavePromotionSession

Session status: 0 未开始 1 进行中 2 已结束 → compute from time.

SavePromotionSession:
- promotion_id required; promotion must exist (FindPromotionByID).
- name required.
- start/end required, start < end (parseTimeRange).
- overlap check: existing session with start_time < end AND end_time > start (excluding the same id) → error "场次时间与已有场次重叠".
- create or update.

Now `backend/internal/marketing/promotion_detail.go`:
- GetPromotion: GetPromotionResponse{promotion, products, sessions}
- ListPromotionProducts: paginated list of the promotion's products.

The promotion has a single product_id. For ListPromotionProducts, return the promotion's product if set. To make it meaningful with pagination, I return the single product with meta (total=1).

Hmm, is there any other source of promotion products? The `promotions` table has product_id; group_buys reference promotion_id + product_id. So for a group-buy promotion, I could also include the group buy's products. Let me include products from:
1. the promotion's product_id
2. group buys linked to the promotion (promotion_id) → their product_id

That gives a richer, real list. I'll implement: collect product IDs from the promotion + its group buys, dedupe, then load the product summaries and paginate.

That's a nice real implementation. Let me do that.

Repo methods needed:
- ListPromotionProductIDs(ctx, promotionID) ([]uint64, error): from promotions.product_id + group_buys.product_id where promotion_id = ?

Then a method to load product summaries by IDs with stock totals:
- ListProductSummariesByIDs(ctx, ids) ([]ProductSummary, error)

For the stock total I need per-product SKU sums. I'll fetch all SKUs for the given product IDs and sum per product:
- ProductStockTotals(ctx, productIDs []uint64) (map[uint64]int, error)

Let me write:

```go
func (r *Repo) ProductStockTotals(ctx context.Context, productIDs []uint64) (map[uint64]int, error) {
	out := map[uint64]int{}
	if len(productIDs) == 0 { return out, nil }
	type row struct {
		ProductID uint64
		Total     int
	}
	var rows []row
	err := r.db.WithContext(ctx).Model(&ProductSkuSummary{}).
		Where("product_id IN ? AND enabled = ?", productIDs, true).
		Select("product_id, COALESCE(SUM(stock),0) AS total").
		Group("product_id").Scan(&rows).Error
	...
}
```
Then ProductStockTotal can be dropped, or kept. I'll keep only the plural version and remove the singular to avoid dead code. Actually I'll use the plural one everywhere. Let me remove ProductStockTotal from product_projection.go.

Now the levels file:
`backend/internal/marketing/level.go`:
- MarketingUserLevel model (user_levels)
- Repo: ListUserLevels(ctx) ([]MarketingUserLevel, error) ordered by level
- Service: ListUserLevels(ctx, req) → response with levels; benefits parsed from a JSON array string.

Let me write these three files.
````

</details>

<details><summary>🛠 write</summary>

```
Successfully wrote 7334 bytes to /<WORKSPACE>/shopstack/backend/internal/marketing/session.go
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:27:41

<details><summary>🧠 思考过程</summary>

```
Issues:
1. `strings` not imported in session.go.
2. `_ = promo` — dead code, remove. I used `promo` only for existence validation. Let me use `_` for the variable: `if _, err := s.repo.FindPromotionByID(...); err != nil { return nil, err }`.

Let me fix both.

Also `realSessionStatus` uses the `status` column? The stored status may be stale. I compute from time, ignoring the stored status. That's fine and matches "按时间推导".

Hmm, but then the stored `status` column is never updated. It's fine — I write the initial value.

Let me fix session.go.
```

</details>

<details><summary>🛠 bash</summary>

```
ok
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:27:46

Now the promotion detail (GetPromotion / ListPromotionProducts) and user levels.

<details><summary>🛠 write</summary>

```
Successfully wrote 6006 bytes to /<WORKSPACE>/shopstack/backend/internal/marketing/promotion_detail.go
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:28:01

<details><summary>🧠 思考过程</summary>

````
Issue: the `ProductIDs` struct used with `Select("product_id").Scan(&promo)` — gorm's Scan into a struct with a slice field won't populate the slice. That won't work. Let me use a slice-of-struct approach instead:

```go
var rows []struct {
	ProductID uint64 `gorm:"column:product_id"`
}
err := r.db.WithContext(ctx).Model(&Promotion{}).Where(...).Select("product_id").Scan(&rows).Error
```
That works with gorm (Scan into a slice of structs). Let me rewrite those two queries.

Also remove the ProductIDs type.

Let me fix.
````

</details>

<details><summary>🛠 bash</summary>

```
ok
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:28:08

<details><summary>🛠 write</summary>

```
Successfully wrote 3372 bytes to /<WORKSPACE>/shopstack/backend/internal/marketing/level.go
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:28:16

Now the marketing handler methods:

<details><summary>🛠 edit</summary>

```
Successfully replaced 1 block(s) in /<WORKSPACE>/shopstack/backend/internal/marketing/handler.go.
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:28:25

<details><summary>🛠 bash</summary>

```
(no output)
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:28:28

<details><summary>🧠 思考过程</summary>

```
Both build and vet pass. Now let me verify the implementations actually work against the database. Let me write a temporary integration test in a temp directory (not in the repo, or in the repo but deleted after). Actually I can write a Go test file in the marketing package temporarily and run it, then delete it. But test files inside the package dir would be "new files in my dir" — allowed, but I should delete them after to keep the deliverable clean. Actually a real test file could be valuable... but the brief says don't create extra files. I'll create a temporary test, run it, then remove it.

Let me check how the DB is configured (config yaml) for the test connection.

Let me look at the config to get the DSN for port 13306.
```

</details>

<details><summary>🛠 bash</summary>

```
docker-compose.yml
mysql
nginx
deploy/docker-compose.yml
scripts/dev-up.sh:10:# 前置条件：MySQL(13306) / Redis(6379) / RabbitMQ(5672) 已就绪
scripts/dev-up.sh:18:export SHOP_MYSQL_PORT="${SHOP_MYSQL_PORT:-13306}"
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:28:33

<details><summary>🛠 bash</summary>

```
#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# ShopStack 本地开发启动脚本（不依赖 Docker Compose）
#
# 用法:
#   ./scripts/dev-up.sh            # 启动全部后端服务 + 网关
#   ./scripts/dev-up.sh --no-gw    # 只启动微服务
#   ./scripts/dev-down.sh          # 停止全部
#
# 前置条件：MySQL(13306) / Redis(6379) / RabbitMQ(5672) 已就绪
# ---------------------------------------------------------------------------
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN_DIR="${SHOP_BIN_DIR:-/tmp/shopstack-bin}"
LOG_DIR="${SHOP_LOG_DIR:-/tmp/shopstack-logs}"

export SHOP_MYSQL_PORT="${SHOP_MYSQL_PORT:-13306}"
export SHOP_REDIS_ADDR="${SHOP_REDIS_ADDR:-127.0.0.1:6379}"
export SHOP_RABBITMQ_URL="${SHOP_RABBITMQ_URL:-amqp://shopstack:shopstack@127.0.0.1:5672/}"
export SHOP_NACOS_ENABLED="${SHOP_NACOS_ENABLED:-false}"
export SHOP_LOG_LEVEL="${SHOP_LOG_LEVEL:-info}"

mkdir -p "$BIN_DIR" "$LOG_DIR"

SERVICES=(
  "user-service:9001"
  "product-service:9002"
  "cart-service:9003"
  "order-service:9004"
  "payment-service:9005"
  "inventory-service:9006"
  "marketing-service:9007"
  "logistics-service:9008"
  "notification-service:9009"
)

echo "==> 编译后端服务"
cd "$ROOT"
export GOPROXY="${GOPROXY:-https://goproxy.cn,direct}"
export GOFLAGS="${GOFLAGS:--mod=mod}"
for entry in "${SERVICES[@]}"; do
  name="${entry%%:*}"
  echo "    - $name"
  go build -o "$BIN_DIR/$name" "./backend/cmd/$name"
done
if [[ "${1:-}" != "--no-gw" ]]; then
  echo "    - gateway"
  go build -o "$BIN_DIR/gateway" "./backend/cmd/gateway"
fi

echo "==> 启动服务"
start_service() {
  local name="$1" port="$2"
  pkill -f "$BIN_DIR/$name" 2>/dev/null || true
  sleep 0.3
  SHOP_GRPC_ADDR=":$port" SHOP_SERVICE_NAME="$name" \
    "$BIN_DIR/$name" > "$LOG_DIR/$name.log" 2>&1 &
  echo "    $name  :$port  (日志: $LOG_DIR/$name.log)"
}
backend/configs:
cart-service.yaml
gateway.yaml
inventory-service.yaml
logistics-service.yaml
marketing-service.yaml
notification-service.yaml
order-service.yaml
payment-service.yaml
product-service.yaml
user-service.yaml
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:28:36

<details><summary>🛠 bash</summary>

```
# marketing-service 服务配置
service_name: marketing-service
env: dev

server:
  grpc_addr: ":9007"
  http_addr: ":0"
  timeout: 30

mysql:
  host: 127.0.0.1
  port: 3306
  user: shopstack
  password: shopstack
  database: shopstack
  charset: utf8mb4
  max_idle: 10
  max_open: 100
  extra:
    - parseTime=True
    - loc=Local

redis:
  addr: 127.0.0.1:6379
  password: ""
  db: 0
  pool_size: 50

rabbitmq:
  url: amqp://shopstack:shopstack@127.0.0.1:5672/
  exchange: shopstack.events
  exchange_type: topic
  prefetch: 10

nacos:
  enabled: false
  server_addr: 127.0.0.1:8848
  namespace: public
  group: DEFAULT_GROUP
  register_ip: 127.0.0.1
  register_port: 9007

jwt:
  secret: shopstack-dev-secret-change-me
  access_expire: 7200
  refresh_expire: 604800
  admin_secret: shopstack-dev-admin-secret-change-me
  admin_access_expire: 7200
  admin_refresh_expire: 604800

log:
  level: info
  format: console
  output: stdout

third_party:
  wechat_app_id: ""
  wechat_app_secret: ""
  wechat_mch_id: ""
  wechat_api_key: ""
  wechat_notify_url: ""
  sms_provider: mock
  sms_access_key: ""
  sms_secret: ""
  sms_sign_name: ShopStack
  oss_provider: mock
  oss_access_key: ""
  oss_secret_key: ""
  oss_bucket: ""
  oss_endpoint: ""
  oss_public_url: ""

# 下游服务地址（容器内通过环境变量覆盖为服务名）
services:
  user: 127.0.0.1:9001
  product: 127.0.0.1:9002
  cart: 127.0.0.1:9003
  order: 127.0.0.1:9004
  payment: 127.0.0.1:9005
  inventory: 127.0.0.1:9006
  marketing: 127.0.0.1:9007
  logistics: 127.0.0.1:9008
  notification: 127.0.0.1:9009
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:28:38

<details><summary>🧠 思考过程</summary>

```
Now let me write a temporary integration test to exercise the new RPCs against the real DB (port 13306). I'll create it in the marketing and product packages as `_integration_test.go` files, run them, then delete.

I need the auth context to inject a user ID. Let me check the auth package for a way to create a context with a user ID (for tests).
```

</details>

<details><summary>🛠 bash</summary>

```
181:	ctxKeyUserID      ctxKey = "auth.user_id"
190:	ctx = context.WithValue(ctx, ctxKeyUserID, userID)
204:	if v, ok := ctx.Value(ctxKeyUserID).(int64); ok {
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:28:41

<details><summary>🛠 bash</summary>

```
backend/internal/auth/jwt.go-169-		return nil, errs.New(errs.CodeTokenInvalid, "令牌类型不正确")
backend/internal/auth/jwt.go-170-	}
backend/internal/auth/jwt.go-171-	return claims, nil
backend/internal/auth/jwt.go-172-}
backend/internal/auth/jwt.go-173-
backend/internal/auth/jwt.go-174-// ---------------------------------------------------------------------------
backend/internal/auth/jwt.go-175-// 上下文
backend/internal/auth/jwt.go-176-// ---------------------------------------------------------------------------
backend/internal/auth/jwt.go-177-
backend/internal/auth/jwt.go-178-type ctxKey string
backend/internal/auth/jwt.go-179-
backend/internal/auth/jwt.go-180-const (
backend/internal/auth/jwt.go:181:	ctxKeyUserID      ctxKey = "auth.user_id"
backend/internal/auth/jwt.go-182-	ctxKeyUsername    ctxKey = "auth.username"
backend/internal/auth/jwt.go-183-	ctxKeySubject     ctxKey = "auth.subject"
backend/internal/auth/jwt.go-184-	ctxKeyPermissions ctxKey = "auth.permissions"
backend/internal/auth/jwt.go-185-	ctxKeyRequestID   ctxKey = "auth.request_id"
backend/internal/auth/jwt.go-186-)
backend/internal/auth/jwt.go-187-
backend/internal/auth/jwt.go-188-// WithIdentity 把身份信息写入 context。
backend/internal/auth/jwt.go-189-func WithIdentity(ctx context.Context, userID int64, username, subject string, permissions []string) context.Context {
backend/internal/auth/jwt.go:190:	ctx = context.WithValue(ctx, ctxKeyUserID, userID)
--
backend/internal/auth/jwt.go-192-	ctx = context.WithValue(ctx, ctxKeySubject, subject)
backend/internal/auth/jwt.go-193-	ctx = context.WithValue(ctx, ctxKeyPermissions, permissions)
backend/internal/auth/jwt.go-194-	return ctx
backend/internal/auth/jwt.go-195-}
backend/internal/auth/jwt.go-196-
backend/internal/auth/jwt.go-197-// WithRequestID 把请求 ID 写入 context。
backend/internal/auth/jwt.go-198-func WithRequestID(ctx context.Context, requestID string) context.Context {
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:28:44

<details><summary>🧠 思考过程</summary>

```
`auth.WithIdentity(ctx, userID, username, subject, permissions)` — I can use that in tests.

Now let me write a temporary test file in the marketing package and one in the product package. I'll place them under a temp dir outside the repo? Go tests must be in the package dir. I'll create `backend/internal/marketing/tmp_integration_test.go` and delete it after running.

Test plan (marketing):
1. Connect to MySQL at 127.0.0.1:13306.
2. Create Service with NewRepo(db).
3. ctx with user id 1 (check a user exists).
4. SignIn → check response; SignIn again → expect error "今日已签到".
5. GetSignInStatus.
6. ListTasks → check tasks returned.
7. ClaimTask → need a completed user_task. The seed has no user_tasks rows. I'll insert one directly via SQL in the test (progress=target, completed=1) and then claim.
8. ListGroupBuys, GetGroupBuy, JoinGroupBuy (need a running group buy: id 1 start 2026-10-13 end 2026-11-12 — current date is 2026-10-20, so running).
9. GetPromotion(4), ListPromotionProducts(4), ListPromotionSessions(3), SavePromotionSession (check overlap error).
10. ListUserLevels.

Product tests:
1. ListChannels, GetChannel, ListChannelProducts (channel 1 recommend, channel 7 freeship → should return product 7).
2. ListReviewTags, SaveReviewTag, DeleteReviewTag.
3. ListGuarantees, SaveGuarantee, DeleteGuarantee.
4. ListProductParams (product 1 — check product_attributes has rows).
5. CreateQuestion (needs auth ctx), ListProductQuestions, ListQuestions, AnswerQuestion.

Let me check product_attributes rows exist.

Let me write the tests. I need to be careful to clean up test data (e.g., sign-in records I create). The sign-in record for user 1 on today's date will persist. I'll use a test user id that exists and clean up afterwards, or just accept the leftover records (they're seed DB). Better: clean up after the test.

Let me check which users exist.
```

</details>

<details><summary>🛠 bash</summary>

```
mysql: [Warning] Using a password on the command line interface can be insecure.
id	username	nickname	points
1	demo	演示用户	1200
2	alice	爱丽丝	300
3	bob	鲍勃	80
4	t5188	t5188	100
5	wx_mock_openid_eee8e1f757d452c2	微信用户	100
COUNT(*)
22
id	product_id	name	value	sort
1	1	屏幕	6.7 英寸 2K LTPO 直屏	1
2	1	处理器	旗舰 4nm 八核	2
3	1	电池	5000mAh / 100W 快充	3
4	1	主摄	5000 万像素 OIS	4
5	2	屏幕	14 英寸 2.8K 120Hz	1
id	user_id	task_id	progress	completed	claimed	completed_at	claimed_at	created_at
1	1	1	1	1	1	NULL	NULL	2026-10-20 06:03:19
2	1	2	3	0	0	NULL	NULL	2026-10-20 06:03:19
3	1	5	0	0	0	NULL	NULL	2026-10-20 06:03:19
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:28:57

<details><summary>🧠 思考过程</summary>

```
user_tasks already has data for user 1: task 1 completed=1 claimed=1 (already claimed → claim should error "任务奖励已领取"), task 2 completed=0, task 5 completed=0.

For the claim test I'll insert a temp user_task row for user 1 with a task that's completed but not claimed, then claim it, then verify and clean up.

Let me now write the temporary test files.

Note the DB is at 127.0.0.1:13306 (host port). Let me verify the port is reachable from the host.
```

</details>

<details><summary>🛠 bash</summary>

```
Connection to 127.0.0.1 port 13306 [tcp/*] succeeded!
port open
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:29:00

<details><summary>🛠 write</summary>

```
Successfully wrote 8451 bytes to /<WORKSPACE>/shopstack/backend/internal/marketing/tmp_integration_test.go
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:29:23

<details><summary>🛠 bash</summary>

```
go: finding module for package gorm.io/gorm/driver/mysql
# github.com/shopstack/platform/backend/internal/marketing
backend/internal/marketing/tmp_integration_test.go:10:2: module gorm.io/gorm@latest found (v1.31.2), but does not contain package gorm.io/gorm/driver/mysql
FAIL	github.com/shopstack/platform/backend/internal/marketing [setup failed]
FAIL
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:29:28

<details><summary>🛠 bash</summary>

```
18:	gorm.io/driver/mysql v1.5.7
19:	gorm.io/gorm v1.25.12
25:	github.com/go-sql-driver/mysql v1.7.0 // indirect
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:29:30

<details><summary>🧠 思考过程</summary>

```
The driver is `gorm.io/driver/mysql`, not `gorm.io/gorm/driver/mysql`. Let me fix the import.

Also, "go: finding module for package gorm.io/gorm/driver/mysql" — it tried to fetch @latest which may have modified go.mod! Let me check git status... The repo isn't a git repo ("Is a git repository: false"). Let me check go.mod for changes.

Hmm, `go: finding module for package` with GOFLAGS=-mod=mod could have added a require to go.mod. Let me check.
```

</details>

<details><summary>🛠 bash</summary>

```
module github.com/shopstack/platform

go 1.25

require (
	github.com/golang-jwt/jwt/v5 v5.2.1
	github.com/google/uuid v1.6.0
	github.com/grpc-ecosystem/grpc-gateway/v2 v2.27.1
	github.com/rabbitmq/amqp091-go v1.10.0
	github.com/redis/go-redis/v9 v9.7.0
	go.uber.org/zap v1.27.0
	golang.org/x/crypto v0.36.0
	google.golang.org/genproto/googleapis/api v0.0.0-20250603155806-513f23925822
	google.golang.org/genproto/googleapis/rpc v0.0.0-20250603155806-513f23925822
	google.golang.org/grpc v1.73.0
	google.golang.org/protobuf v1.36.6
	gopkg.in/yaml.v3 v3.0.1
	gorm.io/driver/mysql v1.5.7
	gorm.io/gorm v1.25.12
)

require (
	github.com/cespare/xxhash/v2 v2.3.0 // indirect
	github.com/dgryski/go-rendezvous v0.0.0-20200823014737-9f7001d12a5f // indirect
	github.com/go-sql-driver/mysql v1.7.0 // indirect
	github.com/jinzhu/inflection v1.0.0 // indirect
	github.com/jinzhu/now v1.1.5 // indirect
	github.com/rogpeppe/go-internal v1.16.0 // indirect
	go.uber.org/multierr v1.10.0 // indirect
	golang.org/x/net v0.38.0 // indirect
	golang.org/x/sys v0.33.0 // indirect
	golang.org/x/text v0.26.0 // indirect
)
go.sum
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:29:34

<details><summary>🧠 思考过程</summary>

```
go.mod is unchanged. Good. Fix the import path.
```

</details>

<details><summary>🛠 bash</summary>

```
# github.com/shopstack/platform/backend/internal/marketing
backend/internal/marketing/tmp_integration_test.go:32:70: expression in defer must be function call
FAIL	github.com/shopstack/platform/backend/internal/marketing [setup failed]
FAIL
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:29:36

<details><summary>🛠 bash</summary>

```
# github.com/shopstack/platform/backend/internal/marketing [github.com/shopstack/platform/backend/internal/marketing.test]
backend/internal/marketing/tmp_integration_test.go:32:17: db.Exec("DELETE FROM sign_in_records WHERE user_id = 3").Error (variable of interface type error) is not used
backend/internal/marketing/tmp_integration_test.go:33:17: db.Exec("DELETE FROM user_points_logs WHERE user_id = 3 AND biz_type = 'sign_in'").Error (variable of interface type error) is not used
backend/internal/marketing/tmp_integration_test.go:57:17: db.Exec("DELETE FROM sign_in_records WHERE user_id = 3").Error (variable of interface type error) is not used
backend/internal/marketing/tmp_integration_test.go:94:17: db.Exec("DELETE FROM user_tasks WHERE user_id = 3 AND task_id = 3").Error (variable of interface type error) is not used
backend/internal/marketing/tmp_integration_test.go:95:17: db.Exec("DELETE FROM user_points_logs WHERE user_id = 3 AND biz_type = 'task'").Error (variable of interface type error) is not used
FAIL	github.com/shopstack/platform/backend/internal/marketing [build failed]
FAIL
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:29:41

<details><summary>🛠 bash</summary>

```
=== RUN   TestTmpSignIn
    tmp_integration_test.go:39: status before: signed=false cont=0 total=0 next=5 calendar=31

2026/10/20 14:29:48 [31;1m/<WORKSPACE>/shopstack/backend/internal/marketing/signin.go:48 [35;1mrecord not found
[0m[33m[4.388ms] [34;1m[rows:0][0m SELECT * FROM `sign_in_records` WHERE user_id = 3 AND sign_date = '2026-10-20' ORDER BY `sign_in_records`.`id` LIMIT 1

2026/10/20 14:29:48 [31;1m/<WORKSPACE>/shopstack/backend/internal/marketing/signin.go:48 [35;1mrecord not found
[0m[33m[0.391ms] [34;1m[rows:0][0m SELECT * FROM `sign_in_records` WHERE user_id = 3 AND sign_date = '2026-10-19' ORDER BY `sign_in_records`.`id` LIMIT 1
    tmp_integration_test.go:46: sign in: signed=true cont=1 points=5 next=6
    tmp_integration_test.go:51: duplicate sign-in error: [1005] 今日已签到，请明天再来
    tmp_integration_test.go:62: status after: signed=true cont=1 total=2 calendar[0]=date:"2026-10-01"
    tmp_integration_test.go:68: points log: title=每日签到 change=5 balance=85 biz=sign_in
    tmp_integration_test.go:72: user points = 85
--- PASS: TestTmpSignIn (0.05s)
=== RUN   TestTmpTasks
    tmp_integration_test.go:84: tasks total=6
    tmp_integration_test.go:86: task: id=1 name=每日签到 target=1 reward=10 progress=0 completed=false claimed=false
    tmp_integration_test.go:86: task: id=2 name=浏览商品 target=5 reward=20 progress=0 completed=false claimed=false
    tmp_integration_test.go:86: task: id=3 name=完成订单 target=1 reward=50 progress=0 completed=false claimed=false
    tmp_integration_test.go:86: task: id=4 name=分享好友 target=1 reward=30 progress=0 completed=false claimed=false
    tmp_integration_test.go:86: task: id=5 name=发表评价 target=1 reward=50 progress=0 completed=false claimed=false
    tmp_integration_test.go:86: task: id=6 name=邀请新用户 target=1 reward=200 progress=0 completed=false claimed=false
    tmp_integration_test.go:101: claimed: task=3 points=50 claimed=true
    tmp_integration_test.go:106: duplicate claim error: [1005] 任务奖励已领取

2026/10/20 14:29:48 [31;1m/<WORKSPACE>/shopstack/backend/internal/marketing/task.go:84 [35;1mrecord not found
[0m[33m[0.283ms] [34;1m[rows:0][0m SELECT * FROM `user_tasks` WHERE user_id = 3 AND task_id = 2 ORDER BY `user_tasks`.`id` LIMIT 1
    tmp_integration_test.go:112: incomplete task error: [1001] 任务进度不存在，请先完成对应行为
    tmp_integration_test.go:119: unauthorized error: [1003] 请先登录后再领取奖励
--- PASS: TestTmpTasks (0.02s)
=== RUN   TestTmpGroupBuyAndPromotion
    tmp_integration_test.go:132: group buys total=0
    tmp_integration_test.go:143: gb1 members=2
    tmp_integration_test.go:145: member: id=1 nickname=演示用户
    tmp_integration_test.go:145: member: id=2 nickname=张三

2026/10/20 14:29:48 [31;1m/<WORKSPACE>/shopstack/backend/internal/marketing/groupbuy.go:154 [35;1mrecord not found
[0m[33m[0.267ms] [34;1m[rows:0][0m SELECT * FROM `group_buy_members` WHERE group_buy_id = 1 AND user_id = 4 ORDER BY `group_buy_members`.`id` LIMIT 1
    tmp_integration_test.go:152: join group buy ok
    tmp_integration_test.go:157: duplicate join error: [1005] 您已参与该拼团
    tmp_integration_test.go:167: promo: id=4 name=办公室下午茶拼团 products=2 sessions=0
    tmp_integration_test.go:174: promotion products total=2
    tmp_integration_test.go:176: pp: id=7 title=进口车厘子 2kg 装 min=8900 max=12900 stock=1280 sales=8740
    tmp_integration_test.go:176: pp: id=9 title=降噪蓝牙耳机 Air min=69900 max=89900 stock=1000 sales=4310
    tmp_integration_test.go:184: sessions total=3
    tmp_integration_test.go:186: session: id=1 name=每日 10 点场 start=1792461600 end=1792468800 stock=500 sold=218 status=2
    tmp_integration_test.go:186: session: id=2 name=每日 14 点场 start=1792476000 end=1792483200 stock=500 sold=96 status=1
    tmp_integration_test.go:186: session: id=3 name=每日 20 点场 start=1792497600 end=1792504800 stock=500 sold=312 status=0
    tmp_integration_test.go:197: save session (overlap): [8003] 场次时间与已有场次「每日 14 点场」重叠
    tmp_integration_test.go:212: overlap error: [8003] 场次时间与已有场次「每日 10 点场」重叠
    tmp_integration_test.go:219: levels=5
    tmp_integration_test.go:221: level: 1 普通会员 growth=0-999 discount=100 benefits=[购物车收藏 基础优惠券]
    tmp_integration_test.go:221: level: 2 白银会员 growth=1000-4999 discount=99 benefits=[9.9折 生日券 优先客服]
    tmp_integration_test.go:221: level: 3 黄金会员 growth=5000-19999 discount=95 benefits=[9.5折 专属客服 免运费券]
    tmp_integration_test.go:221: level: 4 铂金会员 growth=20000-49999 discount=90 benefits=[9折 专属客服 生日双倍积分]
    tmp_integration_test.go:221: level: 5 钻石会员 growth=50000-9999999 discount=85 benefits=[8.5折 专属客服经理 新品优先购]
done
--- PASS: TestTmpGroupBuyAndPromotion (0.02s)
PASS
ok  	github.com/shopstack/platform/backend/internal/marketing	0.600s
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:29:48

<details><summary>🧠 思考过程</summary>

```
Excellent, mostly working. Issues found:

1. **ListGroupBuys returns total=0** — because the default filter when status==0 (not specified) applies the "未开始" branch! I used `switch q.Status` with `case GroupBuyStatusNotStarted:` = 0, but status 0 means "not specified" in the request (proto default). So a request with status unset (0) filters to 未开始. Bug!

Fix: the request's status filter should only apply when the caller explicitly asks. But proto3 int32 default is 0, which conflicts with the "未开始" enum value 0. The ListPromotions repo has the same pattern (`if q.Status > 0`), so status 0 = "all".

For group buys, I'll treat status 0 as "全部" (like ListPromotions) and only filter when status is 1/2/3. But then you can't filter for 未开始. That's the same ambiguity as the existing ListPromotions code (status > 0 filter). I'll follow the existing convention: status 0 = 全部. Document it.

Hmm, but the existing ListPromotions uses `q.Status > 0` → `WHERE status = ?` (the stored column), not time-derived. For group buys, the stored status is 1 for both seed rows even though one has ended. I'll keep time-derived but only for status > 0.

So: if status == 0 → no filter. status 1 → running (time-derived). status 2 → finished. status 3 → offline.

2. **Session status**: session 1 (10:00-12:00) shows status=2 (已结束) since now is 14:29 — correct. Session 2 (14:00-16:00) → status=1 进行中 — correct. Session 3 → 0 未开始 — correct.

3. **Save session (overlap)**: my test's "new session" at now+1h..now+2h overlapped with the 14:00 session (14:29+1h = 15:29, within 14:00-16:00). Correct behavior.

4. **The promotion products for promotion 4**: 2 products (7 and 9) — one from the promotion itself, one from the group buy. Good.

5. **Sign-in**: works. Points 80 → 85. Balance logged correctly.

6. **Tasks**: the seed has no user_tasks for user 3, so ListTasks shows zero progress. Fine.

Wait — there's an issue with the task claim test: I inserted a user_tasks row for (3,3) and the claim worked. Good.

7. **Join group buy** worked and the duplicate check worked.

Now let me also double check the `ListGroupBuys` with the fixed status filter.

Another issue: in `ListGroupBuys` the seed group buy 1 has joined_members=2 and there are 2 members — consistent.

Let me fix the status filter.

Also for the promotion session's `status` column: the seed has status 1 for session 1 (10点场) which is now 已结束, but I compute the real status from time, so it's fine.

Let me now fix the group buy status filter.
```

</details>

Found a bug: `ListGroupBuys` with no status filter wrongly applied the "未开始" branch (proto default 0). Fixing:

<details><summary>🛠 edit</summary>

```
Successfully replaced 1 block(s) in /<WORKSPACE>/shopstack/backend/internal/marketing/groupbuy.go.
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:30:01

<details><summary>🛠 bash</summary>

```
tmp_integration_test.go:132: group buys total=2
    tmp_integration_test.go:134: gb: id=2 name=车厘子拼团尝鲜 price=8900 joined=4/30 status=1 start=1792188199 end=1793397799
    tmp_integration_test.go:134: gb: id=1 name=办公室下午茶拼团 price=5900 joined=2/20 status=1 start=1791842599 end=1794434599
--- PASS: TestTmpGroupBuyAndPromotion (0.05s)
PASS
ok  	github.com/shopstack/platform/backend/internal/marketing	0.573s
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:30:05

<details><summary>🧠 思考过程</summary>

```
Now the product domain tests. Let me write a temporary test for the product package.

Test:
1. ListChannels → 9 channels.
2. GetChannel(1).
3. ListChannelProducts(channel 1 = recommend) → all 12 on-shelf products; channel 7 (freeship) → product 7 only.
4. ListReviewTags / SaveReviewTag / DeleteReviewTag.
5. ListGuarantees / SaveGuarantee / DeleteGuarantee.
6. ListProductParams(1).
7. CreateQuestion (auth ctx) / ListProductQuestions / ListQuestions / AnswerQuestion.

The product Service requires an mq client: NewService(repo, mqClient) — I can pass nil (publishProductChanged checks for nil).

Let me write it.
```

</details>

<details><summary>🛠 write</summary>

```
Successfully wrote 6491 bytes to /<WORKSPACE>/shopstack/backend/internal/product/tmp_integration_test.go
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:30:24

<details><summary>🛠 bash</summary>

```
tmp_integration_test.go:53:    - 纯棉商务休闲衬衫 tags-based
    tmp_integration_test.go:53:    - 轻薄商务笔记本 14 英寸 tags-based
    tmp_integration_test.go:53:    - 桌面双屏显示器 27 英寸 tags-based
    tmp_integration_test.go:51: channel 2 (新品) products total=12
    tmp_integration_test.go:53:    - 高端保温杯 500ml tags-based
    tmp_integration_test.go:53:    - 便携蓝牙音箱 Mini tags-based
    tmp_integration_test.go:53:    - 桌面双屏显示器 27 英寸 tags-based
    tmp_integration_test.go:53:    - 降噪蓝牙耳机 Air tags-based
    tmp_integration_test.go:53:    - 职场效率管理指南 tags-based
    tmp_integration_test.go:53:    - 进口车厘子 2kg 装 tags-based
    tmp_integration_test.go:53:    - 纯棉商务休闲衬衫 tags-based
    tmp_integration_test.go:53:    - 全棉四件套 1.8m tags-based
    tmp_integration_test.go:53:    - 不粘炒锅 32cm tags-based
    tmp_integration_test.go:53:    - 智能运动手表 GT4 tags-based
    tmp_integration_test.go:53:    - 轻薄商务笔记本 14 英寸 tags-based
    tmp_integration_test.go:53:    - 旗舰智能手机 Pro 256GB tags-based
    tmp_integration_test.go:51: channel 3 (热销) products total=12
    tmp_integration_test.go:53:    - 进口车厘子 2kg 装 tags-based
    tmp_integration_test.go:53:    - 高端保温杯 500ml tags-based
    tmp_integration_test.go:53:    - 不粘炒锅 32cm tags-based
    tmp_integration_test.go:53:    - 降噪蓝牙耳机 Air tags-based
    tmp_integration_test.go:53:    - 便携蓝牙音箱 Mini tags-based
    tmp_integration_test.go:53:    - 智能运动手表 GT4 tags-based
    tmp_integration_test.go:53:    - 全棉四件套 1.8m tags-based
    tmp_integration_test.go:53:    - 职场效率管理指南 tags-based
    tmp_integration_test.go:53:    - 旗舰智能手机 Pro 256GB tags-based
    tmp_integration_test.go:53:    - 纯棉商务休闲衬衫 tags-based
    tmp_integration_test.go:53:    - 轻薄商务笔记本 14 英寸 tags-based
    tmp_integration_test.go:53:    - 桌面双屏显示器 27 英寸 tags-based
    tmp_integration_test.go:51: channel 7 (包邮) products total=1
    tmp_integration_test.go:53:    - 进口车厘子 2kg 装 tags-based
    tmp_integration_test.go:51: channel 9 (生鲜) products total=1
    tmp_integration_test.go:53:    - 进口车厘子 2kg 装 tags-based
    tmp_integration_test.go:63: price asc: 职场效率管理指南 5900
    tmp_integration_test.go:63: price asc: 进口车厘子 2kg 装 8900
    tmp_integration_test.go:63: price asc: 不粘炒锅 32cm 12900
    tmp_integration_test.go:63: price asc: 高端保温杯 500ml 15900
    tmp_integration_test.go:63: price asc: 纯棉商务休闲衬衫 19900
    tmp_integration_test.go:63: price asc: 便携蓝牙音箱 Mini 24900
    tmp_integration_test.go:63: price asc: 全棉四件套 1.8m 29900
    tmp_integration_test.go:63: price asc: 降噪蓝牙耳机 Air 69900
    tmp_integration_test.go:63: price asc: 智能运动手表 GT4 89900
    tmp_integration_test.go:63: price asc: 桌面双屏显示器 27 英寸 129900
    tmp_integration_test.go:63: price asc: 旗舰智能手机 Pro 256GB 429900
    tmp_integration_test.go:63: price asc: 轻薄商务笔记本 14 英寸 599900
    tmp_integration_test.go:69: keyword 耳机 total=1
    tmp_integration_test.go:78: saved channel id=10

[0m[33m[8.050ms] [34;1m[rows:0][0m INSERT INTO `channels` (`name`,`code`,`icon`,`banner_url`,`description`,`sort`,`type`,`status`,`product_count`,`created_at`,`updated_at`) VALUES ('测试频道2','tmp_test_channel','','','',0,1,1,0,'2026-10-20 14:30:30.584','2026-10-20 14:30:30.584')
    tmp_integration_test.go:86: duplicate code error: [1005] 频道编码已存在
--- PASS: TestTmpChannels (0.06s)
=== RUN   TestTmpTagsGuaranteesParams
    tmp_integration_test.go:103: review tags total=8
    tmp_integration_test.go:105: tag: id=1 name=质量好 sort=1 enabled=true
    tmp_integration_test.go:105: tag: id=2 name=物流快 sort=2 enabled=true
    tmp_integration_test.go:105: tag: id=3 name=包装好 sort=3 enabled=true
    tmp_integration_test.go:105: tag: id=4 name=性价比高 sort=4 enabled=true
    tmp_integration_test.go:105: tag: id=5 name=味道不错 sort=5 enabled=true
    tmp_integration_test.go:105: tag: id=6 name=会回购 sort=6 enabled=true
    tmp_integration_test.go:105: tag: id=7 name=客服耐心 sort=7 enabled=true
    tmp_integration_test.go:105: tag: id=8 name=发货快 sort=8 enabled=true
    tmp_integration_test.go:112: saved tag id=9
    tmp_integration_test.go:121: guarantees total=5
    tmp_integration_test.go:123: guarantee: id=1 name=正品保障 enabled=true
    tmp_integration_test.go:123: guarantee: id=2 name=闪电退款 enabled=true
    tmp_integration_test.go:123: guarantee: id=3 name=七天无理由 enabled=true
    tmp_integration_test.go:123: guarantee: id=4 name=运费险 enabled=true
    tmp_integration_test.go:123: guarantee: id=5 name=48 小时发货 enabled=true
    tmp_integration_test.go:137: params count=8
    tmp_integration_test.go:139: param: 屏幕=6.7 英寸 2K LTPO 直屏
    tmp_integration_test.go:139: param: 屏幕=6.7 英寸 2K LTPO 直屏
    tmp_integration_test.go:139: param: 处理器=旗舰 4nm 八核
    tmp_integration_test.go:139: param: 处理器=旗舰 4nm 八核
    tmp_integration_test.go:139: param: 电池=5000mAh / 100W 快充
    tmp_integration_test.go:139: param: 电池=5000mAh / 100W 快充
    tmp_integration_test.go:139: param: 主摄=5000 万像素 OIS
    tmp_integration_test.go:139: param: 主摄=5000 万像素 OIS
--- PASS: TestTmpTagsGuaranteesParams (0.02s)
=== RUN   TestTmpQuestions
    tmp_integration_test.go:154: question id=4 product=旗舰智能手机 Pro 256GB nickname=鲍勃 content=这个商品什么时候发货？ images=[a.jpg]
    tmp_integration_test.go:163: unauthorized error: [1003] 请先登录后再提问
    tmp_integration_test.go:170: product questions total=2
    tmp_integration_test.go:172: q: id=4 content=这个商品什么时候发货？ reply="" reply_at=""
    tmp_integration_test.go:172: q: id=3 content=支持有线连接吗？ reply="" reply_at=""
    tmp_integration_test.go:179: answered: reply="48 小时内发货" reply_at="2026-10-20 14:30:30"
    tmp_integration_test.go:185: admin questions total=1
    tmp_integration_test.go:187: aq: id=4 content=这个商品什么时候发货？ reply="48 小时内发货"
--- PASS: TestTmpQuestions (0.02s)
PASS
ok  	github.com/shopstack/platform/backend/internal/product	0.594s
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:30:30

<details><summary>🧠 思考过程</summary>

```
All tests pass. But two issues spotted:

1. **params count=8 but only 4 distinct params printed** — the product_attributes for product 1 seem duplicated? "屏幕" printed twice. Let me check: earlier the query showed product_attributes rows for product 1: 屏幕, 处理器, 电池, 主摄 (4 rows). But my ListProductParams returned 8. Hmm, and `ProductAttributes` in repo.go orders by "sort ASC, id ASC". Why 8?

Oh wait — the test output shows each param twice. That's 8 items for 4 distinct. Maybe the table really has 8 rows for product 1? Earlier I saw `SELECT COUNT(*) FROM product_attributes` = 22 and the first 5 rows showed product 1 with 4 rows (屏幕, 处理器, 电池, 主摄). 22 rows / 12 products ≈ 2 each... no.

Let me query product_attributes for product 1 directly.

2. The channel 1 (推荐) list wasn't shown in the tail (cut off), but total=12 presumably.

Let me check product_attributes.
```

</details>

<details><summary>🛠 bash</summary>

```
mysql: [Warning] Using a password on the command line interface can be insecure.
id	product_id	name	value	sort
1	1	屏幕	6.7 英寸 2K LTPO 直屏	1
12	1	屏幕	6.7 英寸 2K LTPO 直屏	1
2	1	处理器	旗舰 4nm 八核	2
13	1	处理器	旗舰 4nm 八核	2
3	1	电池	5000mAh / 100W 快充	3
14	1	电池	5000mAh / 100W 快充	3
4	1	主摄	5000 万像素 OIS	4
15	1	主摄	5000 万像素 OIS	4
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:30:35

<details><summary>🧠 思考过程</summary>

```
The seed data itself has duplicated attribute rows (ids 1-4 and 12-15). Not my bug — it's the seed data. My implementation faithfully returns what's in the table.

Should I dedupe? The requirement says "ListProductParams：从商品的 attributes 读取商品参数列表". Returning duplicates from the DB is literal but ugly. I could dedupe by (name, value) to present a clean parameter list. Given the seed has exact duplicates, deduping makes the API more useful. But it also hides data issues.

I'll leave it as-is (faithful read) — no, hmm. Let me think about which is better for the frontend. The product detail page would show "屏幕" twice. That's clearly wrong output. Deduplicating by name+value is a reasonable, well-defined transformation at the service layer. I'll dedupe by (name, value), keeping the first occurrence (lowest sort, then id). This is defensible and documented.

Let me implement that in ListProductParams.

Also, another consideration for the product params: should it be limited to product_attributes only? Yes, that matches "product_attributes 表".

Let me add the dedupe.
```

</details>

<details><summary>🛠 edit</summary>

```
Successfully replaced 1 block(s) in /<WORKSPACE>/shopstack/backend/internal/product/params.go.
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:30:45

<details><summary>🛠 bash</summary>

```
tmp_integration_test.go:137: params count=4
    tmp_integration_test.go:139: param: 屏幕=6.7 英寸 2K LTPO 直屏
    tmp_integration_test.go:139: param: 处理器=旗舰 4nm 八核
    tmp_integration_test.go:139: param: 电池=5000mAh / 100W 快充
    tmp_integration_test.go:139: param: 主摄=5000 万像素 OIS
--- PASS: TestTmpTagsGuaranteesParams (0.07s)
PASS
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:30:50

<details><summary>🧠 思考过程</summary>

```
Now let me also verify the SavePromotionSession creation path (creating a new session that doesn't overlap) and the SaveGroupBuy path, which I haven't exercised. Also the ListPromotionSessions for a promotion with no sessions.

Let me add a test for SaveGroupBuy and a successful SavePromotionSession (non-overlapping), then clean up.

Also test the marketing SignIn "not logged in" path.

Let me write an additional temp test.
```

</details>

<details><summary>🛠 write</summary>

```
Successfully wrote 3422 bytes to /<WORKSPACE>/shopstack/backend/internal/marketing/tmp_integration2_test.go
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:30:59

<details><summary>🛠 bash</summary>

```
=== RUN   TestTmpSaveGroupBuyAndSession
    tmp_integration2_test.go:30: group buy id=3 title=进口车厘子 2kg 装 image=https://placehold.co/600x600/F04438/FFFFFF?text=Cherry+2kg original=12900 size=20 status=1
    tmp_integration2_test.go:48: updated group buy name=临时拼团-改 price=7900 members=5 joined=0

    tmp_integration2_test.go:72: session id=4 name=临时场次 start=1792564263 end=1792571463 stock=100 status=0
    tmp_integration2_test.go:80: sessions total=1
    tmp_integration2_test.go:86: unauthorized sign-in: [1003] 请先登录后再签到
    tmp_integration2_test.go:91: unauthorized status: [1003] 请先登录
    tmp_integration2_test.go:97: unauthorized join: [1003] 请先登录后再参团
--- PASS: TestTmpSaveGroupBuyAndSession (0.04s)
PASS
ok  	github.com/shopstack/platform/backend/internal/marketing	0.476s
```

</details>
