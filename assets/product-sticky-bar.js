(function () {
  'use strict';

  var registry = new WeakMap();

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

    if (window.Shopify && window.Shopify.designMode) return;

    if (typeof window.IntersectionObserver === 'undefined') return;

    var stickyScope = bar.closest('[data-section-type="main-product"]') || document;
    var productForm = stickyScope.querySelector('[data-product-form]');
    if (!productForm) return;

    var visibilityClass = 'is-visible';

    function showBar() {
      if (bar.hasAttribute('hidden')) bar.removeAttribute('hidden');
      if (bar.hasAttribute('inert')) bar.removeAttribute('inert');
      bar.setAttribute('aria-hidden', 'false');

      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          bar.classList.add(visibilityClass);
        });
      });
    }

    var hideTimerId = null;
    function hideBar() {
      bar.classList.remove(visibilityClass);
      bar.setAttribute('aria-hidden', 'true');
      bar.setAttribute('inert', '');

      var motionOK = window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: no-preference)').matches
        : true;
      var delay = motionOK ? 260 : 0;
      if (hideTimerId) clearTimeout(hideTimerId);
      hideTimerId = window.setTimeout(function () {
        hideTimerId = null;
        if (!bar.classList.contains(visibilityClass)) {
          bar.setAttribute('hidden', '');
        }
      }, delay);
    }

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

    var cta = bar.querySelector('[data-pdp-sticky-cta]');
    function ctaHandler() {
      productForm.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
      window.setTimeout(function () {
        var submit = productForm.querySelector('button[type="submit"], [data-product-form-submit]');
        if (submit && typeof submit.focus === 'function') submit.focus();
      }, 650);
    }
    if (cta) cta.addEventListener('click', ctaHandler);

    var latestVariant = null;
    var latestPlanId = null;

    function resolveStickyPrice(variant, planId) {
      var displayPrice = variant.price;
      var comparePrice = variant.compare_at_price || 0;
      if (planId && variant.selling_plan_allocations && variant.selling_plan_allocations.length) {
        for (var i = 0; i < variant.selling_plan_allocations.length; i++) {
          var alloc = variant.selling_plan_allocations[i];
          if (String(alloc.selling_plan_id) === String(planId)) {
            displayPrice = alloc.price;

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

      var thumbImg = bar.querySelector('.kt-pdp-sticky__image');
      var variantImage = latestVariant && (
        latestVariant.featured_image ||
        (latestVariant.featured_media && latestVariant.featured_media.preview_image)
      );
      if (thumbImg && variantImage && variantImage.src) {
        try {
          var parsed = new URL(variantImage.src, window.location.origin);
          parsed.search = '';
          parsed.hash = '';
          var baseSrc = parsed.toString();
          var thumbW = parseInt(thumbImg.getAttribute('width'), 10) || 96;
          thumbImg.src = baseSrc + '?width=' + (thumbW * 2);
          thumbImg.srcset = baseSrc + '?width=' + thumbW + ' 1x, ' +
                            baseSrc + '?width=' + (thumbW * 2) + ' 2x';
          if (variantImage.alt) thumbImg.alt = variantImage.alt;
        } catch (e) {  }
      }
    }

    function variantChangeHandler(event) {
      var variant = event && event.detail ? event.detail.variant : null;
      if (!variant) return;
      latestVariant = variant;
      renderStickyPrice();
    }
    document.addEventListener('variant:change', variantChangeHandler);

    function sellingPlanChangeHandler(event) {
      var planId = event && event.detail ? event.detail.planId : null;
      latestPlanId = planId || null;
      renderStickyPrice();
    }
    document.addEventListener('selling-plan:change', sellingPlanChangeHandler);

    registry.set(bar, function cleanup() {
      observer.disconnect();
      if (cta) cta.removeEventListener('click', ctaHandler);
      document.removeEventListener('variant:change', variantChangeHandler);
      document.removeEventListener('selling-plan:change', sellingPlanChangeHandler);

      if (hideTimerId) {
        clearTimeout(hideTimerId);
        hideTimerId = null;
      }
    });
  }

  function unbindStickyBar(bar) {
    if (!bar) return;
    var cleanup = registry.get(bar);
    if (typeof cleanup === 'function') cleanup();
    registry.delete(bar);
  }

  function bootstrap() {
    var bars = document.querySelectorAll('[data-pdp-sticky]');
    bars.forEach(bindStickyBar);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }

  document.addEventListener('shopify:section:load', function (event) {
    var bar = event.target.querySelector('[data-pdp-sticky]');
    if (bar) bindStickyBar(bar);
  });

  document.addEventListener('shopify:section:unload', function (event) {
    var bar = event.target.querySelector('[data-pdp-sticky]');
    if (bar) unbindStickyBar(bar);
  });
})();
