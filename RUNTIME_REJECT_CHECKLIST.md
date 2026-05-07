# RUNTIME REJECT CHECKLIST — "5 saniyede red" hatları

> **Hedef:** Theme Store reviewer tema önizlemesini açtığı ilk 5–30 saniyede
> görüp *"bu ekibe güvenim kalmadı, başka bakmaya gerek yok"* dedirten
> **basit, görünür, olmaması gereken** hataların TAMAMINI sıfırlamak.
>
> **Bu liste `REJECT_RULES.md` ile aynı şey DEĞİLDİR.** REJECT_RULES kod-
> standardı uyumunu ölçer (BEM namespace, Dawn yasakları, schema kuralları).
> Bu dosya reviewer'ın hızlıca tema editöründe / mobil önizlemede / DevTools
> Console'da yakaladığı **runtime / görsel / ilk-izlenim** hatalarını ölçer.
>
> **Sweep komutu:** Aşağıdaki "Sweep prompt" bölümünü 6 ajana paralel ver, 0
> bulgu çıkana kadar tekrarla. Her tur atomic commit, her bulguyu kapatana
> kadar dur.

---

## Hata kategorisi sınıflandırması

Her bulgu üç eksende sınıflandırılır:

| Eksen | Değerler |
|-------|----------|
| **Visibility** | `STOREFRONT` (müşteri görür) / `EDITOR` (merchant görür) / `CONSOLE` (DevTools) |
| **Severity** | `CATASTROPHIC` (tema açılmaz) / `OBVIOUS` (5 saniyede gözüne çarpar) / `SUBTLE` (15+ saniye dikkat ister) |
| **Reviewer reaction** | `INSTANT_REJECT` (otomatik red) / `LOSE_TRUST` (red riski + ekstra inceleme) |

---

## Kategori 0 — CATASTROPHIC (tema kırık)

### 0.1 Liquid syntax error sayfayı kırıyor
- `INSTANT_REJECT` · Detect: theme editor preview "Section error" pembe kutusu, storefront'ta beyaz sayfa veya yarı-render
- Grep: `{%-?\s*if\s+[^%]*$` (open if without close), `{%-?\s*for\s+[^%]*$`, mismatched `endif`/`endfor`/`endcase`
- Acceptance: `shopify theme check` 0 error, her template + her section preview'unda render eksiksiz

### 0.2 Critical asset 404
- `INSTANT_REJECT` · Detect: DevTools Network tab'inde 404 base.css/global.js/theme.liquid
- Grep: tüm `asset_url` filter'ları gerçek `assets/<file>` ile cross-check
- Acceptance: every page load → 0 asset 404

### 0.3 JSON template parse error (templates/*.json)
- `INSTANT_REJECT` · Detect: theme editor "Failed to load template"
- Grep: trailing comma, eksik `"`, eksik bracket
- Acceptance: `python3 -c "import json; json.load(open('templates/X.json'))"` her template için pass

### 0.4 Section schema JSON parse error
- `INSTANT_REJECT` · Detect: theme editor section listesinden eksik
- Grep: her `{% schema %}` blokunu izole edip JSON parse et
- Acceptance: every section schema parse-clean

---

## Kategori 1 — STOREFRONT obvious (müşteri 5 saniyede görür)

### 1.1 Lorem ipsum / mock text ekranda görünüyor
- `LOSE_TRUST` · Reviewer signal: *"profesyonel olmayan placeholder content shipping"*
- Grep: `Lorem ipsum`, `dolor sit`, `consectetur adipiscing`, `Pellentesque`, `sed do eiusmod` — DEFAULT olarak schema veya locale'da
- Files: `sections/*.liquid` (schema defaults), `locales/*.json`, `templates/*.json`, `snippets/*.liquid`
- Acceptance: 0 Lorem ipsum match in defaults

### 1.2 Untranslated `t:` key locale'da düz yazı olarak çıkıyor
- `LOSE_TRUST` · Reviewer görür: *"sections.X.title"* gibi key kelimesi sayfada
- Detect: storefront'ta `t:` prefix'li veya dot-notation key text içinde görünüyorsa
- Grep storefront output: `>t:`, `>kt\.` (sadece görünür text içinde, comment dışı)
- Acceptance: 0 visible `t:`/`kt.` key string in rendered storefront

### 1.3 Broken image (404 src) first paint'te
- `OBVIOUS` · Detect: HTTP 404 on Network tab for any `<img>` request
- Grep: empty/invalid `src=""`, hardcoded paths to non-existent `/assets/` files
- Acceptance: 0 image 404 across home/product/collection/cart/blog/article preview

### 1.4 BEM class name veya CSS selector kullanıcıya görünüyor
- `OBVIOUS` · Detect: storefront'ta `kt-product-form__atc--loading` gibi class adı text olarak görünüyorsa (CSS specificity bug, content içine sızmış)
- Grep: text node içinde `^kt-` start eden string
- Acceptance: hiçbir BEM class adı user-visible text node'da yok

### 1.5 Default product title "Test Product" / "Sample Item"
- `INSTANT_REJECT` · Reviewer: *"placeholder product names shipping"*
- Grep: schema'da default `"Test Product"`, `"Sample Item"`, `"Demo Product"`, `"Lorem Item"`
- Acceptance: 0 default product/collection/article name with test/demo/sample word

### 1.6 TODO / FIXME / HACK / XXX visible
- `LOSE_TRUST` · Detect: storefront'ta `TODO:`, `FIXME:`, `HACK:`, `XXX:` text
- Grep: schema defaults, locale strings, template inline content
- Acceptance: 0 TODO/FIXME/HACK in customer-facing copy

### 1.7 Placeholder syntax `[merchant: ...]` veya `{{merchant_X}}` literal
- `OBVIOUS` · Detect: `[merchant:`, `{{merchant_`, `{{your_`, `{REPLACE}`
- Grep: locale + schema + template defaults
- Acceptance: 0 placeholder syntax in defaults

### 1.8 Hardcoded English in non-English locale
- `OBVIOUS` · Detect: `tr.json` / `de.json` / `fr.json` / `es.json` keylerinde hâlâ İngilizce string (translation gap)
- Method: parallel string compare against `en.default.json`, flag identical-value pairs that aren't proper nouns / cognates
- Acceptance: 0 untranslated English in non-English locales (excl. proper nouns)

### 1.9 Visible `<!-- HTML comment -->` storefront'ta
- `OBVIOUS` · Detect: HTML comment containing dev notes in inspector (akademik mor — comments invisible but still in source)
- Grep: `<!--\s*(TODO|FIXME|DEBUG|REMOVE|DELETE)`
- Acceptance: 0 dev-comment in shipped HTML output

### 1.10 Default copy with currency symbol hardcoded
- `OBVIOUS` · Detect: defaults like "Save $50" or "Free shipping over $100"
- Grep: schema/locale defaults containing `\$\d`, `€\d`, `£\d`
- Acceptance: 0 hardcoded currency symbol in defaults (use `cart.currency.symbol` filter)

---

## Kategori 2 — CONSOLE error / Network 404 (DevTools açar açmaz görür)

### 2.1 console.log / console.warn / console.error production'a bırakılmış
- `LOSE_TRUST` · Reviewer açar açmaz console kırmızı/sarı dolu
- Grep: theme-authored `assets/*.js` (vendor-* hariç), `console\.(log|warn|error|debug|trace|info)\(`
- Allowlist: error-recovery paths (`catch (e) { console.warn(...) }`) acceptable IF behind a debug flag or genuine error
- Acceptance: 0 production console output on home/product/collection/cart load

### 2.2 Uncaught JS error (TypeError, ReferenceError)
- `INSTANT_REJECT` · Detect: theme editor + storefront DevTools Console showing red Uncaught
- Manual: open every template preview, scroll, click ATC, open cart drawer, open search → console temiz mi?
- Acceptance: 0 uncaught runtime error across baseline interaction set

### 2.3 Network 404 / 403 on first-page asset
- `OBVIOUS` · Detect: DevTools Network tab status 4xx
- Common offenders: missing CSS, missing snippet, missing icon-* SVG, broken `image_url` filter chain
- Acceptance: 0 4xx on initial page-load network requests

### 2.4 CORS error from external resource
- `LOSE_TRUST` · Detect: console "blocked by CORS policy"
- Grep: external CDN refs, third-party fetch calls
- Acceptance: 0 CORS error

### 2.5 Mixed content (http on https)
- `INSTANT_REJECT` · Detect: console mixed-content warning
- Grep: hardcoded `http://` resource URLs
- Acceptance: 0 hardcoded http resource (Shopify CDN preconnect https hardcode is allowed exception)

### 2.6 Favicon 404
- `OBVIOUS` · Detect: every page logs `/favicon.ico 404`
- Verify: `settings.kt_favicon` has fallback or layout/theme.liquid emits a default
- Acceptance: every page response → 0 favicon 404

### 2.7 Source-map 404 spam
- `SUBTLE` · Detect: console barrage of `failed to fetch source map for X.css.map`
- Grep: trailing `/*# sourceMappingURL=` in any non-vendor CSS/JS
- Acceptance: 0 source-map URL comments in shipped CSS/JS

---

## Kategori 3 — EDITOR preview broken (merchant editör açar açmaz görür)

### 3.1 Section eklendiğinde "Section error" pembe kutusu
- `INSTANT_REJECT` · Detect: theme editor section picker → drop section → preview shows pink error
- Common cause: schema typo, `{% style %}` block syntax error, missing `t:` key referenced in schema
- Acceptance: every section adds + previews + saves cleanly

### 3.2 `shopify:section:load` handler patlaması
- `OBVIOUS` · Detect: editor "reload section" → console error
- Manual: every interactive section (slider, drawer, picker) → "reload" button on editor sidebar → console temiz?
- Acceptance: 0 section:load error

### 3.3 `shopify:block:select` highlight broken
- `OBVIOUS` · Detect: editor block click → no orange outline / wrong element outlined
- Verify: every block render branch has `{{ block.shopify_attributes }}` on outer wrapper
- Acceptance: every block selectable, every selection highlights correct element

### 3.4 FOUC (flash of unstyled content) on editor reload
- `OBVIOUS` · Detect: 200-500ms unstyled paint after editor save
- Common cause: `<link rel="stylesheet">` placed in `<body>` instead of `<head>`, async-CSS swap pattern broken
- Acceptance: section save → no visible unstyled flash

### 3.5 Settings panel boş / "Failed to load"
- `INSTANT_REJECT` · Detect: theme editor → Customize → Theme settings → boş veya error
- Common cause: `config/settings_schema.json` invalid JSON or missing required keys
- Acceptance: settings panel renders all categories + every setting interactive

---

## Kategori 4 — CRITICAL UI broken (temel commerce flow)

### 4.1 ATC button no response on click
- `INSTANT_REJECT` · Detect: PDP'de "Add to cart" tıkla → hiçbir şey olmuyor / button stuck loading
- Manual: variant pick → ATC click → cart count incremented + drawer/redirect
- Acceptance: ATC works on every product preview

### 4.2 Cart drawer açılmıyor
- `INSTANT_REJECT` · Detect: header cart icon click → no drawer
- Manual: empty + populated cart states → drawer renders both
- Acceptance: cart drawer opens & closes via header icon, ESC key, backdrop click

### 4.3 Search overlay açılmıyor
- `INSTANT_REJECT` · Detect: header search icon click → no overlay
- Acceptance: search overlay opens, predictive results render, ESC closes

### 4.4 Mobile menu (hamburger) açılmıyor
- `INSTANT_REJECT` · Detect: mobile viewport hamburger → no drawer
- Acceptance: drawer opens with menu links, closes via X / backdrop / ESC

### 4.5 Variant picker price/image update yok
- `INSTANT_REJECT` · Detect: PDP variant click → price stays same OR image stays same
- Manual: every option pick → price + image + URL update
- Acceptance: variant change updates price + image + URL + selling-plan price (if applicable)

### 4.6 Cart count never updates after ATC
- `OBVIOUS` · Detect: header cart count badge stays at 0 after ATC
- Cause: missing `[data-cart-count]` selector hook, JS doesn't fire on success
- Acceptance: ATC success → cart count badge increments within 500ms

### 4.7 Pagination link broken
- `OBVIOUS` · Detect: collection page 2 → URL changes but products don't load OR 404
- Acceptance: every paginated set navigates correctly

---

## Kategori 5 — MOBILE / responsive obvious

### 5.1 Horizontal scroll on mobile
- `OBVIOUS` · Detect: 375×667 viewport → page scrolls horizontally
- Common cause: hardcoded width, missing `max-width: 100%`, overflow-x leak
- Acceptance: 0 horizontal scroll on 320/375/414/768 viewport

### 5.2 Touch target <24×24 px
- `OBVIOUS` · Theme Store hard rule
- Common offenders: pagination chevron, social icon, share button, swatch, qty stepper, close (×)
- Acceptance: every touch target ≥24×24 (≥44×44 for primary actions)

### 5.3 Text overflow / cut off
- `OBVIOUS` · Detect: long product titles, long collection names → text clipped/cut mid-word
- Acceptance: text truncates with ellipsis OR wraps cleanly, no mid-word cut

### 5.4 Sticky element covers content
- `OBVIOUS` · Detect: scroll-triggered sticky header covers ATC button on mobile, sticky footer covers cart total
- Acceptance: sticky elements have proper offset, no critical action obscured

### 5.5 Modal not closing on backdrop tap (mobile)
- `OBVIOUS` · Detect: mobile drawer/modal → tap outside → modal stays
- Acceptance: every modal closes on backdrop tap + ESC + close button

### 5.6 Keyboard appears, layout shifts violently
- `SUBTLE` · Detect: input focus on mobile → page jumps/zooms
- Cause: `font-size < 16px` on input (iOS auto-zoom), layout not VVH-aware
- Acceptance: input focus on iOS Safari → no zoom, no janky layout shift

---

## Kategori 6 — ACCESSIBILITY obvious violations

### 6.1 Hero LCP `alt=""` (decorative when shouldn't be)
- `OBVIOUS` · Detect: hero image with empty alt despite carrying meaning (product hero, brand hero)
- Acceptance: meaningful images have meaningful alt; only decorative images have empty alt

### 6.2 Skip-to-content link visible on screen
- `OBVIOUS` · Detect: page load → "Skip to content" link visible at top-left
- Cause: `visually-hidden` class missing or overridden
- Acceptance: skip link visible only on focus

### 6.3 Focus rings missing on Tab navigation
- `OBVIOUS` · Detect: Tab through page → no visible focus indicator
- Cause: `outline: none` without `:focus-visible` alternative
- Acceptance: every interactive element has visible focus state

### 6.4 Mouse-only hover effect (no keyboard)
- `OBVIOUS` · Detect: dropdown opens on `:hover` only, doesn't open on Tab+focus
- Acceptance: every hover-triggered UI also responds to keyboard focus

### 6.5 Heading hierarchy skipped (h1 → h3 with no h2)
- `SUBTLE` · Detect: axe-core / Lighthouse accessibility audit
- Acceptance: heading levels ordered, no skips

---

## Kategori 7 — VISUAL basics

### 7.1 Hardcoded white-on-white / black-on-black contrast fail
- `INSTANT_REJECT` · Detect: theme settings color scheme switch → invisible text
- Cause: hardcoded `color: #fff` / `color: #000` bypassing color_scheme
- Acceptance: every text element resolves color via `var(--kt-c-fg)` or scheme variable

### 7.2 Z-index broken (modal under content)
- `OBVIOUS` · Detect: cart drawer renders behind product gallery / behind sticky header
- Acceptance: every overlay has correct z-index stacking

### 7.3 Empty section collapses to 0px
- `OBVIOUS` · Detect: section preset added without content → invisible (no editor handle)
- Acceptance: empty section emits visible placeholder + editor hint

### 7.4 Print stylesheet broken
- `SUBTLE` · Detect: cart page print preview → cluttered with chrome
- Acceptance: print rules hide drawers/headers/buttons appropriately

---

## Kategori 8 — HARDCODED strings / branding leaks

### 8.1 "Kitchero" hardcoded in storefront copy
- `INSTANT_REJECT` · Reviewer: *"theme name leaking onto merchant's site"*
- Grep: customer-facing strings with `Kitchero`
- Allowlist: `theme_info` block, dev comments — these are merchant-side only, not storefront
- Acceptance: 0 "Kitchero" in storefront-rendered text

### 8.2 Dev URL (`localhost`, `ngrok`, `dev.myshopify`)
- `INSTANT_REJECT` · Detect: any href/src pointing to dev hostname
- Grep: `localhost`, `ngrok`, `dev\.myshopify`, `127.0.0.1`, `:8080`, `:3000`
- Acceptance: 0 dev hostname

### 8.3 Test phone number / email
- `LOSE_TRUST` · Detect: defaults like `+1 555-0000`, `test@example.com`, `foo@bar.com`
- Grep: schema/locale defaults
- Acceptance: 0 test contact info

### 8.4 Emoji in default copy
- `LOSE_TRUST` · Reviewer: *"unprofessional emoji shipping as default"*
- Grep: `[🎉✨🔥💯🚀⚡]` in schema/locale defaults
- Allowlist: appropriate icons used as content (rare exceptions documented)
- Acceptance: 0 unintended emoji in defaults

### 8.5 GitHub / Notion / Slack reference in customer copy
- `INSTANT_REJECT` · Detect: customer-facing string with `github.com`, `notion.so`, `slack.com`
- Grep: storefront text content
- Acceptance: 0 dev-tool reference in customer copy

---

## Kategori 9 — PERFORMANCE first-impression

### 9.1 LCP image not eager / not high priority
- `OBVIOUS` · Lighthouse: "Largest Contentful Paint image was lazily loaded"
- Detect: hero image with `loading="lazy"` instead of `eager`
- Acceptance: LCP image always `loading="eager"` + `fetchpriority="high"`

### 9.2 Render-blocking JS without defer
- `INSTANT_REJECT` · Theme Store hard rule
- Grep: `<script src=` without `defer` or `async`
- Acceptance: every external script has defer/async

### 9.3 5+ font weights loaded
- `SUBTLE` · Detect: Network tab 5+ WOFF2 requests
- Acceptance: ≤4 font weights per font family

### 9.4 Images served at 2× resolution unnecessarily
- `SUBTLE` · Detect: 1500px image rendered at 300px slot
- Verify: every `image_tag` has `sizes` + `widths` srcset
- Acceptance: served image ≤2× rendered size

### 9.5 Theme bundles >1MB JS / >500KB CSS at first paint
- `LOSE_TRUST` · Detect: Network tab Initial Total
- Acceptance: <1MB JS + <500KB CSS first-paint critical

---

## Kategori 10 — Theme settings panel quality

### 10.1 Setting label translation missing in editor language
- `OBVIOUS` · Detect: editor in TR/DE/FR/ES → setting label still in English
- Grep: schema setting `label` without `t:` prefix
- Acceptance: every label/info/content uses `t:` translation key

### 10.2 Range setting step doesn't divide cleanly
- `OBVIOUS` · Detect: range slider snaps to weird values, max not reachable
- Grep: ranges where `(max - min) % step != 0`
- Acceptance: every range step divides cleanly

### 10.3 Setting default contradicts setting type
- `OBVIOUS` · Detect: number setting default is string, range default outside min/max
- Verify: `python3` parse + per-type sanity check
- Acceptance: every setting default matches type

### 10.4 Setting `info` text is technical jargon
- `LOSE_TRUST` · Reviewer: *"info text reads like dev-talk, not merchant-facing"*
- Heuristic: `info` text contains "metafield namespace", "Liquid object", "schema type", file paths
- Acceptance: every info text reads as merchant-friendly explanation

### 10.5 "0" default leaves empty visual slot
- `OBVIOUS` · Detect: stat block default "0" → "0 Happy customers" looks empty/broken on first install
- Acceptance: defaults make sense on fresh install OR section gates render on non-zero

---

## Sweep prompt (6 ajan paralel)

> Bu prompt R126+ otonom turlar için. Her ajan bir kategori grubunu denetler.

```
Read /Users/macos/Documents/GitHub/kitchero-shopify-theme/RUNTIME_REJECT_CHECKLIST.md
in full. Run every check in category(ies) **[X]** from the repo root.

For each finding, classify:
- Visibility: STOREFRONT | EDITOR | CONSOLE
- Severity: CATASTROPHIC | OBVIOUS | SUBTLE
- Reviewer reaction: INSTANT_REJECT | LOSE_TRUST

Report ONLY confirmed runtime-reject findings:

[CHECKLIST-SECTION-X.Y] {file}:{line}
  visibility: <STOREFRONT|EDITOR|CONSOLE>
  severity: <CATASTROPHIC|OBVIOUS|SUBTLE>
  reaction: <INSTANT_REJECT|LOSE_TRUST>
  evidence: <one line>
  fix: <what to change to what>

Do not invent rules — only flag what's listed in the checklist.
Cap 700 words. If 0 findings, say "Found 0 RUNTIME REJECT — clean."

Working dir: /Users/macos/Documents/GitHub/kitchero-shopify-theme
```

### Ajan dağılımı

- **Ajan 1 → Kategori 0 (CATASTROPHIC) + Kategori 4 (CRITICAL UI broken)**
  Tema açılmaz / temel commerce flow kırık — en yüksek öncelik.

- **Ajan 2 → Kategori 1 (STOREFRONT obvious)**
  Lorem ipsum, untranslated keys, broken images, BEM class leaks, test data.

- **Ajan 3 → Kategori 2 (CONSOLE) + Kategori 9 (PERFORMANCE)**
  console.log, uncaught errors, network 404, CORS, mixed content, LCP, render-blocking JS.

- **Ajan 4 → Kategori 3 (EDITOR) + Kategori 10 (Theme settings panel)**
  Section error, schema parse, settings panel quality.

- **Ajan 5 → Kategori 5 (MOBILE) + Kategori 6 (A11Y obvious) + Kategori 7 (VISUAL)**
  Horizontal scroll, touch targets, focus rings, color contrast.

- **Ajan 6 → Kategori 8 (HARDCODED strings/branding leaks)**
  Kitchero leak, dev URLs, test contacts, emoji.

---

## Round tracker

Her sweep turu burada track edilir. R126+ turlar için:

| Round | Categories closed | Total findings | Commit |
|-------|-------------------|----------------|--------|
| _(R126'da başla)_ | — | — | — |

**Acceptance:** 6 ajan toplam 0 RUNTIME REJECT döndürene kadar tur devam.
Her tur atomic commit. `shopify theme check` 0 offense zorunlu her commit
öncesi. R110-R125 serisindeki HARD STOP kuralları aynen geçerli.

---

## Master compliance gate

Submission ZİP'i bu üç checklist'in HEPSİ temiz iken üretilebilir:

1. ✅ `THEME_STORE_RULES_OFFICIAL.md` → 160 rule compliant
2. ✅ `REJECT_RULES.md` → 6-agent sweep 0 finding
3. ⏳ `RUNTIME_REJECT_CHECKLIST.md` → 6-agent sweep 0 finding **(bu dosya)**

Üçü birden 0 olduğunda submission paketi production-ready.
