/**
 * 促销活动列表页面模板
 * ---------------------------------------------------------------
 * 活动列表 / 限时秒杀 / 预售专区 三个页面共用本模板，
 * 通过 type 参数区分活动类型（0 全部 / 3 秒杀 / 4 预售）。
 */
const api = require('../utils/api');
const format = require('../utils/format');

/** 活动类型编码（与后端 Promotion.type 对应：1 满减 2 折扣 3 秒杀 4 拼团） */
const TYPE_CODES = {
  all: 0,
  flash: 3,
};

/** 活动状态文案（Promotion.status：0 未开始 1 进行中 2 已结束 3 已下线） */
const STATUS_TEXT = {
  0: '未开始',
  1: '进行中',
  2: '已结束',
  3: '已下线',
};

/**
 * 创建促销活动列表页面。
 * @param {object} config { type, title, desc, emptyAction }
 * @returns {object} Page 配置对象
 */
function createPromotionListPage(config) {
  const options = config || {};
  const typeCode = TYPE_CODES[options.type || 'all'] || 0;
  return {
    data: {
      view: {
        type: options.type || 'all',
        title: options.title || '活动',
        desc: options.desc || '',
        promotions: [],
        loading: true,
        hasMore: true,
        page: 1,
        pageSize: 10,
      },
    },

    onShow() {
      this.loadPromotions(true);
    },

    onReachBottom() {
      if (this.data.view.hasMore && !this.data.view.loading) {
        this.loadPromotions(false);
      }
    },

    /**
     * 加载活动列表。
     * @param {boolean} reset 是否重置分页
     */
    loadPromotions(reset) {
      const view = this.data.view;
      const page = reset ? 1 : view.page;
      this.setData({ 'view.loading': true });
      const params = { page: page, page_size: view.pageSize };
      if (typeCode) {
        params.type = typeCode;
      }
      api
        .listPromotions(params)
        .then((data) => {
          const list = (data && data.promotions) || [];
          const meta = (data && data.meta) || {};
          this.setData({
            'view.loading': false,
            'view.promotions': reset ? this.mapPromotions(list) : view.promotions.concat(this.mapPromotions(list)),
            'view.page': page + 1,
            'view.hasMore': page < (meta.total_pages || 1),
          });
        })
        .catch((error) => {
          this.setData({ 'view.loading': false });
          wx.showToast({ title: (error && error.message) || '活动加载失败', icon: 'none' });
        });
    },

    /**
     * 转换为页面展示结构。
     * @param {Array} list 原始活动
     * @returns {Array}
     */
    mapPromotions(list) {
      return (list || []).map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        banner_image: item.banner_image,
        product_id: item.product_id,
        min_amount_text: format.formatYuan(item.min_amount_cents),
        discount_text: item.discount_cents > 0 ? '减 ¥' + format.formatYuan(item.discount_cents) : (item.percent < 100 ? (item.percent / 10).toFixed(1).replace(/\.0$/, '') + ' 折' : '直接降价'),
        sold_count: item.sold_count || 0,
        limit_text: item.limit_per_user > 0 ? '每人限 ' + item.limit_per_user + ' 件' : '不限购',
        time_text: format.formatUnixTime(item.start_time) + ' 至 ' + format.formatUnixTime(item.end_time),
        status_text: STATUS_TEXT[item.status] || '进行中',
      }));
    },

    /**
     * 查看活动场次。
     */
    onSessionTap(e) {
      const id = e.currentTarget.dataset.id;
      wx.navigateTo({ url: '/subpkg-order/promotion-session/promotion-session?promotion_id=' + id });
    },

    /**
     * 查看活动商品。
     */
    onProductTap(e) {
      const productId = e.currentTarget.dataset.productId;
      if (!productId) {
        return;
      }
      wx.navigateTo({ url: '/pages/detail/detail?id=' + productId });
    },

    /**
     * 空状态引导：回到首页。
     */
    onGoHome() {
      wx.switchTab({ url: '/pages/index/index' });
    },
  };
}

module.exports = { createPromotionListPage: createPromotionListPage };
