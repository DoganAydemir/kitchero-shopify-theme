"""Demo store product data (audit #44).

Every product on the demo store carried the same "Specifications" and
"Delivery" metafields (a dark walnut cabinet set), so faucets, knobs and
light cabinet sets contradicted their own photos and descriptions. This
script writes product-specific values taken from each product's own
description and options, and fixes the door sample product.

Usage: SHOP=... TOKEN=... python3 demo_products.py [--apply]
Without --apply it only prints what would change.
"""
import json
import os
import sys
import urllib.request

SHOP = os.environ['SHOP']
TOKEN = os.environ['TOKEN']
APPLY = '--apply' in sys.argv
API = f'https://{SHOP}/admin/api/2025-01/graphql.json'

HARDWARE = ('Hardware finish', 'Black, beige, or bronze')
UNITS = ('Unit options', 'Base 24", 30", 36" · Wall 30", 36" · Tall 84"')
SIZING = ('Sizing', 'Planned to your room measurements')

CABINET_DELIVERY = ('Delivery depends on the project location, cabinet sizes, and final order details. '
                    'Shipping options and rates are shown at checkout.')
PARCEL_DELIVERY = 'Ships in parcel packaging. Shipping options and rates are shown at checkout.'

SPECS = {
    'custom-kitchen-cabinet-set': [('Cabinet color', 'Navy'), ('Island', 'Marble-clad, with seating'),
        ('Features', 'Lit display niches, tall pantry units, round dining area'), HARDWARE, UNITS, SIZING],
    'luxury-kitchen-cabinet-design': [('Cabinet color', 'Plum'), ('Island', 'Marble, with an attached dining table for six'),
        ('Features', 'Glass-front uppers, brass pendants'), HARDWARE, UNITS, SIZING],
    'contemporary-kitchen-cabinet-system': [('Cabinet color', 'Espresso'), ('Door style', 'Slab'),
        ('Island', 'Long island with a breakfast bar'), ('Features', 'Lit open shelving, wood wall paneling'),
        HARDWARE, UNITS, SIZING],
    'designer-kitchen-cabinet-collection': [('Cabinet color', 'Charcoal'), ('Island', 'Waterfall marble, seats four'),
        ('Features', 'Glass display cabinets, globe pendants'), HARDWARE, UNITS, SIZING],
    'built-in-kitchen-cabinet-set': [('Cabinet finish', 'Dark walnut'), ('Island', 'Integrated lighting'),
        ('Features', 'Vented hood, tall pantry units, deep drawers'), HARDWARE, UNITS, SIZING],
    'signature-built-in-kitchen-set': [('Cabinet color', 'Emerald'), ('Backsplash', 'Marble'),
        ('Features', 'Under-cabinet lighting, wood-wrapped hood, tall units beside the range'), HARDWARE, SIZING],
    'elegant-custom-kitchen-cabinets': [('Cabinet color', 'Forest green'), ('Island', 'Walnut'),
        ('Features', 'Black canopy hood, glass-front uppers, open shelving'), HARDWARE, SIZING],
    'contemporary-cabinet-kitchen-set': [('Cabinet color', 'Sage green'), ('Shelving', 'Oak, with under-shelf lighting'),
        ('Island', 'Stone top, seats three'), HARDWARE, SIZING],
    'designer-built-in-cabinet-set': [('Cabinet color', 'Slate gray'), ('Layout', 'Galley and U-shaped kitchens'),
        ('Features', 'Farmhouse sink base, matching range hood'), HARDWARE, SIZING],
    'custom-kitchen-storage-collection': [('Cabinet color', 'Deep navy'), ('Door style', 'Shaker'),
        ('Island', 'Wood top'), ('Features', 'Floor-to-ceiling storage, pull-out pantry units, deep drawers'),
        HARDWARE, SIZING],
    'designer-kitchen-cabinet-set': [('Base cabinets', 'Soft blue'), ('Upper cabinets', 'White'),
        ('Island', 'Wood top'), ('Features', 'Open shelving, plaster-style hood'), HARDWARE, SIZING],
    'elegant-kitchen-cabinet-system': [('Cabinet color', 'Cream'), ('Door style', 'Shaker'),
        ('Island', 'Marble top, seats four, deep drawers'), ('Features', 'Glass-front uppers, brass pendants, paneled hood'),
        HARDWARE, SIZING],
    'ice-white-shaker': [('Type', 'Cabinet door sample'), ('Door style', 'Shaker'), ('Finish', 'Ice white'),
        ('Use', 'Check the color and profile in your own light before ordering')],
    'premium-pull-down-kitchen-faucet': [('Type', 'Single-handle, high-arc'), ('Spray options', 'Standard, pull-down, pull-out'),
        ('Finish', 'Brown, black, or beige'), ('Controls', 'One handle for temperature and flow')],
    'modern-single-handle-kitchen-faucet': [('Type', 'Single-lever'), ('Installation', 'One-hole'),
        ('Spray options', 'Standard, pull-down, pull-out'), ('Finish', 'Black, gold, or brown')],
    'luxury-bridge-style-kitchen-faucet': [('Type', 'Two-handle bridge'), ('Spout', 'High arch'),
        ('Handles', 'Cross'), ('Finish', 'Gray, brown, or black')],
    'premium-farmhouse-kitchen-sink': [('Type', 'Apron-front, single basin'), ('Widths', '27", 30", 33", 36"')],
    'modern-undermount-kitchen-sink': [('Type', 'Undermount, single bowl'), ('Widths', '27", 30", 33", 36"'),
        ('Corners', 'Tight radius')],
    'stainless-steel-workstation-sink': [('Material', 'Stainless steel'), ('Finish', 'Brushed'),
        ('Feature', 'Built-in ledge for sliding accessories')],
    'matte-black-kitchen-sink': [('Type', 'Apron-front, single bowl'), ('Finish', 'Matte black, gold, or brown'),
        ('Texture', 'Hammered')],
    'double-bowl-kitchen-sink': [('Type', 'Double bowl, equal basins'), ('Divider', 'Low')],
    'pull-out-cabinet-organizer': [('Type', 'Pull-out basket'), ('Fits', '18", 24", 30", 36" base cabinets')],
    'drawer-cabinet-organizer': [('Type', 'Drawer insert with fixed compartments'),
        ('Fits', '18", 24", 30", 36" base cabinets'), ('Corners', 'Rounded inside corners')],
    'adjustable-cabinet-storage-organizer': [('Type', 'Expandable, with movable dividers'),
        ('Installation', 'Freestanding, no tools needed')],
    'modern-cabinet-pulls': [('Type', 'Bar pull'), ('Pack sizes', '5, 10, or 25'),
        ('Included', 'Mounting screws for standard door thicknesses')],
    'round-cabinet-knobs': [('Type', 'Round knob, domed face'), ('Pack sizes', '5, 10, or 25'),
        ('Mounting', 'Single screw')],
    'knob-and-pull-hardware-set': [('Contents', 'Knobs for doors and pulls for drawers'),
        ('Included', 'Mounting screws')],
    'modern-kitchen-range-hood': [('Type', 'Wall mount, tapered chimney'), ('Widths', '30", 36", 42", 48"'),
        ('Controls', 'Front'), ('Lighting', 'Built-in task lights')],
    'wall-mount-range-hood': [('Type', 'Wall mount, chimney style'), ('Widths', '30", 36", 42", 48"'),
        ('Finish', 'Stainless steel')],
    'built-in-cabinet-range-hood': [('Type', 'Range insert'), ('Installation', 'Inside a custom hood or wall cabinet'),
        ('Controls', 'Front edge')],
}

CABINETS = {h for h, s in SPECS.items() if SIZING in s}

DOOR_SAMPLE = {
    'handle': 'ice-white-shaker',
    'productType': 'Door Sample',
    'tags': ['door sample', 'shaker', 'white kitchen cabinets', 'kitchen remodel'],
    'descriptionHtml': (
        '<p>A full-size Ice White shaker cabinet door. Check the color, profile, and finish in your '
        'own light before you order a complete kitchen.</p>'
        '<p>The door matches the Ivory Shaker Island Kitchen and other light shaker sets in the catalog.</p>'),
}

# Products whose title/description contradicted their photos and variants.
# The sink is a hammered apron-front sink sold in three finishes; its first
# photo and default variant were copper while the title said matte black.
PRODUCT_COPY = {
    'matte-black-kitchen-sink': {
        'title': 'Hammered Apron-Front Sink',
        'descriptionHtml': (
            '<p>A hammered apron-front sink with a deep single basin and a textured front panel. '
            'Choose a matte black, gold, or brown finish to match your faucet and hardware.</p>'
            '<p>The deep basin fits large pots and sheet pans.</p>'),
        'first_option_value': 'Black',
    },
}

# Products whose detail tabs should be empty (the theme hides empty tabs).
CLEAR = {'gift-card'}


def gql(query, variables=None):
    body = json.dumps({'query': query, 'variables': variables or {}}).encode()
    req = urllib.request.Request(API, body, {'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOKEN})
    with urllib.request.urlopen(req) as resp:
        data = json.load(resp)
    if data.get('errors'):
        raise SystemExit(f'GraphQL error: {data["errors"]}')
    return data['data']


def rich_list(items):
    return json.dumps({'type': 'root', 'children': [{'type': 'list', 'listType': 'unordered', 'children': [
        {'type': 'list-item', 'children': [{'type': 'text', 'value': f'{label}: ', 'bold': True},
                                           {'type': 'text', 'value': value}]}
        for label, value in items]}]})


def rich_text(text):
    return json.dumps({'type': 'root', 'children': [{'type': 'paragraph', 'children': [{'type': 'text', 'value': text}]}]})


products = gql('''{ products(first: 100) { nodes { id handle title productType tags
  metafields(namespace: "custom", first: 20) { nodes { key type value } } } } }''')['products']['nodes']
by_handle = {p['handle']: p for p in products}

sets, deletes, updates = [], [], []
for handle, items in SPECS.items():
    product = by_handle.get(handle)
    if not product:
        print(f'skip {handle}: not found')
        continue
    current = {m['key']: m for m in product['metafields']['nodes']}
    wanted = {'specifications': rich_list(items),
              'delivery': rich_text(CABINET_DELIVERY if handle in CABINETS else PARCEL_DELIVERY)}
    for key, value in wanted.items():
        if key in current and json.loads(current[key]['value']) == json.loads(value):
            continue
        sets.append({'ownerId': product['id'], 'namespace': 'custom', 'key': key, 'type': 'rich_text_field', 'value': value})
        print(f'set {handle} custom.{key}')

for handle in CLEAR:
    product = by_handle.get(handle)
    if not product:
        continue
    for m in product['metafields']['nodes']:
        if m['key'] in ('specifications', 'delivery', 'installation'):
            deletes.append({'ownerId': product['id'], 'namespace': 'custom', 'key': m['key']})
            print(f'delete {handle} custom.{m["key"]}')

product = by_handle.get(DOOR_SAMPLE['handle'])
if product and (product['productType'] != DOOR_SAMPLE['productType'] or sorted(product['tags']) != sorted(DOOR_SAMPLE['tags'])):
    updates.append({'id': product['id'], 'productType': DOOR_SAMPLE['productType'], 'tags': DOOR_SAMPLE['tags'],
                    'descriptionHtml': DOOR_SAMPLE['descriptionHtml']})
    print(f'update {DOOR_SAMPLE["handle"]}: type, tags, description')

# Variant images: a variant without its own image takes the image of a
# variant with the same color, so the gallery and cart show the right finish.
detail = gql('''{ products(first: 100) { nodes { id handle title descriptionHtml
  media(first: 50) { nodes { id ... on MediaImage { image { url } } } }
  variants(first: 100) { nodes { id position selectedOptions { name value } media(first: 1) { nodes { id } } } } } } }''')
variant_media, reorders = [], []
COLOR_NAMES = ('color', 'colour', 'finish')
for p in detail['products']['nodes']:
    variants = p['variants']['nodes']
    by_color = {}
    for v in variants:
        color = next((o['value'] for o in v['selectedOptions'] if o['name'].lower() in COLOR_NAMES), None)
        media = v['media']['nodes']
        if color and media and color not in by_color:
            by_color[color] = media[0]['id']
    fills = []
    for v in variants:
        color = next((o['value'] for o in v['selectedOptions'] if o['name'].lower() in COLOR_NAMES), None)
        if color and not v['media']['nodes'] and color in by_color:
            fills.append({'id': v['id'], 'mediaId': by_color[color]})
    if fills:
        variant_media.append((p['id'], fills))
        print(f'variant images {p["handle"]}: {len(fills)}')

    copy = PRODUCT_COPY.get(p['handle'])
    if copy:
        if p['title'] != copy['title']:
            updates.append({'id': p['id'], 'title': copy['title'], 'descriptionHtml': copy['descriptionHtml']})
            print(f'update {p["handle"]}: title, description')
        first = copy['first_option_value']
        ordered = sorted(variants, key=lambda v: (not any(o['value'] == first for o in v['selectedOptions']), v['position']))
        if [v['id'] for v in ordered] != [v['id'] for v in sorted(variants, key=lambda v: v['position'])]:
            target = next((v for v in ordered if v['media']['nodes']), None)
            reorders.append((p['id'], [{'id': v['id'], 'position': i + 1} for i, v in enumerate(ordered)],
                             target['media']['nodes'][0]['id'] if target else None))
            print(f'reorder {p["handle"]}: {first} variant and its image first')

print(f'{len(sets)} metafields to set, {len(deletes)} to delete, {len(updates)} products to update, '
      f'{len(variant_media)} products with variant images, {len(reorders)} reorders')
if not APPLY:
    print('Dry run. Re-run with --apply to write.')
    sys.exit(0)

for i in range(0, len(sets), 25):
    result = gql('''mutation($m: [MetafieldsSetInput!]!) { metafieldsSet(metafields: $m) {
        userErrors { field message } } }''', {'m': sets[i:i + 25]})
    errors = result['metafieldsSet']['userErrors']
    if errors:
        raise SystemExit(f'metafieldsSet: {errors}')
if deletes:
    result = gql('''mutation($m: [MetafieldIdentifierInput!]!) { metafieldsDelete(metafields: $m) {
        userErrors { field message } } }''', {'m': deletes})
    if result['metafieldsDelete']['userErrors']:
        raise SystemExit(f'metafieldsDelete: {result["metafieldsDelete"]["userErrors"]}')
for item in updates:
    result = gql('''mutation($p: ProductUpdateInput!) { productUpdate(product: $p) {
        userErrors { field message } } }''', {'p': item})
    if result['productUpdate']['userErrors']:
        raise SystemExit(f'productUpdate: {result["productUpdate"]["userErrors"]}')
for product_id, fills in variant_media:
    result = gql('''mutation($p: ID!, $v: [ProductVariantsBulkInput!]!) { productVariantsBulkUpdate(productId: $p, variants: $v) {
        userErrors { field message } } }''', {'p': product_id, 'v': fills})
    if result['productVariantsBulkUpdate']['userErrors']:
        raise SystemExit(f'productVariantsBulkUpdate: {result["productVariantsBulkUpdate"]["userErrors"]}')
for product_id, positions, media_id in reorders:
    result = gql('''mutation($p: ID!, $v: [ProductVariantPositionInput!]!) { productVariantsBulkReorder(productId: $p, positions: $v) {
        userErrors { field message } } }''', {'p': product_id, 'v': positions})
    if result['productVariantsBulkReorder']['userErrors']:
        raise SystemExit(f'productVariantsBulkReorder: {result["productVariantsBulkReorder"]["userErrors"]}')
    if media_id:
        result = gql('''mutation($p: ID!, $m: [MoveInput!]!) { productReorderMedia(id: $p, moves: $m) {
            mediaUserErrors { field message } } }''', {'p': product_id, 'm': [{'id': media_id, 'newPosition': '0'}]})
        if result['productReorderMedia']['mediaUserErrors']:
            raise SystemExit(f'productReorderMedia: {result["productReorderMedia"]["mediaUserErrors"]}')
print('Applied.')
