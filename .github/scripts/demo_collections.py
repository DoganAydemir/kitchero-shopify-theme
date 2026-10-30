"""Demo store collections and deal prices (30 Oct 2026).

1. Style collections. Island, Built-In and Shaker Kitchens matched a word
   in the product title, so they held only 2-3 sets each and the grid
   looked half empty. Each set now carries style tags (taken from its
   description and photos) and the three smart collections match the tag,
   six sets each.
2. A sixth collection, Hardware & Storage (knobs, pulls and organizers),
   so the /collections grid has two full rows of three.
3. Deal prices. The Deals page shows four sets; each one has a
   compare-at price on every variant (about 15% above the price).

Idempotent. Dry run by default; pass --apply to write.
"""
import json
import os
import sys
import urllib.request

SHOP = os.environ['SHOP']
TOKEN = os.environ['TOKEN']
APPLY = '--apply' in sys.argv
API = f'https://{SHOP}/admin/api/2025-01/graphql.json'

CABINET_TYPE = 'Kitchen Cabinets'

# style tag: product handles (titles in comments)
STYLE_TAGS = {
    'island kitchen': [
        'ivory-shaker-island-kitchen',        # Ivory Shaker Island Kitchen: island seats four
        'charcoal-marble-island-kitchen',   # Charcoal Marble Island Kitchen: island with seating for four
        'navy-island-dining-kitchen',            # Navy Island Dining Kitchen: seating at the island
        'sage-oak-kitchen-set',      # Sage & Oak Kitchen Set: island seats three
        'espresso-contemporary-kitchen',   # Espresso Contemporary Kitchen: island doubles as a breakfast bar
        'plum-marble-dining-kitchen',         # Plum & Marble Dining Kitchen: marble island with a dining table
    ],
    'built-in kitchen': [
        'slate-built-in-galley-kitchen',         # Slate Built-In Galley Kitchen: built-ins wrap the room, tall units
        'emerald-marble-built-in-kitchen',        # Emerald Marble Built-In Kitchen: tall units beside the range
        'midnight-walnut-built-in-kitchen',          # Midnight Walnut Built-In Kitchen: tall pantry units
        'navy-shaker-storage-kitchen',     # Navy Shaker Storage Kitchen: floor-to-ceiling storage, pantry units
        'navy-island-dining-kitchen',            # Navy Island Dining Kitchen: tall pantry units
        'charcoal-marble-island-kitchen',   # Charcoal Marble Island Kitchen: tall display cabinets, built-in hood
    ],
    'shaker kitchen': [
        'ivory-shaker-island-kitchen',        # Ivory Shaker Island Kitchen: cream shaker cabinetry
        'navy-shaker-storage-kitchen',     # Navy Shaker Storage Kitchen: deep navy shaker cabinets
        'coastal-blue-kitchen-set',          # Coastal Blue Kitchen Set: painted blue shaker doors
        'slate-built-in-galley-kitchen',         # Slate Built-In Galley Kitchen: painted slate shaker doors
        'sage-oak-kitchen-set',      # Sage & Oak Kitchen Set: painted sage shaker doors
        'forest-green-custom-kitchen',       # Forest Green Custom Kitchen: painted green shaker doors
    ],
}

# collection handle: style tag
STYLE_COLLECTIONS = {
    'island-kitchens': 'island kitchen',
    'built-in-kitchens': 'built-in kitchen',
    'shaker-kitchens': 'shaker kitchen',
}

NEW_COLLECTIONS = {
    'hardware-storage': {
        'title': 'Hardware & Storage',
        'description': 'Knobs, pulls, and pull-out organizers that finish your cabinets and keep every drawer in order.',
        'types': ['Cabinet Hardware', 'Cabinet Organizer'],
        'image_product': 'modern-cabinet-pulls',
    },
}

# product handle: compare-at price for every variant (Deals page)
COMPARE_AT = {
    'emerald-marble-built-in-kitchen': '2095.00',
    'sage-oak-kitchen-set': '2480.00',
    'forest-green-custom-kitchen': '3240.00',
    'ivory-shaker-island-kitchen': '3940.00',
}


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

products = gql('''{ products(first: 100) { nodes {
  id handle title productType tags
  featuredMedia { preview { image { url } } }
  variants(first: 50) { nodes { id price compareAtPrice } }
} } }''')['products']['nodes']
by_handle = {p['handle']: p for p in products}

missing = sorted({h for hs in STYLE_TAGS.values() for h in hs} - by_handle.keys())
if missing:
    raise SystemExit(f'Unknown products: {missing}')

# 1. Style tags
tag_adds, tag_removes = [], []
for p in products:
    if p['productType'] != CABINET_TYPE:
        continue
    current = {t.lower() for t in p['tags']}
    wanted = {tag for tag, handles in STYLE_TAGS.items() if p['handle'] in handles}
    add = sorted(wanted - current)
    remove = sorted(t for t in p['tags'] if t.lower() in STYLE_TAGS and t.lower() not in wanted)
    if add:
        tag_adds.append((p['id'], add))
        print(f'tag {p["handle"]} ({p["title"]}): + {", ".join(add)}')
    if remove:
        tag_removes.append((p['id'], remove))
        print(f'tag {p["handle"]} ({p["title"]}): - {", ".join(remove)}')

# 2. Collection rules
collections = gql('''{ collections(first: 100) { nodes {
  id handle title ruleSet { appliedDisjunctively rules { column relation condition } }
} } }''')['collections']['nodes']
by_collection = {c['handle']: c for c in collections}


def rules_of(collection):
    rs = collection.get('ruleSet') or {}
    return (rs.get('appliedDisjunctively'),
            sorted((r['column'], r['relation'], r['condition'].lower()) for r in rs.get('rules') or []))


rule_updates = []
for handle, tag in STYLE_COLLECTIONS.items():
    collection = by_collection.get(handle)
    if not collection:
        print(f'collection {handle} not found, skipped')
        continue
    wanted = {'appliedDisjunctively': False, 'rules': [
        {'column': 'TAG', 'relation': 'EQUALS', 'condition': tag},
        {'column': 'TYPE', 'relation': 'EQUALS', 'condition': CABINET_TYPE}]}
    if rules_of(collection) != (False, sorted((r['column'], r['relation'], r['condition'].lower()) for r in wanted['rules'])):
        rule_updates.append({'id': collection['id'], 'ruleSet': wanted})
        print(f'rules {handle}: tag "{tag}" and type "{CABINET_TYPE}"')

new_collections = []
for handle, spec in NEW_COLLECTIONS.items():
    if handle in by_collection:
        continue
    image_product = by_handle.get(spec['image_product']) or {}
    image = ((image_product.get('featuredMedia') or {}).get('preview') or {}).get('image', {}).get('url')
    new_collections.append({
        'handle': handle, 'title': spec['title'], 'descriptionHtml': f'<p>{spec["description"]}</p>',
        'ruleSet': {'appliedDisjunctively': True, 'rules': [
            {'column': 'TYPE', 'relation': 'EQUALS', 'condition': t} for t in spec['types']]},
        **({'image': {'src': image, 'altText': spec['title']}} if image else {}),
    })
    print(f'create collection {handle} ({spec["title"]}): types {", ".join(spec["types"])}')

# 3. Compare-at prices
price_updates = []
for handle, compare_at in COMPARE_AT.items():
    p = by_handle.get(handle)
    if not p:
        raise SystemExit(f'Unknown product: {handle}')
    fills = [{'id': v['id'], 'compareAtPrice': compare_at} for v in p['variants']['nodes']
             if v['compareAtPrice'] is None or float(v['compareAtPrice']) != float(compare_at)]
    if fills:
        price_updates.append((p['id'], fills))
        print(f'compare-at {handle} ({p["title"]}): {compare_at} on {len(fills)} variant(s), price {p["variants"]["nodes"][0]["price"]}')

print(f'{len(tag_adds)} tag adds, {len(tag_removes)} tag removes, {len(rule_updates)} rule updates, '
      f'{len(new_collections)} collections to create, {len(price_updates)} products with compare-at changes')
if not APPLY:
    print('Dry run. Re-run with --apply to write.')
    sys.exit(0)

for pid, tags in tag_adds:
    check(gql('''mutation($id: ID!, $t: [String!]!) { tagsAdd(id: $id, tags: $t) { userErrors { field message } } }''',
              {'id': pid, 't': tags}), 'tagsAdd')
for pid, tags in tag_removes:
    check(gql('''mutation($id: ID!, $t: [String!]!) { tagsRemove(id: $id, tags: $t) { userErrors { field message } } }''',
              {'id': pid, 't': tags}), 'tagsRemove')
for item in rule_updates:
    check(gql('''mutation($c: CollectionInput!) { collectionUpdate(input: $c) { userErrors { field message } } }''',
              {'c': item}), 'collectionUpdate')
if new_collections:
    online_store = next(p['id'] for p in gql('{ publications(first: 20) { nodes { id name } } }')['publications']['nodes']
                        if p['name'] == 'Online Store')
    for item in new_collections:
        result = gql('''mutation($c: CollectionInput!) { collectionCreate(input: $c) {
            collection { id } userErrors { field message } } }''', {'c': item})
        check(result, 'collectionCreate')
        cid = result['collectionCreate']['collection']['id']
        check(gql('''mutation($id: ID!, $p: [PublicationInput!]!) { publishablePublish(id: $id, input: $p) {
            userErrors { field message } } }''', {'id': cid, 'p': [{'publicationId': online_store}]}), 'publishablePublish')
for pid, fills in price_updates:
    check(gql('''mutation($p: ID!, $v: [ProductVariantsBulkInput!]!) { productVariantsBulkUpdate(productId: $p, variants: $v) {
        userErrors { field message } } }''', {'p': pid, 'v': fills}), 'productVariantsBulkUpdate')
print('Applied.')
