if (!window.__kitcheroGalleryMarqueeLoaded) {
  window.__kitcheroGalleryMarqueeLoaded = true;

  (function () {
    'use strict';

    var INIT_FLAG = 'kitcheroGalleryMarqueeInit';
    var PAUSE_CLASS = 'kt-gallery-marquee--paused';

    function initTrack(track) {
      if (!track) return;
      if (track.dataset[INIT_FLAG] === 'true') return;

      var children = Array.prototype.slice.call(track.children);
      if (children.length === 0) {
        track.dataset[INIT_FLAG] = 'true';
        return;
      }

      var fragment = document.createDocumentFragment();
      children.forEach(function (child) {
        var clone = child.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');

        if (clone.tagName === 'A') {
          clone.setAttribute('tabindex', '-1');
        }
        var focusables = clone.querySelectorAll('a, button, [tabindex]');
        Array.prototype.forEach.call(focusables, function (el) {
          el.setAttribute('tabindex', '-1');
        });
        fragment.appendChild(clone);
      });
      track.appendChild(fragment);

      track.dataset[INIT_FLAG] = 'true';
    }

    function bindPauseHandlers(section) {
      if (!section) return;
      if (section.dataset.kitcheroGalleryMarqueePauseBound === 'true') return;
      if (section.dataset.pauseOnHover !== 'true') return;

      var onFocusIn = function () { section.classList.add(PAUSE_CLASS); };
      var onFocusOut = function () { section.classList.remove(PAUSE_CLASS); };

      section.addEventListener('focusin', onFocusIn);
      section.addEventListener('focusout', onFocusOut);

      section.dataset.kitcheroGalleryMarqueePauseBound = 'true';
    }

    function initSection(section) {
      if (!section) return;
      var tracks = section.querySelectorAll('[data-marquee-track]');
      Array.prototype.forEach.call(tracks, initTrack);
      bindPauseHandlers(section);
    }

    function initAll(root) {
      var scope = root || document;
      var sections = scope.querySelectorAll('[data-section-type="gallery-marquee"]');
      Array.prototype.forEach.call(sections, initSection);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { initAll(); });
    } else {
      initAll();
    }

    document.addEventListener('shopify:section:load', function (event) {
      var sectionId = event.detail && event.detail.sectionId;
      if (!sectionId) return;
      var section = document.querySelector(
        '[data-section-type="gallery-marquee"][data-section-id="' + sectionId + '"]'
      );
      initSection(section);
    });

    document.addEventListener('shopify:section:unload', function (event) {
      var sectionId = event.detail && event.detail.sectionId;
      if (!sectionId) return;
      var section = document.querySelector(
        '[data-section-type="gallery-marquee"][data-section-id="' + sectionId + '"]'
      );
      if (!section) return;
      var tracks = section.querySelectorAll('[data-marquee-track]');
      Array.prototype.forEach.call(tracks, function (track) {
        delete track.dataset[INIT_FLAG];
      });
      delete section.dataset.kitcheroGalleryMarqueePauseBound;
    });

    document.addEventListener('shopify:block:select', function (event) {
      var item = event.target;
      if (!item || !item.classList || !item.classList.contains('kt-gallery-marquee__item')) return;
      var section = item.closest('[data-section-type="gallery-marquee"]');
      if (section) section.classList.add(PAUSE_CLASS);
    });

    document.addEventListener('shopify:block:deselect', function (event) {
      var item = event.target;
      if (!item || !item.classList || !item.classList.contains('kt-gallery-marquee__item')) return;
      var section = item.closest('[data-section-type="gallery-marquee"]');
      if (section) section.classList.remove(PAUSE_CLASS);
    });
  })();
}
