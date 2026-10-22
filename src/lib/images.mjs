// Обработка фото: webp 480/800/1200/1600 с хешем в имени, OG-картинка, логотип, favicon.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

const WIDTHS = [480, 800, 1200, 1600];
const hash = (buf) => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 8);

export async function processPhotos(photos, outDir) {
  const images = new Map();
  const dir = path.join(outDir, 'assets', 'img');
  fs.mkdirSync(dir, { recursive: true });
  for (const p of photos) {
    const src = fs.readFileSync(p.abs);
    const id = hash(src);
    const base = path.basename(p.file, path.extname(p.file)).toLowerCase().replace(/[^a-z0-9-]+/g, '-');
    const meta = await sharp(src).rotate().metadata();
    const natural = meta.autoOrient ? meta.autoOrient.width : meta.width;
    const variants = [];
    for (const w of WIDTHS) {
      if (w > natural && variants.length) break;
      const width = Math.min(w, natural);
      const name = `${base}-${width}.${id}.webp`;
      const info = await sharp(src).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 76, effort: 4 }).toFile(path.join(dir, name));
      variants.push({ w: info.width, h: info.height, url: `/assets/img/${name}` });
    }
    const last = variants.at(-1);
    images.set(p.file, { w: last.w, h: last.h, alt: p.alt, variants, full: last.url, role: p.role, src });
  }
  return images;
}

export async function brandAssets({ brand, hero, outDir }) {
  // монограмма из первых букв слов названия: «Бетон Микс» → БМ
  const initials = brand.trim().split(/\s+/).slice(0, 2).map((w) => [...w][0].toUpperCase()).join('');
  const dir = path.join(outDir, 'assets');
  const mono = (size) => `<svg xmlns="http://www.w3.org/2000/svg"${size ? ` width="${size}" height="${size}"` : ''} viewBox="0 0 64 64"><rect width="64" height="64" fill="#1F4E9E"/><text x="32" y="43" text-anchor="middle" font-family="DejaVu Sans,Arial,sans-serif" font-weight="700" font-size="${initials.length > 1 ? 28 : 38}" fill="#fff">${initials}</text></svg>`;
  const svg = mono();
  const favicon = `favicon.${hash(Buffer.from(svg))}.svg`;
  fs.writeFileSync(path.join(dir, favicon), svg);
  // логотип для schema.org: PNG 512×512
  // favicon.ico в корне нужен Яндексу; PNG внутри .ico принимают все современные браузеры
  fs.writeFileSync(path.join(outDir, 'favicon.ico'), await sharp(Buffer.from(mono(48))).png().toBuffer());
  const touchBuf = await sharp(Buffer.from(mono(180))).png().toBuffer();
  const touch = `apple-touch-icon.${hash(touchBuf)}.png`;
  fs.writeFileSync(path.join(dir, touch), touchBuf);
  const logoBuf = await sharp(Buffer.from(mono(512))).png().toBuffer();
  const logo = `logo.${hash(logoBuf)}.png`;
  fs.writeFileSync(path.join(dir, logo), logoBuf);
  // OG 1200×630 из hero-фото
  const ogBuf = await sharp(hero.src).rotate().resize(1200, 630, { fit: 'cover', position: 'attention' }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  const og = `og.${hash(ogBuf)}.jpg`;
  fs.writeFileSync(path.join(dir, og), ogBuf);
  return { favicon: `/assets/${favicon}`, touch: `/assets/${touch}`, logo: `/assets/${logo}`, og: `/assets/${og}` };
}
