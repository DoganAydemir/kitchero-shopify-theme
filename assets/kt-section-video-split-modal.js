/* ==========================================================================
   Video split modal — pause/play toggle for the looping background video.

   WCAG 2.2.2 (Pause, Stop, Hide) requires that any auto-playing motion
   content longer than 5 seconds offers a user-controllable pause. The
   loop video here autoplays muted; merchants enable it intentionally so
   the section ships with autoplay on by default — but the toggle here
   gives keyboard / screen-reader users (and anyone who finds motion
   distracting) a way to stop it on demand.

   The button's `aria-pressed` reflects state: "true" = playing,
   "false" = paused. CSS swaps the displayed icon based on that.

   Theme editor compatibility: re-runs init on `shopify:section:load`
   so re-rendering during editing keeps the toggle wired. Cleans up
   on `shopify:section:unload` to avoid duplicate listeners.
   ========================================================================== */
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

    /* Sync state when the video element fires native events — covers
       the case where prefers-reduced-motion / browser autoplay policy
       prevents the initial play despite autoplay=true. */
    video.addEventListener('play', function () { setState(true); });
    video.addEventListener('pause', function () { setState(false); });
    video.addEventListener('ended', function () { setState(false); });

    toggle.addEventListener('click', function () {
      if (video.paused) {
        var playPromise = video.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(function () {
            /* Browser refused autoplay — keep toggle in paused state.
               User can try clicking again; some browsers accept the
               second click as user gesture. */
            setState(false);
          });
        }
      } else {
        video.pause();
      }
    });

    /* Initial state from the underlying media element. */
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
