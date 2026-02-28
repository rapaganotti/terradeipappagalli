/* ======================================================
   Terra dei Pappagalli | Catalogo
   JS simples e estável:
   - carrega products.csv
   - renderiza cards
   - busca + filtro por categoria
   - botão "Salvar em PDF" chama window.print()
   - popup abre 1x por sessão
====================================================== */

const CSV_PATH = 'products.csv';

// Elementos
const grid = document.getElementById('grid');
const statusEl = document.getElementById('status');
const searchEl = document.getElementById('search');
const categoryEl = document.getElementById('category');
const btnPrint = document.getElementById('btnPrint');

const promoOverlay = document.getElementById('promoOverlay');
const promoClose = document.getElementById('promoClose');
const promoLink = document.getElementById('promoLink');

let allProducts = [];

/* =========================
   CSV PARSER
========================= */
function parseCSV(text) {
  const cleanedText = (text || '').replace(/\uFEFF/g, ''); // remove BOM
  const delim = cleanedText.includes(';') ? ';' : ',';

  const lines = cleanedText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l !== '');

  if (!lines.length) return [];

  const headers = lines[0].split(delim).map(h => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delim);
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = (cols[idx] ?? '').trim();
    });
    rows.push(obj);
  }

  return rows;
}

function normalizeKey(k) {
  return (k || '').toString().trim().toLowerCase();
}

function firstOf(obj, keys) {
  for (const k of keys) {
    const v = obj[k];
    if (v != null && String(v).trim() !== '') return v;
  }
  return '';
}

function toNumberBR(v) {
  const s = (v ?? '').toString().trim();
  if (!s) return NaN;

  // remove símbolos (€, etc), mantém números e separadores
  const only = s.replace(/[^0-9.,-]/g, '');

  // "1.234,56" -> remove pontos de milhar e troca vírgula por ponto
  const cleaned = only.replace(/\./g, '').replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

function formatEuro(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
}

function safeText(v) {
  return (v ?? '').toString();
}

function imgPathFromCode(code) {
  const c = (code || '').trim();
  if (!c) return 'imagem/sem-imagem.png';
  return `imagem/${c.toLowerCase()}.png`;
}

/* =========================
   RENDER
========================= */
function buildCard(p) {
  const img = imgPathFromCode(p.code);

  const el = document.createElement('article');
  el.className = 'card';
  el.dataset.category = p.category;
  el.dataset.search = `${p.code} ${p.category} ${p.name} ${p.brand} ${p.descIt}`.toLowerCase();

  el.innerHTML = `
    <div class="thumb">
      <img src="${img}" alt="${safeText(p.name)}" loading="lazy" onerror="this.src='imagem/sem-imagem.png'" />
    </div>
    <div class="card-body">
      <div class="meta-row">
        <span class="badge code">Cód: ${safeText(p.code)}</span>
        <span class="badge cat">${safeText(p.category)}</span>
      </div>

      <h3 class="product-name">${safeText(p.name)}</h3>

      <div class="sub">
        <div class="brand-line">${safeText(p.brand)}</div>
        <div class="it-line">${safeText(p.descIt)}</div>
      </div>

      <div class="bottom-row">
        <div class="col">
          <div class="lbl">Qtd/caixa</div>
          <div class="val">${safeText(p.qty)}</div>
        </div>
        <div class="col">
          <div class="lbl">Valor unidade</div>
          <div class="val">${formatEuro(p.price)}</div>
        </div>
      </div>
    </div>
  `;

  return el;
}

function renderProducts(list) {
  if (!grid) return;
  grid.innerHTML = '';

  const frag = document.createDocumentFragment();
  list.forEach(p => frag.appendChild(buildCard(p)));
  grid.appendChild(frag);

  if (statusEl) statusEl.textContent = `${list.length} produto(s)`;
}

function buildCategoryOptions(products) {
  if (!categoryEl) return;

  const set = new Set();
  products.forEach(p => {
    if (p.category) set.add(p.category);
  });

  const cats = Array.from(set).sort((a, b) => a.localeCompare(b));

  categoryEl.innerHTML = '';

  const optAll = document.createElement('option');
  optAll.value = '';
  optAll.textContent = 'Todas as categorias';
  categoryEl.appendChild(optAll);

  cats.forEach(c => {
    const o = document.createElement('option');
    o.value = c;
    o.textContent = c;
    categoryEl.appendChild(o);
  });
}

function applyFilters() {
  const q = (searchEl?.value || '').trim().toLowerCase();
  const cat = categoryEl?.value || '';

  const filtered = allProducts.filter(p => {
    const okCat = !cat || p.category === cat;
    if (!okCat) return false;
    if (!q) return true;

    return (`${p.code} ${p.category} ${p.name} ${p.brand} ${p.descIt}`)
      .toLowerCase()
      .includes(q);
  });

  renderProducts(filtered);
}

/* =========================
   PROMO (POPUP)
========================= */
function openPromo() {
  if (!promoOverlay) return;
  promoOverlay.classList.add('open');
  promoOverlay.setAttribute('aria-hidden', 'false');
}

function closePromo() {
  if (!promoOverlay) return;
  promoOverlay.classList.remove('open');
  promoOverlay.setAttribute('aria-hidden', 'true');
}

/* =========================
   PRINT
   - NÃO altera DOM
   - CSS @media print controla o que aparece
========================= */
function printCatalog() {
  closePromo();
  document.body.classList.add('print-mode');

  requestAnimationFrame(() => {
    window.print();
  });
}

window.addEventListener('afterprint', () => {
  document.body.classList.remove('print-mode');
});

/* =========================
   INIT
========================= */
async function init() {
  try {
    if (!sessionStorage.getItem('promoShown')) {
      openPromo();
      sessionStorage.setItem('promoShown', '1');
    }
  } catch {}

  promoClose?.addEventListener('click', closePromo);
  promoOverlay?.addEventListener('click', (e) => {
    if (e.target === promoOverlay) closePromo();
  });
  promoLink?.addEventListener('click', closePromo);

  const res = await fetch(CSV_PATH, { cache: 'no-store' });
  const text = await res.text();
  const raw = parseCSV(text);

  allProducts = raw
    .map(r => {
      const lower = {};
      Object.keys(r).forEach(k => (lower[normalizeKey(k)] = r[k]));

      const code = firstOf(lower, ['cod', 'cód', 'codigo', 'código', 'sku', 'id', 'code']);
      const category = firstOf(lower, ['categoria', 'category', 'cat', 'grupo', 'linha']);
      const name = firstOf(lower, ['produto', 'product', 'nome', 'name', 'descricao', 'descrição', 'descrizione']);
      const brand = firstOf(lower, ['marca', 'brand', 'fabricante']);
      const descIt = firstOf(lower, ['it', 'italiano', 'descrizione_it', 'desc_it', 'descricao_it', 'descrizione italiana']);
      const qty = firstOf(lower, ['qtd/caixa', 'qtd', 'quantidade', 'qty', 'caixa', 'pack']);
      const price = toNumberBR(
        firstOf(lower, ['valor', 'preco', 'preço', 'unit', 'unitario', 'unitário', 'valor unidade', 'valor_unidade', 'price'])
      );

      return { code, category, name, brand, descIt, qty, price };
    })
    .filter(p => p.code && p.name);

  buildCategoryOptions(allProducts);
  renderProducts(allProducts);

  searchEl?.addEventListener('input', applyFilters);
  categoryEl?.addEventListener('change', applyFilters);
  btnPrint?.addEventListener('click', printCatalog);
}

init().catch(err => {
  console.error('Erro ao inicializar:', err);
  if (statusEl) statusEl.textContent = 'Erro ao carregar catálogo.';
});