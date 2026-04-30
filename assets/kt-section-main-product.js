/**
 * Main Product (PDP) — title-column entrance animation
 *
 * Mirrors the Next.js source's behaviour (src/app/product/[id]/page.tsx
 * lines 62-68): every `.kt-pdp__anim` element fades up 30px with a
 * 0.1s stagger on first paint, ease power3.out, total ~1s. Without
 * this, the entire info column appears flat/instantaneous on PDP load
 * — the brand identity asks for the editorial reveal that the original
 * Next.js demo shipped.
 *
 * Implementation notes:
 *
 *   • Uses GSAP if loaded (vendor bundle ships it on every page).
 *     Reads the prefers-reduced-motion media query and either runs
 *     the slide-up or skips straight to the resting state. macOS
 *     "Reduce motion" users see the column appear without the
 *     translate (still fades in over 0.4s so there's a soft entry —
 *     pure snap-in feels broken even when motion is reduced).
 *
 *   • No GSAP fallback: the CSS rule `.kt-pdp__anim { opacity: 0 }`
 *     would otherwise leave the column invisible. We unset it in
 *     JS the moment we run, so the column is always visible by
 *     end-of-frame whether GSAP is available or not.
 *
 *   • Theme editor lifecycle: re-runs on shopify:section:load so a
 *     merchant editing the PDP from the theme editor sees the
 *     animation play again on every save (matches the demo
 *     behaviour). Idempotency guard via dataset flag prevents
 *     double-init on the initial page render.
 */

(function () {
  'use strict';

  function showImmediately(els) {
    if (!els || !els.forEach) return;
    els.forEach(function (el) {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
  }

  function initPdpAnim(scope) {
    var root = scope || document;
    var sections = root.querySelectorAll('[data-section-type="main-product"]');
    sections.forEach(function (section) {
      if (section.dataset.kitcheroPdpAnim === 'inited') return;
      section.dataset.kitcheroPdpAnim = 'inited';

      /* Wrapper-based selector matches the CSS rule
         `[data-kt-pdp-anim-group] > *`. The wrapper sits inside the
         info-column sticky container (sections/main-product.liquid),
         so this picks up every direct child the schema renders —
         title, meta, vendor, countdown, price, description,
         variant_picker, buy_buttons, trust_badges, accordions, etc. —
         in DOM order, which is exactly the stagger order we want. */
      var els = section.querySelectorAll('[data-kt-pdp-anim-group] > *');
      if (!els.length) return;

      var reduceMotion = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (window.gsap && !reduceMotion) {
        window.gsap.fromTo(
          els,
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 1, stagger: 0.1, ease: 'power3.out', delay: 0.1 }
        );
      } else if (window.gsap && reduceMotion) {
        /* Soft fade only — no translate. Vestibular-safe. */
        window.gsap.fromTo(
          els,
          { opacity: 0 },
          { opacity: 1, duration: 0.4, stagger: 0.04, ease: 'power1.out' }
        );
      } else {
        /* No GSAP — snap to resting state so the column isn't stuck
           at opacity 0 forever. */
        showImmediately(els);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initPdpAnim(); });
  } else {
    initPdpAnim();
  }

  document.addEventListener('shopify:section:load', function (e) {
    /* Reset the idempotency flag so re-rendered sections get the
       animation fresh (matches editor expectations). */
    var section = e.target.querySelector
      ? e.target.querySelector('[data-section-type="main-product"]')
      : null;
    if (section) delete section.dataset.kitcheroPdpAnim;
    initPdpAnim(e.target);
  });
})();
