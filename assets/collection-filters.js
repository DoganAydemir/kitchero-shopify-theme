/**
 * Collection Filters — auto-submit on checkbox change
 * Works with Shopify native collection.filters (URL-based filtering)
 */
(function () {
  'use strict';

  function init() {
    var form = document.getElementById('CollectionFiltersForm');
    if (!form) return;

    /* Checkbox change → build URL and navigate */
    form.querySelectorAll('[data-filter-checkbox]').forEach(function (checkbox) {
      checkbox.addEventListener('change', function () {
        submitFilters(form);
      });
    });

    /* Price input → debounced submit */
    var priceTimer;
    form.querySelectorAll('[data-filter-price]').forEach(function (input) {
      input.addEventListener('input', function () {
        clearTimeout(priceTimer);
        priceTimer = setTimeout(function () {
          submitFilters(form);
        }, 800);
      });
    });
  }

  function submitFilters(form) {
    var formData = new FormData(form);
    var params = new URLSearchParams();

    for (var pair of formData.entries()) {
      params.append(pair[0], pair[1]);
    }

    /* Preserve sort_by if set */
    var currentUrl = new URL(window.location.href);
    var sortBy = currentUrl.searchParams.get('sort_by');
    if (sortBy) params.set('sort_by', sortBy);

    var newUrl = window.location.pathname + '?' + params.toString();
    window.location.href = newUrl;
  }

  init();

  document.addEventListener('shopify:section:load', init);
})();
