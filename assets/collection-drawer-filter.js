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
         mobile-nav. */
      lastTrigger = document.activeElement;
      drawer.classList.add('kt-filter-drawer--open');
      drawer.removeAttribute('inert');
      document.body.style.overflow = 'hidden';
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
      drawer.classList.remove('kt-filter-drawer--open');
      drawer.setAttribute('inert', '');
      document.body.style.overflow = '';
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
      if (e.code === 'Escape' && drawer.classList.contains('kt-filter-drawer--open')) {
        close();
      }
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
