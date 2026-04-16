/**
 * Product Form — quantity buttons + AJAX add to cart + variant switching
 * Re-inits on shopify:section:load.
 */
(function () {
  'use strict';

  /**
   * Pull a fresh copy of the cart-drawer HTML from the server and swap
   * it into the DOM in place of the current (stale) drawer contents.
   *
   * The cart drawer is a snippet rendered inside layout/theme.liquid,
   * not a Shopify section — so Section Rendering API's `?sections=`
   * query param doesn't target it directly. Instead, fetch the current
   * page as HTML, find #cart-drawer, and replace our drawer's panel
   * innards with the new markup. Also syncs the header cart count.
   *
   * Returns a Promise that resolves when the DOM has been updated, or
   * rejects so the caller can fall back to a JSON-only count update.
   */
  function refreshCartDrawer() {
    return fetch(window.location.pathname, {
      headers: { 'Accept': 'text/html' },
    })
      .then(function (response) {
        if (!response.ok) throw new Error('Cart drawer refresh: page fetch failed');
        return response.text();
      })
      .then(function (html) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, 'text/html');

        /* Swap the cart drawer panel (items + totals + CTA) */
        var currentPanel = document.querySelector('#cart-drawer .kt-cart-drawer__panel');
        var newPanel = doc.querySelector('#cart-drawer .kt-cart-drawer__panel');
        if (currentPanel && newPanel) {
          currentPanel.innerHTML = newPanel.innerHTML;
        }

        /* Sync the header cart count */
        var newCount = doc.querySelector('.kt-header__cart-count');
        document.querySelectorAll('.kt-header__cart-count').forEach(function (el) {
          if (newCount) {
            el.textContent = newCount.textContent;
            el.style.display = newCount.style.display || '';
          }
        });

        /* No rebind needed — cart-drawer.js now uses event delegation
           on the drawer root, so close + qty buttons keep working even
           after innerHTML swap. */
      });
  }

  function initProductForm(container) {
    var form = container.querySelector('[data-product-form]');
    if (!form) return;

    var variantIdInput = form.querySelector('[data-variant-id]');
    var qtyInput = form.querySelector('[data-qty-input]');
    var minusBtn = form.querySelector('[data-qty-minus]');
    var plusBtn = form.querySelector('[data-qty-plus]');
    var atcBtn = form.querySelector('[data-add-to-cart]');
    var atcText = form.querySelector('[data-add-to-cart-text]');
    var variantSelect = container.querySelector('[data-variant-select]');
    var optionInputs = container.querySelectorAll('[data-option-value]');

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

      fetch(window.routes.cart_add_url + '.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
        .then(function (response) {
          if (!response.ok) throw new Error('Add to cart failed');
          return response.json();
        })
        .then(function () {
          /* Show success state */
          if (atcBtn) {
            atcBtn.classList.remove('kt-product-form__atc--loading');
            atcBtn.removeAttribute('aria-busy');
            atcBtn.classList.add('kt-product-form__atc--added');
            if (atcText) atcText.textContent = 'Added to Cart!';
            setTimeout(function () {
              atcBtn.classList.remove('kt-product-form__atc--added');
              if (atcText) atcText.textContent = window.variantStrings ? window.variantStrings.addToCart : 'Add to cart';
            }, 2000);
          }

          /* Refresh the cart drawer DOM (line items + totals) by
             fetching the current page and replacing the drawer's inner
             content with the freshly-rendered HTML. Also updates the
             header cart count in the same pass. Falls back to a JSON
             count-only update if the page fetch fails. */
          refreshCartDrawer()
            .catch(function () {
              return fetch(window.routes.cart_url + '.js')
                .then(function (r) { return r.json(); })
                .then(function (cart) {
                  document.querySelectorAll('.kt-header__cart-count').forEach(function (el) {
                    el.textContent = cart.item_count;
                    el.style.display = cart.item_count > 0 ? '' : 'none';
                  });
                });
            })
            .then(function () {
              /* Open the drawer AFTER it has fresh HTML so the visitor
                 sees the item they just added. */
              var cartDrawer = document.getElementById('cart-drawer');
              if (cartDrawer) {
                cartDrawer.setAttribute('aria-hidden', 'false');
                document.body.style.overflow = 'hidden';
              }
            });

          /* Publish event */
          if (typeof publish === 'function') publish('cart:update', formData);
        })
        .catch(function (error) {
          console.error('Add to cart error:', error);
          if (atcBtn) {
            atcBtn.classList.remove('kt-product-form__atc--loading');
            atcBtn.removeAttribute('aria-busy');
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
            ? (window.variantStrings ? window.variantStrings.addToCart : 'Add to cart')
            : (window.variantStrings ? window.variantStrings.soldOut : 'Sold out');
        }
      }

      /* Update gallery to variant image if available */
      if (matchedVariant.featured_image) {
        var gallerySlides = container.querySelectorAll('[data-gallery-slide]');
        var galleryThumbs = container.querySelectorAll('[data-gallery-thumb-btn]');
        gallerySlides.forEach(function (slide, idx) {
          var img = slide.querySelector('img');
          if (img && img.src.includes(matchedVariant.featured_image.src.split('?')[0].split('/').pop())) {
            gallerySlides.forEach(function (s) { s.classList.remove('kt-gallery__slide--active'); });
            galleryThumbs.forEach(function (t) { t.classList.remove('kt-gallery__thumb--active'); });
            slide.classList.add('kt-gallery__slide--active');
            if (galleryThumbs[idx]) galleryThumbs[idx].classList.add('kt-gallery__thumb--active');
          }
        });
      }
    }
  }

  /* Init */
  document.querySelectorAll('[data-section-type="main-product"]').forEach(function (el) {
    initProductForm(el);
  });

  document.addEventListener('shopify:section:load', function (e) {
    var section = e.target.querySelector('[data-section-type="main-product"]');
    if (section) initProductForm(section);
  });
})();
