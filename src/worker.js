// Cloudflare Worker for the Clalit PM parts system.
// Serves the static SPA (via the ASSETS binding) and the REST API over D1 under /api/*.
//
// This project deploys via `npx wrangler deploy` (Workers Builds CI from GitHub), not
// Cloudflare Pages — Pages' automatic `functions/` directory routing does not apply here,
// so all routing (API vs. static assets) happens explicitly in this single entry point.
import { SEED } from './seed-data.js';
import { HAMILTON_PM_BLOCKS, HAMILTON_PM_PAGES } from './hamilton-pm.js';

// Consolidated Hamilton PM content is an additive overlay. The original
// exported guide rows remain available, so regeneration never destroys data.
const APP_SEED = {
  ...SEED,
  guide_pages: HAMILTON_PM_PAGES,
  guide_blocks: [...SEED.guide_blocks, ...HAMILTON_PM_BLOCKS],
};
const HAMILTON_PM_VERSION = '2026-08-13-consolidated-v2';

const TABLES = {
  devices: ['name', 'name_he', 'notes', 'category', 'tech_code', 'external_link', 'info_route', 'image', 'sort_order'],
  parts: ['device_id', 'name', 'part_number', 'service_type', 'quantity', 'description_he', 'model_number', 'created_date'],
  pcr_devices: ['device_name', 'inventory_number', 'serial_number', 'hospital', 'description', 'is_triple_head', 'sort_order'],
  bilimeter_devices: ['device_name', 'inventory_number', 'serial_number', 'hospital', 'description', 'sort_order'],
  rotor_gene_parts: ['catalog_number', 'inventory_number', 'lab_manager', 'phone', 'location', 'general_info', 'service_notes', 'image_url', 'sort_order'],
  hamilton_parts: ['catalog_number', 'inventory_number', 'contact_person', 'location', 'lab_manager', 'has_96_head', 'has_iswop', 'general_info', 'service_notes', 'image_url', 'sort_order'],
  device_info_records: ['device_id', 'catalog_number', 'inventory_number', 'lab_manager', 'contact_person', 'location', 'general_info', 'image_url', 'sort_order'],
  guide_pages: ['title', 'parent_id', 'sort_order', 'is_published', 'linked_device_id', 'button_label', 'button_color', 'description'],
  guide_blocks: ['page_id', 'block_title', 'text', 'image_url', 'image_width', 'image_rotation', 'sort_order'],
  page_permissions: ['page_id', 'email'],
};

const FILTERABLE = ['device_id', 'page_id', 'parent_id', 'hospital', 'email'];

const SCHEMA = `
CREATE TABLE IF NOT EXISTS devices (id TEXT PRIMARY KEY, name TEXT, name_he TEXT, notes TEXT, category TEXT,
  tech_code TEXT, external_link TEXT, info_route TEXT, image TEXT, sort_order REAL DEFAULT 0);
CREATE TABLE IF NOT EXISTS parts (id TEXT PRIMARY KEY, device_id TEXT, name TEXT, part_number TEXT,
  service_type TEXT DEFAULT 'general', quantity REAL, description_he TEXT, model_number TEXT, created_date TEXT);
CREATE TABLE IF NOT EXISTS pcr_devices (id TEXT PRIMARY KEY, device_name TEXT, inventory_number TEXT,
  serial_number TEXT, hospital TEXT, description TEXT, is_triple_head INTEGER DEFAULT 0, sort_order REAL DEFAULT 0);
CREATE TABLE IF NOT EXISTS bilimeter_devices (id TEXT PRIMARY KEY, device_name TEXT, inventory_number TEXT,
  serial_number TEXT, hospital TEXT, description TEXT, sort_order REAL DEFAULT 0);
CREATE TABLE IF NOT EXISTS rotor_gene_parts (id TEXT PRIMARY KEY, catalog_number TEXT, inventory_number TEXT,
  lab_manager TEXT, phone TEXT, location TEXT, general_info TEXT, service_notes TEXT, image_url TEXT, sort_order REAL DEFAULT 0);
CREATE TABLE IF NOT EXISTS hamilton_parts (id TEXT PRIMARY KEY, catalog_number TEXT, inventory_number TEXT,
  contact_person TEXT, location TEXT, lab_manager TEXT, has_96_head INTEGER DEFAULT 0, has_iswop INTEGER DEFAULT 0,
  general_info TEXT, service_notes TEXT, image_url TEXT, sort_order REAL DEFAULT 0);
CREATE TABLE IF NOT EXISTS device_info_records (id TEXT PRIMARY KEY, device_id TEXT, catalog_number TEXT,
  inventory_number TEXT, lab_manager TEXT, contact_person TEXT, location TEXT, general_info TEXT, image_url TEXT, sort_order REAL DEFAULT 0);
CREATE TABLE IF NOT EXISTS guide_pages (id TEXT PRIMARY KEY, title TEXT, parent_id TEXT, sort_order REAL DEFAULT 0,
  is_published INTEGER DEFAULT 1, linked_device_id TEXT, button_label TEXT, button_color TEXT, description TEXT);
CREATE TABLE IF NOT EXISTS guide_blocks (id TEXT PRIMARY KEY, page_id TEXT, block_title TEXT, text TEXT,
  image_url TEXT, image_width REAL DEFAULT 220, image_rotation REAL DEFAULT 0, sort_order REAL DEFAULT 0);
CREATE TABLE IF NOT EXISTS files (id TEXT PRIMARY KEY, name TEXT, mime TEXT, data BLOB, created TEXT);
CREATE TABLE IF NOT EXISTS admins (email TEXT PRIMARY KEY);
CREATE TABLE IF NOT EXISTS page_permissions (id TEXT PRIMARY KEY, page_id TEXT, email TEXT);
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
`;

const genId = () => [...crypto.getRandomValues(new Uint8Array(12))].map(b => b.toString(16).padStart(2, '0')).join('');

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8' },
});

async function ensureSetup(db) {
  const has = await db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='devices'").first();
  if (!has) {
    for (const stmt of SCHEMA.split(';').map(s => s.trim()).filter(Boolean)) {
      await db.prepare(stmt).run();
    }
  }
  const seeded = await db.prepare("SELECT value FROM meta WHERE key = 'seeded'").first();
  if (!seeded || seeded.value !== '1') await seedAll(db);
  const pmVersion = await db.prepare("SELECT value FROM meta WHERE key = 'hamilton_pm_version'").first();
  if (!pmVersion || pmVersion.value !== HAMILTON_PM_VERSION) await syncHamiltonPm(db);
}

// Applies the known Hamilton PM overlay rows: the same twelve guide pages get
// updated in place, and each is left with exactly the one consolidated block —
// any older, pre-consolidation blocks on those same pages (leftover scaffolding
// from the base44 editor) are removed so the page isn't left showing both.
async function syncHamiltonPm(db) {
  const pageStatements = HAMILTON_PM_PAGES.map((page) => db.prepare(`
    INSERT INTO guide_pages
      (id, title, parent_id, sort_order, is_published, linked_device_id, button_label, button_color, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title=excluded.title, parent_id=excluded.parent_id, sort_order=excluded.sort_order,
      is_published=excluded.is_published, linked_device_id=excluded.linked_device_id,
      button_label=excluded.button_label, button_color=excluded.button_color, description=excluded.description
  `).bind(page.id, page.title, page.parent_id ?? null, page.sort_order ?? 0, page.is_published ? 1 : 0,
    page.linked_device_id ?? null, page.button_label ?? null, page.button_color ?? null, page.description ?? null));
  await db.batch(pageStatements);

  const blockStatements = HAMILTON_PM_BLOCKS.map((block) => db.prepare(`
    INSERT OR IGNORE INTO guide_blocks
      (id, page_id, block_title, text, image_url, image_width, image_rotation, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(block.id, block.page_id, block.block_title ?? null, block.text ?? null, block.image_url ?? null,
    block.image_width ?? 220, block.image_rotation ?? 0, block.sort_order ?? 0));
  await db.batch(blockStatements);

  const pageIds = HAMILTON_PM_PAGES.map((p) => p.id);
  const keepBlockIds = HAMILTON_PM_BLOCKS.map((b) => b.id);
  const pagePlaceholders = pageIds.map(() => '?').join(',');
  const keepPlaceholders = keepBlockIds.map(() => '?').join(',');
  await db.prepare(
    `DELETE FROM guide_blocks WHERE page_id IN (${pagePlaceholders}) AND id NOT IN (${keepPlaceholders})`
  ).bind(...pageIds, ...keepBlockIds).run();

  await db.prepare("INSERT INTO meta (key, value) VALUES ('hamilton_pm_version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .bind(HAMILTON_PM_VERSION).run();
}

// Seeds every table, chunking inserts so a large table never fails as one D1 batch.
// Only marks itself done in `meta` once every table succeeds — a failure partway
// through (e.g. a transient D1 error) leaves the marker unset, so the next request
// retries and finishes the job (INSERT OR IGNORE makes re-running safe). Once the
// marker is set, seeding never touches the data tables again, so it won't
// resurrect rows a user has since deleted through the app.
async function seedAll(db) {
  const CHUNK = 40;
  for (const [table, cols] of Object.entries(TABLES)) {
    const rows = APP_SEED[table] || [];
    if (!rows.length) continue;
    const stmts = rows.map((row) => {
      const allCols = ['id', ...cols];
      const sql = `INSERT OR IGNORE INTO ${table} (${allCols.join(',')}) VALUES (${allCols.map(() => '?').join(',')})`;
      return db.prepare(sql).bind(...allCols.map(c => row[c] ?? null));
    });
    for (let i = 0; i < stmts.length; i += CHUNK) {
      await db.batch(stmts.slice(i, i + CHUNK));
    }
  }
  if (APP_SEED.admins.length) {
    await db.batch(APP_SEED.admins.map(email =>
      db.prepare('INSERT OR IGNORE INTO admins (email) VALUES (?)').bind(email)));
  }
  await db.prepare("INSERT INTO meta (key, value) VALUES ('seeded', '1') ON CONFLICT(key) DO UPDATE SET value = '1'").run();
}

function getEmail(request) {
  // Set by Cloudflare Access after login; absent in local dev and for any
  // request that reaches this Worker without passing through Access.
  return request.headers.get('Cf-Access-Authenticated-User-Email') || null;
}

// True only when this Worker is genuinely running under `wrangler dev` (the
// request's own Host header is localhost/127.0.0.1) — never for a deployed
// Worker, even if Cloudflare Access isn't (yet, or no longer) intercepting it.
// This is the one thing standing between "Access is misconfigured" and
// "everyone on the internet gets admin", so it must not be guessable from
// anything a client can send (headers, query params, etc.).
function isLocalDev(request) {
  const host = new URL(request.url).hostname;
  return host === 'localhost' || host === '127.0.0.1';
}

async function getAuth(db, request) {
  const email = getEmail(request);
  if (!email) {
    if (isLocalDev(request)) return { email: 'dev@local', isAdmin: true, pages: ['*'] };
    return { email: null, isAdmin: false, pages: [] }; // unauthenticated — no admin/editor rights
  }
  const admin = await db.prepare('SELECT 1 AS ok FROM admins WHERE email = ?').bind(email.toLowerCase()).first();
  if (admin) return { email, isAdmin: true, pages: ['*'] };
  const { results } = await db.prepare('SELECT page_id FROM page_permissions WHERE email = ?').bind(email.toLowerCase()).all();
  return { email, isAdmin: false, pages: results.map(r => r.page_id) };
}

const canEdit = (auth, pageId) => auth.isAdmin || auth.pages.includes(pageId);

// Which permission scope guards each table. Device-scoped tables (devices, parts,
// device_info_records) all share the single "device-<id>" scope, so granting an
// editor access to one device covers its own record, its parts, and its info table
// — never every device at once.
function pageIdForTable(table, body, query) {
  switch (table) {
    case 'pcr_devices': return 'pcr-info';
    case 'bilimeter_devices': return 'bilimeter-info';
    case 'rotor_gene_parts': return 'rotor-gene-info';
    case 'hamilton_parts': return 'hamilton-info';
    case 'device_info_records': return 'device-' + (body?.device_id || query?.device_id || '');
    case 'guide_pages': case 'guide_blocks': return 'guides';
    case 'parts': return 'device-' + (body?.device_id || query?.device_id || '');
    case 'devices': return 'device-' + (query?.id || '');
    default: return table;
  }
}

async function handleApi(request, env) {
  const db = env.DB;
  if (!db) return json({ error: 'D1 binding "DB" is missing — check the d1_databases block in wrangler.jsonc' }, 500);

  const url = new URL(request.url);
  const segments = url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);
  const [resource, id] = segments;
  const method = request.method;

  await ensureSetup(db);

  if (resource === 'me') {
    const auth = await getAuth(db, request);
    return json(auth);
  }

  if (resource === 'setup') {
    return json({ ok: true });
  }

  if (resource === 'files') {
    if (method === 'GET' && id) {
      const row = await db.prepare('SELECT name, mime, data FROM files WHERE id = ?').bind(id).first();
      if (!row) return new Response('Not found', { status: 404 });
      return new Response(new Uint8Array(row.data), {
        headers: { 'Content-Type': row.mime || 'application/octet-stream', 'Cache-Control': 'public, max-age=31536000' },
      });
    }
    if (method === 'POST') {
      const { name, mime, data } = await request.json(); // data = base64
      if (!data) return json({ error: 'missing data' }, 400);
      const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0));
      if (bytes.length > 4 * 1024 * 1024) return json({ error: 'file too large (max 4MB)' }, 413);
      const fileId = genId();
      await db.prepare('INSERT INTO files (id, name, mime, data, created) VALUES (?,?,?,?,?)')
        .bind(fileId, name || 'file', mime || 'application/octet-stream', bytes, new Date().toISOString()).run();
      return json({ id: fileId, url: `/api/files/${fileId}` });
    }
    return json({ error: 'method not allowed' }, 405);
  }

  if (resource === 'admins') {
    const auth = await getAuth(db, request);
    if (!auth.isAdmin) return json({ error: 'forbidden' }, 403);
    if (method === 'GET') {
      const { results } = await db.prepare('SELECT email FROM admins ORDER BY email').all();
      return json(results);
    }
    if (method === 'POST') {
      const { email } = await request.json();
      if (!email) return json({ error: 'missing email' }, 400);
      await db.prepare('INSERT OR IGNORE INTO admins (email) VALUES (?)').bind(email.toLowerCase().trim()).run();
      return json({ ok: true });
    }
    if (method === 'DELETE' && id) {
      await db.prepare('DELETE FROM admins WHERE email = ?').bind(decodeURIComponent(id).toLowerCase()).run();
      return json({ ok: true });
    }
    return json({ error: 'method not allowed' }, 405);
  }

  const cols = TABLES[resource];
  if (!cols) return json({ error: 'unknown resource' }, 404);

  if (method === 'GET') {
    if (resource === 'page_permissions') {
      const auth0 = await getAuth(db, request);
      if (!auth0.isAdmin) return json({ error: 'forbidden' }, 403);
    }
    let sql = `SELECT * FROM ${resource}`;
    const binds = [];
    const conds = [];
    for (const f of FILTERABLE) {
      const v = url.searchParams.get(f);
      if (v !== null && cols.includes(f)) { conds.push(`${f} = ?`); binds.push(v); }
    }
    if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
    sql += cols.includes('sort_order') ? ' ORDER BY sort_order' : (cols.includes('created_date') ? ' ORDER BY created_date' : '');
    const { results } = await db.prepare(sql).bind(...binds).all();
    return json(results);
  }

  // Mutations require edit permission
  const auth = await getAuth(db, request);
  const body = (method === 'POST' || method === 'PUT') ? await request.json() : null;
  const queryParams = Object.fromEntries(url.searchParams);
  if ((resource === 'device_info_records' || resource === 'parts') && id && !body?.device_id) {
    const existing = await db.prepare(`SELECT device_id FROM ${resource} WHERE id = ?`).bind(id).first();
    if (existing) queryParams.device_id = existing.device_id;
  }
  if (resource === 'devices' && id) queryParams.id = id;
  const pageId = pageIdForTable(resource, body, queryParams);

  // Creating a brand-new device has no existing device to scope a permission to,
  // so it's an admin-only action; editors can only manage devices they're granted.
  if (resource === 'devices' && method === 'POST' && !auth.isAdmin) {
    return json({ error: 'forbidden' }, 403);
  }

  if (resource === 'page_permissions') {
    if (!auth.isAdmin) return json({ error: 'forbidden' }, 403);
  } else if (!canEdit(auth, pageId)) {
    return json({ error: 'forbidden' }, 403);
  }

  if (method === 'POST') {
    const rowId = genId();
    const fields = cols.filter(c => body[c] !== undefined);
    const sql = `INSERT INTO ${resource} (id${fields.map(f => ',' + f).join('')}) VALUES (?${fields.map(() => ',?').join('')})`;
    await db.prepare(sql).bind(rowId, ...fields.map(f => body[f] === '' ? null : body[f])).run();
    const row = await db.prepare(`SELECT * FROM ${resource} WHERE id = ?`).bind(rowId).first();
    return json(row, 201);
  }

  if (method === 'PUT' && id) {
    const fields = cols.filter(c => body[c] !== undefined);
    if (!fields.length) return json({ error: 'no fields' }, 400);
    const sql = `UPDATE ${resource} SET ${fields.map(f => f + ' = ?').join(', ')} WHERE id = ?`;
    await db.prepare(sql).bind(...fields.map(f => body[f] === '' ? null : body[f]), id).run();
    const row = await db.prepare(`SELECT * FROM ${resource} WHERE id = ?`).bind(id).first();
    return json(row);
  }

  if (method === 'DELETE' && id) {
    // Deleting the device record itself (not its parts) stays admin-only — an
    // editor granted a single device shouldn't be able to remove it from the system.
    if (resource === 'devices' && !auth.isAdmin) return json({ error: 'forbidden' }, 403);
    await db.prepare(`DELETE FROM ${resource} WHERE id = ?`).bind(id).run();
    if (resource === 'guide_pages') {
      await db.prepare('DELETE FROM guide_blocks WHERE page_id = ?').bind(id).run();
      await db.prepare('UPDATE guide_pages SET parent_id = NULL WHERE parent_id = ?').bind(id).run();
    }
    return json({ ok: true });
  }

  return json({ error: 'method not allowed' }, 405);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      try {
        return await handleApi(request, env);
      } catch (err) {
        return json({ error: err.message || 'internal error' }, 500);
      }
    }
    // Everything else is a static asset; unmatched paths fall back to index.html
    // (single-page-application mode, configured in wrangler.jsonc) so client-side
    // routes like /devices/:id or /hamilton-info render correctly on direct load.
    return env.ASSETS.fetch(request);
  },
};
