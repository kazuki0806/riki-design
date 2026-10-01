/* Hide elements that the motion layer will reveal, before the first paint.
   If the motion layer never reports in (no network, script error), show everything after 2.5s. */
(function () {
  var r = document.documentElement;

  /* web fonts load without holding back the first paint (text shows in the system font, then swaps) */
  var here = document.currentScript;
  var hrefs = ((here && here.getAttribute('data-fonts')) || '').split(' ');
  for (var i = 0; i < hrefs.length; i++) {
    if (!hrefs[i]) continue;
    var fonts = document.createElement('link');
    fonts.rel = 'stylesheet';
    fonts.href = hrefs[i];
    document.head.appendChild(fonts);
  }

  if (!window.matchMedia || !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    r.classList.add('js-motion');
  }
  setTimeout(function () { if (!window.__revealReady) r.classList.remove('js-motion'); }, 2500);
})();
