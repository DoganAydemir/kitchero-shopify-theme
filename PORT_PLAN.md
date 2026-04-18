# Shopify Port Plan — Kitchero Theme

**Source of visual truth:** `/Users/macos/Documents/GitHub/freemannyc-site-css-js-backups/kitchen theme` (Next.js 16 + React 19 + Tailwind 4)
**Target:** Dawn-based Shopify theme, Theme-Store-ready quality bar
**Reference rules:** `CLAUDE.md` (hard rules) + `references/shopify-rules.md` (Shopify-specific how-to)

This document is the project-specific roadmap: what to port, where it goes, and in what order. Read this before starting any new phase.

---

## Goal

Convert the finished Kitchero Next.js theme into a Shopify theme that:
1. Passes `shopify theme check` with zero errors.
2. Passes Theme Store submission requirements (Lighthouse perf ≥ 60, a11y ≥ 90, @app block support on main sections, proper empty states, dynamic checkout buttons, no deceptive UI, proper a11y, SEO metadata/JSON-LD, app-block compatibility).
3. Preserves 100% of the Next.js theme's visual design — NOT Dawn's visual design.
4. Is merchant-friendly: every visible string, color, image, and layout choice must be editable via the theme editor or Liquid sources (metafields/settings).

---

## Source inventory

### Next.js routes → Shopify template mapping

| Next.js route | Purpose | Shopify target | Notes |
|---|---|---|---|
| `src/app/page.tsx` | Home | `templates/index.json` + home sections | 14 home sections, see section mapping below |
| `src/app/about/page.tsx` | About Us | `templates/page.about.json` (alternate page template) | Includes BeforeAfter comparison + atelier gallery w/ lightbox |
| `src/app/contact/page.tsx` | Contact | `templates/page.contact.json` | Showrooms list + contact form (`{% form 'contact' %}`) |
| `src/app/blog/page.tsx` | Journal listing | `templates/blog.json` | Custom listing layout, not Dawn's default |
| `src/app/blog/[slug]/page.tsx` | Journal detail | `templates/article.json` | Rich content blocks, gallery lightbox, BeforeAfter blocks, video embeds |
| `src/app/collections/page.tsx` | Collections (horizontal grid) | `templates/collection.json` | Primary collection listing, filters + sort |
| `src/app/collections-drawer/page.tsx` | Collections (drawer variant) | `templates/collection.drawer.json` | Alternate template — filter in drawer |
| `src/app/collections-vertical/page.tsx` | Collections (vertical sidebar variant) | `templates/collection.vertical.json` | Alternate template — filter in sidebar |
| `src/app/product/[id]/page.tsx` | Product — E-Commerce Style | `templates/product.json` | Classic PDP: left gallery + right info, vertical thumbnails, accordions, countdown |
| `src/app/showroom/[id]/page.tsx` | Product — Showroom Style | `templates/product.showroom.json` | Alternate product template — premium visual layout |
| `src/app/deals/page.tsx` | Deals | `templates/page.deals.json` | Deal cards link to collections (not product detail) |
| `src/app/financing/page.tsx` | Financing info | `templates/page.financing.json` | Static info page |
| `src/app/testimonials/page.tsx` | Testimonials | `templates/page.testimonials.json` | Dynamic testimonial list (metaobject candidate) |
| `src/app/search/page.tsx` | Search results | `templates/search.json` | Uses `search` object with `types: product,article,page` |
| `src/app/login/page.tsx` | Customer login | `templates/customers/login.json` + `main-login.liquid` section | `{% form 'customer_login' %}` + `{% form 'recover_customer_password' %}` for forgot modal |
| `src/app/register/page.tsx` | Customer register | `templates/customers/register.json` + `main-register.liquid` | `{% form 'create_customer' %}` |
| `src/app/newsletter/page.tsx` | Newsletter landing | `templates/page.newsletter.json` | `{% form 'customer' %}` with email input |
| `src/app/not-found.tsx` | 404 | `templates/404.json` | Simple branded 404 |
| `src/app/banners/page.tsx` | Banner styles showcase | **NOT PORTED** — demo-only page | Skip; was a theme-dev demo |
| `src/app/collapsible/page.tsx` | Collapsible content showcase | **NOT PORTED** — demo-only page | Skip |
| `src/app/galleries/page.tsx` | Gallery showcase | **NOT PORTED** — demo-only page | Skip, but extract components → reusable sections |
| `src/app/sliders/page.tsx` | Slider showcase | **NOT PORTED** — demo-only page | Skip, but extract components → reusable sections |
| `src/app/image-with-text/page.tsx` | Image with text showcase | **NOT PORTED** — demo-only page | Skip, extract as `image-with-text.liquid` section |
| `src/app/shop-the-look/page.tsx` | Shop the look showcase | **NOT PORTED** as a route | Interactive hotspots → `shop-the-look.liquid` section reusable on home and custom pages |
| `src/app/templates/video/page.tsx` | Video template showcase | **NOT PORTED** — demo-only page | Extract as `video.liquid` section |

### Home page sections (from `src/app/page.tsx`)

All sections live in `src/components/sections/`. Each becomes one `sections/*.liquid` file.

| Next.js component | Shopify section file | Dynamic source? | @app block? |
|---|---|---|---|
| `Hero.tsx` | `sections/hero.liquid` | — | No |
| `TrustBar.tsx` | `sections/trust-bar.liquid` | — | No |
| `ShopCategories.tsx` | `sections/shop-categories.liquid` | Collections (settings) | No |
| `ShopColor.tsx` | `sections/shop-color.liquid` | — | No |
| `MidCta.tsx` | `sections/mid-cta.liquid` | — | No |
| `Ecosystem.tsx` | `sections/ecosystem.liquid` | — | No |
| `HowItWorks.tsx` | `sections/how-it-works.liquid` | — | No |
| `Projects.tsx` | `sections/before-after.liquid` | Images (settings) | No |
| `Brands.tsx` | `sections/brands.liquid` | Logos (blocks) | No |
| `WhyChooseUs.tsx` | `sections/why-choose-us.liquid` | Features (blocks) | No |
| `ShopTheLookHome.tsx` | `sections/shop-the-look.liquid` | Hotspots (blocks, each links to a product) | No |
| `HomeFinancing.tsx` | `sections/home-financing.liquid` | — | No |
| `GuideTeaser.tsx` | `sections/guide-teaser.liquid` | — | No |
| `Testimonials.tsx` | `sections/testimonials.liquid` | Testimonials (blocks) | No |
| `ShopTheLookHome.tsx` hotspots | Hotspot blocks inside `shop-the-look.liquid` | Product links | No |

### Shared components

| Next.js component | Shopify target |
|---|---|
| `Navbar.tsx` | `sections/header.liquid` (inside `layout/header-group.json`), mega menu via `main_menu` linklist + schema blocks |
| `Footer.tsx` | `sections/footer.liquid` (inside `layout/footer-group.json`) |
| `CartDrawer.tsx` | `snippets/cart-drawer.liquid` + `assets/cart-drawer.js` (custom element), rendered in `layout/theme.liquid` |
| `AppointmentDrawer.tsx` | `snippets/appointment-drawer.liquid` + `{% form 'contact' %}`, rendered in `layout/theme.liquid` |
| `SearchOverlay.tsx` | `snippets/search-overlay.liquid` + predictive search, uses `routes.predictive_search_url` |
| `SmoothScroll.tsx` | `assets/smooth-scroll.js` (Lenis), loaded once in `theme.liquid` |
| `BeforeAfter.tsx` | `snippets/before-after.liquid` + `assets/before-after.js` |
| `PageHeader.tsx` | `snippets/page-header.liquid` with parallax dot pattern |
| `SocialIcons.tsx` | `snippets/social-icons.liquid`, reads `settings.social_*_link` |
| `Countdown.tsx` | `snippets/countdown.liquid` + `assets/countdown.js` — **reads `product.metafields.custom.deal_ends_at`** instead of localStorage |

---

## Open decisions (resolve during port)

These need concrete answers before or during the phases that touch them. Flag them when you hit the relevant phase.

1. **Countdown data source.** Current plan: a product metafield `custom.deal_ends_at` (type: `date_time`). Merchant sets the end date per product. Snippet reads it. The limited-offer badge shows when the metafield is set and in the future.
   - **Open:** who creates the metafield definition? → Document in Phase 4 deliverable: include a `config/metafields.json` or manual setup instructions in the theme's setup guide.
2. **Color schemes.** Dawn uses `color_scheme` setting type tied to `config/settings_schema.json` schemes array. The Next.js theme uses stone/emerald/amber palette.
   - **Open:** define 3–5 schemes (e.g., "Light Stone", "Dark", "Emerald Accent") so merchants can switch.
3. **Fonts.** Next.js uses Geist Sans + Geist Mono + serif (default system). Shopify best practice: use `settings.type_header_font_*` and `settings.type_body_font_*` with `font_picker` setting type.
   - **Open:** self-host Geist in `assets/` (Geist is open source, OFL license) OR use Shopify's `font_picker` and accept whatever the merchant picks. Recommend: self-host as default, provide `font_picker` fallbacks.
4. **Two product templates (showroom vs e-commerce).** Shopify supports alternate templates per product via the template suffix. Each product in the admin can be assigned one.
   - **Open:** which is the default? Recommend: `product.json` = e-commerce style (default), `product.showroom.json` = showroom style (optional). Document in setup guide.
5. **Collection card data.** Current Next.js data has `rating`, `isLimitedOffer`, `discount`, `colors` arrays. Shopify products don't have these natively.
   - **Open:** map each to a metafield:
     - `rating` → `reviews.rating` (Shopify's native review metafield) or `custom.rating` (number_decimal)
     - `isLimitedOffer` → derived from `deal_ends_at` metafield
     - `discount` → derived from `compare_at_price` vs `price` (Shopify native)
     - `colors` → `custom.swatch_colors` (list.color) or product variant option
6. **Showroom vs collection listing.** `/collections` is the PLP, `/showroom/[id]` is one product template. In Shopify:
   - PLP = `templates/collection.json`
   - Showroom product page = alternate template suffix `product.showroom.json`
   - **Open:** does the menu label "Showroom Style" in the navbar link to a single product or to a collection of products using the showroom template? → Recommend: point the menu link to a specific showcase product; merchants can change the handle.
7. **Cart drawer JS.** Next.js `CartDrawer.tsx` is React state. Shopify cart drawer uses AJAX cart API (`/cart/add.js`, `/cart/update.js`, `/cart.js`).
   - **Open:** write a custom element wrapper around the drawer that listens for `cart:update` events and re-renders. Dawn's `cart-drawer.js` is a good reference for the event model (but NOT the visual). Update: Use Shopify Section Rendering API for robust HTML updates instead of solely relying on JSON.
8. **Blog → Articles.** Next.js `blogData.ts` has content blocks (paragraph, gallery, video, before-after). Shopify articles are single `content` field (rich text).
   - **Open:** either (a) use Shopify's rich text and lose the typed blocks, or (b) use an article metafield `custom.content_blocks` (list.metaobject) for structured content.
   - **Recommend:** option (a) for v1 (simpler), option (b) as v2 upgrade. For v1, editorial blocks from Next.js are replaced by Shopify's rich text editor content.

---

## Phased rollout

Work in phases. Finish a phase entirely, commit, test in `shopify theme dev`, then move to the next. Don't start a phase before the previous is green.

### Phase 0 — Project scaffold (half day)

**Tasks:**
- Clone Dawn into `/path/to/dawn` as a reference (read-only).
- Clone Skeleton OR fork Dawn into `/path/to/shopify-theme` as the working repo. If forking Dawn, immediately delete all `sections/*.liquid`, `snippets/card-product.liquid` and any other visual components. Keep: `layout/theme.liquid` (as starting point), `config/settings_schema.json` structure, `snippets/meta-tags.liquid`, `snippets/icon-*.liquid`, `snippets/pagination.liquid`, `assets/global.js` patterns, `locales/en.default.json`.
- Initialize git, initial commit.
- Create `.theme-check.yml` via `shopify theme check --init`.
- Set up `shopify theme dev` against a test store.
- Create this `CLAUDE.md`, `PORT_PLAN.md`, `references/shopify-rules.md` (already exists after this session).

**Definition of done:** `shopify theme dev` opens a blank store homepage without errors. `shopify theme check` runs (may show errors, that's fine for now).

---

### Phase 1 — Theme foundation (1 day)

**Goal:** layout, header, footer, global styles, JS bootstrap.

**Tasks:**
- [ ] Port `layout/theme.liquid`: head with `content_for_header`, body with header-group + `content_for_layout` + footer-group. Include meta-tags snippet, global CSS and JS (deferred).
- [ ] Implement valid JSON-LD structure using `snippets/structured-data.liquid` (copy schema patterns from Dawn).
- [ ] Create `config/settings_schema.json` with:
  - `theme_info` metadata block (name, version, theme_author, theme_documentation_url)
  - Color schemes (Light Stone default, Dark, Emerald, Midnight — 4 schemes)
  - Typography settings (heading font, body font — font_picker with Geist fallback)
  - Layout settings (container width, spacing scale)
  - Social links
- [ ] Create `layout/header-group.json` and `layout/footer-group.json` as section groups.
- [ ] Port `sections/header.liquid` from Next.js `Navbar.tsx`:
  - Desktop: logo + main menu + icons (search, account, cart)
  - Mega menu: use schema blocks (`"type": "mega_menu_column"`)
  - Mobile: off-canvas panel (custom element)
  - Linklists: `section.settings.main_menu` (type: `link_list`)
  - **Must include `{"type": "@app"}` block slot in schema.**
- [ ] Port `sections/footer.liquid` from `Footer.tsx`:
  - Schema blocks: `link_list`, `text`, `image`, `newsletter`, `social`
  - **Must include `{"type": "@app"}` block slot in schema.**
- [ ] Port `snippets/cart-drawer.liquid` and `assets/cart-drawer.js` (custom element).
- [ ] Port `snippets/appointment-drawer.liquid` with `{% form 'contact' %}`.
- [ ] Port `snippets/search-overlay.liquid` with predictive search fetch to `routes.predictive_search_url`.
- [ ] Port Lenis smooth scroll → `assets/smooth-scroll.js`, deferred load.
- [ ] Base CSS: `assets/base.css` with design tokens, typography, reset. One file, no imports.
- [ ] Global JS: `assets/theme.js` with event delegation for drawers, announcement bar behavior, smooth scroll init.

**Definition of done:**
- `shopify theme dev` shows homepage with working header, footer, cart drawer, appointment drawer, search overlay.
- Theme editor can edit header settings, footer blocks, and color schemes.
- Header and Footer support App Blocks via theme editor.
- `shopify theme check` shows 0 errors (warnings OK if justified).
- Manual a11y pass: keyboard tab-through header + drawers + footer, visible focus everywhere.

---

### Phase 2 — Home page sections (2–3 days)

**Goal:** all 14 home sections ported, `templates/index.json` composes them.

**Tasks (one section per sub-phase, one commit each):**
- [ ] `sections/hero.liquid` — Hero with CTA, background image, eyebrow text
- [ ] `sections/trust-bar.liquid` — logos strip, auto-scrolling
- [ ] `sections/shop-categories.liquid` — 3-column category grid, each links to a collection (collection picker setting)
- [ ] `sections/shop-color.liquid` — color swatch grid linking to filtered collections
- [ ] `sections/mid-cta.liquid` — dual-CTA band
- [ ] `sections/ecosystem.liquid` — scroll-pinned right-column image with left scrolling text (GSAP ScrollTrigger)
- [ ] `sections/how-it-works.liquid` — numbered steps, blocks
- [ ] `sections/before-after.liquid` — drag-to-compare before/after with `snippets/before-after.liquid` — Before image LEFT, After image RIGHT
- [ ] `sections/brands.liquid` — logo grid, blocks
- [ ] `sections/why-choose-us.liquid` — feature grid, blocks
- [ ] `sections/shop-the-look.liquid` — image with hotspot blocks (each hotspot = product link). **Critical: hotspot layer must be OUTSIDE the `overflow-hidden` clip container so popups don't clip.**
- [ ] `sections/home-financing.liquid` — promo band linking to financing page
- [ ] `sections/guide-teaser.liquid` — editorial teaser card linking to journal
- [ ] `sections/testimonials.liquid` — testimonial grid, blocks. **Mobile title must be left-aligned (`items-start md:items-end` on the header flex row).**

**Compose `templates/index.json`:** add all sections in order, set default preset.

**Definition of done:**
- Home page renders identically to Next.js source in both desktop and mobile.
- All empty states correctly display default Shopify SVG placeholders if images are omitted.
- All sections are editable in theme editor, can be reordered, added, removed.
- Lenis smooth scroll works (test with `shopify:section:load` — every section's JS must re-init).
- Theme Check: 0 errors.

---

### Phase 3 — Collection listing templates (2 days)

**Goal:** three collection listing variants (horizontal, drawer, vertical), countdown pills on deal cards, filter/sort functional.

**Tasks:**
- [ ] `sections/main-collection-horizontal.liquid` — default listing, top filter bar with dropdowns, 2/3/4 column toggle, product card with hover image swap, countdown pill for limited offers
- [ ] `sections/main-collection-drawer.liquid` — listing with filter drawer (right side)
- [ ] `sections/main-collection-vertical.liquid` — listing with left sidebar filters
- [ ] `templates/collection.json` → main-collection-horizontal
- [ ] `templates/collection.drawer.json` → main-collection-drawer
- [ ] `templates/collection.vertical.json` → main-collection-vertical
- [ ] Implement standard Shopify `{% paginate %}` logic across all grid views using `snippets/pagination.liquid` (max limit 50 per page).
- [ ] `snippets/card-product.liquid` — product card (replaces Dawn's), with hover image swap, limited-offer pill + countdown, star rating, color swatches, price/compare-at, Add to cart, quick-view link
- [ ] `snippets/countdown.liquid` + `assets/countdown.js` — reads `product.metafields.custom.deal_ends_at`, re-inits on `shopify:section:load`, cleans interval on `shopify:section:unload`
- [ ] `snippets/collection-filters.liquid` — reads `collection.filters` (Shopify Storefront Filtering API), handles filter URL state. **Must use Shopify's Section Rendering API (`/?section_id=...`) to update filters and grid without full page reloads.**
- [ ] Sort options: use Shopify's native sort_by parameter

**Decisions to resolve here (from Open Decisions):** #1 (countdown metafield), #5 (collection card data)

**Definition of done:**
- All three listing variants render correctly.
- Filtering works via Section Rendering API without full page reload.
- Pagination works correctly and navigates between pages.
- Countdown pills tick down on the client, stop at 0, hide after expiry.
- Theme editor can swap between variant templates by creating new collection template JSON files.

---

### Phase 4 — Product templates (3 days)

**Goal:** two product page templates (e-commerce + showroom), both fully functional for add-to-cart, variants, gallery, countdown.

**Tasks:**
- [ ] `sections/main-product.liquid` — E-Commerce Style PDP. Left: gallery with vertical thumbnails column + main image + lightbox. Right: breadcrumb, title, rating, countdown (if limited offer), price, description, finish selector (variant), cabinet type selector (variant), quantity + add to cart, wishlist/share, trust badges, accordions. **Schema must include `{"type": "@app"}` block slot.**
- [ ] `sections/main-product-showroom.liquid` — Showroom Style PDP: premium visual layout, different gallery treatment, hero image + content grid + materials + customization + 3D viewer placeholder + brochure download. **Schema must include `{"type": "@app"}` block slot.**
- [ ] `templates/product.json` → main-product (default)
- [ ] `templates/product.showroom.json` → main-product-showroom (alternate)
- [ ] Implement `snippets/seo-title.liquid` and product JSON-LD structured data.
- [ ] `snippets/product-media-gallery.liquid` — gallery with vertical thumb column (desktop), horizontal strip (mobile), fullscreen lightbox with ChevronLeft/Right navigation, zoom mode
- [ ] `snippets/product-variant-picker.liquid` — variant selector that updates the URL + selected variant
- [ ] `snippets/product-form.liquid` — `{% form 'product', product %}` with variant ID, quantity, add to cart button. **Must include the dynamic checkout button `{{ form | payment_button }}` alongside Add to Cart.**
- [ ] `snippets/product-price.liquid` — price with compare-at, discount badge
- [ ] `snippets/product-accordion.liquid` — description, specifications, shipping/returns accordions
- [ ] JS: `assets/product-gallery.js` (custom element), `assets/product-form.js` (variant change, add to cart AJAX)
- [ ] Related products / "You may also like" section

**Decisions to resolve here:** #4 (default product template), #5 (product metafields — rating, colors, swatches)

**Definition of done:**
- Add to cart works via AJAX, updates cart drawer.
- Variant selection updates price, image, stock.
- Dynamic Checkout Button functions correctly.
- Gallery thumbnails on left (desktop), horizontal (mobile).
- Fullscreen lightbox with arrow navigation works.
- Countdown appears only when `deal_ends_at` metafield is set and in the future.
- `@app` block slot renders apps correctly (test with a dummy app block).
- Theme editor can assign `product.showroom` alternate template to a product.

---

### Phase 5 — Content pages (1 day)

**Goal:** about, contact, financing, testimonials, newsletter, deals — all static-ish pages.

**Tasks:**
- [ ] `templates/page.about.json` + sections (hero, philosophy split, atelier gallery with lightbox, materials quote, before-after)
- [ ] `sections/atelier-gallery.liquid` — bento gallery with lightbox + arrow nav (port from Next.js about page)
- [ ] `templates/page.contact.json` + `sections/contact.liquid` with `{% form 'contact' %}` + showrooms list
- [ ] `templates/page.financing.json` + sections
- [ ] `templates/page.testimonials.json` — testimonial grid (metaobject candidate for v2)
- [ ] `templates/page.newsletter.json` + `{% form 'customer' %}` for email capture
- [ ] `templates/page.deals.json` + `sections/deals.liquid` — deal cards linking to `/collections/all` or filtered collection. **Deal cards link to collections, NOT product detail.**

**Definition of done:**
- All content pages render.
- All forms submit successfully (Shopify form blocks).
- A11y pass on all forms.

---

### Phase 6 — Blog + Journal (1 day)

**Tasks:**
- [ ] `templates/blog.json` + `sections/main-blog.liquid` (listing with custom layout from Next.js). **Must include standard `{% paginate %}` logic.**
- [ ] `templates/article.json` + `sections/main-article.liquid`
- [ ] Add JSON-LD structured data for Articles.
- [ ] `snippets/article-card.liquid`
- [ ] Comment form with `{% form 'new_comment' %}`
- [ ] Share buttons
- [ ] Lightbox z-index above navbar (z-[9000])

**Definition of done:**
- Blog listing + article detail render.
- Pagination functions on blog listing.
- Comments form works.
- Lightbox escapes navbar z-index.

---

### Phase 7 — Customer account pages (1 day)

**Tasks:**
- [ ] `templates/customers/login.json` + `sections/main-login.liquid` with `{% form 'customer_login' %}` and `{% form 'recover_customer_password' %}` for forgot password modal
- [ ] `templates/customers/register.json` + `sections/main-register.liquid` with `{% form 'create_customer' %}`
- [ ] `templates/customers/account.json` — Shopify default is fine for v1
- [ ] `templates/customers/order.json` — Shopify default
- [ ] `templates/customers/addresses.json` — Shopify default

**Definition of done:**
- Login, register, forgot password forms work end-to-end.
- Forms have proper `<label for>` associations (already fixed in Next.js source — port as-is).

---

### Phase 8 — Cart, search, 404 (half day)

**Tasks:**
- [ ] `templates/cart.json` + `sections/main-cart.liquid` (full cart page, linked from drawer). **Must include `{"type": "@app"}` block slot in schema.**
- [ ] Cart Drawer JS: Update to use Shopify's Section Rendering API to fetch updated HTML fragments when quantities change, rather than just JSON endpoints.
- [ ] `templates/search.json` + `sections/main-search.liquid` with `search` object
- [ ] `templates/404.json` + `sections/main-404.liquid`
- [ ] `templates/gift_card.liquid` — Shopify default, minor styling

**Definition of done:**
- Cart drawer + full cart page both work via Section Rendering API.
- Cart supports app blocks for upsells/rewards.
- Search returns products, articles, pages.
- 404 renders.

---

### Phase 9 — Locales + metafields + settings cleanup (half day)

**Tasks:**
- [ ] Move every hardcoded English string into `locales/en.default.json` and replace with `{{ 'key' | t }}`
- [ ] Create `locales/en.default.schema.json` for setting labels
- [ ] Document all required metafields in a setup guide (`SETUP.md`)
- [ ] Review `config/settings_schema.json` for completeness
- [ ] Add default `config/settings_data.json` with at least 1 well-defined theme preset (e.g., "Kitchero Default"). This preset must not only define colors, but properly assign default sections, typography, and layout settings applied when a merchant installs the theme.

**Definition of done:**
- `shopify theme check` translation errors = 0
- Theme works in a 2nd locale with empty translations (shows keys)
- Installing the theme applies the custom preset automatically.

---

### Phase 10 — Theme Check + Lighthouse + A11y pass (1 day)

**Tasks:**
- [ ] `shopify theme check` must return 0 errors. Justify any remaining warnings in `.theme-check.yml` with inline comments.
- [ ] Run Lighthouse on home, collection, product (desktop + mobile). Target: perf ≥ 60, a11y ≥ 90.
- [ ] Manual a11y: keyboard nav every page, screen reader pass (VoiceOver on Mac), color contrast check.
- [ ] Theme editor pass: edit every section, add/remove/reorder blocks, verify no JS breaks.
- [ ] Performance: lazy-load all non-critical images, `loading="lazy"`, explicit width/height.
- [ ] JS: ensure all interactive components work with JS disabled (navigation, forms submit, product form posts).

**Definition of done:**
- Theme Check: 0 errors.
- Lighthouse: all targets met.
- Keyboard-only navigation works everywhere.
- Theme editor: no broken sections on re-render.

---

### Phase 11 — Package + documentation (half day)

**Tasks:**
- [ ] Write `README.md` with install instructions, required metafields, preset setup.
- [ ] Write `SETUP.md` with per-page setup walkthrough for merchants.
- [ ] Generate preview images for each preset.
- [ ] `shopify theme package` to create distributable zip.
- [ ] If Theme Store: prepare listing assets per Shopify's listing requirements.

**Definition of done:**
- Zip installs cleanly on a fresh store.
- README walks merchant through initial setup.
- Theme shows up correctly in theme editor after install.

---

## Non-negotiables per phase

Every phase, before committing:
1. Run `shopify theme check` — fix errors before commit.
2. Test in `shopify theme dev` — open the affected page, verify visually matches Next.js source.
3. Theme editor test — open affected section in the editor, verify it re-renders without JS errors on `shopify:section:load`.
4. Keyboard test — tab through the affected UI, verify visible focus.
5. Commit with atomic scope (see CLAUDE.md commit style).

## What's out of scope

- ~~Multi-language translation content~~ **UPDATE: Multi-language IS in scope.** Theme ships with 5 languages: EN (default), TR, DE, FR, ES. Locale structure from Phase 1, translations completed in Phase 9.
- Custom apps (wishlist, reviews — these will be app blocks)
- Payment customization (Shopify handles checkout)
- Order tracking pages beyond Shopify defaults
- B2B / wholesale features
- Metaobject-based content for articles (v2 feature)