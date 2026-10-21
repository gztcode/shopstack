package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/shopstack/platform/backend/internal/errs"
)

// extCase 描述一个待巡检的接口。
type extCase struct {
	name   string
	method string
	path   string
	admin  bool // 是否用管理员令牌
	body   string
	// allowCodes 列出「预期内业务拦截」的业务码白名单。
	// 返回这些码说明接口按业务规则拒绝了请求，属于正常行为，记为警告而非失败；
	// 返回白名单之外的业务码则判定为失败。
	allowCodes []int
	// capture 把本次响应的主键存入捕获表，键名取 capture。
	// 支持一次捕获多个字段，写法为 "键名=字段,键名2=字段2"，字段缺省为 "id"。
	// 用于「先创建 → 拿到 id → 再更新/删除」的链式用例。
	capture string
	// captureField 指定从响应 data 中取哪个字段作为捕获值，默认 "id"。
	// 支持 a.b 形式的下钻路径，例如 "items.0.id"。
	captureField string
	// idFrom 指定路径中 {键名} 占位符对应的捕获键，
	// 运行时替换为捕获表中的真实 id。
	idFrom string
	// expectDenied 表示该路由属服务间内部接口，公网网关必须拒绝（403）。
	// 断言的是「必须被拒」，返回 200 反而是失败。
	expectDenied bool
	// sleepBefore 在执行本用例前等待一段时间。
	// 用于依赖异步结算的链路，例如支付 Mock 通道自动把订单置为已支付。
	sleepBefore time.Duration
	// waitPath/waitField/waitValue 组成一个「执行前轮询等待」条件：
	// 轮询 waitPath 直到 waitField 等于 waitValue（最多 15 秒）。
	// 路径里的 {键名} 同样会被捕获表替换，用于等待异步状态流转到位。
	waitPath  string
	waitField string
	waitValue string
}

// allows 判断业务码是否在预期内拦截白名单中。
func (c extCase) allows(code int) bool {
	for _, v := range c.allowCodes {
		if v == code {
			return true
		}
	}
	return false
}

// extCases 是全量接口巡检清单，覆盖 9 个微服务对外暴露的所有接口。
//
// 覆盖范围与 proto/shopstack/**/v1/*.proto 的 203 个 RPC 一一对应，
// 每个 RPC 至少有一个巡检用例。新增接口时必须同步在此登记，
// 否则巡检会漏掉「未实现」的桩方法。
var extCases = []extCase{
	// ---------- 用户域：用户端 ----------
	{name: "用户-资料", path: "/api/v1/users/me"},
	{name: "用户-地址列表", path: "/api/v1/users/addresses"},
	{name: "用户-收藏列表", path: "/api/v1/users/favorites"},
	{name: "用户-积分明细", path: "/api/v1/users/points-logs?page.page=1&page.page_size=5"},
	{name: "用户-发票列表", path: "/api/v1/users/invoices?page.page=1&page.page_size=5"},
	{name: "用户-我的优惠券", path: "/api/v1/users/coupons"},
	{name: "用户-当前等级", path: "/api/v1/users/level"},
	{name: "用户-等级列表", path: "/api/v1/users/levels"},
	{name: "用户-成长值明细", path: "/api/v1/users/growth-logs?page.page=1&page.page_size=5"},
	{name: "用户-发票抬头模板", path: "/api/v1/users/invoice-templates?page.page=1&page.page_size=5"},
	{name: "用户-通知设置", path: "/api/v1/users/notification-settings"},
	{name: "用户-账号安全", path: "/api/v1/users/security"},
	{name: "用户-收货地区", path: "/api/v1/regions?page.page=1&page.page_size=5"},
	{name: "用户-帮助文章", path: "/api/v1/help/articles?page.page=1&page.page_size=5"},
	{name: "用户-支付充值配置", path: "/api/v1/payments/recharge-config"},
	{name: "用户-充值记录", path: "/api/v1/payments/recharges?page.page=1&page.page_size=5"},
	{name: "用户-余额流水", path: "/api/v1/payments/balance-logs?page.page=1&page.page_size=5"},

	// ---------- 用户域：后台 ----------
	{name: "后台-资料", path: "/api/v1/admin/me", admin: true},
	{name: "后台-用户列表", path: "/api/v1/admin/users?page.page=1&page.page_size=5", admin: true},
	{name: "后台-用户列表按等级", path: "/api/v1/admin/users?level=1&page.page=1&page.page_size=5", admin: true},
	{name: "后台-角色列表", path: "/api/v1/admin/roles", admin: true},
	{name: "后台-权限清单", path: "/api/v1/admin/permissions", admin: true},
	{name: "后台-看板", path: "/api/v1/admin/dashboard/overview", admin: true},
	{name: "后台-发票审核列表", path: "/api/v1/admin/invoices?page.page=1&page.page_size=5", admin: true},
	{name: "后台-用户反馈列表", path: "/api/v1/admin/feedbacks?page.page=1&page.page_size=5", admin: true},

	// ---------- 商品域 ----------
	{name: "商品-列表", path: "/api/v1/products?page.page=1&page.page_size=5"},
	{name: "商品-详情", path: "/api/v1/products/7"},
	{name: "商品-分类树", path: "/api/v1/categories"},
	{name: "商品-轮播", path: "/api/v1/banners"},
	{name: "商品-评价列表", path: "/api/v1/reviews?page.page=1&page.page_size=5"},
	{name: "商品-评价标签", path: "/api/v1/reviews/tags?page.page=1&page.page_size=5"},
	{name: "商品-频道列表", path: "/api/v1/channels?page.page=1&page.page_size=5"},
	{name: "商品-频道详情", path: "/api/v1/channels/1"},
	{name: "商品-频道商品", path: "/api/v1/channels/1/products?page.page=1&page.page_size=5"},
	{name: "商品-服务保障", path: "/api/v1/guarantees?page.page=1&page.page_size=5"},
	{name: "商品-商品参数", path: "/api/v1/products/7/params"},
	{name: "商品-商品问答", path: "/api/v1/products/7/questions?page.page=1&page.page_size=5"},
	{name: "后台-素材库", path: "/api/v1/admin/materials?page.page=1&page.page_size=5", admin: true},
	{name: "后台-商品问答管理", path: "/api/v1/admin/questions?page.page=1&page.page_size=5", admin: true},

	// ---------- 购物车域 ----------
	{name: "购物车-列表", path: "/api/v1/cart"},
	{name: "购物车-角标", path: "/api/v1/cart/count"},

	// ---------- 订单域 ----------
	{name: "订单-列表", path: "/api/v1/orders?page.page=1&page.page_size=5"},
	{name: "订单-统计", path: "/api/v1/orders/count"},
	{name: "订单-售后列表", path: "/api/v1/after-sales?page.page=1&page.page_size=5"},
	{name: "订单-退款原因", path: "/api/v1/refund-reasons?page.page=1&page.page_size=5"},
	{name: "后台-退款列表", path: "/api/v1/admin/refunds?page.page=1&page.page_size=5", admin: true},
	{name: "后台-售后管理", path: "/api/v1/admin/after-sales?page.page=1&page.page_size=5", admin: true},
	{name: "后台-全部订单", path: "/api/v1/admin/orders?page.page=1&page.page_size=5", admin: true},
	{name: "后台-订单统计", path: "/api/v1/admin/orders/stats", admin: true},
	{name: "后台-订单渠道统计", path: "/api/v1/admin/orders/stats/channels", admin: true},
	{name: "后台-订单时段统计", path: "/api/v1/admin/orders/stats/hours", admin: true},
	{name: "后台-订单地区统计", path: "/api/v1/admin/orders/stats/regions", admin: true},
	{name: "后台-订单日志", path: "/api/v1/admin/order-logs?page.page=1&page.page_size=5", admin: true},

	// ---------- 营销域 ----------
	{name: "营销-可领券", path: "/api/v1/coupons?page.page=1&page.page_size=5"},
	{name: "营销-活动列表", path: "/api/v1/promotions"},
	{name: "营销-活动详情", path: "/api/v1/promotions/1"},
	{name: "营销-活动商品", path: "/api/v1/promotions/1/products?page.page=1&page.page_size=5"},
	{name: "营销-活动场次", path: "/api/v1/promotions/1/sessions?page.page=1&page.page_size=5"},
	{name: "营销-签到状态", path: "/api/v1/marketing/sign-in"},
	{name: "营销-任务列表", path: "/api/v1/marketing/tasks?page.page=1&page.page_size=5"},
	{name: "营销-等级列表", path: "/api/v1/marketing/levels"},
	{name: "营销-拼团列表", path: "/api/v1/group-buys?page.page=1&page.page_size=5"},
	{name: "营销-拼团详情", path: "/api/v1/group-buys/1"},

	// ---------- 物流域 ----------
	{name: "物流-轨迹", path: "/api/v1/logistics/tracks?order_id=1"},
	{name: "物流-快递公司", path: "/api/v1/logistics/companies?page.page=1&page.page_size=5"},
	{name: "物流-配送范围", path: "/api/v1/logistics/ranges?page.page=1&page.page_size=5"},
	{name: "后台-发货单", path: "/api/v1/admin/shipments?page.page=1&page.page_size=5", admin: true},
	{name: "后台-退货运单", path: "/api/v1/admin/return-shipments?page.page=1&page.page_size=5", admin: true},
	{name: "后台-运费模板", path: "/api/v1/logistics/templates", admin: true},

	// ---------- 库存域 ----------
	{name: "后台-库存列表", path: "/api/v1/admin/inventory?page.page=1&page.page_size=5", admin: true},
	{name: "后台-库存流水", path: "/api/v1/admin/inventory/logs?page.page=1&page.page_size=5", admin: true},
	{name: "后台-库存预警", path: "/api/v1/admin/inventory/warning", admin: true},
	{name: "后台-仓库管理", path: "/api/v1/admin/warehouses?page.page=1&page.page_size=5", admin: true},
	{name: "后台-入库单列表", path: "/api/v1/admin/inbound-orders?page.page=1&page.page_size=5", admin: true},
	{name: "后台-出库单列表", path: "/api/v1/admin/outbound-orders?page.page=1&page.page_size=5", admin: true},
	{name: "后台-盘点单列表", path: "/api/v1/admin/stock-checks?page.page=1&page.page_size=5", admin: true},
	{name: "后台-盘点单详情", path: "/api/v1/admin/stock-checks/{stock_check_id}", admin: true},
	{name: "后台-盘点明细", path: "/api/v1/admin/stock-checks/{stock_check_id}/items", admin: true},

	// ---------- 支付域 ----------
	{name: "后台-支付流水", path: "/api/v1/admin/payments?page.page=1&page.page_size=5", admin: true},
	{name: "后台-支付汇总", path: "/api/v1/admin/payments/summary", admin: true},
	{name: "后台-支付渠道管理", path: "/api/v1/admin/pay-channels?page.page=1&page.page_size=5", admin: true},

	// ---------- 通知域 ----------
	{name: "通知-列表", path: "/api/v1/notifications"},
	{name: "通知-未读数", path: "/api/v1/notifications/unread-count"},
	{name: "通知-分类", path: "/api/v1/notifications/categories"},
	{name: "后台-短信记录", path: "/api/v1/admin/sms-records?page.page=1&page.page_size=5", admin: true},
	{name: "后台-审计日志", path: "/api/v1/admin/audit-logs?page.page=1&page.page_size=5", admin: true},
	{name: "后台-系统设置", path: "/api/v1/admin/settings", admin: true},
	{name: "后台-通知模板管理", path: "/api/v1/admin/notification-templates?page.page=1&page.page_size=5", admin: true},
	{name: "后台-短信模板管理", path: "/api/v1/admin/sms-templates?page.page=1&page.page_size=5", admin: true},
	{name: "后台-敏感词管理", path: "/api/v1/admin/sensitive-words?page.page=1&page.page_size=5", admin: true},
}

// extWriteCases 是写接口巡检清单。
//
// 这些接口会产生真实数据写入。设计要求：
//   - 可重复执行：会创建唯一键记录的用例，其唯一值使用 {{uniq}} 占位符，
//     运行时替换为本次巡检专属 token，避免第二次运行撞唯一键。
//   - 预期内业务拦截显式声明：受状态影响的用例（如「今日已签到」）用 allowCodes
//     列出可接受的业务码，接口返回白名单外的码一律判失败。
var extWriteCases = []extCase{
	// 用户域
	{
		name: "用户-保存发票抬头模板", method: http.MethodPost,
		path:    "/api/v1/users/invoice-templates",
		body:    `{"title":"巡检测试公司{{uniq}}","tax_no":"91110000MA01TEST","type":"personal","email":"demo@example.com","phone":"010-12345678","address":"北京市朝阳区","bank_name":"巡检银行","bank_account":"6222000000000000","is_default":false}`,
		capture: "invoice_template",
	},
	{
		name: "用户-更新通知设置", method: http.MethodPut,
		path: "/api/v1/users/notification-settings",
		body: `{"order_notice":true,"logistics_notice":true,"marketing_notice":false,"system_notice":true,"sms_notice":false,"email_notice":false,"wechat_notice":false}`,
	},
	{
		name: "用户-提交反馈", method: http.MethodPost,
		path: "/api/v1/users/feedback",
		body: `{"type":1,"content":"巡检测试反馈","contact":"demo@example.com"}`,
	},
	{
		name: "用户-商品提问", method: http.MethodPost,
		path: "/api/v1/questions",
		body: `{"product_id":7,"content":"巡检测试问题：这款商品支持退换吗？"}`,
	},
	{
		name: "用户-签到", method: http.MethodPost,
		path: "/api/v1/marketing/sign-in",
		body: `{}`,
		// 巡检当天再跑会命中「今日已签到」，属预期内拦截。
		allowCodes: []int{1005},
	},
	{
		name: "用户-领取任务奖励", method: http.MethodPost,
		path: "/api/v1/marketing/tasks/1/claim",
		body: `{}`,
		// 奖励只能领一次，重复巡检命中「已领取」。
		allowCodes: []int{1005},
	},
	{
		name: "用户-充值下单", method: http.MethodPost,
		path: "/api/v1/payments/recharge",
		body: `{"amount_cents":100,"channel":1}`,
	},
	{
		name: "用户-创建拼团", method: http.MethodPost,
		path: "/api/v1/group-buys/1/join",
		body: `{"quantity":1}`,
		// 同一用户不能重复参与同一拼团。
		allowCodes: []int{1005},
	},

	// 后台域
	{
		name: "后台-保存频道", method: http.MethodPost, admin: true,
		path:    "/api/v1/admin/channels",
		body:    `{"name":"巡检频道{{uniq}}","code":"sweep_channel_{{uniq}}","icon":"https://placehold.co/64x64/9AA5B1/FFFFFF?text=SC","description":"巡检创建","sort":99,"type":1,"status":1}`,
		capture: "channel",
	},
	{
		name: "后台-保存评价标签", method: http.MethodPost, admin: true,
		path:    "/api/v1/admin/review-tags",
		body:    `{"name":"巡检标签{{uniq}}","sort":99,"enabled":true}`,
		capture: "review_tag",
	},
	{
		name: "后台-保存服务保障", method: http.MethodPost, admin: true,
		path:    "/api/v1/admin/guarantees",
		body:    `{"name":"巡检保障{{uniq}}","icon":"https://placehold.co/64x64/9AA5B1/FFFFFF?text=SC","description":"巡检创建","sort":99,"enabled":true}`,
		capture: "guarantee",
	},
	{
		name: "后台-保存活动场次", method: http.MethodPost, admin: true,
		path: "/api/v1/admin/promotion-sessions",
		body: `{"promotion_id":1,"name":"巡检场次{{uniq}}","start_time":1767225600,"end_time":1798761600,"stock":100}`,
		// 同一活动下的场次时间不允许重叠。
		allowCodes: []int{8003},
		capture:    "promotion_session",
	},
	{
		name: "后台-保存拼团活动", method: http.MethodPost, admin: true,
		path:    "/api/v1/admin/group-buys",
		body:    `{"name":"巡检拼团{{uniq}}","description":"巡检创建","promotion_id":1,"product_id":7,"price_cents":990,"required_members":3,"start_time":1767225600,"end_time":1798761600,"banner_image":""}`,
		capture: "group_buy",
	},
	{
		name: "后台-保存快递公司", method: http.MethodPost, admin: true,
		path:    "/api/v1/admin/logistics/companies",
		body:    `{"name":"巡检快递{{uniq}}","code":"sweep_express_{{uniq}}","logo":"","phone":"400-000-0000","enabled":true,"sort":99,"supports_cod":true}`,
		capture: "logistics_company",
	},
	{
		name: "后台-保存配送范围", method: http.MethodPost, admin: true,
		path:    "/api/v1/admin/logistics/ranges",
		body:    `{"template_id":1,"regions":"北京市 北京市 朝阳区 巡检区{{uniq}}","freight_cents":800,"free_freight_amount_cents":99000,"enabled":true}`,
		capture: "logistics_range",
	},
	{
		name: "后台-保存仓库", method: http.MethodPost, admin: true,
		path:    "/api/v1/admin/warehouses",
		body:    `{"code":"sweep_wh_{{uniq}}","name":"巡检仓库{{uniq}}","address":"北京市朝阳区巡检路1号","contact":"巡检员","phone":"010-12345678","enabled":true}`,
		capture: "warehouse",
	},
	{
		name: "后台-创建入库单", method: http.MethodPost, admin: true,
		path: "/api/v1/admin/inbound-orders",
		body: `{"warehouse_id":1,"supplier":"巡检供应商{{uniq}}","remark":"巡检创建","items":[{"sku_id":3,"sku_code":"SKU-P1-BLUE-1TB","spec_text":"远峰蓝 / 12+1TB","quantity":1}]}`,
	},
	{
		name: "后台-创建出库单", method: http.MethodPost, admin: true,
		path: "/api/v1/admin/outbound-orders",
		body: `{"warehouse_id":1,"order_id":0,"remark":"巡检创建","items":[{"sku_id":3,"sku_code":"SKU-P1-BLUE-1TB","spec_text":"远峰蓝 / 12+1TB","quantity":1}]}`,
	},
	{
		name: "后台-创建盘点单", method: http.MethodPost, admin: true,
		path: "/api/v1/admin/stock-checks",
		body: `{"warehouse_id":1,"remark":"巡检盘点"}`,
	},
	{
		name: "后台-保存支付渠道", method: http.MethodPost, admin: true,
		path:    "/api/v1/admin/pay-channels",
		body:    `{"name":"巡检支付{{uniq}}","channel":1,"code":"sweep_pay_{{uniq}}","icon":"","enabled":true,"sort":99,"config":"{}"}`,
		capture: "pay_channel",
	},
	{
		name: "后台-保存通知模板", method: http.MethodPost, admin: true,
		path:    "/api/v1/admin/notification-templates",
		body:    `{"code":"sweep_tpl_{{uniq}}","name":"巡检模板{{uniq}}","type":1,"title":"巡检标题","content":"巡检内容 {{order_no}}","link":"","enabled":true}`,
		capture: "notification_template",
	},
	{
		name: "后台-保存短信模板", method: http.MethodPost, admin: true,
		path:    "/api/v1/admin/sms-templates",
		body:    `{"code":"sweep_sms_{{uniq}}","name":"巡检短信{{uniq}}","content":"巡检短信 {{code}}","enabled":true}`,
		capture: "sms_template",
	},
	{
		name: "后台-保存敏感词", method: http.MethodPost, admin: true,
		path:    "/api/v1/admin/sensitive-words",
		body:    `{"word":"巡检敏感词{{uniq}}","category":4,"status":1}`,
		capture: "sensitive_word",
	},
	{
		name: "后台-保存退款原因", method: http.MethodPost, admin: true,
		path:    "/api/v1/admin/refund-reasons",
		body:    `{"name":"巡检退款原因{{uniq}}","type":1,"sort":99,"enabled":true}`,
		capture: "refund_reason",
	},
	{
		name: "物流-运费试算", method: http.MethodPost,
		path: "/api/v1/logistics/freight",
		body: `{"template_id":1,"amount_cents":9900,"region":"北京市 北京市 朝阳区","quantity":1}`,
	},
	{
		name: "后台-保存会员等级", method: http.MethodPost, admin: true,
		path:    "/api/v1/admin/user-levels",
		body:    `{"name":"巡检等级{{uniq}}","level":{{uniqN}},"min_growth":1000000,"max_growth":1999999,"discount_percent":88,"icon":"","description":"巡检创建","sort":99}`,
		capture: "user_level",
	},
	{
		name: "后台-回复商品问答", method: http.MethodPost, admin: true,
		path: "/api/v1/admin/questions/1/answer",
		body: `{"reply":"巡检回复：支持七天无理由退换。"}`,
	},
	{
		name: "后台-审核售后单", method: http.MethodPut, admin: true,
		path: "/api/v1/admin/after-sales/1/status",
		body: `{"status":1,"admin_remark":"巡检审核通过"}`,
		// 售后单状态机决定目标状态是否可流转。
		allowCodes: []int{5001},
	},
	{
		name: "后台-处理用户反馈", method: http.MethodPut, admin: true,
		path: "/api/v1/admin/feedbacks/1/status",
		body: `{"status":2,"reply":"巡检已处理"}`,
	},
}

// runExtensionSweep 巡检全部只读与写接口，确认网关路由、鉴权与下游服务都正常。
func runExtensionSweep(gateway string) {
	fmt.Println(">>> 全接口巡检 (", gateway, ")")

	client := &http.Client{Timeout: 15 * time.Second}

	// 本次巡检专属 token：带唯一键约束的写操作用它保证可重复执行。
	uniq := sweepToken()
	uniqN := sweepNumericToken()

	userToken := loginForSweep(client, gateway, "/api/v1/auth/login", "demo", "demo123456")
	if userToken == "" {
		record("用户登录", fmt.Errorf("登录失败"), "")
		return
	}
	record("用户登录", nil, "demo 用户令牌已获取")

	adminToken := loginForSweep(client, gateway, "/api/v1/admin/auth/login", "admin", "admin123456")
	if adminToken == "" {
		record("管理员登录", fmt.Errorf("登录失败"), "")
		return
	}
	record("管理员登录", nil, "admin 管理员令牌已获取")

	// 写接口先跑：部分读接口依赖写接口产出的数据（如盘点单详情依赖盘点单）。
	// 判定规则：
	//   - 业务码 0            → 通过
	//   - 业务码在 allowCodes → 警告（预期内业务拦截，不算失败）
	//   - 其它业务码          → 失败
	captured := map[string]string{}
	for _, c := range extWriteCases {
		runSweepCase(client, gateway, c, userToken, adminToken, uniq, uniqN, captured, "写-")
	}

	for _, c := range extWriteCases2 {
		runSweepCase(client, gateway, c, userToken, adminToken, uniq, uniqN, captured, "写-")
	}

	for _, c := range extCases {
		runSweepCase(client, gateway, c, userToken, adminToken, uniq, uniqN, captured, "")
	}

	for _, c := range extReadCases2 {
		runSweepCase(client, gateway, c, userToken, adminToken, uniq, uniqN, captured, "")
	}

	// 内部接口必须被网关拒绝，防止库存被公网直接扣减。
	internalDenied := probeInternalDenied(client, gateway, userToken)
	record("内部库存接口拒绝公网访问", internalDenied, "")

	// 认证链：注册 → 登录 → 刷新 → 改密 → 微信登录 → 禁用 → 登出。
	runAuthChain(client, gateway, uniq)
}

// runSweepCase 执行单个巡检用例，处理占位符替换、ID 捕获与结果判定。
func runSweepCase(client *http.Client, gateway string, c extCase,
	userToken, adminToken, uniq, uniqN string, captured map[string]string, prefix string) {

	token := userToken
	if c.admin {
		token = adminToken
	}

	body := strings.ReplaceAll(c.body, "{{uniq}}", uniq)
	body = strings.ReplaceAll(body, "{{uniqN}}", uniqN)

	if c.sleepBefore > 0 {
		time.Sleep(c.sleepBefore)
	}

	// 执行前轮询等待异步状态就绪（例如支付 Mock 通道自动结算完成）。
	if c.waitPath != "" && c.waitField != "" {
		wait := c.waitPath
		for key, value := range captured {
			wait = strings.ReplaceAll(wait, "{"+key+"}", value)
		}
		if c.idFrom != "" {
			wait = strings.ReplaceAll(wait, "{"+c.idFrom+"}", captured[c.idFrom])
		}
		if err := waitUntilValue(client, gateway, wait, token, c.waitField, c.waitValue, 15*time.Second); err != nil {
			record(prefix+c.name, err, "")
			return
		}
	}

	path := c.path
	// 盘点单详情/明细依赖真实存在的盘点单，先取一个 id 替换路径。
	if strings.Contains(path, "{stock_check_id}") {
		id := firstStockCheckID(client, gateway, adminToken)
		if id == 0 {
			record(prefix+c.name, fmt.Errorf("没有可用的盘点单"), "")
			return
		}
		path = strings.ReplaceAll(path, "{stock_check_id}", fmt.Sprintf("%d", id))
	}
	// 链式用例：校验前置捕获是否存在，并把捕获到的值同时替换进路径与请求体。
	// 路径与请求体都会被替换，因为部分更新接口把主键放在请求体里。
	if c.idFrom != "" {
		if id, ok := captured[c.idFrom]; !ok || id == "" {
			record(prefix+c.name, fmt.Errorf("前置用例 %s 未捕获到 id", c.idFrom), "")
			return
		}
	}
	for key, value := range captured {
		path = strings.ReplaceAll(path, "{"+key+"}", value)
		body = strings.ReplaceAll(body, "{"+key+"}", value)
	}
	// {auto:键名} 从种子数据里取真实主键，用于依赖既有数据的只读用例。
	if strings.Contains(path, "{auto:") {
		path = replaceAutoIDs(client, gateway, path, userToken, adminToken)
	}

	// 内部接口：断言网关必须拒绝。
	if c.expectDenied {
		if err := probePathDenied(client, gateway, c.method, path, c.body, token); err != nil {
			record(prefix+c.name, err, "")
		} else {
			record(prefix+c.name, nil, "已按预期拒绝公网访问")
		}
		return
	}

	code, msg, data, err := probeEnvelopeData(client, gateway, c.method, path, body, token)
	switch {
	case err != nil:
		record(prefix+c.name, err, "")
	case code == 0:
		if c.capture != "" {
			for _, spec := range strings.Split(c.capture, ",") {
				spec = strings.TrimSpace(spec)
				if spec == "" {
					continue
				}
				key, field := spec, "id"
				if idx := strings.Index(spec, "="); idx >= 0 {
					key, field = spec[:idx], spec[idx+1:]
				}
				v := pickPath(data, field)
				if v == "" {
					record(prefix+c.name, fmt.Errorf("未从响应中捕获到字段 %s", field), "")
					return
				}
				captured[key] = v
			}
		}
		record(prefix+c.name, nil, truncate(msg, 60))
	case c.allows(code):
		recordWarn(prefix+c.name, fmt.Sprintf("预期内业务拦截 code=%d %s", code, truncate(msg, 40)))
	default:
		record(prefix+c.name, fmt.Errorf("code=%d %s", code, msg), "")
	}
}

// autoIDSources 声明可从种子数据中提取真实主键的列表接口。
// 巡检只读用例通过 {auto:键名} 引用这些主键，避免写死会随数据变化而失效的 id。
var autoIDSources = map[string]struct {
	path  string
	field string
	admin bool
}{
	"orders":        {path: "/api/v1/orders?page.page=1&page.page_size=1", field: "id"},
	"after_sales":   {path: "/api/v1/after-sales?page.page=1&page.page_size=1", field: "id"},
	"addresses":     {path: "/api/v1/users/addresses", field: "id"},
	"help":          {path: "/api/v1/help/articles?page.page=1&page.page_size=1", field: "id"},
	"reviews":       {path: "/api/v1/reviews?page.page=1&page.page_size=1", field: "id"},
	"coupons":       {path: "/api/v1/coupons?page.page=1&page.page_size=1", field: "id"},
	"sku":           {path: "/api/v1/admin/inventory?page.page=1&page.page_size=1", field: "sku_id", admin: true},
	"refunds":       {path: "/api/v1/admin/refunds?page.page=1&page.page_size=5", field: "id", admin: true},
	"payment":       {path: "/api/v1/admin/payments?page.page=1&page.page_size=1", field: "id", admin: true},
	"invoices":      {path: "/api/v1/admin/invoices?page.page=1&page.page_size=1", field: "id", admin: true},
	"notifications": {path: "/api/v1/notifications?page.page=1&page.page_size=5", field: "id"},
	"tracking":      {path: "/api/v1/admin/shipments?page.page=1&page.page_size=1", field: "tracking_no", admin: true},
}

// replaceAutoIDs 把路径中的 {auto:键名} 替换为对应列表首条记录的真实主键。
func replaceAutoIDs(client *http.Client, gateway, path, userToken, adminToken string) string {
	for key, src := range autoIDSources {
		placeholder := "{auto:" + key + "}"
		if !strings.Contains(path, placeholder) {
			continue
		}
		token := userToken
		if src.admin {
			token = adminToken
		}
		value := firstListField(client, gateway, src.path, token, src.field)
		if value == "" {
			// 取不到时保留占位符，请求会得到 404，从而让用例明确失败而不是静默跳过。
			continue
		}
		path = strings.ReplaceAll(path, placeholder, value)
	}
	return path
}

// firstListField 读取列表接口，取首条记录的指定字段值。
func firstListField(client *http.Client, gateway, path, token, field string) string {
	var resp struct {
		Code int            `json:"code"`
		Data map[string]any `json:"data"`
	}
	getJSON(client, gateway+path, token, &resp)
	if resp.Code != 0 {
		return ""
	}
	for _, v := range resp.Data {
		list, ok := v.([]any)
		if !ok || len(list) == 0 {
			continue
		}
		item, ok := list[0].(map[string]any)
		if !ok {
			continue
		}
		return pickID(item, field)
	}
	return ""
}

// waitUntilValue 轮询接口直到指定字段等于目标值，超时返回错误。
func waitUntilValue(client *http.Client, gateway, path, token, field, want string, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	var last string
	for time.Now().Before(deadline) {
		var resp struct {
			Code int            `json:"code"`
			Data map[string]any `json:"data"`
		}
		getJSON(client, gateway+path, token, &resp)
		if resp.Code == 0 {
			last = pickPath(resp.Data, field)
			if last == want {
				return nil
			}
		}
		time.Sleep(400 * time.Millisecond)
	}
	return fmt.Errorf("等待 %s=%s 超时，实际=%s", field, want, last)
}

// probePathDenied 断言请求被网关拒绝（403）。
func probePathDenied(client *http.Client, gateway, method, path, body, token string) error {
	var req *http.Request
	var err error
	if body != "" && (method == http.MethodPost || method == http.MethodPut) {
		req, err = http.NewRequest(method, gateway+path, bytesReader(body))
	} else {
		req, err = http.NewRequest(method, gateway+path, nil)
	}
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer func() { _ = resp.Body.Close() }()
	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode == http.StatusForbidden {
		return nil
	}
	return fmt.Errorf("期望 403，实际 %d: %s", resp.StatusCode, truncate(string(raw), 120))
}

// pickPath 从响应 data 中按点号路径取值，例如 "items.0.id"。
func pickPath(data map[string]any, path string) string {
	if data == nil {
		return ""
	}
	var cur any = data
	for _, seg := range strings.Split(path, ".") {
		switch node := cur.(type) {
		case map[string]any:
			v, ok := node[seg]
			if !ok {
				return ""
			}
			cur = v
		case []any:
			idx, err := strconv.Atoi(seg)
			if err != nil || idx < 0 || idx >= len(node) {
				return ""
			}
			cur = node[idx]
		default:
			return ""
		}
	}
	return pickID(map[string]any{"v": cur}, "v")
}

// pickID 从响应 data 中取出指定字段的字符串值。
func pickID(data map[string]any, field string) string {
	if data == nil {
		return ""
	}
	v, ok := data[field]
	if !ok {
		return ""
	}
	switch t := v.(type) {
	case string:
		return t
	case float64:
		return strconv.FormatInt(int64(t), 10)
	case json.Number:
		return t.String()
	}
	return ""
}

// sweepToken 生成本次巡检专属的短 token，用于带唯一键约束的写操作。
func sweepToken() string {
	return strconv.FormatInt(time.Now().UnixNano()%1_000_000_000, 36)
}

// sweepNumericToken 生成本次巡检专属的纯数字 token，用于数值型唯一键。
func sweepNumericToken() string {
	return strconv.FormatInt(time.Now().UnixNano()%900_000+100_000, 10)
}

// firstStockCheckID 取第一个盘点单的 id，用于详情与明细巡检。
func firstStockCheckID(client *http.Client, gateway, adminToken string) int64 {
	var resp struct {
		Code int `json:"code"`
		Data struct {
			StockChecks []struct {
				Id int64 `json:"id"`
			} `json:"stock_checks"`
		} `json:"data"`
	}
	getJSON(client, gateway+"/api/v1/admin/stock-checks?page.page=1&page.page_size=1", adminToken, &resp)
	if resp.Code != 0 || len(resp.Data.StockChecks) == 0 {
		return 0
	}
	return resp.Data.StockChecks[0].Id
}

// probeInternalDenied 校验 /api/v1/inventory/** 在网关侧被拒绝。
func probeInternalDenied(client *http.Client, gateway, token string) error {
	req, err := http.NewRequest(http.MethodPost, gateway+"/api/v1/inventory/deduct",
		bytesReader(`{"sku_id":1,"quantity":999999}`))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer func() { _ = resp.Body.Close() }()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode == http.StatusForbidden {
		return nil
	}
	return fmt.Errorf("期望 403，实际 %d: %s", resp.StatusCode, truncate(string(body), 120))
}

// bytesReader 构造请求体。
func bytesReader(s string) *bytes.Reader {
	return bytes.NewReader([]byte(s))
}

// loginForSweep 登录并返回访问令牌。
func loginForSweep(client *http.Client, gateway, path, username, password string) string {
	for attempt := 0; attempt < 3; attempt++ {
		var resp struct {
			Code int `json:"code"`
			Data struct {
				AccessToken string `json:"access_token"`
			} `json:"data"`
		}
		postJSON(client, gateway+path,
			map[string]string{"username": username, "password": password}, &resp)
		if resp.Code == 0 {
			return resp.Data.AccessToken
		}
		if resp.Code != errs.CodeTooManyReq {
			return ""
		}
		recordWarn("网关限流等待", fmt.Sprintf("登录命中限流，等待 %d 秒后重试", rateLimitWaitSeconds))
		time.Sleep(rateLimitWaitSeconds * time.Second)
	}
	return ""
}

// probeEnvelope 请求接口并解析统一信封，返回业务码与摘要信息。
func probeEnvelope(client *http.Client, gateway, method, path, body, token string) (int, string, error) {
	code, msg, _, err := probeEnvelopeData(client, gateway, method, path, body, token)
	return code, msg, err
}

// probeEnvelopeData 请求接口并解析统一信封，同时返回 data 字段内容。
//
// 命中网关限流（业务码 1006）时会等待限流窗口重置后重试：
// 巡检一轮会产生两百余次请求，网关按 IP 限制每分钟 600 次，
// 连续执行多轮必然触顶。此时等待窗口过去即可，不应把限流误判成接口故障。
func probeEnvelopeData(client *http.Client, gateway, method, path, body, token string) (int, string, map[string]any, error) {
	for attempt := 0; attempt < 3; attempt++ {
		code, msg, data, err := probeEnvelopeOnce(client, gateway, method, path, body, token)
		if err != nil {
			return code, msg, data, err
		}
		if code != errs.CodeTooManyReq {
			return code, msg, data, nil
		}
		recordWarn("网关限流等待", fmt.Sprintf("命中限流，等待 %d 秒后重试", rateLimitWaitSeconds))
		time.Sleep(rateLimitWaitSeconds * time.Second)
	}
	return 0, "ok", nil, fmt.Errorf("连续 %d 次命中网关限流", 3)
}

// rateLimitWaitSeconds 是命中限流后的等待秒数。
// 网关限流窗口为 1 分钟并返回 Retry-After: 60，这里留 1 秒余量。
const rateLimitWaitSeconds = 61

// probeEnvelopeOnce 执行单次请求并解析统一信封。
func probeEnvelopeOnce(client *http.Client, gateway, method, path, body, token string) (int, string, map[string]any, error) {
	var resp struct {
		Code    int            `json:"code"`
		Message string         `json:"message"`
		Data    map[string]any `json:"data"`
	}
	switch {
	case body != "" && (method == http.MethodPost || method == http.MethodPut || method == http.MethodPatch):
		sendJSON(client, method, gateway+path, json.RawMessage(body), &resp, token)
	case method == http.MethodDelete:
		deleteJSON(client, gateway+path, &resp, token)
	default:
		getJSON(client, gateway+path, token, &resp)
	}
	if resp.Message == "" {
		resp.Message = "ok"
	}
	return resp.Code, resp.Message, resp.Data, nil
}
