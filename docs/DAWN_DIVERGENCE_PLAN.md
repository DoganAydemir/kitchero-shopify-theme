# Dawn Divergence Plan

> **Goal:** Eliminate Dawn-derivative architectural patterns from Kitchero so a Theme Store reviewer running a diff against Dawn finds no smoking guns. Target: Dawn-derived code drops from **~25–30%** to **<5%**, concentrated only in unavoidable Shopify conventions.
>
> **Branch:** `refactor/dawn-divergence` (this branch).
>
> **Reference theme:** Shopify Skeleton at `/Users/macos/Documents/GitHub/skeleton` — modern, minimal, post-2024 patterns. NOT a full commerce theme; we adopt its **patterns**, not its content.
>
> **Dawn reference (to diverge FROM):** `/Users/macos/Documents/GitHub/dawn`.
>
> **Scope:** Architecture, schema, utility code, filenames, locale structure. Visual/UI layer is already clean (Kitchero's sections visually resemble the Next.js source, not Dawn).

---

## Current state audit — what's Dawn-derived

Based on the audit run 2026-04-18:

| Layer | Dawn-derived % | Risk |
|-------|---------------|------|
| Visible UI (sections, markup) | <5% | Low — Kitchero-original |
| CSS class names | <5% | Low — uses `.kt-*` prefix |
| Custom JS elements | 0% | Low — no `<product-form>` etc. |
| **`theme.liquid` token block** | ~90% | **High** |
| **`settings_schema.json`** | ~80% | **High** |
| **`snippets/meta-tags.liquid`** | 100% (byte-identical) | **High** |
| `snippets/pagination.liquid` | ~70% | Medium |
| `assets/global.js` utilities | ~60% | Medium |
| Locale hierarchy | ~18% | Medium |
| Asset filenames (`component-*.css`, `section-*.css`) | Dawn convention | Medium |
| Section filenames (`main-*.liquid`) | Dawn convention | Low |
| **Weighted overall** | **~25–30%** | **Medium** |

**Rejection analysis:** Theme Store's primary criterion is visual/UX resemblance to Dawn — Kitchero is clean there. But a reviewer reading `theme.liquid`, `settings_schema.json`, `meta-tags.liquid` side-by-side with Dawn will see obvious derivation. Priorities 1–4 address the strongest verbatim copies.

---

## Priority-ordered migration plan

### P1 — Rewrite `layout/theme.liquid` token block  🔴 HIGH

**Problem:** Lines 44–196 and 108–164 are near-verbatim ports of Dawn:
- Scheme loop emitting `.color-<id>` with `--color-background / --color-foreground / --color-button / --color-badge-*`
- `:root` design-token block with Dawn-exact names (`--page-width`, `--spacing-sections-desktop`, `--grid-desktop-vertical-spacing`, `--buttons-radius`, `--inputs-radius`, `--product-card-*`, `--collection-card-*`, `--media-padding`, `--drawer-border-*`)

**Target pattern:** Skeleton's `snippets/css-variables.liquid` — one `:root` block rendered inline via `{% style %}`, Kitchero-named tokens.

**Actions:**
- [ ] Create `snippets/kt-css-variables.liquid` modeled on Skeleton's `css-variables.liquid` (18 lines, single `{% style %}`, `--kt-*` prefix).
- [ ] Rename all design tokens: `--color-background` → `--kt-color-bg`, `--color-foreground` → `--kt-color-fg`, `--buttons-radius` → `--kt-btn-radius`, `--inputs-radius` → `--kt-input-radius`, `--page-width` → `--kt-page-max-width`, `--spacing-sections-desktop` → `--kt-section-gap`, etc.
- [ ] Replace scheme loop with Kitchero-specific scheme-rendering — different loop structure (e.g., emit `[data-kt-scheme="..."]` attribute selectors, not `.color-<id>` classes).
- [ ] Slim `theme.liquid` from ~340 lines toward Skeleton's 36-line target. Move all `<style>` content into the snippet.
- [ ] Preserve Theme Store requirements: `{{ content_for_header }}`, `{% sections 'header-group' %}`, `{% sections 'footer-group' %}`, structured-data, SEO meta.

**Acceptance:** `grep -E "(--color-background|--color-foreground|--buttons-radius|--inputs-radius|page-width)" layout/` returns nothing. Theme renders identically in editor + storefront.

---

### P2 — Rewrite `config/settings_schema.json` 🔴 HIGH

**Problem:** Group names (`logo`, `colors`, `typography`, `layout`, `animations`, `buttons`, `inputs`, `cards`, `collection_cards`, `media`, `drawers`, `badges`, `brand_information`, `social-media`, `search_input`, `cart`) mirror Dawn exactly. Setting IDs (`logo_width`, `body_scale`, `heading_scale`, `buttons_radius`, `card_corner_radius`, `drawer_border_thickness`) are Dawn-identical.

**Target pattern:** Skeleton's `settings_schema.json` — 83 lines, 3 groups (Typography, Layout, Colors). We won't go that minimal (we need more), but we'll restructure.

**Actions:**
- [ ] Regroup settings into Kitchero taxonomy: `brand`, `global_typography`, `global_spacing`, `global_colors`, `buttons_style`, `card_style`, `media_style`, `cart_behavior`, `search_behavior`, `social_links`. Avoid `logo`/`colors`/`typography`/`animations` single-word Dawn names.
- [ ] Rename all setting IDs: `buttons_radius` → `kt_button_radius`, `card_corner_radius` → `kt_card_radius`, `spacing_sections` → `kt_section_spacing`, `page_width` → `kt_page_width`, `logo_width` → `kt_brand_logo_width`, etc.
- [ ] Every setting that's also a design token: update `theme.liquid` reference (from P1) and every CSS consumer (`grep -l "settings.buttons_radius"` etc.)
- [ ] Update `locales/*.schema.json` keys accordingly.
- [ ] Keep `color_scheme_group` but rename to `kt_color_schemes` and change the `definition` keys (`background`/`text`/`button` → `surface`/`text_primary`/`action`). Value-level migration note required in commit.

**Acceptance:** `diff config/settings_schema.json /Users/macos/Documents/GitHub/dawn/config/settings_schema.json` shows zero identical lines longer than the `{`/`}` braces.

**⚠️ Migration risk:** Existing merchants using the theme lose their customizations when setting IDs change. Since we're pre-launch this is fine, but after first merchant install this must be stable.

---

### P3 — Rewrite `snippets/meta-tags.liquid` 🔴 HIGH

**Problem:** Byte-for-byte identical with Dawn's `snippets/meta-tags.liquid`. This is the single most damning file.

**Target pattern:** Skeleton's 105-line `meta-tags.liquid` uses `{{ product | structured_data }}` filter one-liner and has different OG/Twitter logic.

**Actions:**
- [ ] Full rewrite. Use Shopify's built-in `| structured_data` filter where possible (it handles Product, Article, Organization).
- [ ] Own OG tag ordering; own Twitter card variant choice (`summary_large_image` vs `summary`).
- [ ] Own canonical handling, own hreflang if multi-lang.
- [ ] Remove Dawn's `request.page_type` switch style; use a Kitchero-specific dispatch.
- [ ] Add `{% doc %}` LiquidDoc header (Skeleton convention) documenting parameters.

**Acceptance:** Byte-comparison with Dawn returns <20% overlap (only generic OG meta tags like `<meta property="og:type" content="website">`).

---

### P4 — Rewrite `snippets/pagination.liquid` 🟡 MEDIUM

**Problem:** Structurally a reskinned Dawn: same `previous`/`paginate.parts`/`next` loop, same `&hellip;` ellipsis, same `aria-label` strings. Classes renamed `pagination__*` → `kt-pagination__*` only.

**Target pattern:** Skeleton uses `{{ paginate | default_pagination }}` (built-in filter). Or rewrite with a different iteration strategy.

**Actions:**
- [ ] Evaluate `| default_pagination`: if acceptable styling, switch to it and drop the snippet entirely.
- [ ] Otherwise rewrite: use current_page ± 2 window instead of `paginate.parts`, different accessible-label strings, different marker for ellipsis.
- [ ] Move from `<nav>`/`<ul>`/`<li>` to a different semantic (e.g., `<nav>` + `<ol>` + `<a>` siblings) — subtle, but changes the DOM tree shape vs. Dawn.

**Acceptance:** Pagination visually works; DOM tree differs from Dawn's.

---

### P5 — Rename `assets/global.js` utilities 🟡 MEDIUM

**Problem:** `SectionId`, `HTMLUpdateUtility`, `trapFocus`, `removeTrapFocus`, `subscribe`/`publish` pub-sub, `shopify:section:load` bridge — identical names and semantics to Dawn's `global.js`.

**Target pattern:** Skeleton ships **zero JS** by default. We can't go that minimal (we have gallery, product form, drawers) but we can rename and reorganize.

**Actions:**
- [ ] Rename module: `assets/global.js` → `assets/kt-runtime.js`.
- [ ] Rename utilities:
  - `getFocusableElements` → `ktGetFocusableEls`
  - `trapFocus` / `removeTrapFocus` → `ktFocusTrap.enable` / `ktFocusTrap.disable`
  - `SectionId` → `KtSectionHelpers`
  - `HTMLUpdateUtility` → `KtDom`
  - `subscribe`/`publish` → `ktBus.on` / `ktBus.emit`
  - `PUB_SUB_EVENTS` → `KT_EVENTS`
- [ ] Move all globals into a single `window.Kitchero = { runtime, events, bus }` namespace.
- [ ] Update every consumer (grep all `.js` for old names).
- [ ] Add JSDoc `@typedef` headers to every public function (Skeleton documents via LiquidDoc — we do JSDoc since it's JS).

**Acceptance:** `grep -r "SectionId\|HTMLUpdateUtility\|trapFocus\|getFocusableElements\|PUB_SUB_EVENTS" assets/` returns nothing.

---

### P6 — Rename `component-*.css` (16 files) 🟡 MEDIUM

**Problem:** 16 files with `component-*` prefix — Dawn's signature naming convention. Skeleton doesn't use this prefix at all (CSS is inline `{% stylesheet %}` in each section/block).

**Actions (two strategies — pick one):**

**Strategy A — Rename only (low-risk):**
- [ ] Rename all 16 files `component-*.css` → `kt-*.css` (e.g., `component-card-product.css` → `kt-card-product.css`).
- [ ] Update all `{{ '...' | asset_url | stylesheet_tag }}` references.

**Strategy B — Inline into sections (Skeleton pattern, high-effort):**
- [ ] For each `component-*.css`, find its single consuming section (if 1:1), move content into `{% stylesheet %}` inside that section's `.liquid` file.
- [ ] If consumed by multiple sections, keep as `kt-shared-*.css`.
- [ ] Delete the `component-*.css` file.

**Recommendation:** Start with Strategy A (fast), consider Strategy B per-file where it makes sense.

**Acceptance:** `ls assets/ | grep "^component-"` returns nothing.

---

### P7 — Rename/consolidate `section-*.css` (86 files) 🟡 MEDIUM

**Problem:** 86 files with `section-*` prefix — Dawn convention. High-effort to rename all.

**Actions:**
- [ ] Rename prefix: `section-*.css` → `kt-section-*.css` OR `kt-*.css`. Batch-rename via `git mv`, then search-replace all `asset_url` references.
- [ ] Audit: any that are tiny (<30 lines) could be inlined into their section via `{% stylesheet %}`. Good candidates: section-newsletter-popup.css (already a popup, scoped), section-404.css, section-password.css.

**Recommendation:** Phase this. First batch: P6 files + top 10 largest section CSS files. Remaining 70 files: follow-up pass.

**Acceptance:** <30% of asset CSS files use `section-*` prefix.

---

### P8 — Restructure `locales/en.default.json` 🟡 MEDIUM

**Problem:** ~53 of 295 keys overlap with Dawn in path (and 35 in path+value). The hierarchy `sections.cart.*`, `products.product.*`, `accessibility.link_messages.*`, `localization.*`, `blogs.article.*` mirrors Dawn's structure.

**Actions:**
- [ ] Restructure into Kitchero-specific namespaces:
  - `products.product.add_to_cart` → `kt.pdp.actions.add_to_cart` (or similar)
  - `sections.cart.*` → `kt.cart.*`
  - `accessibility.link_messages.*` → `kt.a11y.link.*`
  - `localization.*` → `kt.locale.*`
  - `blogs.article.*` → `kt.blog.article.*`
  - `newsletter.*` → `kt.newsletter.*`
- [ ] **Leave standard Shopify namespaces** that customers expect (e.g., `general.password_page.login_form_password_label` if Shopify reads it). Audit each key — some Shopify runtime features read specific key paths.
- [ ] Repeat for all 5 non-default locales (tr, de, fr, es). Same structure.
- [ ] Global find-replace across all Liquid/JS files for `{{ 'products.product.xxx' | t }}` → `{{ 'kt.pdp.xxx' | t }}`.
- [ ] Target: <10 keys overlap with Dawn.

**Acceptance:** Dawn-overlap drops from 53 to <10. All UI strings still render.

---

### P9 — Namespace JS globals (`window.Kitchero`) 🟢 LOW

**Problem:** `theme.liquid:276–320` bootstraps `window.routes`, `window.cartStrings`, `window.variantStrings`, `window.accessibilityStrings` — Dawn's exact global surface.

**Actions:**
- [ ] Consolidate: `window.Kitchero = { routes, i18n: { cart, variant, a11y } }`.
- [ ] Update every JS consumer.
- [ ] Expose a small bridge for backward compat IF any third-party app depends on `window.routes` (unlikely).

**Acceptance:** `grep -r "window.routes\|window.cartStrings\|window.variantStrings\|window.accessibilityStrings" assets/` returns nothing.

---

### P10 — Section filename convention (optional) 🟢 LOW

**Problem:** `main-product.liquid`, `main-collection.liquid`, `main-cart.liquid`, etc. — Dawn convention (Skeleton uses single-word `product.liquid`, `collection.liquid`, `cart.liquid`).

**Decision:**
- **Option A — Keep `main-*` prefix.** It's a widely-used Shopify convention beyond Dawn, and renaming impacts every JSON template's `"type"` field.
- **Option B — Switch to Skeleton's single-word names.** More effort but further de-Dawns the theme.

**Recommendation:** **Keep `main-*`**. It's Shopify-standard, not Dawn-exclusive. A reviewer seeing `main-product.liquid` won't flag it unless content resembles Dawn (it doesn't).

**Acceptance:** Decision documented. If we change, all JSON templates updated.

---

## Stretch — adopt `blocks/` directory + Theme Blocks 🟢 LOW

**Why:** Skeleton's `blocks/` directory with `{% content_for 'blocks' %}` is the modern "theme blocks" pattern. Kitchero currently has zero files there. Adopting it signals modern architecture.

**Actions (optional, post-P1-P8):**
- [ ] Create `blocks/` directory with 3–5 reusable blocks modeled on Skeleton:
  - `blocks/kt-heading.liquid` (reusable headings)
  - `blocks/kt-text.liquid` (text block)
  - `blocks/kt-button.liquid`
  - `blocks/kt-image.liquid`
  - `blocks/kt-group.liquid` (container with nested `{% content_for 'blocks' %}`)
- [ ] Add `{% doc %}` LiquidDoc to each (Skeleton convention).
- [ ] Convert at least 1 section to pure `{% content_for 'blocks' %}` + `"blocks": [{"type": "@theme"}]` container pattern.
- [ ] This is nice-to-have — not a rejection risk, but a positive signal.

---

## Verification & testing gate

After each priority completes:

1. **`shopify theme check`** → 0 offenses (recommended ruleset).
2. **Theme editor walkthrough** — open home, collection, product (default + showroom), cart, search, blog, article, page, contact, 404, password. No visual regressions.
3. **Storefront render** via `shopify theme dev` — every page loads, no console errors.
4. **Manual Dawn diff check** — run `diff` against Dawn on the touched files; verify <10% overlap.
5. **Lighthouse CI** — run against the feature branch; perf/a11y/SEO thresholds still met.

---

## Commit strategy

One commit per priority. Commit message format:
- `refactor(theme-liquid): replace Dawn token block with Kitchero tokens [P1]`
- `refactor(settings-schema): regroup + rename Dawn-identical IDs [P2]`
- `refactor(meta-tags): rewrite from scratch (was byte-identical to Dawn) [P3]`
- etc.

**Do not squash.** Each commit is a discrete de-Dawn step reviewable in isolation.

---

## Success criteria

- [ ] **`theme.liquid`**: zero `--color-*`/`--buttons-*`/`--inputs-*`/`--page-width` variable names from Dawn.
- [ ] **`settings_schema.json`**: zero setting IDs verbatim from Dawn.
- [ ] **`snippets/meta-tags.liquid`**: <20% byte overlap with Dawn.
- [ ] **`snippets/pagination.liquid`**: DOM structure differs from Dawn.
- [ ] **`assets/global.js` (renamed)**: zero utility names from Dawn.
- [ ] **`locales/en.default.json`**: <10 keys overlap with Dawn.
- [ ] **Asset filenames**: <30% still use `component-*`/`section-*` prefix (or all renamed).
- [ ] **Theme Check**: 0 offenses.
- [ ] **Lighthouse**: perf ≥ 60, a11y ≥ 90, best-practices ≥ 90, SEO ≥ 90.
- [ ] **Dawn-derived percentage**: drops from ~25–30% → **<5%**.

---

## Execution order (recommended)

Day 1: P1 + P2 (highest risk, foundational). Day 2: P3 + P4 + P5. Day 3: P8 (locale restructure — high churn). Day 4: P6 + P7 (filename renames). Day 5: P9 + optional P10 + stretch Theme Blocks. Day 6: Verification + Lighthouse.

Each priority is independently commitable. If we lose context mid-way, the TodoWrite tracker + this doc resume the work.

---

## Out of scope (separate tasks)

- **AR (RTL) language support** — tracked in `PORT_PLAN.md`.
- **Real merchant customization migration** — pre-launch, no existing merchant data to preserve.
- **Dawn-derivative submission risk review** — post-divergence, consult Shopify Partner support if unsure.
- **Build pipeline / TypeScript** — explicitly out per `CLAUDE.md`.
