"""axe-core accessibility scan of the demo store (final gate, audit #34/#7).

Runs axe (WCAG 2.0-2.2 A and AA rules, including 24px touch targets, plus best-practice and
experimental rules) on the main templates at desktop and mobile widths, then again with an item in
the cart (header count, cart page, cart drawer), and fails on any violation in theme markup. Nodes inside
Shopify's own widgets (preview bar, Shop Pay, privacy banner) are listed
separately.

Usage: STORE_URL=... PASSWORD=... python3 axe_check.py
"""
import os
import sys
import urllib.request

from playwright.sync_api import sync_playwright

# Same engine as the current axe DevTools extension; newer axe versions judge visible text
# (e.g. label-content-name-mismatch) differently from the 4.10 bundled with axe-playwright-python.
AXE_VERSION = '4.14.0'
AXE_JS = urllib.request.urlopen(f'https://cdn.jsdelivr.net/npm/axe-core@{AXE_VERSION}/axe.min.js').read().decode()

STORE = os.environ['STORE_URL'].rstrip('/')
PASSWORD = os.environ['PASSWORD']
PAGES = ['/', '/collections/all', '/collections/kitchen-cabinets', '/products/premium-pull-down-kitchen-faucet',
         '/products/ivory-shaker-island-kitchen', '/products/emerald-marble-built-in-kitchen', '/cart', '/search?q=sink', '/blogs/journal',
         '/pages/contact', '/pages/about-us', '/pages/financing', '/404-check',
         '/blogs/journal/choosing-the-right-kitchen-faucet-for-your-space']
# Second pass with an item in the cart (cart count badge, cart page list, drawer).
CART_PAGES = ['/', '/cart', '/products/premium-pull-down-kitchen-faucet']
PLATFORM = ('shopify-pc__', 'shop-pay', 'shopify-payment', 'preview-bar', 'PBarNextFrame', 'shopify-section-privacy',
            'shopify-accelerated-checkout', 'shopify-buy-it-now', 'shopify-payment-terms',
            # Inside the shadow DOM of Shopify's 3D viewer (model_viewer_tag); not reachable from theme markup.
            'userInput')
OPTIONS = {'resultTypes': ['violations'], 'runOnly': {'type': 'tag', 'values': ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice', 'experimental']}}

theme, platform = {}, {}
with sync_playwright() as p:
    browser = p.chromium.launch()
    for label, viewport in (('desktop', {'width': 1280, 'height': 800}), ('mobile', {'width': 390, 'height': 844})):
        context = browser.new_context(viewport=viewport)
        page = context.new_page()
        page.goto(f'{STORE}/password', wait_until='domcontentloaded')
        if page.locator('input[type="password"]').count():
            page.fill('input[type="password"]', PASSWORD)
            page.locator('input[type="password"]').press('Enter')
            page.wait_for_load_state('networkidle')
        def scan(path, tag):
            page.add_script_tag(content=AXE_JS)
            result = page.evaluate('opts => axe.run(document, opts)', OPTIONS)
            for violation in result['violations']:
                for node in violation['nodes']:
                    target = ' '.join(str(t) for t in node['target'])
                    bucket = platform if any(word in target or word in node['html'] for word in PLATFORM) else theme
                    key = (violation['id'], violation['impact'], target[:120])
                    bucket.setdefault(key, set()).add(f'{label} {path}{tag}')

        for path in PAGES:
            page.goto(f'{STORE}{path}', wait_until='networkidle', timeout=60000)
            page.wait_for_timeout(1500)
            scan(path, '')

        page.evaluate("""async () => {
          const p = await (await fetch('/products/premium-pull-down-kitchen-faucet.js')).json();
          const v = p.variants.find(x => x.available);
          await fetch('/cart/add.js', {method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({id: v.id, quantity: 1})});
        }""")
        for path in CART_PAGES:
            page.goto(f'{STORE}{path}', wait_until='networkidle', timeout=60000)
            page.wait_for_timeout(1500)
            scan(path, ' (cart)')
        page.goto(f'{STORE}/', wait_until='networkidle', timeout=60000)
        page.locator('.kt-header__cart-icon').first.click()
        page.wait_for_timeout(1500)
        scan('/', ' (cart drawer)')
        context.close()
    browser.close()

print(f'## axe-core {AXE_VERSION} scan (WCAG 2.2 A/AA, best-practice, experimental)\n')
print(f'Theme violations: {len(theme)} · Shopify platform: {len(platform)}\n')
for title, bucket in (('Theme', theme), ('Shopify platform', platform)):
    if bucket:
        print(f'### {title}\n')
        print('| Rule | Impact | Element | Pages |')
        print('|---|---|---|---|')
        for (rule, impact, target), pages in sorted(bucket.items()):
            print(f"| {rule} | {impact} | `{target}` | {', '.join(sorted(pages))[:200]} |")
        print()
sys.exit(1 if theme else 0)
