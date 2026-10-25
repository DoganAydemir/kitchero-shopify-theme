"""Capture Theme Store listing images from the demo store (audit #83).

Sizes follow shopify.dev "Theme Store listing page":
  home desktop 2000x2496, home mobile 750x1334, key highlights 1600x1200.
Usage: STORE_URL=... PASSWORD=... python3 listing_shots.py <out dir>
"""
import os
import sys
import time

from playwright.sync_api import sync_playwright

STORE = os.environ['STORE_URL'].rstrip('/')
PASSWORD = os.environ['PASSWORD']
OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)

HIDE = """
  #shopify-pc__banner, .shopify-pc__banner__dialog, [id^="shopify-section"][id*="cookie"],
  .kt-cookie-banner, .kt-newsletter-popup, newsletter-popup, .kt-age-verifier,
  #preview-bar-iframe, #PBarNextFrameWrapper { display: none !important; }
"""


def login(context):
    page = context.new_page()
    page.goto(f'{STORE}/password', wait_until='domcontentloaded')
    if page.locator('input[type="password"]').count():
        page.fill('input[type="password"]', PASSWORD)
        page.locator('input[type="password"]').press('Enter')
        page.wait_for_load_state('networkidle')
    page.close()


def settle(page):
    page.add_style_tag(content=HIDE)
    # Walk down the page so lazy images and scroll-triggered animations finish.
    height = page.evaluate('document.body.scrollHeight')
    for y in range(0, height, 600):
        page.evaluate(f'window.scrollTo(0, {y})')
        time.sleep(0.15)
    page.evaluate('window.scrollTo(0, 0)')
    time.sleep(2.5)


def shot(context, path, name, scroll_to=None, before=None):
    page = context.new_page()
    page.goto(f'{STORE}{path}', wait_until='networkidle')
    settle(page)
    if scroll_to:
        page.evaluate("""(sel) => {
            const el = document.querySelector(sel);
            if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY);
        }""", scroll_to)
        time.sleep(2.5)
    if before:
        before(page)
        time.sleep(1.5)
    page.screenshot(path=os.path.join(OUT, name))
    print('saved', name)
    page.close()


def open_hotspot(page):
    btn = page.locator('.kt-shop-the-look__hotspot').first
    if btn.count():
        btn.click()


with sync_playwright() as p:
    browser = p.chromium.launch()
    desktop = browser.new_context(viewport={'width': 1000, 'height': 1248}, device_scale_factor=2)
    login(desktop)
    shot(desktop, '/', 'kitchero-home-desktop-2000x2496.png')

    mobile = browser.new_context(viewport={'width': 375, 'height': 667}, device_scale_factor=2,
                                 is_mobile=True, has_touch=True,
                                 user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) '
                                            'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1')
    login(mobile)
    shot(mobile, '/', 'kitchero-home-mobile-750x1334.png')

    wide = browser.new_context(viewport={'width': 800, 'height': 600}, device_scale_factor=2)
    login(wide)
    shot(wide, '/', 'kitchero-highlight-1-shop-the-look-1600x1200.png',
         scroll_to='.kt-shop-the-look', before=open_hotspot)
    shot(wide, '/', 'kitchero-highlight-2-shop-by-color-1600x1200.png', scroll_to='[data-section-type="shop-color"]')
    shot(wide, '/products/elegant-kitchen-cabinet-system', 'kitchero-highlight-3-showroom-1600x1200.png')
    browser.close()
