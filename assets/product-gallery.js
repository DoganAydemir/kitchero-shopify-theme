/**
 * Product Gallery — thumbnail switching + fullscreen lightbox
 * Birebir from product/[id]/page.tsx gallery behavior.
 * Re-inits on shopify:section:load.
 */
(function () {
  'use strict';

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

    /* Collect image URLs for lightbox */
    slides.forEach(function (slide) {
      var img = slide.querySelector('img');
      if (img) imageUrls.push(img.src);
    });

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
        lightboxImage.src = imageUrls[index] || '';
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
      lightboxImage.src = imageUrls[currentIndex] || '';
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      if (typeof trapFocus === 'function') trapFocus(lightbox);
    }

    /* Lightbox close */
    function closeLightbox() {
      if (!lightbox) return;
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (lightboxViewport) lightboxViewport.classList.remove('kt-lightbox__viewport--zoomed');
      if (typeof removeTrapFocus === 'function') removeTrapFocus();
    }

    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    if (lightboxPrev) lightboxPrev.addEventListener('click', function () { goTo(currentIndex - 1); });
    if (lightboxNext) lightboxNext.addEventListener('click', function () { goTo(currentIndex + 1); });

    /* Lightbox zoom toggle */
    if (lightboxViewport) {
      lightboxViewport.addEventListener('click', function (e) {
        if (e.target === lightboxViewport || e.target === lightboxImage) {
          lightboxViewport.classList.toggle('kt-lightbox__viewport--zoomed');
        }
      });
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
