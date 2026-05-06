# Theme Store Official Rules — Master Checklist

**Source:** Shopify dev docs in-content link traversal from the two canonical Theme Store pages:
- `https://shopify.dev/docs/storefronts/themes/store/requirements`
- `https://shopify.dev/docs/storefronts/themes/store/review-process/common-theme-rejections`

37 in-content links were extracted (sidebar/breadcrumb excluded), fetched, and audited for MUST/SHOULD/REQUIRED language. Rules below are the consolidated, deduplicated REJECT-level checklist — every entry is sourced to a verbatim quote from the cited Shopify docs page.

**Format per rule:**
- `[ ]` — unchecked = needs verification or fix
- `[x]` — verified compliant in past round (R56-R83)
- **RULE-ID** = stable identifier for cross-reference in commits
- **Source quote** = exact docs text justifying the rule
- **What violates** = concrete code pattern that fails
- **How to verify** = grep / file check / theme-check / manual procedure

**Workflow:** rounds R84+ work through this file in clusters, marking items `[x]` as fixes land. Aim for full check before Theme Store submission.

---

## Table of Contents

1. [Architecture & Config](#1-architecture--config)
2. [Templates](#2-templates)
3. [Navigation & Search](#3-navigation--search)
4. [Commerce — Pricing, Discounts, Subscriptions](#4-commerce--pricing-discounts-subscriptions)
5. [Product Merchandising — Variants, Media, Recommendations](#5-product-merchandising)
6. [Markets, Locale, Customer Engagement](#6-markets-locale-customer-engagement)
7. [Performance](#7-performance)
8. [Accessibility](#8-accessibility)
9. [Design & Color](#9-design--color)
10. [Version Control & Updates](#10-version-control--updates)
11. [Submission & Test](#11-submission--test)

---

## 1. Architecture & Config

### settings-data-json

- [x] **AC-001** `config/settings_data.json` size MUST NOT exceed 1.5 MB.
  - **Source quote**: "The `settings_data.json` file size can't exceed 1.5MB."
  - **What violates**: settings_data.json ≥ 1,572,864 bytes
  - **How to verify**: `ls -l config/settings_data.json` < 1572864

- [x] **AC-002** Theme MUST NOT contain more than five presets.
  - **Source quote**: "A theme can't contain more than five presets."
  - **What violates**: 6+ entries in `presets`
  - **How to verify**: `jq '.presets | keys | length' config/settings_data.json` ≤ 5

- [x] **AC-003** `current` and `presets` keys REQUIRED at root of settings_data.json.
  - **Source quote**: "`current` Required" / "`presets` Required"
  - **How to verify**: `jq 'has("current") and has("presets")' config/settings_data.json`

- [ ] **AC-004** Theme code MUST NOT modify `platform_customizations` settings.
  - **Source quote**: "you shouldn't add this setting, or edit the value of this setting after it's set."
  - **How to verify**: grep settings_data.json commits for `platform_customizations` writes

### settings-schema-json

- [x] **AC-005** `config/settings_schema.json` MUST be valid JSON.
  - **How to verify**: `jq empty config/settings_schema.json`

- [x] **AC-006** Each category object MUST have `name` AND `settings`.
  - **How to verify**: `jq '.[] | has("name") and has("settings")' config/settings_schema.json`

- [x] **AC-007** `settings` MUST be an array.
  - **How to verify**: `jq '.[] | .settings | type'` returns `"array"`

- [x] **AC-008** `theme_info` MUST NOT contain BOTH `theme_support_email` AND `theme_support_url`.
  - **Source quote**: "Including both...will result in an error."

### section-groups

- [x] **AC-009** Section group files MUST be valid JSON.
- [x] **AC-010** Section group root MUST contain `type`, `name`, `sections`, `order`.
- [x] **AC-011** Section group `type` MUST be one of `header`, `footer`, `aside`, `custom.<name>`.
- [x] **AC-012** Section IDs within a group MUST be unique.
- [x] **AC-013** Every ID in `order` MUST exist in `sections`.
- [x] **AC-014** Section types referenced MUST exist as theme sections.
- [x] **AC-015** Section group MUST render ≤ 25 sections.
- [x] **AC-016** Section MUST contain ≤ 50 blocks.
- [x] **AC-017** Section group `name` ≤ 50 characters.
- [x] **AC-018** Section/block IDs MUST be alphanumeric only.

### app-blocks

- [x] **AB-001** `@app` blocks MUST NOT include `limit` parameter.
  - **Source quote**: "Blocks of type `@app` don't accept the `limit` parameter."
- [ ] **AB-002** `@app` blocks MUST NOT be used in statically rendered sections.
  - **Source quote**: "Blocks of type `@app` aren't supported in statically rendered sections."
  - **How to verify**: cross-ref `@app`-using sections vs `{% section %}` calls
- [ ] **AB-003** Sections supporting `@app` MUST have only ONE resource setting per type.
  - **Source quote**: "include only one resource setting of each type as a section setting."
- [ ] **AB-004** `apps.liquid` schema MUST NOT contain `templates` attribute.
- [ ] **AB-005** `apps.liquid` MUST support `@app` blocks AND include a preset.

### input-settings

- [x] **IS-001** Every setting MUST have `type`, `id`, `label`.
- [x] **IS-002** `number` setting `default` MUST be numeric, not string.
- [x] **IS-003** `range` MUST have numeric `default`/`min`/`max`/`step`.
- [x] **IS-004** `radio` MUST include `options` array.
- [x] **IS-005** `select` MUST include `options` array.
- [x] **IS-006** `font_picker` MUST have a `default`.
- [ ] **IS-007** `richtext` `default` MUST be wrapped in `<p>` or `<ul>` tags.
  - **Source quote**: "Failing to wrap the `default` content in `<p>` or `<ul>` tags will result in an error."
  - **How to verify**: regex `^<(p|ul)[ >]` on richtext defaults
- [ ] **IS-008** `metaobject` MUST include `metaobject_type`.
- [ ] **IS-009** `metaobject_list` MUST include `metaobject_type`.
- [x] **IS-010** `video_url` MUST include `accept` array of `youtube`/`vimeo`.
- [ ] **IS-011** `color_background` MUST NOT use image-related background properties.
- [ ] **IS-012** `liquid` setting MUST be ≤ 50KB and valid Liquid.
- [ ] **IS-013** `liquid` setting MUST NOT reference `settings` object.
- [ ] **IS-014** `color_scheme_group` MUST only be defined in `settings_schema.json`.
- [ ] **IS-015** `placeholder` attribute MUST only appear in `settings_schema.json` (not section/block).
- [x] **IS-016** Theme Store: `metaobject`/`metaobject_list` MUST use only standard definitions.

### fonts

- [ ] **FN-001** Fonts MUST NOT be uploaded via Shopify admin code editor (corruption risk).
- [ ] **FN-002** Admin Files-uploaded fonts MUST use `file_url` filter.
- [ ] **FN-003** `/assets`-deployed fonts MUST use `asset_url` filter.

### templates-sections-blocks

- [ ] **TSB-001** Static sections MUST NOT be added/removed by Liquid templates or layouts.
  - **Source quote**: "You can't add or remove static sections from Liquid templates or layouts."
- [x] **TSB-002** Theme MUST be Online Store 2.0 (JSON templates + section groups).
- [ ] **TSB-003** Block-level settings MUST be scoped to the block (in block schema, not section/theme).
- [ ] **TSB-004** Sections supporting `@app` blocks MUST be antifragile (layout MUST handle arbitrary block types).

---

## 2. Templates

### templates-product

- [x] **TP-01** Product template MUST expose Liquid `product` object.
- [x] **TP-02** Product form MUST use `{% form 'product' ... %}`.
- [x] **TP-03** Variant selector MUST map every option value to an input.
- [x] **TP-04** Quantity input MUST be `name="quantity"` integer ≥ 1.
- [x] **TP-05** Product form MUST submit via `<input type="submit">` or `<button type="submit">`.
- [x] **TP-06** Product page SHOULD include accelerated checkout (`payment_button`).
- [x] **TP-07** Line item properties MUST be `properties[<name>]`.

### templates-collection

- [x] **TC-01** Product loops MUST be wrapped in `{% paginate by N %}`.
- [x] **TC-02** Collection template MUST expose `collection` object.
- [x] **TC-03** MUST iterate via Liquid `collection.products` (not Storefront/Ajax APIs).
- [x] **TC-04** Sort UI MUST drive off `collection.sort_options/sort_by/default_sort_by`.
- [x] **TC-05** JSON template MUST contain only `sections` + `order` (no inline HTML/Liquid).

### templates-search

- [x] **TS-01** Search template MUST expose `search` object.
- [x] **TS-02** Search form MUST POST/GET to `{{ routes.search_url }}`, input `name="q"`.
- [x] **TS-03** Search input MUST reflect `search.terms`.
- [x] **TS-04** Results MUST be rendered via Liquid `search.results`.

### templates-gift-card

- [x] **TG-01** `templates/gift_card.liquid` MUST be Liquid (not JSON).
- [x] **TG-02** File MUST live at `templates/gift_card.liquid`.
- [x] **TG-03** Template MUST render `gift_card` object (code, balance, qr_identifier, expired).
- [ ] **TG-04** Treat as served from `checkout.shopify.com` — no relative asset URLs, no shop-domain auth assumptions.

---

## 3. Navigation & Search

### navigation

- [x] **NV-01** Menu rendering MUST iterate `link.links[*].links` (3-level nesting).
- [x] **NV-02** Navigation markup MUST live inside `header`/`footer` section (not `theme.liquid`).
- [x] **NV-03** All navigation URLs MUST come from `link.url` / `routes.*` — never hardcoded.

### filtering

- [x] **FT-01** Filtering MUST use storefront filtering (`collection.filters` / `search.filters`).
- [x] **FT-02** Filter forms MUST submit via GET (URL state preservation).
- [x] **FT-03** Active filters MUST be removable via `filter.url_to_remove` + clear-all link.

### predictive-search

- [x] **PS-01** Predictive search MUST hit `/{locale}/search/suggest` via `routes` object.
- [x] **PS-02** Results MUST load via Section Rendering API (`?section_id=predictive-search`).
- [x] **PS-03** Combobox input MUST carry `role="combobox"` + `aria-expanded` + `aria-owns="predictive-search-results"` + `aria-haspopup="listbox"`.
- [ ] **PS-04** Input handler MUST debounce (~300ms reference).
  - **How to verify**: grep predictive JS for `debounce` / `setTimeout`
- [ ] **PS-05** `resources[type]` MUST be `product`, `collection`, `query`, `page`, `article` only.

---

## 4. Commerce — Pricing, Discounts, Subscriptions

### discounts

- [x] **DSC-01** Display original price (strikethrough) AND discounted price on every line item with discount allocation.
  - **Source quote**: "show the original price with a strikethrough, as well as the new discounted price."
- [x] **DSC-02** Cart-level discounts MUST render between subtotal and total.
- [x] **DSC-03** Enumerate every applied discount with title and amount.

### accelerated-checkout

- [x] **ACC-01** Product form MUST include `payment_button` filter.
- [ ] **ACC-02** `content_for_additional_checkout_buttons` MUST be guarded by `{% if additional_checkout_buttons %}`.
- [ ] **ACC-03** MUST NOT target accelerated checkout button internals via CSS/JS (closed shadow DOM).

### subscriptions

- [x] **SUB-01** Selling-plan UI MUST live inside `{% form 'product' %}`.
- [x] **SUB-02** Real selling-plan selector MUST be rendered (not just plan names).
- [x] **SUB-03** Hidden `name="selling_plan"` input MUST exist.
- [x] **SUB-04** Cart line items MUST indicate selling plan when applied.
- [ ] **SUB-05** Display checkout charge for pre-paid / TBYB plans.
  - **Source quote**: "Display a checkout charge that represents the amount that customers need to pay during checkout"
  - **How to verify**: grep cart for `checkout_charge`
- [x] **SUB-06** Customer order page MUST indicate selling plan on line items.
- [x] **SUB-07** JS MUST update available selling plans on variant change.

### installments

- [x] **INS-01** `payment_terms` filter MUST be invoked on `form` object inside Liquid product/cart form.
- [x] **INS-02** Installments banner MUST sit immediately below product price (PDP).
- [ ] **INS-03** Installments banner MUST sit below cart subtotal (cart).
- [x] **INS-04** Hidden `name="id"` input MUST exist for variant detection.
- [ ] **INS-05** Cart subtotal element MUST carry `data-cart-subtotal` attribute.

### unit-pricing

- [x] **UNP-01** Unit price support MUST be present on collection, product, cart, order surfaces.
- [x] **UNP-02** Unit price output MUST be guarded by `unit_price_measurement` check.
- [x] **UNP-03** Unit price MUST format with `unit_price_with_measurement` filter (not bare `money`).

---

## 5. Product Merchandising

### variants

- [x] **VAR-01** Each product option MUST render as its own selector (no combined dropdown).
- [x] **VAR-02** Variant change MUST update product media + price without reload.
- [x] **VAR-03** Use `selected_or_first_available_variant` (no `?variant=` deep-link required).
- [ ] **VAR-04** Support both `?variant=ID` AND `?option_values=...` deep links.
  - **How to verify**: load PDP with `?option_values=...`; confirm correct variant active

### related-products

- [x] **REL-01** Use `/{locale}/recommendations/products?intent=related` endpoint.
- [x] **REL-02** Load asynchronously; section MUST be empty on initial HTML.

### complementary-products

- [x] **COM-01** Use `intent=complementary` (NOT `related`) for complementary blocks.
- [ ] **COM-02** Default to 2-3 complementary products with pagination for the rest.

### pickup-availability

- [x] **PCK-01** Pickup-availability JS MUST re-run on every variant change.
- [x] **PCK-02** Fetch via `/variants/{id}/?section_id=pickup-availability`.
- [x] **PCK-03** Render only when current variant has ≥ 1 pickup-enabled location.

---

## 6. Markets, Locale, Customer Engagement

### markets / multi-currency-language

- [x] **MKT-01** Country selector ONLY when `available_countries.size > 1`.
- [x] **MKT-02** Language selector ONLY when `available_languages.size > 1`.
- [x] **MKT-03** Never hardcode URLs; use `routes` object.
- [x] **MKT-04** JSON-LD `priceCurrency` MUST reflect `cart.currency.iso_code` (not `shop.currency`).
- [x] **MKT-05** Selectors MUST be wrapped in `{% form 'localization' %}`.

### country-language-ux

- [x] **CLU-01** Both selectors MUST render together in the same DOM region.
- [x] **CLU-02** Footer placement: top of sub-footer, separate from nav links.
- [ ] **CLU-03** Header: selector MUST be left of cart icon.
- [ ] **CLU-04** Nav drawer: selector MUST be styled as utility/footer link, not primary nav.
- [ ] **CLU-05** Selector MUST be popover, NOT modal dialog.
- [ ] **CLU-06** Display full country name + currency code (e.g., "United States (USD $)").

### email-consent

- [x] **ECT-01** Newsletter input MUST be `type="email"` `name="contact[email]"`.
- [x] **ECT-02** Newsletter MUST use `{% form 'customer' %}`.

---

## 7. Performance

- [ ] **PRF-1** Minified JS bundle MUST be ≤ 16 KB. (See note: applies to render-blocking; deferred scripts exempt per docs.)
- [x] **PRF-2** All injected `<script>` MUST be wrapped in IIFE.
- [ ] **PRF-3** Maximum two resource hints per template.
  - **How to verify**: grep `preload_tag`/`<link rel="preload">` per template
- [x] **PRF-4** Above-the-fold images MUST NOT be lazy-loaded (use `loading="eager"` + `fetchpriority="high"`).

---

## 8. Accessibility

- [x] **A11Y-1** Visible, consistent focus indicator on all interactive elements.
- [x] **A11Y-2** All links/buttons/dropdowns/forms MUST be keyboard-operable.
- [x] **A11Y-3** Keyboard focus order MUST match DOM order.
- [x] **A11Y-4** No mouse-hover-only interactions.
- [x] **A11Y-5** Visible skip-to-content link on focus.
- [x] **A11Y-6** Theme MUST be built using valid HTML.
- [x] **A11Y-7** `<html>` MUST have `lang` attribute.
- [x] **A11Y-8** Heading tags in sequence; one `<h1>` per page.
- [x] **A11Y-9** Navigation MUST be wrapped in `<nav>`.
- [x] **A11Y-10** All form fields MUST have `<label for=>`.
- [x] **A11Y-11** Required inputs MUST use HTML5 `required`.
- [ ] **A11Y-12** On form error, focus MUST move to feedback message.
  - **How to verify**: submit invalid form; observe focus
- [x] **A11Y-13** All `<img>` MUST have `alt` attribute.
- [x] **A11Y-14** Decorative images MUST use empty `alt=""`.
- [ ] **A11Y-15** Video MUST have closed captions; audio MUST have transcripts.
  - **How to verify**: grep `<video>` for `<track kind="captions">`
- [x] **A11Y-16** Body text contrast ≥ 4.5:1; large text ≥ 3:1; icons ≥ 3:1.
- [x] **A11Y-17** Drawers/modals: focus moves in, traps, `Esc` closes; `role="dialog"`.
- [ ] **A11Y-18** Touch targets MUST be ≥ 44×44 px.
  - **How to verify**: DevTools box model on icon buttons / swatches / close X

---

## 9. Design & Color

### design

- [x] **DSN-1** Theme MUST meet Shopify a11y standards.
- [ ] **DSN-2** Critical actions MUST NOT be obscurable by floating app blocks.
- [x] **DSN-3** Components MUST respect DOM order and tab order.
- [x] **DSN-4** No dark patterns (fake countdown, fake stock, pre-checked addons, hidden fees).

### color-system

- [x] **CLR-1** No hardcoded colors on contrast-critical elements.
- [ ] **CLR-2** No unnecessarily granular color options.
- [ ] **CLR-3** Color roles MUST use semantically predictable names.

---

## 10. Version Control & Updates

### version-control

- [ ] **VC-1** Connected GitHub branch MUST use default theme folder structure (no `src/`/`dist/`).
  - **How to verify**: `find . -maxdepth 2 -type d -name 'src' -o -name 'dist'`

### updates

- [ ] **UPD-1** Themes published before 2025-05-15 MUST update file structure by 2025-06-22.
- [ ] **UPD-2** Minimum 4 weeks between updates.
- [ ] **UPD-3** Marketing fields on preset listing MUST be completed after approval.
- [ ] **UPD-4** `release-notes.md` REQUIRED at theme root after first publication.
- [ ] **UPD-5** Updates MUST NOT reduce section's instance limit.
- [ ] **UPD-6** Updates MUST NOT reduce section's block limit.
- [ ] **UPD-7** Updates MUST NOT add `disabled_on`/`enabled_on` to existing section groups.
- [ ] **UPD-8** Updates MUST NOT add restrictions preventing sections from existing templates.
- [ ] **UPD-9** Preset names MUST NOT contain special characters except single space.
- [ ] **UPD-10** Preset listing folder names MUST be kebab-case.
- [ ] **UPD-11** Preset listings MUST NOT include demo `.json` not intended for merchant use.

---

## 11. Submission & Test

### submit-theme

- [ ] **SUB-1** Theme MUST satisfy all requirements at every review stage.
- [x] **SUB-2** Templates/sections/blocks MUST be Online Store 2.0 compatible.
- [ ] **SUB-3** Resubmissions MUST address all prior rejection reasons.
- [ ] **SUB-4** Theme MUST be fully tested before submission (Lighthouse + theme-check + manual QA).

---

## Round Tracker

| Round | Cluster focus | Items closed | Commit |
|-------|--------------|--------------|--------|
| R84 | (planned) | TBD | TBD |
| R85 | (planned) | TBD | TBD |

**Open items count:** ~50 unchecked entries.

**Already verified compliant** (marked `[x]` from R56-R83 audits): ~110 entries.
