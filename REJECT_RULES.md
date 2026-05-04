# REJECT_RULES.md — Master Audit Source

**Purpose:** the single, authoritative checklist for every REJECT-prevention
audit. Agents read THIS file and run its rules; they do not invent new rules
mid-audit. New rule candidates are proposed at the end of an audit report and
added here only after human review.

**Scope:** Kitchero Shopify theme, Theme Store **paid** submission, 2025
criteria. Stricter than free theme criteria. Source policy:
- Shopify Theme Store paid 2025 requirements
- Shopify Skeleton baseline (Dawn/Horizon-derived = auto-reject)
- WCAG 2.1 AA + 2.2 AA mandatory
- Lighthouse mobile perf ≥ 60, a11y ≥ 90
- Distilled from `CLAUDE.md`, `references/shopify-rules.md`, `PORT_PLAN.md`,
  and 25+ `fix(reject-prevention):` commits in this repo.

**Rule ID format:** `[REJ-<CATEGORY>-<NNN>]` — quote in audit reports.
**Levels:** `REJECT` (block submission), `WARNING` (fix if cheap, not blocking).

---

## A. ABSOLUTE REJECTS (auto-rejection, no exceptions)

### A1. Codebase derivation

| ID | Pattern | Level |
|---|---|---|
| REJ-A1-001 | Any literal `Dawn` / `Horizon` reference (comment, copy, file name, class). `grep -rin '\bdawn\b\|\bhorizon\b' sections/ snippets/ assets/ layout/ config/ templates/`. False positives: `horizontal`, `before-dawn`, etc. — must be word-boundary match. | REJECT |
| REJ-A1-002 | Any file/snippet matching Dawn's `component-*.css` naming convention or Dawn's `card-product.liquid` exact pattern. | REJECT |
| REJ-A1-003 | Comments saying "ported from Dawn", "matches Dawn's X", "Dawn's pattern". | REJECT |

### A2. File structure violations

| ID | Pattern | Level |
|---|---|---|
| REJ-A2-001 | `templates/robots.txt.liquid` exists. `ls templates/robots.txt.liquid 2>/dev/null` must return nothing. | REJECT |
| REJ-A2-002 | Any `.scss` / `.sass` file. `find . -name '*.scss' -o -name '*.sass' -not -path './.git/*' -not -path './node_modules/*'` must be empty. | REJECT |
| REJ-A2-003 | Minified CSS/JS in `assets/` source. Heuristic: file > 5KB AND < 5 lines AND not in vendor-* (R24 protected). | REJECT |
| REJ-A2-004 | `.bak`, `.old`, `.orig`, `.backup`, `.tmp` files anywhere. | REJECT |
| REJ-A2-005 | Missing required template (see PORT_PLAN.md §"Required Templates"). | REJECT |
| REJ-A2-006 | `templates/gift_card.liquid` is JSON instead of Liquid (Shopify requires `.liquid` for gift_card). | REJECT |

### A3. Banned API usage

| ID | Pattern | Level |
|---|---|---|
| REJ-A3-001 | `{% include %}` anywhere. Use `{% render %}`. `grep -rn '{% include' sections/ snippets/ layout/ templates/`. | REJECT |
| REJ-A3-002 | `eval(`, `new Function(`, `document.write` in any non-vendor JS. `grep -rn 'eval(\|new Function\|document\.write' assets/ \| grep -v vendor-`. | REJECT |
| REJ-A3-003 | Hardcoded API key/token/credential in source. `grep -rin 'api_key\|secret_key\|access_token\|auth_token\|Bearer ' assets/ sections/ snippets/ layout/ templates/ config/`. | REJECT |
| REJ-A3-004 | `console.log` in production JS (assets/*.js, excluding vendor-*). `console.error/warn` for actual error paths is OK. | REJECT |
| REJ-A3-005 | Capturing or modifying `content_for_header`. `grep -rn 'content_for_header' layout/ \| grep -v 'output as-is\|never modify'`. | REJECT |
| REJ-A3-006 | External CDN imports (fonts, scripts). Shopify CDN + `assets/` only. `grep -rn 'fonts.googleapis\|fonts.gstatic\|cdn.jsdelivr\|unpkg.com\|cloudflare.com/ajax' sections/ snippets/ layout/ assets/`. Exception: `cdn.shopify.com`, `shopify.com`. | REJECT |
| REJ-A3-007 | Any `<script src="http...">` or `<script src="//...">` pointing outside Shopify. | REJECT |

---

## B. PAID THEME STORE CRITERIA (2025)

### B1. Performance baseline

| ID | Pattern | Level |
|---|---|---|
| REJ-B1-001 | `<script>` tag without `defer` or `async`, except small inline JSON config (`type="application/json"`) or 1-line bootstraps. `grep -rn '<script' sections/ snippets/ layout/ \| grep -v 'defer\|async\|application/json'`. | REJECT |
| REJ-B1-002 | `image_tag` filter without explicit `width:` AND `height:` parameters. CLS killer. | REJECT |
| REJ-B1-003 | `<img>` (raw HTML, not image_tag) without `width` AND `height` attributes. | REJECT |
| REJ-B1-004 | Above-fold/hero image with `loading: 'lazy'`. Hero must be eager. | REJECT |
| REJ-B1-005 | Non-LCP images without `loading: 'lazy'`. | WARNING |
| REJ-B1-006 | Single CSS file > 100KB unminified, non-vendor. | REJECT |
| REJ-B1-007 | Single JS file > 100KB unminified, non-vendor. R24-protected: `vendor-lenis.js`, `vendor-gsap.js`, `vendor-scrolltrigger.js` are EXEMPT. | REJECT |
| REJ-B1-008 | Heavy CSS loaded in `theme.liquid` for every page. Section-specific CSS must load only in that section. | WARNING |

### B2. Accessibility baseline (WCAG 2.1 AA + 2.2 AA)

| ID | Pattern | Level |
|---|---|---|
| REJ-B2-001 | Multiple `<h1>` per page. Verify hero/banner sections only emit one h1 (use `<p role="heading" aria-level="1">` for repeated visual headings, see hero.liquid pattern). | REJECT |
| REJ-B2-002 | Heading-level skip (h1 → h3, h2 → h4, h3 → h5). Filter modals OK as standalone landmarks. | REJECT |
| REJ-B2-003 | `<input>` / `<select>` / `<textarea>` without `<label for>` matching `id`, OR `aria-label`, OR `aria-labelledby`. | REJECT |
| REJ-B2-004 | Icon-only `<button>` without `aria-label` and without inner text. | REJECT |
| REJ-B2-005 | `<img>` / `image_tag` without `alt` attribute. Empty `alt=""` is OK for decorative. Missing alt entirely = REJECT. | REJECT |
| REJ-B2-006 | `outline: none` / `outline: 0` in CSS without an alternative `:focus-visible` style. | REJECT |
| REJ-B2-007 | Interactive controls < 24×24 CSS px on mobile (WCAG 2.2 target size). Buttons, links, inputs. | REJECT |
| REJ-B2-008 | Missing skip-to-content link in `theme.liquid` as first focusable element. | REJECT |
| REJ-B2-009 | Main content not in `<main>`, header not in `<header>`, footer not in `<footer>`. | REJECT |
| REJ-B2-010 | `role="button"` on `<div>` without keyboard handlers (Enter/Space keys). | REJECT |
| REJ-B2-011 | `aria-hidden="true"` on a focusable element. | REJECT |
| REJ-B2-012 | Decorative SVG icons without `aria-hidden="true"`. | REJECT |
| REJ-B2-013 | Modal/drawer without `role="dialog"` + `aria-modal="true"`, focus trap, ESC-to-close, focus return. | REJECT |
| REJ-B2-014 | Hardcoded color values clearly < 4.5:1 contrast (e.g. `#bbb` on `#fff`). | REJECT |

### B3. Mandatory features

| ID | Pattern | Level |
|---|---|---|
| REJ-B3-001 | `{"type": "@app"}` block missing in schema for: `main-product`, `featured-product`, `main-cart`, `main-blog`, `main-article`, `main-collection`, `header`, `footer`. | REJECT |
| REJ-B3-002 | `{{ form \| payment_button }}` missing in product form (Dynamic Checkout Button). | REJECT |
| REJ-B3-003 | Image setting without `placeholder_svg_tag` fallback when `setting == blank`. Available: `hero-apparel-1/2`, `collection-1` to `-6`, `product-1` to `-6`, `lifestyle-1/2`, `image`. | REJECT |
| REJ-B3-004 | JSON-LD missing for Product page (Product schema), Article page (Article schema), home (WebSite + Organization), breadcrumbs (BreadcrumbList). | REJECT |
| REJ-B3-005 | `theme_documentation_url` or `theme_support_url` missing/blank in `config/settings_schema.json` `theme_info` block. | REJECT |
| REJ-B3-006 | `color_scheme_group` setting absent from `config/settings_schema.json` (raw `color` settings sprawl is non-Skeleton). | REJECT |
| REJ-B3-007 | Locale parity broken. Required locales: en, tr, de, fr, es. Both `*.json` (storefront) AND `*.schema.json` (settings) for each. | REJECT |

### B4. Form correctness

| ID | Pattern | Level |
|---|---|---|
| REJ-B4-001 | Native HTML `<form action="https://external">` instead of Shopify `{% form 'X' %}` block. | REJECT |
| REJ-B4-002 | Wrong form type (e.g. `{% form 'contact' %}` for product, or no `{% form %}` for native Shopify endpoint POST). Required types: `product`, `customer_login`, `create_customer`, `recover_customer_password`, `customer_address`, `contact`, `customer`, `new_comment`, `localization`. | REJECT |
| REJ-B4-002 | `autocomplete="off"` on email/name/address/password fields (banned — breaks password managers). | REJECT |
| REJ-B4-003 | `<input>` missing `name` attribute or `autocomplete` attribute where applicable. | REJECT |
| REJ-B4-004 | Radio/checkbox group without `<fieldset><legend>` or `role="group" aria-labelledby`. | REJECT |
| REJ-B4-005 | Custom form POSTing to `/cart/add`, `/contact`, `/customer/*` endpoints WITHOUT using `{% form %}` block (CSRF token missing). | REJECT |

---

## C. CATEGORY GREP CHECKLIST

### C1. Security (XSS, escaping, secrets)

| ID | Pattern | Level |
|---|---|---|
| REJ-SEC-001 | `\| raw` filter on text/textarea/string settings. ONLY safe with `richtext` / `html` setting types. `grep -rn '\| raw' sections/ snippets/ layout/ templates/`. | REJECT |
| REJ-SEC-002 | HTML attribute interpolating Liquid variable WITHOUT `\| escape`. Pattern: `attr="{{ var }}"` where var is user/merchant/form input. Whitelist: `\| asset_url`, `\| stylesheet_tag`, `\| script_tag`, `\| image_url`, `\| link_to`, `\| t`, `\| url_encode`, `\| handle`, `\| money` (numeric-safe). | REJECT |
| REJ-SEC-003 | `<script>` block interpolating Liquid variable WITHOUT `\| json` filter. Use `{{ var \| json }}` to safely embed in JS. | REJECT |
| REJ-SEC-004 | `target="_blank"` without `rel="noopener noreferrer"`. | REJECT |
| REJ-SEC-005 | `http://` URL in production code (must be `https://`). Exclude xmlns, schema URLs, code comments. | REJECT |
| REJ-SEC-006 | Inline event handlers: `onclick=`, `onmouseover=`, `onload=`, `onsubmit=`, `onchange=` in HTML attributes. CSP-incompatible. Exception: Shopify's `onload="this.media='all'"` async-CSS pattern documented in Skeleton. | REJECT |
| REJ-SEC-007 | `<iframe>` loading external content without `sandbox` attribute. | REJECT |
| REJ-SEC-008 | `localStorage` storing PII (email, name, address, payment, customer ID). UI state (cart open, theme preference) is OK. | REJECT |
| REJ-SEC-009 | `innerHTML` assigned user-supplied data. Server-rendered Shopify HTML (Section Rendering API output) is safe. Form data being interpolated is NOT. | REJECT |

### C2. Accessibility (WCAG 2.1 AA + 2.2 AA)

(Most rules in B2 above. Additional grep patterns:)

| ID | Pattern | Level |
|---|---|---|
| REJ-A11Y-001 | `tabindex="-1"` on visible interactive elements. | WARNING |
| REJ-A11Y-002 | `tabindex` value > 0 (positive tabindex disrupts natural order). | REJECT |
| REJ-A11Y-003 | Form error message not linked via `aria-describedby` to the failing input. | REJECT |
| REJ-A11Y-004 | Live region (`aria-live`) missing for AJAX cart updates / search results / form validation. | REJECT |
| REJ-A11Y-005 | `<button>` without explicit `type` attribute inside `<form>` (defaults to submit, may unintentionally submit). | WARNING |
| REJ-A11Y-006 | Color used as the ONLY indicator (e.g. red text without an icon or label saying "error"). | REJECT |
| REJ-A11Y-007 | Slider/carousel without keyboard arrow navigation OR without pause/play control if autoplay. | REJECT |
| REJ-A11Y-008 | Empty `<a href="#">` anchor (broken link). Theme Store reviewers click random links. | REJECT |
| REJ-A11Y-009 | Custom checkbox/radio replacing native input WITHOUT keeping the underlying `<input type="checkbox/radio">` for SR. | REJECT |

### C3. Performance

(Most rules in B1 above. Additional patterns:)

| ID | Pattern | Level |
|---|---|---|
| REJ-PERF-001 | LCP image (hero) without `fetchpriority: 'high'` on the `image_tag` filter call. | WARNING |
| REJ-PERF-002 | Synchronous web font without `font-display: swap` (or Shopify's `font_face` filter, which adds it automatically). | REJECT |
| REJ-PERF-003 | Custom font loaded via raw `@font-face` instead of Shopify's `font_face` filter. | REJECT |
| REJ-PERF-004 | Multiple separate `stylesheet_tag` calls in `theme.liquid` for above-fold sections (HTTP/2 ok, but minimize). | WARNING |
| REJ-PERF-005 | JS file containing multiple sections' logic (must split per section). | WARNING |

### C4. JavaScript

| ID | Pattern | Level |
|---|---|---|
| REJ-JS-001 | Section JS with interactive behavior (slider, drawer, accordion, etc.) NOT registering `shopify:section:load`/`shopify:section:unload`. R10 baseline. | REJECT |
| REJ-JS-002 | Cart fetch using HTML route `/cart` instead of `.js` AJAX endpoint `/cart.js` or `/cart/add.js` / `/cart/change.js`. `r.json()` will throw on HTML. | REJECT |
| REJ-JS-003 | Hardcoded route `/cart`, `/search`, `/account`, `/products/`, `/collections/`, `/discount`, etc. Use `routes.cart_url`, `routes.search_url`, `routes.account_url`, `routes.predictive_search_url`, `{{ routes.root_url }}discount`, `Shopify.routes.root` (JS). Breaks Markets locale prefixes. | REJECT |
| REJ-JS-004 | `fetch('/?sections=...')` with bare leading `/`. Must use `Shopify.routes.root + '?sections=...'`. | REJECT |
| REJ-JS-005 | Inline `<script>` block in `.liquid` performing DOM manipulation. Allowed: small bootstraps that pass `{{ var \| json }}` to a globally-loaded script, `application/json` config, `application/ld+json` structured data. | REJECT |
| REJ-JS-006 | Async fetch chain without `.catch()` that leaves UI broken on failure. | WARNING |
| REJ-JS-007 | `window.onload =` / `window.onerror =` overrides (use `addEventListener`). | REJECT |
| REJ-JS-008 | Modifying or "improving" `assets/vendor-lenis.js`, `assets/vendor-gsap.js`, `assets/vendor-scrolltrigger.js`. R24 user rule: NEVER touch these files. | REJECT |
| REJ-JS-009 | jQuery loaded anywhere. | REJECT |
| REJ-JS-010 | Build-step artifacts: webpack chunks, sourcemaps, `.map` files in `assets/`. | REJECT |

### C5. Policy / Skeleton baseline

| ID | Pattern | Level |
|---|---|---|
| REJ-POL-001 | Section schema label hardcoded in English (not `t:` prefix). All schema `label`, `info`, `name`, `content` must be `"t:..."`. | REJECT |
| REJ-POL-002 | Inline `<style>` tags in `.liquid` files, except documented CSS-variable bridging. | REJECT |
| REJ-POL-003 | Tailwind utility classes in Liquid output (no Tailwind build step in this theme). All CSS via BEM `kt-*` classes. | REJECT |
| REJ-POL-004 | Hardcoded product/collection/article ID or handle in Liquid. Use settings, metafields, or dynamic objects. | REJECT |
| REJ-POL-005 | Fake urgency: countdown not backed by metafield, fake stock counter, fake "viewers now" badge, fake reviews. | REJECT |
| REJ-POL-006 | Section enabled on inappropriate template (e.g. cart-only block on product page). `disabled_on` must restrict properly. | WARNING |
| REJ-POL-007 | Section that creates accounts / writes customer data without explicit user action (privacy violation). | REJECT |
| REJ-POL-008 | Hardcoded "free shipping", "30-day returns", "lowest price" claim in liquid (must be merchant-editable setting). | REJECT |
| REJ-POL-009 | Setting type `color` used where `color_scheme` would integrate with the system. | WARNING |

### C6. Demo content (niche-lock + brand)

**Where to scan:** all `sections/*.liquid` defaults + presets, all `templates/*.json`, `locales/*.schema.json` example values, `config/settings_data.json`.

**Niche-lock vocabulary blacklist** (this theme is sold as generic, NOT a kitchen/cabinet theme):

| Category | Banned terms |
|---|---|
| Kitchen/cabinet | kitchen, cabinet, cabinetry, cupboard, drawer (in cabinetry sense), countertop, backsplash, oven, fridge, range hood |
| Materials (luxury claim) | walnut, oak, timber (in copy), maple (in copy), hand-finished walnut, "tactile luxury", "absolute grade" |
| Construction terms | Shaker, slab, handle-less, dovetail, joinery, joiner, ball-bearing runners, soft-close (as feature claim), CNC machining, hinges, veneer |
| Showroom/studio language | "showroom", "atelier", "studio's actual…" (use "shop's" instead), "behind the scenes" workshop copy |
| Door/sample variants | "door sample", "door front", "5″ × 7″ door front", "5-Piece Shaker", "Solid Maple", "Order a Door Sample" → use "Order a sample", "Sample" |

**Brand / trademark blacklist** (must never appear in customer-facing copy or defaults):

`Affirm, BreadPay, Klarna, AfterPay, ApplePay/Apple Pay (in marketing copy), Welcome10` (sample discount code), `Kitchero` (the theme name) as a real brand (only `shop.name` / settings-driven), real third-party brand names.

**Fake persona patterns** (default testimonials, reviews, authors):

- First name + Last name combos with role title (e.g. "John Smith, Designer")
- Specific years/numbers in stats ("500+ projects", "20 years experience")
- Real-looking dates ("Apr 2026", "Mar 2026")

**Acceptable placeholder strings** (NOT niche-lock, do not flag):

- "Heading", "Subtitle", "Eyebrow", "Block heading", "Section heading"
- "Add a description", "Describe your…", "Add a short description"
- "Feature title", "Block title", "Slide heading", "Article title"
- "Author name", "Customer name", "Title or role"
- "Tag", "Category title", "Finish name", "Image caption"
- "View all", "Learn more", "Shop all", "Read more"
- "Volume", "Chapter 01/02/03"
- `kt.onboarding.*` translation keys (Shopify standard)
- "lifestyle-1", "hero-apparel-1" (Shopify placeholder names)

**Grep patterns:**
```
# Niche-lock catch
grep -rin 'shaker\|slab\|dovetail\|joinery\|cabinet\|cupboard\|countertop\|tactile\|walnut\|hand-finished' sections/*.liquid templates/*.json locales/*.schema.json | grep -v '"label"\|"info"\|"description":\s*"[^"]*choose\|describe\|\sshop'

# Brand catch
grep -rin 'affirm\|breadpay\|klarna\|welcome10\|kitchero' sections/ templates/ locales/

# Fake stat catch (numbers in defaults)
grep -rn '"default":\s*"[0-9]\+\(\+\|%\| years\)"' sections/*.liquid

# Persona catch (first + last name in default author/quote_author/customer_name)
grep -rn '"default":\s*"[A-Z][a-z]\+\s\+[A-Z]\.\?' sections/*.liquid
```

---

## D. KNOWN FALSE POSITIVES (do not flag)

These look like violations but are correct:

| Pattern | Why it's OK |
|---|---|
| `horizontal`, `before-dawn`, `prawn`, etc. | Substring match on "dawn"/"horizon", word-boundary required |
| CSS class names like `kt-contact__showroom-image` | CSS classes are technical, not user-facing copy |
| `lifestyle-1`, `hero-apparel-1`, `collection-3`, `product-2`, `image` | Shopify standard placeholder_svg names |
| Comments in English in `.liquid` / `.js` / `.css` files | Code comments are fine; only user-facing strings need translation |
| `onload="this.media='all'"` on `<link>` | Shopify-standard async CSS pattern, documented in Skeleton |
| `console.error('refreshCartPage: sections fetch failed')` | console.error in actual error handler is OK |
| `localStorage.setItem('newsletter-popup-dismissed-at', Date.now())` | Throttle timestamp, not PII |
| `innerHTML = sectionResponse.html` after `fetch('/?sections=...')` | Server-rendered Shopify HTML, safe |
| `target="_blank" rel="noopener noreferrer"` on social/external links | Required pair, not a violation |
| `href="{{ routes.* }}"` (cart_url, account_url, search_url, root_url, etc.) | Shopify-system fixed routes, not user input — `\| escape` not needed |
| `href="{{ product.url }}"` / `collection.url` / `article.url` / `blog.url` / `page.url` / `item.url` / `line_item.url` / `order.customer_url` | Shopify-generated handles/URLs, validated server-side |
| `href="{{ value.url_to_remove }}"` / `filter.url_to_remove` | Shopify Storefront Filtering API output, server-generated |
| `href="{{ canonical_url }}"` | Shopify-generated canonical, server-controlled |
| `href="{{ shop.privacy_policy.url }}"` / `policy.url` | Shopify-managed legal page URLs |
| `href="{{ blog.previous_article.url }}"` / `blog.next_article.url` | Shopify-derived navigation, server-controlled |
| `href="{{ link.url }}"` from a linklist (`link_list` setting) | Admin URL-validated like schema URL settings; SEC-002 covers MERCHANT/USER/FORM input, not Shopify-validated linklist outputs |
| `href="{{ product.vendor \| url_for_vendor }}"` | Shopify vendor-handle URL, server-derived |
| Schema `select` option labels with literal `"H1"`/`"H2"` etc. for `heading_tag` settings | Universal HTML tag names — same in every language; localizing is overkill and Theme Store doesn't flag |
| `role="dialog" aria-modal="true"` on cart/search/menu drawer | Required, not a violation |
| `sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"` on video iframe | Justified for video players |
| `fetch(Kitchero.routes.cartChange + '.js')` | Correctly uses `.js` AJAX endpoint via routes object |
| Schema `default: "0"` / `default: ""` / `default: "Stat label"` for stats | Correct generic placeholder |
| `default: "Address"` / `default: "Customer name"` | Generic placeholder, acceptable |
| `assets/vendor-lenis.js`, `vendor-gsap.js`, `vendor-scrolltrigger.js` in any state | R24-protected, NEVER touch |
| `request.design_mode` blocks emitting hint messages | Theme editor onboarding, expected |
| `{{ shop.name | escape }}` as h1 fallback when section.blocks is empty | SEO safety net for empty hero |

---

## E. AGENT WORKFLOW

**CRITICAL — Section coverage:** A 6-agent sweep MUST cover ALL B-section
rules (B1, B2, B3, B4) plus all C-section rules (C1-C6) plus Section A.
Recommended distribution:
- Ajan 1 → A + B3 + C5 (absolute / mandatory features / policy)
- Ajan 2 → B2 + C2 (a11y)
- Ajan 3 → B1 + C3 (perf)
- Ajan 4 → C1 + B4 (security + form correctness — both are CSRF/XSS adjacent)
- Ajan 5 → C4 (JavaScript)
- Ajan 6 → C6 (Demo content)
B3 and B4 were historically omitted in early R29-R43 sweeps;
they hold paid-Theme-Store mandatory criteria (CSRF tokens, @app
blocks, payment_button) — never skip.

When invoked for a REJECT audit, an agent MUST:

1. **Read this entire file once.** ~400 lines, fits in single context.
2. **For each rule with a grep pattern**, run the pattern from the repo root. Do NOT improvise wildcards.
3. **For each grep hit**, check against section D (KNOWN FALSE POSITIVES). If it matches a false-positive pattern, skip silently.
4. **For each remaining hit**, check against section F (PAST FINDINGS). If the exact same pattern at the exact same file:line was reported and fixed in a past round, skip silently.
5. **Report each confirmed REJECT** in this format:
   ```
   [REJ-CATEGORY-NNN] {file}:{line}
     evidence: <single line of code>
     fix: <what to change to what>
   ```
6. **Cite rule IDs.** Never report a finding without a rule ID. If no rule covers it, propose at end of report under "RULE CANDIDATES".
7. **Do NOT modify files.** Read-only audit. The orchestrator (parent Claude) applies fixes after reviewing all agents' reports.
8. **Cap at 600 words per report.** Dense, no preamble, no recap.

---

## F. PAST FINDINGS LOG

High-frequency patterns that historically appear and reappear. Agents should
NOT re-flag a finding here unless the **specific file/line** is regressed.

### R26 (commit b564693) — 17 REJECT
- cart-drawer.js fetch `/cart` HTML route → `.js` endpoint (REJ-JS-002)
- main-product / main-product-showroom: h3/h4 → h2 promote (REJ-B2-002)
- Niche scrub: "Welcome10" code, "BreadPay" brand, walnut/Solid timber, Tactile Luxury, A-grade veneers, Premium shaker, your cabinetry project, Solid timber frames, low-VOC oils, Premium shaker preset blocks, Modern Minimalism guide titles, stale Apr/Mar/Feb 2026 dates, "1200/+/Projects Completed" stats, master craftsmanship, plan your kitchen

### R27 (commit 0cddbe0) — 10 REJECT
- main-search / main-collection variants / main-order: h3 → h2 (REJ-B2-002)
- Filter modal h3 → h2 (REJ-B2-001 / B2-002)
- deals-grid: Standard L-Shape / Soft-Close Hardware / Basic Installation niche-lock + Signature/Premier tier names → Tier 1/2 generic
- locale schema example "01 / Tactile Luxury" → "Feature title"
- page.about.json caption "Hand-finished walnut / Workshop" → generic

### R28 (commit aa596b8) — 32 REJECT
- main-addresses form.country/form.province `\| escape` (REJ-SEC-002)
- main-cart.js fetch `/?sections=` → `Shopify.routes.root + '?sections='` (REJ-JS-004)
- main-cart.liquid + cart-drawer.liquid `/discount` → `{{ routes.root_url }}discount` (REJ-JS-003)
- slider-cinematic-hero multi-h1 emit → first slide real heading_tag, rest `<p role="heading">` (REJ-B2-001)
- main-collection filter group h2 → h4 skip → h3 (REJ-B2-002)
- shop-the-look popup-name h4 → h3 (REJ-B2-002)
- gallery-marquee/stack/focus-wall + slider-drag-carousel: image_tag width/height (REJ-B1-002)
- Niche scrub: ball-bearing runners, concealed hinges, aeronautical-grade walnut, lifetime hinge claims, Carbon Shaker captions, dovetail+CNC+showroom-quality, Book home measure, 5-Piece Shaker, Order a Door Sample, 5″ × 7″ door front, Visit A Studio, trade collaboration, Showroom name → Location name, Luminous Light/Alabaster Base/Arctic White/Walnut Grain/Natural Oak/Obsidian Mat/Midnight Navy finish names, Material Library, Request Free Samples, orchestrate/hand-select/grain-match copy, Absolute Grade, Built to Outlast, Timeless Craft slides, Material intelligence/Quiet engineering slides, Handcrafted precision in every joint, studio's → shop's, "Tactile Luxury" / "Luxe tactile" / "Taktiler Luxus" / "Lujo táctil" / "Dokunsal Lüks" example labels in 4 locales

---

## G. MAINTENANCE

**When to add a new rule:**
- 2+ rounds in a row find the same new pattern → promote to rule.
- Shopify publishes new Theme Store policy → review B section.
- A real Theme Store rejection arrives → root-cause back to a rule.

**When to retire a rule:**
- Codebase pattern fully eliminated AND new code can't introduce it (e.g. lint enforces it) → mark archived but keep ID.

**Refresh cadence:** review after every 5 rounds; refresh against Shopify's
official docs every 3 months.

**Source-of-truth precedence (when rules conflict):**
1. Shopify Theme Store official policy (live docs)
2. CLAUDE.md project rules
3. references/shopify-rules.md
4. PORT_PLAN.md
5. Past findings log (this file, section F)
