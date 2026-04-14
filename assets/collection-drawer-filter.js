/**
 * Collection Filter Drawer — open/close + body scroll lock
 */
(function () {
  'use strict';

  var drawer = document.getElementById('filter-drawer');
  if (!drawer) return;

  function open() {
    drawer.classList.add('kt-filter-drawer--open');
    document.body.style.overflow = 'hidden';
    if (typeof trapFocus === 'function') {
      trapFocus(drawer.querySelector('.kt-filter-drawer__panel'));
    }
  }

  function close() {
    drawer.classList.remove('kt-filter-drawer--open');
    document.body.style.overflow = '';
    if (typeof removeTrapFocus === 'function') {
      removeTrapFocus();
    }
  }

  document.querySelectorAll('[data-open-filter-drawer]').forEach(function (btn) {
    btn.addEventListener('click', open);
  });

  document.querySelectorAll('[data-close-filter-drawer]').forEach(function (btn) {
    btn.addEventListener('click', close);
  });

  document.addEventListener('keydown', function (e) {
    if (e.code === 'Escape' && drawer.classList.contains('kt-filter-drawer--open')) {
      close();
    }
  });
})();
