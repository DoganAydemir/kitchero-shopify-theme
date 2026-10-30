(function () {
  'use strict';

  var hasFinePointer =
    window.matchMedia && window.matchMedia('(pointer: fine)').matches;

  function initGallery(container) {
    var gallery = container.querySelector('[data-product-gallery]');
    if (!gallery) return;

    var slides = gallery.querySelectorAll('[data-gallery-slide]');
    var thumbs = gallery.querySelectorAll('[data-gallery-thumb-btn]');
    var mainArea = gallery.querySelector('[data-gallery-main]');
    var lightbox = gallery.querySelector('[data-lightbox]');
    var lightboxImage = gallery.querySelector('[data-lightbox-image]');
    var lightboxViewport = gallery.querySelector('[data-lightbox-viewport]');
    var lightboxClose = gallery.querySelector('[data-lightbox-close]');
    var lightboxPrev = gallery.querySelector('[data-lightbox-prev]');
    var lightboxNext = gallery.querySelector('[data-lightbox-next]');

    if (lightbox) {
      var sectionEl = container.closest('.shopify-section') || container;
      var sectionId = (sectionEl && sectionEl.id) || 'gallery';
      var ownerTag = 'data-lightbox-owner';
      if (lightbox.parentNode !== document.body) {
        var existing = document.body.querySelectorAll('[' + ownerTag + '="' + CSS.escape(sectionId) + '"]');
        Array.prototype.forEach.call(existing, function (el) {
          if (el !== lightbox && el.parentNode === document.body) {
            el.parentNode.removeChild(el);
          }
        });
        lightbox.setAttribute(ownerTag, sectionId);
        document.body.appendChild(lightbox);
      }
    }

    var currentIndex = 0;
    var totalSlides = slides.length;
    var imageUrls = [];
    var imageAlts = [];

    slides.forEach(function (slide) {
      var img = slide.querySelector('img');
      if (!img) {
        imageUrls.push(null);
        imageAlts.push('');
        return;
      }
      var url = img.src;
      if (img.srcset) {
        var candidates = img.srcset.split(',').map(function (s) { return s.trim(); });
        var last = candidates[candidates.length - 1];
        if (last) url = last.split(' ')[0];
      }
      imageUrls.push(url);
      imageAlts.push(img.alt || '');

      if (img.complete && img.naturalWidth > 0) {
        slide.setAttribute('data-image-loaded', 'true');
      } else {
        var markLoaded = function () {
          slide.setAttribute('data-image-loaded', 'true');
          img.removeEventListener('load', markLoaded);
          img.removeEventListener('error', markLoaded);
        };
        img.addEventListener('load', markLoaded);

        img.addEventListener('error', markLoaded);
      }
    });

    // Start loading the other gallery images once the shopper reaches for the
    // variant picker or the thumbnails, so a variant change shows its photo
    // without a loading state. Nothing extra loads before that.
    var galleryWarmed = false;
    var warmGallery = function (event) {
      if (galleryWarmed || !event.target || !event.target.closest) return;
      if (!event.target.closest('[data-variant-picker], .kt-gallery__thumb, [data-gallery-main]')) return;
      galleryWarmed = true;
      slides.forEach(function (slide) {
        var lazyImg = slide.querySelector('img.kt-gallery__image[loading="lazy"]');
        if (lazyImg) lazyImg.loading = 'eager';
      });
    };
    ['pointerover', 'focusin', 'touchstart'].forEach(function (type) {
      container.addEventListener(type, warmGallery, { passive: true });
    });

    function pauseAllMedia() {
      gallery.querySelectorAll('video').forEach(function (v) {
        try { v.pause(); } catch (e) {  }
      });
      gallery.querySelectorAll('iframe').forEach(function (iframe) {
        var src = iframe.src || '';
        try {
          if (src.indexOf('youtube') > -1) {
            iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
          } else if (src.indexOf('vimeo') > -1) {
            iframe.contentWindow.postMessage('{"method":"pause"}', '*');
          }
        } catch (e) {  }
      });

      gallery.querySelectorAll('model-viewer').forEach(function (mv) {
        try {
          if (typeof mv.pause === 'function') mv.pause();

          if ('autoRotate' in mv) mv.autoRotate = false;
        } catch (e) {  }
      });
    }

    function setLightboxImage(url, alt) {
      if (!lightboxImage) return;

      lightboxImage.classList.remove('is-loaded');
      lightboxImage.style.transform = '';
      if (lightboxViewport) {
        lightboxViewport.classList.add('is-loading');
        lightboxViewport.classList.remove('kt-lightbox__viewport--zoomed');
      }

      if (typeof invalidateZoomCache === 'function') invalidateZoomCache();

      lightboxImage.onload = null;
      lightboxImage.onerror = null;

      lightboxImage.onload = function () {
        lightboxImage.classList.add('is-loaded');
        if (lightboxViewport) lightboxViewport.classList.remove('is-loading');
      };
      lightboxImage.onerror = function () {
        if (lightboxViewport) lightboxViewport.classList.remove('is-loading');
      };

      lightboxImage.alt = alt || '';
      lightboxImage.src = url || '';

      if (lightboxImage.complete && lightboxImage.naturalWidth > 0) {
        lightboxImage.onload();
      }
    }

    var galleryMain = gallery.querySelector('.kt-gallery__main');
    function showLoader() {
      if (galleryMain) galleryMain.classList.add('kt-gallery__main--loading');
    }
    function hideLoader() {
      if (galleryMain) galleryMain.classList.remove('kt-gallery__main--loading');
    }

    function goTo(index) {
      if (index < 0) index = totalSlides - 1;
      if (index >= totalSlides) index = 0;
      currentIndex = index;

      pauseAllMedia();

      var targetImg = slides[index] && slides[index].querySelector('img.kt-gallery__image');
      if (targetImg && !targetImg.complete) {
        showLoader();
        var clearLoader = function () {
          hideLoader();
          targetImg.removeEventListener('load', clearLoader);
          targetImg.removeEventListener('error', clearLoader);
        };
        targetImg.addEventListener('load', clearLoader);
        targetImg.addEventListener('error', clearLoader);
      } else {
        hideLoader();
      }

      slides.forEach(function (s) { s.classList.remove('kt-gallery__slide--active'); });

      thumbs.forEach(function (t) {
        t.classList.remove('kt-gallery__thumb--active');
        t.removeAttribute('aria-current');
      });

      if (slides[index]) slides[index].classList.add('kt-gallery__slide--active');
      if (thumbs[index]) {
        thumbs[index].classList.add('kt-gallery__thumb--active');
        thumbs[index].setAttribute('aria-current', 'true');

        if (!(window.Shopify && window.Shopify.designMode)) {
          var prm = window.matchMedia
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          thumbs[index].scrollIntoView({ behavior: prm ? 'auto' : 'smooth', block: 'nearest', inline: 'nearest' });
        }
      }

      if (lightbox && lightbox.getAttribute('aria-hidden') === 'false' && lightboxImage && imageUrls[index]) {
        setLightboxImage(imageUrls[index], imageAlts[index]);
      }

      if (lightbox) {
        var counterCurrent = lightbox.querySelector('[data-lightbox-counter-current]');
        if (counterCurrent) counterCurrent.textContent = (index + 1);
      }
    }

    thumbs.forEach(function (thumb) {
      thumb.addEventListener('click', function () {
        var idx = parseInt(thumb.dataset.mediaIndex, 10);
        goTo(idx);
      });
    });

    gallery.addEventListener('gallery:goto', function (e) {
      var mediaId = e.detail && e.detail.mediaId;
      if (!mediaId) return;

      var targetSlide = gallery.querySelector(
        '[data-gallery-slide][data-media-id="' + String(mediaId) + '"]'
      );
      if (!targetSlide) return;
      var targetIndex = parseInt(targetSlide.dataset.gallerySlide, 10);
      if (!isNaN(targetIndex)) goTo(targetIndex);
    });

    if (mainArea) {
      mainArea.addEventListener('click', function () {
        openLightbox();
      });

      var inlineSwipeStartX = 0, inlineSwipeStartY = 0, inlineSwipeMoved = false;
      var INLINE_SWIPE_THRESHOLD = 50;
      mainArea.addEventListener('touchstart', function (e) {
        if (e.touches.length !== 1) return;
        inlineSwipeStartX = e.touches[0].clientX;
        inlineSwipeStartY = e.touches[0].clientY;
        inlineSwipeMoved = false;
      }, { passive: true });
      mainArea.addEventListener('touchmove', function () {
        inlineSwipeMoved = true;
      }, { passive: true });
      mainArea.addEventListener('touchend', function (e) {
        if (!inlineSwipeMoved || !e.changedTouches[0]) return;
        var dx = e.changedTouches[0].clientX - inlineSwipeStartX;
        var dy = e.changedTouches[0].clientY - inlineSwipeStartY;
        if (Math.abs(dx) < INLINE_SWIPE_THRESHOLD) return;
        if (Math.abs(dy) > Math.abs(dx)) return;

        var suppressClick = function (ev) { ev.preventDefault(); ev.stopPropagation(); };
        mainArea.addEventListener('click', suppressClick, { capture: true, once: true });
        setTimeout(function () {
          mainArea.removeEventListener('click', suppressClick, { capture: true });
        }, 350);
        if (dx < 0) {
          if (currentIndex + 1 < slides.length) goTo(currentIndex + 1);
        } else {
          if (currentIndex > 0) goTo(currentIndex - 1);
        }
      }, { passive: true });

      mainArea.addEventListener('touchcancel', function () {
        inlineSwipeMoved = false;
      }, { passive: true });
    }

    slides.forEach(function (slide, slideIdx) {
      var openFromSlide = function () {
        var t = slide.dataset.mediaType;
        if (t && t !== 'image') return;
        var targetIndex = parseInt(slide.dataset.gallerySlide, 10);
        if (isNaN(targetIndex)) targetIndex = slideIdx;
        goTo(targetIndex);
        openLightbox();
      };

      slide.addEventListener('click', function () {
        if (mainArea && mainArea.contains(slide)) return;
        openFromSlide();
      });

      slide.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          openFromSlide();
        }
      });
    });

    gallery.addEventListener('click', function (e) {
      var slide = e.target.closest('[data-gallery-slide]');
      if (!slide || !gallery.contains(slide)) return;
      var t = slide.dataset.mediaType;
      if (t && t !== 'image') return;
      if (mainArea && mainArea.contains(slide)) return;
      if (lightbox && lightbox.getAttribute('aria-hidden') === 'false') return;
      var targetIndex = parseInt(slide.dataset.gallerySlide, 10);
      if (!isNaN(targetIndex)) goTo(targetIndex);
      openLightbox();
    });

    var lightboxLastTrigger = null;

    function openLightbox() {
      if (!lightbox || !lightboxImage) return;
      lightboxLastTrigger = document.activeElement;

      lightboxImage.loading = 'eager';
      setLightboxImage(imageUrls[currentIndex], imageAlts[currentIndex]);
      lightbox.setAttribute('aria-hidden', 'false');

      lightbox.removeAttribute('inert');
      if (window.Kitchero && Kitchero.scrollLock) {
        Kitchero.scrollLock.lock('product-gallery-lightbox');
      } else {
        document.body.style.overflow = 'hidden';
      }
      if (window.Kitchero && Kitchero.focusTrap) Kitchero.focusTrap.enable(lightbox);
    }

    function closeLightbox() {
      if (!lightbox) return;
      lightbox.setAttribute('aria-hidden', 'true');

      lightbox.setAttribute('inert', '');
      if (window.Kitchero && Kitchero.scrollLock) {
        Kitchero.scrollLock.unlock('product-gallery-lightbox');
      } else {
        document.body.style.overflow = '';
      }
      if (lightboxViewport) {
        lightboxViewport.classList.remove('kt-lightbox__viewport--zoomed');
        lightboxViewport.classList.remove('is-loading');
      }
      if (lightboxImage) {
        lightboxImage.classList.remove('is-loaded');
        lightboxImage.style.transform = '';
      }
      if (window.Kitchero && Kitchero.focusTrap) Kitchero.focusTrap.disable(lightbox);

      if (lightboxLastTrigger && document.contains(lightboxLastTrigger) && typeof lightboxLastTrigger.focus === 'function') {
        lightboxLastTrigger.focus();
      }
      lightboxLastTrigger = null;
    }

    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);

    window.addEventListener('pageshow', function (event) {
      if (event.persisted && lightbox && lightbox.getAttribute('aria-hidden') === 'false') {
        closeLightbox();
      }
    });

    if (lightbox) lightbox.addEventListener('click', function (event) {
      if (event.target === lightbox) closeLightbox();
    });
    if (lightboxPrev) lightboxPrev.addEventListener('click', function () { goTo(currentIndex - 1); });
    if (lightboxNext) lightboxNext.addEventListener('click', function () { goTo(currentIndex + 1); });

    if (lightboxViewport) {
      var touchStartX = 0;
      var touchStartY = 0;
      var touchStartTime = 0;
      var touchActive = false;

      lightboxViewport.addEventListener('touchstart', function (e) {
        if (lightboxViewport.classList.contains('kt-lightbox__viewport--zoomed')) return;
        if (!e.touches || e.touches.length !== 1) return;
        touchActive = true;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
      }, { passive: true });

      lightboxViewport.addEventListener('touchend', function (e) {
        if (!touchActive) return;
        touchActive = false;
        if (lightboxViewport.classList.contains('kt-lightbox__viewport--zoomed')) return;

        var touch = (e.changedTouches && e.changedTouches[0]) || null;
        if (!touch) return;

        var dx = touch.clientX - touchStartX;
        var dy = touch.clientY - touchStartY;
        var absDx = Math.abs(dx);
        var absDy = Math.abs(dy);
        var elapsed = Date.now() - touchStartTime;

        if (absDx < 50) return;
        if (absDx < absDy * 1.2) return;
        if (elapsed > 600) return;

        if (dx < 0) {
          goTo(currentIndex + 1);
        } else {
          goTo(currentIndex - 1);
        }
      }, { passive: true });

      lightboxViewport.addEventListener('touchcancel', function () {
        touchActive = false;
      }, { passive: true });
    }

    var zoomViewportRect = null;
    var zoomImageOverflowX = 0;
    var zoomImageOverflowY = 0;
    var zoomRafPending = false;
    var zoomLastX = 0;
    var zoomLastY = 0;
    function invalidateZoomCache() {
      zoomViewportRect = null;
    }
    function ensureZoomCache() {
      if (zoomViewportRect) return true;
      if (!lightboxImage || !lightboxViewport) return false;
      var rect = lightboxViewport.getBoundingClientRect();
      var imgRect = lightboxImage.getBoundingClientRect();
      if (!rect.width || !rect.height) return false;
      zoomViewportRect = rect;
      zoomImageOverflowX = Math.max(0, imgRect.width - rect.width);
      zoomImageOverflowY = Math.max(0, imgRect.height - rect.height);
      return true;
    }
    function applyZoomPan() {
      zoomRafPending = false;
      if (!zoomViewportRect) return;
      var px = (zoomLastX - zoomViewportRect.left) / zoomViewportRect.width;
      var py = (zoomLastY - zoomViewportRect.top) / zoomViewportRect.height;
      px = Math.max(0, Math.min(1, px));
      py = Math.max(0, Math.min(1, py));
      var tx = -px * zoomImageOverflowX;
      var ty = -py * zoomImageOverflowY;
      lightboxImage.style.transform = 'translate(' + tx + 'px, ' + ty + 'px)';
    }
    function updateZoomPan(clientX, clientY) {
      if (!lightboxImage || !lightboxViewport) return;
      if (!lightboxViewport.classList.contains('kt-lightbox__viewport--zoomed')) return;
      if (!ensureZoomCache()) return;
      zoomLastX = clientX;
      zoomLastY = clientY;
      if (zoomRafPending) return;
      zoomRafPending = true;
      requestAnimationFrame(applyZoomPan);
    }

    window.addEventListener('resize', invalidateZoomCache, { passive: true });

    if (lightboxViewport) {
      lightboxViewport.addEventListener('click', function (e) {
        if (lightboxViewport.classList.contains('is-loading')) return;

        var isNowZoomed = lightboxViewport.classList.toggle('kt-lightbox__viewport--zoomed');

        if (!isNowZoomed) {
          if (lightboxImage) lightboxImage.style.transform = '';
          invalidateZoomCache();
        } else if (hasFinePointer) {
          invalidateZoomCache();
          updateZoomPan(e.clientX, e.clientY);
        }
      });

      if (hasFinePointer) {
        lightboxViewport.addEventListener('mousemove', function (e) {
          updateZoomPan(e.clientX, e.clientY);
        });
      }
    }

    function toggleLightboxZoom(forceZoomState) {
      if (!lightboxViewport || !lightboxImage) return;
      if (lightboxViewport.classList.contains('is-loading')) return;
      var isCurrentlyZoomed = lightboxViewport.classList.contains('kt-lightbox__viewport--zoomed');
      var wantsZoom = typeof forceZoomState === 'boolean' ? forceZoomState : !isCurrentlyZoomed;
      if (wantsZoom === isCurrentlyZoomed) return;
      lightboxViewport.classList.toggle('kt-lightbox__viewport--zoomed', wantsZoom);
      if (!wantsZoom) {
        lightboxImage.style.transform = '';
        invalidateZoomCache();
      } else if (hasFinePointer) {
        invalidateZoomCache();
        var rect = lightboxViewport.getBoundingClientRect();
        updateZoomPan(rect.left + rect.width / 2, rect.top + rect.height / 2);
      }
    }

    function onKeydown(e) {
      if (!lightbox || lightbox.getAttribute('aria-hidden') !== 'false') return;

      if (window.Kitchero && Kitchero.focusTrap && Kitchero.focusTrap.shouldSuppressEscape && Kitchero.focusTrap.shouldSuppressEscape(lightbox)) return;
      if (e.code === 'Escape') closeLightbox();
      if (e.code === 'ArrowLeft') goTo(currentIndex - 1);
      if (e.code === 'ArrowRight') goTo(currentIndex + 1);

      if (e.code === 'Equal' || e.code === 'NumpadAdd') {
        e.preventDefault();
        toggleLightboxZoom(true);
      } else if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
        e.preventDefault();
        toggleLightboxZoom(false);
      }
    }
    document.addEventListener('keydown', onKeydown);

    var thumbsEl = gallery.querySelector('[data-gallery-thumbs]');
    var thumbResizeObserver = null;
    var applyThumbsHeight = null;
    if (thumbsEl && mainArea && typeof ResizeObserver !== 'undefined') {
      applyThumbsHeight = function () {
        if (window.innerWidth >= 990) {
          var h = mainArea.getBoundingClientRect().height;
          if (h > 0) {
            thumbsEl.style.setProperty('--kt-thumbs-max-h', h + 'px');
          }
        } else {
          thumbsEl.style.removeProperty('--kt-thumbs-max-h');
        }
      };
      thumbResizeObserver = new ResizeObserver(applyThumbsHeight);
      thumbResizeObserver.observe(mainArea);

      window.addEventListener('resize', applyThumbsHeight);

      requestAnimationFrame(applyThumbsHeight);
    }

    return function destroy() {
      document.removeEventListener('keydown', onKeydown);

      window.removeEventListener('resize', invalidateZoomCache);
      if (thumbResizeObserver) {
        thumbResizeObserver.disconnect();
        if (applyThumbsHeight) {
          window.removeEventListener('resize', applyThumbsHeight);
        }
      }

      if (lightbox && lightbox.getAttribute('aria-hidden') === 'false') {
        lightbox.setAttribute('aria-hidden', 'true');

        lightbox.setAttribute('inert', '');
        if (window.Kitchero && Kitchero.scrollLock) {
          Kitchero.scrollLock.unlock('product-gallery-lightbox');
        } else {
          document.body.style.overflow = '';
        }
        if (window.Kitchero && Kitchero.focusTrap) Kitchero.focusTrap.disable(lightbox);
      }
    };
  }

  var destroyers = {};
  document.querySelectorAll('[data-product-gallery]').forEach(function (el) {
    var section = el.closest('.shopify-section') || el;
    var id = section.id || 'gallery';
    destroyers[id] = initGallery(section);
  });

  document.addEventListener('shopify:section:load', function (e) {
    var id = e.target.id;
    if (destroyers[id]) destroyers[id]();
    destroyers[id] = initGallery(e.target);
  });

  // Fired after a gallery is re-rendered in place (for example the
  // showroom variant media groups).
  document.addEventListener('kt:gallery:refresh', function (e) {
    var id = e.target.id || 'gallery';
    if (destroyers[id]) destroyers[id]();
    destroyers[id] = initGallery(e.target);
  });

  document.addEventListener('shopify:section:unload', function (e) {
    var id = e.target.id;
    if (destroyers[id]) destroyers[id]();
    delete destroyers[id];
  });
})();
