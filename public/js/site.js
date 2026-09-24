// Wasted Mondays: слайдер, ленты, поиск, корзина, избранное, кабинет, оформление заказа.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const money = (n) => `${Math.round(n).toLocaleString('ru-RU').replace(/ /g, ' ')} ₽`;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const model = (t) => String(t).replace(/^Wasted\s+/i, '');
  const plural = (n, a, b, c) => { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 12 || h > 14) ? b : c; };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // На GitHub Pages сайт живёт в подпапке (/wasted-mondays-site) и без сервера: B это префикс ссылок,
  // STATIC включает демо-режим (товары из файла, поиск в браузере, заказы и вход отключены).
  const B = document.documentElement.dataset.base || '';
  const STATIC = document.documentElement.dataset.static === '1';
  const loggedIn = document.body.dataset.user === '1';
  // Предзаказ: размер не в наличии. Срок и доля предоплаты приходят с сервера.
  const PRE_NOTE = document.body.dataset.preNote || '';
  const deposit = (sum) => Math.round(sum * (Number(document.body.dataset.preShare) || 0.5));
  const post = (url, data) => STATIC ? Promise.reject(new Error('Это демо-версия сайта для команды: заказы и вход здесь не работают')) : fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    .then(async (r) => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'Что-то пошло не так'); return d; });

  // localStorage может быть недоступен (приватный режим), тогда работаем без сохранения.
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };

  let toastTimer;
  function toast(html) {
    const t = $('[data-toast]');
    t.innerHTML = html; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2800);
  }

  // Телефон: выбор страны с кодом, маска номера, в форму уходит +79991234567.
  // Почта: строгий формат и подсказка при опечатке в домене (gmial.com → gmail.com).
  const COUNTRIES = (() => { try { return JSON.parse($('#wm-countries').textContent); } catch { return []; } })();
  const flag = (iso) => iso.toUpperCase().replace(/./g, (c) => String.fromCodePoint(0x1f1a5 + c.charCodeAt(0)));
  const phoneRule = (code, n) => COUNTRIES.filter((c) => c[2] === code).find((c) => !c[4] || !n || c[4].includes(n[0])) || COUNTRIES.find((c) => c[2] === code);
  const phoneValid = (code, n) => {
    const rules = COUNTRIES.filter((c) => c[2] === code);
    if (!rules.length) return (code + n).length >= 8 && (code + n).length <= 15;
    return rules.some(([, , , lens, first]) => lens.includes(n.length) && (!first || first.includes(n[0])));
  };
  const maskPhone = (code, n) => {
    if (code === '7') return n.replace(/^(\d{0,3})(\d{0,3})(\d{0,2})(\d{0,2}).*/, (m, a, b, c, d) => [a && `(${a}${a.length === 3 ? ')' : ''}`, b, c && `-${c}`, d && `-${d}`].filter(Boolean).join(' ').replace(' -', '-').replace(' -', '-'));
    return n.replace(/(\d{3})(?=\d)/g, '$1 ');
  };
  function enhancePhone(input) {
    if (input.readOnly || input.dataset.phoneReady) return;
    input.dataset.phoneReady = '1';
    const field = input.closest('.field'), name = input.name;
    field.classList.add('field--tel');
    const hidden = document.createElement('input');
    hidden.type = 'hidden'; hidden.name = name; input.removeAttribute('name'); input.after(hidden);
    input.setAttribute('inputmode', 'tel'); input.autocomplete = 'tel-national';
    const pick = document.createElement('div');
    pick.className = 'tel__pick';
    pick.innerHTML = `<span data-tel-view></span><select aria-label="Код страны">${COUNTRIES.map(([iso, title, code]) => `<option value="${iso}">${flag(iso)} ${title} +${code}</option>`).join('')}<option value="other">Другая страна</option></select>`;
    field.prepend(pick);
    const sel = $('select', pick), view = $('[data-tel-view]', pick);
    let code = '7';
    const sync = () => {
      const other = sel.value === 'other';
      let d = input.value.replace(/\D/g, '');
      if (other) { hidden.value = d ? `+${d}` : ''; input.value = d ? `+${d.slice(0, 15)}` : ''; view.textContent = '🌐 +'; width(); return; }
      if (code === '7' && d.length === 11 && /^[78]/.test(d)) d = d.slice(1);
      const lens = COUNTRIES.filter((c) => c[2] === code).flatMap((c) => c[3]);
      d = d.slice(0, Math.max(...lens));
      input.value = maskPhone(code, d);
      hidden.value = d ? `+${code}${d}` : '';
      input.dataset.valid = d && phoneValid(code, d) ? '1' : '';
      const r = phoneRule(code, d); if (r && sel.value !== r[0] && COUNTRIES.find((c) => c[0] === sel.value)?.[2] === code) sel.value = r[0];
      view.textContent = `${flag(sel.value)} +${code}`;
      width();
    };
    // Ширина блока с кодом разная (+7 и +375), под неё сдвигаем текст поля.
    const width = () => { if (pick.offsetWidth) field.style.setProperty('--tel-w', `${pick.offsetWidth}px`); };
    input.addEventListener('focus', width);
    // Вставили номер целиком с кодом ("+375 29 ...", "8 999 ..."): сами выбираем страну.
    const fromFull = (raw) => {
      let d = String(raw).replace(/\D/g, '');
      if (!String(raw).trim().startsWith('+') && d.length === 11 && d[0] === '8') d = '7' + d.slice(1);
      const hit = COUNTRIES.filter((c) => d.startsWith(c[2]) && c[3].includes(d.length - c[2].length)).sort((a, b) => b[2].length - a[2].length)[0];
      if (!hit) return false;
      code = hit[2]; sel.value = phoneRule(code, d.slice(code.length))[0]; input.value = d.slice(code.length); return true;
    };
    sel.addEventListener('change', () => { if (sel.value !== 'other') code = COUNTRIES.find((c) => c[0] === sel.value)[2]; sync(); input.focus(); });
    // Начали вводить с "+": пока код не распознан, поле в режиме "Другая страна", потом само переключится.
    input.addEventListener('input', () => {
      if (/^\s*\+/.test(input.value) && !fromFull(input.value) && sel.value !== 'other') sel.value = 'other';
      sync();
    });
    input.addEventListener('paste', (e) => { const t = e.clipboardData.getData('text'); if (/^\s*(\+|8\d{10})/.test(t.replace(/[\s()-]/g, '')) && fromFull(t)) { e.preventDefault(); sync(); } });
    if (input.value) fromFull(input.value.startsWith('+') ? input.value : `+${input.value}`);
    sync();
  }

  const MAIL_DOMAINS = ['gmail.com', 'mail.ru', 'yandex.ru', 'ya.ru', 'icloud.com', 'bk.ru', 'inbox.ru', 'list.ru', 'rambler.ru', 'internet.ru', 'outlook.com', 'hotmail.com', 'yahoo.com', 'me.com', 'yandex.com', 'proton.me'];
  const MAIL_KNOWN = ['gmx.com', 'gmx.de', 'gmx.net', 'live.com', 'msn.com', 'mac.com', 'aol.com', 'mail.ua', 'ukr.net', 'i.ua', 'tut.by', 'yandex.kz', 'yandex.by', 'yandex.ua', 'mail.kz', 'inbox.lv', 'yahoo.co.uk', 'hotmail.co.uk', 'outlook.de', 'web.de'];
  const MAIL_FIX = { 'gmail.ru': 'gmail.com', 'gmai.ru': 'gmail.com', 'yandex.com.ru': 'yandex.ru', 'yandeх.ru': 'yandex.ru', 'mail.com.ru': 'mail.ru' };
  const lev = (a, b) => { const m = [...Array(b.length + 1).keys()]; for (let i = 1; i <= a.length; i++) { let p = m[0]; m[0] = i; for (let j = 1; j <= b.length; j++) { const t = m[j]; m[j] = Math.min(m[j] + 1, m[j - 1] + 1, p + (a[i - 1] === b[j - 1] ? 0 : 1)); p = t; } } return m[b.length]; };
  const emailValid = (e) => /^[a-z0-9._%+-]{1,64}@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/i.test(e) && !/^\.|\.\.|\.@/.test(e);
  function emailSuggest(e) {
    const [local, domain] = e.toLowerCase().split('@');
    if (!domain || MAIL_DOMAINS.includes(domain) || MAIL_KNOWN.includes(domain)) return '';
    if (MAIL_FIX[domain]) return `${local}@${MAIL_FIX[domain]}`;
    let best = '', d = 3;
    for (const x of MAIL_DOMAINS) { const k = lev(domain, x); if (k < d) { d = k; best = x; } }
    // "gmailcom", "gmail.co", "yandx.ru": близко к популярному домену, но не он.
    return best && (d <= 2 || domain.replace(/\./g, '') === best.replace(/\./g, '')) ? `${local}@${best}` : '';
  }
  // Покупатель нажал «Нет, всё верно» под подсказкой: сервер тогда не переспрашивает про опечатку.
  const mailConfirmed = (form) => $$('input[type=email]', form).some((i) => i.dataset.ignored && i.dataset.ignored === i.value.trim());

  function fieldHint(input, html) {
    const field = input.closest('.field');
    let h = field.nextElementSibling?.classList.contains('field__hint') ? field.nextElementSibling : null;
    if (!html) { h?.remove(); return; }
    if (!h) { h = document.createElement('p'); h.className = 'field__hint'; field.after(h); }
    h.innerHTML = html;
  }
  function checkEmail(input, strict) {
    const v = input.value.trim();
    input.value = v;
    if (!v) { fieldHint(input, ''); return true; }
    if (!emailValid(v)) { fieldHint(input, 'Похоже, в адресе ошибка. Пример: name@gmail.com'); return false; }
    const s = emailSuggest(v);
    if (s && input.dataset.ignored !== v) {
      fieldHint(input, `Возможно, вы имели в виду <button type="button" class="link" data-mail-fix="${esc(s)}">${esc(s)}</button>? <button type="button" class="link link--muted" data-mail-keep>Нет, всё верно</button>`);
      return !strict;
    }
    fieldHint(input, '');
    return true;
  }
  document.addEventListener('click', (e) => {
    const fix = e.target.closest('[data-mail-fix]'), keep = e.target.closest('[data-mail-keep]');
    if (!fix && !keep) return;
    const input = $('input[type=email]', e.target.closest('.field__hint').previousElementSibling);
    if (fix) input.value = fix.dataset.mailFix; else input.dataset.ignored = input.value;
    fieldHint(input, ''); input.classList.remove('is-invalid');
  });
  document.addEventListener('focusout', (e) => { if (e.target.matches?.('input[type=email]:not([readonly])')) checkEmail(e.target, false); });

  // Перед отправкой любой формы: почта и телефон в видимых полях должны быть правильными.
  // Слушаем на document в фазе перехвата, поэтому это срабатывает раньше обработчиков самих форм.
  document.addEventListener('submit', (e) => {
    const form = e.target;
    const visible = (i) => !i.closest('[hidden]') && !i.readOnly;
    let bad = null;
    for (const i of $$('input[type=email]', form).filter(visible)) if (!checkEmail(i, true) && !bad) bad = i;
    for (const i of $$('input[data-phone-ready]', form).filter(visible)) {
      const empty = !i.value.trim(), other = $('select', i.closest('.field')).value === 'other';
      const ok = empty ? !i.required : other ? /^\+\d{8,15}$/.test(i.value.replace(/\s/g, '')) : i.dataset.valid === '1';
      fieldHint(i, ok ? '' : empty ? 'Укажите телефон' : 'Проверьте номер: не хватает цифр или неверный код страны');
      if (!ok && !bad) bad = i;
    }
    if (bad) { e.preventDefault(); e.stopImmediatePropagation(); bad.classList.add('is-invalid'); bad.focus(); }
  }, true);
  $$('input[type=tel]').forEach(enhancePhone);
  $$('input[type=email]').forEach((i) => { i.setAttribute('inputmode', 'email'); i.autocapitalize = 'off'; i.spellcheck = false; });

  // Каталог подгружаем один раз и только когда нужен.
  let productsPromise;
  const products = () => (productsPromise ??= fetch(STATIC ? `${B}/api/products.json` : '/api/products').then((r) => r.json())
    .then((list) => Object.fromEntries(list.map((p) => [p.id, p]))));

  // Корзина: [{ productId, size, qty }]
  const cart = {
    items: () => store.get('wm_cart', []),
    save(items) { store.set('wm_cart', items); renderBadges(); },
    add(productId, size) {
      const items = cart.items();
      const line = items.find((l) => l.productId === productId && l.size === size);
      if (line) line.qty = Math.min(5, line.qty + 1); else items.push({ productId, size, qty: 1 });
      cart.save(items);
      const fab = $('[data-fab]');
      if (fab) { fab.classList.remove('is-bump'); void fab.offsetWidth; fab.classList.add('is-bump'); }
    },
    count: () => cart.items().reduce((s, l) => s + l.qty, 0),
  };

  // Избранное хранится в браузере, а у вошедших ещё и в аккаунте.
  const favs = {
    list: () => store.get('wm_fav', []),
    set(l) { store.set('wm_fav', l); renderBadges(); },
    toggle(id) {
      const l = favs.list(); const i = l.indexOf(id);
      if (i >= 0) l.splice(i, 1); else l.push(id);
      favs.set(l);
      if (loggedIn) post('/api/account/favs', { favs: l }).catch(() => {});
      return i < 0;
    },
  };
  if (loggedIn) {
    fetch('/api/account').then((r) => r.json()).then(({ user }) => {
      if (!user) return;
      const local = favs.list(), merged = [...new Set([...(user.favs || []), ...local])];
      favs.set(merged);
      if (merged.length !== (user.favs || []).length) post('/api/account/favs', { favs: merged }).catch(() => {});
    }).catch(() => {});
  }

  function renderBadges() {
    const c = cart.count(), f = favs.list().length;
    $$('[data-cart-count]').forEach((b) => { b.textContent = c; if (b.classList.contains('badge')) b.hidden = !c; });
    $$('[data-fav-count]').forEach((b) => { b.textContent = f; b.hidden = !f; });
    const fab = $('[data-fab]');
    if (fab) fab.hidden = !c || Boolean($('[data-checkout]'));
    const on = new Set(favs.list());
    $$('[data-fav]').forEach((b) => {
      b.classList.toggle('is-on', on.has(b.dataset.fav));
      const l = b.querySelector('[data-fav-label]');
      if (l) l.textContent = on.has(b.dataset.fav) ? 'В избранном' : 'В избранное';
    });
  }

  // Выезжающие панели. Фильтры на десктопе всегда видны, поэтому у них свой класс вместо hidden.
  let lastFocus = null;
  function openDrawer(name) {
    const d = $(`[data-drawer="${name}"]`);
    if (!d) return;
    lastFocus = document.activeElement;
    closeSearch();
    if (d.classList.contains('drawer--filters')) d.classList.add('is-shown'); else d.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => d.classList.add('is-open')));
    document.body.style.overflow = 'hidden';
    setTimeout(() => $('[data-drawer-close]', d)?.focus({ preventScroll: true }), 60);
  }
  function closeDrawer(d) {
    if (!d || !d.classList.contains('is-open')) return;
    d.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(() => { if (d.classList.contains('drawer--filters')) d.classList.remove('is-shown'); else d.hidden = true; }, 400);
    lastFocus?.focus?.({ preventScroll: true });
  }
  document.addEventListener('click', (e) => {
    const open = e.target.closest('[data-drawer-open]');
    if (open) { e.preventDefault(); openDrawer(open.dataset.drawerOpen); return; }
    const close = e.target.closest('[data-drawer-close]');
    if (close) { closeDrawer(close.closest('.drawer')); return; }
    if (e.target.classList.contains('drawer')) closeDrawer(e.target);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { $$('.drawer.is-open').forEach(closeDrawer); closeSearch(); } });

  // Шапка: на главной прозрачная поверх баннера, белеет после него.
  const hdr = $('[data-hdr]');
  const hero = $('[data-hero]');
  const onScroll = () => {
    const solid = !hero || scrollY > hero.offsetHeight - hdr.offsetHeight - 40 || !$('[data-search]').hidden;
    hdr.classList.toggle('is-solid', solid);
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const here = location.pathname + location.search;
  $$('.hdr__nav a').forEach((a) => { if (a.getAttribute('href') === here) a.setAttribute('aria-current', 'page'); });

  // Серая полоса: на телефоне фразы сменяют друг друга.
  const perks = $$('[data-perks] a');
  if (perks.length > 1 && !reduced) {
    let pi = 0;
    setInterval(() => { perks[pi].classList.remove('is-active'); pi = (pi + 1) % perks.length; perks[pi].classList.add('is-active'); }, 4000);
  }

  // Поиск
  const search = $('[data-search]'), sInput = $('[data-search-input]'), sResults = $('[data-search-results]'), scrim = $('.search-scrim');
  let sTimer, sActive = -1;
  function openSearch() {
    search.hidden = false; scrim.hidden = false; onScroll();
    sInput.focus(); renderSearch(sInput.value);
  }
  function closeSearch() {
    if (!search || search.hidden) return;
    search.hidden = true; scrim.hidden = true; onScroll();
  }
  // Упрощённый поиск для демо-версии: те же синонимы, что на сервере.
  const SYN = { 'худи': 'hoodie', 'толстовк': 'hoodie', 'кофт': 'hoodie', 'футбол': 't-shirt', 'майк': 't-shirt', 'штан': 'pants', 'брюк': 'pants', 'шорт': 'shorts' };
  function localSearch(q, byId) {
    const words = q.toLowerCase().replace(/ё/g, 'е').split(/\s+/).filter((w) => w.length > 1);
    return Object.values(byId).filter((p) => {
      const hay = `${p.title} ${p.category.join(' ')}`.toLowerCase().replace(/ё/g, 'е');
      return words.every((w) => hay.includes(w) || Object.entries(SYN).some(([k, v]) => (w.startsWith(k) || k.startsWith(w)) && hay.includes(v)));
    }).slice(0, 6).map((p) => ({ id: p.id, title: p.title, price: p.price, image: p.images[0], category: p.category }));
  }
  async function renderSearch(q) {
    q = q.trim(); sActive = -1;
    if (q.length < 2) {
      const cats = [...new Set(Object.values(await products()).flatMap((p) => p.category))];
      sResults.innerHTML = `<p class="search__hint">Популярное</p><div class="search__pills">${cats.map((c) => `<a class="pill" href="${B}/catalog?cat=${encodeURIComponent(c)}">${esc(c)}</a>`).join('')}</div>`;
      return;
    }
    const list = STATIC ? localSearch(q, await products()) : await fetch(`/api/search?q=${encodeURIComponent(q)}`).then((r) => r.json()).catch(() => []);
    if (sInput.value.trim() !== q) return; // пришёл устаревший ответ
    sResults.innerHTML = list.length
      ? `<p class="search__hint">Товары</p><div class="search__list">${list.map((p) => `<a class="search__item" href="${B}/product/${esc(p.id)}">
          <img src="${esc(p.image)}" alt=""><span><b>${esc(model(p.title))}</b><small>${esc(p.category.join(', '))}</small></span><span>${money(p.price)}</span></a>`).join('')}</div>
         <a class="search__all" href="${STATIC ? `${B}/catalog` : `${B}/search?q=${encodeURIComponent(q)}`}">${STATIC ? 'Весь каталог →' : 'Все результаты →'}</a>`
      : `<p class="search__hint">Ничего не нашлось</p><p>Попробуйте «худи», «футболка» или «штаны».</p>`;
  }
  $$('[data-search-open]').forEach((b) => b.addEventListener('click', () => (search.hidden ? openSearch() : closeSearch())));
  $$('[data-search-close]').forEach((b) => b.addEventListener('click', closeSearch));
  sInput?.addEventListener('input', () => { clearTimeout(sTimer); sTimer = setTimeout(() => renderSearch(sInput.value), 150); });
  sInput?.addEventListener('keydown', (e) => {
    const items = $$('.search__item', sResults);
    if (!items.length || !['ArrowDown', 'ArrowUp', 'Enter'].includes(e.key)) return;
    if (e.key === 'Enter') { if (sActive >= 0) { e.preventDefault(); location.href = items[sActive].href; } return; }
    e.preventDefault();
    sActive = (sActive + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items.forEach((it, i) => it.classList.toggle('is-active', i === sActive));
  });

  // Избранное
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-fav]');
    if (!b) return;
    e.preventDefault();
    const on = favs.toggle(b.dataset.fav);
    toast(on ? `Добавлено в избранное. <a href="${B}/catalog?fav=1">Смотреть</a>` : 'Убрано из избранного');
    if ($('[data-catalog]')) applyFilters();
  });

  // Cookie: панель выезжает слева через секунду после загрузки.
  const cookie = $('[data-cookie]');
  if (cookie && !store.get('wm_cookie', null)) {
    cookie.hidden = false;
    setTimeout(() => cookie.classList.add('is-in'), 900);
  }
  $$('[data-cookie-ok]').forEach((b) => b.addEventListener('click', () => {
    store.set('wm_cookie', { choice: b.dataset.cookieOk, at: Date.now() });
    cookie.classList.remove('is-in');
    setTimeout(() => { cookie.hidden = true; }, 600);
  }));

  // Баннер на весь экран
  if (hero) {
    const slides = $$('[data-slide]', hero), bars = $$('.hero__bar', hero), idx = $('[data-hero-index]', hero);
    const MS = 6000;
    hero.style.setProperty('--slide-ms', `${MS}ms`);
    let i = 0, timer = null, paused = false, started = Date.now(), left = MS;
    const go = (n) => {
      slides[i].classList.remove('is-active');
      i = (n + slides.length) % slides.length;
      slides[i].classList.add('is-active');
      bars.forEach((b, k) => { b.classList.toggle('is-done', k < i); b.classList.remove('is-active'); });
      void bars[i].offsetWidth; bars[i].classList.add('is-active');
      idx.textContent = String(i + 1).padStart(2, '0');
      const nextImg = slides[(i + 1) % slides.length].querySelector('img');
      if (nextImg?.loading === 'lazy') nextImg.loading = 'eager';
      schedule(MS);
    };
    function schedule(ms) {
      clearTimeout(timer); left = ms; started = Date.now();
      if (!paused) timer = setTimeout(() => go(i + 1), ms);
    }
    function pause(on) {
      if (on === paused) return;
      paused = on; hero.classList.toggle('is-paused', on);
      if (on) { clearTimeout(timer); left = Math.max(300, left - (Date.now() - started)); } else schedule(left);
    }
    $('[data-hero-next]', hero).addEventListener('click', () => go(i + 1));
    $('[data-hero-prev]', hero).addEventListener('click', () => go(i - 1));
    bars.forEach((b) => b.addEventListener('click', () => go(+b.dataset.go)));
    // Паузы при наведении нет: баннер на весь экран, курсор почти всегда над ним, и фото стояли бы.
    document.addEventListener('visibilitychange', () => pause(document.hidden));
    let x0 = null, y0 = null;
    hero.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    hero.addEventListener('touchend', (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(i + (dx < 0 ? 1 : -1));
    });
    go(0);
  }

  // Ленты со стрелками
  function initRail(section) {
    const rail = $('[data-rail]', section) || $('[data-recent-list]', section);
    const prev = $('[data-rail-prev]', section), next = $('[data-rail-next]', section);
    if (!rail || !prev) return;
    const sync = () => {
      prev.disabled = rail.scrollLeft < 4;
      next.disabled = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 4;
    };
    prev.addEventListener('click', () => rail.scrollBy({ left: -rail.clientWidth * 0.9, behavior: 'smooth' }));
    next.addEventListener('click', () => rail.scrollBy({ left: rail.clientWidth * 0.9, behavior: 'smooth' }));
    rail.addEventListener('scroll', sync, { passive: true }); addEventListener('resize', sync); sync();
  }
  $$('.rail-section').forEach(initRail);

  // Карточка для блоков, которые собираются в браузере: та же разметка, что на сервере.
  const markSvg = '<svg class="mark" viewBox="-6 -6 225 157" aria-hidden="true"><use href="#wm-mark"/></svg>';
  const plusSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
  const cardHtml = (p, all) => {
    const sizes = p.variants.filter((v) => v.inStock).map((v) => v.size);
    const sibs = Object.values(all).filter((x) => x.group && x.group === p.group);
    const n = sibs.length || 1;
    const tag = !sizes.length ? '<span class="card__tag card__tag--sold">Sold out</span>' : sizes.length < p.variants.length ? '<span class="card__tag">Не все размеры</span>' : '';
    return `<article class="card${sizes.length ? '' : ' is-soldout'}" data-id="${esc(p.id)}">
      <div class="card__media"><a class="card__img" href="${B}/product/${esc(p.id)}" tabindex="-1"><span class="card__track" data-card-track>${p.images.slice(0, 5).map((src, i) => `<img src="${esc(src)}" alt="" loading="lazy"${i === 1 ? ' class="card__alt"' : ''}>`).join('')}</span></a>
        ${p.images.length > 1 ? `<span class="card__dots" aria-hidden="true">${p.images.slice(0, 5).map((_, i) => `<i${i ? '' : ' class="is-on"'}></i>`).join('')}</span>` : ''}
        ${tag}
        <button class="fav card__fav" type="button" aria-label="В избранное" data-fav="${esc(p.id)}">${markSvg}</button>
        <div class="quick" data-quick><button class="quick__plus" type="button" aria-label="Выбрать размер" aria-expanded="false" data-quick-toggle>${plusSvg}</button>
          <div class="quick__sizes">${sizes.length ? '' : '<span class="quick__label">Предзаказ</span>'}${p.variants.map((v) => `<button type="button" data-quick-add="${esc(p.id)}" data-size="${esc(v.size)}"${v.inStock ? '' : ` class="is-pre" aria-label="${esc(v.size)}, предзаказ"`}>${esc(v.size)}</button>`).join('')}</div></div>
      </div>
      <a class="card__info" href="${B}/product/${esc(p.id)}">
        <span class="card__row"><span class="card__title">${esc(model(p.title))}</span><span class="card__price">${money(p.price)}</span></span>
        ${p.color ? `<span class="card__color">${esc(p.color.name)}</span>
        <span class="card__swatches">${sibs.map((x) => `<i style="--c:${esc(x.color?.hex || '#ccc')}"${x.id === p.id ? ' class="is-current"' : ''}></i>`).join('')}<small>${n} ${plural(n, 'цвет', 'цвета', 'цветов')}</small></span>` : ''}
      </a></article>`;
  };

  // Быстрое добавление: "+" на карточке. На компьютере размеры выезжают при наведении, на телефоне по нажатию.
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-quick-toggle]');
    if (t) {
      const q = t.closest('[data-quick]'), open = !q.classList.contains('is-open');
      $$('[data-quick].is-open').forEach((x) => { x.classList.remove('is-open'); $('[data-quick-toggle]', x).setAttribute('aria-expanded', 'false'); });
      q.classList.toggle('is-open', open); t.setAttribute('aria-expanded', String(open));
      return;
    }
    const a = e.target.closest('[data-quick-add]');
    if (a) {
      e.preventDefault();
      a.closest('[data-quick]')?.classList.remove('is-open');
      addToBag(a.dataset.quickAdd, a.dataset.size);
      return;
    }
    if (!e.target.closest('[data-quick]')) $$('[data-quick].is-open').forEach((x) => x.classList.remove('is-open'));
  });

  // Листание фото в карточке пальцем: полоски внизу показывают, какое фото открыто.
  document.addEventListener('scroll', (e) => {
    const t = e.target;
    if (!t.matches?.('[data-card-track]')) return;
    const i = Math.round(t.scrollLeft / t.clientWidth);
    $$('.card__dots i', t.closest('.card__media')).forEach((d, k) => d.classList.toggle('is-on', k === i));
  }, true);

  // Вы недавно смотрели
  const pdp = $('[data-product]');
  const currentId = pdp ? JSON.parse(pdp.dataset.product).id : null;
  if (currentId) store.set('wm_recent', [currentId, ...store.get('wm_recent', []).filter((x) => x !== currentId)].slice(0, 12));
  const recent = $('[data-recent]');
  if (recent) {
    const ids = store.get('wm_recent', []).filter((x) => x !== currentId);
    if (ids.length) products().then((byId) => {
      const list = ids.map((id) => byId[id]).filter(Boolean);
      if (!list.length) return;
      $('[data-recent-list]', recent).innerHTML = list.slice(0, 4).map((p) => cardHtml(p, byId)).join('');
      recent.hidden = false; renderBadges();
    });
  }

  // Предзаказ и вещи в наличии оформляются разными заказами, поэтому в одну корзину их не смешиваем.
  const isPre = (byId, l) => !byId[l.productId]?.variants.find((v) => v.size === l.size)?.inStock;
  async function addToBag(id, size) {
    const byId = await products();
    const pre = isPre(byId, { productId: id, size });
    const lines = cart.items().filter((l) => byId[l.productId]);
    if (lines.some((l) => isPre(byId, l) !== pre)) {
      toast(pre ? 'Предзаказ оформляется отдельно от вещей в наличии. Сначала оформите корзину или очистите её'
        : 'В корзине предзаказ. Вещи в наличии оформляются отдельным заказом: сначала оформите или очистите корзину');
      showBag(false);
      return;
    }
    cart.add(id, size);
    showBag(true);
  }

  // Мини-корзина справа: количество и удаление прямо в ней, название и фото ведут в карточку.
  async function showBag(added) {
    $('[data-bag-title]').textContent = added ? 'Добавлено в корзину' : 'Корзина';
    $('[data-bag-body]').innerHTML = '<p class="empty">Загрузка…</p>';
    openDrawer('bag');
    renderBag(await products());
  }
  function renderBag(byId) {
    const body = $('[data-bag-body]'), foot = $('[data-bag-foot]'), recs = $('[data-bag-recs]');
    const all = cart.items();
    const lines = all.map((l, i) => ({ l, i })).filter(({ l }) => byId[l.productId]);
    if (!lines.length) { body.innerHTML = '<p class="empty">Корзина пуста.</p>'; foot.hidden = true; recs.hidden = true; return; }
    let total = 0;
    body.innerHTML = lines.map(({ l, i }) => {
      const p = byId[l.productId], v = p.variants.find((x) => x.size === l.size) || { price: p.price };
      const url = `${B}/product/${esc(p.id)}`;
      total += v.price * l.qty;
      return `<div class="mini"><a href="${url}" tabindex="-1"><img src="${esc(p.images[0])}" alt=""></a>
        <div><p class="mini__brand">Wasted Mondays</p><a class="mini__title" href="${url}">${esc(model(p.title))}</a>
        <p class="mini__meta">Размер ${esc(l.size)}</p>${isPre(byId, l) ? `<p class="mini__pre">Предзаказ · ${esc(PRE_NOTE)}</p>` : ''}<p class="mini__price">${money(v.price * l.qty)}</p>
        <div class="mini__actions"><div class="qty qty--sm"><button type="button" data-bag-dec="${i}" aria-label="Меньше">−</button><span>${l.qty}</span><button type="button" data-bag-inc="${i}" aria-label="Больше"${l.qty >= 5 ? ' disabled' : ''}>+</button></div>
        <button class="link mini__rm" type="button" data-bag-rm="${i}">Удалить</button></div></div></div>`;
    }).join('');
    $('[data-bag-total]').textContent = money(total);
    const pre = lines.some(({ l }) => isPre(byId, l));
    $('[data-bag-pre]').hidden = !pre;
    $('[data-bag-pre-now]').textContent = money(deposit(total));
    $('[data-bag-checkout]').textContent = pre ? 'Оформить предзаказ' : 'Оформить заказ';
    foot.hidden = false;
    const inCart = new Set(lines.map(({ l }) => l.productId));
    const others = Object.values(byId).filter((p) => !inCart.has(p.id) && p.variants.some((v) => v.inStock)).slice(0, 3);
    recs.hidden = !others.length;
    $('[data-bag-recs-list]').innerHTML = others.map((p) => `<a href="${B}/product/${esc(p.id)}"><img src="${esc(p.images[0])}" alt="">${esc(model(p.title))}<br><b>${money(p.price)}</b></a>`).join('');
  }
  $('[data-bag-body]')?.addEventListener('click', async (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    const items = cart.items(), d = t.dataset;
    if (d.bagInc) items[+d.bagInc].qty = Math.min(5, items[+d.bagInc].qty + 1);
    else if (d.bagDec) { const n = +d.bagDec; items[n].qty > 1 ? items[n].qty-- : items.splice(n, 1); }
    else if (d.bagRm) items.splice(+d.bagRm, 1);
    else return;
    cart.save(items);
    renderBag(await products());
  });
  if (!$('[data-checkout]')) {
    $('[data-bag-link]')?.addEventListener('click', (e) => { e.preventDefault(); showBag(false); });
    $('[data-fab]')?.addEventListener('click', (e) => { e.preventDefault(); showBag(false); });
  }

  // Каталог: фильтры и сортировка
  const grid = $('[data-catalog]');
  function applyFilters() {
    if (!grid) return;
    const checked = (n) => $$(`input[name="${n}"]:checked`).map((i) => i.value);
    const cats = checked('cat'), sizes = checked('size'), cols = checked('col');
    const instock = $('input[name=instock]')?.checked, onlyFav = $('input[name=fav]')?.checked;
    const fav = new Set(favs.list());
    let shown = 0;
    $$('.card', grid).forEach((c) => {
      const cs = c.dataset.cat.split('|'), ss = c.dataset.sizes ? c.dataset.sizes.split('|') : [];
      const ok = (!cats.length || cats.some((x) => cs.includes(x)))
        && (!sizes.length || sizes.some((x) => ss.includes(x)))
        && (!cols.length || cols.includes(c.dataset.col))
        && (!instock || ss.length > 0)
        && (!onlyFav || fav.has(c.dataset.id));
      c.hidden = !ok; if (ok) shown++;
    });
    $('[data-plp-count]').textContent = `${shown} ${plural(shown, 'товар', 'товара', 'товаров')}`;
    const colTitle = cols.length === 1 ? $(`input[name=col][value="${cols[0]}"]`)?.dataset.title : '';
    $('[data-plp-title]').textContent = onlyFav ? 'Избранное' : cats.length === 1 ? cats[0] : colTitle || 'Каталог';
    $('[data-empty]').hidden = shown > 0;
    $$('[data-pill]').forEach((p) => p.classList.toggle('is-active', cats.length <= 1 && p.dataset.pill === (cats[0] || '') && !onlyFav && !cols.length));
    const params = new URLSearchParams();
    cats.forEach((c) => params.append('cat', c));
    cols.forEach((c) => params.append('col', c));
    if (onlyFav) params.set('fav', '1');
    history.replaceState(null, '', params.toString() ? `?${params}` : location.pathname);
  }
  function applySort(mode) {
    const key = { order: (c) => +c.dataset.order, 'price-asc': (c) => +c.dataset.price, 'price-desc': (c) => -c.dataset.price }[mode];
    $$('.card', grid).sort((a, b) => key(a) - key(b) || a.dataset.order - b.dataset.order).forEach((c) => grid.appendChild(c));
  }
  if (grid) {
    const qs = new URLSearchParams(location.search);
    qs.getAll('cat').forEach((c) => { const i = $$('input[name=cat]').find((x) => x.value === c); if (i) i.checked = true; });
    qs.getAll('col').forEach((c) => { const i = $$('input[name=col]').find((x) => x.value === c); if (i) i.checked = true; });
    if (qs.get('fav')) $('input[name=fav]').checked = true;
    $('.filters').addEventListener('change', applyFilters);
    $$('[data-filters-reset]').forEach((b) => b.addEventListener('click', () => { $$('.filters input').forEach((i) => { i.checked = false; }); applyFilters(); }));
    $$('[data-pill]').forEach((p) => p.addEventListener('click', (e) => {
      e.preventDefault();
      $$('.filters input').forEach((i) => { i.checked = i.name === 'cat' && i.value === p.dataset.pill; });
      applyFilters();
    }));
    $('[data-sort]').addEventListener('change', (e) => applySort(e.target.value));
    applyFilters();
  }

  // Страница товара
  if (pdp) {
    const prod = JSON.parse(pdp.dataset.product);
    const track = $('[data-gallery]'), slides = $$('.pdp__slide', track), gIdx = $('[data-gindex]');
    const prevB = $('[data-gprev]'), nextB = $('[data-gnext]');
    const cur = () => Math.round(track.scrollLeft / track.clientWidth);
    const goTo = (n) => track.scrollTo({ left: track.clientWidth * Math.max(0, Math.min(slides.length - 1, n)), behavior: reduced ? 'auto' : 'smooth' });
    const syncG = () => { const n = cur(); gIdx.textContent = n + 1; prevB.disabled = n === 0; nextB.disabled = n === slides.length - 1; };
    track.addEventListener('scroll', syncG, { passive: true }); syncG();
    prevB.addEventListener('click', () => goTo(cur() - 1));
    nextB.addEventListener('click', () => goTo(cur() + 1));
    document.addEventListener('keydown', (e) => {
      if (e.target.matches('input, textarea, select') || $('.lightbox')) return;
      if (e.key === 'ArrowRight') goTo(cur() + 1);
      if (e.key === 'ArrowLeft') goTo(cur() - 1);
    });
    // Все фото крупно: кнопка в углу или клик по фото на компьютере.
    const openZoom = (from) => {
      const box = document.createElement('div');
      box.className = 'lightbox';
      box.innerHTML = `<button class="icon-btn" type="button" aria-label="Закрыть"><svg viewBox="0 0 24 24"><path d="M5 5l14 14M19 5L5 19"/></svg></button>`
        + $$('img', track).map((im) => `<img src="${im.src}" alt="${esc(im.alt)}">`).join('');
      document.body.appendChild(box); document.body.style.overflow = 'hidden';
      $$('img', box)[from]?.scrollIntoView();
      const close = () => { box.remove(); document.body.style.overflow = ''; document.removeEventListener('keydown', onKey); };
      const onKey = (k) => { if (k.key === 'Escape') close(); };
      box.addEventListener('click', close); document.addEventListener('keydown', onKey);
    };
    $('[data-gzoom]').addEventListener('click', () => openZoom(cur()));
    track.addEventListener('click', (e) => { if (e.target.matches('img') && !matchMedia('(max-width: 900px)').matches) openZoom(cur()); });
    // Панель "Описание / Доставка и возврат"
    const sheet = $('[data-sheet]');
    let sheetFrom = null;
    const sheetTab = (name) => {
      $$('[data-sheet-tab]', sheet).forEach((t) => t.setAttribute('aria-selected', String(t.dataset.sheetTab === name)));
      $$('[data-sheet-body]', sheet).forEach((b) => { b.hidden = b.dataset.sheetBody !== name; });
    };
    const openSheet = (name) => {
      sheetFrom = document.activeElement;
      sheetTab(name); sheet.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => sheet.classList.add('is-open')));
      document.body.style.overflow = 'hidden';
      setTimeout(() => $('[data-sheet-close]', sheet).focus({ preventScroll: true }), 60);
    };
    const closeSheet = () => {
      if (!sheet.classList.contains('is-open')) return;
      sheet.classList.remove('is-open'); document.body.style.overflow = '';
      setTimeout(() => { sheet.hidden = true; }, 450);
      sheetFrom?.focus?.({ preventScroll: true });
    };
    $$('[data-sheet-open]').forEach((b) => b.addEventListener('click', () => openSheet(b.dataset.sheetOpen)));
    $$('[data-sheet-tab]', sheet).forEach((t) => t.addEventListener('click', () => sheetTab(t.dataset.sheetTab)));
    $('[data-sheet-close]', sheet).addEventListener('click', closeSheet);
    sheet.addEventListener('click', (e) => { if (e.target === sheet) closeSheet(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });

    const sizes = $('.sizes', pdp), hint = $('[data-size-hint]', pdp);
    const picked = () => $('input[name=size]:checked', pdp)?.value;
    // Если в наличии один размер, выбираем его сразу.
    const avail = $$('input[name=size]:not([data-pre])', pdp);
    if (avail.length === 1) avail[0].checked = true;
    // Выбран размер под предзаказ: показываем условия и меняем текст кнопки.
    const allPre = !avail.length, preInfo = $('[data-pre-info]', pdp);
    const syncPre = () => {
      const pre = allPre || Boolean($('input[name=size]:checked', pdp)?.hasAttribute('data-pre'));
      preInfo.hidden = !pre;
      $('[data-add]', pdp).textContent = pre ? 'Оформить предзаказ' : 'Добавить в корзину';
      const bb = $('[data-buybar-add]'); if (bb) bb.textContent = pre ? 'Предзаказ' : 'В корзину';
    };
    sizes.addEventListener('change', () => { sizes.classList.remove('is-invalid'); hint.hidden = true; syncPre(); });
    syncPre();
    const add = () => {
      const size = picked();
      if (!size) {
        sizes.classList.add('is-invalid'); hint.hidden = false;
        sizes.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
        return;
      }
      addToBag(prod.id, size);
    };
    $('[data-add]', pdp)?.addEventListener('click', add);
    $('[data-buybar-add]')?.addEventListener('click', add);
    // Нижняя панель "В корзину" появляется, когда основная кнопка ушла из виду.
    const buybar = $('[data-buybar]'), mainBtn = $('[data-add]', pdp);
    if (buybar && mainBtn && 'IntersectionObserver' in window) {
      buybar.hidden = false;
      new IntersectionObserver(([e]) => buybar.classList.toggle('is-shown', !e.isIntersecting && e.boundingClientRect.top < 0))
        .observe(mainBtn);
    }
  }

  // Вход и регистрация
  const authForm = $('[data-auth-form]');
  if (authForm) {
    const err = $('[data-auth-error]', authForm);
    const step = (n) => $$('[data-step]', authForm).forEach((s) => { s.hidden = s.dataset.step !== String(n); });
    const target = () => (authForm.dataset.channel === 'email' ? $('#a-email').value : authForm.elements.phone.value);
    const showErr = (m) => { err.textContent = m; err.hidden = !m; };
    $$('[data-auth-tab]').forEach((t) => t.addEventListener('click', () => {
      authForm.dataset.channel = t.dataset.authTab;
      $$('[data-auth-tab]').forEach((x) => { x.classList.toggle('is-active', x === t); x.setAttribute('aria-selected', x === t); });
      $$('[data-for]', authForm).forEach((f) => { f.hidden = f.dataset.for !== t.dataset.authTab; });
      step(1); showErr('');
    }));
    $('[data-auth-back]', authForm).addEventListener('click', () => { step(1); showErr(''); });
    authForm.addEventListener('submit', async (e) => {
      e.preventDefault(); showErr('');
      const onStep1 = !$('[data-step="1"]', authForm).hidden;
      const btn = $(`[data-step="${onStep1 ? 1 : 2}"] button[type=submit]`, authForm);
      btn.disabled = true;
      try {
        if (onStep1) {
          if (!authForm.elements.consent.checked) throw new Error('Нужно согласие на обработку персональных данных');
          const r = await post('/api/auth/code', { channel: authForm.dataset.channel, to: target(), consent: true, emailConfirmed: mailConfirmed(authForm) });
          $('[data-sent]', authForm).textContent = `Код отправлен на ${r.to}`;
          const test = $('[data-test-code]', authForm);
          test.hidden = !r.testCode;
          if (r.testCode) test.textContent = `Тестовый режим: отправка ещё не подключена, ваш код ${r.testCode}`;
          step(2); $('#a-code').value = ''; $('#a-code').focus();
        } else {
          const r = await post('/api/auth/verify', { channel: authForm.dataset.channel, to: target(), code: $('#a-code').value, next: authForm.dataset.next, favs: favs.list() });
          location.href = B + (r.next || '/account');
          return;
        }
      } catch (ex) { showErr(ex.message); }
      btn.disabled = false;
    });
  }

  // Личный кабинет
  $('[data-logout]')?.addEventListener('click', () => post('/api/auth/logout', {}).finally(() => { location.href = `${B}/`; }));
  const profile = $('[data-profile-form]');
  profile?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = $('[data-profile-msg]'), f = new FormData(profile);
    try {
      await post('/api/account/profile', { name: f.get('name'), email: f.get('email'), phone: f.get('phone'), address: f.get('address'), emailConfirmed: mailConfirmed(profile) });
      msg.style.color = 'inherit'; msg.textContent = 'Сохранено';
    } catch (ex) { msg.style.color = ''; msg.textContent = ex.message; }
    msg.hidden = false;
  });

  // Корзина и оформление
  const checkout = $('[data-checkout]');
  if (checkout) initCheckout();

  async function initCheckout() {
    const box = $('[data-cart-items]'), form = $('[data-order-form]'), err = $('[data-form-error]'), summary = $('[data-summary]');
    let byId;
    try { byId = await products(); } catch { box.innerHTML = '<p class="empty">Не удалось загрузить каталог, обновите страницу.</p>'; return; }

    function render() {
      // Убираем из корзины то, чего больше нет в каталоге.
      const items = cart.items().filter((l) => byId[l.productId]?.variants.some((v) => v.size === l.size));
      cart.save(items);
      if (!items.length) {
        box.innerHTML = `<div class="empty-state"><p>В корзине пока ничего нет.</p><a class="btn" href="${B}/catalog">Перейти в каталог</a></div>`;
        form.hidden = true; summary.hidden = true; return;
      }
      form.hidden = false; summary.hidden = false;
      let total = 0;
      box.innerHTML = items.map((l, i) => {
        const p = byId[l.productId], v = p.variants.find((x) => x.size === l.size);
        const sum = v.price * l.qty; total += sum;
        return `<div class="line">
          <a href="${B}/product/${esc(p.id)}"><img src="${esc(p.images[0])}" alt="${esc(p.title)}"></a>
          <div>
            <p class="line__brand">Wasted Mondays</p>
            <a class="line__title" href="${B}/product/${esc(p.id)}">${esc(model(p.title))}</a>
            <p class="line__meta">Размер: ${esc(l.size)}</p>
            ${v.inStock ? '' : `<p class="line__pre">Предзаказ · ${esc(PRE_NOTE)}</p>`}
            <div class="line__actions">
              <div class="qty"><button type="button" data-dec="${i}" aria-label="Меньше">−</button><span>${l.qty}</span><button type="button" data-inc="${i}" aria-label="Больше">+</button></div>
              <button class="link" type="button" data-rm="${i}">Удалить</button>
            </div>
          </div>
          <p class="line__price">${money(sum)}</p>
        </div>`;
      }).join('');
      $('[data-cart-subtotal]').textContent = money(total);
      $('[data-cart-total]').textContent = money(total);
      // Предзаказ: половина сейчас, остаток перед отправкой. Смешанную корзину не оформляем.
      const pre = items.filter((l) => isPre(byId, l)).length, mixed = pre && pre < items.length;
      $('[data-pre-sum]').hidden = !pre || mixed;
      $('[data-pre-now]').textContent = money(deposit(total));
      $('[data-pre-rest]').textContent = money(total - deposit(total));
      const btn = $('button[type=submit]', summary);
      btn.textContent = pre ? 'Оформить предзаказ' : 'Оформить заказ';
      btn.disabled = Boolean(mixed);
      err.innerHTML = mixed ? 'В корзине вещи в наличии и предзаказ, они оформляются отдельными заказами. <button class="link" type="button" data-rm-pre>Убрать предзаказ</button>' : '';
      err.hidden = !mixed;
    }
    box.addEventListener('click', (e) => {
      const items = cart.items(), t = e.target.closest('button');
      if (!t) return;
      if (t.dataset.inc) items[+t.dataset.inc].qty = Math.min(5, items[+t.dataset.inc].qty + 1);
      else if (t.dataset.dec) { const l = items[+t.dataset.dec]; l.qty > 1 ? l.qty-- : items.splice(+t.dataset.dec, 1); }
      else if (t.dataset.rm) items.splice(+t.dataset.rm, 1);
      else return;
      cart.save(items); render();
    });
    err.addEventListener('click', (e) => {
      if (!e.target.closest('[data-rm-pre]')) return;
      cart.save(cart.items().filter((l) => !isPre(byId, l))); render();
    });

    const addr = $('[data-address]');
    const syncDelivery = () => {
      const r = $('input[name=delivery]:checked', form);
      addr.hidden = r?.dataset.needsAddress !== 'true';
      $('[data-cart-delivery]').textContent = r?.value === 'pickup' ? 'Бесплатно' : 'Сообщит менеджер';
    };
    form.addEventListener('change', syncDelivery); syncDelivery();

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      err.hidden = true;
      $$('.is-invalid', form).forEach((i) => i.classList.remove('is-invalid'));
      const f = new FormData(form);
      const bad = [];
      if (String(f.get('name')).trim().length < 2) bad.push('name');
      if (!String(f.get('email')).trim()) bad.push('email');
      if (!addr.hidden && String(f.get('address')).trim().length < 5) bad.push('address');
      if (bad.length) {
        bad.forEach((n) => form.elements[n].classList.add('is-invalid'));
        form.elements[bad[0]].focus();
        err.textContent = 'Проверьте выделенные поля'; err.hidden = false; return;
      }
      if (!f.get('consent')) { err.textContent = 'Нужно согласие с условиями и политикой конфиденциальности'; err.hidden = false; return; }

      const btn = $('button[type=submit]', summary);
      btn.disabled = true; btn.textContent = 'Отправляем…';
      try {
        const res = await post('/api/orders', {
          items: cart.items().map((l) => ({ ...l, preorder: isPre(byId, l) })),
          customer: { name: f.get('name'), email: f.get('email'), phone: f.get('phone'), comment: f.get('comment'), newsletter: !!f.get('newsletter') },
          delivery: { method: f.get('delivery'), address: f.get('address') || '' },
          consent: true, emailConfirmed: mailConfirmed(form),
        });
        location.href = `${B}/order/${res.id}`;
      } catch (ex) {
        btn.disabled = false; render();
        err.textContent = ex.message; err.hidden = false;
      }
    });
    render();
  }

  // Попап "Ранний доступ к дропу": через 20 секунд или на второй странице, что раньше.
  // Закрыли: не показываем 14 дней. Подписались: больше не показываем.
  const lead = $('[data-lead]');
  const LEAD_PAUSE = 14 * 864e5;
  const leadState = store.get('wm_lead', {});
  const skipLead = $('[data-checkout]') || /\/(order|account|collections)(\/|$)/.test(location.pathname)
    || leadState.done || (leadState.closedAt && Date.now() - leadState.closedAt < LEAD_PAUSE);
  if (lead && !skipLead) {
    let pages = 0;
    try { pages = Number(sessionStorage.getItem('wm_pages') || 0) + 1; sessionStorage.setItem('wm_pages', pages); } catch {}
    let leadFocus = null;
    const openLead = () => {
      // Не перебиваем открытую корзину, меню или поиск: попробуем позже.
      if ($('.drawer.is-open, .sheet.is-open') || !$('[data-search]').hidden) { setTimeout(openLead, 8000); return; }
      leadFocus = document.activeElement;
      lead.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => lead.classList.add('is-open')));
      document.body.style.overflow = 'hidden';
      setTimeout(() => $('#l-email', lead).focus({ preventScroll: true }), 350);
    };
    const closeLead = () => {
      if (!lead.classList.contains('is-open')) return;
      lead.classList.remove('is-open');
      document.body.style.overflow = '';
      setTimeout(() => { lead.hidden = true; }, 400);
      const st = store.get('wm_lead', {});
      if (!st.done) store.set('wm_lead', { ...st, closedAt: Date.now() });
      leadFocus?.focus?.({ preventScroll: true });
    };
    setTimeout(openLead, pages >= 2 ? 2500 : 20000);
    lead.addEventListener('click', (e) => { if (e.target === lead || e.target.closest('[data-lead-close]')) closeLead(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLead(); });

  }

  // Форма раннего доступа: в попапе и на странице коллекций.
  function bindLeadForm(form) {
    const box = form.parentElement, err = $('[data-lead-error]', box);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = new FormData(form), email = String(f.get('email')).trim(), phone = String(f.get('phone')).trim();
      const fail = (m, field) => { err.textContent = m; err.hidden = false; if (field) { form.elements[field].classList.add('is-invalid'); form.elements[field].focus(); } };
      $$('.is-invalid', form).forEach((i) => i.classList.remove('is-invalid')); err.hidden = true;
      if (!email) return fail('Укажите почту', 'email');
      if (!f.get('consent')) return fail('Нужно согласие на обработку персональных данных');
      const btn = $('button[type=submit]', form);
      btn.disabled = true;
      try {
        await post('/api/subscribe', { email, phone, consent: true, emailConfirmed: mailConfirmed(form), source: box.closest('[data-lead]') ? 'popup' : 'collections', page: location.pathname });
        store.set('wm_lead', { done: true, at: Date.now() });
        form.hidden = true; $('[data-lead-done]', box).hidden = false;
      } catch (ex) { fail(ex.message); }
      btn.disabled = false;
    });
  }
  $$('[data-lead-form]').forEach(bindLeadForm);

  // Коллекции: карточка плавно прокручивает к своим вещам.
  $$('[data-col-link]').forEach((a) => a.addEventListener('click', (e) => {
    const t = document.getElementById(a.getAttribute('href').slice(1));
    if (!t) return;
    e.preventDefault();
    t.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    history.replaceState(null, '', a.getAttribute('href'));
  }));

  renderBadges();
})();
