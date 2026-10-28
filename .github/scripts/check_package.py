"""Check a Theme Store submission zip (audit E11 / #82).

Fails when required files are missing or files Shopify rejects are included.
Usage: python3 check_package.py <theme.zip>
"""
import json
import re
import sys
import zipfile

path = sys.argv[1]
names = zipfile.ZipFile(path).namelist()
files = [n for n in names if not n.endswith('/')]
top = {n.split('/', 1)[0] for n in files}
problems = []

required = ['layout/theme.liquid', 'config/settings_schema.json', 'config/settings_data.json',
            'templates/index.json', 'templates/product.json', 'templates/collection.json',
            'templates/page.json', 'templates/cart.json', 'templates/search.json', 'templates/404.json',
            'sections/header-group.json', 'sections/footer-group.json', 'locales/en.default.json',
            'release-notes.md']
for item in required:
    if item not in files:
        problems.append(f'missing {item}')

# listings/<preset>/ holds per-preset templates and settings (Theme Store presets).
allowed_top = {'assets', 'blocks', 'config', 'layout', 'listings', 'locales', 'sections', 'snippets', 'templates',
               'release-notes.md'}
for item in sorted(top - allowed_top):
    problems.append(f'unexpected top-level entry {item}')
for item in files:
    if item.endswith('.md') and item != 'release-notes.md':
        problems.append(f'markdown file {item}')
    if re.search(r'(^|/)\.|\.zip$|node_modules|\.map$', item):
        problems.append(f'dev artifact {item}')

zf = zipfile.ZipFile(path)
for item in files:
    if item.endswith('.json'):
        text = zf.read(item).decode('utf-8')
        text = re.sub(r'^\s*/\*.*?\*/', '', text, flags=re.S)
        try:
            json.loads(text)
        except ValueError as error:
            problems.append(f'invalid JSON {item}: {error}')
    if re.match(r'(listings/[^/]+/)?templates/', item) and item.endswith('.json'):
        # Bare routes like shopify://collections are portable; handles and files are not.
        ref = re.search(r'shopify://(shop_images|files)/|shopify://(products|collections|pages|blogs|articles)/[^"]+',
                        zf.read(item).decode('utf-8'))
        if ref:
            problems.append(f'store-specific reference {ref.group(0)} in {item}')

schema = json.loads(zf.read('config/settings_schema.json'))
info = next((s for s in schema if s.get('name') == 'theme_info'), {})
counts = {d: sum(1 for f in files if f.startswith(d + '/')) for d in sorted(allowed_top - {'release-notes.md'})}
print(f'## Theme package: {path}\n')
print(f"Theme: {info.get('theme_name')} {info.get('theme_version')} · {len(files)} files · "
      + ', '.join(f'{k} {v}' for k, v in counts.items()) + '\n')
if problems:
    print('### Problems\n')
    for p in problems:
        print(f'- {p}')
    sys.exit(1)
print('All checks passed: required files present, no docs/dev files, JSON valid, no store-specific references.')
