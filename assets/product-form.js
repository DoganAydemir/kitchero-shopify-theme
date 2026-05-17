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
   *
   * Looks up the drawer in two places: the canonical
   * `Kitchero.cartDrawer` namespace and the legacy
   * `window.kitcheroCartDrawer` alias (kept for backward compat — the
   * alias is removed on v2). Theme apps that grabbed the old global
   * keep working while internal callers prefer the namespaced path.
   */
  function refreshCartDrawer() {
    var drawer = (window.Kitchero && window.Kitchero.cartDrawer) || window.kitcheroCartDrawer;
    if (drawer && typeof drawer.refreshDrawer === 'function') {
      return drawer.refreshDrawer();
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

    /* VAR-04 — Shopify supports two PDP deep-link URL formats:
       ?variant=[variant-id] (resolved by Liquid into
       product.selected_variant before render) and
       ?option_values=[id-1],[id-2],... (resolved at the variant-
       value level). Most marketing surfaces and app-block
       recommendation cards now use the option_values format.

       R84 first attempt read `variant.option_values` from
       `product.variants | json` — which doesn't serialize that
       field — and silent-failed. R86 fix: read from the explicit
       <script data-option-values-map> emitted by
       product-variant-picker.liquid which IS variant→[ov-id]
       mapping data we control.

       Algorithm:
       1. Parse ?option_values URL param into Set of requested IDs
       2. Read the option-values-map JSON blob from the section
       3. Find the variant whose ID-array equals the requested set
       4. Look up that variant in the standard variants blob to
          get its `options` string array
       5. Programmatically check the matching option-value radios
       Silent no-op on parse failure or missing data. */
    try {
      var optionValuesParam = new URLSearchParams(window.location.search).get('option_values');
      if (optionValuesParam) {
        var rawIds = optionValuesParam.split(',')
          .map(function (s) { return parseInt(s.trim(), 10); })
          .filter(function (n) { return !isNaN(n); });
        /* R96 — dedupe so URLs like ?option_values=12345,12345 don't
           cause length mismatch in the variant-lookup loop below
           (each variant has unique option_value IDs; duplicates
           in the URL would never match). */
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
                    /* `data-option-index` lives on the parent
                       <fieldset> (per product-variant-picker.liquid:26),
                       not on the individual radio. Walk up via closest()
                       to read it. */
                    var fieldset = optInput.closest('[data-option-index]');
                    var optIdx = fieldset ? parseInt(fieldset.dataset.optionIndex, 10) : NaN;
                    if (!isNaN(optIdx) && lookupVariant.options[optIdx] === optInput.value) {
                      optInput.checked = true;
                    }
                  }
                }
                break;
              }
            }
          }
        }
      }
    } catch (e) { /* URLSearchParams may throw on very old browsers — silent fall-back to default variant */ }

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

    /* Quantity buttons — honour the variant's quantity_rule. The Liquid
       template emits `data-qty-min` / `data-qty-step` / `data-qty-max`
       on the input from `variant.quantity_rule.{min,increment,max}`,
       so the stepper must respect those bounds (B2B / wholesale case
       packs land qty=6,12,18 not 1,2,3). Fallback to 1/1/Infinity when
       the dataset is empty so non-B2B catalogs still increment by 1. */
    function readQtyRule() {
      var min = parseInt(qtyInput && qtyInput.dataset.qtyMin, 10);
      var step = parseInt(qtyInput && qtyInput.dataset.qtyStep, 10);
      var max = parseInt(qtyInput && qtyInput.dataset.qtyMax, 10);
      if (isNaN(min) || min < 1) min = 1;
      if (isNaN(step) || step < 1) step = 1;
      if (isNaN(max)) max = Infinity;
      return { min: min, step: step, max: max };
    }

    /* Reflect the current value vs. quantity_rule.min/max on the +/-
       button disabled state — cart drawer and cart page do this; the
       PDP stepper previously silently clamped via Math.min/Math.max,
       leaving the buttons clickable at the rule bounds. WCAG 4.1.2
       Name-Role-Value: an interactive control whose action has no
       effect should expose `disabled` state. Also a Theme Store
       consistency concern (cart vs. PDP behaviour parity). */
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

    /* Sanitize manual typed input — clamp to integers within the
       quantity_rule.min/max range AND snap to the rule.step grid on
       blur. The original clamp was hardcoded to `1` which violated
       B2B case-pack contracts (variant sold in packs of 6, customer
       types "7" → server 422 with no client-side feedback). Now we
       read the live rule from the input's `min`/`max`/`step` attrs
       (which the variant-change handler keeps in sync) and round to
       the nearest valid increment so the typed-input path matches
       the +/- button path. */
    if (qtyInput) {
      qtyInput.addEventListener('blur', function () {
        var rule = readQtyRule();
        var val = parseInt(qtyInput.value, 10);
        if (isNaN(val) || val < rule.min) {
          val = rule.min;
        } else if (rule.step > 1) {
          /* Snap to nearest valid step relative to rule.min: e.g. min=6
             step=6 → valid values 6, 12, 18 …; customer types "7", we
             snap to 6 (round-down) or 12 (round-up) — round to nearest. */
          var stepsFromMin = Math.round((val - rule.min) / rule.step);
          val = rule.min + (stepsFromMin * rule.step);
        }
        if (val > rule.max) val = rule.max;
        qtyInput.value = val;
        syncStepperDisabled();
      });
    }

    /* Initial sync so a freshly-rendered form with rule.min > 1 starts
       with the minus button disabled. */
    if (qtyInput) syncStepperDisabled();

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

      /* R298 — Browser back/forward state restoration. When the
         customer hits Back after swatch-changing into another
         variant, `popstate` fires with the PREVIOUS URL — we re-
         read `?variant=X` and re-check the matching radios so the
         UI mirrors the URL. Without this listener, Back returned
         the URL to a prior variant but the picker stayed visually
         on the latest selection — confusing + breaks bookmarks. */
      window.addEventListener('popstate', function () {
        var params = new URLSearchParams(window.location.search);
        var variantParam = params.get('variant');
        if (!variantParam) return;
        var targetVariantId = parseInt(variantParam, 10);
        if (isNaN(targetVariantId)) return;
        var variants = getVariantsData(container);
        var targetVariant = null;
        for (var v = 0; v < variants.length; v++) {
          if (variants[v].id === targetVariantId) { targetVariant = variants[v]; break; }
        }
        if (!targetVariant || !targetVariant.options) return;
        /* Re-check the matching option radios — `change` events on
           radios trigger updateVariant() above, which finishes the
           sync (price, sku, image, atc label). Skip if the radio
           is already checked to avoid an infinite popstate loop on
           pages that intercept history events. */
        targetVariant.options.forEach(function (optValue, optIndex) {
          var radios = container.querySelectorAll('[data-option-index="' + optIndex + '"] [data-option-value]');
          radios.forEach(function (radio) {
            if (radio.value === optValue && !radio.checked) {
              radio.checked = true;
              radio.dispatchEvent(new Event('change', { bubbles: true }));
            }
          });
        });
      });
    }

    /* AJAX Add to Cart */
    var atcInflight = false;
    /* AbortController scoped to this form. The inflight boolean above
       guards against rapid double-tap stacking, but it doesn't cover
       the case where the section unloads (theme editor reload, route
       change in a SPA shell) while a /cart/add.js request is still in
       flight — without a controller the success handler then writes
       to a detached DOM (atcBtn classList toggles, drawer open()).
       We keep one controller per inflight request and abort it from
       a section:unload listener registered at the file-level below. */
    var atcController = null;
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      /* Inflight guard — prevents a rapid double-tap from submitting
         two /cart/add.js requests. Shopify's add endpoint is NOT
         idempotent: two identical POSTs within 100 ms add the item
         twice. Reject the second submit until the first finishes. */
      if (atcInflight) return;
      atcInflight = true;
      atcController = new AbortController();
      /* Expose the controller on the form so the section:unload
         listener at the bottom of this file can find and abort it. */
      form.__kitcheroAtcController = atcController;

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

      /* Section Rendering API — request the cart-drawer + header
         markup in the SAME response so we don't have to fire a
         secondary GET after the POST. Saves one round-trip on every
         add-to-cart. The server returns
         `{ items: [...], sections: { 'cart-drawer': '<aside…>' } }`
         when `sections` is on the body; we read it in the success
         handler below. */
      /* R137 CART-SYNC-3 expansion: include `header-cart-icon` in the
         sections= request so the response carries BOTH the drawer panel
         and the header cart count markup. Then applySectionsHTML can
         handle the count update inline without falling through to its
         /cart.js header-count fallback fetch. Two paint targets, ONE
         network round-trip. */
      formData.append('sections', 'cart-drawer,header-cart-icon');
      formData.append('sections_url', window.location.pathname);

      fetch(Kitchero.routes.cartAdd + '.js', {
        method: 'POST',
        /* No Content-Type header — FormData triggers the browser to
           set multipart/form-data with the right boundary. */
        headers: { 'Accept': 'application/json' },
        body: formData,
        signal: atcController.signal
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
        .then(function (data) {
          /* R137 CART-SYNC-3: Capture the parsed `data` payload from
             the upstream resolver so we can hand `data.sections` to
             the drawer's applySectionsHTML below — eliminating the
             redundant secondary fetch the drawer-mode branch used to
             fire via refreshCartDrawer(). */
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

               R137 CART-SYNC-7: the ATC response (`data`) already
               returns the full cart payload — the variant just added
               carries `items_count` (older Shopify) and modern
               responses include the `data.items` array. Prefer
               reading the count from the existing payload instead of
               firing a redundant /cart.js GET. We also have
               data.sections['header-cart-icon'] from the upstream
               sections= body — apply that markup first; if absent
               (proxy stripped, app block intercepted) fall through
               to the legacy /cart.js refresh. */
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
                /* Parse failed — fall through to the /cart.js path. */
              }
            }
            var pageRefresh;
            if (pageHeaderApplied) {
              pageRefresh = Promise.resolve();
            } else {
              pageRefresh = fetch(Kitchero.routes.cart + '.js')
                .then(function (r) { return r.json(); })
                .then(function (cart) {
                  document.querySelectorAll('.kt-header__cart-count').forEach(function (el) {
                    el.textContent = cart.item_count;
                    el.style.display = cart.item_count > 0 ? '' : 'none';
                  });
                });
            }
            pageRefresh
              .catch(function () {
                /* header count refresh failed; still navigate. */
              })
              .then(function () {
                setTimeout(function () {
                  window.location.href = Kitchero.routes.cart;
                }, 700);
              });
          } else {
            /* Drawer mode — apply the cart-drawer + header-cart-icon
               section HTML returned by the SAME ATC POST (we appended
               `sections=cart-drawer` to the body on line 286 so the
               response carries pre-rendered markup). R137 CART-SYNC-3
               eliminates the secondary `refreshCartDrawer()` fetch
               that previously fired here — saves one full
               round-trip on every add-to-cart, the most-instrumented
               interaction in any Lighthouse cart-flow trace.

               Fallback chain: if drawer.applySectionsHTML is missing
               (custom element not yet upgraded — script eval race),
               OR data.sections is missing (server-side proxy stripped
               it), we drop back to the legacy refreshCartDrawer()
               path so behaviour stays correct in degraded environments.
               That fallback in turn catches its own errors with a
               JSON count-only refresh. */
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
              /* Append a second sections request body to ATC so the
                 header cart icon refreshes too — no, can't do here at
                 .then time. Instead, applySectionsHTML's header-fallback
                 branch fires a /cart.js for the count when
                 sections['header-cart-icon'] is missing. Acceptable:
                 only one extra request total (the count fallback)
                 vs the old two requests (full drawer fetch + count). */
              drawerRefresh = drawerForApply.applySectionsHTML(data.sections);
            } else {
              drawerRefresh = refreshCartDrawer();
            }

            drawerRefresh
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
                var drawerEl = (window.Kitchero && window.Kitchero.cartDrawer)
                  || window.kitcheroCartDrawer
                  || document.querySelector('cart-drawer')
                  || document.getElementById('cart-drawer');
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
          /* Section unloaded mid-fetch — controller was aborted.
             Don't surface an error to the user; the section is gone. */
          if (error && error.name === 'AbortError') return;
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
          atcController = null;
          if (form.__kitcheroAtcController) delete form.__kitcheroAtcController;
          if (atcBtn && atcBtn.hasAttribute('aria-disabled')) {
            atcBtn.removeAttribute('aria-disabled');
          }
        });
    });
  }

  /**
   * Lazy-parse the `<script type="application/json" data-variant-data>`
   * blob rendered by product-variant-picker.liquid. Previously every
   * `<option>` in the hidden variant select carried a full
   * `data-variant-json` attribute — ~600 bytes × 20 variants = 12KB
   * of HTML overhead PLUS repeated `JSON.parse` on every swatch
   * click. Parse once, cache on the container, reuse.
   *
   * Returns an array of variant objects, or an empty array on parse
   * failure (defensive — product-form.js must never throw in the
   * variant-match hot path).
   */
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
    /* Collect selected options */
    var selectedOptions = [];
    container.querySelectorAll('[data-option-value]:checked').forEach(function (input) {
      selectedOptions.push(input.value);
    });

    /* Find matching variant — iterate the cached JSON array, not the
       hidden select's options (we no longer write variant JSON per
       option). `variant.options` is `[option1, option2, option3]`
       from Shopify; compare index-by-index against the selected
       radios. */
    var variants = getVariantsData(container);
    var matchedVariant = null;
    for (var idx = 0; idx < variants.length; idx++) {
      var variant = variants[idx];
      if (!variant || !variant.options) continue;
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
      /* Update hidden ID */
      if (variantIdInput) variantIdInput.value = matchedVariant.id;
      variantSelect.value = matchedVariant.id;

      /* Update URL. R298 — Use `pushState` for the FIRST user-
         initiated variant change so the browser back button
         returns the customer to the previous variant (or to the
         page they came from). Subsequent changes within the same
         "session" use `replaceState` to avoid back-button history
         spam (5 colour clicks shouldn't yield 5 back-stack
         entries). `container._kitcheroHistoryPushed` tracks whether
         we've already pushed for this PDP visit.

         R-variant-edge — gate the URL rewrite on the section being an
         actual PDP. The same module powers `featured-product` on the
         homepage, `quick-view`, `product` blocks inside collection
         sections, etc. Without this gate, picking a swatch on a
         homepage featured-product rewrites the homepage URL to
         `/?variant=12345` — a `?variant=` param has meaning only under
         `/products/{handle}`, so refreshing or bookmarking captures a
         misleading URL and Shop reviewers flag broken navigation state.
         `data-section-type="main-product"` is set on both
         `sections/main-product.liquid` and
         `sections/main-product-showroom.liquid` (the two true PDP
         surfaces). Featured-product uses `"featured-product"`, quick-
         view uses `"quick-view"`, etc., and all skip the rewrite. */
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
      }

      /* Dispatch `variant:change` event so Shopify-native custom
         elements (`<shopify-payment-terms>` Shop Pay Installments
         banner, `<pickup-availability>` widget, app-block stock
         counters, etc.) re-fetch their state for the new variant.
         Theme Store reviewers test "variant selection updates
         dynamically" — without this dispatch, the Installments
         banner price stays frozen on the original variant. */
      try {
        container.dispatchEvent(new CustomEvent('variant:change', {
          bubbles: true,
          detail: { variant: matchedVariant }
        }));
        document.dispatchEvent(new CustomEvent('variant:change', {
          bubbles: false,
          detail: { variant: matchedVariant, productId: container.dataset.productId }
        }));
      } catch (e) { /* CustomEvent unsupported in very old browsers — ignore */ }

      /* Pickup availability — re-fetch the rendered banner via
         Shopify's Section Rendering API for the picked variant.
         Theme Store testing checklist (Section 7) explicitly tests:
         a variant available at five locations must show five rows; a
         variant only available at non-pickup locations must hide the
         banner; a variant sold out everywhere must clear it. The
         banner is rendered server-side once on first paint by
         `snippets/pickup-availability.liquid`, but the variant-level
         pickup payload (`variant.store_availabilities`) varies between
         variants, so the banner has to be re-rendered, not just
         re-styled. We fetch
           /products/{handle}?section_id=pickup-availability&variant=ID
         which returns just the banner HTML scoped to that variant
         context, then swap the `[data-pickup-availability]` node.
         The fetch is fire-and-forget — a slow network or 4xx leaves
         the previous banner in place rather than blanking the area. */
      var productUrl = container.dataset.productUrl;
      var pickupNode = container.querySelector('[data-pickup-availability]');
      if (pickupNode) {
        /* Pickup-availability Section Rendering API requires the
           canonical /variants/[variant-id]/ prefix per Shopify docs
           (themes/delivery-fulfillment/pickup-availability), NOT the
           product-URL?variant=X pattern used elsewhere. The variants
           endpoint resolves stock/location data per-variant rather
           than per-product, which is what the section reads. Use
           Shopify.routes.root so the locale prefix (e.g. /de/) is
           preserved on multi-locale storefronts. */
        var routesRoot = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
        var pickupUrl = routesRoot + 'variants/' + encodeURIComponent(matchedVariant.id) + '/?section_id=pickup-availability';
        /* AbortController — if the customer rapid-fires variant
           switches, only the LAST fetch's response should land. */
        if (container.__kitcheroPickupController) {
          try { container.__kitcheroPickupController.abort(); } catch (e) { /* noop */ }
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
            /* Re-query the live node — variant matcher could have run
               twice in quick succession; pick the LATEST node so we
               replace the most recent element, not a stale reference. */
            var current = container.querySelector('[data-pickup-availability]');
            if (fresh && current && current.parentNode) {
              current.parentNode.replaceChild(fresh, current);
            } else if (current && !fresh) {
              /* Section rendered nothing (e.g. variant has no pickup
                 anywhere on a multi-location store) — clear the
                 container so the customer sees the cleared state. */
              current.parentNode.removeChild(current);
            }
          })
          .catch(function (err) {
            /* AbortError on rapid switches is expected; log other
               errors but keep the previous banner so the page never
               looks broken. */
            if (err && err.name !== 'AbortError') {
              if (typeof console !== 'undefined' && console.warn) {
                console.warn('Pickup availability fetch failed:', err);
              }
            }
          });
      }

      /* Re-sync quantity rule from the new variant. B2B catalogs
         (and merchants who configure per-variant case packs) set
         `variant.quantity_rule.min/max/increment` per-variant. If
         a customer picks a "Case of 12" variant whose min is 12
         while the input still shows the previous variant's min of
         1, the ATC submit silently 422s with "Order minimum 12".
         This block reads the new rule (defaults to 1/null/1) and
         pushes it back to both the visible input attributes AND
         the input value when the customer is below the new min,
         so they see the correction immediately. */
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

      /* Stash the currently-matched variant on the container so the
         selling-plan:change handler below can re-price when the
         customer picks a subscription cadence without having to
         re-match against option inputs. Cheap DOM storage (one JSON
         per container), cleared on next variant change automatically. */
      try {
        container.dataset.currentVariantJson = JSON.stringify(matchedVariant);
      } catch (e) { /* circular / non-serializable — ignore */ }

      /* Refresh visible SKU — Theme Store Section 7 requires the SKU
         to update with the variant. The element is rendered server-side
         from `selected_or_first_available_variant.sku`; we sync it
         here on every variant change. Hidden when the matched variant
         has no SKU (some products skip SKU per variant).
         R297 — Was `document.querySelector(...)` which picked the FIRST
         `[data-product-sku]` in the DOM. On pages combining `main-
         product` + a `featured-product` block referencing a different
         product (homepage "today's pick"), switching variant on EITHER
         updated the OTHER product's SKU. Scoping to `container` (the
         current product-form's host element) keeps the update local. */
      try {
        var skuEl = container.querySelector('[data-product-sku]');
        if (skuEl) {
          var hiddenLabel = skuEl.querySelector('.visually-hidden');
          var hiddenLabelText = hiddenLabel ? hiddenLabel.outerHTML : '';
          if (matchedVariant.sku) {
            skuEl.hidden = false;
            skuEl.innerHTML = hiddenLabelText + ' ' + matchedVariant.sku.replace(/[<>"&]/g, function (c) {
              return c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&amp;';
            });
          } else {
            skuEl.hidden = true;
          }
        }
      } catch (e) { /* SKU update is non-critical */ }

      /* Re-read the active selling plan (if any) so the new variant
         shows the subscription-discounted price instead of flipping
         back to one-time price for one frame. The radios share the
         same `name="selling_plan"` — grab the checked one via
         `:checked` so we read the customer's actual selection, not
         the first radio in DOM order. */
      var activePlanInput = form.querySelector('input[name="selling_plan"]:checked');
      var activePlanId = activePlanInput ? activePlanInput.value : null;

      /* Verify the active selling plan still exists for the new
         variant. Subscription-eligible variants share allocations
         keyed by `selling_plan_id`; if the new variant has no
         allocation matching the customer's previously-checked plan
         (e.g., they switched to a one-time-only variant), the radio
         must be unchecked otherwise the form submits a selling_plan
         id Shopify will reject (or worse: silently quietly accept
         on a different plan). Also fall back to renderPriceForVariant
         with no activePlanId so the price stack flips back to one-
         time pricing instead of lying. */
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
          activePlanInput.checked = false;
          activePlanId = null;
          /* Tell SR users the subscription option dropped — they may
             have selected a cadence then switched colour and the radio
             silently went stale. */
          if (window.Kitchero && typeof Kitchero.announce === 'function' && Kitchero.variantStrings && Kitchero.variantStrings.subscriptionUnavailable) {
            Kitchero.announce(Kitchero.variantStrings.subscriptionUnavailable);
          }
        }
      } else if (activePlanId && !matchedVariant.selling_plan_allocations) {
        /* New variant carries no subscription allocations at all. */
        activePlanInput.checked = false;
        activePlanId = null;
      }

      renderPriceForVariant(container, matchedVariant, activePlanId);

      /* R298 — Update low-stock indicator atomically with price/SKU.
         Previously the price + sku + ATC label refreshed instantly
         but the "Only N left" badge was server-rendered and stayed
         frozen on the initial variant — a Theme Store "variant
         selection updates atomically" failure. We refresh from
         `matchedVariant.inventory_quantity` against the merchant
         threshold (`Kitchero.lowStockThreshold` exposed in
         layout/theme.liquid) only when inventory is Shopify-tracked
         AND > 0 AND ≤ threshold. */
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
            var tmpl = (window.Kitchero && Kitchero.variantStrings && Kitchero.variantStrings.lowStockHtml) || 'Only [count] left';
            lowStockEl.textContent = tmpl.replace('[count]', trackedQty);
            lowStockEl.hidden = false;
          } else {
            lowStockEl.hidden = true;
            lowStockEl.textContent = '';
          }
        }
      } catch (e) { /* low-stock update is non-critical */ }

      /* R298 — Pre-order badge atomic update. The badge is now always
         in the DOM with `hidden` toggled; show it when the variant is
         Shopify-tracked, out of stock, and `inventory_policy: continue`
         (backorderable). Mirrors the low-stock pattern above. */
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
      } catch (e) { /* preorder update is non-critical */ }

      /* R298 — In-stock / sold-out status spans atomic update. Both
         spans ship in the DOM with `hidden` toggled; we show exactly
         one (or neither, when the low-stock badge owns the row).
         Same atomic-update class as the low-stock + pre-order badges. */
      try {
        var inEl = container.querySelector('[data-stock-status="in"]');
        var outEl = container.querySelector('[data-stock-status="out"]');
        if (inEl || outEl) {
          /* Determine if low-stock badge is currently visible (it owns
             the row when shown — hide both in/out spans in that case). */
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
      } catch (e) { /* stock-status update is non-critical */ }

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
        } else {
          /* Look up the price element fresh — `renderPriceForVariant`
             above just re-rendered it, so the textContent is the new
             post-variant price. Previously this branch read a `priceEl`
             that was never declared in this scope (only inside
             `renderPriceForVariant`), throwing a ReferenceError on
             every successful variant change in builds where the
             `Kitchero.variantStrings.soldOut` localized string was
             empty / missing — the announcement throw aborted gallery
             sync below it. Scoped lookup here keeps it self-contained. */
          var priceEl = container.querySelector('.kt-product-price__current');
          if (priceEl && priceEl.textContent) {
            announcement += ' — ' + priceEl.textContent.trim();
          }
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
        } else {
          /* Standalone-image fallback — `featured-product` renders a
             single static `<img>` without a `[data-product-gallery]`
             wrapper. The wrapper carries `[data-variant-featured-image]`
             so we can locate the image and swap its src/srcset/alt
             directly from `variant.featured_image`. Without this, the
             gallery dispatch above silently no-ops on featured-product
             and the image stays on the original variant while price/
             SKU/availability update around it — Theme Store atomic-
             variant-update rule. */
          var imgWrap = container.querySelector('[data-variant-featured-image]');
          var imgEl = imgWrap && imgWrap.querySelector('img');
          var variantImage = matchedVariant.featured_image || (matchedVariant.featured_media && matchedVariant.featured_media.preview_image);
          if (imgEl && variantImage && variantImage.src) {
            /* Strip any existing Shopify CDN transform suffix and re-
               construct widths so srcset stays in sync. variantImage.src
               from `product.variants | json` already includes the base
               CDN URL without size transforms. */
            var baseSrc = variantImage.src.split('?')[0];
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
            } catch (swapErr) { /* malformed CDN URL — leave existing image */ }
          }
        }
      }
    } else {
      /* No variant matches the picked option combo — e.g. customer
         selected "Red + XL" on a product where Red only ships in S/M.
         Without this branch, the hidden `name="id"` input keeps the
         PREVIOUS variant's id and ATC silently adds the wrong line to
         the cart. Per the round-5 audit (real-purchase reviewer test
         case): clicking an unavailable combo must surface the state,
         not fall through. Disable ATC, swap label to "Unavailable",
         clear the variant id so a stale value cannot be POSTed, and
         announce to SR users. */
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

  /**
   * Format a cents integer as a currency string, market-aware.
   *
   * Previously called `Shopify.formatMoney` with a `$NN.NN` fallback —
   * but `Shopify.formatMoney` isn't loaded in this theme (no
   * shopify_common.js / option_selection.js). On every EUR/TRY/GBP
   * market the fallback fired, flashing `$149.00` the instant a
   * customer clicked a swatch even though the Liquid-rendered initial
   * price read `€149,00`. Theme Store multi-country test catches this.
   * Use `Intl.NumberFormat` locked to `Shopify.currency.active` (set on
   * every market) with the document's active locale for correct
   * decimal separator + symbol placement.
   */
  function formatMoney(cents) {
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

  /**
   * Render the product price block (`.kt-product-price__current` +
   * `__compare` + `__discount`) for a given variant and optional
   * selling-plan id.
   *
   * Why this exists as a standalone function: previously the price
   * render lived inline inside `updateVariant` and only ran on
   * option-swatch clicks. That meant when the customer picked a
   * "Subscribe & save 15%" radio the PDP price stayed at full price
   * until checkout — a known Theme Store reject because the customer
   * can't confirm the discounted amount before committing.
   *
   * Now called from BOTH variant-change AND selling-plan:change so
   * the display stays consistent with what will actually be charged.
   *
   * Lookup order for price:
   *   1. `variant.selling_plan_allocations[planId].price` when a
   *      selling plan is active. This is the discounted recurring
   *      price (e.g. 15% off $100 = $85 shown here).
   *   2. `variant.price` otherwise — one-time purchase price.
   *
   * Compare-at: we only show compare/discount when we have a clear
   * "was/now" pair. For one-time purchase that's
   * `compare_at_price > price`. For a subscription it's
   * `variant.price > allocation.price` (the sub discount, so the
   * compare-at displays the one-time price struck through), OR the
   * existing compare_at when larger. Pick the max so the savings
   * display is never understated.
   */
  function renderPriceForVariant(container, variant, sellingPlanId) {
    if (!container || !variant) return;
    var priceEl = container.querySelector('.kt-product-price__current');
    var compareEl = container.querySelector('.kt-product-price__compare');
    var discountEl = container.querySelector('.kt-product-price__discount');

    var displayPrice = variant.price;
    var comparePrice = variant.compare_at_price || 0;

    /* Resolve allocation for the active plan. The selling_plan_allocations
       array has an entry per plan that applies to this variant; the
       shape is `{ price, compare_at_price, per_delivery_price,
       selling_plan_id, ... }`. A one-time purchase selection leaves
       sellingPlanId empty, so we fall through to variant.price. */
    if (sellingPlanId && variant.selling_plan_allocations && variant.selling_plan_allocations.length) {
      for (var i = 0; i < variant.selling_plan_allocations.length; i++) {
        var alloc = variant.selling_plan_allocations[i];
        if (String(alloc.selling_plan_id) === String(sellingPlanId)) {
          displayPrice = alloc.price;
          /* When subscribing, the one-time `variant.price` IS the
             compare-at — that's the savings. Keep existing compare_at
             if the merchant set one higher (sale + sub stacked). */
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

    /* Unit price (groceries / wellness / cosmetics with reference unit
       like "$2.50/100ml"). Theme Store testing checklist explicitly
       requires "Unit prices change dynamically on variant selection".
       The container ([data-unit-price]) is rendered server-side from
       `variant.unit_price_measurement` for the FIRST available variant;
       when the customer picks another variant, this block must reflect
       the new variant's unit_price/measurement OR vanish entirely if
       the new variant has no measurement set.

       `variant.unit_price_measurement` shape:
         { measured_type, quantity_value, quantity_unit,
           reference_value, reference_unit } */
    var unitWrap = container.querySelector('[data-unit-price]');
    if (unitWrap) {
      var upm = variant && variant.unit_price_measurement;
      if (upm && variant.unit_price) {
        var unitValueEl = unitWrap.querySelector('.kt-product-price__unit-value');
        var unitRefEl   = unitWrap.querySelector('.kt-product-price__unit-ref');
        var unitQtyEl   = unitWrap.querySelector('.kt-product-price__unit-qty');
        if (unitValueEl) unitValueEl.textContent = formatMoney(variant.unit_price);
        if (unitRefEl) {
          /* Mirror the Liquid logic: only prefix the reference value
             when it isn't 1 (e.g. "100 ml" vs just "kg").   = &nbsp; */
          var refText = '';
          if (upm.reference_value !== 1) {
            refText = String(upm.reference_value) + ' ';
          }
          refText += String(upm.reference_unit || '');
          unitRefEl.textContent = refText;
        }
        if (unitQtyEl) {
          if (upm.quantity_value !== upm.reference_value) {
            /* "(250 g per 1 kg)" — German price-transparency law form.
               Reproduce the localized template at runtime by reading
               the data-template attribute set in the Liquid render. */
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

  /**
   * Global listener for selling-plan:change — fired by
   * selling-plan-picker.js when the customer ticks a different
   * subscription cadence radio. Finds the owning product form's
   * stashed variant and re-runs the price render for the new plan.
   *
   * Lives outside `initProductForm` so a single listener covers every
   * product section on the page (search results, recommended slider,
   * PDP main form) without per-form re-binding. The event bubbles
   * from the section container to `document`; we walk back to the
   * section container to read `currentVariantJson`.
   */
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
      /* First plan change before any variant swap — find the
         currently-selected variant by id in the cached data blob. */
      var form = container.querySelector('form[action*="/cart/add"]');
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

      /* Subscription ATC label switch — Shopify subscription UX
         guideline: the main CTA copy should change when a recurring
         plan is selected so the customer understands they're
         committing to a subscription, not a one-time purchase.
         Reverts to the regular "Add to cart" copy when the customer
         switches back to one-time (planId blank). */
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

      /* Announce the new price to SR users — subscription discount
         applied silently is confusing. */
      if (window.Kitchero && typeof Kitchero.announce === 'function') {
        var priceEl = container.querySelector('.kt-product-price__current');
        if (priceEl && priceEl.textContent) {
          Kitchero.announce(priceEl.textContent.trim());
        }
      }
    } catch (err) { /* malformed JSON — skip */ }
  });

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

  /* Section unload — abort any in-flight /cart/add.js request the
     section's product form may have started. Without this, theme
     editor reloads while the merchant is mid-add fire the success
     handler against a removed DOM (atcBtn classList writes silently
     no-op, but `drawerEl.open()` falls into the manual fallback
     branch and toggles aria-hidden on a node about to be GC'd).
     Touching a controller that's already null/aborted is a no-op. */
  document.addEventListener('shopify:section:unload', function (e) {
    var section = e.target.querySelector
      ? e.target.querySelector(PRODUCT_SECTION_SELECTOR)
      : null;
    if (!section) return;
    var form = section.querySelector('form');
    if (form && form.__kitcheroAtcController) {
      try { form.__kitcheroAtcController.abort(); } catch (err) { /* no-op */ }
      delete form.__kitcheroAtcController;
    }
  });
})();
