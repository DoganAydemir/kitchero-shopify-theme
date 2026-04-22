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
    var atcInflight = false;
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      /* Inflight guard — prevents a rapid double-tap from submitting
         two /cart/add.js requests. Shopify's add endpoint is NOT
         idempotent: two identical POSTs within 100 ms add the item
         twice. Reject the second submit until the first finishes. */
      if (atcInflight) return;
      atcInflight = true;

      clearError();

      /* Build the add-to-cart payload from the whole form, not just
         {id, quantity}. Previously the hand-rolled object dropped
         every other input the form carries:
           - `selling_plan`         → subscription/pre-order products
             failed silently (customer picked a plan, cart added as
             one-time; if product.requires_selling_plan the /cart/add
             returned 422 with no visible error).
           - `properties[*]`         → gift-card recipient email/name/
             send-on-date, engraving text, gift-wrap toggle, and any
             merchant-added custom line-item properties all vanished
             before hitting Shopify. Gift-card recipients never got
             their email; engraved orders shipped blank.
           - File upload inputs      → properties with `type="file"`
             (custom monograms) dropped.
         `FormData(form)` picks up every named field including
         selling_plan + properties[*] automatically. Shopify's
         /cart/add.js accepts multipart/form-data, so the `Content-Type`
         header is removed here to let the browser set the correct
         boundary-aware value. */
      var formData = new FormData(form);

      /* Loading state — use a dedicated `--loading` class + aria-busy
         instead of `disabled`. The :disabled selector carries the
         sold-out red styling in CSS, which would flash on every ATC
         click if we reused it here. */
      if (atcBtn) {
        atcBtn.classList.add('kt-product-form__atc--loading');
        atcBtn.setAttribute('aria-busy', 'true');
        /* inert/aria-disabled keep the button non-interactive for
           keyboard and screen-reader users without inheriting the
           sold-out red scheme from :disabled. */
        atcBtn.setAttribute('aria-disabled', 'true');
      }

      fetch(Kitchero.routes.cartAdd + '.js', {
        method: 'POST',
        /* No Content-Type header — FormData triggers the browser to
           set multipart/form-data with the right boundary. */
        headers: { 'Accept': 'application/json' },
        body: formData
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
          /* SR announcement — cart-count span only covers the case
             where the visible count changed. For blind users on a
             single-quantity PDP we want an explicit "Added to cart"
             even though the count going 0→1 already implies it. The
             visual button state reverts after 2s, so leaning on the
             button's textContent for announcement would miss readers
             who arrive at it after the revert. */
          if (window.Kitchero && typeof Kitchero.announce === 'function') {
            Kitchero.announce(addedLabel);
          }

          var cartType = document.body.getAttribute('data-cart-type') || 'drawer';

          if (cartType === 'page') {
            /* Page mode — the merchant wants customers on the /cart
               page after adding. Refresh header count first so it
               blips visibly, then navigate. The delay keeps the
               "Added to Cart!" success state on the button long
               enough for the customer to register what happened.
               The .catch belt-and-braces the navigation: if the
               header-count fetch fails (offline, blocked) we still
               navigate to /cart so the customer isn't stranded on
               the success state forever. */
            fetch(Kitchero.routes.cart + '.js')
              .then(function (r) { return r.json(); })
              .then(function (cart) {
                document.querySelectorAll('.kt-header__cart-count').forEach(function (el) {
                  el.textContent = cart.item_count;
                  el.style.display = cart.item_count > 0 ? '' : 'none';
                });
              })
              .catch(function () {
                /* header count refresh failed; still navigate. */
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
                /* Prefer the custom element's open() — moves focus into
                   the drawer (close button) so SR users hear the drawer
                   announced instead of staying on the ATC button they
                   just clicked, which no longer represents the primary
                   action. Falls back to raw aria-hidden toggle for the
                   rare case where the custom element hasn't upgraded
                   yet (script eval race). */
                var drawerEl = window.kitcheroCartDrawer || document.querySelector('cart-drawer') || document.getElementById('cart-drawer');
                if (drawerEl && typeof drawerEl.open === 'function') {
                  drawerEl.open();
                } else if (drawerEl) {
                  /* Fallback path: `cart-drawer.js` custom element hasn't
                     upgraded yet (script eval race), so we do a minimal
                     manual open. Use the same 'cart-drawer' scrollLock
                     owner id the drawer component uses so its own
                     close() correctly releases the lock later. */
                  drawerEl.setAttribute('aria-hidden', 'false');
                  drawerEl.removeAttribute('inert');
                  if (window.Kitchero && Kitchero.scrollLock) {
                    Kitchero.scrollLock.lock('cart-drawer');
                  } else {
                    document.body.style.overflow = 'hidden';
                  }
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
            atcBtn.removeAttribute('aria-disabled');
          }
          var fallback = (Kitchero.variantStrings && Kitchero.variantStrings.addToCartError)
            || 'Something went wrong. Please try again.';
          var errorMessage = (error && error.message) || fallback;
          showError(errorMessage);
          /* Announce the error assertively — blind users otherwise
             only discover the failure after pressing ATC again and
             wondering why the cart count didn't advance. */
          if (window.Kitchero && typeof Kitchero.announce === 'function') {
            Kitchero.announce(errorMessage, 'assertive');
          }
        })
        .then(function () {
          /* Release inflight lock regardless of path. On success the
             aria-disabled is released here (not in the success branch
             because that branch continues to refresh + navigate after
             a 700ms delay). Page-mode re-enables the button briefly
             before the navigation actually happens; that's cosmetic
             and harmless. */
          atcInflight = false;
          if (atcBtn && atcBtn.hasAttribute('aria-disabled')) {
            atcBtn.removeAttribute('aria-disabled');
          }
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

      /* Format prices for the active Shopify market. Previously we
         called `Shopify.formatMoney` with a `$NN.NN` fallback — but
         `Shopify.formatMoney` isn't loaded in this theme (no
         shopify_common.js / option_selection.js). On every EUR/TRY/
         GBP market the fallback fired, flashing `$149.00` the instant
         a customer clicked a swatch even though the Liquid-rendered
         initial price read `€149,00`. Theme Store multi-country test
         catches this. Use `Intl.NumberFormat` locked to
         `Shopify.currency.active` (set on every market) with the
         document's active locale for correct decimal separator +
         symbol placement. */
      function formatMoney(cents) {
        var currency = (window.Shopify && window.Shopify.currency && window.Shopify.currency.active) || 'USD';
        var locale = (document.documentElement.lang || 'en').replace('_', '-');
        try {
          return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency
          }).format(cents / 100);
        } catch (e) {
          /* Invalid locale/currency — fall back to USD formatting so
             we at least don't throw. */
          return new Intl.NumberFormat('en', {
            style: 'currency',
            currency: 'USD'
          }).format(cents / 100);
        }
      }

      if (priceEl) {
        priceEl.textContent = formatMoney(matchedVariant.price);
      }

      if (matchedVariant.compare_at_price && matchedVariant.compare_at_price > matchedVariant.price) {
        if (compareEl) {
          compareEl.textContent = formatMoney(matchedVariant.compare_at_price);
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

      /* Announce the variant change + new price to the polite SR live
         region. Visual swatch + label swap happens silently otherwise
         — blind users hear nothing after picking a swatch, and the
         sold-out state change is invisible to them. Skipped when the
         announcer utility hasn't loaded yet (early page state). */
      if (window.Kitchero && typeof Kitchero.announce === 'function') {
        var announcement = matchedVariant.title;
        if (!matchedVariant.available && Kitchero.variantStrings && Kitchero.variantStrings.soldOut) {
          announcement += ' — ' + Kitchero.variantStrings.soldOut;
        } else if (priceEl && priceEl.textContent) {
          announcement += ' — ' + priceEl.textContent.trim();
        }
        Kitchero.announce(announcement);
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
        }).catch(function () {
          legacyCopyFallback();
        });
        return;
      }

      /* Last-resort fallback for browsers without Web Share API AND
         without Clipboard API (or with both blocked — permission
         policy, insecure context, etc.). Fill a hidden textarea with
         the share URL, select it, execCommand('copy'), and toast
         "Link copied" if it succeeded. If even that fails, select
         the text so the customer can press Ctrl+C manually. */
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
          /* Give up silently. The <a href> fallback on the button
             element's own `href` attribute (when present) is the
             customer's remaining recourse. */
        }
      }
    });
  }

  function initActions(container) {
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
