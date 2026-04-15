/**
 * Kitchero Header — Section JavaScript
 *
 * Handles:
 * - Mobile panel open/close
 * - Scroll state (transparent → solid background)
 * - Keyboard accessibility (Escape closes panels)
 * - Theme editor re-init on shopify:section:load
 *
 * Works without JS: links are real <a> tags, navigation is usable.
 * JS adds: mobile panel animation, scroll detection, mega menu hover.
 */

(function () {
  'use strict';

  class KitcheroHeader {
    constructor(section) {
      this.section = section;
      // The .kt-header element IS the one with data-section-type="header",
      // so fall back to the section itself when section.querySelector can't
      // find it (happens when `section` is already the header element).
      this.header = section.querySelector('.kt-header') || (section.matches && section.matches('.kt-header') ? section : null);
      if (!this.header) return;

      this.mobileToggle = this.header.querySelector('.kt-header__menu-toggle');
      // The mobile panel is a direct child of <header> but in case theme
      // editor re-renders mangle the DOM, also search globally by its
      // generated id as a fallback.
      this.mobilePanel = this.header.querySelector('.kt-header__mobile-panel')
        || document.querySelector('.kt-header__mobile-panel');
      this.mobileClose = this.header.querySelector('.kt-header__mobile-panel-close');
      this.openIcon = this.header.querySelector('.kt-header__menu-toggle-open');
      this.closeIcon = this.header.querySelector('.kt-header__menu-toggle-close');

      this.isOpen = false;
      this.scrollThreshold = 50;

      this.bindEvents();
      this.handleScroll();
    }

    bindEvents() {
      if (this.mobileToggle) {
        this.mobileToggle.addEventListener('click', this.toggleMobilePanel.bind(this));
      }

      if (this.mobileClose) {
        this.mobileClose.addEventListener('click', this.closeMobilePanel.bind(this));
      }

      this._scrollHandler = this.handleScroll.bind(this);
      window.addEventListener('scroll', this._scrollHandler, { passive: true });

      this._keyHandler = this.handleKeydown.bind(this);
      document.addEventListener('keydown', this._keyHandler);
    }

    toggleMobilePanel() {
      if (this.isOpen) {
        this.closeMobilePanel();
      } else {
        this.openMobilePanel();
      }
    }

    openMobilePanel() {
      if (!this.mobilePanel) return;
      this.isOpen = true;
      this.mobilePanel.classList.add('kt-header__mobile-panel--open');
      this.mobileToggle.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';

      if (this.openIcon) this.openIcon.classList.add('hidden');
      if (this.closeIcon) this.closeIcon.classList.remove('hidden');

      if (typeof trapFocus === 'function') {
        trapFocus(this.mobilePanel, this.mobileClose);
      }
    }

    closeMobilePanel() {
      if (!this.mobilePanel) return;
      this.isOpen = false;
      this.mobilePanel.classList.remove('kt-header__mobile-panel--open');
      this.mobileToggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';

      if (this.openIcon) this.openIcon.classList.remove('hidden');
      if (this.closeIcon) this.closeIcon.classList.add('hidden');

      if (typeof removeTrapFocus === 'function') {
        removeTrapFocus();
      }

      this.mobileToggle.focus();
    }

    handleScroll() {
      if (!this.header) return;
      var scrolled = window.scrollY > this.scrollThreshold;
      var isTransparent = this.header.dataset.headerStyle === 'transparent';

      this.header.classList.toggle('kt-header--scrolled', scrolled);

      /* In transparent mode: remove transparent class when scrolled, restore when back to top */
      if (isTransparent) {
        this.header.classList.toggle('kt-header--transparent', !scrolled);
      }
    }

    handleKeydown(event) {
      if (event.code === 'Escape' && this.isOpen) {
        this.closeMobilePanel();
      }
    }

    destroy() {
      window.removeEventListener('scroll', this._scrollHandler);
      document.removeEventListener('keydown', this._keyHandler);

      if (this.isOpen) {
        this.closeMobilePanel();
      }
    }
  }

  /* Initialize */
  var headerSections = {};

  function initHeader(container) {
    var sectionId = container.dataset.sectionId || container.id;
    if (headerSections[sectionId]) {
      headerSections[sectionId].destroy();
    }
    headerSections[sectionId] = new KitcheroHeader(container);
  }

  function initAll() {
    document.querySelectorAll('[data-section-type="header"]').forEach(function (el) {
      initHeader(el.closest('.shopify-section') || el);
    });
  }

  /* Init on page load — defer scripts run after DOM parse, but in case a
     theme editor re-render or third-party script delays things, also
     re-run on DOMContentLoaded and window load. Idempotent because
     initHeader destroys the prior instance first. */
  initAll();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  }
  window.addEventListener('load', initAll);

  /* Delegated safety-net click handler — if the class-based listener
     never got bound (race condition, DOM mutation, etc.), a click on
     the hamburger still opens the mobile panel. */
  document.addEventListener('click', function (e) {
    var toggle = e.target.closest('.kt-header__menu-toggle');
    if (toggle) {
      var section = toggle.closest('[data-section-type="header"]');
      var wrapper = section && section.closest('.shopify-section');
      var sid = (wrapper || section) && (wrapper || section).dataset && (wrapper || section).dataset.sectionId;
      if (sid && headerSections[sid]) return; // normal handler will take it
      // Fallback: toggle the panel directly
      var panel = document.querySelector('.kt-header__mobile-panel');
      if (panel) {
        var isOpen = panel.classList.toggle('kt-header__mobile-panel--open');
        toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        document.body.style.overflow = isOpen ? 'hidden' : '';
      }
      return;
    }
    var closer = e.target.closest('.kt-header__mobile-panel-close');
    if (closer) {
      var panel2 = document.querySelector('.kt-header__mobile-panel');
      if (panel2) {
        panel2.classList.remove('kt-header__mobile-panel--open');
        document.body.style.overflow = '';
        var t = document.querySelector('.kt-header__menu-toggle');
        if (t) t.setAttribute('aria-expanded', 'false');
      }
    }
  });

  /* Theme editor events */
  document.addEventListener('shopify:section:load', function (event) {
    var header = event.target.querySelector('[data-section-type="header"]');
    if (header) {
      initHeader(event.target);
    }
  });

  document.addEventListener('shopify:section:unload', function (event) {
    var sectionId = event.detail.sectionId;
    if (headerSections[sectionId]) {
      headerSections[sectionId].destroy();
      delete headerSections[sectionId];
    }
  });
})();
