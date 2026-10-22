// Прайс, категории (бетон / ПМД / растворы / арматура), карточки марок.
import { h, raw, join, fmtNum, NBSP, truncate } from '../lib/util.mjs';
import { icon, telHref, HOURS_TEXT, minVolText, priceNote, concreteTable, mortarTable, rebarTables, fromPriceOf, faq } from '../lib/layout.mjs';
import { CONCRETE_KINDS } from '../lib/categories.mjs';
import { MARKS, MOBILITY, markNum } from '../lib/marks.mjs';
import { baseGraph, faqLd, offerLd } from '../lib/seo.mjs';
import { T, pagehead, ctaBand, cityCards, deliveryLine, deliveryFaq, pickupLine, pagePhoto } from './common.mjs';
import { CATEGORY_COPY, markSpan } from './copy.mjs';

const unitOf = (cat) => (cat.kind === 'rebar' ? 'т' : cat.rows[0]?.unit ?? 'м³');
const shortName = (cat) => CATEGORY_COPY[cat.slug]?.short ?? cat.menu;

// ---------- Полный прайс ----------
export function pricePage(ctx) {
  const { site } = ctx;
  const body = (c) => (c.kind === 'mortar' ? mortarTable(ctx, c) : c.kind === 'rebar' ? rebarTables(ctx, c) : concreteTable(ctx, c));
  const sections = ctx.categories.map((c, i) => h`<section class="section ${i % 2 ? 'section--sand' : ''}" id="${c.slug}"><div class="container">
<div class="section__head"><h2>${c.menu}</h2><p><a href="/catalog/${c.slug}/">${c.menu}: описание и применение →</a></p></div>
${body(c)}
</div></section>`);
  const rental = ctx.rental ? h`<section class="section ${ctx.categories.length % 2 ? 'section--sand' : ''}" id="arenda-abn"><div class="container">
<div class="section__head"><h2>Аренда автобетононасоса и техники</h2><p><a href="/catalog/arenda-abn/">Условия аренды и параметры техники →</a></p></div>
<div class="table-wrap"><table class="pt"><thead><tr><th>Техника</th><th class="pr">Цена</th><th class="ac"><span class="sr">Заказ</span></th></tr></thead><tbody>${join([...ctx.rental.units, ...ctx.rental.extras].map((u) => h`<tr>
<td class="mk nm" data-l="Техника">${u.name}</td>
<td class="pr" data-l="Цена"><span class="num">${fmtNum(u.price)}${NBSP}₽</span> <small>/${u.unit}</small></td>
<td class="ac"><a class="rowlink" href="${telHref(ctx)}">Заказать</a></td></tr>`))}</tbody></table></div>
</div></section>` : '';
  const faqItems = T(ctx, 'faq.price', [
    ['Как часто обновляется прайс-лист?', `Цены на этой странице действуют с ${ctx.priceDateRu}. Актуальную стоимость на день заказа подтвердим по телефону ${site.phone.display}.`],
    deliveryFaq(ctx),
    ['Можно ли заказать бетон ночью?', `Да. ${HOURS_TEXT}: принимаем заявки, производим и отгружаем круглосуточно.`]
  ]);
  const h1 = `Прайс-лист на бетон и растворы ${site.plant.locality_in}`;
  const main = h`${pagehead(ctx, {
    h1, lead: `Цены завода ${site.plant.locality_in}: бетон разных видов, растворы и ЦПС, арматура, аренда автобетононасоса. Минимальный заказ — ${minVolText(ctx)}.`,
    facts: [['В прайс-листе', `${ctx.positions} позиций`], ['Режим работы', '24/7'], ['Получение', site.card?.pickup ? 'доставка и самовывоз' : 'доставка']], photo: pagePhoto(ctx, 'price')
  })}
<section class="section section--tight"><div class="container">${priceNote(ctx)}
<div class="chips">${join(ctx.categories.map((c) => h`<a class="chip" href="#${c.slug}">${shortName(c)}</a>`))}${ctx.rental ? h`<a class="chip" href="#arenda-abn">Аренда АБН</a>` : ''}</div></div></section>
${join(sections)}${rental}
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
  return h`<section class="section section--sand"><div class="container">
<div class="section__head"><h2>Как выбрать марку</h2><p>Марку и класс бетона задаёт проект конструкции. Если проекта нет, ориентируйтесь на таблицу и уточните у проектировщика.</p></div>
<div class="table-wrap"><table class="pt"><thead><tr><th>Марка</th><th>Класс</th><th>Для чего подходит</th><th class="pr">Цена от</th></tr></thead><tbody>${join(marks.map((m) => {
    const k = MARKS[m]; const rows = rowsOf(m);
    const link = ctx.markPages.includes(m);
    return h`<tr><td class="mk" data-l="Марка">${link ? h`<a href="/catalog/${cat.slug}/${rows[0].markSlug}/">${m}</a>` : m}</td><td class="cl" data-l="Класс">${rows[0].cls}</td><td data-l="Применение">${k ? k.lead : '—'}</td><td class="pr" data-l="Цена от"><span class="num">${fmtNum(fromPriceOf(rows))}${NBSP}₽</span></td></tr>`;
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

function glossary(ctx, cat) {
  const has = (k) => cat.rows.some((r) => r[k]);
  const pmd = cat.kind === 'pmd';
  if (!has('mobility') && !has('frost') && !has('water') && !pmd) return '';
  return h`<section class="section section--sand"><div class="container"><div class="split">
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
  return h`<section class="section section--blue"><div class="container">
<div class="section__head"><h2>Доставка с завода ${ctx.site.plant.locality_in}</h2><p>${deliveryLine(ctx)} ${pick ?? ''} Минимальный заказ — ${minVolText(ctx)}. ${HOURS_TEXT}.</p></div>
${ctx.cities.length ? cityCards(ctx) : ''}
<p style="margin-top:22px"><a class="btn btn--blue" href="/dostavka/">Условия и зоны доставки</a></p>
</div></section>`;
}

function categoryFaq(ctx, cat) {
  const own = CATEGORY_COPY[cat.slug]?.faq(ctx, cat) ?? [];
  const common = [
    ['Какой минимальный объём заказа?', `Минимальный заказ — ${minVolText(ctx)}.`],
    ['Работаете ли вы ночью?', `Да. ${HOURS_TEXT}: заявки, производство, отгрузка и доставка круглосуточно.`],
    deliveryFaq(ctx)
  ];
  return T(ctx, `faq.category.${cat.slug}`, [...own, ...common]);
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
    ? h`<div class="chips">${join(ctx.markPages.map((m) => h`<a class="chip" href="/catalog/${cat.slug}/${cat.rows.find((r) => r.mark === m).markSlug}/">Бетон ${m}</a>`))}</div>` : '';
  const table = cat.kind === 'mortar' ? mortarTable(ctx, cat) : cat.kind === 'rebar' ? rebarTables(ctx, cat) : concreteTable(ctx, cat, cat.rows, { linkMarks: isMain });
  const note = concrete && !isMain
    ? h`<p style="margin-top:18px">Для чего подходит каждая марка, описано в разделе <a href="/catalog/${ctx.mainConcrete.slug}/">${ctx.mainConcrete.menu}</a>.</p>` : '';
  const main = h`${pagehead(ctx, {
    h1, lead,
    facts: [['Цена от', `${fmtNum(from)}${NBSP}₽/${unit}`], ...(cat.kind === 'rebar' ? [] : [['Минимальный заказ', minVolText(ctx)]]), ['Режим работы', '24/7']], photo: pagePhoto(ctx, cat.slug)
  })}
<section class="section section--tight"><div class="container">${priceNote(ctx, { min: false })}${markLinks}${table}${note}</div></section>
${concrete && isMain ? markGuide(ctx, cat) : ''}
${concrete ? glossary(ctx, cat) : ''}
${deliveryTeaser(ctx)}
${faq(ctx, faqItems)}${ctaBand(ctx, { source: `cat-${cat.slug}` })}`;
  return {
    url: `/catalog/${cat.slug}/`, crumbs: [{ name: cat.menu, url: `/catalog/${cat.slug}/` }],
    title: `${shortName(cat)} ${site.plant.locality_in} — цены от ${fmtNum(from)}${NBSP}₽/${unit} | ${site.brand}`,
    description: truncate(`${lead} Работаем 24/7.`, 190),
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
  const mobs = uniqVals('mobility'), frosts = uniqVals('frost'), waters = uniqVals('water');
  const link = (m) => ctx.markPages.includes(m) ? h`<a href="/catalog/${cat.slug}/${cat.rows.find((r) => r.mark === m).markSlug}/">${m}</a>` : m;

  const faqItems = T(ctx, `faq.mark.${slug}`, [
    ...(k ? k.faq : []),
    [`Сколько стоит бетон ${mark} с доставкой?`, `Бетон ${mark} стоит от ${fmtNum(from)}${NBSP}₽/м³. ${deliveryLine(ctx)}`],
    [`Можно ли заказать ${mark} ночью?`, `Да. ${HOURS_TEXT}: отгрузка и доставка идут круглосуточно.`]
  ]);

  const main = h`${pagehead(ctx, {
    h1, lead: k ? k.lead : `Бетон ${mark} класса ${cls}.`,
    facts: [['Класс', cls], ['Цена от', `${fmtNum(from)}${NBSP}₽/м³`], ['Минимальный заказ', minVolText(ctx)], ['Режим работы', '24/7']], photo: pagePhoto(ctx, slug)
  })}
<section class="section section--tight"><div class="container">${priceNote(ctx, { min: false })}
${join(variants.map((v) => h`<h2 class="tbl-title">${v.cat.menu}</h2>${concreteTable(ctx, v.cat, v.rows, { linkMarks: false })}`))}
</div></section>
<section class="section section--sand"><div class="container"><div class="split">
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
<section class="section"><div class="container"><div class="split">
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
<p>${deliveryLine(ctx)} Заказ от ${minVolText(ctx)}. ${HOURS_TEXT}.</p>
${ctx.cities.length ? h`<p>${join(ctx.cities.map((c) => h`<a href="${c.url}">Бетон ${c.in}</a>`), ' · ')}</p>` : ''}
<p><a href="/dostavka/">Условия доставки</a></p>
</div></div></div></section>
${faq(ctx, faqItems)}${ctaBand(ctx, { source: `mark-${slug}`, title: `Закажите бетон ${mark}` })}`;

  const product = {
    '@context': 'https://schema.org', '@type': 'Product', '@id': `${ctx.origin}${url}#product`,
    name: `Бетон ${mark} (${cls})`, description: k ? k.lead : `Бетон ${mark}, класс ${cls}`, category: 'Бетон товарный',
    brand: { '@type': 'Brand', name: site.brand }, image: ctx.origin + ctx.assets.og,
    offers: variants.flatMap((v) => v.rows.map((r) => offerLd(ctx, {
      name: [v.cat.menu, mark, r.pmd != null ? `ПМД ${r.pmd}°C` : null, r.mobility, r.frost, r.water].filter(Boolean).join(' '), price: r.price, url
    })))
  };
  return {
    url, crumbs: [{ name: cat.menu, url: `/catalog/${cat.slug}/` }, { name: `Бетон ${mark}`, url }],
    title: `Бетон ${mark} (${cls}) ${site.plant.locality_in} — цена от ${fmtNum(from)}${NBSP}₽/м³ | ${site.brand}`,
    description: truncate(`Бетон ${mark} (${cls}) с завода ${site.plant.locality_in}: от ${fmtNum(from)}${NBSP}₽/м³. ${k ? k.lead : ''} Заказ от ${fmtNum(site.min_volume_m3)}${NBSP}м³, работаем 24/7.`, 190),
    h1, main, jsonld: [baseGraph(ctx), product, faqLd(faqItems)]
  };
}
