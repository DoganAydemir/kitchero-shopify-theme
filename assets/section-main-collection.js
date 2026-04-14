/**
 * Main Collection — sort, sticky bar, GSAP parallax dots + text reveal
 * Birebir from PageHeader.tsx + CollectionsGrid.tsx
 */
(function () {
  'use strict';

  function init(container) {
    var section = container.querySelector('[data-section-type="main-collection"]');
    if (!section) return;

    /* Sort select → navigate to sorted URL */
    var sortSelect = section.querySelector('[data-collection-sort]');
    if (sortSelect) {
      sortSelect.addEventListener('change', function () {
        var url = new URL(window.location.href);
        url.searchParams.set('sort_by', this.value);
        window.location.href = url.toString();
      });
    }

    /* Sticky bar scroll state */
    var controls = section.querySelector('[data-collection-controls]');
    if (controls) {
      var onScroll = function () {
        var top = controls.getBoundingClientRect().top;
        controls.classList.toggle('kt-collection__controls--scrolled', top <= 1);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
    }

    /* Grid column toggle — uses CSS classes, not inline styles */
    var grid = section.querySelector('#product-grid');
    section.querySelectorAll('[data-grid-cols]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var cols = btn.dataset.gridCols;
        if (!grid) return;

        /* Remove all col classes */
        grid.classList.remove('kt-collection__grid--cols-3', 'kt-collection__grid--cols-4');

        /* Add class only for 3 or 4 (2 is default from CSS) */
        if (cols === '3') grid.classList.add('kt-collection__grid--cols-3');
        if (cols === '4') grid.classList.add('kt-collection__grid--cols-4');

        /* Active state on buttons */
        section.querySelectorAll('[data-grid-cols]').forEach(function (b) {
          b.classList.remove('kt-collection__grid-btn--active');
        });
        btn.classList.add('kt-collection__grid-btn--active');
      });
    });

    /* GSAP parallax + reveal animations */
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      gsap.registerPlugin(ScrollTrigger);

      var hero = section.querySelector('[data-collection-hero]');
      if (!hero) return;

      gsap.context(function () {
        /* Text reveal animation */
        gsap.fromTo(
          '.kt-collection__label, .kt-collection__title, .kt-collection__desc, .kt-collection__count',
          { y: 50, opacity: 0 },
          { y: 0, opacity: 1, duration: 1, stagger: 0.1, ease: 'power4.out' }
        );

        /* Parallax dots (Layer 2) — y: 20% on scroll */
        var dots = section.querySelector('[data-parallax-dots]');
        if (dots) {
          gsap.to(dots, {
            y: '20%',
            ease: 'none',
            scrollTrigger: {
              trigger: hero,
              start: 'top top',
              end: 'bottom top',
              scrub: true
            }
          });
        }

        /* Parallax markers (Layer 4) — y: 35% on scroll */
        var markers = section.querySelector('[data-parallax-markers]');
        if (markers) {
          gsap.to(markers, {
            y: '35%',
            ease: 'none',
            scrollTrigger: {
              trigger: hero,
              start: 'top top',
              end: 'bottom top',
              scrub: true
            }
          });
        }

        /* Product card entrance */
        var cards = section.querySelectorAll('.kt-card-product');
        if (cards.length > 0) {
          gsap.fromTo(cards,
            { opacity: 0, y: 50 },
            {
              opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out',
              scrollTrigger: { trigger: cards[0], start: 'top 85%', once: true }
            }
          );
        }
      }, section);
    }
  }

  document.querySelectorAll('[data-section-type="main-collection"]').forEach(function (el) {
    init(el.closest('.shopify-section') || el);
  });

  document.addEventListener('shopify:section:load', function (e) {
    init(e.target);
  });
})();
