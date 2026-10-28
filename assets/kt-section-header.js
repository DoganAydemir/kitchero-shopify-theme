(function () {
  'use strict';

  if (window.__kitcheroHeaderObservers && window.__kitcheroHeaderObservers.length) {
    for (var __i = 0; __i < window.__kitcheroHeaderObservers.length; __i++) {
      var __obs = window.__kitcheroHeaderObservers[__i];
      if (__obs && typeof __obs.disconnect === 'function') {
        try { __obs.disconnect(); } catch (e) {  }
      }
    }
  }
  window.__kitcheroHeaderObservers = [];

  if (window.__kitcheroHeaderListeners && window.__kitcheroHeaderListeners.length) {
    for (var __li = 0; __li < window.__kitcheroHeaderListeners.length; __li++) {
      var __ln = window.__kitcheroHeaderListeners[__li];
      if (__ln && __ln.target && typeof __ln.target.removeEventListener === 'function') {
        try { __ln.target.removeEventListener(__ln.type, __ln.handler, __ln.opts); } catch (e) {  }
      }
    }
  }
  window.__kitcheroHeaderListeners = [];
  function bindListener(target, type, handler, opts) {
    target.addEventListener(type, handler, opts);
    window.__kitcheroHeaderListeners.push({ target: target, type: type, handler: handler, opts: opts });
  }

  var SCROLL_THRESHOLD = 50;

  var scrollTicking = false;
  var cachedHeader = null;

  function computeScrollState() {
    scrollTicking = false;
    if (!cachedHeader || !cachedHeader.isConnected) {
      cachedHeader = document.querySelector('.kt-header');
    }
    if (!cachedHeader) return;
    var scrolled = window.scrollY > SCROLL_THRESHOLD;
    cachedHeader.classList.toggle('kt-header--scrolled', scrolled);

    if (isTransparentPage()) {
      updateHeaderTop();
    }
  }

  function isTransparentPage() {
    if (cachedHeader) {
      var explicit = cachedHeader.getAttribute('data-header-style');
      if (explicit === 'solid') return false;
      if (explicit === 'transparent') return true;
    }

    var firstSection = document.querySelector('main .shopify-section');
    if (!firstSection) return false;
    return !!firstSection.querySelector('[data-allows-transparent-header="true"]');
  }

  function syncTransparentBodyClass() {
    if (!cachedHeader || !cachedHeader.isConnected) {
      cachedHeader = document.querySelector('.kt-header');
    }
    document.body.classList.toggle('kt-body--header-transparent', isTransparentPage());
  }

  var mainObserver = null;
  function watchMainForSections() {
    if (mainObserver) return;
    var mainEl = document.querySelector('main');
    if (!mainEl || typeof MutationObserver === 'undefined') {
      setTimeout(watchMainForSections, 100);
      return;
    }
    mainObserver = new MutationObserver(function () {
      syncTransparentBodyClass();
    });

    mainObserver.observe(mainEl, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-allows-transparent-header']
    });
    window.__kitcheroHeaderObservers.push(mainObserver);
  }

  function pollInDesignMode() {
    if (!window.Shopify || !window.Shopify.designMode) return;
    var ticks = 0;
    var interval = setInterval(function () {
      syncTransparentBodyClass();
      ticks += 1;
      if (ticks >= 8) clearInterval(interval);
    }, 500);
  }

  var cachedBannerEl = null;
  var cachedBannerHeight = 0;
  function refreshBannerCache() {
    if (!cachedBannerEl || !cachedBannerEl.isConnected) {
      cachedBannerEl = document.querySelector('.kt-announcement-banner');
    }
    cachedBannerHeight = cachedBannerEl ? cachedBannerEl.offsetHeight : 0;
  }
  function updateHeaderTop() {
    var newTop = Math.max(0, cachedBannerHeight - window.scrollY);
    document.documentElement.style.setProperty('--kt-header-top', newTop + 'px');
  }

  function updateScrollState() {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(computeScrollState);
  }

  bindListener(window, 'scroll', updateScrollState, { passive: true });

  updateScrollState();
  syncTransparentBodyClass();
  watchMainForSections();
  pollInDesignMode();
  if (document.readyState === 'loading') {
    bindListener(document, 'DOMContentLoaded', updateScrollState);
    bindListener(document, 'DOMContentLoaded', syncTransparentBodyClass);
    bindListener(document, 'DOMContentLoaded', watchMainForSections);
    bindListener(document, 'DOMContentLoaded', pollInDesignMode);
  }
  bindListener(window, 'load', updateScrollState);
  bindListener(window, 'load', syncTransparentBodyClass);
  bindListener(window, 'load', watchMainForSections);

  bindListener(document, 'shopify:section:load', updateScrollState);
  bindListener(document, 'shopify:section:load', syncTransparentBodyClass);
  bindListener(document, 'shopify:section:select', updateScrollState);
  bindListener(document, 'shopify:section:select', syncTransparentBodyClass);
  bindListener(document, 'shopify:section:unload', syncTransparentBodyClass);
  bindListener(document, 'shopify:section:reorder', syncTransparentBodyClass);

  function setExpanded(menuItem, open) {
    if (!menuItem) return;
    var trigger = menuItem.querySelector('[data-flyout-trigger]');
    if (open) {
      menuItem.setAttribute('data-open', '');
    } else {
      menuItem.removeAttribute('data-open');
    }
    if (trigger) {
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
  }

  function closeAll(except) {
    var items = document.querySelectorAll('.kt-header__menu-item[data-open]');
    items.forEach(function (i) { if (i !== except) setExpanded(i, false); });
  }

  bindListener(document, 'pointerenter', function (e) {
    if (e.pointerType === 'touch') return;
    var item = e.target && e.target.closest && e.target.closest('.kt-header__menu-item');
    if (!item) return;
    setExpanded(item, true);
  }, true);

  bindListener(document, 'pointerleave', function (e) {
    if (e.pointerType === 'touch') return;
    var item = e.target && e.target.closest && e.target.closest('.kt-header__menu-item');
    if (!item) return;
    setExpanded(item, false);
  }, true);

  bindListener(document, 'click', function (e) {
    var trigger = e.target && e.target.closest && e.target.closest('.kt-header__menu-item > [data-flyout-trigger]');
    if (!trigger) return;
    var item = trigger.closest('.kt-header__menu-item');
    if (!item) return;

    var hasPanel = item.querySelector('.kt-header__mega-menu, .kt-header__flyout');
    if (!hasPanel) return;
    e.preventDefault();
    var willOpen = !item.hasAttribute('data-open');
    closeAll(willOpen ? item : null);
    setExpanded(item, willOpen);
  });

  bindListener(document, 'keydown', function (e) {
    if (e.key !== ' ' && e.key !== 'Spacebar') return;
    var trigger = e.target && e.target.closest && e.target.closest('.kt-header__menu-item > [data-flyout-trigger]');
    if (!trigger) return;
    // A <button> already turns Space into a click (handled above); toggling
    // here as well opened and immediately closed the menu.
    if (trigger.tagName === 'BUTTON') return;
    var item = trigger.closest('.kt-header__menu-item');
    if (!item || !item.querySelector('.kt-header__mega-menu, .kt-header__flyout')) return;
    e.preventDefault();
    var willOpen = !item.hasAttribute('data-open');
    closeAll(willOpen ? item : null);
    setExpanded(item, willOpen);
  });

  bindListener(document, 'click', function (e) {
    var insideHeader = e.target && e.target.closest && e.target.closest('.kt-header');
    if (insideHeader) return;
    closeAll();
  });

  bindListener(document, 'keydown', function (e) {
    if (e.key !== 'Escape' && e.code !== 'Escape') return;
    var active = document.activeElement;
    if (!active) return;
    var item = active.closest && active.closest('.kt-header__menu-item');
    if (!item || !item.hasAttribute('data-open')) return;
    setExpanded(item, false);
    var trigger = item.querySelector('[data-flyout-trigger]');
    if (trigger) trigger.focus();
  });

  bindListener(document, 'focusout', function (e) {
    var item = e.target.closest && e.target.closest('.kt-header__menu-item');
    if (!item || !item.hasAttribute('data-open')) return;
    var next = e.relatedTarget;
    if (next && item.contains(next)) return;
    setExpanded(item, false);
  });

  bindListener(document, 'shopify:block:select', function (event) {
    var block = event.target;
    if (!block) return;
    var featured = block.classList && block.classList.contains('kt-header__mega-featured')
      ? block
      : (block.querySelector && block.querySelector('.kt-header__mega-featured'));
    if (!featured) return;
    var menuItem = featured.closest('.kt-header__menu-item');
    if (menuItem) {
      closeAll(menuItem);
      setExpanded(menuItem, true);
    }
  });

  bindListener(document, 'shopify:block:deselect', function (event) {
    var block = event.target;
    if (!block) return;
    var featured = block.classList && block.classList.contains('kt-header__mega-featured')
      ? block
      : (block.querySelector && block.querySelector('.kt-header__mega-featured'));
    if (!featured) return;
    var menuItem = featured.closest('.kt-header__menu-item');
    if (menuItem) setExpanded(menuItem, false);
  });

  function syncHeaderOffset() {
    var headerEl = document.querySelector('[data-section-type="header"]');
    if (!headerEl) return;
    var height = headerEl.offsetHeight;
    if (height > 0) {
      document.documentElement.style.setProperty('--kt-header-offset', height + 'px');
    }
  }

  function syncBannerHeight() {
    var bannerEl = document.querySelector('.kt-announcement-banner');
    if (!bannerEl) return;
    var height = bannerEl.offsetHeight;
    if (height > 0) {
      document.documentElement.style.setProperty('--kt-banner-height', height + 'px');
    }

    cachedBannerEl = bannerEl;
    cachedBannerHeight = height;
  }

  if (typeof ResizeObserver !== 'undefined') {
    var observerHeader = document.querySelector('[data-section-type="header"]');
    if (observerHeader) {
      var headerOffsetObserver = new ResizeObserver(syncHeaderOffset);
      headerOffsetObserver.observe(observerHeader);
      window.__kitcheroHeaderObservers.push(headerOffsetObserver);
    }
    var observerBanner = document.querySelector('.kt-announcement-banner');
    if (observerBanner) {
      var bannerHeightObserver = new ResizeObserver(function () {
        syncBannerHeight();
        updateHeaderTop();
      });
      bannerHeightObserver.observe(observerBanner);
      window.__kitcheroHeaderObservers.push(bannerHeightObserver);
    }
  }
  if (document.readyState === 'loading') {
    bindListener(document, 'DOMContentLoaded', syncHeaderOffset);
    bindListener(document, 'DOMContentLoaded', syncBannerHeight);
  } else {
    syncHeaderOffset();
    syncBannerHeight();
  }
  bindListener(window, 'resize', syncHeaderOffset);
  bindListener(window, 'resize', syncBannerHeight);
  bindListener(document, 'shopify:section:load', syncHeaderOffset);
  bindListener(document, 'shopify:section:load', syncBannerHeight);
})();
