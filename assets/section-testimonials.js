/**
 * Testimonials — Mouse-follow spotlight reveal effect
 * Matches Testimonials.tsx: radial gradient mask follows cursor.
 */
(function () {
  'use strict';

  function initTestimonials(container) {
    var section = container.querySelector('[data-section-type="testimonials"]');
    if (!section) return;

    var spotlight = section.querySelector('[data-testimonials-spotlight]');
    if (!spotlight) return;

    var rect;

    function onMove(e) {
      if (!rect) rect = section.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      spotlight.style.setProperty('--spotlight-x', x + 'px');
      spotlight.style.setProperty('--spotlight-y', y + 'px');
      spotlight.style.opacity = '1';
    }

    function onLeave() {
      spotlight.style.opacity = '0';
    }

    function onEnter() {
      rect = section.getBoundingClientRect();
    }

    section.addEventListener('mousemove', onMove);
    section.addEventListener('mouseleave', onLeave);
    section.addEventListener('mouseenter', onEnter);

    return function destroy() {
      section.removeEventListener('mousemove', onMove);
      section.removeEventListener('mouseleave', onLeave);
      section.removeEventListener('mouseenter', onEnter);
    };
  }

  var destroyers = {};
  document.querySelectorAll('[data-section-type="testimonials"]').forEach(function (el) {
    destroyers[el.dataset.sectionId] = initTestimonials(el.closest('.shopify-section') || el);
  });

  document.addEventListener('shopify:section:load', function (e) {
    var s = e.target.querySelector('[data-section-type="testimonials"]');
    if (s) destroyers[s.dataset.sectionId] = initTestimonials(e.target);
  });

  document.addEventListener('shopify:section:unload', function (e) {
    if (destroyers[e.detail.sectionId]) destroyers[e.detail.sectionId]();
  });
})();
