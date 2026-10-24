if (!window.__kitcheroCollapsibleVisualLoaded) {
  window.__kitcheroCollapsibleVisualLoaded = true;

  (function () {
    'use strict';

    var SECTION_SELECTOR = '[data-kt-collapsible-visual]';
    var ITEM_SELECTOR = '[data-visual-item]';
    var PANEL_SELECTOR = '[data-visual-panel]';
    var IMAGE_SELECTOR = '[data-visual-image]';
    var BOUND_FLAG = '__ktVisualBound';

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

    function activate(section, index) {
      var items = section.querySelectorAll(ITEM_SELECTOR);
      var images = section.querySelectorAll(IMAGE_SELECTOR);

      items.forEach(function (item) {
        var itemIndex = parseInt(item.getAttribute('data-index'), 10);
        var panel = item.querySelector(PANEL_SELECTOR);
        var isActive = itemIndex === index;

        if (isActive) {
          item.classList.add('is-active');
          item.setAttribute('aria-expanded', 'true');
          setPanelHeight(panel, true);
        } else {
          if (item.classList.contains('is-active')) {
            setPanelHeight(panel, false);
          }
          item.classList.remove('is-active');
          item.setAttribute('aria-expanded', 'false');
        }
      });

      images.forEach(function (image) {
        var imgIndex = parseInt(image.getAttribute('data-index'), 10);
        if (imgIndex === index) {
          image.classList.add('is-active');
          image.setAttribute('aria-hidden', 'false');
        } else {
          image.classList.remove('is-active');
          image.setAttribute('aria-hidden', 'true');
        }
      });
    }

    function initSection(section) {
      if (section[BOUND_FLAG]) return;
      section[BOUND_FLAG] = true;

      var items = section.querySelectorAll(ITEM_SELECTOR);
      if (!items.length) return;

      items.forEach(function (item) {
        var panel = item.querySelector(PANEL_SELECTOR);
        if (item.classList.contains('is-active') && panel) {
          panel.style.maxHeight = 'none';
          panel.style.opacity = '1';
        }

        item.addEventListener('click', function () {
          var index = parseInt(item.getAttribute('data-index'), 10);
          if (isNaN(index)) return;

          if (item.classList.contains('is-active')) return;
          activate(section, index);
        });
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
      if (!event || !event.detail) return;
      var sectionId = event.detail.sectionId;
      if (!sectionId) {
        if (event.target) initAll(event.target);
        return;
      }
      var section = document.querySelector(
        SECTION_SELECTOR + '[data-section-id="' + sectionId + '"]'
      );
      if (section) initSection(section);
    });

    document.addEventListener('shopify:section:unload', function (event) {
      if (!event.target) return;
      var sections = event.target.querySelectorAll(SECTION_SELECTOR);
      sections.forEach(function (section) {
        section[BOUND_FLAG] = false;
      });
    });

    document.addEventListener('shopify:block:select', function (event) {
      if (!event || !event.target) return;
      var item = event.target.matches && event.target.matches(ITEM_SELECTOR)
        ? event.target
        : (event.target.querySelector && event.target.querySelector(ITEM_SELECTOR));
      if (!item) return;
      var section = item.closest(SECTION_SELECTOR);
      if (!section) return;
      var index = parseInt(item.getAttribute('data-index'), 10);
      if (!isNaN(index)) activate(section, index);
    });
  })();
}
