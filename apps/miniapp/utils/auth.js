/**
 * 登录态与用户身份
 * ---------------------------------------------------------------
 * Token 与用户信息统一存放在 wx storage 中：
 *   ss_access_token / ss_refresh_token / ss_user
 */

const request = require('./request');

const USER_KEY = 'ss_user';

/**
 * 是否已登录。
 * @returns {boolean}
 */
function isLoggedIn() {
  return !!request.getToken();
}

/**
 * 读取本地缓存的用户信息。
 * @returns {object|null}
 */
function getUser() {
  try {
    return wx.getStorageSync(USER_KEY) || null;
  } catch (e) {
    return null;
  }
}

/**
 * 写入本地缓存的用户信息。
 * @param {object} user 用户信息
 */
function setUser(user) {
  try {
    wx.setStorageSync(USER_KEY, user);
  } catch (e) {
    // ignore
  }
}

/**
 * 账号密码登录。
 * @param {string} username 用户名
 * @param {string} password 密码
 * @returns {Promise<object>} AuthResponse
 */
function login(username, password) {
  return request
    .request({ url: '/auth/login', method: 'POST', data: { username: username, password: password }, mock: 'authLogin', auth: false })
    .then((data) => {
      request.saveAuth(data);
      setUser(data.user);
      return data;
    });
}

/**
 * 注册账号。
 * @param {object} payload { username, password, phone, nickname }
 * @returns {Promise<object>} AuthResponse
 */
function register(payload) {
  return request
    .request({ url: '/auth/register', method: 'POST', data: payload, mock: 'authRegister', auth: false })
    .then((data) => {
      request.saveAuth(data);
      setUser(data.user);
      return data;
    });
}

/**
 * 微信登录（code 来自 wx.login）。
 * @param {string} code 临时登录凭证
 * @param {string} [nickname] 昵称
 * @param {string} [avatar] 头像
 * @returns {Promise<object>} AuthResponse
 */
function wechatLogin(code, nickname, avatar) {
  return request
    .request({
      url: '/auth/wechat',
      method: 'POST',
      data: { code: code, nickname: nickname || '', avatar: avatar || '' },
      mock: 'authWechat',
      auth: false,
    })
    .then((data) => {
      request.saveAuth(data);
      setUser(data.user);
      return data;
    });
}

/**
 * 拉取最新的用户资料。
 * @returns {Promise<object>} User
 */
function getProfile() {
  return request.request({ url: '/users/me', method: 'GET', mock: 'profile' }).then((user) => {
    setUser(user);
    return user;
  });
}

/**
 * 更新用户资料。
 * @param {object} payload { nickname, avatar, email, gender, birthday }
 * @returns {Promise<object>} User
 */
function updateProfile(payload) {
  return request.request({ url: '/users/me', method: 'PUT', data: payload, mock: 'profileUpdate' }).then((user) => {
    setUser(user);
    return user;
  });
}

/**
 * 退出登录。
 */
function logout() {
  return request
    .request({ url: '/auth/logout', method: 'POST', data: {}, mock: null })
    .catch(() => null)
    .then(() => {
      request.clearAuth();
    });
}

/**
 * 校验登录态，未登录时跳转登录页。
 * @returns {Promise<boolean>} 已登录返回 true
 */
function requireLogin() {
  if (isLoggedIn()) {
    return Promise.resolve(true);
  }
  return new Promise((resolve, reject) => {
    wx.navigateTo({
      url: '/pages/login/login?redirect=' + encodeURIComponent(getCurrentRoute()),
      success() {
        reject({ code: 401, message: '请先登录', data: null });
      },
      fail() {
        reject({ code: 401, message: '请先登录', data: null });
      },
    });
  });
}

/**
 * 获取当前页面路径，用于登录后跳回。
 * @returns {string}
 */
function getCurrentRoute() {
  try {
    const pages = getCurrentPages();
    if (pages && pages.length) {
      const page = pages[pages.length - 1];
      return page.route || '';
    }
  } catch (e) {
    // ignore
  }
  return '';
}

module.exports = {
  isLoggedIn: isLoggedIn,
  getUser: getUser,
  setUser: setUser,
  login: login,
  register: register,
  wechatLogin: wechatLogin,
  getProfile: getProfile,
  updateProfile: updateProfile,
  logout: logout,
  requireLogin: requireLogin,
};
