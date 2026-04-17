/* ============================================================
   Financing Calculator behaviour.
   Monthly-payment math (standard amortisation):
     M = P * r * (1 + r)^n / ((1 + r)^n − 1)
   where r = apr / 100 / 12 and n = term in months.
   When apr === 0, we fall back to P / n to avoid division-by-zero.

   Works with `shopify:section:load` so it re-binds in the theme
   editor when a merchant re-renders the section.
   ============================================================ */
(function () {
  'use strict';

  var formatter = null;
  function formatCurrency(value) {
    if (!formatter) {
      try {
        formatter = new Intl.NumberFormat(document.documentElement.lang || 'en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      } catch (err) {
        formatter = { format: function (v) { return v.toFixed(2); } };
      }
    }
    return formatter.format(value);
  }

  /* parseFloat that tolerates comma decimals — Shopify number inputs
     in a localized (e.g. Turkish) admin sometimes persist as "14,99"
     which parseFloat() truncates to 14, badly breaking the APR math. */
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

    input.addEventListener('input', recompute);
    input.addEventListener('change', recompute);

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
})();
