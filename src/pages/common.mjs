// Блоки, которые повторяются на разных страницах.
import { h, raw, join, fmtNum, NBSP, plural, nb } from '../lib/util.mjs';
import { icon, img, telHref, messengers, HOURS_TEXT, leadForm, minVolText } from '../lib/layout.mjs';
import { MARK_ORDER, markNum } from '../lib/marks.mjs';
import { GROUP_ORDER, CONCRETE_KINDS } from '../lib/categories.mjs';
import { markSpan, span, mobSpan } from './copy.mjs';

export const T = (ctx, key, fallback) => (ctx.texts[key] !== undefined ? ctx.texts[key] : fallback);

// Фото для шапок страниц: подбираются по смыслу страницы. Если файла нет в photos.json, фото не выводится.
const PAGE_PHOTO = {
  'tovarnyy-beton': 'plita-opalubka.jpg', 'beton-s-pmd': 'zima-mikser-nasos.jpg', 'fibrobeton': 'plita-svezhaya.jpg',
  'gidrotehnicheskiy-beton': 'plita-uchastok.jpg', 'beton-na-melkom-share': 'beton-v-tachke.jpg', 'keramzitobeton': 'plita-vid-sboku.jpg',
  'suhoy-beton': 'opalubka-lenta.jpg', 'rastvory': 'plita-gotovaya.jpg', 'tsps': 'pol-pomeschenie.jpg', 'armatura': 'armokarkas.jpg',
  'arenda-abn': 'abn-strela-vylet.jpg', 'price': 'abn-podacha.jpg', 'dostavka': 'mikser-v-nasos.jpg', 'about': 'uzel-territoriya.jpg',
  'contacts': 'uzel-silosy.jpg', 'm200': 'opalubka-lenta.jpg', 'm250': 'plita-uchastok.jpg', 'm300': 'plita-svezhaya.jpg', 'm350': 'abn-podacha-plita.jpg',
  'ekaterinburg': 'abn-gorod.jpg', 'stati': 'plita-vid-sboku.jpg', 'gallery': 'abn-mikseri.jpg'
};
export const pagePhoto = (ctx, key) => { const f = PAGE_PHOTO[key]; return f && ctx.photos.some((p) => p.file === f) ? f : null; };
const photoMeta = (ctx, file) => ctx.photos.find((p) => p.file === file);

// Иконки разделов продукции.
export const CAT_ICON = {
  'tovarnyy-beton': 'layers', 'beton-s-pmd': 'snow', 'fibrobeton': 'grid', 'gidrotehnicheskiy-beton': 'drop', 'beton-na-melkom-share': 'box',
  'keramzitobeton': 'box', 'suhoy-beton': 'box', 'rastvory': 'layers', 'tsps': 'layers', 'armatura': 'grid', 'arenda-abn': 'pump'
};

// Заголовок секции: подпись раздела, заголовок, пояснение.
export function sh(eyebrow, title, sub = null, { row = false, level = 2 } = {}) {
  const t = level === 2 ? h`<h2>${title}</h2>` : h`<h3>${title}</h3>`;
  if (row) return h`<div class="sh sh--row"><div>${eyebrow ? h`<p class="eyebrow">${eyebrow}</p>` : ''}${t}</div>${sub ? h`<p>${sub}</p>` : ''}</div>`;
  return h`<div class="sh">${eyebrow ? h`<p class="eyebrow">${eyebrow}</p>` : ''}${t}${sub ? h`<p>${sub}</p>` : ''}</div>`;
}

// Фото с подписью поверх нижнего края.
export function media(ctx, file, { sizes = '(max-width:980px) 100vw, 46vw', eager = false, cls = '', caption, ico = 'pin' } = {}) {
  if (!file || !ctx.images.has(file)) return '';
  const cap = caption === undefined ? photoMeta(ctx, file)?.caption : caption;
  return h`<figure class="media${cls ? ` ${cls}` : ''}">${img(ctx, file, { sizes, eager })}${cap ? h`<figcaption>${icon(ctx, ico)}${cap}</figcaption>` : ''}</figure>`;
}

// facts: [[подпись, значение], ...]. price: { from, unit }: крупная цена «от» с датой прайса.
export function pagehead(ctx, { h1, lead, facts = [], actions = true, photo = null, extra = null, price = null, eyebrow = null, caption }) {
  const ph = photo && ctx.images.has(photo) ? photo : null;
  return h`<section class="pagehead${ph ? '' : ' pagehead--plain'}"><div class="container pagehead__in">
<div class="pagehead__txt">
${eyebrow ? h`<p class="eyebrow">${eyebrow}</p>` : ''}
<h1>${nb(h1)}</h1>
${lead ? h`<p class="pagehead__lead">${nb(lead)}</p>` : ''}
${extra ?? ''}
${price ? h`<p class="pagehead__price">от ${fmtNum(price.from)}${NBSP}₽<small>за ${price.unit}</small></p><p class="pagehead__date">Цена из прайса на <time datetime="${ctx.priceDateIso}">${ctx.priceDateRu}</time>. Стоимость доставки считаем по адресу.</p>` : ''}
${facts.length ? h`<ul class="facts3">${join(facts.map(([k, v]) => h`<li><b>${v}</b><span>${k}</span></li>`))}</ul>` : ''}
${actions ? h`<div class="pagehead__cta"><a class="btn btn--primary" href="#zayavka" data-order>Оставить заявку</a><a class="telink" href="${telHref(ctx)}">${icon(ctx, 'phone')}${ctx.site.phone.display}</a></div>` : ''}
</div>
${ph ? media(ctx, ph, { eager: true, sizes: '(max-width:980px) 100vw, 44vw', caption }) : ''}
</div></section>`;
}

// Способы оплаты из карточки организации.
export function payMethods(ctx) {
  const pay = ctx.site.card?.payment || [];
  const out = [];
  if (pay.includes('наличными')) out.push(['cash', 'Наличными']);
  if (ctx.site.card?.pay_by_card) out.push(['card', 'Банковской картой']);
  if (pay.includes('банковским переводом') || pay.includes('безналичная')) out.push(['swap', 'Безналичный расчёт, банковский перевод']);
  if (pay.includes('онлайн')) out.push(['globe', 'Онлайн-оплата']);
  if (pay.includes('предоплата')) out.push(['doc', 'Предоплата']);
  return out;
}

// Нижний блок страницы: условия заказа и оплата слева, форма заявки справа.
export function ctaBand(ctx, { title = 'Рассчитаем стоимость под ваш объём', sub, source }) {
  const pays = payMethods(ctx);
  return h`<section class="cta"><div class="container split">
<div>
<p class="eyebrow">Заказ и оплата</p>
<h2>${title}</h2>
<p class="lead">${sub ?? `Назовите марку, объём и адрес: уточним подвижность и способ подачи, назовём цену с доставкой. Заказ от ${minVolText(ctx)}.`}</p>
${pays.length ? h`<ul class="paylist">${join(pays.map(([i, t]) => h`<li>${icon(ctx, i)}${t}</li>`))}</ul>` : ''}
<a class="cta__tel" href="${telHref(ctx)}">${icon(ctx, 'phone')}${ctx.site.phone.display}</a>
<span class="cta__hrs">${HOURS_TEXT}: заявки, отгрузка и доставка</span>
</div>
${leadForm(ctx, { title: 'Оставить заявку', source, id: 'zayavka' })}
</div></section>`;
}

const lbAttrs = (ctx, p) => raw(`href="${ctx.images.get(p.file).full}" data-lightbox data-icons="${ctx.assets.icons}" data-alt="${p.alt.replace(/"/g, '&quot;')}" data-caption="${(p.caption ?? '').replace(/"/g, '&quot;')}"`);

// Галерея целиком (страница фото).
export function gallery(ctx, roles = ['hero', 'plant', 'fleet', 'lab', 'object'], { title = 'Завод и техника', sub, max = 99, band = true } = {}) {
  const list = ctx.photos.filter((p) => roles.includes(p.role)).slice(0, max);
  if (list.length < 2) return '';
  return h`<section class="section${band ? ' section--band' : ''}"><div class="container">
${title ? sh('Фото', title, sub) : ''}
<div class="gallery">${join(list.map((p) => h`<a ${lbAttrs(ctx, p)}>${img(ctx, p.file, { sizes: '(max-width:700px) 50vw, 25vw' })}</a>`))}</div>
</div></section>`;
}

// Сетка фото с подписями и плиткой «все фото».
export function photoGrid(ctx, { roles = ['hero', 'plant', 'fleet', 'object'], max = 7, skip = [] } = {}) {
  const list = ctx.photos.filter((p) => roles.includes(p.role) && !skip.includes(p.file)).slice(0, max);
  if (list.length < 3) return '';
  return h`<div class="photos">${join(list.map((p) => h`<a ${lbAttrs(ctx, p)}>${img(ctx, p.file, { sizes: '(max-width:980px) 50vw, 25vw', alt: p.alt })}${p.caption ? h`<span class="cap">${p.caption}</span>` : ''}</a>`))}${ctx.gallery ? h`<a class="photos__more" href="/gallery/">${icon(ctx, 'grid')}Все фото<small>${ctx.photos.length} ${plural(ctx.photos.length, 'снимок', 'снимка', 'снимков')} завода и объектов</small></a>` : ''}</div>`;
}

// Страница направления открыта для индекса, когда для неё заполнены расстояние, время или цена доставки.
// Пока она закрыта, из основного текста на неё не ссылаемся: только из подвала.
export const cityOpen = (c) => c.distance_km != null || c.travel_time != null || c.delivery_cost != null;
export const cityChip = (c) => (cityOpen(c) ? h`<a class="chip" href="${c.url}">${c.name}</a>` : h`<span class="chip">${c.name}</span>`);

// Направления доставки: строки со ссылками. origin: первой строкой завод.
export function cityCards(ctx, list = ctx.cities, { origin = false } = {}) {
  const plant = ctx.site.plant;
  if (!list.length && !origin) return '';
  return h`<ul class="dirs">
${origin ? h`<li><div class="dirs__row"><b>${plant.locality}</b><span>завод, самовывоз: ${plant.address}</span></div></li>` : ''}
${join(list.map((c) => h`<li>${cityOpen(c) ? raw(`<a href="${c.url}">`) : raw('<div class="dirs__row">')}<b>${c.name}</b><span>${[c.distance_km != null ? (c.distance_kind === 'line' ? `около ${fmtNum(c.distance_km)}${NBSP}км по прямой от завода` : `${fmtNum(c.distance_km)}${NBSP}км от завода`) : null, c.direction ? `${c.direction}` : null, c.travel_time, c.distance_km == null && !c.travel_time ? `доставка с завода ${plant.locality_from}` : null].filter(Boolean).join(', ')}</span>${raw(cityOpen(c) ? '</a>' : '</div>')}</li>`))}
</ul>`;
}

export function volumeCalc(ctx) {
  return h`<form id="calc" class="calc" data-min="${ctx.site.min_volume_m3}" novalidate>
<label class="field"><span>Длина, м</span><input name="l" inputmode="decimal" placeholder="10"></label>
<label class="field"><span>Ширина, м</span><input name="w" inputmode="decimal" placeholder="6"></label>
<label class="field"><span>Высота или толщина, м</span><input name="t" inputmode="decimal" placeholder="0,3"></label>
<button class="btn btn--primary" type="submit">Посчитать</button>
<div class="calc__out" hidden role="status" aria-live="polite"></div>
<button class="btn btn--ghost" type="button" data-open-lead hidden>Заказать этот объём</button>
</form>`;
}

export function marksRange(ctx) {
  const marks = [...new Set(ctx.categories.filter((c) => c.rows[0]?.mark).flatMap((c) => c.rows.map((r) => r.mark)))]
    .sort((a, b) => markNum(a) - markNum(b));
  return marks.length > 1 ? `${marks[0]}–${marks.at(-1)}` : marks[0];
}

// Условия доставки: пишем только то, что известно. Если неизвестно, входит ли доставка в цену, говорим нейтрально.
export function deliveryLine(ctx) {
  const v = ctx.site.delivery?.price_includes_delivery;
  if (v === true) return 'Доставка включена в цену бетона в пределах зоны, указанной на странице доставки.';
  if (v === false) return 'Цена указана за бетон без доставки. Доставку считаем отдельно по адресу объекта.';
  return 'Стоимость доставки зависит от расстояния до объекта и объёма заказа. Точную сумму называем при расчёте по адресу.';
}
export function deliveryFaq(ctx) {
  const v = ctx.site.delivery?.price_includes_delivery;
  if (v === true || v === false) return ['Входит ли доставка в цену?', deliveryLine(ctx)];
  return ['Как рассчитывается стоимость доставки?', deliveryLine(ctx)];
}
// short: без адреса, когда адрес стоит в соседнем предложении
export function pickupLine(ctx, { short = false } = {}) {
  if (!ctx.site.card?.pickup) return null;
  return short ? 'Бетон можно забрать самовывозом.' : `Самовывоз с завода: ${ctx.site.plant.address}.`;
}
export function paymentLine(ctx) {
  const pay = ctx.site.card?.payment || [];
  return pay.length ? `Способы оплаты: ${pay.join(', ')}${ctx.site.card.pay_by_card ? ', оплата картой' : ''}.` : null;
}

// Диапазон вылета стрелы насосов: «16–58 м» по данным аренды.
export function reachSpan(ctx) {
  const lows = ctx.rental.units.map((u) => parseInt(String(u.reach_text), 10)).filter(Number.isFinite);
  const highs = ctx.rental.units.map((u) => u.reach_m).filter(Boolean);
  return `${Math.min(...lows)}–${Math.max(...highs)}${NBSP}м`;
}
export const maxReach = (ctx) => Math.max(...ctx.rental.units.map((u) => u.reach_m).filter(Boolean));


// ---------- карточки продукции ----------
export const unitOf = (cat) => (cat.kind === 'rebar' ? 'т' : cat.rows[0]?.unit ?? 'м³');

// Краткая строка параметров под названием: только то, что есть в прайсе.
export function cardMeta(ctx, cat) {
  if (CONCRETE_KINDS.has(cat.kind)) {
    const rows = cat.rows;
    const bits = [`Марки ${markSpan(rows)}`];
    const mob = mobSpan(rows); if (mob) bits.push(`подвижность ${mob}`);
    const f = span(rows.map((r) => r.frost), 'F'); if (f) bits.push(f);
    const w = span(rows.map((r) => r.water), 'W'); if (w) bits.push(w);
    if (cat.kind === 'pmd') { const t = Math.max(...rows.map((r) => Math.abs(r.pmd))); bits.push(`ПМД до −${t}${NBSP}°C`); }
    return bits.join(', ');
  }
  if (cat.kind === 'rebar') {
    const d = cat.rows.map((r) => r.diameter);
    return `Диаметр ${Math.min(...d)}–${Math.max(...d)}${NBSP}мм, ${cat.rows.length} ${plural(cat.rows.length, 'позиция', 'позиции', 'позиций')}`;
  }
  return `${cat.rows.length} ${plural(cat.rows.length, 'состав', 'состава', 'составов')} в прайсе`;
}

export function productCard(ctx, item, { level = 4 } = {}) {
  const photo = item.photo && ctx.images.has(item.photo) ? item.photo : null;
  const title = level === 3 ? h`<h3 class="pcard__t"><a href="${item.url}">${item.name}</a></h3>` : h`<h4 class="pcard__t"><a href="${item.url}">${item.name}</a></h4>`;
  return h`<li><article class="pcard">
${photo ? h`<figure class="pcard__ph">${img(ctx, photo, { sizes: '(max-width:700px) 92vw, (max-width:1100px) 46vw, 380px', alt: '' })}</figure>` : ''}
<div class="pcard__b">
${title}
<p class="pcard__m">${item.meta}</p>
<div class="pcard__f"><p class="pcard__p">от ${fmtNum(item.from)}${NBSP}₽ <small>/${item.unit}</small></p><p class="pcard__go">Подобрать${icon(ctx, 'arrow')}</p></div>
</div>
</article></li>`;
}

// Если для категории нет подходящего снимка, берём фото завода: карточка без картинки выглядит сломанной.
const fallbackPhoto = (ctx) => ctx.photos.find((p) => p.role === 'hero')?.file ?? null;

export function productItems(ctx, group) {
  const list = ctx.categories.filter((c) => c.group === group).map((c) => ({
    slug: c.slug, name: c.menu, url: `/catalog/${c.slug}/`, photo: pagePhoto(ctx, c.slug) ?? fallbackPhoto(ctx), meta: cardMeta(ctx, c),
    from: Math.min(...c.rows.map((r) => r.price)), unit: unitOf(c)
  }));
  if (ctx.rental && ctx.rental.group === group) {
    const min = ctx.rental.units.reduce((a, b) => (b.price < a.price ? b : a));
    list.push({ slug: 'arenda-abn', name: 'Аренда автобетононасоса', url: '/catalog/arenda-abn/', photo: pagePhoto(ctx, 'arenda-abn') ?? fallbackPhoto(ctx), meta: `Вылет стрелы ${reachSpan(ctx)}`, from: min.price, unit: min.unit });
  }
  return list;
}

export function productGroups(ctx) {
  // Первая группа (бетон) занимает всю ширину, в её последней ячейке стоит призыв позвонить.
  // Остальные группы по две карточки идут рядом, иначе половина строки пустует.
  const groups = GROUP_ORDER.map((g) => ({ g, list: productItems(ctx, g) })).filter((x) => x.list.length);
  const block = ({ g, list }, i) => h`<div class="pgroup">
<div class="pgroup__h"><h3>${g}</h3><span>${list.length} ${plural(list.length, 'раздел', 'раздела', 'разделов')}, от ${fmtNum(Math.min(...list.map((x) => x.from)))}${NBSP}₽</span></div>
<ul class="pgrid">${join(list.map((it) => productCard(ctx, it, { level: 4 })))}${i === 0 ? h`<li class="pgrid__cta pgrid__cta--${3 - (list.length % 3)}"><div class="pcard pcard--cta"><span class="pcard__cico">${icon(ctx, 'chat')}</span><p class="pcard__t">Нужна другая марка или смесь?</p><p>Назовите объём, конструкцию и адрес. Подберём состав и назовём цену с доставкой.</p><a class="btn btn--primary btn--sm" href="${telHref(ctx)}">${icon(ctx, 'phone')}${ctx.site.phone.display}</a></div></li>` : ''}</ul>
</div>`;
  return h`${groups.slice(0, 1).map((g) => block(g, 0))}${groups.length > 1 ? h`<div class="pgroup-rest">${join(groups.slice(1).map((g, i) => block(g, i + 1)))}</div>` : ''}`;
}

// ---------- карта: точка организации на Яндекс Картах ----------
// Виджет «организация» показывает метку завода и карточку с отзывами. iframe грузится при прокрутке (loading=lazy).
export function mapSection(ctx, { title = 'Как нас найти', band = true, sub = null } = {}) {
  const p = ctx.site.plant;
  if (!p.yandex_org_id) return '';
  const oid = p.yandex_org_id;
  const route = p.geo ? `https://yandex.ru/maps/?rtext=~${p.geo.lat},${p.geo.lon}&rtt=auto` : p.yandex_url;
  const r = ctx.site.card?.rating;
  return h`<section class="section${band ? ' section--band' : ''}" id="map"><div class="container">
${sh('Адрес', title, sub ?? `Завод ${p.locality_in}: ${p.address}. Метка на карте это карточка организации на Яндекс Картах.`, { row: true })}
<div class="mapgrid">
<div class="mapinfo">
<dl class="kv kv--tight">
<dt>Адрес</dt><dd>${p.address}</dd>
<dt>Телефон</dt><dd><a href="${telHref(ctx)}">${ctx.site.phone.display}</a></dd>
<dt>Режим</dt><dd>${HOURS_TEXT}: заявки, отгрузка и доставка</dd>
${r ? h`<dt>Оценка</dt><dd>${String(r.value).replace('.', ',')} из 5 на Яндекс Картах, ${r.count} ${plural(r.count, 'оценка', 'оценки', 'оценок')}</dd>` : ''}
</dl>
<div class="mapinfo__btns"><a class="btn btn--primary btn--sm" href="${route}" rel="noopener" target="_blank">${icon(ctx, 'pin')}Построить маршрут</a><a class="btn btn--ghost btn--sm" href="https://yandex.ru/maps/org/${oid}/" rel="noopener" target="_blank">Отзывы и фото</a></div>
</div>
<div class="mapframe"><iframe src="https://yandex.ru/map-widget/v1/?ol=biz&amp;oid=${oid}${p.geo ? raw(`&amp;ll=${p.geo.lon}%2C${p.geo.lat}&amp;z=16`) : ''}" title="Карта: завод ${p.locality_in} на Яндекс Картах" width="100%" height="440" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe></div>
</div>
</div></section>`;
}

// ---------- рейтинг и отзывы с Яндекс Карт ----------
const stars = (ctx, v) => h`<span class="stars" aria-hidden="true">${join([1, 2, 3, 4, 5].map((n) => icon(ctx, 'star-f', n <= Math.round(v) ? '' : 'off')))}</span>`;

export function ratingPanel(ctx) {
  const { site } = ctx;
  const r = site.card?.rating;
  return h`<div class="rating">
${r ? h`<div><div class="rating__n">${String(r.value).replace('.', ',')}<small>/ 5</small></div>${stars(ctx, r.value)}</div>` : h`<div>${icon(ctx, 'pin')}</div>`}
<p>${r ? h`<b>${String(r.value).replace('.', ',')} из 5 по ${r.count} ${plural(r.count, 'оценке', 'оценкам', 'оценкам')} на Яндекс Картах.</b> ` : ''}Отзывы, фото и маршрут до завода лежат в карточке организации. Там же можно оставить свой отзыв после заказа.</p>
<a class="btn btn--ghost btn--sm" href="${site.plant.yandex_url}" rel="noopener" target="_blank">Смотреть на Яндекс Картах${icon(ctx, 'arrow')}</a>
</div>`;
}

// Имя автора отзыва: без лишних знаков, фамилия сокращается до инициала.
const reviewer = (a) => {
  const w = String(a).replace(/[.\s]+$/g, '').trim().split(/\s+/);
  return w.length > 1 ? `${w[0]} ${[...w[1]][0].toUpperCase()}.` : w[0];
};
export function reviewsGrid(ctx) {
  const items = ctx.site.reviews?.items ?? [];
  if (!items.length) return '';
  return h`<div class="reviews">${join(items.map((r) => h`<blockquote class="review">${r.rating ? stars(ctx, r.rating) : ''}<p>${r.text}</p><cite><b>${reviewer(r.author)}</b>${r.date ? h`, <time datetime="${r.date}">${r.date.split('-').reverse().join('.')}</time>` : ''}, отзыв на Яндекс Картах</cite></blockquote>`))}</div>`;
}

// ---------- список статей ----------
export function articleCard(ctx, a, { level = 3 } = {}) {
  const t = level === 2 ? h`<h2 class="acard__t"><a href="${a.url}">${a.title}</a></h2>` : h`<h3 class="acard__t"><a href="${a.url}">${a.title}</a></h3>`;
  return h`<li><article class="acard">
${a.photo && ctx.images.has(a.photo) ? h`<figure class="acard__ph">${img(ctx, a.photo, { sizes: '(max-width:700px) 92vw, (max-width:1100px) 46vw, 380px', alt: '' })}</figure>` : ''}
<div class="acard__b">
<time datetime="${a.date}">${a.dateRu}, ${a.minutes} мин чтения</time>
${t}
<p>${a.lead}</p>
</div>
</article></li>`;
}

export function articleList(ctx, { limit = 99, title, sub, eyebrow = 'Статьи завода', more = false, level = 3, band = false, list = null, feat = false } = {}) {
  const items = (list ?? ctx.articles ?? []).slice(0, limit);
  if (!items.length) return '';
  return h`<section class="section${band ? ' section--band' : ''}"><div class="container">
${more ? h`<div class="sh sh--row"><div><p class="eyebrow">${eyebrow}</p><h2>${title}</h2></div><p class="sh__link">${sub ? h`${sub} ` : ''}<a class="link-arrow" href="/stati/">Все статьи, ${ctx.articles.length}${icon(ctx, 'arrow')}</a></p></div>` : sh(eyebrow, title, sub)}
<ul class="agrid${feat ? ' agrid--feat' : ''}">${join(items.map((a) => articleCard(ctx, a, { level })))}</ul>
</div></section>`;
}
