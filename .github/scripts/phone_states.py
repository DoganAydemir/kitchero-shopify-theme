"""Temporary phone checks (390 x 844): filter drawer with a price filter,
search overlay with a query, deals cards. Screenshots go to <out dir>."""
import os
import sys

from playwright.sync_api import sync_playwright

STORE = os.environ['STORE_URL'].rstrip('/')
PASSWORD = os.environ['PASSWORD']
THEME = os.environ.get('THEME', '').strip()
OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)


def url(path):
    if not THEME:
        return f'{STORE}{path}'
    return f'{STORE}{path}{"&" if "?" in path else "?"}preview_theme_id={THEME}'


with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True,
                              device_scale_factor=2)
    page = ctx.new_page()
    page.goto(f'{STORE}/password', wait_until='domcontentloaded')
    if page.locator('input[type="password"]').count():
        page.fill('input[type="password"]', PASSWORD)
        page.locator('input[type="password"]').press('Enter')
        page.wait_for_load_state('networkidle')

    page.goto(url('/collections/kitchen-cabinets?filter.v.price.gte=2500&filter.v.price.lte=3500'), wait_until='networkidle')
    page.wait_for_timeout(1500)
    page.locator('[data-open-filter-drawer]').first.click()
    page.wait_for_timeout(1200)
    page.screenshot(path=f'{OUT}/phone-filter-drawer.png')
    print('price inputs:', page.evaluate("""() => [...document.querySelectorAll('[data-filter-drawer] input[type=number]')].map(i => i.name + '=' + i.value + ' ph=' + i.placeholder).join(' | ')"""))
    page.evaluate("() => { const b = document.querySelector('.kt-filter-drawer__body'); b.scrollTop = b.scrollHeight; }")
    page.wait_for_timeout(500)
    page.screenshot(path=f'{OUT}/phone-filter-drawer-bottom.png')

    page.goto(url('/'), wait_until='networkidle')
    page.wait_for_timeout(1500)
    page.locator('[data-search-open]').first.click()
    page.wait_for_timeout(800)
    page.keyboard.type('kitchen', delay=60)
    page.wait_for_timeout(2500)
    page.screenshot(path=f'{OUT}/phone-search-kitchen.png')
    box = page.evaluate("() => { const r = document.querySelector('.kt-search-overlay__input').getBoundingClientRect(); return [r.top, r.bottom]; }")
    print('search input top/bottom:', box)
    page.fill('.kt-search-overlay__input', 'zzzz')
    page.wait_for_timeout(2500)
    page.screenshot(path=f'{OUT}/phone-search-none.png')

    page.goto(url('/pages/deals'), wait_until='networkidle')
    page.wait_for_timeout(1500)
    page.evaluate("() => { const c = document.querySelector('.kt-deals__card'); if (c) c.scrollIntoView({block: 'start'}); window.scrollBy(0, -90); }")
    page.wait_for_timeout(800)
    page.screenshot(path=f'{OUT}/phone-deals.png')
    browser.close()
