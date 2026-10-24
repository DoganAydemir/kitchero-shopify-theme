(function () {
  'use strict';

  function bindRoot(root) {
    if (!root || root.__ktGiftRecipientBound) return;
    root.__ktGiftRecipientBound = true;

    var toggle = root.querySelector('[data-gift-recipient-toggle]');
    var fields = root.querySelector('[data-gift-recipient-fields]');
    if (!toggle || !fields) return;

    var inputs = fields.querySelectorAll('input, textarea');
    var offsetInput = root.querySelector('[data-gift-recipient-offset]');
    var form = root.closest('form');

    function sync() {
      var on = toggle.checked;
      fields.hidden = !on;
      for (var i = 0; i < inputs.length; i++) {
        inputs[i].disabled = !on;
      }
    }

    toggle.addEventListener('change', sync);
    sync();

    if (form) {
      form.addEventListener('submit', function () {
        if (toggle.checked && offsetInput) {
          offsetInput.value = String(new Date().getTimezoneOffset());
        }
      });
    }
  }

  function init(scope) {
    var roots = (scope || document).querySelectorAll('[data-gift-recipient]');
    for (var i = 0; i < roots.length; i++) bindRoot(roots[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(document); });
  } else {
    init(document);
  }

  document.addEventListener('shopify:section:load', function (event) {
    init(event.target || document);
  });
})();
