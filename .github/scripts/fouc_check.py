"""Unstyled-first-paint check (Safari "flash of unstyled content").

Opens pages in Playwright WebKit (Safari's engine), desktop and iPhone,
with every theme stylesheet delayed by DELAY ms, and screenshots the page
EARLY ms after navigation commits and again after load. If the early
screenshot already shows content that differs from the final page, the
browser painted before the CSS arrived (the flash). A blank early frame
means it waited for the CSS, as intended.

Usage: STORE_URL=... PASSWORD=... THEMES="live 1234" python3 fouc_check.py <out dir>
"""
import asyncio
import os
import sys

from PIL import Image, ImageChops
from playwright.async_api import async_playwright

STORE = os.environ['STORE_URL'].rstrip('/')
PASSWORD = os.environ['PASSWORD']
THEMES = os.environ.get('THEMES', 'live').split()
OUT = sys.argv[1]
DELAY = int(os.environ.get('DELAY', '1500'))
EARLY = int(os.environ.get('EARLY', '900'))
os.makedirs(OUT, exist_ok=True)

PAGES = ['/', '/collections/kitchen-cabinets', '/products/premium-pull-down-kitchen-faucet',
         '/products/navy-island-dining-kitchen', '/pages/sliders', '/search?q=sink',
         '/blogs/journal', '/pages/contact', '/cart']
TARGETS = [('Safari desktop', {'viewport': {'width': 1280, 'height': 800}}),
           ('Safari iPhone', 'iPhone 13')]


def stats(early_path, final_path):
    early = Image.open(early_path).convert('RGB')
    final = Image.open(final_path).convert('RGB').resize(early.size)
    # Share of pixels that differ from the early frame's top-left colour (blank = ~0).
    bg = early.getpixel((2, 2))
    solid = Image.new('RGB', early.size, bg)
    content = ImageChops.difference(early, solid).convert('L').point(lambda v: 255 if v > 24 else 0)
    diff = ImageChops.difference(early, final).convert('L').point(lambda v: 255 if v > 24 else 0)
    total = early.size[0] * early.size[1]
    return (sum(1 for v in content.getdata() if v) / total * 100,
            sum(1 for v in diff.getdata() if v) / total * 100)


async def delay_css(route):
    if '.css' in route.request.url and '/assets/' in route.request.url:
        await asyncio.sleep(DELAY / 1000)
    try:
        await route.continue_()
    except Exception:  # noqa: BLE001 - page already gone
        pass


async def run():
    rows = []
    async with async_playwright() as p:
        browser = await p.webkit.launch()
        for label, opts in TARGETS:
            ctx_opts = p.devices[opts] if isinstance(opts, str) else opts
            for theme in THEMES:
                context = await browser.new_context(**ctx_opts)
                page = await context.new_page()
                await page.goto(f'{STORE}/password', wait_until='domcontentloaded')
                if await page.locator('input[type="password"]').count():
                    await page.fill('input[type="password"]', PASSWORD)
                    await page.locator('input[type="password"]').press('Enter')
                    await page.wait_for_load_state('networkidle')
                await page.close()
                for path in PAGES:
                    sep = '&' if '?' in path else '?'
                    url = f'{STORE}{path}' + ('' if theme == 'live' else f'{sep}preview_theme_id={theme}')
                    page = await context.new_page()
                    await page.route('**/*', delay_css)
                    slug = f"{label.split()[1].lower()}-{theme}-{(path.strip('/').replace('/', '-').replace('?', '-').replace('=', '-') or 'home')}"
                    early, final = os.path.join(OUT, f'{slug}-early.png'), os.path.join(OUT, f'{slug}-final.png')
                    try:
                        await page.goto(url, wait_until='commit', timeout=60000)
                        await page.wait_for_timeout(EARLY)
                        await page.screenshot(path=early, timeout=20000)
                        await page.wait_for_load_state('load', timeout=60000)
                        await page.wait_for_timeout(1500)
                        await page.screenshot(path=final, timeout=20000)
                        content, diff = stats(early, final)
                        flash = 'FLASH' if content > 3 and diff > 8 else 'ok'
                        rows.append(f'| {label} | {theme} | {path} | {content:.1f}% | {diff:.1f}% | {flash} |')
                    except Exception as error:  # noqa: BLE001
                        rows.append(f'| {label} | {theme} | {path} | - | - | error: {str(error)[:80]} |')
                    await page.close()
                await context.close()
        await browser.close()
    print(f'CSS delayed {DELAY} ms, early frame at {EARLY} ms after commit.\n')
    print('| Target | Theme | Page | Early frame content | Early vs final diff | Result |')
    print('|---|---|---|---|---|---|')
    print('\n'.join(rows))


asyncio.run(run())
