(function(){
  const STORAGE_KEY = 'portfolio_content_override';

  async function loadContent() {
    try {
      const override = localStorage.getItem(STORAGE_KEY);
      if (override) return JSON.parse(override);
    } catch(e) { console.warn('Invalid override JSON, falling back to default'); }

    const res = await fetch('assets/content.json', { cache: 'no-store' });
    return await res.json();
  }

  function setText(sel, text) {
    const el = document.querySelector(sel);
    if (el && typeof text === 'string') el.textContent = text;
  }

  function setHref(sel, href) {
    const el = document.querySelector(sel);
    if (el && typeof href === 'string') el.setAttribute('href', href);
  }

  function renderHome(profile) {
    if (!profile) return;
    setText('.hero-text h1', profile.name);
    setText('.headline', profile.headline);
    setText('.summary', profile.summary);
    // Resume: support data URL download without publish
    (function(){
      const a = document.querySelector('.cta-row .btn.primary');
      if (!a) return;
      const resume = profile.resume || '';
      // Clean any previous state
      a.removeAttribute('download');
      if (resume.startsWith('data:application/pdf')) {
        try {
          const base64 = resume.split(',')[1];
          const bin = atob(base64);
          const bytes = new Uint8Array(bin.length);
          for (let i=0;i<bin.length;i++) bytes[i] = bin.charCodeAt(i);
          const blob = new Blob([bytes], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          a.setAttribute('href', url);
          a.setAttribute('download', (profile.name||'resume').replace(/\s+/g,'_') + '.pdf');
        } catch (e) {
          console.warn('Failed to prepare resume blob, falling back to href');
          setHref('.cta-row .btn.primary', resume);
        }
      } else {
        setHref('.cta-row .btn.primary', resume);
      }
    })();
    const img = document.getElementById('profilePhoto');
    if (img) {
      const src = profile.photo && profile.photo.trim() ? profile.photo : 'assets/img/profile.svg';
      img.onerror = () => {
        console.warn('Profile image failed to load, using fallback');
        img.src = 'assets/img/profile.svg';
      };
      img.src = src;
      if (profile.name) img.alt = profile.name;
    }
  }

  function ul(items) {
    return `<ul>${(items||[]).map(i=>`<li>${i}</li>`).join('')}</ul>`;
  }

  function renderSkills(skills) {
    if (!skills) return;
    const grid = document.querySelector('#skills .skills-grid');
    if (!grid) return;
    const blocks = [
      { title:'Languages', icon:'fa-code', list: skills.languages },
      { title:'Machine Learning', icon:'fa-gears', list: skills.machine_learning },
      { title:'Deep Learning & NLP', icon:'fa-brain', list: skills.deep_learning_nlp },
      { title:'Data Analysis & Visualization', icon:'fa-chart-simple', list: skills.data_viz },
      { title:'Databases & Cloud', icon:'fa-cloud', list: skills.databases_cloud },
      { title:'Tools', icon:'fa-toolbox', list: skills.tools }
    ];
    grid.innerHTML = blocks.map(b=>`
      <div class="skill-card">
        <h4><i class="fa-solid ${b.icon}"></i> ${b.title}</h4>
        ${ul(b.list)}
      </div>`).join('');
  }

  function renderAbout(about) {
    if (!about) return;
    const paras = document.querySelectorAll('#about .two-col p');
    if (paras[0]) paras[0].textContent = about.para1 || '';
    if (paras[1]) paras[1].textContent = about.para2 || '';
  }

  function renderExperience(exps) {
    const container = document.querySelector('#experience .container');
    if (!container) return;
    const title = container.querySelector('.section-title');
    const wrap = document.createElement('div');
    (exps||[]).forEach(exp => {
      const item = document.createElement('div');
      item.className = 'experience-item';
      const header = document.createElement('div');
      header.className = 'exp-header';
      header.innerHTML = `<h4>${exp.role||''}</h4><span>${exp.company||''}</span>`;
      const points = document.createElement('ul');
      points.className = 'exp-points';
      (exp.points||[]).forEach(p=>{
        const li = document.createElement('li'); li.textContent = p; points.appendChild(li);
      });
      item.appendChild(header); item.appendChild(points);
      wrap.appendChild(item);
    });
    // replace existing after title
    container.querySelectorAll('.experience-item').forEach(n=>n.remove());
    container.appendChild(wrap);
  }

  function renderProjects(projects) {
    const grid = document.querySelector('#projects .cards-grid');
    if (!grid) return;
    grid.innerHTML = (projects||[]).map(p=>`
      <article class="card" data-category="${(p.category||'Other').toLowerCase()}">
        <div class="card-icon"><i class="fa-solid ${p.icon||'fa-diagram-project'}"></i></div>
        <h4>${p.title||''}</h4>
        <p>${p.desc||''}</p>
        <ul class="tags">${(p.tags||[]).map(t=>`<li>${t}</li>`).join('')}</ul>
        ${p.link ? `<a class="card-link" href="${p.link}" target="_blank" rel="noreferrer">View <i class="fa-solid fa-arrow-up-right-from-square"></i></a>` : ''}
      </article>
    `).join('');
  }

  function renderProjectFilters(projects) {
    const bar = document.querySelector('#projects .project-filters');
    const grid = document.querySelector('#projects .cards-grid');
    if (!bar || !grid) return;
    const cats = Array.from(new Set((projects||[]).map(p => (p.category||'Other'))));
    const allCats = ['All', ...cats];
    bar.innerHTML = allCats.map((c,i)=>`<button class="filter-btn ${i===0?'active':''}" data-filter="${c.toLowerCase()}">${c}</button>`).join('');
    bar.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;
      bar.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const f = btn.dataset.filter;
      grid.querySelectorAll('.card').forEach(card => {
        const c = card.dataset.category;
        const show = (f === 'all') || (c === f);
        card.style.display = show ? '' : 'none';
      });
    });
  }

  let charts = [];
  function clearCharts() {
    charts.forEach(c => c.destroy());
    charts = [];
  }

  function renderInsights(insights) {
    if (!insights || typeof Chart === 'undefined') return;
    clearCharts();
    // Register datalabels plugin if present
    if (typeof ChartDataLabels !== 'undefined' && !Chart.registry.plugins.get('datalabels')) {
      Chart.register(ChartDataLabels);
    }
    const css = getComputedStyle(document.documentElement);
    const colText = css.getPropertyValue('--text').trim();
    const colMuted = css.getPropertyValue('--muted').trim();
    const brand = css.getPropertyValue('--brand').trim() || '#7c5cff';
    const brand2 = css.getPropertyValue('--brand-2').trim() || '#22d3ee';
    const palette = [brand2, brand, '#34d399', '#f59e0b', '#ef4444', '#10b981', '#3b82f6'];

    // Projects by Category
    const pc = insights.project_categories || {};
    const pcLabels = Object.keys(pc);
    const pcData = Object.values(pc);
    const ctxP = document.getElementById('chartProjects');
    if (ctxP) {
      charts.push(new Chart(ctxP, {
        type: 'doughnut',
        data: { labels: pcLabels, datasets: [{ data: pcData, backgroundColor: palette, borderWidth: 0 }] },
        options: {
          plugins: {
            legend: { labels: { color: colText } },
            datalabels: {
              color: colText,
              formatter: (v, ctx) => {
                const sum = ctx.chart.data.datasets[0].data.reduce((a,b)=>a+b,0) || 1;
                const pct = Math.round((v/sum)*100);
                return pct > 0 ? pct + '%' : '';
              }
            }
          }
        }
      }));
    }

    // Skills Strength
    const ss = insights.skills_strength || {};
    const ssLabels = Object.keys(ss);
    const ssData = Object.values(ss);
    const ctxS = document.getElementById('chartSkills');
    if (ctxS) {
      const g = ctxS.getContext('2d');
      const grad = g.createLinearGradient(0, 0, 0, ctxS.height);
      grad.addColorStop(0, brand);
      grad.addColorStop(1, brand2);
      charts.push(new Chart(ctxS, {
        type: 'bar',
        data: { labels: ssLabels, datasets: [{ label: 'Level (1-10)', data: ssData, backgroundColor: grad, borderRadius: 6 }] },
        options: {
          scales: {
            x: { ticks: { color: colMuted } },
            y: { beginAtZero: true, max: 10, ticks: { color: colMuted } }
          },
          plugins: {
            legend: { labels: { color: colText } },
            datalabels: { color: colText, anchor: 'end', align: 'top', formatter: (v)=> v }
          }
        }
      }));
    }

    // Tech Frequency (horizontal bar)
    const tf = insights.tech_frequency || {};
    const tfLabels = Object.keys(tf);
    const tfData = Object.values(tf);
    const ctxT = document.getElementById('chartTech');
    if (ctxT) {
      const g2 = ctxT.getContext('2d');
      const grad2 = g2.createLinearGradient(0, 0, ctxT.width, 0);
      grad2.addColorStop(0, brand2);
      grad2.addColorStop(1, brand);
      charts.push(new Chart(ctxT, {
        type: 'bar',
        data: { labels: tfLabels, datasets: [{ label: 'Count', data: tfData, backgroundColor: grad2, borderRadius: 6 }] },
        options: {
          indexAxis: 'y',
          scales: {
            x: { beginAtZero: true, ticks: { color: colMuted } },
            y: { ticks: { color: colMuted } }
          },
          plugins: { legend: { labels: { color: colText } }, datalabels: { color: colText, anchor: 'end', align: 'right' } }
        }
      }));
    }
  }

  function renderEducation(items) {
    const tl = document.querySelector('#education .timeline');
    if (!tl) return;
    tl.innerHTML = (items||[]).map(it=>`
      <div class="timeline-item">
        <div class="tl-dot"></div>
        <div class="tl-content">
          <h4>${it.title||''}</h4>
          <p>${it.org||''}</p>
        </div>
      </div>`).join('');
  }

  function renderCerts(list) {
    const ulEl = document.querySelector('#certifications .cert-list');
    if (!ulEl) return;
    ulEl.innerHTML = (list||[]).map(c=>`
      <li><i class="fa-solid fa-certificate"></i> ${c}</li>
    `).join('');
  }

  function renderContact(contact) {
    const grid = document.querySelector('#contact .contact-grid');
    if (!grid || !contact) return;
    grid.innerHTML = `
      <a class="contact-item" href="mailto:${contact.email}" target="_blank" rel="noreferrer">
        <i class="fa-solid fa-envelope"></i>
        <span>Email</span>
        <small>${contact.email}</small>
      </a>
      <a class="contact-item" href="tel:${contact.phone}">
        <i class="fa-solid fa-phone"></i>
        <span>Phone</span>
        <small>${contact.phone}</small>
      </a>
      <a class="contact-item" href="${contact.linkedin?.url||'#'}" target="_blank" rel="noreferrer">
        <i class="fa-brands fa-linkedin"></i>
        <span>LinkedIn</span>
        <small>${contact.linkedin?.label||''}</small>
      </a>
      <a class="contact-item" href="${contact.github?.url||'#'}" target="_blank" rel="noreferrer">
        <i class="fa-brands fa-github"></i>
        <span>GitHub</span>
        <small>${contact.github?.label||''}</small>
      </a>`;
  }

  async function init() {
    try {
      const data = await loadContent();
      renderHome(data.profile);
      renderAbout(data.about);
      renderSkills(data.skills);
      renderExperience(data.experience);
      renderProjects(data.projects);
      renderProjectFilters(data.projects);
      renderInsights(data.insights);
      renderEducation(data.education);
      renderCerts(data.certifications);
      renderContact(data.contact);
      // Rebuild charts on theme change
      window.addEventListener('themechange', () => renderInsights(data.insights));
    } catch (e) {
      console.error('Failed to load content', e);
    }
  }

  // Defer until DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
