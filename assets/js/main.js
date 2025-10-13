(function() {
  const html = document.documentElement;
  const themeToggle = document.getElementById('themeToggle');
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  // Year in footer
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Theme: load preference
  const getPreferredTheme = () => {
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  };

  const applyTheme = (mode) => {
    if (mode === 'light') {
      html.classList.add('light');
      html.classList.remove('dark');
      themeToggle.setAttribute('aria-pressed', 'false');
      themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
    } else {
      html.classList.remove('light');
      html.classList.add('dark');
      themeToggle.setAttribute('aria-pressed', 'true');
      themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }
    // Notify listeners (e.g., charts) that theme changed
    window.dispatchEvent(new CustomEvent('themechange', { detail: { mode } }));
  };

  applyTheme(getPreferredTheme());

  // Respond to system theme changes if user hasn't explicitly chosen
  const mql = window.matchMedia('(prefers-color-scheme: light)');
  const onSystemThemeChange = () => {
    const stored = localStorage.getItem('theme');
    if (stored !== 'light' && stored !== 'dark') {
      applyTheme(mql.matches ? 'light' : 'dark');
    }
  };
  if (typeof mql.addEventListener === 'function') {
    mql.addEventListener('change', onSystemThemeChange);
  } else if (typeof mql.addListener === 'function') {
    // Safari fallback
    mql.addListener(onSystemThemeChange);
  }

  // Theme: toggle
  themeToggle?.addEventListener('click', () => {
    const isLight = html.classList.contains('light');
    const next = isLight ? 'dark' : 'light';
    applyTheme(next);
    localStorage.setItem('theme', next);
  });

  // Mobile nav toggle
  navToggle?.addEventListener('click', () => {
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!expanded));
    navLinks?.classList.toggle('show');
  });

  // Close mobile menu when clicking a link
  navLinks?.addEventListener('click', (e) => {
    const target = e.target;
    if (target.tagName === 'A') {
      navLinks.classList.remove('show');
      navToggle?.setAttribute('aria-expanded', 'false');
    }
  });

  // Smooth scroll for anchor links (respect reduced motion)
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    if (!id) return;
    const el = document.getElementById(id);
    if (el) {
      e.preventDefault();
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const headerOffset = 70;
      const top = Math.max(0, el.offsetTop - headerOffset);
      window.scrollTo({ top, behavior: prefersReduced ? 'auto' : 'smooth' });
      // Update URL hash without jumping
      history.pushState(null, '', `#${id}`);
    }
  });

  // Reveal on scroll
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

  // Back to top button
  const backBtn = document.getElementById('backToTop');
  const onScroll = () => {
    if (!backBtn) return;
    const y = window.scrollY || document.documentElement.scrollTop;
    const show = y > 400;
    backBtn.classList.toggle('show', show);
    backBtn.setAttribute('aria-hidden', show ? 'false' : 'true');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  backBtn?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  // Initialize state
  onScroll();

  // Active nav link highlighting
  const sections = Array.from(document.querySelectorAll('main section[id]'));
  const navAnchors = navLinks ? Array.from(navLinks.querySelectorAll('a[href^="#"]')) : [];
  const setActiveNav = () => {
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const HEADER = 80;
    let currentId = '';
    for (const sec of sections) {
      const top = sec.offsetTop - HEADER;
      if (scrollY >= top) currentId = sec.id;
    }
    navAnchors.forEach(a => {
      const id = a.getAttribute('href').slice(1);
      a.classList.toggle('active', id === currentId);
    });
  };
  window.addEventListener('scroll', setActiveNav, { passive: true });
  window.addEventListener('resize', setActiveNav);
  setActiveNav();
})();
