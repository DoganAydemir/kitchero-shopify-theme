(function () {
  'use strict';

  function init(section) {
    if (!section || section.dataset.videoSplitInit === '1') return;
    var video = section.querySelector('.kt-video-split__video');
    var toggle = section.querySelector('[data-video-split-pause-toggle]');
    if (!video || !toggle) return;

    section.dataset.videoSplitInit = '1';

    function setState(playing) {
      toggle.setAttribute('aria-pressed', playing ? 'true' : 'false');
    }

    video.addEventListener('play', function () { setState(true); });
    video.addEventListener('pause', function () { setState(false); });
    video.addEventListener('ended', function () { setState(false); });

    toggle.addEventListener('click', function () {
      if (video.paused) {
        var playPromise = video.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(function () {
            setState(false);
          });
        }
      } else {
        video.pause();
      }
    });

    setState(!video.paused);
  }

  function initAll(root) {
    var scope = root || document;
    var sections = scope.querySelectorAll('[data-section-type="video-split-modal"]');
    sections.forEach(init);
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
    var s = event.target && event.target.querySelector
      ? event.target.querySelector('[data-section-type="video-split-modal"]')
      : null;
    if (s) s.dataset.videoSplitInit = '';
  });
})();
