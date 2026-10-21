#!/usr/bin/env node
/**
 * 联调冒烟测试（真实后端 + 演示数据兜底）
 * ---------------------------------------------------------------
 * 通过 utils/request.js 支持的本地存储 key（ss_base_url）把网关指向
 * http://127.0.0.1:8090/api/v1，真实发起 HTTP 请求，验证：
 *   1. 公开接口能拿到后端真实数据；
 *   2. 需要登录的接口在后端返回 401 时，能回落到内置演示数据并提示演示模式；
 *   3. 页面在两种数据源下都能正常渲染出内容。
 *
 * 用法：node tools/live-smoke.js
 */

const fs = require('fs');
const http = require('http');
const path = require('path');
const url = require('url');

const ROOT = path.resolve(__dirname, '..');
const BASE_URL = 'http://127.0.0.1:8090/api/v1';
const STORAGE_KEY = 'ss_base_url';

const storage = {};
const state = { demoMode: false, requests: 0, failures: 0 };

const app = {
  globalData: { demoMode: false, demoListeners: [] },
  onDemoMode(fn) {
    this.globalData.demoListeners.push(fn);
  },
  offDemoMode(fn) {
    this.globalData.demoListeners = this.globalData.demoListeners.filter((item) => item !== fn);
  },
  notifyDemoMode() {
    this.globalData.demoListeners.forEach((fn) => fn(this.globalData.demoMode));
  },
};

global.getApp = () => app;
global.getCurrentPages = () => [];

/**
 * 用 Node http 模块模拟 wx.request。
 */
global.wx = {
  getStorageSync: (key) => (key === STORAGE_KEY ? BASE_URL : storage[key] || ''),
  setStorageSync: (key, value) => {
    storage[key] = value;
  },
  removeStorageSync: (key) => {
    delete storage[key];
  },
  request(options) {
    state.requests += 1;
    const parsed = url.parse(options.url);
    const method = options.method || 'GET';
    let requestPath = parsed.path;
    const data = options.data || {};
    const keys = Object.keys(data);
    // 与小程序一致：GET 请求把 data 拼到查询串，POST 才作为请求体
    if (method === 'GET' && keys.length) {
      requestPath += (requestPath.indexOf('?') >= 0 ? '&' : '?') + keys
        .map((key) => encodeURIComponent(key) + '=' + encodeURIComponent(data[key]))
        .join('&');
    }
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: requestPath,
        method: method,
        headers: options.header || {},
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          let data = body;
          try {
            data = JSON.parse(body);
          } catch (e) {
            // 非 JSON 响应按原样返回
          }
          options.success({ statusCode: res.statusCode, data: data, header: res.headers });
        });
      }
    );
    req.on('error', (e) => {
      state.failures += 1;
      options.fail({ errMsg: 'request:fail ' + e.message });
    });
    if (method !== 'GET' && keys.length) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  },
  showToast: () => {},
  showModal: (options) => options.success && options.success({ confirm: true }),
  navigateTo: () => {},
  redirectTo: () => {},
  switchTab: () => {},
  navigateBack: () => {},
  setTabBarBadge: () => {},
  removeTabBarBadge: () => {},
};

/**
 * 极简 setData（支持 'a.b' 路径）。
 */
function applyPatch(target, patch) {
  Object.keys(patch || {}).forEach((key) => {
    if (key.indexOf('.') < 0) {
      target[key] = patch[key];
      return;
    }
    const parts = key.split('.');
    let cursor = target;
    for (let i = 0; i < parts.length - 1; i += 1) {
      if (!cursor[parts[i]] || typeof cursor[parts[i]] !== 'object') {
        cursor[parts[i]] = {};
      }
      cursor = cursor[parts[i]];
    }
    cursor[parts[parts.length - 1]] = patch[key];
  });
}

const api = require('../utils/api');

/** 待检查的接口与断言 */
const CHECKS = [
  { name: 'GET /channels', run: () => api.listChannels(), assert: (d) => d.channels && d.channels.length > 0 },
  { name: 'GET /channels/1/products', run: () => api.listChannelProducts(1, { page: 1, page_size: 5 }), assert: (d) => d.products && d.products.length > 0 && d.channel },
  { name: 'GET /products/1/params', run: () => api.getProductParams(1), assert: (d) => d.params && d.params.length > 0 },
  { name: 'GET /products/1/questions', run: () => api.getProductQuestions(1), assert: (d) => d.questions && d.questions.length > 0 },
  { name: 'GET /reviews/tags', run: () => api.listReviewTags(), assert: (d) => d.tags && d.tags.length > 0 },
  { name: 'GET /marketing/levels', run: () => api.listMarketingLevels(), assert: (d) => d.levels && d.levels.length > 0 },
  { name: 'GET /help/articles', run: () => api.listHelpArticles({ page: 1, page_size: 5 }), assert: (d) => d.articles && d.articles.length > 0 },
  { name: 'GET /regions', run: () => api.listRegions(), assert: (d) => d.regions && d.regions.length > 0 },
  { name: 'GET /promotions', run: () => api.listPromotions({ page: 1, page_size: 5 }), assert: (d) => d.promotions && d.promotions.length > 0 },
  { name: 'GET /users/level（未登录 -> 演示兜底）', run: () => api.getUserLevel(), assert: (d) => d.level_name && d.levels },
  { name: 'GET /marketing/sign-in（未登录 -> 演示兜底）', run: () => api.getSignIn(), assert: (d) => typeof d.signed_today === 'boolean' && d.calendar },
  { name: 'GET /marketing/tasks（未登录 -> 演示兜底）', run: () => api.listTasks(), assert: (d) => d.tasks && d.tasks.length > 0 },
  { name: 'GET /after-sales（未登录 -> 演示兜底）', run: () => api.listAfterSales({ page: 1, page_size: 5 }), assert: (d) => d.after_sales },
  { name: 'GET /group-buys（未登录 -> 演示兜底）', run: () => api.listGroupBuys({ page: 1, page_size: 5 }), assert: (d) => d.group_buys },
  { name: 'GET /orders（未登录 -> 演示兜底）', run: () => api.listOrders({ page: 1, page_size: 5 }), assert: (d) => d.orders },
  { name: 'GET /users/security（未登录 -> 演示兜底）', run: () => api.getAccountSecurity(), assert: (d) => typeof d.phone_bound === 'boolean' },
];

/** 页面级检查：真实后端数据 -> 页面映射后的展示数据 */
const PAGE_CHECKS = [
  { page: 'subpkg-shop/channel-recommend/channel-recommend', pick: (d) => d.view.products.length + ' 件商品 / 频道 ' + (d.view.channel && d.view.channel.code) },
  { page: 'subpkg-shop/review-good/review-good', pick: (d) => d.view.reviews.length + ' 条好评 / 汇总 ' + JSON.stringify(d.view.summary) },
  { page: 'subpkg-shop/review-image/review-image', pick: (d) => d.view.reviews.length + ' 条有图评价' },
  { page: 'subpkg-shop/review-tags/review-tags', pick: (d) => d.tags.length + ' 个标签' },
  { page: 'subpkg-shop/channels/channels', pick: (d) => d.channels.length + ' 个频道' },
  { page: 'subpkg-shop/product-params/product-params', pick: (d) => d.params.length + ' 条参数 / 标题 ' + d.title },
  { page: 'subpkg-shop/product-questions/product-questions', pick: (d) => d.questions.length + ' 条问答' },
  { page: 'subpkg-order/order-pay/order-pay', pick: (d) => d.view.orders.length + ' 笔待付款订单' },
  { page: 'subpkg-order/after-sale-list/after-sale-list', pick: (d) => d.afterSales.length + ' 条售后' },
  { page: 'subpkg-order/task-center/task-center', pick: (d) => d.tasks.length + ' 个任务' },
  { page: 'subpkg-order/promotion-flash/promotion-flash', pick: (d) => d.view.promotions.length + ' 个秒杀活动' },
  { page: 'subpkg-order/group-buy-list/group-buy-list', pick: (d) => d.view.groupBuys.length + ' 个拼团' },
  { page: 'subpkg-order/promotion-session/promotion-session', pick: (d) => d.sessions.length + ' 个场次' },
  { page: 'pages/sign-in/sign-in', pick: (d) => '连续签到 ' + d.continuousDays + ' 天 / 日历 ' + d.records.length + ' 天' },
  { page: 'subpkg-user/user-level/user-level', pick: (d) => d.level.level_name + ' / 等级数 ' + d.levels.length },
  { page: 'subpkg-user/help-center/help-center', pick: (d) => d.articles.length + ' 篇文章 / 分类 ' + d.categories.length },
  { page: 'subpkg-user/region/region', pick: (d) => d.provinces.length + ' 个省份' },
  { page: 'subpkg-user/growth-logs/growth-logs', pick: (d) => d.logs.length + ' 条成长值明细' },
  { page: 'subpkg-user/notification-setting/notification-setting', pick: (d) => '通知项 ' + d.groups.reduce((sum, g) => sum + g.items.length, 0) + ' 个' },
];

/**
 * 在真实后端下运行一个页面并取出展示数据。
 * @param {string} pagePath 页面路径
 * @returns {Promise<object>}
 */
async function runPage(pagePath) {
  const pageFile = path.join(ROOT, pagePath + '.js');
  let config = null;
  global.Page = (cfg) => {
    config = cfg;
  };
  delete require.cache[require.resolve(pageFile)];
  require(pageFile);
  const context = Object.assign({}, config);
  context.data = JSON.parse(JSON.stringify(config.data || {}));
  context.setData = (patch) => applyPatch(context.data, patch);
  if (typeof config.onLoad === 'function') {
    config.onLoad.call(context, { id: '1', order_id: '1', product_id: '1', promotion_id: '1' });
  }
  if (typeof config.onShow === 'function') {
    config.onShow.call(context);
  }
  await new Promise((resolve) => setTimeout(resolve, 400));
  return context.data;
}

(async () => {
  console.log('==============================================');
  console.log(' 真实后端联调冒烟（' + BASE_URL + '）');
  console.log('==============================================');
  let failed = 0;
  for (const check of CHECKS) {
    try {
      const data = await check.run();
      const ok = check.assert(data);
      if (!ok) {
        failed += 1;
        console.log('✗ ' + check.name + ' 返回结构不符合预期：' + JSON.stringify(data).slice(0, 160));
      } else {
        console.log('✓ ' + check.name);
      }
    } catch (e) {
      failed += 1;
      console.log('✗ ' + check.name + ' 抛出异常：' + (e && e.message) + ' ' + JSON.stringify(e));
    }
  }
  console.log('---------------------------------------------');
  console.log('页面级检查（真实后端数据 -> 页面展示结构）');
  for (const check of PAGE_CHECKS) {
    try {
      const data = await runPage(check.page);
      console.log('✓ ' + check.page + ' -> ' + check.pick(data));
    } catch (e) {
      failed += 1;
      console.log('✗ ' + check.page + ' 异常：' + (e && e.message));
    }
  }
  console.log('---------------------------------------------');
  console.log('真实 HTTP 请求次数：' + state.requests);
  console.log('网络失败次数    ：' + state.failures);
  console.log('演示数据模式    ：' + (app.globalData.demoMode ? '已开启（未登录接口已回落到演示数据）' : '未开启'));
  console.log(failed ? '✗ 联调冒烟未通过，失败 ' + failed + ' 项' : '✓ 联调冒烟全部通过');
  process.exit(failed ? 1 : 0);
})();
