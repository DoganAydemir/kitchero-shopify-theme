/**
 * Main Collection — sort, sticky bar, GSAP parallax dots + text reveal
 * Birebir from PageHeader.tsx + CollectionsGrid.tsx
 */
(function () {
  'use strict';

  /* WeakMap<section, { onScroll, onKeydown, ctx }> — handles and gsap
     context we attached per section, stored so shopify:section:unload
     can detach them. Without this, every re-render in the editor leaks
     a scroll listener, a keydown listener, and a live ScrollTrigger. */
  var sectionState = new WeakMap();

  function init(container) {
    var section = container.querySelector('[data-section-type="main-collection"]');
    if (!section) return;
    if (section.dataset.mainCollectionBound === 'true') return;
    section.dataset.mainCollectionBound = 'true';

    var state = { onScroll: null, onKeydown: null, ctx: null };
    sectionState.set(section, state);

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
      state.onScroll = onScroll;
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

    /* Mobile filter drawer — open/close + scroll lock.
       Backdrop, close button, and Escape all dismiss; Apply button
       submits the form which navigates to the filtered URL. */
    var drawer = section.querySelector('[data-filter-drawer]');
    var openBtn = section.querySelector('[data-open-filter-drawer]');
    var closeBtns = section.querySelectorAll('[data-close-filter-drawer]');

    function openDrawer() {
      if (!drawer) return;
      drawer.setAttribute('aria-hidden', 'false');
      if (window.Kitchero && Kitchero.scrollLock) {
        Kitchero.scrollLock.lock('collection-section-filter-drawer');
      } else {
        document.body.style.overflow = 'hidden';
      }
      /* Focus the close button so keyboard users can dismiss right away */
      var closer = drawer.querySelector('.kt-filter-drawer__close');
      if (closer && typeof closer.focus === 'function') {
        window.setTimeout(function () { closer.focus(); }, 50);
      }
    }

    function closeDrawer() {
      if (!drawer) return;
      drawer.setAttribute('aria-hidden', 'true');
      if (window.Kitchero && Kitchero.scrollLock) {
        Kitchero.scrollLock.unlock('collection-section-filter-drawer');
      } else {
        document.body.style.overflow = '';
      }
      if (openBtn && typeof openBtn.focus === 'function') openBtn.focus();
    }

    if (openBtn) openBtn.addEventListener('click', openDrawer);
    Array.prototype.forEach.call(closeBtns, function (btn) {
      btn.addEventListener('click', closeDrawer);
    });

    if (drawer) {
      var onKeydown = function (e) {
        if (e.key === 'Escape' && drawer.getAttribute('aria-hidden') === 'false') {
          closeDrawer();
        }
      };
      document.addEventListener('keydown', onKeydown);
      state.onKeydown = onKeydown;
    }

    /* GSAP parallax + reveal animations */
    var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReducedMotion && typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      gsap.registerPlugin(ScrollTrigger);

      var hero = section.querySelector('[data-collection-hero]');
      if (!hero) return;

      state.ctx = gsap.context(function () {
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

  document.addEventListener('shopify:section:unload', function (e) {
    if (!e.target || !e.target.querySelector) return;
    var section = e.target.querySelector('[data-section-type="main-collection"]');
    if (!section) return;
    var state = sectionState.get(section);
    if (!state) return;
    if (state.onScroll) window.removeEventListener('scroll', state.onScroll);
    if (state.onKeydown) document.removeEventListener('keydown', state.onKeydown);
    /* gsap.context().revert() kills every tween and ScrollTrigger the
       context owns — essential, otherwise ScrollTriggers keep firing
       against a detached DOM until GSAP's internal list is flushed. */
    if (state.ctx && typeof state.ctx.revert === 'function') state.ctx.revert();
    /* Re-enable body scroll in case the drawer was open at unload.
       Use scrollLock.unlock so we don't stomp a sibling drawer. */
    if (window.Kitchero && Kitchero.scrollLock) {
      Kitchero.scrollLock.unlock('collection-section-filter-drawer');
    } else if (document.body) {
      document.body.style.overflow = '';
    }
    sectionState.delete(section);
  });
})();
