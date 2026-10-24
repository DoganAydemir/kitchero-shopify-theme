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

      if (!window.Kitchero) window.Kitchero = {};
      window.Kitchero.cartDrawer = this;
      window.kitcheroCartDrawer = this;
    }

    disconnectedCallback() {
      if (this._keyHandler) document.removeEventListener('keydown', this._keyHandler);
      if (this._clickHandler) document.removeEventListener('click', this._clickHandler);

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

      this.addEventListener('change', function (event) {
        var checkbox = event.target.closest('[data-cart-terms-checkbox]');
        if (!checkbox) return;
        var gatedButtons = self.panel.querySelectorAll('[data-cart-terms-gated]');
        gatedButtons.forEach(function (btn) {
          btn.disabled = !checkbox.checked;
          if (checkbox.checked) {
            btn.removeAttribute('aria-disabled');
          } else {
            btn.setAttribute('aria-disabled', 'true');
          }
        });
      });

      this._keyHandler = function (event) {
        if (event.code !== 'Escape' || !self.isOpen()) return;

        if (window.Kitchero && Kitchero.focusTrap && Kitchero.focusTrap.shouldSuppressEscape && Kitchero.focusTrap.shouldSuppressEscape(self.panel)) return;
        self.close();
      };
      document.addEventListener('keydown', this._keyHandler);

      this._clickHandler = function (event) {
        var icon = event.target.closest('.kt-header__cart-icon');
        if (!icon) return;
        event.preventDefault();
        self.open();
      };
      document.addEventListener('click', this._clickHandler);

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

    open(focusTarget) {
      this.lastTrigger = document.activeElement;

      this.removeAttribute('inert');

      void this.offsetWidth;

      this.classList.add('kt-cart-drawer--open');
      this.setAttribute('aria-hidden', 'false');

      var openTriggers = document.querySelectorAll('[aria-controls="cart-drawer"]');
      for (var oi = 0; oi < openTriggers.length; oi++) {
        if (openTriggers[oi].hasAttribute('aria-expanded')) {
          openTriggers[oi].setAttribute('aria-expanded', 'true');
        }
      }

      this._prevBodyOverflow = document.body.style.overflow || '';
      document.body.style.overflow = 'hidden';

      if (window.Kitchero && Kitchero.focusTrap) {
        Kitchero.focusTrap.enable(this.panel);
      }

      var target = focusTarget || this.querySelector('[data-cart-drawer-close]');
      if (target && typeof target.focus === 'function') {
        requestAnimationFrame(function () {
          try { target.focus({ preventScroll: true }); } catch (e) {  }
        });
      }
    }

    close() {
      this.classList.remove('kt-cart-drawer--open');
      this.classList.add('kt-cart-drawer--closing');
      this.setAttribute('aria-hidden', 'true');

      var closeTriggers = document.querySelectorAll('[aria-controls="cart-drawer"]');
      for (var ci = 0; ci < closeTriggers.length; ci++) {
        if (closeTriggers[ci].hasAttribute('aria-expanded')) {
          closeTriggers[ci].setAttribute('aria-expanded', 'false');
        }
      }

      var self = this;
      setTimeout(function () {
        self.classList.remove('kt-cart-drawer--closing');
        self.setAttribute('inert', '');
      }, 500);

      if (window.Kitchero && Kitchero.focusTrap) {
        Kitchero.focusTrap.disable(this.panel);
      }

      if (this._prevBodyOverflow !== undefined) {
        document.body.style.overflow = this._prevBodyOverflow;
        this._prevBodyOverflow = undefined;
      }

      if (window.Kitchero && Kitchero.scrollLock) {
        Kitchero.scrollLock.unlock('cart-drawer');
      }

      if (this.lastTrigger && typeof this.lastTrigger.focus === 'function' && document.contains(this.lastTrigger)) {
        try { this.lastTrigger.focus({ preventScroll: true }); } catch (e) {  }
      }
      this.lastTrigger = null;
    }

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

      self._pendingQty = self._pendingQty || Object.create(null);
      self._inflight = self._inflight || Object.create(null);

      if (self._inflight[key]) {
        self._pendingQty[key] = quantity;
        return;
      }

      var row = self.querySelector('[data-line-key="' + key + '"]');
      if (row) {
        row.style.opacity = '0.5';
        row.style.pointerEvents = 'none';
      }
      self._inflight[key] = true;

      fetch(Kitchero.routes.cartChange + '.js', {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ id: key, quantity: quantity }),
      })
        .then(function (response) {
          return response.json().then(function (body) {
            if (!response.ok) {
              var msg = (body && body.description) || (body && body.message) ||
                (Kitchero.cartStrings && Kitchero.cartStrings.error) ||
                'Unable to update cart.';

              if (window.Kitchero && typeof Kitchero.announce === 'function') {
                Kitchero.announce(msg, 'assertive');
              }

              self.showError(msg);

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

            var fallbackMsg = (window.Kitchero && Kitchero.cartStrings && Kitchero.cartStrings.error)
              || 'Unable to update cart. Please try again.';
            if (window.Kitchero && typeof Kitchero.announce === 'function') {
              try { Kitchero.announce(fallbackMsg, 'assertive'); } catch (_) {  }
            }
            self.showError(fallbackMsg);
          }
        })
        .then(function () {
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

    refreshDrawer() {
      var self = this;

      if (self._refreshAbort) {
        try { self._refreshAbort.abort(); } catch (_) {  }
      }
      self._refreshAbort = new AbortController();
      var signal = self._refreshAbort.signal;

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
          return self.applySectionsHTML(sections);
        })
        .catch(function (error) {
          if (error && error.name === 'AbortError') return;
          console.error(error);

          return fetch(Kitchero.routes.cart + '.js', {
            headers: { 'Accept': 'application/json' },
          })
            .then(function (r) {
              if (!r.ok) throw new Error('cart.js fallback fetch failed: ' + r.status);
              return r.json();
            })
            .then(function (cart) {
              self.updateCartCount(cart.item_count);
              if (cart.item_count === 0) self.close();
            })
            .catch(function (innerError) {
              console.error('cart-drawer: total failure, cart state unknown', innerError);
              if (window.Kitchero && typeof Kitchero.announce === 'function') {
                Kitchero.announce(
                  (Kitchero.cartStrings && Kitchero.cartStrings.error) || 'Unable to update cart.',
                  'assertive'
                );
              }
            });
        });
    }

    applySectionsHTML(sections) {
      var self = this;
      return new Promise(function (resolve) {
        if (!sections) {
          resolve();
          return;
        }

        var announcedSubtotal = null;

        if (sections['cart-drawer']) {
          var tmp = document.createElement('div');
          tmp.innerHTML = sections['cart-drawer'];
          var newPanel = tmp.querySelector('.kt-cart-drawer__panel');
          var currentPanel = self.querySelector('.kt-cart-drawer__panel');
          if (currentPanel && newPanel) {
            var noteEl = currentPanel.querySelector('[name="note"]');
            var preservedNote = noteEl ? noteEl.value : null;
            var serverNote = newPanel.querySelector('[name="note"]');
            var serverNoteValue = serverNote ? serverNote.value : '';

            var bodyEl = currentPanel.querySelector('.kt-cart-drawer__body');
            var preservedScrollTop = bodyEl ? bodyEl.scrollTop : null;

            var activeEl = (currentPanel.contains(document.activeElement))
              ? document.activeElement
              : null;
            var restoreFocus = null;
            if (activeEl) {
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
                restoreFocus = function (panel) {
                  return panel.querySelector('[data-line-key="' + lineKey + '"] [data-cart-remove], [data-line-key="' + lineKey + '"] [data-line-remove]');
                };
              } else if (activeEl.id) {
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

          window.requestAnimationFrame(function () { resolve(); });
        } else {
          fetch(Kitchero.routes.cart + '.js', {
            headers: { 'Accept': 'application/json' },
          })
            .then(function (r) {
              if (!r.ok) throw new Error('cart.js header-count refresh failed');
              return r.json();
            })
            .then(function (cart) {
              self.updateCartCount(cart.item_count);
              window.requestAnimationFrame(function () { resolve(); });
            })
            .catch(function () {
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

  if (!customElements.get('cart-drawer')) {
    customElements.define('cart-drawer', CartDrawer);
  }

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

  document.addEventListener('shopify:block:select', function (event) {
    if (!window.Shopify || !window.Shopify.designMode) return;
    var node = event.target;
    if (!node || !node.closest) return;
    var drawerHost = node.closest('cart-drawer');
    if (drawerHost && typeof drawerHost.open === 'function') drawerHost.open();
  });
})();
