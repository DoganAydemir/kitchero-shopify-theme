(function () {
  'use strict';

  var STORAGE_KEY = 'kt-age-verified';

  function getFocusable(root) {
    if (!root) return [];
    var selectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled]):not([type="hidden"])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');
    return Array.prototype.slice.call(root.querySelectorAll(selectors)).filter(function (el) {
      return el.offsetParent !== null || el === document.activeElement;
    });
  }

  function isVerified() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.expires !== 'number') return false;
      if (Date.now() > parsed.expires) {
        localStorage.removeItem(STORAGE_KEY);
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  function setVerified(sessionDays) {
    try {
      var days = parseInt(sessionDays, 10) || 30;
      var record = { expires: Date.now() + days * 24 * 60 * 60 * 1000 };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    } catch (e) {  }
  }

  function inDesignMode() {
    return !!(window.Shopify && window.Shopify.designMode);
  }

  function initModal(modal) {
    if (!modal || modal._kitcheroAgeInited) return;
    modal._kitcheroAgeInited = true;

    var panel = modal.querySelector('.kt-age-verifier__panel');
    var acceptBtn = modal.querySelector('[data-age-verifier-accept]');
    var declineBtn = modal.querySelector('[data-age-verifier-decline]');
    var sessionDays = modal.getAttribute('data-session-days') || '30';

    var shouldOpen = inDesignMode() || !isVerified();
    if (!shouldOpen) return;

    function open() {
      document.documentElement.classList.add('kt-age-verifier-open');
      modal.removeAttribute('inert');
      modal.setAttribute('aria-hidden', 'false');
      requestAnimationFrame(function () {
        if (acceptBtn && typeof acceptBtn.focus === 'function') {
          acceptBtn.focus();
        }
      });
    }

    function close() {
      modal.setAttribute('aria-hidden', 'true');
      modal.setAttribute('inert', '');
      document.documentElement.classList.remove('kt-age-verifier-open');
    }

    function onKeydown(e) {
      if (modal.getAttribute('aria-hidden') !== 'false') return;

      if (e.key !== 'Tab' && e.keyCode !== 9) return;
      var focusables = getFocusable(panel);
      if (focusables.length === 0) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    function onAcceptClick() {
      if (!inDesignMode()) {
        setVerified(sessionDays);
      }
      close();
    }

    function onDeclineClick(e) {
      if (inDesignMode()) {
        e.preventDefault();
        close();
        return;
      }
      // No decline URL (button): stay on the gate and show the message.
      if (!declineBtn.hasAttribute('href')) {
        e.preventDefault();
        var denied = modal.querySelector('[data-age-verifier-denied]');
        if (denied) denied.hidden = false;
      }
    }

    if (acceptBtn) acceptBtn.addEventListener('click', onAcceptClick);
    if (declineBtn) declineBtn.addEventListener('click', onDeclineClick);
    document.addEventListener('keydown', onKeydown);

    modal._kitcheroAgeDestroy = function () {
      if (acceptBtn) acceptBtn.removeEventListener('click', onAcceptClick);
      if (declineBtn) declineBtn.removeEventListener('click', onDeclineClick);
      document.removeEventListener('keydown', onKeydown);
      if (modal.getAttribute('aria-hidden') === 'false') {
        document.documentElement.classList.remove('kt-age-verifier-open');
      }
      modal._kitcheroAgeInited = false;
      modal._kitcheroAgeDestroy = null;
    };

    open();
  }

  function init(root) {
    var scope = root || document;
    var modals = scope.querySelectorAll('[data-age-verifier]');
    Array.prototype.forEach.call(modals, initModal);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(); });
  } else {
    init();
  }

  document.addEventListener('shopify:section:load', function (e) {
    init(e.target);
  });

  document.addEventListener('shopify:section:unload', function (e) {
    if (!e || !e.target) return;
    var modals = e.target.querySelectorAll('[data-age-verifier]');
    Array.prototype.forEach.call(modals, function (modal) {
      if (modal._kitcheroAgeDestroy) modal._kitcheroAgeDestroy();
    });
  });
})();
