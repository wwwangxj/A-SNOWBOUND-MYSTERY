/* =========================================================
 * 无限世界 · SAVE_STATE v2 存档协议核心库
 * ---------------------------------------------------------
 * 整条世界线的关卡都靠这个文件衔接，队伍【不需要修改本文件】。
 *
 * 队伍常用 API：
 *   WL.readSave(levelNo)        读档（宽容：缺字段补默认、多字段忽略、类型自动转换）
 *   WL.consumeAny(items, type)  按类型取用上家道具，取不到返回 null → 触发本关兜底剧情
 *   WL.addItem(save, item)      往背包加道具 { id, name, type }
 *   WL.addClue(save, text)      加线索
 *   WL.setPlayer(save, patch)   改面板 { hp, sanity, level }（血量0–10，等级1–10）
 *   WL.completeLevel(config, save, opts)
 *                               校验出口 → 写档 → 过场 → 跳转；缺交接必填项返回 null
 *                               opts = { exitHook: '结尾一句话', nextUrl: '下一关页面地址' }
 *   WL.renderOpening(save)      前情提要条（自动呼应上家钩子）
 *   WL.renderSaveCard(save, level, world)   五行「通关存档卡」
 *   WL.goTo(url, save)          带存档与旅程进入页面（大厅首跳也使用）
 *   WL.mountDebug(save)         安装存档复制、导入、重置按钮
 *
 * 存档传递通道：localStorage（同一台电脑接力）
 *              + URL ?save=存档码&history=旅程码（跳转时自动附加，兼容 file:// 分页存储）
 *
 * 纯静态实现：file:// 双击即可运行，无任何依赖。
 * ========================================================= */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'wuxianliu_save_v2';
  var HISTORY_KEY = 'wuxianliu_history_v2';
  var memoryHistory = null;
  var SCHEMA = 'v2';

  /* 道具类型词表（8 类，消费按类型匹配，不按名称匹配） */
  var ITEM_TYPES = ['key', 'tool', 'light', 'food', 'token', 'info', 'weapon', 'strange'];
  var TYPE_LABELS = {
    key: '钥匙', tool: '工具', light: '照明', food: '食物',
    token: '信物', info: '情报', weapon: '武器', strange: '异物'
  };

  /* ---------------- 基础工具 ---------------- */

  function esc(text) {
    return String(text === undefined || text === null ? '' : text)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function toInt(value, fallback, min) {
    var n = parseInt(value, 10);
    if (isNaN(n)) n = fallback;
    if (typeof min === 'number' && n < min) n = min;
    return n;
  }

  function toStr(value, fallback) {
    if (value === undefined || value === null) return fallback || '';
    return String(value);
  }

  function defaultSave(levelNo) {
    return {
      schema: SCHEMA,
      level: typeof levelNo === 'number' ? levelNo : 1,
      player: { hp: 3, sanity: 2, level: 1 },   /* 开局面板全场统一：血量3/10 · 理智2 · 等级1/10 */
      items: [],                       /* 空背包 */
      clues: [],
      exit_hook: '',
      prev_world: '',
      next_world: ''
    };
  }

  /* 道具归一化：类型不在词表内 → 归为 strange（异物） */
  function coerceItem(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    var type = toStr(raw.type, 'strange').trim().toLowerCase();
    if (ITEM_TYPES.indexOf(type) === -1) type = 'strange';
    return {
      id: toStr(raw.id, '').trim() || 'item_' + Math.random().toString(36).slice(2, 8),
      name: toStr(raw.name, '未知物品').trim() || '未知物品',
      type: type
    };
  }

  function coerceItems(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.map(coerceItem).filter(Boolean);
  }

  function coerceClues(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.map(function (c) { return toStr(c, '').trim(); }).filter(function (c) { return c; });
  }

  /* ---------------- 存档码（base64，用于 URL 传递与手动导入） ---------------- */

  function toB64(str) {
    if (typeof btoa === 'function') return btoa(unescape(encodeURIComponent(str)));
    if (typeof Buffer !== 'undefined') return Buffer.from(str, 'utf-8').toString('base64');
    throw new Error('当前环境不支持 base64');
  }
  function fromB64(b64) {
    if (typeof atob === 'function') return decodeURIComponent(escape(atob(b64)));
    if (typeof Buffer !== 'undefined') return Buffer.from(b64, 'base64').toString('utf-8');
    throw new Error('当前环境不支持 base64');
  }

  function encodeCode(save) {
    return toB64(JSON.stringify(save));
  }

  function decodeCode(code) {
    try {
      return JSON.parse(fromB64(String(code).trim()));
    } catch (e) {
      return null;
    }
  }

  /* ---------------- 旅程记录（供终局结算页回放） ---------------- */

  /* 与存档分开存放：存档卡保持严格五栏，旅程回放数据走独立通道 */
  function readHistory() {
    try {
      var arr = memoryHistory;
      var m = global.location.search.match(/[?&]history=([^&]+)/);
      if (!Array.isArray(arr) && m) arr = decodeCode(decodeURIComponent(m[1]));
      if (!Array.isArray(arr)) {
        var raw = global.localStorage.getItem(HISTORY_KEY);
        arr = raw ? JSON.parse(raw) : [];
      }
      if (!Array.isArray(arr)) return [];
      return arr.map(function (h) {
        if (!h || typeof h !== 'object') return null;
        return {
          level: toInt(h.level, 0, 0),
          world: toStr(h.world, '？？？'),
          hook: toStr(h.hook, '')
        };
      }).filter(Boolean).slice(-64);
    } catch (e) { return []; }
  }

  /* 每通完一关自动记录一条：第几关 · 什么世界 · 留下了什么结局 */
  function recordPassage(config, save) {
    var list = readHistory();
    list.push({
      level: toInt(config.level, 0, 0),
      world: toStr(config.world, '？？？'),
      hook: toStr(save.exit_hook, '')
    });
    if (list.length > 64) list = list.slice(-64); /* 安全上限 */
    memoryHistory = list;
    try {
      global.localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
    } catch (e) { /* ignore */ }
  }

  /* 开始新一局：清空旧数据，生成全场统一开局面板（命3 · 理智2 · 空背包） */
  function startRun(levelNo) {
    resetRun();
    var save = defaultSave(typeof levelNo === 'number' ? levelNo : 1);
    persist(save);
    return save;
  }

  /* 清空本机全部运行数据（存档 + 旅程记录） */
  function resetRun() {
    memoryHistory = [];
    try {
      global.localStorage.removeItem(STORAGE_KEY);
      global.localStorage.removeItem(HISTORY_KEY);
    } catch (e) { /* ignore */ }
  }

  /* ---------------- 读档（宽容处理核心） ---------------- */

  /* 缺字段补默认值、多字段一律忽略、类型自动转换 */
  function normalize(raw, levelNo) {
    var base = defaultSave(levelNo);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;
    return {
      schema: SCHEMA,
      level: typeof levelNo === 'number' ? levelNo : toInt(raw.level, 1, 0),
      player: {
        hp: Math.min(10, toInt(raw.player && raw.player.hp, 3, 0)),
        level: Math.min(10, toInt(raw.player && raw.player.level, 1, 1)),
        sanity: toInt(raw.player && raw.player.sanity, 2, 0)
      },
      items: coerceItems(raw.items),
      clues: coerceClues(raw.clues),
      exit_hook: toStr(raw.exit_hook, ''),
      prev_world: toStr(raw.prev_world, ''),
      next_world: toStr(raw.next_world, '')
    };
  }

  function persist(save) {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
    } catch (e) { /* 隐私模式等场景静默忽略，不影响游戏 */ }
  }

  /* 读取优先级：URL ?save=存档码 → localStorage → 默认开局 */
  function readSave(levelNo) {
    var raw = null;
    try {
      var m = global.location.search.match(/[?&]save=([^&]+)/);
      if (m) {
        raw = decodeCode(decodeURIComponent(m[1]));
        if (raw) persist(normalize(raw, levelNo)); /* 落地本地，刷新不丢 */
      }
    } catch (e) { /* ignore */ }
    if (!raw) {
      try {
        var stored = global.localStorage.getItem(STORAGE_KEY);
        if (stored) raw = JSON.parse(stored);
      } catch (e) { /* ignore */ }
    }
    return normalize(raw, levelNo);
  }

  /* ---------------- 游戏内编辑存档 ---------------- */

  /* 按类型取用上家道具：命中则从背包移除并返回该道具；取不到返回 null，
   * 此时队伍必须走本关兜底剧情（评审「衔接分」硬性要求！） */
  function consumeAny(items, type) {
    if (!Array.isArray(items)) return null;
    for (var i = 0; i < items.length; i++) {
      if (items[i] && items[i].type === type) {
        return items.splice(i, 1)[0];
      }
    }
    return null;
  }

  function addItem(save, item) {
    var it = coerceItem(item);
    if (it) save.items.push(it);
    return save;
  }

  function addClue(save, text) {
    var t = toStr(text, '');
    if (t) save.clues.push(t);
    return save;
  }

  function setPlayer(save, patch) {
    if (!patch) return save;
    if (patch.hp !== undefined) save.player.hp = Math.min(10, toInt(patch.hp, save.player.hp, 0));
    if (patch.level !== undefined) save.player.level = Math.min(10, toInt(patch.level, save.player.level || 1, 1));
    if (patch.sanity !== undefined) save.player.sanity = toInt(patch.sanity, save.player.sanity, 0);
    return save;
  }

  /* ---------------- 写档 → 过场演出 → 跳转 ---------------- */

  /* 超量保留最近取得的内容，让本关的交接信息优先传给下家。 */
  function softValidate(save) {
    var warnings = [];
    if (save.items.length > 3) {
      save.items = save.items.slice(-3);
      warnings.push('道具超过 3 件，已优先保留最近取得的 3 件');
    }
    if (save.clues.length > 2) {
      save.clues = save.clues.slice(-2);
      warnings.push('线索超过 2 条，已优先保留最近取得的 2 条');
    }
    return warnings;
  }

  /* 读档保持宽容；交接必填项缺失时明确提示，不写入无效出口。 */
  function validateExit(save, config, opts) {
    config = config || {};
    opts = opts || {};
    var errors = [];
    if (!save.items.length) errors.push('请为出口准备至少 1 件道具，并标注道具类型。');
    if (!save.clues.length) errors.push('请为出口准备至少 1 条本关线索。');
    if (!toStr(save.exit_hook, '').trim()) errors.push('请填写指向下一个世界的结尾一句话。');
    if (!toStr(config.world, '').trim()) errors.push('请填写本关世界名。');
    if (!toStr(config.nextWorld, '').trim()) errors.push('请填写下一关世界名。');
    if (!toStr(opts.nextUrl, '').trim()) errors.push('请填写下一关页面地址。');
    return errors;
  }

  function showExitErrors(errors) {
    if (typeof document === 'undefined') return;
    var box = document.getElementById('wl-exit-errors');
    if (!box) {
      box = document.createElement('div');
      box.id = 'wl-exit-errors';
      (document.getElementById('finish-area') || document.body).appendChild(box);
    }
    box.innerHTML = errors.length ? '<div class="wl-warn" role="alert"><strong>交接尚未完成</strong><br>' + errors.map(esc).join('<br>') + '</div>' : '';
  }

  /*
   * config = { level: 本关序号, world: 本关世界名, nextWorld: 下家世界名 }
   * save   = readSave 拿到、游戏过程中已修改的存档对象
   * opts   = { exitHook: '结尾一句话（必须指向下一签世界）', nextUrl: '下家页面地址', passViaUrl: 是否附加存档码（默认 true） }
   */
  function completeLevel(config, save, opts) {
    opts = opts || {};
    config = config || {};
    var candidate = normalize(save, toInt(config.level, 1, 1) + 1);
    candidate.exit_hook = toStr(opts.exitHook, '').trim();
    candidate.prev_world = toStr(config.world, '').trim();
    candidate.next_world = toStr(config.nextWorld, '').trim();
    var warnings = softValidate(candidate);
    var errors = validateExit(candidate, config, opts);
    showExitErrors(errors);
    if (errors.length) return null;
    Object.keys(candidate).forEach(function (key) { save[key] = candidate[key]; });
    persist(save);
    recordPassage(config, save); /* 旅程记录：终局结算页回放用 */
    showHandoffOverlay(config, save, warnings, opts.nextUrl, opts.passViaUrl !== false);
    return save;
  }

  /* 替换旧参数、保留其他参数与锚点，导入不会再次读到旧 URL 存档。 */
  function transferUrl(nextUrl, save, history) {
    var parts = String(nextUrl).split('#');
    var hash = parts.length > 1 ? '#' + parts.slice(1).join('#') : '';
    var beforeHash = parts[0];
    var queryAt = beforeHash.indexOf('?');
    var base = queryAt === -1 ? beforeHash : beforeHash.slice(0, queryAt);
    var query = queryAt === -1 ? [] : beforeHash.slice(queryAt + 1).split('&').filter(function (p) {
      return p && !/^(save|history)(=|$)/.test(p);
    });
    query.push('save=' + encodeURIComponent(encodeCode(save)));
    query.push('history=' + encodeURIComponent(encodeCode(history)));
    return base + '?' + query.join('&') + hash;
  }

  function jumpTo(nextUrl, save, passViaUrl) {
    if (!nextUrl) return;
    var url = nextUrl;
    if (passViaUrl) {
      url = transferUrl(nextUrl, save, readHistory());
    }
    global.location.href = url;
  }

  /* 自动过场演出：世界线移动画面 + 上家结尾钩子 + 通关存档卡 */
  function showHandoffOverlay(config, save, warnings, nextUrl, passViaUrl) {
    if (typeof document === 'undefined') return; /* 非浏览器环境（如自动化测试）跳过 UI */
    var ov = document.createElement('div');
    ov.className = 'wl-overlay';
    var seconds = 8;
    ov.innerHTML =
      '<div class="wl-handoff">' +
        '<div class="wl-handoff-kicker">世 界 线 移 动</div>' +
        '<div class="wl-handoff-route">' + esc(config.world) + ' → ' + esc(config.nextWorld || '？？？') + '</div>' +
        '<div class="wl-handoff-hook">“' + esc(save.exit_hook || '……') + '”</div>' +
        renderSaveCard(save, config.level, config.world) +
        (warnings.length ? '<div class="wl-warn">提示：' + warnings.map(esc).join('；') + '</div>' : '') +
        '<button class="wl-btn" id="wl-next-btn" type="button">进入下一关（' + seconds + 's）</button>' +
      '</div>';
    document.body.appendChild(ov);
    var done = false;
    function go() {
      if (done) return;
      done = true;
      clearInterval(timer);
      jumpTo(nextUrl, save, passViaUrl);
    }
    document.getElementById('wl-next-btn').onclick = go;
    var timer = setInterval(function () {
      seconds--;
      var btn = document.getElementById('wl-next-btn');
      if (btn) btn.textContent = '进入下一关（' + seconds + 's）';
      if (seconds <= 0) { clearInterval(timer); go(); }
    }, 1000);
  }

  /* ---------------- 渲染组件 ---------------- */

  function describeBag(items) {
    if (!items.length) return '空';
    return items.map(function (i) {
      return esc(i.name) + '（' + (TYPE_LABELS[i.type] || i.type) + '类）';
    }).join('、');
  }

  /* 前情提要条：每关开场自动渲染，零成本完成衔接最低保障 */
  function renderOpening(save) {
    if (save.prev_world) {
      return '<div class="wl-opening">前情提要：你从『' + esc(save.prev_world) + '』的结局里醒来——' +
        (save.exit_hook ? '“' + esc(save.exit_hook) + '”' : '（上家没有留下结尾钩子）') +
        '<br>随身行李：' + describeBag(save.items) + '</div>';
    }
    return '<div class="wl-opening">前情提要：（未读到上家存档，按默认开局：命 3 · 理智 2 · 空背包。' +
      '你可能是本世界线第 1 关，或直接打开了本页。）</div>';
  }

  /* 五行「通关存档卡」 */
  function renderSaveCard(save, level, world) {
    var lv = (level === undefined || level === null) ? save.level : level;
    var w = world || save.prev_world || '？？？';
    var cluesHtml = save.clues.length ? save.clues.map(esc).join('<br>') : '无';
    return '<div class="wl-card">' +
      '<div class="wl-card-title">【第 ' + toInt(lv, 1, 1) + ' 关 · ' + esc(w) + ' 通关存档卡】</div>' +
      '<div class="wl-row">命：' + save.player.hp + '/10　　等级：' + (save.player.level || 1) + '/10　　理智：' + save.player.sanity + '</div>' +
      '<div class="wl-row">背包：' + describeBag(save.items) + '</div>' +
      '<div class="wl-row">线索：' + cluesHtml + '</div>' +
      '<div class="wl-row">结尾一句话：' + (save.exit_hook ? esc(save.exit_hook) : '（未填写）') + '</div>' +
      '<div class="wl-row wl-next">（下一关：' + esc(save.next_world || '未知') + '）</div>' +
      '</div>';
  }

  /* ---------------- 调试工具 ---------------- */

  var debug = {
    json: function (save) {
      try { return JSON.stringify(save, null, 2); } catch (e) { return '{}'; }
    },
    code: function (save) { return encodeCode(save); },
    importCode: function (code) {
      var raw = decodeCode(code);
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
      var save = normalize(raw, null);
      persist(save);
      return save;
    },
    reset: function () {
      try { global.localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    }
  };

  function mountDebug(save) {
    var jsonEl = document.getElementById('debug-json');
    var codeEl = document.getElementById('debug-code');
    function sync() {
      jsonEl.textContent = debug.json(save);
      codeEl.value = debug.code(save);
    }
    sync();
    document.getElementById('debug-copy').onclick = function () {
      sync();
      codeEl.select();
      try { document.execCommand('copy'); } catch (e) { /* ignore */ }
    };
    document.getElementById('debug-import').onclick = function () {
      var restored = debug.importCode(codeEl.value);
      if (!restored) { global.alert('存档码无法识别'); return; }
      /* 单独的存档码不含旅程；清掉当前 URL 的旧旅程，避免串线。 */
      resetRun();
      persist(restored);
      jumpTo(global.location.href, restored, true);
    };
    document.getElementById('debug-reset').onclick = function () {
      jumpTo(global.location.href, startRun(save.level), true);
    };
  }

  /* ---------------- 内置样式（过场/存档卡，避免被队伍样式影响） ---------------- */

  var LIB_CSS = [
    '.wl-card{background:#0f1724;border:1px solid #2a3b57;border-left:3px solid #35e08c;border-radius:10px;padding:14px 16px;color:#e8eef8;font:14px/23px "PingFang SC","Microsoft YaHei",system-ui,sans-serif;max-width:560px;box-sizing:border-box;}',
    '.wl-card-title{font-weight:600;margin-bottom:8px;color:#9ff5c8;}',
    '.wl-row{margin:2px 0;}',
    '.wl-next{color:#8fa3bf;font-size:12px;margin-top:6px;}',
    '.wl-opening{background:#141d2e;border:1px dashed #33455f;border-radius:8px;padding:10px 14px;color:#c6d4e8;font:14px/22px "PingFang SC","Microsoft YaHei",sans-serif;margin:0 0 16px;}',
    '.wl-overlay{position:fixed;top:0;right:0;bottom:0;left:0;background:rgba(5,10,18,.94);display:flex;align-items:center;justify-content:center;z-index:9999;animation:wl-fade .35s ease;}',
    '.wl-handoff{display:flex;flex-direction:column;align-items:center;gap:14px;padding:28px;text-align:center;max-width:640px;}',
    '.wl-handoff-kicker{letter-spacing:12px;color:#35e08c;font:600 14px/20px sans-serif;}',
    '.wl-handoff-route{color:#e8eef8;font:600 20px/28px "PingFang SC","Microsoft YaHei",sans-serif;}',
    '.wl-handoff-hook{color:#aebdd4;font:15px/24px "PingFang SC","Microsoft YaHei",sans-serif;font-style:italic;max-width:520px;}',
    '.wl-warn{color:#f0b429;font:12px/18px "PingFang SC","Microsoft YaHei",sans-serif;max-width:560px;text-align:left;}',
    '.wl-btn{background:#35e08c;color:#04140b;border:none;border-radius:8px;padding:10px 26px;font:600 15px/22px "PingFang SC","Microsoft YaHei",sans-serif;cursor:pointer;}',
    '.wl-btn:hover{filter:brightness(1.08);}',
    '@keyframes wl-fade{from{opacity:0}to{opacity:1}}'
  ].join('');

  function injectStyles() {
    try {
      if (!document.getElementById('wl-lib-style')) {
        var s = document.createElement('style');
        s.id = 'wl-lib-style';
        s.textContent = LIB_CSS;
        document.head.appendChild(s);
      }
    } catch (e) { /* ignore */ }
  }
  if (typeof document !== 'undefined') injectStyles();

  /* ---------------- 导出 ---------------- */

  global.WL = {
    version: SCHEMA,
    ITEM_TYPES: ITEM_TYPES,
    TYPE_LABELS: TYPE_LABELS,
    readSave: readSave,
    normalize: normalize,
    completeLevel: completeLevel,
    validateExit: validateExit,
    goTo: function (url, save) { jumpTo(url, save, true); },
    mountDebug: mountDebug,
    consumeAny: consumeAny,
    addItem: addItem,
    addClue: addClue,
    setPlayer: setPlayer,
    renderOpening: renderOpening,
    renderSaveCard: renderSaveCard,
    readHistory: readHistory,
    startRun: startRun,
    resetRun: resetRun,
    escapeHtml: esc,
    encodeCode: encodeCode,
    decodeCode: decodeCode,
    debug: debug
  };
})(typeof window !== 'undefined' ? window : globalThis);
