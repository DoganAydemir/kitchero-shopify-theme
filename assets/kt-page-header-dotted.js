/**
 * Page Header — Dotted
 *
 * Shared controller for the `[data-dotted-header]` component:
 *   - Staggered text reveal (eyebrow → title → description → count)
 *   - Scroll-linked parallax on layer 2 (dots) and layer 4 (markers)
 *   - Uses GSAP + ScrollTrigger when available, falls back to a plain
 *     scroll listener for parallax and CSS-only fade-in for reveal
 *   - Honors prefers-reduced-motion
 *   - Idempotent load-guard safe against duplicate <script> injection
 */
if (!window.__kitcheroDottedHeaderLoaded) {
  window.__kitcheroDottedHeaderLoaded = true;

  (function () {
    'use strict';

    var prefersReducedMotion =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var instances = [];

    function revealViaGsap(header) {
      if (typeof gsap === 'undefined') return false;
      var targets = header.querySelectorAll('[data-dotted-anim]');
      if (!targets.length) return true;
      gsap.fromTo(
        targets,
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.9, stagger: 0.1, ease: 'power4.out' }
      );
      return true;
    }

    function revealViaCss(header) {
      /* CSS-only fallback: just snap everything to visible with a short
         transition. Values mirror the GSAP fromTo endpoints. */
      header.querySelectorAll('[data-dotted-anim]').forEach(function (el) {
        el.style.transition = 'opacity 0.9s ease, transform 0.9s ease';
        el.style.transform = 'translateY(0)';
        el.style.opacity = '1';
      });
    }

    function initReveal(header) {
      /* Start targets off-screen-ish so GSAP/CSS can animate them in */
      header.querySelectorAll('[data-dotted-anim]').forEach(function (el) {
        el.style.willChange = 'transform, opacity';
      });

      if (prefersReducedMotion) {
        /* Nothing to do — CSS already shows the content */
        return;
      }

      if (!revealViaGsap(header)) {
        revealViaCss(header);
      }
    }

    function bindParallaxViaGsap(header) {
      if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return false;
      gsap.registerPlugin(ScrollTrigger);

      /* Wrap the GSAP tweens + ScrollTriggers in a gsap.context scoped
       * to this header element. On section unload we call ctx.revert()
       * which kills every tween and ScrollTrigger the context created,
       * so detached DOM references don't linger — previously the
       * ScrollTriggers survived section removal in the theme editor
       * and accumulated "referencing detached element" warnings while
       * degrading scroll perf over repeated section re-renders. */
      var ctx = gsap.context(function () {
        var dots = header.querySelector('[data-parallax-dots]');
        if (dots) {
          gsap.to(dots, {
            y: '20%',
            ease: 'none',
            scrollTrigger: {
              trigger: header,
              start: 'top top',
              end: 'bottom top',
              scrub: true,
            },
          });
        }

        var markers = header.querySelector('[data-parallax-markers]');
        if (markers) {
          gsap.to(markers, {
            y: '35%',
            ease: 'none',
            scrollTrigger: {
              trigger: header,
              start: 'top top',
              end: 'bottom top',
              scrub: true,
            },
          });
        }
      }, header);

      /* Push the ctx.revert() into the shared `instances` cleanup list
       * so the same section-unload handler at the bottom of the file
       * collects GSAP pinned work alongside the RAF fallback listeners. */
      instances.push({ header: header, cleanup: function () { ctx.revert(); } });

      return true;
    }

    function bindParallaxViaScroll(header) {
      /* Fallback: plain requestAnimationFrame listener. Cheaper than GSAP
         if the vendor bundle isn't loaded yet. */
      var dots = header.querySelector('[data-parallax-dots]');
      var markers = header.querySelector('[data-parallax-markers]');
      if (!dots && !markers) return;

      var rafPending = false;

      function update() {
        rafPending = false;
        var rect = header.getBoundingClientRect();
        var h = rect.height || 1;
        /* progress 0 when top aligns with viewport top, 1 when bottom
           aligns with top. Clamp to keep transforms bounded. */
        var raw = -rect.top / h;
        var progress = Math.max(0, Math.min(1, raw));

        if (dots) dots.style.transform = 'translateY(' + (progress * 20) + '%)';
        if (markers) markers.style.transform = 'translateY(' + (progress * 35) + '%)';
      }

      function onScroll() {
        if (rafPending) return;
        rafPending = true;
        window.requestAnimationFrame(update);
      }

      update();
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll, { passive: true });

      instances.push({
        header: header,
        cleanup: function () {
          window.removeEventListener('scroll', onScroll);
          window.removeEventListener('resize', onScroll);
        },
      });
    }

    function initParallax(header) {
      if (prefersReducedMotion) return;
      if (!bindParallaxViaGsap(header)) {
        bindParallaxViaScroll(header);
      }
    }

    function initHeader(header) {
      if (!header || header.dataset.dottedInit === '1') return;
      header.dataset.dottedInit = '1';
      initReveal(header);
      initParallax(header);
    }

    function initAll() {
      document.querySelectorAll('[data-dotted-header]').forEach(initHeader);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initAll);
    } else {
      initAll();
    }

    /* Theme editor re-render: the snippet can be inside any section that
       changes. Re-scan on every section load. */
    document.addEventListener('shopify:section:load', function (e) {
      var root = document.querySelector('[data-section-id="' + e.detail.sectionId + '"]');
      if (!root) return;
      root.querySelectorAll('[data-dotted-header]').forEach(function (header) {
        delete header.dataset.dottedInit;
        initHeader(header);
      });
    });

    document.addEventListener('shopify:section:unload', function (e) {
      /* Clean up scroll-listener instances that belonged to the unloaded
         section. Safe if GSAP is in use too — there's just nothing to remove. */
      var root = document.querySelector('[data-section-id="' + e.detail.sectionId + '"]');
      instances = instances.filter(function (inst) {
        if (root && root.contains(inst.header)) {
          inst.cleanup();
          return false;
        }
        return true;
      });
    });
  })();
}
