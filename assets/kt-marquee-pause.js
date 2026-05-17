/**
 * Marquee pause/play toggle — shared handler for the three marquee
 * sections (brands, gallery-marquee, testimonials-marquee). WCAG 2.2.2
 * Pause, Stop, Hide: infinite CSS marquees with real text content
 * must expose a user-controllable pause. Hover and focus-within
 * already mitigate pointer/keyboard users; this script adds a
 * persistent on-page pause control accessible to touch and screen-
 * reader users.
 *
 * Markup contract (set on the section root):
 *   data-marquee-pause-host="kt-brands"          (BEM block name)
 *   data-marquee-pause-modifier="kt-brands--paused"  (full modifier
 *     class to toggle)
 * Inside the section, a button:
 *   data-marquee-pause-toggle
 *   aria-pressed="true"  (autoplay default = playing = pressed=true)
 *
 * The toggle button itself owns its visual play/pause icon swap via
 * `[hidden]` on the inner SVG icons; this script just maintains
 * `aria-pressed` and the modifier class.
 */
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
