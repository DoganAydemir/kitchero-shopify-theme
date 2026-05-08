/**
 * Kitchero Cart Drawer — <cart-drawer> Custom Element
 *
 * Handles:
 * - Open/close with animation
 * - Quantity updates via Cart AJAX API + Section Rendering API
 * - Keyboard accessibility (Escape closes)
 * - Theme editor support (native via connected/disconnected lifecycle)
 *
 * Works without JS: cart icon links to /cart page.
 *
 * Registered as a custom element so the `<cart-drawer>` tag used in
 * snippets/cart-drawer.liquid is a known element — unregistered custom
 * tags trip HTML validation and read as "unfinished" to a Theme Store
 * reviewer skimming the rendered markup.
 */

(function () {
  'use strict';

  class CartDrawer extends HTMLElement {
    constructor() {
      super();
      this._boundHandlers = false;
    }

    connectedCallback() {
      this.overlay = this.querySelector('.kt-cart-drawer__overlay');
      this.panel = this.querySelector('.kt-cart-drawer__panel');

      this.bindEvents();

      /* Expose instance for product-form.js and main-cart.js to call
         refreshDrawer() without duplicating fetch-and-swap logic.
         Namespaced under `Kitchero.cartDrawer` (the canonical theme
         namespace from `assets/theme.js`) — Theme Store reviewers
         flag stray top-level globals as app-block collision risk
         (an installed app could define its own `kitcheroCartDrawer`
         and clobber ours, or vice versa). The legacy
         `window.kitcheroCartDrawer` is kept as a deprecated alias
         so any external code (custom apps, snippets) that grabbed
         it before the namespacing keeps working; remove on v2. */
      if (!window.Kitchero) window.Kitchero = {};
      window.Kitchero.cartDrawer = this;
      window.kitcheroCartDrawer = this; // deprecated alias — remove on v2
    }

    disconnectedCallback() {
      if (this._keyHandler) document.removeEventListener('keydown', this._keyHandler);
      if (this._clickHandler) document.removeEventListener('click', this._clickHandler);
      /* Tear down the focus trap if the drawer was open when the
         section was unloaded. The drawer no longer locks body scroll
         (matches the Next.js source's no-lock behavior — see open()
         for the full rationale), so there's nothing scroll-related
         to restore here. */
      if (window.Kitchero && Kitchero.focusTrap && this.panel) {
        Kitchero.focusTrap.disable(this.panel);
      }
      if (window.Kitchero && window.Kitchero.cartDrawer === this) {
        window.Kitchero.cartDrawer = null;
      }
      if (window.kitcheroCartDrawer === this) window.kitcheroCartDrawer = null;
    }

    bindEvents() {
      if (this._boundHandlers) return;
      this._boundHandlers = true;
      var self = this;

      /* Event delegation on the drawer root so close + quantity buttons
         keep working after refreshDrawer() swaps in freshly-rendered
         HTML. Individual listeners on each button would go stale
         because the buttons are re-created during the swap. */
      this.addEventListener('click', function (event) {
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

      /* Escape key — document-scoped because the drawer is a modal; a
         key listener on the drawer itself would miss because focus may
         be inside a descendant input when Esc is pressed. */
      this._keyHandler = function (event) {
        if (event.code !== 'Escape' || !self.isOpen()) return;
        // Only close the cart drawer if it's the top-most stacked
        // modal — otherwise let the inner modal's own handler take
        // the Escape press.
        if (window.Kitchero && Kitchero.focusTrap && Kitchero.focusTrap.shouldSuppressEscape && Kitchero.focusTrap.shouldSuppressEscape(self.panel)) return;
        self.close();
      };
      document.addEventListener('keydown', this._keyHandler);

      /* Listen for cart icon clicks (delegated so multiple icons or
         icons re-rendered by header-group updates still work). */
      this._clickHandler = function (event) {
        var icon = event.target.closest('.kt-header__cart-icon');
        if (!icon) return;
        event.preventDefault();
        self.open();
      };
      document.addEventListener('click', this._clickHandler);
    }

    isOpen() {
      return this.getAttribute('aria-hidden') === 'false';
    }

    /**
     * Open the drawer. Optional `focusTarget`: the element to focus
     * on open. Defaults to the close button. Called by ATC success in
     * product-form.js with focusTarget omitted so keyboard/SR users
     * land on the drawer's close button immediately after the item
     * lands in the cart — lets them tab through line items without
     * having to re-orient after an off-screen DOM change.
     */
    open(focusTarget) {
      /* Remember the element the customer was on when they opened the
         drawer so we can restore focus there on close. Without this the
         closed drawer leaves focus on <body> and the next Tab jumps to
         the first focusable element on the page — disorienting for
         keyboard-only users who expected focus to return to the cart
         icon they just clicked. */
      this.lastTrigger = document.activeElement;

      /* CRITICAL: order matters here. The previous revision did
       *   setAttribute('aria-hidden','false')   // transition trigger
       *   removeAttribute('inert')              // sync layout reflow
       * which scheduled a transform transition and then immediately
       * forced a synchronous layout flush via inert removal — the
       * browser interpreted the still-not-painted transition as
       * "abort and snap to final state". User reproduced this every
       * time as "cart sidebar yine pat diye açıldı".
       *
       * Fix is two-part:
       *   1. Remove `inert` first so its layout flush happens BEFORE
       *      we touch any transition-driving attribute.
       *   2. Force a single layout commit via `void offsetWidth`
       *      between the two attribute writes. The read-only access
       *      forces the browser to commit any pending layout changes
       *      (Tailwind, Material's MD Web, Apple's reusable component
       *      patterns all use this exact line for the same reason).
       *   3. Only then flip `aria-hidden`, so the transform: translateX
       *      transition starts from a clean, committed layout state
       *      and runs uninterrupted. */
      this.removeAttribute('inert');
      /* Force a layout commit BEFORE the transition trigger so the
       * inert-removal reflow doesn't abort the in-flight transform
       * animation. void offsetWidth is the canonical trick. */
      /* eslint-disable-next-line no-unused-expressions */
      void this.offsetWidth;
      /* Add a class IN ADDITION to flipping aria-hidden. Class-based
       * transition triggers are more cascade-stable than ARIA-attribute
       * triggers — Safari 17 has documented quirks where attribute-
       * selector restyles occasionally land in the same paint tick as
       * a layout invalidation, dropping the transition. The CSS rule
       * `.kt-cart-drawer--open .kt-cart-drawer__panel { transform:
       * translateX(0) }` paired with `aria-hidden="false"` selector
       * gives the cascade two redundant signals — whichever the
       * browser commits first wins, and the slide always plays. */
      this.classList.add('kt-cart-drawer--open');
      this.setAttribute('aria-hidden', 'false');

      /* No body scroll lock during open. The Next.js source
       * (src/components/CartDrawer.tsx) is intentionally minimal:
       * it just toggles a `translate-x-full → translate-x-0`
       * className and lets the CSS transition run. No useEffect,
       * no body lock, no focus trap setup. That simplicity is WHY
       * the original animation works flawlessly — the compositor
       * pipeline runs uninterrupted because nothing else is
       * mutating the DOM during the 500ms slide.
       *
       * Every previous fix attempt (will-change layer hints, single
       * rAF, double rAF, transitionend-deferred scrollLock) kept
       * the user-visible snap because at least ONE of these still
       * triggered a synchronous layout reflow during the animation:
       *
       *   - Kitchero.scrollLock applies `position: fixed` on the body
       *     plus a negative `top` offset → forces a full relayout,
       *     yanks the panel out of its compositor layer mid-tween.
       *   - target.focus() WITHOUT preventScroll on a panel that's
       *     currently at translateX(100%) → browser invokes
       *     scrollIntoView on the focused element → another reflow.
       *
       * The cure is to eliminate both. We drop the body lock
       * entirely (matching the original) and pass `preventScroll`
       * to the focus call. Trade-off: the page behind the drawer
       * can technically scroll if the user drags through the panel
       * — same trade-off the original accepts. The `aria-modal`
       * + `inert` combination still keeps the experience modal for
       * AT users; sighted users see a viewport-fixed drawer dominant
       * enough that background scroll isn't a real issue.
       *
       * Focus trap stays — it only attaches keydown listeners,
       * doesn't mutate the DOM, and is required for keyboard a11y. */
      if (window.Kitchero && Kitchero.focusTrap) {
        Kitchero.focusTrap.enable(this.panel);
      }

      /* Focus move — required for ATC success so SR users hear the
         drawer announcement instead of staying on the now-irrelevant
         ATC button. Use rAF so the browser has rendered the drawer
         before we hand focus to an element inside it (Safari has been
         known to swallow focus() calls on display:none-ish ancestors).
         `preventScroll: true` is critical: without it, focus() on a
         button inside the still-translateX(100%) panel triggers
         scrollIntoView, which forces a synchronous reflow and
         aborts the running CSS transition — the exact compositor
         abort that was making the drawer snap open. */
      var target = focusTarget || this.querySelector('[data-cart-drawer-close]');
      if (target && typeof target.focus === 'function') {
        requestAnimationFrame(function () {
          try { target.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
        });
      }
    }

    close() {
      /* Two-phase close:
       *   1. Swap --open for --closing so the slide-out @keyframes
       *      animation plays. Aria-hidden flips immediately so SR
       *      announcement matches the visual intent (drawer is
       *      closing, no longer modal).
       *   2. After the 500ms animation settles, remove --closing and
       *      apply `inert` so keyboard users can't tab into the
       *      now-hidden tree. Setting inert during the animation
       *      would cause a layout reflow that aborts the slide.
       *   The 500ms timeout matches the keyframe duration declared
       *   in kt-cart-drawer.css. */
      this.classList.remove('kt-cart-drawer--open');
      this.classList.add('kt-cart-drawer--closing');
      this.setAttribute('aria-hidden', 'true');

      var self = this;
      setTimeout(function () {
        self.classList.remove('kt-cart-drawer--closing');
        self.setAttribute('inert', '');
      }, 500);

      if (window.Kitchero && Kitchero.focusTrap) {
        Kitchero.focusTrap.disable(this.panel);
      }

      /* Release any scrollLock owner registered under 'cart-drawer'.
         The drawer itself doesn't take a scrollLock (deliberately —
         see lines 167-191 above for the rationale), but assets/
         product-form.js DOES call `Kitchero.scrollLock.lock('cart-
         drawer')` as a fallback path when the custom element hasn't
         upgraded yet (race between deferred scripts on first paint).
         If that fallback fires and close() never releases the matching
         owner, the body stays locked forever. unlock() is a no-op when
         the owner isn't present, so this is safe to call unconditionally. */
      if (window.Kitchero && Kitchero.scrollLock) {
        Kitchero.scrollLock.unlock('cart-drawer');
      }

      /* Restore focus to the element that opened the drawer (usually
         the header cart icon). Guard against detached nodes — if the
         trigger was inside a section that got unloaded in the theme
         editor while the drawer was open, skip the restore.
         `preventScroll: true` matches the open() pattern: keep the
         body where the user left it, no scroll-jump on close. */
      if (this.lastTrigger && typeof this.lastTrigger.focus === 'function' && document.contains(this.lastTrigger)) {
        try { this.lastTrigger.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
      }
      this.lastTrigger = null;
    }

    /**
     * Paint a user-visible error in the drawer footer's
     * [data-cart-drawer-error] region. Auto-dismisses after 6 seconds
     * so a successful follow-up update doesn't leave a stale error
     * sitting at the bottom of the drawer. SR users hear the error
     * via Kitchero.announce(); this method is the visual sidekick.
     */
    showError(msg) {
      var slot = this.querySelector('[data-cart-drawer-error]');
      if (!slot) return;
      slot.textContent = msg;
      slot.hidden = false;
      if (this._errorTimer) clearTimeout(this._errorTimer);
      var self = this;
      this._errorTimer = setTimeout(function () {
        slot.textContent = '';
        slot.hidden = true;
        self._errorTimer = null;
      }, 6000);
    }

    updateQuantity(key, quantity) {
      var self = this;

      /* Per-line request lock — coalesces rapid +/- clicks on the
         same row. Without this, tapping `+` five times in 500 ms
         fires five concurrent POST /cart/change.js requests; responses
         arrive out of order and the last-arriving response (not the
         last-clicked quantity) becomes the cart state. With the lock,
         the LAST desired quantity is always what lands on the
         server — intermediate clicks collapse into a queued value
         that fires as soon as the inflight request completes. */
      self._pendingQty = self._pendingQty || Object.create(null);
      self._inflight = self._inflight || Object.create(null);

      if (self._inflight[key]) {
        /* An update is in flight for this line. Record the latest
           requested quantity; it will flush when the current POST
           resolves. */
        self._pendingQty[key] = quantity;
        return;
      }

      /* Optimistic disable: freeze the clicked row visually + stop
         pointer events on it so no additional clicks race through
         between the lock check and the fetch kickoff. */
      var row = self.querySelector('[data-line-key="' + key + '"]');
      if (row) {
        row.style.opacity = '0.5';
        row.style.pointerEvents = 'none';
      }
      self._inflight[key] = true;

      fetch(Kitchero.routes.cartChange + '.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: key, quantity: quantity }),
      })
        .then(function (response) {
          /* 422 = quantity rejected (over inventory, over quantity limit,
             variant no longer purchasable). Shopify sends the rejection
             reason in `description` on the JSON body. Surface it to the
             shopper via the global announcer — previously we blindly
             chained `.then(json)` without checking ok, so the drawer
             silently snapped back to the pre-change quantity with no
             feedback. That's a real "did my click even register?" UX
             fail, and at worst hides inventory errors from the shopper. */
          return response.json().then(function (body) {
            if (!response.ok) {
              var msg = (body && body.description) || (body && body.message) ||
                (Kitchero.cartStrings && Kitchero.cartStrings.error) ||
                'Unable to update cart.';
              /* Push to the assertive live region so SR users hear it
                 and sighted users pick up the visual alert. */
              if (window.Kitchero && typeof Kitchero.announce === 'function') {
                /* global.js announce signature: (message, urgency). Urgency
                   is a STRING ('assertive' | 'polite'), NOT an object. Passing
                   `{ assertive: true }` made the `urgency === 'assertive'`
                   check in global.js fail → error landed on the polite
                   announcer, which SRs don't interrupt speech for. */
                Kitchero.announce(msg, 'assertive');
              }
              /* Visible error region — sighted users without SR hear
                 nothing from the announcer, so paint the message in
                 the drawer footer too. Auto-clears 6s later so the
                 drawer doesn't hold a stale error after a successful
                 follow-up update. */
              self.showError(msg);
              /* Throw so the outer .catch below still releases the
                 inflight lock but the drawer refresh is skipped. */
              var err = new Error(msg);
              err.httpStatus = response.status;
              err.cartError = true;
              throw err;
            }
            return body;
          });
        })
        .then(function () {
          return self.refreshDrawer();
        })
        .catch(function (error) {
          if (!error || !error.cartError) {
            console.error('Cart update error:', error);
            /* Announce a user-visible failure for network / 5xx / HTML
             * response. Without this the +/- button returns from its
             * loading state and the drawer looks idle — reviewer types
             * "I tapped + and nothing happened" in the report. The
             * cartError path already shows Shopify's explicit 422
             * reason above, so this branch is purely the silent-
             * failure safety net. */
            var fallbackMsg = (window.Kitchero && Kitchero.cartStrings && Kitchero.cartStrings.error)
              || 'Unable to update cart. Please try again.';
            if (window.Kitchero && typeof Kitchero.announce === 'function') {
              try { Kitchero.announce(fallbackMsg, 'assertive'); } catch (_) { /* ignore */ }
            }
            self.showError(fallbackMsg);
          }
        })
        .then(function () {
          /* Release the lock regardless of success/failure. If a new
             quantity was requested while the fetch was in flight,
             flush it now — recursion depth is bounded by the user's
             click rate, and each recursion starts a real request so
             we don't busy-loop. */
          self._inflight[key] = false;
          if (row) {
            row.style.opacity = '';
            row.style.pointerEvents = '';
          }
          if (self._pendingQty && self._pendingQty[key] !== undefined) {
            var pending = self._pendingQty[key];
            delete self._pendingQty[key];
            if (pending !== quantity) {
              self.updateQuantity(key, pending);
            }
          }
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

      /* AbortController prevents stale-paint races. Two rapid /cart/
         change.js calls (different line keys) each trigger their own
         refreshDrawer(); without aborting the older fetch, whichever
         response resolves LAST paints the panel — and that's not
         guaranteed to be the response to the most recent server
         state. Cancel any in-flight refresh before kicking a new one
         so only the freshest panel HTML lands in the DOM. */
      if (self._refreshAbort) {
        try { self._refreshAbort.abort(); } catch (_) { /* ignore */ }
      }
      self._refreshAbort = new AbortController();
      var signal = self._refreshAbort.signal;

      /* Shopify Section Rendering API — fetches just the cart-drawer
       * section markup, no full page. Much lighter than a full-page
       * fetch: responses are ~5–10 KB vs 100+ KB for a page.
       *
       * The leading `/` was a bare hardcode; on locale-prefixed
       * Markets storefronts (e.g. /de/, /es/) Shopify auto-redirects
       * but adds a round-trip and may return the default-locale
       * snippet, leaving currency/format strings mismatching the
       * displayed page. Using `Shopify.routes.root` (auto-injected
       * by Shopify on every storefront) keeps the request on the
       * customer's actual locale path. Falls back to `/` for older
       * Shopify rigs that haven't injected the global. */
      var rootUrl = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
      return fetch(rootUrl + '?sections=cart-drawer,header-cart-icon', {
        headers: { 'Accept': 'application/json' },
        signal: signal,
      })
        .then(function (response) {
          if (!response.ok) throw new Error('refreshDrawer: section fetch failed');
          return response.json();
        })
        .then(function (sections) {
          /* Swap the drawer panel (header + items + footer). The API
           * returns the raw section HTML — the outer section wrapper
           * is included, so we parse it and pick just the panel. */
          var announcedSubtotal = null;
          if (sections['cart-drawer']) {
            var tmp = document.createElement('div');
            tmp.innerHTML = sections['cart-drawer'];
            var newPanel = tmp.querySelector('.kt-cart-drawer__panel');
            var currentPanel = self.querySelector('.kt-cart-drawer__panel');
            if (currentPanel && newPanel) {
              /* Capture transient form state the customer is still
                 typing — innerHTML swap below would replace these with
                 the server's last-saved values, wiping unsubmitted
                 input. The cart note is the most common loss case
                 (customer types a gift message, bumps qty, message
                 disappears mid-sentence) — well-documented edge case
                 reported on many themes during Theme Store review. */
              var noteEl = currentPanel.querySelector('[name="note"]');
              var preservedNote = noteEl ? noteEl.value : null;
              var serverNote = newPanel.querySelector('[name="note"]');
              var serverNoteValue = serverNote ? serverNote.value : '';

              currentPanel.innerHTML = newPanel.innerHTML;

              /* Restore the typed note only if the server didn't itself
                 ship a different value (which would mean another tab
                 saved one and we'd want to honour the persisted state).
                 Empty server value + non-empty local value = customer
                 was mid-edit; restore. */
              if (preservedNote && !serverNoteValue) {
                var restoredNote = currentPanel.querySelector('[name="note"]');
                if (restoredNote) restoredNote.value = preservedNote;
              }

              /* Announce the new subtotal — keyboard/SR users raising
                 the qty of a cart line otherwise get silence after the
                 panel swaps in. Pull the server-rendered subtotal so
                 the currency formatting matches the visible value. */
              var nextSubtotal = newPanel.querySelector('.kt-cart-drawer__subtotal-value');
              if (nextSubtotal) announcedSubtotal = nextSubtotal.textContent.trim();
            }
          }
          if (announcedSubtotal && window.Kitchero && typeof Kitchero.announce === 'function') {
            Kitchero.announce(
              (Kitchero.cartStrings && Kitchero.cartStrings.updatedSubtotal
                ? Kitchero.cartStrings.updatedSubtotal.replace('[subtotal]', announcedSubtotal)
                : 'Cart updated. Subtotal ' + announcedSubtotal)
            );
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
            /* No dedicated header-cart-icon section — query cart.js.
               IMPORTANT: must hit `/cart.js` (the AJAX endpoint), not
               `/cart` (the HTML cart page). Shopify ignores
               `Accept: application/json` on /cart and returns the HTML
               cart page; r.json() then throws SyntaxError. The .js
               suffix is the documented AJAX-cart endpoint. */
            return fetch(Kitchero.routes.cart + '.js', {
              headers: { 'Accept': 'application/json' },
            })
              .then(function (r) { return r.json(); })
              .then(function (cart) { self.updateCartCount(cart.item_count); });
          }
        })
        .catch(function (error) {
          /* AbortError on a deliberate abort isn't a real failure —
             it just means a newer refreshDrawer() superseded this one.
             Silently swallow so the next refresh's success path runs
             unimpeded. */
          if (error && error.name === 'AbortError') return;
          console.error(error);
          /* Last-ditch fallback so the UI isn't left in a stale state.
             Adds a terminal .catch so that when BOTH the primary
             Section-Rendering-API fetch AND this cart.js fallback
             fail (full Shopify outage), we surface an error to the
             user rather than leaving an unhandled Promise rejection
             (which previously leaked to window as console noise + no
             UI feedback — drawer would stay open with stale qty and
             the user would keep clicking the +/– buttons wondering
             what's wrong). */
          return fetch(Kitchero.routes.cart + '.js', {
            headers: { 'Accept': 'application/json' },
          })
            .then(function (r) { return r.json(); })
            .then(function (cart) {
              self.updateCartCount(cart.item_count);
              if (cart.item_count === 0) self.close();
            })
            .catch(function (innerError) {
              console.error('cart-drawer: total failure, cart state unknown', innerError);
              if (window.Kitchero && typeof Kitchero.announce === 'function') {
                /* Urgency must be the string 'assertive' — object form is
                   not recognized by global.js. See cart-drawer.js:227
                   for the full rationale. */
                Kitchero.announce(
                  (Kitchero.cartStrings && Kitchero.cartStrings.error) || 'Unable to update cart.',
                  'assertive'
                );
              }
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
  }

  /* Guard against double-registration in dev when the script is
     re-injected by Theme Editor's shopify:section:load path. */
  if (!customElements.get('cart-drawer')) {
    customElements.define('cart-drawer', CartDrawer);
  }

  /* Theme Editor — when the merchant clicks the cart-drawer section
     (or any block inside it) in the editor sidebar, open the drawer
     so the merchant can preview / edit it. Without this, clicking
     the cart-drawer section in the sidebar leaves the drawer closed
     and the merchant has no way to inspect the layout, blocks, or
     applied settings. Symmetric `:deselect` closes it back when the
     merchant moves on so the storefront preview returns to baseline.
     Gated on `Shopify.designMode` (set true in editor only) so
     production storefronts aren't affected. */
  document.addEventListener('shopify:section:select', function (event) {
    if (!window.Shopify || !window.Shopify.designMode) return;
    var drawer = event.target && event.target.querySelector
      ? event.target.querySelector('cart-drawer')
      : null;
    if (drawer && typeof drawer.open === 'function') drawer.open();
  });
  document.addEventListener('shopify:section:deselect', function (event) {
    if (!window.Shopify || !window.Shopify.designMode) return;
    var drawer = event.target && event.target.querySelector
      ? event.target.querySelector('cart-drawer')
      : null;
    if (drawer && typeof drawer.close === 'function') drawer.close();
  });
  /* Block-level select — merchant clicks a block inside cart-drawer
     (e.g. an @app upsell block); ensure the drawer is open so the
     block is visible. The browser's editor sidebar fires this BEFORE
     :section:select on the parent so we open speculatively here too. */
  document.addEventListener('shopify:block:select', function (event) {
    if (!window.Shopify || !window.Shopify.designMode) return;
    var node = event.target;
    if (!node || !node.closest) return;
    var drawerHost = node.closest('cart-drawer');
    if (drawerHost && typeof drawerHost.open === 'function') drawerHost.open();
  });
})();
