// Аренда АБН, доставка, геопосадочные города, галерея.
import { h, raw, join, fmtNum, NBSP, truncate } from '../lib/util.mjs';
import { icon, img, telHref, HOURS_TEXT, HOURS_FULL, minVolText, priceNote, concreteTable, faq, fromPriceOf } from '../lib/layout.mjs';
import { markNum } from '../lib/marks.mjs';
import { rentalSpec, renderConfigurator, slugify } from '../lib/configurator.mjs';
import { baseGraph, faqLd, lbId } from '../lib/seo.mjs';
import { T, pagehead, ctaBand, cityCards, deliveryLine, deliveryFaq, pickupLine, paymentLine, gallery, reachSpan, pagePhoto } from './common.mjs';

// ---------- Аренда автобетононасоса: отдельный шаблон, без бетонных характеристик ----------
export function rentalPage(ctx) {
  const { site } = ctx;
  const { units, extras } = ctx.rental;
  const minUnit = units.reduce((a, b) => (b.price < a.price ? b : a));
  const priceHint = `от ${fmtNum(minUnit.price)}${NBSP}₽ в ${minUnit.unit === 'час' ? 'час' : minUnit.unit}`;
  const h1 = T(ctx, 'rental.h1', `Аренда автобетононасоса ${site.plant.locality_in}`);
  const maxReach = Math.max(...units.map((u) => u.reach_m).filter(Boolean));
  const minReach = Math.min(...units.map((u) => u.reach_m).filter(Boolean));
  const lead = T(ctx, 'rental.lead', `Автобетононасос подаёт смесь из миксера по стреле и бетоноводу в место заливки: на перекрытия, колонны, в труднодоступные места. В парке насосы с вылетом стрелы ${reachSpan(ctx)}. Стоимость считается за час работы.`);
  const withMin = extras.filter((e) => e.min_hours);
  const faqItems = T(ctx, 'faq.rental', [
    ['Как рассчитывается стоимость аренды?', `Цена указана за ${units[0].unit} работы машины.${withMin.length ? ` ${withMin.map((e) => `${e.name}: минимальная смена ${e.min_hours}${NBSP}ч`).join('; ')}.` : ''} Точное время работы зависит от объёма заливки, подъезд и условий площадки: рассчитаем при заказе.`],
    ['Как выбрать вылет стрелы?', `Вылет определяет, как далеко и высоко насос подаёт бетон. Назовите высоту и расстояние до самой дальней точки заливки, подберём насос из ряда ${minReach}–${maxReach}${NBSP}м.`],
    ['Что нужно подготовить на площадке?', 'Ровную площадку под выносные опоры, подъезд для насоса и миксеров, свободное место над стрелой без проводов и ветвей. Размеры опор зависят от модели, мы сообщим их при заказе.'],
    ['Можно ли заказать насос ночью?', `Да. ${HOURS_FULL}.`],
    ['Нужно ли согласовывать насос и миксеры вместе?', 'Лучше да: насос и миксеры заказывают на одно окно времени, тогда подача идёт без пауз.']
  ]);
  const unitRow = (u) => h`<tr data-k="${slugify(u.name)}">
<td class="mk nm" data-l="Техника">${u.name}</td>
<td class="pr" data-l="Цена"><span class="num">${fmtNum(u.price)}${NBSP}₽</span> <small>/${u.unit}</small></td>
<td class="ac"><a class="rowlink" href="${telHref(ctx)}">Заказать</a></td></tr>`;
  const main = h`${pagehead(ctx, { h1, lead, facts: [['Цена от', `${fmtNum(minUnit.price)}${NBSP}₽/${minUnit.unit}`], ['Вылет стрелы', reachSpan(ctx)]], photo: pagePhoto(ctx, 'arenda-abn') })}
<section class="section section--tight"><div class="container">
${renderConfigurator(ctx, rentalSpec(ctx), { deliveryNote: 'Время работы зависит от объёма заливки, подъезда и условий площадки: уточним при заказе. Бетон и доставка миксерами считаются отдельно.', tel: telHref(ctx), lead: `Выберите насос по вылету стрелы и время работы. Цены из прайса на ${ctx.priceDateRu}.` })}
</div></section>
<section class="section section--sand"><div class="container">
${priceNote(ctx, { min: false })}
<h2 class="tbl-title">Автобетононасосы</h2>
<div class="table-wrap"><table class="pt"><thead><tr><th>Техника</th><th class="pr">Цена</th><th class="ac"><span class="sr">Заказ</span></th></tr></thead>
<tbody>${join(units.map(unitRow))}</tbody></table></div>
${extras.length ? h`<h2 class="tbl-title">Дополнительная техника и оборудование</h2>
<div class="table-wrap"><table class="pt"><thead><tr><th>Позиция</th><th>Условия</th><th class="pr">Цена</th><th class="ac"><span class="sr">Заказ</span></th></tr></thead>
<tbody>${join(extras.map((u) => h`<tr><td class="mk nm" data-l="Позиция">${u.name}</td><td data-l="Условия">${u.note ?? '—'}</td><td class="pr" data-l="Цена"><span class="num">${fmtNum(u.price)}${NBSP}₽</span> <small>/${u.unit}</small></td><td class="ac"><a class="rowlink" href="${telHref(ctx)}">Заказать</a></td></tr>`))}</tbody></table></div>` : ''}
</div></section>
<section class="section"><div class="container"><div class="split">
<div><h2>Требования к площадке</h2>
<ul class="checks"><li>Ровная площадка под выносные опоры.</li><li>Подъезд для насоса и миксеров.</li><li>Свободное пространство над стрелой: без проводов и ветвей.</li></ul>
<p>Перед выездом мы уточняем адрес и размеры площадки.</p></div>
<div class="card"><h3>Что входит и что нет</h3>
<ul class="checks"><li>В цену входит работа техники в указанных единицах (час или метр).</li><li>Бетон и доставка миксерами считаются отдельно: <a href="/price/">прайс-лист</a>.</li></ul></div>
</div></div></section>
${gallery(ctx, ['fleet'], { title: 'Насосы и миксеры на объектах', max: 6, more: true })}
${faq(ctx, faqItems)}${ctaBand(ctx, { source: 'rental', title: 'Закажите автобетононасос', sub: 'Назовите адрес, дату и высоту подачи. Подберём насос и согласуем время.' })}`;
  const offer = (name, price, unit) => ({ '@type': 'Offer', name, price: String(price), priceCurrency: 'RUB', url: `${ctx.origin}/catalog/arenda-abn/`, priceSpecification: { '@type': 'UnitPriceSpecification', price: String(price), priceCurrency: 'RUB', unitText: unit } });
  const service = {
    '@context': 'https://schema.org', '@type': 'Service', '@id': `${ctx.origin}/catalog/arenda-abn/#service`,
    serviceType: 'Аренда автобетононасоса', name: h1, provider: { '@id': lbId(ctx) },
    areaServed: [site.plant.locality, ...ctx.cities.map((c) => c.name)].map((n) => ({ '@type': 'City', name: n })),
    offers: [...units, ...extras].map((u) => offer(u.name, u.price, u.unit))
  };
  return {
    url: '/catalog/arenda-abn/', crumbs: [{ name: 'Аренда АБН', url: '/catalog/arenda-abn/' }],
    title: `Аренда автобетононасоса ${site.plant.locality_in} — ${priceHint} | ${site.brand}`,
    description: truncate(`Аренда автобетононасоса ${site.plant.locality_in}: ${priceHint}, вылет стрелы до ${maxReach}${NBSP}м. Транспортерная лента, бетоноводы, миксер с насосом. Работаем 24/7.`, 190),
    h1, main, jsonld: [baseGraph(ctx), service, faqLd(faqItems)]
  };
}

// ---------- Доставка ----------
export function deliveryPage(ctx) {
  const { site } = ctx;
  const d = site.delivery;
  const h1 = T(ctx, 'delivery.h1', `Доставка бетона по ${site.plant.district_dat} — цены и зоны`);
  const withCost = ctx.cities.filter((c) => c.delivery_cost != null);
  const pick = pickupLine(ctx);
  const pay = paymentLine(ctx);
  const faqItems = T(ctx, 'faq.delivery', [
    ['Откуда вы доставляете бетон?', `Бетон производится на нашем заводе ${site.plant.locality_in} и доставляется автобетоносмесителями на объект. Адрес завода: ${site.plant.address}.`],
    ['Как быстро приедет миксер?', d.dispatch_note ?? 'Время подачи зависит от расстояния до объекта, дорожной обстановки и загрузки завода. Ориентировочное время называем при согласовании заказа.'],
    ['Можно ли заказать доставку ночью?', `Да. ${HOURS_FULL}.`],
    ['Какой минимальный объём доставки?', `Минимальный заказ — ${minVolText(ctx)}.`],
    deliveryFaq(ctx),
    ...(pick ? [['Можно ли забрать бетон самовывозом?', pick]] : []),
    ...(pay ? [['Как оплатить заказ?', pay]] : []),
    ...(d.waiting_note ? [['Как оплачивается простой миксера?', d.waiting_note]] : [])
  ]);
  const main = h`${pagehead(ctx, {
    h1, lead: `Завод: ${site.plant.address}. ${deliveryLine(ctx)} ${pickupLine(ctx, { short: true }) ?? ''}`,
    facts: [['Минимальный заказ', minVolText(ctx)], ['Отгрузка', `завод ${site.plant.locality_in}`]], photo: pagePhoto(ctx, 'dostavka')
  })}
${ctx.cities.length ? h`<section class="section section--tight"><div class="container">
<div class="section__head"><h2>Направления доставки</h2><p>Для каждого направления есть своя страница с условиями.</p></div>
${cityCards(ctx)}
${withCost.length ? h`<div style="margin-top:26px">${priceNote(ctx, { min: false })}</div><div class="table-wrap"><table class="pt"><thead><tr><th>Направление</th><th>Расстояние</th><th>В пути</th><th class="pr">Доставка</th></tr></thead><tbody>${join(withCost.map((c) => h`<tr><td class="mk nm" data-l="Направление"><a href="${c.url}">${c.name}</a></td><td data-l="Расстояние">${c.distance_km != null ? `${fmtNum(c.distance_km)}${NBSP}км` : '—'}</td><td data-l="В пути">${c.travel_time ?? '—'}</td><td class="pr" data-l="Доставка"><span class="num">${fmtNum(c.delivery_cost)}${NBSP}₽</span> <small>${c.delivery_cost_unit ?? ''}</small></td></tr>`))}</tbody></table></div>` : ''}
</div></section>` : ''}
<section class="section section--sand"><div class="container"><div class="split">
<div><h2>Из чего складывается стоимость</h2>
<p>${d.tariff_note ?? 'Стоимость доставки зависит от расстояния до объекта и объёма заказа. Точную сумму называем после уточнения адреса.'}</p>
<ul class="checks"><li>Расстояние от завода ${site.plant.locality_from} до объекта.</li><li>Объём заказа и число рейсов${d.mixer_capacity_m3 ? ` (миксер вмещает до ${fmtNum(d.mixer_capacity_m3)}${NBSP}м³)` : ''}.</li><li>Условия подъезда и разгрузки на объекте.</li></ul></div>
<div class="card"><h3>Как заказать доставку</h3><ol><li>Позвоните ${site.phone.display} или оставьте заявку.</li><li>Назовите марку, объём и адрес объекта.</li><li>Получите расчёт и согласуйте время подачи.</li></ol></div>
</div></div></section>
${gallery(ctx, ['fleet'], { title: 'Миксеры и насосы на объектах', max: 6, more: true })}
${faq(ctx, faqItems)}${ctaBand(ctx, { source: 'delivery' })}`;
  return {
    url: '/dostavka/', crumbs: [{ name: 'Доставка', url: '/dostavka/' }],
    title: `Доставка бетона по ${site.plant.district_dat} — цены и зоны | ${site.brand}`,
    description: truncate(`Доставка бетона миксерами с завода ${site.plant.locality_in} по ${site.plant.district_dat}: заказ от ${fmtNum(site.min_volume_m3)}${NBSP}м³, расчёт по адресу, работаем 24/7.`, 190),
    h1, main, jsonld: [baseGraph(ctx), faqLd(faqItems)]
  };
}

// ---------- Геопосадочная: город или посёлок ----------
export function cityPage(ctx, c) {
  const { site } = ctx;
  const cat = ctx.mainConcrete;
  const h1 = T(ctx, `city.${c.slug}.h1`, `Бетон ${c.in} с доставкой`);
  const marksOrdered = [...new Set(cat.rows.map((r) => r.mark))].sort((a, b) => markNum(a) - markNum(b));
  const pick = ctx.markPages.length ? ctx.markPages : marksOrdered.slice(0, 5);
  const rows = pick.map((m) => cat.rows.filter((r) => r.mark === m).sort((a, b) => a.price - b.price)[0]).filter(Boolean);
  const unit = c.delivery_cost_unit ? ` ${c.delivery_cost_unit}` : '';
  const to = c.to ?? c.in;
  const costLine = c.delivery_cost != null ? `Доставка ${to}: ${fmtNum(c.delivery_cost)}${NBSP}₽${unit}.` : `Стоимость доставки ${to} зависит от адреса объекта и объёма заказа. Точную сумму называем при расчёте.`;
  const timeLine = c.travel_time ? `Время в пути от завода: ${c.travel_time}.` : site.delivery.dispatch_note ?? 'Время подачи зависит от расстояния и загрузки завода.';
  const abn = ctx.rental ? h`<p>Для подачи бетона на высоту и в труднодоступные места можно заказать <a href="/catalog/arenda-abn/">автобетононасос</a>.</p>` : '';
  const pickup = pickupLine(ctx);
  const faqItems = T(ctx, `faq.city.${c.slug}`, [
    ...(c.faq || []).map((f) => (Array.isArray(f) ? f : [f.q, f.a])),
    [`Откуда привозите бетон ${to}?`, `Производство находится по адресу: ${site.plant.address}. ${c.name} — направление доставки: бетон привозят автобетоносмесители.`],
    [`Сколько стоит доставка бетона ${to}?`, costLine],
    [`Как быстро привезёте бетон ${to}?`, `${timeLine} ${site.delivery.dispatch_note ?? ''}`.trim()],
    ['Работаете ли вы ночью и в выходные?', `Да. ${HOURS_FULL}.`],
    [`Какой минимальный объём заказа ${to}?`, c.min_volume ? `Минимальный заказ ${to} — ${fmtNum(c.min_volume)}${NBSP}м³.` : `Минимальный заказ — ${minVolText(ctx)}.`]
  ]);
  const facts = [['Откуда', `завод ${site.plant.locality_in}`]];
  if (c.distance_km != null) facts.push(['Расстояние', `${fmtNum(c.distance_km)}${NBSP}км`]);
  if (c.travel_time) facts.push(['В пути', c.travel_time]);
  const main = h`${pagehead(ctx, {
    h1, lead: `Бетон производится на нашем заводе ${site.plant.locality_in} и доставляется ${to} автобетоносмесителями. ${costLine}`, facts, photo: pagePhoto(ctx, c.slug)
  })}
<section class="section section--tight"><div class="container">
<div class="section__head"><h2>Цены на бетон с доставкой ${to}</h2><p>Цена бетона указана за 1${NBSP}м³. ${costLine}</p></div>
${priceNote(ctx)}
${concreteTable(ctx, cat, rows)}
<p style="margin-top:14px"><a href="/price/">Полный прайс-лист</a></p>
</div></section>
<section class="section section--sand"><div class="container"><div class="split">
<div><h2>Условия доставки ${to}</h2>
<dl class="kv">
<dt>Откуда</dt><dd>завод ${site.plant.locality_in}</dd>
${c.distance_km != null ? h`<dt>Расстояние</dt><dd>${fmtNum(c.distance_km)}${NBSP}км</dd>` : ''}
${c.travel_time ? h`<dt>В пути</dt><dd>${c.travel_time}</dd>` : ''}
<dt>Стоимость доставки</dt><dd>${c.delivery_cost != null ? `${fmtNum(c.delivery_cost)}${NBSP}₽${unit}` : 'по адресу'}</dd>
<dt>Минимальный заказ</dt><dd>${c.min_volume ? `${fmtNum(c.min_volume)}${NBSP}м³` : minVolText(ctx)}</dd>
<dt>Режим</dt><dd>${HOURS_TEXT}</dd>
</dl>
${(c.notes || []).map((n) => h`<p>${n}</p>`)}${abn}</div>
<div class="card"><h3>Другие направления</h3>${ctx.cities.filter((x) => x.slug !== c.slug).length ? h`<ul>${join(ctx.cities.filter((x) => x.slug !== c.slug).map((x) => h`<li><a href="${x.url}">Бетон ${x.in}</a></li>`))}</ul>` : h`<p>Условия по всем направлениям собраны на странице доставки.</p>`}<p><a href="/dostavka/">Доставка бетона по ${site.plant.district_dat}</a></p>${pickup ? h`<p>${pickup}</p>` : ''}</div>
</div></div></section>
${faq(ctx, faqItems)}${ctaBand(ctx, { source: `city-${c.slug}`, title: `Закажите бетон ${c.in}` })}`;
  const service = {
    '@context': 'https://schema.org', '@type': 'Service', '@id': `${ctx.origin}${c.url}#service`,
    serviceType: 'Доставка бетона', name: h1, provider: { '@id': lbId(ctx) }, areaServed: { '@type': 'City', name: c.name }
  };
  const crumbs = [{ name: 'Доставка', url: '/dostavka/' }, { name: c.tier === 'settlement' ? c.name : `Бетон ${c.in}`, url: c.url }];
  return {
    url: c.url, crumbs,
    title: `Купить бетон ${c.in} с доставкой — цена за м³ | ${site.brand}`,
    description: truncate(`Бетон ${c.in} с доставкой с завода ${site.plant.locality_in}: от ${fmtNum(fromPriceOf(cat.rows))}${NBSP}₽/м³. ${costLine} Работаем 24/7.`, 190),
    h1, main, jsonld: [baseGraph(ctx), service, faqLd(faqItems)]
  };
}

// ---------- Фото ----------
export function galleryPage(ctx) {
  const { site } = ctx;
  const h1 = `Фото завода ${site.plant.locality_in} и техники на объектах`;
  const main = h`${pagehead(ctx, { h1, lead: `Снимки завода, автобетоносмесителей, автобетононасосов и залитых конструкций. Нажмите на фото, чтобы открыть крупнее.`, actions: false })}
${gallery(ctx, ['hero', 'plant', 'fleet', 'lab', 'object'], { title: `${ctx.photos.length} фото` })}
${ctaBand(ctx, { source: 'gallery' })}`;
  return {
    url: '/gallery/', crumbs: [{ name: 'Фото', url: '/gallery/' }],
    title: `Фото завода и техники ${site.plant.locality_in} | ${site.brand}`,
    description: `Фото бетонного завода ${site.plant.locality_in}, автобетоносмесителей и автобетононасосов на объектах. Работаем 24/7.`,
    h1, main, jsonld: [baseGraph(ctx)]
  };
}
