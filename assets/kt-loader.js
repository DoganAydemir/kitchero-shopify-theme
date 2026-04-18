/**
 * Kitchero First-Paint Loader — "The Opening"
 *
 * Drives the counter (00 → 100) and the bottom progress bar. Every
 * other element animates via pure CSS keyframes so they stay in sync
 * with the browser's compositor even on slow devices.
 *
 * The counter is time-based theater, not a real byte tracker — it
 * follows an ease-out curve over ~1.8s. It caps at 95% until
 * `window.load` fires so it never finishes before the real page.
 *
 * Total visible time on a cold load: ~2.2s reveal + 0.9s exit = ~3.1s.
 * On a warm/cached load the counter runs the same 1.8s for consistency
 * (awwwards loaders are narrative, not honest).
 */

(function () {
  'use strict';

  var STORAGE_KEY = 'kitchero:loader-shown';
  var COUNTER_DURATION = 1800;
  var HOLD_BEFORE_EXIT = 300;
  var EXIT_DURATION = 900;

  function init() {
    var loader = document.getElementById('kt-loader');
    if (!loader) return;

    var html = document.documentElement;
    if (html.classList.contains('kt-loader-skip')) {
      hideImmediately(loader);
      return;
    }

    try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch (e) {}

    html.classList.add('kt-loader-active');
    runCounter(loader);
  }

  function hideImmediately(loader) {
    loader.setAttribute('data-state', 'hidden');
    document.documentElement.classList.remove('kt-loader-active');
  }

  function runCounter(loader) {
    var numEl = loader.querySelector('.kt-loader__counter-num');
    var barEl = loader.querySelector('.kt-loader__bar-fill');
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced) {
      /* Skip the theatrical counter — just snap to 100, brief hold, exit. */
      if (numEl) numEl.textContent = '100';
      if (barEl) barEl.style.width = '100%';
      setTimeout(function () { exit(loader); }, 400);
      return;
    }

    var duration = COUNTER_DURATION;
    var start = performance.now();
    var docReady = document.readyState === 'complete';

    if (!docReady) {
      window.addEventListener('load', function () { docReady = true; }, { once: true });
    }

    function tick(now) {
      var elapsed = now - start;
      var progress = Math.min(elapsed / duration, 1);
      /* easeOutQuart — fast start, very gentle finish, more dramatic
         than cubic. Classic reveal-style curve. */
      var eased = 1 - Math.pow(1 - progress, 4);
      var target = docReady ? 100 : 95;
      var pct = Math.floor(eased * target);

      if (numEl) numEl.textContent = pct < 10 ? '0' + pct : String(pct);
      if (barEl) barEl.style.width = pct + '%';

      if (pct < 100) {
        requestAnimationFrame(tick);
      } else {
        setTimeout(function () { exit(loader); }, HOLD_BEFORE_EXIT);
      }
    }

    requestAnimationFrame(tick);
  }

  function exit(loader) {
    loader.setAttribute('data-state', 'exiting');
    /* Release scroll lock at the start of the exit so any on-scroll
       reveal animations in the page below start in sync with the
       curtain opening, not after it fully closes. */
    document.documentElement.classList.remove('kt-loader-active');
    setTimeout(function () {
      loader.setAttribute('data-state', 'hidden');
    }, EXIT_DURATION);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
