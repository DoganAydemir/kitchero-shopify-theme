(function () {
  'use strict';

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
        if (i === cards.length - 1) return;

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

  document.addEventListener('shopify:block:select', function (event) {
    var card = event.target;
    if (!card || !card.classList || !card.classList.contains('kt-how-it-works__card')) return;
  });
})();
