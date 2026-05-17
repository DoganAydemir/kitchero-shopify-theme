/**
 * Kitchero Hero — Carousel with text entrance animations
 * Matches Hero.tsx: staggered slide-up text, opacity fade on images.
 */
(function () {
  'use strict';

  var heroInstances = {};

  function KitcheroHero(section) {
    this.section = section;
    this.slides = section.querySelectorAll('[data-slide-index]');
    this.texts = section.querySelectorAll('[data-slide-text]');
    this.prevBtn = section.querySelector('[data-hero-prev]');
    this.nextBtn = section.querySelector('[data-hero-next]');
    this.playToggle = section.querySelector('[data-hero-play-toggle]');
    this.current = 0;
    this.total = this.slides.length;
    this.autoplaySpeed = parseInt(section.dataset.autoplaySpeed || '8', 10) * 1000;
    this.timer = null;
    this.userPaused = false;
    this.gsapCtx = null;

    this.prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (this.total > 0) {
      this.bindEvents();
      this.animateText(0);
      /* R87 — pause autoplay in theme editor (Shopify.designMode)
         so the merchant editing slide N doesn't get yanked to slide
         N+1 every autoplaySpeed seconds. block:select still drives
         slide navigation via the existing handler. Real storefront
         path keeps autoplay. */
      var inEditor = window.Shopify && window.Shopify.designMode;
      if (this.total > 1 && !this.prefersReducedMotion && this.autoplaySpeed > 0 && !inEditor) this.startAutoplay();
      this.initGSAP();
    }
  }

  KitcheroHero.prototype.animateText = function (index) {
    /* Reset all text panels */
    this.texts.forEach(function (panel) {
      var anims = panel.querySelectorAll('[data-hero-anim]');
      anims.forEach(function (el) {
        el.classList.remove('kt-hero__anim--visible');
        el.classList.remove('kt-hero__anim-slide--visible');
      });
    });

    /* Animate active panel's elements with staggered delays */
    var activePanel = this.texts[index];
    if (!activePanel) return;

    var anims = activePanel.querySelectorAll('[data-hero-anim]');
    anims.forEach(function (el) {
      var delay = parseInt(el.dataset.delay || '0', 10);
      setTimeout(function () {
        el.classList.add('kt-hero__anim--visible');
        el.classList.add('kt-hero__anim-slide--visible');
      }, delay);
    });
  };

  KitcheroHero.prototype.initGSAP = function () {
    if (this.prefersReducedMotion) return;
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);
    var section = this.section;

    this.gsapCtx = gsap.context(function () {
      gsap.utils.toArray('.kt-hero__slide-image-wrap', section).forEach(function (wrap) {
        gsap.to(wrap, {
          yPercent: 15,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: 'bottom top',
            scrub: true
          }
        });
      });
    }, section);
  };

  KitcheroHero.prototype.bindEvents = function () {
    var self = this;
    if (this.prevBtn) {
      this.prevBtn.addEventListener('click', function () {
        self.goTo((self.current - 1 + self.total) % self.total);
        self.resetAutoplay();
      });
    }
    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', function () {
        self.goTo((self.current + 1) % self.total);
        self.resetAutoplay();
      });
    }

    /* WCAG 2.2.2 Pause, Stop, Hide — any content that auto-updates
       needs a way to pause. Pointer hover and keyboard focus both
       pause autoplay; leaving the section resumes. Previously the
       slideshow advanced every N seconds regardless, which made
       Tab-ing through a slide's link a game of whack-a-mole. */
    this._pauseAutoplay = function () {
      if (self.timer) {
        clearInterval(self.timer);
        self.timer = null;
      }
    };
    this._resumeAutoplay = function () {
      /* Only resume if a resume is still desirable: >1 slide, not
         reduced-motion, merchant set autoplay, AND user hasn't
         explicitly paused via the play toggle. Mirrors resetAutoplay's
         guards. */
      if (self.userPaused) return;
      if (self.total > 1 && !self.prefersReducedMotion && self.autoplaySpeed > 0 && !self.timer) {
        self.startAutoplay();
      }
    };

    /* Pause/play toggle — WCAG 2.2.2. User-controlled, persists.
       aria-pressed="true" = autoplay running, "false" = paused. */
    if (this.playToggle) {
      this.playToggle.addEventListener('click', function () {
        self.userPaused = !self.userPaused;
        if (self.userPaused) {
          self._pauseAutoplay();
        } else {
          self._resumeAutoplay();
        }
        self.playToggle.setAttribute('aria-pressed', self.userPaused ? 'false' : 'true');
      });
    }
    this.section.addEventListener('mouseenter', this._pauseAutoplay);
    this.section.addEventListener('mouseleave', this._resumeAutoplay);
    this.section.addEventListener('focusin', this._pauseAutoplay);
    this.section.addEventListener('focusout', this._resumeAutoplay);

    /* Touch swipe on mobile — without this, users on phones can
       only navigate via the prev/next pill buttons (small touch
       target, off the natural reading flow). 50px horizontal
       threshold matches Shopify's reference implementations and
       feels intentional vs. accidental. Vertical-bias guard
       prevents the swipe from hijacking page scroll: if dY > dX
       the gesture is treated as a scroll, not a swipe. Pause
       autoplay during touch so a user mid-read isn't yanked to
       the next slide while their finger is on the screen. */
    var touchStartX = 0, touchStartY = 0, touchMoved = false;
    var SWIPE_THRESHOLD = 50;
    this.section.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchMoved = false;
      self._pauseAutoplay();
    }, { passive: true });
    this.section.addEventListener('touchmove', function () {
      touchMoved = true;
    }, { passive: true });
    this.section.addEventListener('touchend', function (e) {
      if (!touchMoved || !e.changedTouches[0]) {
        self._resumeAutoplay();
        return;
      }
      var dx = e.changedTouches[0].clientX - touchStartX;
      var dy = e.changedTouches[0].clientY - touchStartY;
      if (Math.abs(dx) >= SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) {
          self.goTo((self.current + 1) % self.total);
        } else {
          self.goTo((self.current - 1 + self.total) % self.total);
        }
        self.resetAutoplay();
      } else {
        self._resumeAutoplay();
      }
    }, { passive: true });
  };

  KitcheroHero.prototype.goTo = function (index) {
    if (index === this.current) return;

    this.slides[this.current].classList.remove('kt-hero__slide--active');
    this.texts[this.current].classList.add('hidden');
    // R295 — Swap the heading's `aria-hidden` on rotation so the
    // active slide's <p role="heading"> announces to screen readers
    // and the inactive slides skip the accessibility tree. The
    // first slide carries a real <h1> with no role attribute and is
    // never marked aria-hidden; non-first slides carry
    // `<p role="heading" aria-level="2" aria-hidden="true">`. Only
    // toggle the attribute on the role=heading elements (skip if
    // the active slide's heading is the literal <h1>).
    var prevHeading = this.texts[this.current].querySelector('[role="heading"]');
    if (prevHeading) prevHeading.setAttribute('aria-hidden', 'true');

    this.current = index;
    this.slides[this.current].classList.add('kt-hero__slide--active');
    this.texts[this.current].classList.remove('hidden');
    var nextHeading = this.texts[this.current].querySelector('[role="heading"]');
    if (nextHeading) nextHeading.removeAttribute('aria-hidden');

    this.animateText(index);
  };

  KitcheroHero.prototype.startAutoplay = function () {
    var self = this;
    this.timer = setInterval(function () {
      self.goTo((self.current + 1) % self.total);
    }, this.autoplaySpeed);
  };

  KitcheroHero.prototype.resetAutoplay = function () {
    clearInterval(this.timer);
    if (this.userPaused) return;
    if (this.prefersReducedMotion || this.autoplaySpeed <= 0) return;
    this.startAutoplay();
  };

  KitcheroHero.prototype.destroy = function () {
    clearInterval(this.timer);
    if (this.gsapCtx) this.gsapCtx.revert();
    /* Release the WCAG pause-on-hover/focus listeners so a later
       editor re-mount of this section doesn't stack duplicate
       handlers — each instance binds its own closure. */
    if (this._pauseAutoplay && this.section) {
      this.section.removeEventListener('mouseenter', this._pauseAutoplay);
      this.section.removeEventListener('focusin', this._pauseAutoplay);
    }
    if (this._resumeAutoplay && this.section) {
      this.section.removeEventListener('mouseleave', this._resumeAutoplay);
      this.section.removeEventListener('focusout', this._resumeAutoplay);
    }
  };

  function initHero(container) {
    var section = container.querySelector('[data-section-type="hero"]');
    if (!section) return;
    var id = section.dataset.sectionId;
    if (heroInstances[id]) heroInstances[id].destroy();
    heroInstances[id] = new KitcheroHero(section);
  }

  document.querySelectorAll('[data-section-type="hero"]').forEach(function (el) {
    initHero(el.closest('.shopify-section') || el);
  });

  document.addEventListener('shopify:section:load', function (e) { initHero(e.target); });
  document.addEventListener('shopify:section:unload', function (e) {
    var id = e.detail.sectionId;
    if (heroInstances[id]) { heroInstances[id].destroy(); delete heroInstances[id]; }
  });
  document.addEventListener('shopify:block:select', function (e) {
    var section = e.target.closest('[data-section-type="hero"]');
    if (!section) return;
    var instance = heroInstances[section.dataset.sectionId];
    if (!instance) return;
    var idx = parseInt(e.target.dataset.slideIndex, 10);
    if (!isNaN(idx)) { instance.goTo(idx); clearInterval(instance.timer); }
  });
  document.addEventListener('shopify:block:deselect', function (e) {
    var section = e.target.closest('[data-section-type="hero"]');
    if (!section) return;
    var instance = heroInstances[section.dataset.sectionId];
    if (instance && instance.total > 1 && !instance.prefersReducedMotion && instance.autoplaySpeed > 0) instance.startAutoplay();
  });
})();
