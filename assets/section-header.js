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
      this.header = section.querySelector('.kt-header');
      if (!this.header) return;

      this.mobileToggle = this.header.querySelector('.kt-header__menu-toggle');
      this.mobilePanel = this.header.querySelector('.kt-header__mobile-panel');
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
      this.header.classList.toggle('kt-header--scrolled', scrolled);
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

  /* Init on page load */
  document.querySelectorAll('[data-section-type="header"]').forEach(function (el) {
    initHeader(el.closest('.shopify-section') || el);
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
