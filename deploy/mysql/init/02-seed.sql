-- ===========================================================================
-- ShopStack 电商中台 —— 种子数据
-- ---------------------------------------------------------------------------
-- 演示账号：
--   后台管理员  admin   / admin123456
--   普通用户    demo    / demo123456
-- 密码均为 bcrypt 哈希。
-- ===========================================================================

USE `shopstack`;

-- 显式声明客户端字符集，避免初始化脚本按 latin1 二次编码导致中文乱码
SET NAMES utf8mb4;

-- ---------------------------------------------------------------------------
-- 权限
-- ---------------------------------------------------------------------------
INSERT INTO `permissions` (`id`, `name`, `code`, `group`, `type`, `parent_code`, `sort`) VALUES
(1,  '商品管理', 'product:view',      'product', 'menu',   '',            10),
(2,  '商品新增', 'product:create',    'product', 'action', 'product:view', 11),
(3,  '商品编辑', 'product:update',    'product', 'action', 'product:view', 12),
(4,  '商品删除', 'product:delete',    'product', 'action', 'product:view', 13),
(5,  '分类管理', 'category:view',     'product', 'menu',   '',            20),
(6,  '分类编辑', 'category:update',   'product', 'action', 'category:view', 21),
(7,  '评价审核', 'review:audit',      'product', 'action', 'product:view', 30),
(8,  '订单管理', 'order:view',        'order',   'menu',   '',            40),
(9,  '订单发货', 'order:ship',        'order',   'action', 'order:view',  41),
(10, '订单备注', 'order:update',      'order',   'action', 'order:view',  42),
(11, '退款处理', 'refund:audit',      'order',   'action', 'order:view',  43),
(12, '支付管理', 'payment:view',      'order',   'menu',   '',            50),
(13, '用户管理', 'user:view',         'user',    'menu',   '',            60),
(14, '用户编辑', 'user:update',       'user',    'action', 'user:view',   61),
(15, '库存管理', 'inventory:view',    'product', 'menu',   '',            70),
(16, '库存调整', 'inventory:adjust',  'product', 'action', 'inventory:view', 71),
(17, '营销管理', 'marketing:view',    'marketing','menu',  '',            80),
(18, '优惠券',  'coupon:update',     'marketing','action','marketing:view', 81),
(19, '活动管理', 'promotion:update',  'marketing','action','marketing:view', 82),
(20, '内容管理', 'content:view',      'marketing','menu',  '',            90),
(21, '轮播编辑', 'banner:update',     'marketing','action','content:view', 91),
(22, '物流管理', 'logistics:view',    'logistics','menu', '',            100),
(23, '角色权限', 'system:role',       'system',  'menu',   '',            110),
(24, '操作日志', 'system:audit',      'system',  'action', 'system:role', 111),
(25, '数据看板', 'system:dashboard',  'system',  'menu',   '',            120)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- ---------------------------------------------------------------------------
-- 角色
-- ---------------------------------------------------------------------------
INSERT INTO `roles` (`id`, `name`, `code`, `description`) VALUES
(1, '超级管理员', 'super_admin', '拥有全部权限'),
(2, '运营专员',   'operator',    '商品、订单、营销运营'),
(3, '客服专员',   'customer_service', '订单查询与售后处理'),
(4, '仓库管理员', 'warehouse',   '库存与物流管理')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 超级管理员：全部权限
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT 1, `id` FROM `permissions`;

-- 运营专员
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES
(2,1),(2,2),(2,3),(2,5),(2,6),(2,8),(2,10),(2,11),(2,17),(2,18),(2,19),(2,20),(2,21),(2,25);

-- 客服专员
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES
(3,8),(3,10),(3,11),(3,13),(3,25);

-- 仓库管理员
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES
(4,15),(4,16),(4,22),(4,8),(4,9);

-- ---------------------------------------------------------------------------
-- 管理员
-- ---------------------------------------------------------------------------
INSERT INTO `admins` (`id`, `username`, `password_hash`, `real_name`, `email`, `phone`, `status`) VALUES
(1, 'admin', '$2a$10$D52zg7ZTITdCC5anwsvYGehwsPNau2Eh2jIQ.dDAEj7MYz2oN9SRS', '超级管理员', 'admin@shopstack.dev', '13800000001', 1),
(2, 'operator', '$2a$10$D52zg7ZTITdCC5anwsvYGehwsPNau2Eh2jIQ.dDAEj7MYz2oN9SRS', '运营专员', 'operator@shopstack.dev', '13800000002', 1),
(3, 'service', '$2a$10$D52zg7ZTITdCC5anwsvYGehwsPNau2Eh2jIQ.dDAEj7MYz2oN9SRS', '客服专员', 'service@shopstack.dev', '13800000003', 1)
ON DUPLICATE KEY UPDATE `real_name` = VALUES(`real_name`);

INSERT IGNORE INTO `admin_roles` (`admin_id`, `role_id`) VALUES (1,1), (2,2), (3,3);

-- ---------------------------------------------------------------------------
-- 演示用户
-- ---------------------------------------------------------------------------
INSERT INTO `users` (`id`, `username`, `password_hash`, `nickname`, `avatar`, `phone`, `gender`, `points`, `balance_cents`, `status`) VALUES
(1, 'demo', '$2a$10$pvwP37JuMdXSYbWN5JTFJupCfEib3PZbCuNy6H2qUYivwG9ECUaim', '演示用户',
 'https://placehold.co/120x120/2A4AD9/FFFFFF?text=Demo', '13800138000', 1, 1200, 888800, 1),
(2, 'alice', '$2a$10$j39PmNWgo5Mz41EMtIHOFe.nCEg4ZJO.EnRkmLz.Wvdzgw32iHEre', '爱丽丝',
 'https://placehold.co/120x120/F5811F/FFFFFF?text=A', '13800138001', 2, 300, 0, 1),
(3, 'bob', '$2a$10$j39PmNWgo5Mz41EMtIHOFe.nCEg4ZJO.EnRkmLz.Wvdzgw32iHEre', '鲍勃',
 'https://placehold.co/120x120/12B76A/FFFFFF?text=B', '13800138002', 1, 80, 0, 1)
ON DUPLICATE KEY UPDATE `nickname` = VALUES(`nickname`);

INSERT INTO `user_addresses` (`id`, `user_id`, `receiver`, `phone`, `province`, `city`, `district`, `detail`, `tag`, `is_default`) VALUES
(1, 1, '张三', '13800138000', '浙江省', '杭州市', '西湖区', '文三路 100 号 8 楼 801 室', '公司', 1),
(2, 1, '张三', '13800138000', '浙江省', '杭州市', '余杭区', '未来科技城海创园 3 号楼', '家', 0),
(3, 2, '李四', '13800138001', '北京市', '北京市', '朝阳区', '建国路 88 号 SOHO 尚都 A 座 2201', '公司', 1),
(4, 3, '王五', '13800138002', '广东省', '深圳市', '南山区', '科技园南区腾讯大厦 15 楼', '公司', 1)
ON DUPLICATE KEY UPDATE `receiver` = VALUES(`receiver`);

-- ---------------------------------------------------------------------------
-- 商品分类
-- ---------------------------------------------------------------------------
INSERT INTO `categories` (`id`, `name`, `parent_id`, `icon`, `description`, `sort`, `visible`) VALUES
(1, '数码家电', 0, '📱', '手机、电脑与智能硬件', 10, 1),
(2, '家居生活', 0, '🏠', '家具、厨具与日用百货',   20, 1),
(3, '服饰鞋包', 0, '👕', '男女装、鞋靴与箱包',     30, 1),
(4, '食品生鲜', 0, '🍎', '零食、粮油与生鲜果蔬',   40, 1),
(5, '图书文娱', 0, '📚', '图书、音像与文创用品',   50, 1),
(6, '手机通讯', 1, '📱', '智能手机与配件',       11, 1),
(7, '电脑办公', 1, '💻', '笔记本、台式机与外设',   12, 1),
(8, '智能穿戴', 1, '⌚', '手表手环与智能眼镜',     13, 1),
(9, '厨房用品', 2, '🍳', '锅具、刀具与餐具',       21, 1),
(10,'家纺布艺', 2, '🛏️', '床品、窗帘与抱枕',      22, 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- ---------------------------------------------------------------------------
-- 商品
-- ---------------------------------------------------------------------------
INSERT INTO `products` (`id`, `title`, `subtitle`, `cover`, `category_id`, `min_price_cents`, `max_price_cents`, `sales_count`, `status`, `description`, `tags`, `created_at`) VALUES
(1, '旗舰智能手机 Pro 256GB', '骁龙旗舰芯片 · 潜望长焦 · 全天候续航',
 'https://placehold.co/600x600/2A4AD9/FFFFFF?text=Pro+256GB', 6, 429900, 529900, 1863, 2,
 '年度旗舰影像升级，2K 护眼直屏，5000mAh 大电池，100W 有线快充。', '旗舰,5G,拍照', NOW()),
(2, '轻薄商务笔记本 14 英寸', '1.2kg 轻薄机身 · 2.8K 高色域屏',
 'https://placehold.co/600x600/2239AC/FFFFFF?text=Notebook+14', 7, 599900, 699900, 942, 2,
 '1.2kg 镁铝合金机身，2.8K 120Hz 高色域屏，70Wh 长续航，生产力与便携兼顾。', '笔记本,办公', NOW()),
(3, '智能运动手表 GT4', '血氧心率监测 · 14 天长续航',
 'https://placehold.co/600x600/F5811F/FFFFFF?text=Watch+GT4', 8, 89900, 109900, 3120, 2,
 '双频 GPS 定位，全天候血氧与心率监测，100+ 运动模式，14 天典型续航。', '智能手表,运动', NOW()),
(4, '不粘炒锅 32cm', '少油不粘 · 通用燃气电磁炉',
 'https://placehold.co/600x600/12B76A/FFFFFF?text=Pan+32cm', 9, 12900, 19900, 5821, 2,
 '五层不粘涂层，导磁复合底，适用燃气与电磁炉，32cm 家庭容量。', '厨房,爆款', NOW()),
(5, '全棉四件套 1.8m', 'A 类母婴级 · 60 支长绒棉',
 'https://placehold.co/600x600/0BA5EC/FFFFFF?text=Bedding', 10, 29900, 39900, 2360, 2,
 '60 支新疆长绒棉，A 类母婴级标准，水洗不掉色不起球。', '家纺,舒适', NOW()),
(6, '纯棉商务休闲衬衫', '免烫抗皱 · 三种色可选',
 'https://placehold.co/600x600/4B586A/FFFFFF?text=Shirt', 3, 19900, 29900, 1450, 2,
 '100% 长绒棉，免烫抗皱处理，商务通勤与日常休闲皆宜。', '男装,基础款', NOW()),
(7, '进口车厘子 2kg 装', 'JJ 级 · 冷链直发 · 坏果包赔',
 'https://placehold.co/600x600/F04438/FFFFFF?text=Cherry+2kg', 4, 8900, 12900, 8740, 2,
 '原产地直采，JJ 级大果，冷链发货，坏果包赔。', '生鲜,包邮', NOW()),
(8, '职场效率管理指南', '从目标拆解到复盘闭环',
 'https://placehold.co/600x600/7A5AF8/FFFFFF?text=Book+PM', 5, 5900, 7900, 2205, 2,
 '系统讲解目标管理、项目拆解与复盘方法论，附可复用模板。', '图书,职场', NOW()),
(9, '降噪蓝牙耳机 Air', '42dB 主动降噪 · 空间音频',
 'https://placehold.co/600x600/121B26/FFFFFF?text=Earphone+Air', 6, 69900, 89900, 4310, 2,
 '双麦通话降噪，42dB 主动降噪，单次续航 8 小时，配合充电盒 32 小时。', '耳机,降噪', NOW()),
(10,'桌面双屏显示器 27 英寸', '2K IPS · 165Hz 刷新',
 'https://placehold.co/600x600/5F87FF/FFFFFF?text=Monitor+27', 7, 129900, 159900, 680, 2,
 '27 英寸 2K IPS 面板，165Hz 刷新率，Type-C 65W 反向供电。', '显示器,办公', NOW()),
(11,'便携蓝牙音箱 Mini', 'IPX7 防水 · 24 小时播放',
 'https://placehold.co/600x600/8AABFF/FFFFFF?text=Speaker+Mini', 6, 24900, 34900, 3980, 2,
 '360° 环绕单元，IPX7 级防水，24 小时续航，可串联组队。', '音箱,户外', NOW()),
(12,'高端保温杯 500ml', '316 内胆 · 12 小时保温',
 'https://placehold.co/600x600/3B63F6/FFFFFF?text=Thermo+500', 2, 15900, 21900, 6210, 2,
 '316 医用级不锈钢内胆，12 小时保温保冷，杯盖一键开合。', '水杯,礼品', NOW())
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`);

-- ---------------------------------------------------------------------------
-- 商品规格
-- ---------------------------------------------------------------------------
INSERT INTO `product_skus` (`id`, `product_id`, `sku_code`, `spec_text`, `specs`, `price_cents`, `original_price_cents`, `stock`, `image`, `sort`, `sales_count`, `enabled`) VALUES
(1, 1, 'SKU-P1-SILVER-256', '银色 / 12+256GB', '{"颜色":"银色","存储":"12+256GB"}', 429900, 499900, 320, '', 1, 980, 1),
(2, 1, 'SKU-P1-BLACK-512',  '黑色 / 12+512GB', '{"颜色":"黑色","存储":"12+512GB"}', 479900, 549900, 180, '', 2, 540, 1),
(3, 1, 'SKU-P1-BLUE-1TB',   '远峰蓝 / 12+1TB', '{"颜色":"远峰蓝","存储":"12+1TB"}', 529900, 619900, 96,  '', 3, 343, 1),
(4, 2, 'SKU-P2-I5-16',      '深空灰 / i5 / 16G / 512G', '{"颜色":"深空灰","处理器":"i5","内存":"16GB","硬盘":"512GB"}', 599900, 679900, 150, '', 1, 520, 1),
(5, 2, 'SKU-P2-I7-32',      '深空灰 / i7 / 32G / 1T',  '{"颜色":"深空灰","处理器":"i7","内存":"32GB","硬盘":"1TB"}', 699900, 799900, 88,  '', 2, 422, 1),
(6, 3, 'SKU-P3-BLACK-46',   '曜石黑 / 46mm', '{"颜色":"曜石黑","表盘":"46mm"}', 89900, 109900, 640, '', 1, 1980, 1),
(7, 3, 'SKU-P3-TITAN-46',  '钛金属 / 46mm', '{"颜色":"钛金属","表盘":"46mm"}', 109900, 129900, 210, '', 2, 1140, 1),
(8, 4, 'SKU-P4-32-GREY',    '32cm / 灰黑', '{"尺寸":"32cm","颜色":"灰黑"}', 12900, 16900, 1200, '', 1, 3800, 1),
(9, 4, 'SKU-P4-32-RED',     '32cm / 复古红', '{"尺寸":"32cm","颜色":"复古红"}', 15900, 19900, 860, '', 2, 2021, 1),
(10,5, 'SKU-P5-18-WHITE',   '1.8m / 白 / 四件套', '{"尺寸":"1.8m","颜色":"白色","件数":"四件套"}', 29900, 39900, 430, '', 1, 1500, 1),
(11,5, 'SKU-P5-18-GREY',    '1.8m / 灰 / 四件套', '{"尺寸":"1.8m","颜色":"灰色","件数":"四件套"}', 29900, 39900, 380, '', 2, 860, 1),
(12,6, 'SKU-P6-M-BLUE',     'M / 商务蓝', '{"尺码":"M","颜色":"商务蓝"}', 19900, 25900, 700, '', 1, 820, 1),
(13,6, 'SKU-P6-M-WHITE',    'M / 纯白', '{"尺码":"M","颜色":"纯白"}', 19900, 25900, 650, '', 2, 630, 1),
(14,7, 'SKU-P7-2KG-JJ',     '2kg / JJ级', '{"规格":"2kg","等级":"JJ级"}', 8900, 11900, 900, '', 1, 5200, 1),
(15,7, 'SKU-P7-2KG-XXXL',   '2kg / XXXL级', '{"规格":"2kg","等级":"XXXL级"}', 12900, 15900, 380, '', 2, 3540, 1),
(16,8, 'SKU-P8-PAPER',      '平装 / 单册', '{"装帧":"平装","版本":"单册"}', 5900, 7900, 800, '', 1, 1400, 1),
(17,8, 'SKU-P8-HARDCOVER',  '精装 / 赠笔记本', '{"装帧":"精装","版本":"赠笔记本"}', 7900, 9900, 320, '', 2, 805, 1),
(18,9, 'SKU-P9-BLACK',      '星夜黑 / 标准版', '{"颜色":"星夜黑","版本":"标准版"}', 69900, 79900, 520, '', 1, 2700, 1),
(19,9, 'SKU-P9-WHITE',      '月光白 / 标准版', '{"颜色":"月光白","版本":"标准版"}', 69900, 79900, 480, '', 2, 1610, 1),
(20,10,'SKU-P10-27-BLK',    '27 英寸 / 黑色', '{"尺寸":"27英寸","颜色":"黑色"}', 129900, 149900, 210, '', 1, 400, 1),
(21,11,'SKU-P11-BLK',       '曜石黑 / 标准', '{"颜色":"曜石黑","版本":"标准"}', 24900, 29900, 760, '', 1, 2400, 1),
(22,12,'SKU-P12-500-BLUE',  '500ml / 远峰蓝', '{"容量":"500ml","颜色":"远峰蓝"}', 15900, 19900, 1100, '', 1, 3600, 1)
ON DUPLICATE KEY UPDATE `price_cents` = VALUES(`price_cents`);

-- ---------------------------------------------------------------------------
-- 商品图集 / 参数
-- ---------------------------------------------------------------------------
INSERT INTO `product_images` (`product_id`, `url`, `alt`, `sort`)
SELECT 1, 'https://placehold.co/800x800/2A4AD9/FFFFFF?text=Pro-1', '商品图 1', 1 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `product_images` WHERE `product_id` = 1);

INSERT INTO `product_attributes` (`product_id`, `name`, `value`, `sort`) VALUES
(1,'屏幕','6.7 英寸 2K LTPO 直屏',1),
(1,'处理器','旗舰 4nm 八核',2),
(1,'电池','5000mAh / 100W 快充',3),
(1,'主摄','5000 万像素 OIS',4),
(2,'屏幕','14 英寸 2.8K 120Hz',1),
(2,'重量','1.2kg',2),
(2,'接口','双雷电 4 / HDMI 2.1',3),
(3,'续航','典型 14 天',1),
(3,'传感器','心率 / 血氧 / 加速度计',2),
(4,'材质','铝合金 + 五层不粘',1),
(4,'适用','燃气灶 / 电磁炉 / 电陶炉',2)
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);

-- ---------------------------------------------------------------------------
-- 轮播
-- ---------------------------------------------------------------------------
INSERT INTO `banners` (`id`, `title`, `image`, `link`, `sort`, `position`, `visible`) VALUES
(1, '夏日数码狂欢季 满 2000 减 300', 'https://placehold.co/1200x500/2A4AD9/FFFFFF?text=Summer+Sale', '/category/1', 1, 'home_banner', 1),
(2, '新品旗舰手机首发预约',           'https://placehold.co/1200x500/2239AC/FFFFFF?text=New+Phone',   '/product/1',   2, 'home_banner', 1),
(3, '家居焕新季 床垫直降 30%',        'https://placehold.co/1200x500/5F87FF/FFFFFF?text=Home+Sale',  '/category/2',  3, 'home_banner', 1),
(4, '生鲜冷链 产地直发',              'https://placehold.co/1200x500/12B76A/FFFFFF?text=Fresh',      '/category/4',  4, 'home_banner', 1)
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`);

-- ---------------------------------------------------------------------------
-- 优惠券
-- ---------------------------------------------------------------------------
INSERT INTO `coupons` (`id`, `name`, `code`, `type`, `face_value_cents`, `percent`, `min_amount_cents`, `max_discount_cents`, `total_quantity`, `received_quantity`, `used_quantity`, `per_user_limit`, `start_time`, `end_time`, `category_id`, `enabled`) VALUES
(1, '新人专享 20 元券', 'NEW20',   1, 2000,  100, 9900,  2000,  10000, 328, 12, 1, DATE_SUB(NOW(), INTERVAL 30 DAY), DATE_ADD(NOW(), INTERVAL 180 DAY), 0, 1),
(2, '满 200 减 50',     'FULL50',  1, 5000,  100, 19900, 5000,  5000,  1240, 88,  3, DATE_SUB(NOW(), INTERVAL 30 DAY), DATE_ADD(NOW(), INTERVAL 90 DAY),  0, 1),
(3, '数码专区 9 折券',  'TECH90',  2, 0,     90,  50000, 8000,  3000,  206, 41,  2, DATE_SUB(NOW(), INTERVAL 30 DAY), DATE_ADD(NOW(), INTERVAL 60 DAY),  1, 1),
(4, '全场免运费券',     'FREESHIP',3, 0,    100,  9900,  1500,  8000,  534, 76,  5, DATE_SUB(NOW(), INTERVAL 30 DAY), DATE_ADD(NOW(), INTERVAL 60 DAY),  0, 1),
(5, '数码专区 85 折券', 'TECH85',  2, 0,     85,  100000,15000, 2000,  95,  18, 1, DATE_SUB(NOW(), INTERVAL 30 DAY), DATE_ADD(NOW(), INTERVAL 60 DAY),  1, 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

INSERT IGNORE INTO `user_coupons` (`user_id`, `coupon_id`, `status`) VALUES
(1, 1, 1), (1, 2, 1), (1, 4, 1), (2, 1, 1), (3, 1, 1);

-- ---------------------------------------------------------------------------
-- 促销活动
-- ---------------------------------------------------------------------------
INSERT INTO `promotions` (`id`, `name`, `description`, `type`, `status`, `start_time`, `end_time`, `min_amount_cents`, `discount_cents`, `percent`, `product_id`, `limit_per_user`, `sold_count`, `banner_image`) VALUES
(1, '夏日数码狂欢季', '数码全场满 2000 减 300', 1, 1, DATE_SUB(NOW(), INTERVAL 7 DAY), DATE_ADD(NOW(), INTERVAL 23 DAY), 199900, 30000, 100, 0, 0, 1284, 'https://placehold.co/1200x500/2A4AD9/FFFFFF?text=Promo+Summer'),
(2, '数码单品 85 折',   '指定商品限时折扣',       2, 1, DATE_SUB(NOW(), INTERVAL 7 DAY), DATE_ADD(NOW(), INTERVAL 7 DAY),  100000, 0, 85, 1, 2, 356, 'https://placehold.co/1200x500/5F87FF/FFFFFF?text=Promo+Tech'),
(3, '生鲜秒杀 每日 10 点', '车厘子限量秒杀',      3, 1, DATE_SUB(NOW(), INTERVAL 7 DAY), DATE_ADD(NOW(), INTERVAL 23 DAY), 0, 0, 100, 7, 5, 892, 'https://placehold.co/1200x500/12B76A/FFFFFF?text=Promo+Fresh'),
(4, '办公室下午茶拼团',  '3 人成团立减 20 元',    4, 1, DATE_SUB(NOW(), INTERVAL 7 DAY), DATE_ADD(NOW(), INTERVAL 23 DAY), 9900, 2000, 100, 9, 2, 316, 'https://placehold.co/1200x500/722ED1/FFFFFF?text=Promo+Group'),
(5, '周末囤货节',      '满 300 减 50',        1, 1, DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_ADD(NOW(), INTERVAL 9 DAY),  299900, 5000, 100, 0, 0, 674, 'https://placehold.co/1200x500/2A4AD9/FFFFFF?text=Promo+Weekend')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- ---------------------------------------------------------------------------
-- 运费模板
-- ---------------------------------------------------------------------------
INSERT INTO `logistic_templates` (`id`, `name`, `company`, `company_code`, `freight_cents`, `free_freight_amount_cents`, `regions`, `enabled`, `sort`) VALUES
(1, '全国包邮（默认）', '顺丰速运', 'SF',      0,    0,    '全国', 1, 1),
(2, '江浙沪包邮',      '中通快递', 'ZTO',     800,  9900, '浙江省,上海市,江苏省', 1, 2),
(3, '偏远地区加价',    '邮政EMS', 'EMS',     2000, 0,    '新疆,西藏,青海,内蒙古', 1, 3)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- ---------------------------------------------------------------------------
-- 库存
-- ---------------------------------------------------------------------------
INSERT INTO `inventories` (`sku_id`, `product_id`, `sku_code`, `spec_text`, `total_stock`, `available_stock`, `locked_stock`, `sold_stock`, `safety_stock`, `warehouse`)
SELECT s.`id`, s.`product_id`, s.`sku_code`, s.`spec_text`, s.`stock`, s.`stock`, 0, s.`sales_count`, 10, '默认仓'
FROM `product_skus` s
WHERE NOT EXISTS (SELECT 1 FROM `inventories` i WHERE i.`sku_id` = s.`id`);

-- ---------------------------------------------------------------------------
-- 评价
-- ---------------------------------------------------------------------------
INSERT INTO `reviews` (`id`, `product_id`, `product_title`, `user_id`, `user_nickname`, `user_avatar`, `rating`, `content`, `images`, `sku_id`, `sku_text`, `status`, `like_count`, `created_at`) VALUES
(1, 1, '旗舰智能手机 Pro 256GB', 2, '爱丽丝', '', 5, '手感很棒，续航依旧给力，拍照夜景提升明显。', '', 1, '银色 / 12+256GB', 2, 86, DATE_SUB(NOW(), INTERVAL 3 DAY)),
(2, 1, '旗舰智能手机 Pro 256GB', 3, '鲍勃', '', 4, '整体满意，就是发热控制还有提升空间。', '', 2, '黑色 / 12+512GB', 2, 34, DATE_SUB(NOW(), INTERVAL 5 DAY)),
(3, 4, '不粘炒锅 32cm', 1, '演示用户', '', 5, '煎蛋不粘，洗起来很省心，尺寸家用刚好。', '', 8, '32cm / 灰黑', 2, 128, DATE_SUB(NOW(), INTERVAL 2 DAY)),
(4, 7, '进口车厘子 2kg 装', 2, '爱丽丝', '', 5, '果个大且甜，冷链包装完好，到手还是凉的。', '', 14, '2kg / JJ级', 2, 76, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(5, 8, '职场效率管理指南', 3, '鲍勃', '', 4, '方法论清晰，附带的模板可以直接用。', '', 16, '平装 / 单册', 2, 21, DATE_SUB(NOW(), INTERVAL 6 DAY))
ON DUPLICATE KEY UPDATE `content` = VALUES(`content`);

-- ---------------------------------------------------------------------------
-- 扩展种子数据
-- ---------------------------------------------------------------------------

INSERT INTO `user_points_logs` (`user_id`, `title`, `change`, `balance`, `biz_type`, `biz_id`, `created_at`) VALUES
(1, '新用户注册赠送', 100, 100, 'register', '', DATE_SUB(NOW(), INTERVAL 30 DAY)),
(1, '订单支付奖励', 200, 300, 'order', '20260101000001', DATE_SUB(NOW(), INTERVAL 20 DAY)),
(1, '完成评价奖励', 50, 350, 'review', '20260101000002', DATE_SUB(NOW(), INTERVAL 10 DAY)),
(1, '积分兑换优惠券', -300, 50, 'exchange', 'FULL50', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(1, '签到奖励', 20, 70, 'sign', '', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(2, '新用户注册赠送', 100, 100, 'register', '', DATE_SUB(NOW(), INTERVAL 25 DAY)),
(3, '新用户注册赠送', 100, 100, 'register', '', DATE_SUB(NOW(), INTERVAL 15 DAY))
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`);

INSERT INTO `user_invoices` (`user_id`, `order_no`, `title`, `tax_no`, `type`, `email`, `amount_cents`, `status`, `invoice_url`, `created_at`) VALUES
(1, '20260101000001', '杭州云启科技有限公司', '91330100MA2XXXXX1B', 'company', 'finance@example.com', 429900, 1, 'https://example.com/invoice/20260101000001.pdf', DATE_SUB(NOW(), INTERVAL 18 DAY)),
(1, '20260101000002', '演示用户', '', 'personal', 'demo@example.com', 12900, 0, '', DATE_SUB(NOW(), INTERVAL 3 DAY))
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`);

INSERT INTO `product_materials` (`name`, `url`, `type`, `size`, `folder`, `sort`) VALUES
('手机主图 1', 'https://placehold.co/800x800/2A4AD9/FFFFFF?text=Phone+1', 'image', 182340, 'product', 1),
('手机主图 2', 'https://placehold.co/800x800/2239AC/FFFFFF?text=Phone+2', 'image', 191220, 'product', 2),
('首页轮播图', 'https://placehold.co/1200x500/2A4AD9/FFFFFF?text=Banner', 'image', 356120, 'banner', 1),
('促销视频', 'https://placehold.co/720x1280/F5811F/FFFFFF?text=Video', 'video', 8421330, 'promotion', 1),
('默认占位图', 'https://placehold.co/600x600/E6EBF0/8A99AB/FFFFFF?text=Placeholder', 'image', 24510, 'default', 0)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

INSERT INTO `system_settings` (`key`, `value`, `name`, `group`, `description`, `value_type`) VALUES
('site.name', 'ShopStack 商城', '站点名称', 'basic', '展示在页面标题与页脚', 'string'),
('site.service_phone', '400-800-1234', '客服电话', 'basic', '页面底部展示的客服电话', 'string'),
('site.icp', '浙ICP备2026000001号', 'ICP 备案号', 'basic', '页脚展示的备案信息', 'string'),
('order.auto_receive_days', '10', '自动确认收货天数', 'order', '发货后自动确认收货的天数', 'number'),
('order.cancel_timeout_minutes', '30', '订单自动取消分钟数', 'order', '未支付订单自动取消的时间', 'number'),
('order.free_freight_cents', '9900', '包邮门槛（分）', 'order', '订单总额达到该值免运费', 'number'),
('order.default_freight_cents', '1000', '默认运费（分）', 'order', '未达到包邮门槛时的运费', 'number'),
('points.register_reward', '100', '注册赠送积分', 'points', '新用户注册赠送的积分数', 'number'),
('points.exchange_rate', '100', '积分兑换比例', 'points', '多少积分可兑换 1 元', 'number'),
('sms.code_expire_seconds', '300', '验证码有效期（秒）', 'sms', '短信验证码的有效期', 'number'),
('sms.daily_limit', '10', '单号码日发送上限', 'sms', '每个手机号每天最多发送次数', 'number')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);
