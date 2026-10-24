(function () {
  'use strict';

  function scopeFeedback() {
    var current = (window.location.hash || '').replace('#', '');
    var nodes = document.querySelectorAll('[data-contact-feedback]');
    for (var i = 0; i < nodes.length; i++) {
      var owner = nodes[i].getAttribute('data-contact-feedback');

      if (current && owner !== current) {
        nodes[i].hidden = true;
        nodes[i].style.display = 'none';
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scopeFeedback);
  } else {
    scopeFeedback();
  }
})();
