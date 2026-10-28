"""Demo store: showroom color options.

- Cabinet sets: the option called "Color" is the hardware finish
  (black, beige, bronze). Rename it to "Hardware finish" so shoppers do
  not expect the photos to change.
- Ivory Shaker Island Kitchen (elegant-kitchen-cabinet-system): add a real
  "Color" option (Ivory, Navy, Charcoal) with its own photo group per color,
  to demo the showroom "Show selected variant's media" setting.

Idempotent. Dry run by default; pass --apply to write.
"""
import json, os, sys, time, urllib.request

SHOP = os.environ['SHOP']
TOKEN = os.environ['TOKEN']
APPLY = '--apply' in sys.argv
API = f'https://{SHOP}/admin/api/2025-01/graphql.json'

DEMO = 'elegant-kitchen-cabinet-system'
# color: source product whose photos become that color's group (None = keep own photos)
COLORS = [('Ivory', None), ('Navy', 'custom-kitchen-cabinet-set'), ('Charcoal', 'designer-kitchen-cabinet-collection')]
CABINET_SETS = ['custom-kitchen-cabinet-set', 'luxury-kitchen-cabinet-design', 'contemporary-kitchen-cabinet-system',
                'designer-kitchen-cabinet-collection', 'built-in-kitchen-cabinet-set', 'signature-built-in-kitchen-set',
                'elegant-custom-kitchen-cabinets', 'contemporary-cabinet-kitchen-set', 'designer-built-in-cabinet-set',
                'custom-kitchen-storage-collection', 'designer-kitchen-cabinet-set', DEMO]
OLD_SENTENCE = 'Choose black, beige, or bronze hardware.'
NEW_SENTENCE = 'Choose ivory, navy, or charcoal cabinets with black, beige, or bronze hardware.'


def gql(query, variables=None):
    body = json.dumps({'query': query, 'variables': variables or {}}).encode()
    req = urllib.request.Request(API, body, {'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOKEN})
    with urllib.request.urlopen(req) as resp:
        data = json.load(resp)
    if data.get('errors'):
        raise SystemExit(f'GraphQL error: {data["errors"]}')
    return data['data']


def errors(result, key, field='userErrors'):
    errs = result[key].get(field) or []
    if errs:
        raise SystemExit(f'{key}: {errs}')


PRODUCT_Q = '''query($h: String!) { productByHandle(handle: $h) { id handle title descriptionHtml
  options { id name position optionValues { id name hasVariants swatch { color } linkedMetafieldValue } linkedMetafield { namespace key } }
  media(first: 50) { nodes { id mediaContentType status alt ... on MediaImage { image { url } } } }
  variants(first: 100) { nodes { id position title selectedOptions { name value } media(first: 1) { nodes { id } } } } } }'''


def product(handle):
    return gql(PRODUCT_Q, {'h': handle})['productByHandle']


print('## Rename hardware option')
for handle in CABINET_SETS:
    p = product(handle)
    opt = next((o for o in p['options'] if o['name'] == 'Color' and
                {v['name'] for v in o['optionValues']} == {'Black', 'Beige', 'Bronze'}), None)
    if not opt:
        print(f'- {handle}: nothing to rename ({[o["name"] for o in p["options"]]})')
        continue
    print(f'- {handle}: "Color" -> "Hardware finish" | linked metafield: {opt["linkedMetafield"]} | '
          f'swatches: {[v["swatch"] for v in opt["optionValues"]]}')
    if APPLY:
        r = gql('''mutation($p: ID!, $o: OptionUpdateInput!) { productOptionUpdate(productId: $p, option: $o) {
            userErrors { field message } } }''', {'p': p['id'], 'o': {'id': opt['id'], 'name': 'Hardware finish'}})
        errors(r, 'productOptionUpdate')

print('## Demo product colors')
p = product(DEMO)
names = [o['name'] for o in p['options']]
print(f'- options now: {names}; media: {len(p["media"]["nodes"])}; variants: {len(p["variants"]["nodes"])}')
if 'Color' not in names or not APPLY:
    if 'Color' not in names:
        print('- add option "Color": Ivory, Navy, Charcoal (position 1, create variants)')
        if APPLY:
            r = gql('''mutation($p: ID!, $o: [OptionCreateInput!]!) { productOptionsCreate(productId: $p, options: $o, variantStrategy: CREATE) {
                userErrors { field message } } }''', {'p': p['id'], 'o': [{'name': 'Color', 'position': 1,
                'values': [{'name': c} for c, _ in COLORS]}]})
            errors(r, 'productOptionsCreate')

# media groups: own photos first (Ivory), then each source product's images
p = product(DEMO) if APPLY else p
own_alts = {m['alt'] for m in p['media']['nodes']}
to_add = []
for color, source in COLORS:
    if not source:
        continue
    src = product(source)
    for i, m in enumerate([m for m in src['media']['nodes'] if m['mediaContentType'] == 'IMAGE'], 1):
        alt = f'{p["title"]} in {color.lower()}, view {i}'
        if alt not in own_alts:
            to_add.append({'originalSource': m['image']['url'], 'alt': alt, 'mediaContentType': 'IMAGE'})
print(f'- photos to add: {len(to_add)}')
if APPLY and to_add:
    r = gql('''mutation($p: ID!, $m: [CreateMediaInput!]!) { productCreateMedia(productId: $p, media: $m) {
        mediaUserErrors { field message } } }''', {'p': p['id'], 'm': to_add})
    errors(r, 'productCreateMedia', 'mediaUserErrors')
    for _ in range(30):
        time.sleep(4)
        p = product(DEMO)
        if all(m['status'] == 'READY' for m in p['media']['nodes']):
            break
    print(f'- media status: {[m["status"] for m in p["media"]["nodes"]]}')

# first image of each color group -> variants of that color
media = p['media']['nodes']
first_for = {}
for color, source in COLORS:
    if source is None:
        first_for[color] = media[0]['id'] if media else None
    else:
        m = next((m for m in media if m['alt'] == f'{p["title"]} in {color.lower()}, view 1'), None)
        first_for[color] = m['id'] if m else None
fills = []
for v in p['variants']['nodes']:
    color = next((o['value'] for o in v['selectedOptions'] if o['name'] == 'Color'), None)
    want = first_for.get(color)
    have = v['media']['nodes'][0]['id'] if v['media']['nodes'] else None
    if color and want and want != have:
        fills.append({'id': v['id'], 'mediaId': want})
print(f'- variant images to set: {len(fills)} ({ {c: bool(m) for c, m in first_for.items()} })')
if APPLY and fills:
    for v in p['variants']['nodes']:
        if v['media']['nodes'] and any(f['id'] == v['id'] for f in fills):
            r = gql('''mutation($p: ID!, $v: [ProductVariantDetachMediaInput!]!) { productVariantDetachMedia(productId: $p, variantMedia: $v) {
                userErrors { field message } } }''', {'p': p['id'], 'v': [{'variantId': v['id'], 'mediaIds': [v['media']['nodes'][0]['id']]}]})
            errors(r, 'productVariantDetachMedia')
    r = gql('''mutation($p: ID!, $v: [ProductVariantsBulkInput!]!) { productVariantsBulkUpdate(productId: $p, variants: $v) {
        userErrors { field message } } }''', {'p': p['id'], 'v': fills})
    errors(r, 'productVariantsBulkUpdate')

if OLD_SENTENCE in (p['descriptionHtml'] or ''):
    print('- description: mention the cabinet colors')
    if APPLY:
        r = gql('''mutation($p: ProductUpdateInput!) { productUpdate(product: $p) { userErrors { field message } } }''',
                {'p': {'id': p['id'], 'descriptionHtml': p['descriptionHtml'].replace(OLD_SENTENCE, NEW_SENTENCE)}})
        errors(r, 'productUpdate')

if APPLY:
    p = product(DEMO)
    print('## Result')
    print('- options:', [(o['name'], [v['name'] for v in o['optionValues']]) for o in p['options']])
    for v in p['variants']['nodes']:
        mid = v['media']['nodes'][0]['id'] if v['media']['nodes'] else None
        pos = next((i + 1 for i, m in enumerate(p['media']['nodes']) if m['id'] == mid), None)
        print(f'  {v["position"]:>2} {v["title"]:<26} image position {pos}')
else:
    print('Dry run. Re-run with apply to write.')
