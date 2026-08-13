/* Clalit PM parts system — SPA (faithful copy of the original base44 app) */

// ===== Constants =====
const CAT_LABELS = {
  molecular: 'מולקולרי', hematology: 'המטולוגיה', chemistry: 'כימיה',
  flow_cytometry: 'Flow Cytometry', other: 'אחר',
};
const SERVICE_SECTIONS = {
  semi_annual: 'טיפול חצי שנתי', annual: 'טיפול שנתי', general: 'חלקים כלליים',
  vacuum_pump: 'משאבת ווקום', waste_pump: 'משאבת וייסט', ise: 'טיפול ב-ISE',
};
const SERVICE_CHIPS = {
  semi_annual: 'חצי שנתי', annual: 'שנתי', general: 'כללי',
  vacuum_pump: 'משאבת ווקום', waste_pump: 'משאבת וייסט', ise: 'ISE',
};
const SERVICE_ORDER = ['semi_annual', 'annual', 'general', 'vacuum_pump', 'waste_pump', 'ise'];

const ICONS = {
  search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
  wrench: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
  info: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
  plus: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>',
  pencil: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>',
  trash: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>',
  users: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  download: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>',
  back: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
  link: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>',
  arrowLeft: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>',
};

// ===== Global state =====
const state = { me: null };
const $app = document.getElementById('app');

// ===== Helpers =====
const esc = (s) => (s ?? '').toString()
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function toast(msg) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

function navigate(path) {
  history.pushState(null, '', path);
  route();
}

document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-link], a[href^="/"]:not([target])');
  if (a && a.origin === location.origin && !a.hasAttribute('download')) {
    e.preventDefault();
    navigate(a.getAttribute('href'));
  }
});
window.addEventListener('popstate', route);

function canEdit(pageId) {
  const me = state.me;
  return !!me && (me.isAdmin || me.pages.includes(pageId));
}

function catChip(category) {
  const cls = CAT_LABELS[category] ? category : 'other';
  return `<span class="chip chip-${cls}">${esc(CAT_LABELS[category] || category || 'אחר')}</span>`;
}

function showModal(html) {
  closeModal();
  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = `<div class="modal">${html}</div>`;
  wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) closeModal(); });
  document.body.appendChild(wrap);
  return wrap;
}
function closeModal() {
  document.querySelectorAll('.modal-backdrop').forEach(m => m.remove());
}

// ===== Router =====
async function route() {
  if (!state.me) {
    try { state.me = await API.me(); } catch { state.me = { email: '', isAdmin: false, pages: [] }; }
    const hu = document.getElementById('header-user');
    if (hu && state.me.email && state.me.email !== 'dev@local') hu.textContent = state.me.email;
  }
  const path = location.pathname;
  window.scrollTo(0, 0);
  try {
    if (path === '/' || path === '') return await renderHome();
    let m;
    if ((m = path.match(/^\/devices\/([\w-]+)$/))) return await renderDevice(m[1]);
    if ((m = path.match(/^\/device-info\/([\w-]+)$/))) return await renderDeviceInfo(m[1]);
    if (path === '/pcr-info') return await renderPcrInfo();
    if (path === '/bilimeter-info') return await renderBilimeterInfo();
    if (path === '/rotor-gene-info') return await renderRotorGeneInfo();
    if (path === '/hamilton-info') return await renderHamiltonInfo();
    if ((m = path.match(/^\/guide-viewer\/([\w-]+)$/))) return await renderGuide(m[1]);
    $app.innerHTML = `<div class="empty-state"><div class="big">הדף לא נמצא</div><a href="/" data-link class="btn btn-primary" style="margin-top:12px">חזרה לראשי</a></div>`;
  } catch (err) {
    $app.innerHTML = `<div class="empty-state"><div class="big">שגיאה בטעינת הדף</div><div>${esc(err.message)}</div></div>`;
  }
}

// ===== Home =====
async function renderHome() {
  $app.innerHTML = '<div class="spinner"></div>';
  const [devices, parts, guidePages] = await Promise.all([
    API.list('devices'), API.list('parts'), API.list('guide_pages'),
  ]);
  const counts = {};
  parts.forEach(p => { counts[p.device_id] = (counts[p.device_id] || 0) + 1; });

  const deviceCard = (d) => {
    const infoRoute = d.info_route || `/device-info/${d.id}`;
    return `
    <div style="position:relative">
      <a class="info-btn" href="${infoRoute}" data-link>${ICONS.info} INFO</a>
      <a class="device-card" href="/devices/${d.id}" data-link>
        <div class="img-wrap">${d.image ? `<img src="${esc(d.image)}" alt="${esc(d.name)}" loading="lazy">` : `<span class="img-placeholder">${ICONS.wrench}</span>`}</div>
        <div class="card-body">
          <div>
            <h3>${esc(d.name)}</h3>
            ${d.name_he ? `<div class="card-sub">${esc(d.name_he)}</div>` : ''}
            ${d.notes ? `<div class="card-notes">${esc(d.notes)}</div>` : ''}
          </div>
          <div class="card-footer">
            <div class="chips">
              ${catChip(d.category)}
              ${d.tech_code ? `<span class="chip chip-outline">קוד: ${esc(d.tech_code)}</span>` : ''}
            </div>
            <span class="parts-count">${ICONS.wrench} ${counts[d.id] || 0}</span>
          </div>
        </div>
      </a>
    </div>`;
  };

  const pcrCard = `
    <div style="position:relative">
      <a class="info-btn" href="/pcr-info" data-link>${ICONS.info} INFO</a>
      <a class="device-card" href="/pcr-info" data-link>
        <div class="img-wrap"><img src="/images/devices/pcr.jpg" alt="PCR" loading="lazy"></div>
        <div class="card-body">
          <div>
            <h3>PCR</h3>
            <div class="card-sub">מכשירי PCR</div>
          </div>
          <div class="card-footer">
            <div class="chips">${catChip('molecular')}</div>
          </div>
        </div>
      </a>
    </div>`;

  const guideButtons = guidePages
    .filter(g => !g.parent_id && g.button_label && g.is_published)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(g => `<a class="home-guide-btn" href="/guide-viewer/${g.id}" data-link>${esc(g.button_label)}</a>`)
    .join('');

  $app.innerHTML = `
    <div class="page-title-row">
      <h2 class="page-title">רשימת מכשירים</h2>
      <div class="search-wrap">
        ${ICONS.search}
        <input type="text" class="search-input" id="device-search" placeholder="חיפוש...">
      </div>
    </div>
    <div class="devices-grid" id="devices-grid">
      ${pcrCard}
      ${devices.map(deviceCard).join('')}
    </div>
    ${guideButtons ? `<div class="home-guides">${guideButtons}</div>` : ''}
  `;

  const grid = document.getElementById('devices-grid');
  document.getElementById('device-search').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    [...grid.children].forEach((wrap) => {
      const text = wrap.textContent.toLowerCase();
      wrap.style.display = !q || text.includes(q) ? '' : 'none';
    });
  });
}

// ===== Device page =====
async function renderDevice(id) {
  $app.innerHTML = '<div class="spinner"></div>';
  const [devices, parts] = await Promise.all([
    API.list('devices'), API.list('parts', { device_id: id }),
  ]);
  const device = devices.find(d => d.id === id);
  if (!device) { $app.innerHTML = '<div class="empty-state"><div class="big">המכשיר לא נמצא</div></div>'; return; }

  const groups = {};
  parts.forEach(p => {
    const t = SERVICE_SECTIONS[p.service_type] ? p.service_type : 'general';
    (groups[t] = groups[t] || []).push(p);
  });

  const partCard = (p) => `
    <div class="part-card">
      <div class="part-name">${esc(p.name)}</div>
      <div class="part-meta">
        ${p.part_number ? `<span class="part-number">${esc(p.part_number)}</span>` : ''}
        <span class="chip chip-${esc(p.service_type)}">${esc(SERVICE_CHIPS[p.service_type] || p.service_type)}</span>
        ${p.quantity ? `<span class="part-qty">כמות: ${esc(p.quantity)}</span>` : ''}
        ${p.model_number ? `<span class="part-qty" style="direction:ltr">${esc(p.model_number)}</span>` : ''}
      </div>
      ${p.description_he ? `<div class="part-desc">${esc(p.description_he)}</div>` : ''}
    </div>`;

  const sections = SERVICE_ORDER.filter(t => groups[t]).map(t => `
    <div class="section">
      <div class="section-header">
        <span class="section-bar"></span>
        ${esc(SERVICE_SECTIONS[t])}
        <span class="count">(${groups[t].length})</span>
      </div>
      <div class="parts-list">${groups[t].map(partCard).join('')}</div>
    </div>`).join('');

  const infoRoute = device.info_route || `/device-info/${device.id}`;

  $app.innerHTML = `
    <div class="breadcrumb"><a href="/" data-link>ראשי</a> ${ICONS.back} <span>${esc(device.name)}</span></div>
    <div class="device-hero">
      ${device.image ? `<img src="${esc(device.image)}" alt="${esc(device.name)}">` : ''}
      <div class="hero-info">
        <h2>${esc(device.name)}</h2>
        ${device.name_he ? `<div class="hero-sub">${esc(device.name_he)}</div>` : ''}
        <div class="chips" style="margin-top:6px">
          ${catChip(device.category)}
          ${device.tech_code ? `<span class="chip chip-outline">קוד: ${esc(device.tech_code)}</span>` : ''}
          <span class="chip chip-outline">${parts.length} חלקים</span>
        </div>
        ${device.notes ? `<div class="hero-notes">${esc(device.notes)}</div>` : ''}
      </div>
      <div class="hero-actions">
        ${device.external_link ? `<a class="btn btn-outline" href="${esc(device.external_link)}" target="_blank" rel="noopener">${ICONS.link} קישור חיצוני</a>` : ''}
        <a class="btn btn-primary" href="${infoRoute}" data-link>${ICONS.info} INFO</a>
      </div>
    </div>
    ${sections || '<div class="empty-state"><div class="big">אין חלקים למכשיר זה עדיין</div></div>'}
  `;
}

// ===== Generic editable table engine =====
// cfg: { pageId, title, breadcrumbTitle, table, columns, filters, backLink, exportName, tabsField }
async function renderTable(cfg) {
  $app.innerHTML = '<div class="spinner"></div>';
  let rows = await API.list(cfg.table, cfg.filters || {});
  const editable = canEdit(cfg.pageId);
  let activeTab = 'הכל';

  const visibleRows = () => cfg.tabsField && activeTab !== 'הכל'
    ? rows.filter(r => (r[cfg.tabsField] || '').trim() === activeTab)
    : rows;

  const cellHtml = (row, col) => {
    const v = row[col.key];
    if (col.type === 'check') return v ? '<span class="check-mark">✓</span>' : '';
    if (col.type === 'checkPair') return !v ? '<span class="check-mark">✓</span>' : '';
    if (col.type === 'image') {
      return v ? `<img class="row-img" src="${esc(v)}" data-lightbox="${esc(v)}" alt="">` : '<span class="empty-cell">—</span>';
    }
    if (v === null || v === undefined || v === '') return '<span class="empty-cell">—</span>';
    return `<span${col.ltr ? ' style="direction:ltr;display:inline-block"' : ''}>${esc(v)}</span>`;
  };

  const render = () => {
    const vr = visibleRows();
    const tabs = cfg.tabsField
      ? ['הכל', ...new Set(rows.map(r => (r[cfg.tabsField] || '').trim()).filter(Boolean))]
      : null;

    $app.innerHTML = `
      <div class="breadcrumb"><a href="${cfg.backLink || '/'}" data-link>ראשי</a> ${ICONS.back} <span>${esc(cfg.breadcrumbTitle || cfg.title)}</span></div>
      <div class="page-title-row">
        <h2 class="page-title">${esc(cfg.title)}</h2>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${state.me.isAdmin ? `<button class="btn btn-outline" id="btn-users">${ICONS.users} ניהול משתמשים</button>` : ''}
          <button class="btn btn-outline" id="btn-export">${ICONS.download} יצא לאקסל</button>
          ${editable ? `<button class="btn btn-primary" id="btn-add">${ICONS.plus} הוסף שורה</button>` : ''}
        </div>
      </div>
      ${tabs ? `<div class="tabs">${tabs.map(t => `<button class="tab${t === activeTab ? ' active' : ''}" data-tab="${esc(t)}">${t === 'הכל' ? 'כל בתי החולים' : esc(t)}</button>`).join('')}</div>` : ''}
      <div class="table-card">
        <div class="table-scroll">
          ${vr.length ? `
          <table class="data-table">
            <thead><tr>${cfg.columns.map(c => `<th>${esc(c.label)}</th>`).join('')}${editable ? '<th>פעולות</th>' : ''}</tr></thead>
            <tbody>
              ${vr.map(row => `<tr data-id="${row.id}">
                ${cfg.columns.map(c => `<td${c.ltr ? ' class="ltr"' : ''}>${cellHtml(row, c)}</td>`).join('')}
                ${editable ? `<td><div class="row-actions">
                  <button class="btn btn-icon btn-outline" data-edit="${row.id}" title="עריכה">${ICONS.pencil}</button>
                  <button class="btn btn-icon btn-danger" data-del="${row.id}" title="מחיקה">${ICONS.trash}</button>
                </div></td>` : ''}
              </tr>`).join('')}
            </tbody>
          </table>` : `
          <div class="empty-state">
            <div class="big">אין נתונים עדיין</div>
            ${editable ? '<div>לחץ על "הוסף שורה" כדי להתחיל</div>' : ''}
          </div>`}
        </div>
      </div>
    `;

    document.getElementById('btn-export').onclick = () => {
      const headers = cfg.columns.map(c => c.label);
      const dataRows = visibleRows().map(row => cfg.columns.map(c => {
        if (c.type === 'check') return row[c.key] ? '✓' : '';
        if (c.type === 'checkPair') return !row[c.key] ? '✓' : '';
        return row[c.key] ?? '';
      }));
      exportToExcel(`${cfg.exportName || cfg.table}.csv`, headers, dataRows);
    };

    if (state.me.isAdmin) {
      document.getElementById('btn-users').onclick = () => openUsersModal(cfg.pageId, cfg.title);
    }
    if (editable) {
      document.getElementById('btn-add').onclick = () => openRowModal(null);
      $app.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => {
        openRowModal(rows.find(r => r.id === b.dataset.edit));
      });
      $app.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
        if (!confirm('למחוק את השורה?')) return;
        await API.remove(cfg.table, b.dataset.del);
        rows = rows.filter(r => r.id !== b.dataset.del);
        render();
        toast('השורה נמחקה');
      });
    }
    $app.querySelectorAll('[data-lightbox]').forEach(img => img.onclick = () => {
      showModal(`<img src="${esc(img.dataset.lightbox)}" style="width:100%;border-radius:10px" alt="">`);
    });
    if (tabs) {
      $app.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { activeTab = b.dataset.tab; render(); });
    }
  };

  const openRowModal = (row) => {
    const isNew = !row;
    const fieldHtml = (c) => {
      const v = row ? row[c.key] : '';
      if (c.type === 'check' || c.type === 'checkPair') {
        if (c.type === 'checkPair') return '';
        return `<div class="checkbox-field"><input type="checkbox" id="f-${c.key}" ${row && row[c.key] ? 'checked' : ''}><label for="f-${c.key}">${esc(c.label)}</label></div>`;
      }
      if (c.type === 'image') {
        return `<div class="form-field full"><label>${esc(c.label)}</label>
          <input type="file" id="f-${c.key}" accept="image/*">
          ${v ? `<img src="${esc(v)}" style="max-height:80px;border-radius:8px;object-fit:contain;align-self:flex-start" alt="">` : ''}
        </div>`;
      }
      if (c.type === 'textarea') {
        return `<div class="form-field full"><label>${esc(c.label)}</label><textarea id="f-${c.key}">${esc(v || '')}</textarea></div>`;
      }
      return `<div class="form-field${c.wide ? ' full' : ''}"><label>${esc(c.label)}${c.required ? ' *' : ''}</label>
        <input type="text" id="f-${c.key}" value="${esc(v || '')}"${c.list ? ` list="dl-${c.key}"` : ''}>
        ${c.list ? `<datalist id="dl-${c.key}">${[...new Set(rows.map(r => (r[c.key] || '').trim()).filter(Boolean))].map(o => `<option value="${esc(o)}">`).join('')}</datalist>` : ''}
      </div>`;
    };

    showModal(`
      <h3>${isNew ? 'הוספת רשומה חדשה' : 'עריכת רשומה'}</h3>
      <div class="form-grid">${cfg.columns.map(fieldHtml).join('')}</div>
      <div class="modal-actions">
        <button class="btn btn-primary" id="modal-save">שמור</button>
        <button class="btn" id="modal-cancel">ביטול</button>
      </div>
    `);

    document.getElementById('modal-cancel').onclick = closeModal;
    document.getElementById('modal-save').onclick = async () => {
      const btn = document.getElementById('modal-save');
      btn.disabled = true; btn.textContent = 'שומר...';
      try {
        const data = { ...(cfg.fixedFields || {}) };
        for (const c of cfg.columns) {
          if (c.type === 'checkPair') continue;
          const el = document.getElementById(`f-${c.key}`);
          if (!el) continue;
          if (c.type === 'check') data[c.key] = el.checked ? 1 : 0;
          else if (c.type === 'image') {
            if (el.files && el.files[0]) {
              const up = await API.uploadFile(el.files[0]);
              data[c.key] = up.url;
            }
          } else data[c.key] = el.value.trim();
        }
        const required = cfg.columns.find(c => c.required && !data[c.key]);
        if (required) { toast(`יש למלא ${required.label}`); btn.disabled = false; btn.textContent = 'שמור'; return; }
        if (isNew) {
          if (!cfg.columns.some(c => c.key === 'sort_order')) data.sort_order = rows.length;
          const created = await API.create(cfg.table, data);
          rows.push(created);
        } else {
          const updated = await API.update(cfg.table, row.id, data);
          rows = rows.map(r => r.id === row.id ? updated : r);
        }
        closeModal(); render(); toast('נשמר בהצלחה');
      } catch (err) {
        toast(err.message); btn.disabled = false; btn.textContent = 'שמור';
      }
    };
  };

  render();
}

// ===== User management (admins + per-page permissions) =====
async function openUsersModal(pageId, pageTitle) {
  const [perms, admins] = await Promise.all([
    API.list('page_permissions', { page_id: pageId }),
    API._fetch('/api/admins'),
  ]);

  const modal = showModal(`
    <h3>הרשאות עריכה — ${esc(pageTitle)}</h3>
    <div class="form-field full"><label>הוסף מייל מורשה לעריכת דף זה</label>
      <div style="display:flex;gap:6px">
        <input type="email" id="perm-email" placeholder="כתובת אימייל" style="flex:1;border:1px solid var(--border);border-radius:9px;padding:8px 10px;font-size:13.5px">
        <button class="btn btn-primary btn-sm" id="perm-add">הוסף הרשאה</button>
      </div>
    </div>
    <div id="perm-list" style="margin-top:10px">${perms.length ? '' : '<div class="muted" style="font-size:13px">אין משתמשים מורשים לדף זה עדיין</div>'}</div>
    <hr style="margin:16px 0;border:none;border-top:1px solid var(--border)">
    <h3 style="font-size:15px">מנהלי מערכת (גישה מלאה)</h3>
    <div class="form-field full">
      <div style="display:flex;gap:6px">
        <input type="email" id="admin-email" placeholder="כתובת אימייל" style="flex:1;border:1px solid var(--border);border-radius:9px;padding:8px 10px;font-size:13.5px">
        <button class="btn btn-primary btn-sm" id="admin-add">הוסף מנהל</button>
      </div>
    </div>
    <div id="admin-list" style="margin-top:10px"></div>
    <div class="modal-actions"><button class="btn" id="modal-close">סגור</button></div>
  `);

  const rowHtml = (email, attr) => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(224,229,235,.5);font-size:13.5px">
      <span style="direction:ltr">${esc(email)}</span>
      <button class="btn btn-icon btn-danger" ${attr}>${ICONS.trash}</button>
    </div>`;

  const drawPerms = (list) => {
    modal.querySelector('#perm-list').innerHTML = list.length
      ? list.map(p => rowHtml(p.email, `data-rmperm="${p.id}"`)).join('')
      : '<div class="muted" style="font-size:13px">אין משתמשים מורשים לדף זה עדיין</div>';
    modal.querySelectorAll('[data-rmperm]').forEach(b => b.onclick = async () => {
      await API.remove('page_permissions', b.dataset.rmperm);
      drawPerms(list.filter(p => p.id !== b.dataset.rmperm));
    });
  };
  const drawAdmins = (list) => {
    modal.querySelector('#admin-list').innerHTML = list.map(a => rowHtml(a.email, `data-rmadmin="${esc(a.email)}"`)).join('');
    modal.querySelectorAll('[data-rmadmin]').forEach(b => b.onclick = async () => {
      if (!confirm(`להסיר את ${b.dataset.rmadmin} ממנהלי המערכת?`)) return;
      await API._fetch(`/api/admins/${encodeURIComponent(b.dataset.rmadmin)}`, { method: 'DELETE' });
      drawAdmins(list.filter(a => a.email !== b.dataset.rmadmin));
    });
  };
  drawPerms(perms); drawAdmins(admins);

  modal.querySelector('#perm-add').onclick = async () => {
    const email = modal.querySelector('#perm-email').value.trim().toLowerCase();
    if (!email) return;
    const created = await API.create('page_permissions', { page_id: pageId, email });
    perms.push(created); drawPerms(perms);
    modal.querySelector('#perm-email').value = '';
  };
  modal.querySelector('#admin-add').onclick = async () => {
    const email = modal.querySelector('#admin-email').value.trim().toLowerCase();
    if (!email) return;
    await API._fetch('/api/admins', { method: 'POST', body: JSON.stringify({ email }) });
    admins.push({ email }); drawAdmins(admins);
    modal.querySelector('#admin-email').value = '';
  };
  modal.querySelector('#modal-close').onclick = closeModal;
}

// ===== Info pages =====
async function renderDeviceInfo(deviceId) {
  const devices = await API.list('devices');
  const device = devices.find(d => d.id === deviceId);
  const name = device ? device.name : 'מכשיר';
  await renderTable({
    pageId: `device-info-${deviceId}`,
    title: `${name} — טבלת מידע`,
    breadcrumbTitle: `${name} INFO`,
    table: 'device_info_records',
    filters: { device_id: deviceId },
    fixedFields: { device_id: deviceId },
    exportName: `${name}-info`,
    columns: [
      { key: 'catalog_number', label: "מס' מכשיר", ltr: true },
      { key: 'inventory_number', label: "מס' איוונטר", ltr: true },
      { key: 'lab_manager', label: 'אחראית מעבדה' },
      { key: 'contact_person', label: 'איש קשר' },
      { key: 'location', label: 'מיקום המכשיר', wide: true },
      { key: 'general_info', label: 'מידע כללי', type: 'textarea' },
      { key: 'image_url', label: 'תמונה', type: 'image' },
    ],
  });
}

async function renderPcrInfo() {
  await renderTable({
    pageId: 'pcr-info',
    title: 'מכשירי PCR',
    breadcrumbTitle: 'PCR Info',
    table: 'pcr_devices',
    tabsField: 'hospital',
    exportName: 'pcr-devices',
    columns: [
      { key: 'device_name', label: 'שם המכשיר', required: true },
      { key: 'inventory_number', label: 'איוונטר', ltr: true },
      { key: 'serial_number', label: 'מספר טבוע', ltr: true },
      { key: 'hospital', label: 'בית חולים', list: true },
      { key: 'description', label: 'תיאור', wide: true },
      { key: 'is_triple_head', label: 'תלת ראשי', type: 'check' },
      { key: 'is_triple_head', label: 'חד ראשי', type: 'checkPair' },
    ],
  });
}

async function renderBilimeterInfo() {
  await renderTable({
    pageId: 'bilimeter-info',
    title: 'מכשירי Bilimeter',
    breadcrumbTitle: 'Bilimeter Info',
    table: 'bilimeter_devices',
    tabsField: 'hospital',
    exportName: 'bilimeter-devices',
    columns: [
      { key: 'device_name', label: 'שם המכשיר', required: true },
      { key: 'inventory_number', label: 'איוונטר', ltr: true },
      { key: 'serial_number', label: 'מספר טבוע', ltr: true },
      { key: 'hospital', label: 'בית חולים', list: true },
      { key: 'description', label: 'תיאור', wide: true },
    ],
  });
}

async function renderRotorGeneInfo() {
  await renderTable({
    pageId: 'rotor-gene-info',
    title: 'Rotor-Gene Q — טבלת מידע',
    breadcrumbTitle: 'Rotor-Gene Q INFO',
    table: 'rotor_gene_parts',
    exportName: 'rotor-gene-info',
    columns: [
      { key: 'catalog_number', label: "מס' מכשיר", ltr: true },
      { key: 'inventory_number', label: "מס' איוונטר", ltr: true },
      { key: 'lab_manager', label: 'אחראית מעבדה' },
      { key: 'phone', label: 'טלפון', ltr: true },
      { key: 'location', label: 'מיקום המכשיר', wide: true },
      { key: 'general_info', label: 'מידע כללי', type: 'textarea' },
      { key: 'image_url', label: 'תמונה', type: 'image' },
    ],
  });
}

async function renderHamiltonInfo() {
  await renderTable({
    pageId: 'hamilton-info',
    title: 'Hamilton NGS Star — טבלת מידע',
    breadcrumbTitle: 'Hamilton NGS Star INFO',
    table: 'hamilton_parts',
    exportName: 'hamilton-info',
    columns: [
      { key: 'catalog_number', label: "מס' מכשיר", ltr: true },
      { key: 'inventory_number', label: "מס' איוונטר", ltr: true },
      { key: 'contact_person', label: 'איש קשר' },
      { key: 'location', label: 'מיקום המכשיר', wide: true },
      { key: 'lab_manager', label: 'אחראית מעבדה' },
      { key: 'has_96_head', label: 'ראש 96', type: 'check' },
      { key: 'has_iswop', label: 'ISWOP', type: 'check' },
      { key: 'general_info', label: 'מידע כללי', type: 'textarea' },
      { key: 'service_notes', label: 'ימי טיפול' },
      { key: 'image_url', label: 'תמונה', type: 'image' },
    ],
  });
}

// ===== Guide viewer =====
async function renderGuide(pageId) {
  $app.innerHTML = '<div class="spinner"></div>';
  const [pages, blocks] = await Promise.all([
    API.list('guide_pages'), API.list('guide_blocks', { page_id: pageId }),
  ]);
  const page = pages.find(p => p.id === pageId);
  if (!page) { $app.innerHTML = '<div class="empty-state"><div class="big">המדריך לא נמצא</div></div>'; return; }

  const editable = canEdit('guides');
  const children = pages
    .filter(p => p.parent_id === pageId && (p.is_published || editable))
    .sort((a, b) => a.sort_order - b.sort_order);
  blocks.sort((a, b) => a.sort_order - b.sort_order);

  // "next step": first child, else next sibling, else climb up
  const findNext = (pid) => {
    const cur = pages.find(p => p.id === pid);
    if (!cur) return null;
    const kids = pages.filter(p => p.parent_id === pid && p.is_published).sort((a, b) => a.sort_order - b.sort_order);
    if (kids.length && pid === pageId) return kids[0];
    let node = cur;
    while (node) {
      const siblings = pages.filter(p => (p.parent_id || null) === (node.parent_id || null) && p.is_published)
        .sort((a, b) => a.sort_order - b.sort_order);
      const idx = siblings.findIndex(s => s.id === node.id);
      if (idx > -1 && idx < siblings.length - 1) return siblings[idx + 1];
      node = pages.find(p => p.id === node.parent_id);
    }
    return null;
  };
  const next = findNext(pageId);

  const crumbs = [];
  let walker = page;
  while (walker) {
    crumbs.unshift(walker);
    walker = pages.find(p => p.id === walker.parent_id);
  }

  const blockHtml = (b) => `
    <div class="guide-block" data-block="${b.id}">
      ${editable ? `<div style="float:left;display:flex;gap:4px">
        <button class="btn btn-icon btn-outline" data-editblock="${b.id}">${ICONS.pencil}</button>
        <button class="btn btn-icon btn-danger" data-delblock="${b.id}">${ICONS.trash}</button>
      </div>` : ''}
      ${b.block_title ? `<h4>${esc(b.block_title)}</h4>` : ''}
      ${b.text ? `<div class="block-text">${b.text}</div>` : ''}
      ${b.image_url ? `<div class="block-img-wrap">
        <img src="${esc(b.image_url)}" style="width:${b.image_width || 220}px;max-width:100%;transform:rotate(${b.image_rotation || 0}deg);border-radius:10px" alt="">
      </div>` : ''}
    </div>`;

  $app.innerHTML = `
    <div class="breadcrumb">
      <a href="/" data-link>ראשי</a> ${ICONS.back} <span>מדריכים</span>
      ${crumbs.map((c, i) => i < crumbs.length - 1
        ? `${ICONS.back} <a href="/guide-viewer/${c.id}" data-link>${esc(c.title)}</a>`
        : `${ICONS.back} <span>${esc(c.title)}</span>`).join('')}
    </div>
    <div class="page-title-row">
      <h2 class="guide-title" style="margin-bottom:0">${esc(page.title)}</h2>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${editable ? `
          <button class="btn btn-outline" id="btn-add-block">${ICONS.plus} הוסף בלוק</button>
          <button class="btn btn-outline" id="btn-add-child">${ICONS.plus} הוסף תת-דף</button>
          <button class="btn btn-outline" id="btn-edit-page">${ICONS.pencil} ערוך דף</button>` : ''}
        ${next ? `<a class="next-step-btn" href="/guide-viewer/${next.id}" data-link>${ICONS.arrowLeft} המשך לשלב הבא</a>` : ''}
      </div>
    </div>
    ${page.description ? `<p class="muted" style="margin-bottom:14px">${esc(page.description)}</p>` : ''}
    <div id="blocks">${blocks.map(blockHtml).join('')}</div>
    ${children.length ? `<div class="guide-children">
      ${children.map(c => `<a class="guide-child-btn" href="/guide-viewer/${c.id}" data-link>
        <span>${esc(c.title)}${c.is_published ? '' : ' <span class="muted" style="font-weight:400;font-size:11px">(טיוטה)</span>'}</span>
        ${ICONS.arrowLeft}
      </a>`).join('')}
    </div>` : ''}
  `;

  if (!editable) return;

  const openBlockModal = (block) => {
    const isNew = !block;
    showModal(`
      <h3>${isNew ? 'בלוק חדש' : 'עריכת בלוק'}</h3>
      <div class="form-grid">
        <div class="form-field full"><label>כותרת (לא חובה)</label><input type="text" id="b-title" value="${esc(block?.block_title || '')}"></div>
        <div class="form-field full"><label>טקסט (אפשר HTML)</label><textarea id="b-text" style="min-height:100px">${esc(block?.text || '')}</textarea></div>
        <div class="form-field full"><label>תמונה</label><input type="file" id="b-img" accept="image/*">
          ${block?.image_url ? `<img src="${esc(block.image_url)}" style="max-height:70px;border-radius:8px;align-self:flex-start" alt="">` : ''}</div>
        <div class="form-field"><label>רוחב תמונה (px)</label><input type="text" id="b-width" value="${esc(block?.image_width ?? 220)}"></div>
        <div class="form-field"><label>סיבוב (מעלות)</label><input type="text" id="b-rot" value="${esc(block?.image_rotation ?? 0)}"></div>
        <div class="form-field"><label>סדר</label><input type="text" id="b-sort" value="${esc(block?.sort_order ?? blocks.length)}"></div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-primary" id="modal-save">שמור</button>
        <button class="btn" id="modal-cancel">ביטול</button>
      </div>
    `);
    document.getElementById('modal-cancel').onclick = closeModal;
    document.getElementById('modal-save').onclick = async () => {
      const btn = document.getElementById('modal-save');
      btn.disabled = true; btn.textContent = 'שומר...';
      try {
        const data = {
          page_id: pageId,
          block_title: document.getElementById('b-title').value.trim(),
          text: document.getElementById('b-text').value,
          image_width: parseFloat(document.getElementById('b-width').value) || 220,
          image_rotation: parseFloat(document.getElementById('b-rot').value) || 0,
          sort_order: parseFloat(document.getElementById('b-sort').value) || 0,
        };
        const fileEl = document.getElementById('b-img');
        if (fileEl.files && fileEl.files[0]) {
          const up = await API.uploadFile(fileEl.files[0]);
          data.image_url = up.url;
        }
        if (isNew) await API.create('guide_blocks', data);
        else await API.update('guide_blocks', block.id, data);
        closeModal(); renderGuide(pageId); toast('נשמר');
      } catch (err) { toast(err.message); btn.disabled = false; btn.textContent = 'שמור'; }
    };
  };

  document.getElementById('btn-add-block').onclick = () => openBlockModal(null);
  $app.querySelectorAll('[data-editblock]').forEach(b => b.onclick = () => {
    openBlockModal(blocks.find(x => x.id === b.dataset.editblock));
  });
  $app.querySelectorAll('[data-delblock]').forEach(b => b.onclick = async () => {
    if (!confirm('למחוק את הבלוק?')) return;
    await API.remove('guide_blocks', b.dataset.delblock);
    renderGuide(pageId); toast('נמחק');
  });

  document.getElementById('btn-add-child').onclick = () => {
    showModal(`
      <h3>תת-דף חדש</h3>
      <div class="form-grid">
        <div class="form-field full"><label>כותרת *</label><input type="text" id="p-title"></div>
        <div class="form-field"><label>סדר</label><input type="text" id="p-sort" value="${children.length}"></div>
        <div class="checkbox-field"><input type="checkbox" id="p-pub" checked><label for="p-pub">מפורסם</label></div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-primary" id="modal-save">צור</button>
        <button class="btn" id="modal-cancel">ביטול</button>
      </div>
    `);
    document.getElementById('modal-cancel').onclick = closeModal;
    document.getElementById('modal-save').onclick = async () => {
      const title = document.getElementById('p-title').value.trim();
      if (!title) { toast('יש למלא כותרת'); return; }
      await API.create('guide_pages', {
        title, parent_id: pageId,
        sort_order: parseFloat(document.getElementById('p-sort').value) || 0,
        is_published: document.getElementById('p-pub').checked ? 1 : 0,
      });
      closeModal(); renderGuide(pageId); toast('הדף נוצר');
    };
  };

  document.getElementById('btn-edit-page').onclick = () => {
    showModal(`
      <h3>עריכת דף</h3>
      <div class="form-grid">
        <div class="form-field full"><label>כותרת *</label><input type="text" id="p-title" value="${esc(page.title)}"></div>
        <div class="form-field"><label>תווית כפתור בדף הראשי</label><input type="text" id="p-label" value="${esc(page.button_label || '')}"></div>
        <div class="form-field"><label>סדר</label><input type="text" id="p-sort" value="${esc(page.sort_order)}"></div>
        <div class="checkbox-field"><input type="checkbox" id="p-pub" ${page.is_published ? 'checked' : ''}><label for="p-pub">מפורסם</label></div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-primary" id="modal-save">שמור</button>
        <button class="btn btn-danger" id="modal-del">מחק דף</button>
        <button class="btn" id="modal-cancel">ביטול</button>
      </div>
    `);
    document.getElementById('modal-cancel').onclick = closeModal;
    document.getElementById('modal-del').onclick = async () => {
      if (!confirm('למחוק את הדף וכל הבלוקים שבו?')) return;
      await API.remove('guide_pages', page.id);
      closeModal();
      navigate(page.parent_id ? `/guide-viewer/${page.parent_id}` : '/');
      toast('הדף נמחק');
    };
    document.getElementById('modal-save').onclick = async () => {
      const title = document.getElementById('p-title').value.trim();
      if (!title) { toast('יש למלא כותרת'); return; }
      await API.update('guide_pages', page.id, {
        title,
        button_label: document.getElementById('p-label').value.trim(),
        sort_order: parseFloat(document.getElementById('p-sort').value) || 0,
        is_published: document.getElementById('p-pub').checked ? 1 : 0,
      });
      closeModal(); renderGuide(pageId); toast('נשמר');
    };
  };
}

// ===== Boot =====
route();
