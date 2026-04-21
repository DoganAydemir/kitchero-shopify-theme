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

  /* Track the trigger element that opened the panel so we can return
     focus there on close. Without this, closing the drawer leaves the
     user's focus on <body> and the next Tab jumps to the first
     focusable element on the page — disorienting for keyboard-only
     and screen-reader users. */
  var lastTrigger = null;

  function openPanel(panel, toggle) {
    if (!panel) return;
    lastTrigger = toggle || document.activeElement;
    panel.classList.add('kt-header__mobile-panel--open');
    panel.removeAttribute('inert');
    document.body.style.overflow = 'hidden';
    if (toggle) {
      toggle.setAttribute('aria-expanded', 'true');
      var oi = toggle.querySelector('.kt-header__menu-toggle-open');
      var ci = toggle.querySelector('.kt-header__menu-toggle-close');
      if (oi) oi.classList.add('hidden');
      if (ci) ci.classList.remove('hidden');
    }

    /* Focus trap — shared utility on window.Kitchero from global.js.
       Keeps Tab/Shift+Tab cycling inside the open drawer so keyboard
       users can't accidentally reach page content hidden behind the
       overlay. Matches the pattern used by cart-drawer,
       appointment-drawer, search-overlay, video-modal. */
    if (window.Kitchero && window.Kitchero.focusTrap && typeof window.Kitchero.focusTrap.enable === 'function') {
      window.Kitchero.focusTrap.enable(panel);
    }

    /* Move focus into the drawer so screen readers announce the new
       context (the close button is a safe, recognizable first focus
       target inside the drawer). */
    var focusTarget = panel.querySelector('.kt-header__mobile-panel-close') ||
                      panel.querySelector('a, button, [tabindex]:not([tabindex="-1"])');
    if (focusTarget) {
      setTimeout(function () { focusTarget.focus(); }, 50);
    }
  }

  function closePanel(panel, toggle) {
    if (!panel) return;
    panel.classList.remove('kt-header__mobile-panel--open');
    panel.setAttribute('inert', '');
    document.body.style.overflow = '';
    if (toggle) {
      toggle.setAttribute('aria-expanded', 'false');
      var oi = toggle.querySelector('.kt-header__menu-toggle-open');
      var ci = toggle.querySelector('.kt-header__menu-toggle-close');
      if (oi) oi.classList.remove('hidden');
      if (ci) ci.classList.add('hidden');
    }

    /* Release focus trap and restore focus to whatever opened the
       drawer (guarded against detached nodes from theme-editor
       section-unload). */
    if (window.Kitchero && window.Kitchero.focusTrap && typeof window.Kitchero.focusTrap.disable === 'function') {
      window.Kitchero.focusTrap.disable(panel);
    }
    if (lastTrigger && typeof lastTrigger.focus === 'function' && document.contains(lastTrigger)) {
      lastTrigger.focus();
    }
    lastTrigger = null;
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
      forward.setAttribute('aria-expanded', 'true');
      stack.push(forward.dataset.mobileForward);
      updatePanels();
      /* Move focus into the newly surfaced sub-panel so screen readers
         announce it. Without this focus stays on the now-hidden
         forward button — users lose context. */
      focusCurrentPanel();
      return;
    }

    // Back nav
    var back = e.target.closest('[data-mobile-back]');
    if (back) {
      e.preventDefault();
      if (stack.length > 1) {
        var leavingId = stack[stack.length - 1];
        stack.pop();
        updatePanels();
        /* Flip aria-expanded on the forward button that opened the
           now-closed sub-panel, so the state reflects reality. */
        var trigger = document.querySelector('[data-mobile-forward="' + leavingId + '"]');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
        focusCurrentPanel();
      }
      return;
    }
  }

  function focusCurrentPanel() {
    var slider = document.querySelector('[data-mobile-slider]');
    if (!slider) return;
    var current = slider.querySelector('[data-panel][data-state="current"]');
    if (!current) return;
    var focusTarget = current.querySelector('a, button, [tabindex]:not([tabindex="-1"])');
    if (focusTarget) {
      setTimeout(function () { focusTarget.focus(); }, 350); /* after CSS slide transition */
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
