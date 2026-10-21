#!/usr/bin/env node
/**
 * 微信小程序自检脚本
 * ---------------------------------------------------------------
 * 校验项：
 *   1. 页面总数（app.json 的 pages[] + subPackages[].pages[] 之和）== 80
 *   2. 每个页面四件套齐全（.js / .json / .wxml / .wxss），且 .json 可 JSON.parse
 *   3. 无死按钮：WXML 中所有 bind / catch 事件绑定在对应 JS 中都有处理函数
 *   4. 无占位文案：页面与模板中不出现 TODO / FIXME / 敬请期待 / 开发中等占位内容
 *   5. 路由有效：静态跳转地址都能在 app.json 中找到对应页面
 *   6. WXML 表达式合法：不使用正则字面量 / Math 等全局对象 / 方法调用
 *
 * 用法：node tools/validate-miniapp.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const EXPECTED_PAGE_COUNT = 80;

/** 事件绑定：bindtap / catchtap / bind:select / catch:action 等 */
const BINDING_REGEX = /\b(?:bind|catch):?[a-zA-Z][\w-]*\s*=\s*"([^"]*)"/g;

/** JS 中的方法定义：onFoo(e) { / onFoo: function () { */
const METHOD_REGEX = /(?:^|[\s{,(])([A-Za-z_$][\w$]*)\s*\([^()]*\)\s*\{/g;

/** 对象字面量里的方法：onFoo: function (e) { */
const METHOD_PROP_REGEX = /(?:^|[\s{,(])([A-Za-z_$][\w$]*)\s*:\s*function\s*\(/g;

/** 静态路由地址 */
const ROUTE_REGEX = /['"](\/(?:pages|subpkg-[a-z]+)\/[a-z0-9\-]+(?:\/[a-z0-9\-]+)?)(?:\?[^'"]*)?['"]/g;

/** 占位文案 */
const PLACEHOLDER_REGEX = /(TODO|FIXME|敬请期待|开发中|功能上线中|暂未开放|coming soon)/i;

const errors = [];
const warnings = [];

/**
 * 读取文件。
 * @param {string} file 绝对路径
 * @returns {string|null}
 */
function read(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (e) {
    return null;
  }
}

/**
 * 收集 WXML 中 <import src="..." /> 引入的模板文件。
 * @param {string} wxmlFile wxml 绝对路径
 * @param {string} content wxml 内容
 * @returns {Array<string>} 模板文件绝对路径
 */
function collectImportedTemplates(wxmlFile, content) {
  const result = [];
  const regex = /<import\s+src\s*=\s*"([^"]+)"/g;
  let match = regex.exec(content);
  while (match) {
    const target = path.resolve(path.dirname(wxmlFile), match[1]);
    if (fs.existsSync(target)) {
      result.push(target);
    }
    match = regex.exec(content);
  }
  return result;
}

/**
 * 收集 JS 中 require 的 templates 目录下的模块。
 * @param {string} jsFile js 绝对路径
 * @param {string} content js 内容
 * @returns {Array<string>} 模块绝对路径
 */
function collectRequiredTemplates(jsFile, content) {
  const result = [];
  const regex = /require\(['"]([^'"]+)['"]\)/g;
  let match = regex.exec(content);
  while (match) {
    if (match[1].indexOf('templates/') >= 0) {
      const target = path.resolve(path.dirname(jsFile), match[1]);
      if (fs.existsSync(target)) {
        result.push(target);
      }
    }
    match = regex.exec(content);
  }
  return result;
}

/**
 * 提取 JS 文件中定义的方法名集合。
 * @param {string} content js 内容
 * @returns {Set<string>}
 */
function extractMethods(content) {
  const names = new Set();
  let match = METHOD_REGEX.exec(content);
  while (match) {
    names.add(match[1]);
    match = METHOD_REGEX.exec(content);
  }
  match = METHOD_PROP_REGEX.exec(content);
  while (match) {
    names.add(match[1]);
    match = METHOD_PROP_REGEX.exec(content);
  }
  return names;
}

// ---------------------------------------------------------------------------
// 1. 读取 app.json 并统计页面
// ---------------------------------------------------------------------------
const appJsonPath = path.join(ROOT, 'app.json');
const appJsonRaw = read(appJsonPath);
if (appJsonRaw === null) {
  console.error('✗ 无法读取 app.json');
  process.exit(1);
}

let appJson = null;
try {
  appJson = JSON.parse(appJsonRaw);
} catch (e) {
  console.error('✗ app.json 不是合法 JSON：' + e.message);
  process.exit(1);
}

const mainPages = appJson.pages || [];
const subPackages = appJson.subPackages || [];
const subPageCount = subPackages.reduce((sum, pkg) => sum + (pkg.pages || []).length, 0);
const totalPages = mainPages.length + subPageCount;

console.log('==============================================');
console.log(' ShopStack 微信小程序自检');
console.log('==============================================');
console.log('主包页面（pages[]）      : ' + mainPages.length);
console.log('分包页面（subPackages）  : ' + subPageCount);
console.log('页面总数                : ' + totalPages + ' （目标 ' + EXPECTED_PAGE_COUNT + '）');

if (totalPages !== EXPECTED_PAGE_COUNT) {
  errors.push('页面总数 ' + totalPages + ' != ' + EXPECTED_PAGE_COUNT);
}

/** 全部页面路径（不含 .js 后缀） */
const allPagePaths = mainPages.slice();
subPackages.forEach((pkg) => {
  (pkg.pages || []).forEach((page) => {
    allPagePaths.push(pkg.root + '/' + page);
  });
});

const pagePathSet = new Set(allPagePaths);

// ---------------------------------------------------------------------------
// 2. 四件套 + JSON 可解析
// ---------------------------------------------------------------------------
let missingCount = 0;
let jsonErrorCount = 0;
allPagePaths.forEach((pagePath) => {
  const base = path.join(ROOT, pagePath);
  ['.js', '.json', '.wxml', '.wxss'].forEach((ext) => {
    if (!fs.existsSync(base + ext)) {
      errors.push('缺少四件套文件：' + pagePath + ext);
      missingCount += 1;
    }
  });
  const jsonRaw = read(base + '.json');
  if (jsonRaw !== null) {
    try {
      JSON.parse(jsonRaw);
    } catch (e) {
      errors.push('页面 JSON 无法解析：' + pagePath + '.json -> ' + e.message);
      jsonErrorCount += 1;
    }
  }
});
console.log('四件套缺失文件数        : ' + missingCount);
console.log('JSON 解析失败数         : ' + jsonErrorCount);

// ---------------------------------------------------------------------------
// 3. 事件绑定是否有处理函数
// ---------------------------------------------------------------------------
let bindingTotal = 0;
let deadBindingTotal = 0;
allPagePaths.forEach((pagePath) => {
  const base = path.join(ROOT, pagePath);
  const pageWxml = base + '.wxml';
  const pageJs = base + '.js';
  const wxmlRaw = read(pageWxml);
  const jsRaw = read(pageJs);
  if (wxmlRaw === null || jsRaw === null) {
    return;
  }

  /** 需要检查的 WXML：页面自身 + 引入的模板 */
  const wxmlSources = [{ file: pagePath + '.wxml', content: wxmlRaw }];
  collectImportedTemplates(pageWxml, wxmlRaw).forEach((file) => {
    const content = read(file);
    if (content !== null) {
      wxmlSources.push({ file: path.relative(ROOT, file), content: content });
    }
  });

  /** 可用的处理函数：页面 JS + 模板 JS（页面 require 的 + 模板 wxml 对应的） */
  const methods = extractMethods(jsRaw);
  const jsFiles = [pageJs];
  collectRequiredTemplates(pageJs, jsRaw).forEach((file) => jsFiles.push(file));
  wxmlSources.forEach((source) => {
    if (source.file === pagePath + '.wxml') {
      return;
    }
    const candidate = source.file.replace(/\.wxml$/, '.js');
    const abs = path.join(ROOT, candidate);
    if (fs.existsSync(abs)) {
      jsFiles.push(abs);
    }
  });
  jsFiles.forEach((file) => {
    const content = read(file);
    if (content !== null) {
      extractMethods(content).forEach((name) => methods.add(name));
    }
  });

  wxmlSources.forEach((source) => {
    let match = BINDING_REGEX.exec(source.content);
    while (match) {
      bindingTotal += 1;
      const handler = match[1].trim();
      if (!handler) {
        errors.push('空事件绑定：' + pagePath + ' -> ' + source.file);
        deadBindingTotal += 1;
      } else if (!methods.has(handler)) {
        errors.push('事件绑定缺少处理函数：' + pagePath + ' -> ' + handler + '（' + source.file + '）');
        deadBindingTotal += 1;
      }
      match = BINDING_REGEX.exec(source.content);
    }
    BINDING_REGEX.lastIndex = 0;
  });
});
console.log('事件绑定总数            : ' + bindingTotal);
console.log('无处理函数的事件绑定数  : ' + deadBindingTotal);

// ---------------------------------------------------------------------------
// 4. 占位文案
// ---------------------------------------------------------------------------
let placeholderTotal = 0;
const scanFiles = allPagePaths
  .map((pagePath) => path.join(ROOT, pagePath) + '.js')
  .concat(allPagePaths.map((pagePath) => path.join(ROOT, pagePath) + '.wxml'))
  .concat(
    fs.existsSync(path.join(ROOT, 'templates'))
      ? fs.readdirSync(path.join(ROOT, 'templates')).map((name) => path.join(ROOT, 'templates', name))
      : []
  );
scanFiles.forEach((file) => {
  const content = read(file);
  if (content === null) {
    return;
  }
  const match = content.match(PLACEHOLDER_REGEX);
  if (match) {
    errors.push('存在占位文案：' + path.relative(ROOT, file) + ' -> ' + match[0]);
    placeholderTotal += 1;
  }
});
console.log('占位文案数量            : ' + placeholderTotal);

// ---------------------------------------------------------------------------
// 5. 静态路由指向的页面是否存在
// ---------------------------------------------------------------------------
let routeTotal = 0;
let badRouteTotal = 0;
scanFiles
  .filter((file) => file.endsWith('.js'))
  .forEach((file) => {
    const content = read(file);
    if (content === null) {
      return;
    }
    let match = ROUTE_REGEX.exec(content);
    while (match) {
      routeTotal += 1;
      if (!pagePathSet.has(match[1].replace(/^\//, ''))) {
        errors.push('路由指向不存在的页面：' + path.relative(ROOT, file) + ' -> ' + match[1]);
        badRouteTotal += 1;
      }
      match = ROUTE_REGEX.exec(content);
    }
    ROUTE_REGEX.lastIndex = 0;
  });
console.log('静态路由地址数          : ' + routeTotal);
console.log('无效路由地址数          : ' + badRouteTotal);

// ---------------------------------------------------------------------------
// 6. WXML 表达式合法性
// ---------------------------------------------------------------------------
// WXML 的 {{ }} 表达式不是完整 JS：不支持正则字面量、Math 等全局对象、
// 也不支持方法调用。写了这些会在微信开发者工具里直接编译失败，
// 并且会让整个分包一起加载不出来（一个文件报错，同分包页面全部白屏）。
// 因此这类计算必须在页面 JS 里算好，再以纯字段绑定到模板。
let expressionTotal = 0;
let badExpressionTotal = 0;

/** {{ }} 表达式 */
const EXPRESSION_REGEX = /\{\{([\s\S]*?)\}\}/g;
/** 表达式里不允许出现的全局对象 */
const GLOBAL_OBJECT_REGEX = /\b(Math|Date|JSON|Object|Array|RegExp)\s*\./;
/** 表达式里不允许出现的方法调用 */
const METHOD_CALL_REGEX = /\.\s*(toFixed|replace|join|map|filter|slice|split|substring|substr|padStart|padEnd|indexOf|lastIndexOf|toUpperCase|toLowerCase|trim|charAt|concat|includes|find|some|every|sort|reverse|toString)\s*\(/;
/** 正则字面量：/ 后跟非 / 字符，且前面不是表达式操作数 */
const REGEX_LITERAL_REGEX = /(?<=[\s(,=?:!+*&|[-])\/(?![/*])(?:[^/\\\n]|\\.)+\/[gimsuy]*/;

allPagePaths.forEach((pagePath) => {
  const wxmlFile = path.join(ROOT, pagePath) + '.wxml';
  const content = read(wxmlFile);
  if (content === null) {
    return;
  }
  let match = EXPRESSION_REGEX.exec(content);
  while (match) {
    expressionTotal += 1;
    const expr = match[1];
    const problems = [];
    if (GLOBAL_OBJECT_REGEX.test(expr)) {
      problems.push('使用了全局对象（' + GLOBAL_OBJECT_REGEX.exec(expr)[1] + '）');
    }
    if (METHOD_CALL_REGEX.test(expr)) {
      problems.push('调用了方法（' + METHOD_CALL_REGEX.exec(expr)[1] + '）');
    }
    if (REGEX_LITERAL_REGEX.test(expr)) {
      problems.push('使用了正则字面量');
    }
    if (problems.length) {
      errors.push('WXML 表达式不受支持：' + pagePath + '.wxml -> ' + problems.join('、') + ' | ' + expr.trim().slice(0, 80));
      badExpressionTotal += 1;
    }
    match = EXPRESSION_REGEX.exec(content);
  }
  EXPRESSION_REGEX.lastIndex = 0;
});
console.log('WXML 表达式总数          : ' + expressionTotal);
console.log('不受支持的表达式数      : ' + badExpressionTotal);

// ---------------------------------------------------------------------------
// 结果
// ---------------------------------------------------------------------------
console.log('==============================================');
if (errors.length) {
  console.log('✗ 自检未通过，共 ' + errors.length + ' 个问题：');
  errors.slice(0, 60).forEach((message) => console.log('  - ' + message));
  if (errors.length > 60) {
    console.log('  ... 其余 ' + (errors.length - 60) + ' 个问题已省略');
  }
  process.exit(1);
}
if (warnings.length) {
  console.log('! 警告 ' + warnings.length + ' 条：');
  warnings.forEach((message) => console.log('  - ' + message));
}
console.log('✓ 自检全部通过');
process.exit(0);
