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
import * as validate from './validate.js';

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
  if (o.kind === 'preorder') return false; // предзаказ шьётся под заказ, склад не трогает
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

// Заказы в кабинете: оформленные из аккаунта и оформленные без входа на подтверждённые почту или телефон.
export function forUser(user) {
  const digits = (p) => String(p || '').replace(/\D/g, '').slice(-10);
  return list.filter((o) => o.userId === user.id
    || (user.email && o.customer.email === user.email)
    || (user.phone && digits(o.customer.phone) === digits(user.phone)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export const STATUS = { pending_payment: 'Ожидает оплаты', paid: 'Оплачен', preorder_paid: 'Предзаказ оплачен на 50%', awaiting_balance: 'Ожидает доплаты', shipped: 'Передан в доставку', done: 'Получен', cancelled: 'Отменён' };

function newId() {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `WM-${ymd}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
}

const clean = (v, max = 200) => String(v ?? '').trim().slice(0, max);

export function create(input, user = null) {
  const c = input?.customer || {};
  const customer = {
    name: clean(c.name, 120), email: clean(c.email, 120).toLowerCase(),
    phone: clean(c.phone, 30), comment: clean(c.comment, 1000),
    newsletter: Boolean(c.newsletter),
  };
  const delivery = { method: clean(input?.delivery?.method, 20), address: clean(input?.delivery?.address, 300) };

  if (customer.name.length < 2) return { error: 'Укажите имя и фамилию' };
  if (!validate.email(customer.email)) return { error: 'Проверьте email' };
  customer.phone = validate.phone(customer.phone);
  if (!customer.phone) return { error: 'Проверьте телефон' };
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
  // Размер в наличии продаётся обычно, закончившийся идёт в предзаказ. Браузер присылает, что видел
  // покупатель (preorder: true/false): если, пока он оформлял, размер закончился, не превращаем
  // покупку молча в предзаказ, а просим подтвердить.
  const expected = new Map(raw.map((it) => [`${clean(it.productId, 80)}|${clean(it.size, 10)}`, it.preorder === true]));
  const items = [];
  for (const [key, qty] of merged) {
    const [productId, size] = key.split('|');
    const p = catalog.byId(productId);
    const v = p && p.variants.find((x) => x.size === size);
    if (!v) return { error: 'Товар из корзины больше не продаётся, обновите страницу' };
    const left = catalog.available(productId, size);
    const preorder = left <= 0;
    if (preorder !== expected.get(key)) {
      return { error: preorder ? `${p.title}, ${size}: закончился, доступен предзаказ. Обновите страницу` : `${p.title}, ${size}: снова в наличии. Обновите страницу`, soldOut: { productId, size, left } };
    }
    if (!preorder && left < qty) return { error: `${p.title}, ${size}: осталось ${left} шт.`, soldOut: { productId, size, left } };
    items.push({ productId, title: p.title, size, qty, price: v.price, sum: v.price * qty, preorder });
  }
  if (!items.length) return { error: 'Корзина пуста' };
  const pre = items.filter((l) => l.preorder).length;
  if (pre && pre < items.length) return { error: 'Предзаказ и вещи в наличии оформляются отдельными заказами' };
  const kind = pre ? 'preorder' : 'stock';

  const total = items.reduce((s, l) => s + l.sum, 0) + dm.price;
  // У предзаказа сейчас платится половина, вторая половина ссылкой перед отправкой.
  const dueNow = kind === 'preorder' ? catalog.deposit(total) : total;
  const order = {
    id: newId(), createdAt: new Date().toISOString(), status: 'pending_payment', userId: user?.id || null,
    kind, customer, delivery: { ...delivery, title: dm.title, price: dm.price },
    items, total, dueNow, balance: total - dueNow,
    ...(kind === 'preorder' ? { shipNote: catalog.PREORDER.note } : {}),
    payment: null, moyskladId: null, yandexDeliveryId: null,
  };
  list.push(order);
  save();
  return { id: order.id, total, dueNow, status: order.status };
}
