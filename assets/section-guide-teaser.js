/**
 * Guide Teaser — GSAP staggered entrance animation on cards
 * Matches GuideTeaser.tsx.
 */
(function () {
  'use strict';

  function init(container) {
    var section = container.querySelector('[data-section-type="guide-teaser"]');
    if (!section || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return null;

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
    if (s) instances[s.dataset.sectionId] = init(e.target);
  });

  document.addEventListener('shopify:section:unload', function (e) {
    if (instances[e.detail.sectionId]) instances[e.detail.sectionId].revert();
  });
})();
