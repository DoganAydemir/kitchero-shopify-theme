/**
 * Product Form — quantity buttons + AJAX add to cart + variant switching
 * Re-inits on shopify:section:load.
 */
(function () {
  'use strict';

  /**
   * Delegates to cart-drawer.js's refreshDrawer() so the fetch-and-swap
   * logic lives in one place. Falls back to a JSON-only cart-count
   * sync if no drawer is on the page (e.g. cart_type: page).
   */
  function refreshCartDrawer() {
    if (window.kitcheroCartDrawer && typeof window.kitcheroCartDrawer.refreshDrawer === 'function') {
      return window.kitcheroCartDrawer.refreshDrawer();
    }
    return fetch(Kitchero.routes.cart + '.js')
      .then(function (r) { return r.json(); })
      .then(function (cart) {
        document.querySelectorAll('.kt-header__cart-count').forEach(function (el) {
          el.textContent = cart.item_count;
          el.style.display = cart.item_count > 0 ? '' : 'none';
        });
      });
  }

  function initProductForm(container) {
    /* `[data-product-form]` is on the wrapper <div>, not the <form>
       itself — hyphenated kwargs inside a `{% form %}` tag are fragile
       (see snippets/product-form.liquid). We grab the wrapper first,
       then locate the real <form> element inside it for the submit
       listener. */
    var wrapper = container.querySelector('[data-product-form]');
    if (!wrapper) return;
    var form = wrapper.querySelector('form');
    if (!form) return;
    /* Guard against double-binding. shopify:section:load fires whenever
       the merchant changes a product-section setting in the editor,
       and our listeners are all on scoped elements (form, buttons,
       inputs) that GC with the section, so no unload cleanup is
       needed — but we must not stack a second submit handler on the
       same form or add-to-cart would fire twice. */
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

    function clearError() {
      if (!errorEl) return;
      errorEl.hidden = true;
      errorEl.textContent = '';
    }

    function showError(message) {
      if (!errorEl) return;
      errorEl.textContent = message;
      errorEl.hidden = false;
    }

    /* Quantity buttons */
    if (minusBtn && qtyInput) {
      minusBtn.addEventListener('click', function () {
        var val = parseInt(qtyInput.value, 10) || 1;
        qtyInput.value = Math.max(1, val - 1);
      });
    }

    if (plusBtn && qtyInput) {
      plusBtn.addEventListener('click', function () {
        var val = parseInt(qtyInput.value, 10) || 1;
        qtyInput.value = val + 1;
      });
    }

    /* Sanitize manual typed input — clamp to integers >= 1 on blur.
       Customers can now edit the quantity directly; keep the field
       honest so we never POST "0" or "abc" to /cart/add.js. */
    if (qtyInput) {
      qtyInput.addEventListener('blur', function () {
        var val = parseInt(qtyInput.value, 10);
        if (!val || val < 1) qtyInput.value = 1;
        else qtyInput.value = val;
      });
    }

    /* Variant switching — when option radio changes, find matching variant */
    if (optionInputs.length > 0 && variantSelect) {
      optionInputs.forEach(function (input) {
        input.addEventListener('change', function () {
          updateVariant(container, variantIdInput, variantSelect, atcBtn, atcText);

          /* Update selected label */
          var group = input.closest('[data-option-index]');
          if (group) {
            var idx = group.dataset.optionIndex;
            var selectedLabel = group.querySelector('[data-option-selected="' + idx + '"]');
            if (selectedLabel) selectedLabel.textContent = input.value;
          }
        });
      });
    }

    /* AJAX Add to Cart */
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      clearError();

      var formData = {
        id: parseInt(variantIdInput ? variantIdInput.value : form.querySelector('[name="id"]').value, 10),
        quantity: parseInt(qtyInput ? qtyInput.value : 1, 10)
      };

      /* Loading state — use a dedicated `--loading` class + aria-busy
         instead of `disabled`. The :disabled selector carries the
         sold-out red styling in CSS, which would flash on every ATC
         click if we reused it here. */
      if (atcBtn) {
        atcBtn.classList.add('kt-product-form__atc--loading');
        atcBtn.setAttribute('aria-busy', 'true');
      }

      fetch(Kitchero.routes.cartAdd + '.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(formData)
      })
        .then(function (response) {
          /* Shopify returns a JSON body with `description` on 422
             (quantity/stock errors) — surface it to the customer
             verbatim since it's already localized by Shopify. */
          return response.json().then(function (data) {
            if (!response.ok) {
              var msg = (data && (data.description || data.message))
                || (Kitchero.variantStrings && Kitchero.variantStrings.addToCartError)
                || 'Something went wrong. Please try again.';
              var err = new Error(msg);
              err.handled = true;
              throw err;
            }
            return data;
          });
        })
        .then(function () {
          /* Show success state */
          if (atcBtn) {
            atcBtn.classList.remove('kt-product-form__atc--loading');
            atcBtn.removeAttribute('aria-busy');
            atcBtn.classList.add('kt-product-form__atc--added');
            var addedLabel = (Kitchero.variantStrings && Kitchero.variantStrings.addedToCart) || 'Added to cart!';
            if (atcText) atcText.textContent = addedLabel;
            setTimeout(function () {
              atcBtn.classList.remove('kt-product-form__atc--added');
              if (atcText) atcText.textContent = Kitchero.variantStrings ? Kitchero.variantStrings.addToCart : 'Add to cart';
            }, 2000);
          }

          var cartType = document.body.getAttribute('data-cart-type') || 'drawer';

          if (cartType === 'page') {
            /* Page mode — the merchant wants customers on the /cart
               page after adding. Refresh header count first so it
               blips visibly, then navigate. The delay keeps the
               "Added to Cart!" success state on the button long
               enough for the customer to register what happened. */
            fetch(Kitchero.routes.cart + '.js')
              .then(function (r) { return r.json(); })
              .then(function (cart) {
                document.querySelectorAll('.kt-header__cart-count').forEach(function (el) {
                  el.textContent = cart.item_count;
                  el.style.display = cart.item_count > 0 ? '' : 'none';
                });
              })
              .then(function () {
                setTimeout(function () {
                  window.location.href = Kitchero.routes.cart;
                }, 700);
              });
          } else {
            /* Drawer mode — refresh the drawer DOM (items + totals)
               by fetching the current page and replacing the drawer's
               inner content with the freshly-rendered HTML. Falls
               back to a JSON count-only update if the page fetch
               fails. Open the drawer only after the refresh resolves. */
            refreshCartDrawer()
              .catch(function () {
                return fetch(Kitchero.routes.cart + '.js')
                  .then(function (r) { return r.json(); })
                  .then(function (cart) {
                    document.querySelectorAll('.kt-header__cart-count').forEach(function (el) {
                      el.textContent = cart.item_count;
                      el.style.display = cart.item_count > 0 ? '' : 'none';
                    });
                  });
              })
              .then(function () {
                var cartDrawer = document.getElementById('cart-drawer');
                if (cartDrawer) {
                  cartDrawer.setAttribute('aria-hidden', 'false');
                  document.body.style.overflow = 'hidden';
                }
              });
          }

          /* Publish event */
          if (window.Kitchero && Kitchero.bus) Kitchero.bus.emit('cart:update', formData);
        })
        .catch(function (error) {
          if (!error || !error.handled) console.error('Add to cart error:', error);
          if (atcBtn) {
            atcBtn.classList.remove('kt-product-form__atc--loading');
            atcBtn.removeAttribute('aria-busy');
          }
          var fallback = (Kitchero.variantStrings && Kitchero.variantStrings.addToCartError)
            || 'Something went wrong. Please try again.';
          showError((error && error.message) || fallback);
        });
    });
  }

  function updateVariant(container, variantIdInput, variantSelect, atcBtn, atcText) {
    /* Collect selected options */
    var selectedOptions = [];
    container.querySelectorAll('[data-option-value]:checked').forEach(function (input) {
      selectedOptions.push(input.value);
    });

    /* Find matching variant */
    var options = variantSelect.querySelectorAll('option');
    var matchedVariant = null;

    options.forEach(function (option) {
      try {
        var variant = JSON.parse(option.dataset.variantJson);
        var match = true;
        for (var i = 0; i < selectedOptions.length; i++) {
          if (variant.options[i] !== selectedOptions[i]) {
            match = false;
            break;
          }
        }
        if (match) matchedVariant = variant;
      } catch (e) {}
    });

    if (matchedVariant) {
      /* Update hidden ID */
      if (variantIdInput) variantIdInput.value = matchedVariant.id;
      variantSelect.value = matchedVariant.id;

      /* Update URL */
      var url = new URL(window.location.href);
      url.searchParams.set('variant', matchedVariant.id);
      window.history.replaceState({}, '', url.toString());

      /* Update price */
      var priceEl = container.querySelector('.kt-product-price__current');
      var compareEl = container.querySelector('.kt-product-price__compare');
      var discountEl = container.querySelector('.kt-product-price__discount');

      if (priceEl) {
        priceEl.textContent = Shopify.formatMoney ? Shopify.formatMoney(matchedVariant.price) : '$' + (matchedVariant.price / 100).toFixed(2);
      }

      if (matchedVariant.compare_at_price && matchedVariant.compare_at_price > matchedVariant.price) {
        if (compareEl) {
          compareEl.textContent = Shopify.formatMoney ? Shopify.formatMoney(matchedVariant.compare_at_price) : '$' + (matchedVariant.compare_at_price / 100).toFixed(2);
          compareEl.style.display = '';
        }
        if (discountEl) {
          var pct = Math.round(((matchedVariant.compare_at_price - matchedVariant.price) / matchedVariant.compare_at_price) * 100);
          discountEl.textContent = '-' + pct + '%';
          discountEl.style.display = '';
        }
      } else {
        if (compareEl) compareEl.style.display = 'none';
        if (discountEl) discountEl.style.display = 'none';
      }

      /* Update ATC button state */
      if (atcBtn) {
        atcBtn.disabled = !matchedVariant.available;
        if (atcText) {
          atcText.textContent = matchedVariant.available
            ? (Kitchero.variantStrings ? Kitchero.variantStrings.addToCart : 'Add to cart')
            : (Kitchero.variantStrings ? Kitchero.variantStrings.soldOut : 'Sold out');
        }
      }

      /* Update gallery to variant's featured media.

         We used to match by URL path segment (img.src.includes(…)),
         which broke any time Shopify changed CDN transforms or the
         variant's `featured_image.src` differed from what was rendered
         via `image_url: width: 1200`. The stable identifier is the
         media ID, which both sides of the handshake agree on:

           • Liquid writes `data-media-id="{{ media.id }}"` on each
             slide/thumb.
           • `variant.featured_media.id` is the same numeric ID.

         We dispatch a decoupled `gallery:goto` CustomEvent on the
         gallery root so product-gallery.js remains the single owner
         of slide/thumb/lightbox state — this is the only file that
         calls `goTo(index)`, so sync issues with the lightbox's
         `currentIndex` cannot occur. Falls back to `featured_image.id`
         on the off-chance a legacy store ships without media. */
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
        }
      }
    }
  }

  /**
   * Wishlist — localStorage-backed. No server, no cookies, no tracking.
   * Persists an array of product handles under WISHLIST_KEY. The button's
   * `aria-pressed` + `.is-wishlisted` class reflect the state on load so a
   * customer returning to a PDP sees their saved state.
   */
  var WISHLIST_KEY = 'kitchero:wishlist';

  function readWishlist() {
    try {
      var raw = localStorage.getItem(WISHLIST_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function writeWishlist(list) {
    try {
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
    } catch (e) { /* quota exceeded / private mode — silently ignore */ }
  }

  function initWishlistButton(btn) {
    if (!btn || btn.dataset.wishlistInit === '1') return;
    btn.dataset.wishlistInit = '1';

    var handle = btn.getAttribute('data-product-handle');
    var labelEl = btn.querySelector('[data-wishlist-label]');
    var labelAdd = btn.getAttribute('data-label-add') || 'Add to Wishlist';
    var labelAdded = btn.getAttribute('data-label-added') || 'Saved';

    function render(isSaved) {
      btn.setAttribute('aria-pressed', isSaved ? 'true' : 'false');
      btn.classList.toggle('is-wishlisted', isSaved);
      if (labelEl) labelEl.textContent = isSaved ? labelAdded : labelAdd;
    }

    render(readWishlist().indexOf(handle) !== -1);

    btn.addEventListener('click', function () {
      var list = readWishlist();
      var idx = list.indexOf(handle);
      if (idx === -1) {
        list.push(handle);
      } else {
        list.splice(idx, 1);
      }
      writeWishlist(list);
      render(list.indexOf(handle) !== -1);
      if (window.Kitchero && Kitchero.bus) Kitchero.bus.emit('wishlist:update', { handle: handle, saved: list.indexOf(handle) !== -1 });
    });
  }

  /**
   * Share — Web Share API first, clipboard fallback. No external service.
   */
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
        navigator.share({ title: title, url: url }).catch(function () { /* user dismissed — no-op */ });
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
        }).catch(function () { /* clipboard blocked — no-op */ });
      }
    });
  }

  function initActions(container) {
    container.querySelectorAll('[data-wishlist-toggle]').forEach(initWishlistButton);
    container.querySelectorAll('[data-share-btn]').forEach(initShareButton);
  }

  /* Init — both the full PDP (`main-product`) and the homepage
     featured-product section share the same form contract:
     `[data-product-form]` wrapper + variant picker with `[data-option-value]`
     radios + `[data-variant-select]` JSON registry. Handling both with
     one set of selectors means a merchant-placed featured-product on
     the homepage gets Ajax add-to-cart, live price updates, and
     dynamic checkout behavior for free. */
  var PRODUCT_SECTION_SELECTOR = '[data-section-type="main-product"], [data-section-type="featured-product"]';

  document.querySelectorAll(PRODUCT_SECTION_SELECTOR).forEach(function (el) {
    initProductForm(el);
    initActions(el);
  });

  document.addEventListener('shopify:section:load', function (e) {
    var section = e.target.querySelector(PRODUCT_SECTION_SELECTOR);
    if (section) {
      initProductForm(section);
      initActions(section);
    }
  });
})();
