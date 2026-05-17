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

    /* Section-Rendering-API refresh AbortController. The per-line
       `inflight` lock above coalesces same-key changes; this controller
       cancels overlapping refreshCartPage() calls when DIFFERENT line
       keys mutate in quick succession. Without it, the slower refresh
       resolves last and paints a stale cart page over the fresh one. */
    var refreshAbort = null;

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
          /* R88 — parse Shopify's 422 error body so the customer
             sees the specific reason ("All 3 in stock", "Maximum
             quantity exceeded", etc.) instead of the generic
             "Unable to update cart". Mirrors the cart-drawer
             pattern at cart-drawer.js:331-369. */
          if (response.status === 422) {
            return response.json().then(function (body) {
              var msg = (body && (body.description || body.message)) || 'Cart change failed';
              var cartError = new Error(msg);
              cartError.handled = true;
              throw cartError;
            });
          }
          if (!response.ok) throw new Error('Cart change failed: ' + response.status);
          return response.json();
        })
        .then(function () {
          return refreshCartPage();
        })
        .catch(function (error) {
          /* Previously this hard-reloaded on ANY fetch failure — including
             transient 503 / flaky mobile. On 3G the entire cart page would
             flash white, scroll position would reset, and any unsaved
             qty/note the user typed would vanish. Instead: surface the
             error via the assertive announcer + revert the row's visual
             loading state. The user can retry the qty change from the
             rolled-back UI state.

             R138 CART-422-1: previously this announced ONLY the generic
             "Unable to update cart" string, even when the response
             carried a specific Shopify 422 reason ("All 3 in stock",
             "Maximum quantity exceeded", "Adjusted from 5 to 3 because
             of stock") classified as `error.handled` on line 71. Cart
             page lost the specific reason while the cart-drawer (per
             cart-drawer.js:343-369) surfaced it correctly — page
             customers got worse error UX than drawer customers for the
             same Shopify response. Branch on `error.handled`: when
             true, the message is Shopify-localized + customer-relevant,
             use it directly as the announcement string AND paint the
             same text into the inline error region for sighted users. */
          var errMsg = (error && error.message) || '';
          var isShopifyMsg = !!(error && error.handled);
          if (!isShopifyMsg) {
            console.error(error);
          }
          if (row) {
            row.style.opacity = '';
            row.style.pointerEvents = '';
          }
          /* Inline error region — sighted-user feedback parity with
             the drawer's `data-cart-drawer-error` slot. The cart page
             already exposes a `[data-cart-page-error]` region (see
             sections/main-cart.liquid); reveal it with the message
             when present. Fallback: skip silently if the slot
             doesn't exist on this template render. */
          var pageErrorSlot = document.querySelector('[data-cart-page-error]');
          if (pageErrorSlot) {
            pageErrorSlot.textContent = isShopifyMsg && errMsg
              ? errMsg
              : ((Kitchero.cartStrings && Kitchero.cartStrings.error) || 'Unable to update cart.');
            pageErrorSlot.hidden = false;
            /* Auto-clear the inline error after 6s so it doesn't
               persist forever after the customer has read + retried. */
            clearTimeout(pageErrorSlot._kitcheroClearTimer);
            pageErrorSlot._kitcheroClearTimer = setTimeout(function () {
              pageErrorSlot.hidden = true;
              pageErrorSlot.textContent = '';
            }, 6000);
          }
          if (window.Kitchero && typeof Kitchero.announce === 'function') {
            /* Urgency must be the string 'assertive' — object form is
               not recognized by global.js announce(). Wrong form landed
               cart errors on the polite announcer, which SRs don't
               interrupt speech for. */
            var announceMsg = isShopifyMsg && errMsg
              ? errMsg
              : ((Kitchero.cartStrings && Kitchero.cartStrings.error) || 'Unable to update cart.');
            Kitchero.announce(announceMsg, 'assertive');
          }
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
      /* R-sra-cart-count — Always include `header-cart-icon` in the
         Section Rendering API fetch. The previous DOM-presence gate
         (`[data-section-type="header-cart-icon"]`) never matched
         anything because `sections/header-cart-icon.liquid` is an
         SRA-only endpoint (intentionally not rendered into any
         section group), so the section response excluded the cart-
         count fragment. Downstream at `applySectionsHTML`,
         `doc.querySelector('.kt-header__cart-count')` then returned
         null and the else branch zeroed every live cart-count badge
         in the header — a permanent visual lie on cart-page mode
         (drawer mode self-corrected via cart-drawer.js's own refresh,
         leaving only a brief "0" flicker). SRA only requires the
         section file to exist, which it does; always-include is
         safe. The append in `applySectionsHTML` already handles
         missing keys gracefully if the section is renamed/removed. */
      var sectionsToFetch = ['main-cart', 'header-cart-icon'];
      if (document.querySelector('.kt-cart-drawer')) sectionsToFetch.push('cart-drawer');

      /* Cancel any prior in-flight refresh so the latest one wins.
         Two rapid +/- on different line keys would otherwise yield
         two overlapping section-fetches and the slower one painting
         last over the fresh one. */
      if (refreshAbort) {
        try { refreshAbort.abort(); } catch (_) { /* ignore */ }
      }
      refreshAbort = new AbortController();

      /* Use Shopify.routes.root so that on Markets storefronts the
         locale prefix (`/de/`, `/fr/`, `/es/`, `/tr/`) is preserved.
         A bare `/` would redirect to the default-locale section snippet
         and the returned currency/format strings would mismatch the
         displayed page. Mirrors cart-drawer.js. */
      var rootUrl = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
      return fetch(rootUrl + '?sections=' + sectionsToFetch.join(','), {
        headers: { 'Accept': 'application/json' },
        signal: refreshAbort.signal,
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

          /* Swap the whole cart page section. Same note-preservation
             pattern as cart-drawer.js: capture transient typed input
             before innerHTML swap (server's value would clobber an
             unsubmitted note mid-typing), restore after if the server
             didn't itself save a different note in another tab. */
          var current = document.querySelector('.kt-cart-page');
          var next = doc.querySelector('.kt-cart-page');
          if (current && next) {
            var noteEl = current.querySelector('[name="note"]');
            var preservedNote = noteEl ? noteEl.value : null;
            var serverNote = next.querySelector('[name="note"]');
            var serverNoteValue = serverNote ? serverNote.value : '';

            current.innerHTML = next.innerHTML;

            if (preservedNote && !serverNoteValue) {
              var restoredNote = current.querySelector('[name="note"]');
              if (restoredNote) restoredNote.value = preservedNote;
            }
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
             never diverge. refreshDrawer() has its own inner fetch —
             on a transient network blip while the cart-page refresh
             already succeeded, its rejection becomes an unhandled
             promise rejection which leaks to the console. Silence it
             with a terminal `.catch` — page is already in a good
             state; drawer will auto-resync on next user action. */
          var drawer = (window.Kitchero && window.Kitchero.cartDrawer) || window.kitcheroCartDrawer;
          if (drawer && typeof drawer.refreshDrawer === 'function') {
            var drawerRefresh = drawer.refreshDrawer();
            if (drawerRefresh && typeof drawerRefresh.catch === 'function') {
              drawerRefresh.catch(function () { /* swallow — cart page already refreshed */ });
            }
          }
        })
        .catch(function (error) {
          /* AbortError = a newer refreshCartPage() superseded this one;
             not a real failure. Silently swallow. Other errors stay
             noisy so they surface in the console for debugging. */
          if (error && error.name === 'AbortError') return;
          console.error('refreshCartPage:', error);
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
