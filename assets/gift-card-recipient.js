/**
 * Gift-card recipient form toggle.
 *
 * Only rendered on gift-card products (product.gift_card? == true).
 * Watches the "Send as a gift" checkbox and syncs the enable/disable
 * state of the four recipient fields (email, name, send_on, message)
 * plus the __shopify_offset hidden input.
 *
 * Why disabled-by-default: disabled form fields are NOT submitted in
 * GET/POST payloads, so when the customer doesn't opt in, no
 * Recipient * properties travel to /cart/add — Shopify won't schedule
 * an email. The toggle re-enables them in lock-step.
 *
 * Also populates the hidden __shopify_offset with the browser's
 * timezone offset in minutes at form-submit time. Shopify reads that
 * so "Send on" dates stored in the order are interpreted in the
 * customer's local timezone rather than UTC.
 *
 * Works with JS off in a degraded form: the checkbox still posts,
 * but the per-field `disabled` attributes stay on, so no recipient
 * data is sent. Customers on JS-off browsers see the full form but
 * their submission is equivalent to not opting in. Acceptable
 * degraded path — they can still buy the gift card, just not
 * schedule email delivery.
 */
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

    /* Populate the timezone offset only on the specific submit that
       includes the gift-recipient payload. The enclosing form is the
       product form, which also handles non-gift-card variants on
       mixed-product pages (unlikely, but defensive). */
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

  /* Theme editor — re-bind on section:load because the product form
     may have been re-rendered (e.g. variant metafield change). */
  document.addEventListener('shopify:section:load', function (event) {
    init(event.target || document);
  });
})();
