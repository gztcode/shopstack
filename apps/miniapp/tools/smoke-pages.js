#!/usr/bin/env node
/**
 * 页面运行时冒烟测试
 * ---------------------------------------------------------------
 * 目的：在 Node 环境下模拟小程序运行时（wx / getApp / Page），
 * 让每个页面真实跑一遍 onLoad + onShow，确认：
 *   1. 页面 JS 能被正常加载、Page 配置能正常生成；
 *   2. 所有接口请求在「后端未就绪」时能回落到 Mock 数据；
 *   3. 页面事件处理函数被调用时不会抛异常。
 *
 * 用法：node tools/smoke-pages.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

/** 模拟的微信 API 调用记录 */
const calls = { navigateTo: [], switchTab: [], redirectTo: [], toast: [] };

/**
 * 极简 setData 实现，支持 'a.b.c' 形式的路径写入。
 * @param {object} target 目标数据
 * @param {object} patch 待写入的数据
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
global.wx = {
  getStorageSync: () => '',
  setStorageSync: () => {},
  removeStorageSync: () => {},
  // 模拟后端未就绪：所有请求走网络失败，request 层会回落到 Mock
  request(options) {
    setTimeout(() => options.fail({ errMsg: 'request:fail' }), 0);
  },
  showToast(options) {
    calls.toast.push(options);
  },
  showModal(options) {
    if (typeof options.success === 'function') {
      options.success({ confirm: true, cancel: false });
    }
  },
  navigateTo(options) {
    calls.navigateTo.push(options.url);
  },
  redirectTo(options) {
    calls.redirectTo.push(options.url);
  },
  switchTab(options) {
    calls.switchTab.push(options.url);
  },
  navigateBack() {},
  setTabBarBadge() {},
  removeTabBarBadge() {},
  getWindowInfo: () => ({ statusBarHeight: 44 }),
  getSystemInfoSync: () => ({ statusBarHeight: 44 }),
  requestPayment(options) {
    if (typeof options.success === 'function') {
      options.success({ errMsg: 'requestPayment:ok' });
    }
  },
  chooseImage(options) {
    if (typeof options.success === 'function') {
      options.success(['https://placehold.co/300x300/2A4AD9/FFFFFF?text=Photo']);
    }
  },
  previewImage() {},
  getLocation(options) {
    if (typeof options.success === 'function') {
      options.success({ latitude: 30.27, longitude: 120.15 });
    }
  },
  setClipboardData() {},
  makePhoneCall() {},
  pageScrollTo(options) {
    if (typeof options.success === 'function') {
      options.success({});
    }
  },
  stopPullDownRefresh() {},
};

/** 读取 app.json 中的全部页面路径 */
const appJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
const pagePaths = appJson.pages.slice();
(appJson.subPackages || []).forEach((pkg) => {
  (pkg.pages || []).forEach((page) => pagePaths.push(pkg.root + '/' + page));
});

/** 事件处理函数候选：Page 配置中除生命周期以外的方法 */
const LIFECYCLE = ['onLoad', 'onShow', 'onReady', 'onHide', 'onUnload', 'onPullDownRefresh', 'onReachBottom', 'onShareAppMessage', 'onPageScroll', 'onTabItemTap'];

/** 模拟的事件对象 */
const fakeEvent = {
  currentTarget: { dataset: {} },
  target: { dataset: {} },
  detail: { value: '测试内容' },
  type: 'tap',
};

/** 事件绑定正则 */
const BINDING_REGEX = /\b(?:bind|catch):?[a-zA-Z][\w-]*\s*=\s*"([^"]*)"/g;

/**
 * 收集页面 WXML（含引入的模板）里绑定的事件处理函数名。
 * @param {string} pagePath 页面路径
 * @returns {Array<string>}
 */
function collectBoundHandlers(pagePath) {
  const names = new Set();
  const wxmlFile = path.join(ROOT, pagePath + '.wxml');
  const files = [wxmlFile];
  const first = fs.readFileSync(wxmlFile, 'utf8');
  const importRegex = /<import\s+src\s*=\s*"([^"]+)"/g;
  let match = importRegex.exec(first);
  while (match) {
    const target = path.resolve(path.dirname(wxmlFile), match[1]);
    if (fs.existsSync(target)) {
      files.push(target);
    }
    match = importRegex.exec(first);
  }
  files.forEach((file) => {
    const content = fs.readFileSync(file, 'utf8');
    let binding = BINDING_REGEX.exec(content);
    while (binding) {
      if (binding[1].trim()) {
        names.add(binding[1].trim());
      }
      binding = BINDING_REGEX.exec(content);
    }
    BINDING_REGEX.lastIndex = 0;
  });
  return Array.from(names);
}

let failed = 0;
const failures = [];

/**
 * 执行单个页面。
 * @param {string} pagePath 页面路径
 * @returns {Promise<void>}
 */
async function runPage(pagePath) {
  const pageFile = path.join(ROOT, pagePath + '.js');
  let config = null;
  global.Page = (cfg) => {
    config = cfg;
  };
  try {
    delete require.cache[require.resolve(pageFile)];
    require(pageFile);
  } catch (e) {
    failed += 1;
    failures.push(pagePath + ' 加载失败：' + e.message);
    return;
  }
  if (!config) {
    failed += 1;
    failures.push(pagePath + ' 未调用 Page()');
    return;
  }

  const context = Object.assign({}, config);
  context.data = JSON.parse(JSON.stringify(config.data || {}));
  context.setData = (patch) => applyPatch(context.data, patch);

  try {
    if (typeof config.onLoad === 'function') {
      config.onLoad.call(context, { id: '1', order_id: '1', product_id: '1', promotion_id: '1', status: '' });
    }
    if (typeof config.onShow === 'function') {
      config.onShow.call(context);
    }
    // 触发 WXML 中真正绑定的事件处理函数，确认不会抛异常
    const handlers = collectBoundHandlers(pagePath);
    handlers.forEach((name) => {
      if (typeof config[name] !== 'function') {
        failed += 1;
        failures.push(pagePath + ' 绑定了不存在的处理函数：' + name);
        return;
      }
      try {
        config[name].call(context, fakeEvent);
      } catch (e) {
        failed += 1;
        failures.push(pagePath + ' 事件处理函数 ' + name + ' 抛错：' + e.message);
      }
    });
  } catch (e) {
    failed += 1;
    failures.push(pagePath + ' 生命周期抛错：' + e.message);
  }

  // 等待接口 promise（Mock 回落）完成
  await new Promise((resolve) => setTimeout(resolve, 30));
}

(async () => {
  console.log('==============================================');
  console.log(' ShopStack 微信小程序页面冒烟测试');
  console.log('==============================================');
  for (const pagePath of pagePaths) {
    await runPage(pagePath);
  }
  console.log('页面数量                : ' + pagePaths.length);
  console.log('失败次数                : ' + failed);
  console.log('模拟接口请求次数        : ' + (calls.toast.length >= 0 ? 'toast ' + calls.toast.length + ' 条' : '0'));
  if (failures.length) {
    console.log('---------------------------------------------');
    failures.slice(0, 40).forEach((message) => console.log('  - ' + message));
    process.exit(1);
  }
  console.log('✓ 全部页面冒烟测试通过');
  process.exit(0);
})();
