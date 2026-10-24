(function () {
  'use strict';

  function bindModal(modal) {
    if (!modal || modal.dataset.kitcheroBound === 'true') return;
    modal.dataset.kitcheroBound = 'true';

    modal.setAttribute('aria-hidden', 'true');

    var lastTrigger = null;

    function open(e) {
      lastTrigger = (e && e.currentTarget) || document.activeElement;
      modal.setAttribute('aria-hidden', 'false');
      if (window.Kitchero && Kitchero.scrollLock) {
        Kitchero.scrollLock.lock('customer-forms-modal');
      } else {
        document.body.style.overflow = 'hidden';
      }

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
      if (e.code !== 'Escape' || modal.getAttribute('aria-hidden') !== 'false') return;
      if (window.Kitchero && Kitchero.focusTrap && Kitchero.focusTrap.shouldSuppressEscape && Kitchero.focusTrap.shouldSuppressEscape(modal)) return;
      close();
    }
    document.addEventListener('keydown', onKeyDown);

    modal._kitcheroCleanup = function () {
      document.removeEventListener('keydown', onKeyDown);
      modal.dataset.kitcheroBound = '';
    };

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
