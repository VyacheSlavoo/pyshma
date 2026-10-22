// Общие блоки страницы: head, шапка, футер, формы, таблицы цен, FAQ, картинки.
import { h, raw, join, esc, NBSP, fmtNum, markSlug } from './util.mjs';
import { CONCRETE_KINDS } from './categories.mjs';
import { rowKeyFor, concreteLabel } from './configurator.mjs';

export const HOURS_TEXT = 'Работаем 24/7';
export const HOURS_FULL = 'Приём заявок, производство, отгрузка и доставка — круглосуточно, 24/7';

export const icon = (ctx, name, cls = '') => h`<svg class="i ${cls}" aria-hidden="true" focusable="false"><use href="${ctx.assets.icons}#i-${name}"/></svg>`;

export const telHref = (ctx) => `tel:${ctx.site.phone.e164}`;

export const minVolText = (ctx) => `${fmtNum(ctx.site.min_volume_m3)}${NBSP}м³`;

const MESS_LABEL = { telegram: 'Telegram', whatsapp: 'WhatsApp', max: 'MAX', viber: 'Viber' };
const MESS_ICON = { telegram: 'send', whatsapp: 'chat', max: 'chat', viber: 'chat' };
export const messengers = (ctx) => (ctx.site.messengers || []).map((m) => ({ ...m, label: MESS_LABEL[m.type], icon: MESS_ICON[m.type] }));

// ---------- картинки ----------
export function img(ctx, file, { sizes = '100vw', eager = false, cls = '', alt } = {}) {
  const im = ctx.images.get(file);
  if (!im) throw new Error(`нет обработанного фото ${file}`);
  const srcset = im.variants.map((v) => `${v.url} ${v.w}w`).join(', ');
  const mid = im.variants[Math.min(1, im.variants.length - 1)];
  return h`<img src="${mid.url}" srcset="${srcset}" sizes="${sizes}" width="${im.w}" height="${im.h}" alt="${alt ?? im.alt}" ${raw(eager ? 'fetchpriority="high" decoding="async"' : 'loading="lazy" decoding="async"')}${cls ? raw(` class="${esc(cls)}"`) : ''}>`;
}

// ---------- head ----------
export function head(ctx, page) {
  const { site } = ctx;
  const canonical = ctx.origin + page.url;
  const noindex = page.noindex || ctx.fixture || ctx.preview || ctx.demo;
  const ogImg = ctx.origin + (page.ogImage || ctx.assets.og);
  const ld = (page.jsonld || []).filter(Boolean);
  return h`<!doctype html>
<html lang="ru" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${page.title}</title>
<meta name="description" content="${page.description}">
${page.url === '/404.html' ? '' : h`<link rel="canonical" href="${canonical}">`}
${noindex ? raw(`<meta name="robots" content="noindex, ${ctx.fixture || ctx.preview || ctx.demo ? 'nofollow' : 'follow'}">`) : raw('<meta name="robots" content="index, follow, max-image-preview:large">')}
<meta name="theme-color" content="#FFFFFF">
<meta property="og:type" content="${page.ogType || 'website'}">
<meta property="og:locale" content="ru_RU">
<meta property="og:site_name" content="${site.brand}">
<meta property="og:title" content="${page.ogTitle || page.title}">
<meta property="og:description" content="${page.description}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${ogImg}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${page.ogTitle || page.title}">
<meta name="twitter:description" content="${page.description}">
<meta name="twitter:image" content="${ogImg}">
<link rel="icon" href="${ctx.assets.favicon}" type="image/svg+xml">
<link rel="apple-touch-icon" href="${ctx.assets.touch}">
${site.yandex_verification ? raw(`<meta name="yandex-verification" content="${esc(site.yandex_verification)}">`) : ''}
<link rel="preload" href="/assets/fonts/plex-cyrillic-wdth.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/plex-latin-wdth.woff2" as="font" type="font/woff2" crossorigin>

<link rel="stylesheet" href="${ctx.assets.css}">
<script>document.documentElement.className='js'${ctx.demo ? raw(';window.__DEMO__=1') : ''}</script>
${join(ld.map((o) => raw(`<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`)), '\n')}
</head>`;
}

// ---------- навигация ----------
export function navItems(ctx) {
  const groups = new Map();
  for (const c of ctx.categories) {
    if (!groups.has(c.group)) groups.set(c.group, []);
    groups.get(c.group).push({ name: c.menu, url: `/catalog/${c.slug}/`, from: Math.min(...c.rows.map((r) => r.price)) });
  }
  if (ctx.rental) {
    if (!groups.has(ctx.rental.group)) groups.set(ctx.rental.group, []);
    groups.get(ctx.rental.group).push({ name: 'Аренда автобетононасоса', url: '/catalog/arenda-abn/', from: Math.min(...ctx.rental.units.map((u) => u.price)) });
  }
  const items = [{ name: 'Прайс-лист', url: '/price/' }];
  items.push({ name: 'Продукция', url: '/price/#cards', sub: [...groups].map(([title, links]) => ({ title, links })), mega: true });
  items.push({ name: 'Доставка', url: '/dostavka/' });
  if (ctx.articles?.length) items.push({ name: 'Статьи', url: '/stati/' });
  items.push({ name: 'О заводе', url: '/about/' });
  items.push({ name: 'Контакты', url: '/contacts/' });
  return items;
}

function navHtml(ctx, page) {
  const cur = (u) => (page.url === u || (u.startsWith('/catalog/') && page.url.startsWith(u)) || (u === '/stati/' && page.url.startsWith(u)) ? 'page' : null);
  return join(navItems(ctx).map((it) => h`<li${it.sub ? raw(' class="has-sub"') : ''}>
<a class="nav__link" href="${it.url}"${cur(it.url) && !it.sub ? raw(' aria-current="page"') : it.sub && page.url.startsWith('/catalog/') ? raw(' aria-current="true"') : ''}>${it.name}${it.sub ? icon(ctx, 'chev') : ''}</a>${it.sub ? h`<button type="button" class="sub-toggle" aria-expanded="false" aria-label="Показать разделы продукции">${icon(ctx, 'chev')}</button>` : ''}
${it.sub ? h`<div class="sub sub--mega">${join(it.sub.map((g) => h`<div class="sub__col"><span class="sub__h">${g.title}</span><ul>${join(g.links.map((l) => h`<li><a href="${l.url}"${cur(l.url) ? raw(' aria-current="page"') : ''}>${l.name}${l.from ? h`<small>от ${fmtNum(l.from)}</small>` : ''}</a></li>`))}</ul></div>`))}</div>` : ''}
</li>`));
}

export const brandHtml = (ctx, sub) => h`<span class="brand__mark" aria-hidden="true">${icon(ctx, 'mark')}</span><span class="brand__t"><b>${ctx.site.brand}</b>${sub}</span>`;

export function header(ctx, page) {
  const { site } = ctx;
  return h`<a class="skip" href="#main">К содержимому</a>
${ctx.fixture ? h`<div class="fixture-banner">ТЕСТОВЫЕ ДАННЫЕ: сборка для проверки вёрстки, не для публикации</div>` : ''}
${ctx.demo ? h`<div class="fixture-banner fixture-banner--preview">ДЕМО ДЛЯ ТЕСТИРОВАНИЯ: заявки никуда не отправляются, почта не подключена. Не для публикации</div>` : ''}
${ctx.preview ? h`<div class="fixture-banner fixture-banner--preview">ПРЕДПРОСМОТР: не для публикации. Не заполнено, подставлено временно: ${ctx.assumed.join(', ') || 'ничего'}</div>` : ''}
<header class="hdr"><div class="container hdr__in">
<a class="brand" href="/" aria-label="${site.brand}: на главную">${brandHtml(ctx, h`<small class="brand__sub">Бетонный завод, ${site.plant.locality}</small><small class="brand__hrs">${HOURS_TEXT}</small>`)}</a>
<nav class="nav" id="nav" aria-label="Основное меню"><ul class="nav__list">${navHtml(ctx, page)}</ul></nav>
<div class="hdr__r">
<a class="hdr__tel" href="${telHref(ctx)}"><b>${icon(ctx, 'phone')}${site.phone.display}</b><small>${HOURS_TEXT}</small></a>
<a class="btn btn--primary btn--sm" href="${String(page.main ?? '').includes('id="zayavka"') ? '#zayavka' : '/contacts/#zayavka'}" data-order>Заявка</a>
</div>
<a class="btn btn--primary btn--sm callbtn" href="${telHref(ctx)}" aria-label="Позвонить ${site.phone.display}">${icon(ctx, 'phone')}<span class="callbtn__t">Позвонить</span></a>
<button class="burger" type="button" aria-controls="nav" aria-expanded="false" aria-label="Меню" data-icons="${ctx.assets.icons}"><svg class="i" aria-hidden="true"><use href="${ctx.assets.icons}#i-menu"/></svg></button>
</div></header>`;
}

export function mobileBar(ctx) {
  return h`<div class="mbar">
<a class="btn btn--primary" href="${telHref(ctx)}">${icon(ctx, 'phone')}Позвонить</a>
<button type="button" class="btn btn--ghost js-only" data-open-lead hidden>Расчёт</button>
</div>`;
}

export function footer(ctx) {
  const { site } = ctx;
  const year = ctx.now.getUTCFullYear();
  const cats = ctx.categories.map((c) => h`<li><a href="/catalog/${c.slug}/">${c.menu}</a></li>`);
  if (ctx.rental) cats.push(h`<li><a href="/catalog/arenda-abn/">Аренда автобетононасоса</a></li>`);
  const marks = ctx.markPages.map((m) => h`<li><a href="/catalog/${ctx.mainConcrete.slug}/${markSlug(m)}/">Бетон ${m}</a></li>`);
  const cities = ctx.cities.filter((c) => c.tier === 'city');
  return h`<footer class="ftr"><div class="container">
<div class="ftr__grid">
<div>
<a class="brand" href="/">${brandHtml(ctx, h`<small>Бетонный завод ${site.plant.locality_in}</small>`)}</a>
<p>${site.plant.address}.<br>${HOURS_FULL}.</p>
<p><a class="ftr__phone" href="${telHref(ctx)}">${site.phone.display}</a></p>
</div>
<div><p class="ftr__h">Цены и продукция</p><ul class="cols"><li><a href="/price/">Прайс-лист</a></li>${join(cats)}${join(marks)}</ul></div>
<div><p class="ftr__h">Информация</p><ul><li><a href="/dostavka/">Доставка</a></li>${join(cities.map((c) => h`<li><a href="${c.url}">Бетон ${c.in}</a></li>`))}${ctx.articles?.length ? h`<li><a href="/stati/">Статьи</a></li>` : ''}<li><a href="/about/">О заводе</a></li>${ctx.gallery ? h`<li><a href="/gallery/">Фото</a></li>` : ''}<li><a href="/contacts/">Контакты</a></li>${site.main_site ? h`<li><a href="${site.main_site.url}">Общий сайт: ${site.main_site.name}</a></li>` : ''}<li><a href="/privacy/">Политика конфиденциальности</a></li><li><a href="/soglasie/">Согласие на обработку данных</a></li></ul></div>
<div><p class="ftr__h">Контакты</p><ul>
<li>${site.plant.address}</li>
<li>${HOURS_TEXT}</li>
${site.email_public ? h`<li><a href="mailto:${site.email_public}">${site.email_public}</a></li>` : ''}
${join(messengers(ctx).map((m) => h`<li><a href="${m.url}" rel="noopener" target="_blank">${m.label}</a></li>`))}
<li><a href="${site.plant.yandex_url}" rel="noopener" target="_blank">Завод на Яндекс Картах: отзывы и маршрут</a></li>
</ul></div>
</div>
<div class="ftr__bar"><span>© ${year} ${site.brand}${site.signature && !ctx.fixture ? `. ${site.signature}` : ''}</span><span>Цены актуальны на ${ctx.priceDateRu}. Информация на сайте не является публичной офертой (ст. 437 ГК РФ)</span></div>
</div></footer>`;
}

// ---------- формы ----------
const consentHtml = (ctx) => h`<label class="consent"><input type="checkbox" name="consent" value="1" required><span>Согласен на <a href="/soglasie/" target="_blank">обработку персональных данных</a> и с <a href="/privacy/" target="_blank">политикой конфиденциальности</a></span></label>`;
const honey = (source) => h`<div class="hp" aria-hidden="true"><label>Сайт<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
<input type="hidden" name="ts" value="">
<input type="hidden" name="source" value="${source}">`;
// Арифметическая проверка: пример и подписанный токен приходят с сервера (send.php?captcha=1), ответ проверяется на сервере.
const captchaHtml = (ctx) => h`<div class="cap"><label class="field"><span>Проверка от роботов: сколько будет <b class="cap__q" data-cap-q>…</b>?</span><input type="text" name="cap" inputmode="numeric" autocomplete="off" maxlength="3" placeholder="ответ"></label><button type="button" class="cap__re" data-cap-new aria-label="Другой пример" title="Другой пример">${icon(ctx, 'refresh')}</button>
<input type="hidden" name="ct" value=""></div>`;
const noJsNote = (ctx) => h`<p class="nojs-note">Форма работает с включённым JavaScript. Без него позвоните: <a href="${telHref(ctx)}">${ctx.site.phone.display}</a>.</p>`;

export function leadForm(ctx, { title = 'Оставить заявку', sub = null, source = 'site', item = null, compact = false, tag = 'h2', id = null } = {}) {
  const hd = tag === 'h2' ? h`<h2>${title}</h2>` : h`<h3>${title}</h3>`;
  const m = messengers(ctx);
  return h`<div class="form"${id ? raw(` id="${esc(id)}"`) : ''}>
<p class="eyebrow">Заявка</p>
${hd}
<p class="form__sub">${sub ?? 'Оставьте телефон, объём и адрес объекта. Перезвоним и назовём стоимость с доставкой.'}</p>
<form action="/send.php" method="post" data-lead data-phone="${ctx.site.phone.display}" novalidate>
${noJsNote(ctx)}
<div class="fgrid">
<label class="field${compact ? ' field--full' : ''}"><span>Телефон</span><input type="tel" name="phone" inputmode="tel" autocomplete="tel" placeholder="+7" required maxlength="18"></label>
${compact ? '' : h`<label class="field"><span>Объём</span><input type="text" name="volume" inputmode="decimal" placeholder="от ${fmtNum(ctx.site.min_volume_m3)} м³" maxlength="24"></label>
<label class="field"><span>Что заказать</span><input type="text" name="item" value="${item ?? ''}" placeholder="например, бетон М300" maxlength="120"></label>
<label class="field"><span>Адрес доставки</span><input type="text" name="address" autocomplete="street-address" placeholder="город, улица или СНТ" maxlength="200"></label>`}
</div>
${captchaHtml(ctx)}
${honey(source)}
${consentHtml(ctx)}
<button class="btn btn--primary btn--block" type="submit">Отправить заявку</button>
<div class="form__msg" role="status" aria-live="polite"></div>
</form>
${m.length ? h`<div class="form__alt">${m.map((x) => h`<a class="btn btn--ghost btn--sm" href="${x.url}" rel="noopener" target="_blank">${icon(ctx, x.icon)}${x.label}</a>`)}</div>` : ''}
</div>`;
}

export function leadTemplate(ctx) {
  return h`<template id="lead-template" data-icons="${ctx.assets.icons}">${leadForm(ctx, { title: 'Получить расчёт', source: 'modal', tag: 'h3' })}</template>`;
}

// ---------- крошки ----------
export function crumbsHtml(ctx, page) {
  const list = [{ name: 'Главная', url: '/' }, ...(page.crumbs || [])];
  return h`<nav class="crumbs" aria-label="Навигация по разделам"><div class="container"><ol>${join(list.map((c, i) => i === list.length - 1
    ? h`<li><span aria-current="page">${c.name}</span></li>`
    : h`<li><a href="${c.url}">${c.name}</a></li>`))}</ol></div></nav>`;
}

// ---------- FAQ ----------
export function faq(ctx, items, { title = 'Что обычно спрашивают', id, band = false, note } = {}) {
  if (!items?.length) return '';
  return h`<section class="section${band ? ' section--band' : ''}"${id ? raw(` id="${id}"`) : ''}><div class="container">
<div class="sh sh--row"><div><p class="eyebrow">Вопросы и ответы</p><h2>${title}</h2></div><p>${note ?? h`Если нужного вопроса нет, позвоните: <a href="${telHref(ctx)}">${ctx.site.phone.display}</a>. ${HOURS_TEXT}.`}</p></div>
<div class="faq${items.length <= 3 ? ' faq--1' : ''}">${join(items.map(([q, a]) => h`<details><summary>${q}${icon(ctx, 'chev', 'chev')}</summary><div class="faq__a"><p>${a}</p></div></details>`))}</div>
</div></section>`;
}

// ---------- таблицы цен ----------
const mk = (ctx, r, catSlug) => {
  const linked = ctx.markPages.includes(r.mark) && catSlug === ctx.mainConcrete.slug;
  return linked ? h`<a href="/catalog/${catSlug}/${r.markSlug}/">${r.mark}</a>` : r.mark;
};
const FILLER = { granite: 'гранит', gravel: 'гравий' };

// Столбцы, в которых у всех строк пусто, не выводим.
// keys: 'plain' | 'cat' | false: строки получают data-k, по нему конфигуратор подсвечивает выбранную позицию.
const orderLink = (ctx, label) => h`<a class="rowlink" href="${telHref(ctx)}" data-order data-item="${label}" aria-label="Заказать: ${label}">Заказать</a>`;
const kAttr = (cat, r, keys) => { const k = rowKeyFor(cat, r, keys); return k ? raw(` data-k="${esc(k)}"`) : ''; };

export function concreteTable(ctx, cat, rows = cat.rows, { order = true, linkMarks = true, keys = false } = {}) {
  const has = (k) => rows.some((r) => r[k] !== null && r[k] !== undefined && r[k] !== '');
  const col = { mobility: has('mobility'), frost: has('frost'), water: has('water'), filler: has('filler'), pmd: cat.kind === 'pmd' };
  const markCell = (r) => (linkMarks ? mk(ctx, r, cat.slug) : r.mark);
  return h`<div class="table-wrap"><table class="pt">
<thead><tr><th>Марка</th><th>Класс</th>${col.pmd ? h`<th>ПМД до</th>` : ''}${col.mobility ? h`<th>Подвижность</th>` : ''}${col.frost ? h`<th>Мороз-ть</th>` : ''}${col.water ? h`<th>Водонепр.</th>` : ''}${col.filler ? h`<th>Заполнитель</th>` : ''}<th class="pr">Цена за м³</th>${order ? h`<th class="ac"><span class="sr">Заказ</span></th>` : ''}</tr></thead>
<tbody>${join(rows.map((r) => h`<tr${kAttr(cat, r, keys)}>
<td class="mk" data-l="Марка">${markCell(r)}</td>
<td class="cl" data-l="Класс">${r.cls}</td>
${col.pmd ? h`<td data-l="ПМД до">${r.pmd}${NBSP}°C</td>` : ''}
${col.mobility ? h`<td data-l="Подвижность">${r.mobility ?? '—'}</td>` : ''}
${col.frost ? h`<td data-l="Мороз-ть">${r.frost ?? '—'}</td>` : ''}
${col.water ? h`<td data-l="Водонепр.">${r.water ?? '—'}</td>` : ''}
${col.filler ? h`<td data-l="Заполнитель">${FILLER[r.filler] ?? r.filler ?? '—'}</td>` : ''}
<td class="pr" data-l="Цена за м³"><span class="num">${fmtNum(r.price)}${NBSP}₽</span> <small>/м³</small></td>
${order ? h`<td class="ac">${orderLink(ctx, concreteLabel(cat, r))}</td>` : ''}
</tr>`))}</tbody></table></div>`;
}

export function mortarTable(ctx, cat, { keys = false } = {}) {
  const spec = cat.rows.some((r) => r.spec);
  return h`<div class="table-wrap"><table class="pt">
<thead><tr><th>Наименование</th>${spec ? h`<th>Для чего</th>` : ''}<th>Ед.</th><th class="pr">Цена</th><th class="ac"><span class="sr">Заказ</span></th></tr></thead>
<tbody>${join(cat.rows.map((r) => h`<tr${kAttr(cat, r, keys)}>
<td class="mk nm" data-l="Наименование">${r.name}</td>
${spec ? h`<td data-l="Для чего">${r.spec ?? '—'}</td>` : ''}
<td data-l="Ед.">${r.unit}</td>
<td class="pr" data-l="Цена"><span class="num">${fmtNum(r.price)}${NBSP}₽</span> <small>/${r.unit}</small></td>
<td class="ac">${orderLink(ctx, r.name)}</td>
</tr>`))}</tbody></table></div>`;
}

// Арматура: матрица «диаметр × класс и сталь». В ячейке цена за тонну, нажатие подставляет позицию в заявку.
export function rebarTables(ctx, cat, { keys = false } = {}) {
  const groups = [...new Set(cat.rows.map((r) => r.group || 'Прочее'))];
  const diams = [...new Set(cat.rows.map((r) => r.diameter))].sort((a, b) => a - b);
  const cell = (d, g) => {
    const r = cat.rows.find((x) => x.diameter === d && (x.group || 'Прочее') === g);
    if (!r) return h`<td class="mx__na">—</td>`;
    return h`<td class="pr"${kAttr(cat, r, keys)}><a href="${telHref(ctx)}" data-order data-item="${r.name}" aria-label="Заказать: ${r.name}, ${fmtNum(r.price)} рублей за тонну"><span class="num">${fmtNum(r.price)}${NBSP}₽</span></a></td>`;
  };
  return h`<div class="table-wrap table-wrap--mx"><table class="mx">
<thead><tr><th>Диаметр</th>${join(groups.map((g) => h`<th class="pr">${g}</th>`))}</tr></thead>
<tbody>${join(diams.map((d) => h`<tr><th scope="row">${d}${NBSP}мм</th>${join(groups.map((g) => cell(d, g)))}</tr>`))}</tbody></table></div>
<p class="after muted small">Цена за тонну. Нажмите на цену, чтобы заказать эту позицию. Прочерк: такого диаметра в этом классе нет в прайсе.</p>`;
}

export { orderLink };
export const fromPriceOf = (rows) => Math.min(...rows.map((r) => r.price));

export const priceNote = (ctx, { min = true } = {}) => h`<p class="price-note"><span>Актуально на <time datetime="${ctx.priceDateIso}">${ctx.priceDateRu}</time></span>${min ? h`<span>Минимальный заказ — ${minVolText(ctx)}</span>` : ''}</p>`;


// ---------- общая обёртка страницы ----------
export function pageShell(ctx, page) {
  const metrika = ctx.site.metrika_id
    ? raw(`<script>window.__ymId=${Number(ctx.site.metrika_id)};(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");ym(${Number(ctx.site.metrika_id)},"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true});</script>`)
    : '';
  return h`${head(ctx, page)}
<body>
${header(ctx, page)}
${page.url === '/' ? '' : crumbsHtml(ctx, page)}
<main id="main">
${page.main}
</main>
${footer(ctx)}
${mobileBar(ctx)}
${leadTemplate(ctx)}
<script src="${ctx.assets.js}" defer></script>
${metrika}
</body>
</html>
`;
}
