(function () {
  'use strict';

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

        btn.setAttribute('aria-expanded', 'false');
      });
      section.querySelectorAll('.kt-shop-the-look__popup--visible').forEach(function (p) {
        p.classList.remove('kt-shop-the-look__popup--visible');

        p.setAttribute('inert', '');
        p.setAttribute('aria-hidden', 'true');
      });
      if (mobileSheet) {
        mobileSheet.classList.remove('kt-shop-the-look__mobile-sheet--visible');
        mobileSheet.setAttribute('inert', '');
        mobileSheet.setAttribute('aria-hidden', 'true');
      }
      activeId = null;
    }

    function openHotspot(id) {
      closeAll();
      activeId = id;

      var btn = section.querySelector('[data-hotspot-toggle="' + id + '"]');
      var popup = section.querySelector('[data-hotspot-popup="' + id + '"]');

      if (btn) {
        btn.classList.add('kt-shop-the-look__hotspot--active');

        btn.setAttribute('aria-expanded', 'true');
      }
      if (popup) {
        popup.classList.add('kt-shop-the-look__popup--visible');

        popup.removeAttribute('inert');
        popup.setAttribute('aria-hidden', 'false');
      }

      if (mobileSheet && window.innerWidth < 750) {
        var wrap = section.querySelector('[data-hotspot-id="' + id + '"]');
        if (!wrap) return;
        var block = wrap.closest('[data-hotspot-id]');
        var hotspotBtn = block.querySelector('[data-hotspot-toggle]');

        var popupEl = block.querySelector('[data-hotspot-popup]');
        if (popupEl) {
          var nameEl = popupEl.querySelector('.kt-shop-the-look__popup-name');
          var priceEl = popupEl.querySelector('.kt-shop-the-look__popup-price');
          var linkEl = popupEl.querySelector('.kt-shop-the-look__popup-link');
          var imgEl = popupEl.querySelector('.kt-shop-the-look__popup-image');

          if (mobileName && nameEl) mobileName.textContent = nameEl.textContent;
          if (mobilePrice && priceEl) mobilePrice.textContent = priceEl.textContent;

          if (mobileLink) {
            if (linkEl) {
              mobileLink.href = linkEl.href;
              mobileLink.removeAttribute('hidden');
            } else {
              mobileLink.setAttribute('hidden', '');
            }
          }
          if (mobileImg && imgEl) {
            while (mobileImg.firstChild) mobileImg.removeChild(mobileImg.firstChild);

            var tag = imgEl.tagName && imgEl.tagName.toLowerCase();
            if (tag === 'img') {
              var cloneImg = document.createElement('img');
              cloneImg.src = imgEl.src;
              cloneImg.alt = imgEl.alt || '';
              cloneImg.style.width = '100%';
              cloneImg.style.height = '100%';
              cloneImg.style.objectFit = 'cover';
              mobileImg.appendChild(cloneImg);
            } else {
              var cloneSvg = imgEl.cloneNode(true);
              cloneSvg.style.width = '100%';
              cloneSvg.style.height = '100%';
              mobileImg.appendChild(cloneSvg);
            }
          }
        }

        mobileSheet.classList.add('kt-shop-the-look__mobile-sheet--visible');

        mobileSheet.removeAttribute('inert');
        mobileSheet.setAttribute('aria-hidden', 'false');
      }
    }

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

    section._ktShopTheLook = { open: openHotspot, closeAll: closeAll };

    if (mobileClose) {
      mobileClose.addEventListener('click', closeAll);
    }

    var onKeydown = function (e) {
      if (e.code === 'Escape' && activeId) closeAll();
    };
    document.addEventListener('keydown', onKeydown);
    keydownHandlers.set(section, onKeydown);
  }

  document.querySelectorAll('[data-section-type="shop-the-look"]').forEach(function (el) {
    init(el.closest('.shopify-section') || el);
  });

  function guardScroll() {
    if (!(window.Shopify && Shopify.designMode)) return;
    var savedY = window.pageYOffset || document.documentElement.scrollTop || 0;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        var currentY = window.pageYOffset || document.documentElement.scrollTop || 0;
        var drift = Math.abs(currentY - savedY);

        if (drift > 200) {
          window.scrollTo({ top: savedY, left: 0, behavior: 'instant' });
        }
      });
    });
  }

  document.addEventListener('shopify:section:load', function (e) {
    if (e.target && e.target.querySelector) {
      var existing = e.target.querySelector('[data-section-type="shop-the-look"]');
      if (existing) {
        var prevHandler = keydownHandlers.get(existing);
        if (prevHandler) {
          document.removeEventListener('keydown', prevHandler);
          keydownHandlers.delete(existing);
        }
      }
    }
    init(e.target);

    if (e.target && e.target.querySelector && e.target.querySelector('[data-section-type="shop-the-look"]')) {
      guardScroll();
    }
  });

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

  function highlightDotOnly(section, id) {
    if (!section) return;
    section.querySelectorAll('.kt-shop-the-look__hotspot--active').forEach(function (btn) {
      btn.classList.remove('kt-shop-the-look__hotspot--active');
    });
    var dot = section.querySelector('[data-hotspot-toggle="' + id + '"]');
    if (dot) dot.classList.add('kt-shop-the-look__hotspot--active');
  }

  function clearDotHighlights(section) {
    if (!section) return;
    section.querySelectorAll('.kt-shop-the-look__hotspot--active').forEach(function (btn) {
      btn.classList.remove('kt-shop-the-look__hotspot--active');
    });
  }

  document.addEventListener('shopify:block:select', function (e) {
    var block = e.target;
    if (!block || !block.closest) return;
    var section = block.closest('[data-section-type="shop-the-look"]');
    if (!section || !section._ktShopTheLook) return;
    var hotspotEl = block.matches('[data-hotspot-id]')
      ? block
      : block.querySelector('[data-hotspot-id]');
    if (!hotspotEl) return;
    highlightDotOnly(section, hotspotEl.dataset.hotspotId);

    guardScroll();
  });

  document.addEventListener('shopify:block:deselect', function (e) {
    var block = e.target;
    if (!block || !block.closest) return;
    var section = block.closest('[data-section-type="shop-the-look"]');
    if (!section || !section._ktShopTheLook) return;
    clearDotHighlights(section);
  });
})();
