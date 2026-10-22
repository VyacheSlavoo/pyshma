// JSON-LD, sitemap, robots, .htaccess. Все числа берутся из тех же объектов, что и видимые таблицы.
import { isoDate } from './util.mjs';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const OPENING_HOURS = 'Mo-Su 00:00-23:59';

export const orgId = (ctx) => `${ctx.origin}/#organization`;
export const lbId = (ctx) => `${ctx.origin}/#localbusiness`;

export function baseGraph(ctx) {
  const { site, origin } = ctx;
  const cityNames = ctx.cities.map((c) => c.name);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization', '@id': orgId(ctx), name: site.brand, url: `${origin}/`,
        logo: `${origin}${ctx.assets.logo}`, telephone: site.phone.e164, sameAs: [site.plant.yandex_url],
        ...(site.email_public ? { email: site.email_public } : {}),
        ...(site.founded_year ? { foundingDate: String(site.founded_year) } : {})
      },
      {
        '@type': 'LocalBusiness', '@id': lbId(ctx), name: site.brand, url: `${origin}/`,
        ...(site.plant.card_name ? { alternateName: site.plant.card_name } : {}),
        image: `${origin}${ctx.assets.og}`, telephone: site.phone.e164,
        ...(site.email_public ? { email: site.email_public } : {}),
        address: {
          '@type': 'PostalAddress', streetAddress: site.plant.street, addressLocality: site.plant.locality,
          addressRegion: site.plant.region, ...(site.plant.postal_code ? { postalCode: site.plant.postal_code } : {}), addressCountry: 'RU'
        },
        geo: { '@type': 'GeoCoordinates', latitude: site.plant.geo.lat, longitude: site.plant.geo.lon },
        hasMap: site.plant.yandex_url, sameAs: [site.plant.yandex_url],
        openingHours: OPENING_HOURS,
        openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: DAYS, opens: '00:00', closes: '23:59' }],
        areaServed: [site.plant.locality, ...cityNames].filter((v, i, a) => a.indexOf(v) === i).map((name) => ({ '@type': 'City', name }))
      }
    ]
  };
}

export function breadcrumbLd(ctx, page) {
  const list = [{ name: 'Главная', url: '/' }, ...(page.crumbs || [])];
  return {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: list.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: ctx.origin + c.url }))
  };
}

export function faqLd(items) {
  if (!items?.length) return null;
  return {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: items.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } }))
  };
}

export function offerLd(ctx, { name, price, url, unitCode = 'MTQ', unitText }) {
  return {
    '@type': 'Offer', name, price: String(price), priceCurrency: 'RUB',
    priceValidUntil: isoDate(ctx.priceValidUntil), availability: 'https://schema.org/InStock', url: ctx.origin + url,
    seller: { '@id': lbId(ctx) },
    priceSpecification: { '@type': 'UnitPriceSpecification', price: String(price), priceCurrency: 'RUB', ...(unitText ? { unitText } : { unitCode }) }
  };
}

export function sitemapXml(ctx, pages) {
  // lastmod: у статей дата публикации или обновления цен, у остальных дата прайса (сайт меняется вместе с ним)
  const last = isoDate(ctx.priceDate);
  const urls = pages.filter((p) => p.inSitemap !== false && !p.noindex).map((p) => `  <url><loc>${ctx.origin}${p.url}</loc><lastmod>${p.lastmod ?? last}</lastmod></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

export function robotsTxt(ctx) {
  if (ctx.fixture || ctx.preview) return 'User-agent: *\nDisallow: /\n';
  // /spasibo/ не закрываем: боту нужно увидеть на странице noindex. Clean-param склеивает адреса с метками рекламы.
  return `User-agent: *\nAllow: /\nDisallow: /send.php\nClean-param: utm_source&utm_medium&utm_campaign&utm_content&utm_term&yclid&gclid&fbclid&openstat /\n\nSitemap: ${ctx.origin}/sitemap.xml\n`;
}

export function htaccess(ctx) {
  const host = ctx.host;
  const hostRe = host.replace(/\./g, '\\.');
  return `# Сгенерировано сборкой. Правьте content/*.json, а не этот файл.
Options -Indexes
DirectoryIndex index.html
ErrorDocument 404 /404.html
AddDefaultCharset UTF-8
AddType font/woff2 .woff2
AddType image/webp .webp
AddType image/svg+xml .svg

<IfModule mod_rewrite.c>
RewriteEngine On

# 0. каталог без слэша: слэш и https за один шаг (http://host/price -> https://host/price/)
RewriteCond %{REQUEST_FILENAME} -d
RewriteCond %{REQUEST_URI} !/$
RewriteRule ^(.*)$ https://${host}/$1/ [R=301,L]

# 1. http -> https одним шагом (Бегет за nginx: проверяем все признаки https)
RewriteCond %{HTTPS} !=on
RewriteCond %{ENV:HTTPS} !=on
RewriteCond %{HTTP:X-Forwarded-Proto} !=https
RewriteRule ^ https://${host}%{REQUEST_URI} [R=301,L]

# 2. www -> основной хост
RewriteCond %{HTTP_HOST} ^www\\.${hostRe}$ [NC]
RewriteRule ^ https://${host}%{REQUEST_URI} [R=301,L]

# 3. /index.html, /index.htm, /index.php -> /
RewriteCond %{THE_REQUEST} \\s/(.*/)?index\\.(?:html?|php)[\\s?] [NC]
RewriteRule ^ https://${host}/%1 [R=301,L,NE]

# 4. отдельной страницы /catalog/ нет, полный прайс лежит в /price/
RewriteRule ^catalog/?$ https://${host}/price/ [R=301,L]

</IfModule>

<IfModule mod_authz_core.c>
<FilesMatch "^(send\\.config.*\\.php|.*\\.log|\\.htaccess)$">
Require all denied
</FilesMatch>
</IfModule>
<IfModule !mod_authz_core.c>
<FilesMatch "^(send\\.config.*\\.php|.*\\.log|\\.htaccess)$">
Order allow,deny
Deny from all
</FilesMatch>
</IfModule>

<IfModule mod_headers.c>
Header always set X-Content-Type-Options "nosniff"
Header always set Referrer-Policy "strict-origin-when-cross-origin"
Header always set X-Frame-Options "SAMEORIGIN"
</IfModule>

<IfModule mod_deflate.c>
AddOutputFilterByType DEFLATE text/html text/css text/javascript application/javascript application/json application/ld+json image/svg+xml application/xml text/plain
</IfModule>

<IfModule mod_expires.c>
ExpiresActive On
ExpiresByType text/html "access plus 10 minutes"
ExpiresByType application/xml "access plus 1 day"
</IfModule>
`;
}

export const assetsHtaccess = `<IfModule mod_headers.c>
Header set Cache-Control "public, max-age=31536000, immutable"
</IfModule>
<IfModule mod_expires.c>
ExpiresActive On
ExpiresDefault "access plus 1 year"
</IfModule>
`;
