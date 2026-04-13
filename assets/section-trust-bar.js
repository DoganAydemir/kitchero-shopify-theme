/**
 * Trust Bar — GSAP number counter + line animations
 * Matches TrustBar.tsx exactly.
 */
(function () {
  'use strict';

  function initTrustBar(container) {
    var section = container.querySelector('[data-section-type="trust-bar"]');
    if (!section || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

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

  var ctx;
  document.querySelectorAll('[data-section-type="trust-bar"]').forEach(function (el) {
    ctx = initTrustBar(el.closest('.shopify-section') || el);
  });

  document.addEventListener('shopify:section:load', function (e) {
    if (ctx) ctx.revert();
    ctx = initTrustBar(e.target);
  });

  document.addEventListener('shopify:section:unload', function () {
    if (ctx) ctx.revert();
  });
})();
