Kitchero 1.0.0 — initial Theme Store release. Built on Shopify
Skeleton with Online Store 2.0 architecture, full multi-language
support (English, Turkish, German, French, Spanish), and app-block
support on the primary commerce surfaces (product page, featured
product, header, footer, cart page).

## 1.0.0

### Added

- Editorial home page composition with a 15-section default preset
  covering hero, trust bar, shop categories, mid-CTA, ecosystem,
  how-it-works, before-after, brands, why-choose-us, shop-the-look,
  home-financing, guide teaser, testimonials, and parallax CTA.
- Two product page layouts: standard `main-product` and editorial
  `main-product-showroom` with consultation drawer integration.
- Cart drawer with free-shipping progress bar, cart-level discounts,
  variant-aware recommendations from Shopify's Search & Discovery
  curated metafield, gift-wrapping cart attribute, and a curated
  upsell band.
- Predictive search overlay with category-aware suggestions and a
  configurable popular queries panel.
- Full customer account templates (login, register, account, order,
  addresses, activate, reset) plus an editorial sign-in surface.
- Honest low-stock indicator surfaced on product pages and product
  cards — renders only when Shopify-managed inventory is at or
  below the merchant-set threshold; never a fabricated counter.
- Real metafield-backed countdown timer on product pages and cards
  when the `custom.deal_ends_at` metafield is populated.
- Color-scheme system with a single editorial scheme by default;
  scheme controls expose surface, text, action, link, and shadow.
- Theme settings for logo width (desktop + mobile), favicon, page
  width override, section spacing, grid spacing, motion reveal,
  intro loader, button border + radius + shadow, input border +
  radius, product card padding / border / radius / alignment,
  collection card padding + radius, drawer border, badge radius,
  swatch shape / size / visible count, social links, search
  behaviour, cart type, free-shipping threshold, country and
  language selectors, appointment drawer toggle, and search
  overlay toggle.
- Vendor motion bundle (GSAP + ScrollTrigger + Lenis) gated by
  template (excluded on cart, gift-card, password, 404, captcha,
  policy, and customer templates) and by the merchant motion-reveal
  toggle, keeping the toggle off by default for Lighthouse-sensitive
  merchants.
- Non-critical CSS loads with the `media="print" onload` async
  pattern and a `<noscript>` fallback.
- LCP images (hero, gallery, collection banner) carry
  `fetchpriority="high"` and `loading="eager"`; every other image
  defaults to lazy.
- Skip-to-content link as the first interactive element on every
  page.
- Hero slider rotates a single `<h1>` per page outline; inactive
  slides carry `aria-level="2"` placeholders flagged
  `aria-hidden="true"`.
- Every interactive section listens for `shopify:section:load` and
  `shopify:section:unload`, so the theme editor reflects live
  updates without stale handlers.
- Sticky and fixed elements are neutralised inside the editor iframe
  so the section-selection overlay is never occluded.
- Empty-state hints render inside `request.design_mode` so an
  unconfigured section communicates what the merchant needs to add.
- All interactive elements are keyboard-reachable with a visible
  `:focus-visible` ring; body and muted text meet WCAG 1.4.3 AA
  (≥4.5:1) on the default scheme.
- Forms ship correct `<label for>`, `autocomplete`, `<fieldset>` /
  `<legend>` markup; honeypot fields stay visually hidden but
  accessible to screen readers.
