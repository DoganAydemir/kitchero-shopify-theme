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

    /* Per-line request lock state. Prevents rapid +/- clicks from
       firing concurrent POST /cart/change.js requests whose
       responses race each other — the final cart state becomes
       whichever response arrives last, not whichever click
       was last (those are often different). */
    var inflight = Object.create(null);
    var pendingQty = Object.create(null);

    function updateLine(key, quantity, triggerEl) {
      if (inflight[key]) {
        /* Coalesce: remember the latest requested quantity; it will
           fire as soon as the inflight request resolves. Don't queue
           multiple — only the latest wins. */
        pendingQty[key] = quantity;
        return Promise.resolve();
      }
      inflight[key] = true;

      if (triggerEl) triggerEl.setAttribute('aria-busy', 'true');
      var row = document.querySelector('[data-line-key="' + key + '"]');
      if (row) {
        row.style.opacity = '0.5';
        row.style.pointerEvents = 'none';
      }

      return fetch(Kitchero.routes.cartChange + '.js', {
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
        })
        .then(function () {
          /* Release lock; flush pending queue. */
          inflight[key] = false;
          if (row) {
            row.style.opacity = '';
            row.style.pointerEvents = '';
          }
          if (triggerEl) triggerEl.removeAttribute('aria-busy');
          if (pendingQty[key] !== undefined) {
            var pending = pendingQty[key];
            delete pendingQty[key];
            if (pending !== quantity) updateLine(key, pending, triggerEl);
          }
        });
    }

    /**
     * Refresh the live .kt-cart-page section via Shopify's Section
     * Rendering API. Previously this hit `/cart` for the full page
     * HTML (~100-200 KB of rendered layout including header, footer,
     * nav, CSS references). The Section Rendering API returns just
     * the cart-related sections' HTML as a JSON blob — typically
     * ~10-20 KB. Parse each section separately and swap the matching
     * DOM fragment. Huge TBT/network win on every quantity change.
     *
     * Section IDs:
     *   - main-cart is the template-bound section id (from cart.json).
     *   - cart-drawer is the always-rendered drawer (layout-level).
     *   - header-cart-icon is the standalone cart count badge section.
     *   - Falls back gracefully when any section isn't present on
     *     the page (e.g. cart-drawer absent if settings.kt_cart_type
     *     is 'page').
     */
    function refreshCartPage() {
      var sectionsToFetch = [];
      if (document.querySelector('.kt-cart-page')) sectionsToFetch.push('main-cart');
      if (document.querySelector('.kt-cart-drawer')) sectionsToFetch.push('cart-drawer');
      if (document.querySelector('[data-section-type="header-cart-icon"]')) sectionsToFetch.push('header-cart-icon');
      // Safety: always include main-cart so a layout without the drawer
      // / icon sections still gets the primary swap.
      if (sectionsToFetch.length === 0) sectionsToFetch.push('main-cart');

      return fetch('/?sections=' + sectionsToFetch.join(','), {
        headers: { 'Accept': 'application/json' },
      })
        .then(function (response) {
          if (!response.ok) throw new Error('refreshCartPage: sections fetch failed');
          return response.json();
        })
        .then(function (sections) {
          // Build a combined doc from the section fragments so the
          // existing selector logic below works unchanged.
          var html = '';
          if (sections['main-cart']) html += sections['main-cart'];
          if (sections['cart-drawer']) html += sections['cart-drawer'];
          if (sections['header-cart-icon']) html += sections['header-cart-icon'];
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

          /* Announce the new subtotal to screen readers. Without this,
             a keyboard/SR user raising a line item's quantity hears
             silence — the +/- press has no audible confirmation that
             the cart accepted the change. Pull from the rendered
             summary's grand total so the formatting (money +
             money_with_currency branching for multi-currency stores)
             matches what's on-screen. */
          var nextTotal = doc.querySelector('.kt-cart-page__summary-row--total .kt-cart-page__summary-value');
          if (nextTotal && window.Kitchero && typeof Kitchero.announce === 'function') {
            Kitchero.announce(
              (Kitchero.cartStrings && Kitchero.cartStrings.updatedSubtotal
                ? Kitchero.cartStrings.updatedSubtotal.replace('[subtotal]', nextTotal.textContent.trim())
                : 'Cart updated. Subtotal ' + nextTotal.textContent.trim())
            );
          }

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

    /* Theme editor lifecycle:
       - on section:unload (merchant removed/replaced the cart section in
         the editor preview), clear any outstanding debounce timers so we
         don't fire an AJAX update for a line that no longer exists.
       - section:load does not need to re-init anything: the click/input
         handlers are document-level delegates and survive re-renders.
       - event.target is the <div id="shopify-section-{id}"> wrapper; the
         inner [data-section-type="main-cart"] confirms it's the cart
         section (not some other section unloading).
    */
    document.addEventListener('shopify:section:unload', function (event) {
      if (!event.target || !event.target.querySelector('[data-section-type="main-cart"]')) return;
      Object.keys(debounceTimers).forEach(function (key) {
        window.clearTimeout(debounceTimers[key]);
        delete debounceTimers[key];
      });
    });
  })();
}
