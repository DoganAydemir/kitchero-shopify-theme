/**
 * Shop Color — Category accordion + finish image switching
 * Works on both desktop (hover) and mobile (click/tap)
 */
(function () {
  'use strict';

  function initShopColor(container) {
    var section = container.querySelector('[data-section-type="shop-color"]');
    if (!section) return;
    /* Guard against double-binding when shopify:section:load fires on a
       section whose listeners were already wired. All listeners are on
       scoped elements inside the section, so they GC with the DOM when
       the section is removed — no explicit unload handler needed. */
    if (section.dataset.shopColorBound === 'true') return;
    section.dataset.shopColorBound = 'true';

    var categories = section.querySelectorAll('[data-category-id]');
    var allImages = section.querySelectorAll('[data-finish-image]');
    var allFinishBtns = section.querySelectorAll('[data-finish-select]');
    var codeEl = section.querySelector('[data-finish-code]');
    var labelEl = section.querySelector('[data-finish-label]');
    var paletteTop = section.querySelector('[data-palette-top]');
    var paletteBottom = section.querySelector('[data-palette-bottom]');

    function hideAllImages() {
      allImages.forEach(function (img) { img.style.opacity = '0'; });
    }

    function clearAllFinishActive() {
      allFinishBtns.forEach(function (btn) {
        btn.classList.remove('kt-shop-color__finish-btn--active');
      });
    }

    function showFinish(btn) {
      var imageId = btn.dataset.finishImageId;
      var code = btn.dataset.finishCode || '';
      var name = btn.dataset.finishName || '';
      var cat = btn.dataset.finishCat || '';
      var color1 = btn.dataset.finishColor1 || '';
      var color2 = btn.dataset.finishColor2 || '';

      /* Switch desktop images */
      hideAllImages();
      var targetImg = section.querySelector('[data-finish-image="' + imageId + '"]');
      if (targetImg) targetImg.style.opacity = '1';

      /* Update desktop overlay info */
      if (codeEl) codeEl.textContent = code;
      if (labelEl) labelEl.textContent = name + (cat ? ' \u2014 ' + cat : '');

      /* Update palette */
      if (paletteTop) paletteTop.style.backgroundColor = color1;
      if (paletteBottom) paletteBottom.style.backgroundColor = color2;

      /* Update mobile inline image + info */
      var parentCat = btn.closest('[data-category-id]');
      if (parentCat) {
        /* Switch mobile image slide */
        parentCat.querySelectorAll('[data-mobile-finish-image]').forEach(function (slide) {
          slide.classList.remove('kt-shop-color__mobile-image-slide--active');
        });
        var mobileSlide = parentCat.querySelector('[data-mobile-finish-image="' + imageId + '"]');
        if (mobileSlide) mobileSlide.classList.add('kt-shop-color__mobile-image-slide--active');

        /* Update code, name, swatch */
        var mobileCode = parentCat.querySelector('.kt-shop-color__mobile-image-code');
        var mobileName = parentCat.querySelector('.kt-shop-color__mobile-image-name');
        var mobileSwatch = parentCat.querySelectorAll('.kt-shop-color__mobile-swatch > div');
        if (mobileCode) mobileCode.textContent = code;
        if (mobileName) mobileName.textContent = name;
        if (mobileSwatch.length >= 2) {
          mobileSwatch[0].style.backgroundColor = color1;
          mobileSwatch[1].style.backgroundColor = color2;
        }
      }

      /* Active state on button */
      clearAllFinishActive();
      btn.classList.add('kt-shop-color__finish-btn--active');
    }

    function activateCategory(cat) {
      categories.forEach(function (c) {
        c.classList.remove('kt-shop-color__category--active');
      });
      cat.classList.add('kt-shop-color__category--active');

      var firstBtn = cat.querySelector('[data-finish-select]');
      if (firstBtn) showFinish(firstBtn);
    }

    /* Set initial state */
    var firstCat = section.querySelector('.kt-shop-color__category--active');
    if (firstCat) {
      var firstBtn = firstCat.querySelector('[data-finish-select]');
      if (firstBtn) showFinish(firstBtn);
    }

    /* Category — hover on desktop, click on both */
    categories.forEach(function (cat) {
      cat.addEventListener('mouseenter', function () { activateCategory(cat); });
      cat.addEventListener('click', function (e) {
        /* Don't re-activate if clicking a finish button inside */
        if (e.target.closest('[data-finish-select]')) return;
        activateCategory(cat);
      });
    });

    /* Finish buttons — hover on desktop, click on both */
    allFinishBtns.forEach(function (btn) {
      btn.addEventListener('mouseenter', function (e) {
        e.stopPropagation();
        showFinish(btn);
      });
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        showFinish(btn);
      });
    });
  }

  document.querySelectorAll('[data-section-type="shop-color"]').forEach(function (el) {
    initShopColor(el.closest('.shopify-section') || el);
  });

  document.addEventListener('shopify:section:load', function (e) {
    initShopColor(e.target);
  });
})();
