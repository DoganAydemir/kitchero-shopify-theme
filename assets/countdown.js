/**
 * Countdown — ticks every second, hides when expired.
 * Reads data-ends-at ISO date from element.
 * Re-inits on shopify:section:load, cleans on unload.
 *
 * Wrapped in a load-guard so that if the same script ends up on the page
 * more than once (edge cases: Section Rendering API returning HTML with a
 * nested script tag, theme editor rehydration), we don't double-bind
 * interval timers + event listeners.
 */
if (!window.__kitcheroCountdownLoaded) {
  window.__kitcheroCountdownLoaded = true;

  (function () {
    'use strict';

    var timers = [];

    function pad(n) {
      return String(n).padStart(2, '0');
    }

    function initCountdown(el) {
      var endsAt = new Date(el.dataset.endsAt);
      if (isNaN(endsAt.getTime())) {
        el.style.display = 'none';
        return null;
      }

      var daysEl = el.querySelector('[data-countdown-days]');
      var hoursEl = el.querySelector('[data-countdown-hours]');
      var minutesEl = el.querySelector('[data-countdown-minutes]');
      var secondsEl = el.querySelector('[data-countdown-seconds]');

      function tick() {
        var now = Date.now();
        var ms = endsAt.getTime() - now;

        if (ms <= 0) {
          el.style.display = 'none';
          return false;
        }

        var days = Math.floor(ms / 86400000);
        var hours = Math.floor((ms % 86400000) / 3600000);
        var minutes = Math.floor((ms % 3600000) / 60000);
        var seconds = Math.floor((ms % 60000) / 1000);

        if (daysEl) daysEl.textContent = pad(days);
        if (hoursEl) hoursEl.textContent = pad(hours);
        if (minutesEl) minutesEl.textContent = pad(minutes);
        if (secondsEl) secondsEl.textContent = pad(seconds);

        return true;
      }

      /* Initial tick */
      if (!tick()) return null;

      /* Theme editor preview — render a one-shot frame and skip the
         per-second interval. Without this guard, the editor preview
         iframe repaints every second while the merchant edits the
         metafield-driven offer date, hammering the editor's idle CPU
         budget and triggering needless layout shifts as the digits
         change. The frozen value still reflects the metafield because
         we already called tick() once above. Mirrors the
         announcement-banner.js Shopify.designMode short-circuit. */
      if (window.Shopify && window.Shopify.designMode) {
        return null;
      }

      /* Start interval */
      var intervalId = setInterval(function () {
        if (!tick()) clearInterval(intervalId);
      }, 1000);

      return intervalId;
    }

    function initAll() {
      /* Clean previous timers */
      timers.forEach(function (id) { clearInterval(id); });
      timers = [];

      document.querySelectorAll('[data-countdown]').forEach(function (el) {
        var id = initCountdown(el);
        if (id) timers.push(id);
      });
    }

    initAll();

    document.addEventListener('shopify:section:load', initAll);
    document.addEventListener('shopify:section:unload', function (event) {
      /* R103 — re-init from the surviving DOM instead of wiping ALL
         countdowns. The previous handler called clearInterval on every
         active timer regardless of which section unloaded, which froze
         every countdown elsewhere on the page when the merchant
         deleted/reordered ANY section in the theme editor. initAll()
         is idempotent — it clears all timers, then re-creates one per
         [data-countdown] element still present in the DOM. The
         unloaded section's elements are gone by the time this fires,
         so they naturally drop out; siblings get fresh intervals
         and keep ticking. */
      initAll();
    });
    /* External re-init trigger — dispatched by collection-filters.js
     * after AJAX-swapping the product grid. Newly rendered cards that
     * carry [data-countdown] need fresh intervals, but the filter JS
     * can't reach countdown's IIFE-scoped initAll directly. */
    document.addEventListener('kitchero:countdown:refresh', initAll);
  })();
}
