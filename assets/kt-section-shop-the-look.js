/**
 * Shop The Look — hotspot toggle, desktop popup, mobile bottom sheet
 * Birebir from ShopTheLookHome.tsx
 */
(function () {
  'use strict';

  /* Map<section, keydownHandler> so shopify:section:unload can detach
     the document-level Escape listener we attached on init. Without
     this, each re-render leaves a stranded listener referencing a
     stale `section` closure. */
  var keydownHandlers = new WeakMap();

  function init(container) {
    var section = container.querySelector('[data-section-type="shop-the-look"]');
    if (!section) return;
    if (section.dataset.shopTheLookBound === 'true') return;
    section.dataset.shopTheLookBound = 'true';

    var activeId = null;
    var mobileSheet = section.querySelector('[data-mobile-sheet]');
    var mobileClose = section.querySelector('[data-mobile-sheet-close]');
    var mobileImg = section.querySelector('[data-mobile-sheet-img]');
    var mobileName = section.querySelector('[data-mobile-sheet-name]');
    var mobilePrice = section.querySelector('[data-mobile-sheet-price]');
    var mobileLink = section.querySelector('[data-mobile-sheet-link]');

    function closeAll() {
      section.querySelectorAll('.kt-shop-the-look__hotspot--active').forEach(function (btn) {
        btn.classList.remove('kt-shop-the-look__hotspot--active');
      });
      section.querySelectorAll('.kt-shop-the-look__popup--visible').forEach(function (p) {
        p.classList.remove('kt-shop-the-look__popup--visible');
      });
      if (mobileSheet) mobileSheet.classList.remove('kt-shop-the-look__mobile-sheet--visible');
      activeId = null;
    }

    function openHotspot(id) {
      closeAll();
      activeId = id;

      var btn = section.querySelector('[data-hotspot-toggle="' + id + '"]');
      var popup = section.querySelector('[data-hotspot-popup="' + id + '"]');

      if (btn) btn.classList.add('kt-shop-the-look__hotspot--active');
      if (popup) popup.classList.add('kt-shop-the-look__popup--visible');

      /* Mobile bottom sheet */
      if (mobileSheet && window.innerWidth < 750) {
        var wrap = section.querySelector('[data-hotspot-id="' + id + '"]');
        if (!wrap) return;
        var block = wrap.closest('[data-hotspot-id]');
        var hotspotBtn = block.querySelector('[data-hotspot-toggle]');

        /* Read data from popup */
        var popupEl = block.querySelector('[data-hotspot-popup]');
        if (popupEl) {
          var nameEl = popupEl.querySelector('.kt-shop-the-look__popup-name');
          var priceEl = popupEl.querySelector('.kt-shop-the-look__popup-price');
          var linkEl = popupEl.querySelector('.kt-shop-the-look__popup-link');
          var imgEl = popupEl.querySelector('.kt-shop-the-look__popup-image');

          if (mobileName && nameEl) mobileName.textContent = nameEl.textContent;
          if (mobilePrice && priceEl) mobilePrice.textContent = priceEl.textContent;
          if (mobileLink && linkEl) mobileLink.href = linkEl.href;
          if (mobileImg && imgEl) {
            /* Build the <img> via DOM nodes (not innerHTML interpolation)
               so an alt attribute containing HTML-active characters can
               never be parsed as markup. Clear existing children first. */
            while (mobileImg.firstChild) mobileImg.removeChild(mobileImg.firstChild);
            var cloneImg = document.createElement('img');
            cloneImg.src = imgEl.src;
            cloneImg.alt = imgEl.alt || '';
            cloneImg.style.width = '100%';
            cloneImg.style.height = '100%';
            cloneImg.style.objectFit = 'cover';
            mobileImg.appendChild(cloneImg);
          }
        }

        mobileSheet.classList.add('kt-shop-the-look__mobile-sheet--visible');
      }
    }

    /* Hotspot toggle buttons */
    section.querySelectorAll('[data-hotspot-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.dataset.hotspotToggle;
        if (activeId === id) {
          closeAll();
        } else {
          openHotspot(id);
        }
      });
    });

    /* Mobile close */
    if (mobileClose) {
      mobileClose.addEventListener('click', closeAll);
    }

    /* Escape key — stored in a WeakMap so unload can remove it. */
    var onKeydown = function (e) {
      if (e.code === 'Escape' && activeId) closeAll();
    };
    document.addEventListener('keydown', onKeydown);
    keydownHandlers.set(section, onKeydown);
  }

  document.querySelectorAll('[data-section-type="shop-the-look"]').forEach(function (el) {
    init(el.closest('.shopify-section') || el);
  });

  document.addEventListener('shopify:section:load', function (e) { init(e.target); });

  document.addEventListener('shopify:section:unload', function (e) {
    if (!e.target || !e.target.querySelector) return;
    var section = e.target.querySelector('[data-section-type="shop-the-look"]');
    if (!section) return;
    var handler = keydownHandlers.get(section);
    if (handler) {
      document.removeEventListener('keydown', handler);
      keydownHandlers.delete(section);
    }
  });
})();
