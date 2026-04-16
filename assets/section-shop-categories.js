/**
 * Shop Categories — GSAP horizontal scroll pinning on desktop
 * Mobile: native horizontal scroll (CSS snap)
 * Desktop: pinned horizontal scroll via ScrollTrigger
 * Matches ShopCategories.tsx exactly.
 */
(function () {
  'use strict';

  var instances = {};

  function initShopCategories(container) {
    var section = container.querySelector('[data-section-type="shop-categories"]');
    if (!section || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return null;

    var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return null;

    gsap.registerPlugin(ScrollTrigger);

    var mm = gsap.matchMedia();

    mm.add('(min-width: 750px)', function () {
      var scrollContainer = section.querySelector('.kt-shop-categories__scroll');
      if (!scrollContainer) return;

      var totalWidth = scrollContainer.scrollWidth;
      var amountToScroll = totalWidth - window.innerWidth;

      gsap.to(scrollContainer, {
        x: -amountToScroll,
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: '+=' + amountToScroll,
          pin: true,
          scrub: 1
        }
      });
    });

    return mm;
  }

  document.querySelectorAll('[data-section-type="shop-categories"]').forEach(function (el) {
    var id = el.dataset.sectionId;
    instances[id] = initShopCategories(el.closest('.shopify-section') || el);
  });

  document.addEventListener('shopify:section:load', function (e) {
    var section = e.target.querySelector('[data-section-type="shop-categories"]');
    if (section) {
      var id = section.dataset.sectionId;
      if (instances[id]) instances[id].revert();
      instances[id] = initShopCategories(e.target);
    }
  });

  document.addEventListener('shopify:section:unload', function (e) {
    var id = e.detail.sectionId;
    if (instances[id]) {
      instances[id].revert();
      delete instances[id];
    }
  });
})();
