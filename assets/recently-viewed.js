if (!window.__kitcheroRecentlyViewedLoaded) {
  window.__kitcheroRecentlyViewedLoaded = true;

  (function () {
    'use strict';

    var STORAGE_KEY = 'kt_viewed';
    var MAX_HISTORY = 12;

    function readHistory() {
      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        var parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(function (h) { return typeof h === 'string' && h.length > 0; });
      } catch (e) {
        return [];
      }
    }

    function writeHistory(arr) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
      } catch (e) {
      }
    }

    function pushHandle(handle) {
      if (!handle) return;
      var history = readHistory();

      var idx = history.indexOf(handle);
      if (idx > -1) history.splice(idx, 1);
      history.unshift(handle);

      if (history.length > MAX_HISTORY) {
        history = history.slice(0, MAX_HISTORY);
      }
      writeHistory(history);
    }

    function trackCurrentProduct() {
      var pdp = document.querySelector('[data-section-type="main-product"], [data-section-type="main-product-showroom"]');
      if (!pdp) return;

      var match = window.location.pathname.match(/\/products\/([^/?#]+)/);
      if (!match) return;
      var handle = match[1];

      pushHandle(handle);
    }

    function fetchProduct(handle) {
      var root = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
      return fetch(root + 'products/' + encodeURIComponent(handle) + '.js', {
        headers: { 'Accept': 'application/json' },
      })
        .then(function (response) {
          if (!response.ok) throw new Error('404');
          return response.json();
        })
        .catch(function () { return null;  });
    }

    function buildCard(product) {
      if (!product) return null;
      var card = document.createElement('div');
      card.className = 'kt-recently-viewed__card';
      card.setAttribute('role', 'listitem');

      var link = document.createElement('a');
      link.className = 'kt-recently-viewed__link';

      // product.url from Shopify's product .js is already a root-relative path
      // and may already include the locale/market root (/fr/products/...).
      // Only add the root when it is missing, so it is never doubled.
      var linkRoot = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
      var linkPath = product.url || ('products/' + product.handle);
      if (linkPath.charAt(0) === '/') {
        if (linkRoot !== '/' && linkPath.indexOf(linkRoot) !== 0) {
          linkPath = linkRoot + linkPath.replace(/^\//, '');
        }
      } else {
        linkPath = linkRoot + linkPath;
      }
      link.href = linkPath;

      var media = document.createElement('div');
      media.className = 'kt-recently-viewed__media';
      if (product.featured_image) {
        var img = document.createElement('img');

        var imgSrc = product.featured_image;
        if (imgSrc.indexOf('?') > -1) {
          imgSrc = imgSrc.split('?')[0];
        }
        img.src = imgSrc + '?width=400';
        img.srcset = imgSrc + '?width=200 200w, ' + imgSrc + '?width=400 400w, ' + imgSrc + '?width=600 600w';
        img.sizes = '(min-width: 750px) 25vw, 50vw';
        img.loading = 'lazy';
        img.width = 200;
        img.height = 200;
        img.alt = product.title || '';
        img.className = 'kt-recently-viewed__image';
        media.appendChild(img);
      }
      link.appendChild(media);

      var text = document.createElement('div');
      text.className = 'kt-recently-viewed__text';

      var title = document.createElement('p');
      title.className = 'kt-recently-viewed__title-text';
      title.textContent = product.title || '';
      text.appendChild(title);

      if (typeof product.price !== 'undefined') {
        var price = document.createElement('p');
        price.className = 'kt-recently-viewed__price';

        if (window.Kitchero && typeof window.Kitchero.formatMoney === 'function') {
          price.textContent = window.Kitchero.formatMoney(product.price);
        } else {
          var amount = (product.price / 100);
          var currency = (window.Shopify && window.Shopify.currency && window.Shopify.currency.active) || 'USD';
          var locale = (document.documentElement.lang || 'en').replace('_', '-');
          try {
            price.textContent = new Intl.NumberFormat(locale, {
              style: 'currency',
              currency: currency,
            }).format(amount);
          } catch (e) {
            try {
              price.textContent = new Intl.NumberFormat('en', {
                style: 'currency',
                currency: currency,
              }).format(amount);
            } catch (e2) {
              price.textContent = amount.toFixed(2);
            }
          }
        }
        text.appendChild(price);
      }

      link.appendChild(text);
      card.appendChild(link);
      return card;
    }

    function isDesignMode() {
      return !!(window.Shopify && window.Shopify.designMode);
    }

    function renderEditorHint(section, grid, message) {
      grid.innerHTML = '';
      grid.setAttribute('aria-busy', 'false');
      var hint = document.createElement('div');
      hint.className = 'kt-recently-viewed__editor-hint';
      hint.setAttribute('role', 'note');
      hint.textContent = message;
      grid.appendChild(hint);
      section.removeAttribute('hidden');
    }

    function renderSection(section) {
      var grid = section.querySelector('[data-recently-viewed-grid]');
      if (!grid) return;

      var maxProducts = parseInt(section.getAttribute('data-max-products'), 10) || 8;
      var currentId = section.getAttribute('data-current-product-id');
      var history = readHistory();

      if (window.location.pathname.match(/\/products\//)) {
        var currentHandle = window.location.pathname.match(/\/products\/([^/?#]+)/);
        if (currentHandle && currentHandle[1]) {
          history = history.filter(function (h) { return h !== currentHandle[1]; });
        }
      }

      if (history.length === 0) {
        if (isDesignMode()) {
          renderEditorHint(
            section,
            grid,
            'Recently viewed products will appear here once customers browse a few product pages. Open one or two products in this preview to populate the rail.'
          );
        }
        return;
      }

      var fetchHandles = history.slice(0, maxProducts + 2);

      Promise.all(fetchHandles.map(fetchProduct)).then(function (products) {
        var valid = products.filter(function (p) {
          if (!p) return false;
          if (currentId && String(p.id) === String(currentId)) return false;
          return true;
        }).slice(0, maxProducts);

        if (valid.length === 0) {
          if (isDesignMode()) {
            renderEditorHint(
              section,
              grid,
              'Recently viewed list has entries but none of those products could be loaded. They may have been deleted or set to draft. Visit a fresh product to refresh the rail.'
            );
          }
          return;
        }

        grid.innerHTML = '';
        grid.setAttribute('aria-busy', 'false');
        valid.forEach(function (product) {
          var card = buildCard(product);
          if (card) grid.appendChild(card);
        });

        section.removeAttribute('hidden');
      });
    }

    function init() {
      trackCurrentProduct();

      var sections = document.querySelectorAll('[data-recently-viewed]');
      sections.forEach(renderSection);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
      init();
    }

    document.addEventListener('shopify:section:load', function (e) {
      if (!e.target) return;
      var section = e.target.querySelector('[data-recently-viewed]');
      if (section) renderSection(section);
    });

    document.addEventListener('shopify:section:unload', function (e) {
      if (!e.target) return;
    });
  })();
}
