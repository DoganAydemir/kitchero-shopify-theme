# Kitchero Theme Setup Guide

This document describes the metafields, menus, and settings a merchant must configure after installing the Kitchero theme.

---

## Required Metafields

The theme reads the following product metafields. Create them in **Settings > Custom data > Products** before using the corresponding features.

### 1. Deal Countdown Timer

| Field | Value |
|---|---|
| **Namespace & key** | `custom.deal_ends_at` |
| **Type** | `date_time` |
| **Required** | No (optional per product) |
| **Used by** | Product cards, product detail page |

When this metafield is set to a future date/time on a product, a live countdown timer appears on that product's card and detail page. Once the date passes, the countdown automatically hides.

**How to set it:**
1. Go to **Settings > Custom data > Products**.
2. Click **Add definition**.
3. Set namespace and key to `custom.deal_ends_at`.
4. Choose type **Date and time**.
5. Save, then edit any product and set the date under the metafields section.

---

### 2. Product Rating (manual fallback)

| Field | Value |
|---|---|
| **Namespace & key** | `custom.rating` |
| **Type** | `number_decimal` |
| **Required** | No (optional) |
| **Used by** | Product cards, product detail page |

The theme first checks for the Shopify-native `reviews.rating` metafield (populated automatically by review apps like Shopify Product Reviews, Judge.me, Loox, etc.). If that is not present, it falls back to this manual `custom.rating` field.

**Values:** A decimal between `0` and `5` (e.g., `4.5`).

**How to set it:**
1. Go to **Settings > Custom data > Products**.
2. Click **Add definition**.
3. Set namespace and key to `custom.rating`.
4. Choose type **Decimal**.
5. Set validation: minimum `0`, maximum `5`.
6. Save, then edit any product and enter a rating value.

---

### 3. Shopify Native Review Metafields (automatic)

These are populated automatically by Shopify-compatible review apps:

| Namespace & key | Type | Description |
|---|---|---|
| `reviews.rating` | `rating` | Star rating object with `.value.rating` and `.value.scale_max` |
| `reviews.rating_count` | `number_integer` | Total number of reviews |

No manual setup is needed if you install a review app.

---

### 4. Door Sample Thumbnail (Showroom PDP)

| Field | Value |
|---|---|
| **Namespace & key** | `custom.door_sample` |
| **Type** | `File` (file_reference, accepts images) |
| **Required** | No (optional per product) |
| **Used by** | `product.showroom` template — the small thumbnail next to the product title |

The Showroom product page shows a small 80×106 door-sample thumbnail next to the product title. This image is meant to be a close-up of the cabinet door front (or a color swatch) so shoppers instantly see the finish they're looking at.

**Fallback:** When this metafield is not set, the theme renders the product's **featured image** instead. That is rarely what you want on a Showroom layout, so setting the metafield per product is strongly recommended.

**How to set it:**
1. Go to **Settings > Custom data > Products**.
2. Click **Add definition**.
3. Set namespace and key to `custom.door_sample`.
4. Choose type **File** with the option **Accept files of type: Image** enabled.
5. Save.
6. Edit any product that uses the `product.showroom` template, scroll to **Metafields** and upload a door-front / finish close-up (recommended 400×520 px or larger, 4:5.2 portrait aspect works best).

---

## Navigation Menus

### Main Menu

The header reads the menu assigned in the **Header** section settings (default: `main-menu`).

- **2-level menus** (parent > children) render as flyout dropdowns.
- **3-level menus** (parent > children > grandchildren) render as mega menus with a grid layout.
- To show a **Sale badge** on a menu item, include `<span class="kt-header__sale-badge">Sale</span>` in the menu item title (Shopify allows HTML in menu titles).

### Footer Menus

Add footer menu blocks in the **Footer** section. Each block can reference a different menu handle.

---

## Theme Settings Overview

Access all theme settings in **Online Store > Themes > Customize > Theme settings** (gear icon).

| Setting Group | Key Settings |
|---|---|
| **Logo** | Logo image, desktop width, favicon |
| **Colors** | 4 built-in color schemes (Light Stone, Dark, Emerald, Midnight) |
| **Typography** | Heading font, body font, accent/serif font, size scales |
| **Layout** | Page width (1000-1600px), section spacing, grid spacing |
| **Animations** | Enable/disable scroll reveal animations (GSAP) |
| **Buttons** | Border thickness, radius, shadow |
| **Inputs** | Border thickness, radius |
| **Product cards** | Style, image padding, text alignment, colors, borders, shadows |
| **Badges** | Position, corner radius, sale/sold-out color schemes |
| **Social media** | Links for Facebook, Instagram, YouTube, TikTok, X, Pinterest |
| **Search** | Enable suggestions, show vendor/price in results |
| **Cart** | Drawer vs page, show vendor, enable cart note |

---

## Alternate Templates

The theme includes alternate templates for different layouts:

| Template | Purpose | How to Use |
|---|---|---|
| `collection.json` | Standard collection (horizontal filter bar) | Default for all collections |
| `collection.drawer.json` | Collection with right-side filter drawer | Assign to specific collections in admin |
| `collection.vertical.json` | Collection with left sidebar filters | Assign to specific collections in admin |
| `product.json` | E-commerce product page (gallery + info) | Default for all products |
| `product.showroom.json` | Showroom product page (premium visual layout) | Assign to showcase products |
| `page.about.json` | About us page | Create a page and assign this template |
| `page.contact.json` | Contact page with showrooms | Create a page and assign this template |
| `page.deals.json` | Deals/promotions page | Create a page and assign this template |
| `page.newsletter.json` | Newsletter signup page | Create a page and assign this template |

---

## Languages

The theme supports 6 languages out of the box:
- English (default)
- Turkish
- German
- French
- Spanish
- Arabic (RTL)

To enable additional languages, go to **Settings > Languages** and add the desired languages. Translation files are in the `locales/` directory.

---

## Per-Page Setup Walkthrough

### Home page

The home page template (`templates/index.json`) includes 14 default sections. Open **Customize > Home page** and configure each:

1. **Slideshow (hero)** — Add up to 5 slide blocks. Each slide needs:
   - Image (1920×1080 recommended)
   - Subtitle (e.g., "Crafted in Italy")
   - Heading line 1 + italic word + heading line 2
   - Description
   - Button text + button link
   - Set autoplay speed (default 5s)

2. **Stats counter** — Add 3–5 stat blocks. Each has:
   - Number (e.g., `500`)
   - Suffix (e.g., `+`, `%`, `k`)
   - Label (e.g., `Happy Customers`)

3. **Collection list (shop categories)** — Add category blocks. Each block links to a collection with a title and image.

4. **Collection tabs (shop by colors)** — Category accordion with finish swatches. Each category has up to 3 finishes, each finish has name, code, image, 2 colors, and link.

5. **Image with text (mid CTA)** — Add label, heading (supports `<em>italic</em>`), description, button, and image.

6. **Image with features (ecosystem)** — Two-line heading, subtitle, sticky image, and up to 5 feature blocks (number + title + description).

7. **Multicolumn steps (how it works)** — Heading + subtitle, add step blocks (number + title + description + image).

8. **Before/after image** — Heading + subtitle, add before and after images.

9. **Logo list (brands)** — Add up to 12 logo blocks. Each with image and alt text.

10. **Rich text with image (why choose us)** — Two-line heading, description, image, 3 feature blocks (label + title + description).

11. **Hotspot image (shop the look)** — Add up to 6 hotspot blocks. Each has horizontal/vertical position (%), product title, price, image, link.

12. **Promotion banner (home financing)** — Label, two-line heading, description, button, background image. Add partner blocks for payment providers.

13. **Blog posts (guide teaser)** — Choose a blog source and posts count, or add manual article blocks.

14. **Testimonials** — Header + description + background image. Add testimonial blocks (quote + name + role + avatar). Optional CTA block with heading + button.

---

### Product pages

**Two product templates available:**

#### `product.json` (E-commerce style — default)

Layout: 58% gallery (left) + 42% sticky info (right), with breadcrumb, rating, countdown, price, variant picker, and add-to-cart form.

**To customize:**
1. Go to **Customize > Products > Default product**.
2. Edit the **Product information** section.
3. Add blocks:
   - **Trust badges** — Up to 4, each with icon (shipping/returns/warranty/package) and text.
   - **Collapsible tabs** — Description, shipping, care instructions. Each with title + rich text content (or link to a page). Set `Open by default` for one.
4. Optional: add any **app blocks** (e.g., reviews, upsell).

#### `product.showroom.json` (Showroom style)

Layout: 73% alternating gallery (full/pair pattern) + 27% sticky info. Premium visual feel.

**To assign to a product:**
1. Go to **Products > [your product]**.
2. Under **Theme template**, select `product.showroom`.
3. Save.
4. Customize via **Customize > Products > Product showroom**.
5. Add:
   - **Feature tag blocks** — Short descriptive tags (e.g., "Hand-carved oak", "Custom finish").
   - **Collapsible tab blocks** — About, materials, care.
   - Configure warranty banner in section settings.

---

### Collection pages

**Three collection templates available:**

#### `collection.json` (Horizontal filter bar — default)

Top-mounted filter dropdowns + grid toggle (2/3/4 cols) + sort. Includes dot-pattern hero.

#### `collection.drawer.json` (Right-side drawer)

Filters hidden by default, open via "Filters" button. Glassmorphic drawer on right.

#### `collection.vertical.json` (Left sticky sidebar)

Traditional e-commerce layout with always-visible filters on the left.

**To assign:**
1. **Collections > [your collection]**.
2. Under **Theme template**, select the desired variant.

**Filter setup:**
Filters are configured in **Settings > Search and discovery > Filters**. The theme renders whatever filters are enabled there (price range, vendor, availability, product type, collection-specific options).

**Customize via theme editor:**
1. **Products per page** (default 12)
2. **Show vendor** on product cards
3. **Show second image on hover**
4. **Show quote button**

---

### Blog and article pages

#### Blog listing (`blog.json`)

Dot-pattern hero with "The Journal" label + 3-column article grid + pagination.

**Settings:**
- Articles per page (default 9)
- Show author / date / excerpt toggles

#### Article detail (`article.json`)

Full article with breadcrumb, meta, featured image, rich content, share links (Facebook + X), comment form (if enabled in blog settings).

To enable comments: **Online Store > Blog posts > Manage blogs > [blog] > Comments > Comments are allowed, with moderation**.

---

### Cart (drawer or page)

The theme supports two cart types, toggled in **Theme settings > Cart**:

- **Drawer** (default) — AJAX slide-in from the right. Falls back to `/cart` when JS is off.
- **Page** — Full-page cart at `/cart`.

Both support `@app` blocks for upsells, rewards, and other cart apps.

**Cart note:** Enable in **Theme settings > Cart > Enable cart note**.

---

### Search

Configured via **Theme settings > Search behavior**:
- Enable search suggestions (predictive search)
- Show vendor in results
- Show price in results

The search overlay opens from the header icon. The search results page uses `/search?q=` and supports product, article, and page results.

---

### Customer account pages

The theme includes custom layouts for:
- **Login** (`templates/customers/login.json`) — with forgot password modal
- **Register** (`templates/customers/register.json`)

Other customer pages (account, order, addresses) use Shopify defaults and inherit the theme's typography and colors.

---

### 404 page

Customize the heading, description, and button text via **Customize > 404**.

---

### Custom pages (About, Contact, Deals, Newsletter)

The theme includes alternate page templates that you can assign to any page:

1. **Create a page:** **Online Store > Pages > Add page**.
2. **Assign a template:** Under **Theme template**, choose one of:
   - `page` (default) — Dotted hero header + rich-text body. Merchant-configurable eyebrow, description, badge, and top/bottom padding sliders.
   - `page.about` — About page with BeforeAfter + gallery
   - `page.contact` — Contact page with showroom grid + contact form
   - `page.deals` — Deals grid linking to collections
   - `page.financing` — Financing partners block over the default page body
   - `page.newsletter` — Newsletter signup landing page
   - `page.testimonials` — Testimonials showcase landing page
3. **Save** the page.
4. **Customize:** In the theme editor, navigate to the page and edit the sections.

---

## Post-install checklist

Before going live, verify:

- [ ] Logo uploaded
- [ ] Main menu assigned (with 2 or 3 levels as desired)
- [ ] Footer menus assigned
- [ ] Social media links configured
- [ ] `custom.deal_ends_at` metafield created (if using countdowns)
- [ ] `custom.rating` metafield created (if not using a review app)
- [ ] All home page section blocks populated with real content (no Lorem ipsum)
- [ ] At least one collection and one product tested on each page
- [ ] Cart drawer/page tested with items added
- [ ] Search tested with real queries
- [ ] Contact form tested (check email receipt)
- [ ] Newsletter form tested
- [ ] Login / register flow tested
- [ ] Checked on mobile (375px), tablet (768px), desktop (1440px)
- [ ] Languages enabled (if using multi-language)

---

## Troubleshooting

**Countdown not showing on a product card:**
Verify `custom.deal_ends_at` metafield is set to a future date and the metafield definition is saved. The countdown hides automatically when the end date has passed.

**Star ratings not showing:**
If using a review app, ensure it populates `reviews.rating` (the Shopify native namespace). If using manual ratings, ensure `custom.rating` is set and its value is between 0 and 5.

**Images not loading:**
Check that all image settings have images uploaded. The theme shows Shopify's default SVG placeholders when a merchant hasn't selected an image — this is intentional for the theme editor.

**Menu not showing as mega menu:**
Mega menus activate only when a menu item has **grandchildren** (3 levels deep). 2-level menus render as flyout dropdowns. To convert a flyout to a mega menu, add child items to the second-level items.

**Animations feel janky:**
Disable scroll-reveal animations in **Theme settings > Animations > Reveal sections on scroll**. This disables GSAP/ScrollTrigger effects while keeping all content functional.

**Theme editor shows "Liquid error":**
Run `shopify theme check` from the command line to identify the issue. All sections should pass with 0 errors.
