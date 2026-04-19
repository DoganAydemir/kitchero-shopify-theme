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

    function open() {
      drawer.classList.add('kt-filter-drawer--open');
      document.body.style.overflow = 'hidden';
      if (panel && window.Kitchero && Kitchero.focusTrap) {
        Kitchero.focusTrap.enable(panel);
      }
    }

    function close() {
      drawer.classList.remove('kt-filter-drawer--open');
      document.body.style.overflow = '';
      if (panel && window.Kitchero && Kitchero.focusTrap) {
        Kitchero.focusTrap.disable(panel);
      }
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
