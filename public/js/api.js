// API client for the Clalit PM parts system
const API = {
  async _fetch(url, opts = {}) {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...opts,
    });
    if (!res.ok) {
      let msg = 'שגיאה בשרת';
      try { msg = (await res.json()).error || msg; } catch {}
      throw new Error(msg);
    }
    return res.json();
  },

  list(table, filters = {}) {
    const qs = new URLSearchParams(filters).toString();
    return this._fetch(`/api/${table}${qs ? '?' + qs : ''}`);
  },
  create(table, data) {
    return this._fetch(`/api/${table}`, { method: 'POST', body: JSON.stringify(data) });
  },
  update(table, id, data) {
    return this._fetch(`/api/${table}/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  remove(table, id) {
    return this._fetch(`/api/${table}/${id}`, { method: 'DELETE' });
  },
  me() {
    return this._fetch('/api/me');
  },

  async uploadFile(file) {
    const data = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result.split(',')[1]);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
    return this._fetch('/api/files', {
      method: 'POST',
      body: JSON.stringify({ name: file.name, mime: file.type, data }),
    });
  },
};

// Export table rows to a CSV file Excel opens correctly (UTF-8 BOM)
function exportToExcel(filename, headers, rows) {
  const esc = (v) => {
    const s = (v ?? '').toString().replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  const csv = '﻿' + [headers, ...rows].map(r => r.map(esc).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
