(function () {
  'use strict';

  if (window.kitcheroLenis) return;

  if (window.Shopify && window.Shopify.designMode) return;

  var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion || typeof Lenis === 'undefined') return;

  var hasTouchEvents = ('ontouchstart' in window)
    || (window.DocumentTouch && document instanceof window.DocumentTouch);
  var hasTouchPoints = navigator.maxTouchPoints && navigator.maxTouchPoints > 0;
  var noHover = window.matchMedia
    && window.matchMedia('(hover: none)').matches;
  var coarsePointer = window.matchMedia
    && window.matchMedia('(pointer: coarse)').matches;
  var narrowViewport = window.matchMedia
    && window.matchMedia('(max-width: 989px)').matches;

  var isTouchCapable = hasTouchEvents
    || hasTouchPoints
    || noHover
    || coarsePointer
    || narrowViewport;

  if (isTouchCapable) return;

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

  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add(function (time) {
      lenis.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0);
  } else {
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }

  window.kitcheroLenis = lenis;
})();
