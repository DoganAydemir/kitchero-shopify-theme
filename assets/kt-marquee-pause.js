(function () {
  'use strict';

  function bindHost(host) {
    if (!host || host.dataset.marqueePauseBound === 'true') return;
    var toggle = host.querySelector('[data-marquee-pause-toggle]');
    if (!toggle) return;
    host.dataset.marqueePauseBound = 'true';
    var modifier = host.dataset.marqueePauseModifier;
    if (!modifier) return;

    var iconPause = toggle.querySelector('[data-marquee-icon-pause]');
    var iconPlay = toggle.querySelector('[data-marquee-icon-play]');

    function syncUi() {
      var paused = host.classList.contains(modifier);
      toggle.setAttribute('aria-pressed', paused ? 'false' : 'true');
      if (iconPause) iconPause.hidden = paused;
      if (iconPlay) iconPlay.hidden = !paused;
    }

    toggle.addEventListener('click', function () {
      host.classList.toggle(modifier);
      syncUi();
    });

    syncUi();
  }

  function initAll(scope) {
    var nodes = (scope || document).querySelectorAll('[data-marquee-pause-host]');
    Array.prototype.forEach.call(nodes, bindHost);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initAll(); });
  } else {
    initAll();
  }

  document.addEventListener('shopify:section:load', function (e) {
    initAll(e.target);
  });
})();
