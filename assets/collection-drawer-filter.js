/**
 * Collection Filter Drawer — open/close + body scroll lock.
 * Re-binds on shopify:section:load so collection sections added or
 * re-rendered in the editor stay interactive.
 */
(function () {
  'use strict';

  function bindDrawer(drawer) {
    if (!drawer || drawer.dataset.kitcheroDrawerBound === 'true') return;
    drawer.dataset.kitcheroDrawerBound = 'true';

    var panel = drawer.querySelector('.kt-filter-drawer__panel');
    var lastTrigger = null;

    function open() {
      /* Remember the button that opened the drawer so focus can be
         restored there on close — same pattern as cart-drawer and
         mobile-nav.

         State signal fix: previously toggled `.kt-filter-drawer--open`
         class, but the CSS shows/hides the drawer via
         `[aria-hidden="false"]` selectors (kt-collection-filters.css:
         354, 392). The class + attribute were decoupled, so clicks
         flipped the class but the drawer stayed invisible — filter
         feature was completely dead. Flip aria-hidden directly so the
         existing CSS selectors match; aria-hidden="false" is also the
         correct semantic for "dialog is now shown" per APG, so this
         single state change carries both visual + SR signals. */
      lastTrigger = document.activeElement;
      drawer.setAttribute('aria-hidden', 'false');
      drawer.removeAttribute('inert');
      if (window.Kitchero && Kitchero.scrollLock) {
        Kitchero.scrollLock.lock('filter-drawer');
      } else {
        document.body.style.overflow = 'hidden';
      }
      if (panel && window.Kitchero && Kitchero.focusTrap) {
        Kitchero.focusTrap.enable(panel);
      }
      /* Move focus INTO the panel so keyboard/SR users hear the
         drawer's first control announced instead of staying on the
         trigger button behind the overlay. Close button is the safe
         first-focus target — it's always present and recognizable.
         rAF gives the CSS transition a frame to start so the
         focus() doesn't trigger a pre-transition scroll jump. */
      if (panel) {
        var focusTarget = panel.querySelector('[data-close-filter-drawer]')
          || panel.querySelector('button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusTarget) {
          requestAnimationFrame(function () {
            try { focusTarget.focus(); } catch (e) { /* ignore */ }
          });
        }
      }
    }

    function close() {
      drawer.setAttribute('aria-hidden', 'true');
      drawer.setAttribute('inert', '');
      if (window.Kitchero && Kitchero.scrollLock) {
        Kitchero.scrollLock.unlock('filter-drawer');
      } else {
        document.body.style.overflow = '';
      }
      if (panel && window.Kitchero && Kitchero.focusTrap) {
        Kitchero.focusTrap.disable(panel);
      }
      if (lastTrigger && typeof lastTrigger.focus === 'function' && document.contains(lastTrigger)) {
        lastTrigger.focus();
      }
      lastTrigger = null;
    }

    var scope = drawer.closest('[data-section-id]') || document;

    scope.querySelectorAll('[data-open-filter-drawer]').forEach(function (btn) {
      btn.addEventListener('click', open);
    });

    drawer.querySelectorAll('[data-close-filter-drawer]').forEach(function (btn) {
      btn.addEventListener('click', close);
    });

    function onKeyDown(e) {
      if (e.code !== 'Escape' || drawer.getAttribute('aria-hidden') !== 'false') return;
      /* shouldSuppressEscape must be queried with the SAME element that was
         passed to focusTrap.enable() above (line 39) — `panel`, not `drawer`.
         Querying with `drawer` returns true unconditionally when this trap is
         active because the stack's top entry is `panel`, so ESC was silently
         suppressed and the drawer became un-closable via keyboard. WCAG 2.1.2
         No Keyboard Trap violation. */
      if (window.Kitchero && Kitchero.focusTrap && Kitchero.focusTrap.shouldSuppressEscape && Kitchero.focusTrap.shouldSuppressEscape(panel)) return;
      close();
    }
    document.addEventListener('keydown', onKeyDown);

    drawer._kitcheroCleanup = function () {
      document.removeEventListener('keydown', onKeyDown);
      drawer.dataset.kitcheroDrawerBound = '';
    };
  }

  function initAll(root) {
    (root || document)
      .querySelectorAll('#filter-drawer, [data-filter-drawer]')
      .forEach(bindDrawer);
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
    var drawer = event.target.querySelector('#filter-drawer, [data-filter-drawer]');
    if (drawer && typeof drawer._kitcheroCleanup === 'function') drawer._kitcheroCleanup();
  });
})();
