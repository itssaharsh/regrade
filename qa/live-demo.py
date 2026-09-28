# T04: the demo flow three times on the live URL, fresh context each run, reset shortcut exercised between runs.
import sys
from playwright.sync_api import sync_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'https://regrade-app.vercel.app/'
fails = []
with sync_playwright() as p:
    b = p.chromium.launch()
    for run in (1, 2, 3):
        ctx = b.new_context(viewport={'width': 1280, 'height': 720}, accept_downloads=True); pg = ctx.new_page(); errs = []; bad = []
        pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        pg.on('response', lambda r: bad.append(f'{r.status} {r.url}') if r.status >= 400 else None)
        pg.goto(URL, wait_until='load'); pg.wait_for_timeout(800)
        pg.click('#generate'); pg.wait_for_timeout(900)
        ok1 = pg.locator('td.cell .fx').count() == 24 and 'Clashes 0' in pg.locator('#chips').inner_text().replace('\n', ' ')
        pg.click('button[data-down="ivybrook-reds"]'); pg.wait_for_timeout(200)
        stale = pg.locator('#stale').is_visible()
        pg.click('#generate'); pg.wait_for_timeout(900)
        byes = 'Bye this Saturday' in pg.locator('#byes').inner_text()
        pg.click('#tab-w3'); pg.wait_for_timeout(300)
        wk3 = pg.locator('td.cell .fx').count() > 0
        with pg.expect_download() as d: pg.click('#download')
        head = open(d.value.path()).readline().strip() == 'Date,Time,Division,Home Team,Away Team,Venue,Pitch,Home Score,Away Score'
        pg.click('button[data-v="1"][data-d="-1"]'); pg.click('button[data-v="1"][data-d="-1"]'); pg.click('#generate'); pg.wait_for_timeout(900)
        short = pg.locator('.unsched').is_visible()
        pg.keyboard.press('Alt+Shift+KeyR'); pg.wait_for_timeout(400)
        reset = '24 slots per Saturday' in pg.locator('#slots').inner_text() and pg.locator('td.cell .fx').count() == 0
        res = dict(generate=ok1, stale=stale, byes=byes, week3=wk3, csv=head, shortfall=short, reset=reset, console=not errs, http=not bad)
        print(f'run {run}:', res, errs[:2], bad[:2])
        if not all(res.values()): fails.append(run)
        ctx.close()
    b.close()
print('LIVE DEMO PASS x3' if not fails else f'FAILED runs {fails}')
sys.exit(1 if fails else 0)
