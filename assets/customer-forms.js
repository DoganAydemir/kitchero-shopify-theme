/**
 * Customer Forms — forgot password modal toggle.
 * Re-initialises on shopify:section:load so the editor can add/move
 * the login section without losing interactivity.
 */
(function () {
  'use strict';

  function bindModal(modal) {
    if (!modal || modal.dataset.kitcheroBound === 'true') return;
    modal.dataset.kitcheroBound = 'true';

    // Initial aria-hidden. The markup intentionally omits this
    // attribute so no-JS SR users CAN reach the form (rendered
    // inline via html:not(.js) CSS). JS users get it closed here.
    modal.setAttribute('aria-hidden', 'true');

    // Track the element that opened the modal so we can return focus
    // on close. WCAG 2.4.3 — focus must move back to the triggering
    // control so keyboard users don't lose their place in the tab
    // order (otherwise focus drops to <body>).
    var lastTrigger = null;

    function open(e) {
      lastTrigger = (e && e.currentTarget) || document.activeElement;
      modal.setAttribute('aria-hidden', 'false');
      if (window.Kitchero && Kitchero.scrollLock) {
        Kitchero.scrollLock.lock('customer-forms-modal');
      } else {
        document.body.style.overflow = 'hidden';
      }
      // Focus trap keeps Tab/Shift+Tab within the role="dialog"
      // element — without this the user can tab into the (visually
      // covered) underlying login form, a WCAG fail for modal dialogs.
      if (window.Kitchero && Kitchero.focusTrap) {
        Kitchero.focusTrap.enable(modal);
      }
      var first = modal.querySelector('input, select, textarea, button');
      if (first) first.focus();
    }

    function close() {
      modal.setAttribute('aria-hidden', 'true');
      if (window.Kitchero && Kitchero.scrollLock) {
        Kitchero.scrollLock.unlock('customer-forms-modal');
      } else {
        document.body.style.overflow = '';
      }
      if (window.Kitchero && Kitchero.focusTrap) {
        Kitchero.focusTrap.disable(modal);
      }
      // Return focus to the element that opened the modal. Guard
      // against the trigger having been removed from the DOM (e.g.
      // theme editor replaced the section while the modal was open).
      if (lastTrigger && typeof lastTrigger.focus === 'function' && document.body.contains(lastTrigger)) {
        lastTrigger.focus();
      }
      lastTrigger = null;
    }

    var scope = modal.closest('[data-section-id]') || document;

    scope.querySelectorAll('[data-toggle-forgot]').forEach(function (btn) {
      btn.addEventListener('click', open);
    });

    modal.querySelectorAll('[data-close-forgot]').forEach(function (btn) {
      btn.addEventListener('click', close);
    });

    function onKeyDown(e) {
      if (e.code === 'Escape' && modal.getAttribute('aria-hidden') === 'false') close();
    }
    document.addEventListener('keydown', onKeyDown);

    modal._kitcheroCleanup = function () {
      document.removeEventListener('keydown', onKeyDown);
      modal.dataset.kitcheroBound = '';
    };

    /* Auto-open after a successful recover-password submit.
       Shopify reloads the login page with `form.posted_successfully?`
       rendered INSIDE this modal — but the modal's default state is
       `aria-hidden="true"`, so the success message is invisible to
       sighted users (and reachable to SR users via the trapped focus
       only after they manually open the modal again). The customer
       sees nothing happen and may resubmit, triggering Shopify's
       rate limiter. Detect the success node and open the modal
       immediately. The success message itself contains the SR
       announcement (role="status"); we just need to make it visible.
       Skipped when no success node — covers the common case where
       the page was loaded for any reason other than a recover POST. */
    if (modal.querySelector('.kt-customer__form-success')) {
      open();
    }
  }

  function initAll(root) {
    (root || document).querySelectorAll('#forgot-modal, [data-forgot-modal]').forEach(bindModal);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initAll(); });
  } else {
    initAll();
  }

  document.addEventListener('shopify:section:load', function (event) {
    initAll(event.target);
  });

  document.addEventListener('shopify:section:unload', function (event) {
    var modal = event.target.querySelector('#forgot-modal, [data-forgot-modal]');
    if (modal && typeof modal._kitcheroCleanup === 'function') modal._kitcheroCleanup();
  });
})();
