if (!window.__kitcheroMainCartLoaded) {
  window.__kitcheroMainCartLoaded = true;

  (function () {
    'use strict';

    var DEBOUNCE_MS = 500;
    var debounceTimers = {};

    var inflight = Object.create(null);
    var pendingQty = Object.create(null);

    var refreshAbort = null;

    function updateLine(key, quantity, triggerEl) {
      if (inflight[key]) {
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
          var errMsg = (error && error.message) || '';
          var isShopifyMsg = !!(error && error.handled);
          if (!isShopifyMsg) {
            console.error(error);
          }
          if (row) {
            row.style.opacity = '';
            row.style.pointerEvents = '';
          }

          var pageErrorSlot = document.querySelector('[data-cart-page-error]');
          if (pageErrorSlot) {
            pageErrorSlot.textContent = isShopifyMsg && errMsg
              ? errMsg
              : ((Kitchero.cartStrings && Kitchero.cartStrings.error) || 'Unable to update cart.');
            pageErrorSlot.hidden = false;

            clearTimeout(pageErrorSlot._kitcheroClearTimer);
            pageErrorSlot._kitcheroClearTimer = setTimeout(function () {
              pageErrorSlot.hidden = true;
              pageErrorSlot.textContent = '';
            }, 6000);
          }
          if (window.Kitchero && typeof Kitchero.announce === 'function') {
            var announceMsg = isShopifyMsg && errMsg
              ? errMsg
              : ((Kitchero.cartStrings && Kitchero.cartStrings.error) || 'Unable to update cart.');
            Kitchero.announce(announceMsg, 'assertive');
          }
        })
        .then(function () {
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

    function refreshCartPage() {
      var sectionsToFetch = ['main-cart', 'header-cart-icon'];
      if (document.querySelector('.kt-cart-drawer')) sectionsToFetch.push('cart-drawer');

      if (refreshAbort) {
        try { refreshAbort.abort(); } catch (_) {  }
      }
      refreshAbort = new AbortController();

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
          var html = '';
          if (sections['main-cart']) html += sections['main-cart'];
          if (sections['cart-drawer']) html += sections['cart-drawer'];
          if (sections['header-cart-icon']) html += sections['header-cart-icon'];
          var doc = new DOMParser().parseFromString(html, 'text/html');

          var current = document.querySelector('.kt-cart-page');
          var next = doc.querySelector('.kt-cart-page');
          if (current && next) {
            var noteEl = current.querySelector('[name="note"]');
            var preservedNote = noteEl ? noteEl.value : null;
            var serverNote = next.querySelector('[name="note"]');
            var serverNoteValue = serverNote ? serverNote.value : '';

            var activeEl = (current.contains(document.activeElement))
              ? document.activeElement
              : null;
            var restoreFocus = null;
            if (activeEl) {
              var lineEl = activeEl.closest('[data-line-key]');
              var lineKey = lineEl ? lineEl.getAttribute('data-line-key') : null;
              var qtyDir = activeEl.getAttribute('data-qty');
              var isQtyInput = activeEl.matches && activeEl.matches('input[data-cart-qty-input], input[name^="updates["]');
              var isRemove = activeEl.matches && activeEl.matches('[data-cart-remove]');
              if (lineKey && qtyDir) {
                restoreFocus = function (panel) {
                  return panel.querySelector('[data-line-key="' + lineKey + '"] [data-cart-qty-change][data-qty="' + qtyDir + '"]');
                };
              } else if (lineKey && isQtyInput) {
                restoreFocus = function (panel) {
                  return panel.querySelector('[data-line-key="' + lineKey + '"] input[data-cart-qty-input]');
                };
              } else if (lineKey && isRemove) {
                restoreFocus = function (panel) {
                  return panel.querySelector('[data-line-key="' + lineKey + '"] [data-cart-remove]');
                };
              } else if (activeEl.id) {
                var savedId = activeEl.id;
                restoreFocus = function (panel) {
                  return panel.querySelector('#' + (typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(savedId) : savedId));
                };
              }
            }

            current.innerHTML = next.innerHTML;

            if (preservedNote && !serverNoteValue) {
              var restoredNote = current.querySelector('[name="note"]');
              if (restoredNote) restoredNote.value = preservedNote;
            }

            if (restoreFocus) {
              try {
                var target = restoreFocus(current);
                if (target && typeof target.focus === 'function') {
                  target.focus({ preventScroll: true });
                } else {
                  var fallback = current.querySelector('[name="checkout"], .kt-cart-page__heading, h1');
                  if (fallback && typeof fallback.focus === 'function') {
                    if (!fallback.hasAttribute('tabindex')) {
                      fallback.setAttribute('tabindex', '-1');
                    }
                    fallback.focus({ preventScroll: true });
                  }
                }
              } catch (e) {  }
            }
          }

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

          var nextTotal = doc.querySelector('.kt-cart-page__summary-row--total .kt-cart-page__summary-value');
          if (nextTotal && window.Kitchero && typeof Kitchero.announce === 'function') {
            Kitchero.announce(
              (Kitchero.cartStrings && Kitchero.cartStrings.updatedSubtotal
                ? Kitchero.cartStrings.updatedSubtotal.replace('[subtotal]', nextTotal.textContent.trim())
                : 'Cart updated. Subtotal ' + nextTotal.textContent.trim())
            );
          }

          var drawer = (window.Kitchero && window.Kitchero.cartDrawer) || window.kitcheroCartDrawer;
          if (drawer && typeof drawer.refreshDrawer === 'function') {
            var drawerRefresh = drawer.refreshDrawer();
            if (drawerRefresh && typeof drawerRefresh.catch === 'function') {
              drawerRefresh.catch(function () {  });
            }
          }
        })
        .catch(function (error) {
          if (error && error.name === 'AbortError') return;
          console.error('refreshCartPage:', error);
        });
    }

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

    function syncCartTermsGate(checkbox) {
      var gatedButtons = document.querySelectorAll('[data-cart-terms-gated]');
      gatedButtons.forEach(function (btn) {
        btn.disabled = !checkbox.checked;
        if (checkbox.checked) {
          btn.removeAttribute('aria-disabled');
        } else {
          btn.setAttribute('aria-disabled', 'true');
        }
      });
    }
    document.addEventListener('change', function (event) {
      var checkbox = event.target.closest('[data-cart-terms-checkbox]');
      if (!checkbox) return;
      syncCartTermsGate(checkbox);
    });

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

    document.addEventListener('shopify:section:unload', function (event) {
      if (!event.target || !event.target.querySelector('[data-section-type="main-cart"]')) return;
      Object.keys(debounceTimers).forEach(function (key) {
        window.clearTimeout(debounceTimers[key]);
        delete debounceTimers[key];
      });
    });
  })();
}
