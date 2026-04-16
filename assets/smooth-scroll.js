/**
 * Smooth Scroll — Lenis + GSAP ScrollTrigger integration
 * Birebir from SmoothScroll.tsx:
 * - duration: 1.2
 * - easing: exponential decay (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
 * - smoothWheel: true
 * - touchMultiplier: 2
 * - Syncs with GSAP ScrollTrigger
 *
 * Elements with [data-lenis-prevent] opt out of smooth scroll.
 */
(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion || typeof Lenis === 'undefined') return;

  var lenis = new Lenis({
    duration: 1.2,
    easing: function (t) {
      return Math.min(1, 1.001 - Math.pow(2, -10 * t));
    },
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    touchMultiplier: 2
  });

  /* Sync with GSAP ScrollTrigger if available */
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add(function (time) {
      lenis.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0);
  } else {
    /* Fallback: use requestAnimationFrame loop */
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }

  /* Expose globally for other scripts to use (e.g. stop/start during modals) */
  window.kitcheroLenis = lenis;
})();
