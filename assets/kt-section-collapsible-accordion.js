if (!window.__kitcheroCollapsibleAccordionLoaded) {
  window.__kitcheroCollapsibleAccordionLoaded = true;

  (function () {
    'use strict';

    var SECTION_SELECTOR = '.kt-collapsible-accordion';
    var ITEM_SELECTOR = '[data-kt-accordion-item]';
    var PANEL_SELECTOR = '[data-kt-accordion-panel]';
    var BOUND_FLAG = '__ktAccordionBound';

    var prefersReducedMotion =
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function setPanelHeight(panel, expanded) {
      if (!panel) return;
      if (prefersReducedMotion) {
        panel.style.maxHeight = expanded ? 'none' : '0px';
        panel.style.opacity = expanded ? '1' : '0';
        return;
      }

      if (expanded) {
        var contentHeight = panel.scrollHeight;
        panel.style.maxHeight = contentHeight + 'px';
        panel.style.opacity = '1';

        var onEnd = function (e) {
          if (e.propertyName !== 'max-height') return;
          panel.style.maxHeight = 'none';
          panel.removeEventListener('transitionend', onEnd);
        };
        panel.addEventListener('transitionend', onEnd);
      } else {
        if (panel.style.maxHeight === 'none' || panel.style.maxHeight === '') {
          panel.style.maxHeight = panel.scrollHeight + 'px';

          panel.offsetHeight;
        }
        requestAnimationFrame(function () {
          panel.style.maxHeight = '0px';
          panel.style.opacity = '0';
        });
      }
    }

    function closeOthers(section, currentItem) {
      var items = section.querySelectorAll(ITEM_SELECTOR);
      items.forEach(function (item) {
        if (item === currentItem) return;
        if (item.open) {
          item.open = false;
          setPanelHeight(item.querySelector(PANEL_SELECTOR), false);
        }
      });
    }

    function bindItem(section, item) {
      if (item[BOUND_FLAG]) return;
      item[BOUND_FLAG] = true;

      var panel = item.querySelector(PANEL_SELECTOR);

      if (item.open) {
        if (panel) {
          panel.style.maxHeight = 'none';
          panel.style.opacity = '1';
        }
      }

      item.addEventListener('toggle', function () {
        var allowMultiple = section.dataset.allowMultiple === 'true';

        if (item.open) {
          if (panel && (panel.style.maxHeight === '' || panel.style.maxHeight === 'none')) {
            panel.style.maxHeight = '0px';
            panel.style.opacity = '0';

            panel.offsetHeight;
          }
          setPanelHeight(panel, true);

          if (!allowMultiple) {
            closeOthers(section, item);
          }
        } else {
          setPanelHeight(panel, false);
        }
      });
    }

    function initSection(section) {
      if (section[BOUND_FLAG]) return;
      section[BOUND_FLAG] = true;

      var items = section.querySelectorAll(ITEM_SELECTOR);
      items.forEach(function (item) {
        bindItem(section, item);
      });
    }

    function initAll(root) {
      var scope = root && root.querySelectorAll ? root : document;
      scope.querySelectorAll(SECTION_SELECTOR).forEach(initSection);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { initAll(); });
    } else {
      initAll();
    }

    document.addEventListener('shopify:section:load', function (event) {
      if (event.target) initAll(event.target);
    });

    document.addEventListener('shopify:section:unload', function (event) {
      if (!event.target) return;
      var sections = event.target.querySelectorAll(SECTION_SELECTOR);
      sections.forEach(function (section) {
        section[BOUND_FLAG] = false;
        section.querySelectorAll(ITEM_SELECTOR).forEach(function (item) {
          item[BOUND_FLAG] = false;
        });
      });
    });

    document.addEventListener('shopify:block:select', function (event) {
      var item = event.target;
      if (!item || !item.matches || !item.matches(ITEM_SELECTOR)) return;
      var section = item.closest(SECTION_SELECTOR);
      if (!section) return;
      if (!item.open) {
        item.open = true;
      }
    });
  })();
}
