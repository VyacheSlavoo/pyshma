// Блоки, которые повторяются на разных страницах.
import { h, raw, join, fmtNum, NBSP, plural } from '../lib/util.mjs';
import { icon, img, telHref, messengers, HOURS_TEXT, leadForm, minVolText, vatText } from '../lib/layout.mjs';
import { MARK_ORDER } from '../lib/marks.mjs';

export const T = (ctx, key, fallback) => (ctx.texts[key] !== undefined ? ctx.texts[key] : fallback);

export function pagehead(ctx, { h1, lead, facts = [], actions = true }) {
  return h`<section class="pagehead"><div class="container">
<h1>${h1}</h1>
${lead ? h`<p class="pagehead__lead">${lead}</p>` : ''}
${facts.length ? h`<ul class="pagehead__facts">${join(facts.map(([ic, text]) => h`<li>${icon(ctx, ic)}<span>${text}</span></li>`))}</ul>` : ''}
${actions ? h`<div class="hero__ctas"><a class="btn btn--primary" href="${telHref(ctx)}">${icon(ctx, 'phone')}${ctx.site.phone.display}</a>${messengers(ctx).slice(0, 1).map((m) => h`<a class="btn btn--blue" href="${m.url}" rel="noopener" target="_blank">${icon(ctx, m.icon)}${m.label}</a>`)}</div>` : ''}
</div></section>`;
}

export function ctaBand(ctx, { title = 'Рассчитаем бетон под ваш объём', sub, source }) {
  return h`<section class="section section--navy"><div class="container"><div class="split">
<div>
<span class="eyebrow">${HOURS_TEXT}</span>
<h2>${title}</h2>
<p>${sub ?? `Позвоните или оставьте заявку: назовите марку, объём и адрес, мы назовём стоимость с доставкой. Минимальный заказ — ${minVolText(ctx)}.`}</p>
<p><a class="btn btn--primary" href="${telHref(ctx)}">${icon(ctx, 'phone')}${ctx.site.phone.display}</a></p>
</div>
${leadForm(ctx, { title: 'Заявка на расчёт', source })}
</div></div></section>`;
}

export function gallery(ctx, roles = ['plant', 'fleet', 'lab', 'object'], { title = 'Завод и техника', sub } = {}) {
  const list = ctx.photos.filter((p) => roles.includes(p.role));
  if (list.length < 2) return '';
  return h`<section class="section section--sand"><div class="container">
<div class="section__head"><h2>${title}</h2>${sub ? h`<p>${sub}</p>` : ''}</div>
<div class="gallery">${join(list.map((p) => h`<a href="${ctx.images.get(p.file).full}" data-lightbox data-icons="${ctx.assets.icons}" data-alt="${p.alt}" data-caption="${p.caption ?? ''}">${img(ctx, p.file, { sizes: '(max-width:700px) 50vw, 33vw' })}${p.caption ? h`<span class="cap">${p.caption}</span>` : ''}</a>`))}</div>
</div></section>`;
}

export function cityCards(ctx, list = ctx.cities) {
  if (!list.length) return '';
  return h`<div class="grid grid--3">${join(list.map((c) => h`<a class="card card--link city" href="${c.url}">
<h3>${icon(ctx, 'pin')}${c.name}</h3>
<div class="city__meta">${c.distance_km != null ? h`<span>${fmtNum(c.distance_km)}${NBSP}км от завода</span>` : ''}${c.travel_time ? h`<span>${c.travel_time}</span>` : ''}</div>
<span class="city__go">Бетон ${c.in}</span>
</a>`))}</div>`;
}

export function volumeCalc(ctx) {
  return h`<form id="calc" class="calc" data-min="${ctx.site.min_volume_m3}" novalidate>
<label class="field"><span>Длина, м</span><input name="l" inputmode="decimal" placeholder="10"></label>
<label class="field"><span>Ширина, м</span><input name="w" inputmode="decimal" placeholder="6"></label>
<label class="field"><span>Высота или толщина, м</span><input name="t" inputmode="decimal" placeholder="0,3"></label>
<button class="btn btn--blue" type="submit">${icon(ctx, 'calc')}Посчитать</button>
<div class="calc__out" hidden role="status" aria-live="polite" style="grid-column:1/-1"></div>
<button class="btn btn--primary" type="button" data-open-lead hidden style="grid-column:1/-1">Заказать этот объём</button>
</form>`;
}

export function marksRange(ctx) {
  const marks = [...new Set(ctx.categories.filter((c) => c.rows[0]?.mark).flatMap((c) => c.rows.map((r) => r.mark)))]
    .sort((a, b) => MARK_ORDER.indexOf(a) - MARK_ORDER.indexOf(b));
  return marks.length > 1 ? `${marks[0]}–${marks.at(-1)}` : marks[0];
}

export const yearsOnMarket = (ctx) => ctx.now.getUTCFullYear() - ctx.site.founded_year;
export const yearsText = (n) => `${n}${NBSP}${plural(n, 'год', 'года', 'лет')}`;

export function deliveryLine(ctx) {
  const d = ctx.site.delivery;
  return d.price_includes_delivery
    ? 'Доставка включена в цену бетона в пределах зоны, указанной на странице доставки.'
    : 'Цена указана за бетон без доставки. Доставку считаем отдельно по адресу объекта.';
}
