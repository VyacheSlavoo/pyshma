// Раздел статей: список и страницы статей с разметкой Article.
import { h, raw, join } from '../lib/util.mjs';
import { telHref } from '../lib/layout.mjs';
import { baseGraph, orgId } from '../lib/seo.mjs';
import { sh, pagehead, ctaBand, articleList, articleCard, pagePhoto } from './common.mjs';

export function articlesIndex(ctx) {
  const { site } = ctx;
  const h1 = `Статьи о бетоне от завода ${site.plant.locality_in}`;
  const lead = 'Разборы для тех, кто заказывает бетон: марка и подвижность, зимняя заливка, объём, растворы, арматура и приёмка смеси с миксера. Цены в статьях взяты из прайс-листа и датированы.';
  const main = h`${pagehead(ctx, { h1, eyebrow: 'Статьи', lead, actions: false, photo: pagePhoto(ctx, 'stati'), facts: [['статей в разделе', String(ctx.articles.length)], ['цены в статьях на', ctx.priceDateRu]] })}
${articleList(ctx, { title: 'Все статьи', eyebrow: 'Разделы', level: 2 })}
${ctaBand(ctx, { source: 'articles' })}`;
  return {
    url: '/stati/', crumbs: [{ name: 'Статьи', url: '/stati/' }],
    title: `Статьи о бетоне: марки, зима, объём, растворы | ${site.brand}`,
    description: `Статьи от завода ${site.plant.locality_in}: как выбрать марку и подвижность бетона, залить фундамент зимой, посчитать кубы и арматуру, выбрать ЦПС или раствор. Цены с датой.`,
    h1, main, jsonld: [baseGraph(ctx)]
  };
}

export function articlePage(ctx, a) {
  const { site } = ctx;
  const others = ctx.articles.filter((x) => x.slug !== a.slug).slice(0, 3);
  const img = ctx.assets.og;
  const meta = h`<p class="art__meta"><span>Автор: завод «${site.brand}»</span><span>Опубликовано <time datetime="${a.date}">${a.dateRu}</time></span><span>Читать ${a.minutes} мин</span><span>Цены в статье на <time datetime="${ctx.priceDateIso}">${ctx.priceDateRu}</time></span></p>`;
  const main = h`${pagehead(ctx, { h1: a.title, eyebrow: 'Статья', lead: a.lead, actions: false, photo: a.photo, extra: meta })}
<section class="section section--tight"><div class="container art">
${a.toc.length > 2 ? h`<nav class="toc" aria-label="Содержание статьи"><b>Содержание</b><ol>${join(a.toc.map((t) => h`<li><a href="#${t.id}">${t.text}</a></li>`))}</ol></nav>` : ''}
<div class="art__body">
${raw(a.html)}
<p class="art__src">Цены и характеристики взяты из <a href="/price/">прайс-листа</a> на ${ctx.priceDateRu}. Адрес, отзывы и маршрут: <a href="${site.plant.yandex_url}" rel="noopener" target="_blank">карточка завода на Яндекс Картах</a>. Вопросы по заказу: <a href="${telHref(ctx)}">${site.phone.display}</a>.</p>
</div>
</div></section>
${articleList(ctx, { list: others, title: 'Другие статьи', eyebrow: 'Читать дальше', more: true, band: true })}
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
    title: `${a.title} | ${site.brand}`, description: a.description, h1: a.title, ogType: 'article', lastmod: a.modified,
    main, jsonld: [baseGraph(ctx), ld]
  };
}
