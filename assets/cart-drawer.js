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
         Legacy global kept for backward compatibility; new code can
         also `document.querySelector('cart-drawer')`. */
      window.kitcheroCartDrawer = this;
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
        if (event.code === 'Escape' && self.isOpen()) {
          self.close();
        }
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
      /* Remove class first so the slide-out transition is driven by
       * the same cascade signal (class) as the slide-in. ARIA flip
       * stays for a11y. `inert` is set LAST so its layout reflow
       * doesn't abort the close transition mid-tween. */
      this.classList.remove('kt-cart-drawer--open');
      this.setAttribute('aria-hidden', 'true');
      this.setAttribute('inert', '');

      if (window.Kitchero && Kitchero.focusTrap) {
        Kitchero.focusTrap.disable(this.panel);
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
            if (window.Kitchero && typeof Kitchero.announce === 'function') {
              var msg = (window.Kitchero && Kitchero.cartStrings && Kitchero.cartStrings.error)
                || 'Unable to update cart. Please try again.';
              try { Kitchero.announce(msg, 'assertive'); } catch (_) { /* ignore */ }
            }
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

      /* Shopify Section Rendering API — fetches just the cart-drawer
       * section markup, no full page. Much lighter than a full-page
       * fetch: responses are ~5–10 KB vs 100+ KB for a page. */
      return fetch('/?sections=cart-drawer,header-cart-icon', {
        headers: { 'Accept': 'application/json' },
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
              currentPanel.innerHTML = newPanel.innerHTML;
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
            /* No dedicated header-cart-icon section — query cart.js. */
            return fetch(Kitchero.routes.cart, {
              headers: { 'Accept': 'application/json' },
            })
              .then(function (r) { return r.json(); })
              .then(function (cart) { self.updateCartCount(cart.item_count); });
          }
        })
        .catch(function (error) {
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
          return fetch(Kitchero.routes.cart, {
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
})();
