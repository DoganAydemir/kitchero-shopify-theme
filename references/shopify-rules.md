# Shopify Theme Store Rules — Quick Reference

This file is a condensed reference for the Kitchero port. Consult it when you
hit Theme Check errors, schema questions, or Theme Store submission doubts.

---

## 1. Theme Check — Common Errors & Fixes

| Check ID | Error | Fix |
|---|---|---|
| `LiquidTag/DeprecatedTag` | `{% include %}` used | Replace with `{% render %}` |
| `AssetSizeCSS` | CSS file > 100 KB | Split into component files, load per-section |
| `AssetSizeJavaScript` | JS file > 10 KB (warning) / > 100 KB (error) | Split per-section, defer load |
| `ContentForHeaderModification` | Parsing `content_for_header` | Never capture/modify it — output raw |
| `ImgWidthAndHeight` | `<img>` without dimensions | Add explicit `width` and `height` attrs |
| `RemoteAsset` | External CDN URL | Self-host in `assets/`, use `asset_url` |
| `MissingTemplate` | Required template missing | Ensure all 8 required templates exist (see below) |
| `TranslationKeyExists` | String not in locale file | Add key to `locales/en.default.json` |
| `HtmlParsingError` | Malformed HTML | Fix nesting, close tags properly |
| `RequiredDirectories` | Missing directory | Theme needs: `assets/`, `config/`, `layout/`, `locales/`, `sections/`, `snippets/`, `templates/`, `templates/customers/` |
| `MatchingSchemaTranslations` | Schema label not translated | Add to `locales/en.default.schema.json` |
| `AppBlockSupport` | Missing `@app` block | Add `{"type": "@app"}` to required sections |
| `UndefinedObject` | Liquid object not available | Check template context — some objects only exist in specific templates |
| `DeprecatedFilter` | Using removed Liquid filter | Update to current equivalent |
| `HardcodedRoutes` | Hardcoded URL path | Use `routes.*` object (`routes.cart_url`, `routes.account_url`, etc.) |

---

## 2. Required Templates

These templates **must exist** for Theme Store submission:

```
templates/404.json
templates/article.json
templates/blog.json
templates/cart.json
templates/collection.json
templates/index.json
templates/list-collections.json
templates/page.json
templates/product.json
templates/search.json
templates/gift_card.liquid          ← must be .liquid, not .json
templates/customers/account.json
templates/customers/activate_account.json
templates/customers/addresses.json
templates/customers/login.json
templates/customers/order.json
templates/customers/register.json
templates/customers/reset_password.json
```

---

## 3. Required Layout Files

```
layout/theme.liquid                 ← main layout, must contain content_for_header + content_for_layout
layout/password.liquid              ← password page layout (store not yet open)
```

Optional but recommended:
```
layout/header-group.json            ← section group for header
layout/footer-group.json            ← section group for footer
```

---

## 4. Theme Store Mandatory Features

### App Block Support
These sections MUST include `{"type": "@app"}` in their schema `blocks` array:
- `main-product` (or equivalent product section)
- `featured-product` (if exists)
- `header`
- `footer`
- `main-cart`

### Dynamic Checkout Button
Product forms MUST include `{{ form | payment_button }}` alongside the Add to Cart button.

### Empty States / Placeholders
All image settings must have fallback logic:
```liquid
{% if section.settings.image != blank %}
  {{ section.settings.image | image_url: width: 800 | image_tag }}
{% else %}
  {{ 'hero-apparel-1' | placeholder_svg_tag: 'placeholder-svg' }}
{% endif %}
```

Available placeholder names: `hero-apparel-1`, `hero-apparel-2`, `collection-1` through `collection-6`, `product-1` through `product-6`, `lifestyle-1`, `lifestyle-2`, `image`.

### SEO & Structured Data
- JSON-LD required for: Product, Article, Organization, BreadcrumbList
- Meta title/description via `seo.title` / `seo.description` objects
- Canonical URL via `canonical_url`

### Performance
- Lighthouse Performance score >= 60
- Lighthouse Accessibility score >= 90
- All images: lazy load (except above-fold), explicit dimensions
- All scripts: `defer` attribute
- CSS: loaded per-section where possible

---

## 5. Schema Patterns

### Section Schema Structure
```json
{
  "name": "t:sections.hero.name",
  "tag": "section",
  "class": "section",
  "disabled_on": {
    "groups": ["header", "footer"]
  },
  "settings": [
    {
      "type": "header",
      "content": "t:sections.hero.settings.header__content.content"
    },
    {
      "type": "image_picker",
      "id": "image",
      "label": "t:sections.hero.settings.image.label"
    },
    {
      "type": "color_scheme",
      "id": "color_scheme",
      "label": "t:sections.all.colors.label",
      "default": "scheme-1"
    }
  ],
  "blocks": [],
  "presets": [
    {
      "name": "t:sections.hero.presets.name"
    }
  ]
}
```

### Common Setting Types
| Type | Use case |
|---|---|
| `text` | Short text input |
| `textarea` | Multi-line text |
| `richtext` | Rich text with formatting |
| `image_picker` | Image selection |
| `url` | URL input |
| `link_list` | Navigation menu picker |
| `collection` | Collection picker |
| `product` | Product picker |
| `blog` | Blog picker |
| `page` | Page picker |
| `color` | Color picker |
| `color_scheme` | Color scheme selector (from settings_schema) |
| `font_picker` | Font selector |
| `range` | Numeric slider |
| `select` | Dropdown select |
| `checkbox` | Boolean toggle |
| `number` | Numeric input |
| `video` | Video picker |
| `video_url` | YouTube/Vimeo URL |
| `header` | Group separator (visual only) |
| `paragraph` | Help text (visual only) |

### Block Schema
```json
{
  "type": "feature",
  "name": "t:sections.why_choose_us.blocks.feature.name",
  "limit": 6,
  "settings": [
    {
      "type": "text",
      "id": "title",
      "label": "Title",
      "default": "Feature title"
    }
  ]
}
```

---

## 6. Liquid Best Practices

### Image Rendering
```liquid
{%- comment -%} With image_tag filter (preferred) {%- endcomment -%}
{{
  section.settings.image
  | image_url: width: 1200
  | image_tag:
    loading: 'lazy',
    widths: '375, 550, 750, 1100, 1500',
    sizes: '(min-width: 750px) 50vw, 100vw',
    class: 'kt-hero__image'
}}
```

### Responsive Images with srcset
```liquid
{%- if section.settings.image != blank -%}
  <img
    srcset="
      {{ section.settings.image | image_url: width: 375 }} 375w,
      {{ section.settings.image | image_url: width: 750 }} 750w,
      {{ section.settings.image | image_url: width: 1100 }} 1100w,
      {{ section.settings.image | image_url: width: 1500 }} 1500w
    "
    src="{{ section.settings.image | image_url: width: 1100 }}"
    alt="{{ section.settings.image.alt | escape }}"
    loading="lazy"
    width="{{ section.settings.image.width }}"
    height="{{ section.settings.image.height }}"
    class="kt-hero__image"
  >
{%- endif -%}
```

### Routes Object
```liquid
{{ routes.root_url }}              → /
{{ routes.cart_url }}              → /cart
{{ routes.account_url }}           → /account
{{ routes.account_login_url }}     → /account/login
{{ routes.account_register_url }}  → /account/register
{{ routes.account_addresses_url }} → /account/addresses
{{ routes.collections_url }}       → /collections
{{ routes.all_products_collection_url }} → /collections/all
{{ routes.search_url }}            → /search
{{ routes.predictive_search_url }} → /search/suggest
```

### Forms
```liquid
{% form 'product', product %}
  <input type="hidden" name="id" value="{{ product.selected_or_first_available_variant.id }}">
  <button type="submit">{{ 'products.product.add_to_cart' | t }}</button>
  {{ form | payment_button }}
{% endform %}

{% form 'customer_login' %}
  <input type="email" name="customer[email]" id="login-email" autocomplete="email">
  <input type="password" name="customer[password]" id="login-password" autocomplete="current-password">
{% endform %}

{% form 'contact' %}
  <input type="text" name="contact[name]" id="contact-name">
  <input type="email" name="contact[email]" id="contact-email" autocomplete="email">
  <textarea name="contact[body]" id="contact-message"></textarea>
{% endform %}
```

### Section Rendering API (for AJAX updates)
```javascript
// Fetch a section's HTML without full page reload
fetch(`${window.location.pathname}?section_id=${sectionId}`)
  .then(res => res.text())
  .then(html => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const newContent = doc.querySelector(`#shopify-section-${sectionId}`);
    document.querySelector(`#shopify-section-${sectionId}`).innerHTML = newContent.innerHTML;
  });
```

### Cart AJAX API
```javascript
// Add to cart
fetch('/cart/add.js', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: variantId, quantity: 1 })
});

// Get cart
fetch('/cart.js').then(res => res.json());

// Update quantity
fetch('/cart/change.js', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: lineItemKey, quantity: newQty })
});
```

---

## 7. Forbidden Patterns

| Pattern | Why |
|---|---|
| `{% include %}` | Deprecated — use `{% render %}` |
| Sass/SCSS files | Theme Store bans preprocessors |
| Minified source code | Rejection — Shopify serves as-is |
| `robots.txt.liquid` | Banned — Shopify manages robots.txt |
| External CDN fonts/scripts | Must self-host in `assets/` |
| Inline `<script>` or `<style>` | Use external files (exception: JSON config) |
| `content_for_header` capture | Never modify, output raw |
| Hardcoded `/cart`, `/account` | Use `routes` object |
| Fake urgency UI | Fake timers, stock counters, viewer counts |
| jQuery | Not required, adds weight |

---

## 8. Color Scheme System

In `config/settings_schema.json`, define schemes:
```json
{
  "name": "t:settings_schema.colors.name",
  "settings": [
    {
      "type": "color_scheme_group",
      "id": "color_schemes",
      "definition": [
        { "type": "color", "id": "background", "label": "Background", "info": "..." },
        { "type": "color", "id": "text", "label": "Text" },
        { "type": "color", "id": "button", "label": "Button background" },
        { "type": "color", "id": "button_label", "label": "Button text" },
        { "type": "color", "id": "secondary_button_label", "label": "Secondary button text" },
        { "type": "color", "id": "shadow", "label": "Shadow" }
      ],
      "role": {
        "text": "text",
        "background": { "solid": "background", "gradient": "background_gradient" },
        "links": "secondary_button_label",
        "icons": "text",
        "primary_button": "button",
        "on_primary_button": "button_label",
        "primary_button_border": "button",
        "secondary_button": "background",
        "on_secondary_button": "secondary_button_label",
        "secondary_button_border": "secondary_button_label"
      }
    }
  ]
}
```

Usage in sections:
```liquid
{% assign scheme = section.settings.color_scheme %}
<div class="color-{{ scheme }}">
  ...
</div>
```

---

## 9. Theme Editor Events (JavaScript)

```javascript
// Section loaded in editor (must re-init JS)
document.addEventListener('shopify:section:load', (event) => {
  const section = event.target;
  // Re-initialize sliders, carousels, etc.
});

// Section about to be removed
document.addEventListener('shopify:section:unload', (event) => {
  // Cleanup intervals, observers, event listeners
});

// Block selected in editor
document.addEventListener('shopify:block:select', (event) => {
  // Scroll to / highlight the selected block
});

// Block deselected
document.addEventListener('shopify:block:deselect', (event) => {
  // Remove highlight
});
```

---

## 10. File Size Limits

| Asset type | Warning | Error |
|---|---|---|
| Individual CSS file | — | 100 KB |
| Individual JS file | 10 KB | 100 KB |
| Total theme package | — | ~50 MB (practical) |
| Single Liquid file | — | No hard limit, but keep sections < 500 lines |
| JSON template | — | No hard limit |
| Image in assets/ | — | 20 MB per file |

---

## 11. Accessibility Checklist

- [ ] All interactive elements focusable via keyboard
- [ ] Visible focus indicator (not `outline: none`)
- [ ] All images have `alt` text (empty `alt=""` for decorative only)
- [ ] Form inputs have associated `<label>` elements
- [ ] Color contrast ratio >= 4.5:1 (text), >= 3:1 (large text)
- [ ] Skip-to-content link as first focusable element
- [ ] ARIA attributes only when native HTML insufficient
- [ ] Modals/drawers trap focus when open
- [ ] Escape key closes modals/drawers
- [ ] Screen reader announces dynamic content changes (aria-live)
- [ ] No content conveyed by color alone
- [ ] Touch targets >= 44x44px on mobile
