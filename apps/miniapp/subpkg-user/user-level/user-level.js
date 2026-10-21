/**
 * 会员等级
 * ---------------------------------------------------------------
 * 接口：GET /api/v1/users/level
 *       GET /api/v1/marketing/levels
 */
const api = require('../../utils/api');

/**
 * 折扣百分比转「折数」文案：95 → "9.5 折"。
 * WXML 表达式不支持正则与方法调用，只能在数据层算好后传给模板。
 */
function formatDiscountText(discountPercent) {
  const percent = Number(discountPercent);
  if (!percent || percent >= 100) return '';
  return (percent / 10).toFixed(1).replace(/\.0$/, '') + ' 折';
}

Page({
  data: {
    loading: true,
    level: null,
    levels: [],
  },

  onShow() {
    this.loadLevel();
  },

  /**
   * 加载会员等级信息。
   */
  loadLevel() {
    this.setData({ loading: true });
    Promise.all([api.getUserLevel(), api.listMarketingLevels()])
      .then((results) => {
        const info = results[0] || {};
        const levelList = (info.levels && info.levels.length ? info.levels : (results[1] && results[1].levels) || []);
        const growth = info.growth || 0;
        const nextMinGrowth = info.next_min_growth || 0;
        const discountPercent = info.discount_percent === undefined ? 100 : info.discount_percent;
        this.setData({
          loading: false,
          level: {
            level_name: info.level_name || '普通会员',
            discount_percent: discountPercent,
            discount_text: discountPercent < 100 ? '全场 ' + formatDiscountText(discountPercent) : '暂无折扣',
            growth: growth,
            current_min_growth: info.current_min_growth || 0,
            next_min_growth: nextMinGrowth,
            // 成长进度条宽度：WXML 里没有 Math，百分比在这里算好。
            progress_percent: nextMinGrowth ? Math.min(100, Math.round((growth * 100) / nextMinGrowth)) : 100,
            growth_to_next: info.growth_to_next || 0,
            next_level_name: info.next_level_name || '',
          },
          levels: levelList.map((item) => ({
            id: item.id,
            name: item.name,
            level: item.level,
            min_growth: item.min_growth,
            max_growth: item.max_growth,
            discount_percent: item.discount_percent,
            discount_text: item.discount_percent < 100 ? formatDiscountText(item.discount_percent) : '无折扣',
            description: item.description,
            benefits: item.benefits || [],
            benefits_text: (item.benefits || []).join('、'),
            reached: growth >= item.min_growth,
          })),
        });
      })
      .catch((error) => {
        this.setData({ loading: false });
        wx.showToast({ title: (error && error.message) || '会员等级加载失败', icon: 'none' });
      });
  },

  /**
   * 空状态引导：回到首页。
   */
  onGoHome() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  /**
   * 查看成长值明细。
   */
  onGoGrowth() {
    wx.navigateTo({ url: '/subpkg-user/growth-logs/growth-logs' });
  },
});
