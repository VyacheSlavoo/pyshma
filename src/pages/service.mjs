// Аренда АБН, доставка, геопосадочные города.
import { h, raw, join, fmtNum, NBSP, truncate } from '../lib/util.mjs';
import { icon, telHref, HOURS_TEXT, HOURS_FULL, leadForm, minVolText, vatText, priceNote, concreteTable, faq, fromPriceOf } from '../lib/layout.mjs';
import { CONCRETE_KINDS } from '../lib/categories.mjs';
import { MARK_ORDER } from '../lib/marks.mjs';
import { baseGraph, faqLd, breadcrumbLd, lbId } from '../lib/seo.mjs';
import { T, pagehead, ctaBand, cityCards, deliveryLine } from './common.mjs';

// ---------- Аренда автобетононасоса: отдельный шаблон, без бетонных характеристик ----------
export function rentalPage(ctx) {
  const { site } = ctx;
  const units = ctx.rental.units;
  const minShift = Math.min(...units.map((u) => u.price_shift ?? Infinity));
  const minHour = Math.min(...units.map((u) => u.price_hour ?? Infinity));
  const priceHint = Number.isFinite(minShift) ? `от ${fmtNum(minShift)}${NBSP}₽ за смену` : `от ${fmtNum(minHour)}${NBSP}₽ в час`;
  const h1 = T(ctx, 'rental.h1', `Аренда автобетононасоса ${site.plant.locality_in}`);
  const lead = T(ctx, 'rental.lead', 'Автобетононасос подаёт смесь из миксера по стреле и бетоноводу в место заливки: на перекрытия, колонны, в труднодоступные места. Стоимость считается за смену или за час работы.');
  const req = [...new Set(units.flatMap((u) => u.site_requirements || []))];
  const faqItems = T(ctx, 'faq.rental', [
    ['Как рассчитывается стоимость аренды?', `Цена указана за смену или за час работы машины. ${units.some((u) => u.min_hours) ? `Минимальное время заказа — ${Math.min(...units.map((u) => u.min_hours).filter(Boolean))}${NBSP}ч. ` : ''}${units.find((u) => u.idle_note)?.idle_note ?? 'Условия простоя уточняйте при заказе.'}`],
    ['Что нужно подготовить на площадке?', req.length ? `${req.join('. ')}. Размеры выносных опор зависят от модели, мы сообщим их при заказе.` : 'Площадку под выносные опоры, подъезд для насоса и свободное место над стрелой. Размеры опор зависят от модели, мы сообщим их при заказе.'],
    ['Можно ли заказать насос ночью?', `Да. ${HOURS_FULL}.`],
    ['Нужно ли согласовывать насос и миксеры вместе?', 'Лучше да: насос и миксеры заказывают на одно окно времени, тогда подача идёт без пауз.'],
    ['Работает ли насос за пределами района завода?', units.some((u) => u.zone) ? `Зона работы: ${[...new Set(units.map((u) => u.zone).filter(Boolean))].join('; ')}. Дальние выезды обсуждаем отдельно.` : 'Зону работы и стоимость выезда уточняйте при заказе.']
  ]);
  const main = h`${pagehead(ctx, { h1, lead, facts: [['pump', priceHint], ['clock', HOURS_TEXT]] })}
<section class="section section--tight"><div class="container">
<p class="price-note"><span class="tag">${vatText(ctx)}</span><span>Актуально на <time datetime="${ctx.priceDateIso}">${ctx.priceDateRu}</time></span></p>
<div class="table-wrap"><table class="pt"><thead><tr><th>Техника</th><th>Вылет стрелы</th><th>Производительность</th><th>Диаметр бетоновода</th><th class="pr">За смену</th><th class="pr">За час</th><th class="ac"><span class="sr">Заказ</span></th></tr></thead>
<tbody>${join(units.map((u) => h`<tr>
<td class="mk nm" data-l="Техника">${u.name}</td>
<td data-l="Вылет стрелы">${fmtNum(u.reach_m)}${NBSP}м</td>
<td data-l="Производительность">до ${fmtNum(u.capacity_m3h)}${NBSP}м³/ч</td>
<td data-l="Диаметр бетоновода">${fmtNum(u.pipe_diameter_mm)}${NBSP}мм</td>
<td class="pr" data-l="За смену">${u.price_shift != null ? h`<span class="num">${fmtNum(u.price_shift)}${NBSP}₽</span>` : '—'}</td>
<td class="pr" data-l="За час">${u.price_hour != null ? h`<span class="num">${fmtNum(u.price_hour)}${NBSP}₽</span>` : '—'}</td>
<td class="ac"><a class="btn btn--primary btn--sm" href="${telHref(ctx)}">Заказать</a></td></tr>`))}</tbody></table></div>
</div></section>
<section class="section section--sand"><div class="container"><div class="split">
<div><h2>Требования к площадке</h2>
${req.length ? h`<ul class="checks">${join(req.map((r) => h`<li>${r}</li>`))}</ul>` : h`<p>Площадка под выносные опоры, подъезд для насоса и миксеров, свободное пространство над стрелой.</p>`}
<p>Перед выездом мы уточняем адрес и размеры площадки.</p></div>
<div class="card"><h3>Что входит и что нет</h3>
<ul class="checks"><li>В цену входит работа автобетононасоса в указанное время.</li><li>Бетон и доставка миксерами считаются отдельно: <a href="/price/">прайс-лист</a>.</li>${units.find((u) => u.idle_note) ? h`<li>${units.find((u) => u.idle_note).idle_note}</li>` : ''}</ul></div>
</div></div></section>
${faq(ctx, faqItems)}${ctaBand(ctx, { source: 'rental', title: 'Закажите автобетононасос', sub: 'Назовите адрес, дату и объём заливки. Подберём технику и согласуем время.' })}`;
  const service = {
    '@context': 'https://schema.org', '@type': 'Service', '@id': `${ctx.origin}/catalog/arenda-abn/#service`,
    serviceType: 'Аренда автобетононасоса', name: h1, provider: { '@id': lbId(ctx) },
    areaServed: [site.plant.locality, ...ctx.cities.map((c) => c.name)].map((n) => ({ '@type': 'City', name: n })),
    offers: units.flatMap((u) => [
      u.price_shift != null && { '@type': 'Offer', name: `${u.name}, смена`, price: String(u.price_shift), priceCurrency: 'RUB', url: `${ctx.origin}/catalog/arenda-abn/` },
      u.price_hour != null && { '@type': 'Offer', name: `${u.name}, час`, price: String(u.price_hour), priceCurrency: 'RUB', url: `${ctx.origin}/catalog/arenda-abn/` }
    ].filter(Boolean))
  };
  return {
    url: '/catalog/arenda-abn/', crumbs: [{ name: 'Аренда АБН', url: '/catalog/arenda-abn/' }],
    title: `Аренда автобетононасоса ${site.plant.locality_in} — ${priceHint} | ${site.brand}`,
    description: truncate(`Аренда автобетононасоса ${site.plant.locality_in}: ${priceHint}, вылет стрелы до ${Math.max(...units.map((u) => u.reach_m))}${NBSP}м. Работаем 24/7.`, 180),
    h1, main, jsonld: [baseGraph(ctx), service, faqLd(faqItems)]
  };
}

// ---------- Доставка ----------
export function deliveryPage(ctx) {
  const { site } = ctx;
  const d = site.delivery;
  const h1 = T(ctx, 'delivery.h1', `Доставка бетона по ${site.plant.district_dat} — цены и зоны`);
  const withCost = ctx.cities.filter((c) => c.delivery_cost != null);
  const faqItems = T(ctx, 'faq.delivery', [
    ['Откуда вы доставляете бетон?', `Бетон производится на нашем заводе ${site.plant.locality_in} (${site.plant.address}) и доставляется автобетоносмесителями на объект.`],
    ['Как быстро приедет миксер?', d.dispatch_note ?? 'Время подачи зависит от расстояния до объекта, дорожной обстановки и загрузки завода. Ориентировочное время называем при согласовании заказа.'],
    ['Можно ли заказать доставку ночью?', `Да. ${HOURS_FULL}.`],
    ['Какой минимальный объём доставки?', `Минимальный заказ — ${minVolText(ctx)}.`],
    ['Что влияет на стоимость доставки?', d.tariff_note ?? 'Расстояние от завода до объекта, объём заказа и условия подъезда. Точную сумму называем после уточнения адреса.'],
    ...(d.waiting_note ? [['Как оплачивается простой миксера?', d.waiting_note]] : [])
  ]);
  const main = h`${pagehead(ctx, {
    h1, lead: `${deliveryLine(ctx)} Завод находится ${site.plant.locality_in}, ${site.plant.address}.`,
    facts: [['truck', `Заказ от ${minVolText(ctx)}`], ['clock', HOURS_TEXT], ['factory', `Отгрузка: завод ${site.plant.locality_in}`]]
  })}
${ctx.cities.length ? h`<section class="section section--tight"><div class="container">
<div class="section__head"><h2>Зоны доставки</h2><p>Для каждого направления — своя страница с расстоянием, временем в пути и стоимостью.</p></div>
${cityCards(ctx)}
${withCost.length ? h`<div class="table-wrap" style="margin-top:26px"><table class="pt"><thead><tr><th>Направление</th><th>Расстояние</th><th>В пути</th><th class="pr">Доставка</th></tr></thead><tbody>${join(withCost.map((c) => h`<tr><td class="mk nm" data-l="Направление"><a href="${c.url}">${c.name}</a></td><td data-l="Расстояние">${c.distance_km != null ? `${fmtNum(c.distance_km)}${NBSP}км` : '—'}</td><td data-l="В пути">${c.travel_time ?? '—'}</td><td class="pr" data-l="Доставка"><span class="num">${fmtNum(c.delivery_cost)}${NBSP}₽</span> <small>${c.delivery_cost_unit ?? ''}</small></td></tr>`))}</tbody></table></div>` : ''}
</div></section>` : ''}
<section class="section section--sand"><div class="container"><div class="split">
<div><h2>Из чего складывается стоимость</h2>
<p>${d.tariff_note ?? 'Стоимость доставки зависит от расстояния до объекта и объёма заказа. Точную сумму называем после уточнения адреса.'}</p>
<ul class="checks"><li>Расстояние от завода ${site.plant.locality_from} до объекта.</li><li>Объём заказа и число рейсов${d.mixer_capacity_m3 ? ` (миксер вмещает до ${fmtNum(d.mixer_capacity_m3)}${NBSP}м³)` : ''}.</li><li>Условия подъезда и разгрузки на объекте.</li></ul></div>
<div class="card"><h3>Как заказать доставку</h3><ol><li>Позвоните ${site.phone.display} или оставьте заявку.</li><li>Назовите марку, объём и адрес объекта.</li><li>Получите расчёт и согласуйте время подачи.</li></ol><p>${HOURS_TEXT}.</p></div>
</div></div></section>
${faq(ctx, faqItems)}${ctaBand(ctx, { source: 'delivery' })}`;
  return {
    url: '/dostavka/', crumbs: [{ name: 'Доставка', url: '/dostavka/' }],
    title: `Доставка бетона по ${site.plant.district_dat} — цены и зоны | ${site.brand}`,
    description: truncate(`Доставка бетона миксерами с завода ${site.plant.locality_in} по ${site.plant.district_dat}: заказ от ${fmtNum(site.min_volume_m3)}${NBSP}м³, расчёт по адресу, работаем 24/7.`, 180),
    h1, main, jsonld: [baseGraph(ctx), faqLd(faqItems)]
  };
}

// ---------- Геопосадочная: город или посёлок ----------
export function cityPage(ctx, c) {
  const { site } = ctx;
  const cat = ctx.mainConcrete;
  const h1 = T(ctx, `city.${c.slug}.h1`, `Бетон ${c.in} с доставкой`);
  const marksOrdered = [...new Set(cat.rows.map((r) => r.mark))].sort((a, b) => MARK_ORDER.indexOf(a) - MARK_ORDER.indexOf(b));
  const pick = ctx.markPages.length ? ctx.markPages : marksOrdered.slice(0, 5);
  const rows = pick.map((m) => cat.rows.filter((r) => r.mark === m).sort((a, b) => a.price - b.price)[0]).filter(Boolean);
  const unit = c.delivery_cost_unit ? ` ${c.delivery_cost_unit}` : '';
  const costLine = c.delivery_cost != null ? `Доставка ${c.in}: ${fmtNum(c.delivery_cost)}${NBSP}₽${unit}.` : 'Стоимость доставки зависит от адреса объекта и объёма заказа. Точную сумму называем при расчёте.';
  const timeLine = c.travel_time ? `Время в пути от завода: ${c.travel_time}.` : site.delivery.dispatch_note ?? 'Время подачи зависит от расстояния и загрузки завода.';
  const abn = ctx.rental ? h`<p>Для подачи бетона в труднодоступные места можно заказать <a href="/catalog/arenda-abn/">автобетононасос</a>.</p>` : '';
  const faqItems = T(ctx, `faq.city.${c.slug}`, [
    ...(c.faq || []).map((f) => (Array.isArray(f) ? f : [f.q, f.a])),
    [`Откуда привозите бетон ${c.in}?`, `Производство находится ${site.plant.locality_in}, ${site.plant.address}. ${c.name} — направление доставки: бетон привозят автобетоносмесители.`],
    [`Сколько стоит доставка бетона ${c.in}?`, costLine],
    [`Как быстро привезёте бетон ${c.in}?`, `${timeLine} ${site.delivery.dispatch_note ?? ''}`.trim()],
    [`Работаете ли вы ночью и в выходные?`, `Да. ${HOURS_FULL}.`],
    [`Какой минимальный объём заказа ${c.in}?`, `${c.min_volume ? `Минимальный заказ ${c.in} — ${fmtNum(c.min_volume)}${NBSP}м³.` : `Минимальный заказ — ${minVolText(ctx)}.`}`]
  ]);
  const facts = [['factory', `Производство: завод ${site.plant.locality_in}`]];
  if (c.distance_km != null) facts.push(['pin', `${fmtNum(c.distance_km)}${NBSP}км до ${c.name}`]);
  if (c.travel_time) facts.push(['truck', c.travel_time]);
  facts.push(['clock', HOURS_TEXT]);
  const main = h`${pagehead(ctx, {
    h1, lead: `Бетон производится на нашем заводе ${site.plant.locality_in} и доставляется ${c.in} автобетоносмесителями. ${costLine}`, facts
  })}
<section class="section section--tight"><div class="container">
<div class="section__head"><h2>Цены на бетон с доставкой ${c.in}</h2><p>Цена бетона за 1${NBSP}м³ ${vatText(ctx)}. ${costLine}</p></div>
${priceNote(ctx)}
${concreteTable(ctx, cat, rows)}
<p style="margin-top:14px"><a href="/price/">Полный прайс-лист</a></p>
</div></section>
<section class="section section--sand"><div class="container"><div class="split">
<div><h2>Условия доставки ${c.in}</h2>
<dl class="kv">
<dt>Откуда</dt><dd>завод ${site.plant.locality_in}</dd>
${c.distance_km != null ? h`<dt>Расстояние</dt><dd>${fmtNum(c.distance_km)}${NBSP}км</dd>` : ''}
${c.travel_time ? h`<dt>В пути</dt><dd>${c.travel_time}</dd>` : ''}
<dt>Стоимость доставки</dt><dd>${c.delivery_cost != null ? `${fmtNum(c.delivery_cost)}${NBSP}₽${unit}` : 'по адресу'}</dd>
<dt>Минимальный заказ</dt><dd>${c.min_volume ? `${fmtNum(c.min_volume)}${NBSP}м³` : minVolText(ctx)}</dd>
<dt>Режим</dt><dd>${HOURS_TEXT}</dd>
</dl>
${(c.notes || []).map((n) => h`<p>${n}</p>`)}${abn}</div>
<div class="card"><h3>Другие направления</h3>${ctx.cities.filter((x) => x.slug !== c.slug).length ? h`<ul>${join(ctx.cities.filter((x) => x.slug !== c.slug).map((x) => h`<li><a href="${x.url}">Бетон ${x.in}</a></li>`))}</ul>` : h`<p>Все условия — на странице доставки.</p>`}<p><a href="/dostavka/">Доставка бетона по ${site.plant.district_dat}</a></p></div>
</div></div></section>
${faq(ctx, faqItems)}${ctaBand(ctx, { source: `city-${c.slug}`, title: `Закажите бетон ${c.in}` })}`;
  const service = {
    '@context': 'https://schema.org', '@type': 'Service', '@id': `${ctx.origin}${c.url}#service`,
    serviceType: 'Доставка бетона', name: h1, provider: { '@id': lbId(ctx) },
    areaServed: { '@type': 'City', name: c.name }
  };
  const crumbs = c.tier === 'settlement'
    ? [{ name: 'Доставка', url: '/dostavka/' }, { name: c.name, url: c.url }]
    : [{ name: 'Доставка', url: '/dostavka/' }, { name: `Бетон ${c.in}`, url: c.url }];
  const fromCity = fromPriceOf(cat.rows);
  return {
    url: c.url, crumbs,
    title: `Купить бетон ${c.in} с доставкой — цена за м³ | ${site.brand}`,
    description: truncate(`Бетон ${c.in} с доставкой с завода ${site.plant.locality_in}: от ${fmtNum(fromCity)}${NBSP}₽/м³, ${costLine.replace(/\.$/, '')}. Работаем 24/7.`, 180),
    h1, main, jsonld: [baseGraph(ctx), service, faqLd(faqItems)]
  };
}
