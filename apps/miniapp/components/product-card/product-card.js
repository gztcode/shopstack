/**
 * 商品卡片
 * ---------------------------------------------------------------
 * 展示商品图片、标题、价格、销量，并提供「加入购物车」按钮。
 * 组件只负责展示与事件派发，接口调用由页面完成。
 */
const format = require('../../utils/format');

Component({
  properties: {
    /** 商品对象（Product 结构） */
    product: {
      type: Object,
      value: {},
      observer: 'refresh',
    },
    /** 是否显示加入购物车按钮 */
    showAdd: {
      type: Boolean,
      value: true,
    },
    /** 紧凑模式：用于横向列表 */
    compact: {
      type: Boolean,
      value: false,
    },
  },

  data: {
    priceText: '0.00',
    originText: '',
    salesText: '已售 0',
    tagText: '',
  },

  lifetimes: {
    attached() {
      this.refresh();
    },
  },

  methods: {
    /**
     * 计算展示文案。
     */
    refresh() {
      const product = this.data.product || {};
      const hasRange = product.max_price_cents > product.min_price_cents;
      this.setData({
        priceText: format.formatYuan(product.min_price_cents),
        originText: hasRange ? format.formatYuan(product.max_price_cents) : '',
        salesText: '已售 ' + (product.sales_count || 0),
        tagText: product.tags && product.tags.length ? product.tags[0] : '',
      });
    },

    /**
     * 点击商品区域。
     */
    onTap() {
      this.triggerEvent('select', { product: this.data.product });
    },

    /**
     * 点击加入购物车。
     */
    onAdd() {
      this.triggerEvent('addcart', { product: this.data.product });
    },
  },
});
