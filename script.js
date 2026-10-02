(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Intro ---------- */
  const releaseIntro = () => document.body.classList.add('is-ready');
  if (reduceMotion) releaseIntro();
  else if (document.readyState === 'complete') setTimeout(releaseIntro, 500);
  else window.addEventListener('load', () => setTimeout(releaseIntro, 350), { once: true });
  setTimeout(releaseIntro, 1600);

  /* ---------- Header, progress, parallax ---------- */
  const header = $('#siteHeader');
  const progress = $('#scrollProgress');
  const mobileApply = $('.mobile-apply');
  const parallaxEls = reduceMotion ? [] : $$('[data-parallax]');
  const parallaxBg = reduceMotion ? null : $('[data-parallax-bg]');
  let lastY = scrollY;
  let applyInView = false;
  let ticking = false;

  const onFrame = () => {
    const y = scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    if (progress) progress.style.transform = `scaleX(${max > 0 ? Math.min(Math.max(y / max, 0), 1) : 0})`;

    if (header && !document.body.classList.contains('menu-open')) {
      header.classList.toggle('is-scrolled', y > 24);
      const delta = y - lastY;
      if (y > 480 && delta > 6) header.classList.add('is-hidden');
      else if (delta < -6 || y < 480) header.classList.remove('is-hidden');
    }
    lastY = y;

    if (mobileApply) mobileApply.classList.toggle('show', y > 640 && !applyInView);

    parallaxEls.forEach((fig) => {
      const img = fig.querySelector('img');
      const rect = fig.getBoundingClientRect();
      if (!img || rect.bottom < -100 || rect.top > innerHeight + 100) return;
      const slack = rect.height * 0.06;
      const center = rect.top + rect.height / 2 - innerHeight / 2;
      const shift = Math.max(-slack, Math.min(slack, -center * Number(fig.dataset.parallax)));
      img.style.transform = `translate3d(0, ${(-slack + shift).toFixed(1)}px, 0)`;
    });

    if (parallaxBg) {
      const rect = parallaxBg.parentElement.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < innerHeight) {
        const p = (rect.top + rect.height / 2 - innerHeight / 2) / innerHeight;
        parallaxBg.style.transform = `translate3d(0, ${(p * rect.height * -0.08).toFixed(1)}px, 0)`;
      }
    }
    ticking = false;
  };
  const requestFrame = () => { if (!ticking) { ticking = true; requestAnimationFrame(onFrame); } };
  addEventListener('scroll', requestFrame, { passive: true });
  addEventListener('resize', requestFrame);
  requestFrame();

  /* ---------- Reveals ---------- */
  const byParent = new Map();
  $$('.reveal').forEach((el) => {
    const list = byParent.get(el.parentElement) || [];
    list.push(el);
    byParent.set(el.parentElement, list);
  });
  byParent.forEach((list, parent) => {
    const step = parent.hasAttribute('data-stagger') ? 90 : 70;
    list.forEach((el, i) => el.style.setProperty('--reveal-delay', `${Math.min(i, 6) * step}ms`));
  });

  const revealEls = $$('.reveal, .process-track');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach((el) => el.classList.add('in-view'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in-view');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach((el) => io.observe(el));
  }

  /* ---------- Counters ---------- */
  const animateCounter = (el) => {
    const target = Number(el.dataset.target || 0);
    if (reduceMotion) { el.textContent = target.toLocaleString(); return; }
    const duration = 1600;
    setTimeout(() => {
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min((now - start) / duration, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 4))).toLocaleString();
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, Number(el.dataset.delay || 0));
  };
  const counters = $$('.counter');
  if ('IntersectionObserver' in window) {
    const co = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animateCounter(entry.target);
        co.unobserve(entry.target);
      });
    }, { threshold: 0.6 });
    counters.forEach((c) => co.observe(c));
  } else counters.forEach(animateCounter);

  /* ---------- Active nav + apply visibility ---------- */
  if ('IntersectionObserver' in window) {
    const navLinks = $$('.nav a[href^="#"]');
    const byId = new Map(navLinks.map((a) => [a.getAttribute('href').slice(1), a]));
    const so = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.target.id === 'top' && entry.isIntersecting) { navLinks.forEach((a) => a.classList.remove('active')); return; }
        const link = byId.get(entry.target.id);
        if (link && entry.isIntersecting) {
          navLinks.forEach((a) => a.classList.remove('active'));
          link.classList.add('active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['top', ...byId.keys()].forEach((id) => { const s = document.getElementById(id); if (s) so.observe(s); });

    // Hide the floating mobile CTA wherever an apply button is already on screen
    const blockers = new Set();
    const bo = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? blockers.add(e.target) : blockers.delete(e.target)));
      applyInView = blockers.size > 0;
      requestFrame();
    });
    $$('#apply, .final-cta, .site-footer').forEach((el) => bo.observe(el));
  }

  /* ---------- Legal page table of contents ---------- */
  const tocLinks = $$('.legal-toc a[href^="#"]');
  if (tocLinks.length && 'IntersectionObserver' in window) {
    const lo = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        tocLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#${entry.target.id}`));
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    tocLinks.forEach((a) => { const s = document.querySelector(a.getAttribute('href')); if (s) lo.observe(s); });
  }

  /* ---------- New York clock + CME Globex status ---------- */
  const clock = $('#nyClock');
  const status = $('#marketStatus');
  const dot = $('#marketDot');
  if (clock) {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York', hour12: false, weekday: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    const updateClock = () => {
      const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
      const h = Number(parts.hour) % 24;
      clock.textContent = `${String(h).padStart(2, '0')}:${parts.minute}:${parts.second}`;
      // Standard equity-index futures hours: Sun 18:00 – Fri 17:00 ET, daily break 17:00–18:00. Holidays not included.
      const day = parts.weekday;
      let label = 'Futures open';
      let open = true;
      if (day === 'Sat' || (day === 'Sun' && h < 18) || (day === 'Fri' && h >= 17)) { label = 'Futures closed'; open = false; }
      else if (h === 17) { label = 'Daily break'; open = false; }
      if (status.textContent !== label) status.textContent = label;
      dot.classList.toggle('is-open', open);
    };
    updateClock();
    setInterval(updateClock, 1000);
  }


  /* ---------- Hero story: photo slideshow + rotating headline word ---------- */
  const story = $('#heroStory');
  if (story) {
    const slides = $$('.story-slide', story);
    const bars = $$('.story-bars span', story);
    const words = $$('#heroRotator em');
    const cap = $('.story-cap', story);
    const capIndex = $('#storyIndex');
    const capLabel = $('#storyLabel');
    const DURATION = 4800;
    let index = 0, wordIndex = 0, progress = 0, last = 0, hovering = false, visible = true;

    const nextWord = () => {
      if (words.length < 2) return;
      const out = words[wordIndex];
      wordIndex = (wordIndex + 1) % words.length;
      const inn = words[wordIndex];
      out.classList.remove('is-active');
      out.classList.add('is-leaving');
      setTimeout(() => out.classList.remove('is-leaving'), 900);
      inn.classList.remove('is-leaving');
      inn.classList.add('is-active');
    };

    const show = (next) => {
      index = (next + slides.length) % slides.length;
      progress = 0;
      slides.forEach((img, i) => img.classList.toggle('is-active', i === index));
      bars.forEach((bar, i) => bar.style.setProperty('--p', i < index ? 1 : 0));
      nextWord();
      cap.classList.add('is-swapping');
      setTimeout(() => {
        capIndex.textContent = `${String(index + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
        capLabel.textContent = slides[index].dataset.caption;
        cap.classList.remove('is-swapping');
      }, 250);
    };

    const tick = (now) => {
      const dt = last ? Math.min(now - last, 100) : 0;
      last = now;
      if (!hovering && visible && document.body.classList.contains('is-ready')) {
        progress += dt / DURATION;
        bars[index]?.style.setProperty('--p', Math.min(progress, 1));
        if (progress >= 1) show(index + 1);
      }
      requestAnimationFrame(tick);
    };

    $('.story-hit', story).addEventListener('click', () => show(index + 1));
    if (!reduceMotion) {
      story.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hovering = true; });
      story.addEventListener('pointerleave', () => { hovering = false; });
      if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(story);
      requestAnimationFrame(tick);
    }
  }

  /* ---------- Hero candle tape (decorative) ---------- */
  const tape = $('#heroTape');
  if (tape && tape.getContext) {
    const ctx = tape.getContext('2d');
    const BODY = 11, GAP = 7, STEP = BODY + GAP, SPEED = 16; // px per second
    let w = 0, h = 0, dpr = 1, candles = [], offset = 0, lo = 0, hi = 1, t = 0, lastT = 0, jitterAt = 0, running = true;

    const makeCandle = (open) => {
      const drift = 0.18 + 0.55 * Math.sin(t / 9) + 0.25 * Math.sin(t / 3.1);
      const close = open + (Math.random() - 0.5) * 2.4 + drift;
      return { o: open, c: close, h: Math.max(open, close) + Math.random() * 1.4, l: Math.min(open, close) - Math.random() * 1.4 };
    };
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = tape.clientWidth; h = tape.clientHeight;
      tape.width = Math.round(w * dpr); tape.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const needed = Math.ceil(w / STEP) + 3;
      if (!candles.length) candles.push(makeCandle(100));
      while (candles.length < needed) { t += 1; candles.unshift(makeCandle(candles[0].o - (candles[0].c - candles[0].o) - 0.3)); }
      const vis = candles.slice(-needed);
      lo = Math.min(...vis.map((c) => c.l)); hi = Math.max(...vis.map((c) => c.h));
    };
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const pad = h * 0.08;
      const y = (v) => pad + ((hi - v) / (hi - lo || 1)) * (h - pad * 2);
      const n = candles.length;
      const rightEdge = w - STEP * 1.5;
      let tLo = Infinity, tHi = -Infinity;
      for (let i = 0; i < n; i++) {
        const c = candles[i];
        const x = rightEdge - (n - 1 - i) * STEP - offset;
        if (x < -STEP || x > w + STEP) continue;
        tLo = Math.min(tLo, c.l); tHi = Math.max(tHi, c.h);
        const up = c.c >= c.o;
        ctx.strokeStyle = up ? 'rgba(242,239,233,.11)' : 'rgba(223,51,36,.22)';
        ctx.fillStyle = up ? 'rgba(242,239,233,.075)' : 'rgba(223,51,36,.17)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, y(c.h)); ctx.lineTo(Math.round(x) + 0.5, y(c.l)); ctx.stroke();
        const top = y(Math.max(c.o, c.c)), bot = y(Math.min(c.o, c.c));
        ctx.fillRect(Math.round(x - BODY / 2), top, BODY, Math.max(bot - top, 1.5));
      }
      // live price line
      const live = candles[n - 1];
      const ly = Math.round(y(live.c)) + 0.5;
      ctx.setLineDash([3, 6]); ctx.strokeStyle = 'rgba(223,51,36,.3)';
      ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(w, ly); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(223,51,36,.75)';
      ctx.beginPath(); ctx.arc(rightEdge - offset, ly, 3, 0, Math.PI * 2); ctx.fill();
      // ease the price range toward what's visible
      if (isFinite(tLo)) { lo += (tLo - lo) * 0.04; hi += (tHi - hi) * 0.04; }
    };
    const frame = (now) => {
      const dt = lastT ? Math.min((now - lastT) / 1000, 0.05) : 0;
      lastT = now;
      if (running) {
        offset += SPEED * dt;
        const live = candles[candles.length - 1];
        if (now > jitterAt) {
          live.c += (Math.random() - 0.5) * 0.9 + 0.05;
          live.h = Math.max(live.h, live.c); live.l = Math.min(live.l, live.c);
          jitterAt = now + 90;
        }
        if (offset >= STEP) {
          offset -= STEP; t += 1;
          candles.push(makeCandle(live.c));
          if (candles.length > Math.ceil(w / STEP) + 6) candles.shift();
        }
        draw();
      }
      requestAnimationFrame(frame);
    };
    resize(); draw();
    addEventListener('resize', () => { resize(); draw(); });
    if (!reduceMotion) {
      if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { running = e.isIntersecting; lastT = 0; }).observe(tape);
      requestAnimationFrame(frame);
    }
  }

  /* ---------- Hero cursor glow ---------- */
  const glow = $('#heroGlow');
  const hero = $('.hero');
  if (glow && hero && !reduceMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    let tx = 0, ty = 0, gx = 0, gy = 0, active = false;
    const follow = () => {
      gx += (tx - gx) * 0.12; gy += (ty - gy) * 0.12;
      glow.style.transform = `translate3d(${gx.toFixed(1)}px, ${gy.toFixed(1)}px, 0)`;
      if (active || Math.abs(tx - gx) > 0.5 || Math.abs(ty - gy) > 0.5) requestAnimationFrame(follow);
    };
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      tx = e.clientX - r.left; ty = e.clientY - r.top;
      if (!active) {
        if (!glow.classList.contains('is-on')) { gx = tx; gy = ty; }
        active = true; glow.classList.add('is-on'); requestAnimationFrame(follow);
      }
    });
    hero.addEventListener('pointerleave', () => { active = false; glow.classList.remove('is-on'); });
  }

  /* ---------- Video facade ---------- */
  $$('.video-facade').forEach((btn) => {
    btn.addEventListener('click', () => {
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube-nocookie.com/embed/${btn.dataset.video}?autoplay=1&rel=0&modestbranding=1`;
      iframe.title = btn.getAttribute('aria-label').replace(/^Play: /, '');
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      iframe.allowFullscreen = true;
      btn.replaceWith(iframe);
      iframe.focus();
    });
  });

  /* ---------- Gallery rail ---------- */
  const rail = $('#rail');
  const railBar = $('#railProgress');
  const prevBtn = $('[data-rail="prev"]');
  const nextBtn = $('[data-rail="next"]');
  if (rail) {
    const updateRail = () => {
      const max = rail.scrollWidth - rail.clientWidth;
      if (railBar) {
        railBar.style.width = `${(rail.clientWidth / rail.scrollWidth) * 100}%`;
        railBar.style.transform = `translateX(${(rail.scrollLeft / rail.clientWidth) * 100}%)`;
      }
      if (prevBtn) prevBtn.disabled = rail.scrollLeft <= 2;
      if (nextBtn) nextBtn.disabled = rail.scrollLeft >= max - 2;
    };
    rail.addEventListener('scroll', updateRail, { passive: true });
    addEventListener('resize', updateRail);
    updateRail();

    const page = (dir) => rail.scrollBy({ left: dir * rail.clientWidth * 0.66, behavior: reduceMotion ? 'auto' : 'smooth' });
    prevBtn?.addEventListener('click', () => page(-1));
    nextBtn?.addEventListener('click', () => page(1));
    rail.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); page(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); page(-1); }
    });

    // Mouse drag-to-scroll (touch already scrolls natively)
    let startX = 0, startLeft = 0, pointerId = null;
    rail.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      pointerId = e.pointerId; startX = e.clientX; startLeft = rail.scrollLeft;
      rail.dataset.dragged = '';
    });
    rail.addEventListener('pointermove', (e) => {
      if (e.pointerId !== pointerId) return;
      const dx = e.clientX - startX;
      if (!rail.dataset.dragged && Math.abs(dx) > 6) {
        rail.dataset.dragged = '1';
        rail.classList.add('is-dragging');
        rail.setPointerCapture(pointerId);
      }
      if (rail.dataset.dragged) rail.scrollLeft = startLeft - dx;
    });
    const endDrag = () => {
      if (pointerId === null) return;
      pointerId = null;
      rail.classList.remove('is-dragging');
    };
    rail.addEventListener('pointerup', endDrag);
    rail.addEventListener('pointercancel', endDrag);
  }

  /* ---------- Lightbox ---------- */
  const lightbox = $('#lightbox');
  const shots = $$('.shot');
  if (lightbox && shots.length && typeof lightbox.showModal === 'function') {
    const lbImg = $('#lightboxImg');
    const lbCap = $('#lightboxCap');
    let index = 0;
    const show = (i) => {
      index = (i + shots.length) % shots.length;
      const shot = shots[index];
      lbImg.src = shot.dataset.full;
      lbImg.alt = shot.querySelector('img').alt;
      lbCap.textContent = `${String(index + 1).padStart(2, '0')} / ${String(shots.length).padStart(2, '0')} — ${shot.dataset.caption}`;
    };
    shots.forEach((shot, i) => shot.addEventListener('click', () => {
      if (rail?.dataset.dragged) { rail.dataset.dragged = ''; return; }
      show(i);
      lightbox.showModal();
    }));
    $('.lightbox-close', lightbox).addEventListener('click', () => lightbox.close());
    $('.lightbox-prev', lightbox).addEventListener('click', () => show(index - 1));
    $('.lightbox-next', lightbox).addEventListener('click', () => show(index + 1));
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox || e.target.tagName === 'FIGURE') lightbox.close(); });
    lightbox.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') show(index + 1);
      if (e.key === 'ArrowLeft') show(index - 1);
    });
  }

  /* ---------- Mobile menu ---------- */
  const toggle = $('.menu-toggle');
  const menu = $('#mobileMenu');
  if (toggle && menu) {
    const setMenu = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      menu.hidden = !open;
      document.body.classList.toggle('menu-open', open);
      if (open) header?.classList.remove('is-hidden');
    };
    toggle.addEventListener('click', () => setMenu(menu.hidden));
    $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); toggle.focus(); } });
    matchMedia('(min-width: 1101px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });
  }

  /* ---------- Form helpers ---------- */
  const postToNetlify = async (formEl) => {
    // Forms with file inputs must go up as multipart so Netlify keeps the uploads.
    const hasFiles = !!$('input[type="file"]', formEl);
    const response = await fetch('/', hasFiles
      ? { method: 'POST', body: new FormData(formEl) }
      : {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(new FormData(formEl)).toString()
      });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  };

  const errorReporter = (formEl, box) => (message, field) => {
    $$('[aria-invalid]', formEl).forEach((el) => el.removeAttribute('aria-invalid'));
    box.hidden = !message;
    box.textContent = message || '';
    if (field) { field.setAttribute('aria-invalid', 'true'); field.focus(); }
  };

  const field = (formEl, name) => formEl.elements.namedItem(name);
  const RECAP_KEY = 'ztradez-application';

  /* ---------- Country + WhatsApp code pickers ---------- */
  // "ISO Name dial" entries; flags are built from the ISO code.
  const COUNTRIES = "AF Afghanistan 93;AL Albania 355;DZ Algeria 213;AD Andorra 376;AO Angola 244;AG Antigua and Barbuda 1;AR Argentina 54;AM Armenia 374;AW Aruba 297;AU Australia 61;AT Austria 43;AZ Azerbaijan 994;BS Bahamas 1;BH Bahrain 973;BD Bangladesh 880;BB Barbados 1;BY Belarus 375;BE Belgium 32;BZ Belize 501;BJ Benin 229;BM Bermuda 1;BT Bhutan 975;BO Bolivia 591;BA Bosnia and Herzegovina 387;BW Botswana 267;BR Brazil 55;BN Brunei 673;BG Bulgaria 359;BF Burkina Faso 226;BI Burundi 257;KH Cambodia 855;CM Cameroon 237;CA Canada 1;CV Cape Verde 238;KY Cayman Islands 1;CF Central African Republic 236;TD Chad 235;CL Chile 56;CN China 86;CO Colombia 57;KM Comoros 269;CG Congo 242;CD Congo (DRC) 243;CR Costa Rica 506;CI Côte d'Ivoire 225;HR Croatia 385;CU Cuba 53;CW Curaçao 599;CY Cyprus 357;CZ Czechia 420;DK Denmark 45;DJ Djibouti 253;DM Dominica 1;DO Dominican Republic 1;EC Ecuador 593;EG Egypt 20;SV El Salvador 503;GQ Equatorial Guinea 240;ER Eritrea 291;EE Estonia 372;SZ Eswatini 268;ET Ethiopia 251;FJ Fiji 679;FI Finland 358;FR France 33;GF French Guiana 594;PF French Polynesia 689;GA Gabon 241;GM Gambia 220;GE Georgia 995;DE Germany 49;GH Ghana 233;GI Gibraltar 350;GR Greece 30;GL Greenland 299;GD Grenada 1;GP Guadeloupe 590;GU Guam 1;GT Guatemala 502;GN Guinea 224;GW Guinea-Bissau 245;GY Guyana 592;HT Haiti 509;HN Honduras 504;HK Hong Kong 852;HU Hungary 36;IS Iceland 354;IN India 91;ID Indonesia 62;IR Iran 98;IQ Iraq 964;IE Ireland 353;IL Israel 972;IT Italy 39;JM Jamaica 1;JP Japan 81;JO Jordan 962;KZ Kazakhstan 7;KE Kenya 254;KI Kiribati 686;XK Kosovo 383;KW Kuwait 965;KG Kyrgyzstan 996;LA Laos 856;LV Latvia 371;LB Lebanon 961;LS Lesotho 266;LR Liberia 231;LY Libya 218;LI Liechtenstein 423;LT Lithuania 370;LU Luxembourg 352;MO Macau 853;MG Madagascar 261;MW Malawi 265;MY Malaysia 60;MV Maldives 960;ML Mali 223;MT Malta 356;MH Marshall Islands 692;MQ Martinique 596;MR Mauritania 222;MU Mauritius 230;MX Mexico 52;FM Micronesia 691;MD Moldova 373;MC Monaco 377;MN Mongolia 976;ME Montenegro 382;MA Morocco 212;MZ Mozambique 258;MM Myanmar 95;NA Namibia 264;NR Nauru 674;NP Nepal 977;NL Netherlands 31;NC New Caledonia 687;NZ New Zealand 64;NI Nicaragua 505;NE Niger 227;NG Nigeria 234;KP North Korea 850;MK North Macedonia 389;NO Norway 47;OM Oman 968;PK Pakistan 92;PW Palau 680;PS Palestine 970;PA Panama 507;PG Papua New Guinea 675;PY Paraguay 595;PE Peru 51;PH Philippines 63;PL Poland 48;PT Portugal 351;PR Puerto Rico 1;QA Qatar 974;RE Réunion 262;RO Romania 40;RU Russia 7;RW Rwanda 250;KN Saint Kitts and Nevis 1;LC Saint Lucia 1;VC Saint Vincent and the Grenadines 1;WS Samoa 685;SM San Marino 378;ST São Tomé and Príncipe 239;SA Saudi Arabia 966;SN Senegal 221;RS Serbia 381;SC Seychelles 248;SL Sierra Leone 232;SG Singapore 65;SX Sint Maarten 1;SK Slovakia 421;SI Slovenia 386;SB Solomon Islands 677;SO Somalia 252;ZA South Africa 27;KR South Korea 82;SS South Sudan 211;ES Spain 34;LK Sri Lanka 94;SD Sudan 249;SR Suriname 597;SE Sweden 46;CH Switzerland 41;SY Syria 963;TW Taiwan 886;TJ Tajikistan 992;TZ Tanzania 255;TH Thailand 66;TL Timor-Leste 670;TG Togo 228;TO Tonga 676;TT Trinidad and Tobago 1;TN Tunisia 216;TR Türkiye 90;TM Turkmenistan 993;TC Turks and Caicos Islands 1;TV Tuvalu 688;UG Uganda 256;UA Ukraine 380;AE United Arab Emirates 971;GB United Kingdom 44;US United States 1;UY Uruguay 598;UZ Uzbekistan 998;VU Vanuatu 678;VA Vatican City 39;VE Venezuela 58;VN Vietnam 84;VG British Virgin Islands 1;VI U.S. Virgin Islands 1;YE Yemen 967;ZM Zambia 260;ZW Zimbabwe 263"
    .split(';').map((row) => {
      const parts = row.split(' ');
      return { iso: parts[0], name: parts.slice(1, -1).join(' '), dial: `+${parts[parts.length - 1]}` };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  const flag = (iso) => String.fromCodePoint(...[...iso].map((c) => 0x1f1a5 + c.charCodeAt(0)));
  const countrySelect = $('#country');
  const codeSelect = $('#whatsappCode');
  if (countrySelect && codeSelect) {
    COUNTRIES.forEach(({ iso, name, dial }) => {
      countrySelect.add(new Option(`${flag(iso)} ${name}`, name));
      const code = new Option(`${flag(iso)} ${dial}`, dial);
      code.dataset.iso = iso;
      code.title = name;
      codeSelect.add(code);
    });
    // Picking a country pre-fills the WhatsApp code until the applicant changes it themselves
    let codeTouched = false;
    codeSelect.addEventListener('change', () => { codeTouched = true; });
    countrySelect.addEventListener('change', () => {
      if (codeTouched) return;
      const iso = COUNTRIES.find((c) => c.name === countrySelect.value)?.iso;
      const match = [...codeSelect.options].findIndex((o) => o.dataset.iso === iso);
      if (match > 0) codeSelect.selectedIndex = match;
    });
  }

  /* ---------- Application form ---------- */
  const form = $('#mentorshipForm');
  if (form) {
    const steps = $$('.form-step', form);
    const setError = errorReporter(form, $('#formError'));
    const progressLabel = $('#progressLabel');
    const progressBar = $('#progressBar');
    const last = steps.length - 1;
    let current = 0;

    const showStep = (i, focus = true) => {
      current = Math.max(0, Math.min(i, last));
      steps.forEach((step, n) => step.classList.toggle('active', n === current));
      setError('');
      if (progressLabel) progressLabel.textContent = `${String(current + 1).padStart(2, '0')} / ${String(steps.length).padStart(2, '0')}`;
      if (progressBar) progressBar.style.transform = `scaleX(${(current + 1) / steps.length})`;
      if (focus) {
        const target = $('input:not([type="hidden"]):not([type="radio"]), select, textarea, input:checked', steps[current]) || $('input[type="radio"]', steps[current]);
        target?.focus({ preventScroll: true });
      }
    };

    const messages = {
      name: 'Add your name to continue.',
      why: 'Add a sentence or two about what you want to improve.',
      email: 'Enter a valid email address so we can reach you.',
      discord: 'Add your Discord username so we can reach you there.',
      country: 'Choose the country you live in.',
      whatsapp_code: 'Choose your WhatsApp country code.',
      whatsapp: 'Enter a valid WhatsApp number (digits only, without the country code).',
      radio: 'Choose one option to continue.'
    };

    const validateStep = (step) => {
      for (const input of $$('[required]', step)) {
        if (input.type === 'radio') {
          if (!$(`input[name="${CSS.escape(input.name)}"]:checked`, step)) {
            setError(messages.radio);
            $(`input[name="${CSS.escape(input.name)}"]`, step)?.focus();
            return false;
          }
        } else if (!input.value.trim() || !input.checkValidity()) {
          setError(messages[input.name] || 'Please complete this field.', input);
          return false;
        }
      }
      setError('');
      return true;
    };

    const next = () => { if (validateStep(steps[current])) showStep(current + 1); };
    $$('.form-next', form).forEach((btn) => btn.addEventListener('click', next));
    $$('.form-back', form).forEach((btn) => btn.addEventListener('click', () => showStep(current - 1)));

    form.addEventListener('input', (e) => { if (e.target.getAttribute('aria-invalid')) setError(''); });
    form.addEventListener('change', (e) => {
      if (e.target.type !== 'radio') return;
      setError('');
      const stepIndex = steps.indexOf(e.target.closest('.form-step'));
      if (stepIndex === current && current < last) setTimeout(() => { if (current === stepIndex) showStep(current + 1); }, 360);
    });
    form.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') return;
      e.preventDefault();
      if (current < last) next();
      else form.requestSubmit();
    });

    // Answers are kept in this tab only, so the thank-you page can show them back
    const saveRecap = () => {
      const label = (name) => $(`input[name="${name}"]:checked`, form)?.nextElementSibling?.textContent.trim() || '';
      const value = (name) => (field(form, name)?.value || '').trim();
      try {
        sessionStorage.setItem(RECAP_KEY, JSON.stringify({
          name: value('name'), country: value('country'), experience: label('experience'), market: label('market'), challenge: label('challenge'),
          investment: label('investment'), source: label('source'),
          why: value('why'), email: value('email'), discord: value('discord'),
          whatsapp: [value('whatsapp_code'), value('whatsapp')].filter(Boolean).join(' '), at: Date.now()
        }));
      } catch (error) { /* storage unavailable: thank-you page falls back to a generic message */ }
    };

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (current < last) { next(); return; }
      if (!validateStep(steps[current])) return;

      const submit = $('.form-submit', form);
      const original = submit.innerHTML;
      submit.disabled = true;
      submit.textContent = 'Submitting…';
      try {
        await postToNetlify(form);
      } catch (error) {
        submit.disabled = false;
        submit.innerHTML = original;
        setError('Your application could not be sent. Check your connection and try again, or reach ZTRADEZ through Discord.');
        return;
      }
      saveRecap();
      location.href = 'thank-you.html';
    });

    showStep(0, false);
  }

  /* ---------- Thank-you recap ---------- */
  const recap = $('#recap');
  if (recap) {
    let data = null;
    try { data = JSON.parse(sessionStorage.getItem(RECAP_KEY) || 'null'); } catch (error) { data = null; }
    if (data?.name) {
      $$('[data-recap]', recap).forEach((dd) => {
        const value = String(data[dd.dataset.recap] || '').trim();
        if (value) dd.textContent = dd.classList.contains('quote') ? `“${value}”` : value;
        else dd.closest('.recap-row').hidden = true;
      });
      $('#tyGreeting').textContent = `Thank you, ${data.name.split(/\s+/)[0]}.`;
      if (data.at) {
        $('#recapTime').textContent = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(data.at);
      }
      recap.hidden = false;
    } else {
      $('#tyGrid')?.classList.add('no-recap');
    }
  }

  /* ---------- Student review form ---------- */
  const reviewForm = $('#reviewForm');
  if (reviewForm) {
    const setError = errorReporter(reviewForm, $('.form-error', reviewForm));
    const stars = $('.stars', reviewForm);
    const PHOTO_LIMIT = 8 * 1024 * 1024;

    $$('.photo-tile', reviewForm).forEach((tile) => {
      const input = $('input', tile);
      const clear = $('.photo-clear', tile);
      let url = '';
      const show = () => {
        if (url) URL.revokeObjectURL(url);
        const file = input.files[0];
        url = file && file.type.startsWith('image/') ? URL.createObjectURL(file) : '';
        tile.style.backgroundImage = url ? `url("${url}")` : '';
        tile.classList.toggle('has-file', !!file);
        clear.hidden = !file;
      };
      input.addEventListener('change', show);
      clear.addEventListener('click', () => { input.value = ''; show(); input.focus(); });
    });

    const validate = () => {
      const name = field(reviewForm, 'name');
      const duration = field(reviewForm, 'duration');
      const review = field(reviewForm, 'review');
      const email = field(reviewForm, 'email');
      if (!name.value.trim()) { setError('Add your name or handle.', name); return false; }
      if (!duration.value) { setError('Choose how long you were in mentorship.', duration); return false; }
      if (!$('input[name="rating"]:checked', reviewForm)) {
        setError('Choose a star rating.');
        stars.setAttribute('aria-invalid', 'true');
        $('#star5')?.focus();
        return false;
      }
      if (review.value.trim().length < 10) { setError('Write at least a sentence about your experience.', review); return false; }
      if (!email.value.trim() || !email.checkValidity()) { setError('Enter a valid email so we can confirm the review is yours.', email); return false; }
      const photos = $$('.photo-tile input', reviewForm).flatMap((input) => [...input.files]);
      if (photos.some((file) => !file.type.startsWith('image/'))) { setError('Photos must be image files.'); return false; }
      if (photos.reduce((sum, file) => sum + file.size, 0) > PHOTO_LIMIT) { setError('Photos are over 8 MB in total. Remove one or use smaller images.'); return false; }
      setError('');
      return true;
    };

    reviewForm.addEventListener('input', () => { if ($('[aria-invalid]', reviewForm)) setError(''); });
    reviewForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!validate()) return;
      const submit = $('.form-submit', reviewForm);
      const original = submit.innerHTML;
      submit.disabled = true;
      submit.textContent = 'Sending…';
      try {
        await postToNetlify(reviewForm);
      } catch (error) {
        submit.disabled = false;
        submit.innerHTML = original;
        setError('Your review could not be sent. Check your connection and try again.');
        return;
      }
      reviewForm.classList.add('is-sent');
      $('.form-success', reviewForm).scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }
})();
