(function () {
  'use strict';

  if (window.Shopify && window.Shopify.designMode) return;
  function init(container) {
    var section = container.querySelector('[data-section-type="why-choose-us"]');
    if (!section || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return null;

    var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return null;

    gsap.registerPlugin(ScrollTrigger);

    var ctx = gsap.context(function () {
      var image = section.querySelector('.kt-why-choose-us__image, .kt-why-choose-us__image-wrap .placeholder-svg');
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
  (window.ktWhenMotion || function (cb) { cb(); })(function () {
    document.querySelectorAll('[data-section-type="why-choose-us"]').forEach(function (el) {
      instances[el.dataset.sectionId] = init(el.closest('.shopify-section') || el);
    });
  });

  document.addEventListener('shopify:section:load', function (e) {
    var s = e.target.querySelector('[data-section-type="why-choose-us"]');
    if (!s) return;

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

      delete instances[id];
    }
  });
})();
