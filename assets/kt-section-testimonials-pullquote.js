/* ============================================================
   Testimonials pullquote slider.
   Only binds when more than one quote block is present. Handles
   prev/next buttons, dot indicators, auto-advance (paused on
   hover/focus), and keyboard arrow navigation.
   ============================================================ */
(function () {
  'use strict';

  /* Map<rootElement, goToFn> so the shopify:block:select handler can
     call into a bound slider instance to jump to a specific slide. */
  var boundSliders = new WeakMap();

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
        var on = n === index;
        slide.classList.toggle('kt-testimonials-pullquote__slide--active', on);
        /* tabpanel visibility for assistive tech — hide inactive slides
           so screen readers don't announce every quote at once. */
        slide.setAttribute('aria-hidden', on ? 'false' : 'true');
      });
      dots.forEach(function (dot, n) {
        var on = n === index;
        dot.classList.toggle('kt-testimonials-pullquote__dot--active', on);
        /* role="tab" pattern — aria-selected + roving tabindex so only
           the active tab is in the sequential focus order. Arrow keys
           move between tabs (tablist keydown handler below). */
        dot.setAttribute('aria-selected', on ? 'true' : 'false');
        dot.setAttribute('tabindex', on ? '0' : '-1');
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

    /* Keyboard nav scoped to the tablist — WAI-ARIA Authoring Practices
       tab pattern: ArrowLeft/Right cycle, Home/End jump to ends. Focus
       follows selection so the roving tabindex stays coherent. */
    var tablist = root.querySelector('[role="tablist"]');
    if (tablist) {
      tablist.addEventListener('keydown', function (e) {
        var key = e.key;
        if (key !== 'ArrowLeft' && key !== 'ArrowRight' &&
            key !== 'Home' && key !== 'End') return;
        e.preventDefault();
        var nextIdx = index;
        if (key === 'ArrowLeft')  nextIdx = (index - 1 + total) % total;
        if (key === 'ArrowRight') nextIdx = (index + 1) % total;
        if (key === 'Home')       nextIdx = 0;
        if (key === 'End')        nextIdx = total - 1;
        goTo(nextIdx);
        stopAuto();
        var target = root.querySelector('[data-pullquote-dot="' + nextIdx + '"]');
        if (target) target.focus();
      });
    }

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

    /* Expose goTo + stopAuto so the theme editor block:select handler
       can jump to a specific slide when the merchant clicks a block. */
    boundSliders.set(root, { goTo: goTo, stopAuto: stopAuto });

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

  /* Theme editor: when merchant selects a quote block in the sidebar,
     jump to that slide. event.target is the <article data-pullquote-slide>. */
  document.addEventListener('shopify:block:select', function (e) {
    var slide = e.target;
    if (!slide || !slide.matches || !slide.matches('[data-pullquote-slide]')) return;
    var root = slide.closest('.kt-testimonials-pullquote--slider');
    if (!root) return;
    var ctrl = boundSliders.get(root);
    if (!ctrl) return;
    var idx = parseInt(slide.getAttribute('data-pullquote-slide'), 10);
    if (isNaN(idx)) return;
    ctrl.stopAuto();
    ctrl.goTo(idx);
  });
})();
