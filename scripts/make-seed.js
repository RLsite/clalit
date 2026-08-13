// Converts scrape/*.json (base44 export) into functions/api/seed-data.js
// Run: node scripts/make-seed.js
const fs = require('fs');
const path = require('path');

const S = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'scrape', f), 'utf8'));

const devicesRaw = S('Device.json');
const partsRaw = S('Part.json');
const pcrRaw = S('PCRDevice.json');
const guidePagesRaw = S('GuidePage.json');
const guideBlocksRaw = S('GuideBlock.json');
const rotorRaw = S('RotorGenePart.json');
const hamiltonRaw = S('HamiltonPart.json');
const bilimeterRaw = S('BilimeterDevice.json');
const dirRaw = S('DeviceInfoRecord.json');

// Original home page display order (captured from live site)
const homeOrder = [
  '69ef207bc456d920d6eb9116', // Starrsed RS
  '69ef207bc456d920d6eb9117', // Starrsed ST
  '69ef207bc456d920d6eb9120', // Rotor-Gene Q
  '69ef207bc456d920d6eb911c', // Canto II
  '69ef207bc456d920d6eb911e', // Bilimeter
  '69ef207bc456d920d6eb9114', // Olympus AU5800
  '69ef207bc456d920d6eb9121', // 7500 PCR
  '69ef207bc456d920d6eb9119', // XN-L 550
  '69ef207bc456d920d6eb911d', // Navios-EX
  '69ef207bc456d920d6eb911f', // Osmometer
  '69ef207bc456d920d6eb911a', // Navios
  '69ef207bc456d920d6eb9115', // AutoMate (OLA)
  '69ef207bc456d920d6eb911b', // DxFLEX
  '69f094abec6af8abfca4aabd', // Hamilton NGS Star
];

// Device image files copied from the original site (public/images/devices/)
const deviceImages = {};
for (const id of homeOrder) {
  for (const ext of ['png', 'jpg']) {
    if (fs.existsSync(path.join(__dirname, '..', 'public', 'images', 'devices', `${id}.${ext}`))) {
      deviceImages[id] = `/images/devices/${id}.${ext}`;
    }
  }
}

// Custom info routes that replace the generic /device-info/:id page
const infoRoutes = {
  '69ef207bc456d920d6eb9120': '/rotor-gene-info',
  '69ef207bc456d920d6eb911e': '/bilimeter-info',
  '69f094abec6af8abfca4aabd': '/hamilton-info',
};

const devices = devicesRaw.map((d) => ({
  id: d.id,
  name: d.name,
  name_he: d.name_he || null,
  notes: d.notes || null,
  category: d.category,
  tech_code: d.tech_code || null,
  external_link: d.external_link || null,
  info_route: infoRoutes[d.id] || null,
  image: deviceImages[d.id] || null,
  sort_order: homeOrder.indexOf(d.id),
}));

const parts = partsRaw.map((p) => ({
  id: p.id,
  device_id: p.device,
  name: p.name,
  part_number: p.part_number || null,
  service_type: p.service_type || 'general',
  quantity: p.quantity ?? null,
  description_he: p.description_he || null,
  model_number: p.model_number || null,
  created_date: p.created_date,
}));

const pcr_devices = pcrRaw.map((r) => ({
  id: r.id,
  device_name: r.device_name || null,
  inventory_number: r.inventory_number || null,
  serial_number: r.serial_number || null,
  hospital: r.hospital || null,
  description: r.description || null,
  is_triple_head: r.is_triple_head ? 1 : 0,
  sort_order: r.sort_order ?? 0,
}));

const bilimeter_devices = bilimeterRaw.map((r) => ({
  id: r.id,
  device_name: r.device_name || null,
  inventory_number: r.inventory_number || null,
  serial_number: r.serial_number || null,
  hospital: r.hospital || null,
  description: r.description || null,
  sort_order: r.sort_order ?? 0,
}));

const rotor_gene_parts = rotorRaw.map((r) => ({
  id: r.id,
  catalog_number: r.catalog_number || null,
  inventory_number: r.inventory_number || null,
  lab_manager: r.lab_manager || null,
  phone: r.part_type || null, // original app reused part_type as phone
  location: r.description || null,
  general_info: r.general_info || null,
  service_notes: r.service_notes || null,
  image_url: r.image_url || null,
  sort_order: r.sort_order ?? 0,
}));

const hamilton_parts = hamiltonRaw.map((r) => ({
  id: r.id,
  catalog_number: r.catalog_number || null,
  inventory_number: r.inventory_number || null,
  contact_person: r.part_type || null, // original app reused part_type as contact
  location: r.description || null,
  lab_manager: r.lab_manager || null,
  has_96_head: r.has_96_head ? 1 : 0,
  has_iswop: r.has_iswop ? 1 : 0,
  general_info: r.general_info || null,
  service_notes: r.service_notes || null,
  image_url: r.image_url || null,
  sort_order: r.sort_order ?? 0,
}));

const device_info_records = dirRaw.map((r) => ({
  id: r.id,
  device_id: r.device_id,
  catalog_number: r.catalog_number || null,
  inventory_number: r.inventory_number || null,
  lab_manager: r.lab_manager || null,
  contact_person: r.contact_person || null,
  location: r.location || null,
  general_info: r.general_info || null,
  image_url: r.image_url || null,
  sort_order: r.sort_order ?? 0,
}));

// Rewrite base44-hosted guide images to local copies
const rewriteImg = (url) => {
  if (!url) return null;
  const m = url.match(/\/([^/]+\.(?:jpeg|jpg|png|gif|webp))$/i);
  if (m && url.includes('base44')) return `/images/guides/${m[1]}`;
  return url;
};

const guide_pages = guidePagesRaw.map((g) => ({
  id: g.id,
  title: g.title,
  parent_id: g.parent_id || null,
  sort_order: g.sort_order ?? 0,
  is_published: g.is_published ? 1 : 0,
  linked_device_id: g.linked_device_id || null,
  button_label: g.button_label || null,
  button_color: g.button_color || null,
  description: g.description || null,
}));

const guide_blocks = guideBlocksRaw.map((b) => ({
  id: b.id,
  page_id: b.page_id,
  block_title: b.block_title || null,
  text: b.text || null,
  image_url: rewriteImg(b.image_url),
  image_width: b.image_width ?? 220,
  image_rotation: b.image_rotation ?? 0,
  sort_order: b.sort_order ?? 0,
}));

const admins = ['clalit.rl@gmail.com', 'levy.harel@gmail.com'];

const seed = {
  devices, parts, pcr_devices, bilimeter_devices, rotor_gene_parts,
  hamilton_parts, device_info_records, guide_pages, guide_blocks, admins,
};

const out = '// Auto-generated by scripts/make-seed.js — data copied from the original base44 app\n'
  + 'export const SEED = ' + JSON.stringify(seed, null, 1) + ';\n';
fs.writeFileSync(path.join(__dirname, '..', 'functions', 'api', 'seed-data.js'), out, 'utf8');
console.log('seed-data.js written:',
  Object.entries(seed).map(([k, v]) => `${k}=${Array.isArray(v) ? v.length : ''}`).join(', '));
