"""Tiered prices for size and pack variants (31.10 review).

14 demo products had size or pack variants that all shared one price, so
choosing a bigger size did not change the price. The current price stays the
price of the smallest option; larger options add a fixed amount.

Usage: SHOP=... TOKEN=... python3 demo_prices.py [--apply]
"""
import json
import os
import sys
import urllib.request

SHOP = os.environ['SHOP']
TOKEN = os.environ['TOKEN']
APPLY = '--apply' in sys.argv
API = f'https://{SHOP}/admin/api/2025-01/graphql.json'

CABINET = {'Wall 30"': 0, 'Wall 36"': 100, 'Base 24"': 150, 'Base 30"': 250, 'Base 36"': 350, 'Tall 84"': 600}
SINK = {'27"': 0, '30"': 20, '33"': 40, '36"': 60}
ORGANIZER = {'Base 18"': 0, 'Base 24"': 10, 'Base 30"': 20, 'Base 36"': 30}
PACK = {'Set of 5': 0, 'Set of 10': 130, 'Set of 25': 500}
HOOD = {'30"': 0, '36"': 50, '42"': 100, '48"': 150}
SPRAY = {'Standard': 0, 'Pull-Out': 15, 'Pull-Down': 20}

PRODUCTS = {
    'navy-island-dining-kitchen': ('Cabinet Type', CABINET),
    'plum-marble-dining-kitchen': ('Cabinet Type', CABINET),
    'espresso-contemporary-kitchen': ('Cabinet Type', CABINET),
    'charcoal-marble-island-kitchen': ('Cabinet Type', CABINET),
    'midnight-walnut-built-in-kitchen': ('Cabinet Type', CABINET),
    'modern-single-handle-kitchen-faucet': ('Spray Type', SPRAY),
    'premium-farmhouse-kitchen-sink': ('Sink Size', SINK),
    'white-apron-front-kitchen-sink': ('Sink Size', SINK),
    'pull-out-cabinet-organizer': ('Cabinet Width', ORGANIZER),
    'drawer-cabinet-organizer': ('Cabinet Width', ORGANIZER),
    'modern-cabinet-pulls': ('Pack Size', PACK),
    'round-cabinet-knobs': ('Pack Size', PACK),
    'modern-kitchen-range-hood': ('Width', HOOD),
    'wall-mount-range-hood': ('Width', HOOD),
}


def gql(query, variables=None):
    body = json.dumps({'query': query, 'variables': variables or {}}).encode()
    req = urllib.request.Request(API, data=body, headers={'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOKEN})
    with urllib.request.urlopen(req) as res:
        data = json.load(res)
    if data.get('errors'):
        raise SystemExit(json.dumps(data['errors']))
    return data['data']


QUERY = """query($h: String!) { productByHandle(handle: $h) { id title
  variants(first: 50) { nodes { id title price selectedOptions { name value } } } } }"""
UPDATE = """mutation($pid: ID!, $variants: [ProductVariantsBulkInput!]!) {
  productVariantsBulkUpdate(productId: $pid, variants: $variants) { userErrors { field message } } }"""

print('| Product | Variant | Old | New | Result |')
print('| - | - | - | - | - |')
for handle, (option, steps) in PRODUCTS.items():
    product = gql(QUERY, {'h': handle})['productByHandle']
    if not product:
        print(f'| {handle} | | | | not found |')
        continue
    variants = product['variants']['nodes']
    if len({v['price'] for v in variants}) != 1:
        print(f"| {product['title']} | | | | skipped (prices already differ) |")
        continue
    base = float(variants[0]['price'])
    updates = []
    for v in variants:
        value = next(o['value'] for o in v['selectedOptions'] if o['name'] == option)
        new = f'{base + steps[value]:.2f}'
        updates.append({'id': v['id'], 'price': new})
        print(f"| {product['title']} | {v['title']} | {v['price']} | {new} | {'planned' if not APPLY else ''} |")
    if APPLY:
        errors = gql(UPDATE, {'pid': product['id'], 'variants': updates})['productVariantsBulkUpdate']['userErrors']
        print(f"| {product['title']} | all | | | {'ok' if not errors else errors} |")
