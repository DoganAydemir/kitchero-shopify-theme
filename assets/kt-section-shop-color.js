(function () {
  'use strict';

  function initShopColor(container) {
    var section = container.querySelector('[data-section-type="shop-color"]');
    if (!section) return;

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
      var link = btn.dataset.finishLink || '';

      hideAllImages();
      var targetImg = section.querySelector('[data-finish-image="' + imageId + '"]');
      if (targetImg) targetImg.style.opacity = '1';

      if (codeEl) codeEl.textContent = code;
      if (labelEl) labelEl.textContent = name + (cat ? ' \u2014 ' + cat : '');

      if (paletteTop) paletteTop.style.backgroundColor = color1;
      if (paletteBottom) paletteBottom.style.backgroundColor = color2;

      var parentCat = btn.closest('[data-category-id]');
      if (parentCat) {
        parentCat.querySelectorAll('[data-mobile-finish-image]').forEach(function (slide) {
          slide.classList.remove('kt-shop-color__mobile-image-slide--active');
        });
        var mobileSlide = parentCat.querySelector('[data-mobile-finish-image="' + imageId + '"]');
        if (mobileSlide) mobileSlide.classList.add('kt-shop-color__mobile-image-slide--active');

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

      var deskLink = section.querySelector('[data-finish-link-target]');
      var mobileLink = parentCat ? parentCat.querySelector('[data-mobile-finish-link-target]') : null;
      [deskLink, mobileLink].forEach(function (a) {
        if (!a) return;
        if (link) {
          a.setAttribute('href', link);
          a.setAttribute('aria-label', name + (cat ? ', ' + cat : ''));
          a.style.pointerEvents = '';
          a.hidden = false;
        } else {
          a.removeAttribute('href');
          a.style.pointerEvents = 'none';
          a.hidden = true;
        }
      });

      clearAllFinishActive();
      btn.classList.add('kt-shop-color__finish-btn--active');
    }

    function activateCategory(cat) {
      categories.forEach(function (c) {
        c.classList.remove('kt-shop-color__category--active');

        var trigger = c.querySelector('[data-category-trigger]');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
      });
      cat.classList.add('kt-shop-color__category--active');
      var activeTrigger = cat.querySelector('[data-category-trigger]');
      if (activeTrigger) activeTrigger.setAttribute('aria-expanded', 'true');

      var firstBtn = cat.querySelector('[data-finish-select]');
      if (firstBtn) showFinish(firstBtn);
    }

    var firstCat = section.querySelector('.kt-shop-color__category--active');
    if (firstCat) {
      var firstBtn = firstCat.querySelector('[data-finish-select]');
      if (firstBtn) showFinish(firstBtn);
    }

    categories.forEach(function (cat) {
      cat.addEventListener('mouseenter', function () { activateCategory(cat); });
      var trigger = cat.querySelector('[data-category-trigger]');
      if (trigger) {
        trigger.addEventListener('click', function (e) {
          if (e.target.closest('[data-finish-select]')) return;
          activateCategory(cat);
        });
      }
    });

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

  document.addEventListener('shopify:section:unload', function () {
  });

  document.addEventListener('shopify:block:select', function (event) {
    var block = event.target;
    if (!block) return;
    var cat = block.classList && block.classList.contains('kt-shop-color__category')
      ? block
      : (block.closest && block.closest('[data-category-id]'));
    if (!cat) return;
    var section = cat.closest('.shopify-section');
    if (!section) return;
    section.querySelectorAll('[data-category-id]').forEach(function (c) {
      c.classList.remove('kt-shop-color__category--active');
      var t = c.querySelector('[data-category-trigger]');
      if (t) t.setAttribute('aria-expanded', 'false');
    });
    cat.classList.add('kt-shop-color__category--active');
    var activeTrigger = cat.querySelector('[data-category-trigger]');
    if (activeTrigger) activeTrigger.setAttribute('aria-expanded', 'true');
  });
})();
