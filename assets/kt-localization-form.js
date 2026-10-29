(function () {
  'use strict';

  // Shopify's localization form returns to the current path; add the current
  // query string (filters, sort, search terms) so the shopper keeps their view.
  function keepQuery(form) {
    var field = form.querySelector('input[name="return_to"]');
    if (!field || !window.location.search) return;
    var path = (field.value || window.location.pathname).split('?')[0];
    field.value = path + window.location.search;
  }

  function bindLocaleAutoSubmit(root) {
    var forms = (root || document).querySelectorAll(
      '.kt-header__locale-form, .kt-header__mobile-locale-form, .kt-footer__localization-form'
    );
    forms.forEach(function (form) {
      if (form.dataset.kktAutoSubmit === 'true') return;
      form.dataset.kktAutoSubmit = 'true';
      var select = form.querySelector('select[name="country_code"], select[name="language_code"]');
      if (!select) return;
      form.addEventListener('submit', function () { keepQuery(form); });
      select.addEventListener('change', function () {
        keepQuery(form);
        if (typeof form.requestSubmit === 'function') {
          form.requestSubmit();
        } else {
          form.submit();
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      bindLocaleAutoSubmit(document);
    });
  } else {
    bindLocaleAutoSubmit(document);
  }

  document.addEventListener('shopify:section:load', function (event) {
    bindLocaleAutoSubmit(event.target);
  });

  document.addEventListener('shopify:section:unload', function () {
  });

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape' && event.key !== 'Esc') return;
    var openLocale = document.querySelector('[data-locale-disclosure][open]');
    if (!openLocale) return;
    openLocale.removeAttribute('open');
    var summary = openLocale.querySelector('summary');
    if (summary && typeof summary.focus === 'function') summary.focus();
  });
})();
