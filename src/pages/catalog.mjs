// Прайс, категории (бетон / ПМД / растворы), карточки марок.
import { h, raw, join, fmtNum, NBSP, truncate } from '../lib/util.mjs';
import { icon, telHref, HOURS_TEXT, leadForm, minVolText, vatText, priceNote, concreteTable, mortarTable, fromPriceOf, faq, messengers } from '../lib/layout.mjs';
import { CONCRETE_KINDS } from '../lib/categories.mjs';
import { MARKS, MARK_ORDER, MOBILITY } from '../lib/marks.mjs';
import { baseGraph, faqLd, offerLd, breadcrumbLd } from '../lib/seo.mjs';
import { T, pagehead, ctaBand, cityCards, deliveryLine } from './common.mjs';

const KIND_H1 = {
  'tovarnyy-beton': (p) => `Товарный бетон с завода ${p.locality_in}`,
  'beton-s-pmd': (p) => `Бетон с ПМД для заливки зимой — завод ${p.locality}`,
  'beton-na-granite': (p) => `Бетон на граните с завода ${p.locality_in}`,
  'beton-na-gravii': (p) => `Бетон на гравии с завода ${p.locality_in}`,
  'rastvory': (p) => `Растворы и ЦПС с завода ${p.locality_in}`
};

const markRange = (rows) => {
  const m = [...new Set(rows.map((r) => r.mark))].sort((a, b) => MARK_ORDER.indexOf(a) - MARK_ORDER.indexOf(b));
  return m.length > 1 ? `${m[0]}–${m.at(-1)}` : m[0];
};

// ---------- Полный прайс ----------
export function pricePage(ctx) {
  const { site } = ctx;
  const sections = ctx.categories.map((c) => h`<section class="section ${c.kind === 'mortar' ? 'section--sand' : ''}" id="${c.slug}"><div class="container">
<div class="section__head"><h2>${c.menu}</h2><p><a href="/catalog/${c.slug}/">${c.menu}: описание и применение →</a></p></div>
${c.kind === 'mortar' ? mortarTable(ctx, c) : concreteTable(ctx, c)}
</div></section>`);
  const rental = ctx.rental ? h`<section class="section section--sand" id="arenda-abn"><div class="container">
<div class="section__head"><h2>Аренда автобетононасоса</h2><p><a href="/catalog/arenda-abn/">Параметры и условия аренды →</a></p></div>
<div class="table-wrap"><table class="pt"><thead><tr><th>Техника</th><th>Вылет стрелы</th><th class="pr">Цена за смену</th><th class="pr">Цена за час</th><th class="ac"><span class="sr">Заказ</span></th></tr></thead><tbody>${join(ctx.rental.units.map((u) => h`<tr>
<td class="mk nm" data-l="Техника">${u.name}</td><td data-l="Вылет">${fmtNum(u.reach_m)}${NBSP}м</td>
<td class="pr" data-l="За смену">${u.price_shift != null ? h`<span class="num">${fmtNum(u.price_shift)}${NBSP}₽</span>` : '—'}</td>
<td class="pr" data-l="За час">${u.price_hour != null ? h`<span class="num">${fmtNum(u.price_hour)}${NBSP}₽</span>` : '—'}</td>
<td class="ac"><a class="btn btn--primary btn--sm" href="${telHref(ctx)}">Заказать</a></td></tr>`))}</tbody></table></div>
</div></section>` : '';
  const faqItems = T(ctx, 'faq.price', [
    ['Как часто обновляется прайс-лист?', `Цены на этой странице действуют с ${ctx.priceDateRu}. Актуальную стоимость на день заказа подтвердим по телефону ${site.phone.display}.`],
    ['Входит ли доставка в цену?', deliveryLine(ctx)],
    ['Можно ли заказать бетон ночью?', `Да. ${HOURS_TEXT}: принимаем заявки, производим и отгружаем круглосуточно.`]
  ]);
  const main = h`${pagehead(ctx, {
    h1: `Прайс-лист на бетон — цены за м³ ${site.plant.locality_in}`,
    lead: `Цены завода ${site.plant.locality_in}. ${vatText(ctx)[0].toUpperCase() + vatText(ctx).slice(1)}. Минимальный заказ — ${minVolText(ctx)}.`,
    facts: [['clock', HOURS_TEXT], ['truck', deliveryLine(ctx)]]
  })}
<section class="section section--tight"><div class="container">${priceNote(ctx)}
<div class="chips">${join(ctx.categories.map((c) => h`<a class="chip" href="#${c.slug}">${c.menu}</a>`))}${ctx.rental ? h`<a class="chip" href="#arenda-abn">Аренда АБН</a>` : ''}</div></div></section>
${join(sections)}${rental}
${faq(ctx, faqItems)}${ctaBand(ctx, { source: 'price' })}`;
  return {
    url: '/price/', crumbs: [{ name: 'Прайс-лист', url: '/price/' }],
    title: `Прайс-лист на бетон — цены за м³ ${site.plant.locality_in} | ${site.brand}`,
    description: `Цены на бетон ${markRange(ctx.mainConcrete.rows)} с завода ${site.plant.locality_in}: от ${fmtNum(ctx.fromPrice)}${NBSP}₽/м³, ${vatText(ctx)}. Работаем 24/7, заказ от ${fmtNum(site.min_volume_m3)}${NBSP}м³.`,
    h1: `Прайс-лист на бетон — цены за м³ ${site.plant.locality_in}`, main,
    jsonld: [baseGraph(ctx), faqLd(faqItems)]
  };
}

// ---------- Категории ----------
function markGuide(ctx, cat) {
  const marks = [...new Set(cat.rows.map((r) => r.mark))].sort((a, b) => MARK_ORDER.indexOf(a) - MARK_ORDER.indexOf(b));
  const rowsOf = (m) => cat.rows.filter((r) => r.mark === m);
  return h`<section class="section section--sand"><div class="container">
<div class="section__head"><h2>Как выбрать марку</h2><p>Марку и класс бетона задаёт проект конструкции. Если проекта нет, ориентируйтесь на таблицу и уточните у проектировщика.</p></div>
<div class="table-wrap"><table class="pt"><thead><tr><th>Марка</th><th>Класс</th><th>Для чего подходит</th><th class="pr">Цена от</th></tr></thead><tbody>${join(marks.map((m) => {
    const k = MARKS[m]; const rows = rowsOf(m);
    const link = ctx.markPages.includes(m) && cat.slug === ctx.mainConcrete.slug;
    return h`<tr><td class="mk" data-l="Марка">${link ? h`<a href="/catalog/${cat.slug}/${rows[0].markSlug}/">${m}</a>` : m}</td><td class="cl" data-l="Класс">${rows[0].cls}</td><td data-l="Применение">${k ? k.lead : '—'}</td><td class="pr" data-l="Цена от"><span class="num">${fmtNum(fromPriceOf(rows))}${NBSP}₽</span></td></tr>`;
  }))}</tbody></table></div>
</div></section>`;
}

function glossary(ctx, { pmd = false } = {}) {
  return h`<section class="section"><div class="container"><div class="split">
<div>
<h2>Что означают П, F и W в прайсе</h2>
<p><b>П — подвижность смеси</b> (ГОСТ 7473-2010). Чем выше число, тем жиже смесь:</p>
<ul>${join(MOBILITY.map(([k, v, use]) => h`<li><b>${k}</b>: ${v}; ${use}.</li>`))}</ul>
</div>
<div>
<p style="margin-top:2.6em"><b>F — морозостойкость.</b> Число показывает, сколько циклов замораживания и оттаивания выдерживают образцы в лаборатории (ГОСТ 10060). Для конструкций, которые зимой остаются на улице, берут F100 и выше.</p>
<p><b>W — водонепроницаемость.</b> Число показывает давление воды в кгс/см², при котором образец остаётся сухим (ГОСТ 12730.5). W6 соответствует 0,6${NBSP}МПа. Цоколи, подвалы и бассейны делают из бетона с повышенным W.</p>
${pmd ? h`<p><b>ПМД — противоморозная добавка.</b> Число в графе «ПМД до» показывает нижнюю температуру воздуха, для которой подобрана смесь. Режим выдерживания бетона на морозе определяет технолог объекта по СП 70.13330.</p>` : ''}
</div></div></div></section>`;
}

function deliveryTeaser(ctx) {
  return h`<section class="section section--blue"><div class="container">
<div class="section__head"><h2>Доставка с завода ${ctx.site.plant.locality_in}</h2><p>${deliveryLine(ctx)} Минимальный заказ — ${minVolText(ctx)}. ${HOURS_TEXT}.</p></div>
${ctx.cities.length ? cityCards(ctx) : ''}
<p style="margin-top:22px"><a class="btn btn--blue" href="/dostavka/">Условия и зоны доставки</a></p>
</div></section>`;
}

const leadFor = {
  'tovarnyy-beton': (ctx, c) => `Готовая бетонная смесь заводского изготовления по ГОСТ 7473-2010. Готовим ${markRange(c.rows)} на заводе ${ctx.site.plant.locality_in} и привозим на объект автобетоносмесителем. Заказ от ${minVolText(ctx)}, ${HOURS_TEXT.toLowerCase()}.`,
  'beton-s-pmd': (ctx, c) => `Смеси с противоморозными добавками для заливки при отрицательных температурах. В прайсе ${markRange(c.rows)}; в графе «ПМД до» указана нижняя температура воздуха, для которой подобрана смесь. Заказ от ${minVolText(ctx)}.`,
  'beton-na-granite': (ctx, c) => `Бетон на гранитном щебне: прочнее гравийного и лучше держит нагрузку и мороз, поэтому из него делают высокие марки и ответственные конструкции. В прайсе ${markRange(c.rows)}, заказ от ${minVolText(ctx)}.`,
  'beton-na-gravii': (ctx, c) => `Бетон на гравии дешевле гранитного и подходит для фундаментов малоэтажных зданий, дорожек и стяжек. В прайсе ${markRange(c.rows)}, заказ от ${minVolText(ctx)}.`,
  'rastvory': (ctx, c) => `Строительные растворы и цементно-песчаные смеси (ЦПС): кладка, штукатурка, стяжка. В отличие от бетона в них нет крупного заполнителя (щебня или гравия). Заказ от ${minVolText(ctx)}.`
};

function categoryFaq(ctx, cat) {
  const { site } = ctx;
  const common = [
    ['Какой минимальный объём заказа?', `Минимальный заказ — ${minVolText(ctx)}.`],
    ['Работаете ли вы ночью?', `Да. ${HOURS_TEXT}: заявки, производство, отгрузка и доставка круглосуточно.`],
    ['Входит ли доставка в цену?', deliveryLine(ctx)]
  ];
  const own = {
    'tovarnyy-beton': [
      ['Как выбрать подвижность смеси?', 'П3 подходит для заливки в обычную опалубку и стяжек. П4 берут при густом армировании и подаче бетононасосом. При заказе назовите способ подачи: подберём смесь.'],
      ['Что значит класс В22,5 рядом с маркой М300?', 'Марка — прежний способ обозначения прочности, класс — действующий по ГОСТ 26633-2015. Соответствие приблизительное, в проектах указывают класс.']
    ],
    'beton-s-pmd': [
      ['До какой температуры можно заливать бетон с ПМД?', 'До значения в графе «ПМД до» для выбранной позиции. Режим выдерживания и укрытие конструкции определяет технолог объекта по СП 70.13330.'],
      ['Нужно ли греть бетон с ПМД на морозе?', 'Добавка снижает температуру замерзания воды в смеси, но не отменяет защиту свежего бетона от промерзания. Укрытие и прогрев назначают по проекту производства работ.']
    ],
    'beton-na-granite': [
      ['Когда нужен бетон на граните, а не на гравии?', 'Для высоких марок, нагруженных колонн, плит и конструкций с повышенными требованиями к морозостойкости. Для лёгких фундаментов и стяжек часто хватает гравийного.']
    ],
    'beton-na-gravii': [
      ['Подойдёт ли бетон на гравии для фундамента дома?', 'Для малоэтажных зданий — да, если марка и класс соответствуют проекту. Для высоконагруженных конструкций проект чаще требует гранитный щебень.']
    ],
    'rastvory': [
      ['Чем ЦПС отличается от бетона?', 'ЦПС — цементно-песчаная смесь без щебня или гравия. Её используют для стяжек, кладки и штукатурки, а не для заливки несущих конструкций.'],
      ['Подойдёт ли раствор для заливки фундамента?', 'Нет. Для фундаментов берут бетон нужной марки: в растворе нет крупного заполнителя, который даёт бетону прочность.']
    ]
  }[cat.slug] ?? [];
  return T(ctx, `faq.category.${cat.slug}`, [...own, ...common]);
}

export function categoryPage(ctx, cat) {
  const { site } = ctx;
  const concrete = CONCRETE_KINDS.has(cat.kind);
  const h1 = T(ctx, `category.${cat.slug}.h1`, KIND_H1[cat.slug](site.plant));
  const lead = T(ctx, `category.${cat.slug}.lead`, leadFor[cat.slug](ctx, cat));
  const from = fromPriceOf(cat.rows);
  const faqItems = categoryFaq(ctx, cat);
  const markLinks = concrete && cat.slug === ctx.mainConcrete.slug && ctx.markPages.length
    ? h`<div class="chips">${join(ctx.markPages.map((m) => h`<a class="chip" href="/catalog/${cat.slug}/${cat.rows.find((r) => r.mark === m).markSlug}/">Бетон ${m}</a>`))}</div>` : '';
  const main = h`${pagehead(ctx, {
    h1, lead,
    facts: [['layers', `Цена от ${fmtNum(from)}${NBSP}₽/${concrete ? 'м³' : cat.rows[0].unit}`], ['truck', `Заказ от ${minVolText(ctx)}`], ['clock', HOURS_TEXT]]
  })}
<section class="section section--tight"><div class="container">${priceNote(ctx)}${markLinks}${concrete ? concreteTable(ctx, cat) : mortarTable(ctx, cat)}</div></section>
${concrete ? markGuide(ctx, cat) : ''}
${concrete ? glossary(ctx, { pmd: cat.kind === 'pmd' }) : ''}
${deliveryTeaser(ctx)}
${faq(ctx, faqItems)}${ctaBand(ctx, { source: `cat-${cat.slug}` })}`;
  return {
    url: `/catalog/${cat.slug}/`, crumbs: [{ name: cat.menu, url: `/catalog/${cat.slug}/` }],
    title: concrete
      ? `${cat.menu} ${site.plant.locality_in} — цены от ${fmtNum(from)}${NBSP}₽/м³ | ${site.brand}`
      : `${cat.menu} ${site.plant.locality_in} — цены от ${fmtNum(from)}${NBSP}₽/${cat.rows[0].unit} | ${site.brand}`,
    description: truncate(`${lead} Цены ${vatText(ctx)}. Работаем 24/7.`, 190),
    h1, main, jsonld: [baseGraph(ctx), faqLd(faqItems)]
  };
}

// ---------- Карточка марки ----------
export function markPage(ctx, mark) {
  const { site } = ctx;
  const cat = ctx.mainConcrete;
  const rows = cat.rows.filter((r) => r.mark === mark);
  const k = MARKS[mark];
  const cls = rows[0].cls;
  const slug = rows[0].markSlug;
  const url = `/catalog/${cat.slug}/${slug}/`;
  const from = fromPriceOf(rows);
  const h1 = T(ctx, `mark.${slug}.h1`, `Бетон ${mark} (${cls}) с завода ${site.plant.locality_in}`);
  const present = [...new Set(cat.rows.map((r) => r.mark))].sort((a, b) => MARK_ORDER.indexOf(a) - MARK_ORDER.indexOf(b));
  const i = present.indexOf(mark);
  const prev = present[i - 1], next = present[i + 1];
  const minOf = (m) => fromPriceOf(cat.rows.filter((r) => r.mark === m));
  const diff = (m) => {
    const d = minOf(m) - from;
    return d > 0 ? `дороже на ${fmtNum(d)}${NBSP}₽/м³` : d < 0 ? `дешевле на ${fmtNum(-d)}${NBSP}₽/м³` : 'по той же цене';
  };
  const mobs = [...new Set(rows.map((r) => r.mobility).filter(Boolean))];
  const frosts = [...new Set(rows.map((r) => r.frost).filter(Boolean))];
  const waters = [...new Set(rows.map((r) => r.water).filter(Boolean))];
  const otherCats = ctx.categories.filter((c) => c.slug !== cat.slug && CONCRETE_KINDS.has(c.kind) && c.rows.some((r) => r.mark === mark));
  const link = (m) => ctx.markPages.includes(m) ? h`<a href="/catalog/${cat.slug}/${cat.rows.find((r) => r.mark === m).markSlug}/">${m}</a>` : m;

  const faqItems = T(ctx, `faq.mark.${slug}`, [
    ...(k ? k.faq : []),
    [`Сколько стоит бетон ${mark} с доставкой?`, `Бетон ${mark} стоит от ${fmtNum(from)}${NBSP}₽/м³ (${vatText(ctx)}). ${deliveryLine(ctx)} Точную сумму называем после уточнения адреса и объёма.`],
    [`Можно ли заказать ${mark} ночью?`, `Да. ${HOURS_TEXT}: отгрузка и доставка идут круглосуточно.`]
  ]);

  const main = h`${pagehead(ctx, {
    h1, lead: k ? k.lead : `Бетон ${mark} класса ${cls}.`,
    facts: [['layers', `Класс ${cls}`], ['truck', `Заказ от ${minVolText(ctx)}`], ['clock', HOURS_TEXT]]
  })}
<section class="section section--tight"><div class="container">${priceNote(ctx)}${concreteTable(ctx, { ...cat, rows })}</div></section>
<section class="section section--sand"><div class="container"><div class="split">
<div>
<h2>Для чего подходит ${mark}</h2>
${k ? h`<ul class="checks">${join(k.use.map((u) => h`<li>${u}</li>`))}</ul><p>${k.limit}</p>` : ''}
</div>
<div class="card">
<h3>Характеристики</h3>
<dl class="kv">
<dt>Класс по прочности</dt><dd>${cls}</dd>
<dt>Подвижность</dt><dd>${mobs.join(', ') || '—'}</dd>
<dt>Морозостойкость</dt><dd>${frosts.join(', ') || '—'}</dd>
<dt>Водонепроницаемость</dt><dd>${waters.join(', ') || '—'}</dd>
<dt>Проектный возраст</dt><dd>28 суток</dd>
</dl>
<p class="muted" style="font-size:.9rem">Соответствие марки и класса приблизительное (ГОСТ 26633-2015). В проектах указывают класс.</p>
</div></div></div></section>
<section class="section"><div class="container"><div class="split">
<div>
<h2>Чем ${mark} отличается от соседних марок</h2>
${k ? h`<p>${k.why}</p>` : ''}
<ul>
${prev ? h`<li>${link(prev)} (${cat.rows.find((r) => r.mark === prev).cls}): ${diff(prev)} по минимальной цене.</li>` : ''}
${next ? h`<li>${link(next)} (${cat.rows.find((r) => r.mark === next).cls}): ${diff(next)} по минимальной цене.</li>` : ''}
</ul>
</div>
<div class="card">
<h3>Доставка ${mark} с завода ${site.plant.locality_in}</h3>
<p>${deliveryLine(ctx)} Заказ от ${minVolText(ctx)}. ${HOURS_TEXT}.</p>
<p>${[`Завод ${site.plant.locality_in}`].concat(ctx.cities.map((c) => c.name)).join(', ')}.</p>
${ctx.cities.length ? h`<p>${join(ctx.cities.map((c) => h`<a href="${c.url}">Бетон ${c.in}</a>`), ' · ')}</p>` : ''}
<p><a href="/dostavka/">Условия доставки</a></p>
${otherCats.length ? h`<p>${mark} также есть: ${join(otherCats.map((c) => h`<a href="/catalog/${c.slug}/">${c.menu}</a>`), ', ')}.</p>` : ''}
</div></div></div></section>
${faq(ctx, faqItems)}${ctaBand(ctx, { source: `mark-${slug}`, title: `Закажите бетон ${mark}` })}`;

  const product = {
    '@context': 'https://schema.org', '@type': 'Product', '@id': `${ctx.origin}${url}#product`,
    name: `Бетон ${mark} (${cls})`, description: k ? k.lead : `Бетон ${mark}, класс ${cls}`, category: 'Бетон товарный',
    brand: { '@type': 'Brand', name: site.brand }, image: ctx.origin + ctx.assets.og,
    offers: rows.map((r) => offerLd(ctx, { name: [mark, r.mobility, r.frost, r.water].filter(Boolean).join(' '), price: r.price, url }))
  };
  return {
    url, crumbs: [{ name: cat.menu, url: `/catalog/${cat.slug}/` }, { name: `Бетон ${mark}`, url }],
    title: `Бетон ${mark} (${cls}) ${site.plant.locality_in} — цена от ${fmtNum(from)}${NBSP}₽/м³ | ${site.brand}`,
    description: truncate(`Бетон ${mark} (${cls}) с завода ${site.plant.locality_in}: от ${fmtNum(from)}${NBSP}₽/м³, ${vatText(ctx)}. ${k ? k.lead : ''} Заказ от ${fmtNum(site.min_volume_m3)}${NBSP}м³, работаем 24/7.`, 190),
    h1, main, jsonld: [baseGraph(ctx), product, faqLd(faqItems)]
  };
}
