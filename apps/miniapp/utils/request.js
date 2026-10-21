/**
 * 网络请求封装
 * ---------------------------------------------------------------
 * 1. 统一拼接网关地址与 /api/v1 前缀；
 * 2. 统一解析响应信封 { code, message, data, trace_id }，code === 0 视为成功；
 * 3. 携带 Bearer Token；遇到 401 时用 refresh_token 静默刷新并重放一次；
 * 4. 后端未就绪（网络失败 / 404 / 5xx）时回退到 mock 数据，并开启「演示数据模式」提示。
 */

const mock = require('./mock');
const format = require('./format');

/** 网关地址（默认） */
const DEFAULT_BASE_URL = 'http://localhost:8080/api/v1';

/**
 * 网关地址覆盖：调试时可写入本地存储切换后端地址，无需改动页面代码。
 * 例如本机 8080 被占用时：wx.setStorageSync('ss_base_url', 'http://127.0.0.1:8090/api/v1')
 */
const BASE_URL_KEY = 'ss_base_url';

/** 请求超时（毫秒） */
const TIMEOUT = 12000;

/** 本地存储 key */
const ACCESS_TOKEN_KEY = 'ss_access_token';
const REFRESH_TOKEN_KEY = 'ss_refresh_token';
const USER_KEY = 'ss_user';

/**
 * 获取当前生效的网关地址。
 * @returns {string}
 */
function getBaseUrl() {
  try {
    const custom = wx.getStorageSync(BASE_URL_KEY);
    if (custom) {
      return String(custom).replace(/\/+$/, '');
    }
  } catch (e) {
    // 读取失败时使用默认地址
  }
  return DEFAULT_BASE_URL;
}

/**
 * 读取本地 access token。
 * @returns {string}
 */
function getToken() {
  try {
    return wx.getStorageSync(ACCESS_TOKEN_KEY) || '';
  } catch (e) {
    return '';
  }
}

/**
 * 读取本地 refresh token。
 * @returns {string}
 */
function getRefreshToken() {
  try {
    return wx.getStorageSync(REFRESH_TOKEN_KEY) || '';
  } catch (e) {
    return '';
  }
}

/**
 * 保存鉴权信息。
 * @param {object} auth { access_token, refresh_token, user }
 */
function saveAuth(auth) {
  try {
    if (auth && auth.access_token) {
      wx.setStorageSync(ACCESS_TOKEN_KEY, auth.access_token);
    }
    if (auth && auth.refresh_token) {
      wx.setStorageSync(REFRESH_TOKEN_KEY, auth.refresh_token);
    }
    if (auth && auth.user) {
      wx.setStorageSync(USER_KEY, auth.user);
    }
  } catch (e) {
    // 存储失败不影响主流程
  }
}

/**
 * 清除鉴权信息。
 */
function clearAuth() {
  try {
    wx.removeStorageSync(ACCESS_TOKEN_KEY);
    wx.removeStorageSync(REFRESH_TOKEN_KEY);
    wx.removeStorageSync(USER_KEY);
  } catch (e) {
    // ignore
  }
}

/**
 * 标记当前处于「演示数据模式」，并通知页面刷新提示条。
 */
function markDemoMode() {
  try {
    const app = getApp();
    if (app) {
      app.globalData.demoMode = true;
      if (typeof app.notifyDemoMode === 'function') {
        app.notifyDemoMode();
      }
    }
  } catch (e) {
    // ignore
  }
}

/**
 * 回退到 mock 数据。
 * @param {object} options 请求配置
 * @param {Function} resolve promise resolve
 * @param {Function} reject promise reject
 * @param {Error} error 原始错误
 */
function fallbackToMock(options, resolve, reject, error) {
  const key = options && options.mock;
  if (!key) {
    reject({ code: -1, message: (error && error.errMsg) || '网络请求失败', data: null });
    return;
  }
  let data = null;
  try {
    data = mock.getMock(key, options.data || {});
  } catch (e) {
    reject({ code: -1, message: '演示数据解析失败：' + (e && e.message), data: null });
    return;
  }
  if (data === null || data === undefined) {
    reject({ code: -1, message: '接口未就绪且无对应演示数据', data: null });
    return;
  }
  markDemoMode();
  resolve(format.normalizeKeys(data));
}

/**
 * 使用 refresh_token 静默刷新并重放原请求。
 * @param {object} options 原请求配置
 * @param {Function} resolve promise resolve
 * @param {Function} reject promise reject
 */
function refreshAndReplay(options, resolve, reject) {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearAuth();
    reject({ code: 401, message: '登录状态已失效，请重新登录', data: null });
    return;
  }
  wx.request({
    url: getBaseUrl() + '/auth/refresh',
    method: 'POST',
    data: { refresh_token: refreshToken },
    header: { 'Content-Type': 'application/json' },
    timeout: TIMEOUT,
    success(res) {
      const body = res.data || {};
      if (res.statusCode === 200 && body.code === 0 && body.data) {
        saveAuth(body.data);
        options.__retried = true;
        request(options).then(resolve).catch(reject);
      } else {
        clearAuth();
        reject({ code: 401, message: '登录状态已失效，请重新登录', data: null });
      }
    },
    fail() {
      clearAuth();
      reject({ code: 401, message: '登录状态已失效，请重新登录', data: null });
    },
  });
}

/**
 * 发起请求。
 * @param {object} options
 * @param {string} options.url      以 / 开头的接口路径
 * @param {string} [options.method] 请求方法，默认 GET
 * @param {object} [options.data]   请求参数
 * @param {string} [options.mock]   后端不可用时使用的演示数据标识
 * @param {boolean} [options.auth]  是否携带 Token，默认 true
 * @param {boolean} [options.fallbackOnError] 业务错误 / 鉴权失败时是否回落到演示数据，默认 false
 * @param {object} [options.header] 额外请求头
 * @returns {Promise<object>} 响应信封中的 data
 */
function request(options) {
  const opts = options || {};
  return new Promise((resolve, reject) => {
    const token = opts.auth === false ? '' : getToken();
    const header = Object.assign({ 'Content-Type': 'application/json' }, opts.header || {});
    if (token) {
      header.Authorization = 'Bearer ' + token;
    }
    wx.request({
      url: getBaseUrl() + opts.url,
      method: opts.method || 'GET',
      data: opts.data || {},
      header: header,
      timeout: TIMEOUT,
      success(res) {
        const status = res.statusCode;
        if (status === 401 && !opts.__retried) {
          if (opts.fallbackOnError) {
            // 该接口允许在未登录 / 鉴权失败时回落到演示数据
            fallbackToMock(opts, resolve, reject, { errMsg: 'HTTP 401' });
            return;
          }
          refreshAndReplay(opts, resolve, reject);
          return;
        }
        if (status === 404 || status >= 500) {
          // 后端路由或服务未就绪，走演示数据
          fallbackToMock(opts, resolve, reject, { errMsg: 'HTTP ' + status });
          return;
        }
        const body = res.data || {};
        if (body.code === 0) {
          resolve(format.normalizeKeys(body.data));
        } else if (opts.fallbackOnError) {
          // 接口返回业务错误时回落到演示数据（页面顶部会提示演示数据模式）
          fallbackToMock(opts, resolve, reject, { errMsg: body.message || '业务错误' });
        } else {
          reject({ code: body.code, message: body.message || '请求失败', data: body.data, trace_id: body.trace_id });
        }
      },
      fail(error) {
        fallbackToMock(opts, resolve, reject, error);
      },
    });
  });
}

/**
 * 切换为演示数据模式（供设置项手动开启）。
 */
function enableDemoMode() {
  markDemoMode();
}

module.exports = {
  request: request,
  BASE_URL: DEFAULT_BASE_URL,
  getBaseUrl: getBaseUrl,
  getToken: getToken,
  getRefreshToken: getRefreshToken,
  saveAuth: saveAuth,
  clearAuth: clearAuth,
  enableDemoMode: enableDemoMode,
};
