// Раздел статей: список и страницы статей с разметкой Article.
import { h, raw, join } from '../lib/util.mjs';
import { telHref } from '../lib/layout.mjs';
import { baseGraph, orgId } from '../lib/seo.mjs';
import { pagehead, ctaBand, articleList, articleCard, yandexBlock } from './common.mjs';

export function articlesIndex(ctx) {
  const { site } = ctx;
  const h1 = `Статьи о бетоне от завода ${site.plant.locality_in}`;
  const lead = 'Разборы для тех, кто заказывает бетон: как выбрать марку, как лить зимой, сколько кубов нужно и как принять смесь с миксера. Цены в статьях взяты из прайс-листа и датированы.';
  const main = h`${pagehead(ctx, { h1, lead, actions: false })}
${articleList(ctx, { title: 'Все статьи', level: 2 })}
${ctaBand(ctx, { source: 'articles' })}`;
  return {
    url: '/stati/', crumbs: [{ name: 'Статьи', url: '/stati/' }],
    title: `Статьи о бетоне: марка, зима, объём, приёмка | ${site.brand}`,
    description: `Статьи от завода ${site.plant.locality_in}: как выбрать марку бетона, залить фундамент зимой, посчитать кубы и принять смесь. Цены с датой.`,
    h1, main, jsonld: [baseGraph(ctx)]
  };
}

export function articlePage(ctx, a) {
  const { site } = ctx;
  const others = ctx.articles.filter((x) => x.slug !== a.slug).slice(0, 2);
  const img = ctx.assets.og;
  const main = h`<section class="pagehead pagehead--plain"><div class="container pagehead__in"><div class="pagehead__txt">
<h1>${a.title}</h1>
<p class="pagehead__lead">${a.lead}</p>
<p class="art__meta" style="margin:0"><span>Опубликовано <time datetime="${a.date}">${a.dateRu}</time></span><span>Читать ${a.minutes} мин</span><span>Цены в статье на <time datetime="${ctx.priceDateIso}">${ctx.priceDateRu}</time></span></p>
</div></div></section>
<section class="section section--tight"><div class="container art">
${a.toc.length > 2 ? h`<nav class="toc" aria-label="Содержание статьи"><b>Содержание</b><ol>${join(a.toc.map((t) => h`<li><a href="#${t.id}">${t.text}</a></li>`))}</ol></nav>` : ''}
<div class="art__body">
${raw(a.html)}
<p class="art__src">Статью написали на заводе ${site.plant.locality_in}, ${site.plant.address}. Цены и характеристики взяты из <a href="/price/">прайс-листа</a> на ${ctx.priceDateRu}. Адрес, отзывы и маршрут: <a href="${site.plant.yandex_url}" rel="noopener" target="_blank">карточка завода на Яндекс Картах</a>. Вопросы по заказу: <a href="${telHref(ctx)}">${site.phone.display}</a>.</p>
</div>
</div></section>
${others.length ? h`<section class="section section--sand"><div class="container">
<div class="section__head"><h2>Другие статьи</h2></div>
<ul class="alist">${join(others.map((o) => articleCard(ctx, o, { level: 3 })))}</ul>
</div></section>` : ''}
${ctaBand(ctx, { source: `article-${a.slug}` })}`;
  const ld = {
    '@context': 'https://schema.org', '@type': 'Article', '@id': `${ctx.origin}${a.url}#article`,
    headline: a.title, description: a.description, inLanguage: 'ru-RU',
    datePublished: a.date, dateModified: a.modified,
    mainEntityOfPage: `${ctx.origin}${a.url}`,
    image: ctx.images.has(a.photo) ? ctx.origin + ctx.images.get(a.photo).full : ctx.origin + img,
    author: { '@id': orgId(ctx) }, publisher: { '@id': orgId(ctx) }
  };
  return {
    url: a.url, crumbs: [{ name: 'Статьи', url: '/stati/' }, { name: a.title, url: a.url }],
    title: `${a.title} | ${site.brand}`, description: a.description, h1: a.title,
    main, jsonld: [baseGraph(ctx), ld]
  };
}
