/**
 * Ecosystem — GSAP ScrollTrigger
 * Birebir from Ecosystem.tsx:
 * - Pin entire right column during left text scroll
 * - Parallax scale on image (1 → 1.1)
 * - Fade out + y:-50 on each .eco-item as it scrolls past top 30%→10%
 */
(function () {
  'use strict';

  function initEcosystem(container) {
    var section = container.querySelector('[data-section-type="ecosystem"]');
    if (!section || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return null;

    var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return null;

    gsap.registerPlugin(ScrollTrigger);

    var mm = gsap.matchMedia();

    mm.add('(min-width: 990px)', function () {
      var ctx = gsap.context(function () {
        var leftCol = section.querySelector('.kt-ecosystem__text-col');
        var rightCol = section.querySelector('.kt-ecosystem__image-col');
        var image = section.querySelector('.kt-ecosystem__image');

        if (!leftCol || !rightCol) return;

        var leftHeight = leftCol.offsetHeight;
        var windowHeight = window.innerHeight;

        /* Pin the entire right column.
         *
         * anticipatePin: 1 pre-warms the pin a frame before the
         * scrollbar reaches the start line so the transform takes
         * effect on the frame the user actually sees it enter the
         * pinned state. Without it, high-DPI Retina scrolling pushes
         * past the start line before the first RAF commits the pin
         * transform, and the image column visibly hops by a few
         * pixels at pin engagement.
         *
         * invalidateOnRefresh re-reads leftHeight on resize / theme-
         * editor section reload; left-column text length can change
         * via CMS edits, which changes the `end` distance.
         *
         * pinType "transform" is default on touch but we force it on
         * desktop too — fixed pinning on desktop was causing subpixel
         * rounding jitter when the page had zoom != 100%.
         */
        ScrollTrigger.create({
          trigger: section,
          start: 'top top',
          end: '+=' + (leftHeight - windowHeight + 100),
          pin: rightCol,
          pinSpacing: false,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          pinType: 'transform'
        });

        /* Parallax image scale */
        if (image) {
          gsap.to(image, {
            scale: 1.1,
            ease: 'none',
            scrollTrigger: {
              trigger: section,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true
            }
          });
        }

        /* Fade out text items */
        var items = gsap.utils.toArray('.eco-item', section);
        items.forEach(function (item) {
          gsap.to(item, {
            opacity: 0,
            y: -50,
            scrollTrigger: {
              trigger: item,
              start: 'top 30%',
              end: 'top 10%',
              scrub: true
            }
          });
        });

      }, section);

      return function () { ctx.revert(); };
    });

    return mm;
  }

  var instances = {};
  document.querySelectorAll('[data-section-type="ecosystem"]').forEach(function (el) {
    instances[el.dataset.sectionId] = initEcosystem(el.closest('.shopify-section') || el);
  });

  document.addEventListener('shopify:section:load', function (e) {
    var s = e.target.querySelector('[data-section-type="ecosystem"]');
    if (s) {
      if (instances[s.dataset.sectionId]) instances[s.dataset.sectionId].revert();
      instances[s.dataset.sectionId] = initEcosystem(e.target);
    }
  });

  document.addEventListener('shopify:section:unload', function (e) {
    if (instances[e.detail.sectionId]) {
      instances[e.detail.sectionId].revert();
      delete instances[e.detail.sectionId];
    }
  });
})();
