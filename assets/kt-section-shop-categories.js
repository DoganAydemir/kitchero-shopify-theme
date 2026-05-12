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

    /* Skip pinning entirely inside Shopify's theme editor (`design
       mode`). ScrollTrigger `pin: true` rewrites the page-scroll
       behaviour to lock the section while the user drags through it
       horizontally — which is the desired effect on the live store,
       but inside the editor's iframe it produces a "scroll dead-
       zone" that the merchant reads as "I can't scroll past this
       section to reach the footer". Even with the mm.revert()
       cleanup on shopify:section:unload, the editor's rapid add /
       reorder / remove cycle can leave a half-torn-down pin if the
       events fire in an unexpected order — the safest contract is
       to never install the pin in design mode at all. The live
       storefront still gets the full pinned-horizontal experience
       because Shopify.designMode is only ever true inside the
       editor. Same gate is the canonical Shopify recommendation
       for any scroll-disturbing animation.  */
    if (window.Shopify && window.Shopify.designMode) return null;

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
