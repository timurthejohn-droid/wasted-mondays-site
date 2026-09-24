// Подписчики из попапа "Ранний доступ к дропу". Хранятся в data/subscribers.json (в git не попадает).
// В день дропа из этого файла берётся список, кому отправить закрытую ссылку.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as validate from './validate.js';

const FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data/subscribers.json');
let list = (() => { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return []; } })();

function save() {
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(list, null, 2));
  fs.renameSync(tmp, FILE);
}

const clean = (v, max) => String(v ?? '').trim().slice(0, max);

export function subscribe(input, user = null) {
  const email = validate.email(input?.email);
  const rawPhone = clean(input?.phone, 30);
  const phone = rawPhone ? validate.phone(rawPhone) : '';
  if (!email) return { error: 'Проверьте почту' };
  if (phone === null) return { error: 'Проверьте телефон или оставьте поле пустым' };
  if (input?.consent !== true) return { error: 'Нужно согласие на обработку персональных данных' };
  const now = new Date().toISOString();
  const found = list.find((s) => s.email === email);
  // Повторная подписка не дублирует запись, только дописывает телефон, если его не было.
  if (found) { if (phone && !found.phone) { found.phone = phone; save(); } return { ok: true }; }
  list.push({ email, phone, source: clean(input?.source, 40) || 'popup', page: clean(input?.page, 200), userId: user?.id || null, consentAt: now, createdAt: now });
  save();
  return { ok: true };
}
