/**
 * Testimonials Marquee — Style 01
 *
 * - Duplicates each [data-marquee-track] contents once at init so the
 *   CSS animation translating the track by -50% lands exactly on the
 *   start of the duplicated set (seamless infinite loop).
 * - Honors per-section data-pause-on-hover to toggle an animation-play-state
 *   paused class on mouse enter/leave and focus-in/out (keyboard users).
 * - Re-inits on shopify:section:load (theme editor) and cleans up on
 *   shopify:section:unload.
 *
 * Wrapped in an idempotent load-guard so double-inclusion (Section
 * Rendering API, editor rehydration) does not cause double-duplication
 * or double-bound listeners.
 */
if (!window.__kitcheroTestimonialsMarqueeLoaded) {
  window.__kitcheroTestimonialsMarqueeLoaded = true;

  (function () {
    'use strict';

    var INIT_FLAG = 'kitcheroMarqueeInit';

    function initTrack(track) {
      if (!track) return;
      if (track.dataset[INIT_FLAG] === 'true') return;

      /* Duplicate children once for a seamless -50% loop. */
      var children = Array.prototype.slice.call(track.children);
      if (children.length === 0) {
        track.dataset[INIT_FLAG] = 'true';
        return;
      }

      var fragment = document.createDocumentFragment();
      children.forEach(function (child) {
        var clone = child.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        fragment.appendChild(clone);
      });
      track.appendChild(fragment);

      track.dataset[INIT_FLAG] = 'true';
    }

    function bindPauseHandlers(section) {
      if (!section) return;
      if (section.dataset.kitcheroMarqueePauseBound === 'true') return;
      if (section.dataset.pauseOnHover !== 'true') return;

      var pausedClass = 'kt-testimonials-marquee--paused';

      var onEnter = function () { section.classList.add(pausedClass); };
      var onLeave = function () { section.classList.remove(pausedClass); };

      section.addEventListener('mouseenter', onEnter);
      section.addEventListener('mouseleave', onLeave);
      section.addEventListener('focusin', onEnter);
      section.addEventListener('focusout', onLeave);

      section.dataset.kitcheroMarqueePauseBound = 'true';
    }

    function initSection(section) {
      if (!section) return;
      var track = section.querySelector('[data-marquee-track]');
      initTrack(track);
      bindPauseHandlers(section);
    }

    function initAll(root) {
      var scope = root || document;
      var sections = scope.querySelectorAll('[data-section-type="testimonials-marquee"]');
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
        '[data-section-type="testimonials-marquee"][data-section-id="' + sectionId + '"]'
      );
      initSection(section);
    });

    /* Theme editor: section unload — nothing persistent to tear down,
       but clear the init flag so a fresh mount re-inits cleanly if the
       same DOM is re-inserted. */
    document.addEventListener('shopify:section:unload', function (event) {
      var sectionId = event.detail && event.detail.sectionId;
      if (!sectionId) return;
      var section = document.querySelector(
        '[data-section-type="testimonials-marquee"][data-section-id="' + sectionId + '"]'
      );
      if (!section) return;
      var track = section.querySelector('[data-marquee-track]');
      if (track) {
        delete track.dataset[INIT_FLAG];
      }
      delete section.dataset.kitcheroMarqueePauseBound;
    });

    /* Theme editor: when the merchant selects a testimonial block in
       the sidebar, pause the marquee and scroll the original (non-
       cloned) card into view so they can see what they're editing.
       event.target is the block element itself. */
    var PAUSE_CLASS = 'kt-testimonials-marquee--paused';
    document.addEventListener('shopify:block:select', function (event) {
      var block = event.target;
      if (!block || !block.classList) return;
      if (!block.classList.contains('kt-testimonials-marquee__item')) return;
      /* Ignore clones — they have aria-hidden="true" and are not what
         the merchant meant to edit. */
      if (block.getAttribute('aria-hidden') === 'true') return;
      var section = block.closest('[data-section-type="testimonials-marquee"]');
      if (!section) return;
      section.classList.add(PAUSE_CLASS);
      try {
        block.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      } catch (e) {
        block.scrollIntoView();
      }
    });

    document.addEventListener('shopify:block:deselect', function (event) {
      var block = event.target;
      if (!block || !block.classList) return;
      if (!block.classList.contains('kt-testimonials-marquee__item')) return;
      var section = block.closest('[data-section-type="testimonials-marquee"]');
      if (!section) return;
      /* Only resume if pause-on-hover isn't permanently true — the
         hover handlers will re-toggle on real mouse events. */
      section.classList.remove(PAUSE_CLASS);
    });
  })();
}
