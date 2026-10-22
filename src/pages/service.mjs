// Аренда АБН, доставка, геопосадочные города, галерея.
import { h, raw, join, fmtNum, NBSP, truncate } from '../lib/util.mjs';
import { icon, img, telHref, HOURS_TEXT, HOURS_FULL, minVolText, priceNote, concreteTable, faq, fromPriceOf } from '../lib/layout.mjs';
import { markNum } from '../lib/marks.mjs';
import { rentalSpec, renderConfigurator, slugify } from '../lib/configurator.mjs';
import { baseGraph, faqLd, lbId } from '../lib/seo.mjs';
import { relatedArticles } from './catalog.mjs';
import { T, sh, media, mapSection, pagehead, ctaBand, cityCards, deliveryLine, deliveryFaq, pickupLine, paymentLine, gallery, photoGrid, reachSpan, maxReach, pagePhoto } from './common.mjs';

// ---------- Аренда автобетононасоса: отдельный шаблон, без бетонных характеристик ----------
export function rentalPage(ctx) {
  const { site } = ctx;
  const { units, extras } = ctx.rental;
  const minUnit = units.reduce((a, b) => (b.price < a.price ? b : a));
  const priceHint = `от ${fmtNum(minUnit.price)}${NBSP}₽ в ${minUnit.unit === 'час' ? 'час' : minUnit.unit}`;
  const h1 = T(ctx, 'rental.h1', `Аренда автобетононасоса ${site.plant.locality_in}`);
  const lead = T(ctx, 'rental.lead', `Автобетононасос подаёт смесь из миксера по стреле и бетоноводу в место заливки: на перекрытия, колонны, в труднодоступные места. В парке насосы с вылетом стрелы ${reachSpan(ctx)}. Стоимость считается за час работы.`);
  const withMin = extras.filter((e) => e.min_hours);
  const faqItems = T(ctx, 'faq.rental', [
    ['Как рассчитывается стоимость аренды?', `Цена указана за ${units[0].unit} работы машины.${withMin.length ? ` ${withMin.map((e) => `${e.name}: минимальная смена ${e.min_hours}${NBSP}ч`).join('; ')}.` : ''} Точное время работы зависит от объёма заливки, подъезд и условий площадки: рассчитаем при заказе.`],
    ['Как выбрать вылет стрелы?', `Вылет определяет, как далеко и высоко насос подаёт бетон. Назовите высоту и расстояние до самой дальней точки заливки, подберём насос из ряда ${reachSpan(ctx)}.`],
    ['Что нужно подготовить на площадке?', 'Ровную площадку под выносные опоры, подъезд для насоса и миксеров, свободное место над стрелой без проводов и ветвей. Размеры опор зависят от модели, мы сообщим их при заказе.'],
    ['Можно ли заказать насос ночью?', `Да. ${HOURS_TEXT}: заявки на технику принимаем круглосуточно.`],
    ['Нужно ли согласовывать насос и миксеры вместе?', 'Лучше да: насос и миксеры заказывают на одно окно времени, тогда подача идёт без пауз.']
  ]);
  const unitRow = (u) => h`<tr data-k="${slugify(u.name)}">
<td class="mk nm" data-l="Техника">${u.name}</td>
<td class="pr" data-l="Цена"><span class="num">${fmtNum(u.price)}${NBSP}₽</span> <small>/${u.unit}</small></td>
<td class="ac"><a class="rowlink" href="${telHref(ctx)}">Заказать</a></td></tr>`;
  const main = h`${pagehead(ctx, { h1, lead, eyebrow: 'Техника', price: { from: minUnit.price, unit: minUnit.unit }, facts: [['вылет стрелы', reachSpan(ctx)], ['насосов в прайсе', String(units.length)], ['приём заявок', HOURS_TEXT]], photo: pagePhoto(ctx, 'arenda-abn') })}
<section class="section section--tight"><div class="container">
${renderConfigurator(ctx, rentalSpec(ctx), { deliveryNote: 'Время работы зависит от объёма заливки, подъезда и условий площадки: уточним при заказе. Бетон и доставка миксерами считаются отдельно.', tel: telHref(ctx), lead: `Выберите насос по вылету стрелы и время работы. Цены из прайса на ${ctx.priceDateRu}.` })}
</div></section>
<section class="section section--band"><div class="container">
${sh('Прайс', 'Тарифы на технику', null, { row: true })}
${priceNote(ctx, { min: false })}
<h3 class="tbl-title">Автобетононасосы</h3>
<div class="table-wrap"><table class="pt"><thead><tr><th>Техника</th><th class="pr">Цена</th><th class="ac"><span class="sr">Заказ</span></th></tr></thead>
<tbody>${join(units.map(unitRow))}</tbody></table></div>
${extras.length ? h`<h3 class="tbl-title">Дополнительная техника и оборудование</h3>
<div class="table-wrap"><table class="pt"><thead><tr><th>Позиция</th><th>Условия</th><th class="pr">Цена</th><th class="ac"><span class="sr">Заказ</span></th></tr></thead>
<tbody>${join(extras.map((u) => h`<tr><td class="mk nm" data-l="Позиция">${u.name}</td><td data-l="Условия">${u.note ?? '—'}</td><td class="pr" data-l="Цена"><span class="num">${fmtNum(u.price)}${NBSP}₽</span> <small>/${u.unit}</small></td><td class="ac"><a class="rowlink" href="${telHref(ctx)}">Заказать</a></td></tr>`))}</tbody></table></div>` : ''}
</div></section>
<section class="section"><div class="container">
${sh('Площадка', 'Что подготовить к приезду насоса', 'Перед выездом уточняем адрес и условия площадки. Если что-то из списка не выполнить, скажите при заказе: подберём насос с другой стрелой или место установки.', { row: true })}
<div class="feat">
<div class="feat__it">${icon(ctx, 'ruler')}<h3>Ровная площадка под опоры</h3><p>Насос стоит на выносных опорах. Размеры площадки зависят от модели: сообщим их при заказе.</p></div>
<div class="feat__it">${icon(ctx, 'truck')}<h3>Подъезд для насоса и миксеров</h3><p>Миксеры подъезжают к приёмному бункеру насоса по очереди, поэтому нужен разворот или проезд.</p></div>
<div class="feat__it">${icon(ctx, 'shield')}<h3>Свободно над стрелой</h3><p>Без проводов и веток в зоне работы стрелы, иначе насос не сможет раскрыть её полностью.</p></div>
</div>
<div class="note after"><b>Что входит в цену.</b> Работа техники в указанных единицах, час или метр. Бетон и доставку миксерами считаем отдельно по <a href="/price/">прайс-листу</a>. Насос и миксеры лучше заказывать на одно время: тогда подача идёт без пауз.</div>
</div></section>
<section class="section section--band"><div class="container">
${sh('Фото', 'Насосы и миксеры на объектах')}
${photoGrid(ctx, { roles: ['fleet'], skip: [pagePhoto(ctx, 'arenda-abn')] })}
</div></section>
${relatedArticles(ctx, 'arenda-abn')}
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
    title: `Аренда автобетононасоса ${site.plant.locality_in} ${priceHint} | ${site.brand}`,
    description: `Аренда автобетононасоса ${site.plant.locality_in}: ${priceHint}, вылет стрелы ${reachSpan(ctx)}. Лента, бетоноводы, миксер с насосом. Работаем 24/7.`,
    h1, main, jsonld: [baseGraph(ctx), service, faqLd(faqItems)]
  };
}

// ---------- Доставка ----------
export function deliveryPage(ctx) {
  const { site } = ctx;
  const d = site.delivery;
  const h1 = T(ctx, 'delivery.h1', `Доставка бетона по ${site.plant.district_dat}`);
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
  const pumpPhoto = ctx.photos.find((p) => p.file === 'abn-podacha.jpg') ?? ctx.photos.find((p) => p.role === 'fleet');
  const main = h`${pagehead(ctx, {
    h1, eyebrow: 'Доставка', lead: `Завод: ${site.plant.address}. ${deliveryLine(ctx)} ${pickupLine(ctx, { short: true }) ?? ''}`,
    facts: [['минимальный заказ', minVolText(ctx)], ['отгрузка', 'с завода'], ['доставка', '24/7']], photo: pagePhoto(ctx, 'dostavka')
  })}
${ctx.cities.length ? h`<section class="section section--tight"><div class="container">
<div class="split split--top">
<div>
<p class="eyebrow">Направления</p>
<h2>Куда возим бетон</h2>
<p class="lead">Возим по ${site.plant.district_dat}. Если вашего адреса нет в списке, назовите его при заказе: скажем, сколько едет миксер и сколько стоит доставка.</p>
${cityCards(ctx, ctx.cities, { origin: true })}
</div>
${media(ctx, (ctx.photos.find((p) => p.file === 'abn-gorod.jpg') ?? ctx.photos.find((p) => p.role === 'fleet')).file, { ico: 'truck' })}
</div>
${withCost.length ? h`<div class="after">${priceNote(ctx, { min: false })}</div><div class="table-wrap"><table class="pt"><thead><tr><th>Направление</th><th>Расстояние</th><th>В пути</th><th class="pr">Доставка</th></tr></thead><tbody>${join(withCost.map((c) => h`<tr><td class="mk nm" data-l="Направление"><a href="${c.url}">${c.name}</a></td><td data-l="Расстояние">${c.distance_km != null ? distText(c) : '—'}</td><td data-l="В пути">${c.travel_time ?? '—'}</td><td class="pr" data-l="Доставка"><span class="num">${fmtNum(c.delivery_cost)}${NBSP}₽</span> <small>${c.delivery_cost_unit ?? ''}</small></td></tr>`))}</tbody></table></div>` : ''}
</div></section>` : ''}
<section class="section section--band"><div class="container split split--top">
<div>
<p class="eyebrow">Стоимость</p>
<h2>Из чего складывается цена доставки</h2>
<p class="lead">${d.tariff_note ?? 'Стоимость доставки зависит от расстояния до объекта и объёма заказа. Точную сумму называем после уточнения адреса.'}</p>
<ul class="checks"><li>Расстояние от завода ${site.plant.locality_from} до объекта.</li><li>Объём заказа и число рейсов${d.mixer_capacity_m3 ? ` (миксер вмещает до ${fmtNum(d.mixer_capacity_m3)}${NBSP}м³)` : ''}.</li><li>Условия подъезда и разгрузки на объекте.</li></ul>
</div>
<div class="card"><h3>Как заказать доставку</h3>
<ol class="process">
<li><div><b>Звонок или заявка</b><span>${site.phone.display} или форма внизу страницы.</span></div></li>
<li><div><b>Марка, объём, адрес</b><span>Уточним подвижность и способ выгрузки.</span></div></li>
<li><div><b>Расчёт и время</b><span>Назовём стоимость с доставкой и согласуем время подачи.</span></div></li>
</ol></div>
</div></section>
${ctx.rental ? h`<section class="section"><div class="container split split--media">
${media(ctx, pumpPhoto.file, { ico: 'truck' })}
<div>
<p class="eyebrow">Подача насосом</p>
<h2>Если миксер не подъедет к опалубке</h2>
<p class="lead">Автобетононасос подаёт смесь из миксера по стреле: на перекрытие, в дальний угол участка, через забор или дом. Вылет стрелы ${reachSpan(ctx)}, оплата по часам.</p>
<div class="actions actions--flush"><a class="btn btn--primary" href="/catalog/arenda-abn/">Тарифы на насосы</a><span class="actions__note">Насос и миксеры согласуем на одно время</span></div>
</div>
</div></section>` : ''}
<section class="section section--band"><div class="container">
${sh('Фото', 'Миксеры и насосы на объектах')}
${photoGrid(ctx, { roles: ['fleet'], skip: [pagePhoto(ctx, 'dostavka'), pumpPhoto.file] })}
</div></section>
${mapSection(ctx, { band: false, title: 'Откуда выезжают миксеры' })}
${faq(ctx, faqItems)}${ctaBand(ctx, { source: 'delivery' })}`;
  return {
    url: '/dostavka/', crumbs: [{ name: 'Доставка', url: '/dostavka/' }],
    title: `Доставка бетона по ${site.plant.district_dat} | ${site.brand}`,
    description: truncate(`Доставка бетона миксерами с завода ${site.plant.locality_in} по ${site.plant.district_dat}: заказ от ${fmtNum(site.min_volume_m3)}${NBSP}м³, расчёт по адресу, работаем 24/7.`, 190),
    h1, main, jsonld: [baseGraph(ctx), faqLd(faqItems)]
  };
}

// ---------- Геопосадочная: город ----------
// Расстояние считается по прямой между заводом и центром города (см. data.mjs), время в пути и цену доставки данных нет:
// страница честно говорит, от чего они зависят, и называет их при расчёте по адресу.
const distText = (c) => (c.distance_km == null ? null : c.distance_kind === 'road' ? `${fmtNum(c.distance_km)}${NBSP}км по дороге` : `около ${fmtNum(c.distance_km)}${NBSP}км по прямой`);

// Примеры расчёта объёма: у каждого города свой набор и свои размеры, цифры считаются из прайса.
const EX = [
  { id: 'lenta', title: 'Ленточный фундамент дома', unit: 'м', mark: 'М250', sizes: [[34, 0.4, 0.8], [38, 0.4, 0.9], [30, 0.5, 0.8], [42, 0.4, 1.0]], note: (l, w, h) => `лента ${fmtNum(l)}${NBSP}м × ${fmtNum(w)}${NBSP}м × ${fmtNum(h)}${NBSP}м` },
  { id: 'plita', title: 'Монолитная плита', unit: 'м', mark: 'М300', sizes: [[6, 8, 0.3], [7, 9, 0.3], [6, 6, 0.25], [8, 10, 0.35]], note: (l, w, h) => `плита ${fmtNum(l)}${NBSP}× ${fmtNum(w)}${NBSP}м, толщина ${fmtNum(h)}${NBSP}м` },
  { id: 'otmostka', title: 'Отмостка по периметру дома', unit: 'м', mark: 'М250', sizes: [[28, 0.8, 0.1], [34, 1.0, 0.1], [24, 0.8, 0.12], [40, 1.0, 0.1]], note: (l, w, h) => `${fmtNum(l)}${NBSP}м × ${fmtNum(w)}${NBSP}м × ${fmtNum(h)}${NBSP}м` },
  { id: 'styazhka', title: 'Стяжка пола', unit: 'м²', cps: 'ЦПС 1:3 М300', sizes: [[60, 1, 0.06], [80, 1, 0.05], [45, 1, 0.07], [100, 1, 0.05]], note: (a, _, t) => `${a}${NBSP}м² × ${Math.round(t * 100)}${NBSP}см` },
  { id: 'ploshadka', title: 'Площадка под машину', unit: 'м', mark: 'М300', sizes: [[6, 4, 0.15], [8, 5, 0.15], [6, 3, 0.12], [10, 5, 0.15]], note: (l, w, h) => `${fmtNum(l)}${NBSP}× ${fmtNum(w)}${NBSP}м, толщина ${Math.round(h * 100)}${NBSP}см` }
];
// Логистические ситуации: восемь разных абзацев, на странице города два. Наборы у городов не пересекаются.
const SITUATIONS = [
  ['Участок в коттеджном посёлке или СНТ', (c, to) => `Перед заказом ${to} уточните у посёлка или правления СНТ, есть ли ограничения по массе машин и ширине проезда и работает ли шлагбаум ночью. Миксер с бетоном тяжёлый и длинный, поэтому ширину въезда и поворотов лучше сообщить заранее. Если подъехать к участку нельзя, подадим бетон насосом с дороги.`],
  ['Объект в плотной застройке', (c) => `Если объект ${c.in} стоит во дворе или на узкой улице, назовите точный адрес при заказе: согласуем место для миксера и время выезда. Круглосуточная отгрузка позволяет приехать в окно, когда проезд свободен. Для перекрытий и стен на высоте закажите насос и заранее определите, где он встанет.`],
  ['Фундамент, которому нужно несколько машин', (c, to) => `Объём больше одного миксера привозим несколькими рейсами. Чтобы между партиями не образовался холодный шов, заказывайте все машины на одно окно времени и сообщите, с какой скоростью бригада укладывает смесь. Интервал между миксерами ${to} зависит от расстояния и дорог, мы называем его при согласовании.`],
  ['Заливка в холодное время', (c) => `Когда среднесуточная температура опускается ниже +5 °C, берут бетон с противоморозной добавкой. Для заливки ${c.in} в такую погоду заказывайте смесь заранее, не держите миксер на объекте и сразу укрывайте конструкцию. Что выбрать по температуре, описано в статье <a href="/stati/beton-zimoj-pmd/">бетон зимой</a>.`],
  ['Небольшой объём: стяжка, дорожка, столбы', (c) => `Заказ начинается от одного кубометра, поэтому дорожку, площадку или стяжку ${c.in} можно залить без лишнего запаса. Все кубы привозим одной машиной: в отличие от нескольких мелких партий, так смесь одинакова по всему объёму. Для стяжек и оснований под плитку часто берут не бетон, а <a href="/stati/cps-ili-rastvor/">ЦПС или раствор</a>.`],
  ['Бетон на этаж, через забор, в дальний угол', (c) => `Если миксер не может подъехать к опалубке, бетон подают автобетононасосом: стрела проходит над забором, домом или деревьями. Перед выездом ${c.in} уточним высоту и расстояние до самой дальней точки заливки и подберём насос по вылету стрелы. Насос и миксеры заказывайте на одно время.`],
  ['Заказ на ночь или в выходные', (c, to) => `Завод принимает заявки и отгружает бетон круглосуточно. Если днём подъезд ${to} ограничен или бригада работает в прохладное время суток, назовите удобное окно: ночная отгрузка и выезд согласуем так же, как дневные. Заявку можно оставить в любое время по телефону или через форму.`],
  ['Приёмка бетона на объекте', (c) => `При приезде миксера ${c.in} сверьте с накладной марку, класс и подвижность и запишите время выезда машины с завода. Разбавлять смесь водой на объекте нельзя: она теряет прочность. Как проверить подвижность и оформить спор, описано в статье <a href="/stati/priemka-betona-s-mikser/">как принять бетон с миксера</a>.`]
];

function examples(ctx, idx) {
  const cat = ctx.mainConcrete;
  const price = (m) => Math.min(...cat.rows.filter((r) => r.mark === m).map((r) => r.price));
  const tsps = ctx.categories.find((x) => x.slug === 'tsps');
  const picks = [EX[idx % 5], EX[(idx + 1) % 5], EX[(idx + 3) % 5]];
  return picks.map((e, k) => {
    const [a, b, c] = e.sizes[(idx + k) % e.sizes.length];
    const vol = a * b * c;
    const order = Math.max(ctx.site.min_volume_m3, Math.ceil(vol * 1.05 * 2) / 2);
    let unitPrice, name;
    if (e.cps) { const r = tsps?.rows.find((x) => x.name === e.cps); if (!r) return null; unitPrice = r.price; name = r.name; } else { unitPrice = price(e.mark); name = `бетон ${e.mark}`; }
    return { title: e.title, dims: e.note(a, b, c), vol: Math.round(vol * 100) / 100, order, name, unitPrice, cost: Math.round(unitPrice * order) };
  }).filter(Boolean);
}

export function cityPage(ctx, c) {
  const { site } = ctx;
  const cat = ctx.mainConcrete;
  const idx = Math.max(0, ctx.cities.indexOf(c));
  const to = c.to ?? c.in;
  const of = c.of ?? c.name;
  const plant = site.plant;
  const h1 = T(ctx, `city.${c.slug}.h1`, `Бетон ${c.in} с доставкой`);
  const marksOrdered = [...new Set(cat.rows.map((r) => r.mark))].sort((a, b) => markNum(a) - markNum(b));
  const shownMarks = marksOrdered.filter((m) => ['М150', 'М200', 'М250', 'М300', 'М350', 'М400'].includes(m));
  const rows = (shownMarks.length ? shownMarks : marksOrdered).map((m) => cat.rows.filter((r) => r.mark === m).sort((a, b) => a.price - b.price)[0]);
  const from = fromPriceOf(cat.rows);
  const dist = distText(c);
  const costLine = c.delivery_cost != null ? `Доставка ${to}: ${fmtNum(c.delivery_cost)}${NBSP}₽${c.delivery_cost_unit ? ` ${c.delivery_cost_unit}` : ''}.` : `Стоимость доставки ${to} зависит от адреса объекта, числа рейсов и подъезда. Точную сумму называем при расчёте по адресу.`;
  const timeLine = c.travel_time ? `Время в пути от завода: ${c.travel_time}.` : `Время подачи зависит от дорог и загрузки: ориентир называем при согласовании заказа.`;
  const pickup = pickupLine(ctx);
  const pay = paymentLine(ctx);
  const others = ctx.cities.filter((x) => x.slug !== c.slug);
  const routeUrl = c.lat != null && plant.geo ? `https://yandex.ru/maps/?rtext=${plant.geo.lat},${plant.geo.lon}~${c.lat},${c.lon}&rtt=auto` : null;
  const ex = examples(ctx, idx);
  const sits = [SITUATIONS[(idx * 2) % SITUATIONS.length], SITUATIONS[(idx * 2 + 1) % SITUATIONS.length]];
  const units = ctx.rental?.units ?? [];
  const pumps = units.length ? [units[0], units[Math.floor(units.length / 2)], units.at(-1)].filter((u, i, a) => a.indexOf(u) === i) : [];
  const sharp = (p) => { const im = ctx.images.get(p.file); return im && Math.min(im.w, im.h) >= 800; };
  const fleet = ctx.photos.filter((p) => p.role === 'fleet' && sharp(p));
  const ph = fleet.length ? fleet[idx % fleet.length] : null;
  const phSecond = fleet.length > 1 ? fleet[(idx + 3) % fleet.length] : null;
  const heroPh = ph;
  const articlesFor = ['mikser-ili-nasos', 'priemka-betona-s-mikser', 'skolko-kubov-betona', 'iz-chego-skladyvaetsya-cena-betona'].map((x) => ctx.articles?.find((y) => y.slug === x)).filter(Boolean);

  const dirLine = c.direction ? `${c.name} лежит ${c.direction} от завода` : null;
  const byDist = [...ctx.cities].filter((x) => x.distance_km != null).sort((a, b) => a.distance_km - b.distance_km);
  const rank = byDist.indexOf(c);
  const rankLine = byDist.length > 1 && rank >= 0
    ? `Среди направлений доставки завода ${c.name} ${rank === 0 ? 'ближайшее' : rank === byDist.length - 1 ? 'самое дальнее' : `${rank + 1}-е по удалённости`}: ${byDist.map((x) => `${x.name} ${x.distance_kind === 'line' ? 'около ' : ''}${fmtNum(x.distance_km)}${NBSP}км`).join(', ')}.`
    : null;

  const faqItems = T(ctx, `faq.city.${c.slug}`, [
    ...(c.faq || []).map((f) => (Array.isArray(f) ? f : [f.q, f.a])),
    [`Откуда привозите бетон ${to}?`, `Бетон производится на нашем заводе ${plant.locality_in}: ${plant.address}. ${dirLine ?? c.name} ${dist ? `(${dist})` : ''}, бетон привозят автобетоносмесители.`.replace(' ,', ',')],
    [`Сколько стоит доставка бетона ${to}?`, `${costLine}${ex[0] ? ` Для ориентира: ${ex[0].title.toLowerCase()} (${ex[0].dims}) требует ${fmtNum(ex[0].order)}${NBSP}м³, сам бетон обойдётся в ${fmtNum(ex[0].cost)}${NBSP}₽, доставка считается сверху по адресу.` : ''}`],
    [`Сколько ехать от завода до ${of}?`, `${dist ? `От завода до центра ${of} ${dist}${c.direction ? `, город лежит ${c.direction} от завода` : ''}. По дорогам путь длиннее. ` : ''}${timeLine}`],
    [`Привезёте бетон ${to} ночью или в выходные?`, `Да. ${HOURS_FULL}. Заявку ${c.in} принимаем в любое время, миксер выезжает с завода по согласованному времени.`],
    [`Какой минимальный объём заказа ${c.in}?`, c.min_volume ? `Минимальный заказ ${c.in} — ${fmtNum(c.min_volume)}${NBSP}м³.` : `Минимальный заказ — ${minVolText(ctx)}. Объём, который не помещается в один миксер, привозим несколькими рейсами.`],
    ...(units.length ? [[`Можно ли заказать автобетононасос ${c.in}?`, `Да. В парке насосы с вылетом стрелы ${reachSpan(ctx)}, оплата по часам: от ${fmtNum(Math.min(...units.map((u) => u.price)))}${NBSP}₽ в час. Насос и миксеры заказываем на одно время.`]] : []),
    ...(pickup ? [[`Можно ли забрать бетон самому, если объект ${c.in}?`, `${pickup} Свой транспорт для бетона не подойдёт: смесь нужно перевозить в автобетоносмесителе.`]] : []),
    ...(rankLine ? [[`Далеко ли ${c.name} от завода по сравнению с другими городами?`, rankLine]] : [])
  ]);

  const facts = [['откуда везём', plant.locality]];
  if (dist) facts.push([`до центра ${of}`, dist.replace(`${NBSP}км по прямой`, `${NBSP}км`).replace(' по дороге', '')]);
  facts.push(['заказ', `от ${minVolText(ctx)}`], ['режим', '24/7']);
  const factsShown = facts.slice(0, 3);

  const lead = `Бетон производится на нашем заводе ${plant.locality_in} (${plant.street}) и доставляется ${to} автобетоносмесителями. ${dist ? `От завода до центра ${of} ${dist}${dirLine ? `: ${dirLine}` : ''}. ` : ''}Заказ принимаем круглосуточно, от ${minVolText(ctx)}.`;

  const main = h`${pagehead(ctx, {
    h1, eyebrow: 'Доставка', lead, price: { from, unit: 'м³' }, facts: factsShown, photo: ph?.file, caption: ph?.caption
  })}
<section class="section section--tight"><div class="container">
${sh('Цены', `Цены на бетон с доставкой ${to}`, `Цена бетона указана за 1${NBSP}м³ и одинакова для любого адреса. ${costLine}`, { row: true })}
${priceNote(ctx)}
${concreteTable(ctx, cat, rows)}
<div class="marklinks"><span>Страницы марок:</span>${join(ctx.markPages.map((m) => h`<a class="chip" href="/catalog/${cat.slug}/${cat.rows.find((r) => r.mark === m).markSlug}/">Бетон ${m}</a>`))}<a class="chip" href="/price/">Все ${marksOrdered.length} марок в прайс-листе</a></div>
</div></section>
<section class="section section--band"><div class="container split split--top">
<div>
<p class="eyebrow">Условия</p>
<h2>Как мы доставляем бетон ${to}</h2>
<dl class="kv">
<dt>Откуда</dt><dd>завод ${plant.locality_in}, ${plant.street}</dd>
${dist ? h`<dt>Расстояние</dt><dd>${dist} до центра ${of}</dd>` : ''}
${c.direction ? h`<dt>Направление</dt><dd>${c.name} лежит ${c.direction} от завода</dd>` : ''}
<dt>Время в пути</dt><dd>${c.travel_time ?? 'зависит от дорог и загрузки, называем при заказе'}</dd>
<dt>Стоимость доставки</dt><dd>${c.delivery_cost != null ? `${fmtNum(c.delivery_cost)}${NBSP}₽${c.delivery_cost_unit ? ` ${c.delivery_cost_unit}` : ''}` : 'по адресу объекта'}</dd>
<dt>Минимальный заказ</dt><dd>${c.min_volume ? `${fmtNum(c.min_volume)}${NBSP}м³` : minVolText(ctx)}</dd>
<dt>Режим</dt><dd>${HOURS_TEXT}: заявки, отгрузка и доставка</dd>
</dl>
${rankLine ? h`<p>${rankLine}</p>` : ''}
${routeUrl ? h`<p><a class="link-arrow" href="${routeUrl}" rel="noopener" target="_blank">Маршрут от завода до центра ${of} на Яндекс Картах${icon(ctx, 'arrow')}</a></p>` : ''}
${(c.notes || []).map((n) => h`<p>${n}</p>`)}
<p class="small muted">Стоимость доставки считается по адресу объекта, а не по центру города. От чего она зависит, описано на странице <a href="/dostavka/">доставки</a>. Позвоните <a href="${telHref(ctx)}">${site.phone.display}</a>, мы назовём сумму.</p>
</div>
<div class="sits">${join(sits.map(([t, f]) => h`<article class="sit"><h3>${t}</h3><p>${raw(f(c, to))}</p></article>`))}</div>
</div></section>
<section class="section"><div class="container">
${sh('Расчёт', `Примеры расчёта объёма и стоимости бетона ${c.in}`, `Три типовых задачи с размерами и ценами из прайса на ${ctx.priceDateRu}. Запас 5% на потери и неровности основания, стоимость без доставки.`, { row: true })}
<div class="exs">${join(ex.map((e) => h`<article class="ex"><h3>${e.title}</h3><p class="ex__d">${e.dims}</p>
<dl class="ex__n"><div><dt>Объём по размерам</dt><dd>${fmtNum(e.vol)}${NBSP}м³</dd></div><div><dt>Заказ с запасом</dt><dd>${fmtNum(e.order)}${NBSP}м³</dd></div><div><dt>${e.name}</dt><dd>${fmtNum(e.unitPrice)}${NBSP}₽/м³</dd></div></dl>
<p class="ex__c">${fmtNum(e.cost)}${NBSP}₽ <small>без доставки</small></p></article>`))}</div>
<p class="after">Свои размеры посчитает <a href="/catalog/${cat.slug}/#calc">калькулятор объёма</a>. Как считать ленту, столбы и лестницы: <a href="/stati/skolko-kubov-betona/">сколько кубов бетона заказать</a>.</p>
</div></section>
${pumps.length ? h`<section class="section section--band"><div class="container split split--media">
${phSecond ? media(ctx, phSecond.file, { ico: 'truck', caption: phSecond.caption }) : ''}
<div>
<p class="eyebrow">Подача насосом</p>
<h2>Автобетононасос ${c.in}</h2>
<p class="lead">Если миксер не подъедет к опалубке или бетон нужно подать на высоту, закажите насос: стрела подаёт смесь на перекрытие, через забор и в дальний угол участка.</p>
<ul class="checks">${join(pumps.map((u) => h`<li>${u.name}: ${fmtNum(u.price)}${NBSP}₽ в ${u.unit === 'час' ? 'час' : u.unit}</li>`))}</ul>
<div class="actions actions--flush"><a class="btn btn--primary" href="/catalog/arenda-abn/">Все насосы и тарифы</a><a class="link-arrow" href="/stati/mikser-ili-nasos/">Миксер или насос${icon(ctx, 'arrow')}</a></div>
</div>
</div></section>` : ''}
<section class="section"><div class="container">
${sh('Продукция', `Что ещё привезём ${to}`, 'Те же условия доставки действуют для всех видов бетона, растворов и ЦПС.', { row: true })}
<div class="chips">${join(ctx.categories.map((k) => h`<a class="chip" href="/catalog/${k.slug}/">${k.menu}<b>от ${fmtNum(fromPriceOf(k.rows))}</b></a>`))}</div>
${pickup ? h`<p class="small muted">${pickup}</p>` : ''}
</div></section>
${others.length ? h`<section class="section section--band"><div class="container">
${sh('География', 'Доставка бетона в другие города', `Завод ${plant.locality_in} возит бетон и в соседние города.`, { row: true })}
<ul class="dirs">${join(others.map((x) => h`<li><a href="${x.url}"><b>Бетон ${x.in}</b><span>${distText(x) ?? ''}${x.direction ? `, ${x.direction} от завода` : ''}</span></a></li>`))}</ul>
</div></section>` : ''}
${faq(ctx, faqItems, { title: `Вопросы про доставку бетона ${to}` })}${ctaBand(ctx, { source: `city-${c.slug}`, title: `Закажите бетон ${to}` })}`;

  const service = {
    '@context': 'https://schema.org', '@type': 'Service', '@id': `${ctx.origin}${c.url}#service`,
    serviceType: 'Доставка бетона', name: h1, provider: { '@id': lbId(ctx) },
    areaServed: { '@type': 'City', name: c.name, ...(c.lat != null ? { geo: { '@type': 'GeoCoordinates', latitude: c.lat, longitude: c.lon } } : {}) },
    offers: { '@type': 'AggregateOffer', priceCurrency: 'RUB', lowPrice: String(from), highPrice: String(Math.max(...cat.rows.map((r) => r.price))), offerCount: cat.rows.length, url: ctx.origin + c.url }
  };
  const crumbs = [{ name: 'Доставка', url: '/dostavka/' }, { name: c.tier === 'settlement' ? c.name : `Бетон ${c.in}`, url: c.url }];
  // Без расстояния, времени и цены доставки страница ничем не отличается от основного сайта сети: закрываем от индекса,
  // пока данные не заполнены. Расстояние по прямой считается автоматически из координат города в content/cities.json.
  const unique = c.distance_km != null || c.travel_time != null || c.delivery_cost != null;
  return {
    url: c.url, crumbs, ...(unique ? {} : { noindex: true, inSitemap: false }),
    ogImage: ph && ctx.images.has(ph.file) ? ctx.images.get(ph.file).full : undefined,
    title: `Купить бетон ${c.in} с доставкой — цена за м³ | ${site.brand}`,
    description: truncate(`Бетон ${c.in} с доставкой с завода ${plant.locality_in}: от ${fmtNum(from)}${NBSP}₽/м³, марки ${marksOrdered[0]}–${marksOrdered.at(-1)}, заказ от ${fmtNum(site.min_volume_m3)}${NBSP}м³. ${dist ? `До центра ${of} ${dist}. ` : ''}Работаем 24/7.`, 190),
    h1, main, jsonld: [baseGraph(ctx), service, faqLd(faqItems)]
  };
}

// ---------- Фото ----------
export function galleryPage(ctx) {
  const { site } = ctx;
  const h1 = `Фото завода ${site.plant.locality_in} и техники на объектах`;
  const main = h`${pagehead(ctx, { h1, eyebrow: 'Фото', lead: `Снимки завода, автобетоносмесителей, автобетононасосов и залитых конструкций из карточки завода на Яндекс Картах. Нажмите на фото, чтобы открыть крупнее.`, actions: false })}
${gallery(ctx, ['hero', 'plant', 'fleet', 'lab', 'object'], { title: null, band: false })}
${ctaBand(ctx, { source: 'gallery' })}`;
  return {
    url: '/gallery/', crumbs: [{ name: 'Фото', url: '/gallery/' }],
    title: `Фото завода и техники ${site.plant.locality_in} | ${site.brand}`,
    description: `Фото бетонного завода ${site.plant.locality_in}, автобетоносмесителей и автобетононасосов на объектах. Работаем 24/7.`,
    h1, main, jsonld: [baseGraph(ctx)]
  };
}
