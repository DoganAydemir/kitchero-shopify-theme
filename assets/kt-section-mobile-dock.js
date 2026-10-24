(function () {
  'use strict';

  function syncCartCount(dock) {
    var dockCount = dock.querySelector('[data-cart-count]');
    if (!dockCount) return;

    var headerCount = document.querySelector('.kt-header__cart-count');
    if (!headerCount) return;

    function paint() {
      var n = parseInt(headerCount.textContent, 10);
      if (isNaN(n)) n = 0;
      dockCount.textContent = String(n);
      if (n > 0) {
        dockCount.hidden = false;
      } else {
        dockCount.hidden = true;
      }
    }

    paint();

    var observer = new MutationObserver(paint);
    observer.observe(headerCount, {
      childList: true,
      characterData: true,
      subtree: true,
    });

    return observer;
  }

  function wireMenuButton(dock) {
    var btn = dock.querySelector('[data-mobile-dock-menu]');
    if (!btn) return;
    btn.addEventListener('click', function (e) {
      e.preventDefault();

      var headerToggle = document.querySelector('.kt-header__menu-toggle');
      if (headerToggle && typeof headerToggle.click === 'function') {
        headerToggle.click();
      }
    });
  }

  function init(root) {
    var scope = root || document;
    var docks = scope.querySelectorAll('[data-mobile-dock]');
    Array.prototype.forEach.call(docks, function (dock) {
      if (dock._kitcheroDockInited) return;
      dock._kitcheroDockInited = true;
      dock._kitcheroDockObserver = syncCartCount(dock);
      wireMenuButton(dock);
    });
  }

  function destroy(root) {
    var scope = root || document;
    var docks = scope.querySelectorAll('[data-mobile-dock]');
    Array.prototype.forEach.call(docks, function (dock) {
      if (dock._kitcheroDockObserver) {
        try { dock._kitcheroDockObserver.disconnect(); } catch (e) {  }
        dock._kitcheroDockObserver = null;
      }
      dock._kitcheroDockInited = false;
    });
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
    destroy(e.target);
  });
})();
