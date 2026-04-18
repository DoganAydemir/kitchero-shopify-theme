/**
 * Image with Text — Standard Split Parallax
 *
 * Applies a subtle vertical translate to the image frame of each
 * [data-parallax-section] as it scrolls through the viewport. The amount of
 * movement is driven by the section's data-parallax-intensity attribute
 * (percentage of the image height) and written to a CSS custom property
 * (--kt-iwt-parallax-y) on the [data-parallax-image] child, which is the
 * element the stylesheet transforms.
 *
 * Implementation notes
 * --------------------
 * - Scroll handler is rAF-throttled and only runs while at least one tracked
 *   section is inside the viewport (gated by an IntersectionObserver). This
 *   keeps the cost near-zero when the sections are off-screen.
 * - Honours prefers-reduced-motion and section-level intensity=0 (both are
 *   treated as "parallax disabled" and the frame is left at its resting
 *   position).
 * - Re-initialises cleanly on shopify:section:load and cleans up all
 *   listeners + state on shopify:section:unload.
 * - Idempotent: guarded by window.__kitcheroIwtParallaxLoaded so duplicate
 *   script tags (Section Rendering API / editor rehydration) don't double-
 *   bind scroll + resize listeners.
 */
if (!window.__kitcheroIwtParallaxLoaded) {
  window.__kitcheroIwtParallaxLoaded = true;

  (function () {
    'use strict';

    var SELECTOR_SECTION = '[data-parallax-section]';
    var SELECTOR_IMAGE = '[data-parallax-image]';

    var prefersReducedMotion =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* Tracked instances keyed by sectionId for targeted cleanup. */
    var instances = new Map();

    /* How many instances are currently visible; drives the rAF loop. */
    var visibleCount = 0;
    var rafId = null;
    var intersectionObserver = null;

    function getIntersectionObserver() {
      if (intersectionObserver) return intersectionObserver;
      if (typeof IntersectionObserver === 'undefined') return null;

      intersectionObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            var instance = instances.get(entry.target.dataset.sectionId);
            if (!instance) return;
            var wasVisible = instance.visible;
            instance.visible = entry.isIntersecting;
            if (entry.isIntersecting && !wasVisible) {
              visibleCount++;
            } else if (!entry.isIntersecting && wasVisible) {
              visibleCount = Math.max(0, visibleCount - 1);
            }
          });
          scheduleUpdate();
        },
        { rootMargin: '10% 0% 10% 0%', threshold: [0, 0.01] }
      );

      return intersectionObserver;
    }

    function update() {
      rafId = null;
      if (visibleCount === 0) return;

      var viewportH = window.innerHeight || document.documentElement.clientHeight;

      instances.forEach(function (instance) {
        if (!instance.visible || !instance.image) return;

        var rect = instance.section.getBoundingClientRect();
        var sectionH = rect.height || 1;

        /*
         * progress = 0 when the section's top edge sits at the bottom of the
         *              viewport (just entering from below)
         * progress = 1 when the section's bottom edge sits at the top of the
         *              viewport (just leaving above)
         * Clamped to [0, 1] so a short section at full view doesn't overshoot.
         */
        var raw = (viewportH - rect.top) / (viewportH + sectionH);
        var progress = Math.max(0, Math.min(1, raw));

        /*
         * Translate range is +/- half the intensity so the "neutral" (progress
         * 0.5) frame sits at 0. The frame element is already over-sized in CSS
         * by the same amount (inset: -intensity%), so no empty space ever
         * shows.
         */
        var y = (progress - 0.5) * instance.intensity;
        instance.image.style.setProperty('--kt-iwt-parallax-y', y.toFixed(3) + '%');
      });
    }

    function scheduleUpdate() {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(update);
    }

    function onScrollOrResize() {
      scheduleUpdate();
    }

    var globalListenersAttached = false;
    function ensureGlobalListeners() {
      if (globalListenersAttached) return;
      globalListenersAttached = true;
      window.addEventListener('scroll', onScrollOrResize, { passive: true });
      window.addEventListener('resize', onScrollOrResize, { passive: true });
    }

    function removeGlobalListenersIfEmpty() {
      if (instances.size > 0) return;
      if (!globalListenersAttached) return;
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
      globalListenersAttached = false;
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    function initSection(section) {
      if (!section || section.dataset.parallaxBound === 'true') return;

      var sectionId = section.dataset.sectionId;
      if (!sectionId) return;

      var intensity = parseFloat(section.dataset.parallaxIntensity);
      if (!isFinite(intensity) || intensity <= 0 || prefersReducedMotion) {
        /* Disabled: leave frame at its resting position, no listeners. */
        section.dataset.parallaxBound = 'true';
        return;
      }

      var image = section.querySelector(SELECTOR_IMAGE);
      if (!image) return;

      var instance = {
        section: section,
        image: image,
        intensity: intensity,
        visible: false
      };

      instances.set(sectionId, instance);
      section.dataset.parallaxBound = 'true';

      ensureGlobalListeners();

      var io = getIntersectionObserver();
      if (io) {
        io.observe(section);
      } else {
        /* IO unsupported: assume always visible and update on scroll. */
        instance.visible = true;
        visibleCount++;
        scheduleUpdate();
      }
    }

    function destroySection(sectionId) {
      var instance = instances.get(sectionId);
      if (!instance) return;

      if (intersectionObserver) {
        intersectionObserver.unobserve(instance.section);
      }

      if (instance.visible) {
        visibleCount = Math.max(0, visibleCount - 1);
      }

      if (instance.image) {
        instance.image.style.removeProperty('--kt-iwt-parallax-y');
      }

      delete instance.section.dataset.parallaxBound;

      instances.delete(sectionId);
      removeGlobalListenersIfEmpty();
    }

    function initAll(root) {
      var scope = root || document;
      var sections = scope.querySelectorAll(SELECTOR_SECTION);
      for (var i = 0; i < sections.length; i++) {
        initSection(sections[i]);
      }
    }

    /* ---------- Boot + Shopify theme editor hooks ---------- */

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        initAll(document);
      });
    } else {
      initAll(document);
    }

    document.addEventListener('shopify:section:load', function (event) {
      var sectionId = event.detail && event.detail.sectionId;
      if (!sectionId) return;
      var section = document.querySelector(
        '[data-section-id="' + sectionId + '"][data-parallax-section]'
      );
      if (section) initSection(section);
    });

    document.addEventListener('shopify:section:unload', function (event) {
      var sectionId = event.detail && event.detail.sectionId;
      if (sectionId) destroySection(sectionId);
    });
  })();
}
