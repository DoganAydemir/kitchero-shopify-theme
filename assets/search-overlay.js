/**
 * Search Overlay — full-screen modal open/close controller.
 *
 * Responsibilities:
 *  - Toggle the overlay via [data-search-open] / [data-search-close]
 *  - Lock body scroll while open
 *  - Auto-focus the search input on open
 *  - Close on Escape and on click outside the dialog (backdrop)
 *  - Focus-trap Tab/Shift-Tab inside the dialog
 *  - Fill the input when a "popular search" pill is clicked
 *  - Restore focus to the trigger element on close
 *
 * Idempotent via a window guard so the file is safe against duplicate
 * <script> injection (same pattern as countdown.js).
 */
if (!window.__kitcheroSearchOverlayLoaded) {
  window.__kitcheroSearchOverlayLoaded = true;

  (function () {
    'use strict';

    var overlay = null;
    var input = null;
    var lastTrigger = null;

    function getFocusable(container) {
      if (!container) return [];
      var selector = [
        'button:not([disabled])',
        '[href]',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(',');
      return Array.prototype.slice.call(container.querySelectorAll(selector));
    }

    function trapFocus(e) {
      if (!overlay || overlay.getAttribute('aria-hidden') !== 'false') return;
      if (e.key !== 'Tab') return;

      var dialog = overlay.querySelector('[role="dialog"]');
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

    function openOverlay(trigger) {
      overlay = document.querySelector('[data-search-overlay]');
      if (!overlay) return;

      lastTrigger = trigger || document.activeElement;
      overlay.setAttribute('aria-hidden', 'false');
      overlay.removeAttribute('inert');
      document.body.style.overflow = 'hidden';

      /* Update aria-expanded on any open triggers */
      document.querySelectorAll('[data-search-open]').forEach(function (btn) {
        btn.setAttribute('aria-expanded', 'true');
      });

      input = overlay.querySelector('[data-search-input]');
      /* Autofocus after transition-friendly tick */
      setTimeout(function () {
        if (input) input.focus();
      }, 80);
    }

    function closeOverlay() {
      if (!overlay) overlay = document.querySelector('[data-search-overlay]');
      if (!overlay) return;

      overlay.setAttribute('aria-hidden', 'true');
      overlay.setAttribute('inert', '');
      document.body.style.overflow = '';

      document.querySelectorAll('[data-search-open]').forEach(function (btn) {
        btn.setAttribute('aria-expanded', 'false');
      });

      /* Restore focus to whatever opened the overlay */
      if (lastTrigger && typeof lastTrigger.focus === 'function') {
        lastTrigger.focus();
      }
    }

    /* Delegated click handler — works for dynamically-added triggers too */
    document.addEventListener('click', function (e) {
      var opener = e.target.closest('[data-search-open]');
      if (opener) {
        e.preventDefault();
        openOverlay(opener);
        return;
      }
      var closer = e.target.closest('[data-search-close]');
      if (closer) {
        e.preventDefault();
        closeOverlay();
        return;
      }
      var pill = e.target.closest('[data-search-term]');
      if (pill) {
        e.preventDefault();
        var term = pill.dataset.searchTerm || pill.textContent.trim();
        if (input) {
          input.value = term;
          input.focus();
          /* Move caret to end so keyboard users can extend the query */
          var len = input.value.length;
          try { input.setSelectionRange(len, len); } catch (_) {}
        }
        return;
      }
    });

    /* Keyboard handlers: Escape to close, Tab to trap */
    document.addEventListener('keydown', function (e) {
      if (!overlay || overlay.getAttribute('aria-hidden') !== 'false') return;

      if (e.key === 'Escape' || e.code === 'Escape') {
        e.preventDefault();
        closeOverlay();
        return;
      }

      trapFocus(e);
    });
  })();
}
