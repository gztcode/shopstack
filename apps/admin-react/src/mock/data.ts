/**
 * 内置演示数据 —— 字段结构与 proto 契约完全一致
 * 后端未就绪时由 src/mock/index.ts 提供兜底数据源
 */
import type {
  Admin,
  AdminCategoryStat,
  AdminTopProduct,
  AdminTrendPoint,
  AuditLog,
  Banner,
  Category,
  Coupon,
  Inventory,
  InventoryLog,
  Invoice,
  LogisticTemplate,
  Material,
  Notification,
  Order,
  OrderCategoryStat,
  OrderItem,
  OrderStatusLog,
  OrderTopProduct,
  OrderTrendPoint,
  Payment,
  PaymentTrendPoint,
  Permission,
  Product,
  ProductSku,
  Promotion,
  Refund,
  Review,
  Role,
  Shipment,
  ShipmentTrack,
  SmsRecord,
  SystemSetting,
  User,
} from '@/types'

const NOW = Date.now()

/** 生成相对当前时间的 ISO 字符串 */
export function isoAt(daysAgo: number, hour = 10, minute = 30): string {
  const d = new Date(NOW - daysAgo * 86400000)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

/** 生成相对当前时间的秒级时间戳 */
export function unixAt(daysAgo: number, hour = 10, minute = 30): number {
  const d = new Date(NOW - daysAgo * 86400000)
  d.setHours(hour, minute, 0, 0)
  return Math.floor(d.getTime() / 1000)
}

// ---------------------------------------------------------------------------
// 分类
// ---------------------------------------------------------------------------
export const mockCategories: Category[] = [
  { id: 1, name: '数码家电', parent_id: 0, icon: '📱', description: '手机、电脑与智能硬件', sort: 10, visible: true, product_count: 6, children: [] },
  { id: 2, name: '家居生活', parent_id: 0, icon: '🏠', description: '家具、厨具与日用百货', sort: 20, visible: true, product_count: 3, children: [] },
  { id: 3, name: '服饰鞋包', parent_id: 0, icon: '👕', description: '男女装、鞋靴与箱包', sort: 30, visible: true, product_count: 1, children: [] },
  { id: 4, name: '食品生鲜', parent_id: 0, icon: '🍎', description: '零食、粮油与生鲜果蔬', sort: 40, visible: true, product_count: 1, children: [] },
  { id: 5, name: '图书文娱', parent_id: 0, icon: '📚', description: '图书、音像与文创用品', sort: 50, visible: true, product_count: 1, children: [] },
  { id: 6, name: '手机通讯', parent_id: 1, icon: '📱', description: '智能手机与配件', sort: 11, visible: true, product_count: 3, children: [] },
  { id: 7, name: '电脑办公', parent_id: 1, icon: '💻', description: '笔记本、台式机与外设', sort: 12, visible: true, product_count: 2, children: [] },
  { id: 8, name: '智能穿戴', parent_id: 1, icon: '⌚', description: '手表手环与智能眼镜', sort: 13, visible: true, product_count: 1, children: [] },
  { id: 9, name: '厨房用品', parent_id: 2, icon: '🍳', description: '锅具、刀具与餐具', sort: 21, visible: true, product_count: 1, children: [] },
  { id: 10, name: '家纺布艺', parent_id: 2, icon: '🛏️', description: '床品、窗帘与抱枕', sort: 22, visible: true, product_count: 2, children: [] },
]

// ---------------------------------------------------------------------------
// 商品
// ---------------------------------------------------------------------------
interface ProductSeed {
  id: number
  title: string
  subtitle: string
  category_id: number
  min: number
  max: number
  sales: number
  stock: number
  status: Product['status']
  description: string
  tags: string[]
  cover: string
}

const productSeeds: ProductSeed[] = [
  { id: 1, title: '旗舰智能手机 Pro 256GB', subtitle: '骁龙旗舰芯片 · 潜望长焦 · 全天候续航', category_id: 6, min: 429900, max: 529900, sales: 1863, stock: 596, status: 'PRODUCT_STATUS_ON_SHELF', description: '年度旗舰影像升级，2K 护眼直屏，5000mAh 大电池，100W 有线快充。', tags: ['旗舰', '5G', '拍照'], cover: 'https://placehold.co/600x600/2A4AD9/FFFFFF?text=Pro+256GB' },
  { id: 2, title: '轻薄商务笔记本 14 英寸', subtitle: '1.2kg 轻薄机身 · 2.8K 高色域屏', category_id: 7, min: 599900, max: 699900, sales: 942, stock: 238, status: 'PRODUCT_STATUS_ON_SHELF', description: '1.2kg 镁铝合金机身，2.8K 120Hz 高色域屏，70Wh 长续航。', tags: ['笔记本', '办公'], cover: 'https://placehold.co/600x600/2239AC/FFFFFF?text=Notebook+14' },
  { id: 3, title: '智能运动手表 GT4', subtitle: '血氧心率监测 · 14 天长续航', category_id: 8, min: 89900, max: 109900, sales: 3120, stock: 850, status: 'PRODUCT_STATUS_ON_SHELF', description: '双频 GPS 定位，全天候血氧与心率监测，100+ 运动模式。', tags: ['智能手表', '运动'], cover: 'https://placehold.co/600x600/F5811F/FFFFFF?text=Watch+GT4' },
  { id: 4, title: '不粘炒锅 32cm', subtitle: '少油不粘 · 通用燃气电磁炉', category_id: 9, min: 12900, max: 19900, sales: 5821, stock: 2060, status: 'PRODUCT_STATUS_ON_SHELF', description: '五层不粘涂层，导磁复合底，适用燃气与电磁炉，32cm 家庭容量。', tags: ['厨房', '爆款'], cover: 'https://placehold.co/600x600/12B76A/FFFFFF?text=Pan+32cm' },
  { id: 5, title: '全棉四件套 1.8m', subtitle: 'A 类母婴级 · 60 支长绒棉', category_id: 10, min: 29900, max: 39900, sales: 2360, stock: 810, status: 'PRODUCT_STATUS_ON_SHELF', description: '60 支新疆长绒棉，A 类母婴级标准，水洗不掉色不起球。', tags: ['家纺', '舒适'], cover: 'https://placehold.co/600x600/0BA5EC/FFFFFF?text=Bedding' },
  { id: 6, title: '纯棉商务休闲衬衫', subtitle: '免烫抗皱 · 三种色可选', category_id: 3, min: 19900, max: 29900, sales: 1450, stock: 1350, status: 'PRODUCT_STATUS_ON_SHELF', description: '100% 长绒棉，免烫抗皱处理，商务通勤与日常休闲皆宜。', tags: ['男装', '基础款'], cover: 'https://placehold.co/600x600/4B586A/FFFFFF?text=Shirt' },
  { id: 7, title: '进口车厘子 2kg 装', subtitle: 'JJ 级 · 冷链直发 · 坏果包赔', category_id: 4, min: 8900, max: 12900, sales: 8740, stock: 1280, status: 'PRODUCT_STATUS_ON_SHELF', description: '原产地直采，JJ 级大果，冷链发货，坏果包赔。', tags: ['生鲜', '包邮'], cover: 'https://placehold.co/600x600/F04438/FFFFFF?text=Cherry+2kg' },
  { id: 8, title: '职场效率管理指南', subtitle: '从目标拆解到复盘闭环', category_id: 5, min: 5900, max: 7900, sales: 2205, stock: 1120, status: 'PRODUCT_STATUS_ON_SHELF', description: '系统讲解目标管理、项目拆解与复盘方法论，附可复用模板。', tags: ['图书', '职场'], cover: 'https://placehold.co/600x600/7A5AF8/FFFFFF?text=Book+PM' },
  { id: 9, title: '降噪蓝牙耳机 Air', subtitle: '42dB 主动降噪 · 空间音频', category_id: 6, min: 69900, max: 89900, sales: 4310, stock: 1000, status: 'PRODUCT_STATUS_ON_SHELF', description: '双麦通话降噪，42dB 主动降噪，单次续航 8 小时，配合充电盒 32 小时。', tags: ['耳机', '降噪'], cover: 'https://placehold.co/600x600/121B26/FFFFFF?text=Earphone+Air' },
  { id: 10, title: '桌面双屏显示器 27 英寸', subtitle: '2K IPS · 165Hz 刷新', category_id: 7, min: 129900, max: 159900, sales: 680, stock: 210, status: 'PRODUCT_STATUS_ON_SHELF', description: '27 英寸 2K IPS 面板，165Hz 刷新率，Type-C 65W 反向供电。', tags: ['显示器', '办公'], cover: 'https://placehold.co/600x600/5F87FF/FFFFFF?text=Monitor+27' },
  { id: 11, title: '便携蓝牙音箱 Mini', subtitle: 'IPX7 防水 · 24 小时播放', category_id: 6, min: 24900, max: 34900, sales: 3980, stock: 760, status: 'PRODUCT_STATUS_ON_SHELF', description: '360° 环绕单元，IPX7 级防水，24 小时续航，可串联组队。', tags: ['音箱', '户外'], cover: 'https://placehold.co/600x600/8AABFF/FFFFFF?text=Speaker+Mini' },
  { id: 12, title: '高端保温杯 500ml', subtitle: '316 内胆 · 12 小时保温', category_id: 2, min: 15900, max: 21900, sales: 6210, stock: 1100, status: 'PRODUCT_STATUS_ON_SHELF', description: '316 医用级不锈钢内胆，12 小时保温保冷，杯盖一键开合。', tags: ['水杯', '礼品'], cover: 'https://placehold.co/600x600/3B63F6/FFFFFF?text=Thermo+500' },
  { id: 13, title: '无线降噪头戴耳机 Studio', subtitle: '主动降噪 · 40 小时续航', category_id: 6, min: 159900, max: 189900, sales: 120, stock: 0, status: 'PRODUCT_STATUS_DRAFT', description: '新一代头戴式降噪耳机，支持空间音频与多点连接。', tags: ['耳机', '新品'], cover: 'https://placehold.co/600x600/2239AC/FFFFFF?text=Studio' },
  { id: 14, title: '智能体脂秤 充电款', subtitle: '18 项身体指标 · 语音播报', category_id: 2, min: 9900, max: 12900, sales: 320, stock: 420, status: 'PRODUCT_STATUS_OFF_SHELF', description: '支持体脂、肌肉与内脏脂肪等 18 项指标测量，Type-C 充电。', tags: ['健康', '体脂'], cover: 'https://placehold.co/600x600/12B76A/FFFFFF?text=Scale' },
]

export const mockProducts: Product[] = productSeeds.map((seed) => {
  const category = mockCategories.find((c) => c.id === seed.category_id)
  return {
    id: seed.id,
    title: seed.title,
    subtitle: seed.subtitle,
    cover: seed.cover,
    category_id: seed.category_id,
    category_name: category?.name ?? '未分类',
    min_price_cents: seed.min,
    max_price_cents: seed.max,
    sales_count: seed.sales,
    stock_total: seed.stock,
    status: seed.status,
    description: seed.description,
    tags: seed.tags,
    created_at: isoAt(60 - seed.id),
    updated_at: isoAt(seed.id % 9),
  }
})

export const mockProductSkus: ProductSku[] = [
  { id: 1, product_id: 1, sku_code: 'SKU-P1-SILVER-256', spec_text: '银色 / 12+256GB', specs: { 颜色: '银色', 存储: '12+256GB' }, price_cents: 429900, original_price_cents: 499900, stock: 320, locked_stock: 0, image: '', sort: 1, sales_count: 980, enabled: true, weight_grams: 210 },
  { id: 2, product_id: 1, sku_code: 'SKU-P1-BLACK-512', spec_text: '黑色 / 12+512GB', specs: { 颜色: '黑色', 存储: '12+512GB' }, price_cents: 479900, original_price_cents: 549900, stock: 180, locked_stock: 0, image: '', sort: 2, sales_count: 540, enabled: true, weight_grams: 215 },
  { id: 3, product_id: 1, sku_code: 'SKU-P1-BLUE-1TB', spec_text: '远峰蓝 / 12+1TB', specs: { 颜色: '远峰蓝', 存储: '12+1TB' }, price_cents: 529900, original_price_cents: 619900, stock: 96, locked_stock: 0, image: '', sort: 3, sales_count: 343, enabled: true, weight_grams: 220 },
  { id: 4, product_id: 2, sku_code: 'SKU-P2-I5-16', spec_text: '深空灰 / i5 / 16G / 512G', specs: { 颜色: '深空灰', 处理器: 'i5', 内存: '16GB', 硬盘: '512GB' }, price_cents: 599900, original_price_cents: 679900, stock: 150, locked_stock: 0, image: '', sort: 1, sales_count: 520, enabled: true, weight_grams: 1200 },
  { id: 5, product_id: 2, sku_code: 'SKU-P2-I7-32', spec_text: '深空灰 / i7 / 32G / 1T', specs: { 颜色: '深空灰', 处理器: 'i7', 内存: '32GB', 硬盘: '1TB' }, price_cents: 699900, original_price_cents: 799900, stock: 88, locked_stock: 0, image: '', sort: 2, sales_count: 422, enabled: true, weight_grams: 1250 },
  { id: 6, product_id: 3, sku_code: 'SKU-P3-BLACK-46', spec_text: '曜石黑 / 46mm', specs: { 颜色: '曜石黑', 表盘: '46mm' }, price_cents: 89900, original_price_cents: 109900, stock: 640, locked_stock: 0, image: '', sort: 1, sales_count: 1980, enabled: true, weight_grams: 55 },
  { id: 7, product_id: 3, sku_code: 'SKU-P3-TITAN-46', spec_text: '钛金属 / 46mm', specs: { 颜色: '钛金属', 表盘: '46mm' }, price_cents: 109900, original_price_cents: 129900, stock: 210, locked_stock: 0, image: '', sort: 2, sales_count: 1140, enabled: true, weight_grams: 58 },
  { id: 8, product_id: 4, sku_code: 'SKU-P4-32-GREY', spec_text: '32cm / 灰黑', specs: { 尺寸: '32cm', 颜色: '灰黑' }, price_cents: 12900, original_price_cents: 16900, stock: 1200, locked_stock: 0, image: '', sort: 1, sales_count: 3800, enabled: true, weight_grams: 2100 },
  { id: 9, product_id: 4, sku_code: 'SKU-P4-32-RED', spec_text: '32cm / 复古红', specs: { 尺寸: '32cm', 颜色: '复古红' }, price_cents: 15900, original_price_cents: 19900, stock: 860, locked_stock: 0, image: '', sort: 2, sales_count: 2021, enabled: true, weight_grams: 2100 },
  { id: 10, product_id: 5, sku_code: 'SKU-P5-18-WHITE', spec_text: '1.8m / 白 / 四件套', specs: { 尺寸: '1.8m', 颜色: '白色', 件数: '四件套' }, price_cents: 29900, original_price_cents: 39900, stock: 430, locked_stock: 0, image: '', sort: 1, sales_count: 1500, enabled: true, weight_grams: 1800 },
  { id: 11, product_id: 5, sku_code: 'SKU-P5-18-GREY', spec_text: '1.8m / 灰 / 四件套', specs: { 尺寸: '1.8m', 颜色: '灰色', 件数: '四件套' }, price_cents: 29900, original_price_cents: 39900, stock: 380, locked_stock: 0, image: '', sort: 2, sales_count: 860, enabled: true, weight_grams: 1850 },
  { id: 12, product_id: 6, sku_code: 'SKU-P6-M-BLUE', spec_text: 'M / 商务蓝', specs: { 尺码: 'M', 颜色: '商务蓝' }, price_cents: 19900, original_price_cents: 25900, stock: 700, locked_stock: 0, image: '', sort: 1, sales_count: 820, enabled: true, weight_grams: 260 },
  { id: 13, product_id: 6, sku_code: 'SKU-P6-M-WHITE', spec_text: 'M / 纯白', specs: { 尺码: 'M', 颜色: '纯白' }, price_cents: 19900, original_price_cents: 25900, stock: 650, locked_stock: 0, image: '', sort: 2, sales_count: 630, enabled: true, weight_grams: 260 },
  { id: 14, product_id: 7, sku_code: 'SKU-P7-2KG-JJ', spec_text: '2kg / JJ级', specs: { 规格: '2kg', 等级: 'JJ级' }, price_cents: 8900, original_price_cents: 11900, stock: 900, locked_stock: 0, image: '', sort: 1, sales_count: 5200, enabled: true, weight_grams: 2000 },
  { id: 15, product_id: 7, sku_code: 'SKU-P7-2KG-XXXL', spec_text: '2kg / XXXL级', specs: { 规格: '2kg', 等级: 'XXXL级' }, price_cents: 12900, original_price_cents: 15900, stock: 380, locked_stock: 0, image: '', sort: 2, sales_count: 3540, enabled: true, weight_grams: 2000 },
  { id: 16, product_id: 8, sku_code: 'SKU-P8-PAPER', spec_text: '平装 / 单册', specs: { 装帧: '平装', 版本: '单册' }, price_cents: 5900, original_price_cents: 7900, stock: 800, locked_stock: 0, image: '', sort: 1, sales_count: 1400, enabled: true, weight_grams: 320 },
  { id: 17, product_id: 8, sku_code: 'SKU-P8-HARDCOVER', spec_text: '精装 / 赠笔记本', specs: { 装帧: '精装', 版本: '赠笔记本' }, price_cents: 7900, original_price_cents: 9900, stock: 320, locked_stock: 0, image: '', sort: 2, sales_count: 805, enabled: true, weight_grams: 420 },
  { id: 18, product_id: 9, sku_code: 'SKU-P9-BLACK', spec_text: '星夜黑 / 标准版', specs: { 颜色: '星夜黑', 版本: '标准版' }, price_cents: 69900, original_price_cents: 79900, stock: 520, locked_stock: 0, image: '', sort: 1, sales_count: 2700, enabled: true, weight_grams: 60 },
  { id: 19, product_id: 9, sku_code: 'SKU-P9-WHITE', spec_text: '月光白 / 标准版', specs: { 颜色: '月光白', 版本: '标准版' }, price_cents: 69900, original_price_cents: 79900, stock: 480, locked_stock: 0, image: '', sort: 2, sales_count: 1610, enabled: true, weight_grams: 60 },
  { id: 20, product_id: 10, sku_code: 'SKU-P10-27-BLK', spec_text: '27 英寸 / 黑色', specs: { 尺寸: '27英寸', 颜色: '黑色' }, price_cents: 129900, original_price_cents: 149900, stock: 210, locked_stock: 0, image: '', sort: 1, sales_count: 400, enabled: true, weight_grams: 5200 },
  { id: 21, product_id: 11, sku_code: 'SKU-P11-BLK', spec_text: '曜石黑 / 标准', specs: { 颜色: '曜石黑', 版本: '标准' }, price_cents: 24900, original_price_cents: 29900, stock: 760, locked_stock: 0, image: '', sort: 1, sales_count: 2400, enabled: true, weight_grams: 480 },
  { id: 22, product_id: 12, sku_code: 'SKU-P12-500-BLUE', spec_text: '500ml / 远峰蓝', specs: { 容量: '500ml', 颜色: '远峰蓝' }, price_cents: 15900, original_price_cents: 19900, stock: 1100, locked_stock: 0, image: '', sort: 1, sales_count: 3600, enabled: true, weight_grams: 320 },
]

// ---------------------------------------------------------------------------
// 用户 / 管理员
// ---------------------------------------------------------------------------
export const mockUsers: User[] = [
  { id: 1, username: 'demo', nickname: '演示用户', avatar: 'https://placehold.co/120x120/2A4AD9/FFFFFF?text=Demo', phone: '13800138000', email: 'demo@shopstack.dev', gender: 'GENDER_MALE', birthday: '1994-05-18', points: 1200, balance_cents: 888800, status: 'USER_STATUS_ACTIVE', level: 1, growth: 2680, wechat_openid: 'wx_demo_001', created_at: isoAt(220), last_login_at: isoAt(0, 9, 12) },
  { id: 2, username: 'alice', nickname: '爱丽丝', avatar: 'https://placehold.co/120x120/F5811F/FFFFFF?text=A', phone: '13800138001', email: 'alice@shopstack.dev', gender: 'GENDER_FEMALE', birthday: '1997-11-02', points: 300, balance_cents: 0, status: 'USER_STATUS_ACTIVE', level: 2, growth: 12400, wechat_openid: 'wx_demo_002', created_at: isoAt(180), last_login_at: isoAt(1, 20, 40) },
  { id: 3, username: 'bob', nickname: '鲍勃', avatar: 'https://placehold.co/120x120/12B76A/FFFFFF?text=B', phone: '13800138002', email: 'bob@shopstack.dev', gender: 'GENDER_MALE', birthday: '1992-03-27', points: 80, balance_cents: 12600, status: 'USER_STATUS_ACTIVE', level: 1, growth: 860, wechat_openid: 'wx_demo_003', created_at: isoAt(150), last_login_at: isoAt(2, 14, 5) },
  { id: 4, username: 'carol', nickname: '卡萝尔', avatar: 'https://placehold.co/120x120/0BA5EC/FFFFFF?text=C', phone: '13800138003', email: 'carol@shopstack.dev', gender: 'GENDER_FEMALE', birthday: '1999-08-09', points: 0, balance_cents: 0, status: 'USER_STATUS_DISABLED', level: 1, growth: 120, wechat_openid: '', created_at: isoAt(90), last_login_at: isoAt(12, 8, 0) },
  { id: 5, username: 'david', nickname: '大卫', avatar: 'https://placehold.co/120x120/7A5AF8/FFFFFF?text=D', phone: '13800138004', email: 'david@shopstack.dev', gender: 'GENDER_MALE', birthday: '1988-01-23', points: 5600, balance_cents: 45200, status: 'USER_STATUS_ACTIVE', level: 3, growth: 45000, wechat_openid: 'wx_demo_005', created_at: isoAt(76), last_login_at: isoAt(3, 11, 26) },
  { id: 6, username: 'emma', nickname: '艾玛', avatar: 'https://placehold.co/120x120/F04438/FFFFFF?text=E', phone: '13800138005', email: 'emma@shopstack.dev', gender: 'GENDER_FEMALE', birthday: '2001-06-15', points: 150, balance_cents: 0, status: 'USER_STATUS_FROZEN', level: 2, growth: 2100, wechat_openid: 'wx_demo_006', created_at: isoAt(45), last_login_at: isoAt(7, 16, 48) },
  { id: 7, username: 'frank', nickname: '弗兰克', avatar: 'https://placehold.co/120x120/121B26/FFFFFF?text=F', phone: '13800138006', email: 'frank@shopstack.dev', gender: 'GENDER_MALE', birthday: '1990-12-30', points: 2400, balance_cents: 8800, status: 'USER_STATUS_ACTIVE', level: 4, growth: 26400, wechat_openid: 'wx_demo_007', created_at: isoAt(30), last_login_at: isoAt(0, 18, 33) },
  { id: 8, username: 'grace', nickname: '格蕾丝', avatar: 'https://placehold.co/120x120/5F87FF/FFFFFF?text=G', phone: '13800138007', email: 'grace@shopstack.dev', gender: 'GENDER_UNKNOWN', birthday: '', points: 0, balance_cents: 0, status: 'USER_STATUS_ACTIVE', level: 1, growth: 150, wechat_openid: '', created_at: isoAt(21), last_login_at: isoAt(4, 10, 2) },
  { id: 9, username: 'henry', nickname: '亨利', avatar: 'https://placehold.co/120x120/8AABFF/FFFFFF?text=H', phone: '13800138008', email: 'henry@shopstack.dev', gender: 'GENDER_MALE', birthday: '1995-09-19', points: 900, balance_cents: 32000, status: 'USER_STATUS_ACTIVE', level: 2, growth: 9800, wechat_openid: 'wx_demo_009', created_at: isoAt(14), last_login_at: isoAt(1, 7, 55) },
  { id: 10, username: 'ivy', nickname: '艾薇', avatar: 'https://placehold.co/120x120/3B63F6/FFFFFF?text=I', phone: '13800138009', email: 'ivy@shopstack.dev', gender: 'GENDER_FEMALE', birthday: '2000-02-14', points: 60, balance_cents: 0, status: 'USER_STATUS_ACTIVE', level: 1, growth: 60, wechat_openid: 'wx_demo_010', created_at: isoAt(6), last_login_at: isoAt(2, 12, 10) },
]

export const mockAdmins: Admin[] = [
  { id: 1, username: 'admin', real_name: '超级管理员', avatar: 'https://placehold.co/120x120/2A4AD9/FFFFFF?text=Admin', email: 'admin@shopstack.dev', phone: '13800000001', role_ids: [1], role_names: ['超级管理员'], status: 1, created_at: isoAt(300), last_login_at: isoAt(0, 8, 30) },
  { id: 2, username: 'operator', real_name: '运营专员', avatar: 'https://placehold.co/120x120/F5811F/FFFFFF?text=Op', email: 'operator@shopstack.dev', phone: '13800000002', role_ids: [2], role_names: ['运营专员'], status: 1, created_at: isoAt(280), last_login_at: isoAt(1, 9, 0) },
  { id: 3, username: 'service', real_name: '客服专员', avatar: 'https://placehold.co/120x120/12B76A/FFFFFF?text=CS', email: 'service@shopstack.dev', phone: '13800000003', role_ids: [3], role_names: ['客服专员'], status: 1, created_at: isoAt(260), last_login_at: isoAt(2, 15, 20) },
]

// ---------------------------------------------------------------------------
// 权限 / 角色
// ---------------------------------------------------------------------------
export const mockPermissions: Permission[] = [
  { id: 1, name: '商品管理', code: 'product:view', group: 'product', type: 'menu', parent_code: '', sort: 10 },
  { id: 2, name: '商品新增', code: 'product:create', group: 'product', type: 'action', parent_code: 'product:view', sort: 11 },
  { id: 3, name: '商品编辑', code: 'product:update', group: 'product', type: 'action', parent_code: 'product:view', sort: 12 },
  { id: 4, name: '商品删除', code: 'product:delete', group: 'product', type: 'action', parent_code: 'product:view', sort: 13 },
  { id: 5, name: '分类管理', code: 'category:view', group: 'product', type: 'menu', parent_code: '', sort: 20 },
  { id: 6, name: '分类编辑', code: 'category:update', group: 'product', type: 'action', parent_code: 'category:view', sort: 21 },
  { id: 7, name: '评价审核', code: 'review:audit', group: 'product', type: 'action', parent_code: 'product:view', sort: 30 },
  { id: 8, name: '订单管理', code: 'order:view', group: 'order', type: 'menu', parent_code: '', sort: 40 },
  { id: 9, name: '订单发货', code: 'order:ship', group: 'order', type: 'action', parent_code: 'order:view', sort: 41 },
  { id: 10, name: '订单备注', code: 'order:update', group: 'order', type: 'action', parent_code: 'order:view', sort: 42 },
  { id: 11, name: '退款处理', code: 'refund:audit', group: 'order', type: 'action', parent_code: 'order:view', sort: 43 },
  { id: 12, name: '支付管理', code: 'payment:view', group: 'order', type: 'menu', parent_code: '', sort: 50 },
  { id: 13, name: '用户管理', code: 'user:view', group: 'user', type: 'menu', parent_code: '', sort: 60 },
  { id: 14, name: '用户编辑', code: 'user:update', group: 'user', type: 'action', parent_code: 'user:view', sort: 61 },
  { id: 15, name: '库存管理', code: 'inventory:view', group: 'product', type: 'menu', parent_code: '', sort: 70 },
  { id: 16, name: '库存调整', code: 'inventory:adjust', group: 'product', type: 'action', parent_code: 'inventory:view', sort: 71 },
  { id: 17, name: '营销管理', code: 'marketing:view', group: 'marketing', type: 'menu', parent_code: '', sort: 80 },
  { id: 18, name: '优惠券', code: 'coupon:update', group: 'marketing', type: 'action', parent_code: 'marketing:view', sort: 81 },
  { id: 19, name: '活动管理', code: 'promotion:update', group: 'marketing', type: 'action', parent_code: 'marketing:view', sort: 82 },
  { id: 20, name: '内容管理', code: 'content:view', group: 'marketing', type: 'menu', parent_code: '', sort: 90 },
  { id: 21, name: '轮播编辑', code: 'banner:update', group: 'marketing', type: 'action', parent_code: 'content:view', sort: 91 },
  { id: 22, name: '物流管理', code: 'logistics:view', group: 'logistics', type: 'menu', parent_code: '', sort: 100 },
  { id: 23, name: '角色权限', code: 'system:role', group: 'system', type: 'menu', parent_code: '', sort: 110 },
  { id: 24, name: '操作日志', code: 'system:audit', group: 'system', type: 'action', parent_code: 'system:role', sort: 111 },
  { id: 25, name: '数据看板', code: 'system:dashboard', group: 'system', type: 'menu', parent_code: '', sort: 120 },
]

export const mockRoles: Role[] = [
  { id: 1, name: '超级管理员', code: 'super_admin', description: '拥有全部权限', permission_ids: mockPermissions.map((p) => p.id), permission_codes: mockPermissions.map((p) => p.code), user_count: 1, created_at: isoAt(300) },
  { id: 2, name: '运营专员', code: 'operator', description: '商品、订单、营销运营', permission_ids: [1, 2, 3, 5, 6, 8, 10, 11, 17, 18, 19, 20, 21, 25], permission_codes: ['product:view', 'product:create', 'product:update', 'category:view', 'category:update', 'order:view', 'order:update', 'refund:audit', 'marketing:view', 'coupon:update', 'promotion:update', 'content:view', 'banner:update', 'system:dashboard'], user_count: 1, created_at: isoAt(280) },
  { id: 3, name: '客服专员', code: 'customer_service', description: '订单查询与售后处理', permission_ids: [8, 10, 11, 13, 25], permission_codes: ['order:view', 'order:update', 'refund:audit', 'user:view', 'system:dashboard'], user_count: 1, created_at: isoAt(260) },
  { id: 4, name: '仓库管理员', code: 'warehouse', description: '库存与物流管理', permission_ids: [15, 16, 22, 8, 9], permission_codes: ['inventory:view', 'inventory:adjust', 'logistics:view', 'order:view', 'order:ship'], user_count: 0, created_at: isoAt(240) },
]

// ---------------------------------------------------------------------------
// 订单
// ---------------------------------------------------------------------------
const addressPool = [
  { id: 1, receiver: '张三', phone: '13800138000', province: '浙江省', city: '杭州市', district: '西湖区', detail: '文三路 100 号 8 楼 801 室', postal_code: '310012', tag: '公司', is_default: true },
  { id: 2, receiver: '李四', phone: '13800138001', province: '北京市', city: '北京市', district: '朝阳区', detail: '建国路 88 号 SOHO 尚都 A 座 2201', postal_code: '100022', tag: '公司', is_default: true },
  { id: 3, receiver: '王五', phone: '13800138002', province: '广东省', city: '深圳市', district: '南山区', detail: '科技园南区腾讯大厦 15 楼', postal_code: '518057', tag: '公司', is_default: true },
]

interface OrderSeed {
  id: number
  no: string
  userId: number
  nickname: string
  status: Order['status']
  productId: number
  spec: string
  price: number
  qty: number
  discount: number
  freight: number
  addressIndex: number
  daysAgo: number
  paymentMethod: string
  remark: string
  adminRemark: string
}

const orderSeeds: OrderSeed[] = [
  { id: 1001, no: 'SS202405100001', userId: 1, nickname: '演示用户', status: 'ORDER_STATUS_PAID', productId: 1, spec: '银色 / 12+256GB', price: 429900, qty: 1, discount: 20000, freight: 0, addressIndex: 0, daysAgo: 0, paymentMethod: 'wechat', remark: '麻烦发顺丰', adminRemark: '' },
  { id: 1002, no: 'SS202405090002', userId: 2, nickname: '爱丽丝', status: 'ORDER_STATUS_PENDING_PAYMENT', productId: 7, spec: '2kg / JJ级', price: 8900, qty: 2, discount: 0, freight: 800, addressIndex: 1, daysAgo: 0, paymentMethod: 'alipay', remark: '', adminRemark: '' },
  { id: 1003, no: 'SS202405090003', userId: 3, nickname: '鲍勃', status: 'ORDER_STATUS_SHIPPED', productId: 3, spec: '曜石黑 / 46mm', price: 89900, qty: 1, discount: 0, freight: 0, addressIndex: 2, daysAgo: 1, paymentMethod: 'wechat', remark: '', adminRemark: '已联系顺丰揽收' },
  { id: 1004, no: 'SS202405080004', userId: 5, nickname: '大卫', status: 'ORDER_STATUS_COMPLETED', productId: 4, spec: '32cm / 灰黑', price: 12900, qty: 1, discount: 1000, freight: 0, addressIndex: 2, daysAgo: 2, paymentMethod: 'balance', remark: '', adminRemark: '' },
  { id: 1005, no: 'SS202405080005', userId: 7, nickname: '弗兰克', status: 'ORDER_STATUS_REFUNDING', productId: 9, spec: '星夜黑 / 标准版', price: 69900, qty: 1, discount: 0, freight: 0, addressIndex: 2, daysAgo: 3, paymentMethod: 'wechat', remark: '', adminRemark: '用户申请退货，等待审核' },
  { id: 1006, no: 'SS202405070006', userId: 8, nickname: '格蕾丝', status: 'ORDER_STATUS_CANCELLED', productId: 8, spec: '平装 / 单册', price: 5900, qty: 3, discount: 0, freight: 500, addressIndex: 1, daysAgo: 4, paymentMethod: 'alipay', remark: '', adminRemark: '超时未支付，系统关闭' },
  { id: 1007, no: 'SS202405070007', userId: 9, nickname: '亨利', status: 'ORDER_STATUS_COMPLETED', productId: 2, spec: '深空灰 / i5 / 16G / 512G', price: 599900, qty: 1, discount: 30000, freight: 0, addressIndex: 2, daysAgo: 5, paymentMethod: 'wechat', remark: '开发票', adminRemark: '' },
  { id: 1008, no: 'SS202405060008', userId: 10, nickname: '艾薇', status: 'ORDER_STATUS_PAID', productId: 6, spec: 'M / 商务蓝', price: 19900, qty: 2, discount: 0, freight: 0, addressIndex: 1, daysAgo: 5, paymentMethod: 'alipay', remark: '', adminRemark: '' },
  { id: 1009, no: 'SS202405060009', userId: 4, nickname: '卡萝尔', status: 'ORDER_STATUS_REFUNDED', productId: 5, spec: '1.8m / 白 / 四件套', price: 29900, qty: 1, discount: 0, freight: 0, addressIndex: 0, daysAgo: 6, paymentMethod: 'wechat', remark: '', adminRemark: '已全额退款' },
  { id: 1010, no: 'SS202405050010', userId: 1, nickname: '演示用户', status: 'ORDER_STATUS_COMPLETED', productId: 12, spec: '500ml / 远峰蓝', price: 15900, qty: 2, discount: 0, freight: 0, addressIndex: 0, daysAgo: 7, paymentMethod: 'balance', remark: '', adminRemark: '' },
  { id: 1011, no: 'SS202405050011', userId: 2, nickname: '爱丽丝', status: 'ORDER_STATUS_SHIPPED', productId: 10, spec: '27 英寸 / 黑色', price: 129900, qty: 1, discount: 0, freight: 0, addressIndex: 1, daysAgo: 8, paymentMethod: 'alipay', remark: '', adminRemark: '' },
  { id: 1012, no: 'SS202405040012', userId: 3, nickname: '鲍勃', status: 'ORDER_STATUS_CLOSED', productId: 11, spec: '曜石黑 / 标准', price: 24900, qty: 1, discount: 0, freight: 800, addressIndex: 2, daysAgo: 9, paymentMethod: 'wechat', remark: '', adminRemark: '仓库缺货，关闭订单' },
  { id: 1013, no: 'SS202405040013', userId: 5, nickname: '大卫', status: 'ORDER_STATUS_PAID', productId: 1, spec: '黑色 / 12+512GB', price: 479900, qty: 1, discount: 20000, freight: 0, addressIndex: 2, daysAgo: 10, paymentMethod: 'wechat', remark: '', adminRemark: '' },
  { id: 1014, no: 'SS202405030014', userId: 6, nickname: '艾玛', status: 'ORDER_STATUS_COMPLETED', productId: 4, spec: '32cm / 复古红', price: 15900, qty: 1, discount: 0, freight: 0, addressIndex: 1, daysAgo: 11, paymentMethod: 'alipay', remark: '', adminRemark: '' },
  { id: 1015, no: 'SS202405030015', userId: 7, nickname: '弗兰克', status: 'ORDER_STATUS_PAID', productId: 3, spec: '钛金属 / 46mm', price: 109900, qty: 1, discount: 0, freight: 0, addressIndex: 2, daysAgo: 12, paymentMethod: 'wechat', remark: '生日礼物，请加贺卡', adminRemark: '' },
  { id: 1016, no: 'SS202405020016', userId: 9, nickname: '亨利', status: 'ORDER_STATUS_SHIPPED', productId: 7, spec: '2kg / XXXL级', price: 12900, qty: 1, discount: 0, freight: 0, addressIndex: 0, daysAgo: 13, paymentMethod: 'balance', remark: '', adminRemark: '' },
]

export const mockOrders: Order[] = orderSeeds.map((seed) => {
  const total = seed.price * seed.qty
  const payable = total - seed.discount + seed.freight
  const paid = ['ORDER_STATUS_PENDING_PAYMENT', 'ORDER_STATUS_CANCELLED', 'ORDER_STATUS_CLOSED'].includes(seed.status)
    ? 0
    : payable
  const created = isoAt(seed.daysAgo, 9 + (seed.id % 8), (seed.id * 7) % 60)
  const shipped = ['ORDER_STATUS_SHIPPED', 'ORDER_STATUS_COMPLETED'].includes(seed.status)
    ? isoAt(Math.max(0, seed.daysAgo - 1), 15, 20)
    : ''
  return {
    id: seed.id,
    order_no: seed.no,
    user_id: seed.userId,
    user_nickname: seed.nickname,
    status: seed.status,
    total_amount_cents: total,
    discount_cents: seed.discount,
    freight_cents: seed.freight,
    payable_cents: payable,
    paid_cents: paid,
    refunded_cents: seed.status === 'ORDER_STATUS_REFUNDED' ? total : 0,
    item_count: 1,
    total_quantity: seed.qty,
    address: addressPool[seed.addressIndex],
    remark: seed.remark,
    payment_method: seed.paymentMethod,
    paid_at: paid ? isoAt(seed.daysAgo, 9 + (seed.id % 8), (seed.id * 7) % 60) : '',
    shipped_at: shipped,
    completed_at: seed.status === 'ORDER_STATUS_COMPLETED' ? isoAt(Math.max(0, seed.daysAgo - 3), 18, 5) : '',
    cancelled_at: seed.status === 'ORDER_STATUS_CANCELLED' ? isoAt(Math.max(0, seed.daysAgo - 1), 10, 0) : '',
    created_at: created,
    updated_at: created,
    admin_remark: seed.adminRemark,
    shipment_id: ['ORDER_STATUS_SHIPPED', 'ORDER_STATUS_COMPLETED'].includes(seed.status) ? seed.id : 0,
  }
})

export const mockOrderItems: OrderItem[] = orderSeeds.map((seed) => {
  const product = mockProducts.find((p) => p.id === seed.productId)
  const sku = mockProductSkus.find((s) => s.product_id === seed.productId && s.spec_text === seed.spec)
  return {
    id: seed.id * 10,
    order_id: seed.id,
    product_id: seed.productId,
    sku_id: sku?.id ?? 0,
    product_title: product?.title ?? '商品',
    spec_text: seed.spec,
    image: product?.cover ?? '',
    price_cents: seed.price,
    quantity: seed.qty,
    subtotal_cents: seed.price * seed.qty,
    refunded_cents: seed.status === 'ORDER_STATUS_REFUNDED' ? seed.price * seed.qty : 0,
    reviewed: seed.status === 'ORDER_STATUS_COMPLETED',
  }
})

const orderActionNames: Record<string, string> = {
  ORDER_STATUS_PENDING_PAYMENT: '创建订单',
  ORDER_STATUS_PAID: '支付成功',
  ORDER_STATUS_SHIPPED: '商品出库',
  ORDER_STATUS_COMPLETED: '确认收货',
  ORDER_STATUS_CANCELLED: '用户取消',
  ORDER_STATUS_REFUNDING: '申请退款',
  ORDER_STATUS_REFUNDED: '退款完成',
  ORDER_STATUS_CLOSED: '订单关闭',
}

/** 订单状态枚举值（与 common.proto 的 OrderStatus 数值一致） */
const ORDER_STATUS_VALUE: Record<string, number> = {
  ORDER_STATUS_UNSPECIFIED: 0,
  ORDER_STATUS_PENDING_PAYMENT: 1,
  ORDER_STATUS_PAID: 2,
  ORDER_STATUS_SHIPPED: 3,
  ORDER_STATUS_COMPLETED: 4,
  ORDER_STATUS_CANCELLED: 5,
  ORDER_STATUS_REFUNDING: 6,
  ORDER_STATUS_REFUNDED: 7,
  ORDER_STATUS_CLOSED: 8,
}

export const mockOrderLogs: OrderStatusLog[] = mockOrders.flatMap((order) => {
  const chain: Order['status'][] = ['ORDER_STATUS_PENDING_PAYMENT']
  if (order.status !== 'ORDER_STATUS_PENDING_PAYMENT' && order.status !== 'ORDER_STATUS_CANCELLED' && order.status !== 'ORDER_STATUS_CLOSED') {
    chain.push('ORDER_STATUS_PAID')
  }
  if (order.status === 'ORDER_STATUS_SHIPPED' || order.status === 'ORDER_STATUS_COMPLETED') {
    chain.push('ORDER_STATUS_SHIPPED')
  }
  if (order.status === 'ORDER_STATUS_COMPLETED') chain.push('ORDER_STATUS_COMPLETED')
  if (order.status === 'ORDER_STATUS_REFUNDING' || order.status === 'ORDER_STATUS_REFUNDED') {
    chain.push('ORDER_STATUS_REFUNDING')
  }
  if (order.status === 'ORDER_STATUS_REFUNDED') chain.push('ORDER_STATUS_REFUNDED')
  if (order.status === 'ORDER_STATUS_CANCELLED' || order.status === 'ORDER_STATUS_CLOSED') {
    chain.push(order.status)
  }
  return chain.map((status, index) => ({
    id: order.id * 100 + index,
    order_id: order.id,
    from_status: index === 0 ? 0 : ORDER_STATUS_VALUE[chain[index - 1]],
    to_status: ORDER_STATUS_VALUE[status],
    action: orderActionNames[status] ?? '状态变更',
    operator: index === 0 ? '用户' : index === 1 ? '支付网关' : '运营后台',
    remark: status === 'ORDER_STATUS_PAID' ? '支付渠道：' + order.payment_method : '',
    created_at: isoAt(Math.max(0, 16 - (order.id % 12) - index), 9 + index, 20),
  }))
})

// ---------------------------------------------------------------------------
// 退款 / 支付
// ---------------------------------------------------------------------------
export const mockRefunds: Refund[] = [
  { id: 501, refund_no: 'RF202405100001', order_id: 1005, order_no: 'SS202405080005', user_id: 7, amount_cents: 69900, reason: '七天无理由退货', description: '耳机包装拆封，外观有轻微划痕', item_ids: [10050], status: 0, admin_remark: '', created_at: isoAt(1, 11, 5), processed_at: '' },
  { id: 502, refund_no: 'RF202405090002', order_id: 1009, order_no: 'SS202405060009', user_id: 4, amount_cents: 29900, reason: '商品与描述不符', description: '收到的颜色与下单不一致', item_ids: [10090], status: 3, admin_remark: '已全额退款', created_at: isoAt(6, 9, 40), processed_at: isoAt(5, 14, 10) },
  { id: 503, refund_no: 'RF202405080003', order_id: 1006, order_no: 'SS202405070006', user_id: 8, amount_cents: 18200, reason: '错拍', description: '拍错规格，需要重拍', item_ids: [10060], status: 2, admin_remark: '已引导用户重新下单', created_at: isoAt(4, 16, 22), processed_at: isoAt(4, 17, 0) },
  { id: 504, refund_no: 'RF202405070004', order_id: 1002, order_no: 'SS202405090002', user_id: 2, amount_cents: 18600, reason: '生鲜不新鲜', description: '车厘子到手已变质', item_ids: [10020], status: 0, admin_remark: '', created_at: isoAt(0, 8, 45), processed_at: '' },
  { id: 505, refund_no: 'RF202405060005', order_id: 1012, order_no: 'SS202405040012', user_id: 3, amount_cents: 24900, reason: '长期未发货', description: '超过承诺发货时间', item_ids: [10120], status: 1, admin_remark: '同意退款，仓库缺货属实', created_at: isoAt(9, 10, 15), processed_at: isoAt(9, 13, 0) },
  { id: 506, refund_no: 'RF202405050006', order_id: 1004, order_no: 'SS202405080004', user_id: 5, amount_cents: 12900, reason: '质量问题', description: '锅底涂层脱落', item_ids: [10040], status: 3, admin_remark: '已退款并补发', created_at: isoAt(2, 15, 30), processed_at: isoAt(2, 18, 45) },
]

const basePayments: Payment[] = mockOrders
  .filter((order) => order.paid_cents > 0)
  .map((order, index): Payment => {
    const channel = (['PAYMENT_CHANNEL_WECHAT', 'PAYMENT_CHANNEL_ALIPAY', 'PAYMENT_CHANNEL_BALANCE'] as const)[index % 3]
    return {
      id: 9000 + index,
      payment_no: `PAY${order.order_no.slice(2)}`,
      order_id: order.id,
      order_no: order.order_no,
      user_id: order.user_id,
      amount_cents: order.paid_cents,
      refunded_cents: order.refunded_cents,
      status: 'PAYMENT_STATUS_SUCCESS',
      channel,
      transaction_id: `420000${String(1750000000000 + index * 9973).slice(0, 12)}`,
      prepay_id: `prepay_${order.id}`,
      pay_params: { appId: 'wxapp_shopstack' },
      fail_reason: '',
      paid_at: order.paid_at,
      created_at: order.created_at,
      updated_at: order.updated_at,
    }
  })

export const mockPayments: Payment[] = basePayments.concat([
  { id: 9100, payment_no: 'PAY202405100900', order_id: 1002, order_no: 'SS202405090002', user_id: 2, amount_cents: 18600, refunded_cents: 0, status: 'PAYMENT_STATUS_PENDING', channel: 'PAYMENT_CHANNEL_ALIPAY', transaction_id: '', prepay_id: 'prepay_1002', pay_params: {}, fail_reason: '', paid_at: '', created_at: isoAt(0, 9, 0), updated_at: isoAt(0, 9, 0) },
  { id: 9101, payment_no: 'PAY202405090901', order_id: 1012, order_no: 'SS202405040012', user_id: 3, amount_cents: 25700, refunded_cents: 24900, status: 'PAYMENT_STATUS_SUCCESS', channel: 'PAYMENT_CHANNEL_WECHAT', transaction_id: '4200001750099901', prepay_id: 'prepay_1012', pay_params: {}, fail_reason: '', paid_at: isoAt(9, 10, 10), created_at: isoAt(9, 10, 8), updated_at: isoAt(5, 9, 0) },
  { id: 9102, payment_no: 'PAY202405090902', order_id: 1001, order_no: 'SS202405100001', user_id: 1, amount_cents: 409900, refunded_cents: 0, status: 'PAYMENT_STATUS_FAILED', channel: 'PAYMENT_CHANNEL_WECHAT', transaction_id: '', prepay_id: 'prepay_1001', pay_params: {}, fail_reason: '用户取消支付', paid_at: '', created_at: isoAt(0, 9, 10), updated_at: isoAt(0, 9, 12) },
])

export const mockPaymentTrend: PaymentTrendPoint[] = Array.from({ length: 14 }, (_, i) => {
  const daysAgo = 13 - i
  const count = 8 + ((i * 7) % 17)
  return {
    date: isoAt(daysAgo).slice(0, 10),
    count,
    amount_cents: count * (12000 + ((i * 5300) % 46000)),
  }
})

// ---------------------------------------------------------------------------
// 库存
// ---------------------------------------------------------------------------
export const mockInventories: Inventory[] = mockProductSkus.map((sku, index) => {
  const low = index % 5 === 3
  const total = low ? 6 + index : 120 + index * 37
  return {
    id: sku.id,
    sku_id: sku.id,
    product_id: sku.product_id,
    sku_code: sku.sku_code,
    spec_text: sku.spec_text,
    total_stock: total,
    available_stock: Math.max(0, total - (index % 4)),
    locked_stock: index % 4,
    sold_stock: sku.sales_count,
    safety_stock: 10,
    warehouse: index % 3 === 0 ? '华东仓' : index % 3 === 1 ? '华南仓' : '默认仓',
    updated_at: isoAt(index % 6, 11, 0),
  }
})

export const mockInventoryLogs: InventoryLog[] = mockProductSkus.slice(0, 14).map((sku, index) => {
  const changeType = (index % 6) + 1
  const before = 200 + index * 13
  const quantity = (index % 4) + 1
  return {
    id: 7000 + index,
    sku_id: sku.id,
    product_id: sku.product_id,
    sku_code: sku.sku_code,
    change_type: changeType,
    quantity,
    before_stock: before,
    after_stock: changeType === 4 || changeType === 2 ? before - quantity : before + quantity,
    biz_type: changeType === 1 ? 'manual' : 'order',
    biz_id: changeType === 1 ? '' : `SS2024050${String(10000 + index).slice(0, 5)}`,
    operator: index % 3 === 0 ? '运营后台' : '系统',
    remark: changeType === 5 ? '盘点差异修正' : '',
    created_at: isoAt(index % 10, 14, 20),
  }
})

// ---------------------------------------------------------------------------
// 营销 / 内容 / 物流
// ---------------------------------------------------------------------------
export const mockCoupons: Coupon[] = [
  { id: 1, name: '新人专享 20 元券', code: 'NEW20', type: 'COUPON_TYPE_FIXED', face_value_cents: 2000, percent: 100, min_amount_cents: 9900, max_discount_cents: 2000, total_quantity: 10000, received_quantity: 328, used_quantity: 12, per_user_limit: 1, start_time: unixAt(30), end_time: unixAt(-150), category_id: 0, enabled: true, created_at: isoAt(32) },
  { id: 2, name: '满 200 减 50', code: 'FULL50', type: 'COUPON_TYPE_FIXED', face_value_cents: 5000, percent: 100, min_amount_cents: 19900, max_discount_cents: 5000, total_quantity: 5000, received_quantity: 1240, used_quantity: 88, per_user_limit: 3, start_time: unixAt(30), end_time: unixAt(-60), category_id: 0, enabled: true, created_at: isoAt(30) },
  { id: 3, name: '数码专区 9 折券', code: 'TECH90', type: 'COUPON_TYPE_PERCENT', face_value_cents: 0, percent: 90, min_amount_cents: 50000, max_discount_cents: 8000, total_quantity: 3000, received_quantity: 206, used_quantity: 41, per_user_limit: 2, start_time: unixAt(30), end_time: unixAt(-30), category_id: 1, enabled: true, created_at: isoAt(28) },
  { id: 4, name: '全场免运费券', code: 'FREESHIP', type: 'COUPON_TYPE_SHIPPING', face_value_cents: 0, percent: 100, min_amount_cents: 9900, max_discount_cents: 1500, total_quantity: 8000, received_quantity: 534, used_quantity: 76, per_user_limit: 5, start_time: unixAt(30), end_time: unixAt(-30), category_id: 0, enabled: true, created_at: isoAt(26) },
  { id: 5, name: '数码专区 85 折券', code: 'TECH85', type: 'COUPON_TYPE_PERCENT', face_value_cents: 0, percent: 85, min_amount_cents: 100000, max_discount_cents: 15000, total_quantity: 2000, received_quantity: 95, used_quantity: 18, per_user_limit: 1, start_time: unixAt(30), end_time: unixAt(-30), category_id: 1, enabled: false, created_at: isoAt(24) },
  { id: 6, name: '618 大促 100 元券', code: 'JUNE100', type: 'COUPON_TYPE_FIXED', face_value_cents: 10000, percent: 100, min_amount_cents: 39900, max_discount_cents: 10000, total_quantity: 20000, received_quantity: 6820, used_quantity: 3120, per_user_limit: 2, start_time: unixAt(-10), end_time: unixAt(-40), category_id: 0, enabled: true, created_at: isoAt(12) },
]

export const mockPromotions: Promotion[] = [
  { id: 1, name: '夏日数码狂欢季', description: '数码全场满 2000 减 300', type: 1, status: 1, start_time: unixAt(7), end_time: unixAt(-23), min_amount_cents: 199900, discount_cents: 30000, percent: 100, product_id: 0, limit_per_user: 0, sold_count: 1284, banner_image: 'https://placehold.co/1200x500/2A4AD9/FFFFFF?text=Promo+Summer', created_at: isoAt(8) },
  { id: 2, name: '数码单品 85 折', description: '指定商品限时折扣', type: 2, status: 1, start_time: unixAt(7), end_time: unixAt(-7), min_amount_cents: 100000, discount_cents: 0, percent: 85, product_id: 1, limit_per_user: 2, sold_count: 356, banner_image: 'https://placehold.co/1200x500/5F87FF/FFFFFF?text=Promo+Tech', created_at: isoAt(8) },
  { id: 3, name: '生鲜秒杀 每日 10 点', description: '车厘子限量秒杀', type: 3, status: 1, start_time: unixAt(7), end_time: unixAt(-23), min_amount_cents: 0, discount_cents: 0, percent: 100, product_id: 7, limit_per_user: 5, sold_count: 892, banner_image: 'https://placehold.co/1200x500/12B76A/FFFFFF?text=Promo+Fresh', created_at: isoAt(7) },
  { id: 4, name: '家居焕新季 床垫直降 30%', description: '家纺品类限时折扣', type: 2, status: 0, start_time: unixAt(-5), end_time: unixAt(-25), min_amount_cents: 29900, discount_cents: 0, percent: 70, product_id: 5, limit_per_user: 1, sold_count: 0, banner_image: 'https://placehold.co/1200x500/F5811F/FFFFFF?text=Promo+Home', created_at: isoAt(2) },
  { id: 5, name: '春季清仓专场', description: '清库存下架活动', type: 1, status: 2, start_time: unixAt(60), end_time: unixAt(20), min_amount_cents: 9900, discount_cents: 1000, percent: 100, product_id: 0, limit_per_user: 0, sold_count: 4210, banner_image: '', created_at: isoAt(62) },
]

export const mockBanners: Banner[] = [
  { id: 1, title: '夏日数码狂欢季 满 2000 减 300', image: 'https://placehold.co/1200x500/2A4AD9/FFFFFF?text=Summer+Sale', link: '/category/1', sort: 1, position: 'home_banner', visible: true, created_at: isoAt(20) },
  { id: 2, title: '新品旗舰手机首发预约', image: 'https://placehold.co/1200x500/2239AC/FFFFFF?text=New+Phone', link: '/product/1', sort: 2, position: 'home_banner', visible: true, created_at: isoAt(18) },
  { id: 3, title: '家居焕新季 床垫直降 30%', image: 'https://placehold.co/1200x500/5F87FF/FFFFFF?text=Home+Sale', link: '/category/2', sort: 3, position: 'home_banner', visible: true, created_at: isoAt(16) },
  { id: 4, title: '生鲜冷链 产地直发', image: 'https://placehold.co/1200x500/12B76A/FFFFFF?text=Fresh', link: '/category/4', sort: 4, position: 'home_banner', visible: true, created_at: isoAt(14) },
  { id: 5, title: '会员日双倍积分', image: 'https://placehold.co/1200x500/F5811F/FFFFFF?text=Member', link: '/', sort: 5, position: 'home_float', visible: false, created_at: isoAt(10) },
]

export const mockTemplates: LogisticTemplate[] = [
  { id: 1, name: '全国包邮（默认）', company: '顺丰速运', company_code: 'SF', freight_cents: 0, free_freight_amount_cents: 0, enabled: true, sort: 1, regions: '全国' },
  { id: 2, name: '江浙沪包邮', company: '中通快递', company_code: 'ZTO', freight_cents: 800, free_freight_amount_cents: 9900, enabled: true, sort: 2, regions: '浙江省,上海市,江苏省' },
  { id: 3, name: '偏远地区加价', company: '邮政EMS', company_code: 'EMS', freight_cents: 2000, free_freight_amount_cents: 0, enabled: true, sort: 3, regions: '新疆,西藏,青海,内蒙古' },
  { id: 4, name: '大件物流专线', company: '德邦物流', company_code: 'DEPPON', freight_cents: 3500, free_freight_amount_cents: 199900, enabled: false, sort: 4, regions: '全国' },
]

const baseShipments: Shipment[] = mockOrders
  .filter((order) => order.shipment_id > 0)
  .map((order, index): Shipment => {
    const companies = [
      { company: '顺丰速运', code: 'SF' },
      { company: '中通快递', code: 'ZTO' },
      { company: '京东物流', code: 'JD' },
    ]
    const picked = companies[index % companies.length]
    const status: Shipment['status'] =
      order.status === 'ORDER_STATUS_COMPLETED' ? 'SHIPMENT_STATUS_DELIVERED' : 'SHIPMENT_STATUS_SHIPPED'
    return {
      id: 8000 + index,
      order_id: order.id,
      order_no: order.order_no,
      tracking_no: `${picked.code}${Date.now().toString().slice(-12)}`,
      company: picked.company,
      company_code: picked.code,
      status,
      receiver: order.address.receiver,
      phone: order.address.phone,
      address: `${order.address.province}${order.address.city}${order.address.district}${order.address.detail}`,
      freight_cents: order.freight_cents,
      item_count: order.total_quantity,
      shipped_at: order.shipped_at,
      delivered_at: status === 'SHIPMENT_STATUS_DELIVERED' ? order.completed_at : '',
      created_at: order.shipped_at || order.created_at,
      remark: order.admin_remark,
    }
  })

export const mockShipments: Shipment[] = baseShipments.concat([
    { id: 8100, order_id: 1015, order_no: 'SS202405030015', tracking_no: 'SF998877665544', company: '顺丰速运', company_code: 'SF', status: 'SHIPMENT_STATUS_PENDING', receiver: '弗兰克', phone: '13800138006', address: '广东省深圳市南山区科技园南区腾讯大厦 15 楼', freight_cents: 0, item_count: 1, shipped_at: '', delivered_at: '', created_at: isoAt(0, 10, 0), remark: '' },
    { id: 8101, order_id: 1008, order_no: 'SS202405060008', tracking_no: 'ZTO556677889900', company: '中通快递', company_code: 'ZTO', status: 'SHIPMENT_STATUS_EXCEPTION', receiver: '艾薇', phone: '13800138009', address: '北京市北京市朝阳区建国路 88 号 SOHO 尚都 A 座 2201', freight_cents: 0, item_count: 2, shipped_at: isoAt(4, 11, 0), delivered_at: '', created_at: isoAt(4, 10, 40), remark: '地址信息不全，等待补充' },
  ])

// ---------------------------------------------------------------------------
// 评价 / 通知 / 短信 / 操作日志
// ---------------------------------------------------------------------------
export const mockReviews: Review[] = [
  { id: 1, product_id: 1, product_title: '旗舰智能手机 Pro 256GB', user_id: 2, user_nickname: '爱丽丝', user_avatar: 'https://placehold.co/120x120/F5811F/FFFFFF?text=A', rating: 5, content: '手感很棒，续航依旧给力，拍照夜景提升明显。', images: [], sku_id: 1, sku_text: '银色 / 12+256GB', status: 'REVIEW_STATUS_APPROVED', admin_reply: '感谢您的支持，欢迎再来选购！', like_count: 86, created_at: isoAt(3) },
  { id: 2, product_id: 1, product_title: '旗舰智能手机 Pro 256GB', user_id: 3, user_nickname: '鲍勃', user_avatar: 'https://placehold.co/120x120/12B76A/FFFFFF?text=B', rating: 4, content: '整体满意，就是发热控制还有提升空间。', images: [], sku_id: 2, sku_text: '黑色 / 12+512GB', status: 'REVIEW_STATUS_PENDING', admin_reply: '', like_count: 34, created_at: isoAt(5) },
  { id: 3, product_id: 4, product_title: '不粘炒锅 32cm', user_id: 1, user_nickname: '演示用户', user_avatar: 'https://placehold.co/120x120/2A4AD9/FFFFFF?text=Demo', rating: 5, content: '煎蛋不粘，洗起来很省心，尺寸家用刚好。', images: [], sku_id: 8, sku_text: '32cm / 灰黑', status: 'REVIEW_STATUS_APPROVED', admin_reply: '', like_count: 128, created_at: isoAt(2) },
  { id: 4, product_id: 7, product_title: '进口车厘子 2kg 装', user_id: 2, user_nickname: '爱丽丝', user_avatar: 'https://placehold.co/120x120/F5811F/FFFFFF?text=A', rating: 5, content: '果个大且甜，冷链包装完好，到手还是凉的。', images: [], sku_id: 14, sku_text: '2kg / JJ级', status: 'REVIEW_STATUS_APPROVED', admin_reply: '', like_count: 76, created_at: isoAt(1) },
  { id: 5, product_id: 8, product_title: '职场效率管理指南', user_id: 3, user_nickname: '鲍勃', user_avatar: 'https://placehold.co/120x120/12B76A/FFFFFF?text=B', rating: 4, content: '方法论清晰，附带的模板可以直接用。', images: [], sku_id: 16, sku_text: '平装 / 单册', status: 'REVIEW_STATUS_PENDING', admin_reply: '', like_count: 21, created_at: isoAt(6) },
  { id: 6, product_id: 9, product_title: '降噪蓝牙耳机 Air', user_id: 5, user_nickname: '大卫', user_avatar: 'https://placehold.co/120x120/7A5AF8/FFFFFF?text=D', rating: 2, content: '降噪效果一般，戴久了耳朵疼，客服也一直没人回。', images: [], sku_id: 18, sku_text: '星夜黑 / 标准版', status: 'REVIEW_STATUS_PENDING', admin_reply: '', like_count: 9, created_at: isoAt(0, 13, 20) },
  { id: 7, product_id: 3, product_title: '智能运动手表 GT4', user_id: 7, user_nickname: '弗兰克', user_avatar: 'https://placehold.co/120x120/121B26/FFFFFF?text=F', rating: 5, content: '心率监测很准，续航真的顶得住一周。', images: [], sku_id: 6, sku_text: '曜石黑 / 46mm', status: 'REVIEW_STATUS_REJECTED', admin_reply: '疑似刷单，已不予展示', like_count: 3, created_at: isoAt(8) },
  { id: 8, product_id: 2, product_title: '轻薄商务笔记本 14 英寸', user_id: 9, user_nickname: '亨利', user_avatar: 'https://placehold.co/1200x500/8AABFF/FFFFFF?text=H', rating: 5, content: '屏幕素质优秀，键盘手感扎实，续航符合预期。', images: [], sku_id: 4, sku_text: '深空灰 / i5 / 16G / 512G', status: 'REVIEW_STATUS_APPROVED', admin_reply: '', like_count: 45, created_at: isoAt(4) },
]

export const mockNotifications: Notification[] = [
  { id: 1, user_id: 1, type: 'NOTIFICATION_TYPE_ORDER', title: '新订单待发货', content: '订单 SS202405100001 已支付，请尽快安排出库。', link: '/orders', biz_id: 1001, read: false, created_at: isoAt(0, 9, 5), read_at: '' },
  { id: 2, user_id: 1, type: 'NOTIFICATION_TYPE_LOGISTICS', title: '物流异常提醒', content: '订单 SS202405060008 的包裹出现地址信息不全异常。', link: '/logistics', biz_id: 8101, read: false, created_at: isoAt(0, 11, 30), read_at: '' },
  { id: 3, user_id: 1, type: 'NOTIFICATION_TYPE_SYSTEM', title: '安全提醒', content: '检测到管理员账号在异地登录，请确认是否为本人操作。', link: '/system/audit-logs', biz_id: 0, read: false, created_at: isoAt(1, 8, 0), read_at: '' },
  { id: 4, user_id: 1, type: 'NOTIFICATION_TYPE_PROMOTION', title: '活动即将开始', content: '「夏日数码狂欢季」将于明天 10:00 开始，请提前配置商品。', link: '/promotions', biz_id: 1, read: true, created_at: isoAt(2, 15, 0), read_at: isoAt(2, 16, 0) },
  { id: 5, user_id: 1, type: 'NOTIFICATION_TYPE_ORDER', title: '退款待审核', content: '有 2 笔退款申请等待审核处理。', link: '/refunds', biz_id: 0, read: true, created_at: isoAt(2, 10, 20), read_at: isoAt(2, 12, 0) },
]

export const mockSmsRecords: SmsRecord[] = [
  { id: 1, phone: '13800138001', code: '123456', scene: 'login', status: 1, error_message: '', send_count: 1, created_at: isoAt(0, 9, 12) },
  { id: 2, phone: '13800138002', code: '654321', scene: 'register', status: 1, error_message: '', send_count: 1, created_at: isoAt(0, 10, 5) },
  { id: 3, phone: '13800138003', code: '000000', scene: 'reset_password', status: 2, error_message: '运营商网关超时', send_count: 3, created_at: isoAt(1, 14, 22) },
  { id: 4, phone: '13800138004', code: '445566', scene: 'login', status: 1, error_message: '', send_count: 1, created_at: isoAt(1, 15, 40) },
  { id: 5, phone: '13800138005', code: '778899', scene: 'bind_phone', status: 1, error_message: '', send_count: 1, created_at: isoAt(2, 9, 30) },
  { id: 6, phone: '13800138006', code: '112233', scene: 'login', status: 0, error_message: '', send_count: 0, created_at: isoAt(2, 11, 0) },
  { id: 7, phone: '13800138007', code: '334455', scene: 'order_pay', status: 1, error_message: '', send_count: 1, created_at: isoAt(3, 16, 18) },
  { id: 8, phone: '13800138008', code: '667788', scene: 'register', status: 2, error_message: '手机号为空号', send_count: 2, created_at: isoAt(4, 10, 44) },
]

export const mockAuditLogs: AuditLog[] = [
  { id: 1, admin_id: 1, admin_name: '超级管理员', module: 'product', action: 'update', target_type: 'product', target_id: '1', detail: '修改商品「旗舰智能手机 Pro 256GB」价格', ip: '127.0.0.1', user_agent: 'Chrome/125.0', result: 1, error_message: '', created_at: isoAt(0, 9, 30) },
  { id: 2, admin_id: 1, admin_name: '超级管理员', module: 'order', action: 'ship', target_type: 'order', target_id: '1003', detail: '订单 SS202405090003 已发货，快递：顺丰速运', ip: '127.0.0.1', user_agent: 'Chrome/125.0', result: 1, error_message: '', created_at: isoAt(0, 10, 12) },
  { id: 3, admin_id: 2, admin_name: '运营专员', module: 'marketing', action: 'create', target_type: 'coupon', target_id: '6', detail: '创建优惠券「618 大促 100 元券」', ip: '192.168.1.24', user_agent: 'Safari/17.4', result: 1, error_message: '', created_at: isoAt(1, 9, 5) },
  { id: 4, admin_id: 1, admin_name: '超级管理员', module: 'user', action: 'update', target_type: 'user', target_id: '4', detail: '禁用用户「卡萝尔」，原因：违规发布广告', ip: '127.0.0.1', user_agent: 'Chrome/125.0', result: 1, error_message: '', created_at: isoAt(1, 11, 48) },
  { id: 5, admin_id: 3, admin_name: '客服专员', module: 'order', action: 'update', target_type: 'order', target_id: '1005', detail: '为订单 SS202405080005 写入备注', ip: '192.168.1.88', user_agent: 'Edge/124.0', result: 1, error_message: '', created_at: isoAt(1, 15, 20) },
  { id: 6, admin_id: 1, admin_name: '超级管理员', module: 'product', action: 'delete', target_type: 'product', target_id: '14', detail: '下架并删除商品「智能体脂秤 充电款」', ip: '127.0.0.1', user_agent: 'Chrome/125.0', result: 0, error_message: '存在未结算订单，删除失败', created_at: isoAt(2, 9, 40) },
  { id: 7, admin_id: 2, admin_name: '运营专员', module: 'product', action: 'create', target_type: 'product', target_id: '13', detail: '新增商品「无线降噪头戴耳机 Studio」为草稿', ip: '192.168.1.24', user_agent: 'Safari/17.4', result: 1, error_message: '', created_at: isoAt(2, 13, 15) },
  { id: 8, admin_id: 1, admin_name: '超级管理员', module: 'inventory', action: 'update', target_type: 'sku', target_id: '8', detail: '调整 SKU-P4-32-GREY 库存至 1200', ip: '127.0.0.1', user_agent: 'Chrome/125.0', result: 1, error_message: '', created_at: isoAt(2, 16, 2) },
  { id: 9, admin_id: 3, admin_name: '客服专员', module: 'refund', action: 'audit', target_type: 'refund', target_id: '503', detail: '驳回退款申请 RF202405080003', ip: '192.168.1.88', user_agent: 'Edge/124.0', result: 1, error_message: '', created_at: isoAt(3, 10, 30) },
  { id: 10, admin_id: 1, admin_name: '超级管理员', module: 'system', action: 'update', target_type: 'role', target_id: '4', detail: '调整角色「仓库管理员」权限', ip: '127.0.0.1', user_agent: 'Chrome/125.0', result: 1, error_message: '', created_at: isoAt(3, 14, 55) },
  { id: 11, admin_id: 2, admin_name: '运营专员', module: 'content', action: 'update', target_type: 'banner', target_id: '3', detail: '调整轮播「家居焕新季 床垫直降 30%」排序', ip: '192.168.1.24', user_agent: 'Safari/17.4', result: 1, error_message: '', created_at: isoAt(4, 9, 18) },
  { id: 12, admin_id: 1, admin_name: '超级管理员', module: 'category', action: 'update', target_type: 'category', target_id: '10', detail: '修改分类「家纺布艺」排序为 22', ip: '127.0.0.1', user_agent: 'Chrome/125.0', result: 1, error_message: '', created_at: isoAt(5, 11, 5) },
]

// ---------------------------------------------------------------------------
// 看板
// ---------------------------------------------------------------------------
export const mockTrend: AdminTrendPoint[] = Array.from({ length: 30 }, (_, i) => {
  const daysAgo = 29 - i
  const orderCount = 24 + ((i * 13) % 47)
  return {
    date: isoAt(daysAgo).slice(0, 10),
    order_count: orderCount,
    revenue_cents: orderCount * (9800 + ((i * 4200) % 38000)),
    new_users: 6 + ((i * 5) % 21),
  }
})

export const mockCategoryStats: AdminCategoryStat[] = [
  { category_id: 1, category_name: '数码家电', sales_count: 8420, revenue_cents: 128940000 },
  { category_id: 4, category_name: '食品生鲜', sales_count: 6740, revenue_cents: 52600000 },
  { category_id: 2, category_name: '家居生活', sales_count: 5320, revenue_cents: 61230000 },
  { category_id: 3, category_name: '服饰鞋包', sales_count: 2140, revenue_cents: 42600000 },
  { category_id: 5, category_name: '图书文娱', sales_count: 1980, revenue_cents: 11680000 },
]

export const mockTopProducts: AdminTopProduct[] = [
  { product_id: 7, title: '进口车厘子 2kg 装', cover: 'https://placehold.co/600x600/F04438/FFFFFF?text=Cherry+2kg', sales_count: 8740, revenue_cents: 77800000 },
  { product_id: 12, title: '高端保温杯 500ml', cover: 'https://placehold.co/600x600/3B63F6/FFFFFF?text=Thermo+500', sales_count: 6210, revenue_cents: 98720000 },
  { product_id: 4, title: '不粘炒锅 32cm', cover: 'https://placehold.co/600x600/12B76A/FFFFFF?text=Pan+32cm', sales_count: 5821, revenue_cents: 75050000 },
  { product_id: 9, title: '降噪蓝牙耳机 Air', cover: 'https://placehold.co/600x600/121B26/FFFFFF?text=Earphone+Air', sales_count: 4310, revenue_cents: 301270000 },
  { product_id: 1, title: '旗舰智能手机 Pro 256GB', cover: 'https://placehold.co/600x600/2A4AD9/FFFFFF?text=Pro+256GB', sales_count: 1863, revenue_cents: 800835000 },
]

// ---------------------------------------------------------------------------
// 素材库
// ---------------------------------------------------------------------------
export const mockMaterials: Material[] = [
  { id: 1, name: '夏季主图-数码专场 01', url: 'https://placehold.co/800x800/2A4AD9/FFFFFF?text=Summer+01', type: 'image', size: 284_500, folder: '首页轮播', sort: 1, created_at: isoAt(12) },
  { id: 2, name: '夏季主图-数码专场 02', url: 'https://placehold.co/800x800/2239AC/FFFFFF?text=Summer+02', type: 'image', size: 312_800, folder: '首页轮播', sort: 2, created_at: isoAt(11) },
  { id: 3, name: '商品白底图-旗舰手机', url: 'https://placehold.co/600x600/F8FAFC/2A4AD9?text=Pro+White', type: 'image', size: 96_400, folder: '商品图', sort: 3, created_at: isoAt(10) },
  { id: 4, name: '商品白底图-智能手表', url: 'https://placehold.co/600x600/F8FAFC/F5811F?text=Watch+White', type: 'image', size: 88_100, folder: '商品图', sort: 4, created_at: isoAt(9) },
  { id: 5, name: '商品白底图-炒锅', url: 'https://placehold.co/600x600/F8FAFC/12B76A?text=Pan+White', type: 'image', size: 102_700, folder: '商品图', sort: 5, created_at: isoAt(9) },
  { id: 6, name: '生鲜详情图-车厘子', url: 'https://placehold.co/800x800/F04438/FFFFFF?text=Cherry+Detail', type: 'image', size: 210_300, folder: '详情素材', sort: 6, created_at: isoAt(7) },
  { id: 7, name: '门店实拍-家居馆', url: 'https://placehold.co/800x800/0BA5EC/FFFFFF?text=Home+Store', type: 'image', size: 356_900, folder: '详情素材', sort: 7, created_at: isoAt(6) },
  { id: 8, name: '品牌宣传片 30s', url: 'https://placehold.co/800x450/121B26/FFFFFF?text=Brand+Video', type: 'video', size: 18_432_000, folder: '视频素材', sort: 8, created_at: isoAt(5) },
  { id: 9, name: '618 预热短视频', url: 'https://placehold.co/800x450/7A5AF8/FFFFFF?text=618+Video', type: 'video', size: 24_870_000, folder: '视频素材', sort: 9, created_at: isoAt(4) },
  { id: 10, name: '优惠券底图-满减', url: 'https://placehold.co/600x300/F5811F/FFFFFF?text=Coupon+Full', type: 'image', size: 42_600, folder: '营销素材', sort: 10, created_at: isoAt(3) },
  { id: 11, name: '优惠券底图-折扣', url: 'https://placehold.co/600x300/6438E0/FFFFFF?text=Coupon+Off', type: 'image', size: 39_800, folder: '营销素材', sort: 11, created_at: isoAt(2) },
  { id: 12, name: '物流时效说明图', url: 'https://placehold.co/800x600/4B586A/FFFFFF?text=Delivery', type: 'image', size: 128_200, folder: '详情素材', sort: 12, created_at: isoAt(1) },
]

// ---------------------------------------------------------------------------
// 发票
// ---------------------------------------------------------------------------
export const mockInvoices: Invoice[] = [
  { id: 1, user_id: 2, order_no: 'SS202405100001', title: '爱丽丝', tax_no: '', type: 'personal', email: 'alice@shopstack.dev', amount_cents: 409900, status: 0, invoice_url: '', remark: '', created_at: isoAt(0, 9, 12) },
  { id: 2, user_id: 5, order_no: 'SS202405070007', title: '杭州大卫科技有限公司', tax_no: '91330106MA2H3K7X2L', type: 'company', email: 'finance@david.cn', amount_cents: 569900, status: 1, invoice_url: 'https://invoice.shopstack.dev/SS202405070007.pdf', remark: '已开票并发送至邮箱', created_at: isoAt(4, 10, 30) },
  { id: 3, user_id: 3, order_no: 'SS202405090003', title: '鲍勃', tax_no: '', type: 'personal', email: 'bob@shopstack.dev', amount_cents: 89900, status: 0, invoice_url: '', remark: '', created_at: isoAt(1, 11, 45) },
  { id: 4, user_id: 7, order_no: 'SS202405080005', title: '弗兰克', tax_no: '', type: 'personal', email: 'frank@shopstack.dev', amount_cents: 69900, status: 2, invoice_url: '', remark: '订单处于退款流程，暂不开票', created_at: isoAt(3, 14, 2) },
  { id: 5, user_id: 9, order_no: 'SS202405070007', title: '宁波亨利商贸有限公司', tax_no: '91330201MA2GH8L44P', type: 'company', email: 'henry@example.cn', amount_cents: 129900, status: 1, invoice_url: 'https://invoice.shopstack.dev/SS202405070007-2.pdf', remark: '', created_at: isoAt(6, 9, 20) },
  { id: 6, user_id: 10, order_no: 'SS202405060008', title: '艾薇', tax_no: '', type: 'personal', email: 'ivy@shopstack.dev', amount_cents: 39800, status: 0, invoice_url: '', remark: '', created_at: isoAt(2, 16, 50) },
  { id: 7, user_id: 1, order_no: 'SS202405050010', title: '杭州演示网络科技有限公司', tax_no: '91330108MA2CD1J49N', type: 'company', email: 'demo@shopstack.dev', amount_cents: 31800, status: 1, invoice_url: 'https://invoice.shopstack.dev/SS202405050010.pdf', remark: '', created_at: isoAt(7, 15, 10) },
  { id: 8, user_id: 6, order_no: 'SS202405030014', title: '艾玛', tax_no: '', type: 'personal', email: 'emma@shopstack.dev', amount_cents: 15900, status: 2, invoice_url: '', remark: '抬头信息缺失，请补充后重新申请', created_at: isoAt(11, 10, 5) },
]

// ---------------------------------------------------------------------------
// 系统设置
// ---------------------------------------------------------------------------
export const mockSettings: SystemSetting[] = [
  // basic —— 站点信息（3 项）
  { id: 1, key: 'site.name', value: 'ShopStack 电商中台', name: '站点名称', group: 'basic', description: '展示在用户端顶部的站点名称', value_type: 'string', updated_at: isoAt(2) },
  { id: 2, key: 'site.service_phone', value: '400-800-8800', name: '客服电话', group: 'basic', description: '用户端展示的客服热线', value_type: 'string', updated_at: isoAt(2) },
  { id: 3, key: 'site.service_time', value: '09:00-21:00', name: '客服服务时间', group: 'basic', description: '客服在线服务时间', value_type: 'string', updated_at: isoAt(9) },
  // order —— 订单（4 项）
  { id: 4, key: 'order.auto_receive', value: 'true', name: '自动接单', group: 'order', description: '订单支付后是否自动进入待发货', value_type: 'bool', updated_at: isoAt(5) },
  { id: 5, key: 'order.ship_days', value: '2', name: '承诺发货天数', group: 'order', description: '超过该天数未发货将计入考核', value_type: 'number', updated_at: isoAt(5) },
  { id: 6, key: 'order.complete_days', value: '10', name: '确认收货天数', group: 'order', description: '发货后自动确认收货的天数', value_type: 'number', updated_at: isoAt(12) },
  { id: 7, key: 'order.remark_required', value: 'false', name: '下单备注必填', group: 'order', description: '是否要求用户填写订单备注', value_type: 'bool', updated_at: isoAt(12) },
  // points —— 积分（2 项）
  { id: 8, key: 'points.enabled', value: 'true', name: '启用积分抵扣', group: 'points', description: '是否允许使用积分抵扣现金', value_type: 'bool', updated_at: isoAt(15) },
  { id: 9, key: 'points.deduct_ratio', value: '100', name: '积分抵扣比例', group: 'points', description: '多少积分抵扣 1 元', value_type: 'number', updated_at: isoAt(15) },
  // sms —— 短信（1 项）
  { id: 10, key: 'sms.enabled', value: 'true', name: '启用短信通知', group: 'sms', description: '关闭后不再下发短信通知', value_type: 'bool', updated_at: isoAt(1) },
  { id: 11, key: 'sms.template_login', value: '{"code":"{code}","minutes":5}', name: '登录短信模板', group: 'sms', description: 'JSON 格式的短信模板，{code} 为验证码占位符', value_type: 'json', updated_at: isoAt(8) },
]

// ---------------------------------------------------------------------------
// 订单经营统计
// ---------------------------------------------------------------------------
export const mockOrderTrend: OrderTrendPoint[] = Array.from({ length: 30 }, (_, i) => {
  const daysAgo = 29 - i
  const orderCount = 26 + ((i * 11) % 43)
  return {
    date: isoAt(daysAgo).slice(0, 10),
    order_count: orderCount,
    revenue_cents: orderCount * (10500 + ((i * 3900) % 36000)),
    new_users: 5 + ((i * 7) % 19),
  }
})

export const mockOrderCategoryStats: OrderCategoryStat[] = [
  { category_id: 1, category_name: '数码家电', sales_count: 8420, revenue_cents: 128940000 },
  { category_id: 4, category_name: '食品生鲜', sales_count: 6740, revenue_cents: 52600000 },
  { category_id: 2, category_name: '家居生活', sales_count: 5320, revenue_cents: 61230000 },
  { category_id: 3, category_name: '服饰鞋包', sales_count: 2140, revenue_cents: 42600000 },
  { category_id: 5, category_name: '图书文娱', sales_count: 1980, revenue_cents: 11680000 },
]

export const mockOrderTopProducts: OrderTopProduct[] = [
  { product_id: 7, title: '进口车厘子 2kg 装', cover: 'https://placehold.co/600x600/F04438/FFFFFF?text=Cherry+2kg', sales_count: 8740, revenue_cents: 77800000 },
  { product_id: 12, title: '高端保温杯 500ml', cover: 'https://placehold.co/600x600/3B63F6/FFFFFF?text=Thermo+500', sales_count: 6210, revenue_cents: 98720000 },
  { product_id: 4, title: '不粘炒锅 32cm', cover: 'https://placehold.co/600x600/12B76A/FFFFFF?text=Pan+32cm', sales_count: 5821, revenue_cents: 75050000 },
  { product_id: 9, title: '降噪蓝牙耳机 Air', cover: 'https://placehold.co/600x600/121B26/FFFFFF?text=Earphone+Air', sales_count: 4310, revenue_cents: 301270000 },
  { product_id: 1, title: '旗舰智能手机 Pro 256GB', cover: 'https://placehold.co/600x600/2A4AD9/FFFFFF?text=Pro+256GB', sales_count: 1863, revenue_cents: 800835000 },
]

// ---------------------------------------------------------------------------
// 物流轨迹
// ---------------------------------------------------------------------------
export const mockShipmentTracks: ShipmentTrack[] = [
  { id: 1, shipment_id: 8000, tracking_no: 'SF000000001234', location: '杭州市西湖区', description: '【杭州市】快件已由 顺丰速运 揽收', occurred_at: isoAt(2, 20, 10), sort: 1 },
  { id: 2, shipment_id: 8000, tracking_no: 'SF000000001234', location: '杭州转运中心', description: '快件到达【杭州转运中心】，已发出', occurred_at: isoAt(1, 23, 40), sort: 2 },
  { id: 3, shipment_id: 8000, tracking_no: 'SF000000001234', location: '南京转运中心', description: '快件离开【杭州转运中心】，发往【南京转运中心】', occurred_at: isoAt(1, 8, 25), sort: 3 },
  { id: 4, shipment_id: 8000, tracking_no: 'SF000000001234', location: '南京市玄武区', description: '【南京市】快件已派送至 玄武区网点，正在派送', occurred_at: isoAt(0, 9, 15), sort: 4 },
  { id: 5, shipment_id: 8000, tracking_no: 'SF000000001234', location: '南京市玄武区', description: '【南京市】快件已签收，签收人：本人', occurred_at: isoAt(0, 14, 52), sort: 5 },
  { id: 6, shipment_id: 8001, tracking_no: 'ZTO000000009876', location: '上海市闵行区', description: '【上海市】快件已到达 闵行区营业点', occurred_at: isoAt(1, 19, 5), sort: 1 },
  { id: 7, shipment_id: 8001, tracking_no: 'ZTO000000009876', location: '上海市闵行区', description: '【上海市】快件派送中，请保持电话畅通', occurred_at: isoAt(0, 10, 30), sort: 2 },
  { id: 8, shipment_id: 8002, tracking_no: 'JD000000005543', location: '深圳市南山区', description: '【深圳市】快件已由 京东物流 揽收', occurred_at: isoAt(0, 8, 45), sort: 1 },
]
