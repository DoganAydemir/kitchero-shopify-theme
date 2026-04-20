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
    document.body.style.overflow = 'hidden';

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
    document.body.style.overflow = '';

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
  document.addEventListener('click', function (e) {
    var openTrigger = e.target.closest('[data-appointment-open]');
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
    if (e.key === 'Escape' && isOpen()) {
      closeDrawer();
    }
  });

  /* Safety net: if the drawer (or a containing section) is removed
     from the page while the drawer is open (theme editor section
     unload), the body-overflow lock stays engaged and the customer
     can't scroll. Restore overflow on any section:unload event —
     harmless no-op when the drawer wasn't open. */
  document.addEventListener('shopify:section:unload', function () {
    if (document.body.style.overflow === 'hidden' && !isOpen()) {
      document.body.style.overflow = '';
    }
  });
})();
