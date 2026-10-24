(function () {
  'use strict';

  function refreshCartDrawer() {
    var drawer = (window.Kitchero && window.Kitchero.cartDrawer) || window.kitcheroCartDrawer;
    if (drawer && typeof drawer.refreshDrawer === 'function') {
      return drawer.refreshDrawer();
    }
    return fetch(Kitchero.routes.cart + '.js', {
      headers: { 'Accept': 'application/json' },
    })
      .then(function (r) {
        if (!r.ok) throw new Error('cart.js refresh failed: ' + r.status);
        return r.json();
      })
      .then(function (cart) {
        document.querySelectorAll('.kt-header__cart-count').forEach(function (el) {
          el.textContent = cart.item_count;
          el.style.display = cart.item_count > 0 ? '' : 'none';
        });
      })
      .catch(function (err) {
        if (window.console && typeof console.error === 'function') {
          console.error('refreshCart count update failed:', err);
        }
      });
  }

  function initProductForm(container) {
    var wrapper = container.querySelector('[data-product-form]');
    if (!wrapper) return;
    var form = wrapper.querySelector('form');
    if (!form) return;

    if (form.dataset.productFormBound === 'true') return;
    form.dataset.productFormBound = 'true';

    var variantIdInput = form.querySelector('[data-variant-id]');
    var qtyInput = form.querySelector('[data-qty-input]');
    var minusBtn = form.querySelector('[data-qty-minus]');
    var plusBtn = form.querySelector('[data-qty-plus]');
    var atcBtn = form.querySelector('[data-add-to-cart]');
    var atcText = form.querySelector('[data-add-to-cart-text]');
    var errorEl = form.querySelector('[data-product-form-error]');
    var variantSelect = container.querySelector('[data-variant-select]');
    var optionInputs = container.querySelectorAll('[data-option-value]');

    try {
      var optionValuesParam = new URLSearchParams(window.location.search).get('option_values');
      if (optionValuesParam) {
        var rawIds = optionValuesParam.split(',')
          .map(function (s) { return parseInt(s.trim(), 10); })
          .filter(function (n) { return !isNaN(n); });

        var seenIds = {};
        var requestedIds = [];
        for (var ridx = 0; ridx < rawIds.length; ridx++) {
          if (!seenIds[rawIds[ridx]]) {
            seenIds[rawIds[ridx]] = true;
            requestedIds.push(rawIds[ridx]);
          }
        }
        if (requestedIds.length > 0) {
          var ovMapBlob = container.querySelector('script[data-option-values-map]');
          if (ovMapBlob) {
            var ovMap = {};
            try { ovMap = JSON.parse(ovMapBlob.textContent) || {}; } catch (mapErr) { ovMap = {}; }
            var matchedVariantId = null;
            for (var variantKey in ovMap) {
              if (!Object.prototype.hasOwnProperty.call(ovMap, variantKey)) continue;
              var variantOvIds = ovMap[variantKey];
              if (!variantOvIds || variantOvIds.length !== requestedIds.length) continue;
              var allMatch = true;
              for (var ri = 0; ri < requestedIds.length; ri++) {
                if (variantOvIds.indexOf(requestedIds[ri]) === -1) { allMatch = false; break; }
              }
              if (allMatch) { matchedVariantId = parseInt(variantKey, 10); break; }
            }
            if (matchedVariantId !== null) {
              var lookupVariants = getVariantsData(container);
              for (var lv = 0; lv < lookupVariants.length; lv++) {
                var lookupVariant = lookupVariants[lv];
                if (!lookupVariant || lookupVariant.id !== matchedVariantId) continue;
                if (lookupVariant.options) {
                  for (var oi = 0; oi < optionInputs.length; oi++) {
                    var optInput = optionInputs[oi];

                    var fieldset = optInput.closest('[data-option-index]');
                    var optIdx = fieldset ? parseInt(fieldset.dataset.optionIndex, 10) : NaN;
                    if (!isNaN(optIdx) && lookupVariant.options[optIdx] === optInput.value) {
                      optInput.checked = true;
                    }
                  }
                }
                break;
              }
            } else {
              try {
                var cleanUrl = new URL(window.location.href);
                cleanUrl.searchParams.delete('option_values');
                window.history.replaceState(window.history.state, '', cleanUrl.toString());
              } catch (cleanErr) {  }
            }
          }
        }
      }
    } catch (e) {  }

    function clearError() {
      if (!errorEl) return;
      errorEl.hidden = true;
      errorEl.textContent = '';
    }

    function showError(message) {
      if (!errorEl) return;
      errorEl.textContent = message;
      errorEl.hidden = false;

      if (!errorEl.hasAttribute('tabindex')) errorEl.setAttribute('tabindex', '-1');
      try { errorEl.focus({ preventScroll: false }); } catch (e) {  }
    }

    function readQtyRule() {
      var min = parseInt(qtyInput && qtyInput.dataset.qtyMin, 10);
      var step = parseInt(qtyInput && qtyInput.dataset.qtyStep, 10);
      var max = parseInt(qtyInput && qtyInput.dataset.qtyMax, 10);
      if (isNaN(min) || min < 1) min = 1;
      if (isNaN(step) || step < 1) step = 1;
      if (isNaN(max)) max = Infinity;
      return { min: min, step: step, max: max };
    }

    function syncStepperDisabled() {
      if (!qtyInput) return;
      var rule = readQtyRule();
      var val = parseInt(qtyInput.value, 10);
      if (isNaN(val)) val = rule.min;
      if (minusBtn) {
        var atMin = val <= rule.min;
        minusBtn.disabled = atMin;
        if (atMin) minusBtn.setAttribute('aria-disabled', 'true');
        else minusBtn.removeAttribute('aria-disabled');
      }
      if (plusBtn) {
        var atMax = val >= rule.max;
        plusBtn.disabled = atMax;
        if (atMax) plusBtn.setAttribute('aria-disabled', 'true');
        else plusBtn.removeAttribute('aria-disabled');
      }
    }

    if (minusBtn && qtyInput) {
      minusBtn.addEventListener('click', function () {
        var rule = readQtyRule();
        var val = parseInt(qtyInput.value, 10) || rule.min;
        qtyInput.value = Math.max(rule.min, val - rule.step);
        syncStepperDisabled();
      });
    }

    if (plusBtn && qtyInput) {
      plusBtn.addEventListener('click', function () {
        var rule = readQtyRule();
        var val = parseInt(qtyInput.value, 10) || rule.min;
        qtyInput.value = Math.min(rule.max, val + rule.step);
        syncStepperDisabled();
      });
    }

    if (qtyInput) {
      qtyInput.addEventListener('blur', function () {
        var rule = readQtyRule();
        var val = parseInt(qtyInput.value, 10);
        if (isNaN(val) || val < rule.min) {
          val = rule.min;
        } else if (rule.step > 1) {
          var stepsFromMin = Math.round((val - rule.min) / rule.step);
          val = rule.min + (stepsFromMin * rule.step);
        }
        if (val > rule.max) val = rule.max;
        qtyInput.value = val;
        syncStepperDisabled();
      });

      qtyInput.addEventListener('keydown', function (event) {
        if (event.key !== 'Enter' && event.code !== 'Enter') return;
        event.preventDefault();
        qtyInput.blur();
        if (typeof form.requestSubmit === 'function') {
          form.requestSubmit();
        } else {
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }
      });
    }

    if (qtyInput) syncStepperDisabled();

    if (optionInputs.length > 0 && variantSelect) {
      optionInputs.forEach(function (input) {
        input.addEventListener('change', function () {
          updateVariant(container, variantIdInput, variantSelect, atcBtn, atcText);

          var group = input.closest('[data-option-index]');
          if (group) {
            var idx = group.dataset.optionIndex;
            var selectedLabel = group.querySelector('[data-option-selected="' + idx + '"]');
            if (selectedLabel) selectedLabel.textContent = input.value;
          }
        });
      });
    }

    var atcInflight = false;

    var atcController = null;
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      if (atcInflight) return;

      var currentVariantIdInput = form.querySelector('[name="id"]');
      var currentVariantId = currentVariantIdInput ? String(currentVariantIdInput.value || '').trim() : '';
      if (!currentVariantId) return;

      if (typeof form.reportValidity === 'function' && !form.reportValidity()) return;

      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        var offlineMsg = (Kitchero.variantStrings && Kitchero.variantStrings.offlineError)
          || 'You appear to be offline. Reconnect and try again.';
        showError(offlineMsg);
        return;
      }

      atcInflight = true;
      atcController = new AbortController();

      var atcTimeoutId = setTimeout(function () {
        if (atcController) {
          try { atcController.abort(); } catch (e) {  }
        }
      }, 30000);

      atcController.__kitcheroTimeoutId = atcTimeoutId;

      form.__kitcheroAtcController = atcController;

      clearError();

      var formData = new FormData(form);

      if (atcBtn) {
        atcBtn.classList.add('kt-product-form__atc--loading');
        atcBtn.setAttribute('aria-busy', 'true');

        atcBtn.setAttribute('aria-disabled', 'true');
      }

      formData.append('sections', 'cart-drawer,header-cart-icon');
      formData.append('sections_url', window.location.pathname);

      fetch(Kitchero.routes.cartAdd + '.js', {
        method: 'POST',

        headers: { 'Accept': 'application/json' },
        body: formData,
        signal: atcController.signal
      })
        .then(function (response) {
          return response.json().then(function (data) {
            if (!response.ok) {
              var serverMsg = data && (data.description || data.message);
              if (!serverMsg && data && data.errors) {
                if (Array.isArray(data.errors)) {
                  serverMsg = data.errors.filter(Boolean).join(', ');
                } else if (typeof data.errors === 'object') {
                  var flat = [];
                  for (var ek in data.errors) {
                    if (Object.prototype.hasOwnProperty.call(data.errors, ek)) {
                      var ev = data.errors[ek];
                      if (Array.isArray(ev)) flat.push.apply(flat, ev);
                      else if (ev) flat.push(String(ev));
                    }
                  }
                  serverMsg = flat.join(', ');
                }
              }
              var msg = serverMsg
                || (Kitchero.variantStrings && Kitchero.variantStrings.addToCartError)
                || 'Something went wrong. Please try again.';
              var err = new Error(msg);
              err.handled = true;
              throw err;
            }
            return data;
          });
        })
        .then(function (data) {
          var addedLabel = (Kitchero.variantStrings && Kitchero.variantStrings.addedToCart) || 'Added to cart!';
          if (atcBtn) {
            atcBtn.classList.remove('kt-product-form__atc--loading');
            atcBtn.removeAttribute('aria-busy');
            atcBtn.classList.add('kt-product-form__atc--added');
            if (atcText) atcText.textContent = addedLabel;
            setTimeout(function () {
              atcBtn.classList.remove('kt-product-form__atc--added');
              if (atcText) atcText.textContent = Kitchero.variantStrings ? Kitchero.variantStrings.addToCart : 'Add to cart';
            }, 2000);
          }

          if (window.Kitchero && typeof Kitchero.announce === 'function') {
            Kitchero.announce(addedLabel);
          }

          try {
            var addedPayload = {
              productVariantId: data && data.variant_id ? String(data.variant_id) : (data && data.id ? String(data.id) : ''),
              productId: data && data.product_id ? String(data.product_id) : '',
              quantity: data && data.quantity ? Number(data.quantity) : 1
            };
            if (window.Shopify && window.Shopify.analytics && typeof window.Shopify.analytics.publish === 'function') {
              window.Shopify.analytics.publish('product_added_to_cart', addedPayload);
            }
            document.dispatchEvent(new CustomEvent('kitchero:cart:added', { bubbles: true, detail: addedPayload }));
          } catch (e) {  }

          var cartType = document.body.getAttribute('data-cart-type') || 'drawer';

          if (cartType === 'page') {
            var pageHeaderApplied = false;
            if (data && data.sections && data.sections['header-cart-icon']) {
              try {
                var pageTmp = document.createElement('div');
                pageTmp.innerHTML = data.sections['header-cart-icon'];
                var pageNewCount = pageTmp.querySelector('.kt-header__cart-count');
                document.querySelectorAll('.kt-header__cart-count').forEach(function (el) {
                  if (pageNewCount) {
                    el.textContent = pageNewCount.textContent;
                    el.style.display = pageNewCount.style.display || '';
                  }
                });
                pageHeaderApplied = true;
              } catch (_) {
              }
            }
            var pageRefresh;
            if (pageHeaderApplied) {
              pageRefresh = Promise.resolve();
            } else {
              pageRefresh = fetch(Kitchero.routes.cart + '.js', {
                headers: { 'Accept': 'application/json' },
              })
                .then(function (r) {
                  if (!r.ok) throw new Error('cart.js page-mode refresh failed');
                  return r.json();
                })
                .then(function (cart) {
                  document.querySelectorAll('.kt-header__cart-count').forEach(function (el) {
                    el.textContent = cart.item_count;
                    el.style.display = cart.item_count > 0 ? '' : 'none';
                  });
                });
            }
            pageRefresh
              .catch(function () {
              })
              .then(function () {
                var redirectTimerId = setTimeout(function () {
                  window.location.href = Kitchero.routes.cart;
                }, 700);
                function cancelRedirect() {
                  if (redirectTimerId) {
                    clearTimeout(redirectTimerId);
                    redirectTimerId = null;
                  }
                }
                window.addEventListener('pagehide', cancelRedirect, { once: true });
                window.addEventListener('beforeunload', cancelRedirect, { once: true });
              });
          } else {
            var applyToDrawer = function () {
              var drawerForApply = (window.Kitchero && window.Kitchero.cartDrawer)
                || window.kitcheroCartDrawer
                || document.querySelector('cart-drawer')
                || document.getElementById('cart-drawer');

              var drawerRefresh;
              if (
                drawerForApply
                && typeof drawerForApply.applySectionsHTML === 'function'
                && data
                && data.sections
                && data.sections['cart-drawer']
              ) {
                drawerRefresh = drawerForApply.applySectionsHTML(data.sections);
              } else {
                drawerRefresh = refreshCartDrawer();
              }

              drawerRefresh
                .catch(function () {
                  return fetch(Kitchero.routes.cart + '.js', {
                    headers: { 'Accept': 'application/json' },
                  })
                    .then(function (r) {
                      if (!r.ok) throw new Error('cart.js header refresh failed');
                      return r.json();
                    })
                    .then(function (cart) {
                      document.querySelectorAll('.kt-header__cart-count').forEach(function (el) {
                        el.textContent = cart.item_count;
                        el.style.display = cart.item_count > 0 ? '' : 'none';
                      });
                    })
                    .catch(function () {  });
                })
                .then(function () {
                  var drawerEl = (window.Kitchero && window.Kitchero.cartDrawer)
                    || window.kitcheroCartDrawer
                    || document.querySelector('cart-drawer')
                    || document.getElementById('cart-drawer');
                  if (drawerEl && typeof drawerEl.open === 'function') {
                    drawerEl.open();
                  } else if (drawerEl) {
                    drawerEl.setAttribute('aria-hidden', 'false');
                    drawerEl.removeAttribute('inert');
                    if (window.Kitchero && Kitchero.scrollLock) {
                      Kitchero.scrollLock.lock('cart-drawer');
                    } else {
                      document.body.style.overflow = 'hidden';
                    }
                  }
                })
                .catch(function () {
                });
            };
            if (window.ktLoadCartDrawer && !customElements.get('cart-drawer')) {
              window.ktLoadCartDrawer(applyToDrawer);
            } else {
              applyToDrawer();
            }
          }

          if (window.Kitchero && Kitchero.bus) Kitchero.bus.emit('cart:update', formData);
        })
        .catch(function (error) {
          if (error && error.name === 'AbortError') {
            if (atcController) {
              if (atcBtn) {
                atcBtn.classList.remove('kt-product-form__atc--loading');
                atcBtn.removeAttribute('aria-busy');
                atcBtn.removeAttribute('aria-disabled');
              }
              var timeoutMsg = (Kitchero.variantStrings && Kitchero.variantStrings.timeoutError)
                || 'The request timed out. Check your connection and retry.';
              showError(timeoutMsg);
            }
            return;
          }
          if (!error || !error.handled) console.error('Add to cart error:', error);
          if (atcBtn) {
            atcBtn.classList.remove('kt-product-form__atc--loading');
            atcBtn.removeAttribute('aria-busy');
            atcBtn.removeAttribute('aria-disabled');
          }
          var fallback = (Kitchero.variantStrings && Kitchero.variantStrings.addToCartError)
            || 'Something went wrong. Please try again.';
          var errorMessage = (error && error.message) || fallback;
          showError(errorMessage);
        })
        .then(function () {
          if (atcController && atcController.__kitcheroTimeoutId) {
            clearTimeout(atcController.__kitcheroTimeoutId);
          }
          atcInflight = false;
          atcController = null;
          if (form.__kitcheroAtcController) delete form.__kitcheroAtcController;

          if (atcBtn) {
            atcBtn.disabled = false;
            atcBtn.removeAttribute('disabled');
            atcBtn.removeAttribute('aria-disabled');
            atcBtn.removeAttribute('aria-busy');
            atcBtn.classList.remove('kt-product-form__atc--loading');
          }
          form.querySelectorAll(
            '.shopify-payment-button__button, shopify-buy-it-now-button button, shopify-buy-it-now-button'
          ).forEach(function (btn) {
            btn.disabled = false;
            btn.removeAttribute('disabled');
            btn.removeAttribute('aria-disabled');
          });
        });
    });
  }

  function getVariantsData(container) {
    if (container._kitcheroVariants) return container._kitcheroVariants;
    var blob = container.querySelector('script[data-variant-data]');
    if (!blob) {
      container._kitcheroVariants = [];
      return container._kitcheroVariants;
    }
    try {
      container._kitcheroVariants = JSON.parse(blob.textContent) || [];
    } catch (e) {
      container._kitcheroVariants = [];
    }
    return container._kitcheroVariants;
  }

  function updateVariant(container, variantIdInput, variantSelect, atcBtn, atcText) {
    var wrapper = container.querySelector('[data-product-form]');
    var form = wrapper ? wrapper.querySelector('form') : container.querySelector('form');

    var selectedOptions = [];
    container.querySelectorAll('[data-option-value]:checked').forEach(function (input) {
      selectedOptions.push(input.value);
    });

    var variants = getVariantsData(container);
    var matchedVariant = null;
    for (var idx = 0; idx < variants.length; idx++) {
      var variant = variants[idx];
      if (!variant || !variant.options) continue;

      if (variant.options.length !== selectedOptions.length) continue;
      var match = true;
      for (var i = 0; i < selectedOptions.length; i++) {
        if (variant.options[i] !== selectedOptions[i]) {
          match = false;
          break;
        }
      }
      if (match) { matchedVariant = variant; break; }
    }

    if (matchedVariant) {
      if (variantIdInput) variantIdInput.value = matchedVariant.id;
      variantSelect.value = matchedVariant.id;

      var sectionType = container && container.dataset && container.dataset.sectionType;
      if (sectionType === 'main-product') {
        var url = new URL(window.location.href);
        url.searchParams.set('variant', matchedVariant.id);
        if (container._kitcheroHistoryPushed) {
          window.history.replaceState({ variantId: matchedVariant.id }, '', url.toString());
        } else {
          window.history.pushState({ variantId: matchedVariant.id }, '', url.toString());
          container._kitcheroHistoryPushed = true;
        }

        try {
          var shareUrl = window.location.href;
          var shareButtons = container.querySelectorAll('[data-share-btn][data-share-url]');
          for (var si = 0; si < shareButtons.length; si++) {
            shareButtons[si].setAttribute('data-share-url', shareUrl);
          }
        } catch (e) {  }
      }

      try {
        container.dispatchEvent(new CustomEvent('variant:change', {
          bubbles: true,
          detail: { variant: matchedVariant }
        }));
        document.dispatchEvent(new CustomEvent('variant:change', {
          bubbles: false,
          detail: { variant: matchedVariant, productId: container.dataset.productId }
        }));
      } catch (e) {  }

      var productUrl = container.dataset.productUrl;
      var pickupNode = container.querySelector('[data-pickup-availability]');
      if (pickupNode) {
        var routesRoot = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
        var pickupUrl = routesRoot + 'variants/' + encodeURIComponent(matchedVariant.id) + '/?section_id=pickup-availability';

        if (container.__kitcheroPickupController) {
          try { container.__kitcheroPickupController.abort(); } catch (e) {  }
        }
        container.__kitcheroPickupController = new AbortController();
        fetch(pickupUrl, {
          signal: container.__kitcheroPickupController.signal,
          credentials: 'same-origin',
          headers: { 'Accept': 'text/html' }
        })
          .then(function (response) {
            if (!response.ok) throw new Error('pickup fetch failed: ' + response.status);
            return response.text();
          })
          .then(function (html) {
            var doc = new DOMParser().parseFromString(html, 'text/html');
            var fresh = doc.querySelector('[data-pickup-availability]');

            var current = container.querySelector('[data-pickup-availability]');
            if (fresh && current && current.parentNode) {
              current.parentNode.replaceChild(fresh, current);
            } else if (current && !fresh) {
              current.parentNode.removeChild(current);
            }
          })
          .catch(function (err) {
            if (err && err.name !== 'AbortError') {
              if (typeof console !== 'undefined' && console.warn) {
                console.warn('Pickup availability fetch failed:', err);
              }
            }
          });
      }

      var qtyInput = container.querySelector('[data-qty-input]');
      if (qtyInput) {
        var rule = matchedVariant.quantity_rule || {};
        var newMin  = rule.min       != null ? rule.min       : 1;
        var newStep = rule.increment != null ? rule.increment : 1;
        var newMax  = rule.max       != null ? rule.max       : null;
        qtyInput.min = newMin;
        qtyInput.step = newStep;
        qtyInput.dataset.qtyMin  = newMin;
        qtyInput.dataset.qtyStep = newStep;
        if (newMax != null) {
          qtyInput.max = newMax;
          qtyInput.dataset.qtyMax = newMax;
        } else {
          qtyInput.removeAttribute('max');
          delete qtyInput.dataset.qtyMax;
        }
        var currentVal = parseInt(qtyInput.value, 10) || 1;
        if (currentVal < newMin) qtyInput.value = newMin;
        if (newMax != null && currentVal > newMax) qtyInput.value = newMax;
      }

      try {
        container.dataset.currentVariantJson = JSON.stringify(matchedVariant);
      } catch (e) {  }

      try {
        var escapeDetail = function (str) {
          return String(str).replace(/[<>"&]/g, function (c) {
            return c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&amp;';
          });
        };

        var docLang = (document.documentElement.lang || 'en').replace('_', '-');
        var formatVariantWeight = function (weight, unitFromRow) {
          if (weight === null || weight === undefined || weight <= 0) return '';
          var num = Number(weight);
          if (!isFinite(num) || num <= 0) return '';
          var rounded = Math.round(num * 100) / 100;
          var numString;
          try {
            numString = rounded.toLocaleString(docLang, { maximumFractionDigits: 2 });
          } catch (e) {
            numString = (rounded % 1 === 0) ? String(Math.round(rounded)) : String(rounded);
          }
          return numString + ' ' + (unitFromRow || 'kg');
        };

        var refreshDetail = function (selector, rawValue, options) {
          var elements = container.querySelectorAll(selector);
          if (!elements.length) return;
          var opts = options || {};
          for (var i = 0; i < elements.length; i++) {
            var el = elements[i];
            var row = el.closest('[data-product-detail-row]');

            var value = (typeof opts.compute === 'function') ? opts.compute(row) : rawValue;
            var hasValue = (value !== null && value !== undefined && value !== '' && value !== 0 && value !== false);
            if (row) {
              if (hasValue) {
                row.hidden = false;
                el.textContent = value;
              } else {
                row.hidden = true;
                el.textContent = '';
              }
            } else {
              var hiddenLabel = el.querySelector('.visually-hidden');
              var hiddenLabelText = hiddenLabel ? hiddenLabel.outerHTML : '';
              if (hasValue) {
                el.hidden = false;
                el.innerHTML = hiddenLabelText + ' ' + escapeDetail(value);
              } else {
                el.hidden = true;
              }
            }
          }
        };

        refreshDetail('[data-product-sku]', matchedVariant.sku);
        refreshDetail('[data-product-barcode]', matchedVariant.barcode);
        refreshDetail('[data-product-weight]', null, {
          compute: function (row) {
            var unit = (row && row.getAttribute('data-weight-unit')) || matchedVariant.weight_unit;
            return formatVariantWeight(matchedVariant.weight, unit);
          }
        });
      } catch (e) {  }

      var activePlanInput = form.querySelector('input[name="selling_plan"]:checked');
      var activePlanId = activePlanInput ? activePlanInput.value : null;

      if (activePlanId && matchedVariant.selling_plan_allocations) {
        var planStillValid = false;
        for (var pi = 0; pi < matchedVariant.selling_plan_allocations.length; pi++) {
          var alloc = matchedVariant.selling_plan_allocations[pi];
          if (alloc && String(alloc.selling_plan_id) === String(activePlanId)) {
            planStillValid = true;
            break;
          }
        }
        if (!planStillValid) {
          if (activePlanInput) activePlanInput.checked = false;
          activePlanId = null;

          if (window.Kitchero && typeof Kitchero.announce === 'function' && Kitchero.variantStrings && Kitchero.variantStrings.subscriptionUnavailable) {
            Kitchero.announce(Kitchero.variantStrings.subscriptionUnavailable);
          }
        }
      } else if (activePlanId && !matchedVariant.selling_plan_allocations) {
        if (activePlanInput) activePlanInput.checked = false;
        activePlanId = null;
      }

      renderPriceForVariant(container, matchedVariant, activePlanId);

      try {
        var lowStockEl = container.querySelector('[data-low-stock]');
        if (lowStockEl) {
          var threshold = (window.Kitchero && Kitchero.lowStockThreshold) || 0;
          var trackedQty = matchedVariant.inventory_management === 'shopify' ? matchedVariant.inventory_quantity : null;
          var showLowStock = (
            matchedVariant.available &&
            trackedQty !== null &&
            trackedQty > 0 &&
            threshold > 0 &&
            trackedQty <= threshold
          );
          if (showLowStock) {
            var lowStrings = (window.Kitchero && Kitchero.variantStrings) || {};
            var tmpl = (trackedQty === 1 && lowStrings.lowStockOneHtml)
              ? lowStrings.lowStockOneHtml
              : (lowStrings.lowStockHtml || 'Only [count] left');
            lowStockEl.textContent = tmpl.replace('[count]', trackedQty);
            lowStockEl.hidden = false;
          } else {
            lowStockEl.hidden = true;
            lowStockEl.textContent = '';
          }
        }
      } catch (e) {  }

      try {
        var preorderEls = container.querySelectorAll('[data-preorder]');
        if (preorderEls.length) {
          var preorderTrackedQty = matchedVariant.inventory_management === 'shopify' ? matchedVariant.inventory_quantity : null;
          var showPreorder = (
            preorderTrackedQty !== null &&
            preorderTrackedQty <= 0 &&
            matchedVariant.inventory_policy === 'continue'
          );
          for (var pi = 0; pi < preorderEls.length; pi++) {
            preorderEls[pi].hidden = !showPreorder;
          }
        }
      } catch (e) {  }

      try {
        var inEl = container.querySelector('[data-stock-status="in"]');
        var outEl = container.querySelector('[data-stock-status="out"]');
        if (inEl || outEl) {
          var lowStockOwning = false;
          var lowStockProbe = container.querySelector('[data-low-stock]');
          if (lowStockProbe && lowStockProbe.hidden === false) {
            lowStockOwning = true;
          }
          var showIn = !lowStockOwning && matchedVariant.available === true;
          var showOut = !lowStockOwning && matchedVariant.available === false;
          if (inEl) inEl.hidden = !showIn;
          if (outEl) outEl.hidden = !showOut;
        }
      } catch (e) {  }

      if (atcBtn) {
        atcBtn.disabled = !matchedVariant.available;
        if (atcText) {
          atcText.textContent = matchedVariant.available
            ? (Kitchero.variantStrings ? Kitchero.variantStrings.addToCart : 'Add to cart')
            : (Kitchero.variantStrings ? Kitchero.variantStrings.soldOut : 'Sold out');
        }
      }

      try {
        var dynCheckoutWraps = container.querySelectorAll('[data-payment-button-wrapper]');
        for (var dci = 0; dci < dynCheckoutWraps.length; dci++) {
          var wrap = dynCheckoutWraps[dci];
          if (matchedVariant.available) {
            wrap.removeAttribute('aria-disabled');
            wrap.style.pointerEvents = '';
            wrap.style.opacity = '';
          } else {
            wrap.setAttribute('aria-disabled', 'true');
            wrap.style.pointerEvents = 'none';
            wrap.style.opacity = '0.5';
          }
        }
      } catch (e) {  }

      try {
        var backInStockTrigger = container.querySelector('[data-back-in-stock-trigger]');
        if (backInStockTrigger) {
          backInStockTrigger.hidden = matchedVariant.available;
        }
      } catch (e) {  }

      if (window.Kitchero && typeof Kitchero.announce === 'function') {
        var announcement = matchedVariant.title;
        if (!matchedVariant.available && Kitchero.variantStrings && Kitchero.variantStrings.soldOut) {
          announcement += ' — ' + Kitchero.variantStrings.soldOut;
        } else {
          var priceEl = container.querySelector('.kt-product-price__current');
          if (priceEl && priceEl.textContent) {
            announcement += ' — ' + priceEl.textContent.trim();
          }
        }
        Kitchero.announce(announcement);
      }

      var targetMediaId = null;
      if (matchedVariant.featured_media && matchedVariant.featured_media.id) {
        targetMediaId = matchedVariant.featured_media.id;
      } else if (matchedVariant.featured_image && matchedVariant.featured_image.id) {
        targetMediaId = matchedVariant.featured_image.id;
      }

      if (targetMediaId) {
        var gallery = container.querySelector('[data-product-gallery]');
        if (gallery) {
          gallery.dispatchEvent(new CustomEvent('gallery:goto', {
            detail: { mediaId: targetMediaId }
          }));
        } else {
          var imgWrap = container.querySelector('[data-variant-featured-image]');
          var imgEl = imgWrap && imgWrap.querySelector('img');
          var variantImage = matchedVariant.featured_image || (matchedVariant.featured_media && matchedVariant.featured_media.preview_image);
          if (imgEl && variantImage && variantImage.src) {
            var baseSrc;
            try {
              var parsed = new URL(variantImage.src, window.location.origin);
              parsed.search = '';
              parsed.hash = '';
              baseSrc = parsed.toString();
            } catch (urlErr) {
              baseSrc = variantImage.src.split('?')[0].split('#')[0];
            }
            var existingWidths = [400, 600, 900, 1200];
            try {
              imgEl.src = baseSrc + '?width=1200';
              imgEl.srcset = existingWidths
                .map(function (w) { return baseSrc + '?width=' + w + ' ' + w + 'w'; })
                .join(', ');
              if (variantImage.alt) imgEl.alt = variantImage.alt;
              if (variantImage.width && variantImage.height) {
                imgEl.setAttribute('width', String(variantImage.width));
                imgEl.setAttribute('height', String(variantImage.height));
              }
            } catch (swapErr) {  }
          }
        }
      }
    } else {
      if (variantIdInput) variantIdInput.value = '';
      if (variantSelect) variantSelect.value = '';

      if (atcBtn) {
        atcBtn.disabled = true;
        if (atcText) {
          atcText.textContent = (Kitchero.variantStrings && Kitchero.variantStrings.unavailable)
            || (Kitchero.variantStrings && Kitchero.variantStrings.soldOut)
            || 'Unavailable';
        }
      }

      if (window.Kitchero && typeof Kitchero.announce === 'function') {
        var unavailableMsg = (Kitchero.variantStrings && Kitchero.variantStrings.unavailable)
          || 'This combination is unavailable';
        Kitchero.announce(unavailableMsg, 'assertive');
      }
    }
  }

  function formatMoney(cents) {
    if (window.Kitchero && typeof window.Kitchero.formatMoney === 'function') {
      return window.Kitchero.formatMoney(cents);
    }
    var currency = (window.Shopify && window.Shopify.currency && window.Shopify.currency.active) || 'USD';
    var locale = (document.documentElement.lang || 'en').replace('_', '-');
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency
      }).format(cents / 100);
    } catch (e) {
      return new Intl.NumberFormat('en', {
        style: 'currency',
        currency: 'USD'
      }).format(cents / 100);
    }
  }

  function renderPriceForVariant(container, variant, sellingPlanId) {
    if (!container || !variant) return;
    var priceEl = container.querySelector('.kt-product-price__current');
    var compareEl = container.querySelector('.kt-product-price__compare');
    var discountEl = container.querySelector('.kt-product-price__discount');

    var displayPrice = variant.price;
    var comparePrice = variant.compare_at_price || 0;

    if (sellingPlanId && variant.selling_plan_allocations && variant.selling_plan_allocations.length) {
      for (var i = 0; i < variant.selling_plan_allocations.length; i++) {
        var alloc = variant.selling_plan_allocations[i];
        if (String(alloc.selling_plan_id) === String(sellingPlanId)) {
          displayPrice = alloc.price;

          var subCompare = variant.price;
          if (subCompare > displayPrice) {
            comparePrice = Math.max(comparePrice, subCompare);
          }
          break;
        }
      }
    }

    if (priceEl) {
      priceEl.textContent = formatMoney(displayPrice);
    }

    if (comparePrice && comparePrice > displayPrice) {
      if (compareEl) {
        compareEl.textContent = formatMoney(comparePrice);
        compareEl.style.display = '';
      }
      if (discountEl) {
        var pct = Math.round(((comparePrice - displayPrice) / comparePrice) * 100);
        discountEl.textContent = '-' + pct + '%';
        discountEl.style.display = '';
      }
    } else {
      if (compareEl) compareEl.style.display = 'none';
      if (discountEl) discountEl.style.display = 'none';
    }

    var volumeEl = container.querySelector('[data-volume-pricing]');
    if (volumeEl) {
      var breaks = variant && variant.quantity_price_breaks;
      if (breaks && breaks.length) {
        var template = (window.Kitchero && Kitchero.variantStrings && Kitchero.variantStrings.volumeQtyHtml) || '[qty]+';
        var html = '';
        for (var bi = 0; bi < breaks.length; bi++) {
          var brk = breaks[bi];
          var qtyLabel = template.replace('[qty]', String(brk.minimum_quantity));
          html += '<li class="kt-product-price__break">' +
            '<span class="kt-product-price__break-qty">' + qtyLabel + '</span>' +
            '<span class="kt-product-price__break-price">' + formatMoney(brk.price) + '</span>' +
          '</li>';
        }
        volumeEl.innerHTML = html;
        volumeEl.hidden = false;
      } else {
        volumeEl.innerHTML = '';
        volumeEl.hidden = true;
      }
    }

    var unitWrap = container.querySelector('[data-unit-price]');
    if (unitWrap) {
      var upm = variant && variant.unit_price_measurement;
      if (upm && variant.unit_price) {
        var unitValueEl = unitWrap.querySelector('.kt-product-price__unit-value');
        var unitRefEl   = unitWrap.querySelector('.kt-product-price__unit-ref');
        var unitQtyEl   = unitWrap.querySelector('.kt-product-price__unit-qty');
        if (unitValueEl) unitValueEl.textContent = formatMoney(variant.unit_price);
        if (unitRefEl) {
          var refText = '';
          if (upm.reference_value !== 1) {
            refText = String(upm.reference_value) + ' ';
          }
          refText += String(upm.reference_unit || '');
          unitRefEl.textContent = refText;
        }
        if (unitQtyEl) {
          if (upm.quantity_value !== upm.reference_value) {
            var template = unitQtyEl.getAttribute('data-template') || '';
            var rendered = template
              .replace('{quantity_value}', String(upm.quantity_value))
              .replace('{quantity_unit}', String(upm.quantity_unit || ''))
              .replace('{reference_value}', String(upm.reference_value))
              .replace('{reference_unit}', String(upm.reference_unit || ''));
            unitQtyEl.textContent = '(' + rendered + ')';
            unitQtyEl.style.display = '';
          } else {
            unitQtyEl.style.display = 'none';
          }
        }
        unitWrap.style.display = '';
      } else {
        unitWrap.style.display = 'none';
      }
    }
  }

  document.addEventListener('selling-plan:change', function (e) {
    var container = e.target && (e.target.closest ? e.target.closest('[data-section-type]') : null);
    if (!container || !container.dataset) return;
    var planId = (e.detail && e.detail.planId) || null;
    var variant = null;
    var variantJson = container.dataset.currentVariantJson;
    if (variantJson) {
      try { variant = JSON.parse(variantJson); } catch (err) { variant = null; }
    }
    if (!variant) {
      var form = container.querySelector('[data-product-form] form, form[data-product-form], form[action$="/cart/add"]');
      var select = form && form.querySelector('[data-variant-select]');
      if (select && select.value) {
        var targetId = Number(select.value);
        var variants = getVariantsData(container);
        for (var vi = 0; vi < variants.length; vi++) {
          if (variants[vi] && Number(variants[vi].id) === targetId) {
            variant = variants[vi];
            try { container.dataset.currentVariantJson = JSON.stringify(variant); } catch (e) {}
            break;
          }
        }
      }
    }
    if (!variant) return;
    try {
      renderPriceForVariant(container, variant, planId);

      var atcText = container.querySelector('[data-add-to-cart-text]');
      if (atcText && Kitchero.variantStrings) {
        if (planId) {
          atcText.textContent = Kitchero.variantStrings.addSubscription
            || Kitchero.variantStrings.addToCart
            || 'Add subscription to cart';
        } else {
          atcText.textContent = Kitchero.variantStrings.addToCart || 'Add to cart';
        }
      }

      if (window.Kitchero && typeof Kitchero.announce === 'function') {
        var priceEl = container.querySelector('.kt-product-price__current');
        if (priceEl && priceEl.textContent) {
          Kitchero.announce(priceEl.textContent.trim());
        }
      }
    } catch (err) {  }
  });

  function initShareButton(btn) {
    if (!btn || btn.dataset.shareInit === '1') return;
    btn.dataset.shareInit = '1';

    var title = btn.getAttribute('data-share-title') || document.title;
    var url = btn.getAttribute('data-share-url') || window.location.href;
    var labelEl = btn.querySelector('[data-share-label]');
    var labelDefault = btn.getAttribute('data-label-default') || 'Share';
    var labelCopied = btn.getAttribute('data-label-copied') || 'Link copied';

    btn.addEventListener('click', function () {
      if (navigator.share) {
        navigator.share({ title: title, url: url }).catch(function () {  });
        return;
      }
      var restore = function () {
        setTimeout(function () {
          if (labelEl) labelEl.textContent = labelDefault;
        }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () {
          if (labelEl) labelEl.textContent = labelCopied;
          restore();
        }).catch(function () {
          legacyCopyFallback();
        });
        return;
      }

      legacyCopyFallback();

      function legacyCopyFallback() {
        try {
          var ta = document.createElement('textarea');
          ta.value = url;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          ta.style.left = '-9999px';
          ta.setAttribute('readonly', '');
          document.body.appendChild(ta);
          ta.select();
          var ok = false;
          try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
          document.body.removeChild(ta);
          if (ok && labelEl) {
            labelEl.textContent = labelCopied;
            restore();
          }
        } catch (e) {
        }
      }
    });
  }

  function initActions(container) {
    container.querySelectorAll('[data-share-btn]').forEach(initShareButton);
  }

  var PRODUCT_SECTION_SELECTOR = '[data-section-type="main-product"], [data-section-type="featured-product"]';

  document.querySelectorAll(PRODUCT_SECTION_SELECTOR).forEach(function (el) {
    initProductForm(el);
    initActions(el);
  });

  if (!window.__kitcheroProductPopstateBound) {
    window.__kitcheroProductPopstateBound = true;

    function syncPickerFromUrl(resetToDefault) {
      var section = document.querySelector('[data-section-type="main-product"]');
      if (!section) return;
      var params = new URLSearchParams(window.location.search);
      var variantParam = params.get('variant');
      var variants = getVariantsData(section);
      var targetVariant = null;
      if (variantParam) {
        var targetVariantId = parseInt(variantParam, 10);
        if (!isNaN(targetVariantId)) {
          for (var v = 0; v < variants.length; v++) {
            if (variants[v].id === targetVariantId) { targetVariant = variants[v]; break; }
          }
        }
      } else if (resetToDefault) {
        for (var vi = 0; vi < variants.length; vi++) {
          if (variants[vi] && variants[vi].available) { targetVariant = variants[vi]; break; }
        }
        if (!targetVariant && variants.length) targetVariant = variants[0];
      }
      if (!targetVariant || !targetVariant.options) return;
      targetVariant.options.forEach(function (optValue, optIndex) {
        var radios = section.querySelectorAll('[data-option-index="' + optIndex + '"] [data-option-value]');
        radios.forEach(function (radio) {
          if (radio.value === optValue && !radio.checked) {
            radio.checked = true;
            radio.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });
      });
    }
    window.addEventListener('popstate', function () { syncPickerFromUrl(true); });

    window.addEventListener('pageshow', function (event) {
      if (event.persisted) syncPickerFromUrl(true);
    });
  }

  document.addEventListener('shopify:section:load', function (e) {
    var section = e.target.querySelector(PRODUCT_SECTION_SELECTOR);
    if (section) {
      initProductForm(section);
      initActions(section);
    }
  });

  document.addEventListener('shopify:section:unload', function (e) {
    var section = e.target.querySelector
      ? e.target.querySelector(PRODUCT_SECTION_SELECTOR)
      : null;
    if (!section) return;
    var form = section.querySelector('form');
    if (form && form.__kitcheroAtcController) {
      try { form.__kitcheroAtcController.abort(); } catch (err) {  }
      delete form.__kitcheroAtcController;
    }
  });
})();
