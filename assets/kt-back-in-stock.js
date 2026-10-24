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
      return el.offsetParent !== null || el === document.activeElement;
    });
  }

  function initModal(modal) {
    if (!modal || modal._kitcheroBackInStockInited) return;
    modal._kitcheroBackInStockInited = true;

    var modalId = modal.id;
    if (!modalId) return;

    var productContainer = modal.closest('[data-product-info]') || modal.closest('section');

    if (modal.parentNode !== document.body) {
      var dupes = document.querySelectorAll('[id="' + CSS.escape(modalId) + '"]');
      Array.prototype.forEach.call(dupes, function (d) {
        if (d !== modal && d.parentNode === document.body) {
          d.parentNode.removeChild(d);
        }
      });
      document.body.appendChild(modal);
    }

    var triggers = document.querySelectorAll('[data-modal-target="' + modalId + '"]');
    var closeEls = modal.querySelectorAll('[data-back-in-stock-close]');
    var panel = modal.querySelector('.kt-back-in-stock__panel');
    var lastTrigger = null;

    var savedScrollY = 0;

    function lockScroll() {
      if (window.Kitchero && Kitchero.scrollLock) {
        Kitchero.scrollLock.lock('back-in-stock-' + modalId);
        return;
      }

      savedScrollY = window.scrollY || window.pageYOffset || 0;
      var body = document.body;
      body.style.position = 'fixed';
      body.style.top = '-' + savedScrollY + 'px';
      body.style.left = '0';
      body.style.right = '0';
      body.style.width = '100%';
    }

    function unlockScroll() {
      if (window.Kitchero && Kitchero.scrollLock) {
        Kitchero.scrollLock.unlock('back-in-stock-' + modalId);
        return;
      }
      var body = document.body;
      body.style.position = '';
      body.style.top = '';
      body.style.left = '';
      body.style.right = '';
      body.style.width = '';

      window.scrollTo(0, savedScrollY);
    }

    function open(triggerEl) {
      lastTrigger = triggerEl || document.activeElement;
      modal.removeAttribute('inert');
      modal.setAttribute('aria-hidden', 'false');
      lockScroll();

      requestAnimationFrame(function () {
        var focusables = getFocusable(panel);

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
      unlockScroll();
      if (lastTrigger && typeof lastTrigger.focus === 'function') {
        lastTrigger.focus();
      }
      lastTrigger = null;
    }

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

    var triggerHandlers = [];
    Array.prototype.forEach.call(triggers, function (trigger) {
      var h = function (e) {
        e.preventDefault();
        open(trigger);
      };
      trigger.addEventListener('click', h);
      triggerHandlers.push({ el: trigger, fn: h });
    });

    var closeHandlers = [];
    Array.prototype.forEach.call(closeEls, function (el) {
      var h = function () { close(); };
      el.addEventListener('click', h);
      closeHandlers.push({ el: el, fn: h });
    });

    document.addEventListener('keydown', onKeydown);

    var onVariantChange = null;
    if (productContainer) {
      onVariantChange = function (e) {
        if (!e.target || !e.target.matches('input[data-option-value]')) return;
        syncVariantContext(modal, productContainer);
      };
      productContainer.addEventListener('change', onVariantChange);
    }

    modal._kitcheroBackInStockDestroy = function () {
      triggerHandlers.forEach(function (h) { h.el.removeEventListener('click', h.fn); });
      closeHandlers.forEach(function (h) { h.el.removeEventListener('click', h.fn); });
      document.removeEventListener('keydown', onKeydown);
      if (productContainer && onVariantChange) {
        productContainer.removeEventListener('change', onVariantChange);
      }
      unlockScroll();
      if (modal.parentNode === document.body) {
        modal.parentNode.removeChild(modal);
      }
      modal._kitcheroBackInStockInited = false;
      modal._kitcheroBackInStockDestroy = null;
    };

    var successAlert = modal.querySelector('[data-back-in-stock-success]');
    if (successAlert) {
      try {
        var params = new URLSearchParams(window.location.search);
        if (params.get('contact_posted') === 'true') {
          setTimeout(function () { open(null); }, 250);
        }
      } catch (e) {  }
    }
  }

  function syncVariantContext(modal, productContainer) {
    var titleEl = modal.querySelector('[data-back-in-stock-product-title]');
    var variantTitleEl = modal.querySelector('[data-back-in-stock-variant-title]');
    var messageEl = modal.querySelector('[data-back-in-stock-message]');
    var productTitle = titleEl ? titleEl.textContent.trim() : '';
    if (!messageEl) return;

    var selectedOptions = [];
    var fieldsets = productContainer.querySelectorAll('[data-option-index]');
    Array.prototype.forEach.call(fieldsets, function (fs) {
      var legendName = '';
      var legend = fs.querySelector('.kt-variant-picker__label');
      if (legend) {
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

    var lines = [productTitle];
    if (selectedOptions.length) {
      lines.push(selectedOptions.join(', '));
    }

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

  document.addEventListener('shopify:section:unload', function (e) {
    if (!e || !e.target || !e.target.id) return;
    var sectionId = e.target.id.replace(/^shopify-section-/, '');

    var modals = document.querySelectorAll('[data-back-in-stock-modal]');
    Array.prototype.forEach.call(modals, function (modal) {
      if (modal.id && modal.id.indexOf(sectionId) !== -1) {
        if (modal._kitcheroBackInStockDestroy) {
          modal._kitcheroBackInStockDestroy();
        }
      }
    });
  });
})();
