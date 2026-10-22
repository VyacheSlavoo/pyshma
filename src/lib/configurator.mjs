// Конфигуратор характеристик: подбор позиции прайса по выбранным параметрам и расчёт стоимости.
// Все позиции и цены берутся из тех же строк прайса, что и таблицы на странице: расхождение между ними невозможно.
// Страница отдаётся с готовой разметкой (выбрана самая дешёвая позиция), скрипт только переключает выбор.
import { h, raw, join, fmtNum, NBSP } from './util.mjs';
import { MARKS, MOBILITY, markNum } from './marks.mjs';

const MINUS = '−';
const TRANSLIT = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ы: 'y', э: 'e', ю: 'yu', я: 'ya' };
export const slugify = (s) => String(s).toLowerCase().replace(/[а-яё]/g, (c) => TRANSLIT[c] ?? '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const CAT_CODE = {
  'tovarnyy-beton': 'tb', 'beton-s-pmd': 'pmd', 'fibrobeton': 'fib', 'gidrotehnicheskiy-beton': 'gid', 'beton-na-melkom-share': 'ms',
  'beton-na-granite': 'gr', 'beton-na-gravii': 'gv', 'keramzitobeton': 'kz', 'suhoy-beton': 'dry', 'rastvory': 'rs', 'tsps': 'cps', 'armatura': 'arm', 'arenda-abn': 'abn'
};
const CAT_HINT = {
  'tovarnyy-beton': 'Обычная бетонная смесь заводского изготовления по ГОСТ 7473-2010.',
  'beton-s-pmd': 'Смесь с противоморозной добавкой для заливки на холоде.',
  'fibrobeton': 'Бетон с армирующими волокнами: меньше риск трещин.',
  'gidrotehnicheskiy-beton': 'Повышенная водонепроницаемость и морозостойкость для конструкций в воде и во влажной среде.',
  'beton-na-melkom-share': 'Щебень мелкой фракции: для тонких сечений и густого армирования.',
  'keramzitobeton': 'Лёгкий бетон на керамзитовом заполнителе.',
  'suhoy-beton': 'Сухая смесь для небольших объёмов и работ по этапам.'
};
const FILLER = { granite: 'гранит', gravel: 'гравий' };

const num = (s) => parseInt(String(s).replace(/\D/g, ''), 10);
const minus = (n) => `${MINUS}${Math.abs(n)}`;

// Ключ позиции: он же якорь в адресе (#m300-p3-f150-w6) и атрибут data-k у строки таблицы.
export function concreteKey(cat, r, withCat = false) {
  const t = [r.markSlug];
  if (r.pmd != null) t.push(`t${Math.abs(r.pmd)}`);
  if (r.mobility) t.push(`p${num(r.mobility)}`);
  if (r.frost) t.push(`f${num(r.frost)}`);
  if (r.water) t.push(`w${num(r.water)}`);
  if (r.filler) t.push(r.filler === 'granite' ? 'gr' : 'gv');
  return (withCat ? [CAT_CODE[cat.slug] ?? cat.slug, ...t] : t).join('-');
}
export const rebarKey = (r) => `d${r.diameter}-${slugify(r.group ?? '')}`;
export const namedKey = (r) => slugify(r.name);

export function rowKeyFor(cat, r, mode) {
  if (!mode) return null;
  if (cat.kind === 'rebar') return rebarKey(r);
  if (cat.kind === 'mortar') return namedKey(r);
  return concreteKey(cat, r, mode === 'cat');
}

// ---------- подсказки к выбранным значениям ----------
const hintMobility = (v) => { const m = MOBILITY.find((x) => x[0] === v); return m ? `${v}: ${m[1]}, ${m[2]}.` : ''; };
const hintFrost = (v) => (v ? `${v}: образец выдерживает ${num(v)} циклов замораживания и оттаивания (ГОСТ 10060).` : '');
const hintWater = (v) => (v ? `${v}: образец остаётся сухим при давлении воды ${String(num(v) / 10).replace('.', ',')}${NBSP}МПа (ГОСТ 12730.5).` : '');
const hintPmd = (v) => (v === '' ? 'Смесь без противоморозной добавки: для заливки в тёплое время.' : `ПМД до ${minus(Number(v))}${NBSP}°C: нижняя температура воздуха, для которой подобрана смесь. Режим выдерживания на морозе определяет технолог объекта.`);

// ---------- сборка описания конфигуратора из прайса ----------
// entries: [{ cat, r }]. withCat: ключи с кодом категории (страница марки, где смешаны разные виды бетона).
export function concreteSpec(ctx, entries, { withCat = false, qtyDef = 5 } = {}) {
  const uniq = (get) => [...new Set(entries.map(get))];
  const rows = entries.map((e) => {
    const { cat, r } = e;
    const a = { cat: cat.slug, mark: r.mark, pmd: r.pmd == null ? '' : String(r.pmd), mob: r.mobility ?? '', frost: r.frost ?? '', water: r.water ?? '', fill: r.filler ?? '' };
    const parts = [r.pmd != null ? `ПМД до ${minus(r.pmd)}${NBSP}°C` : null, r.mobility, r.frost, r.water, r.filler ? FILLER[r.filler] ?? r.filler : null].filter(Boolean);
    return { k: concreteKey(cat, r, withCat), a, p: r.price, u: 'м³', l: `${cat.menu} ${r.mark} (${r.cls})${parts.length ? `, ${parts.join(', ')}` : ''}`, cls: r.cls };
  });

  const choice = (id, label, values, textOf, subOf, hintOf, wide = false) => {
    if (values.length < 2) return null;
    return { id, label, wide, opts: values.map((v) => ({ v, t: textOf(v), s: subOf?.(v) ?? '', h: hintOf?.(v) ?? '' })) };
  };
  const sortNum = (vals) => [...vals].sort((x, y) => (x === '' ? 1 : y === '' ? -1 : num(x) - num(y)));
  const markVals = uniq((e) => e.r.mark).sort((x, y) => markNum(x) - markNum(y));
  const clsOf = (m) => entries.find((e) => e.r.mark === m).r.cls;
  const catVals = ctx.categories.map((c) => c.slug).filter((s) => entries.some((e) => e.cat.slug === s));
  const catName = (s) => ctx.categories.find((c) => c.slug === s).menu;
  const pmdVals = uniq((e) => (e.r.pmd == null ? '' : String(e.r.pmd))).sort((x, y) => (x === '' ? -1 : y === '' ? 1 : Math.abs(Number(x)) - Math.abs(Number(y))));
  const mobVals = sortNum(uniq((e) => e.r.mobility ?? ''));
  const frostVals = sortNum(uniq((e) => e.r.frost ?? ''));
  const waterVals = sortNum(uniq((e) => e.r.water ?? ''));
  const fillVals = uniq((e) => e.r.filler ?? '');

  const attrs = [
    choice('cat', 'Вид бетона', catVals, catName, null, (v) => CAT_HINT[v] ?? ''),
    choice('mark', 'Марка и класс', markVals, (v) => v, clsOf, (v) => MARKS[v]?.lead ?? ''),
    choice('pmd', 'Противоморозная добавка', pmdVals, (v) => (v === '' ? 'без добавки' : `до ${minus(Number(v))}${NBSP}°C`), null, hintPmd),
    choice('mob', 'Подвижность', mobVals, (v) => v || 'не указана', null, hintMobility),
    choice('frost', 'Морозостойкость', frostVals, (v) => v || 'не указана', null, hintFrost),
    choice('water', 'Водонепроницаемость', waterVals, (v) => v || 'не указана', null, hintWater),
    choice('fill', 'Заполнитель', fillVals, (v) => FILLER[v] ?? (v || 'не указан'), null, null)
  ].filter(Boolean);

  return {
    kind: 'concrete', title: 'Подберите бетон и посчитайте стоимость', attrs, rows,
    qty: { label: 'Объём', unit: 'м³', min: ctx.site.min_volume_m3, step: 0.5, def: Math.max(qtyDef, ctx.site.min_volume_m3) },
    what: 'Стоимость бетона', per: 'за м³', date: ctx.priceDateRu
  };
}

export function mortarSpec(ctx, cat) {
  const rows = cat.rows.map((r) => ({ k: namedKey(r), a: { name: r.name }, p: r.price, u: r.unit, l: r.name, s: r.spec ?? '' }));
  const unit = cat.rows[0].unit;
  return {
    kind: 'list', title: 'Выберите состав и посчитайте стоимость',
    attrs: [{ id: 'name', label: cat.slug === 'tsps' ? 'Состав' : 'Раствор', wide: true, opts: cat.rows.map((r) => ({ v: r.name, t: r.name, s: r.spec ?? '', h: '' })) }],
    rows, qty: { label: 'Объём', unit, min: ctx.site.min_volume_m3, step: 0.5, def: Math.max(3, ctx.site.min_volume_m3) },
    what: 'Стоимость материала', per: `за ${unit}`, date: ctx.priceDateRu
  };
}

export function rebarSpec(ctx, cat) {
  const groups = [...new Set(cat.rows.map((r) => r.group))];
  const diams = [...new Set(cat.rows.map((r) => r.diameter))].sort((a, b) => a - b);
  const rows = cat.rows.map((r) => ({ k: rebarKey(r), a: { group: r.group, dia: String(r.diameter) }, p: r.price, u: r.unit, l: r.name }));
  return {
    kind: 'rebar', title: 'Выберите диаметр и посчитайте стоимость',
    attrs: [
      { id: 'group', label: 'Класс и сталь', opts: groups.map((g) => ({ v: g, t: g, s: '', h: '' })) },
      { id: 'dia', label: 'Диаметр, мм', opts: diams.map((d) => ({ v: String(d), t: String(d), s: '', h: '' })) }
    ],
    rows, qty: { label: 'Масса', unit: 'т', min: 0.1, step: 0.1, def: 1 },
    what: 'Стоимость металла', per: 'за тонну', date: ctx.priceDateRu
  };
}

export function rentalSpec(ctx) {
  const rows = ctx.rental.units.map((u) => ({ k: slugify(u.name), a: { name: u.name }, p: u.price, u: u.unit, l: u.name, s: u.reach_text ? `вылет стрелы ${u.reach_text}` : '' }));
  return {
    kind: 'list', title: 'Подберите насос и посчитайте стоимость',
    attrs: [{ id: 'name', label: 'Автобетононасос', wide: true, opts: rows.map((r) => ({ v: r.a.name, t: r.a.name, s: r.s, h: '' })) }],
    rows, qty: { label: 'Время работы', unit: 'ч', min: 1, step: 1, def: 4 },
    what: 'Стоимость аренды', per: 'за час', date: ctx.priceDateRu
  };
}

// ---------- разметка ----------
let seq = 0;
export function renderConfigurator(ctx, spec, { deliveryNote, tel, lead }) {
  const id = `cfg${++seq}`;
  const cheapest = spec.rows.reduce((a, b) => (b.p < a.p ? b : a));
  const def = cheapest;
  const data = { kind: spec.kind, attrs: spec.attrs.map((a) => ({ id: a.id, label: a.label })), opts: Object.fromEntries(spec.attrs.map((a) => [a.id, a.opts])), rows: spec.rows, def: def.k, qty: spec.qty, per: spec.per };
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  const price = (p) => `${fmtNum(p)}${NBSP}₽`;
  const group = (a) => h`<fieldset class="cfg__grp" data-attr="${a.id}">
<legend>${a.label}</legend>
<div class="cfg__opts">${join(a.opts.map((o) => h`<label class="opt${a.wide ? ' opt--wide' : ''}"><input type="radio" name="${id}-${a.id}" value="${o.v}"${def.a[a.id] === o.v ? raw(' checked') : ''}><span>${o.t}${o.s ? h`<small>${o.s}</small>` : ''}<em class="sr" data-na-t></em></span></label>`))}</div>
<p class="cfg__hint" data-hint="${a.id}">${a.opts.find((o) => o.v === def.a[a.id])?.h ?? ''}</p>
</fieldset>`;
  return h`<div class="cfg-wrap">
<div class="section__head"><h2 id="${id}-h">${spec.title}</h2>${lead ? h`<p>${lead}</p>` : ''}</div>
<section class="cfg" data-cfg aria-labelledby="${id}-h">
<script type="application/json" data-cfg-data>${raw(json)}</script>
<div class="cfg__mini" aria-hidden="true"><span data-o="mini-des">${def.l}</span><b data-o="mini-price">${price(def.p)}</b></div>
<div class="cfg__grid">
<div class="cfg__ctl">
${join(spec.attrs.map(group))}
</div>
<div class="cfg__res"><div class="cfg__res-in">
<p class="cfg__des" data-o="des">${def.l}<small data-o="sub">${def.s ?? ''}</small></p>
<p class="cfg__price"><span data-o="price">${price(def.p)}</span><small data-o="per">${spec.per}</small></p>
<p class="cfg__date">Цена на <time datetime="${ctx.priceDateIso}">${spec.date}</time></p>
<div class="cfg__qty">
<div class="field"><label for="${id}-q"><span>${spec.qty.label}, ${spec.qty.unit}</span></label>
<div class="step"><button type="button" data-step="-1" aria-label="Уменьшить">${MINUS}</button><input id="${id}-q" data-o="qty" type="text" inputmode="decimal" value="${fmtNum(spec.qty.def)}" autocomplete="off"><button type="button" data-step="1" aria-label="Увеличить">+</button></div></div>
</div>
<p class="cfg__total">${spec.what}: <b data-o="total">${price(def.p * spec.qty.def)}</b></p>
<p class="cfg__note">${deliveryNote}</p>
<p class="cfg__chg" role="status" aria-live="polite" data-o="chg"></p>
<div class="cfg__act">
<button type="button" class="btn btn--primary" data-open-lead hidden data-item="${def.l}" data-volume="${fmtNum(spec.qty.def)}${NBSP}${spec.qty.unit}">Оставить заявку</button>
<a class="btn btn--ghost" href="${tel}">Позвонить</a>
</div>
<button type="button" class="cfg__link" data-copy hidden>Скопировать ссылку на этот выбор</button>
</div></div>
</div>
</section>
</div>`;
}
