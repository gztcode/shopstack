#!/bin/bash
# ---------------------------------------------------------------------------
# 参数化页面生成脚本
# ---------------------------------------------------------------------------
# 频道页（9）、评价页（7）、订单状态页（7）、活动页（3）、拼团页（2）共用
# templates/ 下的共享模板，页面之间只通过 code / filter / status / type
# 等参数区分，因此这里用一份清单批量生成页面四件套，避免复制粘贴充数。
#
# 用法：bash tools/gen-parameterized-pages.sh
# ---------------------------------------------------------------------------
set -e
cd "$(dirname "$0")/.."

# 生成一个参数化页面
# $1=页面根目录 $2=页面名 $3=标题 $4=模板名 $5=工厂函数名 $6=配置片段
make_page() {
  local root="$1" name="$2" title="$3" tpl="$4" factory="$5" config="$6"
  local dir="$root/$name"
  # 页面文件位于 <root>/<name>/ 下，模板与组件都在小程序根目录，故统一使用 ../../
  local depth="../.."
  local extra=""
  mkdir -p "$dir"

  cat > "$dir/$name.js" <<EOF
/**
 * $title
 * ---------------------------------------------------------------
 * 本页与同类页面共用 templates/$tpl 模板，差异仅由参数区分。
 */
const { $factory } = require('$depth/templates/$tpl');

Page(
  $factory($config)
);
EOF

  cat > "$dir/$name.wxml" <<EOF
<import src="$depth/templates/$tpl.wxml" />
<template is="$tpl" data="{{view}}" />
EOF

  cat > "$dir/$name.wxss" <<EOF
@import "$depth/templates/$tpl.wxss";
EOF

  if [ "$tpl" = "channel-feed" ]; then
    extra=",
    \"product-card\": \"$depth/components/product-card/product-card\""
  fi

  cat > "$dir/$name.json" <<EOF
{
  "navigationBarTitleText": "$title",
  "usingComponents": {
    "demo-banner": "$depth/components/demo-banner/demo-banner",
    "loading": "$depth/components/loading/loading",
    "empty-state": "$depth/components/empty-state/empty-state"$extra
  }
}
EOF
}

# --- 分包：商品与评价 ------------------------------------------------------
make_page subpkg-shop channel-recommend "推荐频道" channel-feed createChannelFeedPage \
  "{ code: 'recommend', channelId: 1, title: '推荐频道', intro: '结合你的浏览与收藏智能推荐' }"
make_page subpkg-shop channel-newest "新品频道" channel-feed createChannelFeedPage \
  "{ code: 'newest', channelId: 2, title: '新品频道', intro: '最近上架的当季新品' }"
make_page subpkg-shop channel-hot "热销频道" channel-feed createChannelFeedPage \
  "{ code: 'hot', channelId: 3, title: '热销频道', intro: '销量领先的当红爆款' }"
make_page subpkg-shop channel-flash "限时频道" channel-feed createChannelFeedPage \
  "{ code: 'flash', channelId: 4, title: '限时频道', intro: '整点开抢，售完即止' }"
make_page subpkg-shop channel-presale "预售频道" channel-feed createChannelFeedPage \
  "{ code: 'presale', channelId: 5, title: '预售频道', intro: '预售定金锁定首发权益' }"
make_page subpkg-shop channel-clearance "清仓频道" channel-feed createChannelFeedPage \
  "{ code: 'clearance', channelId: 6, title: '清仓频道', intro: '断码清仓，低价出清' }"
make_page subpkg-shop channel-freeship "包邮频道" channel-feed createChannelFeedPage \
  "{ code: 'freeship', channelId: 7, title: '包邮频道', intro: '全国包邮，无需凑单' }"
make_page subpkg-shop channel-cross "跨境频道" channel-feed createChannelFeedPage \
  "{ code: 'cross', channelId: 8, title: '跨境频道', intro: '原产地直采，全球好物' }"
make_page subpkg-shop channel-fresh "生鲜频道" channel-feed createChannelFeedPage \
  "{ code: 'fresh', channelId: 9, title: '生鲜频道', intro: '冷链直发，新鲜到家' }"

make_page subpkg-shop review-all "全部评价" review-list createReviewListPage \
  "{ filter: 'all', title: '全部评价', desc: '来自已验证订单的真实评价' }"
make_page subpkg-shop review-good "好评" review-list createReviewListPage \
  "{ filter: 'good', title: '好评', desc: '4 星及以上的好评内容' }"
make_page subpkg-shop review-medium "中评" review-list createReviewListPage \
  "{ filter: 'medium', title: '中评', desc: '3 星的中立评价内容' }"
make_page subpkg-shop review-bad "差评" review-list createReviewListPage \
  "{ filter: 'bad', title: '差评', desc: '2 星及以下的待改进反馈' }"
make_page subpkg-shop review-image "有图评价" review-list createReviewListPage \
  "{ filter: 'has_image', title: '有图评价', desc: '买家上传了实拍图的评价' }"
make_page subpkg-shop review-reply "已回复评价" review-list createReviewListPage \
  "{ filter: 'has_reply', title: '已回复评价', desc: '商家已经回复过的评价' }"
make_page subpkg-shop my-reviews "我的评价" review-list createReviewListPage \
  "{ filter: 'all', mine: true, title: '我的评价', desc: '你发表过的全部评价' }"

# --- 分包：订单与售后 ------------------------------------------------------
make_page subpkg-order order-pay "待付款" order-list createOrderListPage \
  "{ status: 'ORDER_STATUS_PENDING_PAYMENT', title: '待付款', emptyDesc: '还没有待付款订单' }"
make_page subpkg-order order-ship "待发货" order-list createOrderListPage \
  "{ status: 'ORDER_STATUS_PAID', title: '待发货', emptyDesc: '还没有待发货订单' }"
make_page subpkg-order order-receive "待收货" order-list createOrderListPage \
  "{ status: 'ORDER_STATUS_SHIPPED', title: '待收货', emptyDesc: '还没有待收货订单' }"
make_page subpkg-order order-done "已完成" order-list createOrderListPage \
  "{ status: 'ORDER_STATUS_COMPLETED', title: '已完成', emptyDesc: '还没有已完成订单' }"
make_page subpkg-order order-cancel "已取消" order-list createOrderListPage \
  "{ status: 'ORDER_STATUS_CANCELLED', title: '已取消', emptyDesc: '还没有已取消订单' }"
make_page subpkg-order order-refunding "售后中" order-list createOrderListPage \
  "{ status: 'ORDER_STATUS_REFUNDING', title: '售后中', emptyDesc: '当前没有处理中的售后订单' }"

make_page subpkg-order promotion-list "活动列表" promotion-list createPromotionListPage \
  "{ type: 'all', title: '活动列表', desc: '平台正在进行的全部优惠活动' }"
make_page subpkg-order promotion-flash "限时秒杀" promotion-list createPromotionListPage \
  "{ type: 'flash', title: '限时秒杀', desc: '限量抢购，售完即止' }"
# 预售专区复用「频道商品流」模板：预售属于频道维度（Channel.type = 5）
make_page subpkg-order promotion-presale "预售专区" channel-feed createChannelFeedPage \
  "{ code: 'presale', channelId: 5, title: '预售专区', intro: '新品首发预售，付定金锁定首发权益' }"

make_page subpkg-order group-buy-list "拼团列表" group-buy-list createGroupBuyListPage \
  "{ title: '拼团列表', desc: '和好友一起拼，优惠力度更大' }"
make_page subpkg-order my-group-buy "我的拼团" group-buy-list createGroupBuyListPage \
  "{ mine: true, title: '我的拼团', desc: '你参与过的全部拼团' }"

# --- 主包：高频页面 --------------------------------------------------------
make_page pages order-all "全部订单" order-list createOrderListPage \
  "{ status: '', title: '全部订单', emptyDesc: '还没有任何订单' }"

echo "参数化页面生成完成"
