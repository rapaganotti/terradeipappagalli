// Terra dei Pappagalli | Prodotti Brasiliani
// Script principal: carrega CSV, renderiza cards, filtro e impressão.

(function () {
  "use strict";

  // ====== ELEMENTOS (IDs do HTML atual) ======
  const el = {
    header: document.querySelector(".header"),
    btnPrint: document.getElementById("btnPrint"),
    search: document.getElementById("search"),
    category: document.getElementById("category"),
    grid: document.getElementById("grid"),
    status: document.getElementById("status"),
    promoOverlay: document.getElementById("promoOverlay"),
    promoImg: document.getElementById("promoImg"),
    promoClose: document.getElementById("promoClose"),
  };

  // Se faltar algo essencial, não quebra a página
  if (!el.grid || !el.category || !el.search) {
    console.warn("Elementos de produtos não encontrados (search/category/grid).");
    return;
  }

  // ====== CONFIG ======
  // Ajuste aqui se você trocar o caminho/nome do CSV no repositório
  const PRODUCTS_CSV_URL = "products.csv";
  const PROMO_IMAGE_URL = "imagem/promo_feijoada.png"; // se não existir, o popup some

  // ====== STATE ======
  let allProducts = [];
  let visibleProducts = [];

  // ====== UTILS ======
  function setHeaderOffset() {
    if (!el.header) return;
    // Atualiza a variável CSS --header-h para empurrar o conteúdo
    const h = Math.ceil(el.header.getBoundingClientRect().height);
    document.documentElement.style.setProperty("--header-h", `${h}px`);
  }

  function normalize(str) {
    return String(str || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function parseCSV(text) {
    // Parser simples (suporta aspas e vírgulas dentro de aspas)
    const rows = [];
    let row = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const next = text[i + 1];

      if (ch === '"' && inQuotes && next === '"') {
        cur += '"';
        i++;
        continue;
      }
      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (ch === "," && !inQuotes) {
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

    if (rows.length === 0) return [];
    const headers = rows[0].map(h => normalize(h).trim());
    const data = [];

    for (let r = 1; r < rows.length; r++) {
      const obj = {};
      rows[r].forEach((val, c) => {
        obj[headers[c] || `col_${c}`] = String(val || "").trim();
      });
      // Ignora linhas vazias
      if (Object.values(obj).some(v => v !== "")) data.push(obj);
    }
    return data;
  }

  function pick(obj, keys, fallback = "") {
    for (const k of keys) {
      if (obj[k] != null && String(obj[k]).trim() !== "") return String(obj[k]).trim();
    }
    return fallback;
  }

  function moneyEUR(v) {
    const n = Number(String(v).replace(",", "."));
    if (!Number.isFinite(n)) return "";
    return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
  }

  // ====== RENDER ======
  function renderCategories(products) {
    const current = el.category.value || "";
    const cats = Array.from(
      new Set(products.map(p => p.categoria).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, "pt-BR"));

    el.category.innerHTML = "";
    const optAll = document.createElement("option");
    optAll.value = "";
    optAll.textContent = "Todas as categorias";
    el.category.appendChild(optAll);

    for (const c of cats) {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      el.category.appendChild(opt);
    }

    // tenta manter seleção anterior
    if ([...el.category.options].some(o => o.value === current)) {
      el.category.value = current;
    }
  }

  function cardHTML(p) {
    const img = p.imagem || "";
    const codigo = p.codigo || "";
    const categoria = p.categoria || "";
    const nome = p.nome || "";
    const marca = p.marca || "";
    const it = p.it || "";
    const qtd = p.qtd || "";
    const preco = p.preco || "";

    const priceStr = moneyEUR(preco);
    const qtdStr = qtd ? String(qtd) : "";

    // img pode vir sem pasta: se estiver vazio, não renderiza tag
    const imgTag = img
      ? `<img src="${img}" alt="${nome}" loading="lazy" onerror="this.style.display='none'">`
      : "";

    return `
      <article class="card">
        <div class="card-img">${imgTag}</div>
        <div class="card-body">
          <div class="badges">
            ${codigo ? `<span class="badge">Cód: ${codigo}</span>` : ""}
            ${categoria ? `<span class="badge-cat">${categoria}</span>` : ""}
          </div>

          <div class="prod-name">${nome}</div>
          ${marca ? `<div class="prod-brand">${marca}</div>` : ""}
          ${it ? `<div class="prod-it">${it}</div>` : ""}

          <div class="meta">
            <div><div class="muted">Qtd/caixa</div><b>${qtdStr}</b></div>
            <div style="text-align:right"><div class="muted">Valor unidade</div><b>${priceStr}</b></div>
          </div>
        </div>
      </article>
    `;
  }

  function renderGrid(products) {
    el.grid.innerHTML = products.map(cardHTML).join("");
    if (el.status) el.status.textContent = `${products.length} produto(s)`;
  }

  // ====== FILTER ======
  function applyFilters() {
    const q = normalize(el.search.value);
    const cat = el.category.value;

    visibleProducts = allProducts.filter(p => {
      const okCat = !cat || p.categoria === cat;
      if (!okCat) return false;
      if (!q) return true;

      const hay = normalize(
        [p.nome, p.marca, p.it, p.categoria, p.codigo].filter(Boolean).join(" ")
      );
      return hay.includes(q);
    });

    renderGrid(visibleProducts);
  }

  // ====== LOAD ======
  async function loadProducts() {
    try {
      // cache bust para evitar "ficar piscando" em deploy
      const url = `${PRODUCTS_CSV_URL}?v=${Date.now()}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`Falha ao carregar CSV (${res.status})`);
      const text = await res.text();
      const rows = parseCSV(text);

      // Mapeia colunas com nomes diferentes
      allProducts = rows.map(r => {
        const categoria = pick(r, ["categoria", "category", "categoria_do_produto"]);
        const imagem = pick(r, ["imagem", "image", "img", "foto"]);
        const codigo = pick(r, ["codigo", "cod", "código", "sku"]);
        const nome = pick(r, ["nome", "produto", "name"]);
        const marca = pick(r, ["marca", "brand"]);
        const it = pick(r, ["it", "italiano", "descrizione", "descricao_it"]);
        const qtd = pick(r, ["qtdcaixa", "qtd", "quantidade", "qtd/caixa"]);
        const preco = pick(r, ["valorunidade", "preco", "preço", "valor", "valor unidade"]);

        return {
          categoria,
          imagem,
          codigo,
          nome,
          marca,
          it,
          qtd,
          preco,
        };
      });

      renderCategories(allProducts);
      visibleProducts = [...allProducts];
      renderGrid(visibleProducts);
      applyFilters(); // garante status correto
    } catch (err) {
      console.error(err);
      if (el.status) el.status.textContent = "Erro ao carregar produtos.";
    }
  }

  // ====== PROMO POPUP ======
  function initPromo() {
    if (!el.promoOverlay || !el.promoImg || !el.promoClose) return;

    el.promoImg.src = PROMO_IMAGE_URL;

    // Se a imagem não existir, o popup não aparece e não deixa "erro" no final
    el.promoImg.onerror = () => {
      el.promoOverlay.remove();
    };

    el.promoClose.addEventListener("click", () => {
      el.promoOverlay.classList.remove("open");
      try { sessionStorage.setItem("promoClosed", "1"); } catch (_) {}
    });

    el.promoOverlay.addEventListener("click", (e) => {
      if (e.target === el.promoOverlay) el.promoClose.click();
    });

    // Aparece 1x por sessão
    let closed = false;
    try { closed = sessionStorage.getItem("promoClosed") === "1"; } catch (_) {}
    if (!closed) el.promoOverlay.classList.add("open");
  }

  // ====== PRINT / PDF ======
  function initPrint() {
    if (!el.btnPrint) return;
    el.btnPrint.addEventListener("click", () => {
      // Só chama o print: a CSS @media print controla o que aparece
      window.print();
    });
  }

  // ====== EVENTS ======
  el.search.addEventListener("input", applyFilters);
  el.category.addEventListener("change", applyFilters);
  window.addEventListener("resize", setHeaderOffset);

  // ====== START ======
  setHeaderOffset();
  initPromo();
  initPrint();
  loadProducts();
})();