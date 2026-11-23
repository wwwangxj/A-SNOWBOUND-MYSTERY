"""真实 Chromium 游戏回归：从开场一路搜证/问询/推演/指认至终局交接。

用法：
    pip install playwright
    python -m playwright install chromium
    python tests/browser_smoke.py

无外部网络请求；使用 page.set_content 加载打包的单文件页面。
证据板连线通过项目原有 __WXB 测试接口驱动，其余步骤均点击用户界面。
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
CHROMIUM_FALLBACK = Path("/usr/bin/chromium")
ROOMS = {
    "lounge": ["burn"],
    "study": ["cuff", "fiber", "poker", "ledger"],
    "electrical": ["switch", "repair"],
    "passage": ["coat", "soot"],
    "corridor": ["phone"],
    "foyer": ["inheritance"],
}
REQUIRED = [
    ["heiress", "phone"], ["mechanic", "repair"],
    ["coat", "butler"], ["coat", "fiber"],
    ["cuff", "fiber"], ["burn", "ledger"],
    ["doctor", "ledger"], ["cook", "soot"],
]


def test_complete_flow(browser):
    page = browser.new_page(viewport={"width": 1366, "height": 768})
    errors = []
    page.on("pageerror", lambda exc: errors.append(str(exc)))
    page.set_content(HTML, wait_until="domcontentloaded", timeout=45000)
    assert page.locator("[data-act=start]").count() == 1
    assert page.locator('.title-screen .bg').evaluate('(img) => img.complete && img.naturalWidth > 0')

    page.locator('[data-act=start]').click()
    for _ in range(4):
        page.locator('[data-act=storyNext]').click()
    assert page.evaluate("state.phase") == "game", "前置剧情后应进入调查"

    for room, ids in ROOMS.items():
        page.locator(f'[data-room="{room}"]').click()
        for evidence in ids:
            page.locator(f'[data-find="{evidence}"]').click()
            assert page.locator('.evidence-detail').count() == 1
            page.locator('[data-act=close]').click()
    assert page.evaluate("state.found.length") == 11

    for npc in ['doctor', 'butler', 'cook', 'mechanic', 'reporter', 'heiress']:
        page.locator('[data-act=npc]').first.click()
        page.locator(f'[data-npc="{npc}"]').click()
        for _ in range(12):
            if not page.locator('.dialog-overlay').count():
                break
            page.locator('[data-act=next]').click()
        assert page.locator('.dialog-overlay').count() == 0, f"证言未结束: {npc}"
    assert page.evaluate('state.testimonies.length') == 6

    page.locator('[data-act=board]').first.click()
    assert page.locator('.graph-workspace').count() == 1
    assert not page.evaluate('window.__WXB.ready()')
    for pair in REQUIRED:
        page.evaluate('(pair) => window.__WXB.link(...pair)', pair)
    assert page.evaluate('window.__WXB.ready()'), '八组必要线索均关联后应允许指认'

    page.locator('[data-act=accuse]').click()
    page.locator('[data-accuse="陆衡"]').click()
    for _ in range(15):
        if not page.locator('.dialog-overlay').count():
            break
        page.locator('[data-act=next]').click()
    assert page.evaluate('state.phase') == 'ending'
    assert page.locator('[data-act=comic]').count() == 1

    page.locator('[data-act=comic]').click()
    assert page.locator('#app').evaluate('(el) => getComputedStyle(el).display') == 'none'
    assert page.locator('.cc-piece').count() > 0
    for current_page in [[1], [2, 4], [5, 6]]:
        for piece in current_page:
            page.locator(f'[data-piece="{piece}"]').click()
            page.locator(f'[data-slot="{piece}"]').click()
        page.locator('[data-action=next]').click()
    assert page.locator('.cc-album').count() == 1, '拼图之后应进入回放相册'
    page.locator('[data-action=finish]').click()
    assert page.locator('#merged-handoff').count() == 1

    # 真正点击交接，不通过强行设置 state 跳转。
    page.locator('#merged-handoff').click()
    assert page.locator('#wl-next-btn').count() == 1
    page.locator('#wl-next-btn').click()
    assert page.get_by_text('世界线到此为止').count() == 1
    assert '陌生黄铜钥匙' in page.locator('body').inner_text()
    assert not errors, f'页面 JS 运行错误: {errors}'
    page.close()
    print('PASS: 桌面完整流程（11项物证、6份证言、8个连线、指认、拼图、相册、交接）')


def test_restart_and_mobile(browser):
    for size in ({"width": 375, "height": 812}, {"width": 1366, "height": 768}):
        page = browser.new_page(viewport=size)
        errors = []
        page.on('pageerror', lambda exc: errors.append(str(exc)))
        page.set_content(HTML, wait_until='domcontentloaded', timeout=45000)
        # 验证结案入口的权限及两种重玩按钮，不伪造剧情中间操作。
        assert page.evaluate('window.BlizzardMerged != null')
        page.evaluate("() => {state.phase='ending';render()}")
        page.locator('[data-act=comic]').click()
        for current_page in [[1], [2, 4], [5, 6]]:
            for piece in current_page:
                page.locator(f'[data-piece="{piece}"]').click()
                page.locator(f'[data-slot="{piece}"]').click()
            page.locator('[data-action=next]').click()
        page.locator('[data-action=finish]').click()
        page.locator('#merged-replay').click()
        assert page.locator('.cc-piece').count() > 0
        page.locator('#case-preview').evaluate('(root) => root.querySelectorAll(".cc-piece").length')
        page.evaluate('window.BlizzardMerged.restart()')
        assert page.locator('[data-act=start]').count() == 1
        assert page.locator('#case-preview').evaluate('(el) => getComputedStyle(el).display') == 'none'
        assert not errors, f'重玩时的页面错误: {errors}'
        print(f'PASS: {size["width"]}×{size["height"]} 终局重玩与原游戏恢复')
        page.close()


def main():
    with sync_playwright() as playwright:
        kwargs = {"headless": True, "args": ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]}
        if CHROMIUM_FALLBACK.exists():
            kwargs['executable_path'] = str(CHROMIUM_FALLBACK)
        browser = playwright.chromium.launch(**kwargs)
        try:
            test_complete_flow(browser)
            test_restart_and_mobile(browser)
        finally:
            browser.close()


if __name__ == '__main__':
    main()
