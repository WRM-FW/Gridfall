/* Gridfall PWA: register the root service worker from the lobby or any game page. */
(function () {
  'use strict';
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;

  var script = document.currentScript;
  if (!script) {
    var scripts = document.querySelectorAll('script[src]');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].getAttribute('src') || '';
      if (/(^|\/)pwa\.js(\?|$)/.test(src)) { script = scripts[i]; break; }
    }
  }

  // pwa.js lives at the site root, even when loaded from /games/<name>/.
  // Resolve sw.js against it instead of the current page so the worker scope
  // is always the site root (or /Gridfall/ on GitHub Pages).
  var base = script ? new URL('./', script.src) : new URL('./', location.href);
  var swUrl = new URL('sw.js', base).href;

  window.addEventListener('load', function () {
    navigator.serviceWorker.register(swUrl).catch(function () {
      /* Offline support is optional; the site still works without a worker. */
    });
  });
})();