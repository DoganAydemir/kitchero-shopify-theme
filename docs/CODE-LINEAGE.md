# Code lineage

Where Kitchero's code comes from, for the Theme Store originality review
(audit #79). Shopify's rule: Skeleton is the only approved codebase for
Theme Store development; otherwise themes must be fully original code, and
themes built on or derived from Dawn or Horizon are not eligible.

## Foundation: Shopify Skeleton

Kitchero is built on [Shopify's Skeleton theme](https://github.com/Shopify/skeleton-theme)
(license notice: `assets/skeleton-theme.LICENSE.txt`). These files come from
Skeleton and are extended for Kitchero:

| File | From Skeleton | Kitchero additions |
|---|---|---|
| `layout/theme.liquid` | Head order: inlined CSS variables, font preconnect and preload, preloaded `critical.css`, `base.css`, `meta-tags`, `content_for_header` | Section groups, cart drawer, search overlay, consultation drawer, loader, motion loader, structured data |
| `layout/password.liquid` | Same head order and body structure | Skip link, accessibility strings |
| `assets/critical.css` | The whole file: reset, body flex layout, media defaults, form and dialog colors, text wrapping, block container utilities | Body font, font scale, sticky footer for `main` |
| `snippets/css-variables.liquid` | Inlined `{% style %}` with `font_face` declarations and the root variables used by `critical.css` (`--font-primary--*`, `--page-width`, `--page-margin`, `--color-background`, `--color-foreground`, `--style-border-radius-inputs`) | Color scheme tokens and `--kt-*` design tokens |
| `snippets/meta-tags.liquid` | Open Graph, product structured data and price, Twitter card, title, canonical and description tags | Default share image and sizing, robots rules, locale tags, hreflang, product and article tags, extra JSON-LD, favicon and theme color |

Skeleton lines still present in Kitchero (lines of 12+ characters,
`lineage_report.py --kept`):

| File | Skeleton lines kept |
|---|---:|
| layout/theme.liquid | 18 of 28 (64%) |
| layout/password.liquid | 10 of 11 (90%) |
| assets/critical.css | 56 of 56 (100%) |
| snippets/meta-tags.liquid | 33 of 56 (58%) |
| snippets/css-variables.liquid | 2 of 14 (14%; Skeleton's setting names differ) |

Everything else (88 sections, 52 snippets, all other CSS and JavaScript,
templates, locales and settings) was written for Kitchero.

## No Dawn or Horizon code

`lineage_report.py` counts theme lines (25+ characters, whitespace
normalized) that also appear in [Shopify/dawn](https://github.com/Shopify/dawn):

| File | Lines checked | Same file in Dawn | Anywhere in Dawn |
|---|---:|---:|---:|
| layout/theme.liquid | 269 | 2% | 2% |
| layout/password.liquid | 16 | 12% | 12% |
| snippets/meta-tags.liquid | 257 | 3% | 5% |
| snippets/pagination.liquid | 111 | 3% | 3% |
| assets/base.css | 591 | 4% | 4% |
| assets/global.js | 154 | 0% | 0% |
| templates/gift_card.liquid | 137 | 2% | 3% |
| sections/main-product.liquid | 510 | 5% | 6% |
| snippets/card-product.liquid | 209 | 0% | 0% |
| assets/product-form.js | 599 | 0% | 0% |
| assets/cart-drawer.js | 235 | 0% | 1% |
| assets/predictive-search.js | 215 | 0% | 0% |

The matching lines are platform idioms any Shopify theme writes the same
way, for example `{{ content_for_header }}`, the `fonts.shopifycdn.com`
preconnect, `{%- for block in section.blocks -%}`,
`{{ block.shopify_attributes }}`, `{%- if paginate.previous -%}` or single
CSS declarations such as `@media screen and (min-width: 750px)`.

Horizon: the theme has no `blocks/` folder or `@theme` block nesting, which
Horizon is built on, and none of its file or class names.

## History

- **April 2026:** the repository started from a scaffold that followed
  Dawn's file layout (`theme.liquid`, `password.liquid`, `meta-tags`,
  `pagination`, `base.css`, `global.js`).
- **April 18, 2026:** those files were rewritten with Skeleton's patterns
  ("Dawn divergence"): Kitchero tokens in a `css-variables`-style snippet,
  new settings schema, meta tags written from scratch.
- **October 25, 2026:** the foundation was moved onto Skeleton's own files
  (this document's first table), and the last Dawn-specific identifiers
  were renamed (`skip-to-content-link`, `field__input`,
  `localization-form.js`).

## Third-party code

| File | Source | License |
|---|---|---|
| Layouts, `critical.css`, `css-variables`, `meta-tags` | Shopify Skeleton theme | Shopify theme license (`assets/skeleton-theme.LICENSE.txt`) |
| assets/vendor-gsap.js, assets/vendor-scrolltrigger.js | GSAP 3.15.0 (GreenSock) | GreenSock Standard License (`assets/vendor-gsap.LICENSE.txt`) |
| assets/vendor-lenis.js | Lenis 1.3.21 | MIT (`assets/vendor-lenis.LICENSE.txt`) |
| Fonts | Inter, Playfair Display | SIL Open Font License |

## Re-running the check

```bash
git clone --depth 1 https://github.com/Shopify/dawn /tmp/dawn
git clone --depth 1 https://github.com/Shopify/skeleton-theme /tmp/skeleton
python3 .github/scripts/lineage_report.py . /tmp/dawn --name Dawn
python3 .github/scripts/lineage_report.py . /tmp/skeleton --name Skeleton --kept
```
