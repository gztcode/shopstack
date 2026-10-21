/**
 * 拼团列表页面模板
 * ---------------------------------------------------------------
 * 拼团列表 / 我的拼团 两个页面共用本模板，通过 mine 参数区分是否只看自己参与的团。
 */
const api = require('../utils/api');
const auth = require('../utils/auth');
const format = require('../utils/format');

/** 拼团状态文案（GroupBuy.status：0 未开始 1 进行中 2 已结束 3 已下线） */
const STATUS_TEXT = {
  0: '未开始',
  1: '拼团中',
  2: '已成团',
  3: '已下线',
};

/**
 * 创建拼团列表页面。
 * @param {object} config { mine, title, desc }
 * @returns {object} Page 配置对象
 */
function createGroupBuyListPage(config) {
  const options = config || {};
  const mine = !!options.mine;
  return {
    data: {
      view: {
        mine: mine,
        title: options.title || '拼团',
        desc: options.desc || '',
        groupBuys: [],
        loading: true,
        hasMore: true,
        page: 1,
        pageSize: 10,
      },
    },

    onShow() {
      this.loadGroupBuys(true);
    },

    onReachBottom() {
      if (this.data.view.hasMore && !this.data.view.loading) {
        this.loadGroupBuys(false);
      }
    },

    /**
     * 加载拼团列表。
     * @param {boolean} reset 是否重置分页
     */
    loadGroupBuys(reset) {
      const view = this.data.view;
      const page = reset ? 1 : view.page;
      this.setData({ 'view.loading': true });
      const params = { page: page, page_size: view.pageSize };
      if (view.mine) {
        params.mine = 1;
      }
      api
        .listGroupBuys(params)
        .then((data) => {
          const list = (data && data.group_buys) || [];
          const meta = (data && data.meta) || {};
          if (view.mine) {
            // 我的拼团：逐个查询成员列表，筛出我参与过的团
            return this.filterMine(list).then((mineList) => {
              this.setData({
                'view.loading': false,
                'view.groupBuys': reset ? this.mapGroupBuys(mineList) : view.groupBuys.concat(this.mapGroupBuys(mineList)),
                'view.page': page + 1,
                'view.hasMore': page < (meta.total_pages || 1),
              });
            });
          }
          this.setData({
            'view.loading': false,
            'view.groupBuys': reset ? this.mapGroupBuys(list) : view.groupBuys.concat(this.mapGroupBuys(list)),
            'view.page': page + 1,
            'view.hasMore': page < (meta.total_pages || 1),
          });
          return null;
        })
        .catch((error) => {
          this.setData({ 'view.loading': false });
          wx.showToast({ title: (error && error.message) || '拼团加载失败', icon: 'none' });
        });
    },

    /**
     * 筛出我参与过的拼团。
     * @param {Array} list 拼团列表
     * @returns {Promise<Array>}
     */
    filterMine(list) {
      const user = auth.getUser();
      const userId = user && user.id ? user.id : 1;
      const tasks = (list || []).map((item) =>
        api
          .getGroupBuy(item.id)
          .then((detail) => {
            const members = (detail && detail.members) || [];
            return members.some((m) => m.user_id === userId) ? item : null;
          })
          .catch(() => null)
      );
      return Promise.all(tasks).then((results) => results.filter((item) => !!item));
    },

    /**
     * 转换为页面展示结构。
     * @param {Array} list 原始拼团
     * @returns {Array}
     */
    mapGroupBuys(list) {
      return (list || []).map((item) => {
        const groupSize = item.required_members || item.group_size || 1;
        const joined = item.joined_members || 0;
        return {
          id: item.id,
          name: item.name,
          description: item.description,
          product_id: item.product_id,
          product_cover: item.product_image,
          price_text: format.formatYuan(item.price_cents),
          origin_text: format.formatYuan(item.original_price_cents),
          group_size: groupSize,
          joined_count: joined,
          need_count: Math.max(0, groupSize - joined),
          percent: Math.min(100, Math.round((joined / groupSize) * 100)),
          status: item.status,
          status_text: STATUS_TEXT[item.status] || '拼团中',
          end_text: '结束时间 ' + format.formatUnixTime(item.end_time),
        };
      });
    },

    /**
     * 查看拼团详情。
     */
    onDetailTap(e) {
      const id = e.currentTarget.dataset.id;
      wx.navigateTo({ url: '/subpkg-order/group-buy-detail/group-buy-detail?id=' + id });
    },

    /**
     * 去参团。
     */
    onJoinTap(e) {
      const id = e.currentTarget.dataset.id;
      wx.navigateTo({ url: '/subpkg-order/group-buy-join/group-buy-join?id=' + id });
    },

    /**
     * 空状态引导：回到首页。
     */
    onGoHome() {
      wx.switchTab({ url: '/pages/index/index' });
    },
  };
}

module.exports = { createGroupBuyListPage: createGroupBuyListPage };
