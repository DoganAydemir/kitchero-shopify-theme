/**
 * Product Gallery — thumbnail switching + fullscreen lightbox
 * Birebir from product/[id]/page.tsx gallery behavior.
 * Re-inits on shopify:section:load.
 */
(function () {
  'use strict';

  /* Devices with a fine pointer (mouse / trackpad) get the
     magnifier-style mouse-follow pan when the lightbox image is
     zoomed. Touch-only devices fall back to the default overflow
     scroll so users can drag the image with their finger. */
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

    var currentIndex = 0;
    var totalSlides = slides.length;
    var imageUrls = [];
    var imageAlts = [];

    /* Collect image URLs for lightbox (use the largest srcset candidate
       when available, otherwise fall back to src) */
    slides.forEach(function (slide) {
      var img = slide.querySelector('img');
      if (!img) return;
      var url = img.src;
      if (img.srcset) {
        var candidates = img.srcset.split(',').map(function (s) { return s.trim(); });
        var last = candidates[candidates.length - 1];
        if (last) url = last.split(' ')[0];
      }
      imageUrls.push(url);
      imageAlts.push(img.alt || '');
    });

    /* Lightbox image load/loading state handling — show spinner until
       the new image's `load` event fires, then fade it in.
       Matches the product/[id]/page.tsx isImageLoading behavior. */
    function setLightboxImage(url, alt) {
      if (!lightboxImage) return;

      // Reset to loading state: hide image, show spinner, clear any
      // leftover zoom pan transform from the previous image, and exit
      // zoom mode so the new image starts at its fit-to-viewport size.
      lightboxImage.classList.remove('is-loaded');
      lightboxImage.style.transform = '';
      if (lightboxViewport) {
        lightboxViewport.classList.add('is-loading');
        lightboxViewport.classList.remove('kt-lightbox__viewport--zoomed');
      }

      // Detach previous onload to avoid stale callbacks.
      lightboxImage.onload = null;
      lightboxImage.onerror = null;

      lightboxImage.onload = function () {
        lightboxImage.classList.add('is-loaded');
        if (lightboxViewport) lightboxViewport.classList.remove('is-loading');
      };
      lightboxImage.onerror = function () {
        // Still hide the spinner on error so the user isn't stuck staring
        // at an endlessly spinning circle — we leave the image invisible.
        if (lightboxViewport) lightboxViewport.classList.remove('is-loading');
      };

      lightboxImage.alt = alt || '';
      lightboxImage.src = url || '';

      // If the browser already has the image cached, `load` may never fire
      // (Firefox). Fall back to `complete`.
      if (lightboxImage.complete && lightboxImage.naturalWidth > 0) {
        lightboxImage.onload();
      }
    }

    /* Switch to slide by index */
    function goTo(index) {
      if (index < 0) index = totalSlides - 1;
      if (index >= totalSlides) index = 0;
      currentIndex = index;

      slides.forEach(function (s) { s.classList.remove('kt-gallery__slide--active'); });
      thumbs.forEach(function (t) { t.classList.remove('kt-gallery__thumb--active'); });

      if (slides[index]) slides[index].classList.add('kt-gallery__slide--active');
      if (thumbs[index]) {
        thumbs[index].classList.add('kt-gallery__thumb--active');
        /* Scroll thumb into view */
        thumbs[index].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }

      /* Update lightbox image if open */
      if (lightbox && lightbox.getAttribute('aria-hidden') === 'false' && lightboxImage) {
        setLightboxImage(imageUrls[index], imageAlts[index]);
      }
    }

    /* Thumb click */
    thumbs.forEach(function (thumb) {
      thumb.addEventListener('click', function () {
        var idx = parseInt(thumb.dataset.mediaIndex, 10);
        goTo(idx);
      });
    });

    /* Main image area click → open lightbox (E-commerce PDP wrapper) */
    if (mainArea) {
      mainArea.addEventListener('click', function () {
        openLightbox();
      });
    }

    /* Slide click → open lightbox to that specific image (Showroom PDP
       uses inline gallery without a single [data-gallery-main] wrapper,
       so each slide needs its own click handler). Works for E-commerce
       too: clicking the currently-active slide opens the lightbox. */
    slides.forEach(function (slide, slideIdx) {
      slide.addEventListener('click', function (e) {
        // Avoid double-firing when the click already bubbles up to mainArea.
        if (mainArea && mainArea.contains(slide)) return;

        var targetIndex = parseInt(slide.dataset.gallerySlide, 10);
        if (isNaN(targetIndex)) targetIndex = slideIdx;
        goTo(targetIndex);
        openLightbox();
      });
    });

    /* Lightbox open */
    function openLightbox() {
      if (!lightbox || !lightboxImage) return;
      setLightboxImage(imageUrls[currentIndex], imageAlts[currentIndex]);
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      if (typeof trapFocus === 'function') trapFocus(lightbox);
    }

    /* Lightbox close */
    function closeLightbox() {
      if (!lightbox) return;
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (lightboxViewport) {
        lightboxViewport.classList.remove('kt-lightbox__viewport--zoomed');
        lightboxViewport.classList.remove('is-loading');
      }
      if (lightboxImage) {
        lightboxImage.classList.remove('is-loaded');
        lightboxImage.style.transform = '';
      }
      if (typeof removeTrapFocus === 'function') removeTrapFocus();
    }

    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    if (lightboxPrev) lightboxPrev.addEventListener('click', function () { goTo(currentIndex - 1); });
    if (lightboxNext) lightboxNext.addEventListener('click', function () { goTo(currentIndex + 1); });

    /* Update the zoomed image's translate so the area under the
       cursor is what's visible. Called on click-to-zoom (using the
       click coordinates for the initial position) and on mousemove
       while zoomed. No-op on touch devices — those still use the
       native overflow scroll. */
    function updateZoomPan(clientX, clientY) {
      if (!lightboxImage || !lightboxViewport) return;
      if (!lightboxViewport.classList.contains('kt-lightbox__viewport--zoomed')) return;

      var rect = lightboxViewport.getBoundingClientRect();
      var px = (clientX - rect.left) / rect.width;
      var py = (clientY - rect.top) / rect.height;

      // Clamp to [0, 1] so the edges of the image stay pinned to the
      // edges of the viewport — no black gap on aggressive cursor moves.
      px = Math.max(0, Math.min(1, px));
      py = Math.max(0, Math.min(1, py));

      var imgRect = lightboxImage.getBoundingClientRect();
      var overflowX = Math.max(0, imgRect.width - rect.width);
      var overflowY = Math.max(0, imgRect.height - rect.height);

      var tx = -px * overflowX;
      var ty = -py * overflowY;

      lightboxImage.style.transform = 'translate(' + tx + 'px, ' + ty + 'px)';
    }

    /* Lightbox zoom toggle — clicking anywhere inside the viewport
       (image, padding area, or loaded image bounds) toggles the zoomed
       state. The prev/next/close buttons are siblings of the viewport
       so they never fire this handler. The spinner has pointer-events
       none so it's invisible to clicks. */
    if (lightboxViewport) {
      lightboxViewport.addEventListener('click', function (e) {
        // Only toggle once the image has finished loading, otherwise the
        // very first click (while still loading) would zoom into nothing.
        if (lightboxViewport.classList.contains('is-loading')) return;

        var isNowZoomed = lightboxViewport.classList.toggle('kt-lightbox__viewport--zoomed');

        if (!isNowZoomed) {
          // Un-zoomed → reset inline transform so the next zoom starts fresh.
          if (lightboxImage) lightboxImage.style.transform = '';
        } else if (hasFinePointer) {
          // Initial pan based on where the user clicked — so the clicked
          // spot is what remains visible after the zoom-in.
          updateZoomPan(e.clientX, e.clientY);
        }
      });

      /* Mouse-follow pan — desktop/trackpad only. Moving the cursor
         translates the image so the hovered area is visible. */
      if (hasFinePointer) {
        lightboxViewport.addEventListener('mousemove', function (e) {
          updateZoomPan(e.clientX, e.clientY);
        });
      }
    }

    /* Keyboard: Escape close, arrows navigate */
    function onKeydown(e) {
      if (!lightbox || lightbox.getAttribute('aria-hidden') !== 'false') return;
      if (e.code === 'Escape') closeLightbox();
      if (e.code === 'ArrowLeft') goTo(currentIndex - 1);
      if (e.code === 'ArrowRight') goTo(currentIndex + 1);
    }
    document.addEventListener('keydown', onKeydown);

    return function destroy() {
      document.removeEventListener('keydown', onKeydown);
    };
  }

  /* Init */
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

  document.addEventListener('shopify:section:unload', function (e) {
    var id = e.target.id;
    if (destroyers[id]) destroyers[id]();
    delete destroyers[id];
  });
})();
