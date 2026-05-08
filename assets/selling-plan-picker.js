/**
 * Selling Plan Picker — broadcasts the selected plan for live price
 * refresh.
 *
 * The radio group rendered by snippets/product-selling-plans.liquid
 * now uses `name="selling_plan"` directly — the same field name
 * Shopify's `/cart/add` endpoint reads — so the checked radio ships
 * with the form submit natively, including in the JS-off path. This
 * script's ONLY job is to dispatch a `selling-plan:change` CustomEvent
 * on the product container when the selection changes, so
 * product-form.js can re-render the PDP price for the active plan's
 * allocation without touching the picker internals.
 *
 * Works without JS: the native radio submit carries `selling_plan` in
 * the form POST, so add-to-cart for both optional and
 * `requires_selling_plan: true` products succeeds. Price display on
 * PDP stays at variant.price until JS runs, then refreshes to the
 * plan's allocation price — acceptable progressive enhancement.
 *
 * Previously this script hand-rolled a hidden `input name="selling_plan"`
 * at runtime because the radios used a non-standard name. That pattern
 * broke ATC for JS-off visitors on subscription-only products; now
 * obviated by emitting the radios with the correct name from Liquid.
 */
(function () {
  'use strict';

  function init(picker) {
    if (!picker || picker.dataset.sellingPlanBound === '1') return;
    picker.dataset.sellingPlanBound = '1';

    /* Walk up to the nearest product form wrapper so we can locate the
       container for the dispatched event. `[data-product-form]` is set
       by snippets/product-form.liquid on its wrapping <div>. */
    var wrapper = picker.closest('[data-product-form]') || picker.closest('form');
    if (!wrapper) return;

    picker.addEventListener('change', function (event) {
      var target = event.target;
      if (!target || target.name !== 'selling_plan') return;

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
