(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var LERP = prefersReducedMotion ? 1 : 0.12;
  var RADIUS = 450;

  function maskString(x, y) {
    return (
      'radial-gradient(circle ' + RADIUS + 'px at ' +
      x + 'px ' + y + 'px, black 0%, transparent 100%)'
    );
  }

  function initTestimonials(container) {
    var section = container.querySelector('[data-section-type="testimonials"]');
    if (!section) return;

    var spotlight = section.querySelector('[data-testimonials-spotlight]');
    if (!spotlight) return;

    var currentX = 0;
    var currentY = 0;
    var targetX = 0;
    var targetY = 0;
    var rafId = null;
    var isHovering = false;
    var initialized = false;

    spotlight.style.webkitMaskImage =
      'radial-gradient(circle 1px at 50% 50%, black 0%, transparent 100%)';
    spotlight.style.maskImage =
      'radial-gradient(circle 1px at 50% 50%, black 0%, transparent 100%)';

    function animate() {
      currentX += (targetX - currentX) * LERP;
      currentY += (targetY - currentY) * LERP;

      var mask = maskString(currentX, currentY);
      spotlight.style.webkitMaskImage = mask;
      spotlight.style.maskImage = mask;

      var dx = Math.abs(targetX - currentX);
      var dy = Math.abs(targetY - currentY);

      if (isHovering || dx > 0.5 || dy > 0.5) {
        rafId = requestAnimationFrame(animate);
      } else {
        rafId = null;
      }
    }

    var cachedRect = null;
    function refreshRect() {
      cachedRect = section.getBoundingClientRect();
    }
    function invalidateRect() {
      cachedRect = null;
    }

    function onMove(e) {
      if (!cachedRect) refreshRect();
      targetX = e.clientX - cachedRect.left;
      targetY = e.clientY - cachedRect.top;

      if (!initialized) {
        currentX = targetX;
        currentY = targetY;
        initialized = true;
      }

      if (!rafId) rafId = requestAnimationFrame(animate);
    }

    function onEnter() {
      isHovering = true;
      refreshRect();
    }

    function onLeave() {
      isHovering = false;
      initialized = false;
      cachedRect = null;
    }

    section.addEventListener('mousemove', onMove);
    section.addEventListener('mouseenter', onEnter);
    section.addEventListener('mouseleave', onLeave);
    window.addEventListener('scroll', invalidateRect, { passive: true });
    window.addEventListener('resize', invalidateRect, { passive: true });

    return function destroy() {
      section.removeEventListener('mousemove', onMove);
      section.removeEventListener('mouseenter', onEnter);
      section.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('scroll', invalidateRect);
      window.removeEventListener('resize', invalidateRect);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }

  var destroyers = {};

  document.querySelectorAll('[data-section-type="testimonials"]').forEach(function (el) {
    var wrapper = el.closest('.shopify-section') || el;
    destroyers[el.dataset.sectionId] = initTestimonials(wrapper);
  });

  document.addEventListener('shopify:section:load', function (e) {
    var s = e.target.querySelector('[data-section-type="testimonials"]');
    if (!s) return;

    var sid = s.dataset.sectionId;
    if (destroyers[sid]) {
      destroyers[sid]();
      delete destroyers[sid];
    }
    destroyers[sid] = initTestimonials(e.target);
  });

  document.addEventListener('shopify:section:unload', function (e) {
    if (destroyers[e.detail.sectionId]) {
      destroyers[e.detail.sectionId]();
      delete destroyers[e.detail.sectionId];
    }
  });

  document.addEventListener('shopify:block:select', function (e) {
    var card = e.target;
    if (!card || !card.classList || !card.classList.contains('kt-testimonials__card')) return;

    card.classList.add('kt-testimonials__card--editor-selected');
    window.setTimeout(function () {
      card.classList.remove('kt-testimonials__card--editor-selected');
    }, 1500);
  });
})();
