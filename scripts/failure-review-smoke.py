"""Production acceptance for failure reviews using isolated, fictional browser data.
After pnpm build: python3 scripts/failure-review-smoke.py
Uses the environment's Python Playwright/Chromium; adds no app dependencies.
"""
import functools
import http.server
import json
import os
from pathlib import Path
import shutil
import tempfile
import threading
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parent.parent
SHOTS = ROOT / 'docs/screenshots'
SHOTS.mkdir(parents=True, exist_ok=True)
KEY = 'life-os:failure-reviews:v1'


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def reviews(page):
    return page.evaluate(f"JSON.parse(localStorage.getItem('{KEY}'))?.reviews ?? []")


def game_raw(page):
    return page.evaluate("localStorage.getItem('life-rpg:v1')")


def historian_raw(page):
    return page.evaluate("""() => new Promise((resolve) => {
      const req = indexedDB.open('personal-historian-db', 1);
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction('workspace', 'readonly');
        const get = tx.objectStore('workspace').get('current');
        get.onsuccess = () => resolve(JSON.stringify(get.result) ?? null);
        tx.oncomplete = () => db.close();
      };
    })""")


def shot(page, name, full=False):
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), name
    page.screenshot(path=str(SHOTS / f'failure-{name}.png'), full_page=full)


def fill_review(page, expected, actual, next_step=''):
    page.get_by_label('原本想做什么', exact=True).fill(expected)
    page.get_by_label('实际发生了什么', exact=True).fill(actual)
    page.get_by_label('下次只改一件事', exact=True).fill(next_step)


with tempfile.TemporaryDirectory(prefix='life-os-failure-') as directory:
    # Serve the exact production files under the real preview's nested Pages path.
    preview = Path(directory) / 'life-rpg/previews'
    preview.mkdir(parents=True)
    os.symlink(ROOT / 'dist', preview / 'pr-2')
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=directory))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_port}/life-rpg/previews/pr-2/'
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'), args=['--no-sandbox', '--lang=zh-CN'])
            for name, viewport in [('desktop', {'width': 1440, 'height': 1200}), ('mobile', {'width': 390, 'height': 844})]:
                context = browser.new_context(viewport=viewport, timezone_id='Asia/Shanghai', locale='zh-CN')
                page = context.new_page()
                page.clock.set_fixed_time('2026-10-18T12:00:00Z')
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.goto(base)
                page.get_by_role('button', name='载入示例数据', exact=True).click()
                expect(page.get_by_role('heading', name='今天', exact=True)).to_be_visible()
                before_game = game_raw(page)
                before_historian = historian_raw(page)
                card = page.get_by_role('region', name='今天的失败复盘', exact=True)
                expect(card).to_contain_text('还没有记录')
                assert reviews(page) == []
                card.get_by_role('link', name='记一次复盘', exact=True).click()
                expect(page.get_by_role('heading', name='记一次失败复盘', exact=True)).to_be_visible()
                fill_review(page, '晚饭后学30分钟英语（示例）', '吃完饭开始刷手机，回过神已经很晚，英语没有开始。', '晚饭后把手机放远，先跟读一句英语，用2分钟开始。')
                page.get_by_role('button', name='手机干扰', exact=True).click()
                page.get_by_role('button', name='开始太难', exact=True).click()
                expect(page.get_by_role('button', name='手机干扰', exact=True)).to_have_attribute('aria-pressed', 'true')
                expect(page.get_by_role('button', name='开始太难', exact=True)).to_have_attribute('aria-pressed', 'true')
                shot(page, f'{name}-editor', full=True)
                page.get_by_role('button', name='保存复盘', exact=True).click()
                expect(page.get_by_role('status').first).to_contain_text('复盘已保存在本机')
                first = reviews(page)[0]
                original_version = first['versions'][0]
                assert len(reviews(page)) == 1
                page.reload()
                expect(page.get_by_label('实际发生了什么', exact=True)).to_have_value(original_version['actual'])
                page.get_by_role('button', name='还没尝试', exact=True).click()
                page.get_by_label('回看观察', exact=True).fill('示例：先留一个小办法，不要求今天完成。')
                page.get_by_role('button', name='保存这次回看', exact=True).click()
                expect(page.get_by_text('回看已保存，之前的观察仍保留。', exact=True)).to_be_visible()
                page.get_by_role('button', name='有帮助', exact=True).click()
                page.get_by_label('回看观察', exact=True).fill('示例：手机放远以后，确实开始了两分钟。')
                page.get_by_role('button', name='保存这次回看', exact=True).click()
                expect(page.get_by_text('回看已保存，之前的观察仍保留。', exact=True)).to_be_visible()
                assert len(reviews(page)[0]['followUps']) == 2
                page.get_by_role('button', name='记一次复盘', exact=True).click()
                fill_review(page, '想23:30睡觉（示例）', '睡前刷手机，00:40才放下。')
                page.get_by_role('button', name='手机干扰', exact=True).click()
                page.get_by_role('button', name='保存复盘', exact=True).click()
                expect(page.get_by_role('status').first).to_contain_text('复盘已保存在本机')
                assert len(reviews(page)) == 2
                # Return through the desktop sidebar or the mobile bottom navigation.
                page.get_by_role('navigation', name='移动主导航' if name == 'mobile' else '桌面主导航').get_by_role('link', name='今天', exact=True).click()
                expect(card).to_contain_text('2 件')
                card.scroll_into_view_if_needed()
                shot(page, f'{name}-today')
                card.get_by_role('link', name='查看全部复盘', exact=True).click()
                page.get_by_label('复盘日期筛选', exact=True).fill('2026-10-17')
                expect(page.get_by_role('region', name='复盘列表')).to_contain_text('这段时间还没有复盘')
                page.get_by_label('复盘日期筛选', exact=True).fill('2026-10-18')
                page.get_by_role('button', name='查看全部日期', exact=True).click()
                selected = page.get_by_role('region', name='复盘列表').get_by_role('button').filter(has_text='晚饭后学30分钟英语（示例）')
                selected.click()
                expect(page.get_by_label('原本想做什么', exact=True)).to_have_value('晚饭后学30分钟英语（示例）')
                page.evaluate('window.scrollTo(0, 0)')
                shot(page, f'{name}-overview', full=True)
                page.get_by_label('下次只改一件事', exact=True).fill('示例：先把手机放到另一个房间，再跟读一句。')
                page.get_by_role('button', name='保存复盘', exact=True).click()
                expect(page.get_by_role('status').first).to_contain_text('复盘已保存在本机')
                updated = next(row for row in reviews(page) if row['id'] == first['id'])
                assert updated['versions'][0] == original_version
                assert len(updated['versions']) == 2 and len(updated['followUps']) == 2
                # Old follow-up applies only to the old adjustment, not to a revised plan.
                expect(page.get_by_role('region', name='复盘列表')).to_contain_text('待尝试')
                assert game_raw(page) == before_game
                assert historian_raw(page) == before_historian
                saved = reviews(page)
                page.go_back(); page.go_forward(); page.reload()
                assert reviews(page) == saved
                # All three archives are included, and repeat imports are explicit and additive.
                page.goto(base + '#/settings')
                with page.expect_download() as download_info:
                    page.get_by_role('button', name='导出整站 JSON 备份', exact=True).click()
                exported = json.loads(Path(download_info.value.path()).read_text())
                assert exported['failureReviews']['reviews'] == saved
                stored = json.loads(before_game)['state']
                # Existing hydration regenerates derived effect IDs; personal records must match.
                assert all(exported['game']['state'].get(key) == value for key, value in stored.items() if key != 'effects')
                page.get_by_label('导入失败复盘文件', exact=True).set_input_files({'name': 'synthetic-all.json', 'mimeType': 'application/json', 'buffer': json.dumps(exported, ensure_ascii=False).encode()})
                expect(page.get_by_role('dialog')).to_contain_text('跳过 2 件重复内容')
                page.get_by_role('button', name='确认补充失败复盘', exact=True).click()
                expect(page.get_by_text('失败复盘已补充导入，原有复盘和所有旧版本保留。', exact=True)).to_be_visible()
                assert reviews(page) == saved
                # Fresh browser: a file selection alone does nothing; confirmation restores histories.
                restored = browser.new_context(viewport=viewport, timezone_id='Asia/Shanghai')
                restore_page = restored.new_page(); restore_page.goto(base + '#/settings')
                restore_page.get_by_label('导入失败复盘文件', exact=True).set_input_files({'name': 'synthetic-all.json', 'mimeType': 'application/json', 'buffer': json.dumps(exported, ensure_ascii=False).encode()})
                assert reviews(restore_page) == []
                restore_page.get_by_role('button', name='确认补充失败复盘', exact=True).click()
                expect(restore_page.get_by_text('失败复盘已补充导入，原有复盘和所有旧版本保留。', exact=True)).to_be_visible()
                assert reviews(restore_page) == saved and game_raw(restore_page) is None
                restored.close()
                page.evaluate('navigator.serviceWorker.ready')
                page.wait_for_function('navigator.serviceWorker.controller !== null')
                context.set_offline(True)
                page.goto(base + '#/reflection?view=failures&new=1')
                page.reload()
                fill_review(page, '离线也能记录（示例）', '离线保存一件没按预期的事。')
                page.get_by_role('button', name='保存复盘', exact=True).click()
                expect(page.get_by_role('status').first).to_contain_text('复盘已保存在本机')
                page.reload()
                assert len(reviews(page)) == 3
                assert game_raw(page) == before_game and historian_raw(page) == before_historian
                assert not errors, errors
                print(f'{name}: Today entry, form, follow-up, versions, tags, date/history, backup preview/dedup/restore, refresh/back, Pages nested path and offline persistence PASS')
                context.close()
            # Concurrent tabs use a real browser Web Lock; both creations must survive.
            context = browser.new_context(viewport={'width': 320, 'height': 640})
            pages = [context.new_page(), context.new_page()]
            for index, page in enumerate(pages):
                page.goto(base + '#/reflection?view=failures&new=1')
                fill_review(page, f'虚构并发记录 {index}', '同一时刻从两个窗口新增')
                assert page.evaluate('Boolean(navigator.locks)')
            for page in pages:
                page.evaluate("setTimeout(() => document.querySelector('form').requestSubmit(), 200)")
            for page in pages:
                expect(page.get_by_role('status').first).to_contain_text('复盘已保存在本机')
            assert len(reviews(pages[0])) == 2
            assert game_raw(pages[0]) is None
            assert pages[0].evaluate('document.documentElement.scrollWidth <= innerWidth')
            print('320px anonymous entry + two concurrent Web Lock appends, no RPG initialization PASS')
            context.close()
            browser.close()
    finally:
        server.shutdown()
