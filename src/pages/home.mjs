import { h, raw, join, fmtNum, NBSP, truncate } from '../lib/util.mjs';
import { icon, img, telHref, messengers, HOURS_TEXT, HOURS_FULL, leadForm, minVolText, vatText, priceNote, concreteTable, fromPriceOf, faq } from '../lib/layout.mjs';
import { CONCRETE_KINDS } from '../lib/categories.mjs';
import { baseGraph, faqLd } from '../lib/seo.mjs';
import { T, ctaBand, gallery, cityCards, volumeCalc, marksRange, yearsOnMarket, yearsText, deliveryLine } from './common.mjs';

export function homeFaq(ctx) {
  const { site } = ctx;
  const items = [
    ['Какой минимальный объём заказа?', `Минимальный заказ — ${minVolText(ctx)}. Объём и марку мы уточняем при расчёте.`],
    ['Вы работаете ночью и в выходные?', `Да. ${HOURS_FULL}.`],
    [`Откуда вы возите бетон?`, `С нашего завода ${site.plant.locality_in}: ${site.plant.address}. Бетон привозят автобетоносмесители.`],
    ['Как узнать стоимость с доставкой?', `${site.delivery.tariff_note ?? 'Стоимость доставки зависит от расстояния до объекта и объёма заказа.'} Позвоните ${site.phone.display} или оставьте заявку: назовите марку, объём и адрес.`],
    ['Цены указаны с НДС?', `Цены в прайс-листе: ${vatText(ctx)}. ${deliveryLine(ctx)}`],
    ['Какие документы выдаёте на бетон?', `К партии прилагаются: ${site.documents.join(', ')}.`]
  ];
  if (site.lab?.has_control) {
    items.push(['Как вы контролируете качество?', 'Перед отгрузкой контролируем состав и подвижность смеси. Образцы испытываются в установленном возрасте. Каждая партия идёт с документами о качестве.']);
  }
  return T(ctx, 'faq.home', items);
}

export function home(ctx) {
  const { site } = ctx;
  const minV = fmtNum(site.min_volume_m3);
  const h1 = T(ctx, 'home.h1', site.hero_h1 ?? `Бетон от производителя ${site.plant.locality_in}: доставка от ${minV}${NBSP}м³, 24/7`);
  const title = `Бетон ${site.plant.locality_in} от производителя — от ${fmtNum(ctx.fromPrice)}${NBSP}₽/м³, 24/7 | ${site.brand}`;
  const description = `Бетон с завода ${site.plant.locality_in}: цены от ${fmtNum(ctx.fromPrice)}${NBSP}₽/м³, доставка от ${minV}${NBSP}м³ по ${site.plant.district_dat}. Работаем 24/7. Расчёт по телефону ${site.phone.display}.`;
  const concrete = ctx.categories.filter((c) => CONCRETE_KINDS.has(c.kind));
  const heroPhoto = ctx.photos.find((p) => p.role === 'hero');
  const mess = messengers(ctx)[0];
  const faqItems = homeFaq(ctx);
  const years = yearsOnMarket(ctx);

  const hero = h`<section class="hero"><div class="hero__bg">${img(ctx, heroPhoto.file, { sizes: '100vw', eager: true })}</div>
<div class="container hero__in">
<div>
<h1>${h1}</h1>
<p class="hero__lead">${T(ctx, 'home.lead', `Завод ${site.plant.locality_in}, ${site.plant.address}. Готовим бетон марок ${marksRange(ctx)} и привозим на объект автобетоносмесителями.`)}</p>
<div class="hero__price"><small>Бетон от</small><strong>${fmtNum(ctx.fromPrice)}${NBSP}₽/м³</strong><small>${vatText(ctx)}</small></div>
<ul class="hero__facts">
<li>${icon(ctx, 'factory')}<span><b>Производство</b>Завод ${site.plant.locality_in}</span></li>
<li>${icon(ctx, 'truck')}<span><b>Доставка</b>От ${minV}${NBSP}м³ по ${site.plant.district_dat}</span></li>
<li>${icon(ctx, 'clock')}<span><b>Режим</b>${HOURS_TEXT}: заявки, отгрузка, доставка</span></li>
<li>${icon(ctx, 'file')}<span><b>Документы</b>Паспорт качества на партию</span></li>
</ul>
<div class="hero__ctas"><a class="btn btn--primary" href="${telHref(ctx)}">${icon(ctx, 'phone')}${site.phone.display}</a>${mess ? h`<a class="btn btn--light" href="${mess.url}" rel="noopener" target="_blank">${icon(ctx, mess.icon)}Написать в ${mess.label}</a>` : ''}</div>
</div>
${leadForm(ctx, { title: 'Получить расчёт', source: 'home-hero' })}
</div></section>`;

  const priceBlock = h`<section class="section section--sand" id="price"><div class="container">
<div class="section__head"><span class="eyebrow">Прайс-лист</span><h2>Цены на бетон ${site.plant.locality_in}</h2><p>Разверните нужный раздел. Цена указана за 1${NBSP}м³, стоимость доставки считаем по адресу.</p></div>
${priceNote(ctx)}
<div class="acc">${join(concrete.map((c, i) => h`<details${i === 0 ? raw(' open') : ''}>
<summary>${c.menu}<span class="from">от <b>${fmtNum(fromPriceOf(c.rows))}${NBSP}₽/м³</b></span>${icon(ctx, 'chev', 'chev')}</summary>
<div class="acc__body">${concreteTable(ctx, c)}<p style="margin:14px 0 0"><a href="/catalog/${c.slug}/">${c.menu}: описание, применение марок →</a></p></div>
</details>`))}</div>
<p style="margin-top:20px"><a class="btn btn--ghost" href="/price/">Полный прайс-лист</a></p>
</div></section>`;

  const stats = h`<section class="section"><div class="container">
<div class="stats">
<div class="stat"><div class="fact">с ${site.founded_year} года</div><div class="stat__t">производство бетона, ${yearsText(years)}</div></div>
<div class="stat"><div class="fact">24/7</div><div class="stat__t">заявки, производство, отгрузка и доставка</div></div>
<div class="stat"><div class="fact">от ${minV}${NBSP}м³</div><div class="stat__t">минимальный заказ с доставкой миксером</div></div>
<div class="stat"><div class="fact">${marksRange(ctx)}</div><div class="stat__t">марки бетона в прайс-листе</div></div>
</div>
<div class="grid grid--4" style="margin-top:34px">
<div class="feature"><span class="feature__ic">${icon(ctx, 'factory')}</span><h3>Свой завод</h3><p>Бетон готовим ${site.plant.locality_in}, по адресу ${site.plant.address}. Завод отмечен на Яндекс Картах.</p></div>
<div class="feature"><span class="feature__ic">${icon(ctx, 'truck')}</span><h3>Доставка миксерами</h3><p>${site.delivery.dispatch_note ?? 'Время подачи зависит от расстояния до объекта и загрузки завода.'}</p></div>
${site.lab?.has_control ? h`<div class="feature"><span class="feature__ic">${icon(ctx, 'flask')}</span><h3>Контроль качества</h3><p>Перед отгрузкой контролируем состав и подвижность. Образцы испытываются в установленном возрасте.</p></div>` : ''}
<div class="feature"><span class="feature__ic">${icon(ctx, 'file')}</span><h3>Документы</h3><p>К партии прилагаются: ${site.documents.join(', ')}.</p></div>
</div>
</div></section>`;

  const delivery = h`<section class="section section--blue"><div class="container">
<div class="section__head"><span class="eyebrow">Доставка</span><h2>Доставка бетона по ${site.plant.district_dat}</h2><p>${deliveryLine(ctx)} ${site.delivery.tariff_note ?? ''}</p></div>
${ctx.cities.length ? cityCards(ctx) : ''}
<p style="margin-top:22px"><a class="btn btn--blue" href="/dostavka/">Условия и зоны доставки</a></p>
</div></section>`;

  const calc = h`<section class="section"><div class="container"><div class="split">
<div>
<span class="eyebrow">Помощник</span>
<h2>Сколько бетона нужно</h2>
<p>Введите размеры плиты, ленты или стяжки в метрах. Покажем объём в кубометрах с запасом 5% на потери. Конструкции сложной формы лучше уточнить по проекту.</p>
${volumeCalc(ctx)}
</div>
<div class="card"><h3>Заказ в четыре шага</h3>
<ol class="steps" style="grid-template-columns:1fr;gap:12px">
<li><b>Звонок или заявка</b><span>Назовите объём, марку и адрес.</span></li>
<li><b>Расчёт</b><span>Согласуем марку, подвижность, стоимость и время подачи.</span></li>
<li><b>Отгрузка</b><span>Миксер выезжает с завода ${site.plant.locality_in}.</span></li>
<li><b>Приёмка</b><span>На объекте получаете бетон и документы на партию.</span></li>
</ol></div>
</div></div></section>`;

  const reviews = site.reviews?.items?.length ? h`<section class="section section--sand"><div class="container">
<div class="section__head"><h2>Отзывы клиентов</h2><p><a href="${site.plant.yandex_url}" rel="noopener" target="_blank">Все отзывы на Яндекс Картах</a></p></div>
<div class="grid grid--3">${join(site.reviews.items.map((r) => h`<blockquote class="card review" style="margin:0"><p>${r.text}</p><cite>${r.author}${r.date ? h`, <time datetime="${r.date}">${r.date}</time>` : ''}</cite></blockquote>`))}</div>
</div></section>` : '';

  const jsonld = [{ ...baseGraph(ctx), '@graph': [...baseGraph(ctx)['@graph'], { '@type': 'WebSite', '@id': `${ctx.origin}/#website`, url: `${ctx.origin}/`, name: site.brand, inLanguage: 'ru-RU', publisher: { '@id': `${ctx.origin}/#organization` } }] }, faqLd(faqItems)];

  const main = h`${hero}${priceBlock}${stats}${delivery}${gallery(ctx, ['plant', 'fleet', 'lab', 'object'], { title: 'Завод и техника', sub: `Фото завода ${site.plant.locality_in} и автобетоносмесителей.` })}${calc}${reviews}${faq(ctx, faqItems, { id: 'faq' })}${ctaBand(ctx, { source: 'home-bottom' })}`;
  return { url: '/', title, description, h1, main, jsonld };
}
