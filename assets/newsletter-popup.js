/**
 * Newsletter Popup — auto-opens after a merchant-configured delay, with a
 * localStorage cooldown so returning visitors aren't nagged repeatedly.
 *
 * Behavior:
 *  - On load: read [data-newsletter-popup]. If localStorage cooldown has not
 *    expired AND the form was NOT just submitted successfully (Liquid sets
 *    data-posted-successfully="true" in that case), do nothing.
 *  - Otherwise wait `data-delay-seconds` seconds, then open the modal.
 *  - If data-posted-successfully is set, open immediately in success state
 *    and auto-close after 5 seconds.
 *  - Close on: backdrop click, [data-popup-close] click, Escape key.
 *  - Focus trap Tab/Shift-Tab within the dialog.
 *  - Autofocus the email input on open (or the first focusable element in
 *    success state).
 *  - Body scroll is locked while open.
 *  - Manual trigger: any element with [data-newsletter-popup-open] opens it.
 *  - Idempotent via window.__kitcheroNewsletterPopupLoaded so the file is
 *    safe against duplicate script injection.
 */
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
      /* Liquid can only resolve `form.posted_successfully?` inside the
       * {% form %} block, so the section renders a <span data-newsletter-
       * posted-success> sentinel there. Promote that signal onto the
       * popup root so the rest of this module can read a single flag. */
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
      document.body.style.overflow = 'hidden';

      /* Focus: email input if present, otherwise first focusable in dialog */
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

      /* If this render is the post-submit success state, auto-close after
       * the user has had time to read the discount code. */
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
      document.body.style.overflow = '';

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

      /* Always open (immediately) when Shopify redirected back after a
       * successful submission — the merchant needs to see the success panel. */
      if (p.getAttribute('data-posted-successfully') === 'true') {
        openPopup(null);
        return;
      }

      if (isDismissedRecently(p)) return;

      if (openTimer) clearTimeout(openTimer);
      openTimer = setTimeout(function () {
        openPopup(null);
      }, readDelayMs(p));
    }

    /* Delegated click handler — handles current + future triggers. */
    document.addEventListener('click', function (e) {
      var opener = e.target.closest('[data-newsletter-popup-open]');
      if (opener) {
        e.preventDefault();
        openPopup(opener);
        return;
      }
      var closer = e.target.closest('[data-popup-close]');
      if (closer && closer.closest('[data-newsletter-popup]')) {
        /* Success-state "Start Shopping" link has [data-popup-close] AND an
         * href — let navigation happen but still close + mark dismissed. */
        if (!(closer.tagName === 'A' && closer.getAttribute('href'))) {
          e.preventDefault();
        }
        closePopup(true);
        return;
      }
    });

    /* Keyboard: Escape closes, Tab traps focus */
    document.addEventListener('keydown', function (e) {
      if (!isOpen()) return;
      if (e.key === 'Escape' || e.code === 'Escape') {
        e.preventDefault();
        closePopup(true);
        return;
      }
      trapFocus(e);
    });

    /* Initial boot — DOMContentLoaded if still parsing, otherwise now. */
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', maybeAutoOpen);
    } else {
      maybeAutoOpen();
    }

    /* Theme editor: re-init when the section reloads, clean up on unload. */
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
        document.body.style.overflow = '';
        popup = null;
        dialog = null;
      }
    });

    /* Theme editor: when merchant selects the section, force it open so they
     * can preview/edit the content. */
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
