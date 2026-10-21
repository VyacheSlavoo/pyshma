// Тестовые «фото» для проверки вёрстки: нейтральные градиенты с подписью. Только для --fixture, в прод не идут.
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'content', 'photos');
fs.mkdirSync(dir, { recursive: true });
const items = { hero: ['#27415f', '#7f6a54'], plant: ['#3a4f66', '#9a8a76'], fleet: ['#33485f', '#b59a6f'], lab: ['#41566b', '#8aa0b4'], object: ['#4a4036', '#a88f70'] };
for (const [name, [a, b]] of Object.entries(items)) {
  const w = 1920, h = 1280;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/><text x="50%" y="50%" fill="rgba(255,255,255,.35)" font-family="DejaVu Sans, sans-serif" font-size="64" text-anchor="middle">ТЕСТОВОЕ ФОТО · ${name}</text></svg>`;
  await sharp(Buffer.from(svg)).jpeg({ quality: 82 }).toFile(path.join(dir, `${name}.jpg`));
}
console.log('fixture photos ok');
