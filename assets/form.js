/* Contact form: inline validation, focus on the first problem, sending through the mail relay,
   and a gentle entrance. The relay address comes from src/site.json (form_endpoint) via build.py. */
(function () {
  'use strict';
  var root = document.documentElement;
  var form = document.querySelector('[data-form]');

  if (form) {
    var done = form.querySelector('.form-done');
    var radios = form.querySelector('.radios');
    var rules = [
      { el: form.elements.name, err: 'f-name-err', check: function (v) {
          return v.trim() ? '' : 'お名前を入力してください。'; } },
      { el: form.elements.email, err: 'f-email-err', check: function (v) {
          if (!v.trim()) return 'メールアドレスを入力してください。';
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'メールアドレスの形（例：name@example.com）で入力してください。'; } },
      { group: 'kind', err: 'f-kind-err', check: function () {
          return form.querySelector('input[name="kind"]:checked') ? '' : 'ご依頼の種類を1つ選んでください。'; } },
      { el: form.elements.want, err: 'f-want-err', check: function (v) {
          return v.trim() ? '' : 'やりたいことを入力してください。'; } }
    ];

    var show = function (rule, msg) {
      var p = document.getElementById(rule.err);
      p.textContent = msg;
      p.hidden = !msg;
      if (rule.group) {
        form.querySelectorAll('input[name="' + rule.group + '"]').forEach(function (r) {
          if (msg) r.setAttribute('aria-invalid', 'true'); else r.removeAttribute('aria-invalid');
        });
        if (msg) radios.setAttribute('data-invalid', ''); else radios.removeAttribute('data-invalid');
      } else if (msg) {
        rule.el.setAttribute('aria-invalid', 'true');
      } else {
        rule.el.removeAttribute('aria-invalid');
      }
    };
    var validate = function (rule) {
      var msg = rule.group ? rule.check() : rule.check(rule.el.value);
      show(rule, msg);
      return !msg;
    };

    rules.forEach(function (rule) {
      if (rule.group) {
        form.querySelectorAll('input[name="' + rule.group + '"]').forEach(function (r) {
          r.addEventListener('change', function () { validate(rule); });
        });
      } else {
        rule.el.addEventListener('blur', function () { if (rule.el.value) validate(rule); });
        rule.el.addEventListener('input', function () { if (rule.el.hasAttribute('aria-invalid')) validate(rule); });
      }
    });

    var endpoint = form.getAttribute('data-endpoint') || '';
    var submit = form.querySelector('.form-submit');
    var failed = form.querySelector('.form-error');
    var label = submit.textContent;
    var sending = false;

    var finish = function (panel) {
      sending = false;
      submit.disabled = false;
      submit.removeAttribute('aria-busy');
      submit.textContent = label;
      panel.hidden = false;
      panel.focus();
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sending) return;
      var first = null;
      rules.forEach(function (rule) {
        if (!validate(rule) && !first) {
          first = rule.group ? form.querySelector('input[name="' + rule.group + '"]') : rule.el;
        }
      });
      done.hidden = true;
      failed.hidden = true;
      if (first) { first.focus(); return; }
      if (!endpoint || !window.fetch) { finish(failed); return; }

      // the relay (Google Apps Script, form-relay/) mails the form to the owner and answers {"ok": true}
      sending = true;
      submit.disabled = true;
      submit.setAttribute('aria-busy', 'true');
      submit.textContent = '送信しています…';
      var data = new URLSearchParams(new FormData(form));
      data.append('page', location.href);
      fetch(endpoint, { method: 'POST', body: data })
        .then(function (res) { return res.json(); })
        .then(function (res) {
          if (!res || res.ok !== true) throw new Error('not sent');
          form.reset();
          finish(done);
        })
        .catch(function () { finish(failed); });
    });
  }

  var items = document.querySelectorAll('[data-enter]');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (window.gsap && items.length && !reduce) {
    gsap.set(items, { opacity: 0, y: 18 });
    root.classList.remove('js-motion');
    gsap.to(items, { opacity: 1, y: 0, duration: 0.75, ease: 'power3.out', stagger: 0.08, delay: 0.1 });
  } else {
    root.classList.remove('js-motion');
  }
  window.__revealReady = true;
})();
