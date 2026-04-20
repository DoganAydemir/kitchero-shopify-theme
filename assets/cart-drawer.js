/**
 * Kitchero Cart Drawer — Custom Element
 *
 * Handles:
 * - Open/close with animation
 * - Quantity updates via Cart AJAX API + Section Rendering API
 * - Keyboard accessibility (Escape closes)
 * - Theme editor support
 *
 * Works without JS: cart icon links to /cart page.
 */

(function () {
  'use strict';

  class CartDrawer {
    constructor(el) {
      this.drawer = el;
      if (!this.drawer) return;

      this.overlay = this.drawer.querySelector('.kt-cart-drawer__overlay');
      this.panel = this.drawer.querySelector('.kt-cart-drawer__panel');
      this.closeButtons = this.drawer.querySelectorAll('[data-cart-drawer-close]');
      this.qtyButtons = this.drawer.querySelectorAll('[data-qty-change]');

      this.bindEvents();
    }

    bindEvents() {
      var self = this;

      /* Event delegation on the drawer root so close + quantity buttons
         keep working after product-form.js swaps in freshly-rendered
         HTML on add-to-cart. Individual listeners on each button would
         go stale because the buttons are re-created during the swap. */
      this.drawer.addEventListener('click', function (event) {
        if (event.target.closest('[data-cart-drawer-close]')) {
          self.close();
          return;
        }
        var qtyBtn = event.target.closest('[data-qty-change]');
        if (qtyBtn) {
          var key = qtyBtn.dataset.lineKey;
          var qty = parseInt(qtyBtn.dataset.qty, 10);
          self.updateQuantity(key, qty);
          return;
        }
      });

      /* Escape key */
      this._keyHandler = function (event) {
        if (event.code === 'Escape' && self.isOpen()) {
          self.close();
        }
      };
      document.addEventListener('keydown', this._keyHandler);

      /* Listen for cart icon clicks (delegated so multiple icons or
         icons re-rendered by header-group updates still work). Stored
         on `self` so destroy() can remove it — otherwise each
         shopify:section:load stacks another document-level click
         listener that keeps firing against a dead drawer instance. */
      this._clickHandler = function (event) {
        var icon = event.target.closest('.kt-header__cart-icon');
        if (!icon) return;
        event.preventDefault();
        self.open();
      };
      document.addEventListener('click', this._clickHandler);
    }

    isOpen() {
      return this.drawer.getAttribute('aria-hidden') === 'false';
    }

    open() {
      this.drawer.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';

      if (window.Kitchero && Kitchero.focusTrap) {
        Kitchero.focusTrap.enable(this.panel);
      }
    }

    close() {
      this.drawer.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';

      if (window.Kitchero && Kitchero.focusTrap) {
        Kitchero.focusTrap.disable(this.panel);
      }
    }

    updateQuantity(key, quantity) {
      var self = this;

      /* Optimistic disable: freeze the clicked row while the server
         catches up so rapid double-clicks don't fire two mutations */
      var row = self.drawer.querySelector('[data-line-key="' + key + '"]');
      if (row) row.style.opacity = '0.5';

      fetch(Kitchero.routes.cartChange + '.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: key, quantity: quantity }),
      })
        .then(function (response) {
          return response.json();
        })
        .then(function () {
          return self.refreshDrawer();
        })
        .catch(function (error) {
          console.error('Cart update error:', error);
          if (row) row.style.opacity = '';
        });
    }

    /**
     * Pull a fresh copy of the page and replace the drawer's inner
     * panel HTML so the visitor sees the updated line items, subtotal
     * footer, or the empty state — whatever the server rendered after
     * the last mutation. Also syncs the header cart count.
     *
     * Returns a Promise so callers (updateQuantity, product-form.js)
     * can await the refresh before they open or close the drawer.
     */
    refreshDrawer() {
      var self = this;

      /* Shopify Section Rendering API — fetches just the cart-drawer
       * section markup, no full page. Much lighter than a full-page
       * fetch: responses are ~5–10 KB vs 100+ KB for a page. */
      return fetch('/?sections=cart-drawer,header-cart-icon', {
        headers: { 'Accept': 'application/json' },
      })
        .then(function (response) {
          if (!response.ok) throw new Error('refreshDrawer: section fetch failed');
          return response.json();
        })
        .then(function (sections) {
          /* Swap the drawer panel (header + items + footer). The API
           * returns the raw section HTML — the outer section wrapper
           * is included, so we parse it and pick just the panel. */
          if (sections['cart-drawer']) {
            var tmp = document.createElement('div');
            tmp.innerHTML = sections['cart-drawer'];
            var newPanel = tmp.querySelector('.kt-cart-drawer__panel');
            var currentPanel = self.drawer.querySelector('.kt-cart-drawer__panel');
            if (currentPanel && newPanel) {
              currentPanel.innerHTML = newPanel.innerHTML;
            }
          }

          /* Sync the header cart count. The `header-cart-icon` section
           * key only exists if the theme exposes one; fall back to a
           * plain cart.js lookup otherwise. */
          if (sections['header-cart-icon']) {
            var tmp2 = document.createElement('div');
            tmp2.innerHTML = sections['header-cart-icon'];
            var newCount = tmp2.querySelector('.kt-header__cart-count');
            document.querySelectorAll('.kt-header__cart-count').forEach(function (el) {
              if (newCount) {
                el.textContent = newCount.textContent;
                el.style.display = newCount.style.display || '';
              } else {
                el.textContent = '0';
                el.style.display = 'none';
              }
            });
          } else {
            /* No dedicated header-cart-icon section — query cart.js. */
            return fetch(Kitchero.routes.cart, {
              headers: { 'Accept': 'application/json' },
            })
              .then(function (r) { return r.json(); })
              .then(function (cart) { self.updateCartCount(cart.item_count); });
          }
        })
        .catch(function (error) {
          console.error(error);
          /* Last-ditch fallback so the UI isn't left in a stale state */
          return fetch(Kitchero.routes.cart, {
            headers: { 'Accept': 'application/json' },
          })
            .then(function (r) { return r.json(); })
            .then(function (cart) {
              self.updateCartCount(cart.item_count);
              if (cart.item_count === 0) self.close();
            });
        });
    }

    updateCartCount(count) {
      document.querySelectorAll('.kt-header__cart-count').forEach(function (el) {
        el.textContent = count;
        if (count > 0) {
          el.style.display = '';
        } else {
          el.style.display = 'none';
        }
      });
    }

    destroy() {
      if (this._keyHandler) document.removeEventListener('keydown', this._keyHandler);
      if (this._clickHandler) document.removeEventListener('click', this._clickHandler);
      /* Restore body scroll in case the drawer was open when the
         section was unloaded — without this the storefront would boot
         into a locked-scroll state after the editor re-renders. */
      if (document.body) document.body.style.overflow = '';
    }
  }

  /* Initialize */
  var drawer = document.getElementById('cart-drawer');
  if (drawer) {
    var instance = new CartDrawer(drawer);

    /* Expose the instance so other files (product-form.js when adding
       to cart, apps binding to cart:update) can trigger a full refresh
       without duplicating the fetch-and-swap logic. */
    window.kitcheroCartDrawer = instance;

    /* Theme editor support. We tear down + re-create on any section
       load to survive header/cart re-renders, and fully tear down on
       unload so a merchant who deletes the cart-drawer section from
       a template doesn't leave stray listeners attached to document. */
    document.addEventListener('shopify:section:load', function (e) {
      /* Only rebuild if the event touches the cart-drawer wrapper. */
      if (e.target && e.target.querySelector && !e.target.querySelector('#cart-drawer')) {
        return;
      }
      if (instance) instance.destroy();
      var newDrawer = document.getElementById('cart-drawer');
      if (newDrawer) {
        instance = new CartDrawer(newDrawer);
        window.kitcheroCartDrawer = instance;
      }
    });

    document.addEventListener('shopify:section:unload', function (e) {
      if (!e.target || !e.target.querySelector) return;
      if (!e.target.querySelector('#cart-drawer')) return;
      if (instance) {
        instance.destroy();
        instance = null;
        window.kitcheroCartDrawer = null;
      }
    });
  }
})();
