/* Mobile Dock — wire cart count sync + menu drawer trigger.
 *
 * Cart count: the header already mutates [data-cart-count] /
 * .kt-header__cart-count on cart updates via cart-drawer.js and
 * main-cart.js. Rather than re-implementing the listener here we
 * use a MutationObserver on the header's cart count node and
 * mirror its textContent into the dock's badge. Single source of
 * truth — if the header count is right, the dock count is right.
 *
 * Menu button: programmatically clicks the header's mobile menu
 * toggle so the existing drawer animation, focus trap, and ESC
 * handler in kt-section-header-mobile-nav.js run unchanged. Dock
 * never opens a separate drawer.
 *
 * Search button: native `<a href="/search">` already works for
 * JS-off. When `Kitchero.predictiveSearch` is loaded we let its
 * delegated click handler intercept (it listens for
 * `[data-search-trigger]` globally). No work here.
 */
(function () {
  'use strict';

  function syncCartCount(dock) {
    var dockCount = dock.querySelector('[data-cart-count]');
    if (!dockCount) return;

    /* Find the canonical header count node. The cart count lives
       in `.kt-header__cart-count` on every storefront paint per
       sections/header.liquid. Falls back to a global search if
       the header markup ever moves. */
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

    /* Mutation observer — fires every time cart-drawer.js or
       main-cart.js rewrites the header count after /cart/*.js
       responses. characterData + subtree catches both
       `textContent = '3'` and inner text-node replacement. */
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
      /* Pop the header's mobile menu toggle. The toggle is the
         only thing the header's nav script listens for, so a
         synthetic click triggers the full open path (focus trap,
         aria-expanded swap, scroll lock). */
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
        try { dock._kitcheroDockObserver.disconnect(); } catch (e) { /* noop */ }
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
