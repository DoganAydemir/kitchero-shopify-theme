"""Author name on demo blog articles (2 Nov review).

The demo articles showed the staff account's personal name as the author.
This sets a brand author name on every article of every blog.

Usage: SHOP=... TOKEN=... python3 demo_article_author.py [--apply]
"""
import json
import os
import sys
import urllib.request

SHOP = os.environ['SHOP']
TOKEN = os.environ['TOKEN']
APPLY = '--apply' in sys.argv
AUTHOR = 'Kitchero Editorial'
BASE = f'https://{SHOP}/admin/api/2025-01'


def call(method, path, body=None):
    req = urllib.request.Request(BASE + path, method=method, data=json.dumps(body).encode() if body else None,
                                 headers={'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOKEN})
    try:
        with urllib.request.urlopen(req) as res:
            return res.status, json.load(res)
    except urllib.error.HTTPError as e:
        return e.code, {'error': e.read().decode()[:300]}


status, blogs = call('GET', '/blogs.json')
if status != 200:
    raise SystemExit(f'blogs.json: {status} {blogs}')
print('| Blog | Article | Old author | New author | Result |')
print('| - | - | - | - | - |')
for blog in blogs['blogs']:
    status, data = call('GET', f"/blogs/{blog['id']}/articles.json?limit=250&fields=id,title,author")
    if status != 200:
        print(f"| {blog['title']} | | | | {status} {data} |")
        continue
    for article in data['articles']:
        result = 'planned'
        if article['author'] == AUTHOR:
            result = 'already set'
        elif APPLY:
            s, r = call('PUT', f"/blogs/{blog['id']}/articles/{article['id']}.json", {'article': {'id': article['id'], 'author': AUTHOR}})
            result = 'ok' if s == 200 and r['article']['author'] == AUTHOR else f'{s} {r}'
        print(f"| {blog['title']} | {article['title']} | {article['author']} | {AUTHOR} | {result} |")
