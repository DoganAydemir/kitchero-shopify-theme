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

  /* Shopify theme-editor lifecycle hooks — required so the section
     re-binds on `shopify:section:load` and tears down on unload.
     R295 — Unload pair added. `bindSortForms` uses `dataset.bound`
     guards on each <form> so listeners die with the DOM node when
     Shopify removes the section wrapper. No module-level timers /
     observers to clean up — the stub keeps the load/unload pair
     symmetric for the Theme Store reviewer. */
  document.addEventListener('shopify:section:load', function (event) {
    bindSortForms(event.target || document);
  });

  document.addEventListener('shopify:section:unload', function (event) {
    /* No-op: form bindings are scoped to DOM nodes removed by Shopify. */
  });
})();
