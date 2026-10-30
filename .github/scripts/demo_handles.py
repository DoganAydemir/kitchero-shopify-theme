"""Product handles that match the product titles (30.10 review).

Several products were renamed (audit #44) but kept their original handles,
so /products/custom-kitchen-cabinet-set opened "Navy Island Dining Kitchen".
This script changes each handle with redirectNewHandle, so Shopify keeps a
URL redirect from the old address.

Usage: SHOP=... TOKEN=... python3 demo_handles.py [--apply]
"""
import json
import os
import sys
import urllib.request

SHOP = os.environ['SHOP']
TOKEN = os.environ['TOKEN']
APPLY = '--apply' in sys.argv
API = f'https://{SHOP}/admin/api/2025-01/graphql.json'

HANDLES = {
    "custom-kitchen-cabinet-set": "navy-island-dining-kitchen",
    "luxury-kitchen-cabinet-design": "plum-marble-dining-kitchen",
    "contemporary-kitchen-cabinet-system": "espresso-contemporary-kitchen",
    "designer-kitchen-cabinet-collection": "charcoal-marble-island-kitchen",
    "built-in-kitchen-cabinet-set": "midnight-walnut-built-in-kitchen",
    "signature-built-in-kitchen-set": "emerald-marble-built-in-kitchen",
    "elegant-custom-kitchen-cabinets": "forest-green-custom-kitchen",
    "contemporary-cabinet-kitchen-set": "sage-oak-kitchen-set",
    "designer-built-in-cabinet-set": "slate-built-in-galley-kitchen",
    "custom-kitchen-storage-collection": "navy-shaker-storage-kitchen",
    "designer-kitchen-cabinet-set": "coastal-blue-kitchen-set",
    "elegant-kitchen-cabinet-system": "ivory-shaker-island-kitchen",
    "luxury-bridge-style-kitchen-faucet": "arched-pull-down-kitchen-faucet",
    "modern-undermount-kitchen-sink": "white-apron-front-kitchen-sink",
    "matte-black-kitchen-sink": "hammered-apron-front-sink",
    "double-bowl-kitchen-sink": "integrated-stone-kitchen-sink"
}


def gql(query, variables=None):
    body = json.dumps({'query': query, 'variables': variables or {}}).encode()
    req = urllib.request.Request(API, data=body, headers={'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOKEN})
    with urllib.request.urlopen(req) as res:
        data = json.load(res)
    if data.get('errors'):
        raise SystemExit(json.dumps(data['errors']))
    return data['data']


BY_HANDLE = 'query($h: String!) { productByHandle(handle: $h) { id title handle status } }'
UPDATE = """mutation($input: ProductInput!) {
  productUpdate(input: $input) { product { id handle } userErrors { field message } }
}"""

print('| Old handle | New handle | Title | Result |')
print('| - | - | - | - |')
for old, new in HANDLES.items():
    product = gql(BY_HANDLE, {'h': old})['productByHandle']
    taken = gql(BY_HANDLE, {'h': new})['productByHandle']
    if not product or product['handle'] != old:
        status = 'already renamed' if taken else 'old handle not found'
        print(f'| {old} | {new} | {taken["title"] if taken else "-"} | {status} |')
        continue
    if taken and taken['id'] != product['id']:
        print(f'| {old} | {new} | {product["title"]} | SKIPPED: new handle used by {taken["title"]} ({taken["status"]}) |')
        continue
    if not APPLY:
        print(f'| {old} | {new} | {product["title"]} | dry run |')
        continue
    result = gql(UPDATE, {'input': {'id': product['id'], 'handle': new, 'redirectNewHandle': True}})['productUpdate']
    errors = '; '.join(e['message'] for e in result['userErrors'])
    print(f'| {old} | {new} | {product["title"]} | {errors or "updated, redirect created"} |')
