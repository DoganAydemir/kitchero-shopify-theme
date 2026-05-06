/**
 * Guide Teaser — GSAP staggered entrance animation on cards
 * Matches GuideTeaser.tsx.
 */
(function () {
  'use strict';

  function init(container) {
    var section = container.querySelector('[data-section-type="guide-teaser"]');
    if (!section || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return null;

    var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return null;

    gsap.registerPlugin(ScrollTrigger);

    var ctx = gsap.context(function () {
      gsap.from('.kt-guide-teaser__card', {
        y: 100,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: section,
          start: 'top 75%',
          once: true
        }
      });
    }, section);

    return ctx;
  }

  var instances = {};
  document.querySelectorAll('[data-section-type="guide-teaser"]').forEach(function (el) {
    instances[el.dataset.sectionId] = init(el.closest('.shopify-section') || el);
  });

  document.addEventListener('shopify:section:load', function (e) {
    var s = e.target.querySelector('[data-section-type="guide-teaser"]');
    if (!s) return;
    /* Theme editor fires shopify:section:load on every settings change
       without a paired :unload first. If we reassign instances[id]
       without reverting the previous gsap.context, the prior
       ScrollTriggers stay registered — they keep firing on scroll,
       accumulate in ScrollTrigger.getAll(), and gradually freeze the
       editor. Mirror the destroy-then-recreate pattern from R74
       kt-section-how-it-works.js. */
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
      // Same rationale as kt-section-why-choose-us: revert() leaves
      // the wrapper entry behind; delete it so the map doesn't grow
      // per editor re-render.
      delete instances[id];
    }
  });
})();
