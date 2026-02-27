// =====================
// Terra dei Pappagalli
// script.js (com Masonry 100% via JS, sem buracos)
// =====================

// ======= CONFIG =======
const CSV_FILE = "products.csv";
const IMAGE_FOLDER = "imagem/";
const WHATSAPP_NUMBER = "393932245332"; // sem "+" e sem espaços

// ======= ELEMENTOS =======
const grid = document.getElementById("grid");
const statusEl = document.getElementById("status");
const searchEl = document.getElementById("search");
const categoryEl = document.getElementById("category");
const btnPrint = document.getElementById("btnPrint");
const whatsLink = document.getElementById("whatsLink");

// ======= ESTADO =======
let allProducts = [];
let masonryEnabled = true;

// ======= HELPERS =======
function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeKey(k) {
  return String(k || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function pick(obj, keys) {
  for (const k of keys) {
    const direct = obj[k];
    if (direct !== undefined && direct !== null && String(direct).trim() !== "") return direct;

    const nk = normalizeKey(k);
    for (const ok of Object.keys(obj)) {
      if (normalizeKey(ok) === nk) {
        const v = obj[ok];
        if (v !== undefined && v !== null && String(v).trim() !== "") return v;
      }
    }
  }
  return "";
}

function detectSeparator(headerLine) {
  const commas = (headerLine.match(/,/g) || []).length;
  const semis = (headerLine.match(/;/g) || []).length;
  return semis > commas ? ";" : ",";
}

// CSV parser (suporta ; ou , e aspas)
function parseCSV(text) {
  const raw = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = raw.split("\n").filter((l) => l.trim() !== "");
  if (!lines.length) return [];

  const sep = detectSeparator(lines[0]);

  function splitLine(line) {
    const out = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];

      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (ch === sep && !inQuotes) {
        out.push(cur);
        cur = "";
        continue;
      }

      cur += ch;
    }

    out.push(cur);
    return out.map((s) => s.trim());
  }

  const headers = splitLine(lines[0]).map((h) => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitLine(lines[i]);
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = cols[idx] ?? "";
    });
    rows.push(obj);
  }

  return rows;
}

function money(val) {
  const s = String(val ?? "").trim();
  if (!s) return "";
  const n = Number(s.replace(/\./g, "").replace(",", "."));
  if (!isFinite(n)) return escapeHtml(val);
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

function makeImageSrc(imgValue) {
  const img = String(imgValue || "").trim();
  if (!img) return "";

  if (/^(https?:)?\/\//i.test(img)) return img;

  if (/\.(png|jpg|jpeg|webp|gif)$/i.test(img)) return IMAGE_FOLDER + img;

  return IMAGE_FOLDER + img + ".png";
}

function buildCategoryOptions(products) {
  if (!categoryEl) return;

  categoryEl.innerHTML = `<option value="">Todas as categorias</option>`;
  const cats = Array.from(new Set(products.map((p) => (p.categoria || "").trim()).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, "pt-BR"));

  for (const c of cats) {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    categoryEl.appendChild(opt);
  }
}

// ======= MASONRY (JS) =======
function debounce(fn, wait = 80) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

function disableMasonry() {
  if (!grid) return;
  grid.classList.remove("masonry");
  grid.style.height = "";
  for (const card of grid.querySelectorAll(".card")) {
    card.style.position = "";
    card.style.left = "";
    card.style.top = "";
    card.style.transform = "";
    card.style.width = "";
  }
}

function getGapPx(el) {
  const cs = getComputedStyle(el);
  // gap pode vir como "14px" ou "14px 14px"
  const gap = cs.gap || cs.gridGap || "0px";
  const first = gap.split(" ")[0];
  const n = parseFloat(first);
  return Number.isFinite(n) ? n : 0;
}

function getColumnCount(el) {
  const cs = getComputedStyle(el);
  const cols = cs.gridTemplateColumns || "";
  if (!cols) return 1;
  // "250px 250px 250px 250px" -> 4
  const count = cols.split(" ").filter(Boolean).length;
  return Math.max(1, count);
}

function applyMasonryLayout() {
  if (!grid || !masonryEnabled) return;

  const cards = Array.from(grid.querySelectorAll(".card"));
  if (!cards.length) return;

  // Se estiver em modo impressão (alguns browsers disparam beforeprint), não mexe
  const inPrint = window.matchMedia && window.matchMedia("print").matches;
  if (inPrint) return;

  const colCount = getColumnCount(grid);
  const gap = getGapPx(grid);

  // largura total útil do grid
  const gridWidth = grid.clientWidth;
  const colWidth = Math.floor((gridWidth - gap * (colCount - 1)) / colCount);

  // marca como masonry
  grid.classList.add("masonry");

  const colHeights = new Array(colCount).fill(0);

  cards.forEach((card, idx) => {
    const col = idx % colCount; // mantém ordem visual esquerda->direita em linhas
    const x = col * (colWidth + gap);
    const y = colHeights[col];

    card.style.width = colWidth + "px";
    card.style.transform = `translate(${x}px, ${y}px)`;

    // mede altura depois de definir width
    const h = card.offsetHeight;
    colHeights[col] = y + h + gap;
  });

  const height = Math.max(...colHeights) - gap;
  grid.style.height = Math.max(0, height) + "px";
}

const applyMasonryDebounced = debounce(applyMasonryLayout, 80);

function hookImagesForRelayout() {
  if (!grid) return;
  const imgs = Array.from(grid.querySelectorAll("img"));

  imgs.forEach((img) => {
    if (img.dataset.masonryHooked === "1") return;
    img.dataset.masonryHooked = "1";

    if (img.complete) return;

    img.addEventListener("load", applyMasonryDebounced, { once: true });
    img.addEventListener("error", applyMasonryDebounced, { once: true });
  });
}

// ======= RENDER =======
function render(products) {
  if (!grid) return;

  // limpa e volta o grid para fluxo normal enquanto recria
  disableMasonry();
  grid.innerHTML = "";

  if (!products.length) {
    grid.innerHTML = `<div class="status">Nenhum produto encontrado.</div>`;
    return;
  }

  const frag = document.createDocumentFragment();

  products.forEach((p) => {
    const imgSrc = makeImageSrc(p.imagem);

    const priceBlocks = [];

    if (p.qtd_caixa) {
      priceBlocks.push(`
        <div>
          <div class="k">Qtd/caixa</div>
          <div class="v">${escapeHtml(p.qtd_caixa)}</div>
        </div>
      `);
    }

    if (p.valor_un) {
      const m = money(p.valor_un);
      priceBlocks.push(`
        <div>
          <div class="k">Valor unidade</div>
          <div class="v">${m || escapeHtml(p.valor_un)}</div>
        </div>
      `);
    }

    if (p.valor_total) {
      const m = money(p.valor_total);
      priceBlocks.push(`
        <div>
          <div class="k">Total</div>
          <div class="v">${m || escapeHtml(p.valor_total)}</div>
        </div>
      `);
    }

    const card = document.createElement("article");
    card.className = "card";

    card.innerHTML = `
      <div class="thumb">
        ${
          imgSrc
            ? `<img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(p.nome || "Produto")}"
                onerror="this.style.display='none'; this.parentElement.textContent='Sem imagem';">`
            : `<span class="k">Sem imagem</span>`
        }
      </div>

      <div class="body">
        <div class="badges">
          ${p.codigo ? `<span class="badge">Cód: ${escapeHtml(p.codigo)}</span>` : ""}
          ${p.categoria ? `<span class="badge cat">${escapeHtml(p.categoria)}</span>` : ""}
        </div>

        <h3 class="title">${escapeHtml(p.nome || "Produto")}</h3>

        ${p.descricao ? `<p class="desc">${escapeHtml(p.descricao)}</p>` : ""}

        ${p.italiano ? `<div class="it-name"><i>${escapeHtml(p.italiano)}</i></div>` : ""}

        ${priceBlocks.length ? `<div class="prices">${priceBlocks.join("")}</div>` : ""}
      </div>
    `;

    frag.appendChild(card);
  });

  grid.appendChild(frag);

  // relayout masonry
  hookImagesForRelayout();
  applyMasonryLayout();
}

function applyFilters() {
  const q = (searchEl?.value || "").toLowerCase().trim();
  const cat = (categoryEl?.value || "").trim();

  const filtered = allProducts.filter((p) => {
    const inCat = !cat || (p.categoria || "").trim() === cat;
    const hay = `${p.nome ?? ""} ${p.descricao ?? ""} ${p.italiano ?? ""} ${p.codigo ?? ""} ${p.categoria ?? ""}`.toLowerCase();
    const inSearch = !q || hay.includes(q);
    return inCat && inSearch;
  });

  if (statusEl) statusEl.textContent = `${filtered.length} produto(s)`;
  render(filtered);
}

// ======= LOAD CSV =======
async function load() {
  try {
    const res = await fetch(CSV_FILE, { cache: "no-store" });
    if (!res.ok) throw new Error("Não consegui ler products.csv");

    const buf = await res.arrayBuffer();
    let text;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(buf);
    } catch {
      text = new TextDecoder("windows-1252").decode(buf);
    }

    const rows = parseCSV(text);

    allProducts = rows.map((r) => ({
      imagem: pick(r, ["imagem", "Imagem", "imagem ilustrativa", "Imagem ilustrativa"]),
      codigo: pick(r, ["codigo", "código", "Codigo", "Cód", "Cod"]),
      categoria: pick(r, ["categoria", "Categoria", "tipo", "Tipo"]),
      nome: pick(r, ["nome", "Nome", "produto", "Produto"]),
      descricao: pick(r, ["descricao", "descrição", "Descrição", "marca", "Marca"]),
      qtd_caixa: pick(r, ["qtd_caixa", "qtd caixa", "quantidade por caixa", "Quantidade por caixa"]),
      valor_un: pick(r, ["valor_un", "valor un", "valor por unidade", "Valor por unidade"]),
      valor_total: pick(r, ["valor_total", "valor total", "Total", "TOTAL"]),
      italiano: pick(r, ["italiano", "Italiano", "nome_italiano", "Nome Italiano", "nome em italiano"]),
    }));

    allProducts = allProducts.filter((p) => p.nome || p.imagem || p.codigo);

    buildCategoryOptions(allProducts);

    if (statusEl) statusEl.textContent = `${allProducts.length} produto(s)`;

    render(allProducts);
  } catch (err) {
    if (statusEl) statusEl.textContent = "Erro ao carregar catálogo. Verifique o arquivo products.csv.";
    console.error(err);
  }
}

// ======= PRINT (somente catálogo) =======
// Como o HTML já marca coisas com no-print, aqui é só chamar print.
function printCatalogOnly() {
  window.print();
}

// Antes de imprimir: desativa masonry (pra não ter posição absoluta no PDF)
window.addEventListener("beforeprint", () => {
  masonryEnabled = false;
  disableMasonry();
});

// Depois de imprimir: volta masonry e recalcula
window.addEventListener("afterprint", () => {
  masonryEnabled = true;
  // pode ter mudado tamanho da viewport
  setTimeout(() => {
    hookImagesForRelayout();
    applyMasonryLayout();
  }, 50);
});

// ======= POPUP PROMO (opcional) =======
(function promoFeijoada() {
  const overlay = document.getElementById("promoOverlay");
  if (!overlay) return;

  function openPromo() {
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closePromo() {
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  window.addEventListener("load", () => {
    setTimeout(openPromo, 200);
  });

  overlay.addEventListener("click", closePromo);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("is-open")) closePromo();
  });
})();

// ======= EVENTOS =======
if (searchEl) searchEl.addEventListener("input", applyFilters);
if (categoryEl) categoryEl.addEventListener("change", applyFilters);

if (btnPrint) btnPrint.addEventListener("click", printCatalogOnly);

if (whatsLink) {
  whatsLink.addEventListener("click", (e) => {
    e.preventDefault();
    window.open(`https://wa.me/${WHATSAPP_NUMBER}`, "_blank");
  });
}

window.addEventListener("resize", applyMasonryDebounced);

// ======= START =======
load();