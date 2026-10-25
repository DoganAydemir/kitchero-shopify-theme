(function () {
  'use strict';

  function bindLocaleAutoSubmit(root) {
    var forms = (root || document).querySelectorAll(
      '.kt-header__locale-form, .kt-header__mobile-locale-form, .kt-footer__localization-form'
    );
    forms.forEach(function (form) {
      if (form.dataset.kktAutoSubmit === 'true') return;
      form.dataset.kktAutoSubmit = 'true';
      var select = form.querySelector('select[name="country_code"], select[name="language_code"]');
      if (!select) return;
      select.addEventListener('change', function () {
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
