#!/usr/bin/env node
/**
 * 单一发布入口：将模块化源码打包成完全离线的根目录 index.html。
 * 不修改仓库 V4.10 旁白/试听包与 package/ 等历史产物。
 * 运行：node scripts/build.mjs
 * 验证：node scripts/build.mjs --check
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(repoRoot, path), 'utf8');
const css = Object.freeze({
  '@@INVESTIGATION_CSS@@': 'src/investigation/game.css',
  '@@FINALE_CSS@@': 'src/finale/comic.css',
  '@@BRIDGE_CSS@@': 'src/integration/bridge.css',
});
const scripts = Object.freeze([
  'src/investigation/boot.js',
  'src/investigation/worldline.js',
  'src/investigation/assets.js',
  'src/investigation/game.js',
  'src/investigation/config.js',
  'src/investigation/patches.js',
  'src/finale/comic.js',
  'src/integration/bridge.js',
]);

export function buildPage() {
  let page = read('src/layout/template.html');
  for (const [marker, filename] of Object.entries(css)) {
    if (!page.includes(marker)) throw new Error(`模板占位符不存在: ${marker}`);
    page = page.replace(marker, () => read(filename));
  }
  scripts.forEach((filename, index) => {
    const marker = `@@SCRIPT_${index}@@`;
    if (!page.includes(marker)) throw new Error(`模板占位符不存在: ${marker}`);
    // replacer function 避免 $&、$' 等 JavaScript 替换语义误处理游戏脚本。
    page = page.replace(marker, () => read(filename));
  });
  if (/@@(?:INVESTIGATION|FINALE|BRIDGE|SCRIPT_)/.test(page)) {
    throw new Error('模板存在未替换占位符');
  }
  return page;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = resolve(repoRoot, 'index.html');
  const actual = buildPage();
  if (process.argv.includes('--check')) {
    if (readFileSync(output, 'utf8') !== actual) {
      console.error('index.html 与模块化源码不同步，请执行 node scripts/build.mjs');
      process.exitCode = 1;
    } else {
      console.log('PASS: 根目录 index.html 与源码完全一致');
    }
  } else {
    writeFileSync(output, actual, 'utf8');
    console.log(`已生成: ${output} (${Buffer.byteLength(actual)} bytes)`);
  }
}
