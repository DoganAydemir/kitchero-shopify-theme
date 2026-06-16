# AI Handoff — Kitchero Shopify Theme

> **Purpose.** Give this file to any AI assistant (Claude, etc.) opening this
> project on a new machine or account so it gets up to speed fast. It is the
> *orientation layer*: it points to the canonical rule files and records the
> hard-won lessons that aren't obvious from the code. **It does not replace
> `CLAUDE.md`** — read that for the binding rules.
>
> This file is `.md`, so `.shopifyignore` excludes it from every `shopify theme
> push`/`package`. It lives in git for humans + AI only and never ships to the
> storefront. Keep it that way.

---

## 0. Read these first (in order)

1. **`CLAUDE.md`** — the immutable project rules. Binding. Overrides everything.
2. **`PORT_PLAN.md`** — the porting roadmap + section mapping matrix. Read before
   starting a new area.
3. **`references/shopify-rules.md`** — Theme Check error quick-reference + Theme
   Store requirements. Read on demand.

This handoff = the glue + the gotchas. CLAUDE.md = the law.

---

## 1. What this project is

Porting a finished **Next.js 16 / React 19 / Tailwind 4** front-end theme
("**Kitchero**", a premium kitchen / cabinetry brand) into a professional,
**Theme-Store-ready Shopify OS 2.0 theme** built on **Shopify Skeleton** (the
approved 2025+ baseline for new submissions).

- **Visual source of truth** = the Next.js source. Never guess UI; read the
  source. (Its path is set in `CLAUDE.md` → "Project paths".)
- **Quality bar** = commercial Theme Store product. Zero tolerance for rejection
  signals. Every Shopify rule enforced strictly.
- Scale today: ~88 sections, ~44 snippets, ~168 assets, 5 locales.

## 2. How to talk to the user

- **Reply in TURKISH.** All conversational output is Turkish. Code, comments,
  commit messages, and docs stay in English.
- The user drives commits/deploys themselves (usually GitHub Desktop). **Do not
  commit or push unless explicitly asked.**
- Working style the user expects: **find the root cause, don't patch symptoms.**
  Verify before claiming something is fixed. If a test fails or a step was
  skipped, say so plainly.

## 3. The Skeleton rule (most important architectural constraint)

Everything must be traceable to **Shopify Skeleton conventions OR freshly
written for Kitchero — NEVER copied from Dawn or Horizon.** Any "ported from
Dawn / matches Dawn / Dawn's X does Y" reference is a Theme Store rejection
signal. Our CSS namespace is `kt-*` (BEM), never Dawn's `component-*`.

## 4. Non-negotiable rules (condensed — full text in CLAUDE.md)

- **OS 2.0 JSON templates** everywhere; Liquid templates only where JSON is
  impossible (`gift_card.liquid`).
- **No Tailwind in output.** Translate the Tailwind design into plain vanilla
  CSS, BEM, `kt-` prefix. One file per section: `assets/kt-section-<slug>.css`
  / `.js`, loaded from inside that section.
- **Vanilla JS, no build step.** Custom elements where reactivity is needed.
- **Every merchant/customer-visible string is translatable** via `{{ 'key' | t }}`.
  Keys live in `locales/*.json` (storefront) and `locales/*.schema.json`
  (section schema). **`MatchingTranslations` is ENABLED** → a new key MUST be
  added to **all five** schema locales (en.default, tr, de, fr, es) or Theme
  Check fails. Reuse `t:sections.shared.*` keys where possible.
- **App blocks** (`{"type": "@app"}`) required in main-product, featured-product,
  header, footer, main-cart, main-search schemas.
- **Empty states**: every image setting must render a Shopify placeholder SVG
  (`{{ 'foo' | placeholder_svg_tag: 'placeholder-svg' }}`) when `== blank`.
- **JSON-LD** structured data is mandatory (`snippets/structured-data.liquid`).
- **All scripts `defer`.** No inline `<script>`/`<style>` (except passing Liquid
  vars to JS as a JSON config). **No Sass. Never minify source.**
- **Images**: `image_tag` with explicit `width`+`height` (CLS) and meaningful
  `alt` (empty only if decorative). Add `widths`/`sizes` for responsive.
- **Routes**: always `{{ routes.* }}`, never hardcoded paths (multi-language).
- **Forms**: proper `{% form %}` blocks; unique `id` + `<label for>` + `name` +
  `autocomplete`; radio/checkbox groups in `<fieldset><legend>`.
- **Theme-editor compatibility**: anything that inits on load (sliders,
  carousels, accordions, drawers, countdowns) must also init on
  `shopify:section:load`, clean up on `shopify:section:unload`, react to
  `shopify:block:select`. Test every interactive section in the editor.
- `{% render %}` only — never `{% include %}`.
- Works with JS disabled for basic flows (nav, ATC submit, forms POST).
- **Never parse/capture `content_for_header`.** Never `robots.txt.liquid`.
- **Never minify/delete the vendor motion JS** (`vendor-lenis.js`,
  `vendor-gsap.js`, `vendor-scrolltrigger.js`) — flagged as breaking site
  effects (memory R24).

## 5. Branches & deploy model (READ — non-standard on purpose)

- **`main`** = canonical CODE branch. All code/docs changes go here.
  **If you're about to change code and you're not on `main`, switch first** (the
  user has reminded us of this repeatedly).
- **`demo`** = live-content backup branch with an **INVERTED `.shopifyignore`**
  (see §6). Its job: `shopify theme pull` brings the *live store's content*
  (templates/*.json, settings_data.json, section-group JSONs) down so it's
  version-controlled. Expect a predictable `.shopifyignore` conflict on every
  "update from main" into demo — that divergence is INTENTIONAL, don't "fix" it.
- **Live test store**: `kitchero-4zilkgr1.myshopify.com` — theme
  **`kitchero-1-0-0`** (id **`157491101743`**), role `[live]`. Storefront is
  password-protected (so `curl` hits `/password`; pull assets via
  `shopify theme pull --theme 157491101743 --only <path> --path /tmp/...` to
  inspect what's actually deployed).
- The user deploys; you don't push unless explicitly told. CLI pushes to the
  test store with `--allow-live` have been authorized *only when the user asks*,
  per-action.

## 6. `.shopifyignore` strategy (branch-specific)

- **On `main`**: these are ACTIVE (ignored on push) so a code push never wipes
  merchant content → `templates/*.json`, `config/settings_data.json`,
  `sections/*-group.json`.
- **On `demo`**: inverted — CODE is ignored (`assets/*`, `snippets/*`, `layout/*`,
  `locales/*`, `sections/*.liquid`, `config/settings_schema.json`) and the
  content patterns are commented out so `shopify theme pull` captures full live
  content.
- Always-ignored (Theme-Store ban-list, both branches): `*.md`, `docs/*`,
  `references/*`, `.github/*`, dotfiles, `node_modules`, `*.zip`, `.shopify/*`.
- **Before `shopify theme package` (submission zip)**: temporarily comment out
  the three content patterns so the zip contains templates + settings_data +
  section-groups, generate, verify, then restore. (Full flow in the
  `.shopifyignore` header.)

## 7. Conventions & shared tokens

- **File naming**: kebab-case. Sections: `main-*` for template-bound, plain names
  for reusable (`hero.liquid`). CSS `assets/kt-section-<slug>.css`, snippet/global
  `assets/kt-<name>.css`. JS mirrors.
- **Color**: prefer the native `color_scheme` setting tied to a
  `color_scheme_group`. Scheme CSS vars: `--kt-c-bg`, `--kt-c-fg`,
  `--kt-c-fg-muted`, `--kt-c-action`, `--kt-c-action-text`, `--kt-c-accent`.
  Raw palette tokens: `--kt-stone-50 … --kt-stone-950`, `--kt-white`.
- **Layout**: page container max-width is `--kt-page-max` (1500px) via the
  `.page-width` class. Inter-section vertical rhythm is handled globally by
  `.section + .section { margin-top: var(--kt-gap-sections-m/d) }` in `base.css`
  — a section only gets auto-spacing if its schema `class` includes the
  standalone `section` token.
- **Schema order**: layout/content → typography → colors → spacing/padding.
  Group with `{"type":"header"}` separators.
- **Accessibility**: keyboard-reachable, visible focus rings (never
  `outline:none`), native elements over ARIA, forced-colors support on
  swatches/badges/dividers.
- **Verify** any change with: `shopify theme check --fail-level error`
  (must report **0 offenses**). Run before declaring done.

## 8. Hard-won lessons / recurring gotchas (the gold)

These cost real debugging time. Honor them.

1. **Full-cover photo sections must use a FIXED dark backdrop, not `--kt-c-bg`.**
   A cover photo rendered at reduced opacity over a scheme-driven `--kt-c-bg`
   washes out to light-grey on light color schemes. Pin the backdrop to
   `--kt-stone-900`. Already fixed: `banner-cover`, `financing-panel` (the latter
   keeps a light frame only for the empty/placeholder state via
   `:has(.placeholder-svg)`). **Exception:** `home-financing` is *intentionally*
   scheme-adaptive (its photo blends into whatever scheme surface) — do NOT pin
   it dark or the "hard middle edge" the user reported returns.

2. **`background-attachment: fixed` + `-webkit-background-clip: text` is broken
   in Chrome** — the fixed layer doesn't paint across all glyphs, shearing the
   trailing letters. Use `background-attachment: scroll`. (parallax-cta.)

3. **Display headlines wider than the container get clipped** by the section's
   `overflow:hidden`. A `13vw` headline inside the 1500px `.page-width` cap
   overflows on wide screens. Fix: break the headline out of the cap
   (`width: 90vw; margin-left: 50%; transform: translateX(-50%)`). (parallax-cta
   "O harfi kesik".)

4. **Full-bleed heroes (hero, banner-hero, video-bg-hero, slider-cinematic-hero,
   slider-editorial-split) deliberately omit the standalone `.section` class** so
   they sit flush at page top. When a merchant stacks them on a showcase page
   they touch. Solution shipped: a **`Spacer` section**
   (`sections/spacer.liquid`, separate mobile/desktop height + optional divider)
   — insert it between stacked flush sections.

5. **Theme-editor scroll jump.** `ScrollTrigger.refresh()` on
   `shopify:section:load` re-pins everything and the editor viewport jumps. Use
   `Kitchero.safeScrollTriggerRefresh()` (in `global.js`) which preserves scroll
   position in `design_mode`. Smooth-scroll (Lenis) is already disabled in
   `design_mode`.

6. **Policy pages.** Shopify renders the policy template inside its own fixed
   `shopify-policy__container` markup and *bypasses* a custom section. Style
   `.shopify-policy__container` directly in `base.css` — don't build a
   `main-policy` section expecting it to render.

7. **"Sold out" on a product is almost never the theme.** The theme reads
   Shopify's canonical `current_variant.available` (main-product.liquid + 
   snippets/product-form.liquid). If a product shows sold out: it's Shopify
   inventory config. Most common on this multi-location store: **stock sits at a
   location that doesn't fulfill Online Store orders** while the fulfilling
   location is 0 → Shopify reports sold out even with "Continue selling" on.
   Fix in Admin (stock the online-fulfilling location / Settings → Locations),
   not in code. Also: the storefront edge-caches per full URL — test with a
   *brand-new* query param, not a reused one.

8. **Locale keys** — adding any `t:` key means editing **all 5** `*.schema.json`
   (and `*.json` for storefront strings) because `MatchingTranslations` is on.
   Turkish gets real translation; de/fr/es may carry English placeholders
   (translation is a post-port task, but the keys must exist in every file).

9. **Viewport meta** sets `maximum-scale=1` to stop iOS Safari zoom-on-focus
   (`layout/theme.liquid`).

## 9. Languages

5 locales: **EN (default), TR, DE, FR, ES.** Arabic/RTL was cancelled. The i18n
*structure* must be correct everywhere (t-filter + keys in all locale files);
full translation of de/fr/es is a post-port task.

## 10. Current status (update this as you go)

Theme-Store polish / pre-submission phase. Core sections + product/collection/
cart/account flows are built and passing Theme Check. Active work: building demo
store content on the live test store, and planning customer-facing showcase
pages (e.g. a "Lookbook" grouping the slider + gallery variants — use real
customer-facing page names, never technical ones like "Sliders"). `theme_support_
email` and the policy/legal pages are in scope for submission.

---

*When you finish a meaningful chunk, update §10 so the next session (or the next
AI) starts oriented.*
