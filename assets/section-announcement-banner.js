/* ==========================================================================
   Announcement Banner — auto-rotate cross-fade
   --------------------------------------------------------------------------
   When the section has 2+ announcement blocks AND auto-rotate is enabled
   AND the visitor has not requested reduced motion, this custom element
   cycles through the slides on the configured interval.

   Pause behaviour: rotation pauses while the user hovers the bar OR while
   focus is inside the bar (keyboard users mid-tab don't lose their target),
   and resumes when both conditions clear.

   Theme editor: re-initialises on shopify:section:load so merchants see
   live changes; brings the selected slide to the front on shopify:block:select
   so the merchant can edit the block they're looking at.
   ========================================================================== */

(function () {
  if (window.customElements.get('announcement-banner')) return;

  var REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia(REDUCED_MOTION_QUERY).matches;
  }

  class AnnouncementBanner extends HTMLElement {
    constructor() {
      super();
      this.handleMouseEnter = this.pause.bind(this);
      this.handleMouseLeave = this.resume.bind(this);
      this.handleFocusIn = this.pause.bind(this);
      this.handleFocusOut = this.handleFocusOut.bind(this);
      this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    }

    connectedCallback() {
      this.slides = Array.from(this.querySelectorAll('.kt-announcement-banner__slide'));
      this.activeIndex = 0;
      this.timer = null;
      this.isPaused = false;
      this.userPaused = false;

      this.blockCount = parseInt(this.getAttribute('data-block-count'), 10) || 0;
      this.shouldRotate = this.getAttribute('data-auto-rotate') === 'true';
      this.rotateSpeed = parseInt(this.getAttribute('data-rotate-speed'), 10) || 5000;
      this.playToggle = this.querySelector('[data-announcement-play-toggle]');

      // Need at least 2 slides AND opted-in rotation AND no reduced-motion
      // request before we start spinning the timer.
      if (this.shouldRotate && this.slides.length > 1 && !prefersReducedMotion()) {
        this.bindEvents();
        this.start();
      }

      // Pause/play toggle — WCAG 2.2.2. User control persists across
      // hover/focus/visibility resumes via userPaused flag.
      if (this.playToggle) {
        var self = this;
        this.playToggle.addEventListener('click', function () {
          self.userPaused = !self.userPaused;
          if (self.userPaused) {
            self.stop();
          } else if (self.shouldRotate && self.slides.length > 1 && !prefersReducedMotion()) {
            self.start();
          }
          self.playToggle.setAttribute('aria-pressed', self.userPaused ? 'false' : 'true');
        });
      }
    }

    disconnectedCallback() {
      this.unbindEvents();
      this.stop();
    }

    bindEvents() {
      this.addEventListener('mouseenter', this.handleMouseEnter);
      this.addEventListener('mouseleave', this.handleMouseLeave);
      this.addEventListener('focusin', this.handleFocusIn);
      this.addEventListener('focusout', this.handleFocusOut);
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }

    unbindEvents() {
      this.removeEventListener('mouseenter', this.handleMouseEnter);
      this.removeEventListener('mouseleave', this.handleMouseLeave);
      this.removeEventListener('focusin', this.handleFocusIn);
      this.removeEventListener('focusout', this.handleFocusOut);
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }

    start() {
      this.stop();
      var self = this;
      this.timer = window.setInterval(function () {
        if (!self.isPaused) self.next();
      }, this.rotateSpeed);
    }

    stop() {
      if (this.timer) {
        window.clearInterval(this.timer);
        this.timer = null;
      }
    }

    pause() {
      this.isPaused = true;
    }

    resume() {
      // Don't auto-resume if user explicitly paused via the toggle.
      if (this.userPaused) return;
      this.isPaused = false;
    }

    handleFocusOut(event) {
      // focusout fires before focus lands on the relatedTarget. If
      // focus is moving to another descendant we keep the bar paused;
      // only resume when focus has truly left the banner.
      if (!this.contains(event.relatedTarget)) {
        this.resume();
      }
    }

    handleVisibilityChange() {
      // Browsers throttle setInterval in background tabs, but Safari in
      // particular can let it pile up; explicitly stop/start when the
      // tab visibility flips, so the bar resumes cleanly when refocused.
      if (document.hidden) {
        this.stop();
      } else if (this.shouldRotate && this.slides.length > 1) {
        this.start();
      }
    }

    next() {
      var nextIndex = (this.activeIndex + 1) % this.slides.length;
      this.goTo(nextIndex);
    }

    goTo(index) {
      if (index === this.activeIndex || !this.slides[index]) return;

      var current = this.slides[this.activeIndex];
      var target = this.slides[index];

      current.classList.remove('kt-announcement-banner__slide--active');
      current.setAttribute('aria-hidden', 'true');

      target.classList.add('kt-announcement-banner__slide--active');
      target.removeAttribute('aria-hidden');

      /* Sync tabindex on inner anchors so inactive slides' links can't
         be reached by keyboard Tab while their slide is aria-hidden.
         WCAG 4.1.2 — focusable elements inside aria-hidden subtrees
         confuse assistive tech. */
      var currentLink = current.querySelector('a');
      var targetLink = target.querySelector('a');
      if (currentLink) currentLink.setAttribute('tabindex', '-1');
      if (targetLink) targetLink.removeAttribute('tabindex');

      this.activeIndex = index;
    }
  }

  window.customElements.define('announcement-banner', AnnouncementBanner);

  // Theme editor — bring the selected block to front so merchants can
  // edit the slide they're looking at, even if it's not the active one
  // mid-rotation.
  document.addEventListener('shopify:block:select', function (event) {
    var bar = event.target.closest('announcement-banner');
    if (!bar) return;
    var slide = event.target.closest('.kt-announcement-banner__slide');
    if (!slide) return;
    var slides = Array.from(bar.querySelectorAll('.kt-announcement-banner__slide'));
    var index = slides.indexOf(slide);
    if (index >= 0 && typeof bar.goTo === 'function') {
      bar.pause();
      bar.goTo(index);
    }
  });

  document.addEventListener('shopify:block:deselect', function (event) {
    var bar = event.target.closest('announcement-banner');
    if (!bar || typeof bar.resume !== 'function') return;
    bar.resume();
  });
})();
