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
    id: p.id, title: p.title, price: p.price, images: p.images, category: p.category, color: p.color, group: p.group,
    variants: p.variants.map((v) => ({ size: v.size, price: v.price, inStock: available(p.id, v.size) > 0 })),
  }));
}

// Поиск. Названия на английском, ищут по-русски, поэтому словарь синонимов.
// Плюс исправление раскладки: "[elb" это "худи", набранное в английской раскладке.
const SYNONYMS = {
  'худи': ['hoodie', 'худи'], 'толстовк': ['hoodie', 'худи'], 'кофт': ['hoodie', 'худи'],
  'футбол': ['t-shirt', 'футболки'], 'майк': ['t-shirt', 'футболки'], 'tee': ['t-shirt'], 'тишк': ['t-shirt'],
  'штан': ['pants', 'штаны'], 'брюк': ['pants', 'штаны'], 'джогг': ['pants', 'штаны'],
  'шорт': ['shorts', 'шорты'],
};
const EN = "qwertyuiop[]asdfghjkl;'zxcvbnm,.";
const RU = 'йцукенгшщзхъфывапролджэячсмитьбю';
const fromLatinLayout = (s) => [...s].map((c) => { const i = EN.indexOf(c); return i >= 0 ? RU[i] : c; }).join('');
const norm = (s) => String(s).toLowerCase().replace(/ё/g, 'е').replace(/<[^>]+>/g, ' ');

function terms(q) {
  const out = [];
  for (const w of norm(q).split(/\s+/).filter((x) => x.length >= 2)) {
    const variants = new Set([w]);
    if (/^[a-z;'\[\],.]+$/.test(w)) variants.add(fromLatinLayout(w));
    for (const v of [...variants]) for (const [k, list] of Object.entries(SYNONYMS)) if (v.startsWith(k) || k.startsWith(v)) list.forEach((x) => variants.add(x));
    out.push([...variants]);
  }
  return out;
}

export function search(q) {
  const t = terms(q);
  if (!t.length) return [];
  const found = load().map((p) => {
    const title = norm(p.title), cats = norm(p.category.join(' ')), text = norm(p.description);
    let score = 0;
    for (const variants of t) {
      let best = 0;
      for (const v of variants) best = Math.max(best, title.includes(v) ? 3 : cats.includes(v) ? 2 : text.includes(v) ? 1 : 0);
      if (!best) return null; // все слова запроса должны найтись
      score += best;
    }
    return { p, score };
  }).filter(Boolean);
  // Если есть совпадения в названии или категории, упоминания в описании не показываем.
  const strong = found.filter((x) => x.score >= t.length * 2);
  return (strong.length ? strong : found).sort((a, b) => b.score - a.score).map((x) => x.p);
}

// Цвета одной модели: худи в двух цветах это два товара с одинаковым group.
export function siblings(p) {
  return load().filter((x) => x.group && x.group === p.group);
}
