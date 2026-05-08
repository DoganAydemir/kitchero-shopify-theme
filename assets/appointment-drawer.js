/**
 * Appointment Drawer — open/close controller.
 *
 * Any element with [data-appointment-open] opens the drawer.
 * Any element with [data-appointment-close] (or the overlay) closes it.
 * Escape key closes it. Body scroll is locked while open.
 *
 * The drawer lives in layout/theme.liquid so it's always present — we only
 * toggle aria-hidden, and CSS handles the slide-in animation.
 */
(function () {
  'use strict';

  var drawer = null;
  var lastActiveElement = null;

  function getDrawer() {
    if (!drawer) drawer = document.querySelector('.kt-appointment-drawer');
    return drawer;
  }

  function isOpen() {
    var d = getDrawer();
    return d && d.getAttribute('aria-hidden') === 'false';
  }

  function openDrawer(e) {
    var d = getDrawer();
    if (!d || isOpen()) return;
    if (e) e.preventDefault();

    lastActiveElement = document.activeElement;
    d.setAttribute('aria-hidden', 'false');
    d.removeAttribute('inert');
    if (window.Kitchero && Kitchero.scrollLock) {
      Kitchero.scrollLock.lock('appointment-drawer');
    } else {
      document.body.style.overflow = 'hidden';
    }

    // Focus first input for keyboard users
    var firstInput = d.querySelector('input, select, textarea, button:not([data-appointment-close])');
    if (firstInput) {
      setTimeout(function () { firstInput.focus(); }, 400);
    }

    /* Focus trap — shared utility on window.Kitchero from global.js.
       Keeps Tab/Shift+Tab cycling inside the drawer panel so keyboard
       users can't accidentally reach page content hidden behind the
       overlay. Previously absent: Tab would walk off the last field
       into the masked page below. */
    if (window.Kitchero && window.Kitchero.focusTrap && typeof window.Kitchero.focusTrap.enable === 'function') {
      window.Kitchero.focusTrap.enable(d);
    }
  }

  function closeDrawer(e) {
    var d = getDrawer();
    if (!d || !isOpen()) return;
    if (e) e.preventDefault();

    d.setAttribute('aria-hidden', 'true');
    d.setAttribute('inert', '');
    if (window.Kitchero && Kitchero.scrollLock) {
      Kitchero.scrollLock.unlock('appointment-drawer');
    } else {
      document.body.style.overflow = '';
    }

    // Release the focus trap BEFORE restoring focus — otherwise the
    // trap's last active element may block the restoration.
    if (window.Kitchero && window.Kitchero.focusTrap && typeof window.Kitchero.focusTrap.disable === 'function') {
      window.Kitchero.focusTrap.disable(d);
    }

    // Restore focus to whatever opened the drawer
    if (lastActiveElement && typeof lastActiveElement.focus === 'function') {
      lastActiveElement.focus();
    }
  }

  // Delegated click handlers so dynamically added sections (theme editor
  // load/unload) still work without rebinding.
  // R162: accept both `data-consultation-open` (preferred — neutral
  // wording per Theme Store reviewer rubric on app-like functionality
  // wording) and the legacy `data-appointment-open` selector for
  // back-compat with any custom merchant markup that already uses it.
  document.addEventListener('click', function (e) {
    var openTrigger = e.target.closest('[data-consultation-open], [data-appointment-open]');
    if (openTrigger) {
      openDrawer(e);
      return;
    }

    var closeTrigger = e.target.closest('[data-appointment-close]');
    if (closeTrigger) {
      closeDrawer(e);
      return;
    }
  });

  // Escape key closes the drawer
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !isOpen()) return;
    // Only close if this drawer is the top-most stacked modal.
    if (window.Kitchero && Kitchero.focusTrap && Kitchero.focusTrap.shouldSuppressEscape && Kitchero.focusTrap.shouldSuppressEscape(drawer)) return;
    closeDrawer();
  });

  /* Safety net: if the drawer (or a containing section) is removed
     from the page while the drawer is open (theme editor section
     unload), release our scrollLock owner so the body overflow is
     not held hostage by a drawer that no longer exists. Using
     scrollLock.unlock means another drawer still open (cart, mobile
     nav, etc.) keeps its lock — no stomping. */
  document.addEventListener('shopify:section:unload', function () {
    if (window.Kitchero && Kitchero.scrollLock) {
      Kitchero.scrollLock.unlock('appointment-drawer');
    } else if (document.body.style.overflow === 'hidden' && !isOpen()) {
      document.body.style.overflow = '';
    }
  });

  /* Auto-open on post-submit redirect. When the {% form 'contact' %}
     inside the drawer submits, Shopify redirects back to the
     originating page with `form.posted_successfully?` true. The
     drawer's Liquid renders the success <p> AND a hidden sentinel
     span `<span data-appointment-posted-successfully>`. If we don't
     auto-open, the user arrives on the same page, sees the drawer
     closed, and re-submits thinking the form failed. Check on load. */
  function autoOpenIfPosted() {
    var d = getDrawer();
    if (!d) return;
    if (d.querySelector('[data-appointment-posted-successfully]')) {
      openDrawer();
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoOpenIfPosted);
  } else {
    autoOpenIfPosted();
  }
})();
