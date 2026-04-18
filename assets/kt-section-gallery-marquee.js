/**
 * Gallery Marquee — Style 01: The Marquee Wall
 *
 * - Duplicates each [data-marquee-track] contents once at init so the
 *   CSS animation translating the track by -50% lands exactly on the
 *   start of the duplicated set (seamless infinite loop).
 * - Two rows per section: one scrolls left (default direction), the
 *   other scrolls right (CSS `animation-direction: reverse` on
 *   `.kt-gallery-marquee__track--reverse`).
 * - Pause-on-hover for pointer users is handled in pure CSS via
 *   `.kt-gallery-marquee__row:hover`. For keyboard focus, we toggle a
 *   section-level `.kt-gallery-marquee--paused` class on focusin/out so
 *   tabbing through tiles pauses the whole gallery.
 * - Re-inits on shopify:section:load (theme editor) and clears init
 *   flags on shopify:section:unload.
 *
 * Wrapped in an idempotent load-guard so double-inclusion (Section
 * Rendering API, editor rehydration) does not cause double-duplication
 * or double-bound listeners.
 */
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
        /* Make cloned interactive tiles unreachable via keyboard so
           focus order doesn't include the duplicates. */
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

    /* Initial boot */
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { initAll(); });
    } else {
      initAll();
    }

    /* Theme editor: section load */
    document.addEventListener('shopify:section:load', function (event) {
      var sectionId = event.detail && event.detail.sectionId;
      if (!sectionId) return;
      var section = document.querySelector(
        '[data-section-type="gallery-marquee"][data-section-id="' + sectionId + '"]'
      );
      initSection(section);
    });

    /* Theme editor: section unload — clear init flags so a fresh mount
       re-inits cleanly if the same DOM is re-inserted. */
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
  })();
}
