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

  /* R-SS7 — Skip Lenis entirely on touch-primary devices.

     Earlier configuration set `smoothTouch: false` + `syncTouch:
     false` + `touchMultiplier: 1` to keep Lenis on the page but
     hand touch events back to native iOS / Android momentum
     scrolling. In practice Lenis 1.x still attached touch
     listeners (wheel→scroll bridge, programmatic scrollTo, raf
     pipeline) which competed with the OS's rubber-band engine
     in subtle ways. Reported symptom on iOS Safari: "parmakla
     scroll yapıp bıraktığımızda yumuşakça kayarken birden bire
     çat diye duruyor" — the native momentum animation got
     pre-empted mid-glide by Lenis's internal ScrollTrigger
     update tick, producing the abrupt stop the merchant
     described.

     Premium themes (Aalto, Trade, Studio) skip smooth-scroll on
     touch entirely, since native iOS / Android momentum is
     already best-in-class. Lenis was only ever a wheel-scroll
     enhancement; cutting it on phones costs nothing visual and
     fixes the choppy-stop.

     Detection uses `(hover: none) and (pointer: coarse)` —
     matches phones + touch-only tablets, excludes laptops with
     touchscreens that also have a trackpad / mouse (those keep
     the wheel-side Lenis benefit). If `matchMedia` is missing
     (very old browsers), we fall through to the original Lenis
     init so the desktop fallback still works. */
  var isTouchOnly = window.matchMedia
    && window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  if (isTouchOnly) return;

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
