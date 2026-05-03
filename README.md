# Kitchero — Premium Shopify Theme

A Theme-Store-ready Shopify OS 2.0 theme designed for luxury kitchen, cabinetry, and home-design brands. Built on Shopify's approved Skeleton baseline with a completely custom visual design — no reference-theme UI is reused.

![Theme Check](https://img.shields.io/badge/theme%20check-0%20errors-brightgreen)
![Shopify OS 2.0](https://img.shields.io/badge/Shopify-OS%202.0-96bf48)
![Languages](https://img.shields.io/badge/languages-5-blue)
![License](https://img.shields.io/badge/license-commercial-black)

---

## Overview

Kitchero is a premium Shopify theme built for merchants selling high-end kitchen cabinets, countertops, and home-design products. It offers a showroom-grade visual experience with cinematic animations, while remaining fully editable through the Shopify theme editor.

**Key features:**

- **Two product page layouts** — E-commerce style (gallery + sticky info) and Showroom style (alternating full-width / paired gallery)
- **Three collection layouts** — horizontal filter bar, right-side filter drawer, left sticky sidebar
- **Mega menu navigation** — 3-level menus render as grid-style mega menus, 2-level menus as flyout dropdowns
- **GSAP + ScrollTrigger + Lenis** — self-hosted vendor libraries for buttery-smooth scroll animations and parallax effects
- **Product countdown timer** — backed by `custom.deal_ends_at` metafield (real offer end date, not fake urgency)
- **Star ratings + color swatches** — reads Shopify's native `reviews.rating` metafield or custom fallback
- **AJAX collection filtering** — Shopify Section Rendering API, no full-page reload
- **AJAX cart drawer** — variant switching, quantity updates, and add-to-cart without page reload
- **i18n-ready for 5 languages** — English translation complete; Turkish, German, French, and Spanish locale files scaffolded as empty stubs ready to translate
- **4 color schemes** — Light Stone, Dark, Emerald, Midnight
- **3-font system** — Inter (headings + body) + Playfair Display (serif accent)
- **WCAG AA accessible** — keyboard-navigable, screen-reader-friendly, visible focus rings, 4.5:1 color contrast
- **Full @app block support** — product, cart, header, footer sections accept app blocks
- **Progressive enhancement** — every form and interaction works without JavaScript

---

## Requirements

- **Shopify plan:** Any paid plan (Basic and up)
- **Theme Store compatibility:** Shopify OS 2.0
- **Optional review app:** Any app that populates the `reviews.rating` metafield (Shopify Product Reviews, Judge.me, Loox, Stamped, etc.) — the theme also supports a manual `custom.rating` fallback

---

## Installation

### Option 1: Upload via Admin (recommended for merchants)

1. Download the latest `kitchero.zip` from the release.
2. In your Shopify admin, go to **Online Store > Themes**.
3. Click **Upload theme** and select `kitchero.zip`.
4. Once uploaded, click **Customize** to open the theme editor.

### Option 2: Shopify CLI (for developers)

```bash
# Clone this repository
git clone <your-fork-url>
cd kitchero-shopify-theme

# Install Shopify CLI if you don't have it
npm install -g @shopify/cli @shopify/theme

# Authenticate (replace <your-store> with your Shopify store handle)
shopify login --store <your-store>.myshopify.com

# Push to your development store
shopify theme push --unpublished
```

---

## Initial setup

After installing the theme, complete these steps to get it fully operational. Detailed instructions are in [`SETUP.md`](./SETUP.md).

### 1. Create required metafields

The theme reads two optional product metafields. Create them in **Settings > Custom data > Products**:

| Namespace & key | Type | Purpose |
|---|---|---|
| `custom.deal_ends_at` | Date and time | Powers the countdown timer on deal products |
| `custom.rating` | Decimal (0–5) | Manual fallback star rating if you don't use a review app |

### 2. Set up navigation menus

- **Main menu:** 2 levels = flyout dropdown, 3 levels = full mega menu. Assign to Header section.
- **Footer menus:** Multiple menu blocks in the Footer section, each can reference a different menu.

### 3. Configure theme settings

Open **Theme editor > Theme settings** (gear icon) and configure:

- **Logo** — upload your brand logo
- **Colors** — pick one of 4 built-in schemes or customize
- **Typography** — Inter + Playfair Display defaults, or swap via font picker
- **Social media** — Facebook, Instagram, YouTube, TikTok, X, Pinterest links
- **Cart** — drawer (default) or full-page cart

### 4. Assign alternate templates

For collections and products, you can assign alternate templates in the admin:

- `collection.drawer` — right-side filter drawer
- `collection.vertical` — left sticky sidebar filters
- `product.showroom` — showroom-style product page with alternating gallery

---

## Template structure

```
├── layout/
│   ├── theme.liquid              ← main layout (header, footer, cart drawer, search overlay)
│   └── password.liquid           ← password page
│
├── templates/
│   ├── index.json                    ← home (14 sections)
│   ├── product.json                  ← e-commerce product page
│   ├── product.showroom.json         ← showroom product page (alternate)
│   ├── collection.json               ← horizontal filter bar
│   ├── collection.drawer.json        ← right-side drawer filters (alternate)
│   ├── collection.vertical.json      ← left sidebar filters (alternate)
│   ├── list-collections.json         ← catalog / all-collections landing
│   ├── blog.json / article.json      ← journal listing + detail
│   ├── cart.json / search.json       ← cart + search
│   ├── 404.json                      ← not found
│   ├── page.json                     ← default page (dotted hero + CMS body)
│   ├── page.about.json               ← alternate: about
│   ├── page.contact.json             ← alternate: contact with showrooms
│   ├── page.deals.json               ← alternate: deals
│   ├── page.financing.json           ← alternate: financing partners
│   ├── page.newsletter.json          ← alternate: newsletter landing
│   ├── page.testimonials.json        ← alternate: testimonials landing
│   ├── password.json / gift_card     ← password gate + gift card
│   └── customers/                    ← login, register, account, activate_account,
│                                       reset_password, order, addresses
│
├── sections/            ← 76 sections (57 merchant-droppable + 19 template-bound)
├── snippets/            ← 32 snippets (card-product, countdown, search-overlay, video-modal, etc.)
├── assets/              ← CSS, JS, vendor libraries
├── config/
│   ├── settings_schema.json
│   └── settings_data.json
└── locales/             ← en, tr, de, fr, es + schema variants
```

---

## Development

### Local development

```bash
shopify theme dev --store your-store.myshopify.com
```

This starts a local dev server with hot reload.

### Theme Check

```bash
shopify theme check
```

Should return **0 errors, 0 warnings**. CI-friendly.

### Package for distribution

```bash
shopify theme package
```

Creates a `.zip` ready for upload to Shopify admin or Theme Store submission.

---

## Architecture notes

- **CSS:** Plain vanilla CSS with BEM naming (`.kt-*` prefix). No Sass, no Tailwind in output, no build step. Each section loads its own CSS file via `{{ 'section-*.css' | asset_url | stylesheet_tag }}`.
- **JavaScript:** Vanilla JS with IIFE scoping. No frameworks, no build step. One file per interactive section. GSAP, ScrollTrigger, and Lenis are self-hosted in `assets/vendor-*.js` (unminified, per Theme Store rules).
- **Liquid:** Uses `{% render %}` (never `{% include %}`). All schemas use `t:` translation keys. All strings are localized via `{{ 'key' | t }}`.
- **Progressive enhancement:** All forms use Shopify `{% form %}` tags (auto action/method). Navigation uses real `<a href>` links. The cart drawer falls back to `/cart` when JS is off. CSS-only dropdowns via `:hover` and `:focus-within`.
- **Performance:** All `<img>` use `image_tag` with explicit `width`/`height` and `loading="lazy"`. All scripts use `defer`. Fonts loaded via `font_face` with `font_display: swap`.
- **Accessibility:** WCAG AA compliant. Skip-to-content link, `role="main"` landmark, `<nav aria-label>`, visible focus rings (`:focus-visible`), `aria-label` on icon-only buttons, `aria-expanded` on toggles.

---

## Internationalization

The theme's i18n structure supports 5 languages out of the gate:

| Code | Language | Translations |
|---|---|---|
| `en` | English | Complete (default) |
| `tr` | Turkish | Stub (ready to translate) |
| `de` | German | Stub |
| `fr` | French | Stub |
| `es` | Spanish | Stub |

Storefront strings live in `locales/*.json`; theme editor labels live in
`locales/*.schema.json`. When a non-English key is missing, Shopify falls
back to the English default automatically — so the theme is fully
functional in every language, it just renders in English until a
translator fills in the stub files.

Enable languages in **Settings > Languages**.

---

## Browser support

- Chrome / Edge (last 2 versions)
- Safari (last 2 versions)
- Firefox (last 2 versions)
- Mobile Safari (iOS 14+)
- Chrome Android (last 2 versions)

Graceful degradation for older browsers: animations disabled, but all content and commerce functionality work.

---

## Sections

Kitchero ships with **57 sections** — 15 template-bound (13 `main-*` sections
plus `header` and `footer`) and **42 merchant-droppable sections** grouped into
10 categories (heroes + banners, sliders, video, galleries, testimonials,
image + text, collapsibles, commerce + marketing, PDP-adjacent, newsletter + forms).

See [`docs/SECTIONS.md`](./docs/SECTIONS.md) for the full catalogue, organized
by intent, with use-when guidance for each section.

---

## Documentation

| File | Purpose |
|---|---|
| [`README.md`](./README.md) | This file — overview + install |
| [`SETUP.md`](./SETUP.md) | Per-page setup walkthrough for merchants |
| [`docs/SECTIONS.md`](./docs/SECTIONS.md) | Full sections catalogue |
| [`docs/THEME-STORE-LISTING.md`](./docs/THEME-STORE-LISTING.md) | Copy-paste Theme Store submission content |
| [`docs/PREVIEW-IMAGES.md`](./docs/PREVIEW-IMAGES.md) | Spec for preview images required by Shopify |
| [`PORT_PLAN.md`](./PORT_PLAN.md) | Engineering plan + phase history |

---

## Support

- **Documentation:** [`SETUP.md`](./SETUP.md) for per-page setup walkthrough
- **Issues:** Report bugs via the repository issue tracker
- **Theme docs / support:** Configure `theme_documentation_url` and `theme_support_url` in `config/settings_schema.json` with your live merchant-facing URLs before submission.

---

## License

Commercial theme. See `LICENSE` for terms.

---

## Credits

- **Architectural reference:** [Shopify Skeleton](https://github.com/Shopify/skeleton-theme) — approved baseline, no visual components reused
- **Animations:** [GSAP](https://greensock.com/gsap/) + [ScrollTrigger](https://greensock.com/scrolltrigger/) (self-hosted, standard license)
- **Smooth scroll:** [Lenis](https://github.com/darkroomengineering/lenis) (self-hosted, MIT)
- **Fonts:** [Inter](https://rsms.me/inter/) + [Playfair Display](https://fonts.google.com/specimen/Playfair+Display) (Google Fonts, OFL)
