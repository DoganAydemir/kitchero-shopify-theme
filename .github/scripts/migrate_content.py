"""Migrate merchant content (templates, section groups) pulled from a live
theme to the current section schemas. Safe to run repeatedly."""
import glob
import json
import re
import sys

root = sys.argv[1] if len(sys.argv) > 1 else '.'


def load(path):
    text = open(path, encoding='utf-8').read()
    match = re.match(r'\s*/\*.*?\*/\s*', text, re.S)
    head = match.group(0) if match else ''
    return head, json.loads(text[len(head):])


def migrate_settings(section_type, settings):
    changed = False
    for key in ('bg_color', 'bg_color_custom'):
        if key in settings:
            settings.pop(key)
            changed = True
    if section_type == 'announcement-banner' and 'color_theme' in settings:
        theme = settings.pop('color_theme')
        settings['color_scheme'] = {'light': 'scheme-3', 'accent': 'scheme-5'}.get(theme, 'scheme-4')
        changed = True
    if section_type == 'financing-panel' and 'invert_colors' in settings:
        if settings.pop('invert_colors'):
            settings['layout'] = 'background'
            settings['color_scheme'] = 'scheme-4'
        changed = True
    if section_type == 'banner-split' and 'invert_colors' in settings:
        settings['panel_color_scheme'] = 'scheme-1' if settings.pop('invert_colors') else 'scheme-4'
        changed = True
    return changed


def migrate_block(section_type, block):
    settings = block.get('settings', {})
    changed = False
    if section_type == 'financing-calculator' and 'accent_color' in settings:
        settings['highlight_apr'] = settings.pop('accent_color') == 'emerald'
        changed = True
    return changed


files = glob.glob(f'{root}/templates/*.json') + glob.glob(f'{root}/sections/*.json')
for path in sorted(files):
    head, data = load(path)
    changed = False
    for section in data.get('sections', {}).values():
        section_type = section.get('type', '')
        changed |= migrate_settings(section_type, section.setdefault('settings', {}))
        for block in section.get('blocks', {}).values():
            changed |= migrate_block(section_type, block)
    if changed:
        with open(path, 'w', encoding='utf-8') as handle:
            handle.write(head + json.dumps(data, indent=2, ensure_ascii=False) + '\n')
        print('migrated', path)
