"""Compare the live demo theme with a preview theme, page by page.

Takes full-page screenshots of the same URLs on the live theme and on
`?preview_theme_id=<id>` at desktop and mobile widths (reduced motion, so
scroll animations don't run), then reports the share of pixels that differ.
Side-by-side images go to <out dir>.

Usage: STORE_URL=... PASSWORD=... PREVIEW_THEME=<id> python3 visual_diff.py <out dir>
"""
import os
import sys

from PIL import Image, ImageChops
from playwright.sync_api import sync_playwright

STORE = os.environ['STORE_URL'].rstrip('/')
PASSWORD = os.environ['PASSWORD']
PREVIEW = os.environ['PREVIEW_THEME']
# Optional: compare against another unpublished theme instead of the live one.
BASE = os.environ.get('BASE_THEME', '').strip()
OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)

PAGES = ['/', '/collections/kitchen-cabinets', '/collections/all', '/products/premium-pull-down-kitchen-faucet',
         '/products/ivory-shaker-island-kitchen', '/cart', '/search?q=sink', '/blogs/journal',
         '/pages/contact', '/pages/about-us', '/pages/financing', '/pages/content-faq', '/404-check']
HIDE = '#preview-bar-iframe, #PBarNextFrameWrapper, .kt-cookie-banner, newsletter-popup, .kt-newsletter-popup ' \
       '{ display: none !important; } *, *::before, *::after { animation-play-state: paused !important; ' \
       'transition: none !important; caret-color: transparent !important; }'


def login(context):
    page = context.new_page()
    page.goto(f'{STORE}/password', wait_until='domcontentloaded')
    if page.locator('input[type="password"]').count():
        page.fill('input[type="password"]', PASSWORD)
        page.locator('input[type="password"]').press('Enter')
        page.wait_for_load_state('networkidle')
    page.close()


def shoot(context, url, path):
    page = context.new_page()
    page.goto(url, wait_until='networkidle', timeout=90000)
    page.add_style_tag(content=HIDE)
    height = page.evaluate('document.body.scrollHeight')
    for y in range(0, height, 700):
        page.evaluate(f'window.scrollTo(0, {y})')
        page.wait_for_timeout(120)
    page.evaluate('window.scrollTo(0, 0)')
    page.wait_for_timeout(1500)
    page.screenshot(path=path, full_page=True)
    page.close()


def compare(a_path, b_path, out_path):
    a = Image.open(a_path).convert('RGB')
    b = Image.open(b_path).convert('RGB')
    width = max(a.width, b.width)
    height = max(a.height, b.height)
    canvas_a = Image.new('RGB', (width, height), 'white')
    canvas_b = Image.new('RGB', (width, height), 'white')
    canvas_a.paste(a, (0, 0))
    canvas_b.paste(b, (0, 0))
    diff = ImageChops.difference(canvas_a, canvas_b).convert('L').point(lambda v: 255 if v > 24 else 0)
    changed = diff.histogram()[255] / (width * height) * 100
    side = Image.new('RGB', (width * 3, height), 'white')
    side.paste(canvas_a, (0, 0))
    side.paste(canvas_b, (width, 0))
    side.paste(Image.merge('RGB', (diff, Image.new('L', diff.size, 0), Image.new('L', diff.size, 0))), (width * 2, 0))
    side.thumbnail((2400, 6000))
    side.save(out_path)
    return changed, a.height, b.height


rows = []
with sync_playwright() as p:
    browser = p.chromium.launch()
    for label, viewport in (('desktop', {'width': 1280, 'height': 900}), ('mobile', {'width': 390, 'height': 844})):
        # Separate contexts: visiting ?preview_theme_id sets a preview cookie,
        # which would otherwise make every later "live" shot show the preview.
        context = browser.new_context(viewport=viewport, reduced_motion='reduce')
        preview_context = browser.new_context(viewport=viewport, reduced_motion='reduce')
        login(context)
        login(preview_context)
        for path in PAGES:
            name = f"{label}--{path.strip('/').replace('/', '-').replace('?', '-').replace('=', '-') or 'home'}"
            joiner = '&' if '?' in path else '?'
            live = os.path.join(OUT, f'{name}--live.png')
            prev = os.path.join(OUT, f'{name}--preview.png')
            try:
                base_url = f'{STORE}{path}{joiner}preview_theme_id={BASE}' if BASE else f'{STORE}{path}'
                shoot(context, base_url, live)
                shoot(preview_context, f'{STORE}{path}{joiner}preview_theme_id={PREVIEW}', prev)
                changed, h_live, h_prev = compare(live, prev, os.path.join(OUT, f'{name}--compare.png'))
                rows.append((label, path, changed, h_live, h_prev))
            except Exception as error:  # noqa: BLE001
                rows.append((label, path, -1, 0, 0))
                print(f'{name}: {error}', file=sys.stderr)
            for f in (live, prev):
                if os.path.exists(f):
                    os.remove(f)
        context.close()
        preview_context.close()
    browser.close()

print('## Visual diff: live vs preview\n')
print(f'Preview theme #{PREVIEW} against {"theme #" + BASE if BASE else "the live theme"}. Pixels that differ (full page, reduced motion).\n')
print('| Viewport | Page | Changed pixels | Height live / preview |')
print('|---|---|---:|---|')
for label, path, changed, h_live, h_prev in rows:
    value = 'error' if changed < 0 else f'{changed:.2f}%'
    print(f'| {label} | {path} | {value} | {h_live} / {h_prev} |')
