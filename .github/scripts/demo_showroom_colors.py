"""Demo store: showroom colors as linked products (29 Oct 2026).

- Cabinet sets: remove the "Hardware finish" option (black, beige, bronze).
  Hardware is not sold by color in this sector, and the photos never
  changed with it. Prices are the same for every finish.
- Ivory Shaker Island Kitchen: remove the "Color" option (Ivory, Navy,
  Charcoal) and its Navy and Charcoal photo groups. Those photos were
  copies of the Navy Island Dining Kitchen and Charcoal Marble Island
  Kitchen photos, shown under the Ivory product's title and price.
- Link Ivory Shaker, Navy Island Dining Kitchen and Charcoal Marble Island
  Kitchen through the custom.linked_products metafield (list of products).
  The theme's Linked products block shows them as "Other colors" and opens
  the chosen kitchen's own page.
- Descriptions: drop the sentences that offered hardware or cabinet colors,
  including the Kitchen Cabinets collection description.

Idempotent. Dry run by default; pass --apply to write.
"""
import json, os, re, sys, urllib.request

SHOP = os.environ['SHOP']
TOKEN = os.environ['TOKEN']
APPLY = '--apply' in sys.argv
API = f'https://{SHOP}/admin/api/2025-01/graphql.json'

DEMO = 'ivory-shaker-island-kitchen'
CABINET_SETS = ['navy-island-dining-kitchen', 'plum-marble-dining-kitchen', 'espresso-contemporary-kitchen',
                'charcoal-marble-island-kitchen', 'midnight-walnut-built-in-kitchen', 'emerald-marble-built-in-kitchen',
                'forest-green-custom-kitchen', 'sage-oak-kitchen-set', 'slate-built-in-galley-kitchen',
                'navy-shaker-storage-kitchen', 'coastal-blue-kitchen-set', DEMO]
# Same order on every page, so the swatches never move.
LINKED = [DEMO, 'navy-island-dining-kitchen', 'charcoal-marble-island-kitchen']
DEFINITION = {'name': 'Linked products', 'namespace': 'custom', 'key': 'linked_products',
              'type': 'list.product_reference', 'ownerType': 'PRODUCT',
              'description': "Other products shown as photo swatches by the theme's Linked products block."}
SENTENCES = [
    (' Choose black, beige, or bronze hardware, and pick the base, wall, and tall units that fit your layout.',
     ' Pick the base, wall, and tall units that fit your layout.'),
    (' Choose ivory, navy, or charcoal cabinets with black, beige, or bronze hardware.', ''),
    (' Choose black, beige, or bronze hardware.', ''),
]


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


PRODUCT_Q = '''query($h: String!) { productByHandle(handle: $h) { id handle title descriptionHtml
  options { id name position optionValues { name } }
  media(first: 50) { nodes { id mediaContentType alt } }
  variants(first: 100) { nodes { id position title availableForSale selectedOptions { name value } media(first: 1) { nodes { id } } } }
  metafield(namespace: "custom", key: "linked_products") { value } } }'''


def product(handle):
    return gql(PRODUCT_Q, {'h': handle})['productByHandle']


def delete_option(p, name):
    opt = next((o for o in p['options'] if o['name'] == name), None)
    if not opt:
        return False
    keep = {}
    for v in sorted(p['variants']['nodes'], key=lambda v: v['position']):
        key = tuple(o['value'] for o in v['selectedOptions'] if o['name'] != name)
        keep.setdefault(key, v)
    print(f'- {p["handle"]}: delete option "{name}" {[v["name"] for v in opt["optionValues"]]} | '
          f'variants {len(p["variants"]["nodes"])} -> {len(keep)} (kept: {[v["title"] for v in keep.values()]})')
    if APPLY:
        r = gql('''mutation($p: ID!, $o: [ID!]!) { productOptionsDelete(productId: $p, options: $o, strategy: POSITION) {
            deletedOptionsIds userErrors { field message code } } }''', {'p': p['id'], 'o': [opt['id']]})
        check(r, 'productOptionsDelete')
    return True


print('## Demo product: photo groups to remove')
p = product(DEMO)
media = p['media']['nodes']
index = {m['id']: i for i, m in enumerate(media)}
starts = {}
for v in sorted(p['variants']['nodes'], key=lambda v: v['position']):
    color = next((o['value'] for o in v['selectedOptions'] if o['name'] == 'Color'), None)
    if color and v['media']['nodes'] and color not in starts:
        starts[color] = index[v['media']['nodes'][0]['id']]
print(f'- media: {[(i, m["mediaContentType"]) for i, m in enumerate(media)]}')
print(f'- group starts: {starts}')
remove = []
if 'Navy' in starts and 'Charcoal' in starts:
    bounds = sorted(starts.values()) + [len(media)]
    for color in ('Navy', 'Charcoal'):
        start = starts[color]
        end = next(b for b in bounds if b > start)
        group = media[start:end]
        print(f'- {color} group: positions {start}-{end - 1}: {[(m["mediaContentType"], m["alt"]) for m in group]}')
        remove += [m['id'] for m in group if m['mediaContentType'] == 'IMAGE']
print(f'- images to delete: {len(remove)}')

print('## Options')
for handle in CABINET_SETS:
    p = product(handle)
    if not delete_option(p, 'Hardware finish'):
        print(f'- {handle}: no "Hardware finish" ({[o["name"] for o in p["options"]]})')
p = product(DEMO)
if not delete_option(p, 'Color'):
    print(f'- {DEMO}: no "Color" option ({[o["name"] for o in p["options"]]})')

if remove:
    print(f'## Delete {len(remove)} copied images from {DEMO}')
    if APPLY:
        pid = product(DEMO)['id']
        r = gql('''mutation($p: ID!, $m: [ID!]!) { productDeleteMedia(productId: $p, mediaIds: $m) {
            deletedMediaIds mediaUserErrors { field message } } }''', {'p': pid, 'm': remove})
        check(r, 'productDeleteMedia', 'mediaUserErrors')
        print(f'- deleted: {len(r["productDeleteMedia"]["deletedMediaIds"])}')

print('## Descriptions')
for handle in CABINET_SETS:
    p = product(handle)
    html = p['descriptionHtml'] or ''
    new = html
    for old, rep in SENTENCES:
        new = new.replace(old, rep)
    if new != html:
        print(f'- {handle}: {len(html)} -> {len(new)} chars')
        if APPLY:
            r = gql('''mutation($p: ProductUpdateInput!) { productUpdate(product: $p) { userErrors { field message } } }''',
                    {'p': {'id': p['id'], 'descriptionHtml': new}})
            check(r, 'productUpdate')
    if 'hardware' in new.lower():
        i = new.lower().index('hardware')
        print(f'  still mentions hardware: ...{new[max(0, i - 80):i + 40]}...')

print('## Collection description')
COLLECTION = 'kitchen-cabinets'
c = gql('''query($h: String!) { collectionByHandle(handle: $h) { id descriptionHtml } }''', {'h': COLLECTION})['collectionByHandle']
html = (c or {}).get('descriptionHtml') or ''
new = re.sub(r'Every set comes in black, beige, or bronze hardware and can be combined', 'Every set can be combined', html)
if new != html:
    i = new.find('Every set can be combined')
    print(f'- {COLLECTION}: "...{new[max(0, i - 60):i + 90]}..."')
    if APPLY:
        r = gql('''mutation($c: CollectionInput!) { collectionUpdate(input: $c) { userErrors { field message } } }''',
                {'c': {'id': c['id'], 'descriptionHtml': new}})
        check(r, 'collectionUpdate')
elif re.search(r'bronze hardware|hardware finish', html, re.I):
    print(f'- {COLLECTION}: still mentions hardware, pattern not found: {html[:300]}')
else:
    print(f'- {COLLECTION}: no hardware sentence')

print('## Metafield definition')
defs = gql('''{ metafieldDefinitions(first: 100, ownerType: PRODUCT, namespace: "custom") { nodes { id key type { name } } } }''')
existing = next((d for d in defs['metafieldDefinitions']['nodes'] if d['key'] == DEFINITION['key']), None)
if existing:
    print(f'- exists: custom.{existing["key"]} ({existing["type"]["name"]})')
else:
    print(f'- create custom.{DEFINITION["key"]} ({DEFINITION["type"]})')
    if APPLY:
        r = gql('''mutation($d: MetafieldDefinitionInput!) { metafieldDefinitionCreate(definition: $d) {
            createdDefinition { id } userErrors { field message code } } }''', {'d': DEFINITION})
        check(r, 'metafieldDefinitionCreate')

print('## Linked products')
ids = {h: product(h)['id'] for h in LINKED}
value = json.dumps([ids[h] for h in LINKED])
sets = []
for handle in LINKED:
    p = product(handle)
    current = (p['metafield'] or {}).get('value')
    if current and json.loads(current) == json.loads(value):
        print(f'- {handle}: already linked')
        continue
    print(f'- {handle}: link {LINKED}')
    sets.append({'ownerId': p['id'], 'namespace': 'custom', 'key': DEFINITION['key'],
                 'type': DEFINITION['type'], 'value': value})
if sets and APPLY:
    r = gql('''mutation($m: [MetafieldsSetInput!]!) { metafieldsSet(metafields: $m) { userErrors { field message } } }''',
            {'m': sets})
    check(r, 'metafieldsSet')

print('## Result' if APPLY else '## Dry run. Re-run with --apply to write.')
if APPLY:
    for handle in CABINET_SETS:
        p = product(handle)
        v = p['variants']['nodes']
        print(f'- {p["title"]}: options {[o["name"] for o in p["options"]]}, variants {len(v)}, '
              f'available {sum(1 for x in v if x["availableForSale"])}, media {len(p["media"]["nodes"])}')
