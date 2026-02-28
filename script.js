/* =========================================================
   Terra dei Pappagalli - script.js (COMPLETO)
   ========================================================= */

/** Caminho do CSV (ajuste se você mudar a estrutura do repo) */
const CSV_URL = "./products.csv";

/** Estado */
let allProducts = [];
let filteredProducts = [];

/** Elementos da UI (IDs devem existir no index.html) */
let elGrid, elSearch, elCategory, elStatus, elBtnPrint, elPrintHeader;

/* -----------------------------
   Utilidades
----------------------------- */

function normalize(str) {
  return String(str ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/** Pega o primeiro campo existente entre várias chaves possíveis */
function pick(obj, keys) {
  for (const k of keys) {
    if (obj && Object.prototype.hasOwnProperty.call(obj, k)) {
      const v = String(obj[k] ?? "").trim();
      if (v !== "") return v;
    }
  }
  return "";
}

/** Converte para moeda EUR aceitando "€ 2,27", "2,27", "2.27" etc. */
function moneyEUR(v) {
  const raw = String(v ?? "").trim();
  if (!raw) return "";

  const cleaned = raw.replace(/[^0-9,.\-]/g, "");
  if (!cleaned) return "";

  const n = Number(cleaned.replace(",", "."));
  if (!Number.isFinite(n)) return "";

  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

/** Escapa HTML (evita quebrar layout) */
function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* -----------------------------
   CSV Parser (detecta ; ou ,)
----------------------------- */

function parseCSV(text) {
  const t = String(text ?? "").replace(/^\uFEFF/, ""); // remove BOM
  if (!t.trim()) return [];

  // detecta delimitador via cabeçalho
  const firstLine = t.split(/\r?\n/)[0] || "";
  const semi = (firstLine.match(/;/g) || []).length;
  const comma = (firstLine.match(/,/g) || []).length;
  const DELIM = semi >= comma ? ";" : ",";

  const rows = [];
  let row = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    const next = t[i + 1];

    // "" dentro de aspas vira "
    if (ch === '"' && inQuotes && next === '"') {
      cur += '"';
      i++;
      continue;
    }

    // alterna aspas
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    // separador
    if (ch === DELIM && !inQuotes) {
      row.push(cur);
      cur = "";
      continue;
    }

    // quebra de linha
    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") i++;
      row.push(cur);
      rows.push(row);
      row = [];
      cur = "";
      continue;
    }

    cur += ch;
  }

  // última linha
  if (cur.length || row.length) {
    row.push(cur);
    rows.push(row);
  }

  if (rows.length === 0) return [];

  const headers = rows[0].map(h => normalize(h).trim());
  const data = [];

  for (let r = 1; r < rows.length; r++) {
    const obj = {};
    rows[r].forEach((val, c) => {
      obj[headers[c] || `col_${c}`] = String(val ?? "").trim();
    });

    // pula linha completamente vazia
    if (Object.values(obj).some(v => v !== "")) data.push(obj);
  }

  return data;
}

/* -----------------------------
   Carregamento de produtos
----------------------------- */

async function loadProducts() {
  setStatus("Caricamento prodotti…");

  const res = await fetch(CSV_URL, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Erro ao carregar CSV (${res.status})`);
  }

  const csvText = await res.text();
  const rows = parseCSV(csvText);

  // Mapeamento do seu CSV:
  // imagem,codigo,categoria,nome,descricao,qtd_caixa,valor_un,Italiano
  allProducts = rows.map(r => {
    const categoria = pick(r, ["categoria"]);
    let imagem = pick(r, ["imagem"]);
    const codigo = pick(r, ["codigo"]);
    const nome = pick(r, ["nome"]);
    const descricao = pick(r, ["descricao"]);
    const italiano = pick(r, ["italiano"]); // normalize() transforma "Italiano" em "italiano"
    const qtdCaixa = pick(r, ["qtd_caixa", "qtdcaixa", "qtd", "quantidade"]);
    const valorUn = pick(r, ["valor_un", "valorun", "valor", "preco", "preço"]);

    // Normaliza caminho de imagem:
    // se vier "produto.png" vira "imagem/produto.png"
    // se vier "imagem/produto.png" mantém
    // se vier URL http, mantém
    if (imagem && !imagem.includes("/") && !imagem.startsWith("http")) {
      imagem = `imagem/${imagem}`;
    }

    return {
      categoria,
      imagem,
      codigo,
      nome,
      descricao,
      italiano,
      qtdCaixa,
      valorUn
    };
  });

  filteredProducts = [...allProducts];

  populateCategories(allProducts);
  renderProducts(filteredProducts);

  setStatus(`${filteredProducts.length} prodotto(i)`);
}

/* -----------------------------
   UI: filtros e render
----------------------------- */

function populateCategories(items) {
  if (!elCategory) return;

  const cats = Array.from(
    new Set(items.map(p => (p.categoria || "").trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "it"));

  // preserva primeira opção (ex.: "Todas as categorias")
  const first = elCategory.querySelector("option")?.outerHTML ?? "";
  elCategory.innerHTML = first || `<option value="">Tutte le categorie</option>`;

  for (const c of cats) {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    elCategory.appendChild(opt);
  }
}

function applyFilters() {
  const q = normalize(elSearch?.value ?? "");
  const cat = (elCategory?.value ?? "").trim();

  filteredProducts = allProducts.filter(p => {
    if (cat && (p.categoria || "").trim() !== cat) return false;
    if (!q) return true;

    const hay = normalize(
      [
        p.nome,
        p.descricao,
        p.italiano,
        p.codigo,
        p.categoria
      ].filter(Boolean).join(" ")
    );

    return hay.includes(q);
  });

  renderProducts(filteredProducts);
  setStatus(`${filteredProducts.length} prodotto(i)`);
}

function renderProducts(items) {
  if (!elGrid) return;
  elGrid.innerHTML = "";

  // fallback se não tiver nada
  if (!items || items.length === 0) {
    const empty = document.createElement("div");
    empty.style.padding = "16px";
    empty.textContent = "Nessun prodotto trovato.";
    elGrid.appendChild(empty);
    return;
  }

  for (const p of items) {
    const card = document.createElement("article");
    card.className = "product-card";

    const imgHtml = p.imagem
      ? `<img class="product-image" src="${esc(p.imagem)}" alt="${esc(p.nome)}" loading="lazy" />`
      : `<div class="product-image placeholder"></div>`;

    const badgeHtml = p.categoria
      ? `<span class="badge category">${esc(p.categoria)}</span>`
      : "";

    const nome = p.nome || "";
    const sub = p.italiano || ""; // linha italiana em destaque leve
    const desc = p.descricao || "";
    const qtd = p.qtdCaixa || "";
    const preco = moneyEUR(p.valorUn) || "";

    card.innerHTML = `
      <div class="product-media">
        ${imgHtml}
        <div class="product-badges">${badgeHtml}</div>
      </div>

      <div class="product-body">
        <h3 class="product-title">${esc(nome)}</h3>
        ${sub ? `<div class="product-subtitle it-inline">${esc(sub)}</div>` : ""}
        ${desc ? `<p class="product-desc">${esc(desc)}</p>` : ""}
      </div>

      <div class="product-footer">
        <div class="product-meta">
          <div class="meta-item">
            <span class="meta-label">Qtd/caixa</span>
            <span class="meta-value">${esc(qtd)}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Valor unidade</span>
            <span class="meta-value">${esc(preco)}</span>
          </div>
        </div>
      </div>
    `;

    elGrid.appendChild(card);
  }
}

function setStatus(msg) {
  if (elStatus) elStatus.textContent = msg;
}

/* -----------------------------
   Print / PDF
----------------------------- */

function doPrint() {
  // Se existir cabeçalho de print, garante que esteja “pronto”
  if (elPrintHeader) {
    // você pode ajustar algo aqui se quiser
  }
  window.print();
}

/* -----------------------------
   Init
----------------------------- */

async function init() {
  // captura elementos
  elGrid = document.getElementById("productGrid");
  elSearch = document.getElementById("searchInput");
  elCategory = document.getElementById("categorySelect");
  elStatus = document.getElementById("statusText");
  elBtnPrint = document.getElementById("btnPrint");
  elPrintHeader = document.getElementById("printHeader");

  // listeners
  if (elSearch) elSearch.addEventListener("input", applyFilters);
  if (elCategory) elCategory.addEventListener("change", applyFilters);
  if (elBtnPrint) elBtnPrint.addEventListener("click", doPrint);

  try {
    await loadProducts();
  } catch (err) {
    console.error(err);
    setStatus("Erro ao carregar produtos.");
    if (elGrid) {
      elGrid.innerHTML = `
        <div style="padding:16px">
          <strong>Erro ao carregar o catálogo.</strong><br/>
          Verifique se <code>products.csv</code> está no mesmo nível do <code>index.html</code>
          e se as imagens estão na pasta <code>/imagem</code>.
        </div>
      `;
    }
  }
}

document.addEventListener("DOMContentLoaded", init);