// Контакты, о заводе, политика, согласие, спасибо, 404.
import { h, raw, join, fmtNum, NBSP, esc } from '../lib/util.mjs';
import { icon, telHref, messengers, HOURS_TEXT, HOURS_FULL, leadForm, minVolText, faq } from '../lib/layout.mjs';
import { CONCRETE_KINDS } from '../lib/categories.mjs';
import { baseGraph, faqLd } from '../lib/seo.mjs';
import { T, sh, media, pagehead, ctaBand, gallery, photoGrid, marksRange, pickupLine, paymentLine, deliveryLine, reachSpan, pagePhoto, ratingPanel, reviewsGrid, payMethods } from './common.mjs';

const operator = (ctx) => ctx.site.signature && !ctx.fixture ? ctx.site.signature : ctx.site.brand;

export function contactsPage(ctx) {
  const { site } = ctx;
  const p = site.plant;
  const m = messengers(ctx);
  const mapBlock = h`<div class="mapbox"${p.yandex_org_id ? raw(` data-oid="${esc(p.yandex_org_id)}"`) : ''}>${icon(ctx, 'pin')}<p><b>${p.address}</b></p><p class="muted">Карта загрузится по кнопке: так страница открывается быстрее.</p><div class="mapbox__btns">${p.yandex_org_id ? h`<button type="button" class="btn btn--primary btn--sm" data-map>Показать карту</button>` : ''}<a class="btn btn--ghost btn--sm" href="${p.yandex_url}" rel="noopener" target="_blank">Маршрут на Яндекс Картах</a></div></div>`;
  const h1 = T(ctx, 'contacts.h1', `Контакты завода ${p.locality_in}`);
  const main = h`${pagehead(ctx, { h1, eyebrow: 'Контакты', lead: `${HOURS_FULL}.`, actions: false, photo: pagePhoto(ctx, 'contacts'),
    facts: [['телефон', h`<a href="${telHref(ctx)}">${site.phone.display}</a>`], ['режим работы', HOURS_TEXT], ['минимальный заказ', minVolText(ctx)]] })}
<section class="section section--tight"><div class="container split split--top">
<div>
${sh('Связь', 'Как с нами связаться')}
<dl class="kv">
<dt>Адрес завода</dt><dd>${p.address}</dd>
<dt>Телефон</dt><dd><a href="${telHref(ctx)}">${site.phone.display}</a></dd>
${site.email_public ? h`<dt>Эл. почта</dt><dd><a href="mailto:${site.email_public}">${site.email_public}</a></dd>` : ''}
<dt>Режим работы</dt><dd>${HOURS_TEXT}</dd>
${m.length ? h`<dt>Мессенджеры</dt><dd>${join(m.map((x) => h`<a href="${x.url}" rel="noopener" target="_blank">${x.label}</a>`), ', ')}</dd>` : ''}
${site.card?.pickup ? h`<dt>Самовывоз</dt><dd>с завода, по адресу выше</dd>` : ''}
${paymentLine(ctx) ? h`<dt>Оплата</dt><dd>${paymentLine(ctx).replace('Способы оплаты: ', '').replace(/\.$/, '')}</dd>` : ''}
</dl>
${p.directions ? h`<h2>Как проехать</h2><p>${p.directions}</p>` : ''}
${mapBlock}
${site.main_site ? h`<p class="after">Общий сайт сети в Екатеринбурге: <a href="${site.main_site.url}">${site.main_site.name}</a>.</p>` : ''}
</div>
${leadForm(ctx, { title: 'Написать или заказать расчёт', source: 'contacts', id: 'zayavka' })}
</div></section>
<section class="section section--band"><div class="container">
${sh('Отзывы', 'Завод на Яндекс Картах')}
${ratingPanel(ctx)}
${reviewsGrid(ctx)}
</div></section>`;
  const org = baseGraph(ctx);
  return {
    url: '/contacts/', crumbs: [{ name: 'Контакты', url: '/contacts/' }],
    title: `Контакты бетонного завода ${p.locality_in}, 24/7 | ${site.brand}`,
    description: `Бетонный завод ${p.locality_in}: ${p.address}. Телефон ${site.phone.display}. Работаем 24/7: приём заявок, отгрузка и доставка круглосуточно.`,
    h1, main, jsonld: [org]
  };
}

export function aboutPage(ctx) {
  const { site } = ctx;
  const p = site.plant;
  const WHAT = { 'tovarnyy-beton': 'товарный бетон', 'beton-s-pmd': 'бетон с противоморозными добавками', 'fibrobeton': 'фибробетон', 'gidrotehnicheskiy-beton': 'гидротехнический бетон', 'beton-na-melkom-share': 'бетон на мелком щебне', 'keramzitobeton': 'керамзитобетон', 'suhoy-beton': 'сухой бетон', 'rastvory': 'кладочные и монтажные растворы', 'tsps': 'цементно-песчаные смеси (ЦПС)', 'armatura': 'арматуру' };
  const made = ctx.categories.map((c) => WHAT[c.slug] ?? c.menu.toLowerCase());
  const h1 = T(ctx, 'about.h1', `О заводе ${p.locality_in}`);
  const pick = pickupLine(ctx);
  const faqItems = T(ctx, 'faq.about', [
    ['Где находится производство?', `${p.address}. Это место отгрузки: бетон забирают самовывозом или привозят на объект миксерами.`],
    ['Что вы производите и продаёте?', `Бетон ${marksRange(ctx)} разных видов, растворы и ЦПС, арматуру, а также сдаём в аренду автобетононасосы. Полный список позиций и цены — в прайс-листе.`],
    ...(site.lab?.has_control ? [['Как подтверждается качество бетона?', 'Перед отгрузкой контролируем состав и подвижность смеси. Образцы испытываются в установленном возрасте. Партия отправляется с документами о качестве.']] : [])
  ]);
  const territory = ctx.photos.find((x) => x.file === 'uzel-pomeschenie.jpg') ?? ctx.photos.find((x) => x.role === 'plant');
  const main = h`${pagehead(ctx, { h1, eyebrow: 'О заводе', lead: `Производим и доставляем бетон ${marksRange(ctx)}, растворы и ЦПС. Сдаём в аренду автобетононасосы. ${HOURS_FULL}.`, facts: [['позиций в прайсе', String(ctx.positions)], ['минимальный заказ', minVolText(ctx)], ['режим работы', HOURS_TEXT]], photo: pagePhoto(ctx, 'about') })}
<section class="section section--tight"><div class="container split split--wide">
<div class="prose">
<p class="eyebrow">Производство</p>
<h2>Что производим и поставляем</h2>
<p>Завод ${p.locality_in} отгружает ${made.join(', ')}. Актуальные позиции и цены — в <a href="/price/">прайс-листе</a>.</p>
<h2>Где находится</h2>
<p>${p.address}. Бетон отгружается с этой площадки и доставляется автобетоносмесителями на объекты по ${p.district_dat}. ${pickupLine(ctx, { short: true }) ?? ''} Условия — на странице <a href="/dostavka/">доставки</a>.</p>
${ctx.rental ? h`<h2>Техника</h2><p>Для подачи бетона на высоту и в труднодоступные места сдаём в аренду <a href="/catalog/arenda-abn/">автобетононасосы</a> с вылетом стрелы ${reachSpan(ctx)}.</p>` : ''}
${site.lab?.has_control ? h`<h2>Как подтверждаем качество</h2>
<ul class="checks"><li>Перед отгрузкой контролируем состав и подвижность смеси.</li><li>Образцы испытываются в установленном возрасте.</li><li>Партия идёт с документами о качестве: ${site.documents.join(', ')}.</li></ul>` : ''}
</div>
<div class="card"><h3>Коротко</h3><dl class="kv"><dt>Адрес</dt><dd>${p.address}</dd><dt>Режим</dt><dd>${HOURS_TEXT}</dd><dt>Заказ от</dt><dd>${minVolText(ctx)}</dd><dt>Документы</dt><dd>${site.documents.join(', ')}</dd></dl><p><a class="link-arrow" href="/contacts/">Все контакты${icon(ctx, 'arrow')}</a></p></div>
</div></section>
${territory ? h`<section class="section"><div class="container split split--media">
${media(ctx, territory.file, { ico: 'factory' })}
<div>
<p class="eyebrow">Отгрузка</p>
<h2>С узла сразу в миксер</h2>
<p class="lead">Смесь готовят по заявке и загружают в автобетоносмеситель на территории узла. Отсюда же отпускают самовывоз. С каждой машиной идут ${site.documents.join(' и ')}.</p>
<div class="actions actions--flush"><a class="btn btn--primary" href="/price/">Прайс-лист</a><a class="link-arrow" href="/dostavka/">Условия доставки${icon(ctx, 'arrow')}</a></div>
</div>
</div></section>` : ''}
<section class="section section--band"><div class="container">
${sh('Фото', 'Завод и техника', 'Снимки из карточки завода на Яндекс Картах.', { row: true })}
${photoGrid(ctx, { skip: [pagePhoto(ctx, 'about'), territory?.file] })}
${ratingPanel(ctx)}
</div></section>
${faq(ctx, faqItems)}${ctaBand(ctx, { source: 'about' })}`;
  return {
    url: '/about/', crumbs: [{ name: 'О заводе', url: '/about/' }],
    title: `О заводе: производство бетона ${p.locality_in} | ${site.brand}`,
    description: `Бетонный завод ${p.locality_in}: что производим, как отгружаем и доставляем, какие документы выдаём. Заказ от ${fmtNum(site.min_volume_m3)}${NBSP}м³, работаем 24/7.`,
    h1, main, jsonld: [baseGraph(ctx), faqLd(faqItems)]
  };
}

export function privacyPage(ctx) {
  const { site } = ctx;
  const op = operator(ctx);
  const contact = site.email_public ? `${site.phone.display}, ${site.email_public}` : site.phone.display;
  const main = h`${pagehead(ctx, { h1: 'Политика конфиденциальности', eyebrow: 'Документы', lead: `Как ${op} обрабатывает персональные данные, которые вы оставляете на сайте ${ctx.host}.`, actions: false })}
<section class="section section--tight"><div class="container prose">
<h2>1. Общие положения</h2>
<p>Политика составлена в соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных». Оператор — ${op}, адрес: ${site.plant.address}. Политика действует с момента публикации на сайте.</p>
<h2>2. Какие данные мы получаем</h2>
<p>Через формы на сайте: номер телефона, объём и марка бетона, адрес объекта доставки. Мы не требуем других данных и не запрашиваем лишнего. Технические данные (IP-адрес, тип браузера, дата и время посещения) фиксируются сервером при обращении к сайту.</p>
<h2>3. Для чего используем</h2>
<ul><li>Подготовить расчёт стоимости бетона и доставки.</li><li>Связаться с вами по заявке: звонок или сообщение.</li><li>Организовать отгрузку и доставку, если заказ состоялся.</li></ul>
<h2>4. Основание обработки</h2>
<p>Обработка выполняется с вашего согласия, которое вы даёте, отметив соответствующее поле в форме. Текст согласия: <a href="/soglasie/">страница согласия</a>.</p>
<h2>5. Как обрабатываем и храним</h2>
<p>Заявка передаётся на электронную почту оператора, а её копия сохраняется в журнале на сервере сайта, чтобы заявка не потерялась при сбое почты. Для работы сайта и доставки писем используются услуги хостинг-провайдера и почтового сервиса, которые получают данные только в объёме, нужном для работы сервиса. Данные хранятся до достижения целей обработки или до отзыва согласия. Мы не продаём и не передаём данные третьим лицам для рекламы.</p>
${site.metrika_id ? h`<h2>6. Веб-аналитика и cookie</h2><p>Сайт использует сервис Яндекс Метрика. Он собирает обезличенные данные о посещениях с помощью cookie. Отключить cookie можно в настройках браузера.</p>` : ''}
<h2>${site.metrika_id ? '7' : '6'}. Ваши права</h2>
<p>Вы можете запросить сведения о том, какие данные мы храним, потребовать их уточнить, заблокировать или удалить, а также отозвать согласие. Для этого свяжитесь с нами: ${contact}. Согласие можно отозвать в любой момент, обработка прекратится в сроки, установленные законом.</p>
<h2>${site.metrika_id ? '8' : '7'}. Безопасность</h2>
<p>Мы принимаем организационные и технические меры, чтобы данные не попали к посторонним: ограничиваем доступ к заявкам, не публикуем их на сайте.</p>
<h2>${site.metrika_id ? '9' : '8'}. Изменения политики</h2>
<p>Актуальная редакция всегда находится на этой странице.</p>
</div></section>`;
  return { url: '/privacy/', crumbs: [{ name: 'Политика конфиденциальности', url: '/privacy/' }], title: `Политика конфиденциальности | ${site.brand}`, description: `Как ${site.brand} обрабатывает персональные данные из форм на сайте: какие данные, зачем, сколько хранятся и как их удалить.`, h1: 'Политика конфиденциальности', main, jsonld: [baseGraph(ctx)] };
}

export function consentPage(ctx) {
  const { site } = ctx;
  const op = operator(ctx);
  const contact = site.email_public ? `${site.phone.display} или ${site.email_public}` : site.phone.display;
  const main = h`${pagehead(ctx, { h1: 'Согласие на обработку персональных данных', eyebrow: 'Документы', lead: 'Текст согласия, которое вы даёте, отправляя форму на сайте.', actions: false })}
<section class="section section--tight"><div class="container prose">
<p>Отправляя форму на сайте ${ctx.host}, я свободно, своей волей и в своём интересе даю согласие ${op} (адрес: ${site.plant.address}; далее — Оператор) на обработку моих персональных данных на следующих условиях.</p>
<ul>
<li><b>Данные:</b> номер телефона, объём и марка бетона, адрес объекта доставки, сообщение, которое я указал в форме.</li>
<li><b>Цели:</b> подготовка расчёта стоимости, связь со мной по заявке, организация отгрузки и доставки.</li>
<li><b>Действия:</b> сбор, запись, систематизация, хранение, использование, передача хостинг-провайдеру и почтовому сервису в объёме, необходимом для работы сайта и доставки заявки, удаление.</li>
<li><b>Срок:</b> до достижения целей обработки или до отзыва согласия.</li>
</ul>
<p>Я могу отозвать согласие в любой момент, обратившись к Оператору: ${contact}.</p>
<p>Подробнее — в <a href="/privacy/">политике конфиденциальности</a>.</p>
</div></section>`;
  return { url: '/soglasie/', crumbs: [{ name: 'Согласие на обработку данных', url: '/soglasie/' }], title: `Согласие на обработку персональных данных | ${site.brand}`, description: `Текст согласия на обработку персональных данных, которое даёт посетитель при отправке формы на сайте ${site.brand}.`, h1: 'Согласие на обработку персональных данных', main, jsonld: [baseGraph(ctx)] };
}

export function thanksPage(ctx) {
  const { site } = ctx;
  const main = h`<section class="section"><div class="container prose">
<h1>Заявка отправлена</h1>
<p>Мы получили вашу заявку и свяжемся с вами по указанному номеру. Если вопрос срочный, позвоните: <a href="${telHref(ctx)}">${site.phone.display}</a>. ${HOURS_TEXT}.</p>
<div class="actions"><a class="btn btn--primary" href="/">На главную</a><a class="btn btn--ghost" href="/price/">Прайс-лист</a></div>
</div></section>`;
  return { url: '/spasibo/', crumbs: [{ name: 'Заявка отправлена', url: '/spasibo/' }], title: `Заявка отправлена | ${site.brand}`, description: `Заявка отправлена. Мы свяжемся с вами по указанному номеру. Работаем 24/7.`, h1: 'Заявка отправлена', main, jsonld: [], noindex: true, inSitemap: false };
}

export function notFoundPage(ctx) {
  const { site } = ctx;
  const main = h`<section class="section"><div class="container prose">
<h1>Страница не найдена</h1>
<p>Такого адреса на сайте нет. Перейдите в нужный раздел или позвоните: <a href="${telHref(ctx)}">${site.phone.display}</a>.</p>
<div class="actions"><a class="btn btn--primary" href="/">На главную</a><a class="btn btn--ghost" href="/price/">Прайс-лист</a><a class="btn btn--ghost" href="/dostavka/">Доставка</a></div>
</div></section>`;
  return { url: '/404.html', crumbs: [{ name: 'Страница не найдена', url: '/404.html' }], title: `Страница не найдена | ${site.brand}`, description: 'Страница не найдена. Перейдите на главную или в прайс-лист.', h1: 'Страница не найдена', main, jsonld: [], noindex: true, inSitemap: false };
}
