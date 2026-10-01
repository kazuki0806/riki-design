/* Shared interface behaviour: drawer menu + horizontal card rail.
   Used by every plan. No animation library required. */
(function () {
  'use strict';

  function drawer() {
    var btn = document.querySelector('.menu-btn');
    var panel = document.getElementById('drawer');
    if (!btn || !panel) return;
    var lastFocus = null;

    function setOpen(open) {
      btn.setAttribute('aria-expanded', String(open));
      panel.setAttribute('data-open', String(open));
      panel.setAttribute('aria-hidden', String(!open));
      document.body.style.overflow = open ? 'hidden' : '';
      if (open) {
        lastFocus = document.activeElement;
        var first = panel.querySelector('a');
        if (first) first.focus();
      } else if (lastFocus) {
        lastFocus.focus();
      }
    }
    btn.addEventListener('click', function () {
      setOpen(btn.getAttribute('aria-expanded') !== 'true');
    });
    panel.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (btn.getAttribute('aria-expanded') !== 'true') return;
      if (e.key === 'Escape') { setOpen(false); return; }
      if (e.key !== 'Tab') return;
      var f = panel.querySelectorAll('a, button');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    setOpen(false);
  }

  function rails() {
    document.querySelectorAll('[data-rail]').forEach(function (rail) {
      var track = rail.querySelector('[data-rail-track]');
      /* the arrow buttons sit outside .rail (they belong to the section footer),
         so look them up in the surrounding section, not inside the rail. */
      var scope = rail.closest('section') || document;
      var prev = scope.querySelector('[data-rail-prev]');
      var next = scope.querySelector('[data-rail-next]');
      if (!track) return;
      function step() {
        var card = track.querySelector(':scope > *');
        return card ? card.getBoundingClientRect().width + 20 : 320;
      }
      function sync() {
        /* the track has side padding, so the first snap position is padLeft,
           not 0 -- comparing against 0 left the "previous" button enabled. */
        var padL = parseFloat(getComputedStyle(track).paddingLeft) || 0;
        var max = track.scrollWidth - track.clientWidth - 2;
        if (prev) prev.disabled = track.scrollLeft <= padL + 2;
        if (next) next.disabled = track.scrollLeft >= max;
      }
      if (prev) prev.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: 'smooth' }); });
      if (next) next.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: 'smooth' }); });
      track.addEventListener('scroll', sync, { passive: true });
      if (window.ResizeObserver) { new ResizeObserver(sync).observe(track); }
      window.addEventListener('resize', sync);
      sync();
    });
  }

  /* FAQ: animate the height of <details>; with reduced motion the native toggle is used */
  function faq() {
    document.querySelectorAll('details[data-faq]').forEach(function (d) {
      var sum = d.querySelector('summary');
      var body = d.querySelector('.faq__a');
      if (!sum || !body || !body.animate) return;
      var anim = null, closing = false;
      sum.addEventListener('click', function (e) {
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        e.preventDefault();
        var current = body.getBoundingClientRect().height;
        if (anim) { anim.cancel(); anim = null; }
        if (!d.open || closing) {
          var from = closing ? current : 0;
          closing = false;
          d.open = true;
          anim = body.animate([{ height: from + 'px', opacity: from ? 1 : 0 }, { height: body.scrollHeight + 'px', opacity: 1 }],
            { duration: 440, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
          anim.onfinish = function () { anim = null; };
        } else {
          closing = true;
          anim = body.animate([{ height: current + 'px', opacity: 1 }, { height: '0px', opacity: 0 }],
            { duration: 300, easing: 'ease' });
          anim.onfinish = function () { d.open = false; closing = false; anim = null; };
        }
      });
    });
  }

  /* Opening a URL with #section: a smooth jump started during load is cancelled when the scroll
     animations measure the page, leaving the reader at the top. So smooth scrolling is only
     switched on after load, and the jump to the #section is made once, instantly, at that point. */
  function anchors() {
    var root = document.documentElement;
    var settle = function () {
      var id = '';
      try { id = decodeURIComponent(location.hash.slice(1)); } catch (e) { id = ''; }
      var target = id && document.getElementById(id);
      if (target && Math.abs(target.getBoundingClientRect().top) > 4) {
        window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY, behavior: 'auto' });
      }
      root.classList.add('is-loaded');
    };
    if (document.readyState === 'complete') setTimeout(settle, 80);
    else window.addEventListener('load', function () { setTimeout(settle, 80); });
  }

  function init() { drawer(); rails(); faq(); anchors(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
