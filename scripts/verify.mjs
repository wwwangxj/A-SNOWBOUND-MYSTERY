#!/usr/bin/env node
/** 发布前一致性验证：零 npm 依赖，仅使用 Node.js 内置库。 */
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPage } from './build.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assert = (ok, text) => { if (!ok) throw new Error(text); console.log('PASS: ' + text); };
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
assert(html === buildPage(), '生成的 index.html 与模块源码字节级一致');
assert(html.includes('<div id="app"></div>') && html.includes('<div id="case-preview"'), '两个章节存在独立容器');
assert(html.indexOf('id="app"') < html.indexOf('id="case-preview"'), 'DOM 调查页先于终局页');
assert(html.includes("else if(a==='comic')window.BlizzardMerged.openComic()"), '结案入口进入终局推演');
assert(html.includes('window.BlizzardComic') && html.includes('window.BlizzardMerged'), '两个控制器均正确暴露接口');
assert(html.includes('data:image/') && html.includes('base64,'), '游戏素材与漫画资源内嵌');
assert(!/<iframe\b/i.test(html), '不依赖 iframe，保留单页面加载');
assert(!/<(?:script|link)[^>]+(?:src|href)=["\']https?:/i.test(html), '无第三方 JS/CSS 网络依赖');
assert(/<title>暴雪山庄 · 完整游戏/.test(html), 'Pages 首页使用完整合并版');
const sources = ['src/investigation/boot.js','src/investigation/worldline.js','src/investigation/assets.js','src/investigation/game.js','src/investigation/config.js','src/investigation/patches.js','src/finale/comic.js','src/integration/bridge.js'];
for (const file of sources) {
 const result = spawnSync(process.execPath, ['--check', resolve(root,file)], {encoding:'utf8'});
 assert(result.status === 0, 'JavaScript 语法: ' + file + (result.stderr ? ' ' + result.stderr : ''));
}
console.log('\n静态校验全部通过；浏览器交互另运行 python tests/browser_smoke.py');
