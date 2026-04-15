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
  }

  function closeDrawer(e) {
    var d = getDrawer();
    if (!d || !isOpen()) return;
    if (e) e.preventDefault();

    d.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

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
})();
