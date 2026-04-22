# R12 Pending Refactors — 2 remaining Theme-Store-blocker REJECT items

> **Purpose:** Self-contained handoff for the next session. Two R12-Agent REJECT findings were too invasive to land in the audit cleanup session and need their own dedicated attention with testing. This doc is everything the next session needs to resume cold.
>
> **Author context:** R1-R12 audit session completed 2026-04-22. 18 REJECT-severity fixes landed across 6 commits. The two items below were deferred because they touch many files and risk visual / perf regressions that need visual QA after the change.
>
> **Status — 2026-04-22:** Both DEFERRED. Theme Check 151 files / 0 offenses maintained.

---

## Item A — Section Wrapper Double-Layer (62+ sections)

### The bug

Every section that has `"tag": "section"` in its schema AND opens an inline `<section>` as the root element produces double-wrapped markup:

```html
<section id="shopify-section-X" class="section">   <!-- Shopify auto-wrapper from schema -->
  <section class="kt-hero" data-section-id="X">    <!-- Our inline root -->
    ...
  </section>
</section>
```

Two `<section>` landmarks around the same content:
- Confuses WCAG 1.3.1 document outline — SRs announce "section, section" nested
- Axe-core flags via `landmark-unique`
- Theme Store reviewers flag double-wrap patterns from Dawn-era themes

### Count

`grep -l '"tag": "section"' sections/*.liquid | wc -l` returns **69**. Not every one has an inline `<section>` root (a handful use `<div>`, `<article>`), so the REAL double-wrap count is ~60-65. Verify per section before changing.

### Full file list (69 sections)

```
announcement-banner, banner-cover, banner-hero, banner-minimal, banner-split,
before-after, brands, collapsible-accordion, collapsible-minimal,
collapsible-visual, contact-form, deals-grid, ecosystem, featured-product,
financing-calculator, financing-cta, financing-panel, financing-partners,
gallery-focus-wall, gallery-marquee, gallery-stack, guide-teaser, hero,
home-financing, how-it-works, image-with-text-alternating,
image-with-text-overlay, image-with-text-parallax, list-collections-grid,
main-404, main-account, main-activate-account, main-addresses, main-article,
main-blog, main-cart, main-collection, main-collection-drawer,
main-collection-vertical, main-login, main-order, main-page, main-password,
main-product, main-product-showroom, main-register, main-reset-password,
main-search, mid-cta, newsletter-signup, page-header-dotted, ready-to-begin,
related-products, shop-categories, shop-color, shop-the-look,
slider-cinematic-hero, slider-drag-carousel, slider-editorial-split,
testimonials, testimonials-marquee, testimonials-pullquote, trust-bar,
video-bg-hero, video-poster-modal, video-split-modal, visualize-studio,
why-choose-us, why-choose-us-product
```

### Strategy decision (RECOMMENDED: Option 1)

**Option 1 — Change schema `"tag"` to `"div"`, keep inline `<section>`**

```json
{
  "name": "...",
  "tag": "div",   // was "section"
  "class": "section",
  ...
}
```

Result:
```html
<div id="shopify-section-X" class="section">       <!-- Shopify wrapper now neutral -->
  <section class="kt-hero" data-section-id="X">    <!-- Our inline landmark kept -->
    ...
  </section>
</div>
```

- Pro: Single `<section>` landmark per section (semantic correctness)
- Pro: CSS selectors targeting `.shopify-section` or `#shopify-section-X` still work — Shopify's wrapper just changes from `<section>` to `<div>` element
- Pro: Theme's own `<section class="kt-X">` is the landmark merchants and reviewers see in DevTools — consistent mental model
- Con: 62-69 file schema edits (all cosmetic, no behavior change)
- Risk: zero CSS selector regressions (verified; no CSS uses `section.shopify-section`)

**Option 2 — Remove inline `<section>` from Liquid, let Shopify wrap**

Rejected because:
- 62+ Liquid body changes PLUS CSS selector audit (every `.kt-hero`, `.kt-banner-hero` class on the root would need re-scoping if the root HTML element changes semantics)
- Higher regression surface — each section's CSS was authored against `<section class="kt-X">` root; switching to `<div>` may affect CSS resets and first-child selectors
- Loses explicit semantics in theme source code (merchants/devs see `<div>` in Liquid instead of the meaningful `<section>`)

### Execution plan (Option 1)

1. **Batch by template family** so testing is manageable:
   - Batch A (15 files): all `main-*.liquid` sections. Every template renders one; load each template and spot-check the DOM.
   - Batch B (20 files): hero / banner / testimonial / gallery family (high-visibility home sections).
   - Batch C (rest): remaining 30+ reusable sections.

2. **For each file**, the edit is literal:
   ```json
   "tag": "section"   →   "tag": "div"
   ```
   Some sections have `"tag":"section"` on its own line, others inline. Safe to use `replace_all` within a single file because each schema has at most one `tag` key.

3. **Verification per batch:**
   - `shopify theme check` must stay 0 offenses
   - Visually load 2-3 pages from the batch in the theme editor
   - DevTools → confirm the Shopify wrapper is `<div id="shopify-section-X">` and the landmark is the inner `<section class="kt-X">`
   - Quick axe-core scan for `landmark-unique` regressions

4. **Commit style:** one commit per batch with commit msg like:
   ```
   a11y(sections): single-landmark refactor batch A — main-* templates
   ```

### Edge cases to watch

- `sections/main-page.liquid` already has this pattern but might be fine; look at its inline root tag
- Any section that renders `app_block` slots at the top level — confirm wrapper change doesn't break CSS contracts with app blocks
- `page-header-dotted.liquid` — used as a header pattern, may render inside another section

### Estimated effort

- ~60 files × ~1 minute per edit = 1 hour of edits
- ~30 minutes verification (theme check + 3 pages visual QA)
- **Total: ~1.5-2 hours** across 3 batched commits

---

## Item B — PDP CSS Waterfall (6 parser-blocking requests)

### The bug

`sections/main-product.liquid:1-6` emits 6 separate `stylesheet_tag` calls at the top:

```liquid
{{ 'kt-section-main-product.css' | asset_url | stylesheet_tag }}
{{ 'kt-product-gallery.css' | asset_url | stylesheet_tag }}
{{ 'kt-product-price.css' | asset_url | stylesheet_tag }}
{{ 'kt-product-variant-picker.css' | asset_url | stylesheet_tag }}
{{ 'kt-product-form.css' | asset_url | stylesheet_tag }}
{{ 'kt-product-accordion.css' | asset_url | stylesheet_tag }}
```

All 6 are parser-blocking. On 4G mobile that's 6 sequential round-trip stalls before first paint. PDP is directly in Lighthouse's Theme-Store scoring path (target: 60+ Performance).

### Related files with same anti-pattern

- `main-product.liquid`: 6 calls
- `main-product-showroom.liquid`: 4 calls
- `main-collection.liquid`: 3 calls
- `main-cart.liquid`: 1 call (fine)

Home page (templates/index.json) accumulates ~14 stylesheet requests across its sections — same general problem but harder to consolidate cleanly because each home section is independently added/removed by merchants.

### Strategy decision (RECOMMENDED: Option 2)

**Option 1 — Concat into `kt-pdp.css` / `kt-collection.css`**

- Pro: Single parser-blocking request per template
- Pro: Better caching (one big file, hit once on first PDP visit)
- Con: Larger first-load for PDP even when customer doesn't use all features (e.g. accordion CSS downloads even if merchant hides accordion)
- Con: Future section-level updates require regenerating the concat bundle

**Option 2 — `media="print" onload` async swap pattern (RECOMMENDED)**

Same pattern already used in `layout/theme.liquid:265-278` for cart-drawer + search-overlay CSS:

```liquid
<link
  rel="stylesheet"
  href="{{ 'kt-product-accordion.css' | asset_url }}"
  media="print"
  onload="this.media='all'"
>
<noscript>
  <link rel="stylesheet" href="{{ 'kt-product-accordion.css' | asset_url }}">
</noscript>
```

- Pro: Preserves the per-section CSS file split (good for caching + dev ergonomics)
- Pro: No file regeneration / build step added
- Pro: Keep `kt-section-main-product.css` + `kt-product-gallery.css` as eager (critical for LCP of gallery), defer the rest
- Pro: Theme-Store-approved pattern (Shopify docs + used by Dawn for non-critical CSS)
- Con: `onload` inline handler is minor CSP fragility (same as existing pattern — not a new concern)

### Which 6 PDP CSS files are critical vs deferrable

Looking at above-fold PDP content:
- `kt-section-main-product.css` (layout grid) → **eager** (used everywhere above the fold)
- `kt-product-gallery.css` → **eager** (main image is LCP candidate)
- `kt-product-price.css` → **eager** (prominently displayed near title)
- `kt-product-variant-picker.css` → **eager** (swatches visible above fold)
- `kt-product-form.css` → **eager** (ATC button is above fold and styled via this)
- `kt-product-accordion.css` → **deferrable** (description accordion is usually below fold)

Conservative first pass: defer only `kt-product-accordion.css` (1 file → saves 1 round-trip on 4G). Measure LCP impact.

If that's not enough, second pass: defer `kt-product-variant-picker.css` but add a fallback `color-scheme` inline critical CSS for first-paint swatch placeholder to avoid FOUC.

### Execution plan

1. **Phase 1 — Defer accordion on PDP:**
   ```liquid
   {# Critical above-fold #}
   {{ 'kt-section-main-product.css' | asset_url | stylesheet_tag }}
   {{ 'kt-product-gallery.css' | asset_url | stylesheet_tag }}
   {{ 'kt-product-price.css' | asset_url | stylesheet_tag }}
   {{ 'kt-product-variant-picker.css' | asset_url | stylesheet_tag }}
   {{ 'kt-product-form.css' | asset_url | stylesheet_tag }}

   {# Below-fold — async #}
   <link rel="stylesheet" href="{{ 'kt-product-accordion.css' | asset_url }}"
         media="print" onload="this.media='all'">
   <noscript><link rel="stylesheet" href="{{ 'kt-product-accordion.css' | asset_url }}"></noscript>
   ```

2. **Phase 2 — Measure:**
   - Lighthouse PDP before/after. Target: LCP ≥ 200ms improvement, CLS unchanged.
   - Visual regression: load a PDP with accordion open and accordion closed, confirm no FOUC on the accordion itself.

3. **Phase 3 — Apply same pattern to `main-product-showroom.liquid` and `main-collection.liquid`** if wins hold.

4. **Commit style:**
   ```
   perf(main-product): defer below-fold CSS via async swap pattern
   ```

### Edge cases

- Theme editor preview — async CSS can flash unstyled during editor hot-reload. Acceptable (editor ≠ production).
- App blocks on PDP — if an app block consumes any of the deferred CSS classes, it might render unstyled. Extremely unlikely (app blocks bring their own CSS) but worth a smoke test with one popular app installed.
- `shopify:section:load` — async `<link>` placed by Liquid may not re-execute `onload` handler on section rehydration. Test by editing the main-product section in the editor; confirm accordion styling stays intact.

### Estimated effort

- Phase 1: 15 minutes (3-file edit)
- Phase 2: 30 minutes (Lighthouse runs x 2 pre/post + visual check)
- Phase 3: 15 minutes
- **Total: ~1 hour for full rollout**

---

## After both items land

1. Re-run R12 Agent A (performance) to confirm CSS waterfall + variant JSON improvements reflect in Lighthouse numbers
2. Re-run R12 Agent B (a11y) to confirm landmark-unique axe score clean
3. Update `docs/THEME_STORE_FIXES.md` with R10-R12 summary + this doc's items closed
4. Push to GitHub, open PR for submission branch
5. Submit to Theme Store

## Session context required

When resuming, the next session should:

1. Read this file (`docs/R12_PENDING_REFACTORS.md`)
2. Read `CLAUDE.md` for project guardrails
3. Read `docs/THEME_STORE_FIXES.md` for prior-fix lineage
4. Check `git log --oneline -20` for the last ~20 commits — the most recent 6 are the R10-R12 audit landings (790bc82, e68bbae, 0eab215, 3cbe391, 1ce97d4, 1dd6f52)
5. Verify `shopify theme check` still passes (0 offenses on 151 files)

## Non-goals for the resumption session

- Do NOT start a new R13 audit round before these two items land. The backlog here is already known; adding more findings before working these down pushes the reject surface up.
- Do NOT touch the R12 WARN-level items that were left open (heading contrast, autoplay Pause button, empty-state fallbacks, visible_if coverage). Those can be a separate pass after the REJECTs close.
