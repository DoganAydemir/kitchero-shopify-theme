"""Compare theme files with a reference theme (Dawn, Skeleton, ...).

Counts theme lines (25+ characters, whitespace-normalized) that also appear
in the matching reference file and anywhere in the reference theme. With
--kept, also reports how many lines of each Skeleton foundation file are
still present in the theme (12+ characters).

Usage: python3 lineage_report.py <theme root> <reference root> [--name Dawn]
                                  [--commit <rev>] [--show] [--kept]
"""
import glob
import os
import re
import subprocess
import sys

theme, dawn = sys.argv[1], sys.argv[2]
rev = sys.argv[sys.argv.index('--commit') + 1] if '--commit' in sys.argv else None
name = sys.argv[sys.argv.index('--name') + 1] if '--name' in sys.argv else 'reference'


def norm_lines(text):
    out = []
    for line in text.splitlines():
        line = re.sub(r'\s+', ' ', line).strip()
        if len(line) < 25:
            continue  # skip braces, short tags, blank lines
        if re.fullmatch(r'[{}()\[\];,<>/%\-\s"\'a-z]*', line):
            continue
        out.append(line)
    return out


def read_theme(rel):
    if rev:
        try:
            return subprocess.run(['git', '-C', theme, 'show', f'{rev}:{rel}'], capture_output=True,
                                  text=True, check=True).stdout
        except subprocess.CalledProcessError:
            return ''
    p = os.path.join(theme, rel)
    return open(p, encoding='utf-8', errors='ignore').read() if os.path.exists(p) else ''


dawn_all = set()
dawn_files = {}
for p in glob.glob(f'{dawn}/**/*', recursive=True):
    if os.path.isfile(p):
        rel = os.path.relpath(p, dawn)
        lines = norm_lines(open(p, encoding='utf-8', errors='ignore').read())
        dawn_files[rel] = lines
        dawn_all.update(lines)

pairs = {
    'layout/theme.liquid': 'layout/theme.liquid', 'layout/password.liquid': 'layout/password.liquid',
    'assets/kt-global.js': 'assets/global.js', 'assets/kt-base.css': 'assets/base.css',
    'snippets/meta-tags.liquid': 'snippets/meta-tags.liquid', 'snippets/pagination.liquid': 'snippets/pagination.liquid',
    'templates/gift_card.liquid': 'templates/gift_card.liquid', 'assets/kt-cart-drawer.js': 'assets/cart-drawer.js',
    'assets/kt-product-form.js': 'assets/product-form.js', 'snippets/product-card.liquid': 'snippets/card-product.liquid',
    'sections/main-product.liquid': 'sections/main-product.liquid', 'assets/kt-predictive-search.js': 'assets/predictive-search.js',
    'assets/critical.css': 'assets/critical.css', 'snippets/css-variables.liquid': 'snippets/css-variables.liquid',
}
print(f'{"file":34} {"theme lines":>11} {"same file in " + name:>22} {"anywhere in " + name:>22}')
for t_rel, d_rel in pairs.items():
    t_lines = norm_lines(read_theme(t_rel))
    if not t_lines:
        continue
    same = set(dawn_files.get(d_rel, []))
    a = sum(1 for l in t_lines if l in same)
    b = sum(1 for l in t_lines if l in dawn_all)
    print(f'{t_rel:34} {len(t_lines):>11} {a:>15} ({a*100//len(t_lines):>3}%) {b:>15} ({b*100//len(t_lines):>3}%)')
    if '--show' in sys.argv:
        for l in [l for l in t_lines if l in dawn_all][:8]:
            print('      ', l[:110])

if '--kept' in sys.argv:
    def short_lines(text):
        return [re.sub(r'\s+', ' ', l).strip() for l in text.splitlines() if len(re.sub(r'\s+', ' ', l).strip()) >= 12]
    print(f'\n{"foundation file":34} {name + " lines kept in theme":>28}')
    for rel in ('layout/theme.liquid', 'layout/password.liquid', 'assets/critical.css',
                'snippets/css-variables.liquid', 'snippets/meta-tags.liquid'):
        ref_path = os.path.join(dawn, rel)
        if not os.path.exists(ref_path):
            continue
        ref = short_lines(open(ref_path, encoding='utf-8', errors='ignore').read())
        mine = set(short_lines(read_theme(rel)))
        kept = sum(1 for l in ref if l in mine)
        print(f'{rel:34} {kept:>17}/{len(ref)} ({kept*100//max(1, len(ref)):>3}%)')
