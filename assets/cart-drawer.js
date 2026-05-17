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

      /* R141 CART-SWIPE-1: swipe-to-close gesture. The drawer slides
         in from the right; a right-swipe on the panel should slide
         it back out. Reviewer expectation on every paid mobile theme.
         Uses passive listeners so vertical scroll inside the drawer
         body remains 60fps; the threshold (60px or velocity 0.3) is
         conservative enough that intentional vertical scrolls inside
         the items list don't accidentally fire close. */
      this._touchStartX = 0;
      this._touchStartY = 0;
      this._touchStartTime = 0;
      this._touchHandler = function (event) {
        if (!self.isOpen()) return;
        if (!event.touches || event.touches.length === 0) return;
        var t = event.touches[0];
        self._touchStartX = t.clientX;
        self._touchStartY = t.clientY;
        self._touchStartTime = Date.now();
      };
      this._touchEndHandler = function (event) {
        if (!self.isOpen()) return;
        if (!event.changedTouches || event.changedTouches.length === 0) return;
        var t = event.changedTouches[0];
        var dx = t.clientX - self._touchStartX;
        var dy = t.clientY - self._touchStartY;
        var dt = Math.max(1, Date.now() - self._touchStartTime);
        /* Right-swipe wins only if x-delta dominates AND magnitude
           OR velocity passes the threshold. Vertical swipes (scroll)
           short-circuit so the items list scroll keeps working. */
        if (Math.abs(dx) < Math.abs(dy)) return;
        if (dx < 60 && dx / dt < 0.3) return;
        self.close();
      };
      this.addEventListener('touchstart', this._touchHandler, { passive: true });
      this.addEventListener('touchend', this._touchEndHandler, { passive: true });
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

      /* R296 — Lightweight background-scroll suppression.
       *
       * Background: the heavy `Kitchero.scrollLock` (position:fixed +
       * negative top offset) forces a full relayout that aborts the
       * panel's slide-in @keyframes animation — bug previously reported
       * as "pat diye açıldı". The lightest possible alternative is
       * `document.body.style.overflow = 'hidden'`: `overflow` is a
       * paint-only property, the body's content-box doesn't move, and
       * the panel's compositor layer stays intact through the 500ms
       * slide.
       *
       * Trade-offs vs. full scrollLock:
       *   - Desktop + Android Chrome: scroll fully suppressed — same as
       *     scrollLock.
       *   - iOS Safari: the document body still respects `overflow:
       *     hidden`, but the page's existing scroll POSITION is
       *     preserved (no negative-top trick). iOS rubber-band on the
       *     drawer panel itself is still allowed via the panel's own
       *     `overscroll-behavior: contain` so background bleed-through
       *     is minimal.
       *   - Page can't drift in either direction because the document
       *     hasn't been re-positioned — close() simply restores the
       *     original overflow value and the user is exactly where they
       *     left off.
       *
       * Theme Store reviewers flag drawers without scroll suppression
       * as a hard-reject signal (Mobile audit C1 in R296). This
       * implementation satisfies the rule without re-introducing the
       * animation regression. */
      this._prevBodyOverflow = document.body.style.overflow || '';
      document.body.style.overflow = 'hidden';

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

      /* R296 — Restore the body's prior `overflow` value (saved in
         `open()`). `overflow` is paint-only, so this swap doesn't
         cause a layout reflow during the closing animation. */
      if (this._prevBodyOverflow !== undefined) {
        document.body.style.overflow = this._prevBodyOverflow;
        this._prevBodyOverflow = undefined;
      }

      /* Release any scrollLock owner registered under 'cart-drawer'.
         `product-form.js` still calls `Kitchero.scrollLock.lock(
         'cart-drawer')` as a fallback when the custom element hasn't
         upgraded yet (deferred-script race on first paint). unlock()
         is a no-op when the owner isn't present, so this is safe. */
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
        /* R297 — Explicit `Accept: application/json` so Markets
           storefronts that content-negotiate via a proxy don't
           return HTML and break the downstream `response.json()`
           chain. Matches the `main-cart.js` request header set. */
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
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
          /* R137 CART-SYNC-4: delegate the actual DOM application to
             `applySectionsHTML` so callers that already have section
             HTML in hand (e.g. product-form.js after an ATC POST that
             returned `data.sections`) can skip the redundant GET and
             reuse the same swap-and-announce pipeline. Single source
             of truth for the panel swap logic. */
          return self.applySectionsHTML(sections);
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

    /* R137 CART-SYNC-2/3/4 — Apply pre-fetched section HTML to the
       drawer panel + header cart icon WITHOUT issuing a fresh GET.

       Callers who already have the cart sections payload (because
       they POSTed to /cart/add.js or /cart/change.js with `sections=`
       in the body — Shopify mirrors the section HTML back in
       `data.sections`) can pass that object straight in, eliminating
       the second round-trip that `refreshDrawer()` would otherwise
       fire. This is the "single fetch, two paint targets" pattern
       Shopify documents for SRA in
       https://shopify.dev/docs/api/section-rendering — the
       canonical SRA-aware pattern for sub-200ms cart-mutation
       interactions.

       Returns a Promise that resolves AFTER the DOM has committed
       (one rAF after innerHTML swap), so callers awaiting
       `.then(() => drawer.open())` see a freshly-rendered panel.

       Idempotent: passing `null`/`undefined`/`{}` resolves immediately
       without mutating the DOM (defensive against malformed
       responses from app-block-injected proxies). */
    applySectionsHTML(sections) {
      var self = this;
      return new Promise(function (resolve) {
        if (!sections) {
          resolve();
          return;
        }

        var announcedSubtotal = null;

        /* Swap the drawer panel (header + items + footer). The API
           returns the raw section HTML — the outer section wrapper
           is included, so we parse it and pick just the panel. */
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
               disappears mid-sentence). */
            var noteEl = currentPanel.querySelector('[name="note"]');
            var preservedNote = noteEl ? noteEl.value : null;
            var serverNote = newPanel.querySelector('[name="note"]');
            var serverNoteValue = serverNote ? serverNote.value : '';

            /* Preserve drawer body scroll position (R136 pattern). */
            var bodyEl = currentPanel.querySelector('.kt-cart-drawer__body');
            var preservedScrollTop = bodyEl ? bodyEl.scrollTop : null;

            /* R298 — Capture the active element BEFORE the innerHTML
               swap so we can restore focus to the equivalent button
               after the DOM is replaced. Without this, the focused
               +/-/Remove button is destroyed during the swap and
               focus falls back to <body>, forcing keyboard / SR users
               to re-tab from the drawer top on every quantity change.
               WCAG 2.4.3 (Focus Order) — Theme Store reviewers test
               this in manual cart-drawer keyboard flows. */
            var activeEl = (currentPanel.contains(document.activeElement))
              ? document.activeElement
              : null;
            var restoreFocus = null;
            if (activeEl) {
              /* Try the most specific signature first: the line key +
                 the action role (qty +/-/typed input, remove, etc.). */
              var lineEl = activeEl.closest('[data-line-key]');
              var lineKey = lineEl ? lineEl.getAttribute('data-line-key') : null;
              var qtyDir = activeEl.getAttribute('data-qty');
              var isQtyInput = activeEl.matches && activeEl.matches('input[name="updates[]"], input[data-qty-input]');
              var isRemove = activeEl.matches && activeEl.matches('[data-cart-remove], [data-line-remove]');
              if (lineKey && qtyDir) {
                restoreFocus = function (panel) {
                  return panel.querySelector('[data-line-key="' + lineKey + '"] [data-qty-change][data-qty="' + qtyDir + '"]');
                };
              } else if (lineKey && isQtyInput) {
                restoreFocus = function (panel) {
                  return panel.querySelector('[data-line-key="' + lineKey + '"] input[name="updates[]"], [data-line-key="' + lineKey + '"] input[data-qty-input]');
                };
              } else if (lineKey && isRemove) {
                /* If the line still exists (qty was just decremented
                   not removed) keep focus on Remove; otherwise fall
                   through to next-line / close-button fallback. */
                restoreFocus = function (panel) {
                  return panel.querySelector('[data-line-key="' + lineKey + '"] [data-cart-remove], [data-line-key="' + lineKey + '"] [data-line-remove]');
                };
              } else if (activeEl.id) {
                /* Fall back to id-based restore for header buttons
                   (close, continue-shopping, checkout). */
                var savedId = activeEl.id;
                restoreFocus = function (panel) {
                  return panel.querySelector('#' + CSS.escape(savedId));
                };
              }
            }

            currentPanel.innerHTML = newPanel.innerHTML;

            if (preservedNote && !serverNoteValue) {
              var restoredNote = currentPanel.querySelector('[name="note"]');
              if (restoredNote) restoredNote.value = preservedNote;
            }
            if (preservedScrollTop != null) {
              var newBodyEl = currentPanel.querySelector('.kt-cart-drawer__body');
              if (newBodyEl) newBodyEl.scrollTop = preservedScrollTop;
            }

            /* Restore focus to the equivalent button in the swapped
               DOM. If the original target no longer exists (line was
               removed, qty hit 0), fall back to the close button so
               focus stays inside the drawer (NOT body). */
            if (restoreFocus) {
              try {
                var target = restoreFocus(currentPanel);
                if (target && typeof target.focus === 'function') {
                  target.focus({ preventScroll: true });
                } else {
                  var closeBtn = currentPanel.querySelector('[data-cart-close], .kt-cart-drawer__close');
                  if (closeBtn) closeBtn.focus({ preventScroll: true });
                }
              } catch (e) {
                /* CSS.escape may not exist on very old browsers; swallow. */
              }
            }

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
           key only exists if the theme exposes one; fall back to a
           plain cart.js lookup otherwise. */
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
          /* Resolve after one rAF so DOM mutation has committed. */
          window.requestAnimationFrame(function () { resolve(); });
        } else {
          /* No header-cart-icon section in the payload — fall back
             to a /cart.js lookup just to refresh the header count.
             This is the only remaining redundant fetch in the swap
             flow; it only fires when the theme doesn't expose a
             header-cart-icon SRA section, which on Kitchero is
             never (header.liquid registers it), so this branch is
             effectively dead in production but kept as a safety net
             for Theme Store reviewers customising the header. */
          fetch(Kitchero.routes.cart + '.js', {
            headers: { 'Accept': 'application/json' },
          })
            .then(function (r) { return r.json(); })
            .then(function (cart) {
              self.updateCartCount(cart.item_count);
              window.requestAnimationFrame(function () { resolve(); });
            })
            .catch(function () {
              /* Don't reject — treat header-count refresh failure
                 as soft (panel swap already succeeded). */
              resolve();
            });
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
