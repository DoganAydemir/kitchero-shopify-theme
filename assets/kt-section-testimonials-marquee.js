if (!window.__kitcheroTestimonialsMarqueeLoaded) {
  window.__kitcheroTestimonialsMarqueeLoaded = true;

  (function () {
    'use strict';

    var INIT_FLAG = 'kitcheroMarqueeInit';

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

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { initAll(); });
    } else {
      initAll();
    }

    document.addEventListener('shopify:section:load', function (event) {
      var sectionId = event.detail && event.detail.sectionId;
      if (!sectionId) return;
      var section = document.querySelector(
        '[data-section-type="testimonials-marquee"][data-section-id="' + sectionId + '"]'
      );
      initSection(section);
    });

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

    var PAUSE_CLASS = 'kt-testimonials-marquee--paused';
    document.addEventListener('shopify:block:select', function (event) {
      var block = event.target;
      if (!block || !block.classList) return;
      if (!block.classList.contains('kt-testimonials-marquee__item')) return;

      if (block.getAttribute('aria-hidden') === 'true') return;
      var section = block.closest('[data-section-type="testimonials-marquee"]');
      if (!section) return;
      section.classList.add(PAUSE_CLASS);
    });

    document.addEventListener('shopify:block:deselect', function (event) {
      var block = event.target;
      if (!block || !block.classList) return;
      if (!block.classList.contains('kt-testimonials-marquee__item')) return;
      var section = block.closest('[data-section-type="testimonials-marquee"]');
      if (!section) return;

      section.classList.remove(PAUSE_CLASS);
    });
  })();
}
