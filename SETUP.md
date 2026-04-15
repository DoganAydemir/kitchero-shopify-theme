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
