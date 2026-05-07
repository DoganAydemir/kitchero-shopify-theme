# Release Notes

This file tracks public-facing changes for each released version of the
Kitchero theme. Per Shopify Theme Store rule UPD-4, themes published to
the Theme Store must maintain a `release-notes.md` at the theme root
once a first version has been published. Each released version
must add an entry above this paragraph; entries below the paragraph
document the in-development pre-release history for context.

---

## Unreleased — submission preparation

The theme has not yet been published to the Theme Store. The entries
below are an internal changelog of the rounds that brought Kitchero to
submission-ready state. After the theme passes initial review, the
**Released** heading replaces this **Unreleased** heading and the v1.0.0
entry begins above it.

### Phase 4 — Concept + Essence cross-validation pass (R132–R145)

- **R132** Wire cookie-banner and newsletter-popup into a custom
  overlay section group rendered globally from `layout/theme.liquid`,
  so the consent UI surfaces on a fresh install without merchant
  intervention.
- **R133** Emit Shopify's `shopify.online_store.spam_detection.disclaimer_html`
  on the article comment form, suppressing the floating reCAPTCHA
  badge that otherwise clashes with the editorial layout.
- **R134** Add a Search & Discovery curated upsell band to the cart
  page (mirrors the cart-drawer R122 pattern; renders nothing when
  the metafield is empty).
- **R135** PDP sticky add-to-cart bar — sentinel + IntersectionObserver
  pattern; default off in R145 to avoid floating-element collisions.
- **R136** main-collection schema density bump: 5 → 16 wired
  settings (color scheme, padding, columns desktop/mobile, filter
  toggles, grid-density toggle).
- **R137** main-cart schema density bump: 7 → 14 wired settings
  (free-shipping bar gate, gift-wrapping note, color scheme,
  padding).
- **R138** Split the collection editorial header into its own
  `main-collection-banner` section so merchants can reorder, hide,
  or replace it per collection without touching the products grid.
- **R139** FAQPage JSON-LD opt-in toggle on `collapsible-accordion`
  and `collapsible-minimal` sections (default off — merchant opts
  in only on real FAQ content per Google's rich-result policy).
- **R140** Real gift-wrapping checkbox bound to
  `cart.attributes[Gift wrapping]` (cart admin + order email surfacing).
- **R142** Pickup-availability snippet gains per-location stock
  indicator pill + Get directions Maps link.
- **R143** Theme Store rule fixes: section-group `type` corrected to
  `custom.overlay` (AC-011) and member section IDs made alphanumeric
  (AC-018) per the storefront editor docs.
- **R144** Removed `preload: true` from hero / main-article /
  product-media-gallery image tags; the two layout-level font preloads
  already consume the template's two-resource-hint budget per PRF-3.
- **R145** sticky add-to-cart default flipped to off (opt-in) so
  merchants picking a fixed-bottom cookie-banner position or
  installing a corner-anchored chat / review app don't end up with
  stacking bars (DSN-2 mitigation).

### Earlier phases

Phase 1 (R1-R85) ported the Next.js source theme into a Skeleton-
baseline Shopify Online Store 2.0 architecture. Phase 2 (R86-R116)
hardened reject vectors against the `THEME_STORE_RULES_OFFICIAL.md`
master checklist (160 rules). Phase 3 (R117-R131) cross-validated
against six reference Theme Store themes (Starlite, Concept,
Essence, Maranello, Expanse, Be Yours) and closed the gaps each
surfaced. The deep changelog for these phases lives in the git
commit history.
