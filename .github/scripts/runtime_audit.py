"""Runtime review checks on the demo store (RUNTIME_REJECT_CHECKLIST.md).

Opens every main template at desktop and phone widths and reports what a
reviewer sees in the first minute: console errors and warnings, failed
requests, horizontal scroll, broken images, visible translation keys or
Liquid errors, heading problems, unlabeled inputs, `href="#"` links, small
touch targets and the skip link. Optionally checks a preview theme.

Usage: STORE_URL=... PASSWORD=... [PREVIEW_THEME=<id>] python3 runtime_audit.py
"""
import json
import os
import sys
from collections import defaultdict

from playwright.sync_api import sync_playwright

STORE = os.environ['STORE_URL'].rstrip('/')
PASSWORD = os.environ['PASSWORD']
PREVIEW = os.environ.get('PREVIEW_THEME', '').strip()

PAGES = ['/', '/collections', '/collections/all', '/collections/kitchen-cabinets',
         '/products/premium-pull-down-kitchen-faucet', '/products/elegant-kitchen-cabinet-system',
         '/cart', '/search', '/search?q=sink', '/blogs/journal', 'ARTICLE',
         '/pages/about-us', '/pages/contact', '/pages/content-faq', '/pages/financing',
         '/pages/deals', '/pages/galleries', '/pages/heroes-banners', '/pages/image-with-text',
         '/pages/sliders', '/pages/testimonials', '/pages/newsletter',
         '/account/login', '/account/register', '/404-check']
VIEWPORTS = [('desktop', 1280, 800), ('phone', 375, 740), ('small', 320, 640), ('tablet', 768, 1024)]
# Shopify's own scripts and the browser are not theme code.
IGNORE = ('monorail', 'shopifycloud', 'web-pixels', 'trekkie', 'shop.app', 'shopify-perf-kit',
          'captcha', 'Content Security Policy', 'Clear-Site-Data', 'invalid domain',
          'preview_bar', 'PBarNext', 'cdn/shopifycloud', 'storefront/', 'favicon.ico')

PROBE = r"""
() => {
  const out = {};
  const visible = el => {
    if (el.closest('[hidden], [aria-hidden="true"], [inert]')) return false;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const describe = el => {
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    const cls = [...el.classList].slice(0, 2).join('.');
    if (cls) s += '.' + cls;
    return s;
  };
  const W = document.documentElement.clientWidth;
  out.hscroll = document.documentElement.scrollWidth > W + 1;
  out.overflowers = [];
  if (out.hscroll) {
    for (const el of document.querySelectorAll('body *')) {
      if (!visible(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.right > W + 1 && r.width < W * 3) {
        let clipped = false;
        for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
          const o = getComputedStyle(p);
          if (['hidden', 'clip', 'auto', 'scroll'].includes(o.overflowX)) { clipped = true; break; }
        }
        if (!clipped) out.overflowers.push(describe(el) + ' right=' + Math.round(r.right));
      }
      if (out.overflowers.length > 4) break;
    }
  }
  const heads = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6,[role="heading"]')].filter(visible);
  const level = h => h.getAttribute('role') === 'heading' ? +(h.getAttribute('aria-level') || 2) : +h.tagName[1];
  out.h1 = [...document.querySelectorAll('h1,[role="heading"][aria-level="1"]')]
    .filter(h => !h.closest('[hidden], [aria-hidden="true"]') && getComputedStyle(h).display !== 'none').length;
  out.skips = [];
  let prev = 0;
  for (const h of heads) {
    const l = level(h);
    if (prev && l > prev + 1 && !h.closest('dialog, [role="dialog"]')) out.skips.push(`h${prev}->h${l} ${describe(h)}`);
    prev = l;
  }
  const text = document.body.innerText;
  out.leaks = (text.match(/translation missing[^\n]{0,60}|Liquid (syntax )?error[^\n]{0,60}|\bt:[a-z_-]+\.[a-z_.-]+|\bkt\.[a-z_]+\.[a-z_.]+|\bkt-[a-z]+__[a-z-]+/gi) || []).slice(0, 5);
  out.imgs_no_alt = [...document.querySelectorAll('img:not([alt])')].map(describe).slice(0, 5);
  out.imgs_broken = [...document.querySelectorAll('img')].filter(i => i.complete && i.currentSrc && i.naturalWidth === 0 && visible(i))
    .map(i => i.currentSrc.slice(0, 120)).slice(0, 5);
  out.hash_links = [...document.querySelectorAll('a[href="#"], a[href=""]')].filter(visible).map(describe).slice(0, 5);
  out.http = [...document.querySelectorAll('[src^="http:"], link[href^="http:"]')].map(describe).slice(0, 5);
  out.unlabeled = [...document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea')]
    .filter(visible)
    .filter(el => !(el.labels && el.labels.length) && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby') && !el.title)
    .map(describe).slice(0, 5);
  const small = [];
  for (const el of document.querySelectorAll('a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [tabindex="0"]')) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width >= 24 && r.height >= 24) continue;
    // WCAG 2.5.8 inline exception: links inside a sentence.
    if (el.tagName === 'A' && getComputedStyle(el).display === 'inline' && el.closest('p, li, span, label, small, .rte')) continue;
    // Spacing exception: a 24px circle around the center touches no other target.
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let crowded = false;
    for (const o of document.querySelectorAll('a[href], button, input:not([type="hidden"]), select, summary, [role="button"]')) {
      if (o === el || o.contains(el) || el.contains(o) || !visible(o)) continue;
      const q = o.getBoundingClientRect();
      const dx = Math.max(q.left - cx, 0, cx - q.right), dy = Math.max(q.top - cy, 0, cy - q.bottom);
      if (Math.hypot(dx, dy) < 12) { crowded = true; break; }
    }
    if (crowded) small.push(`${describe(el)} ${Math.round(r.width)}x${Math.round(r.height)}`);
  }
  out.small_targets = small.slice(0, 8);
  const focusables = [...document.querySelectorAll('a[href], button, input, select, textarea, [tabindex]')]
    .filter(el => el.tabIndex >= 0 && !el.disabled && !el.closest('[inert]'));
  out.skip_first = focusables.length ? /skip/i.test(focusables[0].textContent) : false;
  out.favicon = !!document.querySelector('link[rel~="icon"]');
  out.lang = document.documentElement.lang || '';
  return out;
}
"""


def login(context):
    page = context.new_page()
    page.goto(f'{STORE}/password', wait_until='domcontentloaded')
    if page.locator('input[type="password"]').count():
        page.fill('input[type="password"]', PASSWORD)
        page.locator('input[type="password"]').press('Enter')
        page.wait_for_load_state('networkidle')
    page.close()


def theme_text(text):
    return not any(word in text for word in IGNORE)


def url_for(path):
    if not PREVIEW:
        return f'{STORE}{path}'
    joiner = '&' if '?' in path else '?'
    return f'{STORE}{path}{joiner}preview_theme_id={PREVIEW}'


findings = defaultdict(list)


def add(kind, where, detail):
    findings[kind].append(f'{where}: {detail}')


with sync_playwright() as p:
    browser = p.chromium.launch()
    article = None
    for label, width, height in VIEWPORTS:
        context = browser.new_context(viewport={'width': width, 'height': height}, reduced_motion='reduce',
                                      is_mobile=width < 750, has_touch=width < 750)
        login(context)
        pages = PAGES if label in ('desktop', 'phone') else [x for x in PAGES if x != 'ARTICLE'][:12]
        for path in pages:
            if path == 'ARTICLE':
                if not article:
                    continue
                path = article
            where = f'{label} {path}'
            page = context.new_page()
            page.on('pageerror', lambda e, w=where: add('JS error (uncaught)', w, str(e)[:200]))
            page.on('console', lambda m, w=where: m.type in ('error', 'warning') and theme_text(m.text)
                    and add(f'Console {m.type}', w, m.text[:200]))
            page.on('response', lambda r, w=where: r.status >= 400 and theme_text(r.url) and r.url.split('?')[0] != url_for(w.split(' ', 1)[1]).split('?')[0]
                    and add('Failed request', w, f'{r.status} {r.url[:150]}'))
            try:
                page.goto(url_for(path), wait_until='networkidle', timeout=90000)
                height_px = page.evaluate('document.body.scrollHeight')
                for y in range(0, height_px, 600):
                    page.evaluate(f'window.scrollTo(0, {y})')
                    page.wait_for_timeout(80)
                page.evaluate('window.scrollTo(0, 0)')
                page.wait_for_timeout(800)
                if label == 'desktop' and path == '/blogs/journal':
                    href = page.evaluate("(document.querySelector('main a[href*=\"/blogs/journal/\"]') || {}).getAttribute ? document.querySelector('main a[href*=\"/blogs/journal/\"]').getAttribute('href') : ''")
                    if href:
                        article = href.split('?')[0]
                r = page.evaluate(PROBE)
            except Exception as error:  # noqa: BLE001 - report and continue
                add('Page load failed', where, str(error)[:200])
                page.close()
                continue
            if r['hscroll']:
                add('Horizontal scroll', where, ', '.join(r['overflowers']) or 'document wider than viewport')
            if label in ('desktop', 'phone'):
                if r['h1'] != 1 and path not in ('/404-check',):
                    add('H1 count', where, r['h1'])
                for s in r['skips'][:3]:
                    add('Heading skip', where, s)
                for k, name in (('leaks', 'Visible key / Liquid error'), ('imgs_no_alt', 'Image without alt'),
                                ('imgs_broken', 'Broken image'), ('hash_links', 'href="#" link'),
                                ('http', 'http:// resource'), ('unlabeled', 'Unlabeled input')):
                    for item in r[k]:
                        add(name, where, item)
                if not r['skip_first']:
                    add('Skip link not first focusable', where, '')
                if not r['favicon']:
                    add('No favicon link', where, '')
                if not r['lang']:
                    add('Missing html lang', where, '')
            if label == 'phone':
                for item in r['small_targets']:
                    add('Touch target < 24px (crowded)', where, item)
            page.close()
        context.close()
    browser.close()

target = f'preview theme #{PREVIEW}' if PREVIEW else 'live theme'
print(f'## Runtime review checks ({target})\n')
total = sum(len(v) for v in findings.values())
print(f'Pages: {len(PAGES)} templates at 1280, 375 px; first 12 also at 320 and 768 px. Findings: **{total}**\n')
if not findings:
    print('No findings.')
else:
    print('| Check | Count |\n|---|---|')
    for k, v in sorted(findings.items()):
        print(f'| {k} | {len(v)} |')
    for k, v in sorted(findings.items()):
        print(f'\n### {k}\n')
        for line in sorted(set(v))[:40]:
            print(f'- {line}')
with open('runtime-audit.json', 'w') as fh:
    json.dump(findings, fh, indent=1)
sys.exit(0)
