/**
 * 演示数据（Mock）引擎
 * ---------------------------------------------------------------
 * 目的：后端尚未就绪时，小程序仍能完整演示「浏览 -> 详情 -> 加购 -> 结算 -> 支付 -> 订单」全流程。
 * 数据结构严格对齐 proto 字段名（下划线风格），与网关真实响应保持一致。
 *
 * 说明：mock 层维护一份内存态（state），加购、结算、下单、支付等写操作会真实改变状态，
 *       因此演示过程中的各页面之间数据是连通的。
 */

const format = require('./format');
const enums = require('./enums');

/** 生成 n 天前的 RFC3339 时间字符串 */
function daysAgo(n) {
  const d = new Date(Date.now() - n * 24 * 3600 * 1000);
  return d.toISOString();
}

/** 生成 n 小时前的 RFC3339 时间字符串 */
function hoursAgo(n) {
  const d = new Date(Date.now() - n * 3600 * 1000);
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// 静态数据
// ---------------------------------------------------------------------------

const categories = [
  { id: 1, name: '数码家电', parent_id: 0, icon: '📱', description: '手机、电脑与智能硬件', sort: 10, visible: true, product_count: 5, children: [] },
  { id: 2, name: '家居生活', parent_id: 0, icon: '🏠', description: '家具、厨具与日用百货', sort: 20, visible: true, product_count: 3, children: [] },
  { id: 3, name: '服饰鞋包', parent_id: 0, icon: '👕', description: '男女装、鞋靴与箱包', sort: 30, visible: true, product_count: 1, children: [] },
  { id: 4, name: '食品生鲜', parent_id: 0, icon: '🍎', description: '零食、粮油与生鲜果蔬', sort: 40, visible: true, product_count: 1, children: [] },
  { id: 5, name: '图书文娱', parent_id: 0, icon: '📚', description: '图书、音像与文创用品', sort: 50, visible: true, product_count: 1, children: [] },
  { id: 6, name: '手机通讯', parent_id: 1, icon: '📱', description: '智能手机与配件', sort: 11, visible: true, product_count: 2, children: [] },
  { id: 7, name: '电脑办公', parent_id: 1, icon: '💻', description: '笔记本、台式机与外设', sort: 12, visible: true, product_count: 2, children: [] },
  { id: 8, name: '智能穿戴', parent_id: 1, icon: '⌚', description: '手表手环与智能眼镜', sort: 13, visible: true, product_count: 1, children: [] },
  { id: 9, name: '厨房用品', parent_id: 2, icon: '🍳', description: '锅具、刀具与餐具', sort: 21, visible: true, product_count: 1, children: [] },
  { id: 10, name: '家纺布艺', parent_id: 2, icon: '🛏️', description: '床品、窗帘与抱枕', sort: 22, visible: true, product_count: 1, children: [] },
];

const categoryMap = {};
categories.forEach((c) => {
  categoryMap[c.id] = c;
});
// 维护父子关系
categories.forEach((c) => {
  if (c.parent_id) {
    const parent = categoryMap[c.parent_id];
    if (parent) {
      parent.children.push(c);
    }
  }
});

/** 商品主数据（对应 seed.sql 中的 products 表） */
const products = [
  {
    id: 1,
    title: '旗舰智能手机 Pro 256GB',
    subtitle: '骁龙旗舰芯片 · 潜望长焦 · 全天候续航',
    cover: 'https://placehold.co/600x600/2A4AD9/FFFFFF?text=Pro+256GB',
    category_id: 6,
    min_price_cents: 429900,
    max_price_cents: 529900,
    sales_count: 1863,
    stock_total: 596,
    status: 'PRODUCT_STATUS_ON_SHELF',
    description: '年度旗舰影像升级，2K 护眼直屏，5000mAh 大电池，100W 有线快充。',
    tags: ['旗舰', '5G', '拍照'],
    created_at: daysAgo(60),
    updated_at: daysAgo(2),
    palette: ['2A4AD9', '2239AC'],
  },
  {
    id: 2,
    title: '轻薄商务笔记本 14 英寸',
    subtitle: '1.2kg 轻薄机身 · 2.8K 高色域屏',
    cover: 'https://placehold.co/600x600/2239AC/FFFFFF?text=Notebook+14',
    category_id: 7,
    min_price_cents: 599900,
    max_price_cents: 699900,
    sales_count: 942,
    stock_total: 238,
    status: 'PRODUCT_STATUS_ON_SHELF',
    description: '1.2kg 镁铝合金机身，2.8K 120Hz 高色域屏，70Wh 长续航，生产力与便携兼顾。',
    tags: ['笔记本', '办公'],
    created_at: daysAgo(52),
    updated_at: daysAgo(3),
    palette: ['2239AC', '2A4AD9'],
  },
  {
    id: 3,
    title: '智能运动手表 GT4',
    subtitle: '血氧心率监测 · 14 天长续航',
    cover: 'https://placehold.co/600x600/F5811F/FFFFFF?text=Watch+GT4',
    category_id: 8,
    min_price_cents: 89900,
    max_price_cents: 109900,
    sales_count: 3120,
    stock_total: 850,
    status: 'PRODUCT_STATUS_ON_SHELF',
    description: '双频 GPS 定位，全天候血氧与心率监测，100+ 运动模式，14 天典型续航。',
    tags: ['智能手表', '运动'],
    created_at: daysAgo(48),
    updated_at: daysAgo(1),
    palette: ['F5811F', 'DB6611'],
  },
  {
    id: 4,
    title: '不粘炒锅 32cm',
    subtitle: '少油不粘 · 通用燃气电磁炉',
    cover: 'https://placehold.co/600x600/12B76A/FFFFFF?text=Pan+32cm',
    category_id: 9,
    min_price_cents: 12900,
    max_price_cents: 19900,
    sales_count: 5821,
    stock_total: 2060,
    status: 'PRODUCT_STATUS_ON_SHELF',
    description: '五层不粘涂层，导磁复合底，适用燃气与电磁炉，32cm 家庭容量。',
    tags: ['厨房', '爆款'],
    created_at: daysAgo(45),
    updated_at: daysAgo(4),
    palette: ['12B76A', '0E9A57'],
  },
  {
    id: 5,
    title: '全棉四件套 1.8m',
    subtitle: 'A 类母婴级 · 60 支长绒棉',
    cover: 'https://placehold.co/600x600/0BA5EC/FFFFFF?text=Bedding',
    category_id: 10,
    min_price_cents: 29900,
    max_price_cents: 39900,
    sales_count: 2360,
    stock_total: 810,
    status: 'PRODUCT_STATUS_ON_SHELF',
    description: '60 支新疆长绒棉，A 类母婴级标准，水洗不掉色不起球。',
    tags: ['家纺', '舒适'],
    created_at: daysAgo(40),
    updated_at: daysAgo(6),
    palette: ['0BA5EC', '0887C4'],
  },
  {
    id: 6,
    title: '纯棉商务休闲衬衫',
    subtitle: '免烫抗皱 · 三种色可选',
    cover: 'https://placehold.co/600x600/4B586A/FFFFFF?text=Shirt',
    category_id: 3,
    min_price_cents: 19900,
    max_price_cents: 29900,
    sales_count: 1450,
    stock_total: 1350,
    status: 'PRODUCT_STATUS_ON_SHELF',
    description: '100% 长绒棉，免烫抗皱处理，商务通勤与日常休闲皆宜。',
    tags: ['男装', '基础款'],
    created_at: daysAgo(35),
    updated_at: daysAgo(5),
    palette: ['4B586A', '313E4F'],
  },
  {
    id: 7,
    title: '进口车厘子 2kg 装',
    subtitle: 'JJ 级 · 冷链直发 · 坏果包赔',
    cover: 'https://placehold.co/600x600/F04438/FFFFFF?text=Cherry+2kg',
    category_id: 4,
    min_price_cents: 8900,
    max_price_cents: 12900,
    sales_count: 8740,
    stock_total: 1280,
    status: 'PRODUCT_STATUS_ON_SHELF',
    description: '原产地直采，JJ 级大果，冷链发货，坏果包赔。',
    tags: ['生鲜', '包邮'],
    created_at: daysAgo(30),
    updated_at: daysAgo(1),
    palette: ['F04438', 'D6302A'],
  },
  {
    id: 8,
    title: '职场效率管理指南',
    subtitle: '从目标拆解到复盘闭环',
    cover: 'https://placehold.co/600x600/7A5AF8/FFFFFF?text=Book+PM',
    category_id: 5,
    min_price_cents: 5900,
    max_price_cents: 7900,
    sales_count: 2205,
    stock_total: 1120,
    status: 'PRODUCT_STATUS_ON_SHELF',
    description: '系统讲解目标管理、项目拆解与复盘方法论，附可复用模板。',
    tags: ['图书', '职场'],
    created_at: daysAgo(28),
    updated_at: daysAgo(2),
    palette: ['7A5AF8', '6438E0'],
  },
  {
    id: 9,
    title: '降噪蓝牙耳机 Air',
    subtitle: '42dB 主动降噪 · 空间音频',
    cover: 'https://placehold.co/600x600/121B26/FFFFFF?text=Earphone+Air',
    category_id: 6,
    min_price_cents: 69900,
    max_price_cents: 89900,
    sales_count: 4310,
    stock_total: 1000,
    status: 'PRODUCT_STATUS_ON_SHELF',
    description: '双麦通话降噪，42dB 主动降噪，单次续航 8 小时，配合充电盒 32 小时。',
    tags: ['耳机', '降噪'],
    created_at: daysAgo(26),
    updated_at: daysAgo(3),
    palette: ['121B26', '313E4F'],
  },
  {
    id: 10,
    title: '桌面双屏显示器 27 英寸',
    subtitle: '2K IPS · 165Hz 刷新',
    cover: 'https://placehold.co/600x600/5F87FF/FFFFFF?text=Monitor+27',
    category_id: 7,
    min_price_cents: 129900,
    max_price_cents: 159900,
    sales_count: 680,
    stock_total: 210,
    status: 'PRODUCT_STATUS_ON_SHELF',
    description: '27 英寸 2K IPS 面板，165Hz 刷新率，Type-C 65W 反向供电。',
    tags: ['显示器', '办公'],
    created_at: daysAgo(24),
    updated_at: daysAgo(4),
    palette: ['5F87FF', '3B63F6'],
  },
  {
    id: 11,
    title: '便携蓝牙音箱 Mini',
    subtitle: 'IPX7 防水 · 24 小时播放',
    cover: 'https://placehold.co/600x600/8AABFF/FFFFFF?text=Speaker+Mini',
    category_id: 6,
    min_price_cents: 24900,
    max_price_cents: 34900,
    sales_count: 3980,
    stock_total: 760,
    status: 'PRODUCT_STATUS_ON_SHELF',
    description: '360° 环绕单元，IPX7 级防水，24 小时续航，可串联组队。',
    tags: ['音箱', '户外'],
    created_at: daysAgo(20),
    updated_at: daysAgo(2),
    palette: ['8AABFF', '5F87FF'],
  },
  {
    id: 12,
    title: '高端保温杯 500ml',
    subtitle: '316 内胆 · 12 小时保温',
    cover: 'https://placehold.co/600x600/3B63F6/FFFFFF?text=Thermo+500',
    category_id: 2,
    min_price_cents: 15900,
    max_price_cents: 21900,
    sales_count: 6210,
    stock_total: 1100,
    status: 'PRODUCT_STATUS_ON_SHELF',
    description: '316 医用级不锈钢内胆，12 小时保温保冷，杯盖一键开合。',
    tags: ['水杯', '礼品'],
    created_at: daysAgo(18),
    updated_at: daysAgo(1),
    palette: ['3B63F6', '2A4AD9'],
  },
];

const productMap = {};
products.forEach((p) => {
  const category = categoryMap[p.category_id];
  p.category_name = category ? category.name : '';
  productMap[p.id] = p;
});

/** 商品规格（对应 product_skus 表） */
const skus = [
  { id: 1, product_id: 1, sku_code: 'SKU-P1-SILVER-256', spec_text: '银色 / 12+256GB', specs: { 颜色: '银色', 存储: '12+256GB' }, price_cents: 429900, original_price_cents: 499900, stock: 320, locked_stock: 0, image: '', sort: 1, sales_count: 980, enabled: true, weight_grams: 210 },
  { id: 2, product_id: 1, sku_code: 'SKU-P1-BLACK-512', spec_text: '黑色 / 12+512GB', specs: { 颜色: '黑色', 存储: '12+512GB' }, price_cents: 479900, original_price_cents: 549900, stock: 180, locked_stock: 0, image: '', sort: 2, sales_count: 540, enabled: true, weight_grams: 215 },
  { id: 3, product_id: 1, sku_code: 'SKU-P1-BLUE-1TB', spec_text: '远峰蓝 / 12+1TB', specs: { 颜色: '远峰蓝', 存储: '12+1TB' }, price_cents: 529900, original_price_cents: 619900, stock: 96, locked_stock: 0, image: '', sort: 3, sales_count: 343, enabled: true, weight_grams: 222 },
  { id: 4, product_id: 2, sku_code: 'SKU-P2-I5-16', spec_text: '深空灰 / i5 / 16G / 512G', specs: { 颜色: '深空灰', 处理器: 'i5', 内存: '16GB', 硬盘: '512GB' }, price_cents: 599900, original_price_cents: 679900, stock: 150, locked_stock: 0, image: '', sort: 1, sales_count: 520, enabled: true, weight_grams: 1200 },
  { id: 5, product_id: 2, sku_code: 'SKU-P2-I7-32', spec_text: '深空灰 / i7 / 32G / 1T', specs: { 颜色: '深空灰', 处理器: 'i7', 内存: '32GB', 硬盘: '1TB' }, price_cents: 699900, original_price_cents: 799900, stock: 88, locked_stock: 0, image: '', sort: 2, sales_count: 422, enabled: true, weight_grams: 1260 },
  { id: 6, product_id: 3, sku_code: 'SKU-P3-BLACK-46', spec_text: '曜石黑 / 46mm', specs: { 颜色: '曜石黑', 表盘: '46mm' }, price_cents: 89900, original_price_cents: 109900, stock: 640, locked_stock: 0, image: '', sort: 1, sales_count: 1980, enabled: true, weight_grams: 52 },
  { id: 7, product_id: 3, sku_code: 'SKU-P3-TITAN-46', spec_text: '钛金属 / 46mm', specs: { 颜色: '钛金属', 表盘: '46mm' }, price_cents: 109900, original_price_cents: 129900, stock: 210, locked_stock: 0, image: '', sort: 2, sales_count: 1140, enabled: true, weight_grams: 58 },
  { id: 8, product_id: 4, sku_code: 'SKU-P4-32-GREY', spec_text: '32cm / 灰黑', specs: { 尺寸: '32cm', 颜色: '灰黑' }, price_cents: 12900, original_price_cents: 16900, stock: 1200, locked_stock: 0, image: '', sort: 1, sales_count: 3800, enabled: true, weight_grams: 1800 },
  { id: 9, product_id: 4, sku_code: 'SKU-P4-32-RED', spec_text: '32cm / 复古红', specs: { 尺寸: '32cm', 颜色: '复古红' }, price_cents: 15900, original_price_cents: 19900, stock: 860, locked_stock: 0, image: '', sort: 2, sales_count: 2021, enabled: true, weight_grams: 1800 },
  { id: 10, product_id: 5, sku_code: 'SKU-P5-18-WHITE', spec_text: '1.8m / 白 / 四件套', specs: { 尺寸: '1.8m', 颜色: '白色', 件数: '四件套' }, price_cents: 29900, original_price_cents: 39900, stock: 430, locked_stock: 0, image: '', sort: 1, sales_count: 1500, enabled: true, weight_grams: 2600 },
  { id: 11, product_id: 5, sku_code: 'SKU-P5-18-GREY', spec_text: '1.8m / 灰 / 四件套', specs: { 尺寸: '1.8m', 颜色: '灰色', 件数: '四件套' }, price_cents: 29900, original_price_cents: 39900, stock: 380, locked_stock: 0, image: '', sort: 2, sales_count: 860, enabled: true, weight_grams: 2600 },
  { id: 12, product_id: 6, sku_code: 'SKU-P6-M-BLUE', spec_text: 'M / 商务蓝', specs: { 尺码: 'M', 颜色: '商务蓝' }, price_cents: 19900, original_price_cents: 25900, stock: 700, locked_stock: 0, image: '', sort: 1, sales_count: 820, enabled: true, weight_grams: 260 },
  { id: 13, product_id: 6, sku_code: 'SKU-P6-M-WHITE', spec_text: 'M / 纯白', specs: { 尺码: 'M', 颜色: '纯白' }, price_cents: 19900, original_price_cents: 25900, stock: 650, locked_stock: 0, image: '', sort: 2, sales_count: 630, enabled: true, weight_grams: 260 },
  { id: 14, product_id: 7, sku_code: 'SKU-P7-2KG-JJ', spec_text: '2kg / JJ级', specs: { 规格: '2kg', 等级: 'JJ级' }, price_cents: 8900, original_price_cents: 11900, stock: 900, locked_stock: 0, image: '', sort: 1, sales_count: 5200, enabled: true, weight_grams: 2000 },
  { id: 15, product_id: 7, sku_code: 'SKU-P7-2KG-XXXL', spec_text: '2kg / XXXL级', specs: { 规格: '2kg', 等级: 'XXXL级' }, price_cents: 12900, original_price_cents: 15900, stock: 380, locked_stock: 0, image: '', sort: 2, sales_count: 3540, enabled: true, weight_grams: 2000 },
  { id: 16, product_id: 8, sku_code: 'SKU-P8-PAPER', spec_text: '平装 / 单册', specs: { 装帧: '平装', 版本: '单册' }, price_cents: 5900, original_price_cents: 7900, stock: 800, locked_stock: 0, image: '', sort: 1, sales_count: 1400, enabled: true, weight_grams: 320 },
  { id: 17, product_id: 8, sku_code: 'SKU-P8-HARDCOVER', spec_text: '精装 / 赠笔记本', specs: { 装帧: '精装', 版本: '赠笔记本' }, price_cents: 7900, original_price_cents: 9900, stock: 320, locked_stock: 0, image: '', sort: 2, sales_count: 805, enabled: true, weight_grams: 480 },
  { id: 18, product_id: 9, sku_code: 'SKU-P9-BLACK', spec_text: '星夜黑 / 标准版', specs: { 颜色: '星夜黑', 版本: '标准版' }, price_cents: 69900, original_price_cents: 79900, stock: 520, locked_stock: 0, image: '', sort: 1, sales_count: 2700, enabled: true, weight_grams: 60 },
  { id: 19, product_id: 9, sku_code: 'SKU-P9-WHITE', spec_text: '月光白 / 标准版', specs: { 颜色: '月光白', 版本: '标准版' }, price_cents: 69900, original_price_cents: 79900, stock: 480, locked_stock: 0, image: '', sort: 2, sales_count: 1610, enabled: true, weight_grams: 60 },
  { id: 20, product_id: 10, sku_code: 'SKU-P10-27-BLK', spec_text: '27 英寸 / 黑色', specs: { 尺寸: '27英寸', 颜色: '黑色' }, price_cents: 129900, original_price_cents: 149900, stock: 210, locked_stock: 0, image: '', sort: 1, sales_count: 400, enabled: true, weight_grams: 4800 },
  { id: 21, product_id: 11, sku_code: 'SKU-P11-BLK', spec_text: '曜石黑 / 标准', specs: { 颜色: '曜石黑', 版本: '标准' }, price_cents: 24900, original_price_cents: 29900, stock: 760, locked_stock: 0, image: '', sort: 1, sales_count: 2400, enabled: true, weight_grams: 480 },
  { id: 22, product_id: 12, sku_code: 'SKU-P12-500-BLUE', spec_text: '500ml / 远峰蓝', specs: { 容量: '500ml', 颜色: '远峰蓝' }, price_cents: 15900, original_price_cents: 19900, stock: 1100, locked_stock: 0, image: '', sort: 1, sales_count: 3600, enabled: true, weight_grams: 320 },
];

const skuMap = {};
skus.forEach((s) => {
  skuMap[s.id] = s;
});

/** 商品图集：按主色调生成占位图 */
const productImages = {};
products.forEach((p) => {
  const list = [];
  const total = 3;
  for (let i = 1; i <= total; i += 1) {
    list.push({
      url: 'https://placehold.co/800x800/' + p.palette[i % 2] + '/FFFFFF?text=' + encodeURIComponent(p.title.slice(0, 8)) + '-' + i,
      alt: p.title + ' 图 ' + i,
      sort: i,
    });
  }
  productImages[p.id] = list;
});

/** 商品参数 */
const productAttributes = {
  1: [
    { id: 1, product_id: 1, name: '屏幕', value: '6.7 英寸 2K LTPO 直屏', sort: 1 },
    { id: 2, product_id: 1, name: '处理器', value: '旗舰 4nm 八核', sort: 2 },
    { id: 3, product_id: 1, name: '电池', value: '5000mAh / 100W 快充', sort: 3 },
    { id: 4, product_id: 1, name: '主摄', value: '5000 万像素 OIS', sort: 4 },
  ],
  2: [
    { id: 5, product_id: 2, name: '屏幕', value: '14 英寸 2.8K 120Hz', sort: 1 },
    { id: 6, product_id: 2, name: '重量', value: '1.2kg', sort: 2 },
    { id: 7, product_id: 2, name: '接口', value: '双雷电 4 / HDMI 2.1', sort: 3 },
  ],
  3: [
    { id: 8, product_id: 3, name: '续航', value: '典型 14 天', sort: 1 },
    { id: 9, product_id: 3, name: '传感器', value: '心率 / 血氧 / 加速度计', sort: 2 },
  ],
  4: [
    { id: 10, product_id: 4, name: '材质', value: '铝合金 + 五层不粘', sort: 1 },
    { id: 11, product_id: 4, name: '适用', value: '燃气灶 / 电磁炉 / 电陶炉', sort: 2 },
  ],
  5: [
    { id: 12, product_id: 5, name: '面料', value: '60 支新疆长绒棉', sort: 1 },
    { id: 13, product_id: 5, name: '等级', value: 'A 类母婴级', sort: 2 },
  ],
  6: [{ id: 14, product_id: 6, name: '面料', value: '100% 长绒棉', sort: 1 }],
  7: [{ id: 15, product_id: 7, name: '等级', value: 'JJ 级大果', sort: 1 }],
  8: [{ id: 16, product_id: 8, name: '装帧', value: '平装 / 精装可选', sort: 1 }],
  9: [{ id: 17, product_id: 9, name: '降噪深度', value: '42dB 主动降噪', sort: 1 }],
  10: [{ id: 18, product_id: 10, name: '分辨率', value: '2560×1440 IPS', sort: 1 }],
  11: [{ id: 19, product_id: 11, name: '防水等级', value: 'IPX7', sort: 1 }],
  12: [{ id: 20, product_id: 12, name: '内胆材质', value: '316 医用级不锈钢', sort: 1 }],
};

/** 评价数据 */
const reviews = [
  { id: 1, product_id: 1, product_title: '旗舰智能手机 Pro 256GB', user_id: 2, user_nickname: '爱丽丝', user_avatar: 'https://placehold.co/80x80/F5811F/FFFFFF?text=A', rating: 5, content: '手感很棒，续航依旧给力，拍照夜景提升明显。', images: ['https://placehold.co/600x600/2A4AD9/FFFFFF?text=Review+1-1', 'https://placehold.co/600x600/121B26/FFFFFF?text=Review+1-2'], sku_id: 1, sku_text: '银色 / 12+256GB', status: 'REVIEW_STATUS_APPROVED', admin_reply: '感谢您的支持，期待再次为您服务！', like_count: 86, created_at: daysAgo(3) },
  { id: 2, product_id: 1, product_title: '旗舰智能手机 Pro 256GB', user_id: 3, user_nickname: '鲍勃', user_avatar: 'https://placehold.co/80x80/12B76A/FFFFFF?text=B', rating: 4, content: '整体满意，就是发热控制还有提升空间。', images: [], sku_id: 2, sku_text: '黑色 / 12+512GB', status: 'REVIEW_STATUS_APPROVED', admin_reply: '', like_count: 34, created_at: daysAgo(5) },
  { id: 3, product_id: 4, product_title: '不粘炒锅 32cm', user_id: 1, user_nickname: '演示用户', user_avatar: 'https://placehold.co/80x80/2A4AD9/FFFFFF?text=D', rating: 5, content: '煎蛋不粘，洗起来很省心，尺寸家用刚好。', images: ['https://placehold.co/600x600/12B76A/FFFFFF?text=Review+3-1'], sku_id: 8, sku_text: '32cm / 灰黑', status: 'REVIEW_STATUS_APPROVED', admin_reply: '感谢反馈，欢迎复购～', like_count: 128, created_at: daysAgo(2) },
  { id: 4, product_id: 7, product_title: '进口车厘子 2kg 装', user_id: 2, user_nickname: '爱丽丝', user_avatar: 'https://placehold.co/80x80/F5811F/FFFFFF?text=A', rating: 5, content: '果个大且甜，冷链包装完好，到手还是凉的。', images: ['https://placehold.co/600x600/F04438/FFFFFF?text=Review+4-1', 'https://placehold.co/600x600/12B76A/FFFFFF?text=Review+4-2'], sku_id: 14, sku_text: '2kg / JJ级', status: 'REVIEW_STATUS_APPROVED', admin_reply: '', like_count: 76, created_at: daysAgo(1) },
  { id: 5, product_id: 8, product_title: '职场效率管理指南', user_id: 3, user_nickname: '鲍勃', user_avatar: 'https://placehold.co/80x80/12B76A/FFFFFF?text=B', rating: 4, content: '方法论清晰，附带的模板可以直接用。', images: [], sku_id: 16, sku_text: '平装 / 单册', status: 'REVIEW_STATUS_APPROVED', admin_reply: '感谢您的认可！', like_count: 21, created_at: daysAgo(6) },
  { id: 6, product_id: 1, product_title: '旗舰智能手机 Pro 256GB', user_id: 1, user_nickname: '演示用户', user_avatar: 'https://placehold.co/80x80/2A4AD9/FFFFFF?text=D', rating: 5, content: '系统更新后更流畅了，续航比上一代提升明显。', images: ['https://placehold.co/600x600/2A4AD9/FFFFFF?text=Review+6-1'], sku_id: 1, sku_text: '银色 / 12+256GB', status: 'REVIEW_STATUS_APPROVED', admin_reply: '', like_count: 52, created_at: daysAgo(8) },
  { id: 7, product_id: 2, product_title: '轻薄商务笔记本 14 英寸', user_id: 1, user_nickname: '演示用户', user_avatar: 'https://placehold.co/80x80/2A4AD9/FFFFFF?text=D', rating: 3, content: '轻是真的轻，但接口偏少，需要扩展坞。', images: [], sku_id: 4, sku_text: '深空灰 / i5 / 16G / 512G', status: 'REVIEW_STATUS_APPROVED', admin_reply: '', like_count: 17, created_at: daysAgo(9) },
  { id: 8, product_id: 3, product_title: '智能运动手表 GT4', user_id: 2, user_nickname: '爱丽丝', user_avatar: 'https://placehold.co/80x80/F5811F/FFFFFF?text=A', rating: 2, content: '运动数据偶尔有延迟，希望后续固件优化。', images: [], sku_id: 6, sku_text: '曜石黑 / 46mm', status: 'REVIEW_STATUS_APPROVED', admin_reply: '已反馈至技术团队，后续固件会持续优化。', like_count: 9, created_at: daysAgo(10) },
];

/** 轮播图 */
const banners = [
  { id: 1, title: '夏日数码狂欢季 满 2000 减 300', image: 'https://placehold.co/1200x500/2A4AD9/FFFFFF?text=Summer+Sale', link: '/pages/category/category?category_id=1', sort: 1, position: 'home_banner', visible: true, created_at: daysAgo(20) },
  { id: 2, title: '新品旗舰手机首发预约', image: 'https://placehold.co/1200x500/2239AC/FFFFFF?text=New+Phone', link: '/pages/detail/detail?id=1', sort: 2, position: 'home_banner', visible: true, created_at: daysAgo(15) },
  { id: 3, title: '家居焕新季 床垫直降 30%', image: 'https://placehold.co/1200x500/5F87FF/FFFFFF?text=Home+Sale', link: '/pages/category/category?category_id=2', sort: 3, position: 'home_banner', visible: true, created_at: daysAgo(12) },
  { id: 4, title: '生鲜冷链 产地直发', image: 'https://placehold.co/1200x500/12B76A/FFFFFF?text=Fresh', link: '/pages/category/category?category_id=4', sort: 4, position: 'home_banner', visible: true, created_at: daysAgo(10) },
];

/** 促销活动 */
const promotions = [
  { id: 1, name: '夏日数码狂欢季', description: '数码全场满 2000 减 300', type: 1, status: 1, start_time: Math.floor(Date.now() / 1000) - 7 * 86400, end_time: Math.floor(Date.now() / 1000) + 23 * 86400, min_amount_cents: 199900, discount_cents: 30000, percent: 100, product_id: 0, limit_per_user: 0, sold_count: 1284, banner_image: 'https://placehold.co/1200x500/2A4AD9/FFFFFF?text=Promo+Summer', created_at: daysAgo(10) },
  { id: 2, name: '数码单品 85 折', description: '指定商品限时折扣', type: 2, status: 1, start_time: Math.floor(Date.now() / 1000) - 7 * 86400, end_time: Math.floor(Date.now() / 1000) + 7 * 86400, min_amount_cents: 100000, discount_cents: 0, percent: 85, product_id: 1, limit_per_user: 2, sold_count: 356, banner_image: 'https://placehold.co/1200x500/5F87FF/FFFFFF?text=Promo+Tech', created_at: daysAgo(9) },
  { id: 3, name: '生鲜秒杀 每日 10 点', description: '车厘子限量秒杀', type: 3, status: 1, start_time: Math.floor(Date.now() / 1000) - 7 * 86400, end_time: Math.floor(Date.now() / 1000) + 23 * 86400, min_amount_cents: 0, discount_cents: 0, percent: 100, product_id: 7, limit_per_user: 5, sold_count: 892, banner_image: 'https://placehold.co/1200x500/12B76A/FFFFFF?text=Promo+Fresh', created_at: daysAgo(8) },
  { id: 4, name: '旗舰新品首发预售', description: '新品预售定金膨胀 3 倍', type: 4, status: 1, start_time: Math.floor(Date.now() / 1000) - 5 * 86400, end_time: Math.floor(Date.now() / 1000) + 25 * 86400, min_amount_cents: 99900, discount_cents: 0, percent: 100, product_id: 1, limit_per_user: 1, sold_count: 214, banner_image: 'https://placehold.co/1200x500/7A5AF8/FFFFFF?text=Promo+Presale', created_at: daysAgo(5) },
];

/** 平台优惠券 */
const coupons = [
  { id: 1, name: '新人专享 20 元券', code: 'NEW20', type: 'COUPON_TYPE_FIXED', face_value_cents: 2000, percent: 100, min_amount_cents: 9900, max_discount_cents: 2000, total_quantity: 10000, received_quantity: 328, used_quantity: 12, per_user_limit: 1, start_time: daysAgo(30), end_time: daysAgo(-180), category_id: 0, enabled: true, created_at: daysAgo(30) },
  { id: 2, name: '满 200 减 50', code: 'FULL50', type: 'COUPON_TYPE_FIXED', face_value_cents: 5000, percent: 100, min_amount_cents: 19900, max_discount_cents: 5000, total_quantity: 1240, received_quantity: 88, used_quantity: 3, per_user_limit: 3, start_time: daysAgo(30), end_time: daysAgo(-90), category_id: 0, enabled: true, created_at: daysAgo(30) },
  { id: 3, name: '数码专区 9 折券', code: 'TECH90', type: 'COUPON_TYPE_PERCENT', face_value_cents: 0, percent: 90, min_amount_cents: 50000, max_discount_cents: 8000, total_quantity: 3000, received_quantity: 206, used_quantity: 41, per_user_limit: 2, start_time: daysAgo(30), end_time: daysAgo(-60), category_id: 1, enabled: true, created_at: daysAgo(28) },
  { id: 4, name: '全场免运费券', code: 'FREESHIP', type: 'COUPON_TYPE_SHIPPING', face_value_cents: 0, percent: 100, min_amount_cents: 9900, max_discount_cents: 1500, total_quantity: 8000, received_quantity: 534, used_quantity: 76, per_user_limit: 5, start_time: daysAgo(30), end_time: daysAgo(-60), category_id: 0, enabled: true, created_at: daysAgo(28) },
  { id: 5, name: '数码专区 85 折券', code: 'TECH85', type: 'COUPON_TYPE_PERCENT', face_value_cents: 0, percent: 85, min_amount_cents: 100000, max_discount_cents: 15000, total_quantity: 2000, received_quantity: 95, used_quantity: 18, per_user_limit: 1, start_time: daysAgo(30), end_time: daysAgo(-60), category_id: 1, enabled: true, created_at: daysAgo(26) },
];

/** 用户已领取的优惠券 */
const userCoupons = [
  { id: 1, user_id: 1, coupon_id: 1, coupon: coupons[0], status: 'USER_COUPON_STATUS_UNUSED', order_id: 0, received_at: daysAgo(12), used_at: null },
  { id: 2, user_id: 1, coupon_id: 2, coupon: coupons[1], status: 'USER_COUPON_STATUS_UNUSED', order_id: 0, received_at: daysAgo(10), used_at: null },
  { id: 3, user_id: 1, coupon_id: 4, coupon: coupons[3], status: 'USER_COUPON_STATUS_UNUSED', order_id: 0, received_at: daysAgo(8), used_at: null },
  { id: 4, user_id: 1, coupon_id: 3, coupon: coupons[2], status: 'USER_COUPON_STATUS_USED', order_id: 1, received_at: daysAgo(20), used_at: daysAgo(4) },
  { id: 5, user_id: 1, coupon_id: 5, coupon: coupons[4], status: 'USER_COUPON_STATUS_EXPIRED', order_id: 0, received_at: daysAgo(40), used_at: null },
];

/** 购物车条目 */
const cartItems = [
  { id: 1, user_id: 1, product_id: 4, sku_id: 8, product_title: '不粘炒锅 32cm', spec_text: '32cm / 灰黑', image: 'https://placehold.co/600x600/12B76A/FFFFFF?text=Pan+32cm', price_cents: 12900, quantity: 1, stock: 1200, selected: true, available: true, subtotal_cents: 12900, created_at: daysAgo(2), updated_at: daysAgo(2) },
  { id: 2, user_id: 1, product_id: 9, sku_id: 18, product_title: '降噪蓝牙耳机 Air', spec_text: '星夜黑 / 标准版', image: 'https://placehold.co/600x600/121B26/FFFFFF?text=Earphone+Air', price_cents: 69900, quantity: 2, stock: 520, selected: true, available: true, subtotal_cents: 139800, created_at: daysAgo(1), updated_at: daysAgo(1) },
  { id: 3, user_id: 1, product_id: 7, sku_id: 15, product_title: '进口车厘子 2kg 装', spec_text: '2kg / XXXL级', image: 'https://placehold.co/600x600/F04438/FFFFFF?text=Cherry+2kg', price_cents: 12900, quantity: 3, stock: 0, selected: false, available: false, subtotal_cents: 38700, created_at: daysAgo(3), updated_at: daysAgo(3) },
];

/** 收货地址 */
const addresses = [
  { id: 1, user_id: 1, receiver: '张三', phone: '13800138000', province: '浙江省', city: '杭州市', district: '西湖区', detail: '文三路 100 号 8 楼 801 室', postal_code: '310000', tag: '公司', is_default: true },
  { id: 2, user_id: 1, receiver: '张三', phone: '13800138000', province: '浙江省', city: '杭州市', district: '余杭区', detail: '未来科技城海创园 3 号楼', postal_code: '311100', tag: '家', is_default: false },
];

/** 收藏 */
const favorites = [
  { id: 1, product_id: 1, title: '旗舰智能手机 Pro 256GB', cover: 'https://placehold.co/600x600/2A4AD9/FFFFFF?text=Pro+256GB', price_cents: 429900, created_at: daysAgo(7) },
  { id: 2, product_id: 3, title: '智能运动手表 GT4', cover: 'https://placehold.co/600x600/F5811F/FFFFFF?text=Watch+GT4', price_cents: 89900, created_at: daysAgo(5) },
  { id: 3, product_id: 7, title: '进口车厘子 2kg 装', cover: 'https://placehold.co/600x600/F04438/FFFFFF?text=Cherry+2kg', price_cents: 8900, created_at: daysAgo(2) },
];

/** 消息通知 */
const notifications = [
  { id: 1, user_id: 1, type: 'NOTIFICATION_TYPE_ORDER', title: '订单已支付', content: '您的订单 SS2026101800001 已支付成功，商家将尽快发货。', link: '/pages/order-detail/order-detail?id=1', biz_id: 1, read: false, created_at: hoursAgo(3), read_at: null },
  { id: 2, user_id: 1, type: 'NOTIFICATION_TYPE_LOGISTICS', title: '包裹已发出', content: '您的订单包裹已由顺丰速运揽收，运单号 SF1234567890。', link: '/pages/order-detail/order-detail?id=1', biz_id: 1, read: false, created_at: hoursAgo(20), read_at: null },
  { id: 3, user_id: 1, type: 'NOTIFICATION_TYPE_PROMOTION', title: '夏日数码狂欢季开启', content: '数码会场满 2000 减 300，叠加优惠券更优惠。', link: '/pages/index/index', biz_id: 0, read: false, created_at: daysAgo(2), read_at: null },
  { id: 4, user_id: 1, type: 'NOTIFICATION_TYPE_SYSTEM', title: '欢迎来到 ShopStack', content: '完善收货地址与个人资料，购物体验更顺畅。', link: '/pages/address/address', biz_id: 0, read: true, created_at: daysAgo(6), read_at: daysAgo(6) },
];

/** 积分明细（PointsLog） */
const pointsLogs = [
  { id: 1, user_id: 1, title: '订单 SS2026102000002 消费积分', change: -120, balance: 1080, biz_type: 'order', biz_id: '2', created_at: daysAgo(0.2) },
  { id: 2, user_id: 1, title: '每日签到奖励', change: 5, balance: 1200, biz_type: 'register', biz_id: '0', created_at: daysAgo(1) },
  { id: 3, user_id: 1, title: '评价商品获得积分', change: 20, balance: 1195, biz_type: 'exchange', biz_id: '1', created_at: daysAgo(2) },
  { id: 4, user_id: 1, title: '订单 SS2026092800003 消费积分', change: -60, balance: 1175, biz_type: 'order', biz_id: '3', created_at: daysAgo(22) },
  { id: 5, user_id: 1, title: '会员日加倍积分', change: 88, balance: 1235, biz_type: 'admin', biz_id: '0', created_at: daysAgo(25) },
  { id: 6, user_id: 1, title: '积分过期清零', change: -35, balance: 1147, biz_type: 'admin', biz_id: '0', created_at: daysAgo(40) },
];

/** 发票（Invoice） */
const invoices = [
  { id: 1, user_id: 1, order_no: 'SS2026092800003', title: '杭州云启科技有限公司', tax_no: '91330106MA2XXXXX1B', type: 'company', email: 'demo@shopstack.dev', amount_cents: 15800, status: 1, invoice_url: 'https://placehold.co/600x400/12B76A/FFFFFF?text=Invoice+1', remark: '专票', created_at: daysAgo(18) },
  { id: 2, user_id: 1, order_no: 'SS2026101800001', title: '演示用户', tax_no: '', type: 'personal', email: 'demo@shopstack.dev', amount_cents: 139800, status: 0, invoice_url: '', remark: '个人电子发票', created_at: daysAgo(1) },
];

/** 演示用户 */
const user = {
  id: 1,
  username: 'demo',
  nickname: '演示用户',
  avatar: 'https://placehold.co/120x120/2A4AD9/FFFFFF?text=Demo',
  phone: '13800138000',
  email: 'demo@shopstack.dev',
  gender: 'GENDER_MALE',
  birthday: '1995-05-20',
  points: 1200,
  balance_cents: 888800,
  growth_value: 1280,
  realname_verified: false,
  status: 'USER_STATUS_ACTIVE',
  wechat_openid: 'mock_openid_demo',
  created_at: daysAgo(90),
  last_login_at: hoursAgo(2),
};

/** 订单数据 */
function buildOrderItem(id, orderId, productId, skuId, quantity, priceCents, reviewed) {
  const product = productMap[productId];
  const sku = skuMap[skuId];
  return {
    id: id,
    order_id: orderId,
    product_id: productId,
    sku_id: skuId,
    product_title: product ? product.title : '',
    spec_text: sku ? sku.spec_text : '',
    image: product ? product.cover : '',
    price_cents: priceCents,
    quantity: quantity,
    subtotal_cents: priceCents * quantity,
    refunded_cents: 0,
    reviewed: !!reviewed,
  };
}

const orderLogs = {};
function pushLog(orderId, log) {
  if (!orderLogs[orderId]) {
    orderLogs[orderId] = [];
  }
  orderLogs[orderId].push(log);
}

const orders = [
  {
    id: 1,
    order_no: 'SS2026101800001',
    user_id: 1,
    user_nickname: '演示用户',
    status: 'ORDER_STATUS_SHIPPED',
    total_amount_cents: 139800,
    discount_cents: 0,
    freight_cents: 0,
    payable_cents: 139800,
    paid_cents: 139800,
    refunded_cents: 0,
    item_count: 1,
    total_quantity: 2,
    address: addresses[0],
    remark: '麻烦尽快发货',
    payment_method: 'wechat',
    paid_at: daysAgo(2),
    shipped_at: daysAgo(1),
    completed_at: null,
    cancelled_at: null,
    created_at: daysAgo(2),
    updated_at: daysAgo(1),
    admin_remark: '',
    shipment_id: 1,
    items: [buildOrderItem(1, 1, 9, 18, 2, 69900, false)],
  },
  {
    id: 2,
    order_no: 'SS2026102000002',
    user_id: 1,
    user_nickname: '演示用户',
    status: 'ORDER_STATUS_PENDING_PAYMENT',
    total_amount_cents: 12900,
    discount_cents: 0,
    freight_cents: 0,
    payable_cents: 12900,
    paid_cents: 0,
    refunded_cents: 0,
    item_count: 1,
    total_quantity: 1,
    address: addresses[1],
    remark: '',
    payment_method: 'wechat',
    paid_at: null,
    shipped_at: null,
    completed_at: null,
    cancelled_at: null,
    created_at: hoursAgo(5),
    updated_at: hoursAgo(5),
    admin_remark: '',
    shipment_id: 0,
    items: [buildOrderItem(2, 2, 4, 8, 1, 12900, false)],
  },
  {
    id: 3,
    order_no: 'SS2026092800003',
    user_id: 1,
    user_nickname: '演示用户',
    status: 'ORDER_STATUS_COMPLETED',
    total_amount_cents: 17800,
    discount_cents: 2000,
    freight_cents: 0,
    payable_cents: 15800,
    paid_cents: 15800,
    refunded_cents: 0,
    item_count: 1,
    total_quantity: 1,
    address: addresses[0],
    remark: '',
    payment_method: 'wechat',
    paid_at: daysAgo(22),
    shipped_at: daysAgo(21),
    completed_at: daysAgo(18),
    cancelled_at: null,
    created_at: daysAgo(22),
    updated_at: daysAgo(18),
    admin_remark: '',
    shipment_id: 2,
    items: [buildOrderItem(3, 3, 12, 22, 1, 17800, true)],
  },
];

orders.forEach((order) => {
  order.items = order.items || [];
  pushLog(order.id, { id: order.id * 100, order_id: order.id, from_status: 0, to_status: 1, action: 'created', operator: '用户', remark: '订单提交', created_at: order.created_at });
  if (order.paid_at) {
    pushLog(order.id, { id: order.id * 100 + 1, order_id: order.id, from_status: 1, to_status: 2, action: 'paid', operator: '用户', remark: '支付成功', created_at: order.paid_at });
  }
  if (order.shipped_at) {
    pushLog(order.id, { id: order.id * 100 + 2, order_id: order.id, from_status: 2, to_status: 3, action: 'shipped', operator: '商家', remark: '已发货', created_at: order.shipped_at });
  }
  if (order.completed_at) {
    pushLog(order.id, { id: order.id * 100 + 3, order_id: order.id, from_status: 3, to_status: 4, action: 'completed', operator: '用户', remark: '交易完成', created_at: order.completed_at });
  }
});

/** 物流轨迹 */
const shipmentTracks = {
  1: [
    { id: 11, shipment_id: 1, tracking_no: 'SF1234567890', location: '杭州市', description: '快件已到达 [杭州转运中心]', occurred_at: daysAgo(1), sort: 1 },
    { id: 12, shipment_id: 1, tracking_no: 'SF1234567890', location: '杭州市', description: '快件已发出 [杭州未来科技城网点]', occurred_at: hoursAgo(20), sort: 2 },
    { id: 13, shipment_id: 1, tracking_no: 'SF1234567890', location: '杭州市', description: '顺丰速运已收取快件', occurred_at: hoursAgo(26), sort: 3 },
  ],
  2: [
    { id: 21, shipment_id: 2, tracking_no: 'ZT9876543210', location: '杭州市', description: '快件已签收，感谢使用顺丰速运', occurred_at: daysAgo(18), sort: 1 },
    { id: 22, shipment_id: 2, tracking_no: 'ZT9876543210', location: '杭州市', description: '快件派送中，请注意查收', occurred_at: daysAgo(19), sort: 2 },
  ],
};

/** 生成 n 天前的日期键（YYYY-MM-DD） */
function dateKey(n) {
  const d = new Date(Date.now() - n * 24 * 3600 * 1000);
  const pad = (x) => (x < 10 ? '0' + x : '' + x);
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

/** 身份证号脱敏 */
function maskIdCard(value) {
  const text = String(value || '');
  if (text.length < 8) {
    return text;
  }
  return text.slice(0, 4) + '*'.repeat(Math.max(0, text.length - 6)) + text.slice(-2);
}

/** 频道列表（type: 1 推荐 2 新品 3 热销 4 限时 5 预售 6 清仓 7 包邮 8 跨境 9 楼层） */
const channels = [
  { id: 1, name: '推荐', code: 'recommend', icon: '', banner_url: 'https://placehold.co/750x320/2A4AD9/FFFFFF?text=Recommend', description: '平台精选好物', sort: 1, type: 1, status: 1, product_count: 12, created_at: daysAgo(30) },
  { id: 2, name: '新品', code: 'newest', icon: '', banner_url: 'https://placehold.co/750x320/5F87FF/FFFFFF?text=New', description: '最近上架的新品', sort: 2, type: 2, status: 1, product_count: 5, created_at: daysAgo(28) },
  { id: 3, name: '热销', code: 'hot', icon: '', banner_url: 'https://placehold.co/750x320/F56C6C/FFFFFF?text=Hot', description: '销量领先的商品', sort: 3, type: 3, status: 1, product_count: 6, created_at: daysAgo(26) },
  { id: 4, name: '限时', code: 'flash', icon: '', banner_url: 'https://placehold.co/750x320/E67E22/FFFFFF?text=Flash', description: '整点开抢限量秒杀', sort: 4, type: 4, status: 1, product_count: 5, created_at: daysAgo(24) },
  { id: 5, name: '预售', code: 'presale', icon: '', banner_url: 'https://placehold.co/750x320/722ED1/FFFFFF?text=Presale', description: '新品首发预售', sort: 5, type: 5, status: 1, product_count: 4, created_at: daysAgo(22) },
  { id: 6, name: '清仓', code: 'clearance', icon: '', banner_url: 'https://placehold.co/750x320/8C8C8C/FFFFFF?text=Clearance', description: '断码清仓低价出清', sort: 6, type: 6, status: 1, product_count: 4, created_at: daysAgo(20) },
  { id: 7, name: '包邮', code: 'freeship', icon: '', banner_url: 'https://placehold.co/750x320/12B76A/FFFFFF?text=FreeShip', description: '全国包邮无需凑单', sort: 7, type: 7, status: 1, product_count: 5, created_at: daysAgo(18) },
  { id: 8, name: '跨境', code: 'cross', icon: '', banner_url: 'https://placehold.co/750x320/0BA5EC/FFFFFF?text=Cross', description: '原产地直采全球好物', sort: 8, type: 8, status: 1, product_count: 3, created_at: daysAgo(16) },
  { id: 9, name: '生鲜', code: 'fresh', icon: '', banner_url: 'https://placehold.co/750x320/12B76A/FFFFFF?text=Fresh', description: '冷链直发生鲜到家', sort: 9, type: 9, status: 1, product_count: 3, created_at: daysAgo(14) },
];

/** 每个频道的商品集合与价格系数（factor < 1 表示频道优惠） */
const channelProductConfig = {
  recommend: { ids: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], factor: 1, tag: '为你推荐' },
  newest: { ids: [1, 9, 11, 12, 10], factor: 1, tag: '新品首发' },
  hot: { ids: [7, 4, 3, 9, 11, 12], factor: 1, tag: '热销爆款' },
  flash: { ids: [3, 4, 7, 9, 11], factor: 0.8, tag: '限时秒杀' },
  presale: { ids: [1, 2, 10, 12], factor: 0.95, tag: '新品预售' },
  clearance: { ids: [6, 8, 5, 4], factor: 0.6, tag: '清仓特卖' },
  freeship: { ids: [7, 12, 4, 11, 8], factor: 1, tag: '全国包邮' },
  cross: { ids: [7, 8, 11], factor: 1.05, tag: '跨境直邮' },
  fresh: { ids: [7, 4, 12], factor: 1, tag: '冷链生鲜' },
};

/** 商品问答（ProductQuestion） */
const productQuestions = [
  { id: 1, product_id: 1, product_title: '旗舰智能手机 Pro 256GB', user_id: 2, user_nickname: '爱丽丝', content: '这款支持无线充电吗？', images: [], reply: '支持 50W 无线充电，包装内含原装充电头与数据线。', reply_at: daysAgo(20), created_at: daysAgo(21) },
  { id: 2, product_id: 1, product_title: '旗舰智能手机 Pro 256GB', user_id: 3, user_nickname: '鲍勃', content: '机身重量大概是多少？可以单手操作吗？', images: [], reply: '整机约 210g，6.7 英寸屏幕可以单手握持，长时间使用建议佩戴支架。', reply_at: daysAgo(12), created_at: daysAgo(13) },
  { id: 3, product_id: 1, product_title: '旗舰智能手机 Pro 256GB', user_id: 1, user_nickname: '演示用户', content: '内存版本怎么选？', images: [], reply: '日常使用 12+256GB 足够，重度游戏与影像创作建议 12+512GB。', reply_at: daysAgo(6), created_at: daysAgo(7) },
  { id: 4, product_id: 2, product_title: '轻薄商务笔记本 14 英寸', user_id: 2, user_nickname: '爱丽丝', content: '充电器是随机附送吗？', images: [], reply: '标配 65W 氮化镓充电器，不额外收费。', reply_at: daysAgo(15), created_at: daysAgo(16) },
  { id: 5, product_id: 3, product_title: '智能运动手表 GT4', user_id: 3, user_nickname: '鲍勃', content: '支持独立通话吗？', images: [], reply: '支持蓝牙独立通话，麦克风收音清晰，续航不受影响。', reply_at: daysAgo(9), created_at: daysAgo(10) },
  { id: 6, product_id: 4, product_title: '不粘炒锅 32cm', user_id: 1, user_nickname: '演示用户', content: '可以用于电磁炉吗？', images: [], reply: '可以，锅底为导磁复合材质，燃气、电磁炉、电陶炉通用。', reply_at: daysAgo(5), created_at: daysAgo(6) },
  { id: 7, product_id: 7, product_title: '进口车厘子 2kg 装', user_id: 2, user_nickname: '爱丽丝', content: '冷链发货大概几天能到？', images: [], reply: '产地直采后 48 小时内发出，江浙沪一般次日达，其他地区 2-3 天。', reply_at: daysAgo(3), created_at: daysAgo(4) },
  { id: 8, product_id: 7, product_title: '进口车厘子 2kg 装', user_id: 3, user_nickname: '鲍勃', content: '坏果包赔怎么申请？', images: [], reply: '签收后 24 小时内拍照提交售后，审核通过后按坏果数量退款。', reply_at: daysAgo(1), created_at: daysAgo(2) },
  { id: 9, product_id: 9, product_title: '降噪蓝牙耳机 Air', user_id: 1, user_nickname: '演示用户', content: '降噪深度有多少？地铁场景够用吗？', images: [], reply: '最高 42dB 主动降噪，地铁与飞机等强噪声场景表现良好。', reply_at: daysAgo(4), created_at: daysAgo(5) },
  { id: 10, product_id: 5, product_title: '全棉四件套 1.8m', user_id: 2, user_nickname: '爱丽丝', content: '四件套包含哪些？', images: [], reply: '包含被套、床单及枕套各两件，纯棉 60 支面料。', reply_at: daysAgo(8), created_at: daysAgo(9) },
];

/** 评价标签字典（ReviewTag） */
const reviewTagDict = [
  { id: 1, name: '质量好', sort: 1, enabled: true },
  { id: 2, name: '物流快', sort: 2, enabled: true },
  { id: 3, name: '包装好', sort: 3, enabled: true },
  { id: 4, name: '性价比高', sort: 4, enabled: true },
  { id: 5, name: '做工精细', sort: 5, enabled: true },
  { id: 6, name: '客服耐心', sort: 6, enabled: true },
  { id: 7, name: '续航给力', sort: 7, enabled: true },
  { id: 8, name: '外观时尚', sort: 8, enabled: true },
  { id: 9, name: '发货快', sort: 9, enabled: true },
];

/** 营销任务（UserTask） */
const marketingTasks = [
  { task_id: 1, name: '每日签到', description: '每天签到即可领取积分奖励', type: 5, progress: 0, target_count: 1, completed: false, claimed: false, reward_points: 5, reward_coupon_id: 0, icon: '📅' },
  { task_id: 2, name: '浏览商品', description: '在商品详情页浏览 3 件商品', type: 1, progress: 1, target_count: 3, completed: false, claimed: false, reward_points: 10, reward_coupon_id: 0, icon: '👀' },
  { task_id: 3, name: '完成一笔订单', description: '下单并完成支付 1 笔', type: 2, progress: 1, target_count: 1, completed: true, claimed: true, reward_points: 50, reward_coupon_id: 0, icon: '📦' },
  { task_id: 4, name: '评价一件商品', description: '发表 1 条商品评价', type: 4, progress: 0, target_count: 1, completed: false, claimed: false, reward_points: 20, reward_coupon_id: 0, icon: '💬' },
  { task_id: 5, name: '分享活动', description: '把活动分享给好友', type: 3, progress: 0, target_count: 1, completed: false, claimed: false, reward_points: 15, reward_coupon_id: 0, icon: '📤' },
];

/** 拼团活动（GroupBuy） */
const groupBuys = [
  {
    id: 1, name: '智能运动手表 GT4 · 3 人团', description: '3 人成团立减 20 元，团长包邮', promotion_id: 1, product_id: 3, product_title: '智能运动手表 GT4', product_image: 'https://placehold.co/600x600/F5811F/FFFFFF?text=Watch+GT4',
    price_cents: 79900, original_price_cents: 89900, required_members: 3, joined_members: 2, group_size: 3, status: 1,
    start_time: Math.floor(Date.now() / 1000) - 3 * 86400, end_time: Math.floor(Date.now() / 1000) + 2 * 86400,
    banner_image: 'https://placehold.co/1200x500/2A4AD9/FFFFFF?text=Group+Watch',
  },
  {
    id: 2, name: '降噪蓝牙耳机 Air · 2 人团', description: '2 人成团再减 7 元', promotion_id: 1, product_id: 9, product_title: '降噪蓝牙耳机 Air', product_image: 'https://placehold.co/600x600/121B26/FFFFFF?text=Earphone+Air',
    price_cents: 62900, original_price_cents: 69900, required_members: 2, joined_members: 1, group_size: 2, status: 1,
    start_time: Math.floor(Date.now() / 1000) - 86400, end_time: Math.floor(Date.now() / 1000) + 86400,
    banner_image: 'https://placehold.co/1200x500/2239AC/FFFFFF?text=Group+Earphone',
  },
  {
    id: 3, name: '全棉四件套 1.8m · 5 人团', description: '5 人成团价，团长额外返 10 元', promotion_id: 1, product_id: 5, product_title: '全棉四件套 1.8m', product_image: 'https://placehold.co/600x600/0BA5EC/FFFFFF?text=Bedding',
    price_cents: 25900, original_price_cents: 29900, required_members: 5, joined_members: 5, group_size: 5, status: 2,
    start_time: Math.floor(Date.now() / 1000) - 6 * 86400, end_time: Math.floor(Date.now() / 1000) - 86400,
    banner_image: 'https://placehold.co/1200x500/12B76A/FFFFFF?text=Group+Bedding',
  },
];

/** 拼团成员（GroupBuyMember） */
const groupBuyMembers = {
  1: [
    { id: 11, group_buy_id: 1, user_id: 2, user_nickname: '爱丽丝', joined_at: daysAgo(3) },
    { id: 12, group_buy_id: 1, user_id: 3, user_nickname: '鲍勃', joined_at: daysAgo(2) },
  ],
  2: [{ id: 21, group_buy_id: 2, user_id: 3, user_nickname: '鲍勃', joined_at: daysAgo(1) }],
  3: [
    { id: 31, group_buy_id: 3, user_id: 2, user_nickname: '爱丽丝', joined_at: daysAgo(6) },
    { id: 32, group_buy_id: 3, user_id: 3, user_nickname: '鲍勃', joined_at: daysAgo(5) },
    { id: 33, group_buy_id: 3, user_id: 4, user_nickname: '卡门', joined_at: daysAgo(4) },
    { id: 34, group_buy_id: 3, user_id: 5, user_nickname: '迪恩', joined_at: daysAgo(3) },
    { id: 35, group_buy_id: 3, user_id: 1, user_nickname: '演示用户', joined_at: daysAgo(2) },
  ],
};

/** 活动场次（PromotionSession，时间为 Unix 秒） */
const promotionSessionList = [
  { id: 1, promotion_id: 1, name: '上午场 10:00', start_time: Math.floor(Date.now() / 1000) - 86400, end_time: Math.floor(Date.now() / 1000) - 86400 + 7200, stock: 500, sold_count: 500, status: 2 },
  { id: 2, promotion_id: 1, name: '下午场 14:00', start_time: Math.floor(Date.now() / 1000) - 3600, end_time: Math.floor(Date.now() / 1000) + 7200, stock: 500, sold_count: 268, status: 1 },
  { id: 3, promotion_id: 1, name: '晚间场 20:00', start_time: Math.floor(Date.now() / 1000) + 36000, end_time: Math.floor(Date.now() / 1000) + 54000, stock: 500, sold_count: 0, status: 0 },
  { id: 4, promotion_id: 2, name: '数码专场', start_time: Math.floor(Date.now() / 1000) - 7200, end_time: Math.floor(Date.now() / 1000) + 3600, stock: 200, sold_count: 96, status: 1 },
  { id: 5, promotion_id: 3, name: '生鲜秒杀场', start_time: Math.floor(Date.now() / 1000) - 1800, end_time: Math.floor(Date.now() / 1000) + 3600, stock: 100, sold_count: 41, status: 1 },
];

/** 售后单（AfterSale，type: 1 仅退款 2 退货退款 3 换货；status: 0 待审核 1 通过 2 驳回 3 已退款 4 完成） */
const afterSales = [
  {
    id: 1, after_sale_no: 'AS20261019000001', order_id: 1, order_no: 'SS2026101800001', user_id: 1, user_nickname: '演示用户',
    type: 1, amount_cents: 69900, reason: '商品质量问题', description: '耳机左耳无声，已上传开箱视频',
    item_ids: [1], status: 0, admin_remark: '', refund_id: 0, created_at: daysAgo(1), processed_at: null,
  },
  {
    id: 2, after_sale_no: 'AS20260927000002', order_id: 3, order_no: 'SS2026092800003', user_id: 1, user_nickname: '演示用户',
    type: 2, amount_cents: 15800, reason: '不想要了', description: '个人原因申请退货，商品已寄回',
    item_ids: [3], status: 3, admin_remark: '已收到退回商品并完成退款', refund_id: 9001, created_at: daysAgo(20), processed_at: daysAgo(18),
  },
];

/** 退款原因（RefundReason，type: 1 仅退款 2 退货退款 3 换货） */
const refundReasons = [
  { id: 1, name: '商品质量问题', type: 1, sort: 1, enabled: true },
  { id: 2, name: '商品与描述不符', type: 1, sort: 2, enabled: true },
  { id: 3, name: '不想要了', type: 1, sort: 3, enabled: true },
  { id: 4, name: '拍错了 / 多拍了', type: 1, sort: 4, enabled: true },
  { id: 5, name: '配送太慢', type: 2, sort: 5, enabled: true },
  { id: 6, name: '商品破损', type: 2, sort: 6, enabled: true },
  { id: 7, name: '其它原因', type: 1, sort: 7, enabled: true },
];

/** 会员等级体系（UserLevel） */
const memberLevels = [
  { id: 1, name: '普通会员', level: 1, min_growth: 0, max_growth: 999, discount_percent: 100, icon: 'https://placehold.co/64x64/9AA5B1/FFFFFF?text=L1', description: '注册即成为普通会员', benefits: ['购物车收藏', '基础优惠券'], sort: 1 },
  { id: 2, name: '白银会员', level: 2, min_growth: 1000, max_growth: 4999, discount_percent: 99, icon: 'https://placehold.co/64x64/9AA5B1/FFFFFF?text=L2', description: '累计成长值满 1000 升级', benefits: ['9.9折', '生日券', '优先客服'], sort: 2 },
  { id: 3, name: '黄金会员', level: 3, min_growth: 5000, max_growth: 19999, discount_percent: 95, icon: 'https://placehold.co/64x64/D4A017/FFFFFF?text=L3', description: '累计成长值满 5000 升级', benefits: ['9.5折', '专属客服', '免运费券'], sort: 3 },
  { id: 4, name: '钻石会员', level: 4, min_growth: 20000, max_growth: 999999, discount_percent: 90, icon: 'https://placehold.co/64x64/7A5AF8/FFFFFF?text=L4', description: '累计成长值满 20000 升级', benefits: ['9折', '专属客服', '生日双倍积分'], sort: 4 },
];

/** 成长值明细（GrowthLog） */
const growthLogs = [
  { id: 1, user_id: 1, change: 140, balance: 1280, title: '订单 SS2026101800001 消费成长值', biz_type: 'order', created_at: daysAgo(2) },
  { id: 2, user_id: 1, change: 20, balance: 1140, title: '评价商品获得成长值', biz_type: 'review', created_at: daysAgo(4) },
  { id: 3, user_id: 1, change: 5, balance: 1120, title: '完成每日签到', biz_type: 'sign_in', created_at: daysAgo(5) },
  { id: 4, user_id: 1, change: 178, balance: 1115, title: '订单 SS2026092800003 消费成长值', biz_type: 'order', created_at: daysAgo(22) },
  { id: 5, user_id: 1, change: 50, balance: 937, title: '完善个人资料奖励', biz_type: 'profile', created_at: daysAgo(40) },
];

/** 发票抬头模板（InvoiceTemplate） */
const invoiceTemplates = [
  { id: 1, user_id: 1, title: '杭州云启科技有限公司', tax_no: '91330106MA2XXXXX1B', type: 'company', email: 'demo@shopstack.dev', phone: '13800138000', address: '浙江省杭州市西湖区文三路 100 号', bank_name: '中国银行杭州文三路支行', bank_account: '6217 **** 8899', is_default: true, created_at: daysAgo(40) },
  { id: 2, user_id: 1, title: '演示用户', tax_no: '', type: 'personal', email: 'demo@shopstack.dev', phone: '13800138000', address: '', bank_name: '', bank_account: '', is_default: false, created_at: daysAgo(10) },
];

/** 通知设置（UserNotificationSettings） */
const notificationSettings = {
  user_id: 1, order_notice: true, logistics_notice: true, marketing_notice: false, system_notice: true,
  sms_notice: true, email_notice: false, wechat_notice: true,
};

/** 账号安全告警（AccountSecurityInfo.warnings） */
const securityWarnings = ['当前账号已在 2 台设备登录，如非本人操作请及时修改密码'];

/** 帮助文章（HelpArticle） */
const helpArticles = [
  { id: 1, category_id: 1, category_name: '购物指南', title: '如何挑选合适的规格', content: '在商品详情页点击「选择规格」，可以查看每个 SKU 对应的价格、库存与配送时效。下单前请确认规格与数量，规格不同的商品需要分别下单。', sort: 1, enabled: true, view_count: 129, created_at: daysAgo(12) },
  { id: 2, category_id: 1, category_name: '购物指南', title: '购物车里的商品为什么会失效', content: '商品下架、库存售罄或店铺调价时，购物车中的对应条目会标记为失效，请在结算前移除失效商品，失效商品不参与运费与优惠计算。', sort: 2, enabled: true, view_count: 86, created_at: daysAgo(10) },
  { id: 3, category_id: 2, category_name: '配送说明', title: '支持哪些配送方式', content: '平台支持快递配送、同城配送与门店自提，具体以结算页展示为准。生鲜与冷链商品仅支持快递配送，并使用保温包装。', sort: 1, enabled: true, view_count: 213, created_at: daysAgo(9) },
  { id: 4, category_id: 2, category_name: '配送说明', title: '运费怎么计算', content: '订单金额达到包邮门槛即免运费，未达到时按运费模板的规则收取，偏远地区可能存在额外时效与费用，具体以下单页展示为准。', sort: 2, enabled: true, view_count: 174, created_at: daysAgo(8) },
  { id: 5, category_id: 3, category_name: '退换售后', title: '退款与退货流程', content: '支持 7 天无理由退货，商品需保持完好；质量问题请在签收后 48 小时内提交售后申请，审核通过后按提示寄回并填写退货运单号，平台验收后原路退款。', sort: 1, enabled: true, view_count: 305, created_at: daysAgo(7) },
  { id: 6, category_id: 3, category_name: '退换售后', title: '发票开具说明', content: '订单完成后可在发票页申请电子普通发票或增值税专用发票，抬头支持个人与企业，企业抬头需填写税号与开户行信息，抬头模板可在账户设置中预先维护。', sort: 2, enabled: true, view_count: 158, created_at: daysAgo(6) },
  { id: 7, category_id: 4, category_name: '账户安全', title: '哪些场景需要实名认证', content: '购买生鲜、跨境商品或申请增值税专用发票需要完成实名认证，认证信息仅用于履约与开票，平台会加密存储。', sort: 1, enabled: true, view_count: 96, created_at: daysAgo(5) },
  { id: 8, category_id: 4, category_name: '账户安全', title: '账号与登录安全', content: '在账号安全页可以查看账号绑定情况与风险提示，异常登录请及时修改密码并退出异常设备；更换绑定手机需要通过原手机验证码验证。', sort: 2, enabled: true, view_count: 143, created_at: daysAgo(4) },
];

/** 收货地区字典（Region，level: 1 省 2 市 3 区，扁平列表） */
const regionList = [
  { id: 1, parent_id: 0, name: '北京市', code: '110000', level: 1, sort: 1 },
  { id: 2, parent_id: 1, name: '北京市', code: '110100', level: 2, sort: 1 },
  { id: 3, parent_id: 2, name: '朝阳区', code: '110105', level: 3, sort: 1 },
  { id: 4, parent_id: 2, name: '海淀区', code: '110108', level: 3, sort: 2 },
  { id: 5, parent_id: 0, name: '上海市', code: '310000', level: 1, sort: 2 },
  { id: 6, parent_id: 5, name: '上海市', code: '310100', level: 2, sort: 1 },
  { id: 7, parent_id: 6, name: '浦东新区', code: '310115', level: 3, sort: 1 },
  { id: 8, parent_id: 0, name: '广东省', code: '440000', level: 1, sort: 3 },
  { id: 9, parent_id: 8, name: '广州市', code: '440100', level: 2, sort: 1 },
  { id: 10, parent_id: 9, name: '天河区', code: '440106', level: 3, sort: 1 },
  { id: 11, parent_id: 9, name: '越秀区', code: '440104', level: 3, sort: 2 },
  { id: 12, parent_id: 8, name: '深圳市', code: '440300', level: 2, sort: 2 },
  { id: 13, parent_id: 12, name: '南山区', code: '440305', level: 3, sort: 1 },
  { id: 14, parent_id: 12, name: '福田区', code: '440304', level: 3, sort: 2 },
  { id: 15, parent_id: 0, name: '浙江省', code: '330000', level: 1, sort: 4 },
  { id: 16, parent_id: 15, name: '杭州市', code: '330100', level: 2, sort: 1 },
  { id: 17, parent_id: 16, name: '西湖区', code: '330106', level: 3, sort: 1 },
  { id: 18, parent_id: 16, name: '余杭区', code: '330110', level: 3, sort: 2 },
  { id: 19, parent_id: 0, name: '江苏省', code: '320000', level: 1, sort: 5 },
  { id: 20, parent_id: 19, name: '南京市', code: '320100', level: 2, sort: 1 },
  { id: 21, parent_id: 20, name: '鼓楼区', code: '320106', level: 3, sort: 1 },
  { id: 22, parent_id: 0, name: '四川省', code: '510000', level: 1, sort: 6 },
  { id: 23, parent_id: 22, name: '成都市', code: '510100', level: 2, sort: 1 },
  { id: 24, parent_id: 23, name: '武侯区', code: '510107', level: 3, sort: 1 },
];

/** 内存态 */
const state = {
  user: user,
  categories: categories,
  products: products,
  skus: skus,
  productImages: productImages,
  productAttributes: productAttributes,
  reviews: reviews,
  banners: banners,
  promotions: promotions,
  coupons: coupons,
  userCoupons: userCoupons,
  cartItems: cartItems,
  orders: orders,
  orderLogs: orderLogs,
  addresses: addresses,
  favorites: favorites,
  notifications: notifications,
  pointsLogs: pointsLogs,
  invoices: invoices,
  payments: [],
  /** 签到日历 */
  signIn: {
    calendar: [1, 2, 3, 4, 5, 6].map((n) => ({ date: dateKey(n), signed: true, points: 5 })),
    continuous_days: 6,
    total_days: 12,
  },
  /** 营销任务 */
  tasks: marketingTasks,
  /** 拼团 */
  groupBuys: groupBuys,
  /** 拼团成员 */
  groupBuyMembers: groupBuyMembers,
  /** 活动场次 */
  promotionSessions: promotionSessionList,
  /** 售后单 */
  afterSales: afterSales,
  /** 成长值明细 */
  growthLogs: growthLogs,
  /** 发票抬头模板 */
  invoiceTemplates: invoiceTemplates,
  /** 通知设置 */
  notificationSettings: notificationSettings,
  /** 帮助文章 */
  helpArticles: helpArticles,
  /** 收货地区字典 */
  regions: regionList,
  /** 用户反馈 */
  feedbacks: [],
  nextId: 1000,
};

function nextId() {
  state.nextId += 1;
  return state.nextId;
}

// ---------------------------------------------------------------------------
// 工具
// ---------------------------------------------------------------------------

/** 分页处理（兼容 page.page / page.page_size 点号嵌套与扁平写法） */
function paginate(list, params) {
  const source = params || {};
  const rawPage = source['page.page'] !== undefined ? source['page.page'] : source.page;
  const rawSize = source['page.page_size'] !== undefined ? source['page.page_size'] : source.page_size;
  const page = Math.max(1, Number(rawPage) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(rawSize) || 20));
  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  return {
    list: list.slice(start, start + pageSize),
    meta: { page: page, page_size: pageSize, total: total, total_pages: totalPages },
  };
}

/** 分类及其子分类 id 集合 */
function categoryIds(categoryId) {
  const ids = [Number(categoryId)];
  const category = categoryMap[Number(categoryId)];
  if (category && category.children.length) {
    category.children.forEach((child) => ids.push(child.id));
  }
  return ids;
}

/** 构造购物车对象 */
function buildCart() {
  const items = state.cartItems.map((item) => {
    const sku = skuMap[item.sku_id];
    const product = productMap[item.product_id];
    const stock = sku ? sku.stock : 0;
    const onShelf = product ? product.status === 'PRODUCT_STATUS_ON_SHELF' : false;
    return Object.assign({}, item, {
      stock: stock,
      available: onShelf && stock >= item.quantity,
      subtotal_cents: item.price_cents * item.quantity,
    });
  });
  const valid = items.filter((item) => item.available);
  const selected = valid.filter((item) => item.selected);
  return {
    user_id: state.user.id,
    items: items,
    total_count: items.reduce((sum, item) => sum + item.quantity, 0),
    selected_count: selected.reduce((sum, item) => sum + item.quantity, 0),
    selected_amount_cents: selected.reduce((sum, item) => sum + item.price_cents * item.quantity, 0),
    selected_discount_cents: 0,
    selected_payable_cents: selected.reduce((sum, item) => sum + item.price_cents * item.quantity, 0),
  };
}

/** 计算优惠券可用优惠金额 */
function couponDiscount(coupon, amountCents, freightCents) {
  if (!coupon) {
    return 0;
  }
  if (amountCents < coupon.min_amount_cents) {
    return 0;
  }
  if (coupon.type === 'COUPON_TYPE_FIXED') {
    return Math.min(coupon.face_value_cents, amountCents);
  }
  if (coupon.type === 'COUPON_TYPE_PERCENT') {
    const raw = Math.floor((amountCents * coupon.percent) / 100);
    return Math.min(raw, coupon.max_discount_cents || raw);
  }
  if (coupon.type === 'COUPON_TYPE_SHIPPING') {
    return Math.min(freightCents, coupon.max_discount_cents || freightCents);
  }
  return 0;
}

/** 订单可执行操作 */
function orderActions(status) {
  return {
    can_cancel: status === 'ORDER_STATUS_PENDING_PAYMENT',
    can_pay: status === 'ORDER_STATUS_PENDING_PAYMENT',
    can_confirm: status === 'ORDER_STATUS_SHIPPED',
    can_refund: status === 'ORDER_STATUS_PAID' || status === 'ORDER_STATUS_SHIPPED',
    can_review: status === 'ORDER_STATUS_COMPLETED',
  };
}

/** 订单统计 */
function orderCounts() {
  const count = {
    pending_payment: 0,
    pending_shipment: 0,
    pending_receipt: 0,
    refunding: 0,
  };
  state.orders.forEach((order) => {
    if (order.status === 'ORDER_STATUS_PENDING_PAYMENT') count.pending_payment += 1;
    if (order.status === 'ORDER_STATUS_PAID') count.pending_shipment += 1;
    if (order.status === 'ORDER_STATUS_SHIPPED') count.pending_receipt += 1;
    if (order.status === 'ORDER_STATUS_REFUNDING') count.refunding += 1;
  });
  return count;
}

// ---------------------------------------------------------------------------
// 各接口的 mock 处理
// ---------------------------------------------------------------------------

const handlers = {
  /** 商品列表 */
  products(params) {
    let list = state.products.slice();
    const keyword = (params && params.keyword || '').trim();
    if (keyword) {
      list = list.filter((p) => p.title.indexOf(keyword) >= 0 || p.subtitle.indexOf(keyword) >= 0 || p.tags.some((t) => t.indexOf(keyword) >= 0));
    }
    if (params && params.category_id) {
      const ids = categoryIds(params.category_id);
      list = list.filter((p) => ids.indexOf(p.category_id) >= 0);
    }
    if (params && params.only_in_stock) {
      list = list.filter((p) => p.stock_total > 0);
    }
    const sort = (params && params.sort) || 'default';
    if (sort === 'sales') {
      list.sort((a, b) => b.sales_count - a.sales_count);
    } else if (sort === 'price_asc') {
      list.sort((a, b) => a.min_price_cents - b.min_price_cents);
    } else if (sort === 'price_desc') {
      list.sort((a, b) => b.max_price_cents - a.max_price_cents);
    } else if (sort === 'newest') {
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    const result = paginate(list, params);
    return { products: result.list, meta: result.meta };
  },

  /** 商品详情 */
  productDetail(params) {
    const id = Number(params && params.id);
    const product = productMap[id];
    if (!product) {
      return null;
    }
    const productSkus = state.skus.filter((s) => s.product_id === id);
    const productReviews = state.reviews.filter((r) => r.product_id === id);
    const good = productReviews.filter((r) => r.rating >= 4).length;
    const medium = productReviews.filter((r) => r.rating === 3).length;
    const bad = productReviews.filter((r) => r.rating <= 2).length;
    const average = productReviews.length
      ? Math.round((productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length) * 10) / 10
      : 0;
    const related = state.products.filter((p) => p.id !== id && p.category_id === product.category_id).slice(0, 4);
    return {
      product: product,
      skus: productSkus,
      images: state.productImages[id] || [{ url: product.cover, alt: product.title, sort: 1 }],
      attributes: state.productAttributes[id] || [],
      reviews: productReviews,
      review_count: productReviews.length,
      review_rating: average,
      related: related,
      review_summary: { total: productReviews.length, good: good, medium: medium, bad: bad, average: average },
    };
  },

  /** 评价列表（filter 为 int32：0 全部 / 1 有图 / 2 好评 / 3 中差评） */
  reviews(params) {
    let list = state.reviews.slice();
    if (params && params.product_id) {
      list = list.filter((r) => r.product_id === Number(params.product_id));
    }
    if (params && params.user_id) {
      list = list.filter((r) => r.user_id === Number(params.user_id));
    }
    if (params && params.keyword) {
      const keyword = String(params.keyword);
      list = list.filter((r) => r.content.indexOf(keyword) >= 0 || r.product_title.indexOf(keyword) >= 0);
    }
    if (params && params.filter !== undefined && params.filter !== null && params.filter !== '') {
      const filter = Number(params.filter);
      if (filter === 1) {
        list = list.filter((r) => r.images && r.images.length);
      } else if (filter === 2) {
        list = list.filter((r) => r.rating >= 4);
      } else if (filter === 3) {
        list = list.filter((r) => r.rating <= 3);
      }
    }
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const result = paginate(list, params);
    const good = list.filter((r) => r.rating >= 4).length;
    const medium = list.filter((r) => r.rating === 3).length;
    const bad = list.filter((r) => r.rating <= 2).length;
    const average = list.length ? Math.round((list.reduce((sum, r) => sum + r.rating, 0) / list.length) * 10) / 10 : 0;
    return {
      reviews: result.list,
      meta: result.meta,
      summary: { total: list.length, good: good, medium: medium, bad: bad, average: average },
    };
  },

  /** 发表评价 */
  reviewCreate(params) {
    const productId = Number(params && params.product_id);
    const product = productMap[productId];
    const sku = skuMap[Number(params && params.sku_id)];
    if (!product) {
      return null;
    }
    const review = {
      id: nextId(),
      product_id: productId,
      product_title: product.title,
      user_id: state.user.id,
      user_nickname: state.user.nickname,
      user_avatar: state.user.avatar,
      rating: Number(params && params.rating) || 5,
      content: (params && params.content) || '',
      images: (params && params.images) || [],
      sku_id: Number(params && params.sku_id) || 0,
      sku_text: sku ? sku.spec_text : '',
      status: 'REVIEW_STATUS_APPROVED',
      admin_reply: '',
      like_count: 0,
      created_at: new Date().toISOString(),
    };
    state.reviews.unshift(review);
    return review;
  },

  /** 积分明细 */
  pointsLogs(params) {
    const result = paginate(state.pointsLogs, params);
    return {
      logs: result.list,
      meta: result.meta,
      current_points: state.user.points,
    };
  },

  /** 发票列表 */
  invoices(params) {
    let list = state.invoices.slice();
    if (params && params.status !== undefined && params.status !== null && params.status !== '') {
      list = list.filter((item) => item.status === Number(params.status));
    }
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const result = paginate(list, params);
    return { invoices: result.list, meta: result.meta };
  },

  /** 申请开票 */
  invoiceCreate(params) {
    const orderNo = (params && params.order_no) || '';
    const order = state.orders.filter((o) => o.order_no === orderNo)[0];
    const invoice = {
      id: nextId(),
      user_id: state.user.id,
      order_no: orderNo,
      title: (params && params.title) || '',
      tax_no: (params && params.tax_no) || '',
      type: (params && params.type) || 'personal',
      email: (params && params.email) || '',
      amount_cents: params && params.amount_cents ? Number(params.amount_cents) : order ? order.payable_cents : 0,
      status: 0,
      invoice_url: '',
      remark: (params && params.remark) || '',
      created_at: new Date().toISOString(),
    };
    state.invoices.unshift(invoice);
    return invoice;
  },

  /** 分类列表 */
  categories(params) {
    const tree = params && params.tree;
    const list = tree
      ? state.categories.filter((c) => !c.parent_id)
      : state.categories.filter((c) => {
        if (params && params.parent_id) {
          return c.parent_id === Number(params.parent_id);
        }
        return true;
      });
    return { categories: list };
  },

  /** 轮播图 */
  banners(params) {
    const position = params && params.position;
    const list = state.banners.filter((b) => b.visible && (!position || b.position === position));
    return { banners: list };
  },

  /** 促销活动 */
  promotions(params) {
    let list = state.promotions.filter((p) => (params && params.status ? p.status === Number(params.status) : true));
    if (params && params.type) {
      list = list.filter((p) => p.type === Number(params.type));
    }
    const result = paginate(list, params);
    return { promotions: result.list, meta: result.meta };
  },

  /** 购物车 */
  cart() {
    return buildCart();
  },

  cartAdd(params) {
    const productId = Number(params && params.product_id);
    const quantity = Math.max(1, Number(params && params.quantity) || 1);
    const product = productMap[productId];
    const sku = skuMap[Number(params && params.sku_id)] || state.skus.filter((s) => s.product_id === productId)[0];
    if (!product || !sku) {
      return buildCart();
    }
    const exist = state.cartItems.find((item) => item.sku_id === sku.id && item.product_id === productId);
    if (exist) {
      exist.quantity = Math.min(sku.stock, exist.quantity + quantity);
      exist.selected = params.selected === false ? false : true;
      exist.updated_at = new Date().toISOString();
    } else {
      state.cartItems.push({
        id: nextId(),
        user_id: state.user.id,
        product_id: productId,
        sku_id: sku.id,
        product_title: product.title,
        spec_text: sku.spec_text,
        image: product.cover,
        price_cents: sku.price_cents,
        quantity: Math.min(sku.stock, quantity),
        stock: sku.stock,
        selected: params.selected === false ? false : true,
        available: true,
        subtotal_cents: sku.price_cents * quantity,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    return buildCart();
  },

  cartUpdate(params) {
    const id = Number(params && params.id);
    const item = state.cartItems.find((i) => i.id === id);
    if (item) {
      if (params.quantity !== undefined && params.quantity !== null) {
        const sku = skuMap[item.sku_id];
        const max = sku ? sku.stock : item.quantity;
        item.quantity = Math.max(1, Math.min(Number(params.quantity), max));
      }
      if (params.selected !== undefined && params.selected !== null) {
        item.selected = !!params.selected;
      }
      item.updated_at = new Date().toISOString();
    }
    return buildCart();
  },

  cartRemove(params) {
    const id = Number(params && params.id);
    state.cartItems = state.cartItems.filter((item) => item.id !== id);
    return { success: true, message: '已移除' };
  },

  cartSelectAll(params) {
    const selected = !!(params && params.selected);
    state.cartItems.forEach((item) => {
      item.selected = selected;
    });
    return buildCart();
  },

  cartClear() {
    state.cartItems = [];
    return { success: true, message: '购物车已清空' };
  },

  cartCount() {
    return { count: state.cartItems.reduce((sum, item) => sum + item.quantity, 0) };
  },

  /** 订单列表 */
  orders(params) {
    let list = state.orders.slice();
    const status = params && params.status !== undefined && params.status !== null && params.status !== '' ? Number(params.status) : 0;
    if (status) {
      list = list.filter((order) => enums.orderStatusValue(order.status) === status);
    }
    if (params && params.keyword) {
      list = list.filter((order) => order.order_no.indexOf(params.keyword) >= 0);
    }
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const result = paginate(list, params);
    const counts = orderCounts();
    return {
      orders: result.list,
      meta: result.meta,
      pending_payment_count: counts.pending_payment,
      pending_shipment_count: counts.pending_shipment,
      pending_receipt_count: counts.pending_receipt,
      refunding_count: counts.refunding,
    };
  },

  /** 订单详情 */
  orderDetail(params) {
    const id = Number(params && params.id);
    const order = state.orders.find((o) => o.id === id);
    if (!order) {
      return null;
    }
    const actions = orderActions(order.status);
    const tracks = shipmentTracks[order.shipment_id] || [];
    const userCoupon = order.coupon_id ? state.userCoupons.find((c) => c.coupon_id === order.coupon_id) : null;
    return {
      order: order,
      items: order.items,
      logs: state.orderLogs[order.id] || [],
      coupon_id: order.coupon_id || 0,
      coupon_name: userCoupon && userCoupon.coupon ? userCoupon.coupon.name : '',
      payment_id: 0,
      shipment_id: order.shipment_id || 0,
      tracking_no: order.shipment_id ? 'SF1234567890' : '',
      logistics_company: order.shipment_id ? '顺丰速运' : '',
      logistics_tracks: tracks.map((t) => t.description),
      can_cancel: actions.can_cancel,
      can_pay: actions.can_pay,
      can_confirm: actions.can_confirm,
      can_refund: actions.can_refund,
      can_review: actions.can_review,
    };
  },

  /** 创建订单 */
  orderCreate(params) {
    const items = (params && params.items) || [];
    const fromCart = !!(params && params.from_cart);
    const cartIds = (params && params.cart_item_ids) || [];
    const addressId = Number(params && params.address_id);
    const address = state.addresses.find((a) => a.id === addressId) || state.addresses[0];
    const orderId = nextId();
    const orderItems = [];
    let total = 0;

    if (fromCart) {
      const chosen = state.cartItems.filter((item) => cartIds.indexOf(item.id) >= 0);
      chosen.forEach((item) => {
        const product = productMap[item.product_id];
        const sku = skuMap[item.sku_id];
        const price = sku ? sku.price_cents : item.price_cents;
        total += price * item.quantity;
        orderItems.push(buildOrderItem(nextId(), orderId, item.product_id, item.sku_id, item.quantity, price, false));
      });
      state.cartItems = state.cartItems.filter((item) => cartIds.indexOf(item.id) < 0);
    } else {
      items.forEach((entry) => {
        const product = productMap[Number(entry.product_id)];
        const sku = skuMap[Number(entry.sku_id)];
        const quantity = Math.max(1, Number(entry.quantity) || 1);
        const price = sku ? sku.price_cents : (product ? product.min_price_cents : 0);
        total += price * quantity;
        orderItems.push(buildOrderItem(nextId(), orderId, Number(entry.product_id), Number(entry.sku_id), quantity, price, false));
      });
    }

    const freight = total >= 9900 ? 0 : 800;
    const userCoupon = params && params.coupon_id
      ? state.userCoupons.find((c) => c.coupon_id === Number(params.coupon_id))
      : null;
    const discount = userCoupon && userCoupon.coupon ? couponDiscount(userCoupon.coupon, total, freight) : 0;
    const payable = Math.max(0, total - discount + freight);

    const order = {
      id: orderId,
      order_no: format.genOrderNo(),
      user_id: state.user.id,
      user_nickname: state.user.nickname,
      status: 'ORDER_STATUS_PENDING_PAYMENT',
      total_amount_cents: total,
      discount_cents: discount,
      freight_cents: freight,
      payable_cents: payable,
      paid_cents: 0,
      refunded_cents: 0,
      item_count: orderItems.length,
      total_quantity: orderItems.reduce((sum, item) => sum + item.quantity, 0),
      address: address,
      remark: (params && params.remark) || '',
      payment_method: (params && params.payment_method) || 'wechat',
      paid_at: null,
      shipped_at: null,
      completed_at: null,
      cancelled_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      admin_remark: '',
      shipment_id: 0,
      coupon_id: userCoupon ? userCoupon.coupon_id : 0,
      items: orderItems,
    };
    state.orders.unshift(order);
    pushLog(orderId, { id: nextId(), order_id: orderId, from_status: 0, to_status: 1, action: 'created', operator: '用户', remark: '订单提交', created_at: order.created_at });

    if (userCoupon) {
      userCoupon.status = 'USER_COUPON_STATUS_USED';
      userCoupon.order_id = orderId;
      userCoupon.used_at = new Date().toISOString();
    }
    return order;
  },

  /** 取消订单 */
  orderCancel(params) {
    const id = Number(params && params.order_id);
    const order = state.orders.find((o) => o.id === id);
    if (order) {
      order.status = 'ORDER_STATUS_CANCELLED';
      order.cancelled_at = new Date().toISOString();
      order.updated_at = order.cancelled_at;
      pushLog(id, { id: nextId(), order_id: id, from_status: 1, to_status: 5, action: 'cancelled', operator: '用户', remark: (params && params.reason) || '用户取消', created_at: order.cancelled_at });
    }
    return order;
  },

  /** 确认收货 */
  orderConfirm(params) {
    const id = Number(params && params.order_id);
    const order = state.orders.find((o) => o.id === id);
    if (order) {
      order.status = 'ORDER_STATUS_COMPLETED';
      order.completed_at = new Date().toISOString();
      order.updated_at = order.completed_at;
      pushLog(id, { id: nextId(), order_id: id, from_status: 3, to_status: 4, action: 'completed', operator: '用户', remark: '确认收货', created_at: order.completed_at });
    }
    return order;
  },

  /** 申请退款（同时登记一条售后单，便于售后列表联动展示） */
  orderRefund(params) {
    const id = Number(params && params.order_id);
    const order = state.orders.find((o) => o.id === id);
    const now = new Date().toISOString();
    const amount = params && params.amount_cents ? Number(params.amount_cents) : (order ? order.payable_cents : 0);
    const reason = (params && params.reason) || '';
    const description = (params && params.description) || '';
    const itemIds = (params && params.item_ids) || [];
    if (order) {
      order.status = 'ORDER_STATUS_REFUNDING';
      order.updated_at = now;
      pushLog(id, { id: nextId(), order_id: id, from_status: 2, to_status: 6, action: 'refunding', operator: '用户', remark: reason || '申请退款', created_at: now });
    }
    state.afterSales.unshift({
      id: nextId(),
      after_sale_no: 'AS' + format.genOrderNo().slice(2),
      order_id: id,
      order_no: order ? order.order_no : '',
      user_id: state.user.id,
      user_nickname: state.user.nickname,
      type: 1,
      amount_cents: amount,
      reason: reason,
      description: description,
      item_ids: itemIds,
      status: 0,
      admin_remark: '',
      refund_id: 0,
      created_at: now,
      processed_at: null,
    });
    return {
      id: nextId(),
      refund_no: 'RF' + format.genOrderNo().slice(2),
      order_id: id,
      order_no: order ? order.order_no : '',
      user_id: state.user.id,
      amount_cents: amount,
      reason: reason,
      description: description,
      item_ids: itemIds,
      status: 0,
      admin_remark: '',
      created_at: now,
      processed_at: null,
    };
  },

  /** 订单数量统计 */
  orderCount() {
    const counts = orderCounts();
    return {
      pending_payment: counts.pending_payment,
      pending_shipment: counts.pending_shipment,
      pending_receipt: counts.pending_receipt,
      refunding: counts.refunding,
    };
  },

  /** 创建支付单 */
  paymentCreate(params) {
    const orderId = Number(params && params.order_id);
    const order = state.orders.find((o) => o.id === orderId);
    const channel = Number(params && params.channel) || 1;
    const channelKey = channel === 3 ? 'PAYMENT_CHANNEL_BALANCE' : channel === 2 ? 'PAYMENT_CHANNEL_ALIPAY' : 'PAYMENT_CHANNEL_WECHAT';
    const payment = {
      id: nextId(),
      payment_no: 'PAY' + format.genOrderNo().slice(2),
      order_id: orderId,
      order_no: order ? order.order_no : '',
      user_id: state.user.id,
      amount_cents: order ? order.payable_cents : 0,
      refunded_cents: 0,
      status: 'PAYMENT_STATUS_PENDING',
      channel: channelKey,
      transaction_id: '',
      prepay_id: 'prepay' + nextId(),
      pay_params: {
        timeStamp: String(Math.floor(Date.now() / 1000)),
        nonceStr: 'nonce' + nextId(),
        package: 'prepay_id=prepay' + nextId(),
        signType: 'RSA',
        paySign: 'demo-signature',
      },
      fail_reason: '',
      paid_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    state.payments.push(payment);
    return payment;
  },

  /** 查询支付单 */
  paymentQuery(params) {
    const orderId = Number(params && params.order_id);
    const payment = state.payments.filter((p) => p.order_id === orderId).pop();
    return payment || null;
  },

  /** 支付结果回调（演示态用于把订单推进到已支付） */
  paymentNotify(params) {
    const orderId = Number(params && params.order_id);
    const order = state.orders.find((o) => o.id === orderId);
    const payment = state.payments.filter((p) => p.order_id === orderId).pop();
    if (payment) {
      payment.status = 'PAYMENT_STATUS_SUCCESS';
      payment.transaction_id = (params && params.transaction_id) || 'MOCK' + nextId();
      payment.paid_at = new Date().toISOString();
      payment.updated_at = payment.paid_at;
    }
    if (order) {
      order.status = 'ORDER_STATUS_PAID';
      order.paid_cents = order.payable_cents;
      order.paid_at = new Date().toISOString();
      order.updated_at = order.paid_at;
      pushLog(orderId, { id: nextId(), order_id: orderId, from_status: 1, to_status: 2, action: 'paid', operator: '用户', remark: '支付成功', created_at: order.paid_at });
    }
    return { success: true, message: '支付成功' };
  },

  /** 用户资料 */
  profile() {
    return state.user;
  },

  profileUpdate(params) {
    if (params && params.nickname) {
      state.user.nickname = params.nickname;
    }
    if (params && params.avatar) {
      state.user.avatar = params.avatar;
    }
    if (params && params.email) {
      state.user.email = params.email;
    }
    if (params && params.gender) {
      state.user.gender = params.gender;
    }
    return state.user;
  },

  /** 收货地址列表 */
  addresses() {
    return { addresses: state.addresses };
  },

  addressSave(params) {
    const data = {
      id: Number(params && params.id) || nextId(),
      user_id: state.user.id,
      receiver: (params && params.receiver) || '',
      phone: (params && params.phone) || '',
      province: (params && params.province) || '',
      city: (params && params.city) || '',
      district: (params && params.district) || '',
      detail: (params && params.detail) || '',
      postal_code: (params && params.postal_code) || '',
      tag: (params && params.tag) || '家',
      is_default: !!(params && params.is_default),
    };
    if (data.is_default) {
      state.addresses.forEach((item) => {
        item.is_default = false;
      });
    }
    const exist = state.addresses.find((item) => item.id === data.id);
    if (exist) {
      Object.assign(exist, data);
    } else {
      state.addresses.push(data);
    }
    if (!state.addresses.some((item) => item.is_default)) {
      state.addresses[0].is_default = true;
    }
    return data;
  },

  addressDelete(params) {
    const id = Number(params && params.id);
    state.addresses = state.addresses.filter((item) => item.id !== id);
    if (state.addresses.length && !state.addresses.some((item) => item.is_default)) {
      state.addresses[0].is_default = true;
    }
    return { success: true, message: '已删除' };
  },

  addressDefault(params) {
    const id = Number(params && params.id);
    state.addresses.forEach((item) => {
      item.is_default = item.id === id;
    });
    return { success: true, message: '已设为默认' };
  },

  /** 收藏列表 */
  favorites(params) {
    const result = paginate(state.favorites, params);
    return { products: result.list, meta: result.meta };
  },

  favoriteToggle(params) {
    const productId = Number(params && params.product_id);
    const index = state.favorites.findIndex((f) => f.product_id === productId);
    let favorited = true;
    if (index >= 0) {
      state.favorites.splice(index, 1);
      favorited = false;
    } else {
      const product = productMap[productId];
      if (product) {
        state.favorites.unshift({
          id: nextId(),
          product_id: productId,
          title: product.title,
          cover: product.cover,
          price_cents: product.min_price_cents,
          created_at: new Date().toISOString(),
        });
      }
    }
    return { favorited: favorited };
  },

  /** 我的优惠券 */
  userCoupons(params) {
    const status = params && params.status !== undefined && params.status !== null && params.status !== '' ? Number(params.status) : 0;
    let list = state.userCoupons.slice();
    if (status) {
      const statusMap = { 1: 'USER_COUPON_STATUS_UNUSED', 2: 'USER_COUPON_STATUS_USED', 3: 'USER_COUPON_STATUS_EXPIRED' };
      list = list.filter((c) => c.status === statusMap[status]);
    }
    const result = paginate(list, params);
    const available = state.userCoupons.filter((c) => c.status === 'USER_COUPON_STATUS_UNUSED').length;
    return { coupons: result.list, meta: result.meta, available_count: available };
  },

  /** 可领取的平台优惠券 */
  coupons(params) {
    const list = state.coupons.filter((c) => c.enabled);
    const result = paginate(list, params);
    return { coupons: result.list, meta: result.meta };
  },

  couponReceive(params) {
    const couponId = Number(params && params.coupon_id);
    const coupon = state.coupons.find((c) => c.id === couponId);
    if (!coupon) {
      return null;
    }
    const userCoupon = {
      id: nextId(),
      user_id: state.user.id,
      coupon_id: coupon.id,
      coupon: coupon,
      status: 'USER_COUPON_STATUS_UNUSED',
      order_id: 0,
      received_at: new Date().toISOString(),
      used_at: null,
    };
    state.userCoupons.unshift(userCoupon);
    coupon.received_quantity += 1;
    return userCoupon;
  },

  /** 结算预览 */
  checkoutPreview(params) {
    const items = (params && params.items) || [];
    const total = items.reduce((sum, item) => sum + (Number(item.price_cents) || 0) * (Number(item.quantity) || 1), 0);
    const freight = total >= 9900 ? 0 : 800;
    const availableCoupons = state.userCoupons.filter((c) => {
      if (c.status !== 'USER_COUPON_STATUS_UNUSED') {
        return false;
      }
      return c.coupon.min_amount_cents <= total;
    });
    const userCoupon = params && params.coupon_id
      ? state.userCoupons.find((c) => c.coupon_id === Number(params.coupon_id))
      : null;
    const couponAmount = userCoupon && userCoupon.coupon ? couponDiscount(userCoupon.coupon, total, freight) : 0;
    const pointsUsed = Number(params && params.points_used) || 0;
    const pointsDiscount = Math.min(pointsUsed, Math.floor(total / 100), state.user.points);
    const activePromotions = state.promotions.filter((p) => p.status === 1);
    return {
      total_amount_cents: total,
      discount_cents: couponAmount + pointsDiscount,
      coupon_discount_cents: couponAmount,
      points_discount_cents: pointsDiscount,
      freight_cents: freight,
      payable_cents: Math.max(0, total - couponAmount - pointsDiscount + freight),
      available_coupons: availableCoupons,
      active_promotions: activePromotions,
    };
  },

  /** 物流信息 */
  shipment(params) {
    const orderId = Number(params && params.order_id);
    const order = state.orders.find((o) => o.id === orderId);
    if (!order || !order.shipment_id) {
      return { tracks: [], shipment: null };
    }
    return {
      tracks: shipmentTracks[order.shipment_id] || [],
      shipment: {
        id: order.shipment_id,
        order_id: order.id,
        order_no: order.order_no,
        tracking_no: 'SF1234567890',
        company: '顺丰速运',
        company_code: 'SF',
        status: order.status === 'ORDER_STATUS_COMPLETED' ? 'SHIPMENT_STATUS_DELIVERED' : 'SHIPMENT_STATUS_SHIPPED',
        receiver: order.address ? order.address.receiver : '',
        phone: order.address ? order.address.phone : '',
        address: order.address ? order.address.province + order.address.city + order.address.district + order.address.detail : '',
        freight_cents: order.freight_cents,
        item_count: order.item_count,
        shipped_at: order.shipped_at,
        delivered_at: order.completed_at,
        created_at: order.shipped_at,
        remark: '',
      },
    };
  },

  /** 消息通知 */
  notifications(params) {
    let list = state.notifications.slice();
    const type = params && params.type !== undefined && params.type !== null && params.type !== '' ? Number(params.type) : 0;
    if (type) {
      const typeMap = { 1: 'NOTIFICATION_TYPE_ORDER', 2: 'NOTIFICATION_TYPE_LOGISTICS', 3: 'NOTIFICATION_TYPE_PROMOTION', 4: 'NOTIFICATION_TYPE_SYSTEM' };
      list = list.filter((n) => n.type === typeMap[type]);
    }
    if (params && params.unread_only) {
      list = list.filter((n) => !n.read);
    }
    const result = paginate(list, params);
    const unread = state.notifications.filter((n) => !n.read).length;
    return { notifications: result.list, meta: result.meta, unread_count: unread };
  },

  notificationRead(params) {
    const id = Number(params && params.id);
    const item = state.notifications.find((n) => n.id === id);
    if (item) {
      item.read = true;
      item.read_at = new Date().toISOString();
    }
    return { success: true, message: '已读' };
  },

  notificationReadAll() {
    state.notifications.forEach((n) => {
      n.read = true;
      n.read_at = new Date().toISOString();
    });
    return { success: true, message: '全部已读' };
  },

  notificationCount() {
    return { count: state.notifications.filter((n) => !n.read).length };
  },

  /** 账号密码登录 */
  authLogin(params) {
    return {
      access_token: 'mock-access-' + nextId(),
      refresh_token: 'mock-refresh-' + nextId(),
      expires_in: 7200,
      token_type: 'Bearer',
      user: state.user,
      admin: null,
      permissions: [],
    };
  },

  /** 注册 */
  authRegister(params) {
    if (params && params.nickname) {
      state.user.nickname = params.nickname;
    }
    return {
      access_token: 'mock-access-' + nextId(),
      refresh_token: 'mock-refresh-' + nextId(),
      expires_in: 7200,
      token_type: 'Bearer',
      user: state.user,
      admin: null,
      permissions: [],
    };
  },

  /** 微信登录 */
  authWechat(params) {
    return {
      access_token: 'mock-access-' + nextId(),
      refresh_token: 'mock-refresh-' + nextId(),
      expires_in: 7200,
      token_type: 'Bearer',
      user: state.user,
      admin: null,
      permissions: [],
    };
  },

  // -------------------------------------------------------------------------
  // 频道 / 商品浏览
  // -------------------------------------------------------------------------
  /** 频道列表 */
  channels() {
    return {
      channels: channels,
      meta: { page: 1, page_size: channels.length, total: channels.length, total_pages: 1 },
    };
  },

  /** 频道商品列表 */
  channelProducts(params) {
    const channelId = Number(params && params.channel_id);
    const channel = channels.filter((c) => c.id === channelId)[0] || channels[0];
    const config = channelProductConfig[channel.code] || channelProductConfig.recommend;
    let list = config.ids
      .map((pid) => productMap[pid])
      .filter(Boolean)
      .map((p) => {
        const clone = Object.assign({}, p, {
          min_price_cents: Math.round(p.min_price_cents * config.factor),
          max_price_cents: config.factor < 1 ? p.max_price_cents : Math.round(p.max_price_cents * config.factor),
        });
        clone.tags = (p.tags || []).concat([config.tag]);
        return clone;
      });
    const sort = (params && params.sort) || 'default';
    if (sort === 'sales') {
      list.sort((a, b) => b.sales_count - a.sales_count);
    } else if (sort === 'price_asc') {
      list.sort((a, b) => a.min_price_cents - b.min_price_cents);
    } else if (sort === 'price_desc') {
      list.sort((a, b) => b.min_price_cents - a.min_price_cents);
    } else if (sort === 'newest') {
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    const result = paginate(list, params);
    return { channel: channel, products: result.list, meta: result.meta };
  },

  /** 商品参数 */
  productParams(params) {
    const id = Number(params && params.id);
    if (!productMap[id]) {
      return null;
    }
    const attrs = state.productAttributes[id] || [];
    return {
      params: attrs.map((a) => ({
        id: a.id,
        product_id: id,
        name: a.name,
        value: a.value,
        sort: a.sort,
      })),
    };
  },

  /** 商品问答 */
  productQuestions(params) {
    const id = Number(params && params.id);
    const product = productMap[id];
    if (!product) {
      return null;
    }
    let list = productQuestions.filter((q) => q.product_id === id);
    if (!list.length) {
      list = [
        {
          id: nextId(), product_id: id, product_title: product.title, user_id: 2, user_nickname: '体验用户',
          content: '这款' + product.title + '多久可以发货？', images: [],
          reply: '现货商品在支付后 48 小时内发出，预售商品以详情页公告的排单时间为准。',
          reply_at: daysAgo(2), created_at: daysAgo(3),
        },
        {
          id: nextId(), product_id: id, product_title: product.title, user_id: 3, user_nickname: '老顾客',
          content: '有质保和退换保障吗？', images: [],
          reply: '支持国家三包与平台 7 天无理由退换，具体质保期限以商品详情页说明为准。',
          reply_at: daysAgo(4), created_at: daysAgo(5),
        },
      ];
    }
    const result = paginate(list, params);
    return { questions: result.list, meta: result.meta };
  },

  /** 评价标签 */
  reviewTags() {
    const tags = reviewTagDict.filter((t) => t.enabled);
    return {
      tags: tags,
      meta: { page: 1, page_size: tags.length, total: tags.length, total_pages: 1 },
    };
  },

  // -------------------------------------------------------------------------
  // 营销：签到 / 任务
  // -------------------------------------------------------------------------
  /** 签到状态 */
  signIn() {
    const today = dateKey(0);
    const signed = state.signIn.calendar.some((d) => d.date === today);
    const calendar = state.signIn.calendar.slice().sort((a, b) => (a.date < b.date ? 1 : -1));
    return {
      signed_today: signed,
      continuous_days: state.signIn.continuous_days,
      total_days: state.signIn.total_days,
      points_awarded: signed ? 5 : 0,
      next_points: 5,
      calendar: calendar,
    };
  },

  /** 每日签到 */
  signInDo() {
    const today = dateKey(0);
    if (!state.signIn.calendar.some((d) => d.date === today)) {
      state.signIn.calendar.push({ date: today, signed: true, points: 5 });
      state.signIn.continuous_days += 1;
      state.signIn.total_days += 1;
      state.user.points += 5;
      state.pointsLogs.unshift({
        id: nextId(),
        user_id: state.user.id,
        title: '每日签到奖励',
        change: 5,
        balance: state.user.points,
        biz_type: 'sign_in',
        biz_id: '0',
        created_at: new Date().toISOString(),
      });
    }
    return handlers.signIn();
  },

  /** 任务列表 */
  tasks(params) {
    const result = paginate(state.tasks, params);
    return { tasks: result.list, meta: result.meta };
  },

  /** 任务详情 */
  taskDetail(params) {
    const id = Number(params && params.task_id);
    return state.tasks.filter((t) => t.task_id === id)[0] || null;
  },

  /** 领取任务奖励 */
  taskClaim(params) {
    const id = Number(params && params.task_id);
    const task = state.tasks.filter((t) => t.task_id === id)[0];
    if (!task) {
      return null;
    }
    if (!task.claimed) {
      task.claimed = true;
      task.completed = true;
      task.progress = task.target_count;
      state.user.points += task.reward_points;
      state.pointsLogs.unshift({
        id: nextId(),
        user_id: state.user.id,
        title: '任务奖励 · ' + task.name,
        change: task.reward_points,
        balance: state.user.points,
        biz_type: 'task',
        biz_id: String(task.task_id),
        created_at: new Date().toISOString(),
      });
    }
    return task;
  },

  // -------------------------------------------------------------------------
  // 营销：拼团 / 场次
  // -------------------------------------------------------------------------
  /** 拼团列表 */
  groupBuys(params) {
    let list = state.groupBuys.slice();
    const status = params && params.status;
    if (status !== undefined && status !== null && status !== '') {
      list = list.filter((g) => g.status === Number(status));
    }
    if (params && params.mine) {
      list = list.filter((g) => (state.groupBuyMembers[g.id] || []).some((m) => m.user_id === state.user.id));
    }
    const result = paginate(list, params);
    return { group_buys: result.list, meta: result.meta };
  },

  /** 拼团详情 */
  groupBuyDetail(params) {
    const id = Number(params && params.id);
    const groupBuy = state.groupBuys.filter((g) => g.id === id)[0];
    if (!groupBuy) {
      return null;
    }
    return { group_buy: groupBuy, members: state.groupBuyMembers[id] || [] };
  },

  /** 参团下单 */
  groupBuyJoin(params) {
    const id = Number(params && params.id);
    const groupBuy = state.groupBuys.filter((g) => g.id === id)[0];
    if (!groupBuy) {
      return null;
    }
    const members = state.groupBuyMembers[id] || [];
    if (!members.some((m) => m.user_id === state.user.id) && groupBuy.status === 1) {
      members.push({
        id: nextId(),
        group_buy_id: id,
        user_id: state.user.id,
        user_nickname: state.user.nickname,
        joined_at: new Date().toISOString(),
      });
      state.groupBuyMembers[id] = members;
      groupBuy.joined_members = members.length;
      if (groupBuy.joined_members >= groupBuy.required_members) {
        groupBuy.status = 2;
      }
    }
    return groupBuy;
  },

  /** 活动场次 */
  promotionSessions(params) {
    const id = Number(params && params.id);
    const list = state.promotionSessions.filter((s) => s.promotion_id === id);
    const result = paginate(list, params);
    return { sessions: result.list, meta: result.meta };
  },

  // -------------------------------------------------------------------------
  // 售后
  // -------------------------------------------------------------------------
  /** 售后列表 */
  afterSales(params) {
    let list = state.afterSales.slice();
    const status = params && params.status;
    if (status !== undefined && status !== null && status !== '') {
      list = list.filter((a) => a.status === Number(status));
    }
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const result = paginate(list, params);
    return { after_sales: result.list, meta: result.meta };
  },

  /** 售后详情 */
  afterSaleDetail(params) {
    const id = Number(params && params.id);
    return state.afterSales.filter((a) => a.id === id)[0] || null;
  },

  /** 退款原因字典 */
  refundReasons() {
    return { reasons: refundReasons };
  },

  // -------------------------------------------------------------------------
  // 物流
  // -------------------------------------------------------------------------
  /** 按运单号查询物流 */
  trackingQuery(params) {
    const trackingNo = String((params && params.tracking_no) || '');
    const tracks = [];
    Object.keys(shipmentTracks).forEach((key) => {
      shipmentTracks[key].forEach((t) => {
        if (t.tracking_no === trackingNo) {
          tracks.push(t);
        }
      });
    });
    tracks.sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
    return {
      tracking_no: trackingNo,
      company: '顺丰速运',
      status: tracks.length ? 'SHIPMENT_STATUS_SHIPPED' : 'SHIPMENT_STATUS_PENDING',
      tracks: tracks,
    };
  },

  // -------------------------------------------------------------------------
  // 用户中心与账户
  // -------------------------------------------------------------------------
  /** 会员等级 */
  userLevel() {
    const growth = state.user.growth_value;
    let current = memberLevels[0];
    memberLevels.forEach((l) => {
      if (growth >= l.min_growth) {
        current = l;
      }
    });
    const next = memberLevels.filter((l) => l.min_growth > current.min_growth)[0] || null;
    return {
      level: current.level,
      level_name: current.name,
      growth: growth,
      current_min_growth: current.min_growth,
      next_min_growth: next ? next.min_growth : current.max_growth,
      growth_to_next: next ? Math.max(0, next.min_growth - growth) : 0,
      discount_percent: current.discount_percent,
      next_level_name: next ? next.name : '',
      levels: memberLevels,
    };
  },

  /** 会员等级体系 */
  marketingLevels() {
    return { levels: memberLevels };
  },

  /** 成长值明细 */
  growthLogs(params) {
    const result = paginate(state.growthLogs, params);
    return {
      logs: result.list,
      meta: result.meta,
      current_growth: state.user.growth_value,
    };
  },

  /** 发票抬头模板 */
  invoiceTemplates() {
    return { templates: state.invoiceTemplates };
  },

  /** 新增 / 更新发票抬头模板 */
  invoiceTemplateSave(params) {
    const data = {
      id: Number(params && params.id) || nextId(),
      user_id: state.user.id,
      title: (params && params.title) || '',
      tax_no: (params && params.tax_no) || '',
      type: (params && params.type) || 'personal',
      email: (params && params.email) || '',
      phone: (params && params.phone) || state.user.phone,
      address: (params && params.address) || '',
      bank_name: (params && params.bank_name) || '',
      bank_account: (params && params.bank_account) || '',
      is_default: !!(params && params.is_default),
      created_at: new Date().toISOString(),
    };
    if (data.is_default) {
      state.invoiceTemplates.forEach((t) => {
        t.is_default = false;
      });
    }
    const exist = state.invoiceTemplates.filter((t) => t.id === data.id)[0];
    if (exist) {
      Object.assign(exist, data);
      return exist;
    }
    state.invoiceTemplates.push(data);
    return data;
  },

  /** 删除发票抬头模板 */
  invoiceTemplateDelete(params) {
    const id = Number(params && params.id);
    state.invoiceTemplates = state.invoiceTemplates.filter((t) => t.id !== id);
    return { success: true, message: '已删除' };
  },

  /** 通知设置 */
  notificationSettings() {
    return state.notificationSettings;
  },

  /** 更新通知设置 */
  notificationSettingsUpdate(params) {
    const keys = ['order_notice', 'logistics_notice', 'marketing_notice', 'system_notice', 'sms_notice', 'email_notice', 'wechat_notice'];
    keys.forEach((key) => {
      if (params && params[key] !== undefined && params[key] !== null) {
        state.notificationSettings[key] = !!params[key];
      }
    });
    return state.notificationSettings;
  },

  /** 账号安全 */
  accountSecurity() {
    return {
      phone_bound: !!state.user.phone,
      email_bound: !!state.user.email,
      wechat_bound: !!state.user.wechat_openid,
      realname_verified: !!state.user.realname_verified,
      risk_level: 0,
      password_changed_at: daysAgo(30),
      warnings: securityWarnings,
    };
  },

  /** 实名认证 */
  realnameSubmit(params) {
    state.user.realname_verified = true;
    state.user.realname = {
      real_name: (params && params.real_name) || '',
      id_card: maskIdCard((params && params.id_card) || ''),
      verified_at: new Date().toISOString(),
    };
    return state.user;
  },

  /** 意见反馈 */
  feedbackSubmit(params) {
    state.feedbacks.unshift({
      id: nextId(),
      user_id: state.user.id,
      user_nickname: state.user.nickname,
      type: Number(params && params.type) || 1,
      content: (params && params.content) || '',
      images: (params && params.images) || [],
      contact: (params && params.contact) || '',
      status: 0,
      reply: '',
      created_at: new Date().toISOString(),
      processed_at: null,
    });
    return { success: true, message: '反馈已提交' };
  },

  /** 帮助文章列表 */
  helpArticles(params) {
    let list = state.helpArticles.filter((a) => a.enabled);
    const categoryId = params && params.category_id;
    if (categoryId) {
      list = list.filter((a) => a.category_id === Number(categoryId));
    }
    const keyword = String((params && params.keyword) || '').trim();
    if (keyword) {
      list = list.filter((a) => a.title.indexOf(keyword) >= 0 || a.content.indexOf(keyword) >= 0);
    }
    const result = paginate(list, params);
    return { articles: result.list, meta: result.meta };
  },

  /** 帮助文章详情 */
  helpArticle(params) {
    const id = Number(params && params.id);
    return state.helpArticles.filter((a) => a.id === id)[0] || null;
  },

  /** 收货地区字典 */
  regions() {
    return { regions: state.regions };
  },
};

/**
 * 获取 mock 数据。
 * @param {string} key 接口标识
 * @param {object} params 请求参数
 * @returns {*} data 字段内容；key 不存在时返回 null
 */
function getMock(key, params) {
  const handler = handlers[key];
  if (!handler) {
    return null;
  }
  return handler(params || {});
}

module.exports = {
  getMock: getMock,
  state: state,
  handlers: handlers,
};
