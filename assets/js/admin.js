(function(){
  // Block admin panel on non-localhost environments to prevent public access
  try {
    const isLocal = (location.protocol === 'file:') || ['localhost','127.0.0.1'].includes(location.hostname);
    if (!isLocal) {
      // Redirect visitors to the public site and stop executing admin scripts
      window.location.replace('index.html');
      return;
    }
  } catch (_) {
    // If anything goes wrong, fail closed
    try { window.location.replace('index.html'); } catch(e) {}
    return;
  }
  const STORAGE_KEY = 'portfolio_content_override';
  // Auth via admins.json
  const editor = document.getElementById('jsonEditor');
  const mount = document.getElementById('formMount');
  const loadDefaultBtn = document.getElementById('loadDefault');
  const applyBtn = document.getElementById('applyChanges');
  const exportBtn = document.getElementById('exportJson');
  const importInput = document.getElementById('importFile');
  const resetBtn = document.getElementById('resetLocal');
  const authGate = document.getElementById('authGate');
  const authLogin = document.getElementById('authLogin');
  const authUser = document.getElementById('authUsername');
  const authPass = document.getElementById('authPassword');
  // Removed unused elements (authConfirm, confirmWrap) to avoid null-reference usage

  let state = null; // JS object reflecting current content
  let admins = null; // cached admins list

  // ---------- Persistence helpers ----------
  const setEditorFromState = () => {
    if (!editor) return;
    editor.value = JSON.stringify(state, null, 2);
  };

  const saveEditorToStorage = () => {
    try {
      const parsed = JSON.parse(editor.value);
      state = parsed;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      alert('Saved! Refresh the main site to see changes.');
    } catch (e) {
      alert('Invalid JSON. Please fix errors before saving.');
    }
  };

  const loadDefault = async () => {
    try {
      const res = await fetch('assets/content.json', { cache: 'no-store' });
      const data = await res.json();
      state = data;
      setEditorFromState();
      renderForm();
    } catch (e) {
      alert('Failed to load default content.json');
      console.error(e);
    }
  };

  const loadCurrent = async () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        state = JSON.parse(raw);
        setEditorFromState();
        renderForm();
        return;
      } catch (e) {
        console.warn('Invalid JSON in localStorage, loading default');
      }
    }
    await loadDefault();
  };

  // ---------- Form rendering helpers ----------
  const el = (tag, attrs={}, children=[]) => {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k,v]) => {
      if (k === 'class') node.className = v;
      else if (k === 'for') node.htmlFor = v;
      else if (k === 'value') node.value = v;
      else node.setAttribute(k, v);
    });
    children.forEach(c => node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
    return node;
  };

  const field = (label, inputEl) => el('div', { class: 'field' }, [
    el('label', {}, [label]),
    inputEl
  ]);

  const attachCounter = (elInput, max) => {
    if (!max) return elInput;
    elInput.setAttribute('maxlength', String(max));
    const wrap = el('div');
    const counter = el('small', { class: 'admin-note' }, [`${elInput.value.length}/${max}`]);
    elInput.addEventListener('input', () => { counter.textContent = `${elInput.value.length}/${max}`; });
    wrap.appendChild(elInput); wrap.appendChild(counter); return wrap;
  };

  const inputText = (value='', placeholder='', oninput, maxLen=0) => {
    const i = el('input', { type:'text', value, placeholder, class:'admin-input' });
    i.addEventListener('input', () => oninput(i.value));
    return attachCounter(i, maxLen);
  };

  const textarea = (value='', placeholder='', oninput, maxLen=0) => {
    const t = el('textarea', { class:'admin-textarea', placeholder });
    t.value = value;
    t.addEventListener('input', () => oninput(t.value));
    return attachCounter(t, maxLen);
  };

  const numberInput = (value=0, min=0, max=100, oninput) => {
    const n = el('input', { type:'number', value: String(value), min: String(min), max: String(max), class:'admin-input' });
    n.addEventListener('input', () => oninput(Number(n.value)));
    return n;
  };

  const commaListInput = (arr=[], placeholder, oninput) => {
    const t = inputText(arr.join(', '), placeholder, v => oninput(v.split(',').map(s=>s.trim()).filter(Boolean)));
    return t;
  };

  const kvEditor = (obj={}, {title, keyPlaceholder='Key', valPlaceholder='Value (number)'} , onChange) => {
    const wrap = el('div', { class:'kv-wrap' });
    const list = el('div', { class:'kv-list' });
    const addRow = (k='', v=0) => {
      const row = el('div', { class:'kv-row' });
      const kIn = inputText(k, keyPlaceholder, sync);
      const vIn = numberInput(v, 0, 999, sync);
      const del = el('button', { type:'button', class:'btn small danger' }, [el('i',{class:'fa-solid fa-xmark'}), document.createTextNode(' Remove')]);
      del.addEventListener('click', () => { row.remove(); sync(); });
      row.append(kIn, vIn, del);
      list.appendChild(row);
    };
    const sync = () => {
      const rows = Array.from(list.children);
      const out = {};
      rows.forEach(r => {
        const [kIn, vIn] = r.querySelectorAll('input');
        const k = kIn.value.trim();
        const v = Number(vIn.value);
        if (k) out[k] = isNaN(v)?0:v;
      });
      onChange(out);
      setEditorFromState();
    };
    Object.entries(obj).forEach(([k,v]) => addRow(k, v));
    const addBtn = el('button', { type:'button', class:'btn ghost small' }, [el('i',{class:'fa-solid fa-plus'}), document.createTextNode(' Add Row')]);
    addBtn.addEventListener('click', () => { addRow('', 0); });
    wrap.append(el('h4', {}, [title]), list, addBtn);
    return wrap;
  };

  const arrayEditor = (arr=[], itemFactory, onChange) => {
    const wrap = el('div', { class:'arr-wrap' });
    const list = el('div', { class:'arr-list' });
    const sync = () => {
      const items = Array.from(list.children).map(c => c.__getValue());
      onChange(items);
      setEditorFromState();
    };
    const addItem = (data) => {
      const itemEl = itemFactory(data, () => { itemEl.remove(); sync(); }, sync);
      list.appendChild(itemEl);
    };
    arr.forEach(addItem);
    const addBtn = el('button', { type:'button', class:'btn ghost small' }, [el('i',{class:'fa-solid fa-plus'}), document.createTextNode(' Add Item')]);
    addBtn.addEventListener('click', () => addItem(null));
    wrap.append(list, addBtn);
    return wrap;
  };

  // ---------- Section builders ----------
  const section = (title, contentEl) => el('section', { class:'admin-section' }, [ el('h3', {}, [title]), contentEl ]);

  const profileSection = (data) => {
    const s = data.profile || (data.profile = {});
    const wrap = el('div');
    // Photo controls
    const photoRow = el('div', { class:'card-like' });
    const preview = el('img', { src: s.photo || 'assets/img/profile.svg', alt: 'Profile photo preview', style: 'width:120px;height:120px;object-fit:cover;border-radius:50%;border:2px solid var(--border);' });
    const fileIn = el('input', { type:'file', accept:'image/*' });
    const urlIn = inputText(s.photo||'', 'Image URL or data URL', v => { s.photo=v; preview.src=v||'assets/img/profile.svg'; setEditorFromState(); }, 500);
    const removeBtn = el('button', { type:'button', class:'btn small danger' }, [el('i',{class:'fa-solid fa-trash'}), document.createTextNode(' Remove Photo')]);
    removeBtn.addEventListener('click', () => { s.photo=''; preview.src='assets/img/profile.svg'; urlIn.value=''; setEditorFromState(); });
    fileIn.addEventListener('change', () => {
      const f = fileIn.files?.[0]; if (!f) return;
      if (!f.type.startsWith('image/')) { alert('Please select an image file.'); return; }
      const MAX_MB = 1.5; // size limit
      if (f.size > MAX_MB * 1024 * 1024) { alert(`Image too large. Max ${MAX_MB}MB`); return; }
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          // Validate dimensions and produce square 512x512 canvas with cover fit
          const CANVAS_SIZE = 512;
          const canvas = document.createElement('canvas');
          canvas.width = CANVAS_SIZE; canvas.height = CANVAS_SIZE;
          const ctx = canvas.getContext('2d');
          // cover fit
          const scale = Math.max(CANVAS_SIZE / img.width, CANVAS_SIZE / img.height);
          const x = (CANVAS_SIZE / 2) - (img.width / 2) * scale;
          const y = (CANVAS_SIZE / 2) - (img.height / 2) * scale;
          ctx.fillStyle = '#0000';
          ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
          s.photo = dataUrl; preview.src = dataUrl; urlIn.value = dataUrl; setEditorFromState();
        };
        img.onerror = () => alert('Invalid image.');
        img.src = String(reader.result);
      };
      reader.readAsDataURL(f);
    });
    photoRow.append(el('h4',{},['Profile Photo']), preview, fileIn, field('Photo URL', urlIn), removeBtn);

    // Resume controls (PDF)
    const resumeCard = el('div', { class:'card-like' });
    const resumeInfo = el('div', {}, [el('small', { class:'admin-note' }, ['Accepted: PDF, max 5MB'])]);
    const resumeFile = el('input', { type:'file', accept:'application/pdf' });
    const resumeUrl = inputText(s.resume||'', 'assets/resume/YourResume.pdf or data URL', v => { s.resume=v; setEditorFromState(); }, 200);
    const resumeClear = el('button', { type:'button', class:'btn small danger' }, [el('i',{class:'fa-solid fa-trash'}), document.createTextNode(' Remove Resume')]);
    resumeClear.addEventListener('click', ()=>{ s.resume=''; if (resumeUrl.querySelector('input')) resumeUrl.querySelector('input').value=''; setEditorFromState(); });
    resumeFile.addEventListener('change', ()=>{
      const f = resumeFile.files?.[0]; if (!f) return;
      if (f.type !== 'application/pdf') { alert('Please select a PDF file.'); return; }
      const MAX_MB = 5;
      if (f.size > MAX_MB * 1024 * 1024) { alert(`PDF too large. Max ${MAX_MB}MB`); return; }
      const reader = new FileReader();
      reader.onload = () => {
        s.resume = String(reader.result); // data:application/pdf;base64,...
        const inputEl = resumeUrl.querySelector('input'); if (inputEl) inputEl.value = s.resume; setEditorFromState();
      };
      reader.readAsDataURL(f);
    });
    resumeCard.append(el('h4',{},['Resume (PDF)']), resumeInfo, resumeFile, field('Resume URL', resumeUrl), resumeClear);

    wrap.append(
      photoRow,
      field('Name', inputText(s.name||'', 'Your name', v => { s.name=v; setEditorFromState(); }, 40)),
      field('Headline', inputText(s.headline||'', 'Professional headline', v => { s.headline=v; setEditorFromState(); }, 100)),
      field('Summary', textarea(s.summary||'', 'Short professional summary', v => { s.summary=v; setEditorFromState(); }, 400)),
      resumeCard
    );
    return section('Profile', wrap);
  };

  const aboutSection = (data) => {
    const s = data.about || (data.about = {});
    const wrap = el('div');
    wrap.append(
      field('About paragraph 1', textarea(s.para1||'', '', v => { s.para1=v; setEditorFromState(); })),
      field('About paragraph 2', textarea(s.para2||'', '', v => { s.para2=v; setEditorFromState(); }))
    );
    return section('About', wrap);
  };

  const skillsSection = (data) => {
    const s = data.skills || (data.skills = {});
    const wrap = el('div');
    wrap.append(
      field('Languages (comma separated)', commaListInput(s.languages||[], 'Python, SQL', v => { s.languages=v; setEditorFromState(); })),
      field('Machine Learning (comma separated)', commaListInput(s.machine_learning||[], 'Scikit-learn, XGBoost, LightGBM', v => { s.machine_learning=v; setEditorFromState(); })),
      field('Deep Learning & NLP (comma separated)', commaListInput(s.deep_learning_nlp||[], 'TensorFlow, Keras, PyTorch, ...', v => { s.deep_learning_nlp=v; setEditorFromState(); })),
      field('Data Analysis & Visualization (comma separated)', commaListInput(s.data_viz||[], 'Pandas, NumPy, Excel, ...', v => { s.data_viz=v; setEditorFromState(); })),
      field('Databases & Cloud (comma separated)', commaListInput(s.databases_cloud||[], 'MySQL, MongoDB, AWS (S3, EC2)', v => { s.databases_cloud=v; setEditorFromState(); })),
      field('Tools (comma separated)', commaListInput(s.tools||[], 'Git, Jupyter, VS Code, Anaconda', v => { s.tools=v; setEditorFromState(); }))
    );
    return section('Skills', wrap);
  };

  const experienceSection = (data) => {
    const arr = data.experience || (data.experience = []);
    const itemFactory = (item={}, onRemove, onChange) => {
      item = Object.assign({ role:'', company:'', points:[] }, item||{});
      const w = el('div', { class:'exp-item card-like' });
      const role = inputText(item.role, 'Role', v => { item.role=v; onChange(); });
      const company = inputText(item.company, 'Company', v => { item.company=v; onChange(); });
      const points = textarea((item.points||[]).join('\n'), 'One bullet per line', v => { item.points = v.split('\n').map(s=>s.trim()).filter(Boolean); onChange(); });
      const remove = el('button', { type:'button', class:'btn small danger' }, [el('i',{class:'fa-solid fa-trash'}), document.createTextNode(' Remove')]);
      remove.addEventListener('click', onRemove);
      w.append(field('Role', role), field('Company', company), field('Points', points), remove);
      w.__getValue = () => ({ role:item.role, company:item.company, points:item.points });
      return w;
    };
    const editorEl = arrayEditor(arr, itemFactory, (v)=>{ data.experience=v; });
    return section('Experience', editorEl);
  };

  const projectsSection = (data) => {
    const arr = data.projects || (data.projects = []);
    const itemFactory = (item={}, onRemove, onChange) => {
      item = Object.assign({ title:'', desc:'', tags:[], icon:'fa-diagram-project', category:'', link:'' }, item||{});
      const w = el('div', { class:'proj-item card-like' });
      const title = inputText(item.title, 'Project title', v => { item.title=v; onChange(); }, 60);
      const desc = textarea(item.desc, 'Short description', v => { item.desc=v; onChange(); }, 220);
      const tags = commaListInput(item.tags, 'tag1, tag2', v => { item.tags=v; onChange(); });
      const icon = inputText(item.icon, 'FontAwesome icon (e.g., fa-film)', v => { item.icon=v; onChange(); }, 40);
      const category = inputText(item.category, 'Category (e.g., NLP, ML)', v => { item.category=v; onChange(); }, 20);
      const link = inputText(item.link, 'https://...', v => { item.link=v; onChange(); }, 300);
      const remove = el('button', { type:'button', class:'btn small danger' }, [el('i',{class:'fa-solid fa-trash'}), document.createTextNode(' Remove')]);
      remove.addEventListener('click', onRemove);
      w.append(field('Title', title), field('Description', desc), field('Tags', tags), field('Icon', icon), field('Category', category), field('Link', link), remove);
      w.__getValue = () => ({ title:item.title, desc:item.desc, tags:item.tags, icon:item.icon, category:item.category, link:item.link });
      return w;
    };
    const editorEl = arrayEditor(arr, itemFactory, (v)=>{ data.projects=v; });
    return section('Projects', editorEl);
  };

  const educationSection = (data) => {
    const arr = data.education || (data.education = []);
    const itemFactory = (item={}, onRemove, onChange) => {
      item = Object.assign({ title:'', org:'' }, item||{});
      const w = el('div', { class:'edu-item card-like' });
      const title = inputText(item.title, 'Program', v => { item.title=v; onChange(); }, 80);
      const org = inputText(item.org, 'Institution & Years', v => { item.org=v; onChange(); }, 120);
      const remove = el('button', { type:'button', class:'btn small danger' }, [el('i',{class:'fa-solid fa-trash'}), document.createTextNode(' Remove')]);
      remove.addEventListener('click', onRemove);
      w.append(field('Title', title), field('Organization', org), remove);
      w.__getValue = () => ({ title:item.title, org:item.org });
      return w;
    };
    const editorEl = arrayEditor(arr, itemFactory, (v)=>{ data.education=v; });
    return section('Education', editorEl);
  };

  const certsSection = (data) => {
    const arr = data.certifications || (data.certifications = []);
    const itemFactory = (item='', onRemove, onChange) => {
      const w = el('div', { class:'cert-item card-like' });
      const txt = textarea(item, 'Certification text', v => { item = v; onChange(); }, 160);
      const remove = el('button', { type:'button', class:'btn small danger' }, [el('i',{class:'fa-solid fa-trash'}), document.createTextNode(' Remove')]);
      remove.addEventListener('click', onRemove);
      w.append(field('Certification', txt), remove);
      w.__getValue = () => (txt.value || '');
      return w;
    };
    const editorEl = arrayEditor(arr, itemFactory, (v)=>{ data.certifications=v; });
    return section('Certifications', editorEl);
  };

  const contactSection = (data) => {
    const s = data.contact || (data.contact = { linkedin:{}, github:{} });
    const wrap = el('div');
    wrap.append(
      field('Email', inputText(s.email||'', 'your@email', v => { s.email=v; setEditorFromState(); }, 120)),
      field('Phone', inputText(s.phone||'', '+91 ...', v => { s.phone=v; setEditorFromState(); }, 20)),
      el('h4', {}, ['LinkedIn']),
      field('Label', inputText(s.linkedin?.label||'', 'Your name', v => { (s.linkedin||(s.linkedin={})).label=v; setEditorFromState(); }, 40)),
      field('URL', inputText(s.linkedin?.url||'', 'https://linkedin.com/in/...', v => { (s.linkedin||(s.linkedin={})).url=v; setEditorFromState(); }, 200)),
      el('h4', {}, ['GitHub']),
      field('Label', inputText(s.github?.label||'', 'Username', v => { (s.github||(s.github={})).label=v; setEditorFromState(); }, 40)),
      field('URL', inputText(s.github?.url||'', 'https://github.com/username', v => { (s.github||(s.github={})).url=v; setEditorFromState(); }, 200))
    );
    return section('Contact', wrap);
  };

  const insightsSection = (data) => {
    const s = data.insights || (data.insights = {});
    const wrap = el('div');
    wrap.append(
      kvEditor(s.project_categories||{}, { title:'Project Categories (name -> count)' }, v => { s.project_categories = v; }),
      kvEditor(s.skills_strength||{}, { title:'Skills Strength (name -> 1..10)' }, v => { s.skills_strength = v; }),
      kvEditor(s.tech_frequency||{}, { title:'Tech Frequency (name -> count)' }, v => { s.tech_frequency = v; })
    );
    return section('Insights (Charts Data)', wrap);
  };

  function renderForm(){
    if (!mount || !state) return;
    mount.innerHTML = '';
    mount.append(
      profileSection(state),
      aboutSection(state),
      skillsSection(state),
      experienceSection(state),
      projectsSection(state),
      educationSection(state),
      certsSection(state),
      contactSection(state),
      insightsSection(state)
    );
    // Basic styles for admin elements
    injectAdminStyles();
  }

  function injectAdminStyles(){
    if (document.getElementById('adminFormStyles')) return;
    const css = `
      .admin-section{border:1px solid var(--border);background:var(--card);border-radius:12px;padding:1rem;margin:0.6rem 0;box-shadow:0 10px 30px var(--shadow)}
      .admin-section h3{margin-top:0}
      .field{display:grid;gap:0.35rem;margin:0.5rem 0}
      .admin-input, .admin-textarea{background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:0.5rem}
      .admin-textarea{min-height:90px}
      .card-like{border:1px dashed var(--border);border-radius:10px;padding:0.6rem;margin-bottom:0.6rem}
      .kv-row{display:flex;gap:0.5rem;align-items:center;margin-bottom:0.5rem}
      .kv-row input[type="text"]{flex:1}
      .arr-list > div{margin-bottom:0.5rem}
    `;
    const style = el('style', { id:'adminFormStyles' }, [css]);
    document.head.appendChild(style);
  }

  // ---------- Wire events ----------
  loadDefaultBtn?.addEventListener('click', loadDefault);
  applyBtn?.addEventListener('click', () => {
    // Ensure editor mirrors current form state before saving
    setEditorFromState();
    saveEditorToStorage();
  });
  // Publish -> send content to local publisher server which writes assets/content.json and saves images
  document.getElementById('publishBtn')?.addEventListener('click', async () => {
    try {
      setEditorFromState();
      const payload = JSON.parse(editor.value);
      const res = await fetch('http://127.0.0.1:5050/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: payload })
      });
      if (!res.ok) throw new Error(`Publish failed (${res.status})`);
      const json = await res.json();
      if (json.ok) {
        // Update state with any changes from server (e.g., photo path if dataURL was saved to file)
        state = json.content || payload;
        if (json.content_path) console.log('Wrote', json.content_path);
        if (json.photo_path) console.log('Saved photo at', json.photo_path);
        localStorage.setItem('portfolio_content_override', JSON.stringify(state));
        setEditorFromState();
        renderForm();
        alert('Published to assets/content.json successfully. Refresh the main site to see updates.');
      } else {
        throw new Error(json.error || 'Unknown error');
      }
    } catch (e) {
      alert('Could not publish. Make sure the publisher is running at http://127.0.0.1:5050. Error: ' + e.message);
    }
  });
  exportBtn?.addEventListener('click', () => {
    setEditorFromState();
    const blob = new Blob([editor.value], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'portfolio_content_export.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });
  importInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        state = JSON.parse(reader.result);
        setEditorFromState();
        renderForm();
      } catch (err) { alert('Invalid JSON file.'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  });
  resetBtn?.addEventListener('click', async () => {
    if (confirm('This will clear your saved content and reload default. Continue?')) {
      localStorage.removeItem(STORAGE_KEY);
      await loadDefault();
      alert('Reset done. Click Save to persist to this device.');
    }
  });

  // Keep state in sync if user types directly in JSON box
  editor?.addEventListener('input', () => {
    try { state = JSON.parse(editor.value); renderForm(); } catch {}
  });

  // ---------- Init ----------
  async function fetchAdmins(){
    if (admins) return admins;
    try {
      const res = await fetch('assets/admins.json', { cache: 'no-store' });
      admins = await res.json();
    } catch(e) { admins = { users: [] }; }
    return admins;
  }

  async function requireAuth(){
    if (sessionStorage.getItem('admin_auth_ok') === '1') return true;
    authGate.style.display = 'flex';
    const { users } = await fetchAdmins();
    return new Promise((resolve) => {
      const loginHandler = async () => {
        const u = (authUser.value||'').trim();
        const p = (authPass.value||'').trim();
        const ok = !!users.find(x => x.username === u && x.password === p);
        if (ok) {
          sessionStorage.setItem('admin_auth_ok', '1');
          authGate.style.display = 'none';
          cleanup();
          resolve(true);
        } else {
          alert('Invalid credentials');
        }
      };
      const cleanup = () => { authLogin.removeEventListener('click', loginHandler); };
      authLogin.addEventListener('click', loginHandler);
    });
  }

  requireAuth().then(loadCurrent);
})();
