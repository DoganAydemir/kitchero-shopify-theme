(function () {
  'use strict';

  class ProductModel extends HTMLElement {
    connectedCallback() {
      if (this._intentBound) return;
      this._intentBound = true;

      var self = this;
      var onIntent = function () {
        self.loadContent();
      };

      this.addEventListener('pointerdown', onIntent, { once: true });
      this.addEventListener('focusin', onIntent, { once: true });
    }

    loadContent() {
      if (this._loaded) return;
      this._loaded = true;

      Shopify.loadFeatures([{
        name: 'model-viewer-ui',
        version: '1.0',
        onLoad: this.setupModelViewerUI.bind(this),
      }]);
    }

    setupModelViewerUI(errors) {
      if (errors) return;
      var modelViewer = this.querySelector('model-viewer');
      if (!modelViewer) return;

      this.modelViewerUI = new Shopify.ModelViewerUI(modelViewer);
    }
  }

  if (!customElements.get('product-model')) {
    customElements.define('product-model', ProductModel);
  }
})();
