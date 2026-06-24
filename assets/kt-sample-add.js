/**
 * Showroom "Add sample to cart" — AJAX add + cart-drawer open.
 *
 * The showroom door-sample block renders a plain {% form 'product' %}
 * (snippets live in main-product-showroom.liquid). Left alone it does a
 * full-page POST to /cart, which on this theme means the customer lands
 * on the cart page instead of the slide-out drawer the rest of the store
 * uses. This intercepts the sample form's submit, adds via /cart/add.js,
 * then refreshes + opens the shared cart drawer — matching the main PDP's
 * add-to-cart UX.
 *
 * We deliberately do NOT reuse product-form.js's initProductForm here:
 * that helper queries `[data-option-value]` / `[data-variant-select]` at
 * the whole-section level and would wrongly wire the showroom's MAIN
 * product variant picker to the sample form. This is a self-contained,
 * variant-less handler keyed to the sample form's own class.
 *
 * Progressive enhancement: with JS disabled the {% form %} still POSTs
 * natively to /cart, so adding a sample keeps working.
 *
 * Idempotent: guarded by window.__kitcheroSampleAddLoaded.
 */

if (!window.__kitcheroSampleAddLoaded) {
  window.__kitcheroSampleAddLoaded = true;

  (function () {
    'use strict';

    var FORM_SELECTOR = '.kt-showroom__sample-form';
    var BTN_SELECTOR = '.kt-showroom__sample-btn';

    function cartUrl() {
      if (window.Kitchero && Kitchero.routes && Kitchero.routes.cart) {
        return Kitchero.routes.cart;
      }
      return '/cart';
    }

    function getDrawer() {
      return (window.Kitchero && window.Kitchero.cartDrawer) || window.kitcheroCartDrawer || null;
    }

    function bind(form) {
      if (!form || form.dataset.sampleAddBound === 'true') return;
      form.dataset.sampleAddBound = 'true';

      var btn = form.querySelector(BTN_SELECTOR);

      form.addEventListener('submit', function (e) {
        /* Inflight guard — block rapid double-taps; /cart/add.js is not
           idempotent so two quick POSTs add the sample twice. */
        if (form.dataset.sampleLoading === 'true') {
          e.preventDefault();
          return;
        }

        var idInput = form.querySelector('[name="id"]');
        if (!idInput || !String(idInput.value || '').trim()) return; /* let native handle/ignore */

        var drawer = getDrawer();
        /* No drawer on the page (cart_type: page) — let the native POST
           fall through to /cart, mirroring the rest of the theme. */
        if (!drawer || typeof drawer.refreshDrawer !== 'function') return;

        e.preventDefault();

        form.dataset.sampleLoading = 'true';
        if (btn) {
          btn.disabled = true;
          btn.setAttribute('aria-busy', 'true');
        }

        var body = new FormData(form);

        fetch('/cart/add.js', {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: body
        })
          .then(function (response) {
            return response.json().then(function (data) {
              if (!response.ok) throw data;
              return data;
            });
          })
          .then(function (added) {
            /* Let cart-aware widgets (free-shipping bar, analytics) react. */
            document.dispatchEvent(
              new CustomEvent('kitchero:cart:added', { bubbles: true, detail: added })
            );
            /* Canonical pattern (see cart-drawer.js): refresh from the
               server — which re-renders the panel and the header count —
               then open the freshly-rendered drawer. */
            return drawer.refreshDrawer().then(function () {
              if (typeof drawer.open === 'function') drawer.open();
            });
          })
          .catch(function () {
            /* Hard failure (network / sold out race). Fall back to the
               native cart page so the customer is never stuck. */
            window.location.href = cartUrl();
          })
          .finally(function () {
            form.dataset.sampleLoading = '';
            if (btn) {
              btn.disabled = false;
              btn.removeAttribute('aria-busy');
            }
          });
      });
    }

    function init(scope) {
      var root = scope || document;
      var forms = root.querySelectorAll ? root.querySelectorAll(FORM_SELECTOR) : [];
      forms.forEach(bind);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { init(); });
    } else {
      init();
    }

    /* Theme editor — re-bind when the showroom section is reloaded. */
    document.addEventListener('shopify:section:load', function (event) {
      init(event.target);
    });
  })();
}
