/**
 * Search page sort dropdown handler.
 *
 * The search page's sort control is a <select> inside a GET form that
 * already carries the current `q` + `type` as hidden inputs. Submitting
 * that form on native `change` keeps the UX snappy for keyboard + mouse
 * users and falls back cleanly to the <noscript> submit button when JS
 * is off.
 *
 * Also handles the Shopify theme-editor lifecycle so sort continues to
 * work after a section reload (`shopify:section:load`) without stacking
 * duplicate submit listeners.
 */
(function () {
  'use strict';

  function bindSortForms(root) {
    var scope = root || document;
    var forms = scope.querySelectorAll('[data-search-sort-form]');
    for (var i = 0; i < forms.length; i++) {
      (function (form) {
        if (form.__ktSortBound) return;
        form.__ktSortBound = true;
        var select = form.querySelector('[data-search-sort-select]');
        if (!select) return;
        select.addEventListener('change', function () {
          form.submit();
        });
      })(forms[i]);
    }
  }

  function init() {
    bindSortForms(document);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* Shopify theme-editor lifecycle hooks — required by CLAUDE.md. */
  document.addEventListener('shopify:section:load', function (event) {
    bindSortForms(event.target || document);
  });
})();
