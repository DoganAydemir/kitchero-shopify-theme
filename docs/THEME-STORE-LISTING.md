# Theme Store Listing — Kitchero

Copy-paste ready content for the Shopify Theme Store submission form. Each
section is mapped to the exact field it populates in Shopify's merchant
listing editor (`Partners dashboard > Themes > Submit a theme`).

---

## Theme name

```
Kitchero
```

## Tagline (max 60 characters — the single-line hook under the name)

```
Showroom-grade storefronts for premium home brands.
```

(52 characters — room for the ™ glyph if we trademark later.)

## Short description (max 160 characters — shown in the Theme Store grid)

```
Cinematic animations, two PDP layouts, three collection styles, and 40+ merchant-droppable sections. Built for luxury kitchen, cabinetry, and home brands.
```

(159 characters.)

---

## Long description (Markdown-supported — the body of the listing page)

```markdown
Kitchero is a premium OS 2.0 theme crafted for merchants who sell the kinds of
products that deserve a magazine spread, not a grid cell — luxury kitchen
cabinetry, countertops, bespoke furniture, and high-end home goods.

Built on Shopify's approved Skeleton baseline with every piece of UI
custom-designed, Kitchero gives you the scroll-triggered animations, cinematic
galleries, and layered typography of a hand-coded agency build — all fully
editable from the theme editor, with no developer required.

## What's included

### Two PDP layouts
- **E-commerce:** 58/42 split with sticky product info, vertical thumbnail
  gallery, pulsing countdown timer, quantity picker, and dynamic checkout.
- **Showroom:** Book-an-appointment + home-measure CTAs replace the add-to-cart
  path, with a "Door sample" entry point to keep commerce alive. Alternating
  full-width and paired galleries down the page.

### Three collection layouts
- Horizontal filter bar (compact, editorial).
- Right-side filter drawer (keeps the grid dense).
- Left sticky sidebar (classic department-store feel).
- All three use Shopify's Section Rendering API for AJAX filtering — no
  full-page reloads.

### 40+ merchant-droppable sections
Including: cinematic hero slider with Ken Burns zoom, drag carousel, editorial
split slider, full-viewport background video hero, YouTube/Vimeo modal players,
infinite-marquee image wall, stacked-card gallery, bento-grid lightbox gallery,
three accordion styles, parallax split, editorial overlay, split 50/50 banners,
announcement strips (3 color themes), interactive hotspot look-shops,
testimonials grid + marquee + pull-quote, and an auto-opening newsletter modal
with merchant-configurable delay and cooldown.

### Premium interactions, respectfully
- GSAP + ScrollTrigger + Lenis self-hosted (unminified, per Theme Store rules).
- Every animation honors `prefers-reduced-motion`.
- No fake urgency: the countdown timer reads a real `custom.deal_ends_at`
  metafield — no deceptive UI.

### Out of the box
- i18n-ready for 5 languages (EN complete; TR, DE, FR, ES scaffolded). Shopify falls back to EN automatically for untranslated keys.
- 4 color schemes, 3-font system (Inter + Playfair Display by default,
  swappable via Shopify's font picker).
- WCAG AA accessible. Keyboard-navigable. Visible focus rings. 4.5:1 contrast.
- Full app block support on product, cart, header, footer, and main sections.
- Progressive enhancement — every form and interaction works without JS.

Kitchero is for merchants whose product photography is the hero, whose customer
journey needs space to breathe, and whose brand lives or dies on the first
three seconds of the storefront. If that's you, welcome home.
```

---

## Feature highlights (3-4 short bullets for the "Features" field)

- Two PDP layouts (e-commerce + showroom) and three collection grids with AJAX filtering
- 40+ drop-in sections including cinematic sliders, video heroes, galleries, and modal newsletter
- GSAP-powered scroll animations, Ken Burns hero, bento lightbox, interactive hotspots
- i18n for 5 languages (EN ready, TR/DE/FR/ES scaffolded), WCAG AA, full @app block support

---

## Industries (up to 3)

1. **Home & garden** (primary)
2. **Furniture**
3. **Art & photography**

## Best for (free-text field that Shopify uses to recommend your theme)

```
Luxury kitchen cabinetry, countertops, bespoke furniture, interior design
studios, home-renovation retailers, and high-end home goods brands whose
photography deserves editorial treatment.
```

---

## Demo store requirements

Before submission, the demo store must have:

1. **At least 30 products** across 3+ collections, all with real photography
2. **Navigation menu** with 3-level structure so the mega menu renders (e.g.
   "Cabinets" → "Style" → "Shaker / Slab / Flat-Panel")
3. **Template assignments:**
   - At least one product on `product.showroom` template
   - At least one collection on `collection.drawer` template
   - At least one collection on `collection.vertical` template
4. **Theme editor setup:**
   - Home page populated with 10–14 sections showcasing the range (hero, shop
     the look, countdown product, before/after, ecosystem, brands strip,
     testimonials, newsletter popup enabled, financing, etc.)
   - At least one product with the `custom.deal_ends_at` metafield set so the
     countdown renders
   - At least one product with 5+ gallery images so the vertical thumbnails
     demo correctly
5. **Locale:** Default EN. Switch to TR during review to verify translations
   load (don't ship in TR by default — reviewers expect English).
6. **Cart drawer** visible on every page after adding an item.
7. **Search overlay** reachable from header search icon.
8. **Newsletter popup** enabled with a 5-second delay so reviewers see it.

---

## Pricing

- **Recommended tier:** $350 USD (one-time purchase, matches Shopify's
  recommended pricing band for premium themes with multi-PDP layouts).
- **Free trial:** Enabled — Shopify's 14-day unpublished preview is the default.

---

## Support

- **Documentation URL:** (set in `settings_schema.json` → support section)
  — point to the public docs repo or help center.
- **Support email:** (merchant support mailbox)
- **Response time commitment:** 48 hours on business days (Theme Store
  requires this disclosure).

---

## Review notes (short note to Shopify reviewers — optional but helpful)

```
Kitchero ports a complete Next.js / Tailwind frontend into vanilla Shopify
Liquid + plain CSS + vanilla JS with no build step, strictly following Shopify's
Skeleton conventions (no reference-theme UI reused).

Known behaviors worth noting:
- The newsletter popup auto-opens after a merchant-defined delay and uses
  localStorage cooldown to avoid annoying returning visitors. This is not
  deceptive UI — the discount code is real and the cooldown is honored.
- The countdown timer reads `custom.deal_ends_at` (merchant-editable metafield).
  When the date is in the past, the timer hides itself. No fake urgency.
- Video sections require merchants to upload MP4s to Shopify Files, or paste
  YouTube/Vimeo URLs for modal playback — no external CDNs are used.
- All interactive sections re-init on `shopify:section:load` and cleanup on
  unload, per the editor compatibility rule.

Theme Check: 0 errors, 0 warnings on the `theme-check:recommended`
ruleset (165 files inspected).
```
