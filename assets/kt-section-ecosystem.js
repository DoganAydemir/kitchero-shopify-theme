/**
 * Ecosystem — GSAP ScrollTrigger
 * Birebir from Ecosystem.tsx:
 * - Pin entire right column during left text scroll
 * - Parallax scale on image (1 → 1.1)
 * - Fade out + y:-50 on each .eco-item as it scrolls past top 30%→10%
 */
(function () {
  'use strict';

  /* R232.69 — MULTI-INSTANCE FIX. When two ecosystem sections live
     on the same page, the previous implementation captured
     leftHeight ONCE at init and emitted a static `end: '+=N'` value
     to ScrollTrigger. ScrollTrigger.refresh() — which fires after
     any sibling section finishes its own pin/layout pass — re-runs
     the trigger's calc only if `end` is a FUNCTION. Static strings
     are cached.
     Symptoms reported: "iki ecosystem section'ı varken sağdaki
     scroll ile hareket eden foto efekti patlıyor, tek olunca
     normal." → first section's pin held the rightCol over the
     SECOND section's content because the first section's
     `end` value was stale (computed before the second section's
     content shifted the layout below it). Switching `end` and
     `start` to functions makes ScrollTrigger re-evaluate them on
     every refresh, which fires after any sibling pin's layout pass
     completes.
     Also tightened the per-instance scoping so two simultaneous
     ScrollTriggers can never alias on the same `instances` key (we
     re-key off `section.dataset.sectionId` reliably). */

  function initEcosystem(sectionEl) {
    if (!sectionEl || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return null;

    var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return null;

    /* Skip pinning entirely inside Shopify's theme editor. `pin:
       rightCol` locks the image column for the duration of the
       left-column scroll, which creates a "scroll dead-zone" when
       the merchant is adding / reordering the section from the
       editor — the editor iframe reads it as "I can't scroll past
       this section to the footer". Same gate is the canonical
       Shopify recommendation for any pinned ScrollTrigger. The live
       storefront still gets the full pinned right-column behaviour
       because Shopify.designMode is only ever true in the editor. */
    if (window.Shopify && window.Shopify.designMode) return null;

    gsap.registerPlugin(ScrollTrigger);

    var mm = gsap.matchMedia();

    mm.add('(min-width: 990px)', function () {
      var ctx = gsap.context(function () {
        var image = sectionEl.querySelector('.kt-ecosystem__image');

        /* R232.70 — GSAP `pin:` REMOVED. Pinning is now done by
           native CSS `position: sticky` on `.kt-ecosystem__image-col`
           (see kt-section-ecosystem.css). The previous GSAP pin
           with `pinSpacing: false` + `pinType: 'transform'` could
           not reconcile two stacked ecosystem sections on the same
           page — the first section's transform would hold the image
           col briefly then release with a visible "snap" to its
           natural flow position (bottom of the section), then the
           second section's pin would re-engage with another jump.
           CSS sticky has no per-instance bookkeeping; each section
           sticks within its own bounds and the browser handles the
           rest. The parallax-scale + feature-item fade animations
           below stay on GSAP because they're scrub-driven scroll
           effects, not layout pins, and they multi-instance fine. */

        /* Parallax image scale */
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

        /* Fade out text items — scoped to this section's .eco-item
           descendants only. */
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
    /* Trigger a layout pass once all instances have wired up so the
       second (and any subsequent) section's ScrollTrigger picks up
       its actual scroll start position rather than the position it
       had during initial paint — when several sibling sections share
       the page, layout doesn't stabilise until every section has
       attached its pin. */
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

  /* Theme editor: when merchant selects a feature block in the
     sidebar, scroll it into view. Feature blocks render as
     `.kt-ecosystem__feature.eco-item` with `block.shopify_attributes`,
     so block:select fires on the feature element itself. */
  document.addEventListener('shopify:block:select', function (event) {
    var item = event.target;
    if (!item || !item.classList || !item.classList.contains('kt-ecosystem__feature')) return;
    /* Scroll-into-view is handled centrally by global.js's block:select
       handler (50%-visibility-guarded). A local unconditional scroll
       re-centred the feature on every setting tweak (section re-render →
       block re-select) and jolted the page downward. */
  });
})();
