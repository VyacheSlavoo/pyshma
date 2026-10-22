import { h, raw, join, fmtNum, NBSP, plural } from '../lib/util.mjs';
import { icon, img, telHref, messengers, HOURS_TEXT, HOURS_FULL, leadStrip, minVolText, priceNote, concreteTable, fromPriceOf, faq } from '../lib/layout.mjs';
import { CONCRETE_KINDS, GROUP_ORDER } from '../lib/categories.mjs';
import { baseGraph, faqLd } from '../lib/seo.mjs';
import { T, ctaBand, gallery, cityCards, volumeCalc, marksRange, deliveryLine, deliveryFaq, pickupLine, paymentLine, reachSpan } from './common.mjs';

export function homeFaq(ctx) {
  const { site } = ctx;
  const items = [
    ['Какой минимальный объём заказа?', `Минимальный заказ — ${minVolText(ctx)}. Объём и марку мы уточняем при расчёте.`],
    ['Вы работаете ночью и в выходные?', `Да. ${HOURS_FULL}.`],
    ['Откуда вы возите бетон?', `С нашего завода ${site.plant.locality_in}: ${site.plant.address}. Бетон привозят автобетоносмесители.`],
    ['Как узнать стоимость с доставкой?', `${site.delivery.tariff_note ?? deliveryLine(ctx)} Позвоните ${site.phone.display} или оставьте заявку: назовите марку, объём и адрес.`],
    deliveryFaq(ctx),
    ['Какие документы выдаёте на бетон?', `К партии прилагаются: ${site.documents.join(', ')}.`]
  ].filter(Boolean);
  const pick = pickupLine(ctx), pay = paymentLine(ctx);
  if (pick) items.push(['Можно ли забрать бетон самовывозом?', pick]);
  if (pay) items.push(['Как оплатить заказ?', pay]);
  if (site.lab?.has_control) {
    items.push(['Как вы контролируете качество?', 'Перед отгрузкой контролируем состав и подвижность смеси. Образцы испытываются в установленном возрасте. Каждая партия идёт с документами о качестве.']);
  }
  return T(ctx, 'faq.home', items);
}

export function home(ctx) {
  const { site } = ctx;
  const minV = fmtNum(site.min_volume_m3);
  const h1 = T(ctx, 'home.h1', site.hero_h1 ?? `Бетон от производителя ${site.plant.locality_in}: доставка от ${minV}${NBSP}м³, 24/7`);
  const title = `Бетон ${site.plant.locality_in} от производителя, 24/7 | ${site.brand}`;
  const description = `Бетон с завода ${site.plant.locality_in}: цены от ${fmtNum(ctx.fromPrice)}${NBSP}₽/м³, доставка от ${minV}${NBSP}м³ по ${site.plant.district_dat}. Работаем 24/7. Расчёт по телефону ${site.phone.display}.`;
  const concrete = ctx.categories.filter((c) => CONCRETE_KINDS.has(c.kind));
  const heroPhoto = ctx.photos.find((p) => p.role === 'hero');
  const mess = messengers(ctx)[0];
  const faqItems = homeFaq(ctx);
  const doc = site.documents[0] ? `${site.documents[0][0].toUpperCase()}${site.documents[0].slice(1)}` : '';
  const pick = pickupLine(ctx);
  const pay = paymentLine(ctx);
  const termsPhoto = ctx.photos.find((p) => p.file === 'mikser-v-nasos.jpg') ?? ctx.photos.find((p) => p.role === 'fleet');

  const hero = h`<section class="hero">
<div class="hero__txt">
<h1>${h1}</h1>
<p class="hero__lead">${T(ctx, 'home.lead', `Завод: ${site.plant.address}. Бетон ${marksRange(ctx)}, растворы, арматура, аренда автобетононасосов. Доставляем миксерами${site.card?.pickup ? ', можно забрать самовывозом' : ''}.`)}</p>
<div class="price-plate"><span>Бетон от</span><b>${fmtNum(ctx.fromPrice)}${NBSP}₽/м³</b></div>
<div class="hero__cta"><a class="btn btn--primary" href="${telHref(ctx)}">${icon(ctx, 'phone')}${site.phone.display}</a>${mess ? h`<a class="btn btn--light" href="${mess.url}" rel="noopener" target="_blank">Написать в ${mess.label}</a>` : ''}<button type="button" class="btn btn--light" data-open-lead hidden>Получить расчёт</button></div>
</div>
<figure class="hero__img">${img(ctx, heroPhoto.file, { sizes: '(max-width:1100px) 100vw, 42vw', eager: true })}<figcaption>${heroPhoto.caption ?? 'Завод'}: ${site.plant.address}</figcaption></figure>
</section>
<ul class="facts">
<li><span>Производство</span><b>Завод ${site.plant.locality_in}</b></li>
<li><span>Доставка</span><b>От ${minV}${NBSP}м³ по ${site.plant.district_dat}</b></li>
<li><span>Режим работы</span><b>${HOURS_TEXT}: заявки, отгрузка, доставка</b></li>
<li><span>Документы на партию</span><b>${doc}</b></li>
</ul>
${leadStrip(ctx, { source: 'home-strip' })}`;

  const priceBlock = h`<section class="section" id="price"><div class="container">
<div class="section__head"><h2>Цены на бетон ${site.plant.locality_in}</h2><p>Цена указана за 1${NBSP}м³. Стоимость доставки считаем по адресу объекта.</p></div>
${priceNote(ctx)}
<div class="acc">${join(concrete.map((c, i) => h`<details${i === 0 ? raw(' open') : ''}>
<summary><span>${c.menu}</span><span class="from">от <b>${fmtNum(fromPriceOf(c.rows))}${NBSP}₽/м³</b></span>${icon(ctx, 'chev', 'chev')}</summary>
<div class="acc__body">${concreteTable(ctx, c, c.rows, { linkMarks: c.slug === ctx.mainConcrete.slug })}<p style="margin:16px 0 0"><a href="/catalog/${c.slug}/">${c.menu}: описание и применение марок</a></p></div>
</details>`))}</div>
<p style="margin-top:28px"><a class="btn btn--ghost" href="/price/">Полный прайс-лист: растворы, арматура, аренда</a></p>
</div></section>`;

  const groups = GROUP_ORDER.map((g) => ({
    title: g,
    links: [...ctx.categories.filter((c) => c.group === g).map((c) => ({ name: c.menu, url: `/catalog/${c.slug}/`, n: c.rows.length })), ...(ctx.rental && ctx.rental.group === g ? [{ name: 'Аренда автобетононасоса', url: '/catalog/arenda-abn/', n: ctx.rental.units.length + ctx.rental.extras.length }] : [])]
  })).filter((g) => g.links.length);
  const assortment = h`<section class="section section--sand"><div class="container">
<div class="section__head"><h2>Что можно заказать</h2><p>${ctx.positions} ${plural(ctx.positions, 'позиция', 'позиции', 'позиций')} в прайс-листе: бетон разных видов, растворы, арматура и техника.</p></div>
<div class="grid grid--3">${join(groups.map((g) => h`<div class="dirgroup"><h3>${g.title}</h3><ul class="dirs">${join(g.links.map((l) => h`<li><a href="${l.url}"><b>${l.name}</b><span>${l.n} ${plural(l.n, 'позиция', 'позиции', 'позиций')}</span></a></li>`))}</ul></div>`))}</div>
</div></section>`;

  const terms = h`<section class="section"><div class="container"><div class="split">
<div>
<div class="section__head"><h2>Условия заказа</h2></div>
<dl class="kv">
<dt>Минимальный заказ</dt><dd>${minVolText(ctx)}</dd>
<dt>Режим работы</dt><dd>${HOURS_TEXT}: приём заявок, производство, отгрузка, доставка</dd>
<dt>Доставка</dt><dd>автобетоносмесителями; стоимость считаем по адресу</dd>
${pick ? h`<dt>Самовывоз</dt><dd>с завода, ${site.plant.address}</dd>` : ''}
${pay ? h`<dt>Оплата</dt><dd>${pay.replace('Способы оплаты: ', '').replace(/\.$/, '')}</dd>` : ''}
<dt>Документы</dt><dd>${site.documents.join(', ')}</dd>
${ctx.rental ? h`<dt>Подача насосом</dt><dd>автобетононасосы с вылетом стрелы ${reachSpan(ctx)}</dd>` : ''}
</dl>
</div>
${termsPhoto ? h`<figure style="margin:0">${img(ctx, termsPhoto.file, { sizes: '(max-width:980px) 100vw, 40vw' })}</figure>` : ''}
</div></div></section>`;

  const delivery = h`<section class="section section--sand"><div class="container">
<div class="section__head"><h2>Доставка бетона по ${site.plant.district_dat}</h2><p>${deliveryLine(ctx)}</p></div>
${cityCards(ctx, ctx.cities, { origin: true })}
<p style="margin-top:28px"><a class="btn btn--blue" href="/dostavka/">Условия и зоны доставки</a></p>
</div></section>`;

  const calc = h`<section class="section"><div class="container"><div class="split">
<div>
<div class="section__head"><h2>Калькулятор объёма</h2><p>Введите размеры плиты, ленты или стяжки в метрах. Покажем объём в кубометрах с запасом 5% на потери. Сложную форму лучше уточнить по проекту.</p></div>
${volumeCalc(ctx)}
</div>
<div>
<div class="section__head"><h2>Как заказать</h2></div>
<ol class="steps steps--plain">
<li><b>Звонок или заявка</b><span>Назовите объём, марку и адрес.</span></li>
<li><b>Расчёт</b><span>Согласуем марку, подвижность, стоимость и время подачи.</span></li>
<li><b>Отгрузка</b><span>Миксер выезжает с завода ${site.plant.locality_in}.</span></li>
<li><b>Приёмка</b><span>На объекте вы получаете бетон и документы на партию.</span></li>
</ol>
</div>
</div></div></section>`;

  const reviews = site.reviews?.items?.length ? h`<section class="section section--sand"><div class="container">
<div class="section__head"><h2>Отзывы клиентов</h2><p>${site.card?.rating ? `Оценка ${String(site.card.rating.value).replace('.', ',')} на Яндекс Картах. ` : ''}<a href="${site.plant.yandex_url}" rel="noopener" target="_blank">Все отзывы на Яндекс Картах</a></p></div>
<div class="reviews">${join(site.reviews.items.map((r) => h`<blockquote class="review"><p>${r.text}</p><cite><b>${r.author}</b>${r.date ? h`, <time datetime="${r.date}">${r.date.split('-').reverse().join('.')}</time>` : ''}</cite></blockquote>`))}</div>
</div></section>` : '';

  const jsonld = [{ ...baseGraph(ctx), '@graph': [...baseGraph(ctx)['@graph'], { '@type': 'WebSite', '@id': `${ctx.origin}/#website`, url: `${ctx.origin}/`, name: site.brand, inLanguage: 'ru-RU', publisher: { '@id': `${ctx.origin}/#organization` } }] }, faqLd(faqItems)];

  const main = h`${hero}${priceBlock}${assortment}${terms}${delivery}${gallery(ctx, ['hero', 'plant', 'fleet', 'lab', 'object'], { title: 'Завод и техника на объектах', max: 8, more: true })}${calc}${reviews}${faq(ctx, faqItems, { id: 'faq' })}${ctaBand(ctx, { source: 'home-bottom' })}`;
  return { url: '/', title, description, h1, main, jsonld };
}
