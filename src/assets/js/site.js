/* Прогрессивное улучшение: контент и ссылки работают без JS. */
(function () {
  'use strict';
  var d = document;
  var $ = function (s, r) { return (r || d).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };

  /* Мобильное меню */
  var burger = $('.burger'), nav = $('#nav');
  if (burger && nav) {
    var setMenu = function (open) {
      nav.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.querySelector('use').setAttribute('href', burger.dataset.icons + (open ? '#i-close' : '#i-menu'));
    };
    burger.addEventListener('click', function () { setMenu(!nav.classList.contains('is-open')); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  }

  /* Раскрыть аккордеон/FAQ по якорю */
  function openByHash() {
    if (!location.hash) return;
    var el = d.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (!el) return;
    var det = el.tagName === 'DETAILS' ? el : el.closest('details');
    if (det) det.open = true;
  }
  openByHash();
  addEventListener('hashchange', openByHash);

  /* Форма заявки */
  var startedAt = Date.now();
  function metrika(goal) {
    try { if (window.ym && window.__ymId) window.ym(window.__ymId, 'reachGoal', goal); } catch (e) {}
  }
  function bindForm(form) {
    var msg = $('.form__msg', form), btn = $('button[type=submit]', form);
    var phone = $('input[name=phone]', form);
    var ts = $('input[name=ts]', form);
    if (ts) ts.value = String(startedAt);
    if (phone) {
      phone.addEventListener('input', function () {
        var v = phone.value.replace(/[^\d+]/g, '');
        if (/^8/.test(v)) v = '+7' + v.slice(1);
        if (/^7/.test(v)) v = '+' + v;
        phone.value = v.slice(0, 12);
      });
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      msg.className = 'form__msg';
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var digits = (phone.value.match(/\d/g) || []).length;
      if (digits < 10) { msg.textContent = 'Проверьте номер телефона: нужно 10 цифр после +7.'; msg.className = 'form__msg is-err'; phone.focus(); return; }
      btn.disabled = true;
      var fd = new FormData(form);
      fd.set('ts', String(startedAt));
      fetch(form.action, { method: 'POST', body: fd, headers: { Accept: 'application/json' } })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (res.ok && res.j && res.j.ok) {
            msg.textContent = 'Заявка отправлена. Мы свяжемся с вами по указанному номеру.';
            msg.className = 'form__msg is-ok';
            form.reset(); if (ts) ts.value = String(Date.now());
            metrika('lead');
          } else { throw new Error((res.j && res.j.error) || 'fail'); }
        })
        .catch(function () {
          msg.textContent = 'Не удалось отправить заявку. Позвоните нам: ' + (form.dataset.phone || '') + '.';
          msg.className = 'form__msg is-err';
        })
        .then(function () { btn.disabled = false; });
    });
  }
  $$('form[data-lead]').forEach(bindForm);

  /* Модальная форма (кнопка «Заявка» в мобильной панели и шапке) */
  var tpl = $('#lead-template');
  var openers = $$('[data-open-lead]');
  if (tpl && openers.length) {
    var dlg = d.createElement('dialog');
    dlg.className = 'modal';
    dlg.setAttribute('aria-label', 'Заявка на расчёт');
    dlg.innerHTML = '<button type="button" class="modal__x" aria-label="Закрыть"><svg class="i"><use href="' + tpl.dataset.icons + '#i-close"/></svg></button>' + tpl.innerHTML;
    d.body.appendChild(dlg);
    bindForm($('form', dlg));
    $('.modal__x', dlg).addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    openers.forEach(function (b) {
      b.removeAttribute('hidden');
      b.addEventListener('click', function () {
        var form = $('form', dlg);
        var vol = b.getAttribute('data-volume');
        if (vol && form.elements.volume) form.elements.volume.value = vol;
        var item = b.getAttribute('data-item');
        if (item && form.elements.item) form.elements.item.value = item;
        if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
        var p = form.elements.phone; if (p) p.focus();
      });
    });
  }

  /* Лайтбокс */
  var links = $$('a[data-lightbox]');
  if (links.length) {
    var lb = d.createElement('dialog');
    lb.className = 'lb';
    lb.setAttribute('aria-label', 'Просмотр фото');
    var ic = links[0].dataset.icons;
    lb.innerHTML = '<div class="lb__in"><img alt=""><div class="lb__cap"></div>' +
      '<button type="button" class="lb__btn lb__x" aria-label="Закрыть"><svg class="i"><use href="' + ic + '#i-close"/></svg></button>' +
      '<button type="button" class="lb__btn lb__p" aria-label="Предыдущее"><svg class="i"><use href="' + ic + '#i-left"/></svg></button>' +
      '<button type="button" class="lb__btn lb__n" aria-label="Следующее"><svg class="i"><use href="' + ic + '#i-right"/></svg></button></div>';
    d.body.appendChild(lb);
    var img = $('img', lb), cap = $('.lb__cap', lb), idx = 0;
    var show = function (i) {
      idx = (i + links.length) % links.length;
      var a = links[idx];
      img.src = a.getAttribute('href'); img.alt = a.dataset.alt || '';
      cap.textContent = a.dataset.caption || '';
    };
    links.forEach(function (a, i) {
      a.addEventListener('click', function (e) {
        e.preventDefault(); show(i);
        if (lb.showModal) lb.showModal(); else lb.setAttribute('open', '');
      });
    });
    $('.lb__x', lb).addEventListener('click', function () { lb.close(); });
    $('.lb__p', lb).addEventListener('click', function () { show(idx - 1); });
    $('.lb__n', lb).addEventListener('click', function () { show(idx + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target.classList.contains('lb__in')) lb.close(); });
    lb.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
    });
  }

  /* Калькулятор объёма */
  var calc = $('#calc');
  if (calc) {
    var out = $('.calc__out', calc);
    var min = parseFloat(calc.dataset.min || '1');
    var num = function (n) { return String(Math.round(n * 100) / 100).replace('.', ','); };
    calc.addEventListener('submit', function (e) {
      e.preventDefault();
      var l = parseFloat(calc.elements.l.value.replace(',', '.')),
        w = parseFloat(calc.elements.w.value.replace(',', '.')),
        t = parseFloat(calc.elements.t.value.replace(',', '.'));
      if (!(l > 0 && w > 0 && t > 0)) { out.hidden = false; out.textContent = 'Введите три размера в метрах, например 10, 6 и 0,3.'; return; }
      var v = l * w * t, vr = Math.ceil(v * 1.05 * 10) / 10;
      out.hidden = false;
      out.innerHTML = 'Объём по размерам: <b>' + num(v) + ' м³</b>. С запасом 5% на потери и неровности основания: <b>' + num(vr) + ' м³</b>.' +
        (vr < min ? ' Минимальный заказ ' + num(min) + ' м³.' : '');
      var b = $('[data-open-lead]', calc);
      if (b) b.setAttribute('data-volume', String(Math.max(vr, min)).replace('.', ','));
    });
  }
})();
