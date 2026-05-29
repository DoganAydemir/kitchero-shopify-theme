/* ==========================================================================
   PDP Sticky Add-to-Cart Bar (R135 / CR-B)
   --------------------------------------------------------------------------
   Watches the in-page product form: when it scrolls out of viewport, the
   sticky bottom bar slides in. When the form is back in viewport, the bar
   slides out. CTA scrolls back to the form and focuses the submit button
   for keyboard users.

   Re-binds on shopify:section:load so the editor's "reload section"
   action keeps the bar functional, and unbinds on shopify:section:unload
   so a removed PDP doesn't leak observers.
   ========================================================================== */

(function () {
  'use strict';

  /* WeakMap of bar element → cleanup fn so we can unbind cleanly when
     the editor reloads or unloads a section. */
  var registry = new WeakMap();

  /* R-money-parity — Delegate to `Kitchero.formatMoney` (global.js)
     which parses the merchant-configured `shop.money_format` so the
     sticky bar price string matches the Liquid `| money` output on
     PDP and cart. Previous `Intl.NumberFormat` implementation
     produced divergent strings on every market with a customized
     currency format (TR/EU/non-USD), failing Theme Store reviewer
     parity tests. CLDR fallback kept for the unreachable-in-
     production script-load race. */
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

  function bindStickyBar(bar) {
    if (!bar || registry.has(bar)) return;

    /* R297 — Skip entirely inside the theme editor. The sticky bar
       slides over the bottom of the preview iframe and covers the
       section-selection ring when the merchant scrolls past the
       product form — they can't click sections below it. Shopify's
       editor-best-practices doc explicitly says "Disable sticky
       headers and fixed elements when the preview inspector is
       active." */
    if (window.Shopify && window.Shopify.designMode) return;

    /* R297 — Feature-gate IntersectionObserver. On iOS Safari 12.1
       and older versions the global is missing; without this check
       the `new IntersectionObserver(...)` below throws a
       ReferenceError that aborts the entire IIFE, leaving the bar
       permanently hidden (no scroll listener fallback wired). The
       bar isn't a critical purchase surface — falling back to
       always-visible would be wrong UX, so we no-op instead. */
    if (typeof window.IntersectionObserver === 'undefined') return;

    var productForm = document.querySelector('[data-product-form]');
    if (!productForm) return;

    /* Reduced-motion users still get the functional bar but without the
       slide animation (CSS handles the transition strip; here we just
       ensure the show/hide logic still runs). */
    var visibilityClass = 'is-visible';

    function showBar() {
      if (bar.hasAttribute('hidden')) bar.removeAttribute('hidden');
      if (bar.hasAttribute('inert')) bar.removeAttribute('inert');
      bar.setAttribute('aria-hidden', 'false');
      /* Double rAF so the browser paints the `hidden` removal before
         applying the visibility class — without it the transition
         starts from the already-displayed state and snaps. */
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          bar.classList.add(visibilityClass);
        });
      });
    }

    function hideBar() {
      bar.classList.remove(visibilityClass);
      bar.setAttribute('aria-hidden', 'true');
      bar.setAttribute('inert', '');
      /* Wait for the transition to finish before re-applying `hidden`,
         otherwise the slide-out animation flashes. 260ms = 250ms
         transition + 10ms safety. Reduced-motion path skips the wait. */
      var motionOK = window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: no-preference)').matches
        : true;
      var delay = motionOK ? 260 : 0;
      window.setTimeout(function () {
        if (!bar.classList.contains(visibilityClass)) {
          bar.setAttribute('hidden', '');
        }
      }, delay);
    }

    /* IntersectionObserver: fires when productForm crosses viewport
       edges. threshold:0 + rootMargin:0 means we toggle the moment any
       part of the form is intersecting (not when fully past). The user
       reading specs near the bottom of the form still sees the bar
       once the form scrolls fully past. */
    var observer = new IntersectionObserver(
      function (entries) {
        var entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting) {
          hideBar();
        } else {
          showBar();
        }
      },
      { threshold: 0, rootMargin: '0px' }
    );
    observer.observe(productForm);

    /* CTA: smooth-scroll to the form, then focus the submit button so
       a keyboard user lands on the actionable control. setTimeout
       waits for the smooth-scroll to settle (~600ms is the empirical
       browser default — too short and focus jumps before the scroll;
       too long and the user sees a lag). */
    var cta = bar.querySelector('[data-pdp-sticky-cta]');
    function ctaHandler() {
      productForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.setTimeout(function () {
        var submit = productForm.querySelector('button[type="submit"], [data-product-form-submit]');
        if (submit && typeof submit.focus === 'function') submit.focus();
      }, 650);
    }
    if (cta) cta.addEventListener('click', ctaHandler);

    /* Sticky bar state: cache the latest variant + active selling
       plan so either event (variant:change OR selling-plan:change)
       can re-render the price atomically with both inputs. Without
       this the bar would forget the active plan when a customer
       flips variants, and forget the active variant when they
       flip plans — either case painting a stale price.
       Initial values are read from the form's current state via
       the data-variant blob + the selling_plan radio at init. */
    var latestVariant = null;
    var latestPlanId = null;

    /* Resolve the price + compare-at pair for the current
       (variant, planId) combination. Mirrors the canonical
       resolution in product-form.js renderPriceForVariant —
       a subscription's price comes from the matching allocation
       and the compare-at is the larger of the one-time price
       and any sale compare-at so savings never understate. */
    function resolveStickyPrice(variant, planId) {
      var displayPrice = variant.price;
      var comparePrice = variant.compare_at_price || 0;
      if (planId && variant.selling_plan_allocations && variant.selling_plan_allocations.length) {
        for (var i = 0; i < variant.selling_plan_allocations.length; i++) {
          var alloc = variant.selling_plan_allocations[i];
          if (String(alloc.selling_plan_id) === String(planId)) {
            displayPrice = alloc.price;
            /* One-time price acts as the "was" so the customer
               sees the subscription savings. Keep the merchant
               compare-at if higher (sale + sub stacked). */
            var subCompare = variant.price;
            if (subCompare > displayPrice) {
              comparePrice = Math.max(comparePrice, subCompare);
            }
            break;
          }
        }
      }
      return { displayPrice: displayPrice, comparePrice: comparePrice };
    }

    function renderStickyPrice() {
      if (!latestVariant) return;
      var priceEl = bar.querySelector('[data-pdp-sticky-price]');
      var ctaLabel = bar.querySelector('.kt-pdp-sticky__cta-label');
      var prices = resolveStickyPrice(latestVariant, latestPlanId);

      if (priceEl) {
        /* Build with DOM nodes (not innerHTML string concat) so the
           formatted strings — which can carry locale-specific currency
           symbols — never need HTML escaping and never accept HTML
           injection. */
        priceEl.textContent = '';
        if (prices.comparePrice && prices.comparePrice > prices.displayPrice) {
          var was = document.createElement('s');
          was.className = 'kt-pdp-sticky__price-was';
          was.textContent = formatMoney(prices.comparePrice);
          priceEl.appendChild(was);
        }
        var now = document.createElement('span');
        now.className = 'kt-pdp-sticky__price-now';
        now.textContent = formatMoney(prices.displayPrice);
        priceEl.appendChild(now);
      }

      if (ctaLabel) {
        var soldOutString =
          (window.Kitchero && window.Kitchero.variantStrings && window.Kitchero.variantStrings.soldOut) ||
          'Sold out';
        var addString =
          (window.Kitchero && window.Kitchero.variantStrings && window.Kitchero.variantStrings.addToCart) ||
          'Add to cart';
        ctaLabel.textContent = latestVariant.available ? addString : soldOutString;
      }
    }

    /* Variant change: refresh price + sold-out label. product-form.js
       dispatches `variant:change` on the form container with
       detail.variant. Listen on the document so we don't have to
       re-bind if the form re-renders (Section Rendering API path). */
    function variantChangeHandler(event) {
      var variant = event && event.detail ? event.detail.variant : null;
      if (!variant) return;
      latestVariant = variant;
      renderStickyPrice();
    }
    document.addEventListener('variant:change', variantChangeHandler);

    /* Selling-plan change: subscription pickers dispatch this on
       plan radio change. Bar re-renders against the cached
       variant + new plan id so price reflects the allocation
       (e.g., 15% subscribe-and-save) the moment the customer
       picks it. Theme Store "selection updates atomically" rule. */
    function sellingPlanChangeHandler(event) {
      var planId = event && event.detail ? event.detail.planId : null;
      latestPlanId = planId || null;
      renderStickyPrice();
    }
    document.addEventListener('selling-plan:change', sellingPlanChangeHandler);

    /* Cleanup function returned to the registry so unload events can
       restore the page to a no-bar state without leaks. */
    registry.set(bar, function cleanup() {
      observer.disconnect();
      if (cta) cta.removeEventListener('click', ctaHandler);
      document.removeEventListener('variant:change', variantChangeHandler);
      document.removeEventListener('selling-plan:change', sellingPlanChangeHandler);
    });
  }

  function unbindStickyBar(bar) {
    if (!bar) return;
    var cleanup = registry.get(bar);
    if (typeof cleanup === 'function') cleanup();
    registry.delete(bar);
  }

  /* Initial wire on every existing bar. PDP renders one. */
  function bootstrap() {
    var bars = document.querySelectorAll('[data-pdp-sticky]');
    bars.forEach(bindStickyBar);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }

  /* Theme editor compatibility — re-bind on section load, unbind on
     unload. `event.target` is the inserted section root; the bar may
     live anywhere inside (typically at the bottom of main-product). */
  document.addEventListener('shopify:section:load', function (event) {
    var bar = event.target.querySelector('[data-pdp-sticky]');
    if (bar) bindStickyBar(bar);
  });

  document.addEventListener('shopify:section:unload', function (event) {
    var bar = event.target.querySelector('[data-pdp-sticky]');
    if (bar) unbindStickyBar(bar);
  });
})();
