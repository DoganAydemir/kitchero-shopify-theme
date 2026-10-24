(function () {
  'use strict';

  var BOUND_FLAG = '__kitcheroMobileNavBound';

  function applyPanelAttrs(panel) {
    if (!panel) return;
    if (!panel.hasAttribute('role')) panel.setAttribute('role', 'dialog');
    if (!panel.hasAttribute('aria-modal')) panel.setAttribute('aria-modal', 'true');
    if (!panel.hasAttribute('inert')) panel.setAttribute('inert', '');
  }

  var lastTrigger = null;

  function openPanel(panel, toggle) {
    if (!panel) return;
    lastTrigger = toggle || document.activeElement;
    panel.classList.add('kt-header__mobile-panel--open');
    panel.removeAttribute('inert');
    if (window.Kitchero && Kitchero.scrollLock) {
      Kitchero.scrollLock.lock('mobile-nav');
    } else {
      document.body.style.overflow = 'hidden';
    }
    if (toggle) {
      toggle.setAttribute('aria-expanded', 'true');
      var oi = toggle.querySelector('.kt-header__menu-toggle-open');
      var ci = toggle.querySelector('.kt-header__menu-toggle-close');
      if (oi) oi.classList.add('hidden');
      if (ci) ci.classList.remove('hidden');
    }

    if (window.Kitchero && window.Kitchero.focusTrap && typeof window.Kitchero.focusTrap.enable === 'function') {
      window.Kitchero.focusTrap.enable(panel);
    }

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
    if (window.Kitchero && Kitchero.scrollLock) {
      Kitchero.scrollLock.unlock('mobile-nav');
    } else {
      document.body.style.overflow = '';
    }
    if (toggle) {
      toggle.setAttribute('aria-expanded', 'false');
      var oi = toggle.querySelector('.kt-header__menu-toggle-open');
      var ci = toggle.querySelector('.kt-header__menu-toggle-close');
      if (oi) oi.classList.remove('hidden');
      if (ci) ci.classList.add('hidden');
    }

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

    var closeTarget = e.target.closest('.kt-header__mobile-panel-close');
    if (closeTarget) {
      e.preventDefault();
      var els2 = getElements();
      closePanel(els2.panel, els2.toggle);
      setTimeout(resetStack, 500);
      return;
    }

    var forward = e.target.closest('[data-mobile-forward]');
    if (forward) {
      e.preventDefault();
      forward.setAttribute('aria-expanded', 'true');
      stack.push(forward.dataset.mobileForward);
      updatePanels();

      focusCurrentPanel();
      return;
    }

    var back = e.target.closest('[data-mobile-back]');
    if (back) {
      e.preventDefault();
      if (stack.length > 1) {
        var leavingId = stack[stack.length - 1];
        stack.pop();
        updatePanels();

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
      setTimeout(function () { focusTarget.focus(); }, 350);
    }
  }

  function handleEscape(e) {
    if (e.key !== 'Escape' && e.code !== 'Escape') return;
    var els = getElements();
    if (!els.panel) return;
    if (!els.panel.classList.contains('kt-header__mobile-panel--open')) return;

    if (window.Kitchero && Kitchero.focusTrap && Kitchero.focusTrap.shouldSuppressEscape && Kitchero.focusTrap.shouldSuppressEscape(els.panel)) return;
    closePanel(els.panel, els.toggle);
    setTimeout(resetStack, 500);
  }

  var swipeStartX = 0;
  var swipeStartY = 0;
  var swipeStartTime = 0;
  function isPanelOpen() {
    var els = getElements();
    return !!(els.panel && els.panel.classList.contains('kt-header__mobile-panel--open'));
  }
  function handleSwipeStart(event) {
    if (!isPanelOpen()) return;
    if (!event.touches || event.touches.length === 0) return;
    var t = event.touches[0];
    swipeStartX = t.clientX;
    swipeStartY = t.clientY;
    swipeStartTime = Date.now();
  }
  function handleSwipeEnd(event) {
    if (!isPanelOpen()) return;
    if (!event.changedTouches || event.changedTouches.length === 0) return;
    var t = event.changedTouches[0];
    var dx = t.clientX - swipeStartX;
    var dy = t.clientY - swipeStartY;
    var dt = Math.max(1, Date.now() - swipeStartTime);

    if (Math.abs(dy) < Math.abs(dx)) return;
    if (dy > -60 && dy / dt > -0.3) return;
    var els = getElements();
    closePanel(els.panel, els.toggle);
    setTimeout(resetStack, 500);
  }

  function bind() {
    if (window[BOUND_FLAG]) return;
    window[BOUND_FLAG] = true;
    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleEscape);

    document.addEventListener('touchstart', handleSwipeStart, { passive: true });
    document.addEventListener('touchend', handleSwipeEnd, { passive: true });

    document.addEventListener('touchcancel', function () {
      swipeStartX = 0;
      swipeStartY = 0;
      swipeStartTime = 0;
    }, { passive: true });

    document.querySelectorAll('.kt-header__mobile-panel').forEach(applyPanelAttrs);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }

  document.addEventListener('shopify:section:load', function (e) {
    if (!e.target || !e.target.querySelector) return;
    if (e.target.querySelector('.kt-header__menu-toggle') ||
        e.target.classList.contains('kt-header__mobile-panel')) {
      resetStack();
      bind();

      var freshPanel = e.target.classList.contains('kt-header__mobile-panel')
        ? e.target
        : e.target.querySelector('.kt-header__mobile-panel');
      applyPanelAttrs(freshPanel);
    }
  });

  document.addEventListener('shopify:section:unload', function (e) {
    if (!e.target || !e.target.querySelector) return;
    if (e.target.querySelector('.kt-header__menu-toggle') ||
        e.target.classList.contains('kt-header__mobile-panel')) {
      if (window.Kitchero && Kitchero.scrollLock) {
        Kitchero.scrollLock.unlock('mobile-nav');
      } else {
        document.body.style.overflow = '';
      }
    }
  });
})();
