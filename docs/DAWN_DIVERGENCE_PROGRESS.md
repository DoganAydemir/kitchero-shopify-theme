# Dawn Divergence — Progress Tracker

> **Purpose:** Session-safe resume log. If context window fills or session ends mid-work, read this file first to know exactly where to resume.
>
> **Branch:** `refactor/dawn-divergence`
> **Plan:** `docs/DAWN_DIVERGENCE_PLAN.md`
> **Started:** 2026-04-18

---

## How to resume after a session break

1. `cd /Users/macos/Documents/GitHub/kitchero-shopify-theme && git status && git log --oneline -10`
2. Read this file's **"Current state"** section → pick up at the first `[ ]` unchecked item.
3. If a priority is marked `🟡 IN PROGRESS`, read its **"In-progress notes"** sub-section for exact line/file state.
4. Full priority definitions + acceptance criteria live in `docs/DAWN_DIVERGENCE_PLAN.md`.

---

## Current state

**Active priority:** P3 (next)
**Last commit on branch:** (P2 commit — see below)

### Priority checklist

- [x] **P1** — Rewrite `layout/theme.liquid` token block ✅
- [x] **P2** — Rewrite `config/settings_schema.json` ✅
- [ ] **P3** — Rewrite `snippets/meta-tags.liquid`
- [ ] **P4** — Rewrite `snippets/pagination.liquid`
- [ ] **P5** — Rename `assets/global.js` utilities
- [ ] **P6** — Rename `component-*.css` (16 files)
- [ ] **P7** — Rename/consolidate `section-*.css` (86 files)
- [ ] **P8** — Restructure `locales/en.default.json` (5 locales)
- [ ] **P9** — Namespace JS globals (`window.Kitchero`)
- [ ] **P10** — Section filename convention (decision-only)
- [ ] **Stretch** — Adopt `blocks/` directory + Theme Blocks
- [ ] **Verify** — `shopify theme check` → 0 offenses
- [ ] **Verify** — Manual visual regression walkthrough

---

## Per-priority log

### P1 — `theme.liquid` token block
**Status:** ✅ DONE
**Commit:** `e5676ef refactor(theme-liquid): replace Dawn token block with Kitchero tokens [P1]`
**Done:**
- Created `snippets/kt-css-variables.liquid` (Skeleton-style single render snippet with `{% doc %}` header).
- Moved font `@font-face`, color-scheme loop, `:root` tokens, `*`/`html`/`body` base rules out of `theme.liquid` into the new snippet.
- Renamed **every** design token from Dawn to `--kt-*` prefix. Mapping:
  - Colors: `--color-*` → `--kt-c-*` (bg, fg, action, action-alt, action-text, link, badge-{text,bg,border}, shadow, bg-gradient, bg-contrast, payment-terms-bg)
  - Fonts: `--font-*` → `--kt-f-*` (body-{family,style,weight,weight-bold,scale}, heading-{family,style,weight,scale}, accent-family)
  - Layout: `--page-width` → `--kt-page-max`; `--spacing-sections-*` → `--kt-gap-sections-*`; `--grid-{desktop,mobile}-*-spacing` → `--kt-gap-grid-{x,y}-{d,m}`
  - Buttons: `--buttons-*` → `--kt-btn-*`
  - Inputs: `--inputs-*` → `--kt-input-*`
  - Cards: `--product-card-*` → `--kt-pcard-*`; `--collection-card-*` → `--kt-ccard-*`
  - Media/drawer/badge: `--media-*` → `--kt-media-*`; `--drawer-*` → `--kt-drawer-*`; `--badge-corner-radius` → `--kt-badge-radius`
- Changed scheme selector from `.color-<id>` class to `[data-kt-scheme="<id>"]` attribute; set `data-kt-scheme` on `<body>` in `theme.liquid`.
- Python mass-rename applied 157 replacements across 60 files (sections/*, snippets/*, assets/*.css, layout/password.liquid).
- `shopify theme check`: **0 offenses** across 134 files.
**Acceptance criteria met:** grep for any Dawn token name (`--color-background`, `--buttons-radius`, `--page-width`, etc.) returns nothing in consumer files.

### P2 — `settings_schema.json`
**Status:** ✅ DONE (across 2 commits)
**Commits:** `25d3c90 dawn için bişeyler yapıldı 2` (schema/data/consumers) + follow-up locale-schema commit.
**Done:**
- Renamed 16 settings groups: `logo`→`kt_brand`, `colors`→`kt_colors`, `typography`→`kt_typography`, `layout`→`kt_layout`, `animations`→`kt_motion`, `buttons`→`kt_buttons`, `inputs`→`kt_inputs`, `cards`→`kt_product_cards`, `collection_cards`→`kt_collection_cards`, `media`→`kt_media`, `drawers`→`kt_drawers`, `badges`→`kt_badges`, `brand_information`→`kt_brand_info`, `social-media`→`kt_social`, `search_input`→`kt_search`, `cart`→`kt_cart`.
- Renamed ~60 setting IDs with `kt_` prefix (e.g. `buttons_radius`→`kt_btn_radius`, `page_width`→`kt_page_width`, `spacing_sections`→`kt_section_spacing`, `type_header_font`→`kt_heading_font`, `card_corner_radius`→`kt_pcard_radius`, `show_vendor`→`kt_pdp_show_vendor`, `color_schemes`→`kt_schemes` etc.).
- Renamed scheme `definition` IDs: `background`→`surface`, `text`→`text_primary`, `button`→`action`, `button_label`→`action_text`, `secondary_button_label`→`link_text`, `shadow`→`shadow_color`, `background_gradient`→`surface_gradient`. `role` block updated to match.
- Updated `config/settings_data.json` (pre-launch — no merchant data loss).
- Updated `kt-css-variables.liquid` to read `scheme.settings.surface` / `.text_primary` / `.action` / etc.
- Updated 12 Liquid/CSS/JS consumer files (theme.liquid, password.liquid, header, main-cart, main-collection{,-drawer,-vertical}, meta-tags, search-overlay, social-icons, structured-data).
- Updated all 5 locale schema files (en.default, tr, de, fr, es) with new group keys and inner setting IDs.
- `shopify theme check`: **0 offenses** across 134 files.
**Acceptance criteria met:** grep for Dawn-identical setting IDs returns nothing in consumer files.

### P3 — `meta-tags.liquid`
**Status:** ⏳ NOT STARTED
**Commit:** —

### P4 — `pagination.liquid`
**Status:** ⏳ NOT STARTED
**Commit:** —

### P5 — `global.js` utilities
**Status:** ⏳ NOT STARTED
**Commit:** —

### P6 — `component-*.css` rename
**Status:** ⏳ NOT STARTED
**Commit:** —

### P7 — `section-*.css` rename
**Status:** ⏳ NOT STARTED
**Commit:** —

### P8 — Locale restructure
**Status:** ⏳ NOT STARTED
**Commit:** —

### P9 — JS globals namespace
**Status:** ⏳ NOT STARTED
**Commit:** —

### P10 — Section filename convention
**Status:** ⏳ NOT STARTED
**Commit:** —

### Stretch — Theme Blocks
**Status:** ⏳ NOT STARTED
**Commit:** —

---

## Resume commands

```bash
cd /Users/macos/Documents/GitHub/kitchero-shopify-theme
git status
git log --oneline -10 refactor/dawn-divergence
cat docs/DAWN_DIVERGENCE_PROGRESS.md
```

Legend: ⏳ not started · 🟡 in progress · ✅ done · ⚠️ blocked
