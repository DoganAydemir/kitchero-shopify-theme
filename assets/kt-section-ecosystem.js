(function () {
  'use strict';

  function initEcosystem(sectionEl) {
    if (!sectionEl || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return null;

    var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return null;

    if (window.Shopify && window.Shopify.designMode) return null;

    gsap.registerPlugin(ScrollTrigger);

    var mm = gsap.matchMedia();

    mm.add('(min-width: 990px)', function () {
      var ctx = gsap.context(function () {
        var image = sectionEl.querySelector('.kt-ecosystem__image');

        if (image) {
          gsap.to(image, {
            scale: 1.1,
            ease: 'none',
            scrollTrigger: {
              trigger: sectionEl,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true
            }
          });
        }

        var items = gsap.utils.toArray('.eco-item', sectionEl);
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
      }, sectionEl);

      return function () { ctx.revert(); };
    });

    return mm;
  }

  var instances = {};

  function initAll(root) {
    (root || document).querySelectorAll('[data-section-type="ecosystem"]').forEach(function (el) {
      var sid = el.dataset.sectionId;
      if (!sid) return;
      if (instances[sid] && typeof instances[sid].revert === 'function') {
        instances[sid].revert();
      }
      instances[sid] = initEcosystem(el);
    });

    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      if (window.Kitchero && Kitchero.safeScrollTriggerRefresh) {
        Kitchero.safeScrollTriggerRefresh();
      } else {
        try { ScrollTrigger.refresh(); } catch (_) {}
      }
    }
  }

  initAll();

  document.addEventListener('shopify:section:load', function (e) {
    initAll(e.target);
  });

  document.addEventListener('shopify:section:unload', function (e) {
    var sid = e.detail && e.detail.sectionId;
    if (sid && instances[sid]) {
      if (typeof instances[sid].revert === 'function') instances[sid].revert();
      delete instances[sid];
      if (window.Kitchero && Kitchero.safeScrollTriggerRefresh) {
        Kitchero.safeScrollTriggerRefresh();
      } else if (typeof ScrollTrigger !== 'undefined') {
        try { ScrollTrigger.refresh(); } catch (_) {}
      }
    }
  });

  document.addEventListener('shopify:block:select', function (event) {
    var item = event.target;
    if (!item || !item.classList || !item.classList.contains('kt-ecosystem__feature')) return;
  });
})();
