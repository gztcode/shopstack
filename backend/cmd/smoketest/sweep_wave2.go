package main

import "net/http"

// 本文件是全接口巡检的第二批用例，补齐第一批未覆盖的路由。
//
// 覆盖策略：
//   - 读接口：extReadCases2，覆盖带路径参数的详情类接口与按业务键查询的接口。
//   - 写接口：extWriteCases2，覆盖新建 / 更新 / 删除三类动作。
//     新建类用例用 capture 捕获新建记录的主键，随后同批次内的更新、删除用例
//     通过 idFrom 引用该主键，从而在不污染既有种子数据的前提下完成闭环。
//   - 内部接口：/api/v1/inventory/** 属服务间内部接口，公网网关必须拒绝，
//     用 expectDenied 断言 403。

// extReadCases2 是第二批只读接口巡检清单。
var extReadCases2 = []extCase{
	// ---------- 用户域 ----------
	{name: "用户-售后单详情", path: "/api/v1/after-sales/{auto:after_sales}"},
	{name: "帮助-文章详情", path: "/api/v1/help/articles/{auto:help}"},
	{name: "用户-订单详情", path: "/api/v1/orders/{auto:orders}"},
	{name: "用户-订单日志", path: "/api/v1/orders/{auto:orders}/logs"},
	{name: "用户-支付查询", path: "/api/v1/payments/query?payment_id={auto:payment}"},

	// ---------- 物流域 ----------
	{name: "物流-订单发货详情", path: "/api/v1/logistics/order/{auto:orders}"},
	{name: "物流-运单号查询", path: "/api/v1/logistics/tracking/{auto:tracking}"},

	// ---------- 库存域（内部接口，公网必须拒绝）----------
	{name: "内部-库存详情拒绝公网访问", path: "/api/v1/inventory/{auto:sku}", expectDenied: true},
}

// extWriteCases2 是第二批写接口巡检清单。
var extWriteCases2 = []extCase{
	// ---------- 后台管理员登录（巡检自身的 setup 也会调，这里登记为显式用例）----------
	{
		name: "认证-管理员登录", method: http.MethodPost,
		path: "/api/v1/admin/auth/login",
		body: `{"username":"admin","password":"admin123456"}`,
	},

	// ---------- 购物车：加购 → 更新 → 全选 → 清空 → 删除条目 ----------
	{
		name: "购物车-加入商品", method: http.MethodPost,
		path:    "/api/v1/cart/items",
		body:    `{"product_id":7,"sku_id":14,"quantity":1}`,
		capture: "cart_item=items.0.id",
	},
	{
		name: "购物车-更新条目", method: http.MethodPut,
		path:   "/api/v1/cart/items/{cart_item}",
		idFrom: "cart_item",
		body:   `{"quantity":2,"selected":true}`,
	},
	{
		name: "购物车-全选", method: http.MethodPut,
		path: "/api/v1/cart/select-all",
		body: `{"selected":true}`,
	},
	{
		name: "购物车-删除条目", method: http.MethodDelete,
		path:   "/api/v1/cart/items/{cart_item}",
		idFrom: "cart_item",
	},
	{
		name: "购物车-清空", method: http.MethodPost,
		path: "/api/v1/cart/clear",
		body: `{}`,
	},

	// ---------- 订单：下单 → 支付 → 等 Mock 结算 → 申请退款 → 后台审核 ----------
	{
		name: "订单-直接下单", method: http.MethodPost,
		path:    "/api/v1/orders",
		body:    `{"items":[{"product_id":7,"sku_id":14,"quantity":1}],"address_id":1,"payment_method":"alipay"}`,
		capture: "order=id,order_amount=payable_cents",
	},
	{
		name: "支付-为巡检订单创建支付单", method: http.MethodPost,
		path:   "/api/v1/payments",
		body:   `{"order_id":{order},"channel":1}`,
		idFrom: "order",
		// 支付单号由服务端生成，后续查询与回调均依赖它。
		capture:      "payment",
		captureField: "payment_no",
	},
	{
		name: "订单-申请退款", method: http.MethodPost,
		path:   "/api/v1/orders/{order}/refund",
		idFrom: "order",
		body:   `{"amount_cents":{order_amount},"reason":"巡检退款","description":"巡检退款说明"}`,
		// Mock 支付通道是异步结算的，先等订单真正变为已付款再申请退款。
		waitPath:  "/api/v1/orders/{order}",
		waitField: "order.status",
		waitValue: "ORDER_STATUS_PAID",
		capture:   "refund",
		// 订单状态机决定目标状态是否可流转。
		allowCodes: []int{5001, 5002, 5003, 5004, 1005},
	},
	{
		name: "订单-为取消场景下单", method: http.MethodPost,
		path:    "/api/v1/orders",
		body:    `{"items":[{"product_id":7,"sku_id":14,"quantity":1}],"address_id":1,"payment_method":"alipay"}`,
		capture: "order_cancel",
	},
	{
		name: "订单-取消订单", method: http.MethodPost,
		path:   "/api/v1/orders/{order_cancel}/cancel",
		idFrom: "order_cancel",
		body:   `{"reason":"巡检取消"}`,
	},
	{
		name: "订单-确认收货", method: http.MethodPost,
		path:   "/api/v1/orders/{order}/confirm",
		idFrom: "order",
		body:   `{}`,
		// 订单未发货时不允许确认收货，属状态机预期拦截。
		allowCodes: []int{5001, 5002, 5003, 5004, 1005},
	},

	// ---------- 支付 ----------
	{
		name: "支付-发起退款", method: http.MethodPost,
		path: "/api/v1/payments/refund",
		body: `{"order_id":1,"amount_cents":100,"reason":"巡检退款"}`,
		// 巡检订单并非支付成功状态，退款会被业务拒绝。
		allowCodes: []int{6003, 6000, 5001, 5002, 5003, 5004, 1005, 4004},
	},
	{
		name: "支付-第三方回调", method: http.MethodPost,
		path: "/api/v1/payments/notify",
		body: `{"payment_no":"SWEEP_PAY_NO","transaction_id":"SWEEP_TXN","signature":"sweep","raw_body":"{}","status":1}`,
		// 回调依赖平台侧支付单与签名校验，巡检使用伪造支付单号应被拒绝。
		allowCodes: []int{1000, 4004, 6000, 6001, 6002, 6003, 5001, 5002, 5003, 5004, 1005},
	},

	// ---------- 营销：结算预览 ----------
	{
		name: "营销-结算预览", method: http.MethodPost,
		path: "/api/v1/marketing/preview",
		body: `{"items":[{"sku_id":14,"product_id":7,"quantity":1,"price_cents":9900}],"address_id":1}`,
	},

	// ---------- 评价 ----------
	{
		name: "用户-发表评价", method: http.MethodPost,
		path: "/api/v1/reviews",
		body: `{"product_id":7,"sku_id":14,"rating":5,"content":"巡检评价内容","images":[]}`,
		// 同一订单同一商品只能评价一次，重复巡检命中「已评价」。
		allowCodes: []int{1005, 8004, 8005, 8006, 8007, 8008, 8009},
	},

	// ---------- 用户域：地址、收藏、发票、资料、实名、短信 ----------
	{
		name: "用户-新增收货地址", method: http.MethodPost,
		path:    "/api/v1/users/addresses",
		body:    `{"receiver":"巡检员","phone":"13800138000","province":"浙江省","city":"杭州市","district":"西湖区","detail":"巡检路 1 号","tag":"巡检","is_default":false}`,
		capture: "address",
	},
	{
		name: "用户-设为默认地址", method: http.MethodPut,
		path:   "/api/v1/users/addresses/{address}/default",
		idFrom: "address",
		body:   `{}`,
	},
	{
		name: "用户-删除收货地址", method: http.MethodDelete,
		path:   "/api/v1/users/addresses/{address}",
		idFrom: "address",
	},
	{
		name: "用户-收藏切换", method: http.MethodPost,
		path: "/api/v1/users/favorites/toggle",
		body: `{"product_id":7}`,
	},
	{
		name: "用户-申请开票", method: http.MethodPost,
		path:       "/api/v1/users/invoices",
		body:       `{"order_no":"20260101000002","title":"巡检抬头","tax_no":"91110000MA01TEST","type":"personal","email":"demo@example.com","amount_cents":100,"remark":"巡检开票"}`,
		allowCodes: []int{1005, 8001, 8002, 8003},
	},
	{
		name: "用户-更新资料", method: http.MethodPut,
		path: "/api/v1/users/me",
		body: `{"nickname":"演示用户"}`,
	},
	{
		name: "用户-实名认证", method: http.MethodPost,
		path: "/api/v1/users/realname",
		body: `{"real_name":"张三","id_card":"110101199003078515"}`,
		// 实名信息一旦提交不可重复认证。
		allowCodes: []int{1005, 9003, 9004, 9005},
	},
	{
		name: "用户-发送短信验证码", method: http.MethodPost,
		path: "/api/v1/sms/send",
		body: `{"phone":"13800138000","scene":"login"}`,
		// 同一手机号 60 秒内只能发一次，重复巡检会命中限流。
		allowCodes: []int{1006},
	},

	// ---------- 优惠券与通知 ----------
	{
		name: "优惠券-领取", method: http.MethodPost,
		path: "/api/v1/coupons/{auto:coupons}/receive",
		body: `{}`,
		// 同一张券每人限领一次。
		allowCodes: []int{1005},
	},
	{
		name: "通知-标记全部已读", method: http.MethodPost,
		path: "/api/v1/notifications/read-all",
		body: `{}`,
	},
	{
		name: "通知-标记单条已读", method: http.MethodPut,
		path: "/api/v1/notifications/{auto:notifications}/read",
		body: `{}`,
	},
	{
		name: "通知-发送通知", method: http.MethodPost,
		path: "/api/v1/notifications/send",
		body: `{"user_id":1,"type":1,"title":"巡检通知","content":"巡检通知内容","link":"/","biz_id":0}`,
	},

	// ---------- 后台：新建 → 更新 / 删除 ----------
	{
		name: "后台-新建轮播位", method: http.MethodPost, admin: true,
		path:    "/api/v1/admin/banners",
		body:    `{"title":"巡检轮播{{uniq}}","image":"https://placehold.co/750x300/9AA5B1/FFFFFF?text=SC","link":"/products","sort":99,"position":"home","visible":true}`,
		capture: "banner",
	},
	{
		name: "后台-删除轮播位", method: http.MethodDelete, admin: true,
		path:   "/api/v1/admin/banners/{banner}",
		idFrom: "banner",
	},
	{
		name: "后台-新建分类", method: http.MethodPost, admin: true,
		path:    "/api/v1/admin/categories",
		body:    `{"name":"巡检分类{{uniq}}","parent_id":0,"icon":"","description":"巡检创建","sort":99,"visible":true}`,
		capture: "category",
	},
	{
		name: "后台-更新分类", method: http.MethodPut, admin: true,
		path:   "/api/v1/admin/categories",
		body:   `{"id":{category},"name":"巡检分类改名{{uniq}}","parent_id":0,"icon":"","description":"巡检更新","sort":98,"visible":true}`,
		idFrom: "category",
	},
	{
		name: "后台-删除分类", method: http.MethodDelete, admin: true,
		path:   "/api/v1/admin/categories/{category}",
		idFrom: "category",
	},
	{
		name: "后台-新建优惠券", method: http.MethodPost, admin: true,
		path:    "/api/v1/admin/coupons",
		body:    `{"name":"巡检券{{uniq}}","code":"SWEEP{{uniqN}}","type":1,"face_value_cents":1000,"percent":0,"min_amount_cents":10000,"max_discount_cents":0,"total_quantity":100,"per_user_limit":1,"start_time":1767225600,"end_time":1798761600,"category_id":0,"enabled":true}`,
		capture: "coupon",
	},
	{
		name: "后台-删除优惠券", method: http.MethodDelete, admin: true,
		path:   "/api/v1/admin/coupons/{coupon}",
		idFrom: "coupon",
	},
	{
		name: "后台-新建运费模板", method: http.MethodPost, admin: true,
		path:    "/api/v1/admin/logistics/templates",
		body:    `{"name":"巡检模板{{uniq}}","company":"巡检快递","company_code":"sweep_express","freight_cents":800,"free_freight_amount_cents":99000,"enabled":true,"sort":99,"regions":"浙江省 杭州市 西湖区 巡检区{{uniq}}"}`,
		capture: "logistics_template",
	},
	{
		name: "后台-删除运费模板", method: http.MethodDelete, admin: true,
		path:   "/api/v1/admin/logistics/templates/{logistics_template}",
		idFrom: "logistics_template",
	},
	{
		name: "后台-新建素材", method: http.MethodPost, admin: true,
		path:    "/api/v1/admin/materials",
		body:    `{"name":"巡检素材{{uniq}}","url":"https://placehold.co/200x200/9AA5B1/FFFFFF?text=SC","type":"image","size":1024,"folder":"sweep","sort":99}`,
		capture: "material",
	},
	{
		name: "后台-删除素材", method: http.MethodDelete, admin: true,
		path:   "/api/v1/admin/materials/{material}",
		idFrom: "material",
	},
	{
		name: "后台-新建商品", method: http.MethodPost, admin: true,
		path:    "/api/v1/admin/products",
		body:    `{"title":"巡检商品{{uniq}}","subtitle":"巡检副标题","cover":"https://placehold.co/400x400/9AA5B1/FFFFFF?text=SC","category_id":1,"min_price_cents":9900,"max_price_cents":9900,"description":"巡检商品描述","tags":["巡检"],"status":1,"images":[{"url":"https://placehold.co/400x400/9AA5B1/FFFFFF?text=SC","alt":"巡检","sort":0}],"attributes":[{"name":"规格","value":"标准","sort":0}],"skus":[{"sku_code":"SWEEP{{uniqN}}","spec_text":"标准","price_cents":9900,"original_price_cents":19900,"stock":100,"enabled":true,"sort":0}]}`,
		capture: "product",
	},
	{
		name: "后台-更新商品", method: http.MethodPut, admin: true,
		path:   "/api/v1/admin/products",
		body:   `{"id":{product},"title":"巡检商品改名{{uniq}}","category_id":1,"min_price_cents":8800,"max_price_cents":8800,"description":"巡检更新","status":1,"skus":[]}`,
		idFrom: "product",
	},
	{
		name: "后台-上下架商品", method: http.MethodPut, admin: true,
		path:   "/api/v1/admin/products/{product}/status",
		idFrom: "product",
		body:   `{"status":3}`,
	},
	{
		name: "后台-删除商品", method: http.MethodDelete, admin: true,
		path:   "/api/v1/admin/products/{product}",
		idFrom: "product",
	},
	{
		name: "后台-新建活动", method: http.MethodPost, admin: true,
		path:    "/api/v1/admin/promotions",
		body:    `{"name":"巡检活动{{uniq}}","description":"巡检创建","type":1,"status":1,"start_time":1767225600,"end_time":1798761600,"min_amount_cents":10000,"discount_cents":500,"percent":0,"product_id":7,"limit_per_user":1,"banner_image":""}`,
		capture: "promotion",
	},
	{
		name: "后台-删除活动", method: http.MethodDelete, admin: true,
		path:   "/api/v1/admin/promotions/{promotion}",
		idFrom: "promotion",
	},
	{
		name: "后台-新建角色", method: http.MethodPost, admin: true,
		path:    "/api/v1/admin/roles",
		body:    `{"name":"巡检角色{{uniq}}","code":"sweep_role_{{uniq}}","description":"巡检创建","permission_ids":[]}`,
		capture: "role",
	},
	{
		name: "后台-删除角色", method: http.MethodDelete, admin: true,
		path:   "/api/v1/admin/roles/{role}",
		idFrom: "role",
	},
	{
		name: "后台-新建SKU", method: http.MethodPost, admin: true,
		path: "/api/v1/admin/skus",
		body: `{"product_id":7,"sku_code":"SWEEPSKU{{uniqN}}","spec_text":"巡检规格","price_cents":9900,"original_price_cents":19900,"stock":50,"image":"","sort":99,"enabled":true,"weight_grams":500}`,
	},
	{
		name: "后台-创建发货单", method: http.MethodPost, admin: true,
		path:    "/api/v1/admin/shipments",
		body:    `{"order_id":{order},"company":"巡检快递","company_code":"sweep_express","tracking_no":"SWEEP{{uniqN}}","freight_cents":800,"remark":"巡检发货"}`,
		capture: "shipment",
		idFrom:  "order",
	},
	{
		name: "后台-更新发货单状态", method: http.MethodPut, admin: true,
		path:   "/api/v1/admin/shipments/{shipment}/status",
		idFrom: "shipment",
		body:   `{"status":1,"location":"巡检分拨中心","description":"巡检发货"}`,
	},

	// ---------- 后台：删除第一批新建的记录 ----------
	{
		name: "后台-删除频道", method: http.MethodDelete, admin: true,
		path:   "/api/v1/admin/channels/{channel}",
		idFrom: "channel",
	},
	{
		name: "后台-删除评价标签", method: http.MethodDelete, admin: true,
		path:   "/api/v1/admin/review-tags/{review_tag}",
		idFrom: "review_tag",
	},
	{
		name: "后台-删除服务保障", method: http.MethodDelete, admin: true,
		path:   "/api/v1/admin/guarantees/{guarantee}",
		idFrom: "guarantee",
	},
	{
		name: "后台-删除快递公司", method: http.MethodDelete, admin: true,
		path:   "/api/v1/admin/logistics/companies/{logistics_company}",
		idFrom: "logistics_company",
	},
	{
		name: "后台-删除仓库", method: http.MethodDelete, admin: true,
		path:   "/api/v1/admin/warehouses/{warehouse}",
		idFrom: "warehouse",
	},
	{
		name: "后台-删除支付渠道", method: http.MethodDelete, admin: true,
		path:   "/api/v1/admin/pay-channels/{pay_channel}",
		idFrom: "pay_channel",
	},
	{
		name: "后台-删除通知模板", method: http.MethodDelete, admin: true,
		path:   "/api/v1/admin/notification-templates/{notification_template}",
		idFrom: "notification_template",
	},
	{
		name: "后台-删除短信模板", method: http.MethodDelete, admin: true,
		path:   "/api/v1/admin/sms-templates/{sms_template}",
		idFrom: "sms_template",
	},
	{
		name: "后台-删除敏感词", method: http.MethodDelete, admin: true,
		path:   "/api/v1/admin/sensitive-words/{sensitive_word}",
		idFrom: "sensitive_word",
	},
	{
		name: "用户-删除发票抬头模板", method: http.MethodDelete,
		path:   "/api/v1/users/invoice-templates/{invoice_template}",
		idFrom: "invoice_template",
	},

	// ---------- 签到配置（后台维护，前台签到逻辑消费）----------
	{
		name: "后台-读取签到配置", method: http.MethodGet, admin: true,
		path: "/api/v1/admin/sign-in-config",
	},
	{
		name: "后台-保存签到配置", method: http.MethodPut, admin: true,
		path: "/api/v1/admin/sign-in-config",
		body: `{"enabled":true,"points_awarded":5,"continuous_step":1,"max_points":20,"continuous_days_required":7,"calendar_days":7,"description":"巡检签到配置"}`,
	},

	// ---------- 后台：更新类 ----------
	{
		name: "后台-更新管理员资料", method: http.MethodPut, admin: true,
		path: "/api/v1/admin/me",
		body: `{"real_name":"巡检管理员","avatar":"","email":"admin@example.com","phone":"13800138000"}`,
	},
	{
		name: "后台-更新订单备注", method: http.MethodPut, admin: true,
		path: "/api/v1/admin/orders/{auto:orders}/remark",
		body: `{"admin_remark":"巡检备注"}`,
	},
	{
		name: "后台-调整库存", method: http.MethodPut, admin: true,
		path: "/api/v1/admin/inventory/adjust",
		body: `{"sku_id":3,"quantity":96,"reason":"巡检盘点调整","safety_stock":10,"warehouse":"默认仓"}`,
	},
	{
		name: "后台-审核退款单", method: http.MethodPut, admin: true,
		path:   "/api/v1/admin/refunds/{refund}/status",
		idFrom: "refund",
		body:   `{"status":1,"admin_remark":"巡检审核通过"}`,
		// 退款单状态机决定目标状态是否可流转。
		allowCodes: []int{5001, 5002, 5003, 5004, 1005},
	},
	{
		name: "后台-审核评价", method: http.MethodPut, admin: true,
		path: "/api/v1/admin/reviews/{auto:reviews}/status",
		body: `{"status":1,"admin_reply":"巡检回复：感谢反馈。"}`,
	},
	{
		name: "后台-审核发票", method: http.MethodPut, admin: true,
		path: "/api/v1/admin/invoices/{auto:invoices}/status",
		body: `{"status":1,"invoice_url":"https://placehold.co/invoice.pdf","remark":"巡检通过"}`,
		// 发票状态机决定目标状态是否可流转。
		allowCodes: []int{5001, 5002, 5003, 5004, 1005},
	},
	{
		name: "后台-更新系统配置", method: http.MethodPut, admin: true,
		path: "/api/v1/admin/settings",
		body: `{"group":"basic","values":{"site_name":"ShopStack 巡检商城"}}`,
		// 未知配置键会被忽略，未命中任何键时返回「没有需要更新的配置项」。
		allowCodes: []int{1000},
	},

	// ---------- 库存内部接口：公网必须拒绝 ----------
	{
		name: "内部-批量查库存拒绝公网访问", method: http.MethodPost,
		path:         "/api/v1/inventory/batch",
		body:         `{"sku_ids":[3,4,5]}`,
		expectDenied: true,
	},
	{
		name: "内部-扣减库存拒绝公网访问", method: http.MethodPost,
		path:         "/api/v1/inventory/deduct",
		body:         `{"order_id":0,"items":[{"sku_id":3,"product_id":1,"quantity":1}]}`,
		expectDenied: true,
	},
	{
		name: "内部-释放库存拒绝公网访问", method: http.MethodPost,
		path:         "/api/v1/inventory/release",
		body:         `{"order_id":0,"items":[{"sku_id":3,"product_id":1,"quantity":1}],"reason":"巡检"}`,
		expectDenied: true,
	},
	{
		name: "内部-预占库存拒绝公网访问", method: http.MethodPost,
		path:         "/api/v1/inventory/reserve",
		body:         `{"order_id":0,"items":[{"sku_id":3,"product_id":1,"quantity":1}],"biz_type":"巡检"}`,
		expectDenied: true,
	},
}
