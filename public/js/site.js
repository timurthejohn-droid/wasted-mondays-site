// Wasted Mondays: корзина, избранное, слайдер, галерея, оформление заказа.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const money = (n) => `${Math.round(n).toLocaleString('ru-RU').replace(/ /g, ' ')} р.`;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // localStorage может быть недоступен (приватный режим), тогда работаем без сохранения.
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };

  let toastTimer;
  function toast(html) {
    const t = $('[data-toast]');
    t.innerHTML = html; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 3200);
  }

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
    $$('[data-fav]').forEach((b) => b.classList.toggle('is-on', on.has(b.dataset.fav)));
  }

  // Меню
  const menu = $('[data-menu]');
  $('[data-menu-open]')?.addEventListener('click', () => { menu.hidden = false; document.body.style.overflow = 'hidden'; });
  $('[data-menu-close]')?.addEventListener('click', () => { menu.hidden = true; document.body.style.overflow = ''; });

  // Избранное
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-fav]');
    if (!b) return;
    e.preventDefault();
    toast(favs.toggle(b.dataset.fav) ? 'Добавлено в избранное' : 'Убрано из избранного');
    if ($('[data-catalog]')) applyFilter(currentFilter);
  });

  // Cookie
  const cookie = $('[data-cookie]');
  if (cookie && !store.get('wm_cookie_ok', false)) cookie.hidden = false;
  $('[data-cookie-ok]')?.addEventListener('click', () => { store.set('wm_cookie_ok', true); cookie.hidden = true; });

  // Hero-слайдер
  const slider = $('[data-slider]');
  if (slider) {
    const slides = $$('.hero__slide', slider), dots = $$('[data-dot]', slider);
    let i = 0, timer;
    const go = (n) => {
      slides[i].classList.remove('is-active'); dots[i].classList.remove('is-active');
      i = (n + slides.length) % slides.length;
      slides[i].classList.add('is-active'); dots[i].classList.add('is-active');
    };
    const start = () => { clearInterval(timer); if (!matchMedia('(prefers-reduced-motion: reduce)').matches) timer = setInterval(() => go(i + 1), 4500); };
    dots.forEach((d) => d.addEventListener('click', () => { go(+d.dataset.dot); start(); }));
    let x0 = null;
    slider.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    slider.addEventListener('touchend', (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) { go(i + (dx < 0 ? 1 : -1)); start(); }
    });
    start();
  }

  // Фильтр каталога
  let currentFilter = '';
  function applyFilter(f) {
    currentFilter = f;
    const fav = new Set(favs.list());
    let shown = 0;
    $$('[data-catalog] .card').forEach((c) => {
      const ok = !f || (f === '__fav' ? fav.has(c.dataset.id) : c.dataset.cat.split('|').includes(f));
      c.hidden = !ok; if (ok) shown++;
    });
    $$('[data-filter]').forEach((b) => b.classList.toggle('is-active', b.dataset.filter === f));
    const empty = $('[data-empty]'); if (empty) empty.hidden = shown > 0;
  }
  if ($('[data-catalog]')) {
    $$('[data-filter]').forEach((b) => b.addEventListener('click', () => applyFilter(b.dataset.filter)));
    if (new URLSearchParams(location.search).get('fav')) applyFilter('__fav');
  }

  // Карточка товара
  const pdp = $('[data-product]');
  if (pdp) {
    const prod = JSON.parse(pdp.dataset.product);
    const main = $('.pdp__main', pdp), thumbs = $$('[data-thumb]', pdp);
    thumbs.forEach((t) => t.addEventListener('click', () => main.scrollTo({ left: main.clientWidth * +t.dataset.thumb, behavior: 'smooth' })));
    main.addEventListener('scroll', () => {
      const n = Math.round(main.scrollLeft / main.clientWidth);
      thumbs.forEach((t, k) => t.classList.toggle('is-active', k === n));
    }, { passive: true });
    $('[data-add]', pdp)?.addEventListener('click', () => {
      const size = $('input[name=size]:checked', pdp)?.value;
      if (!size) return toast('Выберите размер');
      cart.add(prod.id, size);
      toast(`${esc(prod.title)}, ${esc(size)} в корзине. <a href="/cart">Оформить →</a>`);
    });
  }

  // Корзина и оформление
  const checkout = $('[data-checkout]');
  if (checkout) initCheckout();

  async function initCheckout() {
    const box = $('[data-cart-items]'), form = $('[data-order-form]'), err = $('[data-form-error]');
    let products = [];
    try { products = await (await fetch('/api/products')).json(); } catch { box.innerHTML = '<p class="empty">Не удалось загрузить каталог, обновите страницу.</p>'; return; }
    const byId = Object.fromEntries(products.map((p) => [p.id, p]));

    function render() {
      // Убираем из корзины то, чего больше нет в каталоге.
      const items = cart.items().filter((l) => byId[l.productId]?.variants.some((v) => v.size === l.size));
      cart.save(items);
      if (!items.length) {
        box.innerHTML = '<p class="empty">Корзина пуста. <a href="/catalog">Перейти в каталог</a></p>';
        form.hidden = true; return;
      }
      form.hidden = false;
      let total = 0;
      box.innerHTML = items.map((l, idx) => {
        const p = byId[l.productId], v = p.variants.find((x) => x.size === l.size);
        const sum = v.price * l.qty; total += sum;
        return `<div class="line">
          <a href="/product/${esc(p.id)}"><img src="${esc(p.images[0])}" alt=""></a>
          <div>
            <a class="line__title" href="/product/${esc(p.id)}">${esc(p.title)}</a>
            <div class="line__meta">Размер ${esc(l.size)} · ${money(v.price)}${v.inStock ? '' : ' · <b style="color:var(--error)">закончился</b>'}</div>
            <div class="qty"><button type="button" data-dec="${idx}" aria-label="Меньше">−</button><span>${l.qty}</span><button type="button" data-inc="${idx}" aria-label="Больше">+</button></div>
          </div>
          <div class="line__right"><b>${money(sum)}</b><br><button class="line__remove" type="button" data-rm="${idx}">Удалить</button></div>
        </div>`;
      }).join('');
      $('[data-cart-total]').textContent = money(total);
    }
    box.addEventListener('click', (e) => {
      const items = cart.items(), t = e.target;
      if (t.dataset.inc) items[+t.dataset.inc].qty = Math.min(5, items[+t.dataset.inc].qty + 1);
      else if (t.dataset.dec) { const l = items[+t.dataset.dec]; l.qty > 1 ? l.qty-- : items.splice(+t.dataset.dec, 1); }
      else if (t.dataset.rm) items.splice(+t.dataset.rm, 1);
      else return;
      cart.save(items); render();
    });

    const addr = $('[data-address]');
    const syncAddr = () => { addr.hidden = $('input[name=delivery]:checked', form)?.dataset.needsAddress !== 'true'; };
    form.addEventListener('change', syncAddr); syncAddr();

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

      const btn = $('button[type=submit]', form);
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
        btn.disabled = false; btn.textContent = 'Купить';
      }
    });
    render();
  }

  renderBadges();
})();
