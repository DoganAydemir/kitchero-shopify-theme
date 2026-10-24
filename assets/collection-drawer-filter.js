(function () {
  'use strict';

  function bindDrawer(drawer) {
    if (!drawer || drawer.dataset.kitcheroDrawerBound === 'true') return;
    drawer.dataset.kitcheroDrawerBound = 'true';

    var panel = drawer.querySelector('.kt-filter-drawer__panel');
    var lastTrigger = null;

    function open() {
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

      if (panel) {
        var focusTarget = panel.querySelector('[data-close-filter-drawer]')
          || panel.querySelector('button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusTarget) {
          requestAnimationFrame(function () {
            try { focusTarget.focus(); } catch (e) {  }
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
