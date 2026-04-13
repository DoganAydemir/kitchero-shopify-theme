/**
 * Ecosystem — GSAP ScrollTrigger pin on right image, parallax scale, text fade
 * Matches Ecosystem.tsx.
 */
(function () {
  'use strict';

  function initEcosystem(container) {
    var section = container.querySelector('[data-section-type="ecosystem"]');
    if (!section || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return null;

    gsap.registerPlugin(ScrollTrigger);

    var mm = gsap.matchMedia();

    mm.add('(min-width: 990px)', function () {
      var imageCol = section.querySelector('.kt-ecosystem__image-col');
      var image = section.querySelector('.kt-ecosystem__image');
      var features = gsap.utils.toArray('.kt-ecosystem__feature', section);

      if (!imageCol || !image) return;

      /* Image parallax scale */
      gsap.to(image, {
        scale: 1.1,
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: 'bottom bottom',
          scrub: true
        }
      });

      /* Text items fade out as they scroll past */
      features.forEach(function (feat) {
        gsap.to(feat, {
          opacity: 0,
          y: -50,
          scrollTrigger: {
            trigger: feat,
            start: 'bottom 30%',
            end: 'bottom top',
            scrub: true
          }
        });
      });
    });

    return mm;
  }

  var instances = {};
  document.querySelectorAll('[data-section-type="ecosystem"]').forEach(function (el) {
    instances[el.dataset.sectionId] = initEcosystem(el.closest('.shopify-section') || el);
  });

  document.addEventListener('shopify:section:load', function (e) {
    var s = e.target.querySelector('[data-section-type="ecosystem"]');
    if (s) instances[s.dataset.sectionId] = initEcosystem(e.target);
  });

  document.addEventListener('shopify:section:unload', function (e) {
    if (instances[e.detail.sectionId]) {
      instances[e.detail.sectionId].revert();
      delete instances[e.detail.sectionId];
    }
  });
})();
