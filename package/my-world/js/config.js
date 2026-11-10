/* 关卡元信息：只补缺省值，不覆盖 game.js 已有的 CONFIG。
   单独被工具读取时（没有 game.js），会自建一个完整对象。 */
var CONFIG = (typeof CONFIG !== 'undefined' && CONFIG) ? CONFIG : {};
(function (c) {
  if (!c.level) c.level = 18;
  if (!c.world) c.world = '暴雪山庄';
  if (!c.prevWorld) c.prevWorld = '停摆医院';
  if (!c.nextWorld) c.nextWorld = '镜像图书馆';
  if (!c.nextUrl) c.nextUrl = './finish.html';
  if (!c.kind) c.kind = 'board';
}(CONFIG));
