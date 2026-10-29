(function () {
  'use strict';

  function monthlyPayment(principal, apr, months) {
    if (!principal || principal <= 0 || !months || months <= 0) return 0;
    if (!apr || apr <= 0) return Math.round(principal / months);
    var r = apr / 100 / 12;
    var growth = Math.pow(1 + r, months);
    return Math.round((principal * r * growth) / (growth - 1));
  }

  function formatMoney(cents) {
    if (window.Kitchero && typeof window.Kitchero.formatMoney === 'function') {
      return window.Kitchero.formatMoney(cents);
    }
    return (cents / 100).toFixed(2);
  }

  // "Save [amount]" / "Was [amount]" come from the locale via data-template.
  function setAmount(el, show, cents) {
    if (!el) return;
    el.hidden = !show;
    if (!show) return;
    var tpl = el.getAttribute('data-template') || '[amount]';
    var holder = document.createElement('span');
    holder.innerHTML = tpl;
    el.textContent = (holder.textContent || '').replace('[amount]', formatMoney(cents));
  }

  function update(root, variant) {
    if (!root || !variant) return;
    var price = Number(variant.price) || 0;
    var compare = Number(variant.compare_at_price) || 0;
    var onSale = compare > price && price > 0;

    root.classList.toggle('kt-showroom-price--sale', onSale);
    var label = root.querySelector('[data-showroom-sale-label]');
    if (label) label.hidden = !onSale;

    var current = root.querySelector('.kt-showroom-price__current');
    if (current) current.textContent = price > 0 ? formatMoney(price) : current.getAttribute('data-free-text') || formatMoney(0);

    setAmount(root.querySelector('[data-showroom-save]'), onSale, compare - price);
    setAmount(root.querySelector('[data-showroom-was]'), onSale, compare);

    var pill = root.querySelector('[data-showroom-financing]');
    var monthlyEl = root.querySelector('[data-showroom-monthly]');
    var financing = pill ? pill.closest('.kt-showroom-price__financing') : null;
    var financingNote = root.querySelector('.kt-showroom-price__financing-note');
    if (financing) financing.hidden = price <= 0;
    if (financingNote) financingNote.hidden = price <= 0;
    if (pill && monthlyEl) {
      var months = parseInt(pill.getAttribute('data-months'), 10) || 0;
      var apr = parseFloat(pill.getAttribute('data-apr')) || 0;
      monthlyEl.textContent = formatMoney(monthlyPayment(price, apr, months));
    }
  }

  document.addEventListener('variant:change', function (event) {
    var detail = event.detail || {};
    var source = event.target && event.target.closest ? event.target : null;
    var scope = source && source !== document ? source.closest('[data-section-id], section, .shopify-section') : null;
    var roots = (scope || document).querySelectorAll('[data-showroom-price]');
    for (var i = 0; i < roots.length; i++) update(roots[i], detail.variant);
  });
})();
