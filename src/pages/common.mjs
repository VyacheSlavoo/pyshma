// Блоки, которые повторяются на разных страницах.
import { h, raw, join, fmtNum, NBSP, plural } from '../lib/util.mjs';
import { icon, img, telHref, messengers, HOURS_TEXT, leadForm, minVolText } from '../lib/layout.mjs';
import { MARK_ORDER, markNum } from '../lib/marks.mjs';

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

export function ctaBand(ctx, { title = 'Рассчитаем бетон под ваш объём', sub, source }) {
  return h`<section class="cta"><div class="container split">
<div>
<h2>${title}</h2>
<p>${sub ?? `Назовите марку, объём и адрес, и мы назовём стоимость с доставкой. Минимальный заказ ${minVolText(ctx)}. ${HOURS_TEXT}.`}</p>
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
<button class="btn btn--blue" type="submit">Посчитать</button>
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
export function pickupLine(ctx) {
  return ctx.site.card?.pickup ? `Самовывоз с завода: ${ctx.site.plant.address}.` : null;
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
