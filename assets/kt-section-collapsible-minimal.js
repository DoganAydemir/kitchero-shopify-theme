if (!window.__kitcheroCollapsibleMinimalLoaded) {
  window.__kitcheroCollapsibleMinimalLoaded = true;

  (function () {
    'use strict';

    var ITEM_SELECTOR = '.kt-collapsible-minimal__item';

    document.addEventListener('shopify:block:select', function (event) {
      var item = event.target;
      if (!item || !item.matches || !item.matches(ITEM_SELECTOR)) return;
      if (!item.open) item.open = true;
    });
  })();
}
