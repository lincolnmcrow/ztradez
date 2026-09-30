(() => {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scrollProgress = document.getElementById('scrollProgress');
  const mobileApply = document.querySelector('.mobile-apply');
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  const updateScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
    if (scrollProgress) scrollProgress.style.width = `${ratio * 100}%`;
    if (mobileApply) mobileApply.classList.toggle('show', window.scrollY > 560);

    if (!prefersReduced) {
      document.querySelectorAll('[data-parallax]').forEach((el) => {
        const amount = Number(el.dataset.parallax || 0);
        const rect = el.getBoundingClientRect();
        const center = rect.top + rect.height / 2 - window.innerHeight / 2;
        const y = Math.max(-22, Math.min(22, -center * amount));
        const img = el.querySelector('img');
        if (img) img.style.transform = `translateY(${y}px) scale(1.045)`;
      });
    }
  };
  updateScroll();
  window.addEventListener('scroll', updateScroll, { passive: true });
  window.addEventListener('resize', updateScroll);

  const revealEls = document.querySelectorAll('.reveal, .process-line');
  if (prefersReduced || !('IntersectionObserver' in window)) {
    revealEls.forEach(el => el.classList.add('in-view'));
  } else {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -4% 0px' });
    revealEls.forEach(el => observer.observe(el));
  }

  const counters = document.querySelectorAll('.counter');
  const animateCounter = (el) => {
    const target = Number(el.dataset.target || 0);
    if (prefersReduced) { el.textContent = target; return; }
    const duration = 1450;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.floor(target * eased).toLocaleString();
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  if ('IntersectionObserver' in window) {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !entry.target.dataset.animated) {
          entry.target.dataset.animated = 'true';
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });
    counters.forEach(c => counterObserver.observe(c));
  } else {
    counters.forEach(animateCounter);
  }

  const form = document.getElementById('mentorshipForm');
  if (!form) return;
  const steps = [...form.querySelectorAll('.form-step')];
  const success = form.querySelector('.form-success');
  const progressLabel = document.getElementById('progressLabel');
  const progressBar = document.getElementById('progressBar');
  let currentStep = 0;

  const showStep = (index) => {
    currentStep = Math.max(0, Math.min(index, steps.length - 1));
    steps.forEach((step, i) => step.classList.toggle('active', i === currentStep));
    if (progressLabel) progressLabel.textContent = `${String(currentStep + 1).padStart(2, '0')} / ${String(steps.length).padStart(2, '0')}`;
    if (progressBar) progressBar.style.width = `${((currentStep + 1) / steps.length) * 100}%`;
  };

  const validateStep = (step) => {
    const required = [...step.querySelectorAll('[required]')];
    for (const input of required) {
      if (input.type === 'radio') {
        const checked = step.querySelector(`input[name="${CSS.escape(input.name)}"]:checked`);
        if (!checked) {
          const first = step.querySelector(`input[name="${CSS.escape(input.name)}"]`);
          first?.focus();
          return false;
        }
      } else if (!input.checkValidity()) {
        input.reportValidity();
        return false;
      }
    }
    return true;
  };

  form.querySelectorAll('.form-next').forEach(btn => btn.addEventListener('click', () => {
    if (validateStep(steps[currentStep])) showStep(currentStep + 1);
  }));
  form.querySelectorAll('.form-back').forEach(btn => btn.addEventListener('click', () => showStep(currentStep - 1)));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!validateStep(steps[currentStep])) return;

    const submit = form.querySelector('.form-submit');
    const original = submit.innerHTML;
    submit.disabled = true;
    submit.textContent = 'Submitting…';

    try {
      const formData = new FormData(form);
      const encoded = new URLSearchParams();
      for (const [key, value] of formData.entries()) encoded.append(key, value);
      const response = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: encoded.toString()
      });
      if (!response.ok && location.protocol !== 'file:') throw new Error('Submission failed');
    } catch (error) {
      if (location.protocol !== 'file:') {
        submit.disabled = false;
        submit.innerHTML = original;
        alert('The application could not be submitted. Please try again or contact ZTRADEZ through Discord.');
        return;
      }
    }

    steps.forEach(step => step.classList.remove('active'));
    form.querySelector('.form-progress').style.display = 'none';
    success.classList.add('active');
  });
})();

// ===== Premium motion enhancements =====
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const header = document.querySelector('.site-header');
  const progress = document.getElementById('scrollProgress');

  const releaseIntro = () => document.body.classList.add('is-ready');
  if (document.readyState === 'complete') setTimeout(releaseIntro, reduceMotion ? 0 : 420);
  else window.addEventListener('load', () => setTimeout(releaseIntro, reduceMotion ? 0 : 420), { once: true });
  setTimeout(releaseIntro, 1800);

  const revealGroups = ['.hero', '.stats-grid', '.mentorship-grid', '.process-grid', '.photo-grid', '.content-grid', '.faq-list'];
  revealGroups.forEach((selector) => {
    document.querySelectorAll(selector).forEach((group) => {
      [...group.querySelectorAll('.reveal')].forEach((el, index) => {
        el.style.setProperty('--reveal-delay', `${Math.min(index, 6) * 85}ms`);
      });
    });
  });

  document.querySelectorAll('.hero-image-frame, .video-shell, .photo-card, .affiliate-photo').forEach((el) => el.setAttribute('data-tilt', ''));

  let ticking = false;
  const updateFrame = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    const ratio = max > 0 ? Math.min(Math.max(scrollY / max, 0), 1) : 0;
    if (progress) progress.style.transform = `scaleX(${ratio})`;
    if (header) header.classList.toggle('is-scrolled', scrollY > 28);
    ticking = false;
  };
  const requestFrame = () => {
    if (!ticking) { ticking = true; requestAnimationFrame(updateFrame); }
  };
  addEventListener('scroll', requestFrame, { passive: true });
  addEventListener('resize', requestFrame);
  requestFrame();

  if ('IntersectionObserver' in window) {
    const navLinks = [...document.querySelectorAll('.desktop-nav a[href^="#"]')];
    const byId = new Map(navLinks.map((a) => [a.getAttribute('href').slice(1), a]));
    const sectionObserver = new IntersectionObserver((entries) => {
      const visible = entries.filter((e) => e.isIntersecting).sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      navLinks.forEach((a) => a.classList.remove('active'));
      byId.get(visible.target.id)?.classList.add('active');
    }, { rootMargin: '-28% 0px -58% 0px', threshold: [0, .15, .35, .6] });
    byId.forEach((_, id) => { const section = document.getElementById(id); if (section) sectionObserver.observe(section); });
  }

  if (!finePointer || reduceMotion) return;

  document.querySelectorAll('.button, .nav-apply, .text-link').forEach((el) => {
    el.addEventListener('pointermove', (event) => {
      const rect = el.getBoundingClientRect();
      const x = (event.clientX - rect.left - rect.width / 2) * .09;
      const y = (event.clientY - rect.top - rect.height / 2) * .12;
      el.style.setProperty('--mag-x', `${x}px`);
      el.style.setProperty('--mag-y', `${y}px`);
    });
    el.addEventListener('pointerleave', () => {
      el.style.setProperty('--mag-x', '0px');
      el.style.setProperty('--mag-y', '0px');
    });
  });

  document.querySelectorAll('[data-tilt]').forEach((el) => {
    el.addEventListener('pointermove', (event) => {
      const rect = el.getBoundingClientRect();
      const nx = (event.clientX - rect.left) / rect.width - .5;
      const ny = (event.clientY - rect.top) / rect.height - .5;
      const rx = (-ny * 1.35).toFixed(2);
      const ry = (nx * 1.55).toFixed(2);
      el.style.transform = `perspective(1200px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-2px)`;
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });
})();
