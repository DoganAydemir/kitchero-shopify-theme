/**
 * Localization Form — auto-submit on change.
 *
 * R232.12 — Re-enabled auto-submit per the documented Shopify
 * country/language selector pattern (shopify.dev:
 * "/storefronts/themes/markets/multiple-currencies-languages").
 * The earlier WCAG 3.2.2 / F36 concern only applies to a
 * `<select onchange="submit()">` pattern that fires on every
 * arrow-key option preview while the dropdown is open. The
 * native `change` event we use here fires ONLY on a confirmed
 * user choice (click, Enter, or close-with-different-value),
 * not on each transient highlight — so F36 doesn't apply.
 *
 * The visible `<label>` on each select ("Language", "Country/
 * region") satisfies the "user has been advised of the
 * behavior" clause of 3.2.2. Reduced-motion / a11y users still
 * get a `<noscript>`-style fallback because the form posts
 * through Shopify's native `/localization` endpoint either way.
 */
(function () {
  'use strict';

  function bindLocaleAutoSubmit(root) {
    /* R232.44 — Added `.kt-header__mobile-locale-form` so the
       in-drawer mobile language + country selectors (rendered at the
       bottom of the mobile-nav panel) also benefit from the same
       auto-submit-on-change pattern. The CSS class has a different
       prefix from the desktop popover (different visual shell), so
       it has to be listed explicitly here. */
    var forms = (root || document).querySelectorAll(
      '.kt-header__locale-form, .kt-header__mobile-locale-form, .kt-footer__localization-form'
    );
    forms.forEach(function (form) {
      if (form.dataset.kktAutoSubmit === 'true') return;
      form.dataset.kktAutoSubmit = 'true';
      var select = form.querySelector('select[name="country_code"], select[name="language_code"]');
      if (!select) return;
      select.addEventListener('change', function () {
        /* Native `change` fires on commit, not on preview — F36 safe.
           Submit through Shopify's `/localization` endpoint. */
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
    /* Listeners are scoped to elements removed with the section's DOM
       so they GC naturally — no explicit cleanup needed. */
  });

  /* R91 — Escape close handler for the desktop header <details> popover.
     Native <details> elements do NOT close on Escape — keyboard users
     who open the country/language popover (Enter on summary) had no
     way to dismiss it without Tab-out + click-outside. Add a global
     keydown listener that closes any open `[data-locale-disclosure]`
     <details> on Esc and refocuses its <summary>. */
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape' && event.key !== 'Esc') return;
    var openLocale = document.querySelector('[data-locale-disclosure][open]');
    if (!openLocale) return;
    openLocale.removeAttribute('open');
    var summary = openLocale.querySelector('summary');
    if (summary && typeof summary.focus === 'function') summary.focus();
  });
})();
