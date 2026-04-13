/**
 * Localization Form — auto-submit on select change
 * Handles language and country selector dropdowns in footer.
 */
(function () {
  'use strict';

  document.querySelectorAll('.kt-footer__localization-form select').forEach(function (select) {
    select.addEventListener('change', function () {
      this.closest('form').submit();
    });
  });
})();
