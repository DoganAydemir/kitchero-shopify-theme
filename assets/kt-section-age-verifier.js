/* Age Verifier — first-visit modal for age-restricted storefronts.
 *
 * Storage: localStorage `kt-age-verified` JSON `{ expires: <ms> }`.
 * - On load, check if a non-expired record exists. If yes, the
 *   modal stays hidden and the rest of the page renders normally.
 * - On accept, write a new record with expires = now + session_days.
 * - On decline, the native <a href> takes the customer away; no
 *   storage write needed.
 *
 * In the Shopify theme editor (request.design_mode), force the
 * modal open every load so the merchant can preview their config
 * without having to clear localStorage. Detected via the page
 * being inside a Shopify theme editor iframe (Shopify.designMode
 * global is injected when editing).
 *
 * Accessibility:
 * - Focus trap inside the panel while open.
 * - ESC does NOT close — age verification must be intentional.
 * - Backdrop click does NOT close — same reasoning.
 * - Initial focus lands on the Accept button (the affirmative
 *   action). Decline is still tab-reachable.
 * - role="dialog" + aria-modal + aria-labelledby + aria-describedby
 *   in the markup; JS just toggles aria-hidden + inert.
 *
 * Flash-of-unverified-content (FOUC) prevention: we toggle the
 * lock class on <html> as early as possible so the page paints
 * with overflow:hidden before the modal animates in. The CSS does
 * the rest.
 */
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
        /* Stale record — purge and re-prompt. */
        localStorage.removeItem(STORAGE_KEY);
        return false;
      }
      return true;
    } catch (e) {
      /* localStorage disabled / quota exceeded — treat as unverified
         but don't crash. The modal will re-show on every load for
         this customer, which is the safer side to err on. */
      return false;
    }
  }

  function setVerified(sessionDays) {
    try {
      var days = parseInt(sessionDays, 10) || 30;
      var record = { expires: Date.now() + days * 24 * 60 * 60 * 1000 };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    } catch (e) { /* localStorage failed — accept still hides the modal in-memory */ }
  }

  function inDesignMode() {
    /* Shopify injects `Shopify.designMode = true` when the page is
       rendered inside the theme editor's preview iframe. */
    return !!(window.Shopify && window.Shopify.designMode);
  }

  function initModal(modal) {
    if (!modal || modal._kitcheroAgeInited) return;
    modal._kitcheroAgeInited = true;

    var panel = modal.querySelector('.kt-age-verifier__panel');
    var acceptBtn = modal.querySelector('[data-age-verifier-accept]');
    var declineBtn = modal.querySelector('[data-age-verifier-decline]');
    var sessionDays = modal.getAttribute('data-session-days') || '30';

    /* Decide whether to open. Theme editor always opens (so the
       merchant can preview); on the live storefront, open only if
       no valid acceptance is stored. */
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

    /* Trap focus inside the panel. Tabbing past the last focusable
       wraps to the first, Shift+Tab from the first wraps to the
       last. Critical here because the underlying page is supposed
       to be inert but inert support is patchy on older browsers. */
    function onKeydown(e) {
      if (modal.getAttribute('aria-hidden') !== 'false') return;
      /* ESC intentionally ignored — verification must be explicit. */
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

    /* Named handlers so we can detach them on shopify:section:
       unload — anonymous listeners would leak on every section
       reload in the theme editor (Theme Store reviewer reproduces
       this by editing settings + saving, which re-renders the
       section). REJ-JS-001: handlers must be cleaned on unload. */
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
      }
    }

    if (acceptBtn) acceptBtn.addEventListener('click', onAcceptClick);
    if (declineBtn) declineBtn.addEventListener('click', onDeclineClick);
    document.addEventListener('keydown', onKeydown);

    /* Expose a destroyer so shopify:section:unload can detach
       every listener this initModal added, plus release the
       scroll lock and lock-class if the modal is open at unload
       time (rare but possible during a force re-render). */
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

  /* Run as early as possible — the modal must appear before the
     customer sees any storefront content (Theme Store FOUC
     guideline). DOMContentLoaded covers the deferred script load;
     immediate-init handles cases where the script is added after
     DOM is already ready. */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(); });
  } else {
    init();
  }

  document.addEventListener('shopify:section:load', function (e) {
    init(e.target);
  });

  /* REJ-JS-001 fix: tear down every listener and DOM mutation
     installed by initModal so a section reload doesn't leak
     handlers. Without this, repeated section saves in the
     editor accumulate keydown listeners and the modal's
     accept/decline buttons fire multiple times per click. */
  document.addEventListener('shopify:section:unload', function (e) {
    if (!e || !e.target) return;
    var modals = e.target.querySelectorAll('[data-age-verifier]');
    Array.prototype.forEach.call(modals, function (modal) {
      if (modal._kitcheroAgeDestroy) modal._kitcheroAgeDestroy();
    });
  });
})();
