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

  /* Double-init guard. The Section Rendering API can re-inject
     deferred scripts (merchant-editor section reload, or a section
     fetching its own HTML that happens to include our script tag).
     Without this guard each re-injection starts a NEW Lenis instance
     + a NEW gsap.ticker.add — two tickers then advance the same
     lenis.raf twice per frame, doubling scroll velocity and
     corrupting the scroll state. */
  if (window.kitcheroLenis) return;

  /* Disable smooth scroll entirely inside Shopify's theme editor.
     Lenis hijacks the page scroll via a custom RAF easing loop;
     inside the editor iframe that competes with Shopify's own
     scroll handling — every shopify:section:load fires a
     ScrollTrigger.refresh() that Lenis can't keep in sync with,
     and the symptom merchants saw was "I drop in section X and
     suddenly I can't scroll past it to the footer". The live
     storefront still gets smooth scroll because Shopify.designMode
     is undefined there. */
  if (window.Shopify && window.Shopify.designMode) return;

  var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion || typeof Lenis === 'undefined') return;

  /* R269 — Touch device handling.

     Earlier config carried `smoothWheel: true` AND `touchMultiplier: 2`
     without explicitly setting `smoothTouch`. On bundled Lenis 1.x
     builds the default for `smoothTouch` is unstable across versions
     and could end up smoothing touch flicks too. Reported symptom on
     iOS Safari: "parmakla scroll yaptık ve bıraktık, yumuşakça
     kayarken birden bire çat diye duruyor" — native iOS rubber-band
     momentum was fighting Lenis's RAF easing, and at the moment one
     side's animation completed the other side hadn't, snapping the
     scroll to a hard stop mid-glide.

     Native iOS / Android momentum scroll is already best-in-class
     on touch; the value of Lenis on the wheel scrollbar (desktop)
     doesn't translate to touch surfaces, where mimicking it costs
     more than it gains. Standard practice on premium themes
     (Aalto, Trade, Studio) is to disable smooth scroll on touch
     and let the OS handle it.

     `syncTouch: false` (Lenis 1.x naming) leaves touch events
     un-intercepted; the page scrolls with native momentum, and
     ScrollTrigger picks up the resulting scroll events naturally.
     `touchMultiplier: 1` is the no-op identity (kept for clarity
     in case the option key changes between Lenis versions). */
  var lenis = new Lenis({
    duration: 1.2,
    easing: function (t) {
      return Math.min(1, 1.001 - Math.pow(2, -10 * t));
    },
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    smoothTouch: false,
    syncTouch: false,
    touchMultiplier: 1
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
