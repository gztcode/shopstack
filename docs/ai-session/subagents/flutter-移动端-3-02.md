# 子 Agent · 你负责 ShopStack 项目的 **product 域（backend/internal/product/）** 与 **marketi

> 第 2 / 2 卷

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:31:03

<details><summary>🧠 思考过程</summary>

```
All good. Note: `SavePromotion` in the test used the existing service (not my new code) — it worked.

One observation: the new group buy's status was 1 (进行中) because realGroupBuyStatus derives from time. Good.

Now let me clean up the temp test files and verify the DB is clean (no leftover rows).

Also let me double check a few remaining concerns:

1. **`errs.CodePromotionNotFound`** doesn't exist in errs.go — I used `errs.CodeNotFound`. Will mention in the report.

2. The `SaveGroupBuy` for a new record sets Status = GroupBuyStatusNotStarted (0) in the DB, but realGroupBuyStatus computes 1 while running. Fine.

3. **ListChannelProducts** updates channels.product_count — verified? The test showed count updates. Let me check that channels.product_count is now updated to 12 for channel 1 (it was 12 in the seed) and 1 for channel 7 (was 9). Hmm! That modifies seed data. Channel 7's product_count was 9 in the seed and now becomes 1. That's a side effect of my implementation — it updates the DB.

Is that acceptable? The requirement says the channels table has product_count. Updating it to reflect the actual filtered count is "real" behavior but mutates seeded data on a read operation. A read RPC that writes to the DB is a bit surprising but common for denormalized counters.

Hmm, risk: another test/worker might depend on product_count = 9. Also the read op now does a write on every call.

Let me reconsider: I think it's better NOT to write on a read path. The product_count is maintained by the admin when saving a channel... but nothing computes it.

Options:
a) Keep the update (denormalized counter stays accurate).
b) Don't update; just return the stored value.

The requirement doesn't ask to maintain product_count. The risk of surprising writes during a read is real (e.g., concurrent reads). I'll switch to not writing, and instead compute the count for the response? But the response's Channel.product_count would then show the stale seed value.

Middle ground: compute the matched total and return it in the response's channel.product_count (without persisting). That gives accurate data in the response and avoids writes on a read path. But then the persisted value stays stale, and other endpoints (ListChannels) show the seed value.

I think persisting is actually the better long-term behavior for a denormalized counter... but writes on GET requests can cause deadlocks/lock contention and is considered bad practice.

Decision: don't write on the read path. Instead, in ListChannelProducts, set the returned channel's product_count to the actual matched total (in-memory), and leave the DB column alone. Document that product_count is a denormalized field maintained by the seed/admin.

Hmm, but then the persisted product_count is never correct. Let me instead update product_count in SaveChannel (the admin write path): compute the count of products matching the channel at save time. That keeps the counter accurate on writes and avoids read-path writes. But then the count for channel 7 (freeship) would be computed at save time only.

Actually, let's keep it simple and predictable:
- ListChannelProducts returns the channel with product_count = the actual matched total (computed in that request), without persisting.
- SaveChannel leaves product_count as-is (0 on create).

Hmm, but then ListChannels (the channel list) shows stale counts. That's the seed's problem.

Wait — actually, maybe I should reconsider once more. The cleanest semantic: `channels.product_count` = the number of products in the channel, maintained by the system. Since only ListChannelProducts can compute it, and that's a read... I'll go with the in-memory approach in ListChannelProducts + persist the count in SaveChannel (admin path, where recomputation is natural).

Hmm, but SaveChannel computing the count requires running the product query — doable: call repo.ListChannelProducts with page 1 size 1 and read the total. That's a bit hacky but fine.

Let me simplify: I'll keep the DB write in ListChannelProducts BUT... no. Decision: remove the write from the read path; set the in-memory value in the response. And in SaveChannel, recompute and persist product_count using the same query (total only). This gives a consistent, maintained counter without read-path writes.

Let me implement:
- In ListChannelProducts: `channel.ProductCount = int(total)` (in-memory only).
- In SaveChannel: after saving, compute the matched product total and persist it.

For SaveChannel I need a "count channel products" method. I'll add `CountChannelProducts(ctx, tags)` to the repo, or reuse ListChannelProducts with pageSize 1 and take the total. I'll add a dedicated method `CountChannelProducts` for clarity.

Let me refactor: extract the query-building into a helper `channelProductQuery(ctx, tags, keyword)` returning *gorm.DB, used by both Count and List.

Let me implement that.

4. Another consideration: the `ListChannels` returns all channels including disabled ones. I documented that.

Let me now make the product_count changes.
```

</details>

Let me refine the `product_count` handling to avoid writes on a read path:

<details><summary>🛠 read</summary>

```
196→}
   197→
   198→// ---------------------------------------------------------------------------
   199→// 服务
   200→// ---------------------------------------------------------------------------
   201→
   202→// ListChannels 分页查询频道。
   203→func (s *Service) ListChannels(ctx context.Context, req *productv1.ListChannelsRequest) (*productv1.ListChannelsResponse, error) {
   204→	page, pageSize := normalizePage(req.GetPage())
   205→
   206→	list, total, err := s.repo.ListChannels(ctx,
   207→		strings.TrimSpace(req.GetKeyword()), req.GetType(), page, pageSize)
   208→	if err != nil {
   209→		return nil, errs.Wrap(errs.CodeInternalError, "查询频道失败", err)
   210→	}
   211→
   212→	out := make([]*productv1.Channel, 0, len(list))
   213→	for i := range list {
   214→		out = append(out, channelToProto(&list[i]))
   215→	}
   216→	return &productv1.ListChannelsResponse{Channels: out, Meta: buildMeta(page, pageSize, total)}, nil
   217→}
   218→
   219→// GetChannel 查询频道详情。
   220→func (s *Service) GetChannel(ctx context.Context, req *productv1.GetChannelRequest) (*productv1.Channel, error) {
   221→	if req.GetId() <= 0 {
   222→		return nil, errs.Invalid("频道 ID 不能为空")
   223→	}
   224→	c, err := s.repo.FindChannelByID(ctx, uint64(req.GetId()))
   225→	if err != nil {
   226→		return nil, err
   227→	}
   228→	return channelToProto(c), nil
   229→}
   230→
   231→// ListChannelProducts 查询频道下的商品。
   232→func (s *Service) ListChannelProducts(ctx context.Context, req *productv1.ListChannelProductsRequest) (*productv1.ListChannelProductsResponse, error) {
   233→	if req.GetChannelId() <= 0 {
   234→		return nil, errs.Invalid("频道 ID 不能为空")
   235→	}
   236→	channel, err := s.repo.FindChannelByID(ctx, uint64(req.GetChannelId()))
   237→	if err != nil {
   238→		return nil, err
   239→	}
   240→
   241→	page, pageSize := normalizePage(req.GetPage())
   242→	sort := strings.TrimSpace(req.GetSort())
   243→	if sort == "" {
   244→		sort = defaultChannelSort(channel.Type)
   245→	}
   246→
   247→	list, total, err := s.repo.ListChannelProducts(ctx, ChannelProductQuery{
   248→		Keyword:  strings.TrimSpace(req.GetKeyword()),
   249→		Tags:     channelProductTags(channel),
   250→		Sort:     sort,
   251→		Page:     page,
   252→		PageSize: pageSize,
   253→	})
   254→	if err != nil {
   255→		return nil, errs.Wrap(errs.CodeInternalError, "查询频道商品失败", err)

[155 more lines in file. Use offset=256 to continue.]
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:31:17

<details><summary>🛠 edit</summary>

```
Successfully replaced 1 block(s) in /<WORKSPACE>/shopstack/backend/internal/product/channel.go.
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:31:20

<details><summary>🧠 思考过程</summary>

```
Now add the count recomputation in SaveChannel. I need a repo method to count channel products. Let me refactor ListChannelProducts to share a query builder and add CountChannelProducts.

Let me look at the current ListChannelProducts repo method and add a helper.
```

</details>

<details><summary>🛠 edit</summary>

```
Successfully replaced 1 block(s) in /<WORKSPACE>/shopstack/backend/internal/product/channel.go.
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:31:27

Now update `SaveChannel` to persist the recomputed product count:

<details><summary>🛠 edit</summary>

```
Successfully replaced 1 block(s) in /<WORKSPACE>/shopstack/backend/internal/product/channel.go.
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:31:32

<details><summary>🛠 bash</summary>

```
ok  	github.com/shopstack/platform/backend/internal/product	0.684s
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:31:37

<details><summary>🧠 思考过程</summary>

```
Now let me check the DB state — the earlier test run may have modified channels.product_count (channel 7 → 1) before I removed the write. Let me check and restore the seed values.

Seed values: channel 1=12, 2=6, 3=8, 4=5, 5=4, 6=3, 7=9, 8=2, 9=5.

Let me check the current values and restore them.
```

</details>

<details><summary>🛠 bash</summary>

```
mysql: [Warning] Using a password on the command line interface can be insecure.
id	code	product_count
1	recommend	1
2	newest	12
3	hot	12
4	flash	5
5	presale	4
6	clearance	3
7	freeship	1
8	cross	2
9	fresh	1
c
3
c
5
c
2
id	nickname	points
1	演示用户	1200
2	爱丽丝	300
3	鲍勃	135
4	t5188	100
c
9
c
2
c
5
c
3
c
3
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:31:42

<details><summary>🧠 思考过程</summary>

```
The DB has leftover changes from my test runs:
1. `channels.product_count` was modified by the old read-path write (recommend 12→1, newest →12, hot →12, freeship 9→1, fresh 5→1). I need to restore the seed values.
2. `product_questions` = 3 (seed had some; my test deleted its own — let me check the seed count). Earlier the product test created question id 4 and deleted it. Now there are 3. Was it 3 before? The first test showed "product questions total=2" for product 1 — id 3 and id 4 (my new one). So the seed had at least id 3. Let me check what the seed had.
3. `group_buy_members` = 5 (seed had 2 for group 1 + some for group 2; my join added one and I deleted it — the count includes the seed's).
4. `sign_in_records` = 2 leftover! My test deferred a DELETE for user 3 but the second defer (from the "yesterday" insert) also deleted all of user 3's records... wait, both defers delete WHERE user_id = 3, and the tests ran. But there are 2 records left. Hmm — the defers should have cleaned up. Unless the first test's defer ran before the second insert? No, defers run at function exit (LIFO): the "yesterday" defer was registered later so it runs first, then the earlier defer. Both delete user 3's records. So after TestTmpSignIn, user 3's records should be gone.

Let me check whose records remain.
5. `users.points` for id 3 = 135 (was 80) — my tests awarded 5 (sign-in) + 50 (task) = 55 points. 80+55 = 135. So the points weren't rolled back (I deleted the log rows but not the points). I need to restore user 3's points to 80.
6. `user_tasks` = 3 (the seed's) — my temp row was deleted. Good.
7. `promotions` = 5, `promotion_sessions` = 5 — the seed had 3 sessions; my test created 2 (one in the promotion_sessions table for promo 3? No — the first test's "save session (overlap)" failed with an overlap error, so nothing was created. The second test created a session for a temp promotion and deleted it. So 5 sessions = 3 seed + 2 leftovers?

Hmm wait. Let me carefully compare with the seed. Let me check the seed file to know the expected counts.

Let me look at deploy/mysql/init/04-extend-seed.sql for the counts of these tables.
```

</details>

<details><summary>🛠 bash</summary>

```
14:INSERT INTO `user_levels` (`id`, `name`, `level`, `min_growth`, `max_growth`, `discount_percent`, `icon`, `description`, `benefits`, `sort`) VALUES
25:INSERT INTO `regions` (`id`, `parent_id`, `name`, `code`, `level`, `sort`) VALUES
55:INSERT INTO `user_invoice_templates` (`id`, `user_id`, `title`, `tax_no`, `type`, `email`, `phone`, `address`, `bank_name`, `bank_account`, `is_default`) VALUES
60:INSERT INTO `user_notification_settings` (`user_id`, `order_notice`, `logistics_notice`, `marketing_notice`, `system_notice`, `sms_notice`, `email_notice`, `wechat_notice`) VALUES
64:INSERT INTO `user_feedbacks` (`id`, `user_id`, `user_nickname`, `type`, `content`, `images`, `contact`, `status`, `reply`, `created_at`) VALUES
69:INSERT INTO `help_articles` (`id`, `category_id`, `category_name`, `title`, `content`, `sort`, `enabled`, `view_count`) VALUES
83:INSERT INTO `channels` (`id`, `name`, `code`, `icon`, `banner_url`, `description`, `sort`, `type`, `status`, `product_count`) VALUES
95:INSERT INTO `review_tags` (`id`, `name`, `sort`, `enabled`) VALUES
101:INSERT INTO `guarantees` (`id`, `name`, `icon`, `description`, `sort`, `enabled`) VALUES
109:INSERT INTO `product_questions` (`id`, `product_id`, `product_title`, `user_id`, `user_nickname`, `content`, `images`, `reply`, `reply_at`, `created_at`) VALUES
118:INSERT INTO `sign_in_records` (`id`, `user_id`, `sign_date`, `continuous_days`, `points_awarded`, `created_at`) VALUES
123:INSERT INTO `marketing_tasks` (`id`, `name`, `description`, `type`, `target_count`, `reward_points`, `reward_coupon_id`, `sort`, `enabled`, `icon`) VALUES
132:INSERT INTO `user_tasks` (`id`, `user_id`, `task_id`, `progress`, `completed`, `claimed`) VALUES
138:INSERT INTO `group_buys` (`id`, `name`, `description`, `promotion_id`, `product_id`, `product_title`, `product_image`, `price_cents`, `original_price_cents`, `required_members`, `joined_members`, `group_size`, `status`, `start_time`, `end_time`, `banner_image`) VALUES
143:INSERT INTO `group_buy_members` (`id`, `group_buy_id`, `user_id`, `user_nickname`) VALUES
151:INSERT INTO `promotion_sessions` (`id`, `promotion_id`, `name`, `start_time`, `end_time`, `stock`, `sold_count`, `status`) VALUES
160:INSERT INTO `refund_reasons` (`id`, `name`, `type`, `sort`, `enabled`) VALUES
170:INSERT INTO `after_sales` (`id`, `after_sale_no`, `order_id`, `order_no`, `user_id`, `user_nickname`, `type`, `amount_cents`, `reason`, `description`, `item_ids`, `status`, `admin_remark`, `created_at`) VALUES
177:INSERT INTO `logistics_companies` (`id`, `name`, `code`, `logo`, `phone`, `enabled`, `sort`, `supports_cod`) VALUES
185:INSERT INTO `delivery_ranges` (`id`, `template_id`, `regions`, `freight_cents`, `free_freight_amount_cents`, `enabled`) VALUES
195:INSERT INTO `warehouses` (`id`, `code`, `name`, `address`, `contact`, `phone`, `enabled`, `sort`) VALUES
201:INSERT INTO `inbound_orders` (`id`, `inbound_no`, `warehouse_id`, `warehouse_name`, `supplier`, `status`, `total_quantity`, `remark`, `operator`, `created_at`) VALUES
206:INSERT INTO `inbound_order_items` (`id`, `inbound_id`, `sku_id`, `sku_code`, `spec_text`, `quantity`) VALUES
212:INSERT INTO `outbound_orders` (`id`, `outbound_no`, `warehouse_id`, `warehouse_name`, `order_id`, `order_no`, `status`, `total_quantity`, `remark`, `operator`, `created_at`) VALUES
217:INSERT INTO `outbound_order_items` (`id`, `outbound_id`, `sku_id`, `sku_code`, `spec_text`, `quantity`) VALUES
221:INSERT INTO `stock_checks` (`id`, `check_no`, `warehouse_id`, `warehouse_name`, `status`, `total_count`, `diff_count`, `remark`, `operator`, `created_at`) VALUES
226:INSERT INTO `stock_check_items` (`id`, `stock_check_id`, `sku_id`, `sku_code`, `spec_text`, `book_quantity`, `actual_quantity`, `diff_quantity`) VALUES
234:INSERT INTO `pay_channels` (`id`, `name`, `channel`, `code`, `icon`, `enabled`, `sort`, `config`) VALUES
240:INSERT INTO `balance_logs` (`id`, `user_id`, `change`, `balance`, `title`, `biz_type`, `created_at`) VALUES
245:INSERT INTO `recharge_orders` (`id`, `recharge_no`, `user_id`, `amount_cents`, `bonus_cents`, `status`, `channel`, `payment_no`, `created_at`) VALUES
253:INSERT INTO `notification_templates` (`id`, `code`, `name`, `type`, `title`, `content`, `link`, `enabled`) VALUES
263:INSERT INTO `sms_templates` (`id`, `code`, `name`, `content`, `enabled`) VALUES
271:INSERT INTO `sensitive_words` (`id`, `word`, `category`, `status`) VALUES
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:31:50

<details><summary>🛠 bash</summary>

```
INSERT INTO `channels` (`id`, `name`, `code`, `icon`, `banner_url`, `description`, `sort`, `type`, `status`, `product_count`) VALUES
(1, '推荐',     'recommend', '', 'https://placehold.co/750x320/2A4AD9/FFFFFF?text=Recommend', '平台精选好物',       1, 1, 1, 12),
(2, '新品',     'newest',    '', 'https://placehold.co/750x320/5F87FF/FFFFFF?text=New',        '最近上架的新品',       2, 2, 1, 6),
(3, '热销',     'hot',       '', 'https://placehold.co/750x320/F56C6C/FFFFFF?text=Hot',        '销量领先的商品',       3, 3, 1, 8),
(4, '限时',     'flash',     '', 'https://placehold.co/750x320/E67E22/FFFFFF?text=Flash',      '限时折扣专区',         4, 4, 1, 5),
(5, '预售',     'presale',   '', 'https://placehold.co/750x320/16A085/FFFFFF?text=Presale',    '预售商品抢先订',       5, 5, 1, 4),
(6, '清仓',     'clearance', '', 'https://placehold.co/750x320/7F8C8D/FFFFFF?text=Clearance',  '断码清仓特惠',         6, 6, 1, 3),
(7, '包邮',     'freeship',  '', 'https://placehold.co/750x320/2980B9/FFFFFF?text=FreeShip',   '全场包邮商品',         7, 7, 1, 9),
(8, '跨境',     'cross',     '', 'https://placehold.co/750x320/6C3483/FFFFFF?text=Cross',      '跨境直采好物',         8, 8, 1, 2),
(9, '生鲜',     'fresh',     '', 'https://placehold.co/750x320/12B76A/FFFFFF?text=Fresh',      '生鲜果蔬当日达',       9, 9, 1, 5)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

INSERT INTO `review_tags` (`id`, `name`, `sort`, `enabled`) VALUES
(1, '质量好', 1, 1), (2, '物流快', 2, 1), (3, '包装好', 3, 1),
(4, '性价比高', 4, 1), (5, '味道不错', 5, 1), (6, '会回购', 6, 1),
(7, '客服耐心', 7, 1), (8, '发货快', 8, 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

INSERT INTO `guarantees` (`id`, `name`, `icon`, `description`, `sort`, `enabled`) VALUES
(1, '正品保障', 'shield', '平台联合品牌方承诺假一赔十', 1, 1),
(2, '闪电退款', 'zap',    '支持极速退款，款项原路返回', 2, 1),
(3, '七天无理由', 'refresh', '签收后 7 天内可无理由退换', 3, 1),
(4, '运费险', 'truck',  '已投保退货运费险，退货运费由保险公司承担', 4, 1),
(5, '48 小时发货', 'clock', '下单后 48 小时内发货', 5, 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

INSERT INTO `product_questions` (`id`, `product_id`, `product_title`, `user_id`, `user_nickname`, `content`, `images`, `reply`, `reply_at`, `created_at`) VALUES
(1, 7, '进口车厘子 2kg 装', 1, '演示用户', '这个规格是 JJ 级的吗？甜度怎么样？', '[]', '是的，JJ 级果径，甜度在 16 度以上。', '2026-10-18 10:24:00', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(2, 7, '进口车厘子 2kg 装', 2, '张三', '冷链配送大概多久能到？', '[]', '江浙沪次日达，其他地区一般 2-3 天。', '2026-10-19 15:02:00', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(3, 1, '无线降噪耳机 Pro', 1, '演示用户', '支持有线连接吗？', '[]', '', '', DATE_SUB(NOW(), INTERVAL 6 HOUR))
ON DUPLICATE KEY UPDATE `content` = VALUES(`content`);

-- ---------------------------------------------------------------------------
-- 签到 / 任务 / 拼团 / 场次
-- ---------------------------------------------------------------------------
INSERT INTO `sign_in_records` (`id`, `user_id`, `sign_date`, `continuous_days`, `points_awarded`, `created_at`) VALUES
(1, 1, DATE_SUB(CURDATE(), INTERVAL 2 DAY), 2, 10, DATE_SUB(NOW(), INTERVAL 2 DAY)),
(2, 1, DATE_SUB(CURDATE(), INTERVAL 1 DAY), 3, 10, DATE_SUB(NOW(), INTERVAL 1 DAY))
ON DUPLICATE KEY UPDATE `continuous_days` = VALUES(`continuous_days`);

INSERT INTO `marketing_tasks` (`id`, `name`, `description`, `type`, `target_count`, `reward_points`, `reward_coupon_id`, `sort`, `enabled`, `icon`) VALUES
(1, '每日签到',     '连续签到可获得额外积分',   5, 1,   10, 0, 1, 1, 'calendar'),
(2, '浏览商品',     '每天浏览 5 个商品',       1, 5,   20, 0, 2, 1, 'eye'),
(3, '完成订单',     '完成 1 笔订单',           2, 1,   50, 0, 3, 1, 'shopping-bag'),
(4, '分享好友',     '分享商品给好友',         3, 1,   30, 0, 4, 1, 'share'),
(5, '发表评价',     '评价 1 件已购商品',       4, 1,   50, 0, 5, 1, 'star'),
(6, '邀请新用户',   '邀请好友注册成功',       6, 1,  200, 0, 6, 1, 'user-plus')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

INSERT INTO `user_tasks` (`id`, `user_id`, `task_id`, `progress`, `completed`, `claimed`) VALUES
(1, 1, 1, 1, 1, 1),
(2, 1, 2, 3, 0, 0),
(3, 1, 5, 0, 0, 0)
ON DUPLICATE KEY UPDATE `progress` = VALUES(`progress`);

INSERT INTO `group_buys` (`id`, `name`, `description`, `promotion_id`, `product_id`, `product_title`, `product_image`, `price_cents`, `original_price_cents`, `required_members`, `joined_members`, `group_size`, `status`, `start_time`, `end_time`, `banner_image`) VALUES
(1, '办公室下午茶拼团', '3 人成团立减 20 元',   4, 9, '精品挂耳咖啡 30 袋装', 'https://placehold.co/400x400/8B5A2B/FFFFFF?text=Coffee',  5900,  7900, 3, 2, 20, 1, DATE_SUB(NOW(), INTERVAL 7 DAY), DATE_ADD(NOW(), INTERVAL 23 DAY), 'https://placehold.co/750x320/722ED1/FFFFFF?text=Group+Buy'),
(2, '车厘子拼团尝鲜',   '5 人成团直降 30 元',   4, 7, '进口车厘子 2kg 装',    'https://placehold.co/400x400/C0392B/FFFFFF?text=Cherry',  8900, 11900, 5, 4, 30, 1, DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_ADD(NOW(), INTERVAL 11 DAY), 'https://placehold.co/750x320/A04000/FFFFFF?text=Group+Cherry')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

INSERT INTO `group_buy_members` (`id`, `group_buy_id`, `user_id`, `user_nickname`) VALUES
(1, 1, 1, '演示用户'),
(2, 1, 2, '张三'),
(3, 2, 1, '演示用户'),
(4, 2, 3, '李四'),
(5, 2, 4, '王五')
ON DUPLICATE KEY UPDATE `user_nickname` = VALUES(`user_nickname`);

INSERT INTO `promotion_sessions` (`id`, `promotion_id`, `name`, `start_time`, `end_time`, `stock`, `sold_count`, `status`) VALUES
(1, 3, '每日 10 点场', DATE_ADD(CURDATE(), INTERVAL 10 HOUR), DATE_ADD(CURDATE(), INTERVAL 12 HOUR), 500, 218, 1),
(2, 3, '每日 14 点场', DATE_ADD(CURDATE(), INTERVAL 14 HOUR), DATE_ADD(CURDATE(), INTERVAL 16 HOUR), 500, 96, 0),
(3, 3, '每日 20 点场', DATE_ADD(CURDATE(), INTERVAL 20 HOUR), DATE_ADD(CURDATE(), INTERVAL 22 HOUR), 500, 312, 0)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- ---------------------------------------------------------------------------
-- 售后 / 退款原因
-- ---------------------------------------------------------------------------
INSERT INTO `refund_reasons` (`id`, `name`, `type`, `sort`, `enabled`) VALUES
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:31:53

<details><summary>🧠 思考过程</summary>

```
Now I know the seed baseline:
- channels.product_count: 12,6,8,5,4,3,9,2,5 → currently 1,12,12,5,4,3,1,2,1 (my read-path write corrupted them). Need to restore.
- product_questions: 3 seed rows → currently 3. OK (my test row was deleted). But wait, my test's `defer` deleted only the created one; earlier I answered question id 4 (my own) — fine. But the seed row 3 had reply='' — did my AnswerQuestion modify a seed row? I answered q.GetId() = 4 (mine). OK. Let me double check product_questions row 3 is unchanged.
- sign_in_records: 2 seed rows (user 1) → currently 2. But are they the seed ones or leftovers from my test (user 3)? My test deferred deletes for user 3. Let me check.
- group_buy_members: 5 seed → currently 5. Good.
- promotion_sessions: 3 seed → currently 5! So 2 extra sessions were created by my test. The first test's "save session (overlap)" — I expected an overlap error, and it returned an error. Hmm, but the session id=4 in the second test (临时场次 for the temp promotion) was deleted via defer... but the defer deletes `promotion_sessions WHERE promotion_id = promo.GetId()`. The promo was created with `svc.SavePromotion` → new promotion id (maybe 5 or 6). Then the session was created for that promotion and the defer deleted it. Hmm, but there are 5 sessions now.

Wait — the second test's `SavePromotionSession` with the temp promotion: I saw "session id=4". So the session's promotion_id = the new promotion. The defer deletes by promotion_id → should have deleted it. Unless the promotion's `SavePromotion` updated an existing promotion instead of creating (ID=0 → Create → new id). Let me check the promotions table count: 5. The seed promotions count? Let me check the seed for promotions — it's in 01-schema.sql or 02-seed.sql. Let me count.

Let me look at the current state of these tables to determine what's leftover.

Also promotions=5 and group_buys=2, channels=9, users' points=135 for user 3 (should be 80).

Let me inspect and restore everything to the seed state.
```

</details>

<details><summary>🛠 bash · 出错</summary>

```
mysql: [Warning] Using a password on the command line interface can be insecure.
ERROR 1064 (42000) at line 1: You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near 'change,title FROM user_points_logs WHERE user_id=3' at line 1
id	promotion_id	name	start_time	end_time
1	3	每日 10 点场	2026-10-20 10:00:00	2026-10-20 12:00:00
2	3	每日 14 点场	2026-10-20 14:00:00	2026-10-20 16:00:00
3	3	每日 20 点场	2026-10-20 20:00:00	2026-10-20 22:00:00
id	name	type	status	start_time
1	夏日数码狂欢季	1	1	2026-10-13 04:11:59
2	数码单品 85 折	2	1	2026-10-13 04:11:59
3	生鲜秒杀 每日 10 点	3	1	2026-10-13 04:11:59
4	办公室下午茶拼团	4	1	2026-10-13 04:55:20
5	周末囤货节	1	1	2026-10-17 04:55:20
id	user_id	sign_date	continuous_days	points_awarded
1	1	2026-10-18	2	10
2	1	2026-10-19	3	10
id	product_id	content	reply	reply_at
1	7	这个规格是 JJ 级的吗？甜度怎么样？	是的，JJ 级果径，甜度在 16 度以上。	2026-10-18 10:24:00
2	7	冷链配送大概多久能到？	江浙沪次日达，其他地区一般 2-3 天。	2026-10-19 15:02:00
3	1	支持有线连接吗？		

Command exited with code 1
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:32:01

<details><summary>🧠 思考过程</summary>

````
- promotion_sessions: only the 3 seed rows. (My earlier count of 5 must have included... hmm, the earlier query `SELECT COUNT(*) c FROM promotion_sessions` returned 5? Let me re-read: the output was a list of counts: 3 (product_questions), 5 (group_buy_members), 2 (sign_in_records)... wait the outputs were:

```
c
3      <- product_questions
c
5      <- group_buy_members
c
2      <- sign_in_records
```
then users, then:
```
c
9      <- channels
c
2      <- group_buys
c
5      <- promotions
c
3      <- promotion_sessions
c
3      <- user_tasks
```
Yes! I misread. promotion_sessions = 3, promotions = 5, group_buys = 2, channels = 9, user_tasks = 3. All match the seed. 

So the only leftovers are:
1. channels.product_count modified (1,12,12,5,4,3,1,2,1) → restore to 12,6,8,5,4,3,9,2,5.
2. users.points for user 3: 135 → restore to 80.
3. user_points_logs for user 3 (sign_in/task) — my defers deleted them. Let me verify (the query failed due to `change` being a reserved word; need backticks).

Let me check the points logs and then restore.
````

</details>

<details><summary>🛠 bash</summary>

```
mysql: [Warning] Using a password on the command line interface can be insecure.
id	user_id	biz_type	change	title	balance
14	3	register	100	新用户注册赠送	100
13	2	register	100	新用户注册赠送	100
12	1	sign	20	签到奖励	70
11	1	exchange	-300	积分兑换优惠券	50
10	1	review	50	完成评价奖励	350
9	1	order	200	订单支付奖励	300
8	1	register	100	新用户注册赠送	100
7	3	register	100	新用户注册赠送	100
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:32:07

<details><summary>🧠 思考过程</summary>

```
My test points logs were cleaned up (deleted by the defers). Only user 3's points balance remains elevated (135 instead of 80) and channels.product_count was modified.

Let me restore:
- users.points for user 3 → 80
- channels.product_count → seed values

Note: user 3's seed points — from the earlier query, user 3 (bob) had points=80. Yes: "3 bob 鲍勃 80".

Let me restore both.
```

</details>

<details><summary>🛠 bash</summary>

```
mysql: [Warning] Using a password on the command line interface can be insecure.
id	code	product_count
1	recommend	12
2	newest	6
3	hot	8
4	flash	5
5	presale	4
6	clearance	3
7	freeship	9
8	cross	2
9	fresh	5
id	nickname	points
1	演示用户	1200
2	爱丽丝	300
3	鲍勃	80
4	t5188	100
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:32:12

<details><summary>🧠 思考过程</summary>

```
Restored. Now let me remove the temporary test files and do the final verification.

But wait — before removing the tests, let me reconsider whether to keep them as permanent test files. The brief says "不要写 README 或额外的总结文档文件" — tests aren't documentation. But it also says the deliverable is the implementation. Keeping integration tests that require a live DB at port 13306 could break `go test ./...` in CI without a DB. I'll remove them (they were scratch validation), as the brief emphasizes "the smallest coherent change".

Let me delete the temp test files.

Then run the final verification: build, vet, gofmt.

Also, let me double check a few remaining details:

1. `errs.CodePromotionNotFound` — doesn't exist. I used errs.CodeNotFound. Document.

2. Check that the handler methods compile against the grpc server interfaces — `go build` succeeded, but the Handler must satisfy `productv1.ProductServiceServer` and `ReviewServiceServer`. The build of the package succeeded but the interface satisfaction is only checked where the handler is registered (cmd/product-service). Since cmd/ is outside my scope and might not compile due to other workers, let me verify the interface satisfaction with a compile-time assertion in a temp file, or just check the cmd build.

Let me write a quick temporary check: `var _ productv1.ProductServiceServer = (*Handler)(nil)`. Actually I can just build ./backend/cmd/product-service and ./backend/cmd/marketing-service — they only depend on my packages + shared ones. Let me try.

3. Also I should double check that `ListProductQuestions` doesn't need the `auth` import conflict... it built fine.

Let me now delete the temp tests and run the final checks.
```

</details>

<details><summary>🛠 bash</summary>

```
backend/internal/marketing:
events.go
groupbuy.go
handler.go
level.go
model.go
points.go
product_projection.go
promotion_detail.go
repo.go
service.go
session.go
signin.go
task.go
util.go

backend/internal/product:
channel.go
guarantee.go
handler.go
material.go
model.go
params.go
question.go
repo.go
review_tag.go
service.go
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:32:18

<details><summary>🛠 bash</summary>

```
(no output)
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:32:22

<details><summary>🧠 思考过程</summary>

```
The service binaries build, which means the handlers satisfy the gRPC server interfaces (registration in main.go requires implementing the interface).

Let me verify that registration actually asserts the interface. Let me check cmd/product-service/main.go to confirm the handler is registered as productv1.RegisterProductServiceServer.
```

</details>

<details><summary>🛠 bash</summary>

```
backend/cmd/product-service/main.go:38:			productv1.RegisterProductServiceServer(srv, handler)
backend/cmd/product-service/main.go:39:			productv1.RegisterCategoryServiceServer(srv, handler)
backend/cmd/product-service/main.go:40:			productv1.RegisterReviewServiceServer(srv, handler)
backend/cmd/marketing-service/main.go:37:			marketingv1.RegisterMarketingServiceServer(srv, handler)
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:32:26

<details><summary>🧠 思考过程</summary>

````
Registration is type-checked at compile time — so the handlers implement all required methods including the 16 product RPCs and 13 marketing RPCs.

Now let me do a final review of my code for quality issues:

1. In `channel.go`, `UpdateChannelProductCount` is now used only in SaveChannel. Good.
2. `defaultChannelSort` — `case ChannelTypeHot, ChannelTypeRecommend: return "sales"` and default "sales" — the switch is redundant. Let me simplify:

```go
func defaultChannelSort(channelType int8) string {
	if channelType == ChannelTypeNewest {
		return "newest"
	}
	return "sales"
}
```
Cleaner.

3. In `question.go` the `fields` map literal has inconsistent alignment — gofmt handles it.

4. In `signin.go`, `mustDate` is a slightly odd name; rename to `truncateToDate`. Let me rename for clarity.

5. `task.go`: `formatTaskBizID` uses "task:" prefix. Fine.

6. `promotion_detail.go`: `ListPromotionProducts` computes pagination manually — fine.

7. `groupbuy.go`: `SaveGroupBuy` — `g.JoinedMembers = existing.JoinedMembers` is set but SaveGroupBuy's update map doesn't include joined_members, so it's unused. Let me remove that assignment to avoid confusion. Actually it's harmless but dead. Remove it.

Also `g.Status = existing.Status` is used in the update map. Keep.

8. `product/channel.go` SaveChannel: `c.Status = int8(req.GetStatus())`; `if c.Status == 0 && req.GetId() == 0 { c.Status = ChannelStatusEnabled }`. OK.

9. Check `errs.Invalid` vs `errs.New(errs.CodeInvalidParam, ...)` — both used in the codebase; `errs.Invalid` exists in errs.go. Good.

10. In `signin.go` I use `errs.Conflict` for the duplicate sign-in → HTTP 409. Good.

11. `marketing/points.go` — `AddPoints` reads the account then updates with GREATEST. Note `PointsAccount` was renamed to `UserProfile`; check no stale references. Build passed.

12. `question.go` — `resolveUserID(ctx, 0)` — the product package now has a resolveUserID helper; the handler for CreateReview uses auth.UserIDFromContext directly. Fine.

13. One more consideration: the product `questionUser` model has `DeletedAt gorm.DeletedAt` — used with `Select("id", "nickname")`. GORM's soft delete adds `deleted_at IS NULL`. Works (verified by the test: nickname 鲍勃).

Let me make those small cleanups (defaultChannelSort, mustDate rename, JoinedMembers dead assignment).

Also, let me double check the `Channel.Type` constant usage: `ChannelTypeRecommend = 1` etc. are untyped int constants → comparing with int8 field works (untyped constants convert). `c.Type = int8(req.GetType())` OK.

In `channelTypeTags[c.Type]` — the map is map[int8]string, and c.Type is int8. Good.

Let me apply the cleanups.
````

</details>

Let me apply a few code cleanups:

<details><summary>🛠 bash</summary>

```
BUILD+VET OK
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:32:38

<details><summary>🛠 bash</summary>

```
=== go build ===
build ok (no output)
=== go vet ===
vet ok (no output)
=== gofmt -l ===
gofmt ok (no files listed)
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:32:41

<details><summary>🧠 思考过程</summary>

```
All three checks pass. Let me do a final review of the whole diff by reading the key files once more to catch issues.

Let me re-read the final channel.go and check the ListChannelProducts flow and the overall file.

Also let me double check one thing: in `SaveChannel`, `channelProductTags(c)` is computed from the *saved* channel (c has the new code/type/name). Good.

Another check: `UpdateChannelProductCount` — the channels table column is `product_count`. Good.

One more: in the ListChannelProducts response, `channel.ProductCount = int(total)` — I set it on the pointer returned by FindChannelByID, which is a fresh object, so no side effects on the DB. Good.

Let me also verify the final marketing handler file compiles and review the overall list of implemented RPCs against the proto:

product:
1. ListChannels ✓
2. GetChannel ✓
3. ListChannelProducts ✓
4. SaveChannel ✓
5. DeleteChannel ✓
6. ListReviewTags ✓
7. SaveReviewTag ✓
8. DeleteReviewTag ✓
9. ListGuarantees ✓
10. SaveGuarantee ✓
11. DeleteGuarantee ✓
12. ListProductParams ✓
13. ListProductQuestions ✓
14. CreateQuestion ✓
15. ListQuestions ✓
16. AnswerQuestion ✓

marketing:
17. SignIn ✓
18. GetSignInStatus ✓
19. ListTasks ✓
20. ClaimTask ✓
21. GetPromotion ✓
22. ListPromotionProducts ✓
23. ListPromotionSessions ✓
24. SavePromotionSession ✓
25. ListGroupBuys ✓
26. GetGroupBuy ✓
27. JoinGroupBuy ✓
28. SaveGroupBuy ✓
29. ListUserLevels ✓

All 29.

Let me do a final read of a couple of files to double-check quality, e.g. groupbuy.go's JoinGroupBuy and the marketing handler.

Also one last check: does `marketingv1.MarketingServiceServer` include `ListUserLevels`? Yes, the proto has it and the cmd build passed.

Let me quickly grep the handler files to confirm all 29 methods exist.
```

</details>

<details><summary>🛠 bash</summary>

```
--- product handler methods ---
AnswerQuestion
CreateCategory
CreateProduct
CreateQuestion
CreateReview
DeleteBanner
DeleteCategory
DeleteChannel
DeleteGuarantee
DeleteMaterial
DeleteProduct
DeleteReviewTag
GetChannel
GetProduct
ListBanners
ListCategories
ListChannelProducts
ListChannels
ListGuarantees
ListMaterials
ListProductParams
ListProductQuestions
ListProducts
ListQuestions
ListReviewTags
ListReviews
SaveBanner
SaveChannel
SaveGuarantee
SaveMaterial
SaveReviewTag
SaveSku
SetProductStatus
SetReviewStatus
UpdateCategory
UpdateProduct
--- marketing handler methods ---
ClaimTask
DeleteCoupon
DeletePromotion
GetGroupBuy
GetPromotion
GetSignInStatus
JoinGroupBuy
ListCoupons
ListGroupBuys
ListPromotionProducts
ListPromotionSessions
ListPromotions
ListTasks
ListUserCoupons
ListUserLevels
PreviewCheckout
ReceiveCoupon
SaveCoupon
SaveGroupBuy
SavePromotion
SavePromotionSession
SignIn
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:32:49

<details><summary>🧠 思考过程</summary>

```
All 29 new RPCs are implemented (16 product + 13 marketing).

Let me do one final sanity check of the database state to ensure my test runs left the seed data intact (I already restored channels.product_count and users.points).

Let me do a final verification query of the affected tables' counts vs the seed.

Then write the final report.

Let me also double-check that the files I created don't contain any TODO/placeholder.
```

</details>

<details><summary>🛠 bash</summary>

```
no TODO/placeholder found
--- db state ---
mysql: [Warning] Using a password on the command line interface can be insecure.
channels	tags	guarantees	questions	signins	tasks	user_tasks	group_buys	members	sessions	levels
9	8	5	3	2	6	3	2	5	3	5
```

</details>

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:32:53

All 29 RPCs are implemented, verified against the live MySQL seed data, and the database is back to its seeded state.

## 1. 实现的 RPC 与关键业务逻辑

### product 域（16 个，均在 `backend/internal/product/`）

| # | RPC | 关键逻辑 |
|---|---|---|
| 1 | `ListChannels` | `channels` 表分页查询（keyword 匹配 name/code，type 过滤），按 `sort,id` 排序，返回 meta |
| 2 | `GetChannel` | 按 ID 查频道，不存在返回 `CodeNotFound`「频道不存在」 |
| 3 | `ListChannelProducts` | 按频道标签关联取上架商品，支持 keyword + sort(default/sales/price_asc/price_desc/newest)，响应的 `channel.product_count` 回填为实际命中数 |
| 4 | `SaveChannel` | 新增/更新频道；code 唯一，冲突返回 `CodeConflict`「频道编码已存在」；保存后重算并落库 `product_count` |
| 5 | `DeleteChannel` | 校验存在后物理删除（该表无 `deleted_at`），返回 `OperationResult` |
| 6 | `ListReviewTags` | `review_tags` 分页（keyword 匹配 name），按 `sort,id` 排序 |
| 7 | `SaveReviewTag` | 新增/更新标签，名称非空校验 |
| 8 | `DeleteReviewTag` | 校验存在后删除 |
| 9 | `ListGuarantees` | `guarantees` 分页，按 `sort,id` 排序 |
| 10 | `SaveGuarantee` | 新增/更新保障项，名称非空校验 |
| 11 | `DeleteGuarantee` | 校验存在后删除 |
| 12 | `ListProductParams` | 从 `product_attributes` 读商品参数，按 `sort,id` 排序并按「名称+取值」去重（种子数据存在重复行） |
| 13 | `ListProductQuestions` | 商品下的公开问答分页（商品不存在返回 `CodeProductNotFound`） |
| 14 | `CreateQuestion` | `resolveUserID(ctx, 0)` 取登录用户，未登录返回 `CodeUnauthorized`；写入商品标题、用户昵称（只读 `users` 表）、内容、图片 |
| 15 | `ListQuestions` | 后台问答分页，支持 keyword / product_id 过滤 |
| 16 | `AnswerQuestion` | 写 `reply` + `reply_at`（`2006-01-02 15:04:05`），返回最新记录 |

### marketing 域（13 个，均在 `backend/internal/marketing/`）

| # | RPC | 关键逻辑 |
|---|---|---|
| 17 | `SignIn` | 按自然日唯一（`uk_user_date`）；重复签到返回 `CodeConflict`「今日已签到，请明天再来」；连续天数取昨天记录 +1，断签归 1；积分 = `min(5+(连续-1)*1, 20)`；同事务写 `sign_in_records` + `users.points` + `user_points_logs` |
| 18 | `GetSignInStatus` | 返回今日是否已签到、连续天数、累计天数、今日获得积分、下次可得积分、本月日历（每天 signed/points） |
| 19 | `ListTasks` | 任务定义分页（仅 enabled）+ 合并当前用户 `user_tasks` 的 progress/completed/claimed |
| 20 | `ClaimTask` | 校验任务存在/启用/已完成/未领取；条件更新 `claimed=0→1`（并发兜底）；发积分 + `reward_coupon_id` 发放优惠券；重复领取报错 |
| 21 | `GetPromotion` | 返回活动本体 + 关联商品 + 活动场次 |
| 22 | `ListPromotionProducts` | 活动商品 = 活动绑定商品 ∪ 该活动下拼团的商品，去重后分页，含库存合计 |
| 23 | `ListPromotionSessions` | 按 `promotion_id` 分页，状态按时间实时推导（未开始/进行中/已结束） |
| 24 | `SavePromotionSession` | 校验活动存在、名称非空、起止时间；**同活动场次时间区间不允许重叠**，重叠返回「场次时间与已有场次「xxx」重叠」 |
| 25 | `ListGroupBuys` | keyword 过滤；status 0=全部，1/2 按时间区间推导进行中/已结束，3=已下线 |
| 26 | `GetGroupBuy` | 活动详情 + 成员列表 |
| 27 | `JoinGroupBuy` | 校验登录、上下线、活动时间窗、重复参与（`group_buy_members` 查重）；先原子占名额（`joined_members < group_size` 条件更新）再落成员记录，满员返回「该拼团已满」 |
| 28 | `SaveGroupBuy` | 校验名称/价格/成团人数/时间区间；从 `products` 只读投影补全标题、封面、原价；更新时保留 `group_size` 与已参团人数 |
| 29 | `ListUserLevels` | 只读 `user_levels`，按 level 排序，`benefits` JSON 数组解析为字符串数组 |

## 2. 文件清单

**新建（product）**：`channel.go`、`review_tag.go`、`guarantee.go`、`params.go`、`question.go`
**修改（product）**：`handler.go`（新增 16 个 handler 方法）
**新建（marketing）**：`signin.go`、`task.go`、`groupbuy.go`、`session.go`、`promotion_detail.go`、`level.go`、`points.go`、`product_projection.go`
**修改（marketing）**：`handler.go`（新增 13 个 handler 方法）

未改动 `proto/`、`gen/`、`errs/`、`cmd/` 及其它任何目录。

## 3. 自检输出（实际运行）

```
$ go build ./backend/internal/product/... ./backend/internal/marketing/...
（无输出，成功）
$ go vet ./backend/internal/product/... ./backend/internal/marketing/...
（无输出，成功）
$ gofmt -l backend/internal/product/ backend/internal/marketing/
（无输出，无未格式化文件）
```
额外验证：`go build ./backend/cmd/product-service/... ./backend/cmd/marketing-service/...` 通过 —— 说明 handler 完整满足 gRPC Server 接口。

另外用临时集成测试（已删除）对真实 MySQL（127.0.0.1:13306）跑通了全部 29 个 RPC：签到→重复签到报错、积分流水写入（80→85 且流水 balance 一致）、任务领取→重复领取报错、参团→重复参团报错、场次重叠报错、频道-标签关联命中（包邮/生鲜频道各命中「进口车厘子 2kg 装」）、问答创建/回答等。测试产生的临时数据已清理，`channels.product_count` 与 `users.points` 已还原为种子值。

## 4. ListChannelProducts 的关联策略

`channels` 与 `products` **没有**外键或中间表，`products` 侧也没有 `channel_id` 字段，因此按以下规则用商品 `tags`（逗号分隔，做 `FIND_IN_SET` 精确匹配）关联：

1. **一级**：`channel.code` → 标签映射表（`flash→限时`、`presale→预售`、`clearance→清仓`、`freeship→包邮`、`cross→跨境`、`fresh→生鲜`）；
2. **二级**：`channel.type` → 标签兜底映射（4→限时、5→预售、6→清仓、7→包邮、8→跨境）；
3. **三级**：以上都命中不到时，用 `channel.name` 本身作为标签，但排除「推荐/新品/热销/楼层」这类泛化名称；
4. 命中不到任何标签的频道（推荐/新品/热销/楼层）返回**全部上架商品**，排序由频道类型决定：新品→`newest`，其余→`sales`。

实测：频道 7（包邮）与频道 9（生鲜）各命中 1 个商品，频道 1/2/3 各命中 12 个（全部上架商品）。

## 5. 未实现 / 需确认的部分（诚实说明）

1. **`errs.CodePromotionNotFound` 在 `errs.go` 中并不存在**（现有营销码只有 `CodeCouponNotFound(8000)`/`CodePromotionInvalid(8003)`）。按「不得修改共享 errs.go」的约束，我改用 `errs.CodeNotFound(1002)` + 中文文案区分「拼团活动不存在/活动场次不存在/渠道不存在」。如需独立错误码，请由 errs owner 统一新增。
2. **数据库实际结构与任务描述有出入**，我以实际表结构为准：
   - `product_questions` 无 `answer/answered_by/answered_at/status` 列，实际是 `reply/reply_at`；**因此「记录回答人」无处落库**，我只记录了回答时间（`reply_at`），回答人未持久化。
   - `sign_in_records` 是 `points_awarded`（不是 `reward_points`）。
   - `user_tasks` 是 `completed/claimed` 两个布尔列（没有 `status`）。
   - `group_buy_members` **没有 `is_leader` 列**，也没有 `order_id/status`；因此「团长/团员」无法区分，`JoinGroupBuyRequest.quantity` 也无处存储（仅用于校验购买数量 ≤ 团人数上限）。
   - `group_buys` 无 `sku_id/required_points/max_groups`，`group_size` 即团总人数上限。
   - `promotion_sessions` 无 `capacity/description`，`stock` 即库存。
3. **「满员后置为已成团」无法按字面实现**：`group_buys.status` 只有 0/1/2/3（未开始/进行中/已结束/已下线），没有「已成团」枚举。我保留 `status=1`（进行中），成团与否由 `joined_members >= required_members` 推导，满员（`joined_members == group_size`）时拒绝新参团。如需独立状态位，需要扩展表结构。
4. **`ListChannels` / `ListReviewTags` / `ListGuarantees` 返回全部记录（含 disabled）**：这三个 RPC 同时服务前台与后台，请求体没有状态过滤字段，过滤会导致后台无法管理已停用项；响应中已带 `status`/`enabled` 字段供前端自行过滤。若需要前台只看启用项，需在 proto 增加过滤字段（我无权改 proto）。
5. **未登录调用 `ListTasks`** 返回任务定义但进度为零（未报错）；`SignIn`/`GetSignInStatus`/`ClaimTask`/`JoinGroupBuy`/`CreateQuestion` 未登录一律返回 `CodeUnauthorized`。
6. **`ListGroupBuys` 的 status=0 表示「全部」**（与现有 `ListPromotions` 的 `status > 0` 约定一致），代价是无法单独筛选「未开始」的活动。
7. 营销域为读取商品信息，定义了 `products`/`product_skus`/`users`/`user_points_logs` 的**只读投影模型**（含写 `users.points` 与 `user_points_logs`），沿用仓库里 `LogisticTemplate` 跨域只读的既有做法；这些模型**未**加入 `cmd/marketing-service` 的 AutoMigrate 列表（cmd/ 不在我的所有权范围，且这些表由用户/商品服务维护），表结构由既有 SQL 脚本保证。
