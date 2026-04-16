/**
 * Main Cart — qty stepper, remove buttons, input debounce.
 *
 * The form is a plain Shopify {% form 'cart' %} that posts updates
 * to /cart on submit, but merchants expect instant feedback when
 * they bump quantities or remove items. This script AJAX-updates
 * lines via /cart/change.js and replaces the cart page HTML with
 * the server's re-rendered copy, so subtotal + totals stay in sync
 * with any merchant discount / tax / quantity rules.
 *
 * Falls back cleanly when JS is off: the qty input is a regular
 * number field inside the form, Submit (checkout) still works, and
 * Shopify's default /cart redirect handles everything.
 */
if (!window.__kitcheroMainCartLoaded) {
  window.__kitcheroMainCartLoaded = true;

  (function () {
    'use strict';

    var DEBOUNCE_MS = 500;
    var debounceTimers = {};

    function updateLine(key, quantity, triggerEl) {
      if (triggerEl) triggerEl.setAttribute('aria-busy', 'true');
      var row = document.querySelector('[data-line-key="' + key + '"]');
      if (row) row.style.opacity = '0.5';

      return fetch(window.routes.cart_change_url + '.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ id: key, quantity: quantity }),
      })
        .then(function (response) {
          if (!response.ok) throw new Error('Cart change failed: ' + response.status);
          return response.json();
        })
        .then(function () {
          return refreshCartPage();
        })
        .catch(function (error) {
          console.error(error);
          if (row) row.style.opacity = '';
          /* Fallback: reload the page so the UI isn't stuck in a stale state */
          window.location.reload();
        });
    }

    /**
     * Fetch the current page as HTML and swap the live .kt-cart-page
     * contents with the server's fresh render. Keeps the URL, scroll
     * position, and header count all in sync with the new cart state.
     */
    function refreshCartPage() {
      return fetch(window.location.pathname, {
        headers: { 'Accept': 'text/html' },
      })
        .then(function (response) {
          if (!response.ok) throw new Error('refreshCartPage: page fetch failed');
          return response.text();
        })
        .then(function (html) {
          var doc = new DOMParser().parseFromString(html, 'text/html');

          /* Swap the whole cart page section */
          var current = document.querySelector('.kt-cart-page');
          var next = doc.querySelector('.kt-cart-page');
          if (current && next) {
            current.innerHTML = next.innerHTML;
          }

          /* Sync header count */
          var newCount = doc.querySelector('.kt-header__cart-count');
          document.querySelectorAll('.kt-header__cart-count').forEach(function (el) {
            if (newCount) {
              el.textContent = newCount.textContent;
              el.style.display = newCount.style.display || '';
            } else {
              el.textContent = '0';
              el.style.display = 'none';
            }
          });

          /* Also refresh the cart drawer (if present) so the two UIs
             never diverge */
          if (window.kitcheroCartDrawer && typeof window.kitcheroCartDrawer.refreshDrawer === 'function') {
            window.kitcheroCartDrawer.refreshDrawer();
          }
        });
    }

    /* Delegated click handler on the cart page root — covers qty
       buttons and remove buttons. Stays bound across innerHTML swaps. */
    document.addEventListener('click', function (event) {
      var qtyBtn = event.target.closest('[data-cart-qty-change]');
      if (qtyBtn) {
        event.preventDefault();
        var key = qtyBtn.dataset.lineKey;
        var qty = parseInt(qtyBtn.dataset.qty, 10);
        if (isNaN(qty) || qty < 0) return;
        updateLine(key, qty, qtyBtn);
        return;
      }

      var removeBtn = event.target.closest('[data-cart-remove]');
      if (removeBtn) {
        event.preventDefault();
        var removeKey = removeBtn.dataset.lineKey;
        updateLine(removeKey, 0, removeBtn);
        return;
      }
    });

    /* Debounced quantity input — merchant types a number directly */
    document.addEventListener('input', function (event) {
      var input = event.target.closest('[data-cart-qty-input]');
      if (!input) return;

      var key = input.dataset.lineKey;
      var value = parseInt(input.value, 10);
      if (isNaN(value) || value < 0) return;

      window.clearTimeout(debounceTimers[key]);
      debounceTimers[key] = window.setTimeout(function () {
        updateLine(key, value, input);
        delete debounceTimers[key];
      }, DEBOUNCE_MS);
    });
  })();
}
