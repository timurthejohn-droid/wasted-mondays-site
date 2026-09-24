// Wasted Mondays: корзина, избранное, выезжающие панели, фильтры каталога, галерея, оформление.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const money = (n) => `${Math.round(n).toLocaleString('ru-RU').replace(/ /g, ' ')} ₽`;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const model = (t) => String(t).replace(/^Wasted\s+/i, '');
  const plural = (n, a, b, c) => { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 12 || h > 14) ? b : c; };

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

  // Каталог для корзины подгружаем один раз и только когда нужен.
  let productsPromise;
  const products = () => (productsPromise ??= fetch('/api/products').then((r) => r.json())
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
    },
    count: () => cart.items().reduce((s, l) => s + l.qty, 0),
  };
  const favs = {
    list: () => store.get('wm_fav', []),
    toggle(id) {
      const l = favs.list(); const i = l.indexOf(id);
      if (i >= 0) l.splice(i, 1); else l.push(id);
      store.set('wm_fav', l); renderBadges(); return i < 0;
    },
  };

  function renderBadges() {
    const c = cart.count(), f = favs.list().length;
    $$('[data-cart-count]').forEach((b) => { b.textContent = c; b.hidden = !c; });
    $$('[data-fav-count]').forEach((b) => { b.textContent = f; b.hidden = !f; });
    const on = new Set(favs.list());
    $$('[data-fav]').forEach((b) => {
      b.classList.toggle('is-on', on.has(b.dataset.fav));
      const label = b.querySelector('span');
      if (label) label.textContent = on.has(b.dataset.fav) ? 'В избранном' : 'В избранное';
    });
  }

  // Выезжающие панели. Фильтры на десктопе всегда видны, поэтому у них свой класс вместо hidden.
  let lastFocus = null;
  function openDrawer(name) {
    const d = $(`[data-drawer="${name}"]`);
    if (!d) return;
    lastFocus = document.activeElement;
    if (d.classList.contains('drawer--filters')) d.classList.add('is-shown'); else d.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => d.classList.add('is-open')));
    document.body.style.overflow = 'hidden';
    setTimeout(() => $('[data-drawer-close]', d)?.focus(), 50);
  }
  function closeDrawer(d) {
    if (!d || !d.classList.contains('is-open')) return;
    d.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(() => { if (d.classList.contains('drawer--filters')) d.classList.remove('is-shown'); else d.hidden = true; }, 350);
    lastFocus?.focus?.();
  }
  document.addEventListener('click', (e) => {
    const open = e.target.closest('[data-drawer-open]');
    if (open) { e.preventDefault(); openDrawer(open.dataset.drawerOpen); return; }
    const close = e.target.closest('[data-drawer-close]');
    if (close) { closeDrawer(close.closest('.drawer')); return; }
    if (e.target.classList.contains('drawer')) closeDrawer(e.target);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $$('.drawer.is-open').forEach(closeDrawer); });

  // Тень под шапкой при прокрутке
  const hdr = $('.hdr');
  const onScroll = () => hdr.classList.toggle('is-stuck', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // Подсветка текущего раздела в меню
  const here = location.pathname + location.search;
  $$('.hdr__nav a').forEach((a) => { if (a.getAttribute('href') === here) a.setAttribute('aria-current', 'page'); });

  // Избранное
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-fav]');
    if (!b) return;
    e.preventDefault();
    toast(favs.toggle(b.dataset.fav) ? 'Добавлено в избранное' : 'Убрано из избранного');
    if ($('[data-catalog]')) applyFilters();
  });

  // Cookie
  const cookie = $('[data-cookie]');
  if (cookie && !store.get('wm_cookie_ok', false)) cookie.hidden = false;
  $('[data-cookie-ok]')?.addEventListener('click', () => { store.set('wm_cookie_ok', true); cookie.hidden = true; });

  // Мини-корзина справа
  async function showBag(added) {
    const body = $('[data-bag-body]'), foot = $('[data-bag-foot]');
    $('[data-bag-title]').textContent = added ? 'Добавлено в корзину' : 'Корзина';
    body.innerHTML = '<p class="empty">Загрузка…</p>';
    openDrawer('bag');
    const byId = await products();
    const items = cart.items().filter((l) => byId[l.productId]);
    if (!items.length) { body.innerHTML = '<p class="empty">Корзина пуста.</p>'; foot.hidden = true; return; }
    let total = 0;
    body.innerHTML = items.map((l) => {
      const p = byId[l.productId], v = p.variants.find((x) => x.size === l.size) || { price: p.price };
      total += v.price * l.qty;
      return `<div class="mini"><img src="${esc(p.images[0])}" alt="">
        <div><p class="mini__brand">Wasted Mondays</p><p class="mini__meta">${esc(model(p.title))}</p>
        <p class="mini__meta">Размер ${esc(l.size)} · ${l.qty} шт.</p><p class="mini__price">${money(v.price * l.qty)}</p></div></div>`;
    }).join('');
    $('[data-bag-total]').textContent = money(total);
    foot.hidden = false;
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
    $('[data-sort]').addEventListener('change', (e) => applySort(e.target.value));
    applyFilters();
  }

  // Карточка товара
  const pdp = $('[data-product]');
  if (pdp) {
    const prod = JSON.parse(pdp.dataset.product);
    const gallery = $('[data-gallery]'), idx = $('[data-gallery-index]');
    gallery.addEventListener('scroll', () => { idx.textContent = Math.round(gallery.scrollLeft / gallery.clientWidth) + 1; }, { passive: true });
    // На десктопе клик по фото открывает все фото крупно, как на Farfetch.
    gallery.addEventListener('click', (e) => {
      if (!e.target.matches('img') || matchMedia('(max-width: 900px)').matches) return;
      const box = document.createElement('div');
      box.className = 'lightbox';
      box.innerHTML = `<button class="icon-btn" type="button" aria-label="Закрыть"><svg viewBox="0 0 24 24"><path d="M5 5l14 14M19 5L5 19"/></svg></button>`
        + $$('img', gallery).map((i) => `<img src="${i.src}" alt="${esc(i.alt)}">`).join('');
      document.body.appendChild(box); document.body.style.overflow = 'hidden';
      const imgs = $$('img', box); imgs[$$('img', gallery).indexOf(e.target)]?.scrollIntoView();
      const close = () => { box.remove(); document.body.style.overflow = ''; document.removeEventListener('keydown', onKey); };
      const onKey = (k) => { if (k.key === 'Escape') close(); };
      box.addEventListener('click', close); document.addEventListener('keydown', onKey);
    });
    const select = $('[data-size]', pdp), hint = $('[data-size-hint]', pdp);
    select?.addEventListener('change', () => { select.classList.remove('is-invalid'); hint.hidden = true; });
    $('[data-add]', pdp)?.addEventListener('click', () => {
      if (!select.value) { select.classList.add('is-invalid'); hint.hidden = false; select.focus(); return; }
      cart.add(prod.id, select.value);
      showBag(true);
    });
  }

  // Иконка корзины открывает мини-корзину (кроме самой страницы корзины)
  if (!$('[data-checkout]')) {
    $('[data-bag-link]')?.addEventListener('click', (e) => { e.preventDefault(); showBag(false); });
  }

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
        box.innerHTML = '<p class="empty">В корзине пока ничего нет. <a href="/catalog">Перейти в каталог</a></p>';
        form.hidden = true; summary.hidden = true; return;
      }
      form.hidden = false; summary.hidden = false;
      let total = 0;
      box.innerHTML = items.map((l, i) => {
        const p = byId[l.productId], v = p.variants.find((x) => x.size === l.size);
        const sum = v.price * l.qty; total += sum;
        return `<div class="line">
          <a href="/product/${esc(p.id)}"><img src="${esc(p.images[0])}" alt="${esc(p.title)}"></a>
          <div>
            <p class="line__brand">Wasted Mondays</p>
            <a class="line__title" href="/product/${esc(p.id)}">${esc(model(p.title))}</a>
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
        const r = await fetch('/api/orders', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: cart.items(),
            customer: { name: f.get('name'), email: f.get('email'), phone: f.get('phone'), comment: f.get('comment'), newsletter: !!f.get('newsletter') },
            delivery: { method: f.get('delivery'), address: f.get('address') || '' },
            consent: true,
          }),
        });
        const res = await r.json();
        if (!r.ok) throw new Error(res.error || 'Не получилось оформить заказ');
        location.href = `/order/${res.id}`;
      } catch (ex) {
        err.textContent = ex.message; err.hidden = false;
        btn.disabled = false; btn.textContent = 'Оформить заказ';
      }
    });
    render();
  }

  renderBadges();
})();
