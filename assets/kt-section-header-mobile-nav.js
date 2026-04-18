/**
 * kt-section-header-mobile-nav.js
 *
 * Mobile navigation controller for the header section.
 *
 * Responsibilities:
 *  - Toggle open/close of `.kt-header__mobile-panel` when the hamburger
 *    button `.kt-header__menu-toggle` is clicked, and when the in-panel
 *    close button `.kt-header__mobile-panel-close` is clicked.
 *  - Manage the multi-level panel stack (main → sub → sub-sub) using
 *    data-mobile-forward / data-mobile-back triggers on the panel items.
 *  - Dismiss the panel on Escape.
 *  - Play nicely with the theme editor: re-initialize on
 *    `shopify:section:load`, clean up on `shopify:section:unload`.
 *
 * Per CLAUDE.md: no inline <script>, no build step, vanilla JS only.
 */

(function () {
  'use strict';

  var BOUND_FLAG = '__kitcheroMobileNavBound';

  function openPanel(panel, toggle) {
    if (!panel) return;
    panel.classList.add('kt-header__mobile-panel--open');
    document.body.style.overflow = 'hidden';
    if (toggle) {
      toggle.setAttribute('aria-expanded', 'true');
      var oi = toggle.querySelector('.kt-header__menu-toggle-open');
      var ci = toggle.querySelector('.kt-header__menu-toggle-close');
      if (oi) oi.classList.add('hidden');
      if (ci) ci.classList.remove('hidden');
    }
  }

  function closePanel(panel, toggle) {
    if (!panel) return;
    panel.classList.remove('kt-header__mobile-panel--open');
    document.body.style.overflow = '';
    if (toggle) {
      toggle.setAttribute('aria-expanded', 'false');
      var oi = toggle.querySelector('.kt-header__menu-toggle-open');
      var ci = toggle.querySelector('.kt-header__menu-toggle-close');
      if (oi) oi.classList.remove('hidden');
      if (ci) ci.classList.add('hidden');
    }
  }

  function getElements() {
    return {
      panel: document.querySelector('.kt-header__mobile-panel'),
      toggle: document.querySelector('.kt-header__menu-toggle'),
    };
  }

  // Panel stack state — module-scoped, shared across re-inits.
  var stack = ['main'];

  function updatePanels() {
    var slider = document.querySelector('[data-mobile-slider]');
    if (!slider) return;
    var panels = slider.querySelectorAll('[data-panel]');
    for (var i = 0; i < panels.length; i++) {
      var p = panels[i];
      var id = p.dataset.panel;
      var idx = stack.indexOf(id);
      if (idx === stack.length - 1) {
        p.dataset.state = 'current';
      } else if (idx >= 0) {
        p.dataset.state = 'behind';
      } else {
        p.dataset.state = 'ahead';
      }
    }
  }

  function resetStack() {
    stack = ['main'];
    updatePanels();
  }

  function handleDocumentClick(e) {
    // Open/close toggle (hamburger)
    var toggleTarget = e.target.closest('.kt-header__menu-toggle');
    if (toggleTarget) {
      e.preventDefault();
      var els = getElements();
      if (!els.panel) return;
      var isOpen = els.panel.classList.contains('kt-header__mobile-panel--open');
      if (isOpen) {
        closePanel(els.panel, els.toggle);
        setTimeout(resetStack, 500);
      } else {
        openPanel(els.panel, els.toggle);
      }
      return;
    }

    // Close button inside the panel
    var closeTarget = e.target.closest('.kt-header__mobile-panel-close');
    if (closeTarget) {
      e.preventDefault();
      var els2 = getElements();
      closePanel(els2.panel, els2.toggle);
      setTimeout(resetStack, 500);
      return;
    }

    // Forward nav (into a sub-panel)
    var forward = e.target.closest('[data-mobile-forward]');
    if (forward) {
      e.preventDefault();
      stack.push(forward.dataset.mobileForward);
      updatePanels();
      return;
    }

    // Back nav
    var back = e.target.closest('[data-mobile-back]');
    if (back) {
      e.preventDefault();
      if (stack.length > 1) {
        stack.pop();
        updatePanels();
      }
      return;
    }
  }

  function handleEscape(e) {
    if (e.key !== 'Escape' && e.code !== 'Escape') return;
    var els = getElements();
    if (!els.panel) return;
    if (!els.panel.classList.contains('kt-header__mobile-panel--open')) return;
    closePanel(els.panel, els.toggle);
    setTimeout(resetStack, 500);
  }

  function bind() {
    if (window[BOUND_FLAG]) return;
    window[BOUND_FLAG] = true;
    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleEscape);
  }

  // Initial bind — document-level listeners survive section re-renders,
  // so no unbind/rebind dance is needed. We guard with BOUND_FLAG to
  // prevent double-binding on subsequent section:load events.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }

  // Editor compatibility — reset the panel stack when the header
  // section is re-rendered in the theme editor, so the merchant always
  // sees the main panel after a schema change.
  document.addEventListener('shopify:section:load', function (e) {
    if (!e.target || !e.target.querySelector) return;
    if (e.target.querySelector('.kt-header__menu-toggle') ||
        e.target.classList.contains('kt-header__mobile-panel')) {
      resetStack();
      bind();
    }
  });

  document.addEventListener('shopify:section:unload', function (e) {
    if (!e.target || !e.target.querySelector) return;
    if (e.target.querySelector('.kt-header__menu-toggle') ||
        e.target.classList.contains('kt-header__mobile-panel')) {
      // Restore body overflow if the section unmounts while open.
      document.body.style.overflow = '';
    }
  });
})();
