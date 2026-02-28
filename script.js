/* =========================================================
   Terra dei Pappagalli - script.js (COMPLETO, compatível com seu HTML)
   HTML IDs esperados:
   - #grid      (container dos cards)
   - #search    (input de busca)
   - #category  (select de categorias)
   - #status    (texto "Carregando..." / contador)
   - #btnPrint  (botão salvar em PDF) [opcional]
   - #printHeader (header de impressão) [opcional]
   ========================================================= */

const CSV_URL = "./products.csv"; // seu products.csv está na raiz do repo

let allProducts = [];
let filteredProducts = [];

// Elementos
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

function pick(obj, keys) {
  for (const k of keys) {
    if (obj && Object.prototype.hasOwnProperty.call(obj, k)) {
      const v = String(obj[k] ?? "").trim();
      if (v !== "") return v;
    }
  }
  return "";
}

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/** Converte "€ 2,27" / "2,27" / "2.27" em moeda */
function moneyEUR(v) {
  const raw = String(v ?? "").trim();
  if (!raw) return "";

  const cleaned = raw.replace(/[^0-9,.\-]/g, "");
  if (!cleaned) return "";

  const n = Number(cleaned.replace(",", "."));
  if (!Number.isFinite(n)) return "";

  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

/* -----------------------------
   CSV Parser (detecta ; ou ,)
----------------------------- */
function parseCSV(text) {
  const t = String(text ?? "").replace(/^\uFEFF/, ""); // remove BOM
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

    // fim de linha
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

  const headers = rows[0].map(h => normalize(h));
  const data = [];

  for (let r = 1; r < rows.length; r++) {
    const obj = {};
    rows[r].forEach((val, c) => {
      obj[headers[c] || `col_${c}`] = String(val ?? "").trim();
    });

    // pula linha vazia
    if (Object.values(obj).some(v => v !== "")) data.push(obj);
  }

  return data;
}

/* -----------------------------
   UI helpers
----------------------------- */
function setStatus(msg) {
  if (elStatus) elStatus.textContent = msg;
}

function populateCategories(items) {
  if (!elCategory) return;

  const cats = Array.from(
    new Set(items.map(p => (p.categoria || "").trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "it"));

  // Mantém a primeira opção do HTML (se existir)
  const firstOpt = elCategory.querySelector("option");
  const firstHTML = firstOpt ? firstOpt.outerHTML : `<option value="">Tutte le categorie</option>`;

  elCategory.innerHTML = firstHTML;

  for (const c of cats) {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    elCategory.appendChild(opt);
  }
}

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
   Render
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

    // IMPORTANTÍSSIMO:
    // Seu CSS original do repo usa classes "card", "card-img", etc.
    // (pelo que eu vi no seu script anterior).
    // Vou manter esse padrão para bater com o seu CSS atual.
    card.className = "card";

    const nome = p.nome || "";
    const categoria = p.categoria || "";
    const it = p.italiano || "";
    const desc = p.descricao || "";
    const qtd = p.qtdCaixa || "";
    const preco = moneyEUR(p.valorUn) || "";

    const imgSrc = p.imagem ? esc(p.imagem) : "";

    card.innerHTML = `
      <div class="card-img">
        ${imgSrc ? `<img src="${imgSrc}" alt="${esc(nome)}" loading="lazy">` : ""}
      </div>

      <div class="card-body">
        ${categoria ? `<div class="badge-cat">${esc(categoria)}</div>` : ""}
        <div class="prod-name">${esc(nome)}</div>
        ${it ? `<div class="prod-it">${esc(it)}</div>` : ""}
        ${desc ? `<div class="prod-desc">${esc(desc)}</div>` : ""}
      </div>

      <div class="card-footer">
        <div class="meta">
          <div class="meta-left">
            <div class="meta-label">Qtd/caixa</div>
            <div class="meta-value">${esc(qtd)}</div>
          </div>
          <div class="meta-right">
            <div class="meta-label">Valor unidade</div>
            <div class="meta-value">${esc(preco)}</div>
          </div>
        </div>
      </div>
    `;

    elGrid.appendChild(card);
  }
}

/* -----------------------------
   Carregamento do CSV e mapeamento
----------------------------- */
async function loadProducts() {
  setStatus("Carregando...");

  const res = await fetch(CSV_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`CSV fetch falhou (${res.status})`);

  const csvText = await res.text();
  const rows = parseCSV(csvText);

  // Seus headers: imagem,codigo,categoria,nome,descricao,qtd_caixa,valor_un,Italiano
  allProducts = rows.map(r => {
    let imagem = pick(r, ["imagem"]);
    const codigo = pick(r, ["codigo"]);
    const categoria = pick(r, ["categoria"]);
    const nome = pick(r, ["nome"]);
    const descricao = pick(r, ["descricao"]);
    const italiano = pick(r, ["italiano"]); // "Italiano" vira "italiano" no normalize
    const qtdCaixa = pick(r, ["qtd_caixa", "qtdcaixa", "qtd", "quantidade"]);
    const valorUn = pick(r, ["valor_un", "valorun", "valor", "preco", "preço"]);

    // Normaliza caminho de imagem (pasta "imagem" na raiz do repo)
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
   Print
----------------------------- */
function doPrint() {
  window.print();
}

/* -----------------------------
   INIT (compatível com seu HTML)
----------------------------- */
async function init() {
  // IDs conforme seu DevTools:
  elGrid = document.getElementById("grid");
  elSearch = document.getElementById("search");
  elCategory = document.getElementById("category");
  elStatus = document.getElementById("status");
  elBtnPrint = document.getElementById("btnPrint");
  elPrintHeader = document.getElementById("printHeader"); // opcional

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