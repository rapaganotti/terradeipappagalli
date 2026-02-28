/* =========================================================
   Terra dei Pappagalli - script.js (COMPLETO)
   Compatível com seu HTML:
   - #grid      (container dos cards)
   - #search    (input busca)
   - #category  (select categoria)
   - #status    (contador / "Carregando...")
   - #btnPrint  (botão PDF) [opcional]
   ========================================================= */

const CSV_URL = "./products.csv";

let allProducts = [];
let filteredProducts = [];

// Elementos
let elGrid, elSearch, elCategory, elStatus, elBtnPrint;

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

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function pick(obj, keys) {
  for (const k of keys) {
    if (obj && Object.prototype.hasOwnProperty.call(obj, k)) {
      const v = String(obj[k] ?? "").trim();
      if (v !== "") return v;
    }
  }
  return "";
}

/** Converte "€ 2,27" / "2,27" / "2.27" em moeda EUR */
function moneyEUR(v) {
  const raw = String(v ?? "").trim();
  if (!raw) return "";

  const cleaned = raw.replace(/[^0-9,.\-]/g, "");
  if (!cleaned) return "";

  const n = Number(cleaned.replace(",", "."));
  if (!Number.isFinite(n)) return "";

  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

function setStatus(msg) {
  if (elStatus) elStatus.textContent = msg;
}

/* -----------------------------
   CSV Parser (detecta ; ou ,)
----------------------------- */
function parseCSV(text) {
  const t = String(text ?? "").replace(/^\uFEFF/, "");
  if (!t.trim()) return [];

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

    if (ch === '"' && inQuotes && next === '"') {
      cur += '"';
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === DELIM && !inQuotes) {
      row.push(cur);
      cur = "";
      continue;
    }
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

  if (cur.length || row.length) {
    row.push(cur);
    rows.push(row);
  }
  if (!rows.length) return [];

  const headers = rows[0].map(h => normalize(h));
  const data = [];

  for (let r = 1; r < rows.length; r++) {
    const obj = {};
    rows[r].forEach((val, c) => {
      obj[headers[c] || `col_${c}`] = String(val ?? "").trim();
    });
    if (Object.values(obj).some(v => v !== "")) data.push(obj);
  }
  return data;
}

/* -----------------------------
   Carregar produtos do CSV
----------------------------- */
async function loadProducts() {
  setStatus("Carregando...");

  const res = await fetch(CSV_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`CSV fetch falhou (${res.status})`);

  const csvText = await res.text();
  const rows = parseCSV(csvText);

  // Headers esperados:
  // imagem,codigo,categoria,nome,descricao,qtd_caixa,valor_un,Italiano
  allProducts = rows.map(r => {
    let imagem = pick(r, ["imagem"]);
    const codigo = pick(r, ["codigo"]);
    const categoria = pick(r, ["categoria"]);
    const nome = pick(r, ["nome"]);
    const descricao = pick(r, ["descricao"]);
    const italiano = pick(r, ["italiano"]); // "Italiano" vira "italiano"
    const qtdCaixa = pick(r, ["qtd_caixa", "qtdcaixa", "qtd", "quantidade"]);
    const valorUn = pick(r, ["valor_un", "valorun", "valor", "preco", "preço"]);

    // Normaliza imagem: "x.png" => "imagem/x.png"
    if (imagem && !imagem.includes("/") && !imagem.startsWith("http")) {
      imagem = `imagem/${imagem}`;
    }

    return { imagem, codigo, categoria, nome, descricao, italiano, qtdCaixa, valorUn };
  });

  filteredProducts = [...allProducts];
  populateCategories(allProducts);
  renderProducts(filteredProducts);

  setStatus(`${filteredProducts.length} prodotto(i)`);
}

/* -----------------------------
   Categorias
----------------------------- */
function populateCategories(items) {
  if (!elCategory) return;

  const cats = Array.from(
    new Set(items.map(p => (p.categoria || "").trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "it"));

  // mantém a opção inicial do HTML (ex.: "Tutte le categorie")
  const first = elCategory.querySelector("option")?.outerHTML;
  elCategory.innerHTML = first || `<option value="">Tutte le categorie</option>`;

  for (const c of cats) {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    elCategory.appendChild(opt);
  }
}

/* -----------------------------
   Filtros
----------------------------- */
function applyFilters() {
  const q = normalize(elSearch?.value ?? "");
  const cat = String(elCategory?.value ?? "").trim();

  filteredProducts = allProducts.filter(p => {
    if (cat && String(p.categoria ?? "").trim() !== cat) return false;
    if (!q) return true;

    const hay = normalize(
      [p.nome, p.descricao, p.italiano, p.codigo, p.categoria]
        .filter(Boolean)
        .join(" ")
    );

    return hay.includes(q);
  });

  renderProducts(filteredProducts);
  setStatus(`${filteredProducts.length} prodotto(i)`);
}

/* -----------------------------
   Render (FORMATO BONITO PADRÃO)
----------------------------- */
function renderProducts(items) {
  if (!elGrid) return;

  elGrid.innerHTML = "";

  if (!items || items.length === 0) {
    elGrid.innerHTML = `<div style="padding:16px">Nessun prodotto trovato.</div>`;
    return;
  }

  for (const p of items) {
    const card = document.createElement("article");
    card.className = "product-card";

    const nome = p.nome || "";
    const categoria = p.categoria || "";
    const codigo = p.codigo || "";
    const descricao = p.descricao || "";
    const italiano = p.italiano || "";
    const qtd = p.qtdCaixa || "";
    const preco = moneyEUR(p.valorUn) || "";

    const imgSrc = p.imagem ? esc(p.imagem) : "";

    card.innerHTML = `
      <div class="product-image">
        ${imgSrc ? `<img src="${imgSrc}" alt="${esc(nome)}" loading="lazy">` : ""}
      </div>

      <div class="product-body">
  //          ${codigo ? `<span class="badge">Cód: ${esc(codigo)}</span>` : ""}
        <div class="badges">
          ${categoria ? `<span class="badge category">${esc(categoria)}</span>` : ""}
        </div>

        <div class="product-title">${esc(nome)}</div>
        ${descricao ? `<div class="product-desc">${esc(descricao)}</div>` : ""}
        ${italiano ? `<div class="product-it">${esc(italiano)}</div>` : ""}

        <div class="prices">
          <div>
            <div class="k">Qtd/caixa</div>
            <div class="v">${esc(qtd)}</div>
          </div>
          <div>
            <div class="k">Valor unidade</div>
            <div class="v">${esc(preco)}</div>
          </div>
        </div>
      </div>
    `;

    elGrid.appendChild(card);
  }
}

/* -----------------------------
   PDF
----------------------------- */
function doPrint() {
  window.print();
}

/* -----------------------------
   Init
----------------------------- */
async function init() {
  elGrid = document.getElementById("grid");
  elSearch = document.getElementById("search");
  elCategory = document.getElementById("category");
  elStatus = document.getElementById("status");
  elBtnPrint = document.getElementById("btnPrint");

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
          Verifique se <code>products.csv</code> está na raiz do projeto e acessível.
        </div>
      `;
    }
  }
}

document.addEventListener("DOMContentLoaded", init);