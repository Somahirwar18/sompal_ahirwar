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

  // Smooth scroll for anchor links
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    if (!id) return;
    const el = document.getElementById(id);
    if (el) {
      e.preventDefault();
      window.scrollTo({ top: el.offsetTop - 70, behavior: 'smooth' });
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
    if (y > 400) backBtn.classList.add('show'); else backBtn.classList.remove('show');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  backBtn?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  // Initialize state
  onScroll();
})();
