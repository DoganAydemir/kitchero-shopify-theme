/**
 * Trust Bar — GSAP number counter + line animations
 * Matches TrustBar.tsx exactly.
 */
(function () {
  'use strict';

  function initTrustBar(container) {
    var section = container.querySelector('[data-section-type="trust-bar"]');
    if (!section) return;

    var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      /* Set final numbers directly without counting up */
      var staticNumbers = section.querySelectorAll('.kt-trust-bar__number');
      staticNumbers.forEach(function (num) {
        var val = parseInt(num.dataset.countTo, 10);
        if (!isNaN(val)) num.textContent = val;
      });
      return;
    }

    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    gsap.registerPlugin(ScrollTrigger);

    var ctx = gsap.context(function () {
      /* Counter animations */
      var numbers = gsap.utils.toArray('.kt-trust-bar__number', section);
      numbers.forEach(function (num, i) {
        var val = parseInt(num.dataset.countTo, 10);
        if (isNaN(val)) return;

        var obj = { val: 0 };
        gsap.to(obj, {
          val: val,
          duration: 2,
          delay: i * 0.2,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 80%',
            once: true
          },
          onUpdate: function () {
            num.textContent = Math.round(obj.val);
          }
        });
      });

      /* Line scale animations */
      gsap.from('.kt-trust-bar__line', {
        scaleY: 0,
        transformOrigin: 'top',
        duration: 2,
        stagger: 0.3,
        ease: 'power3.inOut',
        scrollTrigger: {
          trigger: section,
          start: 'top 70%',
          once: true
        }
      });
    }, section);

    return ctx;
  }

  /* Per-section ctx store. The previous implementation used a single
     module-scoped `ctx` — so when two trust-bar sections existed on
     the same page (e.g. merchant drops one above the fold + one in
     the footer group), the second initTrustBar() clobbered the first
     ctx reference, and on section:unload of EITHER the first's
     GSAP timelines got reverted (not the second's). Keyed by
     section id so each instance owns its own ctx lifecycle. */
  var ctxBySection = Object.create(null);

  function sectionIdOf(node) {
    var wrapper = node.closest ? (node.closest('.shopify-section') || node) : node;
    return (wrapper && wrapper.id) || null;
  }

  document.querySelectorAll('[data-section-type="trust-bar"]').forEach(function (el) {
    var wrapper = el.closest('.shopify-section') || el;
    var id = wrapper.id;
    if (id) ctxBySection[id] = initTrustBar(wrapper);
  });

  document.addEventListener('shopify:section:load', function (e) {
    var id = sectionIdOf(e.target);
    if (id && ctxBySection[id]) ctxBySection[id].revert();
    if (id) ctxBySection[id] = initTrustBar(e.target);
  });

  document.addEventListener('shopify:section:unload', function (e) {
    var id = sectionIdOf(e.target);
    if (id && ctxBySection[id]) {
      ctxBySection[id].revert();
      delete ctxBySection[id];
    }
  });
})();
