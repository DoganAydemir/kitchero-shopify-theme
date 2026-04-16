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
         icons re-rendered by header-group updates still work) */
      document.addEventListener('click', function (event) {
        var icon = event.target.closest('.kt-header__cart-icon');
        if (!icon) return;
        event.preventDefault();
        self.open();
      });
    }

    isOpen() {
      return this.drawer.getAttribute('aria-hidden') === 'false';
    }

    open() {
      this.drawer.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';

      if (typeof trapFocus === 'function') {
        trapFocus(this.panel);
      }
    }

    close() {
      this.drawer.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';

      if (typeof removeTrapFocus === 'function') {
        removeTrapFocus();
      }
    }

    updateQuantity(key, quantity) {
      var self = this;

      fetch(window.routes.cart_change_url + '.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: key, quantity: quantity }),
      })
        .then(function (response) {
          return response.json();
        })
        .then(function () {
          self.refreshDrawer();
        })
        .catch(function (error) {
          console.error('Cart update error:', error);
        });
    }

    refreshDrawer() {
      var self = this;

      fetch(window.location.pathname + '?sections=header-group')
        .then(function (response) {
          return response.json();
        })
        .then(function (data) {
          /* Update cart count in header */
          if (data['header-group']) {
            var temp = document.createElement('div');
            temp.innerHTML = data['header-group'];
            var newCount = temp.querySelector('.kt-header__cart-count');
            var oldCount = document.querySelector('.kt-header__cart-count');
            if (newCount && oldCount) {
              oldCount.textContent = newCount.textContent;
            }
          }
        })
        .catch(function () {
          /* Fallback: reload */
          window.location.reload();
        });

      /* Refresh cart drawer content */
      fetch(window.routes.cart_url, {
        headers: { 'Accept': 'application/json' },
      })
        .then(function (response) {
          return response.json();
        })
        .then(function (cart) {
          self.updateCartCount(cart.item_count);
          if (cart.item_count === 0) {
            self.close();
          }
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
      document.removeEventListener('keydown', this._keyHandler);
    }
  }

  /* Initialize */
  var drawer = document.getElementById('cart-drawer');
  if (drawer) {
    var instance = new CartDrawer(drawer);

    /* Theme editor support */
    document.addEventListener('shopify:section:load', function () {
      instance.destroy();
      var newDrawer = document.getElementById('cart-drawer');
      if (newDrawer) {
        instance = new CartDrawer(newDrawer);
      }
    });
  }
})();
