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
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 4))).toLocaleString();
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
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

  /* ---------- Application form ---------- */
  const form = $('#mentorshipForm');
  if (!form) return;
  const steps = $$('.form-step', form);
  const success = $('.form-success', form);
  const errorBox = $('#formError');
  const progressLabel = $('#progressLabel');
  const progressBar = $('#progressBar');
  const last = steps.length - 1;
  let current = 0;

  const setError = (message, field) => {
    $$('[aria-invalid]', form).forEach((el) => el.removeAttribute('aria-invalid'));
    errorBox.hidden = !message;
    errorBox.textContent = message || '';
    if (field) { field.setAttribute('aria-invalid', 'true'); field.focus(); }
  };

  const showStep = (i, focus = true) => {
    current = Math.max(0, Math.min(i, last));
    steps.forEach((step, n) => step.classList.toggle('active', n === current));
    setError('');
    if (progressLabel) progressLabel.textContent = `${String(current + 1).padStart(2, '0')} / ${String(steps.length).padStart(2, '0')}`;
    if (progressBar) progressBar.style.transform = `scaleX(${(current + 1) / steps.length})`;
    if (focus) {
      const target = $('input:not([type="hidden"]):not([type="radio"]), textarea, input:checked', steps[current]) || $('input[type="radio"]', steps[current]);
      target?.focus({ preventScroll: true });
    }
  };

  const messages = {
    name: 'Add your name to continue.',
    why: 'Add a sentence or two about what you want to improve.',
    email: 'Enter a valid email address so we can reach you.',
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

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (current < last) { next(); return; }
    if (!validateStep(steps[current])) return;

    const submit = $('.form-submit', form);
    const original = submit.innerHTML;
    submit.disabled = true;
    submit.textContent = 'Submitting…';

    try {
      const body = new URLSearchParams(new FormData(form)).toString();
      const response = await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      submit.disabled = false;
      submit.innerHTML = original;
      setError('Your application could not be sent. Check your connection and try again, or reach ZTRADEZ through Discord.');
      return;
    }

    steps.forEach((step) => step.classList.remove('active'));
    $('.form-progress', form).hidden = true;
    success.classList.add('active');
  });

  showStep(0, false);
})();
