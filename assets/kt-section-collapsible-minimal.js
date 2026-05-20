/**
 * Collapsible Minimal — Style 03 (theme editor support only)
 *
 * The section itself is 100% CSS-driven (native <details>/<summary>),
 * so no runtime JS is required on the live storefront. This file
 * exists solely to make the section respond cleanly to Shopify theme
 * editor interactions:
 *
 *   - shopify:block:select   → open the chosen <details> and scroll
 *                              it into view so the merchant can see
 *                              their edits.
 *   - shopify:block:deselect → leave state alone (independent
 *                              disclosures, any number can be open).
 *   - shopify:section:load   → no-op (no init needed).
 *   - shopify:section:unload → no-op (no listeners or timers).
 *
 * Idempotent guard prevents double-binding when the script is loaded
 * twice (section rendering API, theme editor rehydration).
 */
if (!window.__kitcheroCollapsibleMinimalLoaded) {
  window.__kitcheroCollapsibleMinimalLoaded = true;

  (function () {
    'use strict';

    var ITEM_SELECTOR = '.kt-collapsible-minimal__item';

    document.addEventListener('shopify:block:select', function (event) {
      var item = event.target;
      if (!item || !item.matches || !item.matches(ITEM_SELECTOR)) return;
      if (!item.open) item.open = true;
      try {
        item.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (err) {
        item.scrollIntoView();
      }
    });
  })();
}
