/*
  Showroom gallery: when the selected variant's featured media changes,
  re-render the gallery for that variant through the Section Rendering
  API, so the collage shows that variant's media group (see the
  "group_variant_media" logic in sections/main-product-showroom.liquid).
*/
(function () {
  'use strict';

  var requestId = 0;

  document.addEventListener('variant:change', function (event) {
    var variant = event.detail && event.detail.variant;
    var source = event.target;
    if (!variant || !source || source === document || !source.closest) return;

    var showroom = source.closest('.kt-showroom');
    if (!showroom) return;
    var gallery = showroom.querySelector('[data-product-gallery][data-variant-media-groups]');
    if (!gallery) return;

    var mediaId = variant.featured_media ? String(variant.featured_media.id) : '';
    if (mediaId === (gallery.getAttribute('data-selected-media') || '')) return;

    var sectionId = showroom.getAttribute('data-section-id');
    if (!sectionId) return;

    var current = ++requestId;
    var url = window.location.pathname + '?variant=' + encodeURIComponent(variant.id) +
      '&section_id=' + encodeURIComponent(sectionId);

    gallery.setAttribute('aria-busy', 'true');
    fetch(url, { credentials: 'same-origin' })
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.text();
      })
      .then(function (html) {
        if (current !== requestId) return;
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var fresh = doc.querySelector('[data-product-gallery][data-variant-media-groups]');
        var liveGallery = showroom.querySelector('[data-product-gallery][data-variant-media-groups]');
        if (!fresh || !liveGallery) return;

        liveGallery.replaceWith(fresh);
        var sectionEl = showroom.closest('.shopify-section') || showroom;
        sectionEl.dispatchEvent(new CustomEvent('kt:gallery:refresh', { bubbles: true }));

        var top = fresh.getBoundingClientRect().top;
        if (top < 0 && window.matchMedia('(min-width: 990px)').matches) {
          var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          window.scrollTo({ top: window.scrollY + top - 120, behavior: reduce ? 'auto' : 'smooth' });
        }
      })
      .catch(function () {
        var stale = showroom.querySelector('[data-product-gallery][data-variant-media-groups]');
        if (stale) stale.removeAttribute('aria-busy');
      });
  });
})();
