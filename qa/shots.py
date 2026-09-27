# QA: screenshots of every state at 320/390/1024/1280/1440, axe at 1440, and interaction checks. Usage: python3 qa/shots.py [base]
import sys
from playwright.sync_api import sync_playwright
base = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:4173'
states = ['', 'generated', 'stale', 'partial', 'error', 'dragging']
fails = []
with sync_playwright() as p:
    b = p.chromium.launch()
    for w in (320, 390, 1024, 1280, 1440):
        ctx = b.new_context(viewport={'width': w, 'height': 844 if w < 500 else 900}); page = ctx.new_page(); errs = []
        page.on('pageerror', lambda e: errs.append(str(e))); page.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        for st in states:
            page.goto(base + '/' + (f'?state={st}' if st else ''), wait_until='load'); page.wait_for_timeout(700)
            page.screenshot(path=f'qa/{st or "first-run"}-{w}.png', full_page=True)
            over = page.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
            if over > 0: fails.append(f'horizontal page scroll {over}px at {w} {st}')
            if w == 1440:
                page.add_script_tag(url='https://cdn.jsdelivr.net/npm/axe-core@4/axe.min.js'); page.wait_for_timeout(200)
                res = page.evaluate("axe.run({runOnly:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']})")
                for v in res['violations']: fails.append(f"axe {st or 'first-run'}: {v['id']} x{len(v['nodes'])} {v['nodes'][0]['target']}")
        if errs: fails.append(f'console errors at {w}: {errs[:3]}')
        ctx.close()
    # interactions at 1280
    ctx = b.new_context(viewport={'width': 1280, 'height': 720}, accept_downloads=True); page = ctx.new_page()
    page.goto(base + '/', wait_until='load'); page.wait_for_timeout(500)
    page.click('#generate'); page.wait_for_timeout(900)
    cells = page.locator('td.cell .fx').count(); chips = page.locator('#chips').inner_text().replace('\n', ' ')
    if cells != 24: fails.append(f'week 1 cells {cells} != 24')
    clipped = page.evaluate("[...document.querySelectorAll('.gtable')].filter(g=>g.scrollWidth>g.clientWidth).length")
    if clipped: fails.append(f'{clipped} venue tables overflow at 1280')
    with page.expect_download() as d: page.click('#download')
    head = open(d.value.path()).readline().strip(); first = open(d.value.path()).readlines()[1]
    if head != 'Date,Time,Division,Home Team,Away Team,Venue,Pitch,Home Score,Away Score': fails.append('csv header ' + head)
    if ',Band ' in first: fails.append('csv still exports Band names: ' + first)
    # focus survives a move
    page.focus('button[data-down="ivybrook-reds"]'); page.keyboard.press('Enter'); page.wait_for_timeout(200)
    focused = page.evaluate('document.activeElement && (document.activeElement.dataset.up || document.activeElement.dataset.down || document.activeElement.tagName)')
    if focused != 'ivybrook-reds': fails.append(f'focus after move landed on {focused}')
    if page.locator('#stale').is_hidden(): fails.append('stale notice hidden after a move')
    page.click('#generate'); page.wait_for_timeout(600)
    byes = page.locator('#byes').inner_text()
    if 'Bye this Saturday' not in byes: fails.append('byes not shown after odd bands')
    # tabs keyboard
    page.focus('#tab-w1'); page.keyboard.press('ArrowRight'); page.wait_for_timeout(150)
    if page.evaluate('document.activeElement.id') != 'tab-w2': fails.append('ArrowRight on tabs did not move to week 2')
    # setup validation
    page.fill('#first', '2026-10-18'); page.wait_for_timeout(150)
    if 'Sunday' not in (page.locator('#setup-error').inner_text() if page.locator('#setup-error').count() else ''): fails.append('non-Saturday not rejected')
    page.fill('#times', '09:00, 10:00, 11:00, 12:00'); page.locator('#times').press('Tab'); page.wait_for_timeout(150)
    if '32 slots' not in page.locator('#slots').inner_text(): fails.append('times edit did not change slot count: ' + page.locator('#slots .small').first.inner_text())
    page.fill('#vname-1', 'Kingsmead Park'); page.locator('#vname-1').press('Tab'); page.wait_for_timeout(150)
    page.click('#generate'); page.wait_for_timeout(600)
    if 'kingsmead park' not in page.locator('#grid').inner_text().lower(): fails.append('renamed venue not in grid')
    print('interactions: cells', cells, '| chips', chips, '| byes', byes[:90])
    ctx.close()
    # phone: generate reveals the grid
    ctx = b.new_context(viewport={'width': 390, 'height': 844}); page = ctx.new_page()
    page.goto(base + '/', wait_until='load'); page.wait_for_timeout(400); page.click('#generate'); page.wait_for_timeout(1200)
    top = page.evaluate("document.querySelector('#stage').getBoundingClientRect().top")
    if not (-10 < top < 300): fails.append(f'phone: stage not revealed after generate (top {top})')
    ctx.close(); b.close()
print('FAILS:' if fails else 'QA PASS', *fails, sep='\n  ')
sys.exit(1 if fails else 0)
