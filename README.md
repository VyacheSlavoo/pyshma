# Сайт бетонного завода

Генератор статического сайта (Node 20+, без фреймворков). Контент лежит в `content/*.json`, шаблоны в `src/`.

```
npm install
npm run build:fixture   # сборка на вымышленных данных для проверки вёрстки (dist-fixture/, noindex)
npm run build           # боевая сборка в dist/; падает, пока бриф не заполнен
```

Описание данных: `docs/BRIEF.md`. Техническое задание: `docs/TZ-master-prompt.md`.
Состояние работы и что осталось: `HANDOFF.md`.
