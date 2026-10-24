(function () {
  'use strict';

  function init(picker) {
    if (!picker || picker.dataset.sellingPlanBound === '1') return;
    picker.dataset.sellingPlanBound = '1';

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

  document.addEventListener('shopify:section:load', function (e) {
    if (!e.target || !e.target.querySelectorAll) return;
    e.target.querySelectorAll('[data-selling-plan-picker]').forEach(init);
  });
})();
