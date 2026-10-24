(function () {
  'use strict';

  function initToggle(container) {
    if (!container || container._kitcheroDescTruncateInited) return;
    container._kitcheroDescTruncateInited = true;

    var shortEl = container.querySelector('[data-desc-short]');
    var fullEl = container.querySelector('[data-desc-full]');
    var toggleBtn = container.querySelector('[data-desc-toggle]');
    var moreLabel = container.querySelector('[data-desc-toggle-more]');
    var lessLabel = container.querySelector('[data-desc-toggle-less]');

    if (!shortEl || !fullEl || !toggleBtn || !moreLabel || !lessLabel) return;

    toggleBtn.addEventListener('click', function () {
      var expanded = toggleBtn.getAttribute('aria-expanded') === 'true';
      if (expanded) {
        fullEl.hidden = true;
        shortEl.hidden = false;
        moreLabel.hidden = false;
        lessLabel.hidden = true;
        toggleBtn.setAttribute('aria-expanded', 'false');

        container.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' });
      } else {
        shortEl.hidden = true;
        fullEl.hidden = false;
        moreLabel.hidden = true;
        lessLabel.hidden = false;
        toggleBtn.setAttribute('aria-expanded', 'true');
      }
    });
  }

  function init(root) {
    var scope = root || document;
    var containers = scope.querySelectorAll('[data-desc-truncate]');
    Array.prototype.forEach.call(containers, initToggle);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(); });
  } else {
    init();
  }

  document.addEventListener('shopify:section:load', function (e) {
    init(e.target);
  });
})();
