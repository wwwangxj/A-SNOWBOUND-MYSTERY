/* V4.0 补丁模块（v2）
   · 数据出口 STORY_DATA
   · 按问题清单改文案（1/2/3/8）
   · 人物卡打标（逐元素，不整体跳过）
   · 结局真凶从 BOARD_CASE 读，不写死
   说明：本文件保持 ES5，与模板引擎一致。
*/
(function () {
  'use strict';

  /* ---------- 0. 案件常量（唯一真相源） ---------- */
  var CASE = window.BOARD_CASE || {
    culprit: '陆衡',
    heir: '陌生黄铜钥匙',
    nextWorld: '镜像图书馆'
  };
  window.BOARD_CASE = CASE;

  /* ---------- 1. 数据出口 ---------- */
  var data = {};
  if (typeof ROOMS !== 'undefined') data.ROOMS = ROOMS;
  if (typeof E !== 'undefined') data.E = E;
  if (typeof NPC !== 'undefined') data.NPC = NPC;
  if (typeof INTRO !== 'undefined') data.INTRO = INTRO;
  if (typeof STORY !== 'undefined') data.STORY = STORY;
  if (typeof OUTRO !== 'undefined') data.OUTRO = OUTRO;
  if (typeof CHAINS !== 'undefined') data.CHAINS = CHAINS;
  if (typeof BOARD_META !== 'undefined') data.BOARD_META = BOARD_META;
  if (typeof CARD_OBS !== 'undefined') data.CARD_OBS = CARD_OBS;
  if (typeof BOARD_LABEL !== 'undefined') data.BOARD_LABEL = BOARD_LABEL;
  if (typeof GRAPH_PAIRS !== 'undefined') data.GRAPH_PAIRS = GRAPH_PAIRS;
  if (typeof GRAPH_REQUIRED !== 'undefined') data.GRAPH_REQUIRED = GRAPH_REQUIRED;
  if (typeof GRAPH_NAME !== 'undefined') data.GRAPH_NAME = GRAPH_NAME;
  if (typeof BOARD_SUMMARY !== 'undefined') data.BOARD_SUMMARY = BOARD_SUMMARY;
  if (typeof GRAPH_GROUP !== 'undefined') data.GRAPH_GROUP = GRAPH_GROUP;
  window.STORY_DATA = data;

  /* ---------- 2. 证据板：一句话 ---------- */
  var SUMMARY = {
    cuff: '地毯边的袖扣，扣杆扭曲。',
    poker: '握柄有擦拭痕，凹槽有污迹。',
    ledger: '手提箱暗层，赔偿账副本。',
    burn: '壁炉残页，只剩一个「陆」字。',
    switch: '电闸已恢复，无烧焦痕迹。',
    coat: '连廊外衣，袖口缺一枚扣子。',
    soot: '后门与储物柜有新鲜擦痕。',
    inheritance: '遗嘱要求先抵债，她拿不到现钱。',
    repair: '工单只证行踪，不证谁拉闸。',
    phone: '断电期间她一直在打催缴电话。',
    fiber: '袖口断线与袖扣纤维一致。'
  };
  if (typeof BOARD_SUMMARY !== 'undefined') {
    Object.keys(SUMMARY).forEach(function (k) { BOARD_SUMMARY[k] = SUMMARY[k]; });
  }
  if (typeof E !== 'undefined') {
    Object.keys(SUMMARY).forEach(function (k) {
      if (E[k]) { E[k].desc = SUMMARY[k]; E[k].short = SUMMARY[k]; }
    });
  }

  /* ---------- 3. 证言摘要 ---------- */
  var NPC_SUMMARY = {
    doctor: '他说自己一直在客厅。',
    butler: '他说外衣是他先发现的。',
    heiress: '她承认吵过，但电话没断过。',
    mechanic: '他坚持自己是在修电。',
    cook: '她听见书房有争执。',
    reporter: '她一直在录音。',
    detective: '他负责记录每个人的说法。'
  };
  if (typeof CARD_OBS !== 'undefined') {
    Object.keys(NPC_SUMMARY).forEach(function (k) {
      if (CARD_OBS[k]) CARD_OBS[k] = NPC_SUMMARY[k];
    });
  }

  /* ---------- 4. 连线文案：精确句式替换（不用通配正则） ---------- */
  var PHRASE = [
    ['可以排除她的嫌疑', '她的嫌疑明显削弱'],
    ['可以排除他的嫌疑', '他的嫌疑明显削弱'],
    ['可以排除嫌疑', '嫌疑明显削弱'],
    ['排除了她的嫌疑', '她的嫌疑明显削弱'],
    ['排除了他的嫌疑', '他的嫌疑明显削弱'],
    ['不可能是凶手', '还需要更多证据'],
    ['凶手就是他', '仍需核对'],
    ['凶手就是她', '仍需核对'],
    ['凶手就是', '仍需核对']
  ];
  function soften(txt) {
    if (typeof txt !== 'string') return txt;
    var out = txt;
    for (var i = 0; i < PHRASE.length; i++) {
      out = out.split(PHRASE[i][0]).join(PHRASE[i][1]);
    }
    return out;
  }
  if (typeof GRAPH_PAIRS !== 'undefined' && Array.isArray(GRAPH_PAIRS)) {
    GRAPH_PAIRS.forEach(function (p) {
      if (!p) return;
      ['text', 'tag', 'desc'].forEach(function (f) { if (p[f]) p[f] = soften(p[f]); });
    });
  }

  /* ---------- 5. 引入文案：按整句精确删除，删不掉就报警 ---------- */
  var DROP_LINE = '崇山，你身体不好，这事不必急于今晚。';
  if (typeof INTRO !== 'undefined' && Array.isArray(INTRO)) {
    var before = INTRO.length;
    for (var j = INTRO.length - 1; j >= 0; j--) {
      if (INTRO[j] && INTRO[j][1] === DROP_LINE) INTRO.splice(j, 1);
    }
    if (INTRO.length === before && typeof console !== 'undefined') {
      console.warn('[v40] 第 8 条：引入文案未找到待删台词，请核对原文是否已改');
    }
  }

  /* ---------- 6. 两张纽扣图 ---------- */
  if (typeof ASSETS !== 'undefined') {
    ASSETS.item_cufflink_clean = 'assets/item/item_cufflink_clean.png';
    ASSETS.item_cufflink_fiber = 'assets/item/item_cufflink_fiber.png';
  }
  if (typeof E !== 'undefined') {
    if (E.cuff) E.cuff.img = 'item_cufflink_clean';
    if (E.fiber) E.fiber.img = 'item_cufflink_fiber';
  }

  /* ---------- 7. 人物卡打标：逐元素判断，不整体跳过 ---------- */
  var NAME2ID = {
    '陆衡': 'doctor', '周肃': 'butler', '唐婉': 'cook', '贺川': 'mechanic',
    '许知微': 'reporter', '沈令仪': 'heiress', '顾沉': 'detective'
  };
  function tagCards() {
    var all = document.querySelectorAll('div,li,button');
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el.hasAttribute('data-npc')) continue;
      /* 已处在人物卡/证据板卡内部的后代不再重复打标，保证每张卡只有一个稳定选择器 */
      if (el.closest && el.closest('[data-npc],[data-node]')) continue;
      if (el.children.length > 4) continue;
      var t = (el.textContent || '').replace(/\s+/g, '');
      if (!t || t.length > 30) continue;
      for (var nm in NAME2ID) {
        if (t.indexOf(nm) === 0) { el.setAttribute('data-npc', NAME2ID[nm]); break; }
      }
    }
  }
  function scheduleTag() {
    if (scheduleTag.pending) return;
    scheduleTag.pending = true;
    setTimeout(function () { scheduleTag.pending = false; tagCards(); }, 30);
  }
  var root = document.getElementById('app') || document.body;
  if (root && window.MutationObserver) {
    var mo = new MutationObserver(scheduleTag);
    mo.observe(root, { childList: true, subtree: true });
  }
  scheduleTag();

  /* ---------- 8. 测试钩子 ---------- */
  window.__WXB = {
    state: function () { return typeof state !== 'undefined' ? state : null; },
    ready: function () { return typeof graphReady === 'function' ? graphReady() : false; },
    link: function (a, b) { try { linkNodes(a, b); return true; } catch (e) { return false; } },
    required: function () { return typeof GRAPH_REQUIRED !== 'undefined' ? GRAPH_REQUIRED : []; },
    npcs: function () { return typeof NPC !== 'undefined' ? NPC.map(function (n) { return n.id; }) : []; },
    case: CASE
  };
})();
