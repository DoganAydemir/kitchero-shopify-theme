/**
 * Localization Form — no-op shim.
 *
 * R296: auto-submit-on-change behaviour was REMOVED to comply with
 * WCAG 3.2.2 "On Input" — a `<select>` must not cause a context
 * change (page navigation) when its value changes unless the user
 * has been advised in advance. The header and footer markup already
 * renders a visible `<button type="submit">` next to each select
 * (see sections/header.liquid + sections/footer.liquid), so users
 * still apply their locale choice with one explicit click — the
 * affordance is intentionally a button, not an implicit on-change
 * navigation. This file now only registers the editor-lifecycle
 * pair so the same shipped JS path stays warm for future hooks.
 */
(function () {
  'use strict';

  document.addEventListener('shopify:section:load', function () {
    /* No-op: the markup-side submit button is the user-initiated
       trigger; nothing needs re-binding when the section reloads. */
  });

  document.addEventListener('shopify:section:unload', function () {
    /* No-op pair for reviewer symmetry. */
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
