/**
 * Shop Color — Category accordion + finish image switching
 * Birebir from ShopColor.tsx:
 * - Hover category → activate, select first finish
 * - Hover finish button → switch desktop image, palette, code/name
 * - Active finish gets underline style
 */
(function () {
  'use strict';

  function initShopColor(container) {
    var section = container.querySelector('[data-section-type="shop-color"]');
    if (!section) return;

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

      /* Switch image */
      hideAllImages();
      var targetImg = section.querySelector('[data-finish-image="' + imageId + '"]');
      if (targetImg) targetImg.style.opacity = '1';

      /* Update overlay info */
      if (codeEl) codeEl.textContent = code;
      if (labelEl) labelEl.textContent = name + (cat ? ' \u2014 ' + cat : '');

      /* Update palette */
      if (paletteTop) paletteTop.style.backgroundColor = color1;
      if (paletteBottom) paletteBottom.style.backgroundColor = color2;

      /* Active state on button */
      clearAllFinishActive();
      btn.classList.add('kt-shop-color__finish-btn--active');
    }

    function activateCategory(cat) {
      /* Toggle accordion */
      categories.forEach(function (c) {
        c.classList.remove('kt-shop-color__category--active');
      });
      cat.classList.add('kt-shop-color__category--active');

      /* Auto-select first finish in this category */
      var firstBtn = cat.querySelector('[data-finish-select]');
      if (firstBtn) showFinish(firstBtn);
    }

    /* Set initial state */
    var firstCat = section.querySelector('.kt-shop-color__category--active');
    if (firstCat) {
      var firstBtn = firstCat.querySelector('[data-finish-select]');
      if (firstBtn) showFinish(firstBtn);
    }

    /* Category hover/click */
    categories.forEach(function (cat) {
      cat.addEventListener('mouseenter', function () { activateCategory(cat); });
      cat.addEventListener('click', function () { activateCategory(cat); });
    });

    /* Finish button hover/click */
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
