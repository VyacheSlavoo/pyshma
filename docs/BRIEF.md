# Данные точки

Все факты лежат в `content/*.json`. Шаблоны ничего не придумывают: пока обязательные поля пусты, `npm run build`
останавливается и печатает, чего не хватает. Режим работы не вводится, он всегда 24/7. Цены, отзывы и список фото
обновляет `npm run import` (карточка Яндекс Карт), вручную остаётся только то, чего в карточке нет.

## content/site.json

| Поле | Что вписать |
|---|---|
| `domain` | основной адрес с `https://`, без слэша и без `www` |
| `brand` | название на сайте |
| `signature` | подпись юрлица без ИНН/ОГРН или `null` |
| `founded_year` | год начала производства или `null`: тогда год на сайте не упоминается |
| `main_site` | `{ "name", "url" }` основного сайта сети: ссылка в подвале и контактах (перелинковка для поддомена) |
| `plant.locality`, `locality_in`, `locality_from` | «Верхняя Пышма», «в Верхней Пышме», «из Верхней Пышмы» |
| `plant.district_dat` | зона доставки в дательном падеже: «Верхней Пышме и окрестностям» |
| `plant.address`, `street`, `geo.lat/lon` | адрес как в Яндекс Бизнесе и координаты |
| `plant.yandex_url`, `yandex_org_id`, `card_name` | ссылка на карточку, id организации (для виджета карты), название на карточке |
| `phone.display` / `phone.e164` | как показывать и как набирать |
| `email_public` | публичная почта |
| `messengers[]` | только рабочие: `{ "type": "telegram|whatsapp|max|viber", "url": "https://..." }` |
| `min_volume_m3` | минимальный заказ |
| `delivery.price_includes_delivery` | `true`, `false` или `null` (неизвестно: сайт говорит нейтрально) |
| `delivery.tariff_note`, `mixer_capacity_m3`, `dispatch_note`, `waiting_note` | только известное, остальное `null` |
| `documents[]` | документы на партию |
| `lab.has_control` | `true` только если контроль качества подтверждён |
| `mark_pages[]` | марки со своей страницей (по спросу) |
| `reviews.items[]` | реальные отзывы; `npm run import` выбирает их из карточки |
| `card` | данные карточки (самовывоз, способы оплаты, рейтинг): заполняется импортом |

НДС на сайте не упоминается.

## content/prices.json

Категории: `tovarnyy-beton`, `beton-s-pmd`, `fibrobeton`, `gidrotehnicheskiy-beton`, `beton-na-melkom-share`,
`beton-na-granite`, `beton-na-gravii`, `keramzitobeton`, `suhoy-beton`, `rastvory`, `tsps`, `armatura`.
Бетон: `mark`, `class`, `mobility`, `frost`, `water`, `price` (для ПМД ещё `pmd`). Растворы: `name`, `spec`, `unit`, `price`.
Арматура: `name`, `diameter_mm`, `rebar_class`, `steel`, `group`, `unit`, `price`.
Цена одна на строку: она же в таблице и в JSON-LD. Марка и класс должны совпадать на всём сайте.

## content/cities.json

`slug`, `tier` (`city` даёт `/slug/`, `settlement` даёт `/dostavka/slug/`), `name`, `in` («в Екатеринбурге»),
`distance_km`, `travel_time`, `delivery_cost`, `delivery_cost_unit`, `notes[]`, `faq[]`. Что неизвестно, оставьте `null`.

## content/rental.json

`units[]`: автобетононасосы (`name`, `reach_m`, `reach_text`, `price`, `unit`). `extras[]`: ленты, бетоноводы, трубы
(`name`, `price`, `unit`, `note`, `min_hours`).

## content/photos.json и content/photos/

`{ "file", "alt", "role": "hero|plant|fleet|lab|object", "caption" }`. Нужно одно фото с ролью `hero`. Порядок в файле
задаёт порядок на странице.

## content/texts.json

Переопределяет любой текст: `home.h1`, `category.<slug>.lead`, `faq.home` и т.д. Нужен, чтобы тексты сайтов сети не совпадали.
