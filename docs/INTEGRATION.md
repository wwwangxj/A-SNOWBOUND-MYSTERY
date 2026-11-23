# 《暴雪山庄》整合主页 · 开发与维护说明

## 1. 更新定位与兼容策略

本更新包面向 GitHub 仓库 `wwwangxj/A-SNOWBOUND-MYSTERY` 的 `main` 分支、根目录 `index.html`（GitHub Pages 首页）。

- **页面基线**：两份上传的原始 HTML，《暴雪山庄 V4.0 · 炉灰中的第九人》与《暴雪山庄 · 终局推演》。最终网站逐页展现调查、推演、真相回放和交接，和本次对话交付的单文件合并版 `暴雪山庄_完整合并版_调查至终局推演.html` 字节一致。
- **游玩次序**：V4.0 调查（开场 → 搜证 → NPC 问询 → 证据板 → 指认 → 结案对话）→ 点击结案后“进入终局推演” → 三页拼图 → 真相回放相册 → “雪停之后” → 交接存档。
- **技术路线**：不重写已有算法或美术。源码按职责拆分，`scripts/build.mjs` 通过内嵌构建生成一个独立、离线可运行的 `index.html`。
- **保留旧版**：2026-11-10 的仓库提交 `903786f` 目录中存在完整 V4.10 中文旁白版、开发试听版、`package/`、`qa/`、校验清单等。**本次不修改或删除上述文件**。V4.10 作为独立存档版本继续保留。
- **注意**：V4.10 的旁白音频**没有自动移植**到 V4.0 合并主页。这样避免在无法完整校验音频版本行为时意外破坏旧版。

## 2. 新增 / 替换目录

```text
A-SNOWBOUND-MYSTERY/
├── index.html                      # [替换] Pages 的完整自包含试玩主页（自动生成）
├── README.md                       # [局部调整] 原文前插入新入口说明，其余保留
├── src/
│   ├── layout/template.html        # HTML 语义结构与构建插槽
│   ├── investigation/             # V4.0 调查部分，原逻辑按职责拆分
│   │   ├── game.css
│   │   ├── boot.js                 # 旧浏览器错误提示
│   │   ├── worldline.js            # SAVE_STATE v2，无逻辑修改
│   │   ├── assets.js               # V4.0 内嵌画面/人物素材
│   │   ├── game.js                 # 调查、搜证、证据板、指认
│   │   ├── config.js               # 世界关卡参数
│   │   └── patches.js              # 原 V4.0 已有补丁模块
│   ├── finale/
│   │   ├── comic.css               # 推演拼图与相册完整样式
│   │   └── comic.js                # 推演原控制器与内嵌漫画素材（闭包隔离）
│   └── integration/
│       ├── bridge.css              # 章节衔接终章样式
│       └── bridge.js               # 进度门禁、阶段转场、回放、重玩、交接
├── scripts/
│   ├── build.mjs                   # 无 npm 依赖，生成 index.html
│   ├── verify.mjs                  # 构建一致性 + 语法与资源校验
│   └── update_readme.py            # 不覆盖原 README 的说明插入器
├── tests/browser_smoke.py          # Chromium 全流程回归
└── docs/
    ├── INTEGRATION.md              # 本说明
    └── verify-integrated.workflow.yml   # CI 工作流模板，当前未启用
```

> `docs/verify-integrated.workflow.yml` 只是被保留的 CI 配置备份，**不在 `.github/workflows/` 下，因此 GitHub Actions 不会自动执行**。

**原有文件不动**：`暴雪山庄_V4.10_直接试玩.html`、`暴雪山庄_V4.10_开发试听版.html`、`终局推演_直接预览.html`、`package/`、`qa/`、`voice-manifest.json`、`voice-verification.json`、各类 zip 与核验报告等。

## 3. 浏览器集成说明

两份原游戏原本都将图片以 `data:image/...;base64` 写进同一页面，部分全局常量同名。整合代码的原则是“不碰故事规则，只处理装载和阶段衔接”。

- `src/finale/comic.js` 把第二段推演逻辑封装在 IIFE 中，避免覆盖调查部分的 `ASSETS`。
- `BlizzardComic.mount(host, onComplete)` 创建和挂载独立推演控制器；调用 `destroy()` 关闭计时器、事件监听与音频对象。
- `BlizzardMerged.openComic()` 仅允许在 `state.phase === 'ending'` 后进入终局推演；原生按钮由 `game.js` 绑定。
- `BlizzardMerged.finishComic()` 显示终章。三个按钮分别进入重新推演、重玩案件、原有 `finishLevel()` 交接流程。
- 原 `WL` 的 SAVE_STATE v2 协议、道具和线索、关卡出口协议保持原样。若下一关为 `finish.html`，仍由原项目显示单页结算，无需独立服务器。
- 之前上传的 V4.0 游戏及终局推演中的 CSS、剧本、漫画素材与动画均保留；没有引入跨域 iframe、CDN 或新的渲染框架。

## 4. 本地构建与测试

要求 Node.js 18+（建议 22）。不需要 `npm install`。

```powershell
node .\scripts\build.mjs
node .\scripts\verify.mjs
```

浏览器真实回归（可选，需要安装 Playwright）：

```powershell
py -3.12 -m pip install playwright
py -3.12 -m playwright install chromium
py -3.12 .\tests\browser_smoke.py
```

回归检查：完整故事 4 页；11 项物证；6 名证人；8 组必需连线；陆衡指认与对话；3 页拼图；相册；存档交接；移动端与桌面重玩；JavaScript 异常清单。

**当前仓库未启用 GitHub Actions CI**：`.github/workflows/` 下没有生效的工作流文件，push 与 PR 都不会自动触发检查；上面的 Node 静态检查与 Chromium 回归目前只能在本地手动执行。

如果日后需要恢复自动化，把 `docs/verify-integrated.workflow.yml` 复制回 `.github/workflows/verify-integrated.yml` 再提交即可（该文件内的 `paths` 过滤器已按此路径写好）。注意：修改 `.github/workflows/` 需要具备 `workflow` scope 的推送凭据，仅有 `repo` 权限的 OAuth App 会被 GitHub 拒绝。**CI 并不能取代真机/赛事浏览器验收。**

## 5. 在原仓库应用这份代码包（Windows PowerShell）

先 `git clone` 原仓库，备份任何本地未提交修改。把本更新包 zip 解压覆盖至**仓库根目录**，其余历史文件不要删除。

```powershell
git clone https://github.com/wwwangxj/A-SNOWBOUND-MYSTERY.git
cd A-SNOWBOUND-MYSTERY
# 将下载的更新包内文件解压到此目录，覆盖 index.html；src/ 等为新增文件
py -3.12 .\scripts\update_readme.py
node .\scripts\build.mjs --check
node .\scripts\verify.mjs
py -3.12 .\tests\browser_smoke.py
git status
git diff --stat
git add index.html README.md src scripts tests docs
git commit -m "feat: integrate investigation and final comic puzzle"
git push origin main
```

如果你已把仓库克隆在其他位置，只需将 zip 解压到该仓库的根目录。`git diff` 确认仅这些目标路径发生变动后再提交；对于多人协作请先建分支并提交 PR，避免直接覆盖主分支。

## 6. 回滚与核验边界

- 在 GitHub 中可以用一次 revert 撤销本次提交；也可以 `git restore --source=<上一次提交SHA> -- index.html README.md` 恢复网站入口与 README，新增的目录可通过回滚提交撤销。
- 本次整合以一次普通 `git push origin main` 提交到远端 `main`，不使用 force push、不重写历史。判断线上是否已更新，以 GitHub 仓库页面 `main` 的最新提交 SHA 与 Pages 实际渲染结果为准。
- 远程仓库内容在本环境未能通过 `git clone` 下载，因此没有完成基于其原始文件逐行 diff、分支冲突检查以及 GitHub Pages 在线结果对照。根目录与现有文件列表来自已打开的 GitHub 页面，存在未来分支更新风险；请在提交前检查 `git status`。
- **结果一致性的适用范围**：生成的 `index.html` 与本会话之前交付的合并 HTML 字节完全相同，静态与浏览器测试通过。该结论不等于“仓库现有 V4.10 页面与新版主页相同”，也不是无限制无错误保证。
