/**
 * Testimonials — Mouse-follow spotlight reveal effect
 *
 * Matches Testimonials.tsx: radial-gradient mask follows the cursor with a
 * spring-like ease so the spotlight smoothly trails behind the mouse.
 *
 * Framer-motion's `useSpring(stiffness: 100, damping: 30)` is approximated
 * here with a simple lerp factor of ~0.12 per frame running on rAF.
 *
 * IMPORTANT: the mask-image is written inline via JS every frame (not via
 * CSS custom properties). Some browsers fail to parse
 * `radial-gradient(<len> circle at var(--x, 50%) var(--y, 50%), ...)` and
 * silently drop the position clause, so the spotlight never appears. Writing
 * the full gradient string each frame bypasses that CSS-parser quirk.
 *
 * Opacity is still controlled by CSS :hover transition.
 */
(function () {
  'use strict';

  var LERP = 0.12;          // smoothness: lower = laggier, higher = snappier
  var RADIUS = 450;         // spotlight radius in px (matches Testimonials.tsx)

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

    // Initial mask — a zero-radius circle at center, so nothing is revealed
    // before the first mousemove. We can't use `0` because browsers treat
    // a zero-size radial gradient as invalid, so start tiny at 1px.
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

      // Keep animating while hovering OR until we've caught up to the target
      if (isHovering || dx > 0.5 || dy > 0.5) {
        rafId = requestAnimationFrame(animate);
      } else {
        rafId = null;
      }
    }

    function onMove(e) {
      var rect = section.getBoundingClientRect();
      targetX = e.clientX - rect.left;
      targetY = e.clientY - rect.top;

      // On first move inside the section, snap the spotlight to the cursor
      // so it doesn't slide in from (0, 0) on the first hover.
      if (!initialized) {
        currentX = targetX;
        currentY = targetY;
        initialized = true;
      }

      if (!rafId) rafId = requestAnimationFrame(animate);
    }

    function onEnter() {
      isHovering = true;
    }

    function onLeave() {
      isHovering = false;
      initialized = false;
    }

    section.addEventListener('mousemove', onMove);
    section.addEventListener('mouseenter', onEnter);
    section.addEventListener('mouseleave', onLeave);

    return function destroy() {
      section.removeEventListener('mousemove', onMove);
      section.removeEventListener('mouseenter', onEnter);
      section.removeEventListener('mouseleave', onLeave);
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
    if (s) destroyers[s.dataset.sectionId] = initTestimonials(e.target);
  });

  document.addEventListener('shopify:section:unload', function (e) {
    if (destroyers[e.detail.sectionId]) {
      destroyers[e.detail.sectionId]();
      delete destroyers[e.detail.sectionId];
    }
  });
})();
