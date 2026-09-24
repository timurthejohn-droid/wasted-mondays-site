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
    return `<article class="card${sizes.length ? '' : ' is-soldout'}" data-id="${esc(p.id)}">
      <div class="card__media"><a class="card__img" href="${B}/product/${esc(p.id)}" tabindex="-1"><img src="${esc(p.images[0])}" alt="" loading="lazy">${p.images[1] ? `<img class="card__alt" src="${esc(p.images[1])}" alt="" loading="lazy">` : ''}</a>
        <button class="fav card__fav" type="button" aria-label="В избранное" data-fav="${esc(p.id)}">${markSvg}</button>
        ${sizes.length ? `<div class="quick" data-quick><button class="quick__plus" type="button" aria-label="Выбрать размер" aria-expanded="false" data-quick-toggle>${plusSvg}</button>
          <div class="quick__sizes">${p.variants.map((v) => `<button type="button" data-quick-add="${esc(p.id)}" data-size="${esc(v.size)}"${v.inStock ? '' : ' disabled'}>${esc(v.size)}</button>`).join('')}</div></div>` : ''}
      </div>
      <a class="card__info" href="${B}/product/${esc(p.id)}">
        <span class="card__row"><span class="card__title">${esc(model(p.title))}</span><span class="card__price">${money(p.price)}</span></span>
        <span class="card__color">${esc(p.color?.name || '')}</span>
        <span class="card__swatches">${sibs.map((x) => `<i style="--c:${esc(x.color?.hex || '#ccc')}"${x.id === p.id ? ' class="is-current"' : ''}></i>`).join('')}<small>${n} ${plural(n, 'цвет', 'цвета', 'цветов')}</small></span>
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
      cart.add(a.dataset.quickAdd, a.dataset.size);
      a.closest('[data-quick]')?.classList.remove('is-open');
      showBag(true);
      return;
    }
    if (!e.target.closest('[data-quick]')) $$('[data-quick].is-open').forEach((x) => x.classList.remove('is-open'));
  });

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
        <p class="mini__meta">Размер ${esc(l.size)}</p><p class="mini__price">${money(v.price * l.qty)}</p>
        <div class="mini__actions"><div class="qty qty--sm"><button type="button" data-bag-dec="${i}" aria-label="Меньше">−</button><span>${l.qty}</span><button type="button" data-bag-inc="${i}" aria-label="Больше"${l.qty >= 5 ? ' disabled' : ''}>+</button></div>
        <button class="link mini__rm" type="button" data-bag-rm="${i}">Удалить</button></div></div></div>`;
    }).join('');
    $('[data-bag-total]').textContent = money(total);
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
    const cats = checked('cat'), sizes = checked('size');
    const instock = $('input[name=instock]')?.checked, onlyFav = $('input[name=fav]')?.checked;
    const fav = new Set(favs.list());
    let shown = 0;
    $$('.card', grid).forEach((c) => {
      const cs = c.dataset.cat.split('|'), ss = c.dataset.sizes ? c.dataset.sizes.split('|') : [];
      const ok = (!cats.length || cats.some((x) => cs.includes(x)))
        && (!sizes.length || sizes.some((x) => ss.includes(x)))
        && (!instock || ss.length > 0)
        && (!onlyFav || fav.has(c.dataset.id));
      c.hidden = !ok; if (ok) shown++;
    });
    $('[data-plp-count]').textContent = `${shown} ${plural(shown, 'товар', 'товара', 'товаров')}`;
    $('[data-plp-title]').textContent = onlyFav ? 'Избранное' : cats.length === 1 ? cats[0] : 'Каталог';
    $('[data-empty]').hidden = shown > 0;
    $$('[data-pill]').forEach((p) => p.classList.toggle('is-active', cats.length <= 1 && p.dataset.pill === (cats[0] || '') && !onlyFav));
    const params = new URLSearchParams();
    cats.forEach((c) => params.append('cat', c));
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
    const avail = $$('input[name=size]:not(:disabled)', pdp);
    if (avail.length === 1) avail[0].checked = true;
    sizes.addEventListener('change', () => { sizes.classList.remove('is-invalid'); hint.hidden = true; });
    const add = () => {
      const size = picked();
      if (!size) {
        sizes.classList.add('is-invalid'); hint.hidden = false;
        sizes.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
        return;
      }
      cart.add(prod.id, size);
      showBag(true);
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
    const target = () => (authForm.dataset.channel === 'email' ? $('#a-email').value : $('#a-phone').value);
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
          const r = await post('/api/auth/code', { channel: authForm.dataset.channel, to: target(), consent: true });
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
      await post('/api/account/profile', { name: f.get('name'), email: f.get('email'), phone: f.get('phone'), address: f.get('address') });
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
            ${v.inStock ? '' : '<p class="line__warn">Этого размера больше нет в наличии</p>'}
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
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(f.get('email')).trim())) bad.push('email');
      if (String(f.get('phone')).replace(/\D/g, '').length < 10) bad.push('phone');
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
          items: cart.items(),
          customer: { name: f.get('name'), email: f.get('email'), phone: f.get('phone'), comment: f.get('comment'), newsletter: !!f.get('newsletter') },
          delivery: { method: f.get('delivery'), address: f.get('address') || '' },
          consent: true,
        });
        location.href = `${B}/order/${res.id}`;
      } catch (ex) {
        err.textContent = ex.message; err.hidden = false;
        btn.disabled = false; btn.textContent = 'Оформить заказ';
      }
    });
    render();
  }

  renderBadges();
})();
