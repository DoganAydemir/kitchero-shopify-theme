/**
 * Video Modal — YouTube / Vimeo iframe lightbox.
 *
 * Shared by:
 *   - sections/video-split-modal.liquid
 *   - sections/video-poster-modal.liquid
 *   - any other section that renders `{% render 'video-modal' %}` and
 *     has a trigger element with `[data-modal-video-open]`
 *
 * Responsibilities:
 *   - Parse the video URL (YouTube watch/youtu.be, Vimeo) into an embed URL
 *   - Open the modal closest to the trigger (scoped so two modals on one
 *     page don't both respond to one trigger)
 *   - Set iframe src on open, clear on close so playback stops
 *   - Escape key closes, backdrop click closes, focus trap, body scroll lock
 *   - Restore focus to the trigger that opened the modal
 *   - Idempotent load guard — safe against duplicate <script> injection
 */
if (!window.__kitcheroVideoModalLoaded) {
  window.__kitcheroVideoModalLoaded = true;

  (function () {
    'use strict';

    var activeModal = null;
    var lastTrigger = null;

    /* ── URL → embed URL helpers ────────────────────────────────── */

    function parseYouTubeId(url) {
      if (!url) return null;
      var m;
      /* youtu.be/<id> */
      m = url.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/);
      if (m) return m[1];
      /* youtube.com/watch?v=<id> */
      m = url.match(/[?&]v=([A-Za-z0-9_-]{6,})/);
      if (m) return m[1];
      /* youtube.com/embed/<id> */
      m = url.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/);
      if (m) return m[1];
      /* youtube.com/shorts/<id> */
      m = url.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{6,})/);
      if (m) return m[1];
      return null;
    }

    function parseVimeoId(url) {
      if (!url) return null;
      var m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
      return m ? m[1] : null;
    }

    function toEmbedUrl(url) {
      if (!url) return null;
      var ytId = parseYouTubeId(url);
      if (ytId) {
        /* R102 — youtube-nocookie.com defers cookie writes
           (VISITOR_INFO1_LIVE, YSC, __Secure-3PAPISID, etc.) until
           the user actually starts the video. The default
           youtube.com/embed domain drops those cookies on first
           frame load, which triggers GDPR/ePrivacy consent
           requirements before any user interaction. The privacy-
           friendly domain serves the same content with no feature
           loss; YouTube officially supports it. */
        return 'https://www.youtube-nocookie.com/embed/' + ytId + '?autoplay=1&rel=0&playsinline=1';
      }
      var vimeoId = parseVimeoId(url);
      if (vimeoId) {
        /* R102 — `dnt=1` is Vimeo's documented "do not track" flag.
           Disables session tracking + analytics requests to
           Vimeo's servers. Same content, no behavioral telemetry. */
        return 'https://player.vimeo.com/video/' + vimeoId + '?autoplay=1&playsinline=1&dnt=1';
      }
      /* Unknown provider: try to use the URL as-is (some merchants may
         paste a direct embed URL). */
      return url;
    }

    /* ── Focus trap ────────────────────────────────────────────── */

    function getFocusable(container) {
      if (!container) return [];
      var sel = [
        'button:not([disabled])',
        '[href]',
        'iframe',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(',');
      return Array.prototype.slice.call(container.querySelectorAll(sel));
    }

    function trapFocus(e) {
      if (!activeModal || e.key !== 'Tab') return;
      var focusable = getFocusable(activeModal);
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    /* ── Open / close ──────────────────────────────────────────── */

    function openFor(trigger) {
      if (!trigger) return;
      var url = trigger.getAttribute('data-modal-video-open');
      if (!url) return;
      var embedUrl = toEmbedUrl(url);
      if (!embedUrl) return;

      /* Find the nearest modal. Triggers can specify `data-modal-target`
         with a modal id for explicit pairing; otherwise we look inside
         the same section, then fall back to the first modal on page. */
      var modal = null;
      var targetId = trigger.getAttribute('data-modal-target');
      if (targetId) {
        modal = document.getElementById(targetId);
      }
      if (!modal) {
        var section = trigger.closest('[data-section-id]');
        if (section) modal = section.querySelector('[data-video-modal]');
      }
      if (!modal) {
        modal = document.querySelector('[data-video-modal]');
      }
      if (!modal) return;

      var frame = modal.querySelector('[data-video-modal-frame]');
      if (frame) frame.setAttribute('src', embedUrl);

      modal.setAttribute('aria-hidden', 'false');
      /* R97 — pair aria-hidden with `inert` removal so the modal's
         focusable nodes are reachable. aria-hidden=false alone leaves
         them exposed to AT but iframe/buttons could still receive focus
         through tab order; the close direction (below) sets inert which
         is what physically blocks focus. Keep this branch parity-clean. */
      modal.removeAttribute('inert');
      if (window.Kitchero && Kitchero.scrollLock) {
        Kitchero.scrollLock.lock('video-modal');
      } else {
        document.body.style.overflow = 'hidden';
      }
      activeModal = modal;
      lastTrigger = trigger;

      /* Focus the close button so keyboard users land somewhere useful */
      var closeBtn = modal.querySelector('[data-video-modal-close]');
      if (closeBtn) setTimeout(function () { closeBtn.focus(); }, 60);
    }

    function closeActive() {
      if (!activeModal) return;
      var frame = activeModal.querySelector('[data-video-modal-frame]');
      if (frame) frame.setAttribute('src', '');
      activeModal.setAttribute('aria-hidden', 'true');
      /* R97 — `inert` removes the closed modal from sequential focus
         navigation AND from the accessibility tree (Safari 15.5+,
         Chrome 102+, Firefox 112+). Without it, screen-reader users
         can still tab into the (visually hidden via CSS) modal close
         button and iframe, breaking focus order. Pairs with the
         aria-hidden flip above per WAI-ARIA APG dialog pattern. */
      activeModal.setAttribute('inert', '');
      if (window.Kitchero && Kitchero.scrollLock) {
        Kitchero.scrollLock.unlock('video-modal');
      } else {
        document.body.style.overflow = '';
      }

      if (lastTrigger && typeof lastTrigger.focus === 'function') {
        lastTrigger.focus();
      }
      activeModal = null;
      lastTrigger = null;
    }

    /* ── Delegated listeners ───────────────────────────────────── */

    document.addEventListener('click', function (e) {
      var opener = e.target.closest('[data-modal-video-open]');
      if (opener) {
        e.preventDefault();
        openFor(opener);
        return;
      }
      var closer = e.target.closest('[data-video-modal-close]');
      if (closer) {
        e.preventDefault();
        closeActive();
        return;
      }
    });

    document.addEventListener('keydown', function (e) {
      if (!activeModal) return;
      if (e.key === 'Escape' || e.code === 'Escape') {
        e.preventDefault();
        closeActive();
        return;
      }
      trapFocus(e);
    });
  })();
}
