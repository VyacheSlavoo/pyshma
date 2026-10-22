// Контакты, о заводе, политика, согласие, спасибо, 404.
import { h, raw, join, fmtNum, NBSP, esc } from '../lib/util.mjs';
import { icon, img, telHref, messengers, HOURS_TEXT, HOURS_FULL, leadForm, minVolText, faq } from '../lib/layout.mjs';
import { CONCRETE_KINDS } from '../lib/categories.mjs';
import { baseGraph, faqLd } from '../lib/seo.mjs';
import { T, sh, media, mapSection, pagehead, ctaBand, gallery, photoGrid, marksRange, pickupLine, paymentLine, deliveryLine, reachSpan, pagePhoto, ratingPanel, reviewsGrid, payMethods } from './common.mjs';

// Оператор персональных данных: реквизиты из site.requisites {name, inn, ogrn, address, email}.
// Без них в тексте остаётся название бренда и адрес завода; сборка выводит предупреждение (data.mjs).
const operator = (ctx) => {
  const r = ctx.site.requisites || {};
  const name = r.name || ctx.site.brand;
  const bits = [r.inn && `ИНН ${r.inn}`, r.ogrn && `${String(r.ogrn).length === 15 ? 'ОГРНИП' : 'ОГРН'} ${r.ogrn}`].filter(Boolean);
  return { name, full: bits.length ? `${name} (${bits.join(', ')})` : name, address: r.address || ctx.site.plant.address, email: r.email || ctx.site.email_public || null };
};
const RETENTION = '12 месяцев';
const REVISION = '22 октября 2026 года';

export function contactsPage(ctx) {
  const { site } = ctx;
  const p = site.plant;
  const m = messengers(ctx);
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
${site.main_site ? h`<p class="after">Общий сайт сети в Екатеринбурге: <a href="${site.main_site.url}">${site.main_site.name}</a>.</p>` : ''}
</div>
${leadForm(ctx, { title: 'Написать или заказать расчёт', source: 'contacts', id: 'zayavka' })}
</div></section>
${mapSection(ctx, { title: 'Завод на карте', band: true })}
<section class="section"><div class="container">
${sh('Отзывы', 'Отзывы на Яндекс Картах')}
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
  const territory = ctx.photos.find((x) => x.file === 'abn-mikseri.jpg') ?? ctx.photos.find((x) => x.role === 'plant');
  const main = h`${pagehead(ctx, { h1, eyebrow: 'О заводе', lead: `Производим и доставляем бетон ${marksRange(ctx)}, растворы и ЦПС. Сдаём в аренду автобетононасосы. ${HOURS_FULL}.`, facts: [['позиций в прайсе', String(ctx.positions)], ['минимальный заказ', minVolText(ctx)], ['режим работы', HOURS_TEXT]], photo: pagePhoto(ctx, 'about') })}
<section class="section section--tight"><div class="container split split--wide">
<div class="prose">
<p class="eyebrow">Производство</p>
<h2>Что производим и поставляем</h2>
<p>Завод ${p.locality_in} отгружает ${made.join(', ')}. Актуальные позиции и цены — в <a href="/price/">прайс-листе</a>.</p>
<h3>Где находится</h3>
<p>${p.address}. Бетон отгружается с этой площадки и доставляется автобетоносмесителями на объекты по ${p.district_dat}. ${pickupLine(ctx, { short: true }) ?? ''} Условия — на странице <a href="/dostavka/">доставки</a>.</p>
${ctx.rental ? h`<h3>Техника</h3><p>Для подачи бетона на высоту и в труднодоступные места сдаём в аренду <a href="/catalog/arenda-abn/">автобетононасосы</a> с вылетом стрелы ${reachSpan(ctx)}.</p>` : ''}
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
${mapSection(ctx, { band: false })}
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
  const contact = op.email ? `${site.phone.display}, ${op.email}` : site.phone.display;
  let n = 0;
  const sec = (title, body) => h`<h2>${++n}. ${title}</h2>${body}`;
  const main = h`${pagehead(ctx, { h1: 'Политика конфиденциальности', eyebrow: 'Документы', lead: `Как ${op.name} обрабатывает персональные данные, которые вы оставляете на сайте ${ctx.host}.`, actions: false })}
<section class="section section--tight"><div class="container prose">
<p><b>Редакция от ${REVISION}.</b></p>
${sec('Общие положения', h`<p>Политика составлена в соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных». Оператор персональных данных — ${op.full}, адрес: ${op.address}, телефон ${site.phone.display}${op.email ? h`, электронная почта ${op.email}` : ''}. Политика действует с момента публикации на сайте и относится только к сайту ${ctx.host}.</p>`)}
${sec('Какие данные мы получаем', h`<p>Из форм на сайте: номер телефона, объём бетона, марка или позиция из прайса, адрес объекта доставки. Все поля, кроме телефона, необязательны. Имя форма не запрашивает.</p><p>При отправке формы сервер записывает технические данные: IP-адрес, дату и время обращения, страницу сайта, с которой отправлена заявка. Они нужны, чтобы отличить заявку человека от автоматической рассылки и найти заявку при сбое почты.</p><p>Специальные категории данных (здоровье, убеждения, биометрия) мы не собираем.</p>`)}
${sec('Для чего используем', h`<ul><li>Подготовить расчёт стоимости бетона и доставки.</li><li>Связаться с вами по заявке: звонком или сообщением на указанный номер.</li><li>Организовать отгрузку и доставку, если заказ состоялся.</li><li>Защитить форму от спама и повторной отправки.</li></ul><p>Для рекламных рассылок данные не используются.</p>`)}
${sec('Основание обработки', h`<p>Обработка выполняется с вашего согласия (ст. 6 и 9 закона № 152-ФЗ). Вы даёте его, отметив поле в форме. Текст согласия: <a href="/soglasie/">страница согласия</a>. Без отметки форма не отправляется.</p>`)}
${sec('Как обрабатываем и храним', h`<p>Заявка уходит письмом на электронную почту оператора, копия записывается в файл журнала на сервере сайта. Доступ к журналу закрыт от публичного просмотра. Срок хранения записи в журнале — ${RETENTION} с даты заявки, затем файл удаляется автоматически. Письма с заявкой хранятся в почтовом ящике оператора, пока они нужны для исполнения заказа или учёта обращений, и удаляются по запросу.</p><p>Базы данных с персональными данными находятся на территории Российской Федерации: сайт размещён на хостинге ООО «Бегет» (Россия), почта заявок работает на серверах того же хостинга.</p>`)}
${sec('Передача третьим лицам', h`<p>Мы не продаём данные и не передаём их для рекламы. Данные получают только исполнители услуг, без которых сайт не работает: хостинг-провайдер, который хранит файлы сайта и журнал и передаёт письма, и сотрудники оператора, которые обрабатывают заявки. Государственным органам данные передаются только по законному запросу.</p>`)}
${sec('Сервисы на сайте', h`<p>На страницах «Контакты», «О заводе», «Доставка» и на главной загружается виджет Яндекс Карт. Яндекс при этом получает ваш IP-адрес и данные браузера на условиях <a href="https://yandex.ru/legal/confidential/" rel="noopener" target="_blank">своей политики конфиденциальности</a>. Номер телефона и текст заявки в Яндекс Карты не передаются.${site.metrika_id ? ' Сайт также использует Яндекс Метрику: она собирает обезличенную статистику посещений с помощью cookie. Отключить cookie можно в настройках браузера.' : ' Cookie для аналитики и рекламы сайт не устанавливает.'}</p>`)}
${sec('Ваши права', h`<p>Вы вправе запросить сведения о том, какие ваши данные мы храним, потребовать их уточнить, заблокировать или удалить, а также отозвать согласие. Для этого позвоните или напишите: ${contact}. Назовите номер телефона, который указывали в заявке, чтобы мы нашли запись. Ответим в сроки, которые установлены статьями 14 и 21 закона № 152-ФЗ.</p><p>Если считаете, что данные обрабатываются с нарушением закона, вы можете обратиться в Роскомнадзор (<a href="https://rkn.gov.ru/" rel="noopener" target="_blank">rkn.gov.ru</a>) или в суд.</p>`)}
${sec('Безопасность', h`<p>Заявки не публикуются на сайте. Доступ к журналу и почте заявок защищён паролем, соединение с почтовым сервером шифруется (TLS), форма защищена от автоматической отправки.</p>`)}
${sec('Изменения политики', h`<p>Актуальная редакция лежит на этой странице. Дата последнего изменения указана вверху.</p>`)}
</div></section>`;
  return { url: '/privacy/', inSitemap: false, crumbs: [{ name: 'Политика конфиденциальности', url: '/privacy/' }], title: `Политика конфиденциальности | ${site.brand}`, description: `Как ${site.brand} обрабатывает персональные данные из форм на сайте: какие данные, зачем, сколько хранятся и как их удалить.`, h1: 'Политика конфиденциальности', main, jsonld: [baseGraph(ctx)] };
}

export function consentPage(ctx) {
  const { site } = ctx;
  const op = operator(ctx);
  const contact = op.email ? `${site.phone.display} или ${op.email}` : site.phone.display;
  const main = h`${pagehead(ctx, { h1: 'Согласие на обработку персональных данных', eyebrow: 'Документы', lead: 'Текст согласия, которое вы даёте, отправляя форму на сайте.', actions: false })}
<section class="section section--tight"><div class="container prose">
<p><b>Редакция от ${REVISION}.</b></p>
<p>Отправляя форму на сайте ${ctx.host}, я свободно, своей волей и в своём интересе даю конкретное, информированное и сознательное согласие оператору — ${op.full}, адрес: ${op.address} (далее — Оператор) — на обработку моих персональных данных на следующих условиях.</p>
<ul>
<li><b>Данные:</b> номер телефона, объём и марка бетона, адрес объекта доставки, сообщение, которое я указал в форме; технические данные обращения: IP-адрес, дата и время, страница сайта.</li>
<li><b>Цели:</b> подготовка расчёта стоимости, связь со мной по заявке, организация отгрузки и доставки, защита формы от автоматической отправки.</li>
<li><b>Действия:</b> сбор, запись, систематизация, накопление, хранение, уточнение, использование, передача хостинг-провайдеру и почтовому сервису в объёме, нужном для работы сайта и доставки заявки, блокирование, удаление. Обработка выполняется с использованием средств автоматизации.</li>
<li><b>Срок:</b> запись в журнале сайта хранится ${RETENTION}; в остальном — до достижения целей обработки или до отзыва согласия.</li>
</ul>
<p>Я знаю, что могу отозвать согласие в любой момент: позвонить или написать Оператору (${contact}) и назвать номер телефона из заявки. После отзыва Оператор прекращает обработку и удаляет данные в сроки, установленные законом, если у него нет другого законного основания их хранить.</p>
<p>Подробнее — в <a href="/privacy/">политике конфиденциальности</a>.</p>
</div></section>`;
  return { url: '/soglasie/', inSitemap: false, crumbs: [{ name: 'Согласие на обработку данных', url: '/soglasie/' }], title: `Согласие на обработку персональных данных | ${site.brand}`, description: `Текст согласия на обработку персональных данных, которое даёт посетитель при отправке формы на сайте ${site.brand}.`, h1: 'Согласие на обработку персональных данных', main, jsonld: [baseGraph(ctx)] };
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
