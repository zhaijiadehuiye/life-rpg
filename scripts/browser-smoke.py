"""Production browser acceptance using isolated, synthetic storage only.
Run after pnpm build: python3 scripts/browser-smoke.py
Requires Python Playwright and Chromium; no application dependency is added.
"""
import functools
import http.server
import os
from pathlib import Path
import re
import shutil
import tempfile
import threading
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parent.parent
SHOTS = ROOT / 'docs/screenshots'
SHOTS.mkdir(parents=True, exist_ok=True)
ORIGINAL = '验收样例（虚构）：今天完成了一次小练习，记录开始时的条件。'
REVISION = '验收样例（虚构）：补充观察，安静环境帮助我开始小练习。'

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

def rpg_state(page):
    return page.evaluate("JSON.parse(localStorage.getItem('life-rpg:v1')).state")

def historian_state(frame):
    return frame.evaluate("""() => new Promise((resolve, reject) => {
      const request = indexedDB.open('personal-historian-db', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('workspace', 'readonly');
        const get = tx.objectStore('workspace').get('current');
        get.onsuccess = () => resolve(get.result);
        get.onerror = () => reject(get.error);
        tx.oncomplete = () => db.close();
      };
    })""")

def frame_for(page):
    expect(page.locator('iframe')).to_be_visible()
    frame = page.frame_locator('iframe')
    expect(frame.locator('#app-root h1')).to_be_visible()
    return frame

def nav(page, mobile, label):
    menu = page.get_by_role('navigation', name='移动主导航' if mobile else '桌面主导航')
    menu.get_by_role('link', name=label, exact=True).click()

def view(frame, mobile, name):
    if mobile:
        frame.locator('#mobile-menu').click()
    frame.locator(f'.main-nav [data-view="{name}"]').click()
    expect(frame.locator('#app-root h1')).to_be_visible()

with tempfile.TemporaryDirectory(prefix='life-os-smoke-') as directory:
    # GitHub Pages-like /life-rpg/ and a sibling app share an origin.
    os.symlink(ROOT / 'dist', Path(directory) / 'life-rpg')
    for asset in (ROOT / 'dist').iterdir():
        os.symlink(asset, Path(directory) / asset.name)
    handler = functools.partial(QuietHandler, directory=directory)
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_port}/life-rpg/'
    try:
        with sync_playwright() as p:
            executable = os.environ.get('CHROMIUM_PATH') or shutil.which('chromium')
            browser = p.chromium.launch(executable_path=executable, args=['--no-sandbox'])
            for mobile, viewport, name in [(False, {'width': 1440, 'height': 1000}, 'desktop'), (True, {'width': 390, 'height': 844}, 'mobile')]:
                context = browser.new_context(viewport=viewport, timezone_id='Asia/Shanghai')
                page = context.new_page()
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                # Establish an existing record using the compatibility entry, before integration.
                page.goto(base + 'personal-historian/')
                expect(page.locator('#entry-composer')).to_be_visible()
                page.locator('#entry-composer').fill(ORIGINAL)
                page.locator('[data-action="save-entry"]').click()
                expect(page.locator('#save-indicator')).to_contain_text('原文与分析已分别保存')
                before = historian_state(page)
                original_entry = next(e for e in before['entries'] if e['originalText'] == ORIGINAL)
                # Initialize RPG demo only in this isolated browser context.
                page.goto(base)
                page.get_by_role('button', name='载入示例数据').click()
                expect(page.locator('section[aria-label="Life OS 模块"]')).to_be_visible()
                expect(page.get_by_role('heading', name='今天', exact=True)).to_be_visible()
                expect(page.get_by_role('heading', name=re.compile('记录今天的状态'))).to_be_visible()
                page.wait_for_function("Array.from(document.querySelectorAll('.rise')).every((el) => getComputedStyle(el).opacity === '1')")
                page.screenshot(path=str(SHOTS / f'{name}-home.png'), full_page=not mobile)
                page.get_by_role('link', name='第一次使用？打开中文使用说明').click()
                expect(page.get_by_role('heading', name='先从今天的一件小事开始')).to_be_visible()
                page.screenshot(path=str(SHOTS / f'{name}-guide.png'), full_page=not mobile)
                nav(page, mobile, '今天')
                rpg_before = rpg_state(page)
                nav(page, mobile, '自我历史学')
                expect(page).to_have_url(base + '#/historian')
                frame = frame_for(page)
                # Navigation itself must not write either dataset.
                frame.locator('.entry-preview p').filter(has_text=ORIGINAL).wait_for()
                assert historian_state(page.frames[1]) == before
                assert rpg_state(page) == rpg_before
                assert page.locator('iframe').get_attribute('src') == base + 'personal-historian/index.html'
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                assert page.frames[1].evaluate('document.documentElement.scrollWidth <= innerWidth')
                page.screenshot(path=str(SHOTS / f'{name}-historian.png'), full_page=True)
                # Every existing research section is still reachable, including mobile drawer.
                for section in ['timeline', 'patterns', 'hypotheses', 'experiments', 'predictions', 'reviews', 'archive', 'today']:
                    view(frame, mobile, section)
                if mobile:
                    frame.locator('#mobile-menu').click()
                    page.screenshot(path=str(SHOTS / 'mobile-historian-menu.png'), full_page=True)
                    frame.locator('.main-nav [data-view="today"]').click()
                # Add a second original and a user revision; never change the first original.
                new_text = f'验收样例（虚构）：{name} 模块内新增记录。'
                frame.locator('#entry-composer').fill(new_text)
                frame.locator('[data-action="save-entry"]').click()
                expect(frame.locator('#save-indicator')).to_contain_text('原文与分析已分别保存')
                frame.locator('.entry-mini').filter(has_text=new_text).get_by_role('button', name='打开证据 →').click()
                frame.locator('#revision-text').fill(REVISION)
                frame.get_by_role('button', name='保存新版本').click()
                expect(frame.locator('#app-dialog')).not_to_be_visible()
                after = historian_state(page.frames[1])
                saved = next(e for e in after['entries'] if e['originalText'] == new_text)
                assert saved['currentText'] == REVISION
                assert [r['text'] for r in saved['revisions']] == [new_text, REVISION]
                assert next(e for e in after['entries'] if e['id'] == original_entry['id']) == original_entry
                assert rpg_state(page) == rpg_before
                view(frame, mobile, 'timeline')
                expect(frame.locator('.timeline-card').filter(has_text=REVISION)).to_be_visible()
                page.screenshot(path=str(SHOTS / f'{name}-timeline.png'), full_page=True)
                # Parent route history, refresh, exit/re-entry all keep stored data.
                nav(page, mobile, '今天')
                page.go_back()
                frame_for(page)
                page.reload()
                frame_for(page)
                assert historian_state(page.frames[1]) == after
                nav(page, mobile, '今天')
                nav(page, mobile, '自我历史学')
                frame_for(page)
                assert historian_state(page.frames[1]) == after
                # Existing journal and task/skill/capital growth still persist.
                nav(page, mobile, '每日记录')
                page.get_by_role('button', name='8', exact=True).click()
                page.get_by_label('醒来时间').fill('07:10')
                page.get_by_label('今天吃了什么？').fill('验收样例（虚构）：米饭、蔬菜和鸡蛋。')
                page.get_by_label('今天做了哪些事？').fill(f'验收样例（虚构）：{name} RPG 日志。')
                page.get_by_label('今天不顺心或不太好的事？').fill('验收样例（虚构）：下午有些疲惫。')
                page.get_by_role('button', name='运动了', exact=True).click()
                page.get_by_label('运动补充').fill('验收样例（虚构）：散步 20 分钟。')
                page.get_by_role('button', name=re.compile(r'保存今天的(记录|修改)')).click()
                saved_journal = next(log for log in rpg_state(page)['logs'] if log['whatHappened'] == f'验收样例（虚构）：{name} RPG 日志。')
                assert saved_journal['dayRating'] == 8 and saved_journal['wakeTime'] == '07:10'
                assert saved_journal['meals'] == '验收样例（虚构）：米饭、蔬菜和鸡蛋。'
                assert saved_journal['exerciseDone'] is True and saved_journal['exerciseNote'] == '验收样例（虚构）：散步 20 分钟。'
                page.screenshot(path=str(SHOTS / f'{name}-journal.png'), full_page=True)
                nav(page, mobile, '今天')
                page.get_by_role('textbox', name='状态备注').fill('验收样例（虚构）：已观察今日状态。')
                page.get_by_role('button', name='保存状态').click()
                before_action = rpg_state(page)
                action = next(a for a in before_action['dailyActions'] if a['status'] != 'completed' and a.get('skillId'))
                page.get_by_role('button', name='完成建议：' + action['title'], exact=True).click()
                after_action = rpg_state(page)
                assert after_action['profile']['totalXp'] > before_action['profile']['totalXp']
                assert next(a for a in after_action['dailyActions'] if a['id'] == action['id'])['status'] == 'completed'
                assert after_action['skills'] != before_action['skills']
                assert after_action['capitals'] != before_action['capitals']
                nav(page, mobile, '计划')
                expect(page.get_by_role('heading', name='计划与目标', exact=True)).to_be_visible()
                assert page.evaluate('window.scrollY === 0')
                page.wait_for_timeout(700)
                page.screenshot(path=str(SHOTS / f'{name}-plan.png'))
                page.get_by_role('button', name='添加计划', exact=True).click()
                page.get_by_role('button', name=re.compile(r'^固定习惯')).click()
                page.screenshot(path=str(SHOTS / f'{name}-create-plan.png'))
                page.get_by_label('名称', exact=True).fill('验收样例（虚构）：新事项')
                page.get_by_role('button', name='添加到计划', exact=True).click()
                row = page.locator('.card').filter(has_text='验收样例（虚构）：新事项')
                xp = rpg_state(page)['profile']['totalXp']
                page.get_by_role('button', name='完成习惯：验收样例（虚构）：新事项', exact=True).click()
                assert rpg_state(page)['profile']['totalXp'] > xp
                assert next(q for q in rpg_state(page)['dailyQuests'] if q['title'] == '验收样例（虚构）：新事项')['lastCompletedDate']
                stored_rpg = rpg_state(page)
                page.reload()
                expect(page.get_by_role('heading', name='计划与目标', exact=True)).to_be_visible()
                assert rpg_state(page) == stored_rpg
                nav(page, mobile, '每日记录')
                expect(page.get_by_label('今天做了哪些事？')).to_have_value(f'验收样例（虚构）：{name} RPG 日志。')
                expect(page.get_by_label('今天吃了什么？')).to_have_value('验收样例（虚构）：米饭、蔬菜和鸡蛋。')
                expect(page.get_by_role('button', name='8', exact=True)).to_have_attribute('aria-pressed', 'true')
                expect(page.get_by_role('button', name='运动了', exact=True)).to_have_attribute('aria-pressed', 'true')
                nav(page, mobile, '自我历史学')
                frame_for(page)
                assert historian_state(page.frames[1]) == after
                # Offline reopening and writing: IndexedDB and RPG stores remain usable.
                page.evaluate('navigator.serviceWorker.ready')
                page.wait_for_function('navigator.serviceWorker.controller !== null')
                context.set_offline(True)
                page.reload()
                frame = frame_for(page)
                frame.locator('#entry-composer').fill('验收样例（虚构）：离线记录。')
                frame.locator('[data-action="save-entry"]').click()
                expect(frame.locator('#save-indicator')).to_contain_text('原文与分析已分别保存')
                page.reload()
                frame_for(page)
                assert any(e['originalText'] == '验收样例（虚构）：离线记录。' for e in historian_state(page.frames[1])['entries'])
                assert rpg_state(page) == stored_rpg
                # Offline legacy URL shares the same database.
                page.goto(base + 'personal-historian/')
                expect(page.locator('#entry-composer')).to_be_visible()
                assert any(e['originalText'] == new_text for e in historian_state(page)['entries'])
                assert not errors, errors
                print(f'{name}: navigation, 8 views, old-data compatibility, create/revise, refresh/back/re-entry, daily score/routine log, check-in, tasks, XP/skills/capitals and offline PASS')
                context.close()
            # Precache must support the FIRST historian visit while offline, without RPG setup.
            context = browser.new_context(viewport={'width': 390, 'height': 844})
            page = context.new_page()
            page.goto(base)
            expect(page.get_by_role('link', name='只想写人生记录？进入自我历史学')).to_be_visible()
            page.evaluate('navigator.serviceWorker.ready')
            page.wait_for_function('navigator.serviceWorker.controller !== null')
            # Guard against future cache cleanup regressions affecting sibling applications.
            page.evaluate("caches.open('sibling-app-cache')")
            context.set_offline(True)
            page.goto(base + '#/historian')
            page.reload()
            frame_for(page)
            assert page.evaluate("localStorage.getItem('life-rpg:v1')") is None
            assert 'sibling-app-cache' in page.evaluate('caches.keys()')
            print('first offline historian visit + no RPG save + sibling cache retained PASS')
            context.close()
            # Repeat under a domain-root deployment as well as the Pages subpath.
            context = browser.new_context()
            page = context.new_page()
            root_url = base.removesuffix('life-rpg/')
            page.goto(root_url + '#/historian')
            frame_for(page)
            assert page.locator('iframe').get_attribute('src') == root_url + 'personal-historian/index.html'
            page.evaluate('navigator.serviceWorker.ready')
            page.wait_for_function('navigator.serviceWorker.controller !== null')
            context.set_offline(True)
            page.reload()
            frame_for(page)
            print('domain-root direct historian route + offline reload PASS')
            context.close()
            context = browser.new_context(viewport={'width': 390, 'height': 844}, reduced_motion='reduce')
            page = context.new_page()
            page.goto(base)
            page.get_by_role('button', name='载入示例数据').click()
            expect(page.locator('section[aria-label="Life OS 模块"]')).to_be_visible()
            page.wait_for_function("Array.from(document.querySelectorAll('.rise')).every((el) => getComputedStyle(el).opacity === '1' && getComputedStyle(el).animationName === 'none')")
            print('reduced-motion dashboard content visible without animation PASS')
            context.close()
            browser.close()
    finally:
        server.shutdown()
