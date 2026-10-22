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
      d.body.classList.toggle('menu-open', open);
    };
    burger.addEventListener('click', function () { setMenu(!nav.classList.contains('is-open')); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  }

  /* Подменю «Продукция» в мобильном меню */
  $$('.sub-toggle').forEach(function (b) {
    b.addEventListener('click', function () {
      var open = b.closest('.has-sub').classList.toggle('is-open');
      b.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

  /* Карта по нажатию: виджет Яндекса тяжёлый, поэтому без клика не грузится */
  $$('[data-map]').forEach(function (b) {
    b.addEventListener('click', function () {
      var box = b.closest('.mapbox');
      var f = d.createElement('iframe');
      f.src = 'https://yandex.ru/map-widget/v1/?ol=biz&oid=' + box.dataset.oid;
      f.title = 'Завод на карте'; f.width = '100%'; f.height = '380'; f.style.cssText = 'border:0;display:block';
      f.referrerPolicy = 'no-referrer-when-downgrade';
      box.replaceWith(f);
    });
  });

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

  /* Форма заявки с арифметической проверкой */
  var startedAt = Date.now();
  function metrika(goal) {
    try { if (window.ym && window.__ymId) window.ym(window.__ymId, 'reachGoal', goal); } catch (e) {}
  }
  function loadCaptcha(form) {
    if (form._capBusy) return form._capBusy;
    var q = $('[data-cap-q]', form), ct = $('input[name=ct]', form), cap = $('input[name=cap]', form);
    if (!q || !ct || !cap) return Promise.resolve(false);
    if (window.__DEMO__) { /* демо-сборка: пример считается в браузере, сервера нет */
      var a = 3 + Math.floor(Math.random() * 15), b = 2 + Math.floor(Math.random() * 8);
      q.textContent = a + ' + ' + b; ct.value = 'demo'; cap.value = ''; form._capReady = true; form._demoAns = String(a + b);
      return Promise.resolve(true);
    }
    form._capBusy = fetch('/send.php?captcha=1', { cache: 'no-store', headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j || !j.q || !j.t) throw new Error('captcha');
        q.textContent = j.q; ct.value = j.t; cap.value = ''; form._capReady = true;
        return true;
      })
      .catch(function () { form._capReady = false; return false; })
      .then(function (ok) { form._capBusy = null; return ok; });
    return form._capBusy;
  }
  var ERR = {
    captcha_missing: 'Решите пример для проверки от роботов и отправьте форму снова.',
    captcha_bad: 'Ответ на пример не подошёл. Решите новый пример и отправьте форму снова.',
    captcha_expired: 'Пример устарел. Решите новый и отправьте форму снова.',
    too_fast: 'Форма отправилась слишком быстро. Подождите пару секунд и нажмите ещё раз.',
    rate: 'С вашего адреса пришло много заявок подряд. Позвоните нам: '
  };
  function bindForm(form) {
    var msg = $('.form__msg', form), btn = $('button[type=submit]', form);
    if (!msg.id) msg.id = 'fm' + Math.random().toString(36).slice(2, 8);
    var phone = $('input[name=phone]', form);
    var cap = $('input[name=cap]', form);
    var ts = $('input[name=ts]', form);
    if (ts) ts.value = String(startedAt);
    if (cap) cap.required = true;
    var warm = function () { loadCaptcha(form); form.removeEventListener('focusin', warm); form.removeEventListener('pointerdown', warm); };
    form.addEventListener('focusin', warm);
    form.addEventListener('pointerdown', warm);
    if ('IntersectionObserver' in window && !form.closest('template')) {
      var io = new IntersectionObserver(function (en) {
        if (en.some(function (x) { return x.isIntersecting; })) { io.disconnect(); warm(); }
      }, { rootMargin: '200px' });
      io.observe(form);
    }
    if (phone) {
      phone.addEventListener('input', function () {
        var v = phone.value.replace(/[^\d+]/g, '');
        if (/^8/.test(v)) v = '+7' + v.slice(1);
        if (/^7/.test(v)) v = '+' + v;
        phone.value = v.slice(0, 12);
      });
    }
    var again = $('[data-cap-new]', form);
    if (again) again.addEventListener('click', function () { loadCaptcha(form).then(function () { if (cap) cap.focus(); }); });
    var show = function (text, cls, field) {
      msg.textContent = text; msg.className = 'form__msg ' + cls;
      if (field) { field.setAttribute('aria-invalid', 'true'); field.setAttribute('aria-describedby', msg.id); field.focus(); }
    };
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      msg.className = 'form__msg';
      [phone, cap].forEach(function (f) { if (f) f.removeAttribute('aria-invalid'); });
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var digits = (phone.value.match(/\d/g) || []).length;
      if (digits < 10) { show('Проверьте номер телефона: нужно 10 цифр после +7.', 'is-err', phone); return; }
      var go = function () {
        if (window.__DEMO__) {
          if (cap.value.trim() !== form._demoAns) { show(ERR.captcha_bad, 'is-err', cap); loadCaptcha(form); return; }
          btn.disabled = true;
          setTimeout(function () {
            show('Демо: заявка принята, но никуда не отправлена. На боевом сайте она уйдёт на почту.', 'is-ok');
            form.reset(); loadCaptcha(form); btn.disabled = false;
          }, 500);
          return;
        }
        btn.disabled = true;
        var fd = new FormData(form);
        fd.set('ts', String(startedAt));
        fetch(form.action, { method: 'POST', body: fd, headers: { Accept: 'application/json' } })
          .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
          .then(function (res) {
            if (res.ok && res.j && res.j.ok) {
              show('Заявка отправлена. Мы свяжемся с вами по указанному номеру.', 'is-ok');
              form.reset(); if (ts) ts.value = String(Date.now());
              loadCaptcha(form);
              metrika('lead');
            } else {
              var code = (res.j && res.j.error) || 'fail';
              if (/^captcha/.test(code)) { show(ERR[code] || ERR.captcha_bad, 'is-err', cap); loadCaptcha(form); return; }
              if (code === 'too_fast') { show(ERR.too_fast, 'is-err'); return; }
              if (code === 'rate') { show(ERR.rate + (form.dataset.phone || '') + '.', 'is-err'); return; }
              throw new Error(code);
            }
          })
          .catch(function () { show('Не удалось отправить заявку. Позвоните нам: ' + (form.dataset.phone || '') + '.', 'is-err'); })
          .then(function () { btn.disabled = false; });
      };
      if (cap && !form._capReady) {
        btn.disabled = true;
        loadCaptcha(form).then(function (ok) {
          btn.disabled = false;
          if (ok) show('Решите пример для проверки от роботов и отправьте форму снова.', 'is-err', cap);
          else show('Не удалось загрузить проверочный пример. Позвоните нам: ' + (form.dataset.phone || '') + '.', 'is-err');
        });
        return;
      }
      go();
    });
  }
  $$('form[data-lead]').forEach(bindForm);

  /* Модальная форма (кнопки «Расчёт», «Получить расчёт», «Оставить заявку») */
  var tpl = $('#lead-template');
  var openers = $$('[data-open-lead], [data-order]');
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
      b.addEventListener('click', function (e) {
        if (b.hasAttribute('data-order')) e.preventDefault();
        var form = $('form', dlg);
        var vol = b.getAttribute('data-volume');
        if (vol && form.elements.volume) form.elements.volume.value = vol;
        var item = b.getAttribute('data-item'), itemField = form.elements.namedItem('item');
        if (item && itemField) itemField.value = item;
        if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
        loadCaptcha(form);
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
      if (b) b.setAttribute('data-volume', String(Math.max(vr, min)).replace('.', ',') + ' м³');
    });
  }

  /* Конфигуратор: выбор характеристик, поиск позиции прайса, расчёт стоимости.
     Разметка и первое состояние приходят готовыми (самая дешёвая позиция), здесь только переключение. */
  function initConfigurator(root) {
    var data = JSON.parse($('[data-cfg-data]', root).textContent);
    var rows = data.rows, ids = data.attrs.map(function (a) { return a.id; });
    var byKey = {};
    rows.forEach(function (r) { byKey[r.k] = r; });
    var cur = byKey[data.def];
    var out = function (n) { return $('[data-o="' + n + '"]', root); };
    var qtyEl = out('qty'), chg = out('chg'), lead = $('[data-open-lead]', root);
    var min = data.qty.min, step = data.qty.step;
    var NB = ' ';

    var group = function (n, dec) {
      var p = String(Math.round(n * 100) / 100).replace('.', ',').split(',');
      p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, NB);
      return p.join(',');
    };
    var money = function (n) { return group(Math.round(n)) + NB + '₽'; };
    var qty = function () {
      var v = parseFloat(String(qtyEl.value).replace(/[\s ]/g, '').replace(',', '.'));
      return isFinite(v) && v > 0 ? v : NaN;
    };
    var optOf = function (id, v) { return (data.opts[id] || []).filter(function (o) { return o.v === v; })[0]; };
    var textOf = function (id, v) { var o = optOf(id, v); return o ? o.t : v; };
    var labelOf = function (id) { return data.attrs.filter(function (a) { return a.id === id; })[0].label.toLowerCase(); };

    function render() {
      ids.forEach(function (id) {
        var g = $('[data-attr="' + id + '"]', root);
        $$('input', g).forEach(function (inp) {
          inp.checked = inp.value === cur.a[id];
          var ok = rows.some(function (r) {
            return r.a[id] === inp.value && ids.every(function (x) { return x === id || r.a[x] === cur.a[x]; });
          });
          var lab = inp.closest('.opt');
          lab.classList.toggle('is-na', !ok);
          var t = $('[data-na-t]', lab);
          if (t) t.textContent = ok ? '' : ' (нет с остальными выбранными параметрами)';
        });
        var hint = $('[data-hint="' + id + '"]', g), o = optOf(id, cur.a[id]);
        if (hint) hint.textContent = o ? o.h : '';
      });
      var des = out('des');
      des.firstChild.nodeValue = cur.l;
      out('sub').textContent = cur.s || '';
      out('price').textContent = money(cur.p);
      out('per').textContent = 'за ' + cur.u;
      var q = qty();
      out('total').textContent = isNaN(q) ? '—' : money(cur.p * q);
      out('mini-des').textContent = cur.l;
      out('mini-price').textContent = isNaN(q) ? money(cur.p) : money(cur.p * q);
      var vol = isNaN(q) ? '' : group(q) + NB + data.qty.unit;
      [lead].concat($$('.mbar [data-open-lead]')).forEach(function (b) {
        if (!b) return;
        b.setAttribute('data-item', cur.l);
        b.setAttribute('data-volume', vol);
      });
      $$('tr[data-k]').forEach(function (tr) { tr.classList.toggle('is-sel', tr.getAttribute('data-k') === cur.k); });
    }

    var chg2 = out('chg2');
    var say = function (t) { chg.textContent = t; if (chg2) chg2.textContent = t; };
    var uniq = function (a) { return a.filter(function (v, i) { return a.indexOf(v) === i; }); };

    function choose(id, val) {
      var prev = cur, best = null, bestScore = -1, note = '';
      var pool = rows.filter(function (r) { return r.a[id] === val; });
      /* Вид бетона не меняем молча: если значение есть у другого вида, объясняем, что случилось */
      if (ids.indexOf('cat') > -1 && id !== 'cat') {
        var same = pool.filter(function (r) { return r.a.cat === prev.a.cat; });
        if (same.length) pool = same;
        else {
          var cats = uniq(pool.map(function (r) { return r.a.cat; }));
          if (cats.length === 1) note = 'Значение «' + textOf(id, val) + '» есть только у вида «' + textOf('cat', cats[0]) + '», выбрали его. ';
          else {
            say(labelOf(id).charAt(0).toUpperCase() + labelOf(id).slice(1) + ' «' + textOf(id, val) + '» есть у видов: ' + cats.map(function (c) { return textOf('cat', c); }).join(', ') + '. Выбор не менялся: сначала выберите вид бетона.');
            render();
            return;
          }
        }
      }
      pool.forEach(function (r) {
        var s = 0;
        ids.forEach(function (x, i) { if (x !== id && r.a[x] === prev.a[x]) s += Math.pow(2, ids.length - i); });
        if (s > bestScore || (s === bestScore && r.p < best.p)) { best = r; bestScore = s; }
      });
      if (!best) return;
      cur = best;
      var changes = [];
      ids.forEach(function (x) {
        if (x !== id && prev.a[x] !== cur.a[x]) changes.push(labelOf(x) + ': с ' + textOf(x, prev.a[x]) + ' на ' + textOf(x, cur.a[x]));
      });
      say(note + (changes.length ? 'С выбранным значением нет прежнего сочетания, поэтому изменили: ' + changes.join('; ') + '.' : ''));
      try { history.replaceState(null, '', location.pathname + location.search + '#' + cur.k); } catch (e) {}
      render();
    }

    root.addEventListener('change', function (e) {
      var t = e.target;
      if (t.type === 'radio') choose(t.closest('[data-attr]').getAttribute('data-attr'), t.value);
      else if (t === qtyEl) {
        var q = qty();
        if (!isNaN(q) && q < min) { qtyEl.value = group(min); say('Минимальный заказ: ' + group(min) + NB + data.qty.unit + '.'); }
        else if (isNaN(q)) { qtyEl.value = group(data.qty.def); say('Введите число, например ' + group(data.qty.def) + '.'); }
        render();
      }
    });
    qtyEl.addEventListener('input', render);
    $$('[data-step]', root).forEach(function (b) {
      b.addEventListener('click', function () {
        var q = qty(); if (isNaN(q)) q = data.qty.def;
        var next = Math.round((q + parseFloat(b.getAttribute('data-step')) * step) * 100) / 100;
        if (next < min) { next = min; say('Минимальный заказ: ' + group(min) + NB + data.qty.unit + '.'); } else say('');
        qtyEl.value = group(next);
        render();
      });
    });

    var copy = $('[data-copy]', root);
    if (copy) {
      copy.hidden = false;
      copy.addEventListener('click', function () {
        var done = function () { say('Ссылка на этот выбор скопирована.'); };
        var fallback = function () {
          var ta = d.createElement('textarea'); ta.value = location.href; ta.setAttribute('readonly', '');
          ta.style.position = 'fixed'; ta.style.opacity = '0'; d.body.appendChild(ta); ta.select();
          try { d.execCommand('copy'); done(); } catch (e) { say('Скопируйте адрес страницы из строки браузера.'); }
          d.body.removeChild(ta);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(location.href).then(done, fallback); else fallback();
      });
    }

    var fromHash = function () {
      var k = decodeURIComponent(location.hash.slice(1));
      if (k && byKey[k] && byKey[k] !== cur) { cur = byKey[k]; render(); }
    };
    fromHash();
    addEventListener('hashchange', fromHash);
    render();
  }
  $$('[data-cfg]').forEach(initConfigurator);
})();
