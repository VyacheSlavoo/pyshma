import { h, raw, join, fmtNum, NBSP, plural } from '../lib/util.mjs';
import { icon, img, telHref, HOURS_TEXT, HOURS_FULL, leadStrip, minVolText, priceNote, fromPriceOf, faq } from '../lib/layout.mjs';
import { baseGraph, faqLd } from '../lib/seo.mjs';
import { T, ctaBand, gallery, cityCards, volumeCalc, marksRange, deliveryLine, deliveryFaq, pickupLine, paymentLine, reachSpan, productGroups, yandexBlock, articleList } from './common.mjs';

export function homeFaq(ctx) {
  const { site } = ctx;
  const items = [
    ['Какой минимальный объём заказа?', `Минимальный заказ — ${minVolText(ctx)}. Марку и подвижность уточняем при расчёте.`],
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
  const heroPhoto = ctx.photos.find((p) => p.role === 'hero');
  const faqItems = homeFaq(ctx);
  const pick = pickupLine(ctx);
  const pay = paymentLine(ctx);
  const termsPhoto = ctx.photos.find((p) => p.file === 'mikser-v-nasos.jpg') ?? ctx.photos.find((p) => p.role === 'fleet');
  const popular = ctx.markPages.map((m) => ctx.mainConcrete.rows.find((r) => r.mark === m)).filter(Boolean);

  const hero = h`<section class="herob"><div class="container hero">
<div class="hero__txt">
<h1>${h1}</h1>
<p class="hero__lead">${T(ctx, 'home.lead', `Завод: ${site.plant.address}. Бетон ${marksRange(ctx)}, растворы, арматура и аренда автобетононасосов. Привозим миксерами${site.card?.pickup ? ', можно забрать самовывозом' : ''}.`)}</p>
<p class="hero__price">Бетон от <b>${fmtNum(ctx.fromPrice)}${NBSP}₽</b> за м³<small>Цены на ${ctx.priceDateRu}. Доставка считается по адресу.</small></p>
<div class="hero__cta"><a class="btn btn--primary" href="${telHref(ctx)}">${icon(ctx, 'phone')}${site.phone.display}</a><button type="button" class="btn btn--ghost" data-open-lead hidden>Получить расчёт</button></div>
</div>
<figure class="hero__img">${img(ctx, heroPhoto.file, { sizes: '(max-width:1100px) 100vw, 42vw', eager: true })}<figcaption>${heroPhoto.caption ?? 'Завод'}: ${site.plant.address}</figcaption></figure>
</div></section>
${leadStrip(ctx, { source: 'home-strip' })}`;

  const priceBlock = h`<section class="section" id="price"><div class="container">
<div class="section__head"><h2>Цены на бетон и растворы ${site.plant.locality_in}</h2><p>Откройте карточку нужной продукции: там выбираются характеристики и считается стоимость на ваш объём.</p></div>
${priceNote(ctx)}
${productGroups(ctx)}
${popular.length ? h`<div class="marklinks"><span>Чаще всего заказывают:</span>${join(popular.map((r) => h`<a class="chip" href="/catalog/${ctx.mainConcrete.slug}/${r.markSlug}/">Бетон ${r.mark} от ${fmtNum(fromPriceOf(ctx.mainConcrete.rows.filter((x) => x.mark === r.mark)))}${NBSP}₽</a>`))}</div>` : ''}
<p style="margin-top:24px"><a class="btn btn--ghost" href="/price/">Прайс-лист целиком</a></p>
</div></section>`;

  const terms = h`<section class="section section--sand"><div class="container"><div class="split">
<div>
<div class="section__head"><h2>Заказ, оплата и документы</h2></div>
<dl class="kv">
<dt>Минимальный заказ</dt><dd>${minVolText(ctx)}</dd>
<dt>Доставка</dt><dd>автобетоносмесителями; стоимость считаем по адресу</dd>
${pick ? h`<dt>Самовывоз</dt><dd>с завода, ${site.plant.address}</dd>` : ''}
${pay ? h`<dt>Оплата</dt><dd>${pay.replace('Способы оплаты: ', '').replace(/\.$/, '')}</dd>` : ''}
<dt>Документы</dt><dd>${site.documents.join(', ')}</dd>
${ctx.rental ? h`<dt>Подача насосом</dt><dd>автобетононасосы с вылетом стрелы ${reachSpan(ctx)}</dd>` : ''}
</dl>
</div>
${termsPhoto ? h`<figure style="margin:0">${img(ctx, termsPhoto.file, { sizes: '(max-width:980px) 100vw, 40vw' })}</figure>` : ''}
</div></div></section>`;

  const delivery = h`<section class="section"><div class="container">
<div class="section__head"><h2>Доставка бетона по ${site.plant.district_dat}</h2><p>${deliveryLine(ctx)}</p></div>
${cityCards(ctx, ctx.cities, { origin: true })}
<p style="margin-top:28px"><a class="btn btn--ghost" href="/dostavka/">Условия и зоны доставки</a></p>
</div></section>`;

  const calc = h`<section class="section"><div class="container"><div class="split">
<div>
<div class="section__head"><h2>Сколько кубов нужно</h2><p>Введите размеры плиты, ленты или стяжки в метрах. Покажем объём в кубометрах с запасом 5% на потери. Сложную форму лучше считать по проекту.</p></div>
${volumeCalc(ctx)}
</div>
<div>
<div class="section__head"><h2>Как заказать</h2></div>
<ol class="steps">
<li><b>Звонок или заявка</b><span>Назовите объём, марку и адрес.</span></li>
<li><b>Расчёт</b><span>Согласуем марку, подвижность, стоимость и время подачи.</span></li>
<li><b>Отгрузка</b><span>Миксер выезжает с завода ${site.plant.locality_in}.</span></li>
<li><b>Приёмка</b><span>На объекте вы получаете бетон и документы на партию.</span></li>
</ol>
</div>
</div></div></section>`;

  const reviews = site.reviews?.items?.length ? h`<section class="section section--sand"><div class="container">
<div class="section__head"><h2>Отзывы клиентов</h2></div>
${yandexBlock(ctx)}
<div class="reviews">${join(site.reviews.items.map((r) => h`<blockquote class="review"><p>${r.text}</p><cite><b>${r.author}</b>${r.date ? h`, <time datetime="${r.date}">${r.date.split('-').reverse().join('.')}</time>` : ''}</cite></blockquote>`))}</div>
</div></section>` : h`<section class="section section--sand"><div class="container">
<div class="section__head"><h2>Завод на Яндекс Картах</h2></div>
${yandexBlock(ctx)}
</div></section>`;

  const articles = articleList(ctx, { limit: 3, title: 'Статьи завода', sub: 'Разборы для тех, кто заказывает бетон впервые: марка, зимняя заливка, объём, приёмка.', more: true });

  const jsonld = [{ ...baseGraph(ctx), '@graph': [...baseGraph(ctx)['@graph'], { '@type': 'WebSite', '@id': `${ctx.origin}/#website`, url: `${ctx.origin}/`, name: site.brand, inLanguage: 'ru-RU', publisher: { '@id': `${ctx.origin}/#organization` } }] }, faqLd(faqItems)];

  const main = h`${hero}${priceBlock}${terms}${delivery}${gallery(ctx, ['hero', 'plant', 'fleet', 'lab', 'object'], { title: 'Завод и техника на объектах', max: 8, more: true })}${calc}${reviews}${articles}${faq(ctx, faqItems, { id: 'faq', sand: true })}${ctaBand(ctx, { source: 'home-bottom' })}`;
  return { url: '/', title, description, h1, main, jsonld };
}
