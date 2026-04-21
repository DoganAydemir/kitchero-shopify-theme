/**
 * Selling Plan Picker — wires the radio group rendered by
 * snippets/product-selling-plans.liquid to the product form's hidden
 * `selling_plan` input.
 *
 * On radio change:
 *   1. Write the selected plan ID (or '') into a hidden input named
 *      `selling_plan` inside the same product form. Creates the input
 *      on first change if it doesn't exist.
 *   2. Dispatch a `selling-plan:change` CustomEvent on the product
 *      container so other modules (price, product-form.js, future
 *      subscription price display) can react without reaching into
 *      this picker.
 *
 * Why a CustomEvent instead of directly poking the price: the product
 * form's Ajax ATC path already picks up any input named `selling_plan`
 * in the form, so no further JS is required for the submit side. Any
 * future "show subscribe-and-save price" feature hooks via the event.
 *
 * Works without JS: the form POSTs whatever radio is `checked` via the
 * regular Shopify form path (the `name="kt-selling-plan-choice"` on
 * our radios is symbolic; the real submit field is the hidden input
 * created here). If JS is off, no `selling_plan` field is submitted
 * and Shopify treats the ATC as one-time — the right default for a
 * product with optional subscription. Subscription-only products
 * already have requires_selling_plan which gates the ATC entirely.
 */
(function () {
  'use strict';

  function init(picker) {
    if (!picker || picker.dataset.sellingPlanBound === '1') return;
    picker.dataset.sellingPlanBound = '1';

    /* Walk up to the nearest product form wrapper so we know which
       form to write into. `[data-product-form]` is set by snippets/
       product-form.liquid on its wrapping <div>. */
    var wrapper = picker.closest('[data-product-form]') || picker.closest('form');
    if (!wrapper) return;
    var form = wrapper.matches('form') ? wrapper : wrapper.querySelector('form');
    if (!form) return;

    function syncHidden(planId) {
      var input = form.querySelector('input[name="selling_plan"]');
      if (!input) {
        input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'selling_plan';
        form.appendChild(input);
      }
      input.value = planId || '';
    }

    /* Initialize hidden input to match the currently-checked radio.
       This handles both the server-rendered default (first plan when
       requires_selling_plan is true, one-time otherwise) and the case
       where the customer arrived via a ?selling_plan=… link. */
    var initiallyChecked = picker.querySelector('input[type="radio"]:checked');
    if (initiallyChecked) {
      syncHidden(initiallyChecked.value);
    }

    picker.addEventListener('change', function (event) {
      var target = event.target;
      if (!target || target.name !== 'kt-selling-plan-choice') return;
      syncHidden(target.value);

      var detail = { planId: target.value || null };
      var container = wrapper.closest('[data-section-type]') || wrapper;
      container.dispatchEvent(new CustomEvent('selling-plan:change', {
        detail: detail,
        bubbles: true
      }));
    });
  }

  document.querySelectorAll('[data-selling-plan-picker]').forEach(init);

  /* Re-init on theme editor section reloads so merchants editing a
     subscription product section get live binding. */
  document.addEventListener('shopify:section:load', function (e) {
    if (!e.target || !e.target.querySelectorAll) return;
    e.target.querySelectorAll('[data-selling-plan-picker]').forEach(init);
  });
})();
