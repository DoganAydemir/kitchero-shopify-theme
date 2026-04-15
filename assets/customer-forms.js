/**
 * Customer Forms — forgot password modal toggle
 */
(function () {
  'use strict';

  var modal = document.getElementById('forgot-modal');
  if (!modal) return;

  function open() {
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('[data-toggle-forgot]').forEach(function (btn) {
    btn.addEventListener('click', open);
  });

  document.querySelectorAll('[data-close-forgot]').forEach(function (btn) {
    btn.addEventListener('click', close);
  });

  document.addEventListener('keydown', function (e) {
    if (e.code === 'Escape' && modal.getAttribute('aria-hidden') === 'false') close();
  });
})();
