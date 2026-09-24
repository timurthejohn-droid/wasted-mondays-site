// Каталог товаров. Сейчас источник data/products.json (выгрузка из Тильды),
// позже его будет заполнять синхронизация с МойСклад.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { reservedQty } from './orders.js';

const FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data/products.json');

let cache = null;
let cacheMtime = 0;

// Перечитываем файл, если он изменился: правки каталога видны без перезапуска.
function load() {
  const mtime = fs.statSync(FILE).mtimeMs;
  if (!cache || mtime !== cacheMtime) {
    cache = JSON.parse(fs.readFileSync(FILE, 'utf8')).products;
    cacheMtime = mtime;
  }
  return cache;
}

export const all = () => load();
export const byId = (id) => load().find((p) => p.id === id) || null;
export const byTildaUid = (uid) => load().find((p) => String(p.tildaUid) === String(uid)) || null;

// Сколько можно продать прямо сейчас: остаток минус то, что уже лежит в неоплаченных
// и ещё не переданных на склад заказах.
export function available(productId, size) {
  const p = byId(productId);
  const v = p && p.variants.find((x) => x.size === size);
  if (!v) return 0;
  return Math.max(0, v.stock - reservedQty(productId, size));
}

export function categories() {
  const set = new Set();
  for (const p of load()) for (const c of p.category) if (c && c !== 'Товары интернет-магазинов') set.add(c);
  return [...set];
}

// Что отдаём браузеру: без точных остатков, только "есть / нет".
export function publicList() {
  return load().map((p) => ({
    id: p.id, title: p.title, price: p.price, images: p.images, category: p.category,
    variants: p.variants.map((v) => ({ size: v.size, price: v.price, inStock: available(p.id, v.size) > 0 })),
  }));
}
