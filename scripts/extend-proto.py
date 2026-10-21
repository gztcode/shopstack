#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ShopStack 契约扩展脚本（一次性迁移工具）

用途：把 4 个前端端扩到「每端 80~100 页」所需的新接口一次性写进 proto 契约。
做法：
  1. 给现有请求消息追加筛选字段（不改动已有字段编号，保证向后兼容）
  2. 在各 service 块内插入新 rpc（带 google.api.http 注解）
  3. 在文件末尾追加新消息定义

执行：python3 scripts/extend-proto.py
幂等：已存在的内容会被跳过，可重复执行。
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROTO = os.path.join(ROOT, 'proto', 'shopstack')

# ---------------------------------------------------------------------------
# 1. 现有消息追加字段：文件 -> 消息名 -> [(字段名, 类型, 编号, 注释)]
# ---------------------------------------------------------------------------
EXTRA_FIELDS = {
    'product/v1/product.proto': {
        'ListProductsRequest': [
            ('channel_id', 'int64', 10, '频道 ID，用于首页频道页筛选'),
            ('sale_type', 'int32', 11, '售卖类型：0 全部 1 现货 2 预售 3 跨境 4 进口'),
        ],
        'ListReviewsRequest': [
            ('filter', 'int32', 10, '筛选：0 全部 1 有图 2 好评 3 中差评'),
            ('sku_id', 'int64', 11, '按 SKU 筛选'),
        ],
    },
    'marketing/v1/marketing.proto': {
        'ListPromotionsRequest': [
            ('product_id', 'int64', 10, '按商品筛选活动'),
            ('promotion_type', 'int32', 11, '活动类型：1 满减 2 折扣 3 秒杀 4 拼团 5 新品首发 6 会员专享'),
        ],
        'ListCouponsRequest': [
            ('min_amount_cents', 'int64', 10, '按使用门槛筛选'),
            ('coupon_category', 'int32', 11, '券分类：0 全部 1 临期 2 品类券 3 通用券'),
        ],
    },
    'order/v1/order.proto': {
        'ListOrdersRequest': [
            ('payment_method', 'int32', 10, '支付方式筛选'),
            ('refund_status', 'int32', 11, '退款状态筛选'),
        ],
    },
    'notification/v1/notification.proto': {
        'ListNotificationsRequest': [
            ('category', 'int32', 10, '消息分类筛选'),
        ],
    },
    'user/v1/user.proto': {
        'User': [
            ('level', 'int32', 15, '会员等级'),
            ('growth', 'int32', 16, '成长值'),
            ('real_name', 'string', 17, '实名姓名'),
            ('realname_status', 'int32', 18, '实名状态：0 未认证 1 已认证 2 审核中'),
        ],
        'AdminListUsersRequest': [
            ('level', 'int32', 10, '按会员等级筛选'),
        ],
    },
}

# ---------------------------------------------------------------------------
# 2. 新增消息定义：文件 -> 原始 proto 文本
# ---------------------------------------------------------------------------
EXTRA_MESSAGES = {}

EXTRA_MESSAGES['product/v1/product.proto'] = '''
// ---------------------------------------------------------------------------
// 频道 / 楼层
// ---------------------------------------------------------------------------

message Channel {
  int64 id = 1;
  string name = 2;
  string code = 3;
  string icon = 4;
  string banner_url = 5;
  string description = 6;
  int32 sort = 7;
  int32 type = 8;   // 1 推荐 2 新品 3 热销 4 限时 5 预售 6 清仓 7 包邮 8 跨境 9 楼层
  int32 status = 9; // 0 停用 1 启用
  int32 product_count = 10;
  google.protobuf.Timestamp created_at = 11;
}

message ListChannelsRequest {
  shopstack.common.v1.PageRequest page = 1;
  string keyword = 2;
  int32 type = 3;
}

message ListChannelsResponse {
  repeated Channel channels = 1;
  shopstack.common.v1.PageMeta meta = 2;
}

message GetChannelRequest {
  int64 id = 1;
}

message ListChannelProductsRequest {
  int64 channel_id = 1;
  shopstack.common.v1.PageRequest page = 2;
  string keyword = 3;
  string sort = 4; // default | sales | price_asc | price_desc | newest
}

message ListChannelProductsResponse {
  Channel channel = 1;
  repeated Product products = 2;
  shopstack.common.v1.PageMeta meta = 3;
}

message SaveChannelRequest {
  int64 id = 1;
  string name = 2;
  string code = 3;
  string icon = 4;
  string banner_url = 5;
  string description = 6;
  int32 sort = 7;
  int32 type = 8;
  int32 status = 9;
}

message DeleteChannelRequest {
  int64 id = 1;
}

// ---------------------------------------------------------------------------
// 评价标签
// ---------------------------------------------------------------------------

message ReviewTag {
  int64 id = 1;
  string name = 2;
  int32 sort = 3;
  bool enabled = 4;
}

message ListReviewTagsRequest {
  shopstack.common.v1.PageRequest page = 1;
  string keyword = 2;
}

message ListReviewTagsResponse {
  repeated ReviewTag tags = 1;
  shopstack.common.v1.PageMeta meta = 2;
}

message SaveReviewTagRequest {
  int64 id = 1;
  string name = 2;
  int32 sort = 3;
  bool enabled = 4;
}

message DeleteReviewTagRequest {
  int64 id = 1;
}

// ---------------------------------------------------------------------------
// 商品保障项
// ---------------------------------------------------------------------------

message Guarantee {
  int64 id = 1;
  string name = 2;
  string icon = 3;
  string description = 4;
  int32 sort = 5;
  bool enabled = 6;
}

message ListGuaranteesRequest {
  shopstack.common.v1.PageRequest page = 1;
}

message ListGuaranteesResponse {
  repeated Guarantee guarantees = 1;
  shopstack.common.v1.PageMeta meta = 2;
}

message SaveGuaranteeRequest {
  int64 id = 1;
  string name = 2;
  string icon = 3;
  string description = 4;
  int32 sort = 5;
  bool enabled = 6;
}

message DeleteGuaranteeRequest {
  int64 id = 1;
}

// ---------------------------------------------------------------------------
// 商品参数
// ---------------------------------------------------------------------------

message ListProductParamsRequest {
  int64 product_id = 1;
}

message ListProductParamsResponse {
  repeated ProductAttribute params = 1;
}

// ---------------------------------------------------------------------------
// 商品问答
// ---------------------------------------------------------------------------

message ProductQuestion {
  int64 id = 1;
  int64 product_id = 2;
  string product_title = 3;
  int64 user_id = 4;
  string user_nickname = 5;
  string content = 6;
  repeated string images = 7;
  string reply = 8;
  string reply_at = 9;
  google.protobuf.Timestamp created_at = 10;
}

message ListProductQuestionsRequest {
  int64 product_id = 1;
  shopstack.common.v1.PageRequest page = 2;
}

message ListProductQuestionsResponse {
  repeated ProductQuestion questions = 1;
  shopstack.common.v1.PageMeta meta = 2;
}

message CreateQuestionRequest {
  int64 product_id = 1;
  string content = 2;
  repeated string images = 3;
}

message AnswerQuestionRequest {
  int64 id = 1;
  string reply = 2;
}

message ListQuestionsRequest {
  shopstack.common.v1.PageRequest page = 1;
  string keyword = 2;
  int64 product_id = 3;
}

message ListQuestionsResponse {
  repeated ProductQuestion questions = 1;
  shopstack.common.v1.PageMeta meta = 2;
}
'''

EXTRA_MESSAGES['marketing/v1/marketing.proto'] = '''
// ---------------------------------------------------------------------------
// 签到
// ---------------------------------------------------------------------------

message SignInRequest {}

message SignInCalendarDay {
  string date = 1;
  bool signed = 2;
  int32 points = 3;
}

message GetSignInStatusRequest {}

message GetSignInStatusResponse {
  bool signed_today = 1;
  int32 continuous_days = 2;
  int32 total_days = 3;
  int32 points_awarded = 4;
  int32 next_points = 5;
  repeated SignInCalendarDay calendar = 6;
}

// ---------------------------------------------------------------------------
// 任务中心
// ---------------------------------------------------------------------------

message MarketingTask {
  int64 id = 1;
  string name = 2;
  string description = 3;
  int32 type = 4;   // 1 浏览 2 下单 3 分享 4 评价 5 签到 6 邀请
  int32 target_count = 5;
  int32 reward_points = 6;
  int64 reward_coupon_id = 7;
  int32 sort = 8;
  bool enabled = 9;
  string icon = 10;
}

message UserTask {
  int64 task_id = 1;
  string name = 2;
  string description = 3;
  int32 type = 4;
  int32 progress = 5;
  int32 target_count = 6;
  bool completed = 7;
  bool claimed = 8;
  int32 reward_points = 9;
  int64 reward_coupon_id = 10;
  string icon = 11;
}

message ListTasksRequest {
  shopstack.common.v1.PageRequest page = 1;
}

message ListTasksResponse {
  repeated UserTask tasks = 1;
  shopstack.common.v1.PageMeta meta = 2;
}

message ClaimTaskRequest {
  int64 task_id = 1;
}

// ---------------------------------------------------------------------------
// 活动详情 / 场次
// ---------------------------------------------------------------------------

// PromotionProduct 是营销域内嵌的商品摘要，避免跨域依赖商品域消息。
message PromotionProduct {
  int64 id = 1;
  string title = 2;
  string image = 3;
  int64 min_price_cents = 4;
  int64 max_price_cents = 5;
  int32 stock_total = 6;
  int32 sales = 7;
  int32 status = 8;
}

message GetPromotionRequest {
  int64 id = 1;
}

message GetPromotionResponse {
  Promotion promotion = 1;
  repeated PromotionProduct products = 2;
  repeated PromotionSession sessions = 3;
}

message ListPromotionProductsRequest {
  int64 promotion_id = 1;
  shopstack.common.v1.PageRequest page = 2;
}

message ListPromotionProductsResponse {
  repeated PromotionProduct products = 1;
  shopstack.common.v1.PageMeta meta = 2;
}

message PromotionSession {
  int64 id = 1;
  int64 promotion_id = 2;
  string name = 3;
  int64 start_time = 4; // unix 秒
  int64 end_time = 5;   // unix 秒
  int32 stock = 6;
  int32 sold_count = 7;
  int32 status = 8; // 0 未开始 1 进行中 2 已结束
}

message ListPromotionSessionsRequest {
  int64 promotion_id = 1;
  shopstack.common.v1.PageRequest page = 2;
}

message ListPromotionSessionsResponse {
  repeated PromotionSession sessions = 1;
  shopstack.common.v1.PageMeta meta = 2;
}

message SavePromotionSessionRequest {
  int64 id = 1;
  int64 promotion_id = 2;
  string name = 3;
  int64 start_time = 4;
  int64 end_time = 5;
  int32 stock = 6;
}

// ---------------------------------------------------------------------------
// 拼团
// ---------------------------------------------------------------------------

message GroupBuy {
  int64 id = 1;
  string name = 2;
  string description = 3;
  int64 promotion_id = 4;
  int64 product_id = 5;
  string product_title = 6;
  string product_image = 7;
  int64 price_cents = 8;
  int64 original_price_cents = 9;
  int32 required_members = 10;
  int32 joined_members = 11;
  int32 group_size = 12;
  int32 status = 13; // 0 未开始 1 进行中 2 已结束 3 已下线
  int64 start_time = 14;
  int64 end_time = 15;
  string banner_image = 16;
}

message GroupBuyMember {
  int64 id = 1;
  int64 group_buy_id = 2;
  int64 user_id = 3;
  string user_nickname = 4;
  google.protobuf.Timestamp joined_at = 5;
}

message ListGroupBuysRequest {
  shopstack.common.v1.PageRequest page = 1;
  string keyword = 2;
  int32 status = 3;
}

message ListGroupBuysResponse {
  repeated GroupBuy group_buys = 1;
  shopstack.common.v1.PageMeta meta = 2;
}

message GetGroupBuyRequest {
  int64 id = 1;
}

message GetGroupBuyResponse {
  GroupBuy group_buy = 1;
  repeated GroupBuyMember members = 2;
}

message JoinGroupBuyRequest {
  int64 id = 1;
  int32 quantity = 2;
}

message SaveGroupBuyRequest {
  int64 id = 1;
  string name = 2;
  string description = 3;
  int64 promotion_id = 4;
  int64 product_id = 5;
  int64 price_cents = 6;
  int32 required_members = 7;
  int64 start_time = 8;
  int64 end_time = 9;
  string banner_image = 10;
}

// ---------------------------------------------------------------------------
// 会员等级说明
// ---------------------------------------------------------------------------

message MarketingUserLevel {
  int64 id = 1;
  string name = 2;
  int32 level = 3;
  int32 min_growth = 4;
  int32 max_growth = 5;
  int32 discount_percent = 6;
  string icon = 7;
  string description = 8;
  repeated string benefits = 9;
  int32 sort = 10;
}

message ListUserLevelsRequest {}

message ListUserLevelsResponse {
  repeated MarketingUserLevel levels = 1;
}
'''

EXTRA_MESSAGES['user/v1/user.proto'] = '''
// ---------------------------------------------------------------------------
// 会员等级与成长值
// ---------------------------------------------------------------------------

message UserLevel {
  int64 id = 1;
  string name = 2;
  int32 level = 3;
  int32 min_growth = 4;
  int32 max_growth = 5;
  int32 discount_percent = 6; // 折扣百分比，100 表示无折扣
  string icon = 7;
  string description = 8;
  repeated string benefits = 9;
  int32 sort = 10;
}

message GetUserLevelRequest {
  int64 user_id = 1;
}

message UserLevelInfo {
  int32 level = 1;
  string level_name = 2;
  int32 growth = 3;
  int32 current_min_growth = 4;
  int32 next_min_growth = 5;
  int32 growth_to_next = 6;
  int32 discount_percent = 7;
  string next_level_name = 8;
  repeated UserLevel levels = 9;
}

message ListUserLevelsRequest {}

message ListUserLevelsResponse {
  repeated UserLevel levels = 1;
}

message ListGrowthLogsRequest {
  int64 user_id = 1;
  shopstack.common.v1.PageRequest page = 2;
}

message GrowthLog {
  int64 id = 1;
  int64 user_id = 2;
  int32 change = 3;
  int32 balance = 4;
  string title = 5;
  string biz_type = 6;
  google.protobuf.Timestamp created_at = 7;
}

message ListGrowthLogsResponse {
  repeated GrowthLog logs = 1;
  shopstack.common.v1.PageMeta meta = 2;
  int32 current_growth = 3;
}

message SaveUserLevelRequest {
  int64 id = 1;
  string name = 2;
  int32 level = 3;
  int32 min_growth = 4;
  int32 max_growth = 5;
  int32 discount_percent = 6;
  string icon = 7;
  string description = 8;
  repeated string benefits = 9;
  int32 sort = 10;
}

// ---------------------------------------------------------------------------
// 行政区域
// ---------------------------------------------------------------------------

message Region {
  int64 id = 1;
  int64 parent_id = 2;
  string name = 3;
  string code = 4;
  int32 level = 5; // 1 省 2 市 3 区
  int32 sort = 6;
}

message ListRegionsRequest {
  int64 parent_id = 1;
  bool tree = 2;
}

message ListRegionsResponse {
  repeated Region regions = 1;
}

// ---------------------------------------------------------------------------
// 发票抬头模板
// ---------------------------------------------------------------------------

message InvoiceTemplate {
  int64 id = 1;
  int64 user_id = 2;
  string title = 3;
  string tax_no = 4;
  string type = 5; // personal | company
  string email = 6;
  string phone = 7;
  string address = 8;
  string bank_name = 9;
  string bank_account = 10;
  bool is_default = 11;
  google.protobuf.Timestamp created_at = 12;
}

message ListInvoiceTemplatesRequest {
  int64 user_id = 1;
}

message ListInvoiceTemplatesResponse {
  repeated InvoiceTemplate templates = 1;
}

message SaveInvoiceTemplateRequest {
  int64 id = 1;
  string title = 2;
  string tax_no = 3;
  string type = 4;
  string email = 5;
  string phone = 6;
  string address = 7;
  string bank_name = 8;
  string bank_account = 9;
  bool is_default = 10;
}

message DeleteInvoiceTemplateRequest {
  int64 id = 1;
}

// ---------------------------------------------------------------------------
// 通知订阅偏好
// ---------------------------------------------------------------------------

message UserNotificationSettings {
  int64 user_id = 1;
  bool order_notice = 2;
  bool logistics_notice = 3;
  bool marketing_notice = 4;
  bool system_notice = 5;
  bool sms_notice = 6;
  bool email_notice = 7;
  bool wechat_notice = 8;
}

message GetNotificationSettingsRequest {
  int64 user_id = 1;
}

message UpdateNotificationSettingsRequest {
  int64 user_id = 1;
  bool order_notice = 2;
  bool logistics_notice = 3;
  bool marketing_notice = 4;
  bool system_notice = 5;
  bool sms_notice = 6;
  bool email_notice = 7;
  bool wechat_notice = 8;
}

// ---------------------------------------------------------------------------
// 账号安全
// ---------------------------------------------------------------------------

message GetAccountSecurityRequest {
  int64 user_id = 1;
}

message AccountSecurityInfo {
  bool phone_bound = 1;
  bool email_bound = 2;
  bool wechat_bound = 3;
  bool realname_verified = 4;
  int32 risk_level = 5; // 0 安全 1 中 2 高
  google.protobuf.Timestamp password_changed_at = 6;
  repeated string warnings = 7;
}

message RealNameAuthRequest {
  string real_name = 1;
  string id_card = 2;
}

// ---------------------------------------------------------------------------
// 意见反馈
// ---------------------------------------------------------------------------

message SubmitFeedbackRequest {
  int32 type = 1; // 1 功能建议 2 使用问题 3 投诉 4 其他
  string content = 2;
  repeated string images = 3;
  string contact = 4;
}

message Feedback {
  int64 id = 1;
  int64 user_id = 2;
  string user_nickname = 3;
  int32 type = 4;
  string content = 5;
  repeated string images = 6;
  string contact = 7;
  int32 status = 8; // 0 待处理 1 处理中 2 已处理 3 已关闭
  string reply = 9;
  google.protobuf.Timestamp created_at = 10;
  google.protobuf.Timestamp processed_at = 11;
}

message ListFeedbacksRequest {
  shopstack.common.v1.PageRequest page = 1;
  int32 status = 2;
  string keyword = 3;
}

message ListFeedbacksResponse {
  repeated Feedback feedbacks = 1;
  shopstack.common.v1.PageMeta meta = 2;
}

message SetFeedbackStatusRequest {
  int64 id = 1;
  int32 status = 2;
  string reply = 3;
}

// ---------------------------------------------------------------------------
// 帮助中心
// ---------------------------------------------------------------------------

message HelpArticle {
  int64 id = 1;
  int64 category_id = 2;
  string category_name = 3;
  string title = 4;
  string content = 5;
  int32 sort = 6;
  bool enabled = 7;
  int32 view_count = 8;
  google.protobuf.Timestamp created_at = 9;
}

message ListHelpArticlesRequest {
  int64 category_id = 1;
  shopstack.common.v1.PageRequest page = 2;
  string keyword = 3;
}

message ListHelpArticlesResponse {
  repeated HelpArticle articles = 1;
  shopstack.common.v1.PageMeta meta = 2;
}

message GetHelpArticleRequest {
  int64 id = 1;
}
'''

EXTRA_MESSAGES['order/v1/order.proto'] = '''
// ---------------------------------------------------------------------------
// 售后工单
// ---------------------------------------------------------------------------

message AfterSale {
  int64 id = 1;
  string after_sale_no = 2;
  int64 order_id = 3;
  string order_no = 4;
  int64 user_id = 5;
  string user_nickname = 6;
  int32 type = 7;      // 1 仅退款 2 退货退款 3 换货
  int64 amount_cents = 8;
  string reason = 9;
  string description = 10;
  repeated int64 item_ids = 11;
  int32 status = 12;   // 0 待审核 1 审核通过 2 审核驳回 3 已退款 4 已完成
  string admin_remark = 13;
  int64 refund_id = 14;
  google.protobuf.Timestamp created_at = 15;
  google.protobuf.Timestamp processed_at = 16;
}

message ListAfterSalesRequest {
  int64 user_id = 1;
  int32 status = 2;
  int32 type = 3;
  shopstack.common.v1.PageRequest page = 4;
}

message ListAfterSalesResponse {
  repeated AfterSale after_sales = 1;
  shopstack.common.v1.PageMeta meta = 2;
}

message GetAfterSaleRequest {
  int64 id = 1;
  int64 user_id = 2;
}

message AdminListAfterSalesRequest {
  shopstack.common.v1.PageRequest page = 1;
  int32 status = 2;
  int32 type = 3;
  string keyword = 4;
}

message SetAfterSaleStatusRequest {
  int64 id = 1;
  int32 status = 2;
  string admin_remark = 3;
}

// ---------------------------------------------------------------------------
// 退款原因
// ---------------------------------------------------------------------------

message RefundReason {
  int64 id = 1;
  string name = 2;
  int32 type = 3; // 1 仅退款 2 退货退款 3 换货
  int32 sort = 4;
  bool enabled = 5;
}

message ListRefundReasonsRequest {
  int32 type = 1;
}

message ListRefundReasonsResponse {
  repeated RefundReason reasons = 1;
}

message SaveRefundReasonRequest {
  int64 id = 1;
  string name = 2;
  int32 type = 3;
  int32 sort = 4;
  bool enabled = 5;
}

// ---------------------------------------------------------------------------
// 后台订单列表与多维统计
// ---------------------------------------------------------------------------

message AdminListOrdersRequest {
  shopstack.common.v1.PageRequest page = 1;
  string keyword = 2;
  int32 status = 3;
  int32 payment_method = 4;
  int64 user_id = 5;
  int64 start_time = 6;
  int64 end_time = 7;
}

message AdminOrderStatsByChannelResponse {
  repeated OrderChannelStat channel_stats = 1;
}

message OrderChannelStat {
  int32 channel = 1;
  string channel_name = 2;
  int64 order_count = 3;
  int64 amount_cents = 4;
}

message AdminOrderStatsByHourResponse {
  repeated OrderHourStat hour_stats = 1;
}

message OrderHourStat {
  int32 hour = 1;
  int64 order_count = 2;
  int64 amount_cents = 3;
}

message AdminOrderStatsByRegionResponse {
  repeated OrderRegionStat region_stats = 1;
}

message OrderRegionStat {
  string region = 1;
  int64 order_count = 2;
  int64 amount_cents = 3;
}
'''

EXTRA_MESSAGES['logistics/v1/logistics.proto'] = '''
// ---------------------------------------------------------------------------
// 快递公司 / 运费试算 / 配送范围
// ---------------------------------------------------------------------------

message LogisticsCompany {
  int64 id = 1;
  string name = 2;
  string code = 3;
  string logo = 4;
  string phone = 5;
  bool enabled = 6;
  int32 sort = 7;
  bool supports_cod = 8; // 是否支持货到付款
}

message ListLogisticsCompaniesRequest {
  shopstack.common.v1.PageRequest page = 1;
  string keyword = 2;
}

message ListLogisticsCompaniesResponse {
  repeated LogisticsCompany companies = 1;
  shopstack.common.v1.PageMeta meta = 2;
}

message SaveLogisticsCompanyRequest {
  int64 id = 1;
  string name = 2;
  string code = 3;
  string logo = 4;
  string phone = 5;
  bool enabled = 6;
  int32 sort = 7;
  bool supports_cod = 8;
}

message DeleteLogisticsCompanyRequest {
  int64 id = 1;
}

message CalculateFreightRequest {
  int64 template_id = 1;
  int64 amount_cents = 2;
  string region = 3;
  int32 quantity = 4;
}

message CalculateFreightResponse {
  int64 freight_cents = 1;
  int64 free_freight_amount_cents = 2;
  bool free = 3;
  string template_name = 4;
  string remark = 5;
}

message DeliveryRange {
  int64 id = 1;
  int64 template_id = 2;
  string template_name = 3;
  string regions = 4;
  int64 freight_cents = 5;
  int64 free_freight_amount_cents = 6;
  bool enabled = 7;
}

message ListDeliveryRangesRequest {
  int64 template_id = 1;
  shopstack.common.v1.PageRequest page = 2;
}

message ListDeliveryRangesResponse {
  repeated DeliveryRange ranges = 1;
  shopstack.common.v1.PageMeta meta = 2;
}

message SaveDeliveryRangeRequest {
  int64 id = 1;
  int64 template_id = 2;
  string regions = 3;
  int64 freight_cents = 4;
  int64 free_freight_amount_cents = 5;
  bool enabled = 6;
}

message GetShipmentByTrackingNoRequest {
  string tracking_no = 1;
}
'''

EXTRA_MESSAGES['inventory/v1/inventory.proto'] = '''
// ---------------------------------------------------------------------------
// 仓库 / 入库 / 出库 / 盘点
// ---------------------------------------------------------------------------

message Warehouse {
  int64 id = 1;
  string code = 2;
  string name = 3;
  string address = 4;
  string contact = 5;
  string phone = 6;
  bool enabled = 7;
  int32 sort = 8;
  google.protobuf.Timestamp created_at = 9;
}

message ListWarehousesRequest {
  shopstack.common.v1.PageRequest page = 1;
  string keyword = 2;
}

message ListWarehousesResponse {
  repeated Warehouse warehouses = 1;
  shopstack.common.v1.PageMeta meta = 2;
}

message SaveWarehouseRequest {
  int64 id = 1;
  string code = 2;
  string name = 3;
  string address = 4;
  string contact = 5;
  string phone = 6;
  bool enabled = 7;
  int32 sort = 8;
}

message DeleteWarehouseRequest {
  int64 id = 1;
}

message StockMoveItem {
  int64 sku_id = 1;
  string sku_code = 2;
  string spec_text = 3;
  int32 quantity = 4;
}

message InboundOrder {
  int64 id = 1;
  string inbound_no = 2;
  int64 warehouse_id = 3;
  string warehouse_name = 4;
  string supplier = 5;
  int32 status = 6; // 0 待入库 1 已入库 2 已取消
  int32 total_quantity = 7;
  string remark = 8;
  string operator = 9;
  repeated StockMoveItem items = 10;
  google.protobuf.Timestamp created_at = 11;
}

message ListInboundOrdersRequest {
  shopstack.common.v1.PageRequest page = 1;
  int32 status = 2;
  string keyword = 3;
}

message ListInboundOrdersResponse {
  repeated InboundOrder inbound_orders = 1;
  shopstack.common.v1.PageMeta meta = 2;
}

message CreateInboundOrderRequest {
  int64 warehouse_id = 1;
  string supplier = 2;
  string remark = 3;
  repeated StockMoveItem items = 4;
}

message OutboundOrder {
  int64 id = 1;
  string outbound_no = 2;
  int64 warehouse_id = 3;
  string warehouse_name = 4;
  int64 order_id = 5;
  string order_no = 6;
  int32 status = 7; // 0 待出库 1 已出库 2 已取消
  int32 total_quantity = 8;
  string remark = 9;
  string operator = 10;
  repeated StockMoveItem items = 11;
  google.protobuf.Timestamp created_at = 12;
}

message ListOutboundOrdersRequest {
  shopstack.common.v1.PageRequest page = 1;
  int32 status = 2;
  string keyword = 3;
}

message ListOutboundOrdersResponse {
  repeated OutboundOrder outbound_orders = 1;
  shopstack.common.v1.PageMeta meta = 2;
}

message CreateOutboundOrderRequest {
  int64 warehouse_id = 1;
  int64 order_id = 2;
  string remark = 3;
  repeated StockMoveItem items = 4;
}

message StockCheck {
  int64 id = 1;
  string check_no = 2;
  int64 warehouse_id = 3;
  string warehouse_name = 4;
  int32 status = 5; // 0 盘点中 1 已完成 2 已取消
  int32 total_count = 6;
  int32 diff_count = 7;
  string remark = 8;
  string operator = 9;
  google.protobuf.Timestamp created_at = 10;
}

message ListStockChecksRequest {
  shopstack.common.v1.PageRequest page = 1;
  int32 status = 2;
  string keyword = 3;
}

message ListStockChecksResponse {
  repeated StockCheck stock_checks = 1;
  shopstack.common.v1.PageMeta meta = 2;
}

message CreateStockCheckRequest {
  int64 warehouse_id = 1;
  string remark = 2;
  repeated StockMoveItem items = 3;
}

message GetStockCheckRequest {
  int64 id = 1;
}

message StockCheckItem {
  int64 id = 1;
  int64 stock_check_id = 2;
  int64 sku_id = 3;
  string sku_code = 4;
  string spec_text = 5;
  int32 book_quantity = 6; // 账面数量
  int32 actual_quantity = 7; // 实盘数量
  int32 diff_quantity = 8;
}

message StockCheckDetail {
  StockCheck stock_check = 1;
  repeated StockCheckItem items = 2;
}

message ListStockCheckItemsResponse {
  repeated StockCheckItem items = 1;
  shopstack.common.v1.PageMeta meta = 2;
}
'''

EXTRA_MESSAGES['payment/v1/payment.proto'] = '''
// ---------------------------------------------------------------------------
// 支付渠道 / 余额充值 / 余额流水
// ---------------------------------------------------------------------------

message PayChannel {
  int64 id = 1;
  string name = 2;
  int32 channel = 3; // 对应 common.PaymentChannel
  string code = 4;
  string icon = 5;
  bool enabled = 6;
  int32 sort = 7;
  string config = 8; // JSON 配置
  google.protobuf.Timestamp created_at = 9;
}

message ListPayChannelsRequest {
  shopstack.common.v1.PageRequest page = 1;
  int32 channel = 2;
}

message ListPayChannelsResponse {
  repeated PayChannel channels = 1;
  shopstack.common.v1.PageMeta meta = 2;
}

message SavePayChannelRequest {
  int64 id = 1;
  string name = 2;
  int32 channel = 3;
  string code = 4;
  string icon = 5;
  bool enabled = 6;
  int32 sort = 7;
  string config = 8;
}

message DeletePayChannelRequest {
  int64 id = 1;
}

message RechargeOrder {
  int64 id = 1;
  string recharge_no = 2;
  int64 user_id = 3;
  int64 amount_cents = 4;
  int64 bonus_cents = 5; // 赠送金额
  int32 status = 6;      // 0 待支付 1 已支付 2 已取消
  int32 channel = 7;
  string payment_no = 8;
  google.protobuf.Timestamp paid_at = 9;
  google.protobuf.Timestamp created_at = 10;
}

message CreateRechargeRequest {
  int64 amount_cents = 1;
  int32 channel = 2;
}

message ListRechargesRequest {
  int64 user_id = 1;
  shopstack.common.v1.PageRequest page = 2;
  int32 status = 3;
}

message ListRechargesResponse {
  repeated RechargeOrder recharges = 1;
  shopstack.common.v1.PageMeta meta = 2;
}

message BalanceLog {
  int64 id = 1;
  int64 user_id = 2;
  int64 change = 3;
  int64 balance = 4;
  string title = 5;
  string biz_type = 6;
  google.protobuf.Timestamp created_at = 7;
}

message ListBalanceLogsRequest {
  int64 user_id = 1;
  shopstack.common.v1.PageRequest page = 2;
}

message ListBalanceLogsResponse {
  repeated BalanceLog logs = 1;
  shopstack.common.v1.PageMeta meta = 2;
  int64 current_balance = 3;
}

message GetRechargeConfigRequest {}

message RechargeConfig {
  int64 min_amount_cents = 1;
  int64 max_amount_cents = 2;
  repeated int64 preset_amounts = 3;
  int64 register_bonus_cents = 4;
  string first_recharge_bonus_desc = 5;
}
'''

EXTRA_MESSAGES['notification/v1/notification.proto'] = '''
// ---------------------------------------------------------------------------
// 通知模板 / 短信模板 / 敏感词 / 消息分类
// ---------------------------------------------------------------------------

message NotificationTemplate {
  int64 id = 1;
  string code = 2;
  string name = 3;
  int32 type = 4;
  string title = 5;
  string content = 6;
  string link = 7;
  bool enabled = 8;
  google.protobuf.Timestamp updated_at = 9;
}

message ListNotificationTemplatesRequest {
  shopstack.common.v1.PageRequest page = 1;
  int32 type = 2;
  string keyword = 3;
}

message ListNotificationTemplatesResponse {
  repeated NotificationTemplate templates = 1;
  shopstack.common.v1.PageMeta meta = 2;
}

message SaveNotificationTemplateRequest {
  int64 id = 1;
  string code = 2;
  string name = 3;
  int32 type = 4;
  string title = 5;
  string content = 6;
  string link = 7;
  bool enabled = 8;
}

message DeleteNotificationTemplateRequest {
  int64 id = 1;
}

message SmsTemplate {
  int64 id = 1;
  string code = 2;
  string name = 3;
  string content = 4;
  bool enabled = 5;
  google.protobuf.Timestamp updated_at = 6;
}

message ListSmsTemplatesRequest {
  shopstack.common.v1.PageRequest page = 1;
  string keyword = 2;
}

message ListSmsTemplatesResponse {
  repeated SmsTemplate templates = 1;
  shopstack.common.v1.PageMeta meta = 2;
}

message SaveSmsTemplateRequest {
  int64 id = 1;
  string code = 2;
  string name = 3;
  string content = 4;
  bool enabled = 5;
}

message DeleteSmsTemplateRequest {
  int64 id = 1;
}

message SensitiveWord {
  int64 id = 1;
  string word = 2;
  int32 category = 3; // 1 违规词 2 辱骂 3 广告 4 其他
  int32 status = 4;   // 0 停用 1 启用
  google.protobuf.Timestamp created_at = 5;
}

message ListSensitiveWordsRequest {
  shopstack.common.v1.PageRequest page = 1;
  string keyword = 2;
  int32 category = 3;
}

message ListSensitiveWordsResponse {
  repeated SensitiveWord words = 1;
  shopstack.common.v1.PageMeta meta = 2;
}

message SaveSensitiveWordRequest {
  int64 id = 1;
  string word = 2;
  int32 category = 3;
  int32 status = 4;
}

message DeleteSensitiveWordRequest {
  int64 id = 1;
}

message NotificationCategory {
  int32 type = 1;
  string name = 2;
  string icon = 3;
  int32 count = 4;
  int32 unread_count = 5;
}

message ListNotificationCategoriesRequest {
  int64 user_id = 1;
}

message ListNotificationCategoriesResponse {
  repeated NotificationCategory categories = 1;
}
'''

# ---------------------------------------------------------------------------
# 3. 新增 rpc：文件 -> service 名 -> [(rpc 名, 请求类型, 响应类型, 动词, 路径)]
# ---------------------------------------------------------------------------
EXTRA_RPCS = {
    'product/v1/product.proto': {
        'ProductService': [
            ('ListChannels', 'ListChannelsRequest', 'ListChannelsResponse', 'get', '/api/v1/channels'),
            ('GetChannel', 'GetChannelRequest', 'Channel', 'get', '/api/v1/channels/{id}'),
            ('ListChannelProducts', 'ListChannelProductsRequest', 'ListChannelProductsResponse', 'get', '/api/v1/channels/{channel_id}/products'),
            ('SaveChannel', 'SaveChannelRequest', 'Channel', 'post', '/api/v1/admin/channels'),
            ('DeleteChannel', 'DeleteChannelRequest', 'shopstack.common.v1.OperationResult', 'delete', '/api/v1/admin/channels/{id}'),
            ('ListReviewTags', 'ListReviewTagsRequest', 'ListReviewTagsResponse', 'get', '/api/v1/reviews/tags'),
            ('SaveReviewTag', 'SaveReviewTagRequest', 'ReviewTag', 'post', '/api/v1/admin/review-tags'),
            ('DeleteReviewTag', 'DeleteReviewTagRequest', 'shopstack.common.v1.OperationResult', 'delete', '/api/v1/admin/review-tags/{id}'),
            ('ListGuarantees', 'ListGuaranteesRequest', 'ListGuaranteesResponse', 'get', '/api/v1/guarantees'),
            ('SaveGuarantee', 'SaveGuaranteeRequest', 'Guarantee', 'post', '/api/v1/admin/guarantees'),
            ('DeleteGuarantee', 'DeleteGuaranteeRequest', 'shopstack.common.v1.OperationResult', 'delete', '/api/v1/admin/guarantees/{id}'),
            ('ListProductParams', 'ListProductParamsRequest', 'ListProductParamsResponse', 'get', '/api/v1/products/{product_id}/params'),
        ],
        'ReviewService': [
            ('ListProductQuestions', 'ListProductQuestionsRequest', 'ListProductQuestionsResponse', 'get', '/api/v1/products/{product_id}/questions'),
            ('CreateQuestion', 'CreateQuestionRequest', 'ProductQuestion', 'post', '/api/v1/questions'),
            ('ListQuestions', 'ListQuestionsRequest', 'ListQuestionsResponse', 'get', '/api/v1/admin/questions'),
            ('AnswerQuestion', 'AnswerQuestionRequest', 'ProductQuestion', 'post', '/api/v1/admin/questions/{id}/answer'),
        ],
    },
    'marketing/v1/marketing.proto': {
        'MarketingService': [
            ('SignIn', 'SignInRequest', 'GetSignInStatusResponse', 'post', '/api/v1/marketing/sign-in'),
            ('GetSignInStatus', 'GetSignInStatusRequest', 'GetSignInStatusResponse', 'get', '/api/v1/marketing/sign-in'),
            ('ListTasks', 'ListTasksRequest', 'ListTasksResponse', 'get', '/api/v1/marketing/tasks'),
            ('ClaimTask', 'ClaimTaskRequest', 'UserTask', 'post', '/api/v1/marketing/tasks/{task_id}/claim'),
            ('GetPromotion', 'GetPromotionRequest', 'GetPromotionResponse', 'get', '/api/v1/promotions/{id}'),
            ('ListPromotionProducts', 'ListPromotionProductsRequest', 'ListPromotionProductsResponse', 'get', '/api/v1/promotions/{promotion_id}/products'),
            ('ListPromotionSessions', 'ListPromotionSessionsRequest', 'ListPromotionSessionsResponse', 'get', '/api/v1/promotions/{promotion_id}/sessions'),
            ('SavePromotionSession', 'SavePromotionSessionRequest', 'PromotionSession', 'post', '/api/v1/admin/promotion-sessions'),
            ('ListGroupBuys', 'ListGroupBuysRequest', 'ListGroupBuysResponse', 'get', '/api/v1/group-buys'),
            ('GetGroupBuy', 'GetGroupBuyRequest', 'GetGroupBuyResponse', 'get', '/api/v1/group-buys/{id}'),
            ('JoinGroupBuy', 'JoinGroupBuyRequest', 'GroupBuy', 'post', '/api/v1/group-buys/{id}/join'),
            ('SaveGroupBuy', 'SaveGroupBuyRequest', 'GroupBuy', 'post', '/api/v1/admin/group-buys'),
            ('ListUserLevels', 'ListUserLevelsRequest', 'ListUserLevelsResponse', 'get', '/api/v1/marketing/levels'),
        ],
    },
    'user/v1/user.proto': {
        'UserService': [
            ('GetUserLevel', 'GetUserLevelRequest', 'UserLevelInfo', 'get', '/api/v1/users/level'),
            ('ListUserLevels', 'ListUserLevelsRequest', 'ListUserLevelsResponse', 'get', '/api/v1/users/levels'),
            ('ListGrowthLogs', 'ListGrowthLogsRequest', 'ListGrowthLogsResponse', 'get', '/api/v1/users/growth-logs'),
            ('ListRegions', 'ListRegionsRequest', 'ListRegionsResponse', 'get', '/api/v1/regions'),
            ('ListInvoiceTemplates', 'ListInvoiceTemplatesRequest', 'ListInvoiceTemplatesResponse', 'get', '/api/v1/users/invoice-templates'),
            ('SaveInvoiceTemplate', 'SaveInvoiceTemplateRequest', 'InvoiceTemplate', 'post', '/api/v1/users/invoice-templates'),
            ('DeleteInvoiceTemplate', 'DeleteInvoiceTemplateRequest', 'shopstack.common.v1.OperationResult', 'delete', '/api/v1/users/invoice-templates/{id}'),
            ('GetNotificationSettings', 'GetNotificationSettingsRequest', 'UserNotificationSettings', 'get', '/api/v1/users/notification-settings'),
            ('UpdateNotificationSettings', 'UpdateNotificationSettingsRequest', 'UserNotificationSettings', 'put', '/api/v1/users/notification-settings'),
            ('GetAccountSecurity', 'GetAccountSecurityRequest', 'AccountSecurityInfo', 'get', '/api/v1/users/security'),
            ('RealNameAuth', 'RealNameAuthRequest', 'User', 'post', '/api/v1/users/realname'),
            ('SubmitFeedback', 'SubmitFeedbackRequest', 'shopstack.common.v1.OperationResult', 'post', '/api/v1/users/feedback'),
            ('ListHelpArticles', 'ListHelpArticlesRequest', 'ListHelpArticlesResponse', 'get', '/api/v1/help/articles'),
            ('GetHelpArticle', 'GetHelpArticleRequest', 'HelpArticle', 'get', '/api/v1/help/articles/{id}'),
        ],
        'AdminService': [
            ('ListFeedbacks', 'ListFeedbacksRequest', 'ListFeedbacksResponse', 'get', '/api/v1/admin/feedbacks'),
            ('SetFeedbackStatus', 'SetFeedbackStatusRequest', 'Feedback', 'put', '/api/v1/admin/feedbacks/{id}/status'),
            ('SaveUserLevel', 'SaveUserLevelRequest', 'UserLevel', 'post', '/api/v1/admin/user-levels'),
        ],
    },
    'order/v1/order.proto': {
        'OrderService': [
            ('ListAfterSales', 'ListAfterSalesRequest', 'ListAfterSalesResponse', 'get', '/api/v1/after-sales'),
            ('GetAfterSale', 'GetAfterSaleRequest', 'AfterSale', 'get', '/api/v1/after-sales/{id}'),
            ('ListRefundReasons', 'ListRefundReasonsRequest', 'ListRefundReasonsResponse', 'get', '/api/v1/refund-reasons'),
            ('AdminListAfterSales', 'AdminListAfterSalesRequest', 'ListAfterSalesResponse', 'get', '/api/v1/admin/after-sales'),
            ('SetAfterSaleStatus', 'SetAfterSaleStatusRequest', 'AfterSale', 'put', '/api/v1/admin/after-sales/{id}/status'),
            ('AdminListOrders', 'AdminListOrdersRequest', 'ListOrdersResponse', 'get', '/api/v1/admin/orders'),
            ('AdminOrderStatsByChannel', 'AdminOrderStatsRequest', 'AdminOrderStatsByChannelResponse', 'get', '/api/v1/admin/orders/stats/channels'),
            ('AdminOrderStatsByHour', 'AdminOrderStatsRequest', 'AdminOrderStatsByHourResponse', 'get', '/api/v1/admin/orders/stats/hours'),
            ('AdminOrderStatsByRegion', 'AdminOrderStatsRequest', 'AdminOrderStatsByRegionResponse', 'get', '/api/v1/admin/orders/stats/regions'),
            ('AdminListOrderLogs', 'ListOrderLogsRequest', 'ListOrderLogsResponse', 'get', '/api/v1/admin/order-logs'),
            ('SaveRefundReason', 'SaveRefundReasonRequest', 'RefundReason', 'post', '/api/v1/admin/refund-reasons'),
        ],
    },
    'logistics/v1/logistics.proto': {
        'LogisticsService': [
            ('ListLogisticsCompanies', 'ListLogisticsCompaniesRequest', 'ListLogisticsCompaniesResponse', 'get', '/api/v1/logistics/companies'),
            ('CalculateFreight', 'CalculateFreightRequest', 'CalculateFreightResponse', 'post', '/api/v1/logistics/freight'),
            ('ListDeliveryRanges', 'ListDeliveryRangesRequest', 'ListDeliveryRangesResponse', 'get', '/api/v1/logistics/ranges'),
            ('GetShipmentByTrackingNo', 'GetShipmentByTrackingNoRequest', 'Shipment', 'get', '/api/v1/logistics/tracking/{tracking_no}'),
            ('SaveLogisticsCompany', 'SaveLogisticsCompanyRequest', 'LogisticsCompany', 'post', '/api/v1/admin/logistics/companies'),
            ('DeleteLogisticsCompany', 'DeleteLogisticsCompanyRequest', 'shopstack.common.v1.OperationResult', 'delete', '/api/v1/admin/logistics/companies/{id}'),
            ('SaveDeliveryRange', 'SaveDeliveryRangeRequest', 'DeliveryRange', 'post', '/api/v1/admin/logistics/ranges'),
            ('ListReturnShipments', 'ListShipmentsRequest', 'ListShipmentsResponse', 'get', '/api/v1/admin/return-shipments'),
        ],
    },
    'inventory/v1/inventory.proto': {
        'InventoryService': [
            ('ListWarehouses', 'ListWarehousesRequest', 'ListWarehousesResponse', 'get', '/api/v1/admin/warehouses'),
            ('SaveWarehouse', 'SaveWarehouseRequest', 'Warehouse', 'post', '/api/v1/admin/warehouses'),
            ('DeleteWarehouse', 'DeleteWarehouseRequest', 'shopstack.common.v1.OperationResult', 'delete', '/api/v1/admin/warehouses/{id}'),
            ('ListInboundOrders', 'ListInboundOrdersRequest', 'ListInboundOrdersResponse', 'get', '/api/v1/admin/inbound-orders'),
            ('CreateInboundOrder', 'CreateInboundOrderRequest', 'InboundOrder', 'post', '/api/v1/admin/inbound-orders'),
            ('ListOutboundOrders', 'ListOutboundOrdersRequest', 'ListOutboundOrdersResponse', 'get', '/api/v1/admin/outbound-orders'),
            ('CreateOutboundOrder', 'CreateOutboundOrderRequest', 'OutboundOrder', 'post', '/api/v1/admin/outbound-orders'),
            ('ListStockChecks', 'ListStockChecksRequest', 'ListStockChecksResponse', 'get', '/api/v1/admin/stock-checks'),
            ('CreateStockCheck', 'CreateStockCheckRequest', 'StockCheck', 'post', '/api/v1/admin/stock-checks'),
            ('GetStockCheck', 'GetStockCheckRequest', 'StockCheckDetail', 'get', '/api/v1/admin/stock-checks/{id}'),
            ('ListStockCheckItems', 'GetStockCheckRequest', 'ListStockCheckItemsResponse', 'get', '/api/v1/admin/stock-checks/{id}/items'),
        ],
    },
    'payment/v1/payment.proto': {
        'PaymentService': [
            ('ListPayChannels', 'ListPayChannelsRequest', 'ListPayChannelsResponse', 'get', '/api/v1/admin/pay-channels'),
            ('SavePayChannel', 'SavePayChannelRequest', 'PayChannel', 'post', '/api/v1/admin/pay-channels'),
            ('DeletePayChannel', 'DeletePayChannelRequest', 'shopstack.common.v1.OperationResult', 'delete', '/api/v1/admin/pay-channels/{id}'),
            ('CreateRecharge', 'CreateRechargeRequest', 'RechargeOrder', 'post', '/api/v1/payments/recharge'),
            ('ListRecharges', 'ListRechargesRequest', 'ListRechargesResponse', 'get', '/api/v1/payments/recharges'),
            ('ListBalanceLogs', 'ListBalanceLogsRequest', 'ListBalanceLogsResponse', 'get', '/api/v1/payments/balance-logs'),
            ('GetRechargeConfig', 'GetRechargeConfigRequest', 'RechargeConfig', 'get', '/api/v1/payments/recharge-config'),
        ],
    },
    'notification/v1/notification.proto': {
        'NotificationService': [
            ('ListNotificationTemplates', 'ListNotificationTemplatesRequest', 'ListNotificationTemplatesResponse', 'get', '/api/v1/admin/notification-templates'),
            ('SaveNotificationTemplate', 'SaveNotificationTemplateRequest', 'NotificationTemplate', 'post', '/api/v1/admin/notification-templates'),
            ('DeleteNotificationTemplate', 'DeleteNotificationTemplateRequest', 'shopstack.common.v1.OperationResult', 'delete', '/api/v1/admin/notification-templates/{id}'),
            ('ListSmsTemplates', 'ListSmsTemplatesRequest', 'ListSmsTemplatesResponse', 'get', '/api/v1/admin/sms-templates'),
            ('SaveSmsTemplate', 'SaveSmsTemplateRequest', 'SmsTemplate', 'post', '/api/v1/admin/sms-templates'),
            ('DeleteSmsTemplate', 'DeleteSmsTemplateRequest', 'shopstack.common.v1.OperationResult', 'delete', '/api/v1/admin/sms-templates/{id}'),
            ('ListSensitiveWords', 'ListSensitiveWordsRequest', 'ListSensitiveWordsResponse', 'get', '/api/v1/admin/sensitive-words'),
            ('SaveSensitiveWord', 'SaveSensitiveWordRequest', 'SensitiveWord', 'post', '/api/v1/admin/sensitive-words'),
            ('DeleteSensitiveWord', 'DeleteSensitiveWordRequest', 'shopstack.common.v1.OperationResult', 'delete', '/api/v1/admin/sensitive-words/{id}'),
            ('ListNotificationCategories', 'ListNotificationCategoriesRequest', 'ListNotificationCategoriesResponse', 'get', '/api/v1/notifications/categories'),
        ],
    },
}


def add_fields(src, fields):
    """给已有 message 追加字段。"""
    for msg, items in fields.items():
        pattern = re.compile(r'(message\s+' + msg + r'\s*\{)(.*?)(\n\})', re.S)
        m = pattern.search(src)
        if not m:
            print(f'  ! 消息不存在，跳过：{msg}')
            continue
        body = m.group(2)
        existing = set(re.findall(r'(\w+)\s*=\s*\d+\s*;', body))
        added = []
        for name, typ, num, comment in items:
            if name in existing:
                continue
            added.append(f'  {typ} {name} = {num};{"" if not comment else " // " + comment}')
        if not added:
            continue
        src = src[:m.start()] + m.group(1) + body + '\n' + '\n'.join(added) + m.group(3) + src[m.end():]
        print(f'  + {msg}: {", ".join(a.split()[1] for a in added)}')
    return src


def add_rpcs(src, services):
    """在 service 块内插入新 rpc。"""
    for svc, items in services.items():
        pattern = re.compile(r'(service\s+' + svc + r'\s*\{)(.*?)(\n\})', re.S)
        m = pattern.search(src)
        if not m:
            print(f'  ! service 不存在，跳过：{svc}')
            continue
        body = m.group(2)
        blocks = []
        for rpc, req, res, verb, path in items:
            if re.search(r'rpc\s+' + rpc + r'\s*\(', body):
                continue
            blocks.append(
                f'  rpc {rpc}({req}) returns ({res}) {{\n'
                f'    option (google.api.http) = {{ {verb}: "{path}" }};\n'
                f'  }}'
            )
        if not blocks:
            continue
        src = src[:m.start()] + m.group(1) + body + '\n' + '\n'.join(blocks) + m.group(3) + src[m.end():]
        print(f'  + {svc}: {len(blocks)} 个 rpc')
    return src


def main():
    changed = 0
    for rel in sorted(set(list(EXTRA_MESSAGES) + list(EXTRA_RPCS) + list(EXTRA_FIELDS))):
        path = os.path.join(PROTO, rel)
        if not os.path.exists(path):
            print(f'! 找不到 {rel}')
            continue
        with open(path, encoding='utf-8') as f:
            src = f.read()

        print(f'--- {rel}')
        if rel in EXTRA_FIELDS:
            src = add_fields(src, EXTRA_FIELDS[rel])
        if rel in EXTRA_RPCS:
            src = add_rpcs(src, EXTRA_RPCS[rel])
        if rel in EXTRA_MESSAGES:
            if 'EXTRA_MARKER' not in src:
                marker = '// EXTRA_MARKER: 由 scripts/extend-proto.py 追加的消息定义'
                src = src.rstrip() + '\n\n' + marker + '\n' + EXTRA_MESSAGES[rel]
                print(f'  + 追加 {len(EXTRA_MESSAGES[rel].splitlines())} 行消息定义')
            else:
                print('  = 消息定义已存在')

        with open(path, 'w', encoding='utf-8') as f:
            f.write(src)
        changed += 1

    print(f'\n共处理 {changed} 个 proto 文件')


if __name__ == '__main__':
    sys.exit(main())
