"""Production browser acceptance using isolated, synthetic storage only.
Run after pnpm build: python3 scripts/browser-smoke.py
Requires Python Playwright and Chromium; no application dependency is added.
"""
import json
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

def exercise_life_overview(page, mobile, name):
    before = rpg_state(page)
    expect(page.get_by_role('heading', name='今日生活概览', exact=True)).to_be_visible()
    expect(page.get_by_role('button', name='查看或补记睡眠', exact=True)).to_contain_text('7小时40分')
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.wait_for_function("Array.from(document.querySelectorAll('.rise')).every((el) => getComputedStyle(el).opacity === '1')")
    page.screenshot(path=str(SHOTS / f'native-{name}-today.png'))
    if mobile:
        page.get_by_role('heading', name='近 7 天睡眠', exact=True).scroll_into_view_if_needed()
        page.screenshot(path=str(SHOTS / 'native-mobile-today-details.png'))
    # Modify the existing night, retaining the same id and all original journal fields.
    page.get_by_role('button', name='查看或补记睡眠', exact=True).click()
    dialog = page.get_by_role('dialog')
    expect(dialog).to_be_visible()
    dialog.get_by_label('结束时间', exact=True).fill('07:40')
    dialog.get_by_role('button', name='保存时段', exact=True).click()
    expect(dialog).not_to_be_visible()
    expect(page.get_by_role('button', name='查看或补记睡眠', exact=True)).to_contain_text('7小时30分')
    # A new segment cannot overlap existing sleep or extend into the future.
    page.get_by_role('button', name='记一段活动', exact=True).click()
    dialog.get_by_label('开始时间', exact=True).fill('07:00')
    dialog.get_by_label('结束时间', exact=True).fill('08:00')
    dialog.get_by_role('button', name='保存时段', exact=True).click()
    expect(dialog.get_by_role('alert')).to_contain_text('重叠')
    dialog.get_by_label('开始时间', exact=True).fill('22:00')
    dialog.get_by_label('结束时间', exact=True).fill('22:40')
    dialog.get_by_role('button', name='保存时段', exact=True).click()
    expect(dialog.get_by_role('alert')).to_contain_text('现在')
    dialog.get_by_label('结束时间', exact=True).fill('22:20')
    dialog.get_by_label('时段类型', exact=True).select_option('study')
    dialog.get_by_label('时段备注', exact=True).fill('虚构验收：读书20分钟')
    page.screenshot(path=str(SHOTS / f'native-{name}-time-editor.png'))
    dialog.get_by_role('button', name='保存时段', exact=True).click()
    expect(dialog).not_to_be_visible()
    saved = rpg_state(page)
    added = next(e for e in saved['timeEntries'] if e['note'] == '虚构验收：读书20分钟')
    assert len(saved['timeEntries']) == len(before['timeEntries']) + 1
    for key in ['logs', 'checkIns', 'profile', 'skills', 'capitals', 'dailyQuests', 'sideQuests', 'transactions']:
        assert saved[key] == before[key], key
    # The same record is visible from journal, browser Back and a fresh reload.
    nav(page, mobile, '每日记录')
    expect(page.get_by_text('虚构验收：读书20分钟', exact=True)).to_be_visible()
    page.go_back()
    expect(page.get_by_role('heading', name='今日生活概览', exact=True)).to_be_visible()
    page.reload()
    expect(page.get_by_role('button', name='查看或补记睡眠', exact=True)).to_contain_text('7小时30分')
    assert rpg_state(page)['timeEntries'] == saved['timeEntries']
    page.get_by_text('查看 / 修改时段记录', exact=True).click()
    row = page.locator('div.rounded-xl').filter(has=page.get_by_text('虚构验收：读书20分钟', exact=True)).last
    row.get_by_role('button', name='修改', exact=False).click()
    dialog.get_by_label('结束时间', exact=True).fill('22:15')
    dialog.get_by_role('button', name='保存时段', exact=True).click()
    edited = next(e for e in rpg_state(page)['timeEntries'] if e['id'] == added['id'])
    assert edited['endedAt'].endswith('14:15:00.000Z')
    row.get_by_role('button', name='修改', exact=False).click()
    dialog.get_by_role('button', name='删除这段记录', exact=True).click()
    dialog.get_by_role('button', name='确定删除', exact=True).click()
    assert not any(e['id'] == added['id'] for e in rpg_state(page)['timeEntries'])
    assert len(rpg_state(page)['timeEntries']) == len(before['timeEntries'])
    print(f'{name}: life overview, sleep edit, interval validation, create/edit/delete, shared journal, refresh/back and unchanged growth PASS')

def reflection(page, mobile):
    if mobile:
        nav(page, True, '更多')
        page.get_by_role('link', name=re.compile('^复盘与探索')).click()
    else:
        nav(page, False, '复盘与探索')
    expect(page.get_by_role('heading', name='复盘与探索', exact=True)).to_be_visible()

def screenshot(page, name):
    if not page.get_by_role('dialog').count():
        page.evaluate('window.scrollTo(0, 0)')
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.wait_for_function("Array.from(document.querySelectorAll('.rise')).every((el) => getComputedStyle(el).opacity === '1')")
    page.screenshot(path=str(SHOTS / f'native-{name}.png'))

def exercise_native_research(page, mobile, name, base):
    before_game = rpg_state(page)
    old = historian_state(page)
    # The same global guide works on desktop and mobile, and never writes personal data.
    page.get_by_role('link', name=re.compile('^使用引导')).first.click()
    expect(page.get_by_role('heading', name='这个网页怎么用？', exact=True)).to_be_visible()
    screenshot(page, f'{name}-guide')
    page.get_by_role('button', name='开始操作引导', exact=True).click()
    guide = page.get_by_role('complementary', name='操作引导')
    expect(guide).to_contain_text('第 1 / 4 步')
    for index in range(2, 5):
        guide.get_by_role('button', name='下一步', exact=True).click()
        expect(guide).to_contain_text(f'第 {index} / 4 步')
    guide.get_by_role('button', name='我知道怎么用了', exact=True).click()
    expect(guide).not_to_be_visible()
    assert rpg_state(page) == before_game
    assert historian_state(page) == old
    # TODAY is now the native quick-note tab inside the existing journal.
    nav(page, mobile, '每日记录')
    page.get_by_role('navigation', name='记录方式').get_by_role('button', name='随手记', exact=True).click()
    assert page.locator('iframe').count() == 0
    text = f'虚构验收：{name} 散步后想到一个小办法。'
    revision = text + ' 补充：把第一步缩小以后更容易开始。'
    page.get_by_label('随手记内容', exact=True).fill(text)
    page.get_by_label('标签（可选）', exact=True).fill('散步、学习')
    page.get_by_role('button', name='保存随手记', exact=True).click()
    expect(page.get_by_role('status')).to_contain_text('已保存')
    card = page.locator('article').filter(has_text=text)
    card.get_by_role('button', name='查看 / 补充', exact=True).click()
    dialog = page.get_by_role('dialog')
    dialog.get_by_role('button', name='补充 / 修订', exact=True).click()
    dialog.get_by_label('修订内容', exact=True).fill(revision)
    dialog.get_by_role('button', name='保存新版本', exact=True).click()
    expect(dialog).to_contain_text('2 个版本')
    dialog.get_by_text('整理文字与可能的线索', exact=True).click()
    dialog.get_by_role('button', name='整理这段文字', exact=True).click()
    expect(dialog.get_by_role('button', name='重新整理文字', exact=True)).to_be_visible()
    dialog.get_by_text('首次原文与修订历史', exact=True).click()
    expect(dialog.get_by_text(text, exact=True).first).to_be_visible()
    saved = next(e for e in historian_state(page)['entries'] if e['originalText'] == text)
    assert saved['currentText'] == revision
    assert [r['text'] for r in saved['revisions']] == [text, revision]
    screenshot(page, f'{name}-revisions')
    dialog.get_by_role('button', name='关闭弹窗', exact=True).click()
    screenshot(page, f'{name}-notes')
    nav(page, mobile, '历史记录')
    expect(page.get_by_role('heading', name='历史记录', exact=True)).to_be_visible()
    assert page.locator('iframe').count() == 0
    assert page.locator('article').filter(has_text='每日总结').count() > 0
    page.get_by_label('搜索历史记录', exact=True).fill('第一步缩小')
    expect(page.locator('article')).to_have_count(1)
    expect(page.locator('article')).to_contain_text(revision)
    page.reload()
    expect(page.get_by_role('heading', name='历史记录', exact=True)).to_be_visible()
    assert next(e for e in historian_state(page)['entries'] if e['originalText'] == text)['currentText'] == revision
    screenshot(page, f'{name}-timeline')
    page.go_back()
    nav(page, mobile, '每日记录')
    page.get_by_role('navigation', name='记录方式').get_by_role('button', name='随手记', exact=True).click()
    expect(page.locator('article').filter(has_text=revision)).to_be_visible()
    # HYPOTHESES: preserve zero, append judgement history, link the original record.
    reflection(page, mobile)
    tabs = page.get_by_role('navigation', name='复盘功能')
    tabs.get_by_role('button', name='想法与证据', exact=True).click()
    page.get_by_role('button', name='记一个想法', exact=True).click()
    dialog.get_by_label('我想验证的想法', exact=True).fill(f'虚构验收：{name} 小步骤是否更容易开始')
    dialog.get_by_label('为什么这样想？', exact=True).fill('先记录观察，不把一次经历当作结论。')
    dialog.get_by_label(re.compile('^目前相信的程度')).fill('0')
    dialog.get_by_role('button', name='保存想法', exact=True).click()
    hypothesis = next(h for h in historian_state(page)['hypotheses'] if h['title'].startswith(f'虚构验收：{name}'))
    assert hypothesis['confidence'] == 0
    page.locator('article').filter(has_text=hypothesis['title']).get_by_role('button', name='查看 / 添加证据', exact=True).click()
    dialog.get_by_label('想法相信程度', exact=True).fill('65')
    dialog.get_by_label('这次为什么调整？（可选）', exact=True).fill('有了一条新的观察。')
    dialog.get_by_role('button', name='追加一次判断', exact=True).click()
    dialog.get_by_label('选择随手记', exact=True).select_option(saved['id'])
    dialog.get_by_label('这条记录提供了什么？', exact=True).select_option('support')
    dialog.get_by_label('证据说明（可选）', exact=True).fill('虚构证据：原文描述了开始的条件。')
    dialog.get_by_role('button', name='添加证据', exact=True).click()
    expect(dialog.get_by_role('status')).to_contain_text('证据已关联')
    updated = next(h for h in historian_state(page)['hypotheses'] if h['id'] == hypothesis['id'])
    assert [h['confidence'] for h in updated['confidenceHistory']] == [0, 65]
    proof = next(e for e in historian_state(page)['evidence'] if e['id'] == updated['supportingEvidence'][0])
    assert proof['entryId'] == saved['id']
    dialog.get_by_role('button', name='关闭弹窗', exact=True).click()
    screenshot(page, f'{name}-reflection')
    # EXPERIMENTS: creation, real observation, sleep reuse, truthful numerical summary.
    tabs.get_by_role('button', name='小实验', exact=True).click()
    page.get_by_role('button', name='开始一个小实验', exact=True).click()
    dialog.get_by_label('这次想尝试什么？', exact=True).fill(f'虚构验收：{name} 先读一页书')
    dialog.get_by_label('想弄明白的问题', exact=True).fill('小步骤能否帮助开始？')
    dialog.get_by_label('打算观察几天（2–30）', exact=True).fill('3')
    dialog.get_by_role('button', name='保存实验', exact=True).click()
    experiment = next(e for e in historian_state(page)['experiments'] if e['title'].startswith(f'虚构验收：{name}'))
    card = page.locator('article').filter(has_text=experiment['title'])
    card.get_by_role('button', name='记录一次观察', exact=True).click()
    dialog.get_by_label('专注程度（1–5）', exact=True).fill('4')
    dialog.get_by_label('抗拒程度（1–5）', exact=True).fill('2')
    dialog.get_by_label('实际发生了什么？（可选）', exact=True).fill('虚构观察：读完一页后愿意继续。')
    dialog.get_by_role('button', name='保存观察', exact=True).click()
    card.get_by_role('button', name='整理当前观察', exact=True).click()
    expect(card).to_contain_text('已记录 1 次观察')
    observed = next(e for e in historian_state(page)['experiments'] if e['id'] == experiment['id'])
    assert observed['observations'][0]['sleepHours'] == 7.5
    assert '因果结论' in observed['conclusion']
    # PREDICTIONS: probability zero stays zero after resolving an event as false.
    tabs.get_by_role('button', name='我的预测', exact=True).click()
    page.get_by_role('button', name='记一个预测', exact=True).click()
    prediction_text = f'虚构验收：{name} 下周读完一本书'
    dialog.get_by_label('我预测会发生什么？', exact=True).fill(prediction_text)
    dialog.get_by_label('你觉得发生的可能性（0–100%）', exact=True).fill('0')
    dialog.get_by_role('button', name='保存预测', exact=True).click()
    page.locator('article').filter(has_text=prediction_text).get_by_role('button', name='记录结果', exact=True).click()
    dialog.get_by_label('最终发生了吗？', exact=True).select_option('false')
    dialog.get_by_role('button', name='保存结果', exact=True).click()
    predicted = next(e for e in historian_state(page)['predictions'] if e['text'] == prediction_text)
    assert predicted['probability'] == 0 and predicted['result'] is False
    # REVIEWS: append snapshots without removing prior reviews.
    tabs.get_by_role('button', name='定期复盘', exact=True).click()
    page.get_by_label('这一段时间，有什么想记住的？（可选）', exact=True).fill('虚构复盘：做小一点，开始更轻松。')
    page.get_by_label('接下来想尝试的一件小事（可选）', exact=True).fill('虚构计划：先读一页。')
    page.get_by_role('button', name='保存这次复盘', exact=True).click()
    expect(page.get_by_role('status')).to_contain_text('已保存')
    # ARCHIVE: complete export, native snapshots, preview + dedup of the exact same JSON.
    if mobile:
        nav(page, True, '更多')
        page.get_by_role('link', name=re.compile('^设置与备份')).click()
    else:
        nav(page, False, '设置')
    archive = page.get_by_role('region', name='记录与复盘备份')
    with page.expect_download() as download_info:
        archive.get_by_role('button', name='导出整站 JSON 备份', exact=True).click()
    backup = json.loads(Path(download_info.value.path()).read_text())
    for key in before_game:
        if key != 'effects': # Derived status icons receive fresh random ids after hydration.
            assert backup['game']['state'][key] == before_game[key], key
    assert backup['historian']['state'] == historian_state(page)
    archive.get_by_text('其他导出格式和本机快照', exact=True).click()
    archive.get_by_role('button', name='创建本机快照', exact=True).click()
    expect(archive.get_by_role('status')).to_contain_text('已创建本机快照')
    assert historian_state(page)['backups'][0]['snapshot']['backups'] == []
    current = historian_state(page)
    archive.get_by_label('导入记录档案文件', exact=True).set_input_files({'name': 'synthetic-backup.json', 'mimeType': 'application/json', 'buffer': json.dumps({'state': current}, ensure_ascii=False).encode()})
    expect(dialog).to_contain_text('预计补充 0 项')
    dialog.get_by_role('button', name='确认补充导入', exact=True).click()
    expect(dialog).not_to_be_visible()
    for key in ['entries', 'hypotheses', 'evidence', 'experiments', 'predictions', 'reviews', 'backups']:
        assert historian_state(page)[key] == current[key]
    # All old records and their revision/analysis payloads survive native workflows verbatim.
    after = historian_state(page)
    for key in ['entries', 'hypotheses', 'evidence', 'experiments', 'predictions', 'reviews', 'backups']:
        for item in old[key]:
            assert next(row for row in after[key] if row['id'] == item['id']) == item, (key, item['id'])
    assert rpg_state(page) == before_game
    screenshot(page, f'{name}-settings')
    print(f'{name}: native 8 functions, guide walkthrough, originals/revisions, evidence, experiment, prediction, review, complete JSON export and dedup import PASS')

with tempfile.TemporaryDirectory(prefix='life-os-smoke-') as directory:
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
            browser = p.chromium.launch(executable_path=executable, args=['--no-sandbox', '--lang=zh-CN'])
            for mobile, viewport, name in [(False, {'width': 1440, 'height': 1200}, 'desktop'), (True, {'width': 390, 'height': 844}, 'mobile')]:
                context = browser.new_context(viewport=viewport, timezone_id='Asia/Shanghai', locale='zh-CN')
                page = context.new_page()
                page.clock.set_fixed_time('2026-10-17T14:30:00Z')
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                # Existing legacy database and an original revision chain BEFORE entering the native app.
                page.goto(base + 'personal-historian/')
                page.locator('#entry-composer').fill(ORIGINAL)
                page.locator('[data-action="save-entry"]').click()
                expect(page.locator('#save-indicator')).to_contain_text('原文与分析已分别保存')
                page.locator('.entry-mini').filter(has_text=ORIGINAL).get_by_role('button', name='打开证据 →').click()
                page.locator('#revision-text').fill(REVISION)
                page.get_by_role('button', name='保存新版本').click()
                before = historian_state(page)
                page.goto(base + '#/historian')
                expect(page).to_have_url(base + '#/journal?tab=notes')
                expect(page.get_by_label('随手记内容', exact=True)).to_be_visible()
                assert page.locator('iframe').count() == 0
                assert page.evaluate("localStorage.getItem('life-rpg:v1')") is None
                assert historian_state(page) == before
                # Initialize a synthetic RPG profile explicitly; never use a real browser profile.
                page.goto(base)
                page.get_by_role('button', name='载入示例数据').click()
                expect(page.get_by_role('heading', name='今日生活概览', exact=True)).to_be_visible()
                if not mobile:
                    desktop_nav = page.get_by_role('navigation', name='桌面主导航')
                    assert desktop_nav.locator('a').first.get_attribute('href') == '#/guide'
                else:
                    expect(page.locator('main a[href="#/guide"]').first).to_be_visible()
                exercise_life_overview(page, mobile, name)
                exercise_native_research(page, mobile, name, base)
                # The previous RPG journal, suggestions, tasks, XP, capital and skills still work.
                nav(page, mobile, '每日记录')
                page.get_by_role('button', name='8', exact=True).click()
                page.get_by_label('今天吃了什么？').fill('虚构验收：米饭、蔬菜和鸡蛋。')
                page.get_by_label('今天做了哪些事？').fill(f'虚构验收：{name} 完成一件小事。')
                page.get_by_role('button', name='运动了', exact=True).click()
                page.get_by_role('button', name=re.compile(r'保存今天的(记录|修改)')).click()
                expect(page.get_by_role('status')).to_contain_text('已保存到本机')
                nav(page, mobile, '今天')
                expect(page.get_by_test_id('life-overview')).to_contain_text('米饭、蔬菜和鸡蛋')
                page.get_by_role('textbox', name='状态备注').fill('虚构验收：已观察今日状态。')
                page.get_by_role('button', name='保存状态').click()
                before_action = rpg_state(page)
                action = next(a for a in before_action['dailyActions'] if a['status'] != 'completed' and a.get('skillId'))
                page.get_by_role('button', name='完成建议：' + action['title'], exact=True).click()
                after_action = rpg_state(page)
                assert after_action['profile']['totalXp'] > before_action['profile']['totalXp']
                assert after_action['skills'] != before_action['skills'] and after_action['capitals'] != before_action['capitals']
                nav(page, mobile, '计划')
                page.get_by_role('button', name='添加计划', exact=True).click()
                page.get_by_role('button', name=re.compile(r'^固定习惯')).click()
                page.get_by_label('名称', exact=True).fill('虚构验收：新习惯')
                page.get_by_role('button', name='添加到计划', exact=True).click()
                xp = rpg_state(page)['profile']['totalXp']
                page.get_by_role('button', name='完成习惯：虚构验收：新习惯', exact=True).click()
                assert rpg_state(page)['profile']['totalXp'] > xp
                stored_rpg = rpg_state(page)
                page.reload()
                expect(page.get_by_role('heading', name='计划与目标', exact=True)).to_be_visible()
                assert rpg_state(page) == stored_rpg
                # Offline native read + append + refresh, and the old static URL reads the same database.
                page.evaluate('navigator.serviceWorker.ready')
                page.wait_for_function('navigator.serviceWorker.controller !== null')
                context.set_offline(True)
                page.goto(base + '#/journal?tab=notes')
                page.reload()
                page.get_by_label('随手记内容', exact=True).fill('虚构验收：原生页面离线记录。')
                page.get_by_role('button', name='保存随手记', exact=True).click()
                expect(page.get_by_role('status')).to_contain_text('已保存')
                page.reload()
                expect(page.locator('article').filter(has_text='虚构验收：原生页面离线记录。')).to_be_visible()
                page.goto(base + 'personal-historian/')
                expect(page.locator('.entry-mini').filter(has_text='虚构验收：原生页面离线记录。')).to_be_visible()
                for section in ['timeline', 'patterns', 'hypotheses', 'experiments', 'predictions', 'reviews', 'archive', 'today']:
                    view(page, mobile, section)
                page.goto(base + '#/')
                page.reload()
                page.get_by_role('button', name='记一段活动', exact=True).click()
                dialog = page.get_by_role('dialog')
                dialog.get_by_label('开始时间', exact=True).fill('22:00')
                dialog.get_by_label('结束时间', exact=True).fill('22:20')
                dialog.get_by_label('时段备注', exact=True).fill('虚构验收：离线活动')
                dialog.get_by_role('button', name='保存时段', exact=True).click()
                page.reload()
                expect(page.get_by_role('heading', name='今日生活概览', exact=True)).to_be_visible()
                assert any(e['note'] == '虚构验收：离线活动' for e in rpg_state(page)['timeEntries'])
                assert not errors, errors
                print(f'{name}: Pages subpath, shared legacy database, old 8 views, refresh/back/re-entry, RPG rewards + offline native notes and intervals PASS')
                context.close()
            # A fresh native visit stays empty, works offline, and does not create a role save.
            context = browser.new_context(viewport={'width': 320, 'height': 640}, timezone_id='America/New_York')
            page = context.new_page()
            root_url = base.removesuffix('life-rpg/')
            page.goto(root_url + '#/historian')
            expect(page.get_by_label('随手记内容', exact=True)).to_be_visible()
            assert historian_state(page) is None
            assert page.evaluate("localStorage.getItem('life-rpg:v1')") is None
            screenshot(page, 'mobile-empty-notes')
            page.evaluate('navigator.serviceWorker.ready')
            page.wait_for_function('navigator.serviceWorker.controller !== null')
            page.evaluate("caches.open('sibling-app-cache')")
            context.set_offline(True)
            page.goto(root_url + '#/reflection?view=predictions')
            page.reload()
            expect(page.get_by_role('button', name='记一个预测', exact=True)).to_be_visible()
            assert 'sibling-app-cache' in page.evaluate('caches.keys()')
            assert page.evaluate("localStorage.getItem('life-rpg:v1')") is None
            print('320px anonymous native entry, no auto seed/migration, first offline reflection, domain root and sibling cache retained PASS')
            page.goto(root_url + '#/settings')
            expect(page.get_by_role('button', name='恢复角色与生活记录', exact=True)).to_be_visible()
            payload = {'version': 3, 'savedAt': '2026-10-17T14:30:00Z', 'state': stored_rpg}
            page.get_by_label('恢复角色与生活记录文件', exact=True).set_input_files({'name': 'synthetic-role-backup.json', 'mimeType': 'application/json', 'buffer': json.dumps(payload, ensure_ascii=False).encode()})
            expect(page.get_by_role('button', name='确认恢复这部分数据', exact=True)).to_be_visible()
            assert page.evaluate("localStorage.getItem('life-rpg:v1')") is None
            page.get_by_role('button', name='确认恢复这部分数据', exact=True).click()
            assert rpg_state(page) == stored_rpg
            assert historian_state(page) is None
            print('restore RPG backup from an anonymous settings page requires explicit preview and leaves research database untouched PASS')
            context.close()
            # Actual elapsed sleep across DST and date rollover, independent of journal UI.
            context = browser.new_context(viewport={'width': 320, 'height': 640}, timezone_id='America/New_York')
            page = context.new_page(); page.clock.set_fixed_time('2026-03-08T16:00:00Z')
            page.goto(base); page.get_by_role('button', name='载入示例数据').click()
            page.evaluate("""() => { const save = JSON.parse(localStorage.getItem('life-rpg:v1')); save.state.timeEntries=[]; save.state.checkIns={}; save.state.logs=[]; localStorage.setItem('life-rpg:v1', JSON.stringify(save)); }""")
            page.reload()
            button = page.get_by_role('button', name='查看或补记睡眠', exact=True)
            expect(button).to_contain_text('未记')
            button.click(); page.keyboard.press('Escape'); expect(button).to_be_focused(); button.click()
            dialog = page.get_by_role('dialog')
            dialog.get_by_label('开始时间', exact=True).fill('23:30'); dialog.get_by_label('结束时间', exact=True).fill('07:30')
            dialog.get_by_role('button', name='保存时段', exact=True).click()
            expect(button).to_contain_text('7小时')
            expect(page.get_by_text('今天因时区夏令时共 23 小时。', exact=False)).to_be_visible()
            page.clock.set_fixed_time('2026-03-09T04:01:00Z'); page.evaluate("window.dispatchEvent(new Event('focus'))")
            expect(button).to_contain_text('未记')
            expect(page.get_by_text('3月9日 周一', exact=True)).to_be_visible()
            print('320px keyboard focus, DST sleep/23h allocation and local date rollover PASS')
            context.close()
            # Two native tabs must append against the latest database rather than their old rendered state.
            context = browser.new_context()
            first, second = context.new_page(), context.new_page()
            for page, text in [(first, '虚构并发记录 A'), (second, '虚构并发记录 B')]:
                page.goto(base + '#/journal?tab=notes')
                page.get_by_label('随手记内容', exact=True).fill(text)
            for page in [first, second]:
                page.evaluate("setTimeout(() => document.querySelector('form').requestSubmit(), 200)")
            expect(first.get_by_role('status')).to_contain_text('已保存')
            expect(second.get_by_role('status')).to_contain_text('已保存')
            rows = historian_state(first)['entries']
            assert {e['originalText'] for e in rows} == {'虚构并发记录 A', '虚构并发记录 B'}
            print('two native tabs append without losing either original PASS')
            context.close()
            browser.close()
    finally:
        server.shutdown()
