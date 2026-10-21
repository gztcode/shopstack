/**
 * 通用格式化工具
 * ---------------------------------------------------------------
 * 约定：后端所有金额字段单位均为「分」（整数），此处统一换算为「元」。
 * 后端所有时间字段均为 RFC3339 字符串（示例：2026-10-20T11:50:00Z）。
 */

/**
 * 把「分」格式化为「元」字符串，保留两位小数。
 * @param {number|string} cents 金额（分）
 * @returns {string} 例如 429900 -> "4299.00"
 */
function formatYuan(cents) {
  const num = Number(cents);
  if (!isFinite(num)) {
    return '0.00';
  }
  return (num / 100).toFixed(2);
}

/**
 * 带货币符号的金额文本。
 * @param {number|string} cents 金额（分）
 * @returns {string} 例如 429900 -> "¥4299.00"
 */
function formatPrice(cents) {
  return '¥' + formatYuan(cents);
}

/**
 * 销量 / 数量等大数字缩写。
 * @param {number} value 原始数值
 * @returns {string} 12345 -> "1.2万"
 */
function formatCount(value) {
  const num = Number(value) || 0;
  if (num >= 100000000) {
    return (num / 100000000).toFixed(1).replace(/\.0$/, '') + '亿';
  }
  if (num >= 10000) {
    return (num / 10000).toFixed(1).replace(/\.0$/, '') + '万';
  }
  return String(num);
}

/**
 * 解析后端时间字符串为 Date，解析失败返回 null。
 * @param {string} value RFC3339 时间字符串
 * @returns {Date|null}
 */
function parseTime(value) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * 格式化为「YYYY-MM-DD HH:mm」。
 * @param {string} value RFC3339 时间字符串
 * @returns {string}
 */
function formatDateTime(value) {
  const date = parseTime(value);
  if (!date) {
    return '';
  }
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  return (
    date.getFullYear() +
    '-' +
    pad(date.getMonth() + 1) +
    '-' +
    pad(date.getDate()) +
    ' ' +
    pad(date.getHours()) +
    ':' +
    pad(date.getMinutes())
  );
}

/**
 * 格式化为「YYYY-MM-DD」。
 * @param {string} value RFC3339 时间字符串
 * @returns {string}
 */
function formatDate(value) {
  const date = parseTime(value);
  if (!date) {
    return '';
  }
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

/**
 * 把「Unix 秒级时间戳」格式化为「YYYY-MM-DD HH:mm」。
 * 营销域的活动场次、拼团等接口用 int64 秒级时间戳传输时间字段。
 * @param {number|string} value Unix 秒级时间戳
 * @returns {string}
 */
function formatUnixTime(value) {
  const num = Number(value);
  if (!isFinite(num) || num <= 0) {
    return '';
  }
  const date = new Date(num * 1000);
  if (isNaN(date.getTime())) {
    return '';
  }
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  return (
    date.getFullYear() +
    '-' +
    pad(date.getMonth() + 1) +
    '-' +
    pad(date.getDate()) +
    ' ' +
    pad(date.getHours()) +
    ':' +
    pad(date.getMinutes())
  );
}

/**
 * 相对时间描述，用于订单状态时间线。
 * @param {string} value RFC3339 时间字符串
 * @returns {string} 例如 "3 分钟前"
 */
function fromNow(value) {
  const date = parseTime(value);
  if (!date) {
    return '';
  }
  const diff = Date.now() - date.getTime();
  if (diff < 0) {
    return '刚刚';
  }
  const minute = 60000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) {
    return '刚刚';
  }
  if (diff < hour) {
    return Math.floor(diff / minute) + ' 分钟前';
  }
  if (diff < day) {
    return Math.floor(diff / hour) + ' 小时前';
  }
  if (diff < 30 * day) {
    return Math.floor(diff / day) + ' 天前';
  }
  return formatDate(value);
}

/**
 * 手机号脱敏。
 * @param {string} phone 手机号
 * @returns {string} 13800138000 -> "138****8000"
 */
function formatPhone(phone) {
  const text = String(phone || '');
  if (text.length !== 11) {
    return text;
  }
  return text.slice(0, 3) + '****' + text.slice(7);
}

/**
 * 驼峰转下划线。
 * @param {string} key 键名
 * @returns {string}
 */
function toSnakeKey(key) {
  if (typeof key !== 'string' || !/[A-Z]/.test(key)) {
    return key;
  }
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}

/**
 * 递归把对象键名统一为下划线风格。
 * 目的：无论网关使用 proto 字段名（snake_case）还是 JSON 默认字段名（camelCase），
 * 页面侧始终按 proto 字段名读取，字段结构与 proto 保持一致。
 * @param {*} value 任意结构
 * @returns {*} 规范化后的结构
 */
function normalizeKeys(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeKeys);
  }
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const result = {};
    Object.keys(value).forEach((key) => {
      result[toSnakeKey(key)] = normalizeKeys(value[key]);
    });
    return result;
  }
  return value;
}

/**
 * 容错读取：优先下划线字段名，兼容驼峰字段名。
 * @param {object} obj 数据对象
 * @param {string} key 下划线字段名
 * @param {*} fallback 默认值
 * @returns {*}
 */
function pick(obj, key, fallback) {
  if (!obj) {
    return fallback;
  }
  if (obj[key] !== undefined && obj[key] !== null) {
    return obj[key];
  }
  const camel = key.replace(/_([a-z])/g, (m, c) => c.toUpperCase());
  if (obj[camel] !== undefined && obj[camel] !== null) {
    return obj[camel];
  }
  return fallback;
}

/**
 * 防抖，用于搜索输入。
 * @param {Function} fn 目标函数
 * @param {number} wait 等待毫秒
 * @returns {Function}
 */
function debounce(fn, wait) {
  let timer = null;
  return function () {
    const self = this;
    const args = arguments;
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = null;
      fn.apply(self, args);
    }, wait || 300);
  };
}

/**
 * 生成订单号（演示用，真实场景由后端生成）。
 * @returns {string}
 */
function genOrderNo() {
  const d = new Date();
  const pad = (n, len) => {
    let s = String(n);
    while (s.length < len) {
      s = '0' + s;
    }
    return s;
  };
  return (
    'SS' +
    d.getFullYear() +
    pad(d.getMonth() + 1, 2) +
    pad(d.getDate(), 2) +
    pad(d.getHours(), 2) +
    pad(d.getMinutes(), 2) +
    pad(d.getSeconds(), 2) +
    pad(Math.floor(Math.random() * 1000), 3)
  );
}

module.exports = {
  formatYuan,
  formatPrice,
  formatCount,
  formatDateTime,
  formatDate,
  formatUnixTime,
  fromNow,
  formatPhone,
  toSnakeKey,
  normalizeKeys,
  pick,
  debounce,
  genOrderNo,
};
