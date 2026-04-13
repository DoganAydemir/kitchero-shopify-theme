/**
 * Why Choose Us — GSAP parallax on hero image
 * Matches WhyChooseUs.tsx.
 */
(function () {
  'use strict';

  function init(container) {
    var section = container.querySelector('[data-section-type="why-choose-us"]');
    if (!section || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return null;

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
    if (s) instances[s.dataset.sectionId] = init(e.target);
  });

  document.addEventListener('shopify:section:unload', function (e) {
    if (instances[e.detail.sectionId]) {
      instances[e.detail.sectionId].revert();
    }
  });
})();
