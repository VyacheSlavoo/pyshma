// Общие блоки страницы: head, шапка, футер, формы, таблицы цен, FAQ, картинки.
import { h, raw, join, esc, rub, NBSP, fmtNum } from './util.mjs';
import { MARKS } from './marks.mjs';
import { CONCRETE_KINDS } from './categories.mjs';

export const HOURS_TEXT = 'Работаем 24/7';
export const HOURS_FULL = 'Приём заявок, производство, отгрузка и доставка — круглосуточно, 24/7';

export const icon = (ctx, name, cls = '') => h`<svg class="i ${cls}" aria-hidden="true" focusable="false"><use href="${ctx.assets.icons}#i-${name}"/></svg>`;

export const telHref = (ctx) => `tel:${ctx.site.phone.e164}`;

export function vatText(ctx) {
  return { included: 'с НДС', excluded: 'без НДС', none: 'НДС не облагается' }[ctx.site.vat];
}
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
  const noindex = page.noindex || ctx.fixture;
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
<meta name="theme-color" content="#102640">
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
<link rel="preload" href="/assets/fonts/montserrat-cyrillic-800-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/open-sans-cyrillic-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${ctx.assets.css}">
<script>document.documentElement.className='js'</script>
${join(ld.map((o) => raw(`<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`)), '\n')}
</head>`;
}

// ---------- навигация ----------
export function navItems(ctx) {
  const concrete = ctx.categories.filter((c) => CONCRETE_KINDS.has(c.kind));
  const items = [];
  items.push({ name: 'Цены', url: '/price/' });
  if (concrete.length === 1) items.push({ name: 'Бетон', url: `/catalog/${concrete[0].slug}/` });
  else if (concrete.length > 1) items.push({ name: 'Бетон', url: `/catalog/${concrete[0].slug}/`, sub: concrete.map((c) => ({ name: c.menu, url: `/catalog/${c.slug}/` })) });
  const mortar = ctx.categories.find((c) => c.kind === 'mortar');
  if (mortar) items.push({ name: mortar.menu, url: `/catalog/${mortar.slug}/` });
  if (ctx.rental) items.push({ name: 'Аренда АБН', url: '/catalog/arenda-abn/' });
  items.push({ name: 'Доставка', url: '/dostavka/' });
  items.push({ name: 'О заводе', url: '/about/' });
  items.push({ name: 'Контакты', url: '/contacts/' });
  return items;
}

function navHtml(ctx, page) {
  const cur = (u) => (page.url === u || (u !== '/' && page.url.startsWith(u) && u.startsWith('/catalog/') && page.url.startsWith(u)) ? 'page' : null);
  return join(navItems(ctx).map((it) => h`<li${it.sub ? raw(' class="has-sub"') : ''}>
<a class="nav__link" href="${it.url}"${cur(it.url) ? raw(' aria-current="page"') : ''}>${it.name}${it.sub ? icon(ctx, 'chev') : ''}</a>
${it.sub ? h`<ul class="sub">${join(it.sub.map((s) => h`<li><a href="${s.url}">${s.name}</a></li>`))}</ul>` : ''}
</li>`));
}

export function header(ctx, page) {
  const { site, plant = site.plant } = ctx;
  const initial = [...site.brand.trim()][0].toUpperCase();
  return h`<a class="skip" href="#main">К содержимому</a>
${ctx.fixture ? h`<div class="fixture-banner">ТЕСТОВЫЕ ДАННЫЕ: сборка для проверки вёрстки, не для публикации</div>` : ''}
<div class="topbar"><div class="container">
<div class="topbar__l"><span class="badge247">${icon(ctx, 'clock')}24/7</span><span class="topbar__addr">${icon(ctx, 'pin')} ${site.plant.address}</span></div>
<div class="topbar__r"><span>${HOURS_TEXT}</span>${site.email_public ? h`<a href="mailto:${site.email_public}">${site.email_public}</a>` : ''}</div>
</div></div>
<header class="header"><div class="container">
<a class="logo" href="/" aria-label="${site.brand}: на главную"><span class="logo__mark" aria-hidden="true">${initial}</span><span class="logo__text"><span class="logo__name">${site.brand}</span><span class="logo__sub">Бетон от производителя</span></span></a>
<nav class="nav" id="nav" aria-label="Основное меню"><ul class="nav__list">${navHtml(ctx, page)}</ul></nav>
<div class="header__cta">
<a class="header__phone" href="${telHref(ctx)}"><b>${site.phone.display}</b><span>${HOURS_TEXT}</span></a>
<button type="button" class="btn btn--primary btn--sm" data-open-lead hidden>Получить расчёт</button>
</div>
<a class="btn btn--primary btn--sm callbtn" href="${telHref(ctx)}" aria-label="Позвонить ${site.phone.display}">${icon(ctx, 'phone')}Позвонить</a>
<button class="burger" type="button" aria-controls="nav" aria-expanded="false" aria-label="Меню" data-icons="${ctx.assets.icons}"><svg class="i" aria-hidden="true"><use href="${ctx.assets.icons}#i-menu"/></svg></button>
</div></header>`;
}

export function mobileBar(ctx) {
  const m = messengers(ctx)[0];
  return h`<div class="mbar${m ? '' : ' mbar--2'}">
<a class="btn btn--primary" href="${telHref(ctx)}">${icon(ctx, 'phone')}Позвонить</a>
${m ? h`<a class="btn btn--blue" href="${m.url}" rel="noopener" target="_blank">${icon(ctx, m.icon)}${m.label}</a>` : ''}
<button type="button" class="btn btn--ghost js-only" data-open-lead hidden>Расчёт</button>
</div>`;
}

export function footer(ctx) {
  const { site } = ctx;
  const initial = [...site.brand.trim()][0].toUpperCase();
  const year = ctx.now.getUTCFullYear();
  const cats = ctx.categories.map((c) => h`<li><a href="/catalog/${c.slug}/">${c.menu}</a></li>`);
  if (ctx.rental) cats.push(h`<li><a href="/catalog/arenda-abn/">Аренда АБН</a></li>`);
  const marks = ctx.markPages.map((m) => h`<li><a href="/catalog/${ctx.mainConcrete.slug}/${ctx.markSlugOf(m)}/">Бетон ${m}</a></li>`);
  const cities = ctx.cities.filter((c) => c.tier === 'city');
  return h`<footer class="footer"><div class="container">
<div class="footer__grid">
<div>
<a class="logo" href="/"><span class="logo__mark" aria-hidden="true">${initial}</span><span class="logo__text"><span class="logo__name">${site.brand}</span><span class="logo__sub">Бетон от производителя</span></span></a>
<p>Бетонный завод ${site.plant.locality_in}. Производство с ${site.founded_year} года. ${HOURS_FULL}.</p>
<p><a class="footer__phone" href="${telHref(ctx)}">${site.phone.display}</a></p>
</div>
<div><h4>Цены и продукция</h4><ul><li><a href="/price/">Прайс-лист</a></li>${join(cats)}${join(marks)}</ul></div>
<div><h4>Информация</h4><ul><li><a href="/dostavka/">Доставка</a></li>${join(cities.map((c) => h`<li><a href="${c.url}">Бетон ${c.in}</a></li>`))}<li><a href="/about/">О заводе</a></li><li><a href="/contacts/">Контакты</a></li><li><a href="/privacy/">Политика конфиденциальности</a></li><li><a href="/soglasie/">Согласие на обработку данных</a></li></ul></div>
<div><h4>Контакты</h4><ul>
<li>${site.plant.address}</li>
<li>${HOURS_TEXT}</li>
${site.email_public ? h`<li><a href="mailto:${site.email_public}">${site.email_public}</a></li>` : ''}
${join(messengers(ctx).map((m) => h`<li><a href="${m.url}" rel="noopener" target="_blank">${m.label}</a></li>`))}
<li><a href="${site.plant.yandex_url}" rel="noopener" target="_blank">Мы на Яндекс Картах</a></li>
</ul></div>
</div>
<div class="footer__bar"><span>© ${year} ${site.brand}${site.signature && !ctx.fixture ? `. ${site.signature}` : ''}</span><span>Цены ${vatText(ctx)}, актуальны на ${ctx.priceDateRu}</span></div>
</div></footer>`;
}

// ---------- формы ----------
let formSeq = 0;
export function leadForm(ctx, { title = 'Получить расчёт', sub = null, source = 'site', item = null, compact = false, tag = 'h2' } = {}) {
  const n = ++formSeq;
  const T = tag;
  const hd = tag === 'h2' ? h`<h2>${title}</h2>` : h`<h3>${title}</h3>`;
  const m = messengers(ctx);
  return h`<div class="formcard">
${hd}
<p class="formcard__sub">${sub ?? `Назовите объём и адрес. Рассчитаем стоимость с доставкой. ${HOURS_TEXT}.`}</p>
<form action="/send.php" method="post" data-lead data-phone="${ctx.site.phone.display}" novalidate>
<label class="field"><span>Телефон</span><input type="tel" name="phone" inputmode="tel" autocomplete="tel" placeholder="+7" required maxlength="18"></label>
${compact ? '' : h`<div class="field--row">
<label class="field"><span>Объём, м³</span><input type="text" name="volume" inputmode="decimal" placeholder="от ${fmtNum(ctx.site.min_volume_m3)}" maxlength="12"></label>
<label class="field"><span>Марка (если знаете)</span><input type="text" name="item" value="${item ?? ''}" placeholder="например, М300" maxlength="60"></label>
</div>
<label class="field"><span>Адрес доставки</span><input type="text" name="address" autocomplete="street-address" placeholder="город, улица или СНТ" maxlength="200"></label>`}
<div class="hp" aria-hidden="true"><label>Сайт<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
<input type="hidden" name="ts" value="">
<input type="hidden" name="source" value="${source}">
<label class="consent"><input type="checkbox" name="consent" value="1" required><span>Согласен на <a href="/soglasie/" target="_blank">обработку персональных данных</a> и с <a href="/privacy/" target="_blank">политикой конфиденциальности</a></span></label>
<button class="btn btn--primary btn--block" type="submit">${icon(ctx, 'calc')}Получить расчёт</button>
<div class="form__msg" role="status" aria-live="polite"></div>
</form>
<div class="form__alt">
<a class="btn btn--ghost btn--sm" href="${telHref(ctx)}">${icon(ctx, 'phone')}${ctx.site.phone.display}</a>
${m.map((x) => h`<a class="btn btn--ghost btn--sm" href="${x.url}" rel="noopener" target="_blank">${icon(ctx, x.icon)}${x.label}</a>`)}
</div>
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
export function faq(ctx, items, { title = 'Частые вопросы', id } = {}) {
  if (!items?.length) return '';
  return h`<section class="section"${id ? raw(` id="${id}"`) : ''}><div class="container">
<div class="section__head"><h2>${title}</h2></div>
<div class="faq">${join(items.map(([q, a]) => h`<details><summary>${q}${icon(ctx, 'chev', 'chev')}</summary><div class="faq__a"><p>${a}</p></div></details>`))}</div>
</div></section>`;
}

// ---------- таблицы цен ----------
const mk = (ctx, r, catSlug) => {
  const linked = ctx.markPages.includes(r.mark) && catSlug === ctx.mainConcrete.slug;
  return linked ? h`<a href="/catalog/${catSlug}/${r.markSlug}/">${r.mark}</a>` : r.mark;
};

export function concreteTable(ctx, cat, rows = cat.rows, { order = true } = {}) {
  const pmd = cat.kind === 'pmd';
  const filler = rows.some((r) => r.filler);
  const fillerName = { granite: 'гранит', gravel: 'гравий' };
  return h`<div class="table-wrap"><table class="pt">
<thead><tr><th>Марка</th><th>Класс</th><th>Подвижность</th><th>Мороз-ть</th><th>Водонепр.</th>${filler ? h`<th>Заполнитель</th>` : ''}${pmd ? h`<th>ПМД до</th>` : ''}<th class="pr">Цена за м³</th>${order ? h`<th class="ac"><span class="sr">Заказ</span></th>` : ''}</tr></thead>
<tbody>${join(rows.map((r) => h`<tr>
<td class="mk" data-l="Марка">${mk(ctx, r, cat.slug)}<span class="tag cl">${r.cls}</span></td>
<td class="cl" data-l="Класс">${r.cls}</td>
<td data-l="Подвижность">${r.mobility ?? '—'}</td>
<td data-l="Мороз-ть">${r.frost ?? '—'}</td>
<td data-l="Водонепр.">${r.water ?? '—'}</td>
${filler ? h`<td data-l="Заполнитель">${fillerName[r.filler] ?? r.filler ?? '—'}</td>` : ''}
${pmd ? h`<td data-l="ПМД до">${r.pmd}${NBSP}°C</td>` : ''}
<td class="pr" data-l="Цена за м³"><span class="num">${fmtNum(r.price)}${NBSP}₽</span> <small>/м³</small></td>
${order ? h`<td class="ac"><a class="btn btn--primary btn--sm" href="${telHref(ctx)}" aria-label="Заказать ${r.mark} по телефону">Заказать</a></td>` : ''}
</tr>`))}</tbody></table></div>`;
}

export function mortarTable(ctx, cat) {
  return h`<div class="table-wrap"><table class="pt">
<thead><tr><th>Наименование</th><th>Описание</th><th>Ед.</th><th class="pr">Цена</th><th class="ac"><span class="sr">Заказ</span></th></tr></thead>
<tbody>${join(cat.rows.map((r) => h`<tr>
<td class="mk nm" data-l="Наименование">${r.name}</td>
<td data-l="Описание">${r.spec ?? '—'}</td>
<td data-l="Ед.">${r.unit}</td>
<td class="pr" data-l="Цена"><span class="num">${fmtNum(r.price)}${NBSP}₽</span> <small>/${r.unit}</small></td>
<td class="ac"><a class="btn btn--primary btn--sm" href="${telHref(ctx)}">Заказать</a></td>
</tr>`))}</tbody></table></div>`;
}

export const priceNote = (ctx) => h`<p class="price-note"><span class="tag">Цены ${vatText(ctx)}</span><span>Актуально на <time datetime="${ctx.priceDateIso}">${ctx.priceDateRu}</time></span><span>Минимальный заказ — ${minVolText(ctx)}</span></p>`;

export const fromPriceOf = (rows) => Math.min(...rows.map((r) => r.price));

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
