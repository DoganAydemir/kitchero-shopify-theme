"""Keyboard and touch-target checks on real desktop and mobile viewports.

Mobile (390 x 844): mobile menu (Enter and Space), search overlay and cart
drawer must open with the keyboard, keep focus inside while open, close
with Escape and return focus to the control that opened them. Touch
targets below 24 x 24 px are listed (inline text links excluded).
Desktop (1440 x 900): mega menu triggers open with Space, Tab moves into
the panel, Escape closes it and returns focus.

Usage: STORE_URL=... PASSWORD=... python3 keyboard_check.py
"""
import json
import os

from playwright.sync_api import sync_playwright

STORE = os.environ['STORE_URL'].rstrip('/')
PASSWORD = os.environ['PASSWORD']
TOUCH_PAGES = ['/', '/products/premium-pull-down-kitchen-faucet', '/products/elegant-kitchen-cabinet-system',
               '/collections/kitchen-cabinets', '/cart', '/blogs/journal/smart-storage-ideas-for-a-cleaner-kitchen',
               '/pages/contact']

INSIDE = """([trigger, container]) => {
  const t = document.querySelector(trigger);
  const box = document.querySelector(container);
  return { inside: !!(box && box.contains(document.activeElement)), onTrigger: document.activeElement === t };
}"""

TOUCH = """() => {
  const res = [];
  for (const el of document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, summary, [role="button"]')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    if (el.closest('[hidden], [aria-hidden="true"], [inert], .visually-hidden')) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2 || r.right < 0 || r.left > innerWidth) continue;
    if (el.tagName === 'A' && cs.display === 'inline' && el.closest('p, li, .rte, figcaption, label, small')) continue;
    if (r.width < 24 || r.height < 24) {
      res.push(el.tagName + '.' + (el.className.toString().split(' ')[0] || '') + ' "' +
        (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 30) + '" ' +
        Math.round(r.width) + 'x' + Math.round(r.height));
    }
  }
  return [...new Set(res)];
}"""


def login(page):
    page.goto(f'{STORE}/password', wait_until='domcontentloaded')
    if page.locator('input[type="password"]').count():
        page.fill('input[type="password"]', PASSWORD)
        page.locator('input[type="password"]').press('Enter')
        page.wait_for_load_state('networkidle')


def dialog(page, url, trigger, container, key='Enter', before=None):
    page.goto(f'{STORE}{url}', wait_until='networkidle', timeout=60000)
    page.wait_for_timeout(1200)
    if before:
        before(page)
    page.keyboard.press('Tab')
    page.locator(trigger).first.focus()
    page.keyboard.press(key)
    page.wait_for_timeout(900)
    opened = page.evaluate(INSIDE, [trigger, container])
    leaks = 0
    for _ in range(30):
        page.keyboard.press('Tab')
        state = page.evaluate(INSIDE, [trigger, container])
        if not state['inside'] and not state['onTrigger']:
            leaks += 1
    page.keyboard.press('Escape')
    page.wait_for_timeout(900)
    closed = page.evaluate(INSIDE, [trigger, container])
    return {'focus_moved_inside': opened['inside'], 'tab_left_dialog': leaks,
            'focus_returned_after_escape': closed['onTrigger']}


report = {}
with sync_playwright() as p:
    browser = p.chromium.launch()
    mobile = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
    page = mobile.new_page()
    login(page)
    report['mobile_viewport'] = page.evaluate('() => innerWidth')
    report['mobile_menu_enter'] = dialog(page, '/', '.kt-header__menu-toggle', '.kt-header__mobile-panel')
    report['mobile_menu_space'] = dialog(page, '/', '.kt-header__menu-toggle', '.kt-header__mobile-panel', key='Space')
    report['mobile_search'] = dialog(page, '/', '.kt-header__icon[data-search-open]', '#search-overlay')
    report['touch_targets_mobile'] = {}
    for path in TOUCH_PAGES:
        page.goto(f'{STORE}{path}', wait_until='networkidle', timeout=60000)
        page.wait_for_timeout(1200)
        report['touch_targets_mobile'][path] = page.evaluate(TOUCH)
    mobile.close()

    desktop = browser.new_context(viewport={'width': 1440, 'height': 900})
    page = desktop.new_page()
    login(page)
    report['mega_menu'] = {}
    for label in ('Cabinets', 'Essentials', 'Theme Features', 'Company'):
        page.goto(f'{STORE}/', wait_until='networkidle', timeout=60000)
        page.wait_for_timeout(1000)
        page.mouse.move(5, 880)
        trigger = page.locator('.kt-header__menu-link[aria-haspopup]', has_text=label).first
        trigger.focus()
        page.keyboard.press('Space')
        page.wait_for_timeout(600)
        expanded = trigger.get_attribute('aria-expanded')
        page.keyboard.press('Tab')
        panel_id = trigger.get_attribute('aria-controls')
        inside = page.evaluate('(id) => { const p = document.getElementById(id); return !!(p && p.contains(document.activeElement)); }', panel_id)
        page.keyboard.press('Escape')
        page.wait_for_timeout(500)
        report['mega_menu'][label] = {'opened_with_space': expanded == 'true', 'tab_moves_into_panel': inside,
                                      'escape_returns_focus': page.evaluate('(id) => document.activeElement && document.activeElement.getAttribute("aria-controls") === id', panel_id),
                                      'page_scrolled': page.evaluate('() => scrollY')}
    desktop.close()
    browser.close()

print('```json')
print(json.dumps(report, indent=1))
print('```')
