#!/usr/bin/env python3
"""在原仓库 README 开头插入合并版说明，不删除旧版 V4.10 文档。可重复运行。"""
from pathlib import Path

root = Path(__file__).resolve().parents[1]
readme = root / 'README.md'
START = '<!-- INTEGRATED-GAME-ENTRY:START -->'
END = '<!-- INTEGRATED-GAME-ENTRY:END -->'
block = f'''{START}

## 当前网站入口：完整合并版

GitHub Pages 根目录 `index.html` 现展示**调查与指认 → 终局推演 → 真相回放 → 存档交接**的完整流程，取材于用户确认的 **V4.0 调查游戏 + 终局推演** 两个 HTML，保留原始资源和交互。单文件离线可打开。

- **网站/离线入口**：[`index.html`](./index.html)
- **模块化维护入口**：`src/investigation/`（调查）、`src/finale/`（推演）、`src/integration/`（衔接）
- **构建网站**：`node scripts/build.mjs`
- **静态验证**：`node scripts/verify.mjs`
- **浏览器回归**：`python tests/browser_smoke.py`（需要 Playwright 与 Chromium）

**版本说明**：原仓库中的 `暴雪山庄_V4.10_直接试玩.html`、开发试听版、中文旁白、音频相关 JSON 和历史提交包均保留为独立 V4.10 版本。当前根目录首页以已确认的 V4.0 合并页面为视觉与交互基准，并未宣称把 V4.10 旁白系统迁入首页。

完整结构、更新范围、测试与回滚见 [`docs/INTEGRATION.md`](./docs/INTEGRATION.md)。

{END}
'''
text = readme.read_text(encoding='utf8') if readme.exists() else '# 暴雪山庄\n'
if START in text and END in text:
    begin = text.index(START)
    end = text.index(END, begin) + len(END)
    text = text[:begin] + block.strip() + text[end:]
else:
    lines = text.splitlines(keepends=True)
    i = 0
    if lines and lines[0].startswith('# '):
        i = 1
        while i < len(lines) and not lines[i].strip():
            i += 1
    text = ''.join(lines[:i]) + '\n' + block + '\n' + ''.join(lines[i:])
readme.write_text(text, encoding='utf8')
print('已更新 README 入口说明，历史内容仍保留:', readme)
