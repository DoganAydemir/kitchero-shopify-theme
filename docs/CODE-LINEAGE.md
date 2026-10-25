# Code lineage

This note records where Kitchero's code comes from, for the Theme Store
originality review (audit #79). Shopify does not accept new themes built on or
derived from Dawn or Horizon.

## History

- **2026-04-13 (`91e1db1`):** the repository started from a scaffold modeled
  on Dawn's file layout: `layout/theme.liquid`, `layout/password.liquid`,
  `snippets/meta-tags.liquid`, `snippets/pagination.liquid`, a small
  `assets/base.css` and `assets/global.js`. At that commit the head of
  `layout/theme.liquid` matched Dawn's almost line for line and
  `snippets/meta-tags.liquid` was Dawn's file.
- **Since then (1,000+ commits):** every one of those files was rewritten for
  Kitchero's own design system (`kt-` prefixed classes, `--kt-*` tokens,
  scheme-based colors, motion loader, section-scoped assets). All 91 sections,
  51 snippets and the remaining assets were written for this theme.

## Similarity check (2026-10-25)

`.github/scripts/lineage_report.py` compares each theme file with the matching
file in [Shopify/dawn](https://github.com/Shopify/dawn) (`main`). It ignores
blank lines, braces and short lines (under 25 characters), then counts theme
lines that also appear anywhere in Dawn.

| File | Lines checked | Shared with Dawn, first commit | Shared with Dawn, today |
|---|---:|---:|---:|
| layout/theme.liquid | 358 | 95% | 3% |
| layout/password.liquid | 82 | 96% | 9% |
| snippets/meta-tags.liquid | 300 | 100% | 3% |
| snippets/pagination.liquid | 111 | 51% | 3% |
| assets/base.css | 591 | 37% | 4% |
| assets/global.js | 154 | 30% | 0% |
| templates/gift_card.liquid | 137 | 17% | 3% |
| sections/main-product.liquid | 510 | — | 5% |
| snippets/card-product.liquid | 209 | — | 0% |
| assets/product-form.js | 599 | — | 0% |
| assets/cart-drawer.js | 235 | — | 0% |
| assets/predictive-search.js | 215 | — | 0% |

The remaining shared lines are platform idioms that any Shopify theme writes
the same way: `<link rel="canonical" href="{{ canonical_url }}">`, the
`fonts.shopifycdn.com` preconnect, `{%- for block in section.blocks -%}`,
`{{ block.shopify_attributes }}`, `{%- if paginate.previous -%}`, standard
`og:type` assignments, `@media screen and (min-width: 750px)` and similar
single CSS declarations.

Dawn-specific identifiers that survived the rewrite were renamed on
2026-10-25: `skip-to-content-link` → `kt-skip-link`, `field__input` →
`kt-field__input`, `localization-form.js` → `kt-localization-form.js`.

## Horizon

No Horizon code: the theme uses no theme blocks (`blocks/`), no `@theme` /
`@app` block nesting patterns from Horizon, and none of its file or class
names (checked with `grep -ri horizon`; the only hits are the word
"horizontal" and Lenis' `isHorizontal`).

## Third-party code

| File | Source | License |
|---|---|---|
| assets/vendor-gsap.js, assets/vendor-scrolltrigger.js | GSAP 3.15.0 | GSAP Standard "No Charge" License |
| assets/vendor-lenis.js | Lenis | MIT |

## Re-running the check

```bash
git clone --depth 1 https://github.com/Shopify/dawn /tmp/dawn
python3 .github/scripts/lineage_report.py . /tmp/dawn          # today
python3 .github/scripts/lineage_report.py . /tmp/dawn --commit 91e1db1 --show
```
