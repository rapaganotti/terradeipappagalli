// ======= CONFIG =======
const CSV_FILE = "products.csv";
const IMAGE_FOLDER = "imagem/";

// WhatsApp no formato internacional (sem +, sem espaços)
const WHATSAPP_NUMBER = "393932245332";

// Quantos cards por página no PDF (4 colunas -> múltiplos de 4)
// 16 = 4 linhas x 4 colunas (bom equilíbrio)
const PRINT_BREAK_EVERY = 16;

// ======= ELEMENTOS =======
const grid = document.getElementById("grid");
const statusEl = document.getElementById("status");
const searchEl = document.getElementById("search");
const categoryEl = document.getElementById("category");
const btnPrint = document.getElementById("btnPrint");
const whatsLink = document.getElementById("whatsLink");

let allProducts = [];

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

    // tenta achar por normalização (útil pra "descrição" vs "descricao")
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

// Parser CSV com aspas (suporta ; ou ,)
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
        // aspas duplicadas dentro do texto -> "
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

function ensurePrintStyles() {
  if (document.getElementById("printBreakStyle")) return;

  const style = document.createElement("style");
  style.id = "printBreakStyle";
  style.textContent = `
@media print{
  .page-break{
    break-after: page;
    page-break-after: always;
    height: 0;
  }
}
`;
  document.head.appendChild(style);
}

function buildCategoryOptions(products) {
  if (!categoryEl) return;
  categoryEl.innerHTML = `<option value="">Todas as categorias</option>`;

  const cats = Array.from(
    new Set(products.map((p) => (p.categoria || "").trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  for (const c of cats) {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    categoryEl.appendChild(opt);
  }
}

function makeImageSrc(imgValue) {
  const img = String(imgValue || "").trim();
  if (!img) return "";

  // Se já vier com extensão, usa como está
  if (/\.(png|jpg|jpeg|webp|gif)$/i.test(img)) return IMAGE_FOLDER + img;

  // Caso contrário, assume .png
  return IMAGE_FOLDER + img + ".png";
}

function render(products) {
  if (!grid) return;

  grid.innerHTML = "";
  if (!products.length) {
    grid.innerHTML = `<div class="status">Nenhum produto encontrado.</div>`;
    return;
  }

  const frag = document.createDocumentFragment();

  products.forEach((p, idx) => {
    const imgSrc = makeImageSrc(p.imagem);

    const card = document.createElement("article");
    card.className = "card";

    // Montagem do bloco de preços (compacto)
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

    // Se existir total no CSV, opcional
    if (p.valor_total) {
      const m = money(p.valor_total);
      priceBlocks.push(`
        <div>
          <div class="k">Total</div>
          <div class="v">${m || escapeHtml(p.valor_total)}</div>
        </div>
      `);
    }

    card.innerHTML = `
      <div class="thumb">
        ${
          imgSrc
            ? `<img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(
                p.nome || "Produto"
              )}" onerror="this.style.display='none'; this.parentElement.textContent='Sem imagem';">`
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

        ${
          p.italiano
            ? `<div class="it-name"><i>${escapeHtml(p.italiano)}</i></div>`
            : ""
        }

        ${priceBlocks.length ? `<div class="prices">${priceBlocks.join("")}</div>` : ""}
      </div>
    `;

    frag.appendChild(card);

    // Quebra de página a cada N cards (só afeta impressão por CSS @media print)
    if ((idx + 1) % PRINT_BREAK_EVERY === 0 && idx !== products.length - 1) {
      const br = document.createElement("div");
      br.className = "page-break";
      br.setAttribute("aria-hidden", "true");
      frag.appendChild(br);
    }
  });

  grid.appendChild(frag);
}

function applyFilters() {
  const q = (searchEl?.value || "").toLowerCase().trim();
  const cat = (categoryEl?.value || "").trim();

  const filtered = allProducts.filter((p) => {
    const inCat = !cat || (p.categoria || "").trim() === cat;

    const hay = `${p.nome ?? ""} ${p.descricao ?? ""} ${p.italiano ?? ""} ${p.codigo ?? ""} ${p.categoria ?? ""}`
      .toLowerCase();

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

    // Leitura robusta (UTF-8 com fallback)
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

    // remove linhas vazias (sem nome e sem imagem)
    allProducts = allProducts.filter((p) => (p.nome || p.imagem || p.codigo));

    buildCategoryOptions(allProducts);

    if (statusEl) statusEl.textContent = `${allProducts.length} produto(s)`;
    ensurePrintStyles();
    render(allProducts);
  } catch (err) {
    if (statusEl) {
      statusEl.textContent =
        "Erro ao carregar catálogo. Verifique o arquivo products.csv.";
    }
    console.error(err);
  }
}

// ======= PRINT (somente catálogo) =======
// Mantém o cabeçalho (print-header) e aplica quebra de página por card.
function printCatalogOnly() {
  const catalogo = document.getElementById("catalogo");
  if (!catalogo) return window.print();

  // Remove os filtros/busca do que vai imprimir
  catalogo.querySelectorAll(".no-print").forEach((el) => el.remove());

  // Dispara impressão
  window.print();

  // Recarrega para restaurar filtros/botões (evita gambiarras no DOM)
  setTimeout(() => location.reload(), 200);
}

// ======= POPUP PROMO (opcional) =======
// Se você não quiser popup, pode apagar esse bloco todo.
(function promoFeijoadaAlways() {
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
    if (e.key === "Escape" && overlay.classList.contains("is-open")) {
      closePromo();
    }
  });
})();

// ======= EVENTOS =======
if (searchEl) searchEl.addEventListener("input", applyFilters);
if (categoryEl) categoryEl.addEventListener("change", applyFilters);

if (btnPrint) btnPrint.addEventListener("click", printCatalogOnly);

if (whatsLink) {
  whatsLink.addEventListener("click", (e) => {
    e.preventDefault();
    const url = `https://wa.me/${WHATSAPP_NUMBER}`;
    window.open(url, "_blank");
  });
}

// ======= START =======
load();