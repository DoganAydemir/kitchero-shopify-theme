# Design originality

How Kitchero's header, product card and collection pages differ from Shopify's
free themes (audit #78). Code origin is covered separately in
[`CODE-LINEAGE.md`](./CODE-LINEAGE.md).

Comparison points for Dawn come from its public theme settings. Horizon is
compared at the architecture level only.

## Header

| | Kitchero | Dawn |
|---|---|---|
| Over the hero | `header_style`: auto (transparent over a hero, solid after scroll), always transparent, or always solid | Solid header; sticky options (none, on scroll up, always, reduce logo size) |
| Logo and menu | Logo left or center; desktop menu centered or right-aligned | Four logo positions (top/middle, left/center) |
| Mega menu | Columns plus an optional featured image card with title, text and button (`mega_menu_featured` block) | Mega menu with link columns only |
| Menu badges | `menu_link_badge` block adds a colored label next to a link (e.g. "Sale" on Deals) | None |
| Mobile | Full-screen panel with nested levels and a call-to-action button; optional bottom dock (`mobile-dock` section) with shortcuts | Drawer menu |
| Announcement | Separate section with pause control | Announcement bar with optional slides |

## Product card (`snippets/product-card.liquid`)

| | Kitchero | Dawn |
|---|---|---|
| Layout | Image above text; on hover a dark gradient rises over the image and the vendor slides in | Image above text; "standard" or "card" style |
| Details | Rating, color swatches, "From" price for multi-variant products | Rating, swatches, price |
| Actions | "Request a quote" button and "View" link, for high-value items sold after a consultation | Quick add / quick view |
| Second image | Shown on hover (optional) | Shown on hover (optional) |

## Collection pages

Kitchero ships three collection templates, each with its own section:

| Template | Section | Filters |
|---|---|---|
| `collection.json` | `main-collection` | Horizontal bar of dropdowns above the grid |
| `collection.drawer.json` | `main-collection-drawer` | Slide-in panel from the right |
| `collection.vertical.json` | `main-collection-vertical` | Sticky sidebar on the left |

Dawn offers the same three filter placements as one setting on one section.
Kitchero differs in how the page is built and looks: separate templates the
merchant assigns per collection, an image banner section
(`main-collection-banner`) above the grid, a column switcher for shoppers on
the default template, and finish swatches inside the color filter
(`snippets/kt-filter-swatch.liquid`). The filter placements themselves are a
common pattern across Shopify themes; the difference is in the presentation
listed above.

## Sections only Kitchero has

Shop the look with product hotspots, shop by color and finish, before/after
slider, financing calculator, showroom product page with consultation requests
and a sample box, ecosystem rows, editorial overlay and split sliders, gallery
marquees and stacked-card gallery.

## Horizon

Horizon is built on theme blocks (`blocks/` folder, `@theme` nesting).
Kitchero has no `blocks/` folder; every section defines its own blocks in its
schema, and none of Horizon's file or class names appear in the theme.
