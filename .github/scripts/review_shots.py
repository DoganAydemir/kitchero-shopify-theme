"""Full-page screenshots of the demo store for a manual design review.

Desktop (1440 px) and phone (390 px) shots of every main template, saved as
JPEG to <out dir>. Animations are allowed to finish (scroll pass) but motion
is reduced so reveals are not caught half-way.

Usage: STORE_URL=... PASSWORD=... [THEME=<id>] python3 review_shots.py <out dir>
"""
import os
import sys

from playwright.sync_api import sync_playwright

STORE = os.environ['STORE_URL'].rstrip('/')
PASSWORD = os.environ['PASSWORD']
THEME = os.environ.get('THEME', '').strip()
OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)

PAGES = ['/', '/collections', '/collections/all', '/collections/kitchen-cabinets',
         '/collections/kitchen-essentials',
         '/products/premium-pull-down-kitchen-faucet', '/products/ivory-shaker-island-kitchen',
         '/products/round-cabinet-knobs', '/products/gift-card',
         '/cart', '/search?q=sink', '/search?q=zzzz', '/blogs/journal', 'ARTICLE',
         '/pages/about-us', '/pages/contact', '/pages/content-faq', '/pages/financing',
         '/pages/deals', '/pages/galleries', '/pages/heroes-banners', '/pages/image-with-text',
         '/pages/sliders', '/404-check', '/password']
VIEWPORTS = [('desktop', {'width': 1440, 'height': 900}, False), ('phone', {'width': 390, 'height': 844}, True)]


def login(context):
    page = context.new_page()
    page.goto(f'{STORE}/password', wait_until='domcontentloaded')
    if page.locator('input[type="password"]').count():
        page.fill('input[type="password"]', PASSWORD)
        page.locator('input[type="password"]').press('Enter')
        page.wait_for_load_state('networkidle')
    page.close()


def url(path):
    if not THEME:
        return f'{STORE}{path}'
    return f'{STORE}{path}{"&" if "?" in path else "?"}preview_theme_id={THEME}'


with sync_playwright() as p:
    browser = p.chromium.launch()
    for label, viewport, mobile in VIEWPORTS:
        context = browser.new_context(viewport=viewport, reduced_motion='reduce', is_mobile=mobile,
                                      has_touch=mobile, device_scale_factor=1)
        login(context)
        article = None
        for path in PAGES:
            if path == '/password':
                ctx = browser.new_context(viewport=viewport, is_mobile=mobile, has_touch=mobile)
                page = ctx.new_page()
            else:
                page = context.new_page()
            if path == 'ARTICLE':
                if not article:
                    page.close()
                    continue
                path = article
            try:
                page.goto(url(path), wait_until='networkidle', timeout=90000)
                page.add_style_tag(content='#preview-bar-iframe, #PBarNextFrameWrapper { display: none !important; }')
                height = page.evaluate('document.body.scrollHeight')
                for y in range(0, height, 500):
                    page.evaluate(f'window.scrollTo(0, {y})')
                    page.wait_for_timeout(100)
                page.evaluate('window.scrollTo(0, 0)')
                page.wait_for_timeout(1500)
                if path == '/blogs/journal':
                    article = page.evaluate("""() => {
                        const a = document.querySelector('main a[href*="/blogs/journal/"]:not([href*="/tagged/"])');
                        return a ? a.getAttribute('href') : '';
                    }""") or None
                name = path.strip('/').replace('/', '-').replace('?', '-').replace('=', '-') or 'home'
                page.screenshot(path=os.path.join(OUT, f'{label}--{name}.jpg'), full_page=True, type='jpeg', quality=70)
                print(f'{label} {path} ok', flush=True)
            except Exception as error:  # noqa: BLE001
                print(f'{label} {path} failed: {error}', flush=True)
            page.close()
            if path == '/password':
                ctx.close()
        context.close()
    browser.close()
