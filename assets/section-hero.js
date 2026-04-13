/**
 * Kitchero Hero — Auto-playing carousel
 * Handles slide transitions, prev/next buttons, auto-play.
 * Re-initializes on shopify:section:load.
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

    if (this.total <= 1) return;

    this.bindEvents();
    this.startAutoplay();
  }

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

    /* Hide current */
    this.slides[this.current].classList.remove('kt-hero__slide--active');
    this.texts[this.current].classList.add('hidden');

    /* Show next */
    this.current = index;
    this.slides[this.current].classList.add('kt-hero__slide--active');
    this.texts[this.current].classList.remove('hidden');
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
  };

  /* Init */
  function initHero(container) {
    var section = container.querySelector('[data-section-type="hero"]');
    if (!section) return;
    var id = section.dataset.sectionId;
    if (heroInstances[id]) heroInstances[id].destroy();

    /* Read autoplay speed from schema setting */
    var speedEl = section.closest('.shopify-section');
    section.dataset.autoplaySpeed = section.querySelector('.kt-hero') ?
      (section.dataset.autoplaySpeed || '8') : '8';

    heroInstances[id] = new KitcheroHero(section);
  }

  document.querySelectorAll('[data-section-type="hero"]').forEach(function (el) {
    initHero(el.closest('.shopify-section') || el);
  });

  document.addEventListener('shopify:section:load', function (event) {
    initHero(event.target);
  });

  document.addEventListener('shopify:section:unload', function (event) {
    var id = event.detail.sectionId;
    if (heroInstances[id]) {
      heroInstances[id].destroy();
      delete heroInstances[id];
    }
  });

  document.addEventListener('shopify:block:select', function (event) {
    var section = event.target.closest('[data-section-type="hero"]');
    if (!section) return;
    var id = section.dataset.sectionId;
    var instance = heroInstances[id];
    if (!instance) return;

    var slideIndex = parseInt(event.target.dataset.slideIndex, 10);
    if (!isNaN(slideIndex)) {
      instance.goTo(slideIndex);
      clearInterval(instance.timer);
    }
  });

  document.addEventListener('shopify:block:deselect', function (event) {
    var section = event.target.closest('[data-section-type="hero"]');
    if (!section) return;
    var id = section.dataset.sectionId;
    var instance = heroInstances[id];
    if (instance) instance.startAutoplay();
  });
})();
