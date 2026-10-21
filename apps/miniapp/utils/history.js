/**
 * 浏览足迹（本地存储）
 * ---------------------------------------------------------------
 * 不依赖后端，记录最近浏览过的商品，最多保留 20 条，按浏览时间倒序。
 */

const STORAGE_KEY = 'ss_browse_history';
const MAX_ITEMS = 20;

/**
 * 读取全部足迹。
 * @returns {Array}
 */
function list() {
  try {
    return wx.getStorageSync(STORAGE_KEY) || [];
  } catch (e) {
    return [];
  }
}

/**
 * 写入全部足迹。
 * @param {Array} items 足迹列表
 */
function writeAll(items) {
  try {
    wx.setStorageSync(STORAGE_KEY, items);
  } catch (e) {
    // 存储失败不影响浏览流程
  }
}

/**
 * 记录一次浏览（同一商品只保留最新一条）。
 * @param {object} product 商品对象（Product 结构）
 */
function add(product) {
  if (!product || !product.id) {
    return;
  }
  const items = list().filter((item) => item.product_id !== product.id);
  items.unshift({
    product_id: product.id,
    title: product.title || '',
    cover: product.cover || '',
    price_cents: product.min_price_cents || 0,
    category_name: product.category_name || '',
    viewed_at: new Date().toISOString(),
  });
  writeAll(items.slice(0, MAX_ITEMS));
}

/**
 * 删除单条足迹。
 * @param {number} productId 商品 ID
 */
function remove(productId) {
  writeAll(list().filter((item) => item.product_id !== productId));
}

/**
 * 清空足迹。
 */
function clear() {
  writeAll([]);
}

module.exports = {
  list: list,
  add: add,
  remove: remove,
  clear: clear,
  MAX_ITEMS: MAX_ITEMS,
};
