(function () {
  'use strict';

  var drawer = null;
  var lastActiveElement = null;
  var prevBodyOverflow = '';

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

    prevBodyOverflow = document.body.style.overflow || '';
    document.body.style.overflow = 'hidden';

    var firstInput = d.querySelector('input, select, textarea, button:not([data-appointment-close])');
    if (firstInput) {
      setTimeout(function () { firstInput.focus(); }, 400);
    }

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
    document.body.style.overflow = prevBodyOverflow || '';

    if (window.Kitchero && window.Kitchero.focusTrap && typeof window.Kitchero.focusTrap.disable === 'function') {
      window.Kitchero.focusTrap.disable(d);
    }

    if (lastActiveElement && typeof lastActiveElement.focus === 'function') {
      lastActiveElement.focus();
    }
  }

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

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !isOpen()) return;

    if (window.Kitchero && Kitchero.focusTrap && Kitchero.focusTrap.shouldSuppressEscape && Kitchero.focusTrap.shouldSuppressEscape(drawer)) return;
    closeDrawer();
  });

  document.addEventListener('shopify:section:unload', function () {
    if (isOpen()) {
      document.body.style.overflow = prevBodyOverflow || '';
    }
  });

  function autoOpenIfPosted() {
    var d = getDrawer();
    if (!d) return;
    if (!d.querySelector('[data-appointment-posted-successfully]')) return;

    if (window.location.hash !== '#appointment-form') return;

    openDrawer();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoOpenIfPosted);
  } else {
    autoOpenIfPosted();
  }
})();
