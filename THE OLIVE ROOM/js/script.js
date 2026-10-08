(() => {
  const qs = (s, root = document) => root.querySelector(s);
  const qsa = (s, root = document) => [...root.querySelectorAll(s)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Premium dark/light theme toggle with persistence across every page.
  const root = document.documentElement;
  let savedTheme = 'dark';
  try {
    const stored = window.localStorage.getItem('olive-theme');
    if (stored === 'light' || stored === 'dark') savedTheme = stored;
  } catch (e) { /* file:// and privacy modes can block localStorage */ }
  root.dataset.theme = savedTheme;

  const nav = qs('#navLinks');
  const navToggle = qs('.nav-toggle');
  const themeButton = qs('.theme-toggle');

  if (themeButton) {
    const icon = qs('.theme-toggle-icon', themeButton);
    const label = qs('.theme-toggle-label', themeButton);
    const syncThemeButton = () => {
      const isLight = root.dataset.theme === 'light';
      themeButton.setAttribute('aria-label', isLight ? 'Switch to dark mode' : 'Switch to light mode');
      themeButton.setAttribute('aria-pressed', String(isLight));
      if (icon) icon.textContent = isLight ? '☾' : '☼';
      if (label) label.textContent = isLight ? 'Dark' : 'Light';
    };
    themeButton.addEventListener('click', () => {
      const next = root.dataset.theme === 'light' ? 'dark' : 'light';
      const apply = () => {
        root.dataset.theme = next;
        try { window.localStorage.setItem('olive-theme', next); } catch (e) {}
        syncThemeButton();
      };
      // Whole-page cross-fade where supported; otherwise the CSS colour transitions handle it.
      if (document.startViewTransition && !reduceMotion) {
        root.classList.add('theme-swap');
        document.startViewTransition(apply).finished.finally(() => root.classList.remove('theme-swap'));
      } else apply();
    });
    syncThemeButton();
  }

  // Mobile navigation (full-screen panel)
  const mobileQuery = matchMedia('(max-width: 800px)');
  const setMenu = open => {
    if (!nav || !navToggle) return;
    nav.classList.toggle('open', open);
    document.body.classList.toggle('menu-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  navToggle?.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  qsa('.nav-links a').forEach(link => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && nav?.classList.contains('open')) { setMenu(false); navToggle?.focus(); }
  });
  mobileQuery.addEventListener?.('change', e => { if (!e.matches) setMenu(false); });

  // Navbar behavior: visible only at the very top.
  // As soon as the page is scrolled even slightly, it slides up and stays hidden.
  // It slides back down only after returning to the top.
  const navbar = qs('.navbar');
  if (navbar) {
    let ticking = false;
    const syncNavbarVisibility = () => {
      ticking = false;
      if (document.body.classList.contains('menu-open')) return;
      navbar.classList.toggle('navbar-hidden', window.scrollY > 8);
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; window.requestAnimationFrame(syncNavbarVisibility); }
    }, { passive: true });
    syncNavbarVisibility();
  }

  // Scroll-to-top control. The button is present in HTML; JS only controls visibility and scrolling.
  const scrollTop = qs('.scroll-top');
  if (scrollTop) {
    const syncScrollTop = () => {
      const visible = window.scrollY > 500;
      scrollTop.classList.toggle('is-visible', visible);
      scrollTop.setAttribute('aria-hidden', String(!visible));
    };
    window.addEventListener('scroll', syncScrollTop, { passive: true });
    syncScrollTop();
    scrollTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  // Current year
  qsa('.year').forEach(el => el.textContent = new Date().getFullYear());

  // Cursor glow: eased follow (transform only), fades in on first movement
  const glow = qs('.cursor-glow');
  if (glow && !reduceMotion && matchMedia('(pointer:fine)').matches) {
    const half = glow.offsetWidth / 2 || 210;
    let tx = 0, ty = 0, x = 0, y = 0, raf = 0, shown = false;
    const frame = () => {
      x += (tx - x) * 0.1;
      y += (ty - y) * 0.1;
      glow.style.transform = `translate3d(${x - half}px,${y - half}px,0)`;
      raf = (Math.abs(tx - x) > 0.3 || Math.abs(ty - y) > 0.3) ? requestAnimationFrame(frame) : 0;
    };
    window.addEventListener('mousemove', e => {
      tx = e.clientX; ty = e.clientY;
      if (!shown) { shown = true; x = tx; y = ty; glow.classList.add('is-active'); }
      if (!raf) raf = requestAnimationFrame(frame);
    }, { passive: true });
  } else if (glow) glow.remove();

  // Intersection reveal: elements entering together are staggered left-to-right, top-to-bottom
  const revealTargets = qsa('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      const fresh = [];
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        // Cards already revealed by a filter change keep their own stagger.
        if (!entry.target.classList.contains('visible')) fresh.push(entry);
      });
      fresh
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left)
        .forEach((entry, i) => {
          entry.target.style.setProperty('--rd', `${Math.min(i, 6) * 0.09}s`);
          entry.target.classList.add('visible');
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealTargets.forEach(el => observer.observe(el));
  } else revealTargets.forEach(el => el.classList.add('visible'));

  // Gentle parallax on hero artwork (uses the independent `translate` property, so it never fights other transforms)
  const parallax = [['.hero-visual', 0.06], ['.page-hero-art', 0.05], ['.floating-word', 0.12]]
    .flatMap(([selector, k]) => qsa(selector).map(el => ({ el, k })));
  if (parallax.length && !reduceMotion) {
    let parallaxTick = false;
    const runParallax = () => {
      parallaxTick = false;
      const y = window.scrollY;
      if (y > window.innerHeight * 1.5) return;
      parallax.forEach(({ el, k }) => { el.style.translate = `0 ${(y * k).toFixed(1)}px`; });
    };
    window.addEventListener('scroll', () => {
      if (!parallaxTick) { parallaxTick = true; window.requestAnimationFrame(runParallax); }
    }, { passive: true });
  }

  // Page transitions: fade out before navigating to another page of the site
  if (!reduceMotion) {
    document.addEventListener('click', e => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = e.target.closest?.('a[href]');
      if (!link || (link.target && link.target !== '_self') || link.hasAttribute('download')) return;
      let url;
      try { url = new URL(link.href, window.location.href); } catch (err) { return; }
      if (!/^(https?|file):$/.test(url.protocol) || url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      e.preventDefault();
      root.classList.add('is-leaving');
      window.setTimeout(() => { window.location.href = url.href; }, 360);
    });
    window.addEventListener('pageshow', e => { if (e.persisted) root.classList.remove('is-leaving'); });
  }

  // Ambient background particles
  const ambient = qs('.ambient');
  if (ambient) {
    for (let i = 0; i < 18; i++) {
      const dot = document.createElement('span');
      dot.style.setProperty('--x', `${Math.random() * 100}%`);
      dot.style.setProperty('--y', `${Math.random() * 100}%`);
      dot.style.setProperty('--s', `${1 + Math.random() * 3}px`);
      dot.style.setProperty('--d', `${10 + Math.random() * 12}s`);
      dot.style.setProperty('--delay', `${Math.random() * -20}s`);
      ambient.appendChild(dot);
    }
  }

  // Filters (services + journal): fade out what leaves, then stagger in what stays or returns
  let filterTimer = 0;
  qsa('.filter').forEach(button => {
    button.addEventListener('click', () => {
      if (button.classList.contains('active')) return;
      const filter = button.dataset.filter;
      qsa('.filter').forEach(b => b.classList.toggle('active', b === button));
      const cards = qsa('[data-category]');
      const matches = card => filter === 'all' || card.dataset.category === filter;
      const apply = () => {
        let i = 0;
        cards.forEach(card => {
          const show = matches(card);
          card.classList.remove('is-leaving');
          card.classList.toggle('is-hidden', !show);
          if (show) {
            card.style.setProperty('--rd', `${Math.min(i++, 8) * 0.07}s`);
            card.classList.add('visible');
          }
        });
      };
      const leaving = cards.filter(card => !matches(card) && !card.classList.contains('is-hidden'));
      window.clearTimeout(filterTimer);
      if (!leaving.length || reduceMotion) { apply(); return; }
      leaving.forEach(card => card.classList.add('is-leaving'));
      filterTimer = window.setTimeout(apply, 280);
    });
  });

  // Journal modals
  const articles = {
    morning: ['TRAVEL', '07 OCT 2026 · 5 MIN READ', 'The 7:12 AM Rule: Why the Best Resort Mornings Begin Before Breakfast', [
      'At 7:12 in the morning, a resort is a completely different place. The footsteps are softer. The pool has not yet collected a single ripple. Somewhere in the kitchen, coffee is beginning its first conversation with the air.',
      'This is the hour we secretly recommend to every guest. Not because you need another item on your holiday itinerary, but because the world feels unusually generous before the day becomes busy.',
      'Take your coffee outside. Walk without your phone. Watch the light move across the terrace. Then go back to bed if you want. The point is not productivity. The point is noticing.'
    ]],
    dining: ['DINING', '02 OCT 2026 · 4 MIN READ', 'What Makes a Dinner Worth Dressing Up For?', [
      'A memorable dinner is rarely about the most expensive ingredient on the plate. It is about anticipation — the small ceremony of getting ready, choosing a table, hearing the first glass arrive and deciding that tonight deserves to be remembered.',
      'The best dining rooms give you room to linger. One course becomes two. Two becomes coffee. Suddenly nobody is checking the time.',
      'Dress up if you feel like it. Stay longer than planned. The evening has nowhere else to be.'
    ]],
    slow: ['LIFESTYLE', '28 SEP 2026 · 6 MIN READ', 'The Case for Doing Absolutely Nothing on Holiday', [
      'We have become remarkably efficient at turning holidays into projects. Five attractions before lunch. A restaurant reservation at eight. A sunrise excursion tomorrow.',
      'But what if the most luxurious plan is having no plan? Read half a book. Swim twice. Sit near the fireplace and listen to a conversation you are not part of.',
      'Doing nothing is not wasting time. It is finally experiencing time without asking it to produce something.'
    ]],
    golden: ['TRAVEL', '21 SEP 2026 · 4 MIN READ', 'Golden Hour Is a Destination', [
      'There is a moment each evening when familiar places become cinematic. Walls turn honey-coloured. Glass catches the last light. Conversations become slower without anyone deciding to slow them.',
      'You do not always need another excursion. Find a terrace. Order something cold. Put your phone away and wait.',
      'Sometimes the destination is simply the twenty minutes before sunset.'
    ]],
    drink: ['DINING', '15 SEP 2026 · 3 MIN READ', 'The Quiet Ritual of the First Drink', [
      'The first drink of an evening has a peculiar responsibility. It tells your brain that the working day is over and something slower has begun.',
      'A good bar does not rush that transition. It gives you a comfortable chair, low light, a thoughtful pour and enough time for the first conversation to find its rhythm.',
      'Order what you like. Stay for one more chapter.'
    ]],
    switch: ['LIFESTYLE', '09 SEP 2026 · 5 MIN READ', 'How to Actually Switch Off', [
      'The easiest way to make your phone less interesting is to put something better in front of you.',
      'Start with a simple rule: no notifications during breakfast. Then leave your phone in the room for a walk. Choose one hour in the afternoon when you do not photograph anything.',
      'Disconnecting is not about rejecting technology. It is about deciding what deserves your attention.'
    ]]
  };
  const modal = qs('#articleModal');
  qsa('[data-modal]').forEach(button => button.addEventListener('click', () => {
    const data = articles[button.dataset.modal];
    if (!data || !modal) return;
    qs('#modalCategory', modal).textContent = data[0];
    qs('#modalMeta', modal).textContent = data[1];
    qs('#modalTitle', modal).textContent = data[2];
    qs('#modalBody', modal).innerHTML = data[3].map(p => `<p>${p}</p>`).join('');
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }));
  const closeModal = () => {
    modal?.classList.remove('open');
    modal?.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  };
  qsa('[data-close-modal]').forEach(el => el.addEventListener('click', closeModal));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  // Reservation form
  const reservationForm = qs('#reservationForm');
  if (reservationForm) {
    const checkIn = qs('#checkIn');
    const checkOut = qs('#checkOut');
    const status = qs('#reservationStatus');
    const params = new URLSearchParams(window.location.search);
    const serviceParam = params.get('service');
    if (serviceParam && qs('#resService')) qs('#resService').value = serviceParam;

    const today = new Date();
    const iso = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    checkIn.min = iso;
    checkOut.min = iso;
    checkIn.addEventListener('change', () => {
      checkOut.min = checkIn.value || iso;
      if (checkOut.value && checkIn.value && checkOut.value <= checkIn.value) checkOut.value = '';
    });

    reservationForm.addEventListener('submit', async event => {
      event.preventDefault();
      status.className = 'form-status';
      status.textContent = '';

      if (!reservationForm.checkValidity()) {
        reservationForm.reportValidity();
        return;
      }
      if (checkOut.value <= checkIn.value) {
        status.classList.add('bad');
        status.textContent = 'Check-out must be after check-in.';
        return;
      }

      const file = qs('#resDocument')?.files?.[0];
      const maxBytes = ((window.OLIVE_CONFIG?.MAX_DOCUMENT_SIZE_MB || 5) * 1024 * 1024);
      if (file && file.size > maxBytes) {
        status.classList.add('bad');
        status.textContent = `The document is too large. Please keep it under ${window.OLIVE_CONFIG.MAX_DOCUMENT_SIZE_MB || 5} MB.`;
        return;
      }

      const endpoint = window.OLIVE_CONFIG?.SHEETS_WEB_APP_URL;
      if (!endpoint || endpoint.includes('PASTE_YOUR')) {
        status.classList.add('bad');
        status.textContent = 'The reservation form is ready, but the Google Sheets endpoint has not been configured yet. See the setup guide in the project README.';
        return;
      }

      const formData = new FormData(reservationForm);
      const payload = {};
      for (const [key, value] of formData.entries()) {
        if (key !== 'document' && typeof value === 'string') payload[key] = value;
      }
      payload.timestamp = new Date().toISOString();

      try {
        if (file) {
          const base64 = await fileToBase64(file);
          payload.documentName = file.name;
          payload.documentType = file.type || 'application/octet-stream';
          payload.documentBase64 = base64.split(',')[1];
        }

        // no-cors is intentional for a Google Apps Script web app endpoint.
        await fetch(endpoint, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        });
        status.classList.add('ok');
        status.textContent = 'Reservation enquiry submitted. Your request has been sent to the resort team.';
        reservationForm.reset();
        qs('#resGuests').value = '2';
      } catch (error) {
        console.error(error);
        status.classList.add('bad');
        status.textContent = 'We could not send the request. Please check the Apps Script URL and try again.';
      }
    });
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
})();
