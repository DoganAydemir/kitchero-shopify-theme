(function () {
  'use strict';

  var fallbackFormatter = null;
  function formatCurrency(value) {
    if (window.Kitchero && typeof window.Kitchero.formatMoney === 'function') {
      return window.Kitchero.formatMoney(Math.round(value * 100));
    }
    if (!fallbackFormatter) {
      var currency = (window.Shopify && window.Shopify.currency && window.Shopify.currency.active) || 'USD';
      var locale = (document.documentElement.lang || 'en').replace('_', '-');
      try {
        fallbackFormatter = new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: currency,
        });
      } catch (err) {
        try {
          fallbackFormatter = new Intl.NumberFormat('en', {
            style: 'currency',
            currency: currency,
          });
        } catch (err2) {
          fallbackFormatter = { format: function (v) { return v.toFixed(2); } };
        }
      }
    }
    return fallbackFormatter.format(value);
  }

  function parseNumber(value) {
    if (typeof value !== 'string') value = String(value || '');
    value = value.replace(/\s/g, '').replace(',', '.');
    var n = parseFloat(value);
    return isFinite(n) ? n : 0;
  }

  function monthlyPayment(principal, apr, months) {
    if (!principal || principal <= 0 || !months || months <= 0) return 0;
    if (apr <= 0) return principal / months;
    var r = apr / 100 / 12;
    var pow = Math.pow(1 + r, months);
    return (principal * r * pow) / (pow - 1);
  }

  function initCalculator(root) {
    if (!root || root.dataset.calcBound === 'true') return;
    root.dataset.calcBound = 'true';

    var input = root.querySelector('[data-calc-amount]');
    var terms = Array.prototype.slice.call(root.querySelectorAll('[data-calc-term]'));
    if (!input || terms.length === 0) return;

    function recompute() {
      var raw = parseNumber(input.value);
      if (raw < 0) raw = 0;
      terms.forEach(function (btn) {
        var months = parseInt(btn.getAttribute('data-months'), 10) || 0;
        var apr = parseNumber(btn.getAttribute('data-apr'));
        var price = monthlyPayment(raw, apr, months);
        var target = btn.querySelector('[data-calc-price]');
        if (target) target.textContent = formatCurrency(price);
      });
    }

    function selectTerm(btn) {
      terms.forEach(function (other) {
        var active = other === btn;
        other.classList.toggle('kt-financing-calculator__term--active', active);
        other.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
    }

    var recomputeTimer = null;
    function debouncedRecompute() {
      if (recomputeTimer) clearTimeout(recomputeTimer);
      recomputeTimer = setTimeout(function () {
        recomputeTimer = null;
        recompute();
      }, 100);
    }
    input.addEventListener('input', debouncedRecompute);
    input.addEventListener('change', function () {
      if (recomputeTimer) { clearTimeout(recomputeTimer); recomputeTimer = null; }
      recompute();
    });

    terms.forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectTerm(btn);
      });
    });

    recompute();
  }

  function initAll(root) {
    var scope = root || document;
    var nodes = scope.querySelectorAll('[data-section-type="financing-calculator"]');
    Array.prototype.forEach.call(nodes, function (el) { initCalculator(el); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initAll(); });
  } else {
    initAll();
  }

  document.addEventListener('shopify:section:load', function (event) {
    initAll(event.target);
  });

  document.addEventListener('shopify:section:unload', function () {
  });
})();
