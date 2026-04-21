# Shopify Theme Port — Claude Code Instructions

You are porting a finished Next.js 16 + React 19 + Tailwind 4 frontend theme
("Kitchero") into a professional, Theme-Store-ready Shopify theme based on
**Shopify Skeleton** (Shopify's approved modern baseline). This file contains
the immutable rules and conventions you must follow in every session.

## Project paths

- **Shopify theme repo (working directory):** `/path/to/shopify-theme`
- **Next.js source (visual truth):** `/Users/macos/Documents/GitHub/freemannyc-site-css-js-backups/kitchen theme`
- **Port roadmap & mapping matrix:** `PORT_PLAN.md` — always read this before starting a new phase or unfamiliar area
- **Shopify rules reference:** `references/shopify-rules.md` — read on demand when you hit Theme Check errors, section schema questions, or Theme Store requirements

## The Skeleton rule (critical)

Shopify Skeleton is the approved baseline for new Theme Store submissions
(Dawn/Horizon derivations are disqualified for new submissions per the 2025
requirements). Everything in this codebase must be traceable to Skeleton
conventions OR freshly written for Kitchero — NOT copied from Dawn.

- **You CAN use as reference:** Shopify's public docs, the Skeleton repo
  patterns (theme.liquid skeleton, settings_schema.json structure, the
  `{% form %}` / `{% paginate %}` / `{% section %}` Liquid tag patterns,
  asset pipeline conventions, locale key structure).
- **You CANNOT copy from Dawn:** any file, snippet pattern, CSS class, or
  code comment. Any reference to "ported from Dawn" / "Dawn's X does Y" /
  "matches Dawn" in source comments is a Theme Store rejection signal and
  must be scrubbed before submission.
- **Before finalizing any section, ask yourself:** "Does this visually
  resemble a Theme Store reference theme (Dawn, Horizon, etc.)?" If yes,
  redesign from the Next.js source.
- **Reason:** Shopify Theme Store rejects submissions that resemble any
  reference theme visually or in UX, and it rejects Dawn/Horizon-derived
  codebases outright. The Kitchero visual language is ours; the Shopify
  scaffolding follows Skeleton conventions.

## Must

- **OS 2.0 JSON templates** everywhere possible. Liquid templates only for `gift_card.liquid` (JSON not allowed) or when JSON is technically impossible.
- **Every section** must have a `{% schema %}` block with meaningful, merchant-editable settings. Defaults must match the Next.js source visual.
- **Every string** visible to merchants or customers must be translatable via `{{ 'key' | t }}`. Add the key to `locales/en.default.json` (and `locales/*.schema.json` for settings_schema strings).
- **App Block Support:** Main product, featured product, header, footer, and main cart sections MUST include `{"type": "@app"}` in their schema blocks so merchants can drop in app blocks. This is a strict Theme Store requirement.
- **Empty States (Placeholders):** All image settings must have fallback logic. If a merchant has not selected an image (`if section.settings.image == blank`), you MUST render Shopify's default SVG placeholders (e.g., `{{ 'hero-apparel-1' | placeholder_svg_tag: 'placeholder-svg' }}`). Never leave a blank or broken space when an image is missing.
- **SEO & Structured Data:** Implement valid JSON-LD structured data for SEO. You can copy the structured data logic from Dawn for Product, Article, Breadcrumb, and Organization. This is a mandatory Theme Store requirement.
- **All scripts** loaded with `defer` (never parser-blocking). Never use `<script>` without `defer` or `async` unless explicitly required (e.g., gtag bootstraps, and even then prefer defer).
- **All assets** (CSS/JS/fonts/images) must live in `assets/` and be referenced via `asset_url` / `stylesheet_tag` / `javascript_tag`. No external CDN imports (no Google Fonts CDN, no jsdelivr, no jQuery CDN). Exception: only Shopify-approved 3rd-party libraries (see references/shopify-rules.md if unsure).
- **All `<img>` tags** must use Shopify's `image_tag` filter with explicit `width` and `height` to prevent CLS. Every image must have a meaningful `alt` attribute (empty `alt=""` only for decorative images).
- **All forms** must use the proper Shopify form block: `{% form 'customer_login' %}`, `{% form 'create_customer' %}`, `{% form 'contact' %}`, `{% form 'product' %}`, etc. Every `<input>` needs a unique `id`, a matching `<label for>`, a `name` attribute, and an `autocomplete` attribute where applicable. Radio/checkbox groups use `<fieldset><legend>`.
- **All routes** (`/cart`, `/search`, `/account`, etc.) must use the `routes` object (e.g., `{{ routes.cart_url }}`), not hardcoded paths. Required for multi-language URL support.
- **Theme editor compatibility:** any JavaScript that initializes on load (sliders, carousels, accordions, drawers, countdowns, hotspots) must also initialize on `shopify:section:load`, cleanup on `shopify:section:unload`, and react to `shopify:block:select` where relevant. Test every interactive section in the editor before marking it done.
- **Use `{% render %}`** (never `{% include %}`) for snippets.
- **All sections, blocks, and snippets** should work with JavaScript disabled for basic functionality (navigation, add-to-cart should still submit, forms should still POST). JS is progressive enhancement.

## Never

- **Never parse or capture `content_for_header`.** Treat it as opaque. Do not try to read, rewrite, or reorder anything inside it. Shopify Theme Check will flag it; Theme Store rejects it.
- **Never write inline `<script>` or `<style>` tags** directly inside Liquid files unless strictly necessary for passing Liquid variables to JS (e.g., a JSON config object). All CSS must be in `.css` files, all JS in `.js` files.
- **Never use Sass/SCSS.** Theme Store bans Sass. Write plain CSS, one file per component or a main `base.css` + layered component files.
- **Never minify** your CSS or JS in source. Shopify serves them as-is. Minified source is grounds for rejection.
- **Never use deceptive UI:** fake countdown timers, fake stock counters, fake "5 people viewing" badges, fake reviews. The countdown in our Next.js source uses localStorage to persist a real end date — this is fine because it's a real offer timer backed by a product metafield. It is not "fake urgency" as long as the end date comes from actual merchant-editable data.
- **Never hardcode product IDs, collection IDs, or handles** in Liquid. Use `section.settings`, metafields, or dynamic sources.
- **Never copy CSS, markup, or comment text from Dawn or Horizon.** Our CSS and markup are ours. This includes the `component-*.css` naming pattern Dawn uses — keep to the `kt-*` BEM namespace.
- **Never use `{% include %}`** — deprecated. Always `{% render %}`.
- **Never create a `robots.txt.liquid` template.** Theme Store bans it.
- **Never create new accounts, post to external services, or share merchant data** — you are porting code, not operating a store.

## Coding conventions

- **File naming:** kebab-case for all Shopify filenames (`main-product.liquid`, `card-product.liquid`, `icon-arrow-right.liquid`). Snippet names should be descriptive: `product-price.liquid`, not `price.liquid`.
- **Section naming:** `main-*` for template-bound sections (one per template), plain names for reusable home/page sections (`hero.liquid`, `featured-collection.liquid`).
- **Schema:** keep settings grouped with `{"type": "header", "content": "Content"}` separators. Order: layout/content settings → typography → colors → spacing/padding.
- **Color settings:** use `color_scheme` type (Dawn pattern) not raw `color` where possible. This integrates with Shopify's color scheme system.
- **CSS class names (Crucial Tailwind Rule):** Do NOT output Tailwind utility classes in the Liquid files. You must translate the Tailwind design from the Next.js source into plain, vanilla CSS using the BEM methodology (e.g., `.kt-hero`, `.kt-hero__title`). The final Shopify theme will not have a Tailwind build step. Create component-specific CSS files (e.g., `assets/section-hero.css`) and load them only in the sections that need them via `{{ 'section-hero.css' | asset_url | stylesheet_tag }}`.
- **CSS custom properties:** scope to components, not `:root`, except for the design tokens (colors, fonts, spacing) that come from the theme settings.
- **JavaScript:** no framework, no build step (unless explicitly added later). Vanilla JS with custom elements where reactive behavior is needed. One file per interactive section: `assets/section-hero.js`, `assets/section-product-gallery.js`. Import them via `{{ 'section-hero.js' | asset_url | script_tag }}` with `defer`.
- **Accessibility:** every interactive element must be keyboard-reachable. Visible focus rings (not `outline: none`). ARIA only when native HTML isn't enough — prefer native `<button>`, `<a>`, `<dialog>`.

## Commit style

- One section or one page per commit. Avoid monster commits.
- Message format: `type(scope): summary`
  - `type` ∈ {feat, fix, refactor, chore, docs, style, test}
  - `scope` = section/page name (`main-product`, `header`, `templates/index`)
  - Examples:
    - `feat(main-product): port gallery with vertical thumbs`
    - `fix(header): escape menu z-index above cart drawer`
    - `chore(theme-check): clean HardcodedRoutes warnings`
- Never squash or force-push to `main`. Use feature branches.

## When unsure

- **Layout/liquid pattern question** → check Shopify Skeleton's equivalent file (https://github.com/Shopify/skeleton-theme) or Shopify's theme docs, then `references/shopify-rules.md`, then implement. Do NOT consult Dawn for pattern answers.
- **Schema setting question** → check the Skeleton repo or Shopify's settings documentation (https://shopify.dev/docs/storefronts/themes/architecture/sections/section-schema). Do NOT copy Dawn schemas.
- **Theme Check error** → `references/shopify-rules.md` has a quick-reference table with fixes. If the error isn't listed, search Shopify's docs at https://shopify.dev/docs/storefronts/themes/tools/theme-check/checks
- **Visual/UX question** → the Next.js source is the source of truth. Never guess; read the source.
- **Anything not in this file, the plan, or the references** → ASK before implementing. Do not invent conventions.

## Out of scope for now

- Paid integrations (Instagram, TikTok feeds, review apps). These become app blocks later.
- Customer account pages beyond Shopify's defaults (order history, addresses). Use Shopify's default templates until later.
- Multi-currency / multi-language content translation. The i18n structure must be correct (`t` filter, locale files) but translating to additional languages is a post-port task.
- Performance tuning beyond the baseline. First pass: make it work + pass Theme Check. Second pass: Lighthouse optimization. Don't prematurely optimize in phase 1.