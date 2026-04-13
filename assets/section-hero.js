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
    this.current = 0;
    this.total = this.slides.length;
    this.autoplaySpeed = parseInt(section.dataset.autoplaySpeed || '8', 10) * 1000;
    this.timer = null;
    this.gsapCtx = null;

    if (this.total > 0) {
      this.bindEvents();
      this.animateText(0);
      if (this.total > 1) this.startAutoplay();
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
  };

  KitcheroHero.prototype.goTo = function (index) {
    if (index === this.current) return;

    this.slides[this.current].classList.remove('kt-hero__slide--active');
    this.texts[this.current].classList.add('hidden');

    this.current = index;
    this.slides[this.current].classList.add('kt-hero__slide--active');
    this.texts[this.current].classList.remove('hidden');

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
    this.startAutoplay();
  };

  KitcheroHero.prototype.destroy = function () {
    clearInterval(this.timer);
    if (this.gsapCtx) this.gsapCtx.revert();
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
    if (instance && instance.total > 1) instance.startAutoplay();
  });
})();
