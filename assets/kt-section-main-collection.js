(function () {
  'use strict';

  var IN_THEME_EDITOR = !!(window.Shopify && window.Shopify.designMode);

  var sectionState = new WeakMap();

  function init(container) {
    var section = container.querySelector('[data-section-type="main-collection"]');
    if (!section) return;
    if (section.dataset.mainCollectionBound === 'true') return;
    section.dataset.mainCollectionBound = 'true';

    var state = { onScroll: null, onKeydown: null, onDocPointerDown: null, ctx: null };
    sectionState.set(section, state);

    var sortSelect = section.querySelector('[data-collection-sort]');
    if (sortSelect) {
      sortSelect.addEventListener('change', function () {
        var url = new URL(window.location.href);
        url.searchParams.set('sort_by', this.value);

        url.searchParams.delete('page');
        window.location.href = url.toString();
      });
    }

    var controls = section.querySelector('[data-collection-controls]');
    if (controls) {
      var onScroll = function () {
        var top = controls.getBoundingClientRect().top;
        controls.classList.toggle('kt-collection__controls--scrolled', top <= 1);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      state.onScroll = onScroll;
    }

    var grid = section.querySelector('[data-product-grid]');
    section.querySelectorAll('[data-grid-cols]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var cols = btn.dataset.gridCols;
        if (!grid) return;

        grid.classList.remove(
          'kt-collection__grid--cols-2',
          'kt-collection__grid--cols-3',
          'kt-collection__grid--cols-4'
        );

        if (cols === '2' || cols === '3' || cols === '4') {
          grid.classList.add('kt-collection__grid--cols-' + cols);
        }

        section.querySelectorAll('[data-grid-cols]').forEach(function (b) {
          b.classList.remove('kt-collection__grid-btn--active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('kt-collection__grid-btn--active');
        btn.setAttribute('aria-pressed', 'true');
      });
    });

    var dropdowns = Array.prototype.slice.call(section.querySelectorAll('[data-filter-dropdown]'));
    if (dropdowns.length) {
      var lastPointer = 'mouse';
      var timers = new WeakMap();

      var clearTimer = function (dd) {
        var t = timers.get(dd);
        if (t) {
          window.clearTimeout(t);
          timers.delete(dd);
        }
      };

      var setOpen = function (dd, open) {
        clearTimer(dd);
        var trigger = dd.querySelector('.kt-filter-bar__trigger');
        if (!open && trigger && dd.contains(document.activeElement) && document.activeElement !== trigger) {
          // The panel is about to be hidden: keep focus on its trigger
          // instead of losing it to the page.
          trigger.focus({ preventScroll: true });
        }
        dd.classList.toggle('is-open', open);
        if (trigger) trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
      };

      var closeOthers = function (except) {
        dropdowns.forEach(function (d) {
          if (d !== except && (d.classList.contains('is-open') || timers.has(d))) setOpen(d, false);
        });
      };

      dropdowns.forEach(function (dd) {
        var trigger = dd.querySelector('.kt-filter-bar__trigger');

        dd.addEventListener('pointerenter', function (e) {
          lastPointer = e.pointerType || 'mouse';
          if (e.pointerType === 'touch') return;
          clearTimer(dd);
          if (dd.classList.contains('is-open')) return;
          timers.set(dd, window.setTimeout(function () {
            timers.delete(dd);
            closeOthers(dd);
            setOpen(dd, true);
          }, 90));
        });

        dd.addEventListener('pointerleave', function (e) {
          if (e.pointerType === 'touch') return;
          clearTimer(dd);
          if (!dd.classList.contains('is-open')) return;
          timers.set(dd, window.setTimeout(function () {
            timers.delete(dd);
            setOpen(dd, false);
          }, 120));
        });

        dd.addEventListener('pointerdown', function (e) {
          lastPointer = e.pointerType || 'mouse';
        });

        if (trigger) {
          trigger.addEventListener('click', function (e) {
            var fromKeyboard = e.detail === 0;
            if (!fromKeyboard && lastPointer !== 'touch') {
              closeOthers(dd);
              setOpen(dd, true);
              return;
            }
            var willOpen = !dd.classList.contains('is-open');
            closeOthers(dd);
            setOpen(dd, willOpen);
          });
        }

        dd.addEventListener('keydown', function (e) {
          if ((e.key !== 'Escape' && e.key !== 'Esc') || !dd.classList.contains('is-open')) return;
          e.stopPropagation();
          setOpen(dd, false);
          if (trigger) trigger.focus();
        });

        dd.addEventListener('focusout', function (e) {
          if (!dd.classList.contains('is-open')) return;
          var next = e.relatedTarget;
          if (next && dd.contains(next)) return;
          if (lastPointer !== 'touch' && dd.matches(':hover')) return;
          setOpen(dd, false);
        });
      });

      var onDocPointerDown = function (e) {
        if (e.target && e.target.closest && e.target.closest('[data-filter-dropdown]')) return;
        closeOthers(null);
      };
      document.addEventListener('pointerdown', onDocPointerDown);
      state.onDocPointerDown = onDocPointerDown;
    }

    var drawer = section.querySelector('[data-filter-drawer]');
    var openBtn = section.querySelector('[data-open-filter-drawer]');
    var closeBtns = section.querySelectorAll('[data-close-filter-drawer]');

    function openDrawer() {
      if (!drawer) return;
      drawer.setAttribute('aria-hidden', 'false');

      drawer.removeAttribute('inert');
      if (window.Kitchero && Kitchero.scrollLock) {
        Kitchero.scrollLock.lock('collection-section-filter-drawer');
      } else {
        document.body.style.overflow = 'hidden';
      }

      var closer = drawer.querySelector('.kt-filter-drawer__close');
      if (closer && typeof closer.focus === 'function') {
        window.setTimeout(function () { closer.focus(); }, 50);
      }
    }

    function closeDrawer() {
      if (!drawer) return;
      drawer.setAttribute('aria-hidden', 'true');

      drawer.setAttribute('inert', '');
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

    var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    (window.ktWhenMotion || function (cb) { cb(); })(function () {
      if (!IN_THEME_EDITOR && !prefersReducedMotion && typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);

        var hero = section.querySelector('[data-collection-hero]');
        if (!hero) return;

        state.ctx = gsap.context(function () {
          gsap.fromTo(
            '.kt-collection__label, .kt-collection__title, .kt-collection__desc, .kt-collection__count',
            { y: 50, opacity: 0 },
            { y: 0, opacity: 1, duration: 1, stagger: 0.1, ease: 'power4.out' }
          );

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
    });
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
    if (state.onDocPointerDown) document.removeEventListener('pointerdown', state.onDocPointerDown);

    if (state.ctx && typeof state.ctx.revert === 'function') state.ctx.revert();

    if (window.Kitchero && Kitchero.scrollLock) {
      Kitchero.scrollLock.unlock('collection-section-filter-drawer');
    } else if (document.body) {
      document.body.style.overflow = '';
    }
    sectionState.delete(section);
  });
})();
