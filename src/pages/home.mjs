import { h, raw, join, fmtNum, NBSP, plural, nb } from '../lib/util.mjs';
import { icon, img, telHref, HOURS_TEXT, HOURS_FULL, minVolText, faq } from '../lib/layout.mjs';
import { CONCRETE_KINDS } from '../lib/categories.mjs';
import { markNum } from '../lib/marks.mjs';
import { baseGraph, faqLd } from '../lib/seo.mjs';
import { T, sh, media, ctaBand, marksRange, deliveryLine, pickupLine, paymentLine, reachSpan, maxReach, productItems, cardMeta, unitOf, pagePhoto, CAT_ICON, photoGrid, ratingPanel, reviewsGrid, articleList, payMethods, cityChip } from './common.mjs';

export function homeFaq(ctx) {
  const { site } = ctx;
  const items = [
    ['Какой минимальный объём заказа?', `Минимальный заказ — ${minVolText(ctx)}. Марку и подвижность уточняем при расчёте.`],
    ['Вы работаете ночью и в выходные?', `Да. ${HOURS_FULL}.`],
    ['Откуда вы возите бетон?', `С нашего завода ${site.plant.locality_in}: ${site.plant.address}. Бетон привозят автобетоносмесители.`],
    ['Как узнать стоимость с доставкой?', `${site.delivery.tariff_note ?? deliveryLine(ctx)} Позвоните ${site.phone.display} или оставьте заявку: назовите марку, объём и адрес.`],
    ['Какие документы выдаёте на бетон?', `К партии прилагаются: ${site.documents.join(', ')}.`]
  ];
  const pick = pickupLine(ctx), pay = paymentLine(ctx);
  if (pick) items.push(['Можно ли забрать бетон самовывозом?', pick]);
  if (pay) items.push(['Как оплатить заказ?', pay]);
  if (ctx.rental) items.push(['Чем подать бетон на этаж или в дальний угол участка?', `Автобетононасосом: стрела с вылетом ${reachSpan(ctx)} подаёт смесь туда, куда миксер не подъедет. Насос и миксеры заказывают на одно время, тогда заливка идёт без пауз.`]);
  return T(ctx, 'faq.home', items);
}

const priceOf = (rows) => Math.min(...rows.map((r) => r.price));

// Вкладка прайса: по строке на марку с минимальной ценой. Ссылки ведут на страницы марок, где они есть.
function pwPanel(ctx, cat, i) {
  const concrete = CONCRETE_KINDS.has(cat.kind);
  let rows;
  if (concrete) {
    const marks = [...new Set(cat.rows.map((r) => r.mark))].sort((a, b) => markNum(a) - markNum(b));
    rows = marks.map((m) => { const rs = cat.rows.filter((r) => r.mark === m); return { name: `${rs[0].cls}, ${m}`, mark: m, slug: rs[0].markSlug, price: priceOf(rs) }; });
  } else {
    rows = cat.rows.map((r) => ({ name: r.name, price: r.price }));
  }
  const shown = rows.slice(0, 7);
  const unit = unitOf(cat);
  const linkMark = (r) => concrete && cat.slug === ctx.mainConcrete.slug && ctx.markPages.includes(r.mark);
  return h`<div class="pw__panel" id="pw-${cat.slug}" role="tabpanel"${i ? raw(' hidden') : ''}>
<h3>${cat.menu}</h3>
<p>${cardMeta(ctx, cat)}</p>
<table class="pw__rows"><thead><tr><th>${concrete ? 'Класс, марка' : 'Состав'}</th><th>₽/${unit}</th></tr></thead>
<tbody>${join(shown.map((r) => h`<tr><td>${linkMark(r) ? h`<a href="/catalog/${cat.slug}/${r.slug}/">${r.name}</a>` : r.name}</td><td>${concrete ? '' : 'от '}${fmtNum(r.price)}</td></tr>`))}</tbody></table>
<a class="link-arrow pw__more" href="/catalog/${cat.slug}/">${rows.length > shown.length ? `Ещё ${rows.length - shown.length} ${plural(rows.length - shown.length, 'позиция', 'позиции', 'позиций')} и подбор характеристик` : 'Подобрать характеристики и посчитать объём'}${icon(ctx, 'arrow')}</a>
</div>`;
}

export function home(ctx) {
  const { site } = ctx;
  const minV = fmtNum(site.min_volume_m3);
  const h1 = T(ctx, 'home.h1', site.hero_h1 ?? `Бетон от производителя ${site.plant.locality_in}`);
  const title = `Бетон ${site.plant.locality_in} от производителя, 24/7 | ${site.brand}`;
  const description = `Бетон с завода ${site.plant.locality_in}: цены от ${fmtNum(ctx.fromPrice)}${NBSP}₽/м³, доставка от ${minV}${NBSP}м³ по ${site.plant.district_dat}. Работаем 24/7. Расчёт по телефону ${site.phone.display}.`;
  const heroPhoto = ctx.photos.find((p) => p.role === 'hero');
  const faqItems = homeFaq(ctx);
  const r = site.card?.rating;
  const pays = payMethods(ctx);
  const main0 = ctx.mainConcrete;

  // ---------- первый экран ----------
  const facts = [
    [`от ${fmtNum(ctx.fromPrice)}${NBSP}₽/м³`, `цена бетона на ${ctx.priceDateRu}`],
    ctx.rental ? [`до ${maxReach(ctx)}${NBSP}м`, 'вылет стрелы самого длинного насоса'] : [minVolText(ctx), 'минимальный заказ'],
    pays.length ? ['Наличные, карта, счёт', 'способы оплаты на выбор'] : [HOURS_TEXT, 'отгрузка и доставка']
  ];
  const hero = h`<section class="hero"><div class="container hero__in">
<div>
<a class="pill" href="${site.plant.yandex_url}" rel="noopener" target="_blank">${icon(ctx, 'pin')}<span>${site.plant.region}, ${site.plant.locality}</span></a>
<h1>${h1.replace(/ в /g, ' в\u00A0')}<span class="sr">: </span> <span class="hero__sub">доставка от ${minV}${NBSP}м³, 24/7</span></h1>
<p class="hero__lead">${nb(T(ctx, 'home.lead', `Бетон ${marksRange(ctx)}, растворы, ЦПС, арматура и аренда автобетононасосов. Завод на улице Обогатителей: забирайте сами или закажите миксер и насос на объект.`))}</p>
<ul class="facts3">${join(facts.map(([b, s], i) => h`<li${i === 0 ? raw(' class="hero__price"') : ''}><b>${b}</b><span>${s}</span></li>`))}</ul>
<div class="hero__cta">
<a class="btn btn--primary" href="#zayavka" data-order>Оставить заявку</a>
<a class="telink" href="${telHref(ctx)}">${icon(ctx, 'phone')}${site.phone.display}</a>
${r ? h`<a class="rate" href="${site.plant.yandex_url}" rel="noopener" target="_blank">${icon(ctx, 'star-f')}<b>${String(r.value).replace('.', ',')}</b> на Яндекс Картах, ${r.count} ${plural(r.count, 'оценка', 'оценки', 'оценок')}</a>` : ''}
</div>
</div>
${media(ctx, heroPhoto.file, { eager: true, cls: 'media--tall', sizes: '(max-width:980px) 100vw, 46vw', ico: 'factory' })}
</div></section>`;

  // ---------- полоса с цифрами ----------
  const nCats = ctx.categories.length + (ctx.rental ? 1 : 0);
  const stats = h`<section class="stats" aria-label="Завод в цифрах"><div class="container stats__in">
<div class="stat"><b>24/7</b><span>приём заявок, отгрузка и доставка</span></div>
<a class="stat" href="/price/"><b>${ctx.positions}</b><span>${plural(ctx.positions, 'позиция', 'позиции', 'позиций')} в прайс-листе</span></a>
<a class="stat" href="#produkciya"><b>${nCats}</b><span>${plural(nCats, 'раздел', 'раздела', 'разделов')}: от бетона до аренды насосов</span></a>
${r ? h`<a class="stat" href="${site.plant.yandex_url}" rel="noopener" target="_blank"><b>${String(r.value).replace('.', ',')}</b><span>оценка на Яндекс Картах, ${r.count} ${plural(r.count, 'оценка', 'оценки', 'оценок')}</span></a>` : h`<div class="stat"><b>${minV}${NBSP}м³</b><span>минимальный заказ</span></div>`}
</div></section>`;

  // ---------- прайс со вкладками ----------
  const tabCats = ctx.categories.filter((c) => c.kind !== 'rebar');
  const priceWidget = h`<section class="section" id="price"><div class="container">
<div class="pw">
<div class="pw__head"><div><p class="eyebrow">Прайс-лист</p><h2>Цены на бетон и растворы</h2><p>Цена за 1${NBSP}м³, заказ от ${minVolText(ctx)}. Доставку считаем по адресу объекта.</p><p class="pw__date">Цены актуальны на <time datetime="${ctx.priceDateIso}">${ctx.priceDateRu}</time></p></div>
<a class="link-arrow" href="/price/">Весь прайс${icon(ctx, 'arrow')}</a></div>
<div class="pw__body" data-tabs>
<ul class="pw__tabs">${join(tabCats.map((c, i) => h`<li><a class="pw__tab" href="/catalog/${c.slug}/" data-tab="pw-${c.slug}"${i === 0 ? raw(' aria-selected="true"') : ''}>${c.menu}<small>от ${fmtNum(priceOf(c.rows))}</small></a></li>`))}</ul>
<div>${join(tabCats.map((c, i) => pwPanel(ctx, c, i)))}</div>
</div>
<div class="pw__foot"><p>Арматура${ctx.rental ? ' и аренда автобетононасоса' : ''} — в полном прайсе. Цену вместе с доставкой назовём по адресу.</p>
<div class="pw__btns"><a class="btn btn--primary" href="${telHref(ctx)}">${icon(ctx, 'phone')}Уточнить цену</a><a class="btn btn--ghost" href="/price/">Весь прайс-лист</a></div></div>
</div>
</div></section>`;

  // ---------- что можно заказать ----------
  const big = productItems(ctx, main0.group).find((x) => x.slug === main0.slug);
  const bigPhoto = pagePhoto(ctx, 'price') ?? big.photo;
  const others = [
    ...productItems(ctx, 'Растворы').slice(0, 1).map((x) => ({ ...x, from: Math.min(...productItems(ctx, 'Растворы').map((y) => y.from)), name: 'Растворы и ЦПС', meta: 'Кладочные и монтажные растворы, цементно-песчаные смеси для стяжки и подливки.' })),
    ...productItems(ctx, 'Металл и техника').filter((x) => x.slug === 'arenda-abn').map((x) => ({ ...x, meta: `Насосы с вылетом стрелы ${reachSpan(ctx)}: бетон уходит на этаж или в дальний угол участка. Оплата по часам.` })),
    ...productItems(ctx, 'Металл и техника').filter((x) => x.slug === 'armatura').map((x) => ({ ...x, meta: `${x.meta}. Классы А500С и А240, цена за тонну.` }))
  ];
  const offer = h`<section class="section" id="produkciya"><div class="container">
${sh('Продукция', 'Что можно заказать')}
<div class="offer">
<a class="offer__big" href="${big.url}">${img(ctx, bigPhoto, { sizes: '(max-width:980px) 100vw, 56vw' })}<div class="offer__txt"><span class="offer__ico">${icon(ctx, 'layers')}</span><h3>${big.name}</h3><p>Марки ${marksRange(ctx)}: от подбетонки до несущих плит и колонн. Подвижность, морозостойкость и водонепроницаемость подбираем под конструкцию.</p><div class="offer__price"><b>от ${fmtNum(big.from)}${NBSP}₽<small>/м³</small></b><span>Подобрать марку${icon(ctx, 'arrow')}</span></div></div></a>
<div class="offer__list">${join(others.map((x) => h`<article class="ocard"><span class="ocard__ico">${icon(ctx, CAT_ICON[x.slug] ?? 'box')}</span><h3><a href="${x.url}">${x.name}</a></h3><p>${x.meta}</p><p class="ocard__from">от ${fmtNum(x.from)}${NBSP}₽/${x.unit}</p></article>`))}</div>
</div>
</div></section>`;

  // ---------- колонки со ссылками ----------
  const concreteCats = ctx.categories.filter((c) => CONCRETE_KINDS.has(c.kind));
  const marks = ctx.markPages.map((m) => ({ m, rows: main0.rows.filter((x) => x.mark === m) })).filter((x) => x.rows.length);
  const mortars = productItems(ctx, 'Растворы'), metal = productItems(ctx, 'Металл и техника');
  const ul = (links) => h`<ul>${join(links.map(([name, url, from, unit]) => h`<li><a href="${url}">${name}<small>от ${fmtNum(from)}${NBSP}₽/${unit}</small></a></li>`))}</ul>`;
  const col = (title, links, extra = '') => h`<div class="groups__col"><h3>${title}</h3>${ul(links)}${extra}</div>`;
  const groups = h`<section class="section"><div class="container">
${sh('Разделы', 'Откройте нужный раздел', 'В каждом разделе есть подбор характеристик: выберите марку и параметры, цена пересчитается на ваш объём.', { row: true })}
<div class="groups">
${col('Бетон по видам', concreteCats.map((c) => [c.menu, `/catalog/${c.slug}/`, priceOf(c.rows), 'м³']))}
${col(marks.length ? 'Бетон по маркам' : 'Растворы', marks.length ? marks.map(({ m, rows }) => [`Бетон ${m} (${rows[0].cls})`, `/catalog/${main0.slug}/${rows[0].markSlug}/`, priceOf(rows), 'м³']) : mortars.map((x) => [x.name, x.url, x.from, x.unit]), marks.length && mortars.length ? h`<h3 class="groups__sub">Растворы</h3>${ul(mortars.map((x) => [x.name, x.url, x.from, x.unit]))}` : '')}
${col('Металл и техника', metal.map((x) => [x.name, x.url, x.from, x.unit]), h`<div class="groups__cta"><p>Не нашли состав или марку? Назовите конструкцию и объём, подберём по телефону.</p><a class="telink" href="${telHref(ctx)}">${icon(ctx, 'phone')}${site.phone.display}</a></div>`)}
</div>
</div></section>`;

  // ---------- доставка ----------
  const delivPhoto = ctx.photos.find((p) => p.file === 'mikser-v-nasos.jpg') ?? ctx.photos.find((p) => p.role === 'fleet');
  const delivery = h`<section class="section"><div class="container split split--media">
${media(ctx, delivPhoto.file, { ico: 'truck' })}
<div>
<p class="eyebrow">Доставка и подача</p>
<h2>Миксер до объекта, насос до места заливки</h2>
<p class="lead">Бетон отгружается с завода ${site.plant.locality_in} и приезжает автобетоносмесителем. ${deliveryLine(ctx)}</p>
<div class="chips"><span class="chip">${site.plant.locality}</span>${join(ctx.cities.map(cityChip))}<span class="chip chip--dashed">Другой адрес: по запросу</span></div>
<div class="actions actions--flush"><a class="btn btn--primary" href="/dostavka/">Условия доставки</a>${ctx.rental ? h`<a class="link-arrow" href="/catalog/arenda-abn/">Тарифы на насосы${icon(ctx, 'arrow')}</a>` : ''}</div>
</div>
</div></section>`;

  // ---------- завод ----------
  const plantPhoto = ctx.photos.find((p) => p.file === 'uzel-territoriya.jpg') ?? ctx.photos.find((p) => p.role === 'plant');
  const plant = h`<section class="section"><div class="container split split--wide">
<div>
<p class="eyebrow">Производство</p>
<h2>Свой бетонно-растворный узел</h2>
<p class="lead">Бетон и растворы готовят на узле ${site.plant.locality_in}, ${site.plant.street}. Отсюда же отгружают миксеры и отпускают самовывоз.</p>
<div class="feat feat--2">
<div class="feat__it">${icon(ctx, 'factory')}<h3>Отгрузка с узла</h3><p>Заказ от ${minVolText(ctx)}. Забрать можно самому${site.card?.pickup ? '' : ' по согласованию'} или заказать миксер на объект.</p></div>
<div class="feat__it">${icon(ctx, 'doc')}<h3>Документы на партию</h3><p>С каждой машиной: ${site.documents.join(' и ')}.</p></div>
</div>
<div class="actions"><a class="btn btn--primary" href="/about/">О заводе</a><span class="actions__note">${site.plant.address}</span></div>
</div>
${media(ctx, plantPhoto.file, { ico: 'factory' })}
</div></section>`;

  // ---------- полезно знать ----------
  const pmdCat = ctx.categories.find((c) => c.kind === 'pmd');
  const art = (slug) => ctx.articles?.find((a) => a.slug === slug);
  const tip = (ico, t, p, link) => h`<div class="feat__it">${icon(ctx, ico)}<h3>${t}</h3><p>${p}</p>${link ? h`<p><a class="link-arrow" href="${link[1]}">${link[0]}${icon(ctx, 'arrow')}</a></p>` : ''}</div>`;
  const tips = h`<section class="section section--band"><div class="container">
${sh('Перед заказом', 'Полезно знать до заказа')}
<div class="feat">
${tip('ruler', 'Сколько кубов заказать', 'Объём считают по размерам опалубки и добавляют небольшой запас на неровности основания. Если не хватит, вторая машина — это ожидание и шов в конструкции.', art('skolko-kubov-betona') ? ['Как посчитать объём', art('skolko-kubov-betona').url] : null)}
${pmdCat ? tip('snow', 'Заливка в холод', `Когда среднесуточная температура ниже +5${NBSP}°C, берут бетон с противоморозной добавкой. В прайсе есть смеси с ПМД до −${Math.max(...pmdCat.rows.map((x) => Math.abs(x.pmd)))}${NBSP}°C.`, ['Бетон с ПМД', `/catalog/${pmdCat.slug}/`]) : ''}
${tip('truck', 'Подъезд к месту выгрузки', `Миксеру нужен проезд и твёрдая площадка рядом с опалубкой.${ctx.rental ? ` Если подъехать нельзя, бетон подают насосом со стрелой до ${maxReach(ctx)}${NBSP}м.` : ''}`, art('mikser-ili-nasos') ? ['Миксер или насос', art('mikser-ili-nasos').url] : null)}
</div>
</div></section>`;

  // ---------- порядок заказа ----------
  const stepPhoto = ctx.photos.find((p) => p.file === 'abn-opalubka.jpg') ?? ctx.photos.find((p) => p.role === 'fleet');
  const steps = [
    ['Заявка', `Позвоните ${site.phone.display} или оставьте заявку: марка, объём, адрес и удобное время.`],
    ['Расчёт', 'Уточняем подвижность и способ подачи, называем стоимость бетона с доставкой.'],
    ['Отгрузка', `Миксер загружается на узле ${site.plant.locality_in}. Отгружаем круглосуточно.`],
    ['Подача', ctx.rental ? 'Выгрузка по лотку прямо в опалубку или через автобетононасос.' : 'Выгрузка по лотку прямо в опалубку.'],
    ['Документы', `Вместе с бетоном вы получаете ${site.documents.join(' и ')}.`]
  ];
  const process = h`<section class="section"><div class="container split split--wide">
<div>
${sh('Как заказать', 'Из чего состоит заказ')}
<ol class="process">${join(steps.map(([b, s]) => h`<li><div><b>${b}</b><span>${s}</span></div></li>`))}</ol>
</div>
${media(ctx, stepPhoto.file, { cls: 'media--tall', ico: 'truck' })}
</div></section>`;

  // ---------- фото, рейтинг, отзывы ----------
  const photos = h`<section class="section section--band"><div class="container">
${sh('Фото', 'Завод и техника на объектах', 'Снимки из карточки завода на Яндекс Картах: узел, миксеры, насосы и залитые конструкции.', { row: true })}
${photoGrid(ctx, { skip: [heroPhoto.file, plantPhoto.file, delivPhoto.file, stepPhoto.file] })}
${ratingPanel(ctx)}
${reviewsGrid(ctx)}
</div></section>`;

  const homeArts = ['kakoj-beton-dlya-fundamenta', 'skolko-kubov-betona', 'beton-zimoj-pmd'].map((x) => ctx.articles?.find((y) => y.slug === x)).filter(Boolean);
  const articles = articleList(ctx, { limit: 3, list: homeArts.length === 3 ? homeArts : null, title: 'Что проверить перед заказом бетона', more: true, eyebrow: 'Статьи' });

  const jsonld = [{ ...baseGraph(ctx), '@graph': [...baseGraph(ctx)['@graph'], { '@type': 'WebSite', '@id': `${ctx.origin}/#website`, url: `${ctx.origin}/`, name: site.brand, inLanguage: 'ru-RU', publisher: { '@id': `${ctx.origin}/#organization` } }] }, faqLd(faqItems)];

  const main = h`${hero}${stats}${priceWidget}${offer}${groups}${delivery}${plant}${tips}${process}${photos}${articles}${faq(ctx, faqItems, { id: 'faq' })}${ctaBand(ctx, { source: 'home-bottom' })}`;
  return { url: '/', title, description, h1, main, jsonld };
}
