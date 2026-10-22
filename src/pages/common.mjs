// Блоки, которые повторяются на разных страницах.
import { h, raw, join, fmtNum, NBSP, plural } from '../lib/util.mjs';
import { icon, img, telHref, messengers, HOURS_TEXT, leadForm, minVolText } from '../lib/layout.mjs';
import { MARK_ORDER, markNum } from '../lib/marks.mjs';
import { GROUP_ORDER, CONCRETE_KINDS } from '../lib/categories.mjs';
import { markSpan, span, mobSpan } from './copy.mjs';

export const T = (ctx, key, fallback) => (ctx.texts[key] !== undefined ? ctx.texts[key] : fallback);

// Фото для шапок страниц: подбираются по смыслу страницы. Если файла нет в photos.json, фото не выводится.
const PAGE_PHOTO = {
  'tovarnyy-beton': 'plita-opalubka.jpg', 'beton-s-pmd': 'zima-mikser-nasos.jpg', 'fibrobeton': 'plita-svezhaya.jpg',
  'gidrotehnicheskiy-beton': 'plita-uchastok.jpg', 'beton-na-melkom-share': 'beton-v-tachke.jpg', 'keramzitobeton': 'pol-pomeschenie.jpg',
  'suhoy-beton': 'opalubka-lenta.jpg', 'rastvory': 'mikser-zhelob.jpg', 'tsps': 'plita-gotovaya.jpg', 'armatura': 'armokarkas.jpg',
  'arenda-abn': 'abn-strela-vylet.jpg', 'price': 'abn-podacha.jpg', 'dostavka': 'mikser-v-nasos.jpg', 'about': 'uzel-territoriya.jpg',
  'contacts': 'uzel-silosy.jpg', 'm200': 'opalubka-lenta.jpg', 'm250': 'plita-uchastok.jpg', 'm300': 'plita-svezhaya.jpg', 'm350': 'abn-podacha-plita.jpg',
  'ekaterinburg': 'abn-gorod.jpg'
};
export const pagePhoto = (ctx, key) => { const f = PAGE_PHOTO[key]; return f && ctx.photos.some((p) => p.file === f) ? f : null; };

// facts: [[подпись, значение], ...]: ячейки спецификации под заголовком
export function pagehead(ctx, { h1, lead, facts = [], actions = true, photo = null }) {
  const ph = photo && ctx.images.has(photo) ? photo : null;
  return h`<section class="pagehead${ph ? '' : ' pagehead--plain'}"><div class="container pagehead__in">
<div class="pagehead__txt">
<h1>${h1}</h1>
${lead ? h`<p class="pagehead__lead">${lead}</p>` : ''}
${facts.length ? h`<dl class="specs">${join(facts.map(([k, v]) => h`<div><dt>${k}</dt><dd>${v}</dd></div>`))}</dl>` : ''}
${actions ? h`<div class="pagehead__cta"><a class="btn btn--primary" href="${telHref(ctx)}">${icon(ctx, 'phone')}${ctx.site.phone.display}</a>${messengers(ctx).slice(0, 1).map((m) => h`<a class="btn btn--ghost" href="${m.url}" rel="noopener" target="_blank">${icon(ctx, m.icon)}${m.label}</a>`)}</div>` : ''}
</div>
${ph ? h`<figure class="pagehead__ph">${img(ctx, ph, { sizes: '(max-width:980px) 100vw, 40vw', eager: true })}</figure>` : ''}
</div></section>`;
}

export function ctaBand(ctx, { title = 'Рассчитаем стоимость под ваш объём', sub, source }) {
  return h`<section class="cta"><div class="container split">
<div>
<h2>${title}</h2>
<p>${sub ?? `Оставьте заявку или позвоните: уточним марку и способ подачи, назовём цену с доставкой. Заказ от ${minVolText(ctx)}.`}</p>
<a class="cta__tel" href="${telHref(ctx)}">${ctx.site.phone.display}</a>
</div>
${leadForm(ctx, { title: 'Заявка на расчёт', source })}
</div></section>`;
}

export function gallery(ctx, roles = ['hero', 'plant', 'fleet', 'lab', 'object'], { title = 'Завод и техника', sub, max = 99, more = false } = {}) {
  const list = ctx.photos.filter((p) => roles.includes(p.role)).slice(0, max);
  if (list.length < 2) return '';
  return h`<section class="section section--sand"><div class="container">
<div class="section__head"><h2>${title}</h2>${sub ? h`<p>${sub}</p>` : ''}</div>
<div class="gallery">${join(list.map((p) => h`<a href="${ctx.images.get(p.file).full}" data-lightbox data-icons="${ctx.assets.icons}" data-alt="${p.alt}" data-caption="${p.caption ?? ''}">${img(ctx, p.file, { sizes: '(max-width:700px) 50vw, 25vw' })}</a>`))}</div>
${more && ctx.photos.length > list.length ? h`<p style="margin-top:24px"><a class="btn btn--ghost" href="/gallery/">Все фото, ${ctx.photos.length}</a></p>` : ''}
</div></section>`;
}

// Направления доставки: строки со ссылками. origin: первой строкой завод.
export function cityCards(ctx, list = ctx.cities, { origin = false } = {}) {
  const plant = ctx.site.plant;
  if (!list.length && !origin) return '';
  return h`<ul class="dirs">
${origin ? h`<li><div class="dirs__row"><b>${plant.locality}</b><span>завод, самовывоз: ${plant.address}</span></div></li>` : ''}
${join(list.map((c) => h`<li><a href="${c.url}"><b>${c.name}</b><span>${[c.distance_km != null ? `${fmtNum(c.distance_km)}${NBSP}км от завода` : null, c.travel_time, c.distance_km == null && !c.travel_time ? `доставка с завода ${plant.locality_from}` : null].filter(Boolean).join(', ')}</span></a></li>`))}
</ul>`;
}

export function volumeCalc(ctx) {
  return h`<form id="calc" class="calc" data-min="${ctx.site.min_volume_m3}" novalidate>
<label class="field"><span>Длина, м</span><input name="l" inputmode="decimal" placeholder="10"></label>
<label class="field"><span>Ширина, м</span><input name="w" inputmode="decimal" placeholder="6"></label>
<label class="field"><span>Высота или толщина, м</span><input name="t" inputmode="decimal" placeholder="0,3"></label>
<button class="btn btn--primary" type="submit">Посчитать</button>
<div class="calc__out" hidden role="status" aria-live="polite" style="grid-column:1/-1"></div>
<button class="btn btn--primary" type="button" data-open-lead hidden style="grid-column:1/-1">Заказать этот объём</button>
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


// ---------- карточки продукции ----------
const unitOf = (cat) => (cat.kind === 'rebar' ? 'т' : cat.rows[0]?.unit ?? 'м³');

// Краткая строка параметров под названием: только то, что есть в прайсе.
export function cardMeta(ctx, cat) {
  if (CONCRETE_KINDS.has(cat.kind)) {
    const rows = cat.rows;
    const bits = [`Марки ${markSpan(rows)}`];
    const mob = mobSpan(rows); if (mob) bits.push(`подвижность ${mob}`);
    const f = span(rows.map((r) => r.frost), 'F'); if (f) bits.push(f);
    const w = span(rows.map((r) => r.water), 'W'); if (w) bits.push(w);
    if (cat.kind === 'pmd') { const t = Math.max(...rows.map((r) => Math.abs(r.pmd))); bits.push(`ПМД до \u2212${t}${NBSP}°C`); }
    return bits.join(', ');
  }
  if (cat.kind === 'rebar') {
    const d = cat.rows.map((r) => r.diameter);
    return `Диаметр ${Math.min(...d)}–${Math.max(...d)}${NBSP}мм, ${cat.rows.length} ${plural(cat.rows.length, 'позиция', 'позиции', 'позиций')}`;
  }
  return `${cat.rows.length} ${plural(cat.rows.length, 'состав', 'состава', 'составов')} в прайсе`;
}

export function productCard(ctx, item, { level = 4 } = {}) {
  const tag = level === 3 ? 'h3' : 'h4';
  const photo = item.photo && ctx.images.has(item.photo) ? item.photo : null;
  const title = tag === 'h3' ? h`<h3 class="pcard__t"><a href="${item.url}">${item.name}</a></h3>` : h`<h4 class="pcard__t"><a href="${item.url}">${item.name}</a></h4>`;
  return h`<li><article class="pcard">
${photo ? h`<figure class="pcard__ph">${img(ctx, photo, { sizes: '(max-width:700px) 38vw, (max-width:1100px) 33vw, 22vw', alt: '' })}</figure>` : ''}
<div class="pcard__b">
${title}
<p class="pcard__m">${item.meta}</p>
<p class="pcard__p">от <b>${fmtNum(item.from)}${NBSP}₽</b> <small>за ${item.unit}</small></p>
</div>
</article></li>`;
}

// Если для категории нет подходящего снимка, берём фото завода: карточка без картинки выглядит сломанной.
const fallbackPhoto = (ctx) => ctx.photos.find((p) => p.role === 'hero')?.file ?? null;

export function productGroups(ctx, { level = 3 } = {}) {
  const items = (group) => {
    const list = ctx.categories.filter((c) => c.group === group).map((c) => ({
      name: c.menu, url: `/catalog/${c.slug}/`, photo: pagePhoto(ctx, c.slug) ?? fallbackPhoto(ctx), meta: cardMeta(ctx, c),
      from: Math.min(...c.rows.map((r) => r.price)), unit: unitOf(c)
    }));
    if (ctx.rental && ctx.rental.group === group) {
      const min = ctx.rental.units.reduce((a, b) => (b.price < a.price ? b : a));
      list.push({ name: 'Аренда автобетононасоса', url: '/catalog/arenda-abn/', photo: pagePhoto(ctx, 'arenda-abn') ?? fallbackPhoto(ctx), meta: `Вылет стрелы ${reachSpan(ctx)}`, from: min.price, unit: min.unit });
    }
    return list;
  };
  return join(GROUP_ORDER.map((g) => ({ g, list: items(g) })).filter((x) => x.list.length).map(({ g, list }, i) => h`<div class="pgroup pgroup--${i}">
<h3>${g}</h3>
<ul class="pgrid">${join(list.map((it) => productCard(ctx, it, { level: 4 })))}</ul>
</div>`));
}

// ---------- карточка организации на Яндекс Картах ----------
export function yandexBlock(ctx) {
  const { site } = ctx;
  const r = site.card?.rating;
  return h`<div class="yx">
${r ? h`<span class="yx__r">${String(r.value).replace('.', ',')}</span>` : ''}
<p class="yx__t">${r ? `Оценка завода на Яндекс Картах по ${r.count} ${plural(r.count, 'оценке', 'оценкам', 'оценкам')}. ` : ''}Отзывы, фото и маршрут есть в карточке организации.</p>
<a class="btn btn--ghost btn--sm" href="${site.plant.yandex_url}" rel="noopener" target="_blank">Открыть карточку на Яндекс Картах</a>
</div>`;
}

// ---------- список статей ----------
export function articleCard(ctx, a, { level = 3 } = {}) {
  const t = level === 2 ? h`<h2 class="acard__t"><a href="${a.url}">${a.title}</a></h2>` : h`<h3 class="acard__t"><a href="${a.url}">${a.title}</a></h3>`;
  return h`<li><article class="acard">
<time datetime="${a.date}">${a.dateRu}</time>
${t}
<p>${a.lead}</p>
${a.photo && ctx.images.has(a.photo) ? h`<figure class="acard__ph">${img(ctx, a.photo, { sizes: '(max-width:700px) 100vw, 280px', alt: '' })}</figure>` : ''}
</article></li>`;
}

export function articleList(ctx, { limit = 99, title, sub, more = false, level = 3 } = {}) {
  const list = (ctx.articles ?? []).slice(0, limit);
  if (!list.length) return '';
  return h`<section class="section"><div class="container">
<div class="section__head"><h2>${title}</h2>${sub ? h`<p>${sub}</p>` : ''}</div>
<ul class="alist">${join(list.map((a) => articleCard(ctx, a, { level })))}</ul>
${more && ctx.articles.length > list.length ? h`<p style="margin-top:24px"><a class="btn btn--ghost" href="/stati/">Все статьи</a></p>` : ''}
</div></section>`;
}
