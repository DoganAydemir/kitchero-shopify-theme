"""Demo store data, second feedback round (29 Oct 2026).

1. Review leftovers. The reviews app was uninstalled, but the product
   metafields it wrote (reviews.rating, reviews.rating_count) stayed, so
   product cards and product pages still showed "5.0 (1)". --apply deletes
   them from every product.
2. Ice White Shaker door sample photo. The door filled the frame edge to
   edge. With DOOR_IMAGE_URL set, --apply adds the padded photo as the
   first image and removes the old one (a copy of the original is kept
   outside the store).
3. Sample product links. Lists custom.sample_product (the door sample
   linked to each product), which product cards read for the small sample
   thumbnail. Products listed in SAMPLE_PRODUCTS get the link; links on
   other products are removed with --apply.

Idempotent. Dry run by default; pass --apply to write.
"""
import json
import os
import sys
import time
import urllib.request

SHOP = os.environ['SHOP']
TOKEN = os.environ['TOKEN']
APPLY = '--apply' in sys.argv
API = f'https://{SHOP}/admin/api/2025-01/graphql.json'
DOOR_IMAGE_URL = os.environ.get('DOOR_IMAGE_URL', '').strip()
DOOR_HANDLE = 'ice-white-shaker'
DOOR_FILENAME = 'ice-white-shaker-door-padded'
DOOR_ALT = 'Ice White Shaker door sample'
# None = only list the current links, do not change them.
SAMPLE_PRODUCTS = None


def gql(query, variables=None):
    body = json.dumps({'query': query, 'variables': variables or {}}).encode()
    req = urllib.request.Request(API, body, {'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOKEN})
    with urllib.request.urlopen(req) as resp:
        data = json.load(resp)
    if data.get('errors'):
        raise SystemExit(f'GraphQL error: {data["errors"]}')
    return data['data']


def check(result, key, field='userErrors'):
    errs = result[key].get(field) or []
    if errs:
        raise SystemExit(f'{key}: {errs}')


print('Mode:', 'APPLY' if APPLY else 'dry run')

products = gql('''{ products(first: 100, sortKey: TITLE) { nodes {
  id handle title productType templateSuffix
  rating: metafield(namespace: "reviews", key: "rating") { value }
  ratingCount: metafield(namespace: "reviews", key: "rating_count") { value }
  sample: metafield(namespace: "custom", key: "sample_product") { value reference { ... on Product { handle } } }
} } }''')['products']['nodes']

# 1. Review leftovers
print('\n## Product rating metafields (reviews app removed)')
to_delete = []
for p in products:
    for key, mf in (('rating', p['rating']), ('rating_count', p['ratingCount'])):
        if mf:
            print(f"- {p['handle']}: reviews.{key} = {mf['value']}")
            to_delete.append({'ownerId': p['id'], 'namespace': 'reviews', 'key': key})
if not to_delete:
    print('- none left')
elif APPLY:
    for i in range(0, len(to_delete), 25):
        res = gql('''mutation($m: [MetafieldIdentifierInput!]!) { metafieldsDelete(metafields: $m) {
          deletedMetafields { key ownerId } userErrors { field message } } }''', {'m': to_delete[i:i + 25]})
        check(res, 'metafieldsDelete')
        print(f"  deleted {len(res['metafieldsDelete']['deletedMetafields'] or [])}")

# 2. Door sample photo
print('\n## Door sample photo')
door = gql('''query($h: String!) { productByHandle(handle: $h) { id title
  media(first: 30) { nodes { id alt mediaContentType ... on MediaImage { image { url width height } } } }
  variants(first: 10) { nodes { id title media(first: 5) { nodes { id } } } }
} }''', {'h': DOOR_HANDLE})['productByHandle']
media = door['media']['nodes']
for m in media:
    img = m.get('image') or {}
    print(f"- {m['id']} {img.get('width')}x{img.get('height')} {(img.get('url') or '').split('?')[0].split('/')[-1]}")
for v in door['variants']['nodes']:
    print(f"- variant {v['title']}: media {[x['id'] for x in v['media']['nodes']]}")
first_url = ((media[0].get('image') or {}).get('url') or '') if media else ''
if DOOR_FILENAME in first_url:
    print('- padded photo is already first')
elif not DOOR_IMAGE_URL:
    print('- DOOR_IMAGE_URL not set, photo unchanged')
elif APPLY:
    old = media[0]['id']
    res = gql('''mutation($p: ID!, $m: [CreateMediaInput!]!) { productCreateMedia(productId: $p, media: $m) {
      media { id status } mediaUserErrors { field message } } }''',
              {'p': door['id'], 'm': [{'originalSource': DOOR_IMAGE_URL, 'alt': DOOR_ALT, 'mediaContentType': 'IMAGE'}]})
    check(res, 'productCreateMedia', 'mediaUserErrors')
    new = res['productCreateMedia']['media'][0]['id']
    status = ''
    for _ in range(30):
        node = gql('query($id: ID!) { node(id: $id) { ... on MediaImage { status image { url } } } }', {'id': new})['node']
        status = node['status']
        if status in ('READY', 'FAILED'):
            break
        time.sleep(2)
    print(f'  new media {new}: {status}')
    if status != 'READY':
        raise SystemExit('New photo did not finish processing; old photo kept.')
    res = gql('''mutation($p: ID!, $moves: [MoveInput!]!) { productReorderMedia(id: $p, moves: $moves) {
      job { id } mediaUserErrors { field message } } }''', {'p': door['id'], 'moves': [{'id': new, 'newPosition': '0'}]})
    check(res, 'productReorderMedia', 'mediaUserErrors')
    time.sleep(3)
    variant_links = [{'variantId': v['id'], 'mediaIds': [new]} for v in door['variants']['nodes']
                     if old in [x['id'] for x in v['media']['nodes']]]
    res = gql('''mutation($p: ID!, $ids: [ID!]!) { productDeleteMedia(productId: $p, mediaIds: $ids) {
      deletedMediaIds mediaUserErrors { field message } } }''', {'p': door['id'], 'ids': [old]})
    check(res, 'productDeleteMedia', 'mediaUserErrors')
    print(f'  removed old media {old}')
    if variant_links:
        res = gql('''mutation($p: ID!, $vm: [ProductVariantAppendMediaInput!]!) { productVariantAppendMedia(productId: $p, variantMedia: $vm) {
          userErrors { field message } } }''', {'p': door['id'], 'vm': variant_links})
        check(res, 'productVariantAppendMedia')
        print(f'  variant photo set on {len(variant_links)} variant(s)')

# 3. Sample product links
print('\n## custom.sample_product links')
sample_ids = {}
for p in products:
    ref = (p['sample'] or {}).get('reference') or {}
    linked = ref.get('handle', '')
    print(f"- {p['handle']} [{p['productType'] or '-'}] template={p['templateSuffix'] or 'default'} sample={linked or '-'}")
if SAMPLE_PRODUCTS is not None:
    door_id = door['id']
    sets, clears = [], []
    for p in products:
        linked = ((p['sample'] or {}).get('reference') or {}).get('handle', '')
        if p['handle'] in SAMPLE_PRODUCTS and linked != DOOR_HANDLE:
            sets.append({'ownerId': p['id'], 'namespace': 'custom', 'key': 'sample_product',
                         'type': 'product_reference', 'value': door_id})
        elif p['handle'] not in SAMPLE_PRODUCTS and p['sample']:
            clears.append({'ownerId': p['id'], 'namespace': 'custom', 'key': 'sample_product'})
    print(f'  to link: {len(sets)}, to unlink: {len(clears)}')
    if APPLY and sets:
        for i in range(0, len(sets), 25):
            res = gql('''mutation($m: [MetafieldsSetInput!]!) { metafieldsSet(metafields: $m) { userErrors { field message } } }''',
                      {'m': sets[i:i + 25]})
            check(res, 'metafieldsSet')
    if APPLY and clears:
        for i in range(0, len(clears), 25):
            res = gql('''mutation($m: [MetafieldIdentifierInput!]!) { metafieldsDelete(metafields: $m) { userErrors { field message } } }''',
                      {'m': clears[i:i + 25]})
            check(res, 'metafieldsDelete')

# Live theme Product data settings (read only)
print('\n## Live theme Product data settings')
theme = gql('''{ themes(first: 1, roles: [MAIN]) { nodes { name
  files(filenames: ["config/settings_data.json"]) { nodes { body { ... on OnlineStoreThemeFileBodyText { content } } } }
} } }''')['themes']['nodes'][0]
nodes = theme['files']['nodes']
content = nodes[0]['body']['content'] if nodes else ''
start = content.find('{')
data = json.loads(content[start:]) if start >= 0 else {}
current = data.get('current', {})
if isinstance(current, str):
    current = data.get('presets', {}).get(current, {})
print(f"Theme: {theme['name']}")
for k in sorted(current):
    if k.startswith('kt_mf_'):
        print(f'- {k} = {current[k]!r}')
