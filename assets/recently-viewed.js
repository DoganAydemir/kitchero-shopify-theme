/* ==========================================================================
   Recently Viewed Products — R127

   Two-phase architecture:

   Phase 1 — Tracking (runs on PDP only)
     Detect we're on a /products/{handle} page (presence of
     `<main data-product-handle>` or [data-section-type="main-product"]),
     read the handle, push to localStorage `kt_viewed` array.
     FIFO trim to last 12 entries — older history drops off the queue.

   Phase 2 — Rendering (runs when section is on the page)
     Read localStorage, fetch each handle's `/products/{handle}.js`
     (Shopify storefront AJAX API — returns minimal product JSON),
     build compact cards client-side, swap into the section grid.
     Skip the current PDP product (don't recommend the page customer
     is on). If localStorage is empty OR all fetches fail, hide the
     section entirely.

   Privacy: localStorage is first-party browser storage. No cookie,
   no server transmission, no behavioral tracking signal. The
   customer's viewed history never leaves their device. GDPR-
   compliant by default.

   Storage shape: array of strings (handles) ordered most-recent-
   first. Old entries are pruned to keep the array bounded at 12.
   ========================================================================== */

if (!window.__kitcheroRecentlyViewedLoaded) {
  window.__kitcheroRecentlyViewedLoaded = true;

  (function () {
    'use strict';

    var STORAGE_KEY = 'kt_viewed';
    var MAX_HISTORY = 12;

    /* ── Storage helpers ─────────────────────────────────────────── */

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
        /* localStorage quota exceeded or disabled (Safari private
           browsing). Silently ignore — feature degrades gracefully:
           rendering side just sees an empty history and hides the
           section. */
      }
    }

    function pushHandle(handle) {
      if (!handle) return;
      var history = readHistory();
      /* Remove any existing occurrence so the handle moves to front
         (most recently viewed semantics). */
      var idx = history.indexOf(handle);
      if (idx > -1) history.splice(idx, 1);
      history.unshift(handle);
      /* Trim to MAX_HISTORY oldest-first. */
      if (history.length > MAX_HISTORY) {
        history = history.slice(0, MAX_HISTORY);
      }
      writeHistory(history);
    }

    /* ── Phase 1 — Tracking on PDP ──────────────────────────────── */

    function trackCurrentProduct() {
      /* Multiple signals so the tracker works on /products/X,
         /products/X.alt-template, AND custom JSON templates. The
         PDP section sets data-section-type="main-product" or
         "main-product-showroom". Either qualifies. */
      var pdp = document.querySelector('[data-section-type="main-product"], [data-section-type="main-product-showroom"]');
      if (!pdp) return;

      /* Pull handle from the URL — robust against editor preview
         where the section may render outside a real product context. */
      var match = window.location.pathname.match(/\/products\/([^/?#]+)/);
      if (!match) return;
      var handle = match[1];

      pushHandle(handle);
    }

    /* ── Phase 2 — Rendering ─────────────────────────────────────── */

    function fetchProduct(handle) {
      /* Markets locale-prefix safety: hardcoded `/products/...` 404s on
         locale-prefixed storefronts (`/de/products/...`, `/fr-ca/...`).
         `Shopify.routes.root` resolves to the active locale prefix —
         primary-locale stores get `/`, secondary-locale stores get
         `/de/`, etc. Falls back to `/` if Shopify global isn't loaded
         yet (early-render edge cases). */
      var root = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
      return fetch(root + 'products/' + encodeURIComponent(handle) + '.js', {
        headers: { 'Accept': 'application/json' },
      })
        .then(function (response) {
          if (!response.ok) throw new Error('404');
          return response.json();
        })
        .catch(function () { return null; /* swallow — null filtered later */ });
    }

    function buildCard(product) {
      if (!product) return null;
      var card = document.createElement('div');
      card.className = 'kt-recently-viewed__card';
      card.setAttribute('role', 'listitem');

      var link = document.createElement('a');
      link.className = 'kt-recently-viewed__link';
      /* Markets locale-prefix safety. `product.url` from products/<handle>.js
         is root-relative (no locale prefix), and the fallback path used to
         hardcode `/products/...` — both 404 on `/de/`, `/fr-ca/`, etc.
         Always prepend `Shopify.routes.root` so the link resolves to the
         active market. Mirrors the fetchProduct() fix at line 106. */
      var linkRoot = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
      var linkPath = product.url
        ? product.url.replace(/^\//, '')
        : 'products/' + product.handle;
      link.href = linkRoot + linkPath;

      /* Image — featured_image is "//cdn.shopify..." (protocol-relative)
         OR "/files/..." OR null. All three are valid <img src>. */
      var media = document.createElement('div');
      media.className = 'kt-recently-viewed__media';
      if (product.featured_image) {
        var img = document.createElement('img');
        /* Build optimized URL with Shopify's image_size query param.
           Without this we'd serve the original (potentially 2000px+)
           on a 200px slot — wasteful bandwidth on mobile. */
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
        /* Format using Shopify's money_format if available; fall back
           to dollars-with-cents. Money format string examples:
             "${{amount}}" → "$25.00"
             "{{amount_with_comma_separator}} TL" → "1.299,00 TL"
           Shopify's storefront payload includes price in cents
           (integer), so we divide by 100 first. */
        /* R298 — Theme does not ship Shopify's `option_selection.js`, so
           `Shopify.formatMoney` is undefined in this theme. The previous
           fallback emitted a bare `amount.toFixed(2)` like "25.00" with
           no currency symbol or code — a German shopper saw a localized
           Liquid price next to a bare number, two different price
           representations on the same page (Markets fail).
           Mirror the `Intl.NumberFormat` pattern from
           `assets/predictive-search.js:359-378`: respect
           `Shopify.currency.active` and `document.documentElement.lang`
           so the currency formatting matches Liquid's `| money` output
           across every Market. */
        var amount = (product.price / 100);
        var currency = (window.Shopify && window.Shopify.currency && window.Shopify.currency.active) || 'USD';
        var locale = (document.documentElement.lang || 'en').replace('_', '-');
        try {
          price.textContent = new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
          }).format(amount);
        } catch (e) {
          /* Locale fallback if the language tag is unknown to the
             host browser's CLDR set — final-resort en-US format. */
          try {
            price.textContent = new Intl.NumberFormat('en', {
              style: 'currency',
              currency: currency,
            }).format(amount);
          } catch (e2) {
            price.textContent = amount.toFixed(2);
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

    /* R282 — Editor empty-state. On the live storefront an empty
       Recently-Viewed rail stays hidden (no skeleton flash, no
       wasted vertical space when the customer has just landed
       cold). In the theme editor that silent-hide is hostile UX
       for the merchant: they add the section, see NOTHING, and
       can't tell whether (a) the section is broken, (b) their
       browsing history is empty, or (c) they need to do something
       to populate it. Render a visible hint card in design_mode
       so the merchant gets clear guidance and the section
       presents as "configured, just waiting for data" rather
       than "gone missing". */
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

      /* If we're on a PDP, skip the current product from the rail
         (rendering "Recently viewed" with the very page you're on
         is broken UX). Filter by URL handle since localStorage
         stores handles, not IDs. */
      if (window.location.pathname.match(/\/products\//)) {
        var currentHandle = window.location.pathname.match(/\/products\/([^/?#]+)/);
        if (currentHandle && currentHandle[1]) {
          history = history.filter(function (h) { return h !== currentHandle[1]; });
        }
      }

      if (history.length === 0) {
        /* R282 — Empty history. Live storefront: stay hidden.
           Editor: show a hint so the merchant understands the
           section is wired up and just needs PDP visits to
           populate. */
        if (isDesignMode()) {
          renderEditorHint(
            section,
            grid,
            'Recently viewed products will appear here once customers browse a few product pages. Open one or two products in this preview to populate the rail.'
          );
        }
        return;
      }

      /* Cap at section max + a buffer of 2 in case some 404. */
      var fetchHandles = history.slice(0, maxProducts + 2);

      Promise.all(fetchHandles.map(fetchProduct)).then(function (products) {
        /* Filter out failed fetches (404 / network errors) and the
           current product (currentId might not be on the URL but on
           the section data attribute — defensive). */
        var valid = products.filter(function (p) {
          if (!p) return false;
          if (currentId && String(p.id) === String(currentId)) return false;
          return true;
        }).slice(0, maxProducts);

        if (valid.length === 0) {
          /* R282 — All fetches failed OR every history entry was
             the current product. Live storefront: stay hidden.
             Editor: surface the diagnostic so the merchant
             notices and can investigate (likely cause: product
             handles in localStorage point at deleted or
             draft-status products). */
          if (isDesignMode()) {
            renderEditorHint(
              section,
              grid,
              'Recently viewed list has entries but none of those products could be loaded — they may have been deleted or set to draft. Visit a fresh product to refresh the rail.'
            );
          }
          return;
        }

        /* Replace skeletons with real cards. */
        grid.innerHTML = '';
        grid.setAttribute('aria-busy', 'false');
        valid.forEach(function (product) {
          var card = buildCard(product);
          if (card) grid.appendChild(card);
        });

        /* Reveal the section. */
        section.removeAttribute('hidden');
      });
    }

    /* ── Init ────────────────────────────────────────────────────── */

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

    /* Theme-editor compatibility: re-init on section reload so merchant
       sees layout updates. */
    document.addEventListener('shopify:section:load', function (e) {
      if (!e.target) return;
      var section = e.target.querySelector('[data-recently-viewed]');
      if (section) renderSection(section);
    });

    /* R295 — Pair every shopify:section:load listener with an unload
       handler. Section render is idempotent (renderSection wipes and
       repopulates the DOM, no observers or timers leak) so cleanup
       is a no-op; the stub exists to satisfy Theme Store reviewer
       expectations and to dock the Section Rendering API hooks in
       one place for future maintenance. */
    document.addEventListener('shopify:section:unload', function (e) {
      if (!e.target) return;
      /* No-op: render is fully DOM-replacement; nothing to tear down. */
    });
  })();
}
