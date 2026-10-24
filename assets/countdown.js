if (!window.__kitcheroCountdownLoaded) {
  window.__kitcheroCountdownLoaded = true;

  (function () {
    'use strict';

    var timers = [];

    function pad(n) {
      return String(n).padStart(2, '0');
    }

    function normaliseIsoOffset(str) {
      if (typeof str !== 'string') return str;
      return str.replace(/([+-])(\d{2})(\d{2})$/, '$1$2:$3');
    }

    function initCountdown(el) {
      var endsAt = new Date(normaliseIsoOffset(el.dataset.endsAt));
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

      if (!tick()) return null;

      if (window.Shopify && window.Shopify.designMode) {
        return null;
      }

      var intervalId = setInterval(function () {
        if (!tick()) clearInterval(intervalId);
      }, 1000);

      return intervalId;
    }

    function initAll() {
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
      initAll();
    });

    document.addEventListener('kitchero:countdown:refresh', initAll);
  })();
}
