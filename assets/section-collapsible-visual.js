/**
 * Collapsible Content — Style 02 Full-Width Visual Reveal
 *
 * Single-open accordion synced with a cross-fading image stack.
 * - Clicking an item promotes it (adds .is-active) and promotes the
 *   matching image (same data-index). Others are deactivated.
 * - Panel height animates via inline max-height (cubic-bezier out).
 * - First item/image is rendered .is-active by Liquid, JS measures
 *   the panel's natural height so the content is visible on mount.
 * - prefers-reduced-motion: skips height transition, instant swap.
 *
 * Idempotent guard prevents double-binding; per-section init handles
 * shopify:section:load so the theme editor stays responsive.
 */
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
          /* Clear inline max-height so content can reflow (e.g. image load, resize). */
          panel.style.maxHeight = 'none';
          panel.removeEventListener('transitionend', onEnd);
        };
        panel.addEventListener('transitionend', onEnd);
      } else {
        /* Need a concrete value before we can transition to 0. */
        if (panel.style.maxHeight === 'none' || panel.style.maxHeight === '') {
          panel.style.maxHeight = panel.scrollHeight + 'px';
          // eslint-disable-next-line no-unused-expressions
          panel.offsetHeight; /* force reflow */
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

      /* Sync panel height for whichever item is rendered .is-active. */
      items.forEach(function (item) {
        var panel = item.querySelector(PANEL_SELECTOR);
        if (item.classList.contains('is-active') && panel) {
          panel.style.maxHeight = 'none';
          panel.style.opacity = '1';
        }

        item.addEventListener('click', function () {
          var index = parseInt(item.getAttribute('data-index'), 10);
          if (isNaN(index)) return;
          /* Clicking the already-active item is a no-op (keeps
             visual stable; matches the Next.js source behavior). */
          if (item.classList.contains('is-active')) return;
          activate(section, index);
        });

        /* Keyboard activation: native <button> already handles Enter/
           Space, nothing extra needed. */
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

    /* Shopify theme editor: per-section load/unload. */
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

    /* When a merchant selects a block in the editor, surface it. */
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
