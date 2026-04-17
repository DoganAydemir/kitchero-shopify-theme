/* ============================================================
   Testimonials pullquote slider.
   Only binds when more than one quote block is present. Handles
   prev/next buttons, dot indicators, auto-advance (paused on
   hover/focus), and keyboard arrow navigation.
   ============================================================ */
(function () {
  'use strict';

  function initSlider(root) {
    if (!root || root.dataset.pullquoteBound === 'true') return;
    var track = root.querySelector('[data-pullquote-track]');
    var slides = root.querySelectorAll('[data-pullquote-slide]');
    var dots = root.querySelectorAll('[data-pullquote-dot]');
    var prev = root.querySelector('[data-pullquote-prev]');
    var next = root.querySelector('[data-pullquote-next]');
    if (!track || slides.length < 2) return;
    root.dataset.pullquoteBound = 'true';

    var index = 0;
    var total = slides.length;
    var interval = null;
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function goTo(i) {
      if (i < 0) i = total - 1;
      if (i >= total) i = 0;
      index = i;
      slides.forEach(function (slide, n) {
        slide.classList.toggle('kt-testimonials-pullquote__slide--active', n === index);
      });
      dots.forEach(function (dot, n) {
        dot.classList.toggle('kt-testimonials-pullquote__dot--active', n === index);
        dot.setAttribute('aria-selected', n === index ? 'true' : 'false');
      });
    }

    function startAuto() {
      if (reduceMotion || interval) return;
      interval = setInterval(function () { goTo(index + 1); }, 7000);
    }
    function stopAuto() {
      if (interval) { clearInterval(interval); interval = null; }
    }

    if (prev) prev.addEventListener('click', function () { goTo(index - 1); stopAuto(); });
    if (next) next.addEventListener('click', function () { goTo(index + 1); stopAuto(); });
    Array.prototype.forEach.call(dots, function (dot, n) {
      dot.addEventListener('click', function () { goTo(n); stopAuto(); });
    });

    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { goTo(index - 1); stopAuto(); }
      if (e.key === 'ArrowRight') { goTo(index + 1); stopAuto(); }
    });

    root.addEventListener('mouseenter', stopAuto);
    root.addEventListener('focusin', stopAuto);
    root.addEventListener('mouseleave', startAuto);

    /* Touch swipe */
    var startX = 0, startY = 0, touchActive = false;
    track.addEventListener('touchstart', function (e) {
      if (!e.touches || e.touches.length !== 1) return;
      touchActive = true;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });
    track.addEventListener('touchend', function (e) {
      if (!touchActive) return;
      touchActive = false;
      var t = e.changedTouches && e.changedTouches[0];
      if (!t) return;
      var dx = t.clientX - startX;
      var dy = t.clientY - startY;
      if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      goTo(index + (dx < 0 ? 1 : -1));
      stopAuto();
    }, { passive: true });

    startAuto();
  }

  function initAll(scope) {
    var nodes = (scope || document).querySelectorAll('.kt-testimonials-pullquote--slider');
    Array.prototype.forEach.call(nodes, initSlider);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initAll(); });
  } else {
    initAll();
  }
  document.addEventListener('shopify:section:load', function (e) { initAll(e.target); });
})();
