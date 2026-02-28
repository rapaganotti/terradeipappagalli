// ======= CONFIG =======
const CSV_FILE = "products.csv";
const IMAGE_FOLDER = "imagem/";

// Troque pelo WhatsApp do seu tio (formato internacional, sem +, sem espaços)
const WHATSAPP_NUMBER = "393932245332";

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

function parseCSV(text) {
  // CSV simples com separador ; ou ,
  const lines = text.trim().split(/\r?\n/);
  const sep = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(sep).map((h) => h.trim());

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Split simples (assumindo que não há ; dentro do texto)
    const cols = line.split(sep).map((c) => c.trim());
    const obj = {};
    headers.forEach((h, idx) => (obj[h] = cols[idx] ?? ""));
    rows.push(obj);
  }
  return rows;
}

function money(val) {
  const n = Number(String(val).replace(",", "."));
  if (!isFinite(n)) return escapeHtml(val);
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

function buildCategoryOptions(products) {
  if (!categoryEl) return;
  categoryEl.innerHTML = `<option value="">Todas as categorias</option>`;

  const cats = Array.from(
    new Set(products.map((p) => (p.categoria || "").trim()).filter(Boolean))
  ).sort();

  for (const c of cats) {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    categoryEl.appendChild(opt);
  }
}

function render(products) {
  if (!grid) return;

  grid.innerHTML = "";
  if (!products.length) {
    grid.innerHTML = `<div class="status">Nenhum produto encontrado.</div>`;
    return;
  }

  const frag = document.createDocumentFragment();

  for (const p of products) {
    const imgFile = (p.imagem || "").trim();
    const imgSrc = imgFile ? IMAGE_FOLDER + imgFile : "";

    const card = document.createElement("article");
    card.className = "card";

    card.innerHTML = `
      <div class="thumb">
        ${
          imgSrc
            ? `<img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(
                p.nome
              )}" onerror="this.style.display='none'; this.parentElement.textContent='Sem imagem';">`
            : `<span class="k">Sem imagem</span>`
        }
      </div>

      <div class="body">
        <div class="badges">
          ${p.codigo ? `<span class="badge">Cód: ${escapeHtml(p.codigo)}</span>` : ""}
          ${p.categoria ? `<span class="badge cat">${escapeHtml(p.categoria)}</span>` : ""}
        </div>

        <h3 class="title">${escapeHtml(p.nome || p.descricao || "Produto")}</h3>

        ${p.descricao ? `<p class="desc">${escapeHtml(p.descricao)}</p>` : ""}

        ${
          p.italiano
            ? `<p class="it-name"><i>${escapeHtml(p.italiano)}</i></p>`
            : ""
        }

        <div class="prices">
          ${
            p.qtd_caixa
              ? `<div><div class="k">Qtd/caixa</div><div class="v">${escapeHtml(
                  p.qtd_caixa
                )}</div></div>`
              : ""
          }
          ${
            p.valor_un
              ? `<div><div class="k">Valor unidade</div><div class="v">${money(
                  p.valor_un
                )}</div></div>`
              : ""
          }
          ${
            p.valor_total
              ? `<div><div class="k">Valor total</div><div class="v">${money(
                  p.valor_total
                )}</div></div>`
              : ""
          }
        </div>
      </div>
    `;

    frag.appendChild(card);
  }

  grid.appendChild(frag);
}

function applyFilters() {
  const q = (searchEl?.value || "").toLowerCase().trim();
  const cat = (categoryEl?.value || "").trim();

  const filtered = allProducts.filter((p) => {
    const inCat = !cat || (p.categoria || "").trim() === cat;

    const hay = `${p.nome ?? ""} ${p.descricao ?? ""} ${p.italiano ?? ""} ${p.codigo ?? ""}`.toLowerCase();
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
      imagem: r.imagem || r["imagem ilustrativa"] || r["Imagem"] || "",
      codigo: r.codigo || r["código"] || r["Codigo"] || "",
      categoria: r.categoria || r["tipo"] || r["Tipo"] || "",
      nome: r.nome || r["produto"] || r["Produto"] || "",
      descricao: r.descricao || r["descrição"] || r["Descrição"] || "",
      // ✅ NOVO: Italiano (pela sua planilha, a coluna chama "Italiano")
      italiano: r.Italiano || r.italiano || r["Nome Italiano"] || r["nome_italiano"] || "",
      qtd_caixa: r.qtd_caixa || r["quantidade por caixa"] || r["Quantidade por caixa"] || "",
      valor_un: r.valor_un || r["valor por unidade"] || r["Valor por unidade"] || "",
      valor_total: r.valor_total || r["valor total"] || r["Valor total"] || "",
    }));

    buildCategoryOptions(allProducts);

    if (statusEl) statusEl.textContent = `${allProducts.length} produto(s)`;
    render(allProducts);
  } catch (err) {
    if (statusEl)
      statusEl.textContent =
        "Erro ao carregar catálogo. Verifique o arquivo products.csv.";
    console.error(err);
  }
}

// ======= PRINT (somente catálogo) =======
function printCatalogOnly() {
  const catalogo = document.getElementById("catalogo");
  if (!catalogo) return window.print();

  const original = document.body.innerHTML;

  document.body.innerHTML = `
    <div style="padding:16px">
      ${catalogo.outerHTML}
    </div>
  `;

  document.querySelectorAll(".no-print").forEach((el) => el.remove());

  window.print();

  document.body.innerHTML = original;
  location.reload();
}

// ======= POPUP PROMO FEIJOADA =======
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