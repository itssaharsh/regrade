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
    page.select_option('#club', 'Ashby Lions'); page.wait_for_timeout(150)
    ct = page.locator('#club-text').inner_text()
    if 'Ashby Lions Whites' not in ct or 'Ashby Lions Blacks' not in ct or ct.count('/2026') != 8: fails.append('club list for Ashby Lions wrong: ' + ct[:120])
    # focus survives a move
    page.focus('button[data-down="ivybrook-reds"]'); page.keyboard.press('Enter'); page.wait_for_timeout(200)
    focused = page.evaluate('document.activeElement && (document.activeElement.dataset.up || document.activeElement.dataset.down || document.activeElement.tagName)')
    if focused != 'ivybrook-reds': fails.append(f'focus after move landed on {focused}')
    if page.locator('#stale').is_hidden(): fails.append('stale notice hidden after a move')
    if page.get_attribute('#download', 'aria-disabled') != 'true' or 'Regenerate first' not in page.locator('#export').inner_text(): fails.append('stale block can still be downloaded')
    if 'was Division' not in page.locator('#bands').inner_text(): fails.append('moved teams not marked with their old division')
    page.click('#generate'); page.wait_for_timeout(600)
    if page.get_attribute('#download', 'aria-disabled') == 'true': fails.append('download still disabled after regenerate')
    byes = page.locator('#byes').inner_text()
    if 'Bye this Saturday' not in byes: fails.append('byes not shown after odd bands')
    # tabs keyboard
    page.focus('#tab-w1'); page.keyboard.press('ArrowRight'); page.wait_for_timeout(150)
    if page.evaluate('document.activeElement.id') != 'tab-w2': fails.append('ArrowRight on tabs did not move to week 2')
    # setup validation
    days = page.eval_on_selector_all('#first option', 'os => os.map(o => new Date(o.value + "T00:00:00Z").getUTCDay())')
    if not days or any(d != 6 for d in days): fails.append(f'first-Saturday list offers a non-Saturday: {days[:5]}')
    page.select_option('#first', '2026-10-24'); page.wait_for_timeout(150)
    if 'Sat 24/10/2026' not in page.locator('#first').evaluate('s => s.options[s.selectedIndex].text'): fails.append('first Saturday not changed')
    # a setup edit after Generate must not misplace the block on screen (engineering review #1)
    before = page.locator('td.cell .fx').count()
    page.fill('#vname-0', 'Renamed Ground'); page.locator('#vname-0').press('Tab'); page.wait_for_timeout(150)
    if page.locator('td.cell .fx').count() != before: fails.append(f'grid lost fixtures after a rename: {before} -> {page.locator("td.cell .fx").count()}')
    page.fill('#times', '9:00, 10:00, 11:00, 12:00'); page.locator('#times').press('Tab'); page.wait_for_timeout(150)
    if '32 slots' not in page.locator('#slots').inner_text(): fails.append('times edit did not change slot count: ' + page.locator('#slots .small').first.inner_text())
    page.fill('#vname-1', 'Kingsmead Park'); page.locator('#vname-1').press('Tab'); page.wait_for_timeout(150)
    page.click('#generate'); page.wait_for_timeout(600)
    if 'kingsmead park' not in page.locator('#grid').inner_text().lower(): fails.append('renamed venue not in grid')
    # own results without a Division column: each band asks for its Full-Time division name
    page.click('#own'); page.fill('#draft', 'Home Team,Away Team,Home Score,Away Score\n' + '\n'.join(f'T{i} Reds,T{j} Blues,{(i+j)%4},{(i*j)%3}' for i in range(1, 9) for j in range(1, 9) if i != j))
    page.click('#load'); page.wait_for_timeout(300)
    if page.locator('input[data-divname]').count() == 0: fails.append('no division name field for bands without a division')
    page.click('#generate'); page.wait_for_timeout(500)
    if 'not a Full-Time division' not in page.locator('#export').inner_text(): fails.append('export does not warn about Band names')
    page.fill('input[data-divname]', 'Under 9 Gold'); page.locator('input[data-divname]').first.press('Tab'); page.wait_for_timeout(200)
    page.click('#generate'); page.wait_for_timeout(500)
    if 'Under 9 Gold' not in page.locator('#export').inner_text(): fails.append('typed division name not exported')
    print('interactions: cells', cells, '| chips', chips, '| byes', byes[:90])
    ctx.close()
    # reading results written any way: the review screen, driven by a QA test double for the API (scripts/mock-reading.ts)
    import subprocess, json as _json
    mock = subprocess.run(['node', '--experimental-strip-types', '--no-warnings', 'scripts/mock-reading.ts'], capture_output=True, text=True, check=True).stdout
    ctx = b.new_context(viewport={'width': 1440, 'height': 900}); page = ctx.new_page(); errs = []
    page.on('pageerror', lambda e: errs.append(str(e)))
    page.route('**/api/read-results', lambda r: r.fulfill(status=200, content_type='application/json', body=_json.dumps({'enabled': True, 'model': 'QA test double'}) if r.request.method == 'GET' else mock))
    page.goto(base + '/', wait_until='load'); page.wait_for_timeout(400)
    page.click('#own'); page.wait_for_timeout(300)
    if page.locator('#read').count() == 0: fails.append('Read with AI button missing when the API says enabled')
    page.click('#sample-msg'); page.click('#read'); page.wait_for_selector('#review-h', timeout=5000)
    page.screenshot(path='qa/review-1440.png', full_page=True)
    rv = page.locator('#import').inner_text()
    if 'read 23 results' not in rv.lower(): fails.append('review heading: ' + rv[:80])
    if 'is Westcombe Wanderers Golds' not in rv: fails.append('short name not shown as matched')
    if 'postponed' not in rv: fails.append('skipped postponed line not listed')
    page.add_script_tag(url='https://cdn.jsdelivr.net/npm/axe-core@4/axe.min.js'); page.wait_for_timeout(200)
    for v in page.evaluate("axe.run({runOnly:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']})")['violations']: fails.append(f"axe review: {v['id']} x{len(v['nodes'])} {v['nodes'][0]['target']}")
    page.click('#read-add'); page.wait_for_timeout(400)
    summary = page.locator('#import').inner_text()
    if '167 results' not in summary or 'read from text' not in summary: fails.append('add did not merge the results: ' + summary[:120])
    if errs: fails.append('review page errors: ' + '; '.join(errs[:2]))
    ctx.close()
    # phone: generate reveals the grid
    ctx = b.new_context(viewport={'width': 390, 'height': 844}); page = ctx.new_page()
    page.goto(base + '/', wait_until='load'); page.wait_for_timeout(400); page.click('#generate'); page.wait_for_timeout(1200)
    top = page.evaluate("document.querySelector('#stage').getBoundingClientRect().top")
    if not (-10 < top < 300): fails.append(f'phone: stage not revealed after generate (top {top})')
    ctx.close(); b.close()
print('FAILS:' if fails else 'QA PASS', *fails, sep='\n  ')
sys.exit(1 if fails else 0)
