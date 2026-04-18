/**
 * Collection Filter Drawer — open/close + body scroll lock
 */
(function () {
  'use strict';

  var drawer = document.getElementById('filter-drawer');
  if (!drawer) return;

  var panel = drawer.querySelector('.kt-filter-drawer__panel');

  function open() {
    drawer.classList.add('kt-filter-drawer--open');
    document.body.style.overflow = 'hidden';
    if (panel && window.Kitchero && Kitchero.focusTrap) {
      Kitchero.focusTrap.enable(panel);
    }
  }

  function close() {
    drawer.classList.remove('kt-filter-drawer--open');
    document.body.style.overflow = '';
    if (panel && window.Kitchero && Kitchero.focusTrap) {
      Kitchero.focusTrap.disable(panel);
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
