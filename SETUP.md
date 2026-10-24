# Kitchero Theme Setup Guide

This document describes the metafields, menus, and settings a merchant must configure after installing the Kitchero theme.

---

## Product data (optional metafields)

Kitchero doesn't depend on any fixed metafield. Each product data
feature reads the metafield you choose in **Theme settings > Product
data**. Enter the metafield as `namespace.key` (for example
`custom.deal_ends_at`). Leave a field blank to turn that feature off.

Create the metafield definitions first in **Settings > Custom data >
Products** (or **Variants** for swatches), then enter the same
`namespace.key` in Theme settings.

| Theme setting | Metafield type | Owner | What it does |
|---|---|---|---|
| Deal end date metafield | Date and time | Product | Shows a countdown on the product page and cards until that time. Hidden after it passes. |
| Manual rating metafield | Decimal (0–5) | Product | Star rating, used only when no review app fills `reviews.rating`. |
| Feature list metafield | List of single line text | Product | Feature tags on product pages. When empty, product tags are shown. |
| Country of origin metafield | Single line text | Product | Row in the Product details block. |
| Length / Width / Height metafields | Number (decimal) | Product | Dimensions row in the Product details block. |
| Dimension unit metafield | Single line text | Product | Unit for the dimensions, for example `cm` or `in`. Defaults to cm. |
| Variant swatch color metafield | Color or single line text (hex) | Variant | Swatch color, used only when the option value has no Shopify swatch. |
| Variant swatch image metafield | File (image) | Variant | Swatch image, used only when the option value has no Shopify swatch. |

### Review app ratings

When a review app fills Shopify's standard `reviews.rating` and
`reviews.rating_count` metafields (Shopify Product Reviews, Judge.me,
Loox and others do), ratings show automatically. The manual rating
metafield is only a fallback.

### Sample box (premium product page)

The Sample box block on the `product.showroom` template links to a
separate, low-cost product (for example a door sample). Pick it in the
block's **Sample product** setting; its featured image is used as the
card photo and it's added to cart with its own button. The box stays
hidden until a product is picked.

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
| **Colors** | 7 color schemes; each section picks one in its own settings |
| **Typography** | Heading font, body font, accent/serif font, size scales |
| **Layout** | Page width (1000-1600px), section spacing, grid spacing |
| **Animations** | Turn scroll animations on or off (they never load on phones or with reduced motion) |
| **Product data** | Metafields used for countdown, rating, features, origin, dimensions and swatches |
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

The theme's i18n structure supports 5 languages:

- **English** — default
- **Turkish, German, French, Spanish** — fully translated. Each locale
  ships 527 storefront keys (`locales/<lang>.json`) + 1,720 theme-editor
  keys (`locales/<lang>.schema.json`) at full key parity with the
  English defaults. A native-speaker QA pass is recommended before GA
  marketing pushes; Shopify still falls back to English on any key the
  storefront might add later before the locale is updated.

To enable additional languages, go to **Settings > Languages** and add
the desired languages. To translate, edit `locales/*.json` (storefront
strings) and `locales/*.schema.json` (theme editor labels). The Shopify
admin's built-in translation editor can also write into these files.

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
- [ ] Product data metafields entered in Theme settings > Product data (if you use countdowns, manual ratings, features, origin, dimensions or custom swatches)
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
Check that **Theme settings > Product data > Deal end date metafield** names your metafield (for example `custom.deal_ends_at`) and that the product has a future date in it. The countdown hides after the date passes.

**Star ratings not showing:**
If you use a review app, make sure it fills Shopify's `reviews.rating` metafield. For manual ratings, enter your metafield in **Theme settings > Product data > Manual rating metafield** and give products a value between 0 and 5.

**Images not loading:**
Check that all image settings have images uploaded. The theme shows Shopify's default SVG placeholders when a merchant hasn't selected an image — this is intentional for the theme editor.

**Menu not showing as mega menu:**
Mega menus activate only when a menu item has **grandchildren** (3 levels deep). 2-level menus render as flyout dropdowns. To convert a flyout to a mega menu, add child items to the second-level items.

**Animations feel janky:**
Turn off **Theme settings > Animations > Reveal sections on scroll**. Content stays fully visible and usable. Animations never load on phones or for visitors who prefer reduced motion.

**Theme editor shows "Liquid error":**
Run `shopify theme check` to find the file and line. The theme ships with 0 Theme Check offenses on the recommended ruleset.
