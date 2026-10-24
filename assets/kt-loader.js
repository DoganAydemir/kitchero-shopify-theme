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

    var reduced = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced) {
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
