(function () {
  'use strict';

  if (window.Shopify && window.Shopify.designMode) return;
  function initTrustBar(container) {
    var section = container.querySelector('[data-section-type="trust-bar"]');
    if (!section) return;

    var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
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
