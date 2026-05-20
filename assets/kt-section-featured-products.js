/**
 * Featured Products — theme editor support only
 *
 * The section renders a static grid of product cards. No runtime JS
 * is required on the live storefront. This file exists solely to
 * make the section respond cleanly to Shopify theme editor block
 * interactions:
 *
 *   - shopify:block:select   → scroll the chosen product item into
 *                              view so the merchant can see their
 *                              edits.
 *
 * Idempotent guard prevents double-binding when the script is loaded
 * twice (section rendering API, theme editor rehydration).
 */
if (!window.__kitcheroFeaturedProductsLoaded) {
  window.__kitcheroFeaturedProductsLoaded = true;

  (function () {
    'use strict';

    var ITEM_SELECTOR = '.kt-featured-products__item';

    document.addEventListener('shopify:block:select', function (event) {
      var item = event.target;
      if (!item || !item.matches || !item.matches(ITEM_SELECTOR)) return;
      try {
        item.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (err) {
        item.scrollIntoView();
      }
    });
  })();
}
