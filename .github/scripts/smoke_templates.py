"""Build smoke-test templates that place every section of the theme on a page,
using each section's first preset (what a merchant gets from "Add section").

Writes:
  templates/page.kt-smoke.json          general sections + page-only sections
  templates/product.kt-smoke.json       main-product + product-only sections
  templates/product.kt-smoke-showroom.json
  templates/collection.kt-smoke-<n>.json one per collection main section
  smoke-urls.txt                        paths to render (relative to the store)

Usage: python3 smoke_templates.py <theme root> <page handle> <product handle> <collection handle>
"""
import glob
import json
import re
import sys

root, page_handle, product_handle, collection_handle = sys.argv[1:5]


def schema(path):
    text = open(path, encoding='utf-8').read()
    m = re.search(r'\{%-?\s*schema\s*-?%\}(.*?)\{%-?\s*endschema', text, re.S)
    return json.loads(m.group(1)) if m else None


def to_blocks(preset_blocks, prefix):
    blocks, order = {}, []
    for i, b in enumerate(preset_blocks or []):
        bid = f'{prefix}_{i}'
        entry = {'type': b['type'], 'settings': b.get('settings', {})}
        if b.get('blocks'):
            entry['blocks'], entry['block_order'] = to_blocks(b['blocks'], bid)
        blocks[bid] = entry
        order.append(bid)
    return blocks, order


def section_entry(name, sch):
    preset = (sch.get('presets') or [{}])[0]
    entry = {'type': name, 'settings': preset.get('settings', {})}
    blocks, order = to_blocks(preset.get('blocks'), 'b')
    if blocks:
        entry['blocks'], entry['block_order'] = blocks, order
    return entry


general, page_only, product_only, collection_mains = [], [], [], []
for path in sorted(glob.glob(f'{root}/sections/*.liquid')):
    name = path.rsplit('/', 1)[-1][:-7]
    sch = schema(path)
    if sch is None:
        continue
    enabled = sch.get('enabled_on', {})
    groups, templates = enabled.get('groups'), enabled.get('templates')
    if groups:
        continue  # header/footer/overlay group sections render on every page already
    if name in ('cart-drawer', 'header-cart-icon', 'predictive-search'):
        continue  # rendered via the Section Rendering API, not as page sections
    if templates is None:
        general.append((name, sch))
    elif templates == ['product']:
        product_only.append((name, sch))
    elif templates == ['collection']:
        collection_mains.append((name, sch))
    elif 'page' in templates:
        page_only.append((name, sch))


def write(rel, sections):
    data = {'sections': {}, 'order': []}
    for i, (name, sch) in enumerate(sections):
        sid = f's{i:02d}_{name.replace("-", "_")}'[:60]
        data['sections'][sid] = section_entry(name, sch)
        data['order'].append(sid)
    with open(f'{root}/templates/{rel}', 'w', encoding='utf-8') as handle:
        json.dump(data, handle, indent=2)
    print(rel, len(sections), 'sections')


urls = []
write('page.kt-smoke.json', page_only + general)
urls.append(f'/pages/{page_handle}?view=kt-smoke')
main_product = [s for s in product_only if s[0] == 'main-product']
showroom = [s for s in product_only if s[0] == 'main-product-showroom']
others = [s for s in product_only if s[0] not in ('main-product', 'main-product-showroom')]
write('product.kt-smoke.json', main_product + others)
urls.append(f'/products/{product_handle}?view=kt-smoke')
write('product.kt-smoke-showroom.json', showroom + others)
urls.append(f'/products/{product_handle}?view=kt-smoke-showroom')
for i, item in enumerate(collection_mains):
    write(f'collection.kt-smoke-{i}.json', [item])
    urls.append(f'/collections/{collection_handle}?view=kt-smoke-{i}')
open(f'{root}/smoke-urls.txt', 'w').write('\n'.join(urls) + '\n')
