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

      var inEditor = window.Shopify && window.Shopify.designMode;
      if (this.total > 1 && !this.prefersReducedMotion && this.autoplaySpeed > 0 && !inEditor) this.startAutoplay();
      this.initGSAP();
    }
  }

  KitcheroHero.prototype.animateText = function (index) {
    this.texts.forEach(function (panel) {
      var anims = panel.querySelectorAll('[data-hero-anim]');
      anims.forEach(function (el) {
        el.classList.remove('kt-hero__anim--visible');
        el.classList.remove('kt-hero__anim-slide--visible');
      });
    });

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

    this._pauseAutoplay = function () {
      if (self.timer) {
        clearInterval(self.timer);
        self.timer = null;
      }
    };
    this._resumeAutoplay = function () {
      if (self.userPaused) return;
      if (self.total > 1 && !self.prefersReducedMotion && self.autoplaySpeed > 0 && !self.timer) {
        self.startAutoplay();
      }
    };

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

    this.section.addEventListener('touchcancel', function () {
      touchMoved = false;
      self._resumeAutoplay();
    }, { passive: true });
  };

  KitcheroHero.prototype.goTo = function (index) {
    if (index === this.current) return;

    this.slides[this.current].classList.remove('kt-hero__slide--active');
    this.texts[this.current].classList.add('hidden');

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
