/**
 * Shop The Look — hotspot toggle, desktop popup, mobile bottom sheet
 * Birebir from ShopTheLookHome.tsx
 */
(function () {
  'use strict';

  function init(container) {
    var section = container.querySelector('[data-section-type="shop-the-look"]');
    if (!section) return;

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
            mobileImg.innerHTML = '<img src="' + imgEl.src + '" alt="' + (imgEl.alt || '') + '" style="width:100%;height:100%;object-fit:cover;">';
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

    /* Escape key */
    document.addEventListener('keydown', function (e) {
      if (e.code === 'Escape' && activeId) closeAll();
    });
  }

  document.querySelectorAll('[data-section-type="shop-the-look"]').forEach(function (el) {
    init(el.closest('.shopify-section') || el);
  });

  document.addEventListener('shopify:section:load', function (e) { init(e.target); });
})();
