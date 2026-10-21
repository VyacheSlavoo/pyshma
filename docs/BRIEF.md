# Как заполнить данные точки

Все факты лежат в `content/*.json`. Шаблоны ничего не придумывают: пока обязательные поля пусты,
`npm run build` останавливается и печатает список недостающего. Режим работы не вводится, он всегда 24/7.

## content/site.json

| Поле | Что вписать | Пример формата |
|---|---|---|
| `domain` | основной адрес без слэша в конце, с `https://`, без `www` | `https://example.ru` |
| `brand` | название на сайте | |
| `signature` | подпись юрлица без ИНН/ОГРН, либо `null` | `ООО «Название»` |
| `founded_year` | с какого года работает производство (не домен) | `2012` |
| `plant.locality` | населённый пункт завода | `Ульяновка` |
| `plant.locality_in` | он же с предлогом | `в Ульяновке` |
| `plant.locality_from` | он же с предлогом «из» | `из Ульяновки` |
| `plant.region` | регион | |
| `plant.district` / `plant.district_dat` | район и его дательный падеж («по Тосненскому району») | |
| `plant.address` | адрес как в Яндекс Бизнесе | |
| `plant.street`, `plant.postal_code` | для schema.org | |
| `plant.geo.lat/lon` | координаты завода | |
| `plant.yandex_url` | ссылка на карточку в Яндекс Картах | |
| `plant.yandex_org_id` | id организации, нужен для виджета карты | необязательно |
| `phone.display` / `phone.e164` | как показывать и как набирать | `+7 (000) 000-00-00` / `+70000000000` |
| `messengers[]` | только рабочие: `{ "type": "telegram", "url": "https://t.me/..." }` | типы: `telegram`, `whatsapp`, `max`, `viber` |
| `min_volume_m3` | минимальный объём заказа | `1` |
| `vat` | `included`, `excluded` или `none` (НДС не облагается), одно значение на весь сайт | |
| `delivery.price_includes_delivery` | `true`, если доставка входит в цену бетона; `false`, если считается отдельно | |
| `delivery.*` (остальное) | `tariff_note`, `mixer_capacity_m3`, `dispatch_note`, `waiting_note`: только то, что знаете; остальное `null` | |
| `mark_pages[]` | марки со своей страницей (по спросу), например `["М200","М250","М300","М350"]` | |
| `hero_h1` | свой H1 главной, если нужно отличаться от шаблона; ключи «от производителя», «доставка от N м³», «24/7» должны остаться | |
| `reviews.items[]` | только реальные: `{ "author": "", "text": "", "date": "2026-01-15", "source_url": "" }` | |
| `requisites` | `null`, если сайт часть сети и ИНН/ОГРН показывать нельзя | |
| `metrika_id` | номер счётчика Яндекс Метрики, если нужен | |

## content/prices.json

```json
{
  "categories": [
    {
      "slug": "tovarnyy-beton",
      "rows": [
        { "mark": "М300", "class": "В22,5", "mobility": "П3", "frost": "F150", "water": "W6", "price": 0 }
      ]
    }
  ]
}
```

Допустимые `slug`: `tovarnyy-beton`, `beton-s-pmd`, `beton-na-granite`, `beton-na-gravii`, `rastvory`.
Для бетона строка содержит `mark`, `class`, `mobility`, `frost`, `water`, `price`; для `beton-s-pmd` ещё `pmd`
(температура, например `-15`); необязательно `filler`. Для растворов: `name`, `spec`, `unit`, `price`.
Цена одна на строку: она же попадает в видимую таблицу и в JSON-LD.

## content/cities.json

```json
{
  "cities": [
    {
      "slug": "tosno", "tier": "city", "name": "Тосно", "in": "в Тосно",
      "distance_km": 0, "travel_time": "около 0 мин",
      "delivery_cost": 0, "delivery_cost_unit": "за рейс",
      "notes": [], "faq": []
    }
  ]
}
```

`tier: "city"` даёт страницу `/slug/` (1–2 приоритетных города), `tier: "settlement"` даёт `/dostavka/slug/`.
Числа, которых вы не знаете, не заполняйте: страница напишет, от чего зависит расчёт.

## content/rental.json

`available: true` и список `units` с полями `name`, `reach_m`, `capacity_m3h`, `pipe_diameter_mm`,
`price_shift`, `price_hour`, `min_hours`, `idle_note`, `site_requirements[]`, `zone`.

## content/photos.json и content/photos/

Положите реальные фото в `content/photos/` и перечислите их:
`{ "file": "hero.jpg", "alt": "...", "role": "hero|plant|fleet|lab|object", "caption": "..." }`.
Роль `hero` обязательна. Сток и нейрофото людей запрещены ТЗ.

## content/texts.json

Переопределяет любой текст: ключ `home.intro`, `category.tovarnyy-beton.lead`, `faq.home` и т.д.
Нужен, чтобы тексты разных сайтов сети не совпадали.
