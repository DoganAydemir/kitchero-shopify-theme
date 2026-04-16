# Preview images — production checklist

Shopify Theme Store requires a specific set of preview images for every
submission. These must be generated from the live demo store — NOT mocked —
and uploaded alongside the `.zip` via the Partners dashboard.

This document is the spec. Actual image generation needs the demo store to be
fully populated first (see [`THEME-STORE-LISTING.md`](./THEME-STORE-LISTING.md)
→ "Demo store requirements").

---

## Image specs (Shopify requirements, not ours)

| Slot | Dimensions | Notes |
|---|---|---|
| **Hero / master preview** | 1920 × 1680 px | PNG or JPG. Primary visual shown at the top of the listing page. Must capture the theme's signature moment (the home hero + upper scroll). |
| **Desktop previews** (5–10 images) | 1920 × 1680 px | Each image 1920 px wide, any reasonable height (1080, 1200, 1680). Shows different pages / scroll positions. |
| **Mobile previews** (5–10 images) | 750 × 1624 px (2× of 375 × 812) | Same theme content rendered on mobile. iOS Safari-like viewport is acceptable. |
| **Tablet previews** (optional) | 1536 × 2048 px (2× of 768 × 1024) | Portrait iPad. Optional but increases approval velocity. |

Shopify rejects:
- Images smaller than the minimum specs
- Stretched / low-res screenshots
- Images with visible browser chrome (URL bar, extensions, bookmarks)
- Placeholder or stock photography that doesn't match the demo store content

---

## Required shots (home page)

These are the minimum required. All shots come from the live demo store.

1. **`01-home-hero.png`** — Full-viewport home hero. Must include the navbar.
   *Target section:* `sections/hero.liquid`
2. **`02-home-shop-by-color.png`** — The color picker grid showing material
   variants. Must include at least 6 visible swatches.
   *Target section:* `sections/shop-color.liquid`
3. **`03-home-shop-the-look.png`** — Interactive hotspots image with one
   hotspot popover visible (click the hotspot before capturing).
   *Target section:* `sections/shop-the-look.liquid`
4. **`04-home-ecosystem.png`** — The alternating editorial row with the first
   feature in-view.
   *Target section:* `sections/ecosystem.liquid`
5. **`05-home-brands.png`** — The infinite brands strip (catch it mid-scroll).
   *Target section:* `sections/brands.liquid`
6. **`06-home-testimonials.png`** — "Living with Kitchero" spotlight mask
   reveal (hover the section first so the spotlight is visible).
   *Target section:* `sections/testimonials.liquid`
7. **`07-home-financing.png`** — The dark financing section with the emerald
   label and partner cards.
   *Target section:* `sections/home-financing.liquid`

## Required shots (commerce)

8. **`08-collection-horizontal.png`** — Default collection page with the
   horizontal filter bar, populated with ~20 products.
   *Target template:* `templates/collection.json`
9. **`09-collection-drawer.png`** — Right-side drawer filter open.
   *Target template:* `templates/collection.drawer.json`
10. **`10-collection-vertical.png`** — Left sticky sidebar filter, desktop.
    *Target template:* `templates/collection.vertical.json`
11. **`11-product-ecommerce.png`** — E-commerce PDP, gallery + sticky info
    with countdown visible. Populate `custom.deal_ends_at` on this product.
    *Target template:* `templates/product.json`
12. **`12-product-showroom.png`** — Showroom PDP, first scroll position
    showing book-appointment + home-measure CTAs.
    *Target template:* `templates/product.showroom.json`
13. **`13-cart-drawer.png`** — Cart drawer open with 2–3 line items.
    *Target snippet:* `snippets/cart-drawer.liquid`

## Required shots (editorial)

14. **`14-journal.png`** — Blog listing page populated with 6+ articles.
    *Target template:* `templates/blog.json`
15. **`15-article.png`** — Article detail page scrolled to show the rich
    content rendered.
    *Target template:* `templates/article.json`

## Showcase shots (sections catalogue)

These demonstrate the 22 merchant-droppable sections added in Phase 3. Not
strictly required by the Theme Store, but they massively increase conversion
on the listing page.

16. **`16-banner-hero.png`** — `sections/banner-hero.liquid`
17. **`17-banner-split.png`** — `sections/banner-split.liquid`
18. **`18-slider-cinematic.png`** — `sections/slider-cinematic-hero.liquid`
    (mid-Ken-Burns)
19. **`19-slider-drag.png`** — `sections/slider-drag-carousel.liquid`
    (mid-drag, caption overlay visible)
20. **`20-video-bg-hero.png`** — `sections/video-bg-hero.liquid`
21. **`21-video-poster-modal.png`** — `sections/video-poster-modal.liquid`
    (with play button centered)
22. **`22-gallery-marquee.png`** — `sections/gallery-marquee.liquid`
    (mid-animation)
23. **`23-gallery-stack.png`** — `sections/gallery-stack.liquid` (peek cards
    visible at 45° left/right of active)
24. **`24-gallery-focus-lightbox.png`** — lightbox open with arrow controls.
25. **`25-collapsible-visual.png`** — `sections/collapsible-visual.liquid`
    with item 2 active (image synced).
26. **`26-newsletter-popup.png`** — `sections/newsletter-popup.liquid` in
    pre-submit state with email field visible.
27. **`27-testimonials-marquee.png`** — `sections/testimonials-marquee.liquid`
    mid-animation.
28. **`28-testimonials-pullquote.png`** — `sections/testimonials-pullquote.liquid`
    full editorial quote on dark bg.

---

## Mobile shots (required)

Capture the same **14 required shots above** on mobile. iPhone 13/14 viewport
(390 × 844 logical, 1170 × 2532 physical — Shopify accepts 750 × 1624 as 2×).

Shopify allows merchants to toggle the listing gallery between desktop and
mobile, so having both halves of the story matters.

---

## Capture tooling

**Recommended:** Chrome DevTools device toolbar → "Capture full-size screenshot"
(in the three-dot menu of the device toolbar). Produces pixel-accurate captures
at the physical resolution.

**Alternative:** Screen capture at 2× retina scale, then trim browser chrome.

**Avoid:**
- Browser-extension screenshot tools that inject overlays
- System screenshot tools at 1× scaling (produces blurry results on retina)
- Any tool that reorders DOM during capture (lazy-loaded images will miss)

---

## Pre-capture checklist (demo store setup)

Before capturing, run through:

- [ ] Clear all browser cookies for the demo store
- [ ] Open in a fresh private/incognito window to avoid logged-in admin bars
- [ ] Disable all browser extensions (ad blockers, dark mode plugins, grammarly)
- [ ] Confirm the viewport is exactly 1920 × (something) for desktop — zoom at 100%
- [ ] Wait ~2 seconds on each page load before capturing (gives GSAP
      animations time to settle into their final resting state)
- [ ] For sections with infinite scroll animations (brands strip, testimonial
      marquee, gallery marquee), capture mid-animation by scrolling into view
      and immediately screenshotting
- [ ] For the countdown product, pick a `custom.deal_ends_at` at least 1 day
      in the future so the DD:HH:MM:SS display is non-zero
- [ ] Newsletter popup: ensure it's enabled with delay 2s, then wait for it
      to open before capturing

---

## Filename convention

```
kitchero-{sequence}-{subject}-{viewport}.png
```

Examples:
- `kitchero-01-home-hero-desktop.png`
- `kitchero-01-home-hero-mobile.png`
- `kitchero-14-journal-desktop.png`

Keep filenames lowercase-kebab-case. Shopify's partner dashboard displays them
in upload order, so prefix with a zero-padded sequence (`01`, `02`, ..., `28`)
so the gallery renders in the right order.

---

## Compression

Target file sizes:
- Desktop hero: ≤ 600 KB (PNG) or ≤ 400 KB (JPG quality 85)
- Other desktop shots: ≤ 400 KB each
- Mobile shots: ≤ 250 KB each

Tools:
- **TinyPNG** — PNG compression, keeps quality
- **Squoosh.app** — browser-based, good WebP/AVIF preview
- **ImageOptim** — Mac, lossless by default

Shopify accepts the full image sizes, but listing load time affects discovery.
