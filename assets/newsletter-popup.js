if (!window.__kitcheroNewsletterPopupLoaded) {
  window.__kitcheroNewsletterPopupLoaded = true;

  (function () {
    'use strict';

    var STORAGE_KEY = 'kitchero-newsletter-popup-dismissed';
    var AUTO_CLOSE_AFTER_SUCCESS_MS = 5000;

    var popup = null;
    var dialog = null;
    var lastTrigger = null;
    var autoCloseTimer = null;
    var openTimer = null;

    function promoteSuccessSentinel(p) {
      if (!p) return;
      if (p.getAttribute('data-posted-successfully') === 'true') return;
      var sid = p.getAttribute('data-section-id');
      var selector = sid
        ? '[data-newsletter-posted-success][data-section-id="' + sid + '"]'
        : '[data-newsletter-posted-success]';
      if (document.querySelector(selector)) {
        p.setAttribute('data-posted-successfully', 'true');
      }
    }

    function getPopup() {
      if (!popup || !document.body.contains(popup)) {
        popup = document.querySelector('[data-newsletter-popup]');
        dialog = popup ? popup.querySelector('[role="dialog"]') : null;
        promoteSuccessSentinel(popup);
      }
      return popup;
    }

    function isOpen() {
      var p = getPopup();
      return !!p && p.getAttribute('aria-hidden') === 'false';
    }

    function getFocusable(container) {
      if (!container) return [];
      var selector = [
        'button:not([disabled])',
        '[href]',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
      ].join(',');
      return Array.prototype.slice.call(container.querySelectorAll(selector));
    }

    function trapFocus(e) {
      if (!isOpen() || e.key !== 'Tab') return;
      var focusable = getFocusable(dialog);
      if (focusable.length === 0) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    function readCooldownMs(p) {
      var days = parseInt(p.getAttribute('data-cooldown-days'), 10);
      if (isNaN(days) || days < 1) days = 7;
      return days * 24 * 60 * 60 * 1000;
    }

    function readDelayMs(p) {
      var secs = parseInt(p.getAttribute('data-delay-seconds'), 10);
      if (isNaN(secs) || secs < 0) secs = 5;
      return secs * 1000;
    }

    function isDismissedRecently(p) {
      try {
        var raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return false;
        var ts = parseInt(raw, 10);
        if (isNaN(ts)) return false;
        return Date.now() - ts < readCooldownMs(p);
      } catch (_) {
        return false;
      }
    }

    function markDismissed() {
      try {
        window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
      } catch (_) {}
    }

    function openPopup(triggerEl) {
      var p = getPopup();
      if (!p || isOpen()) return;

      lastTrigger = triggerEl || document.activeElement;
      p.setAttribute('aria-hidden', 'false');

      p.removeAttribute('inert');
      if (window.Kitchero && Kitchero.scrollLock) {
        Kitchero.scrollLock.lock('newsletter-popup');
      } else {
        document.body.style.overflow = 'hidden';
      }

      if (window.Kitchero && Kitchero.focusTrap && dialog) {
        Kitchero.focusTrap.enable(dialog);
      }

      setTimeout(function () {
        var email = p.querySelector('[data-popup-email]');
        var target = email;
        if (!target) {
          var focusable = getFocusable(dialog);
          target = focusable[0];
        }
        if (target && typeof target.focus === 'function') {
          target.focus();
        }
      }, 100);

      if (p.getAttribute('data-posted-successfully') === 'true') {
        if (autoCloseTimer) clearTimeout(autoCloseTimer);
        autoCloseTimer = setTimeout(function () {
          closePopup(false);
        }, AUTO_CLOSE_AFTER_SUCCESS_MS);
      }
    }

    function closePopup(persistDismissal) {
      var p = getPopup();
      if (!p || !isOpen()) return;

      p.setAttribute('aria-hidden', 'true');

      p.setAttribute('inert', '');
      if (window.Kitchero && Kitchero.scrollLock) {
        Kitchero.scrollLock.unlock('newsletter-popup');
      } else {
        document.body.style.overflow = '';
      }

      if (window.Kitchero && Kitchero.focusTrap && dialog) {
        Kitchero.focusTrap.disable(dialog);
      }

      if (persistDismissal !== false) {
        markDismissed();
      }

      if (autoCloseTimer) {
        clearTimeout(autoCloseTimer);
        autoCloseTimer = null;
      }

      if (lastTrigger && typeof lastTrigger.focus === 'function') {
        try { lastTrigger.focus(); } catch (_) {}
      }
    }

    function maybeAutoOpen() {
      var p = getPopup();
      if (!p) return;

      if (window.Shopify && Shopify.designMode) return;

      if (p.getAttribute('data-posted-successfully') === 'true') {
        openPopup(null);
        return;
      }

      if (isDismissedRecently(p)) return;

      if (openTimer) clearTimeout(openTimer);
      openTimer = setTimeout(function () {
        var anyModalOpen = (
          document.querySelector('cart-drawer[aria-hidden="false"]') ||
          document.querySelector('.kt-cart-drawer[aria-hidden="false"]') ||
          document.querySelector('[data-search-overlay][aria-hidden="false"]') ||
          document.querySelector('.kt-search-overlay[aria-hidden="false"]') ||
          document.querySelector('.kt-header__mobile-panel[aria-hidden="false"]') ||
          document.querySelector('[data-appointment-drawer][aria-hidden="false"]') ||
          document.querySelector('[data-video-modal][aria-hidden="false"]')
        );
        if (anyModalOpen) return;
        openPopup(null);
      }, readDelayMs(p));
    }

    document.addEventListener('click', function (e) {
      var opener = e.target.closest('[data-newsletter-popup-open]');
      if (opener) {
        e.preventDefault();
        openPopup(opener);
        return;
      }
      var closer = e.target.closest('[data-popup-close]');
      if (closer && closer.closest('[data-newsletter-popup]')) {
        if (!(closer.tagName === 'A' && closer.getAttribute('href'))) {
          e.preventDefault();
        }
        closePopup(true);
        return;
      }
    });

    document.addEventListener('keydown', function (e) {
      if (!isOpen()) return;
      if (e.key === 'Escape' || e.code === 'Escape') {
        if (window.Kitchero && Kitchero.focusTrap && Kitchero.focusTrap.shouldSuppressEscape && Kitchero.focusTrap.shouldSuppressEscape(dialog)) return;
        e.preventDefault();
        closePopup(true);
        return;
      }
      trapFocus(e);
    });

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', maybeAutoOpen);
    } else {
      maybeAutoOpen();
    }

    document.addEventListener('shopify:section:load', function (e) {
      if (e.target && e.target.querySelector && e.target.querySelector('[data-newsletter-popup]')) {
        popup = null;
        dialog = null;
        maybeAutoOpen();
      }
    });

    document.addEventListener('shopify:section:unload', function (e) {
      if (e.target && e.target.querySelector && e.target.querySelector('[data-newsletter-popup]')) {
        if (openTimer) { clearTimeout(openTimer); openTimer = null; }
        if (autoCloseTimer) { clearTimeout(autoCloseTimer); autoCloseTimer = null; }
        if (window.Kitchero && Kitchero.scrollLock) {
          Kitchero.scrollLock.unlock('newsletter-popup');
        } else {
          document.body.style.overflow = '';
        }
        popup = null;
        dialog = null;
      }
    });

    document.addEventListener('shopify:section:select', function (e) {
      if (e.target && e.target.querySelector && e.target.querySelector('[data-newsletter-popup]')) {
        popup = null;
        dialog = null;
        if (openTimer) { clearTimeout(openTimer); openTimer = null; }
        openPopup(null);
      }
    });

    document.addEventListener('shopify:section:deselect', function (e) {
      if (e.target && e.target.querySelector && e.target.querySelector('[data-newsletter-popup]')) {
        closePopup(false);
      }
    });
  })();
}
