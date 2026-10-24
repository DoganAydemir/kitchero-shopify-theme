if (!window.__kitcheroFeaturedProductsLoaded) {
  window.__kitcheroFeaturedProductsLoaded = true;

  (function () {
    'use strict';

    var ITEM_SELECTOR = '.kt-featured-products__item';

    document.addEventListener('shopify:block:select', function (event) {
      var item = event.target;
      if (!item || !item.matches || !item.matches(ITEM_SELECTOR)) return;
    });
  })();
}
