-- ===========================================================================
-- ShopStack 电商中台 —— 扩展种子数据
-- ---------------------------------------------------------------------------
-- 与 03-extend.sql 配套，覆盖新增表的基础数据。
-- ===========================================================================

USE `shopstack`;

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------------
-- 会员等级
-- ---------------------------------------------------------------------------
INSERT INTO `user_levels` (`id`, `name`, `level`, `min_growth`, `max_growth`, `discount_percent`, `icon`, `description`, `benefits`, `sort`) VALUES
(1, '普通会员', 1,    0,   999,    100, 'https://placehold.co/64x64/9AA5B1/FFFFFF?text=L1', '注册即成为普通会员',        '["购物车收藏","基础优惠券"]', 1),
(2, '白银会员', 2, 1000,  4999,     99, 'https://placehold.co/64x64/9AA5B1/FFFFFF?text=L2', '累计成长值满 1000 升级',   '["9.9折","生日券","优先客服"]', 2),
(3, '黄金会员', 3, 5000, 19999,     95, 'https://placehold.co/64x64/D4A017/FFFFFF?text=L3', '累计成长值满 5000 升级',   '["9.5折","专属客服","免运费券"]', 3),
(4, '铂金会员', 4,20000, 49999,     90, 'https://placehold.co/64x64/8C7853/FFFFFF?text=L4', '累计成长值满 20000 升级',  '["9折","专属客服","生日双倍积分"]', 4),
(5, '钻石会员', 5,50000,9999999,     85, 'https://placehold.co/64x64/2A4AD9/FFFFFF?text=L5', '累计成长值满 50000 升级',  '["8.5折","专属客服经理","新品优先购"]', 5)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- ---------------------------------------------------------------------------
-- 行政区域（省级 + 部分市/区示例）
-- ---------------------------------------------------------------------------
INSERT INTO `regions` (`id`, `parent_id`, `name`, `code`, `level`, `sort`) VALUES
(1, 0, '北京市', '110000', 1, 1),
(2, 1, '北京市', '110100', 2, 1),
(3, 2, '朝阳区', '110105', 3, 1),
(4, 2, '海淀区', '110108', 3, 2),
(5, 0, '上海市', '310000', 1, 2),
(6, 5, '上海市', '310100', 2, 1),
(7, 6, '浦东新区', '310115', 3, 1),
(8, 0, '广东省', '440000', 1, 3),
(9, 8, '广州市', '440100', 2, 1),
(10, 9, '天河区', '440106', 3, 1),
(11, 9, '越秀区', '440104', 3, 2),
(12, 8, '深圳市', '440300', 2, 2),
(13, 12, '南山区', '440305', 3, 1),
(14, 12, '福田区', '440304', 3, 2),
(15, 0, '浙江省', '330000', 1, 4),
(16, 15, '杭州市', '330100', 2, 1),
(17, 16, '西湖区', '330106', 3, 1),
(18, 16, '余杭区', '330110', 3, 2),
(19, 0, '江苏省', '320000', 1, 5),
(20, 19, '南京市', '320100', 2, 1),
(21, 20, '玄武区', '320102', 3, 1),
(22, 0, '四川省', '510000', 1, 6),
(23, 22, '成都市', '510100', 2, 1),
(24, 23, '武侯区', '510107', 3, 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- ---------------------------------------------------------------------------
-- 用户发票抬头模板 / 通知偏好 / 反馈 / 帮助文章
-- ---------------------------------------------------------------------------
INSERT INTO `user_invoice_templates` (`id`, `user_id`, `title`, `tax_no`, `type`, `email`, `phone`, `address`, `bank_name`, `bank_account`, `is_default`) VALUES
(1, 1, '演示用户', '', 'personal', 'demo@example.com', '13800138000', '北京市朝阳区建国路 1 号', '', '', 1),
(2, 1, '杭州云启科技有限公司', '91330100MA2XXXXX9B', 'company', 'finance@example.com', '13800138000', '浙江省杭州市西湖区文一西路 969 号', '招商银行杭州分行', '571900123456789', 0)
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`);

INSERT INTO `user_notification_settings` (`user_id`, `order_notice`, `logistics_notice`, `marketing_notice`, `system_notice`, `sms_notice`, `email_notice`, `wechat_notice`) VALUES
(1, 1, 1, 0, 1, 1, 0, 0)
ON DUPLICATE KEY UPDATE `order_notice` = VALUES(`order_notice`);

INSERT INTO `user_feedbacks` (`id`, `user_id`, `user_nickname`, `type`, `content`, `images`, `contact`, `status`, `reply`, `created_at`) VALUES
(1, 1, '演示用户', 1, '希望增加优惠券叠加功能', '', 'demo@example.com', 2, '已记录，下个版本支持', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(2, 2, '张三', 2, '结算页在 iPhone 上偶尔显示错位', '[]', '13800138001', 0, '', DATE_SUB(NOW(), INTERVAL 2 DAY))
ON DUPLICATE KEY UPDATE `content` = VALUES(`content`);

INSERT INTO `help_articles` (`id`, `category_id`, `category_name`, `title`, `content`, `sort`, `enabled`, `view_count`) VALUES
(1, 1, '购物指南', '如何挑选合适的规格', '在商品详情页点击「选择规格」，可以查看每个 SKU 对应的价格、库存与配送时效。', 1, 1, 128),
(2, 1, '购物指南', '购物车里的商品为什么会失效', '商品下架、库存售罄或店铺调价时，购物车中的对应条目会标记为失效，请在结算前移除。', 2, 1, 86),
(3, 2, '配送说明', '支持哪些配送方式', '平台支持快递配送、同城配送与门店自提，具体以结算页展示为准。', 1, 1, 213),
(4, 2, '配送说明', '运费怎么计算', '订单金额达到包邮门槛即免运费，未达到时按运费模板的规则收取。', 2, 1, 174),
(5, 3, '售后服务', '如何申请退货退款', '在「我的订单」中找到对应订单，点击「申请售后」，选择退款原因并提交即可。', 1, 1, 302),
(6, 3, '售后服务', '退款多久到账', '审核通过后按原支付渠道退回，微信与支付宝一般 1-3 个工作日到账。', 2, 1, 259),
(7, 4, '账号问题', '如何修改绑定手机号', '进入「账号安全」页面，验证原手机号后即可绑定新手机号。', 1, 1, 97),
(8, 4, '账号问题', '积分怎么获得', '签到、评价、下单与完成任务均可获得积分，积分可在结算时抵扣。', 2, 1, 341)
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`);

-- ---------------------------------------------------------------------------
-- 频道 / 评价标签 / 保障项 / 商品问答
-- ---------------------------------------------------------------------------
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
(1, '七天无理由退货', 2, 1, 1),
(2, '商品质量问题',  2, 2, 1),
(3, '发错货',        2, 3, 1),
(4, '少件漏发',      2, 4, 1),
(5, '不喜欢/不想要', 1, 5, 1),
(6, '拍错了/多拍了', 1, 6, 1),
(7, '地址填错了',    2, 7, 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

INSERT INTO `after_sales` (`id`, `after_sale_no`, `order_id`, `order_no`, `user_id`, `user_nickname`, `type`, `amount_cents`, `reason`, `description`, `item_ids`, `status`, `admin_remark`, `created_at`) VALUES
(1, 'AS20261018000001', 1, '20261018100000000001', 1, '演示用户', 1, 8900, '不喜欢/不想要', '临时不需要了，申请退款', '[14]', 2, '已按用户申请处理', DATE_SUB(NOW(), INTERVAL 4 DAY))
ON DUPLICATE KEY UPDATE `reason` = VALUES(`reason`);

-- ---------------------------------------------------------------------------
-- 快递公司 / 配送范围
-- ---------------------------------------------------------------------------
INSERT INTO `logistics_companies` (`id`, `name`, `code`, `logo`, `phone`, `enabled`, `sort`, `supports_cod`) VALUES
(1, '顺丰速运', 'SF',  'https://placehold.co/64x64/000000/FFFFFF?text=SF',  '95338', 1, 1, 1),
(2, '中通快递', 'ZTO', 'https://placehold.co/64x64/2A4AD9/FFFFFF?text=ZTO', '95311', 1, 2, 0),
(3, '圆通速递', 'YTO', 'https://placehold.co/64x64/E67E22/FFFFFF?text=YTO', '95554', 1, 3, 0),
(4, '韵达快递', 'YD',  'https://placehold.co/64x64/16A085/FFFFFF?text=YD',  '95546', 1, 4, 0),
(5, '京东物流', 'JD',  'https://placehold.co/64x64/A04000/FFFFFF?text=JD',  '950616', 1, 5, 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

INSERT INTO `delivery_ranges` (`id`, `template_id`, `regions`, `freight_cents`, `free_freight_amount_cents`, `enabled`) VALUES
(1, 1, '全国',       0,    0,    1),
(2, 2, '华东,华南', 1000, 9900, 1),
(3, 2, '华北,西南', 1500, 9900, 1),
(4, 2, '港澳台,海外', 3000, 19900, 1)
ON DUPLICATE KEY UPDATE `regions` = VALUES(`regions`);

-- ---------------------------------------------------------------------------
-- 仓库 / 入库 / 出库 / 盘点
-- ---------------------------------------------------------------------------
INSERT INTO `warehouses` (`id`, `code`, `name`, `address`, `contact`, `phone`, `enabled`, `sort`) VALUES
(1, 'WH-SH', '上海中心仓', '上海市青浦区物流园 1 号库', '张仓管', '13800138010', 1, 1),
(2, 'WH-BJ', '北京分仓',   '北京市大兴区物流园 2 号库', '李仓管', '13800138011', 1, 2),
(3, 'WH-GZ', '广州前置仓', '广州市白云区物流园 3 号库', '王仓管', '13800138012', 1, 3)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

INSERT INTO `inbound_orders` (`id`, `inbound_no`, `warehouse_id`, `warehouse_name`, `supplier`, `status`, `total_quantity`, `remark`, `operator`, `created_at`) VALUES
(1, 'IN20261018001', 1, '上海中心仓', '云南直供基地', 1, 240, '常规补货', '管理员', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(2, 'IN20261020001', 1, '上海中心仓', '华东品牌方', 0, 120, '新品首批入库', '管理员', DATE_SUB(NOW(), INTERVAL 1 DAY))
ON DUPLICATE KEY UPDATE `supplier` = VALUES(`supplier`);

INSERT INTO `inbound_order_items` (`id`, `inbound_id`, `sku_id`, `sku_code`, `spec_text`, `quantity`) VALUES
(1, 1, 14, 'SKU-P7-2KG-JJ',    '2kg / JJ级',   120),
(2, 1, 15, 'SKU-P7-2KG-XXXL', '2kg / XXXL级', 80),
(3, 2, 14, 'SKU-P7-2KG-JJ',    '2kg / JJ级',   120)
ON DUPLICATE KEY UPDATE `quantity` = VALUES(`quantity`);

INSERT INTO `outbound_orders` (`id`, `outbound_no`, `warehouse_id`, `warehouse_name`, `order_id`, `order_no`, `status`, `total_quantity`, `remark`, `operator`, `created_at`) VALUES
(1, 'OUT20261018001', 1, '上海中心仓', 1, '20261018100000000001', 1, 2, '正常出库', '管理员', DATE_SUB(NOW(), INTERVAL 4 DAY)),
(2, 'OUT20261020001', 1, '上海中心仓', 0, '', 0, 0, '待拣货', '管理员', DATE_SUB(NOW(), INTERVAL 6 HOUR))
ON DUPLICATE KEY UPDATE `remark` = VALUES(`remark`);

INSERT INTO `outbound_order_items` (`id`, `outbound_id`, `sku_id`, `sku_code`, `spec_text`, `quantity`) VALUES
(1, 1, 14, 'SKU-P7-2KG-JJ', '2kg / JJ级', 2)
ON DUPLICATE KEY UPDATE `quantity` = VALUES(`quantity`);

INSERT INTO `stock_checks` (`id`, `check_no`, `warehouse_id`, `warehouse_name`, `status`, `total_count`, `diff_count`, `remark`, `operator`, `created_at`) VALUES
(1, 'CK20261015001', 1, '上海中心仓', 1, 18, 2, '月度盘点', '管理员', DATE_SUB(NOW(), INTERVAL 8 DAY)),
(2, 'CK20261020001', 1, '上海中心仓', 0, 0, 0, '临时抽盘', '管理员', DATE_SUB(NOW(), INTERVAL 4 HOUR))
ON DUPLICATE KEY UPDATE `remark` = VALUES(`remark`), `total_count` = VALUES(`total_count`), `diff_count` = VALUES(`diff_count`), `status` = VALUES(`status`);

INSERT INTO `stock_check_items` (`id`, `stock_check_id`, `sku_id`, `sku_code`, `spec_text`, `book_quantity`, `actual_quantity`, `diff_quantity`) VALUES
(1, 1, 14, 'SKU-P7-2KG-JJ',    '2kg / JJ级',   900, 898, -2),
(2, 1, 15, 'SKU-P7-2KG-XXXL', '2kg / XXXL级', 380, 380, 0)
ON DUPLICATE KEY UPDATE `actual_quantity` = VALUES(`actual_quantity`), `diff_quantity` = VALUES(`diff_quantity`), `book_quantity` = VALUES(`book_quantity`);

-- ---------------------------------------------------------------------------
-- 支付渠道 / 余额流水 / 充值单
-- ---------------------------------------------------------------------------
INSERT INTO `pay_channels` (`id`, `name`, `channel`, `code`, `icon`, `enabled`, `sort`, `config`) VALUES
(1, '微信支付', 1, 'wechat', 'https://placehold.co/64x64/07C160/FFFFFF?text=WX', 1, 1, '{"app_id":"","mch_id":"","notify_url":""}'),
(2, '支付宝',   2, 'alipay', 'https://placehold.co/64x64/1677FF/FFFFFF?text=ALI', 1, 2, '{"app_id":"","notify_url":""}'),
(3, '余额支付', 3, 'balance', 'https://placehold.co/64x64/8C7853/FFFFFF?text=BAL', 1, 3, '{}')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

INSERT INTO `balance_logs` (`id`, `user_id`, `change`, `balance`, `title`, `biz_type`, `created_at`) VALUES
(1, 1, 888800, 888800, '账户初始余额', 'admin', DATE_SUB(NOW(), INTERVAL 30 DAY)),
(2, 1, -17800, 871000, '订单支付', 'order', DATE_SUB(NOW(), INTERVAL 2 DAY))
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`);

INSERT INTO `recharge_orders` (`id`, `recharge_no`, `user_id`, `amount_cents`, `bonus_cents`, `status`, `channel`, `payment_no`, `created_at`) VALUES
(1, 'RC20261015001', 1, 100000, 5000, 1, 1, '20261015900000000001', DATE_SUB(NOW(), INTERVAL 6 DAY)),
(2, 'RC20261020001', 1, 50000, 0, 0, 1, '', DATE_SUB(NOW(), INTERVAL 2 HOUR))
ON DUPLICATE KEY UPDATE `amount_cents` = VALUES(`amount_cents`);

-- ---------------------------------------------------------------------------
-- 通知模板 / 短信模板 / 敏感词
-- ---------------------------------------------------------------------------
INSERT INTO `notification_templates` (`id`, `code`, `name`, `type`, `title`, `content`, `link`, `enabled`) VALUES
(1, 'ORDER_CREATED',    '订单创建成功', 1, '订单 {{order_no}} 创建成功', '您的订单 {{order_no}} 已创建成功，请尽快完成支付。', '/order/{{order_id}}', 1),
(2, 'ORDER_PAID',       '支付成功',     1, '订单 {{order_no}} 支付成功', '您的订单 {{order_no}} 已支付成功，商家将尽快为您发货。', '/order/{{order_id}}', 1),
(3, 'ORDER_CANCELLED',  '订单取消',     1, '订单 {{order_no}} 已取消', '您的订单 {{order_no}} 已取消，如为误操作请重新下单。', '/order', 1),
(4, 'ORDER_SHIPPED',    '商品发货',     2, '订单 {{order_no}} 已发货', '您的订单 {{order_no}} 已发货，承运商：{{company}}，运单号：{{tracking_no}}。', '/logistics/{{order_id}}', 1),
(5, 'ORDER_COMPLETED',  '交易完成',     1, '订单 {{order_no}} 交易完成', '感谢您的购买，期待您再次光临。', '/order/{{order_id}}', 1),
(6, 'PROMOTION_START',  '活动开始',     3, '{{name}} 限时开启', '{{name}} 已开始，全场低至 {{price}} 折。', '/promotion/{{id}}', 1),
(7, 'SYSTEM_NOTICE',    '系统公告',     4, '{{title}}', '{{content}}', '', 1)
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`);

INSERT INTO `sms_templates` (`id`, `code`, `name`, `content`, `enabled`) VALUES
(1, 'LOGIN_CODE',   '登录验证码',   '您的验证码是 {{code}}，5 分钟内有效，请勿泄露给他人。', 1),
(2, 'REGISTER_CODE','注册验证码',   '欢迎注册，验证码 {{code}}，{{minutes}} 分钟内有效。', 1),
(3, 'BIND_PHONE',   '绑定手机号',   '验证码 {{code}}，用于绑定手机号。', 1),
(4, 'ORDER_PAID_SMS','支付成功短信', '订单 {{order_no}} 支付成功，金额 {{amount}} 元。', 1),
(5, 'LOGIN_ALERT',  '异地登录提醒', '您的账号于 {{time}} 在 {{place}} 登录，如非本人操作请及时修改密码。', 1)
ON DUPLICATE KEY UPDATE `content` = VALUES(`content`);

INSERT INTO `sensitive_words` (`id`, `word`, `category`, `status`) VALUES
(1, '加微信',   3, 1),
(2, '私下交易', 3, 1),
(3, '免费领取', 3, 1),
(4, '傻逼',     2, 1),
(5, '垃圾',     2, 1),
(6, '违禁品',   1, 1),
(7, '枪支',     1, 1),
(8, '代开发票', 3, 1)
ON DUPLICATE KEY UPDATE `word` = VALUES(`word`);

-- 签到活动配置（单行表，id 固定为 1）
INSERT INTO `sign_in_configs` (`id`, `enabled`, `points_awarded`, `continuous_step`, `max_points`, `continuous_days_required`, `calendar_days`, `description`) VALUES
(1, 1, 5, 1, 20, 7, 7, '每日签到得 5 积分，连续签到每多一天额外 +1，单次上限 20 积分。')
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);
