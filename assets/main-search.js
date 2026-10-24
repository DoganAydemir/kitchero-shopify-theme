(function () {
  'use strict';

  function bindSortForms(root) {
    var scope = root || document;
    var forms = scope.querySelectorAll('[data-search-sort-form]');
    for (var i = 0; i < forms.length; i++) {
      (function (form) {
        if (form.__ktSortBound) return;
        form.__ktSortBound = true;
        var select = form.querySelector('[data-search-sort-select]');
        if (!select) return;
        select.addEventListener('change', function () {
          form.submit();
        });
      })(forms[i]);
    }
  }

  function init() {
    bindSortForms(document);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  document.addEventListener('shopify:section:load', function (event) {
    bindSortForms(event.target || document);
  });

  document.addEventListener('shopify:section:unload', function (event) {
  });
})();
