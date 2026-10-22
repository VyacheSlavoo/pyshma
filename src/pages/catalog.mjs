// Прайс (карточки продукции), страницы продукции с конфигуратором, карточки марок.
import { h, raw, join, fmtNum, NBSP, truncate } from '../lib/util.mjs';
import { icon, telHref, HOURS_TEXT, minVolText, priceNote, concreteTable, mortarTable, rebarTables, fromPriceOf, faq } from '../lib/layout.mjs';
import { CONCRETE_KINDS } from '../lib/categories.mjs';
import { MARKS, MOBILITY, markNum } from '../lib/marks.mjs';
import { concreteSpec, mortarSpec, rebarSpec, renderConfigurator } from '../lib/configurator.mjs';
import { baseGraph, faqLd, offerLd } from '../lib/seo.mjs';
import { T, pagehead, ctaBand, cityCards, deliveryLine, deliveryFaq, pickupLine, pagePhoto, productGroups } from './common.mjs';
import { CATEGORY_COPY, markSpan } from './copy.mjs';

const unitOf = (cat) => (cat.kind === 'rebar' ? 'т' : cat.rows[0]?.unit ?? 'м³');
const shortName = (cat) => CATEGORY_COPY[cat.slug]?.short ?? cat.menu;

const cfgOpts = (ctx, lead) => ({ deliveryNote: deliveryLine(ctx), tel: telHref(ctx), lead });
const cfgLead = (ctx) => `Выберите характеристики: обозначение, цена за единицу и стоимость выбранного объёма пересчитаются. Цены из прайса на ${ctx.priceDateRu}.`;

// Таблицы всех позиций категории: под конфигуратором и в сворачиваемых блоках на странице цен.
export function categoryTable(ctx, cat, { keys = false, linkMarks = false } = {}) {
  if (cat.kind === 'mortar') return mortarTable(ctx, cat, { keys });
  if (cat.kind === 'rebar') return rebarTables(ctx, cat, { keys });
  return concreteTable(ctx, cat, cat.rows, { linkMarks, keys });
}

// ---------- Страница цен: карточки продукции ----------
export function pricePage(ctx) {
  const { site } = ctx;
  const lists = ctx.categories.map((c) => h`<div class="more"><details id="${c.slug}">
<summary><span>${c.menu}</span>${icon(ctx, 'chev', 'chev')}</summary>
<div class="more__body">${categoryTable(ctx, c, { linkMarks: c.slug === ctx.mainConcrete.slug })}<p style="margin:16px 0 0"><a href="/catalog/${c.slug}/">${c.menu}: подбор по характеристикам и описание</a></p></div>
</details></div>`);
  const rental = ctx.rental ? h`<div class="more"><details id="arenda-abn">
<summary><span>Аренда автобетононасоса и техники</span>${icon(ctx, 'chev', 'chev')}</summary>
<div class="more__body"><div class="table-wrap"><table class="pt"><thead><tr><th>Техника</th><th class="pr">Цена</th><th class="ac"><span class="sr">Заказ</span></th></tr></thead><tbody>${join([...ctx.rental.units, ...ctx.rental.extras].map((u) => h`<tr>
<td class="mk nm" data-l="Техника">${u.name}</td>
<td class="pr" data-l="Цена"><span class="num">${fmtNum(u.price)}${NBSP}₽</span> <small>/${u.unit}</small></td>
<td class="ac"><a class="rowlink" href="${telHref(ctx)}">Заказать</a></td></tr>`))}</tbody></table></div>
<p style="margin:16px 0 0"><a href="/catalog/arenda-abn/">Подбор насоса и условия аренды</a></p></div>
</details></div>` : '';
  const faqItems = T(ctx, 'faq.price', [
    ['Как часто обновляется прайс-лист?', `Цены на этой странице действуют с ${ctx.priceDateRu}. Стоимость на день заказа подтверждаем по телефону ${site.phone.display}.`],
    ['Можно ли заказать бетон ночью?', `Да. ${HOURS_TEXT}: принимаем заявки, производим и отгружаем круглосуточно.`]
  ]);
  const h1 = `Прайс-лист на бетон и растворы ${site.plant.locality_in}`;
  const main = h`${pagehead(ctx, {
    h1, lead: `Цены завода ${site.plant.locality_in} на бетон, растворы, арматуру и аренду автобетононасоса. Откройте карточку, выберите марку и характеристики, и цена пересчитается на ваш объём.`,
    facts: [['Позиций в прайсе', String(ctx.positions)], ['Цены на', ctx.priceDateRu], ['Получение', site.card?.pickup ? 'доставка или самовывоз' : 'доставка']], photo: pagePhoto(ctx, 'price')
  })}
<section class="section section--tight"><div class="container">
<div class="section__head"><h2>Продукция и цены</h2></div>
${priceNote(ctx)}
${productGroups(ctx)}
</div></section>
<section class="section section--sand"><div class="container">
<div class="section__head"><h2>Все цены списком</h2><p>Те же позиции, что в карточках, без подбора: откройте нужный раздел.</p></div>
${join(lists)}${rental}
</div></section>
${faq(ctx, faqItems)}${ctaBand(ctx, { source: 'price' })}`;
  return {
    url: '/price/', crumbs: [{ name: 'Прайс-лист', url: '/price/' }],
    title: `Прайс-лист на бетон — цены за м³ ${site.plant.locality_in} | ${site.brand}`,
    description: `Цены на бетон ${markSpan(ctx.mainConcrete.rows)} с завода ${site.plant.locality_in}: от ${fmtNum(ctx.fromPrice)}${NBSP}₽/м³. Растворы, ЦПС, арматура, аренда АБН. Работаем 24/7, заказ от ${fmtNum(site.min_volume_m3)}${NBSP}м³.`,
    h1, main, jsonld: [baseGraph(ctx), faqLd(faqItems)]
  };
}

// ---------- Категории ----------
function markGuide(ctx, cat) {
  const marks = [...new Set(cat.rows.map((r) => r.mark))].sort((a, b) => markNum(a) - markNum(b));
  const rowsOf = (m) => cat.rows.filter((r) => r.mark === m);
  return h`<section class="section"><div class="container">
<div class="section__head"><h2>Как выбрать марку</h2><p>Марку и класс бетона задаёт проект конструкции. Если проекта нет, ориентируйтесь на таблицу и уточните у проектировщика.</p></div>
<div class="table-wrap"><table class="pt"><thead><tr><th>Марка</th><th>Класс</th><th>Для чего подходит</th></tr></thead><tbody>${join(marks.map((m) => {
    const k = MARKS[m]; const rows = rowsOf(m);
    const link = ctx.markPages.includes(m);
    return h`<tr><td class="mk" data-l="Марка">${link ? h`<a href="/catalog/${cat.slug}/${rows[0].markSlug}/">${m}</a>` : m}</td><td class="cl" data-l="Класс">${rows[0].cls}</td><td data-l="Применение">${k ? k.lead : '—'}</td></tr>`;
  }))}</tbody></table></div>
</div></section>`;
}

// Шкала подвижности П1–П5 в масштабе: осадка конуса в сантиметрах по ГОСТ 7473-2010.
function slumpScale() {
  const k = 22; // пикселей на сантиметр, ось 0–26 см
  const seg = [['П1', 1, 4], ['П2', 5, 9], ['П3', 10, 15], ['П4', 16, 20], ['П5', 21, 25]];
  const x0 = 6, ticks = [0, 5, 10, 15, 20, 25];
  return raw(`<svg class="slump" viewBox="0 0 600 132" role="img" aria-label="Осадка конуса по классам подвижности: П1 1–4 см, П2 5–9 см, П3 10–15 см, П4 16–20 см, П5 от 21 см">
${seg.map(([n, a, b], i) => { const w = (b + 1 - a) * k - 3, cx = x0 + a * k + w / 2; return `<rect class="slump__b s${i + 1}" x="${x0 + a * k}" y="34" width="${w}" height="40"/><text class="slump__n" x="${cx}" y="26" text-anchor="middle">${n}</text><text class="slump__v v${i + 1}" x="${cx}" y="60" text-anchor="middle">${n === 'П5' ? 'от 21' : `${a}–${b}`}</text>`; }).join('\n')}
<line class="slump__ax" x1="${x0}" y1="82" x2="${x0 + 26 * k}" y2="82"/>
${ticks.map((t) => `<line class="slump__ax" x1="${x0 + t * k}" y1="82" x2="${x0 + t * k}" y2="90"/><text class="slump__t" x="${x0 + t * k}" y="110" text-anchor="middle">${t}</text>`).join('\n')}
<text class="slump__u" x="${x0 + 26 * k}" y="128" text-anchor="end">осадка конуса, см</text>
</svg>`);
}

function glossary(ctx, cat, full) {
  const has = (k) => cat.rows.some((r) => r[k]);
  const pmd = cat.kind === 'pmd';
  if (!has('mobility') && !has('frost') && !has('water') && !pmd) return '';
  if (!full) {
    return pmd ? h`<section class="section section--sand"><div class="container prose">
<h2>Что значит ПМД</h2>
<p><b>ПМД: противоморозная добавка.</b> Число в графе «ПМД до» показывает нижнюю температуру воздуха, для которой подобрана смесь. Режим выдерживания бетона на морозе определяет технолог объекта по СП 70.13330. Значения П, F и W описаны в разделе <a href="/catalog/${ctx.mainConcrete.slug}/#pfw">товарного бетона</a>.</p>
</div></section>` : '';
  }
  return h`<section class="section section--sand" id="pfw"><div class="container"><div class="split">
<div>
<div class="section__head"><h2>Что означают П, F и W в прайсе</h2></div>
<p><b>П: подвижность смеси</b> (ГОСТ 7473-2010). Её меряют осадкой конуса: чем выше число, тем жиже смесь.</p>
${slumpScale()}
<ul class="checks">${join(MOBILITY.map(([k, v, use]) => h`<li><b>${k}</b>, ${v}: ${use}.</li>`))}</ul>
</div>
<div>
<p style="margin-top:4.6rem"><b>F: морозостойкость.</b> Число показывает, сколько циклов замораживания и оттаивания выдерживают образцы при испытаниях по ГОСТ 10060. Для конструкций, которые зимой остаются на улице, берут F100 и выше.</p>
<p><b>W: водонепроницаемость.</b> Число показывает давление воды в кгс/см², при котором образец остаётся сухим (ГОСТ 12730.5). W6 соответствует 0,6${NBSP}МПа. Цоколи, подвалы и бассейны делают из бетона с повышенным W.</p>
${pmd ? h`<p><b>ПМД: противоморозная добавка.</b> Число в графе «ПМД до» показывает нижнюю температуру воздуха, для которой подобрана смесь. Режим выдерживания бетона на морозе определяет технолог объекта по СП 70.13330.</p>` : ''}
</div></div></div></section>`;
}

function deliveryTeaser(ctx) {
  const pick = pickupLine(ctx);
  return h`<section class="section"><div class="container">
<div class="section__head"><h2>Доставка с завода ${ctx.site.plant.locality_in}</h2><p>${deliveryLine(ctx)} ${pick ?? ''}</p></div>
${ctx.cities.length ? cityCards(ctx) : ''}
<p style="margin-top:22px"><a class="btn btn--ghost" href="/dostavka/">Условия и зоны доставки</a></p>
</div></section>`;
}

function categoryFaq(ctx, cat) {
  const own = CATEGORY_COPY[cat.slug]?.faq(ctx, cat) ?? [];
  return T(ctx, `faq.category.${cat.slug}`, own);
}

function configFor(ctx, cat) {
  if (CONCRETE_KINDS.has(cat.kind)) return concreteSpec(ctx, cat.rows.map((r) => ({ cat, r })));
  if (cat.kind === 'mortar') return mortarSpec(ctx, cat);
  return rebarSpec(ctx, cat);
}

// Описание для выдачи: одно законченное предложение с ценой, а не обрезанный лид страницы.
function categoryDescription(ctx, cat, from, unit) {
  const { site } = ctx;
  const where = `${cat.menu} ${site.plant.locality_in}`;
  const tail = `Заказ от ${fmtNum(site.min_volume_m3)}${NBSP}м³, работаем 24/7.`;
  if (CONCRETE_KINDS.has(cat.kind)) return `${where}: марки ${markSpan(cat.rows)}, от ${fmtNum(from)}${NBSP}₽/${unit}. ${tail}`;
  if (cat.kind === 'rebar') { const d = cat.rows.map((r) => r.diameter); return `${where}: диаметр ${Math.min(...d)}–${Math.max(...d)}${NBSP}мм, от ${fmtNum(from)}${NBSP}₽/${unit}. Работаем 24/7.`; }
  return `${where}: ${cat.rows.length} ${cat.rows.length > 4 ? 'составов' : 'состава'} в прайсе, от ${fmtNum(from)}${NBSP}₽/${unit}. ${tail}`;
}

export function categoryPage(ctx, cat) {
  const { site } = ctx;
  const concrete = CONCRETE_KINDS.has(cat.kind);
  const copy = CATEGORY_COPY[cat.slug];
  const h1 = T(ctx, `category.${cat.slug}.h1`, copy.h1(site.plant));
  const lead = T(ctx, `category.${cat.slug}.lead`, copy.lead(ctx, cat));
  const from = fromPriceOf(cat.rows);
  const unit = unitOf(cat);
  const faqItems = categoryFaq(ctx, cat);
  const isMain = cat.slug === ctx.mainConcrete.slug;
  const markLinks = concrete && isMain && ctx.markPages.length
    ? h`<div class="marklinks"><span>Страницы с подбором по марке:</span>${join(ctx.markPages.map((m) => h`<a class="chip" href="/catalog/${cat.slug}/${cat.rows.find((r) => r.mark === m).markSlug}/">Бетон ${m}</a>`))}</div>` : '';
  const note = concrete && !isMain
    ? h`<p style="margin-top:18px">Для чего подходит каждая марка, описано в разделе <a href="/catalog/${ctx.mainConcrete.slug}/">${ctx.mainConcrete.menu}</a>. Что значат П, F и W: <a href="/catalog/${ctx.mainConcrete.slug}/#pfw">в том же разделе</a>.</p>` : '';
  const approx = concrete && isMain ? h`<p class="muted" style="font-size:.9rem;margin-top:14px">Соответствие марки и класса приблизительное (ГОСТ 26633-2015); в проектах указывают класс.</p>` : '';
  const use = copy.use ? h`<section class="section"><div class="container prose">
<h2>Для чего подходит</h2>
<ul class="checks">${join(copy.use.map((u) => h`<li>${u}</li>`))}</ul>${copy.note ? h`<p>${copy.note}</p>` : ''}
</div></section>` : '';
  const main = h`${pagehead(ctx, {
    h1, lead,
    facts: [['Цена от', `${fmtNum(from)}${NBSP}₽/${unit}`], ...(cat.kind === 'rebar' ? [] : [['Заказ от', minVolText(ctx)]]), ['Цены на', ctx.priceDateRu]], photo: pagePhoto(ctx, cat.slug)
  })}
<section class="section section--tight"><div class="container">
${renderConfigurator(ctx, configFor(ctx, cat), cfgOpts(ctx, cfgLead(ctx)))}
${markLinks}
</div></section>
<section class="section section--sand"><div class="container">
<div class="section__head"><h2>Все позиции и цены</h2></div>
${priceNote(ctx, { min: false })}${categoryTable(ctx, cat, { keys: 'plain', linkMarks: isMain })}${note}${approx}
</div></section>
${concrete && isMain ? markGuide(ctx, cat) : ''}
${concrete ? glossary(ctx, cat, isMain) : ''}${use}
${deliveryTeaser(ctx)}
${faq(ctx, faqItems)}${ctaBand(ctx, { source: `cat-${cat.slug}` })}`;
  return {
    url: `/catalog/${cat.slug}/`, crumbs: [{ name: cat.menu, url: `/catalog/${cat.slug}/` }],
    title: `${shortName(cat)} ${site.plant.locality_in} от ${fmtNum(from)}${NBSP}₽/${unit} | ${site.brand}`,
    description: categoryDescription(ctx, cat, from, unit),
    h1, main, jsonld: [baseGraph(ctx), faqLd(faqItems)]
  };
}

// ---------- Карточка марки: все исполнения марки из прайса ----------
export function markPage(ctx, mark) {
  const { site } = ctx;
  const cat = ctx.mainConcrete;
  const mainRows = cat.rows.filter((r) => r.mark === mark);
  const k = MARKS[mark];
  const cls = mainRows[0].cls;
  const slug = mainRows[0].markSlug;
  const url = `/catalog/${cat.slug}/${slug}/`;
  const from = fromPriceOf(mainRows);
  const h1 = T(ctx, `mark.${slug}.h1`, `Бетон ${mark} (${cls}) с завода ${site.plant.locality_in}`);
  const present = [...new Set(cat.rows.map((r) => r.mark))].sort((a, b) => markNum(a) - markNum(b));
  const i = present.indexOf(mark);
  const prev = present[i - 1], next = present[i + 1];
  const minOf = (m) => fromPriceOf(cat.rows.filter((r) => r.mark === m));
  const diff = (m) => { const d = minOf(m) - from; return d > 0 ? `дороже на ${fmtNum(d)}${NBSP}₽/м³` : d < 0 ? `дешевле на ${fmtNum(-d)}${NBSP}₽/м³` : 'по той же цене'; };
  const variants = ctx.categories.filter((c) => CONCRETE_KINDS.has(c.kind)).map((c) => ({ cat: c, rows: c.rows.filter((r) => r.mark === mark) })).filter((v) => v.rows.length);
  const allRows = variants.flatMap((v) => v.rows);
  const uniqVals = (key) => [...new Set(allRows.map((r) => r[key]).filter(Boolean))];
  const sortNum = (a) => a.sort((x, y) => parseInt(x.replace(/\D/g, ''), 10) - parseInt(y.replace(/\D/g, ''), 10));
  const mobs = sortNum(uniqVals('mobility')), frosts = sortNum(uniqVals('frost')), waters = sortNum(uniqVals('water'));
  const link = (m) => ctx.markPages.includes(m) ? h`<a href="/catalog/${cat.slug}/${cat.rows.find((r) => r.mark === m).markSlug}/">${m}</a>` : m;

  const faqItems = T(ctx, `faq.mark.${slug}`, [
    ...(k ? k.faq : []),
    [`Сколько стоит бетон ${mark} с доставкой?`, `Бетон ${mark} стоит от ${fmtNum(from)}${NBSP}₽/м³ на ${ctx.priceDateRu}. ${deliveryLine(ctx)}`],
    [`Можно ли заказать ${mark} ночью?`, `Да. ${HOURS_TEXT}: отгрузка и доставка идут круглосуточно.`]
  ]);

  const spec = concreteSpec(ctx, variants.flatMap((v) => v.rows.map((r) => ({ cat: v.cat, r }))), { withCat: true });
  const main = h`${pagehead(ctx, {
    h1, lead: k ? k.lead : `Бетон ${mark} класса ${cls}.`,
    facts: [['Класс', cls], ['Цена от', `${fmtNum(from)}${NBSP}₽/м³`], ['Заказ от', minVolText(ctx)]], photo: pagePhoto(ctx, slug)
  })}
<section class="section section--tight"><div class="container">
${renderConfigurator(ctx, spec, cfgOpts(ctx, `Выберите вид бетона, подвижность, морозостойкость и водонепроницаемость: цена и стоимость вашего объёма пересчитаются. Цены из прайса на ${ctx.priceDateRu}.`))}
</div></section>
<section class="section section--sand"><div class="container">
<div class="section__head"><h2>Все исполнения ${mark} в прайсе</h2></div>
${priceNote(ctx, { min: false })}
${join(variants.map((v) => h`<h3 class="tbl-title">${v.cat.menu}</h3>${concreteTable(ctx, v.cat, v.rows, { linkMarks: false, keys: 'cat' })}`))}
</div></section>
<section class="section"><div class="container"><div class="split">
<div>
<h2>Для чего подходит ${mark}</h2>
${k ? h`<ul class="checks">${join(k.use.map((u) => h`<li>${u}</li>`))}</ul><p>${k.limit}</p>` : ''}
</div>
<div class="card">
<h3>Характеристики</h3>
<dl class="kv">
<dt>Класс по прочности</dt><dd>${cls}</dd>
${mobs.length ? h`<dt>Подвижность</dt><dd>${mobs.join(', ')}</dd>` : ''}
${frosts.length ? h`<dt>Морозостойкость</dt><dd>${frosts.join(', ')}</dd>` : ''}
${waters.length ? h`<dt>Водонепроницаемость</dt><dd>${waters.join(', ')}</dd>` : ''}
<dt>Проектный возраст</dt><dd>28 суток</dd>
</dl>
<p class="muted" style="font-size:.9rem">Соответствие марки и класса приблизительное (ГОСТ 26633-2015). В проектах указывают класс.</p>
</div></div></div></section>
<section class="section section--sand"><div class="container"><div class="split">
<div>
<h2>Чем ${mark} отличается от соседних марок</h2>
${k ? h`<p>${k.why}</p>` : ''}
<ul>
${prev ? h`<li>${link(prev)} (${cat.rows.find((r) => r.mark === prev).cls}): ${diff(prev)} по цене товарного бетона.</li>` : ''}
${next ? h`<li>${link(next)} (${cat.rows.find((r) => r.mark === next).cls}): ${diff(next)} по цене товарного бетона.</li>` : ''}
</ul>
</div>
<div class="card">
<h3>Доставка ${mark} с завода ${site.plant.locality_in}</h3>
<p>Заказ от ${minVolText(ctx)}. Условия по направлениям, самовывоз и оплата собраны на странице доставки.</p>
${ctx.cities.length ? h`<p>${join(ctx.cities.map((c) => h`<a href="${c.url}">Бетон ${c.in}</a>`), ', ')}</p>` : ''}
<p><a href="/dostavka/">Условия доставки</a></p>
</div></div></div></section>
${faq(ctx, faqItems)}${ctaBand(ctx, { source: `mark-${slug}`, title: `Закажите бетон ${mark}` })}`;

  const offerList = variants.flatMap((v) => v.rows.map((r) => offerLd(ctx, {
    name: [v.cat.menu, mark, r.pmd != null ? `ПМД ${r.pmd}°C` : null, r.mobility, r.frost, r.water].filter(Boolean).join(' '), price: r.price, url
  })));
  const priceList = offerList.map((o) => Number(o.price));
  // Разные исполнения марки (с ПМД, фибробетон и т. д.) собраны в AggregateOffer: «от» совпадает с видимой ценой.
  const aggregate = { '@type': 'AggregateOffer', priceCurrency: 'RUB', lowPrice: String(Math.min(...priceList)), highPrice: String(Math.max(...priceList)), offerCount: offerList.length, offers: offerList };
  const product = {
    '@context': 'https://schema.org', '@type': 'Product', '@id': `${ctx.origin}${url}#product`,
    name: `Бетон ${mark} (${cls})`, description: k ? k.lead : `Бетон ${mark}, класс ${cls}`, category: 'Бетон товарный',
    brand: { '@type': 'Brand', name: site.brand },
    image: pagePhoto(ctx, slug) && ctx.images.has(pagePhoto(ctx, slug)) ? ctx.origin + ctx.images.get(pagePhoto(ctx, slug)).full : ctx.origin + ctx.assets.og,
    offers: aggregate
  };
  return {
    url, crumbs: [{ name: cat.menu, url: `/catalog/${cat.slug}/` }, { name: `Бетон ${mark}`, url }],
    title: `Бетон ${mark} (${cls}) ${site.plant.locality_in} от ${fmtNum(from)}${NBSP}₽/м³ | ${site.brand}`,
    description: truncate(`Бетон ${mark} (${cls}) с завода ${site.plant.locality_in}: от ${fmtNum(from)}${NBSP}₽/м³. ${k ? k.lead : ''} Заказ от ${fmtNum(site.min_volume_m3)}${NBSP}м³, работаем 24/7.`, 190),
    h1, main, jsonld: [baseGraph(ctx), product, faqLd(faqItems)]
  };
}
