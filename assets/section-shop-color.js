/**
 * Shop Color — Category accordion + desktop image switching
 * Matches ShopColor.tsx interaction: hover/click to switch category,
 * update sticky image, palette, code/name overlays.
 */
(function () {
  'use strict';

  function initShopColor(container) {
    var section = container.querySelector('[data-section-type="shop-color"]');
    if (!section) return;

    var categories = section.querySelectorAll('[data-category-id]');
    var images = section.querySelectorAll('[data-category-image]');
    var codeEl = section.querySelector('[data-finish-code]');
    var labelEl = section.querySelector('[data-finish-label]');
    var paletteTop = section.querySelector('[data-palette-top]');
    var paletteBottom = section.querySelector('[data-palette-bottom]');

    function activate(cat) {
      /* Remove active from all */
      categories.forEach(function (c) {
        c.classList.remove('kt-shop-color__category--active');
      });

      /* Activate this one */
      cat.classList.add('kt-shop-color__category--active');

      /* Switch desktop image */
      var catId = cat.dataset.categoryId;
      images.forEach(function (img) {
        img.style.opacity = img.dataset.categoryImage === catId ? '1' : '0';
      });

      /* Update overlay info */
      if (codeEl) codeEl.textContent = cat.dataset.code || '';
      if (labelEl) {
        var finishName = cat.dataset.finishName || '';
        var catTitle = cat.querySelector('.kt-shop-color__category-title');
        labelEl.textContent = finishName + (catTitle ? ' \u2014 ' + catTitle.textContent : '');
      }

      /* Update palette */
      if (paletteTop) paletteTop.style.backgroundColor = cat.dataset.color1 || '';
      if (paletteBottom) paletteBottom.style.backgroundColor = cat.dataset.color2 || '';
    }

    /* Set initial state */
    var firstActive = section.querySelector('.kt-shop-color__category--active');
    if (firstActive) activate(firstActive);

    /* Bind events */
    categories.forEach(function (cat) {
      cat.addEventListener('mouseenter', function () { activate(cat); });
      cat.addEventListener('click', function () { activate(cat); });
    });
  }

  document.querySelectorAll('[data-section-type="shop-color"]').forEach(function (el) {
    initShopColor(el.closest('.shopify-section') || el);
  });

  document.addEventListener('shopify:section:load', function (e) {
    initShopColor(e.target);
  });
})();
