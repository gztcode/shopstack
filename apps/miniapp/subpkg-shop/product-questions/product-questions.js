/**
 * 商品问答
 * ---------------------------------------------------------------
 * 接口：GET /api/v1/products/{id}/questions
 */
const api = require('../../utils/api');
const format = require('../../utils/format');

Page({
  data: {
    loading: true,
    productId: 0,
    title: '',
    questions: [],
  },

  onLoad(options) {
    const productId = Number((options && options.product_id) || (options && options.id)) || 0;
    this.setData({ productId: productId });
  },

  onShow() {
    this.loadQuestions();
  },

  /**
   * 加载商品问答。
   */
  loadQuestions() {
    if (!this.data.productId) {
      this.setData({ loading: false, questions: [] });
      return;
    }
    this.setData({ loading: true });
    api
      .getProductQuestions(this.data.productId)
      .then((data) => {
        const list = (data && data.questions) || [];
        this.setData({
          loading: false,
          title: list.length ? list[0].product_title : '',
          questions: list.map((item) => ({
            id: item.id,
            user_nickname: item.user_nickname,
            content: item.content,
            images: item.images || [],
            reply: item.reply || '',
            created_text: format.fromNow(item.created_at),
            replied_text: item.reply_at ? format.fromNow(item.reply_at) : '',
          })),
        });
      })
      .catch((error) => {
        this.setData({ loading: false });
        wx.showToast({ title: (error && error.message) || '问答加载失败', icon: 'none' });
      });
  },

  /**
   * 回到商品详情。
   */
  onGoDetail() {
    if (!this.data.productId) {
      return;
    }
    wx.navigateTo({ url: '/pages/detail/detail?id=' + this.data.productId });
  },
});
