/**
 * Customer Forms — forgot password modal toggle.
 * Re-initialises on shopify:section:load so the editor can add/move
 * the login section without losing interactivity.
 */
(function () {
  'use strict';

  function bindModal(modal) {
    if (!modal || modal.dataset.kitcheroBound === 'true') return;
    modal.dataset.kitcheroBound = 'true';

    // Initial aria-hidden. The markup intentionally omits this
    // attribute so no-JS SR users CAN reach the form (rendered
    // inline via html:not(.js) CSS). JS users get it closed here.
    modal.setAttribute('aria-hidden', 'true');

    function open() {
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      var first = modal.querySelector('input, select, textarea, button');
      if (first) first.focus();
    }

    function close() {
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    var scope = modal.closest('[data-section-id]') || document;

    scope.querySelectorAll('[data-toggle-forgot]').forEach(function (btn) {
      btn.addEventListener('click', open);
    });

    modal.querySelectorAll('[data-close-forgot]').forEach(function (btn) {
      btn.addEventListener('click', close);
    });

    function onKeyDown(e) {
      if (e.code === 'Escape' && modal.getAttribute('aria-hidden') === 'false') close();
    }
    document.addEventListener('keydown', onKeyDown);

    modal._kitcheroCleanup = function () {
      document.removeEventListener('keydown', onKeyDown);
      modal.dataset.kitcheroBound = '';
    };
  }

  function initAll(root) {
    (root || document).querySelectorAll('#forgot-modal, [data-forgot-modal]').forEach(bindModal);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initAll(); });
  } else {
    initAll();
  }

  document.addEventListener('shopify:section:load', function (event) {
    initAll(event.target);
  });

  document.addEventListener('shopify:section:unload', function (event) {
    var modal = event.target.querySelector('#forgot-modal, [data-forgot-modal]');
    if (modal && typeof modal._kitcheroCleanup === 'function') modal._kitcheroCleanup();
  });
})();
