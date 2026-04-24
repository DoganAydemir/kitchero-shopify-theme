/**
 * Background-video hero — pause/play toggle + reduced-motion guard.
 *
 * WCAG 2.2.2 Pause, Stop, Hide (Level A) requires any auto-playing
 * content longer than 5s to offer a user-controllable pause. The
 * section template ships the button; this script wires it up and
 * also auto-pauses for visitors with prefers-reduced-motion set so
 * their motion-sensitivity setting carries through even if no one
 * tells them the button is there.
 */
(function () {
  'use strict';

  var instances = [];

  function findVideo(root) {
    return root.querySelector('video');
  }

  function setState(btn, isPaused) {
    if (!btn) return;
    var label = isPaused
      ? btn.getAttribute('data-label-play')
      : btn.getAttribute('data-label-pause');
    if (label) btn.setAttribute('aria-label', label);
    btn.setAttribute('aria-pressed', isPaused ? 'true' : 'false');
    btn.classList.toggle('is-paused', isPaused);
  }

  function bind(section) {
    if (!section || section.dataset.videoBgHeroBound === 'true') return null;
    var video = findVideo(section);
    var btn = section.querySelector('[data-video-bg-hero-toggle]');
    if (!video || !btn) return null;
    section.dataset.videoBgHeroBound = 'true';

    var prefersReducedMotion = window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* Honor user motion preference — pause immediately. */
    if (prefersReducedMotion) {
      try { video.pause(); } catch (_) { /* no-op */ }
      setState(btn, true);
    } else {
      setState(btn, video.paused);
    }

    function onClick() {
      if (video.paused) {
        var p = video.play();
        if (p && typeof p.catch === 'function') p.catch(function () {});
        setState(btn, false);
      } else {
        video.pause();
        setState(btn, true);
      }
    }

    function onPlay()  { setState(btn, false); }
    function onPause() { setState(btn, true); }

    btn.addEventListener('click', onClick);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);

    var instance = {
      section: section,
      cleanup: function () {
        btn.removeEventListener('click', onClick);
        video.removeEventListener('play', onPlay);
        video.removeEventListener('pause', onPause);
        delete section.dataset.videoBgHeroBound;
      }
    };
    instances.push(instance);
    return instance;
  }

  function bindAll(root) {
    (root || document).querySelectorAll('[data-section-type="video-bg-hero"]').forEach(bind);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { bindAll(); });
  } else {
    bindAll();
  }

  document.addEventListener('shopify:section:load', function (e) {
    bindAll(e.target);
  });

  document.addEventListener('shopify:section:unload', function (e) {
    var removed = e.target.querySelector('[data-section-type="video-bg-hero"]');
    if (!removed) return;
    instances = instances.filter(function (inst) {
      if (inst.section === removed) {
        inst.cleanup();
        return false;
      }
      return true;
    });
  });
})();
