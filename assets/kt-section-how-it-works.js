/**
 * How It Works — GSAP scale-down on previous cards as next card scrolls in
 * Matches HowItWorks.tsx.
 */
(function () {
  'use strict';


  /* Skip scroll-bound animations entirely inside Shopify's theme
     editor (Shopify.designMode is true only in the editor iframe).
     Editor lifecycle quirks — section adds, removes, re-renders —
     fire shopify:section:load / unload in rapid sequence and can
     trigger ScrollTrigger.refresh() against half-torn-down DOM,
     which has surfaced as "page won't scroll to the footer after
     I drop in this section" reports across multiple sections that
     don't even use pinning. The live storefront still gets every
     animation because designMode is undefined there. */
  if (window.Shopify && window.Shopify.designMode) return;
  function initHowItWorks(container) {
    var section = container.querySelector('[data-section-type="how-it-works"]');
    if (!section || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return null;

    var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return null;

    gsap.registerPlugin(ScrollTrigger);

    var ctx = gsap.context(function () {
      var cards = gsap.utils.toArray('.kt-how-it-works__card', section);

      cards.forEach(function (card, i) {
        if (i === cards.length - 1) return; /* Last card doesn't scale */

        ScrollTrigger.create({
          trigger: cards[i + 1],
          start: 'top bottom',
          end: 'top 20%',
          scrub: true,
          onUpdate: function (self) {
            gsap.set(card, {
              scale: 1 - (self.progress * 0.08),
              filter: 'brightness(' + (1 - self.progress * 0.15) + ')'
            });
          }
        });
      });
    }, section);

    return ctx;
  }

  var instances = {};
  document.querySelectorAll('[data-section-type="how-it-works"]').forEach(function (el) {
    instances[el.dataset.sectionId] = initHowItWorks(el.closest('.shopify-section') || el);
  });

  document.addEventListener('shopify:section:load', function (e) {
    var s = e.target.querySelector('[data-section-type="how-it-works"]');
    if (!s) return;
    /* Theme editor fires shopify:section:load on every settings change.
       If we re-initialise without first reverting the previous gsap.context,
       the prior ScrollTriggers leak — they keep firing on scroll, accumulate
       in ScrollTrigger.getAll(), and gradually freeze the editor. Mirror
       the destroy-then-recreate pattern used in kt-section-ecosystem.js. */
    var sectionId = s.dataset.sectionId;
    if (instances[sectionId]) {
      instances[sectionId].revert();
    }
    instances[sectionId] = initHowItWorks(e.target);
  });

  document.addEventListener('shopify:section:unload', function (e) {
    if (instances[e.detail.sectionId]) {
      instances[e.detail.sectionId].revert();
      delete instances[e.detail.sectionId];
    }
  });
})();
