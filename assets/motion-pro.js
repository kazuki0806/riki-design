/* Rich motion layer for plan A+ (plan-a2).
   GSAP 3 + ScrollTrigger. Interface behaviour lives in ui.js. */
(function () {
  'use strict';
  var root = document.documentElement;

  function prepDraw(svg) {
    var out = { draw: [], fade: [] };
    if (!svg) return out;
    svg.querySelectorAll('path, rect, circle, line, polyline, polygon, ellipse').forEach(function (el) {
      if (el.getAttribute('stroke-dasharray')) { out.fade.push(el); return; }
      var len = 0;
      try { len = el.getTotalLength(); } catch (e) { len = 0; }
      if (!len || !isFinite(len) || len < 1) { out.fade.push(el); return; }
      gsap.set(el, { strokeDasharray: len, strokeDashoffset: len });
      out.draw.push(el);
    });
    return out;
  }

  function build(isDesk) {
    var q = function (s, ctx) { return gsap.utils.toArray(s, ctx); };
    var cleanups = [];
    function on(el, type, fn, opts) {
      if (!el) return;
      el.addEventListener(type, fn, opts);
      cleanups.push(function () { el.removeEventListener(type, fn, opts); });
    }

    /* --- starting states ---
       .js-motion is dropped FIRST so its CSS transforms stop applying; otherwise
       GSAP reads translateY(112%) as an existing y and stacks its own offset on it. */
    root.classList.remove('js-motion');
    gsap.set('[data-fade]', { opacity: 0, y: 14 });
    gsap.set('.h2 .line > span, .work__title .line > span', { yPercent: 112 });
    gsap.set('[data-rule]', { scaleX: 0 });
    gsap.set('[data-row]', { clipPath: 'inset(0% 100% 0% 0%)' });
    gsap.set('[data-cue]', { yPercent: -100 });
    gsap.set('.il-draw', { opacity: 0 });
    var hero = prepDraw(document.querySelector('.hero-a__art .il-draw'));
    if (hero.fade.length) gsap.set(hero.fade, { opacity: 0 });

    /* --- first view: the text and shapes are animated by CSS (see the hero block in the page CSS);
           GSAP draws the line art, then the sparkle twinkles and the robot blinks --- */
    var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.to('.il-draw', { opacity: 1, duration: 0.25 }, 0.05)
      .to(hero.draw, {
        strokeDashoffset: 0, duration: 0.85, stagger: 0.026, ease: 'power1.inOut',
        onComplete: function () { gsap.set(hero.draw, { clearProps: 'strokeDasharray,strokeDashoffset' }); }
      }, 0.09)
      .to(hero.fade.length ? hero.fade : {}, { opacity: 1, duration: 0.5 }, 0.8)
      .fromTo('.hero-a__art [data-spark]', { scale: 0.4, rotation: -45, transformOrigin: '50% 50%' },
        { scale: 1, rotation: 0, duration: 0.8, ease: 'back.out(2.4)' }, 1.7)
      .to('.hero-a__art [data-eye]', {
        scaleY: 0.12, transformOrigin: '50% 50%', duration: 0.09, ease: 'power1.inOut',
        yoyo: true, repeat: 3, repeatDelay: 0.9
      }, 2.3);

    gsap.to('[data-cue]', { yPercent: 100, duration: 1.5, ease: 'power2.inOut', repeat: 2, delay: 1.6 });

    /* --- reading progress --- */
    gsap.to('[data-progress]', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.25 } });

    /* --- keyword band: always moving, faster while the page scrolls,
           slower under the pointer, and it can be stopped with the button --- */
    var row = document.querySelector('[data-marquee-row]');
    var toggle = document.querySelector('[data-marquee-toggle]');
    if (row) {
      var loop = gsap.to(row, { xPercent: -25, ease: 'none', duration: 62, repeat: -1 });
      var paused = false, hovering = false;
      var label = toggle && toggle.querySelector('[data-marquee-label]');
      var cruise = function (ts, d) {
        gsap.to(loop, { timeScale: ts, duration: d || 0.6, ease: 'power2.out', overwrite: true });
      };
      ScrollTrigger.create({
        start: 0, end: 'max',
        onUpdate: function (self) {
          if (paused) return;
          var v = Math.abs(self.getVelocity());
          if (v < 40) return;
          gsap.to(loop, {
            timeScale: gsap.utils.clamp(1, 6, 1 + v / 350), duration: 0.25, ease: 'power2.out', overwrite: true,
            onComplete: function () { cruise(hovering ? 0.3 : 1, 1.4); }
          });
        }
      });
      var band = row.closest('[data-band]');
      on(band, 'mouseenter', function () { hovering = true; if (!paused) cruise(0.3); });
      on(band, 'mouseleave', function () { hovering = false; if (!paused) cruise(1); });
      if (toggle) {
        toggle.hidden = false;
        on(toggle, 'click', function () {
          paused = !paused;
          toggle.setAttribute('aria-pressed', String(paused));
          if (label) label.textContent = paused ? 'キーワードの帯を動かす' : 'キーワードの帯を止める';
          if (paused) { gsap.killTweensOf(loop); loop.pause(); }
          else { loop.timeScale(hovering ? 0.3 : 1); loop.resume(); }
        });
      }
    }

    /* --- each section introduces itself --- */
    q('[data-sec]').forEach(function (sec) {
      var t = gsap.timeline({ scrollTrigger: { trigger: sec, start: 'top 78%', toggleActions: 'play none none none' } });
      var parts = [
        [sec.querySelectorAll('[data-fade]'), { opacity: 1, y: 0, duration: 0.65, stagger: 0.07 }, 0],
        [sec.querySelectorAll('.h2 .line > span'), { yPercent: 0, duration: 0.95, ease: 'expo.out' }, 0.04],
        [sec.querySelectorAll('[data-rule]'), { scaleX: 1, duration: 1, ease: 'power2.inOut' }, 0.16]
      ];
      /* skip empty groups (the service section has no rule line) so GSAP does not warn */
      parts.forEach(function (p) { if (p[0].length) t.to(p[0], p[1], p[2]); });
    });

    /* --- works: the picture panel wipes up, then the words fade in --- */
    q('[data-work]').forEach(function (work) {
      var stage = work.querySelector('[data-work-stage]');
      var fades = work.querySelectorAll('[data-work-fade]');

      if (stage) gsap.set(stage, { clipPath: 'inset(0% 0% 100% 0%)' });
      gsap.set(fades, { opacity: 0, y: 14 });

      var t = gsap.timeline({ scrollTrigger: { trigger: work, start: 'top 86%', toggleActions: 'play none none none' } });
      if (stage) t.to(stage, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.05, ease: 'power3.inOut' }, 0);
      t.to(work.querySelectorAll('.wk__title .line > span'), { yPercent: 0, duration: 0.95, ease: 'expo.out' }, 0.3)
       .to(fades, { opacity: 1, y: 0, duration: 0.7, stagger: 0.07, ease: 'power3.out' }, 0.42);
    });

    /* --- flow rows wipe in from the left --- */
    if (document.querySelector('[data-row]')) {
      gsap.to('[data-row]', {
        clipPath: 'inset(0% 0% 0% 0%)', duration: 0.8, ease: 'power3.inOut', stagger: 0.1,
        scrollTrigger: { trigger: '.flow-a__panel', start: 'top 82%', toggleActions: 'play none none none' }
      });
    }

    /* --- service cards slide into their overlap; the AI card then draws its icon,
           pops its badge, lists what it can do, and the little robot blinks --- */
    if (document.querySelector('[data-svc]')) {
      var svcRow = window.matchMedia('(min-width: 1024px)').matches; // the cards only sit in a row from 1024px
      var aiIcon = prepDraw(document.querySelector('[data-draw-icon]'));
      if (aiIcon.fade.length) gsap.set(aiIcon.fade, { opacity: 0 });
      gsap.timeline({ scrollTrigger: { trigger: '.svc-a', start: 'top 82%', toggleActions: 'play none none none' } })
        .from('[data-svc]', {
          opacity: 0, duration: 0.95, ease: 'power3.out', stagger: 0.13,
          x: svcRow ? 54 : 0, y: svcRow ? 0 : 30
        }, 0)
        .from('[data-svc] .svc-icon:not([data-draw-icon])', {
          opacity: 0, scale: 0.86, duration: 0.7, ease: 'back.out(1.6)', stagger: 0.13
        }, 0.25)
        .to(aiIcon.draw, {
          strokeDashoffset: 0, duration: 0.7, stagger: 0.04, ease: 'power1.inOut',
          onComplete: function () { gsap.set(aiIcon.draw, { clearProps: 'strokeDasharray,strokeDashoffset' }); }
        }, 0.5)
        .to(aiIcon.fade, { opacity: 1, duration: 0.4 }, 1.05)
        .from('.svc-a__badge', { scale: 0.5, opacity: 0, duration: 0.6, ease: 'back.out(2.2)' }, 0.75)
        .from('.svc-a__tags li', { y: 10, opacity: 0, duration: 0.5, stagger: 0.08, ease: 'power3.out' }, 0.95)
        .to('[data-draw-icon] [data-eye]', {
          scaleY: 0.12, transformOrigin: '50% 50%', duration: 0.09, ease: 'power1.inOut',
          yoyo: true, repeat: 3, repeatDelay: 0.8
        }, 1.7);
    }

    /* ================= lower half ================= */

    /* line art draws itself when it comes into view */
    q('svg[data-draw]').forEach(function (art) {
      var parts = null;
      gsap.set(art, { opacity: 0 });
      var t = gsap.timeline({ scrollTrigger: { trigger: art, start: 'top 88%', toggleActions: 'play none none none',
        onEnter: function () {   // measuring the paths is the slow part, so it waits until the art is near
          if (parts) return;
          parts = prepDraw(art);
          if (parts.fade.length) gsap.set(parts.fade, { opacity: 0 });
          gsap.set(art, { opacity: 1 });
          t.to(parts.draw, {
            strokeDashoffset: 0, duration: 0.8, ease: 'power1.inOut',
            stagger: Math.min(0.05, 1.1 / Math.max(parts.draw.length, 1)),
            onComplete: function () { gsap.set(parts.draw, { clearProps: 'strokeDasharray,strokeDashoffset' }); }
          }, 0);
          if (parts.fade.length) t.to(parts.fade, { opacity: 1, duration: 0.5 }, 0.45);
        } } });
    });

    /* price: the salmon band wipes open from the left, then its text rises */
    var band2 = document.querySelector('[data-price-band]');
    if (band2) {
      gsap.set(band2, { clipPath: 'inset(0% 100% 0% 0%)' });
      gsap.set('[data-price-fade]', { opacity: 0, y: 16 });
      gsap.timeline({ scrollTrigger: { trigger: band2, start: 'top 80%', toggleActions: 'play none none none' } })
        .to(band2, {
          clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'power3.inOut',
          onComplete: function () { gsap.set(band2, { clearProps: 'clipPath' }); }
        }, 0)
        .to('[data-price-fade]', { opacity: 1, y: 0, duration: 0.7, stagger: 0.09, ease: 'power3.out' }, 0.55);
    }
    if (document.querySelector('[data-reason]')) {
      gsap.set('[data-reasons-h], [data-reason]', { opacity: 0, y: 24 });
      gsap.to('[data-reasons-h], [data-reason]', {
        opacity: 1, y: 0, duration: 0.7, stagger: 0.1, ease: 'power3.out',
        scrollTrigger: { trigger: '.reasons', start: 'top 85%', toggleActions: 'play none none none' }
      });
    }

    /* automation: cards rise, the chip icon spins in, the flow builds node by node, then a dot
       runs through it twice (under five seconds); hovering a card runs it once more.
       Afterwards the AI chip's sparkle twinkles and the robot blinks; the gear chips turn once */
    q('[data-auto]').forEach(function (card, i) {
      var nodes = card.querySelectorAll('.auto__node');
      var labels = card.querySelectorAll('.auto__label');
      var lines = card.querySelectorAll('.auto__line');
      var wrap = card.querySelector('.auto__flow-wrap');
      var dot = card.querySelector('.auto__pulse');
      // the wrapper is animated, not the <svg>: GSAP measures a bare <svg> by taking it out of the page
      // and puts it back after the next element, which moved the icon behind the label
      var chip = card.querySelector('.auto__kind-ic');
      var isAi = !!card.querySelector('.auto__kind--ai');
      var eyes = card.querySelectorAll('[data-eye]');
      var color = getComputedStyle(card).getPropertyValue('--auto-color').trim() || '#AFD0E2';
      var d = isDesk ? i * 0.12 : 0;
      var running = null;

      gsap.set(card, { opacity: 0, y: 70 });
      gsap.set(nodes, { scale: 0.3, opacity: 0 });
      gsap.set(labels, { opacity: 0, x: -12 });
      gsap.set(lines, { scaleY: 0 });
      if (chip) gsap.set(chip, { scale: 0, rotation: -120, transformOrigin: '50% 50%' });

      var run = function (times) {
        if (!dot || !wrap || running || !nodes.length) return;
        var top = wrap.getBoundingClientRect().top;
        var ys = Array.prototype.map.call(nodes, function (n) {
          var r = n.getBoundingClientRect();
          return r.top + r.height / 2 - top;
        });
        running = gsap.timeline({ repeat: times - 1, onComplete: function () { running = null; } });
        running.set(dot, { y: ys[0], opacity: 0 })
          .to(dot, { opacity: 1, duration: 0.2 })
          .to(nodes[0], { backgroundColor: color, duration: 0.25 }, '<');
        for (var k = 1; k < ys.length; k++) {
          running.to(dot, { y: ys[k], duration: 0.6, ease: 'power1.inOut' })
            .to(nodes[k - 1], { backgroundColor: '#FFFFFF', duration: 0.3 }, '<')
            .to(nodes[k], { backgroundColor: color, duration: 0.25 }, '-=0.15');
        }
        running.to(dot, { opacity: 0, duration: 0.25 })
          .to(nodes[ys.length - 1], { backgroundColor: '#FFFFFF', duration: 0.4 }, '+=0.2');
      };

      var tl = gsap.timeline({
        scrollTrigger: { trigger: card, start: 'top 85%', toggleActions: 'play none none none' },
        onComplete: function () {
          run(2);
          if (chip) {
            gsap.to(chip, isAi
              ? { scale: 1.35, duration: 0.3, ease: 'power1.inOut', yoyo: true, repeat: 3, repeatDelay: 0.5 }
              : { rotation: 180, duration: 1.4, ease: 'power2.inOut' });
          }
          if (eyes.length) {
            gsap.to(eyes, {
              scaleY: 0.12, transformOrigin: '50% 50%', duration: 0.09, ease: 'power1.inOut',
              yoyo: true, repeat: 3, repeatDelay: 0.8, delay: 0.3
            });
          }
        }
      })
        .to(card, { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }, d)
        .to(nodes, { scale: 1, opacity: 1, duration: 0.5, stagger: 0.18, ease: 'back.out(2)' }, d + 0.45)
        .to(labels, { opacity: 1, x: 0, duration: 0.5, stagger: 0.18, ease: 'power3.out' }, d + 0.5)
        .to(lines, { scaleY: 1, duration: 0.35, stagger: 0.18, ease: 'power2.out' }, d + 0.62);
      if (chip) tl.to(chip, { scale: 1, rotation: 0, duration: 0.7, ease: 'back.out(2)' }, d + 0.35);

      on(card, 'mouseenter', function () { run(1); });
    });

    /* about: the three keywords rise out of their lines, the icon frame opens, text follows */
    var kw = document.querySelector('[data-kw]');
    if (kw) {
      gsap.set(kw.querySelectorAll('.kw > span'), { yPercent: 110 });
      gsap.set(kw.querySelectorAll('.kw-sep'), { opacity: 0 });
      gsap.timeline({ scrollTrigger: { trigger: kw, start: 'top 85%', toggleActions: 'play none none none' } })
        .to(kw.querySelectorAll('.kw > span'), { yPercent: 0, duration: 1, stagger: 0.14, ease: 'expo.out' }, 0)
        .to(kw.querySelectorAll('.kw-sep'), { opacity: 1, duration: 0.5, stagger: 0.14 }, 0.3);
    }
    var aboutIcon = document.querySelector('[data-about-icon]');
    if (aboutIcon) {
      gsap.set(aboutIcon, { clipPath: 'inset(100% 0% 0% 0%)' });
      gsap.set('[data-about-fade], [data-about-row]', { opacity: 0, y: 16 });
      gsap.timeline({ scrollTrigger: { trigger: '.about', start: 'top 80%', toggleActions: 'play none none none' } })
        .to(aboutIcon, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1, ease: 'power3.inOut' }, 0)
        .to('[data-about-fade]', { opacity: 1, y: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out' }, 0.2)
        .to('[data-about-row]', { opacity: 1, y: 0, duration: 0.6, stagger: 0.07, ease: 'power3.out' }, 0.5);
    }

    /* faq panels line up one after another */
    if (document.querySelector('[data-faq]')) {
      gsap.set('[data-faq]', { opacity: 0, y: 20 });
      gsap.to('[data-faq]', {
        opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'power3.out',
        scrollTrigger: { trigger: '.faq', start: 'top 85%', toggleActions: 'play none none none' }
      });
    }

    /* contact: the panel settles into place and the paper plane lifts off */
    var panel = document.querySelector('[data-contact]');
    if (panel) {
      var plane = panel.querySelector('[data-plane]');
      gsap.set(panel, { opacity: 0, scale: 0.94 });
      var ct = gsap.timeline({ scrollTrigger: { trigger: panel, start: 'top 82%', toggleActions: 'play none none none' } })
        .to(panel, { opacity: 1, scale: 1, duration: 1, ease: 'expo.out' }, 0);
      if (plane) ct.fromTo(plane, { x: -18, y: 14 }, { x: 0, y: 0, duration: 1.3, ease: 'power3.out' }, 0.45);
    }

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
    }

    return function () { cleanups.forEach(function (fn) { fn(); }); };
  }

  function init() {
    window.__revealReady = true;
    if (!window.gsap || !window.ScrollTrigger) { root.classList.remove('js-motion'); return; }
    gsap.registerPlugin(ScrollTrigger);

    /* 'always' has to be here: with a conditions object GSAP only runs the
       callback when at least one condition matches, and on a phone with motion
       switched on neither 'reduce' nor 'desk' would. */
    gsap.matchMedia().add({
      always: '(min-width: 0px)',
      reduce: '(prefers-reduced-motion: reduce)',
      desk: '(min-width: 768px)'
    }, function (ctx) {
      var c = ctx.conditions;
      if (c.reduce) {
        /* nothing was animated, so only the guard class and the band's stop button need handling.
           (GSAP reverts the motion context by itself if the setting changes while the page is open.) */
        root.classList.remove('js-motion');
        var t = document.querySelector('[data-marquee-toggle]');
        if (t) t.hidden = true;
        return;
      }
      return build(c.desk);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
