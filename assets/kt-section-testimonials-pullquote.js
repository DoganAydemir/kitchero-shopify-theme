(function () {
  'use strict';

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

    var autoplaySeconds = parseInt(root.getAttribute('data-autoplay-interval') || '0', 10);
    var autoplayMs = (isNaN(autoplaySeconds) || autoplaySeconds <= 0) ? 0 : autoplaySeconds * 1000;

    function goTo(i) {
      if (i < 0) i = total - 1;
      if (i >= total) i = 0;
      index = i;
      slides.forEach(function (slide, n) {
        var on = n === index;
        slide.classList.toggle('kt-testimonials-pullquote__slide--active', on);

        slide.setAttribute('aria-hidden', on ? 'false' : 'true');
      });
      dots.forEach(function (dot, n) {
        var on = n === index;
        dot.classList.toggle('kt-testimonials-pullquote__dot--active', on);

        dot.setAttribute('aria-selected', on ? 'true' : 'false');
        dot.setAttribute('tabindex', on ? '0' : '-1');
      });
    }

    function startAuto() {
      if (reduceMotion || interval) return;

      if (autoplayMs <= 0) return;

      if (window.Shopify && window.Shopify.designMode) return;
      interval = setInterval(function () { goTo(index + 1); }, autoplayMs);
    }
    function stopAuto() {
      if (interval) { clearInterval(interval); interval = null; }
    }

    if (prev) prev.addEventListener('click', function () { goTo(index - 1); stopAuto(); });
    if (next) next.addEventListener('click', function () { goTo(index + 1); stopAuto(); });
    Array.prototype.forEach.call(dots, function (dot, n) {
      dot.addEventListener('click', function () { goTo(n); stopAuto(); });
    });

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

    var userPaused = false;
    var playToggle = root.querySelector('[data-pullquote-play-toggle]');
    var iconPause = root.querySelector('.kt-testimonials-pullquote__play-icon--pause');
    var iconPlay = root.querySelector('.kt-testimonials-pullquote__play-icon--play');
    function syncToggleUi() {
      if (playToggle) {
        playToggle.setAttribute('aria-pressed', userPaused ? 'false' : 'true');
      }
      if (iconPause) iconPause.hidden = userPaused;
      if (iconPlay) iconPlay.hidden = !userPaused;
    }
    if (playToggle) {
      playToggle.addEventListener('click', function () {
        userPaused = !userPaused;
        if (userPaused) {
          stopAuto();
        } else {
          startAuto();
        }
        syncToggleUi();
      });
      syncToggleUi();
    }

    root.addEventListener('mouseenter', stopAuto);
    root.addEventListener('focusin', stopAuto);
    root.addEventListener('mouseleave', function () {
      if (!userPaused) startAuto();
    });

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

    track.addEventListener('touchcancel', function () {
      touchActive = false;
    }, { passive: true });

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
  document.addEventListener('shopify:section:load', function (e) {
    if (e.target && e.target.querySelectorAll) {
      var oldNodes = e.target.querySelectorAll('.kt-testimonials-pullquote--slider');
      Array.prototype.forEach.call(oldNodes, function (root) {
        var ctrl = boundSliders.get(root);
        if (ctrl) ctrl.stopAuto();
        boundSliders.delete(root);
      });
    }
    initAll(e.target);
  });

  document.addEventListener('shopify:section:unload', function (e) {
    if (!e.target) return;
    var nodes = e.target.querySelectorAll
      ? e.target.querySelectorAll('.kt-testimonials-pullquote--slider')
      : [];
    Array.prototype.forEach.call(nodes, function (root) {
      var ctrl = boundSliders.get(root);
      if (ctrl) ctrl.stopAuto();
      boundSliders.delete(root);
    });
  });

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
