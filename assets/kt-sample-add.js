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
        if (form.dataset.sampleLoading === 'true') {
          e.preventDefault();
          return;
        }

        var idInput = form.querySelector('[name="id"]');
        if (!idInput || !String(idInput.value || '').trim()) return;

        var drawer = getDrawer();

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
            document.dispatchEvent(
              new CustomEvent('kitchero:cart:added', { bubbles: true, detail: added })
            );

            return drawer.refreshDrawer().then(function () {
              if (typeof drawer.open === 'function') drawer.open();
            });
          })
          .catch(function () {
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

    document.addEventListener('shopify:section:load', function (event) {
      init(event.target);
    });
  })();
}
