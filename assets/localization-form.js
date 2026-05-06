/**
 * Localization Form — auto-submit on select change.
 * Handles language and country selector dropdowns in footer.
 * Re-binds on shopify:section:load so editor edits to the footer group
 * keep the selects interactive.
 */
(function () {
  'use strict';

  function bindSelect(select) {
    if (!select || select.dataset.kitcheroLocalizationBound === 'true') return;
    select.dataset.kitcheroLocalizationBound = 'true';
    select.addEventListener('change', function () {
      var form = this.closest('form');
      if (form) form.submit();
    });
  }

  function initAll(root) {
    var scope = root || document;
    /* Bind every locale-form select across the theme: footer (always
       present), mobile drawer (header bottom), and desktop header
       popover (CLU-03). Each surface uses its own BEM classname; the
       JS binding logic is identical so we union the three selectors.
       Idempotent via dataset flag — re-runs are safe. */
    scope.querySelectorAll(
      '.kt-footer__localization-form select, ' +
      '.kt-header__mobile-locale-select, ' +
      '.kt-header__locale-form-select'
    ).forEach(bindSelect);
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
