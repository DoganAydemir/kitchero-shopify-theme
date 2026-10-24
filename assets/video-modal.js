if (!window.__kitcheroVideoModalLoaded) {
  window.__kitcheroVideoModalLoaded = true;

  (function () {
    'use strict';

    var activeModal = null;
    var lastTrigger = null;

    function parseYouTubeId(url) {
      if (!url) return null;
      var m;

      m = url.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/);
      if (m) return m[1];

      m = url.match(/[?&]v=([A-Za-z0-9_-]{6,})/);
      if (m) return m[1];

      m = url.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/);
      if (m) return m[1];

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
        return 'https://www.youtube-nocookie.com/embed/' + ytId + '?autoplay=1&rel=0&playsinline=1';
      }
      var vimeoId = parseVimeoId(url);
      if (vimeoId) {
        return 'https://player.vimeo.com/video/' + vimeoId + '?autoplay=1&playsinline=1&dnt=1';
      }

      return url;
    }

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

    function openFor(trigger) {
      if (!trigger) return;
      var url = trigger.getAttribute('data-modal-video-open');
      if (!url) return;
      var embedUrl = toEmbedUrl(url);
      if (!embedUrl) return;

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

      modal.removeAttribute('inert');
      if (window.Kitchero && Kitchero.scrollLock) {
        Kitchero.scrollLock.lock('video-modal');
      } else {
        document.body.style.overflow = 'hidden';
      }
      activeModal = modal;
      lastTrigger = trigger;

      var closeBtn = modal.querySelector('[data-video-modal-close]');
      if (closeBtn) setTimeout(function () { closeBtn.focus(); }, 60);
    }

    function closeActive() {
      if (!activeModal) return;
      var frame = activeModal.querySelector('[data-video-modal-frame]');
      if (frame) frame.setAttribute('src', '');
      activeModal.setAttribute('aria-hidden', 'true');

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
        if (window.Kitchero && Kitchero.focusTrap && Kitchero.focusTrap.shouldSuppressEscape && Kitchero.focusTrap.shouldSuppressEscape(activeModal)) return;
        e.preventDefault();
        closeActive();
        return;
      }
      trapFocus(e);
    });
  })();
}
