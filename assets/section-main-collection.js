/**
 * Main Collection — sort select + sticky bar scroll state
 */
(function () {
  'use strict';

  function init(container) {
    var section = container.querySelector('[data-section-type="main-collection"]');
    if (!section) return;

    /* Sort select → navigate to sorted URL */
    var sortSelect = section.querySelector('[data-collection-sort]');
    if (sortSelect) {
      sortSelect.addEventListener('change', function () {
        var url = new URL(window.location.href);
        url.searchParams.set('sort_by', this.value);
        window.location.href = url.toString();
      });
    }

    /* Sticky bar scroll state */
    var controls = section.querySelector('[data-collection-controls]');
    if (controls) {
      var onScroll = function () {
        var top = controls.getBoundingClientRect().top;
        controls.classList.toggle('kt-collection__controls--scrolled', top <= 1);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
    }
  }

  document.querySelectorAll('[data-section-type="main-collection"]').forEach(function (el) {
    init(el.closest('.shopify-section') || el);
  });

  document.addEventListener('shopify:section:load', function (e) {
    init(e.target);
  });
})();
