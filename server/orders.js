// Заказы. Хранятся в data/orders.json, пока нет МойСклад и оплаты.
//
// Резерв: неоплаченный заказ держит товар PAYMENT_TTL минут, оплаченный держит,
// пока не передан в МойСклад (там резерв ставит уже сам склад).
// Node однопоточный, поэтому проверка остатка и запись заказа в create()
// идут без переключений, и две покупки последней вещи не проскочат одновременно.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import * as catalog from './catalog.js';

const FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data/orders.json');
const PAYMENT_TTL_MIN = 20;
const MAX_QTY_PER_ITEM = 5;
const MAX_LINES = 20;

export const DELIVERY = {
  pickup: { title: 'Самовывоз, Литейный пр., 41', price: 0, needsAddress: false },
  courier: { title: 'Курьером до двери', price: 0, needsAddress: true },
  pvz: { title: 'До пункта выдачи', price: 0, needsAddress: true },
};

let list = load();

function load() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return []; }
}
function save() {
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(list, null, 2));
  fs.renameSync(tmp, FILE);
}

function holdsStock(o, now = Date.now()) {
  if (o.status === 'pending_payment') return now - Date.parse(o.createdAt) < PAYMENT_TTL_MIN * 60_000;
  if (o.status === 'paid') return !o.moyskladId;
  return false;
}

export function reservedQty(productId, size) {
  const now = Date.now();
  let n = 0;
  for (const o of list) {
    if (!holdsStock(o, now)) continue;
    for (const l of o.items) if (l.productId === productId && l.size === size) n += l.qty;
  }
  return n;
}

export const get = (id) => list.find((o) => o.id === id) || null;

function newId() {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `WM-${ymd}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
}

const clean = (v, max = 200) => String(v ?? '').trim().slice(0, max);

export function create(input) {
  const c = input?.customer || {};
  const customer = {
    name: clean(c.name, 120), email: clean(c.email, 120).toLowerCase(),
    phone: clean(c.phone, 30), comment: clean(c.comment, 1000),
    newsletter: Boolean(c.newsletter),
  };
  const delivery = { method: clean(input?.delivery?.method, 20), address: clean(input?.delivery?.address, 300) };

  if (customer.name.length < 2) return { error: 'Укажите имя и фамилию' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) return { error: 'Проверьте email' };
  if (customer.phone.replace(/\D/g, '').length < 10) return { error: 'Проверьте телефон' };
  const dm = DELIVERY[delivery.method];
  if (!dm) return { error: 'Выберите способ доставки' };
  if (dm.needsAddress && delivery.address.length < 5) return { error: 'Укажите адрес доставки' };
  if (input?.consent !== true) return { error: 'Нужно согласие с офертой и политикой конфиденциальности' };

  const raw = Array.isArray(input?.items) ? input.items.slice(0, MAX_LINES) : [];
  if (!raw.length) return { error: 'Корзина пуста' };

  // Цена всегда берётся из каталога на сервере, а не из браузера.
  const merged = new Map();
  for (const it of raw) {
    const key = `${clean(it.productId, 80)}|${clean(it.size, 10)}`;
    const qty = Math.floor(Number(it.qty));
    if (!Number.isFinite(qty) || qty < 1) continue;
    merged.set(key, Math.min(MAX_QTY_PER_ITEM, (merged.get(key) || 0) + qty));
  }
  const items = [];
  for (const [key, qty] of merged) {
    const [productId, size] = key.split('|');
    const p = catalog.byId(productId);
    const v = p && p.variants.find((x) => x.size === size);
    if (!v) return { error: 'Товар из корзины больше не продаётся, обновите страницу' };
    const left = catalog.available(productId, size);
    if (left < qty) {
      return { error: left ? `${p.title}, ${size}: осталось ${left} шт.` : `${p.title}, ${size}: закончился`, soldOut: { productId, size, left } };
    }
    items.push({ productId, title: p.title, size, qty, price: v.price, sum: v.price * qty });
  }
  if (!items.length) return { error: 'Корзина пуста' };

  const total = items.reduce((s, l) => s + l.sum, 0) + dm.price;
  const order = {
    id: newId(), createdAt: new Date().toISOString(), status: 'pending_payment',
    customer, delivery: { ...delivery, title: dm.title, price: dm.price },
    items, total, payment: null, moyskladId: null, yandexDeliveryId: null,
  };
  list.push(order);
  save();
  return { id: order.id, total, status: order.status };
}
