// Общие блоки страницы: head, шапка, футер, формы, таблицы цен, FAQ, картинки.
import { h, raw, join, esc, NBSP, fmtNum, markSlug } from './util.mjs';
import { CONCRETE_KINDS } from './categories.mjs';
import { rowKeyFor } from './configurator.mjs';

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
<link rel="canonical" href="${canonical}">
${noindex ? raw('<meta name="robots" content="noindex, nofollow">') : raw('<meta name="robots" content="index, follow, max-image-preview:large">')}
<meta name="theme-color" content="#FFFFFF">
<meta property="og:type" content="website">
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
<link rel="preload" href="/assets/fonts/plex-cyrillic-wdth.woff2" as="font" type="font/woff2" crossorigin>
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
    groups.get(c.group).push({ name: c.menu, url: `/catalog/${c.slug}/` });
  }
  if (ctx.rental) {
    if (!groups.has(ctx.rental.group)) groups.set(ctx.rental.group, []);
    groups.get(ctx.rental.group).push({ name: 'Аренда автобетононасоса', url: '/catalog/arenda-abn/' });
  }
  const items = [{ name: 'Цены', url: '/price/' }];
  items.push({ name: 'Продукция', url: '/price/', sub: [...groups].map(([title, links]) => ({ title, links })), mega: true });
  items.push({ name: 'Доставка', url: '/dostavka/' });
  if (ctx.articles?.length) items.push({ name: 'Статьи', url: '/stati/' });
  items.push({ name: 'О заводе', url: '/about/' });
  items.push({ name: 'Контакты', url: '/contacts/' });
  return items;
}

function navHtml(ctx, page) {
  const cur = (u) => (page.url === u || (u.startsWith('/catalog/') && page.url.startsWith(u)) || (u === '/stati/' && page.url.startsWith(u)) ? 'page' : null);
  return join(navItems(ctx).map((it) => h`<li${it.sub ? raw(' class="has-sub"') : ''}>
<a class="nav__link" href="${it.url}"${cur(it.url) && !it.sub ? raw(' aria-current="page"') : ''}>${it.name}${it.sub ? icon(ctx, 'chev') : ''}</a>
${it.sub ? h`<div class="sub sub--mega">${join(it.sub.map((g) => h`<div class="sub__col"><span class="sub__h">${g.title}</span><ul>${join(g.links.map((l) => h`<li><a href="${l.url}"${cur(l.url) ? raw(' aria-current="page"') : ''}>${l.name}</a></li>`))}</ul></div>`))}</div>` : ''}
</li>`));
}

export function header(ctx, page) {
  const { site } = ctx;
  return h`<a class="skip" href="#main">К содержимому</a>
${ctx.fixture ? h`<div class="fixture-banner">ТЕСТОВЫЕ ДАННЫЕ: сборка для проверки вёрстки, не для публикации</div>` : ''}
${ctx.demo ? h`<div class="fixture-banner fixture-banner--preview">ДЕМО ДЛЯ ТЕСТИРОВАНИЯ: заявки никуда не отправляются, почта не подключена. Не для публикации</div>` : ''}
${ctx.preview ? h`<div class="fixture-banner fixture-banner--preview">ПРЕДПРОСМОТР: не для публикации. Не заполнено, подставлено временно: ${ctx.assumed.join(', ') || 'ничего'}</div>` : ''}
<header class="hdr"><div class="container hdr__in">
<a class="brand" href="/" aria-label="${site.brand}: на главную"><b>${site.brand}</b><small>Бетонный завод, ${site.plant.locality}</small></a>
<nav class="nav" id="nav" aria-label="Основное меню"><ul class="nav__list">${navHtml(ctx, page)}</ul></nav>
<div class="hdr__r">
<span class="hdr__hrs">${HOURS_TEXT}</span>
<a class="hdr__tel" href="${telHref(ctx)}">${site.phone.display}</a>
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
<a class="brand" href="/"><b>${site.brand}</b><small>Бетонный завод ${site.plant.locality_in}</small></a>
<p>${site.plant.address}.<br>${HOURS_FULL}.</p>
<p><a class="ftr__phone" href="${telHref(ctx)}">${site.phone.display}</a></p>
</div>
<div><h4>Цены и продукция</h4><ul><li><a href="/price/">Прайс-лист</a></li>${join(cats)}${join(marks)}</ul></div>
<div><h4>Информация</h4><ul><li><a href="/dostavka/">Доставка</a></li>${join(cities.map((c) => h`<li><a href="${c.url}">Бетон ${c.in}</a></li>`))}${ctx.articles?.length ? h`<li><a href="/stati/">Статьи</a></li>` : ''}<li><a href="/about/">О заводе</a></li>${ctx.gallery ? h`<li><a href="/gallery/">Фото</a></li>` : ''}<li><a href="/contacts/">Контакты</a></li>${site.main_site ? h`<li><a href="${site.main_site.url}">${site.main_site.name}</a></li>` : ''}<li><a href="/privacy/">Политика конфиденциальности</a></li><li><a href="/soglasie/">Согласие на обработку данных</a></li></ul></div>
<div><h4>Контакты</h4><ul>
<li>${site.plant.address}</li>
<li>${HOURS_TEXT}</li>
${site.email_public ? h`<li><a href="mailto:${site.email_public}">${site.email_public}</a></li>` : ''}
${join(messengers(ctx).map((m) => h`<li><a href="${m.url}" rel="noopener" target="_blank">${m.label}</a></li>`))}
<li><a href="${site.plant.yandex_url}" rel="noopener" target="_blank">Завод на Яндекс Картах: отзывы и маршрут</a></li>
</ul></div>
</div>
<div class="ftr__bar"><span>© ${year} ${site.brand}${site.signature && !ctx.fixture ? `. ${site.signature}` : ''}</span><span>Цены актуальны на ${ctx.priceDateRu}</span></div>
</div></footer>`;
}

// ---------- формы ----------
const consentHtml = (ctx) => h`<label class="consent"><input type="checkbox" name="consent" value="1" required><span>Согласен на <a href="/soglasie/" target="_blank">обработку персональных данных</a> и с <a href="/privacy/" target="_blank">политикой конфиденциальности</a></span></label>`;
const honey = (source) => h`<div class="hp" aria-hidden="true"><label>Сайт<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
<input type="hidden" name="ts" value="">
<input type="hidden" name="source" value="${source}">`;
// Арифметическая проверка: пример и подписанный токен приходят с сервера (send.php?captcha=1), ответ проверяется на сервере.
const captchaHtml = () => h`<label class="field cap"><span>Проверка от роботов: сколько будет <b class="cap__q" data-cap-q>…</b>?</span><input type="text" name="cap" inputmode="numeric" autocomplete="off" maxlength="3" placeholder="ответ"></label>
<input type="hidden" name="ct" value="">`;
const noJsNote = (ctx) => h`<p class="nojs-note">Форма работает с включённым JavaScript. Без него позвоните: <a href="${telHref(ctx)}">${ctx.site.phone.display}</a>.</p>`;

export function leadForm(ctx, { title = 'Получить расчёт', sub = null, source = 'site', item = null, compact = false, tag = 'h2' } = {}) {
  const hd = tag === 'h2' ? h`<h2>${title}</h2>` : h`<h3>${title}</h3>`;
  const m = messengers(ctx);
  return h`<div class="form">
${hd}
<p class="form__sub">${sub ?? 'Оставьте телефон, объём и адрес объекта. Мы перезвоним и назовём стоимость с доставкой.'}</p>
<form action="/send.php" method="post" data-lead data-phone="${ctx.site.phone.display}" novalidate>
${noJsNote(ctx)}
<label class="field"><span>Телефон</span><input type="tel" name="phone" inputmode="tel" autocomplete="tel" placeholder="+7" required maxlength="18"></label>
${compact ? '' : h`<div class="field--row">
<label class="field"><span>Объём</span><input type="text" name="volume" inputmode="decimal" placeholder="от ${fmtNum(ctx.site.min_volume_m3)} м³" maxlength="24"></label>
<label class="field"><span>Что заказать</span><input type="text" name="item" value="${item ?? ''}" placeholder="например, бетон М300" maxlength="120"></label>
</div>
<label class="field"><span>Адрес доставки</span><input type="text" name="address" autocomplete="street-address" placeholder="город, улица или СНТ" maxlength="200"></label>`}
${captchaHtml()}
${honey(source)}
${consentHtml(ctx)}
<button class="btn btn--primary btn--block" type="submit">Получить расчёт</button>
<div class="form__msg" role="status" aria-live="polite"></div>
</form>
<div class="form__alt">
<a class="btn btn--ghost btn--sm" href="${telHref(ctx)}">${icon(ctx, 'phone')}${ctx.site.phone.display}</a>
${m.map((x) => h`<a class="btn btn--ghost btn--sm" href="${x.url}" rel="noopener" target="_blank">${icon(ctx, x.icon)}${x.label}</a>`)}
</div>
</div>`;
}

// Горизонтальная форма под первым экраном.
export function leadStrip(ctx, { source = 'home-strip' } = {}) {
  return h`<section class="quote"><div class="container quote__in">
<div><h2>Рассчитать стоимость</h2><p>Телефон, объём и адрес объекта.</p></div>
<form class="qform" action="/send.php" method="post" data-lead data-phone="${ctx.site.phone.display}" novalidate>
${noJsNote(ctx)}
<label class="field"><span>Телефон</span><input type="tel" name="phone" inputmode="tel" autocomplete="tel" placeholder="+7" required maxlength="18"></label>
<label class="field"><span>Объём</span><input type="text" name="volume" inputmode="decimal" placeholder="от ${fmtNum(ctx.site.min_volume_m3)} м³" maxlength="24"></label>
<label class="field"><span>Адрес доставки</span><input type="text" name="address" autocomplete="street-address" placeholder="город, улица или СНТ" maxlength="200"></label>
${captchaHtml()}
<button class="btn btn--primary" type="submit">Получить расчёт</button>
${honey(source)}
<div class="consent">${consentHtml(ctx)}</div>
<div class="form__msg" role="status" aria-live="polite"></div>
</form>
</div></section>`;
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
export function faq(ctx, items, { title = 'Частые вопросы', id, sand = false } = {}) {
  if (!items?.length) return '';
  return h`<section class="section${sand ? ' section--sand' : ''}"${id ? raw(` id="${id}"`) : ''}><div class="container">
<div class="section__head"><h2>${title}</h2></div>
<div class="faq">${join(items.map(([q, a]) => h`<details><summary>${q}${icon(ctx, 'chev', 'chev')}</summary><div class="faq__a"><p>${a}</p></div></details>`))}</div>
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
${order ? h`<td class="ac"><a class="rowlink" href="${telHref(ctx)}" aria-label="Заказать ${r.mark} по телефону">Заказать</a></td>` : ''}
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
<td class="ac"><a class="rowlink" href="${telHref(ctx)}">Заказать</a></td>
</tr>`))}</tbody></table></div>`;
}

// Арматура: группы по стали/профилю, внутри диаметры.
export function rebarTables(ctx, cat, { keys = false } = {}) {
  const groups = new Map();
  for (const r of cat.rows) { const g = r.group || 'Прочее'; if (!groups.has(g)) groups.set(g, []); groups.get(g).push(r); }
  return join([...groups].map(([g, rows]) => h`<h3 class="tbl-title">Арматура ${g}</h3><div class="table-wrap"><table class="pt">
<thead><tr><th>Диаметр</th><th>Класс</th><th>Сталь, профиль</th><th class="pr">Цена за т</th><th class="ac"><span class="sr">Заказ</span></th></tr></thead>
<tbody>${join(rows.sort((a, b) => a.diameter - b.diameter).map((r) => h`<tr${kAttr(cat, r, keys)}>
<td class="mk" data-l="Диаметр">${r.diameter}${NBSP}мм</td>
<td data-l="Класс">${r.rebarClass ?? '—'}</td>
<td data-l="Сталь">${r.steel ?? '—'}</td>
<td class="pr" data-l="Цена за т"><span class="num">${fmtNum(r.price)}${NBSP}₽</span> <small>/т</small></td>
<td class="ac"><a class="rowlink" href="${telHref(ctx)}">Заказать</a></td>
</tr>`))}</tbody></table></div>`));
}

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
