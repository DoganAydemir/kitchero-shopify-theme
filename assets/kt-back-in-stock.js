/* Back-in-Stock Modal — open/close + focus trap + variant sync.
 *
 * Wired against the markup in snippets/back-in-stock.liquid.
 * Each modal carries its own data-back-in-stock-modal so multiple
 * product cards / featured-product blocks on the same page each
 * get an independent modal without ID collisions.
 *
 * Lifecycle:
 * 1. Click on [data-back-in-stock-trigger] -> open()
 *    - Set aria-hidden="false"
 *    - Remove inert
 *    - Lock body scroll via Kitchero.scrollLock (falls back to
 *      direct overflow if scrollLock isn't loaded)
 *    - Move focus to the first focusable element inside the modal
 *    - Cache the trigger so close() can restore focus correctly
 * 2. Close paths:
 *    - Click [data-back-in-stock-close] (close button or backdrop)
 *    - Press Escape
 *    - Successful form post (auto-close on success state load,
 *      gives the customer a moment to read the success message)
 * 3. Variant change sync:
 *    - product-form.js fires no custom event today, so we listen
 *      to the native `change` event on the variant picker's option
 *      radios and rebuild the hidden contact message + visible
 *      variant title with the new selection. Without this, the
 *      message field would freeze on the variant that was selected
 *      when the page loaded — the merchant gets the wrong
 *      restock-request context.
 *
 * Posted-success detection: Shopify's contact form redirects to
 * `return_to?contact_posted=true` after a successful POST. On page
 * load we check for that param and auto-open the matching modal so
 * the success alert is visible (otherwise the customer would land
 * back on the PDP with no indication their email landed).
 */
(function () {
  'use strict';

  function getFocusable(root) {
    if (!root) return [];
    var selectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled]):not([type="hidden"])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');
    return Array.prototype.slice.call(root.querySelectorAll(selectors)).filter(function (el) {
      /* Filter out elements with offsetParent === null (display:none /
         inside hidden parent) so focus doesn't jump to an invisible
         control. */
      return el.offsetParent !== null || el === document.activeElement;
    });
  }

  function initModal(modal) {
    if (!modal || modal._kitcheroBackInStockInited) return;
    modal._kitcheroBackInStockInited = true;

    var modalId = modal.id;
    if (!modalId) return;

    var triggers = document.querySelectorAll('[data-modal-target="' + modalId + '"]');
    var closeEls = modal.querySelectorAll('[data-back-in-stock-close]');
    var panel = modal.querySelector('.kt-back-in-stock__panel');
    var lastTrigger = null;

    function open(triggerEl) {
      lastTrigger = triggerEl || document.activeElement;
      modal.removeAttribute('inert');
      modal.setAttribute('aria-hidden', 'false');
      if (window.Kitchero && Kitchero.scrollLock) {
        Kitchero.scrollLock.lock('back-in-stock-' + modalId);
      } else {
        document.body.style.overflow = 'hidden';
      }
      /* Defer focus until the CSS opacity transition has begun so
         screen readers don't announce the panel before it's visually
         in place. */
      requestAnimationFrame(function () {
        var focusables = getFocusable(panel);
        /* Skip the close button as the first focus target — landing
           on it would announce "Close, button" before the heading.
           Prefer the email input, falling back to whatever comes
           first after the close. */
        var emailInput = panel.querySelector('input[type="email"]');
        if (emailInput) {
          emailInput.focus();
        } else if (focusables.length > 0) {
          focusables[0].focus();
        }
      });
    }

    function close() {
      if (modal.getAttribute('aria-hidden') === 'true') return;
      modal.setAttribute('aria-hidden', 'true');
      modal.setAttribute('inert', '');
      if (window.Kitchero && Kitchero.scrollLock) {
        Kitchero.scrollLock.unlock('back-in-stock-' + modalId);
      } else {
        document.body.style.overflow = '';
      }
      if (lastTrigger && typeof lastTrigger.focus === 'function') {
        lastTrigger.focus();
      }
      lastTrigger = null;
    }

    /* Trap focus inside the modal while open. Tab from the last
       focusable wraps to the first; Shift+Tab from the first wraps
       to the last. Without this, tabbing past the submit button
       sends focus into the underlying page (which is supposed to
       be inert, but inert is still patchy in older browsers). */
    function onKeydown(e) {
      if (modal.getAttribute('aria-hidden') !== 'false') return;
      if (e.key === 'Escape' || e.keyCode === 27) {
        e.stopPropagation();
        close();
        return;
      }
      if (e.key !== 'Tab' && e.keyCode !== 9) return;
      var focusables = getFocusable(panel);
      if (focusables.length === 0) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    Array.prototype.forEach.call(triggers, function (trigger) {
      trigger.addEventListener('click', function (e) {
        e.preventDefault();
        open(trigger);
      });
    });

    Array.prototype.forEach.call(closeEls, function (el) {
      el.addEventListener('click', function () {
        close();
      });
    });

    document.addEventListener('keydown', onKeydown);

    /* Sync hidden message field with the active variant. The PDP's
       option radios live OUTSIDE the modal (in the variant picker
       above the form), so we listen on the broader product
       container. Re-finds the picker on each event so a section
       re-render (Shopify editor / Section Rendering API after ATC)
       doesn't leave us with a stale reference. */
    var productContainer = modal.closest('[data-product-info]') || modal.closest('section');
    if (productContainer) {
      productContainer.addEventListener('change', function (e) {
        if (!e.target || !e.target.matches('input[data-option-value]')) return;
        syncVariantContext(modal, productContainer);
      });
    }

    /* Auto-open after a successful contact form POST so the
       customer actually sees the success alert. Without this the
       browser-issued redirect just reloads the PDP with the form
       collapsed back into the modal — customer wonders if the
       submission landed. */
    var successAlert = modal.querySelector('[data-back-in-stock-success]');
    if (successAlert) {
      try {
        var params = new URLSearchParams(window.location.search);
        if (params.get('contact_posted') === 'true') {
          /* Use setTimeout so the open call lands after the page's
             other init scripts (Lenis, focus management) settle. */
          setTimeout(function () { open(null); }, 250);
        }
      } catch (e) { /* old browser without URLSearchParams — skip */ }
    }
  }

  function syncVariantContext(modal, productContainer) {
    /* Read the variant picker's currently-checked radios and rebuild
       the hidden message body. Mirrors the Liquid render exactly:
       product title, then per-option `Name: Value, Name: Value`,
       then a blank line, then the variant URL. The variant URL
       comes from the picker's hidden <select> whose `value`
       product-form.js keeps in sync with the active radio set. */
    var titleEl = modal.querySelector('[data-back-in-stock-product-title]');
    var variantTitleEl = modal.querySelector('[data-back-in-stock-variant-title]');
    var messageEl = modal.querySelector('[data-back-in-stock-message]');
    var productTitle = titleEl ? titleEl.textContent.trim() : '';
    if (!messageEl) return;

    /* Collect selected options. */
    var selectedOptions = [];
    var fieldsets = productContainer.querySelectorAll('[data-option-index]');
    Array.prototype.forEach.call(fieldsets, function (fs) {
      var legendName = '';
      var legend = fs.querySelector('.kt-variant-picker__label');
      if (legend) {
        /* Pull the option name from the legend text, stripping the
           trailing ":" and the selected-value span. */
        var labelClone = legend.cloneNode(true);
        var selectedSpan = labelClone.querySelector('[data-option-selected]');
        if (selectedSpan) selectedSpan.remove();
        legendName = labelClone.textContent.replace(/:\s*$/, '').trim();
      }
      var checked = fs.querySelector('input[data-option-value]:checked');
      if (legendName && checked) {
        selectedOptions.push(legendName + ': ' + checked.value);
      }
    });

    var variantTitle = selectedOptions.join(' / ');
    if (variantTitleEl && variantTitle) {
      variantTitleEl.textContent = variantTitle;
    }

    /* Build message body. Match Liquid render shape. */
    var lines = [productTitle];
    if (selectedOptions.length) {
      lines.push(selectedOptions.join(', '));
    }
    /* Variant URL — pull from the hidden <select> the picker maintains. */
    var variantSelect = productContainer.querySelector('[data-variant-select]');
    var variantId = variantSelect ? variantSelect.value : '';
    var productUrlAnchor = productContainer.querySelector('a[href*="/products/"]');
    var productUrl = '';
    if (productUrlAnchor) {
      productUrl = productUrlAnchor.getAttribute('href').split('?')[0];
    } else {
      productUrl = window.location.pathname;
    }
    var fullUrl = window.location.origin + productUrl + (variantId ? '?variant=' + variantId : '');
    lines.push(fullUrl);
    messageEl.value = lines.join('\n');
  }

  function initAll(root) {
    var scope = root || document;
    var modals = scope.querySelectorAll('[data-back-in-stock-modal]');
    Array.prototype.forEach.call(modals, initModal);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initAll(); });
  } else {
    initAll();
  }

  document.addEventListener('shopify:section:load', function (e) {
    initAll(e.target);
  });
})();
