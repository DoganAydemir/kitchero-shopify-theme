/**
 * Why Choose Us — GSAP parallax on hero image
 * Matches WhyChooseUs.tsx.
 */
(function () {
  'use strict';

  function init(container) {
    var section = container.querySelector('[data-section-type="why-choose-us"]');
    if (!section || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return null;

    var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return null;

    gsap.registerPlugin(ScrollTrigger);

    var ctx = gsap.context(function () {
      var image = section.querySelector('.kt-why-choose-us__hero-image');
      if (!image) return;

      gsap.fromTo(image,
        { yPercent: -15, scale: 1.1 },
        {
          yPercent: 15,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true
          }
        }
      );
    }, section);

    return ctx;
  }

  var instances = {};
  document.querySelectorAll('[data-section-type="why-choose-us"]').forEach(function (el) {
    instances[el.dataset.sectionId] = init(el.closest('.shopify-section') || el);
  });

  document.addEventListener('shopify:section:load', function (e) {
    var s = e.target.querySelector('[data-section-type="why-choose-us"]');
    if (!s) return;
    /* Theme editor fires shopify:section:load on every settings change
       without a paired :unload first. The parallax `scrub: true`
       ScrollTriggers in this section are especially leak-prone — each
       unrevert keeps firing on every scroll event. Mirror the
       destroy-then-recreate pattern from R74
       kt-section-how-it-works.js: revert previous context BEFORE
       overwriting the map entry. */
    var sectionId = s.dataset.sectionId;
    if (instances[sectionId]) {
      instances[sectionId].revert();
    }
    instances[sectionId] = init(e.target);
  });

  document.addEventListener('shopify:section:unload', function (e) {
    var id = e.detail.sectionId;
    if (instances[id]) {
      instances[id].revert();
      // Also drop the map entry so the next :load doesn't find a
      // stale GSAP context object (revert() internally kills the
      // timeline but leaves the wrapper; keeping it around would
      // grow the instances map for every editor re-render).
      delete instances[id];
    }
  });
})();
