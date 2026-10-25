"""Compare theme files with Dawn: shared non-trivial lines and 8-line shingles.

Usage: python3 lineage.py <theme root> <dawn root> [--commit <rev>]
"""
import glob
import os
import re
import subprocess
import sys

theme, dawn = sys.argv[1], sys.argv[2]
rev = sys.argv[sys.argv.index('--commit') + 1] if '--commit' in sys.argv else None


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
    'assets/global.js': 'assets/global.js', 'assets/base.css': 'assets/base.css',
    'snippets/meta-tags.liquid': 'snippets/meta-tags.liquid', 'snippets/pagination.liquid': 'snippets/pagination.liquid',
    'templates/gift_card.liquid': 'templates/gift_card.liquid', 'assets/cart-drawer.js': 'assets/cart-drawer.js',
    'assets/product-form.js': 'assets/product-form.js', 'snippets/card-product.liquid': 'snippets/card-product.liquid',
    'sections/main-product.liquid': 'sections/main-product.liquid', 'assets/predictive-search.js': 'assets/predictive-search.js',
}
print(f'{"file":34} {"theme lines":>11} {"shared w/ Dawn file":>19} {"shared w/ any Dawn":>18}')
for t_rel, d_rel in pairs.items():
    t_lines = norm_lines(read_theme(t_rel))
    if not t_lines:
        continue
    same = set(dawn_files.get(d_rel, []))
    a = sum(1 for l in t_lines if l in same)
    b = sum(1 for l in t_lines if l in dawn_all)
    print(f'{t_rel:34} {len(t_lines):>11} {a:>10} ({a*100//len(t_lines):>3}%) {b:>9} ({b*100//len(t_lines):>3}%)')
    if '--show' in sys.argv:
        for l in [l for l in t_lines if l in dawn_all][:8]:
            print('      ', l[:110])
