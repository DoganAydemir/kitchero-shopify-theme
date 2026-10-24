(function () {
  'use strict';

  if (typeof Shopify === 'undefined' || !Shopify.designMode) return;

  var SELECTED_CLASS = 'kt-editor-selected';

  var styleEl = document.createElement('style');
  styleEl.id = 'kt-editor-block-affordance-style';
  styleEl.textContent =
    '.' + SELECTED_CLASS + '{' +
      'outline:2px dashed rgba(120,120,255,0.85);' +
      'outline-offset:6px;' +
      'transition:outline-color 200ms ease;' +
    '}' +
    '@media (prefers-reduced-motion: reduce){.' + SELECTED_CLASS + '{transition:none;}}';
  if (document.head) document.head.appendChild(styleEl);

  var reduceMotionMQ = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');

  function findBlockElement(event) {
    var sectionRoot = event.target;
    var blockId = event.detail && event.detail.blockId;
    if (!sectionRoot || !blockId) return null;

    var escapedId = (window.CSS && CSS.escape)
      ? CSS.escape(blockId)
      : String(blockId).replace(/"/g, '\\"');
    return sectionRoot.querySelector('[data-block-id="' + escapedId + '"]');
  }

  function getStickyHeaderOffset() {
    var offset = 0;
    var header = document.querySelector('.shopify-section-header, .kt-header, [data-section-type="header"]');
    if (header) {
      var rect = header.getBoundingClientRect();

      var computed = window.getComputedStyle(header);
      var pinned = (computed.position === 'sticky' || computed.position === 'fixed') && rect.top <= 1;
      if (pinned) offset = rect.height;
    }
    return offset;
  }

  function isBlockVisible(el) {
    var rect = el.getBoundingClientRect();
    var headerOffset = getStickyHeaderOffset();
    var visibleTop = Math.max(rect.top, headerOffset);
    var visibleBottom = Math.min(rect.bottom, window.innerHeight || document.documentElement.clientHeight);
    var visibleHeight = visibleBottom - visibleTop;
    if (visibleHeight <= 0) return false;
    var threshold = Math.min(rect.height * 0.5, 240);
    return visibleHeight >= threshold;
  }

  function scrollBlockIntoView(el) {
    var headerOffset = getStickyHeaderOffset();
    var rect = el.getBoundingClientRect();
    var currentScroll = window.pageYOffset || document.documentElement.scrollTop;
    var targetY = currentScroll + rect.top - headerOffset - 24;
    if (targetY < 0) targetY = 0;
    var prefersReduced = reduceMotionMQ && reduceMotionMQ.matches;
    try {
      window.scrollTo({
        top: targetY,
        behavior: prefersReduced ? 'auto' : 'smooth'
      });
    } catch (err) {
      window.scrollTo(0, targetY);
    }
  }

  document.addEventListener('shopify:block:select', function (event) {
    var blockEl = findBlockElement(event);
    if (!blockEl) return;

    blockEl.classList.add(SELECTED_CLASS);
    if (!isBlockVisible(blockEl)) {
      scrollBlockIntoView(blockEl);
    }
  });

  document.addEventListener('shopify:block:deselect', function (event) {
    var blockEl = findBlockElement(event);
    if (!blockEl) return;
    blockEl.classList.remove(SELECTED_CLASS);
  });
})();

(function (global) {
  'use strict';

  if (!(global.Shopify && global.Shopify.designMode)) return;

  var blockPulseClass = 'kt-editor-block-selected';
  var blockPulseDuration = 1200;

  document.addEventListener('shopify:block:select', function (event) {
    var block = event.target;
    if (!block || !block.classList) return;

    var rect = block.getBoundingClientRect();
    var viewportH = window.innerHeight || document.documentElement.clientHeight;
    var visH = Math.min(rect.bottom, viewportH) - Math.max(rect.top, 0);
    var mostlyVisible = visH > 0 && visH >= Math.min(rect.height * 0.5, 240);
    if (!mostlyVisible && typeof block.scrollIntoView === 'function') {
      try {
        var prm = window.matchMedia
          && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        block.scrollIntoView({ behavior: prm ? 'auto' : 'smooth', block: 'center' });
      } catch (_) { block.scrollIntoView(); }
    }

    block.classList.add(blockPulseClass);
    if (block.__ktBlockPulseTimer) clearTimeout(block.__ktBlockPulseTimer);
    block.__ktBlockPulseTimer = setTimeout(function () {
      block.classList.remove(blockPulseClass);
      block.__ktBlockPulseTimer = null;
    }, blockPulseDuration);
  });

  document.addEventListener('shopify:block:deselect', function (event) {
    var block = event.target;
    if (!block || !block.classList) return;
    block.classList.remove(blockPulseClass);
    if (block.__ktBlockPulseTimer) {
      clearTimeout(block.__ktBlockPulseTimer);
      block.__ktBlockPulseTimer = null;
    }
  });

  var ktSeenSections = new Set();

  function ktSeedSections() {
    var nodes = document.querySelectorAll('[id^="shopify-section-"]');
    for (var i = 0; i < nodes.length; i += 1) {
      ktSeenSections.add(nodes[i].id.replace(/^shopify-section-/, ''));
    }
  }
  ktSeedSections();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ktSeedSections);
  }
  global.addEventListener('load', ktSeedSections);
  setTimeout(function () {
    ktSeedSections();
  }, 1500);

  var ktTrueScrollTo = global.scrollTo;
  var ktTrueScrollIntoView = Element.prototype.scrollIntoView;
  var ktHoldTimer = null;
  var ktPinY = 0;
  function ktPin() {
    if ((global.pageYOffset || document.documentElement.scrollTop || 0) !== ktPinY) {
      document.documentElement.scrollTop = ktPinY;
      if (document.body) { document.body.scrollTop = ktPinY; }
    }
  }
  function ktHoldScroll(savedY) {
    ktPinY = savedY;
    if (!ktHoldTimer) {
      global.scrollTo = function () {};
      Element.prototype.scrollIntoView = function () {};
      global.addEventListener('scroll', ktPin, { passive: true });
    } else {
      clearTimeout(ktHoldTimer);
    }
    ktHoldTimer = setTimeout(function () {
      global.scrollTo = ktTrueScrollTo;
      Element.prototype.scrollIntoView = ktTrueScrollIntoView;
      global.removeEventListener('scroll', ktPin);
      ktHoldTimer = null;
    }, 1000);
  }

  document.addEventListener('shopify:section:load', function (event) {
    var sid = event.detail && event.detail.sectionId;
    var isReRender = sid && ktSeenSections.has(sid);
    if (sid) ktSeenSections.add(sid);
    if (!isReRender) return;
    ktHoldScroll(global.pageYOffset || document.documentElement.scrollTop || 0);
  });
})(window);
