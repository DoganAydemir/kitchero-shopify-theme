"""Cross-browser check of the demo store (audit #73).

Loads the main templates in Chromium, Firefox and WebKit (desktop), plus
WebKit on an iPhone and Chromium on an Android phone. Reports JavaScript
errors, failed theme assets and whether the core interactions work: search
overlay, mobile menu, add to cart. Screenshots go to <out dir>.

Note: Playwright's Linux WebKit build cannot decode AVIF or JPEG XL, which
Shopify's CDN serves to it, so some product images stay blank in the WebKit
screenshots. Safari on macOS and iOS decodes both.

Usage: STORE_URL=... PASSWORD=... python3 cross_browser.py <out dir>
"""
import json
import os
import sys

from playwright.sync_api import sync_playwright

STORE = os.environ['STORE_URL'].rstrip('/')
# Optional: test an unpublished theme (appends preview_theme_id to every URL).
PREVIEW = os.environ.get('PREVIEW_THEME', '').strip()


def url(path):
    if not PREVIEW:
        return f'{STORE}{path}'
    return f"{STORE}{path}{'&' if '?' in path else '?'}preview_theme_id={PREVIEW}"
PASSWORD = os.environ['PASSWORD']
OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)

PAGES = ['/', '/collections/all', '/products/premium-pull-down-kitchen-faucet',
         '/products/elegant-kitchen-cabinet-system', '/cart', '/search?q=sink', '/blogs/journal',
         '/pages/contact']
PRODUCT = '/products/premium-pull-down-kitchen-faucet'
# Errors from Shopify's own scripts (analytics, checkout widgets) are not theme errors.
IGNORE = ('monorail', 'shopifycloud', 'web-pixels', 'trekkie', 'shop.app', 'shopify-perf-kit',
          'captcha', 'Content Security Policy', 'Clear-Site-Data', 'has been rejected for invalid domain',
          'storefront/web-components',
          # Headless CI only: no GPU for Shopify's model-viewer (3D media) in
          # Firefox, and Linux WebKit's GTK video controls miss their icons.
          'Error creating WebGL context', 'Button failed to load')

TARGETS = [
    ('chromium', 'Chrome desktop', {'viewport': {'width': 1280, 'height': 800}}, False),
    ('firefox', 'Firefox desktop', {'viewport': {'width': 1280, 'height': 800}}, False),
    ('webkit', 'Safari desktop', {'viewport': {'width': 1280, 'height': 800}}, False),
    ('msedge', 'Edge desktop', {'viewport': {'width': 1280, 'height': 800}}, False),
    ('webkit', 'Safari iPhone', 'iPhone 13', True),
    ('chromium', 'Chrome Android', 'Pixel 7', True),
    # Samsung Internet is Chromium-based; no automation driver exists, so this
    # runs Chromium with a Galaxy viewport and the Samsung Internet user agent
    # (catches UA-dependent code paths and layout at that size, not engine lag).
    ('chromium', 'Samsung Internet (emulated)', 'SAMSUNG', True),
]


def login(context):
    page = context.new_page()
    page.goto(f'{STORE}/password', wait_until='domcontentloaded')
    if page.locator('input[type="password"]').count():
        page.fill('input[type="password"]', PASSWORD)
        page.locator('input[type="password"]').press('Enter')
        page.wait_for_load_state('networkidle')
    page.close()


def theme_error(text):
    return not any(word in text for word in IGNORE)


def open_page(context, row):
    """New tab per check, so one heavy page cannot exhaust a mobile WebKit tab."""
    page = context.new_page()
    page.on('pageerror', lambda e: row['errors'].append(f'{page.url}: {e}'))
    page.on('console', lambda m: m.type == 'error' and theme_error(m.text)
            and row['errors'].append(f'{page.url}: console: {m.text[:200]}'))
    page.on('response', lambda res: res.status >= 400 and '/cdn/shop/t/' in res.url
            and row['errors'].append(f'{res.status} {res.url[:160]}'))
    return page


def check_target(context, row, slug, mobile):
    for path in PAGES:
        page = open_page(context, row)
        try:
            page.goto(url(path), wait_until='networkidle', timeout=60000)
            page.wait_for_timeout(1200)
            name = path.strip('/').replace('/', '-').replace('?', '-').replace('=', '-') or 'home'
            page.screenshot(path=os.path.join(OUT, f'{slug}--{name}.png'))
        except Exception as error:  # noqa: BLE001 - report and continue
            row['errors'].append(f'{path}: load failed: {str(error)[:160]}')
        page.close()

    # Search overlay
    page = open_page(context, row)
    try:
        page.goto(url('/'), wait_until='networkidle')
        page.locator('[data-search-open]').first.click(timeout=5000)
        page.wait_for_timeout(800)
        row['checks']['search'] = page.locator('#search-overlay').get_attribute('aria-hidden') == 'false'
    except Exception:  # noqa: BLE001
        row['checks']['search'] = False
    page.close()

    # Mobile menu
    if mobile:
        page = open_page(context, row)
        try:
            page.goto(url('/'), wait_until='networkidle')
            toggle = page.locator('.kt-header__menu-toggle').first
            toggle.click(timeout=5000)
            page.wait_for_timeout(800)
            row['checks']['menu'] = toggle.get_attribute('aria-expanded') == 'true'
        except Exception:  # noqa: BLE001
            row['checks']['menu'] = False
        page.close()

    # Add to cart
    page = open_page(context, row)
    try:
        page.goto(url(PRODUCT), wait_until='networkidle')
        atc = page.locator('.kt-product-form__atc').first
        # Center the button like a shopper scrolling to it, clear of fixed bars.
        atc.evaluate("el => el.scrollIntoView({block: 'center'})")
        page.wait_for_timeout(600)
        atc.click(timeout=8000)
        page.wait_for_timeout(2500)
        count = page.evaluate("fetch('/cart.js').then(r => r.json()).then(c => c.item_count)")
        row['checks']['add_to_cart'] = count > 0
        row['checks']['cart_drawer'] = page.locator('cart-drawer.kt-cart-drawer--open').count() > 0
        page.screenshot(path=os.path.join(OUT, f'{slug}--added-to-cart.png'))
    except Exception as error:  # noqa: BLE001
        row['checks']['add_to_cart'] = False
        row['errors'].append(f'add to cart: {str(error)[:300]}')
    page.close()


results = []
with sync_playwright() as p:
    for engine, label, options, mobile in TARGETS:
        if engine == 'msedge':
            browser = p.chromium.launch(channel='msedge')  # Microsoft Edge stable (Shopify requirement 9)
        else:
            browser = getattr(p, engine).launch()
        if options == 'SAMSUNG':
            options = dict(p.devices['Galaxy S9+'])
            options['user_agent'] = ('Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S921B) AppleWebKit/537.36 '
                                     '(KHTML, like Gecko) SamsungBrowser/27.0 Chrome/125.0.0.0 Mobile Safari/537.36')
        elif isinstance(options, str):
            options = dict(p.devices[options])
        context = browser.new_context(**options)
        login(context)
        row = {'browser': label, 'errors': [], 'checks': {}}
        try:
            check_target(context, row, label.lower().replace(' ', '-'), mobile)
        except Exception as error:  # noqa: BLE001 - keep the other browsers' results
            row['errors'].append(f'browser stopped: {str(error)[:200]}')
        results.append(row)
        browser.close()

with open(os.path.join(OUT, 'results.json'), 'w') as fh:
    json.dump(results, fh, indent=2)

failed = False
print('## Cross-browser check\n')
print('| Browser | JS / asset errors | Search | Mobile menu | Add to cart | Cart drawer |')
print('|---|---:|---|---|---|---|')
for r in results:
    c = r['checks']
    mark = lambda k: '—' if k not in c else ('pass' if c[k] else 'FAIL')
    print(f"| {r['browser']} | {len(r['errors'])} | {mark('search')} | {mark('menu')} | "
          f"{mark('add_to_cart')} | {mark('cart_drawer')} |")
    if r['errors'] or not all(v for k, v in c.items() if k != 'cart_drawer'):
        failed = True
for r in results:
    if r['errors']:
        print(f"\n### {r['browser']}\n")
        for e in sorted(set(r['errors']))[:30]:
            print(f'- `{e}`')
sys.exit(1 if failed else 0)
