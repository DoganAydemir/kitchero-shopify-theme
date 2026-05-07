# Sections catalogue

Curated catalogue of the headline merchant-droppable sections in Kitchero,
grouped by intent. All sections support presets, theme-editor live editing,
translatable labels (5 languages: EN, TR, DE, FR, ES), and WCAG AA
accessibility.

Template-bound sections (`main-*.liquid`) are not listed here — they only
render on their associated template (product, collection, cart, etc.).
Some smaller utility / page-specific sections (rich-text, multicolumn,
financing-* family, recently-viewed-products, etc.) ship in the repo but
are not given dedicated catalogue entries below; their schemas describe
them in the theme editor when merchants browse the section picker.

---

## Heroes + banners

| Section file | Editor name | Use when |
|---|---|---|
| `hero.liquid` | Home hero | The default scroll-triggered hero for home pages. GSAP pin + reveal. |
| `banner-hero.liquid` | Banner — Hero | Drop-in hero for secondary pages. Full-width image + gradient + CTA. |
| `banner-split.liquid` | Banner — Split 50/50 | Copy + image side-by-side, flippable. Ideal for deal announcements. |
| `banner-minimal.liquid` | Banner — Minimal Centered | Text-forward centered banner with two CTAs + overlay opacity control. |
| `announcement-banner.liquid` | Announcement banner | Thin promotional strip. 3 built-in presets (dark, emerald, gradient). |

## Sliders + motion

| Section file | Editor name | Use when |
|---|---|---|
| `slider-cinematic-hero.liquid` | Slider — Cinematic Hero | Full-viewport auto-playing slider with Ken Burns, dot + arrow nav, pause/play toggle. |
| `slider-drag-carousel.liquid` | Slider — Drag Carousel | Horizontal scroll-snap carousel with pointer drag + hover captions. |
| `slider-editorial-split.liquid` | Slider — Editorial Split | Two-column editorial slideshow with progress bar + numbered nav. |

## Video

| Section file | Editor name | Use when |
|---|---|---|
| `video-bg-hero.liquid` | Video — Background Hero | Full-viewport muted looping MP4 background + centered text. |
| `video-split-modal.liquid` | Video — Split + Modal | Two-column with looping bg video on one side + modal play button opening a YouTube/Vimeo lightbox. |
| `video-poster-modal.liquid` | Video — Poster + Modal | Dark framed poster with centered play button → YouTube/Vimeo modal. |

> Modal videos share `assets/video-modal.js` and `snippets/video-modal.liquid`.
> A single controller handles every modal on the page.

## Galleries

| Section file | Editor name | Use when |
|---|---|---|
| `gallery-marquee.liquid` | Marquee wall | Two infinite-scroll rows (opposite directions) with hover captions. Pure CSS animation + JS duplication for seamless loop. |
| `gallery-stack.liquid` | Stack carousel | Layered-card carousel — center card active, side peeks rotated ±8°. Click side cards to activate. |
| `gallery-focus-wall.liquid` | Focus wall gallery | Asymmetric bento grid (or uniform 3×2) with click-to-open lightbox (ESC, arrow keys, touch swipe). |

## Testimonials

| Section file | Editor name | Use when |
|---|---|---|
| `testimonials.liquid` | Living with Kitchero | Spotlight-mask testimonial cards with mouse-follow reveal. |
| `testimonials-marquee.liquid` | Testimonials — Marquee | Infinite horizontal marquee of quote cards with pause on hover. |
| `testimonials-pullquote.liquid` | Testimonials — Pull Quote | Single giant editorial pull-quote on dark background. Semantic `<blockquote>` + `<cite>`. |

## Image + text

| Section file | Editor name | Use when |
|---|---|---|
| `image-with-text-parallax.liquid` | Parallax split | Two-column with scroll-driven parallax on the image. Intensity configurable 0–30 %. |
| `image-with-text-overlay.liquid` | Editorial image overlay | Hero image with a floating white card overlapping from a merchant-chosen corner. |
| `image-with-text-alternating.liquid` | Alternating image rows | Multi-row alternating image-left / image-right grid. CSS-only alternation via `:nth-child(even)`. |

## Collapsible content

| Section file | Editor name | Use when |
|---|---|---|
| `collapsible-accordion.liquid` | Bordered accordion | Vertical list with numbered prefix + circular plus/minus toggle. Single-open (classic) or multi-open. Native `<details>` + JS smooth-height. |
| `collapsible-minimal.liquid` | Minimal accordion grid | 2-column floating cards. 100 % CSS via `details[open]` selectors — zero JS. |
| `collapsible-visual.liquid` | Visual reveal | Dark two-column accordion with cross-faded image sync — pick an item on the left, image on the right changes. |

## Commerce + marketing

| Section file | Editor name | Use when |
|---|---|---|
| `shop-the-look.liquid` | Interactive hotspots | Lifestyle image with clickable product hotspots (popovers on desktop, bottom sheet on mobile). |
| `shop-color.liquid` | Shop by color | Material swatch grid that navigates to color-filtered collections. |
| `shop-categories.liquid` | Shop by category | Card grid of top categories. |
| `brands.liquid` | Brands strip | Infinite-scroll brand logo marquee. |
| `home-financing.liquid` | Financing partners | Dark financing promotion with emerald accents + partner cards. |
| `mid-cta.liquid` | Mid-page CTA | Full-width scrolled text mask with masked image reveal. |
| `why-choose-us.liquid` | Why choose us | 3–6 feature tiles with icons. Generic homepage trust block. |
| `how-it-works.liquid` | How it works | Sticky scroll-pinned 3-step process cards. |
| `trust-bar.liquid` | Trust bar | Thin strip of 4 trust badges (shipping, returns, warranty, etc.). |
| `guide-teaser.liquid` | Journal teaser | Latest 3 blog articles card grid. |
| `before-after.liquid` | Before / after | Draggable image comparison slider. |
| `ecosystem.liquid` | Ecosystem editorial | Dark scrolling editorial with sticky headline + feature images. |
| `deals-grid.liquid` | Deals grid | Responsive grid of discounted products with countdown overlay. |

## PDP-adjacent (used on product or page templates)

| Section file | Editor name | Use when |
|---|---|---|
| `related-products.liquid` | Related products | Shopify recommendation API grid. Drops on PDP. |
| `visualize-studio.liquid` | Visualize studio | Dark contact form for design consultations. Uses `{% form 'contact' %}`. |
| `contact-form.liquid` | Contact form | Standard contact form with map block option. |
| `why-choose-us-product.liquid` | Why choose us (PDP variant) | 3-column feature row tuned for the showroom PDP. |

## Newsletter + forms

| Section file | Editor name | Use when |
|---|---|---|
| `newsletter-signup.liquid` | Newsletter signup | Inline newsletter CTA with `{% form 'customer' %}`. |
| `newsletter-popup.liquid` | Newsletter popup | Auto-opening modal with delay + localStorage cooldown. Shopify customer form + success state. |

---

## Cross-cutting conventions

All sections follow the same patterns:

- **Naming:** kebab-case liquid files, BEM CSS (`.kt-<section>__<element>`).
- **Schemas:** Every setting is translatable via `t:` keys in
  `locales/*.schema.json`.
- **Presets:** Every section ships at least one preset so merchants can drop
  it in and see meaningful content immediately.
- **Placeholders:** Empty image settings render Shopify's built-in
  `placeholder_svg_tag` — never blank boxes.
- **App blocks:** The Theme Store mandatory surfaces — main-product,
  featured-product, header, footer, main-cart, main-blog, main-article,
  main-collection — all expose `{"type": "@app"}` in their blocks array.
  Merchant-droppable sections that host third-party app blocks (cart
  drawer, newsletter popup, recently-viewed, etc.) include the same
  declaration; smaller utility sections that wouldn't reasonably host an
  app block omit it.
- **JS:** Vanilla, no framework, no build step. Every interactive section
  re-initializes on `shopify:section:load` and cleans up on `unload`.
  Idempotent load guards (`window.__kitchero*Loaded`) prevent double-binding.
- **Accessibility:** WCAG AA. `:focus-visible` rings on every interactive
  element. `prefers-reduced-motion` honored on every animation.
- **Performance:** First image per section uses `loading: eager` +
  `fetchpriority: high`. All others lazy. Explicit `width`/`height` on every
  `<img>`.

---

## Adding a new section

1. Copy the closest existing section as a starting point.
2. Rename files: `sections/<slug>.liquid`, `assets/kt-section-<slug>.css`,
   optionally `assets/kt-section-<slug>.js`. The `kt-section-` prefix is
   the established convention for both CSS and JS — the existing repo's
   section assets all use it.
3. Update BEM prefix to `.kt-<slug>__`.
4. Add translation keys under `sections.<slug_with_underscores>` in both
   `locales/en.default.json` (customer-facing strings via `| t`) and
   `locales/en.default.schema.json` (merchant editor labels).
5. Keep schema `name` under 25 characters (Theme Store rule).
6. Include `{"type": "@app"}` in `blocks` and at least one preset.
7. Run `shopify theme check` — must pass with 0 errors.
8. Test in the theme editor: add, edit, remove, reorder blocks. Verify
   `shopify:section:load` re-initializes any JS.
