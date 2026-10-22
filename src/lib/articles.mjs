// Статьи: content/articles/*.md → HTML. Цены в тексте подставляются из прайса, поэтому совпадают с таблицами и датой прайса.
// Формат файла: блок «---» с полями slug, title, description, lead, date (ГГГГ-ММ-ДД), photo, затем текст в Markdown:
//   ## Заголовок, ### Подзаголовок, абзацы, списки («- » и «1. »), цитата («> »), **жирный**, _курсив_, [ссылка](/путь/ или https://...)
//   {{price категория марка}}   минимальная цена марки в категории, «4 400 ₽/м³»
//   {{cost категория марка объём}}   цена × объём, «66 880 ₽»
//   {{delta категория-А категория-Б марка}}   разница минимальных цен, «600 ₽»
//   {{diff категория маркаА маркаБ}}   разница минимальных цен двух марок
//   {{pmdprice марка температура}}   минимальная цена бетона с ПМД, например {{pmdprice М300 -15}}
//   {{rent Название позиции из аренды}}   цена из rental.json, «6 000 ₽/час»
//   {{rowprice категория марка П4 F150}}   минимальная цена марки среди строк с указанными П, F, W
//   {{rowcost категория марка объём П3}}   та же цена × объём
//   {{item категория Название позиции}}   цена позиции раствора или ЦПС, «4 600 ₽/м³»
//   {{itemcost категория объём Название позиции}}   цена позиции × объём
//   {{rebar диаметр}}, {{rebarcost диаметр тонны}}   арматура А500С: цена за тонну и стоимость массы
//   {{from категория}}, {{date}}, {{min}}, {{phone}}, {{docs}}, {{address}}
//   ::table категория М200,М250 | Заголовок   таблица цен (марка, класс, параметры из прайса, цена «от»)
//   ::pmd М250,М300 | Заголовок   цены бетона с ПМД по температурам рядом с товарным бетоном
//   ::rental | Заголовок   таблица автобетононасосов
//   ::list категория | Заголовок   все позиции раствора или ЦПС: название, назначение, цена
// Статья с датой позже даты сборки не попадает на сайт: так раздел остаётся «живым» без ручной публикации.
import fs from 'node:fs';
import path from 'node:path';
import { esc, fmtNum, NBSP, dateRu, isoDate, normMark, nb } from './util.mjs';
import { slugify } from './configurator.mjs';
import { markNum } from './marks.mjs';
import { span, mobSpan } from '../pages/copy.mjs';

const FIELDS = ['slug', 'title', 'description', 'lead', 'date', 'photo'];

function parseFront(src, file) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) throw new Error(`${file}: нет блока с полями в начале файла`);
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  for (const f of FIELDS) if (!meta[f]) throw new Error(`${file}: не заполнено поле ${f}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.date)) throw new Error(`${file}: date должна быть вида ГГГГ-ММ-ДД`);
  if (!/^[a-z0-9-]+$/.test(meta.slug)) throw new Error(`${file}: slug только из латиницы, цифр и дефиса`);
  return { meta, body: m[2] };
}

const minPrice = (rows) => Math.min(...rows.map((r) => r.price));

function lookup(ctx, catSlug, mark, where) {
  const cat = ctx.categories.find((c) => c.slug === catSlug);
  if (!cat) throw new Error(`${where}: нет категории ${catSlug}`);
  const m = normMark(mark);
  const rows = cat.rows.filter((r) => r.mark === m);
  if (!rows.length) throw new Error(`${where}: в категории ${catSlug} нет марки ${m}`);
  return { cat, rows, mark: m };
}

function tokens(ctx, s, where) {
  return s.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (all, expr) => {
    const [fn, ...a] = expr.split(/\s+/);
    if (fn === 'date') return ctx.priceDateRu;
    if (fn === 'phone') return ctx.site.phone.display;
    if (fn === 'address') return ctx.site.plant.address;
    if (fn === 'docs') return ctx.site.documents.join(' и ');
    if (fn === 'diff') {
      const x = minPrice(lookup(ctx, a[0], a[1], where).rows), y = minPrice(lookup(ctx, a[0], a[2], where).rows);
      return `${fmtNum(Math.abs(x - y))}${NBSP}₽`;
    }
    if (fn === 'pmdprice') {
      const t = Number(String(a[1]).replace('\u2212', '-'));
      const rows = lookup(ctx, 'beton-s-pmd', a[0], where).rows.filter((r) => r.pmd === t);
      if (!rows.length) throw new Error(`${where}: нет бетона ${a[0]} с ПМД ${t}`);
      return `${fmtNum(minPrice(rows))}${NBSP}₽/м³`;
    }
    if (fn === 'rent') {
      const name = a.join(' ');
      const u = [...(ctx.rental?.units ?? []), ...(ctx.rental?.extras ?? [])].find((x) => x.name === name);
      if (!u) throw new Error(`${where}: нет позиции аренды «${name}»`);
      return `${fmtNum(u.price)}${NBSP}₽/${u.unit}`;
    }
    if (fn === 'rowprice') {
      const { rows, mark } = lookup(ctx, a[0], a[1], where);
      const want = a.slice(2);
      const hit = rows.filter((r) => want.every((v) => [r.mobility, r.frost, r.water].includes(v)));
      if (!hit.length) throw new Error(`${where}: нет строки ${a[0]} ${mark} ${want.join(' ')}`);
      return `${fmtNum(minPrice(hit))}${NBSP}₽/м³`;
    }
    if (fn === 'rowcost') {
      const { rows, mark } = lookup(ctx, a[0], a[1], where);
      const v = parseFloat(String(a[2]).replace(',', '.'));
      const want = a.slice(3);
      const hit = rows.filter((r) => want.every((x) => [r.mobility, r.frost, r.water].includes(x)));
      if (!hit.length || !(v > 0)) throw new Error(`${where}: {{${expr}}}`);
      return `${fmtNum(Math.round(minPrice(hit) * v))}${NBSP}₽`;
    }
    if (fn === 'item' || fn === 'itemcost') {
      const cat = ctx.categories.find((c) => c.slug === a[0]);
      const vol = fn === 'itemcost' ? parseFloat(String(a[1]).replace(',', '.')) : 1;
      const name = a.slice(fn === 'itemcost' ? 2 : 1).join(' ');
      const r = cat?.rows.find((x) => x.name === name);
      if (!r) throw new Error(`${where}: нет позиции «${name}» в ${a[0]}`);
      return fn === 'item' ? `${fmtNum(r.price)}${NBSP}₽/${r.unit}` : `${fmtNum(Math.round(r.price * vol))}${NBSP}₽`;
    }
    if (fn === 'rebar' || fn === 'rebarcost') {
      const cat = ctx.categories.find((c) => c.kind === 'rebar');
      const r = cat?.rows.find((x) => x.diameter === Number(a[0]) && /А500С/.test(x.group ?? x.name));
      if (!r) throw new Error(`${where}: нет арматуры А500С диаметром ${a[0]} мм`);
      if (fn === 'rebar') return `${fmtNum(r.price)}${NBSP}₽/т`;
      return `${fmtNum(Math.round(r.price * parseFloat(String(a[1]).replace(',', '.'))))}${NBSP}₽`;
    }
    if (fn === 'min') return `${fmtNum(ctx.site.min_volume_m3)}${NBSP}м³`;
    if (fn === 'from') {
      const cat = ctx.categories.find((c) => c.slug === a[0]);
      if (!cat) throw new Error(`${where}: нет категории ${a[0]}`);
      return `${fmtNum(minPrice(cat.rows))}${NBSP}₽`;
    }
    if (fn === 'price') { const { rows } = lookup(ctx, a[0], a[1], where); return `${fmtNum(minPrice(rows))}${NBSP}₽/м³`; }
    if (fn === 'cost') {
      const { rows } = lookup(ctx, a[0], a[1], where);
      const v = parseFloat(String(a[2]).replace(',', '.'));
      if (!(v > 0)) throw new Error(`${where}: объём в {{${expr}}}`);
      return `${fmtNum(Math.round(minPrice(rows) * v))}${NBSP}₽`;
    }
    if (fn === 'delta') {
      const x = minPrice(lookup(ctx, a[0], a[2], where).rows), y = minPrice(lookup(ctx, a[1], a[2], where).rows);
      return `${fmtNum(Math.abs(x - y))}${NBSP}₽`;
    }
    throw new Error(`${where}: неизвестная подстановка {{${expr}}}`);
  });
}

function inline(ctx, s, where) {
  s = esc(nb(tokens(ctx, s, where)));
  s = s.replace(/\[([^\]]+)\]\(((?:\/|https:\/\/)[^)\s]*)\)/g, (m, t, u) => `<a href="${u}">${t}</a>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  s = s.replace(/(^|[\s(])_([^_]+)_(?=[\s).,;:!?]|$)/g, '$1<i>$2</i>');
  return s;
}

const callout = (ctx, title, tableHtml, note) => `<div class="callout"><p class="callout__t">${esc(title)}</p><p class="callout__d">Актуально на <time datetime="${ctx.priceDateIso}">${ctx.priceDateRu}</time>. Цена за 1${NBSP}м³, доставка считается по адресу.</p>${tableHtml}${note ? `<p class="callout__d">${note}</p>` : ''}</div>`;

function directive(ctx, line, where) {
  const [head, titleRaw] = line.slice(2).split('|').map((x) => x.trim());
  const [name, ...a] = head.split(/\s+/);
  const title = titleRaw || '';
  if (name === 'table') {
    const cat = ctx.categories.find((c) => c.slug === a[0]);
    if (!cat) throw new Error(`${where}: нет категории ${a[0]}`);
    const marks = a[1].split(',').map(normMark).sort((x, y) => markNum(x) - markNum(y));
    const body = marks.map((m) => {
      const rows = cat.rows.filter((r) => r.mark === m);
      if (!rows.length) throw new Error(`${where}: в ${a[0]} нет марки ${m}`);
      return { m, cls: rows[0].cls, mob: mobSpan(rows), frost: span(rows.map((r) => r.frost), 'F'), water: span(rows.map((r) => r.water), 'W'), p: minPrice(rows), many: rows.length > 1 };
    });
    const has = (k) => body.some((b) => b[k]);
    const th = `<tr><th>Марка</th><th>Класс</th>${has('mob') ? '<th>Подвижность</th>' : ''}${has('frost') ? '<th>Морозостойкость</th>' : ''}${has('water') ? '<th>Водонепроницаемость</th>' : ''}<th>Цена${body.some((b) => b.many) ? ' от' : ''}</th></tr>`;
    const tr = body.map((b) => `<tr><td>${b.m}</td><td>${b.cls}</td>${has('mob') ? `<td>${b.mob ?? '—'}</td>` : ''}${has('frost') ? `<td>${b.frost ?? '—'}</td>` : ''}${has('water') ? `<td>${b.water ?? '—'}</td>` : ''}<td>${fmtNum(b.p)}${NBSP}₽</td></tr>`).join('');
    return callout(ctx, title || cat.menu, `<table><thead>${th}</thead><tbody>${tr}</tbody></table>`, `Все позиции раздела: <a href="/catalog/${cat.slug}/">${esc(cat.menu)}</a>.`);
  }
  if (name === 'pmd') {
    const pmd = ctx.categories.find((c) => c.slug === 'beton-s-pmd');
    const base = ctx.mainConcrete;
    if (!pmd) throw new Error(`${where}: нет категории beton-s-pmd`);
    const temps = [...new Set(pmd.rows.map((r) => r.pmd))].sort((x, y) => Math.abs(x) - Math.abs(y));
    const marks = a[0].split(',').map(normMark).sort((x, y) => markNum(x) - markNum(y));
    const th = `<tr><th>Марка</th><th>Без добавки</th>${temps.map((t) => `<th>ПМД до −${Math.abs(t)}${NBSP}°C</th>`).join('')}</tr>`;
    const tr = marks.map((m) => {
      const b = base.rows.filter((r) => r.mark === m);
      const cells = temps.map((t) => { const rows = pmd.rows.filter((r) => r.mark === m && r.pmd === t); return `<td>${rows.length ? `${fmtNum(minPrice(rows))}${NBSP}₽` : '—'}</td>`; }).join('');
      return `<tr><td>${m}</td><td>${b.length ? `${fmtNum(minPrice(b))}${NBSP}₽` : '—'}</td>${cells}</tr>`;
    }).join('');
    return callout(ctx, title || 'Бетон с ПМД', `<table><thead>${th}</thead><tbody>${tr}</tbody></table>`, `В графах с ПМД показана минимальная цена среди позиций марки: подвижность, морозостойкость и водонепроницаемость выбираются в <a href="/catalog/beton-s-pmd/">разделе с ПМД</a>.`);
  }
  if (name === 'list') {
    const cat = ctx.categories.find((c) => c.slug === a[0]);
    if (!cat || cat.kind !== 'mortar') throw new Error(`${where}: ::list только для растворов и ЦПС`);
    const tr = cat.rows.map((r) => `<tr><td>${esc(r.name)}</td><td>${esc(r.spec ?? '—')}</td><td>${fmtNum(r.price)}${NBSP}₽</td></tr>`).join('');
    return callout(ctx, title || cat.menu, `<table><thead><tr><th>Состав</th><th>Для чего</th><th>Цена</th></tr></thead><tbody>${tr}</tbody></table>`, `Подбор и расчёт объёма: <a href="/catalog/${cat.slug}/">${esc(cat.menu)}</a>.`);
  }
  if (name === 'rental') {
    if (!ctx.rental) throw new Error(`${where}: в данных нет аренды`);
    const tr = ctx.rental.units.map((u) => `<tr><td>${esc(u.name)}</td><td>${esc(u.reach_text ?? '—')}</td><td>${fmtNum(u.price)}${NBSP}₽/${esc(u.unit)}</td></tr>`).join('');
    return `<div class="callout"><p class="callout__t">${esc(title || 'Аренда автобетононасоса')}</p><p class="callout__d">Актуально на <time datetime="${ctx.priceDateIso}">${ctx.priceDateRu}</time>.</p><table><thead><tr><th>Насос</th><th>Вылет стрелы</th><th>Цена</th></tr></thead><tbody>${tr}</tbody></table><p class="callout__d">Подбор по вылету и расчёт по часам: <a href="/catalog/arenda-abn/">аренда автобетононасоса</a>.</p></div>`;
  }
  throw new Error(`${where}: неизвестная директива ::${name}`);
}

export function renderMarkdown(ctx, body, where) {
  const blocks = body.replace(/\r/g, '').trim().split(/\n{2,}/);
  const out = [], toc = [];
  const used = new Set();
  for (const raw0 of blocks) {
    const b = raw0.trim();
    if (!b) continue;
    if (b.startsWith('::')) { out.push(directive(ctx, b, where)); continue; }
    let m;
    if ((m = b.match(/^(#{2,3})\s+(.+)$/))) {
      const level = m[1].length, text = m[2].trim();
      let id = slugify(text).slice(0, 48) || `s${out.length}`;
      while (used.has(id)) id += '-2';
      used.add(id);
      if (level === 2) toc.push({ id, text });
      out.push(`<h${level} id="${id}">${inline(ctx, text, where)}</h${level}>`);
      continue;
    }
    const lines = b.split('\n');
    if (lines.every((l) => /^- /.test(l))) { out.push(`<ul class="checks">${lines.map((l) => `<li>${inline(ctx, l.slice(2), where)}</li>`).join('')}</ul>`); continue; }
    if (lines.every((l) => /^\d+\.\s/.test(l))) { out.push(`<ol>${lines.map((l) => `<li>${inline(ctx, l.replace(/^\d+\.\s/, ''), where)}</li>`).join('')}</ol>`); continue; }
    if (lines.every((l) => /^>/.test(l))) { out.push(`<blockquote><p>${inline(ctx, lines.map((l) => l.replace(/^>\s?/, '')).join(' '), where)}</p></blockquote>`); continue; }
    out.push(`<p>${inline(ctx, lines.join(' '), where)}</p>`);
  }
  return { html: out.join('\n'), toc };
}

export function loadArticles(ctx, dir) {
  if (!fs.existsSync(dir)) return [];
  const list = [];
  const slugs = new Set();
  const files = fs.readdirSync(dir).filter((x) => x.endsWith('.md')).sort();
  for (const f of files) {
    const { meta, body } = parseFront(fs.readFileSync(path.join(dir, f), 'utf8'), f);
    if (slugs.has(meta.slug)) throw new Error(`${f}: повторяющийся slug ${meta.slug}`);
    slugs.add(meta.slug);
    const date = new Date(`${meta.date}T00:00:00Z`);
    if (date > ctx.now) continue; // запланирована: появится при сборке после этой даты
    if (!ctx.photos.some((p) => p.file === meta.photo)) throw new Error(`${f}: фото ${meta.photo} нет в photos.json`);
    const { html, toc } = renderMarkdown(ctx, body, f);
    const words = body.replace(/\{\{[^}]*\}\}|::.*|[#>*_\[\]()-]/g, ' ').split(/\s+/).filter(Boolean).length;
    list.push({
      ...meta, order: files.indexOf(f), related: (meta.related ?? '').split(',').map((x) => x.trim()).filter(Boolean), url: `/stati/${meta.slug}/`, dateRu: dateRu(date), html, toc, words,
      minutes: Math.max(1, Math.round(words / 180)),
      modified: isoDate(date > ctx.priceDate ? date : ctx.priceDate)
    });
  }
  const have = new Set(list.map((x) => x.slug));
  for (const x of list) {
    for (const m of x.html.matchAll(/href="\/stati\/([a-z0-9-]+)\/"/g)) {
      if (!have.has(m[1])) throw new Error(`${x.slug}: ссылка на статью ${m[1]}, которой нет среди опубликованных (дата позже сборки или опечатка)`);
    }
  }
  for (const x of list) for (const r of x.related) if (!have.has(r)) throw new Error(`${x.slug}: в related статья ${r}, которой нет среди опубликованных`);
  // свежие сверху; в один день — в порядке файлов, от первой статьи к последней
  return list.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.order - b.order));
}
