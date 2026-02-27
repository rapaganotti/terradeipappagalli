/* =========================================================
   Terra dei Pappagalli | script.js (COMPLETO)
   - Não mexe no <body>, não “reconstrói” a página
   - PDF: usa apenas window.print() (o CSS @media print manda)
   - CSV robusto (suporta ; ou , e campos com aspas)
   - Popup: abre ao carregar, fecha no fundo / botão / ESC,
            e devolve o scroll corretamente
========================================================= */

(() => {
  "use strict";

  // ======= CONFIG =======
  const CSV_FILE = "products.csv";
  const IMAGE_FOLDER = "imagem/";
  const WHATSAPP_NUMBER = "393932245332"; // sem +, sem espaços

  // ======= ELEMENTOS (se não existir, o script não quebra) =======
  const grid = document.getElementById("grid");
  const statusEl = document.getElementById("status");
  const searchEl = document.getElementById("search");
  const categoryEl = document.getElementById("category");
  const btnPrint = document.getElementById("btnPrint");
  const whatsLink = document.getElementById("whatsLink");

  const promoOverlay = document.getElementById("promoOverlay");
  const promoClose =
    document.getElementById("promoClose") ||
    promoOverlay?.querySelector?.("[data-close]") ||
    null;

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

  function normalizeText(str) {
    return String(str ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function money(val) {
    const n = Number(String(val ?? "").replace(",", "."));
    if (!isFinite(n)) return escapeHtml(val);
    return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
  }

  // CSV robusto: separador ; ou , + suporte a aspas
  function parseCSV(text) {
    const raw = String(text ?? "").replace(/^\uFEFF/, "").trim();
    if (!raw) return [];

    const lines = raw.split(/\r?\n/).filter((l) => l.trim() !== "");
    if (!lines.length) return [];

    const sep = lines[0].includes(";") ? ";" : ",";
    const headers = splitCSVLine(lines[0], sep).map((h) => h.trim());

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = splitCSVLine(lines[i], sep);
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = (cols[idx] ?? "").trim();
      });
      rows.push(obj);
    }
    return rows;
  }

  function splitCSVLine(line, sep) {
    const out = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];

      if (ch === '"') {
        // aspas duplas dentro de campo: ""
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
    return out;
  }

  function setStatus(count) {
    if (statusEl) statusEl.textContent = `${count} produto(s)`;
  }

  function buildCategoryOptions(products) {
    if (!categoryEl) return;

    const current = categoryEl.value || "";
    categoryEl.innerHTML = `<option value="">Todas as categorias</option>`;

    const cats = Array.from(
      new Set(
        products
          .map((p) => (p.categoria || "").trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, "pt-BR"));

    for (const c of cats) {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      categoryEl.appendChild(opt);
    }

    // tenta manter a seleção anterior
    if (current) categoryEl.value = current;
  }

  // ======= RENDER =======
  function render(products) {
    if (!grid) return;

    grid.innerHTML = "";

    if (!products.length) {
      const empty = document.createElement("div");
      empty.className = "status";
      empty.textContent = "Nenhum produto encontrado.";
      grid.appendChild(empty);
      return;
    }

    const frag = document.createDocumentFragment();

    for (const p of products) {
      const card = document.createElement("article");
      card.className = "card";

      // thumb
      const thumb = document.createElement("div");
      thumb.className = "thumb";

      const imgFile = String(p.imagem || "").trim();
      if (imgFile) {
        const img = document.createElement("img");
        img.src = IMAGE_FOLDER + imgFile;
        img.alt = p.nome ? String(p.nome) : "Produto";
        img.loading = "lazy";
        img.decoding = "async";
        img.onerror = () => {
          // fallback simples, sem quebrar o layout
          img.remove();
          const sp = document.createElement("span");
          sp.className = "k";
          sp.textContent = "Sem imagem";
          thumb.appendChild(sp);
        };
        thumb.appendChild(img);
      } else {
        const sp = document.createElement("span");
        sp.className = "k";
        sp.textContent = "Sem imagem";
        thumb.appendChild(sp);
      }

      // body
      const body = document.createElement("div");
      body.className = "body";

      // badges (código + categoria)
      const badges = document.createElement("div");
      badges.className = "badges";

      if (p.codigo) {
        const b = document.createElement("span");
        b.className = "badge";
        b.textContent = `Cód: ${p.codigo}`;
        badges.appendChild(b);
      }

      if (p.categoria) {
        const b = document.createElement("span");
        b.className = "badge cat";
        b.textContent = p.categoria; // quebra de linha é CSS (white-space normal)
        badges.appendChild(b);
      }

      // title
      const h3 = document.createElement("h3");
      h3.className = "title";
      h3.textContent = p.nome || p.descricao || "Produto";

      // desc (linha superior pequena)
      const desc = document.createElement("p");
      desc.className = "desc";
      desc.textContent = p.descricao || "";

      // it-name (se existir no CSV)
      let itNameEl = null;
      if (p.it_name) {
        itNameEl = document.createElement("p");
        itNameEl.className = "it-name";
        itNameEl.textContent = p.it_name;
      }

      // prices
      const prices = document.createElement("div");
      prices.className = "prices";

      function addPriceBlock(label, value, formatter = null) {
        if (!value) return;
        const wrap = document.createElement("div");
        const k = document.createElement("div");
        k.className = "k";
        k.textContent = label;
        const v = document.createElement("div");
        v.className = "v";
        v.textContent = formatter ? formatter(value) : String(value);
        wrap.appendChild(k);
        wrap.appendChild(v);
        prices.appendChild(wrap);
      }

      addPriceBlock("Qtd/caixa", p.qtd_caixa);
      addPriceBlock("Valor unidade", p.valor_un, money);

      // Se você usa “valor_total” no CSV, mantém. Se não usa, ignora.
      addPriceBlock("Valor total", p.valor_total, money);

      // monta body
      body.appendChild(badges);
      body.appendChild(h3);
      if (desc.textContent.trim()) body.appendChild(desc);
      if (itNameEl) body.appendChild(itNameEl);
      body.appendChild(prices);

      // monta card
      card.appendChild(thumb);
      card.appendChild(body);

      frag.appendChild(card);
    }

    grid.appendChild(frag);
  }

  // ======= FILTERS =======
  function applyFilters() {
    const q = normalizeText(searchEl?.value || "");
    const cat = String(categoryEl?.value || "").trim();

    const filtered = allProducts.filter((p) => {
      const inCat = !cat || String(p.categoria || "").trim() === cat;

      if (!q) return inCat;

      const hay = normalizeText(
        `${p.nome || ""} ${p.descricao || ""} ${p.codigo || ""} ${p.categoria || ""}`
      );

      return inCat && hay.includes(q);
    });

    setStatus(filtered.length);
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

      // Normaliza colunas (aceita variações de cabeçalho do CSV)
      allProducts = rows.map((r) => ({
        imagem:
          r.imagem ||
          r["imagem ilustrativa"] ||
          r["Imagem"] ||
          r["IMAGEM"] ||
          "",
        codigo: r.codigo || r["código"] || r["Codigo"] || r["CÓDIGO"] || "",
        categoria: r.categoria || r["tipo"] || r["Tipo"] || r["CATEGORIA"] || "",
        nome: r.nome || r["produto"] || r["Produto"] || r["NOME"] || "",
        descricao: r.descricao || r["descrição"] || r["Descrição"] || r["DESC"] || "",
        it_name:
          r.it_name ||
          r["italiano"] ||
          r["nome_it"] ||
          r["Nome IT"] ||
          r["IT"] ||
          "",
        qtd_caixa:
          r.qtd_caixa ||
          r["quantidade por caixa"] ||
          r["Quantidade por caixa"] ||
          r["QTD/CAIXA"] ||
          "",
        valor_un:
          r.valor_un ||
          r["valor por unidade"] ||
          r["Valor por unidade"] ||
          r["VALOR UN"] ||
          "",
        valor_total:
          r.valor_total || r["valor total"] || r["Valor total"] || r["TOTAL"] || "",
      }));

      buildCategoryOptions(allProducts);
      setStatus(allProducts.length);
      render(allProducts);
    } catch (err) {
      console.error(err);
      if (statusEl) {
        statusEl.textContent =
          "Erro ao carregar catálogo. Verifique o arquivo products.csv.";
      }
    }
  }

  // ======= PRINT =======
  function doPrint(e) {
    if (e) e.preventDefault();
    // IMPORTANTE: não mexe no DOM. O CSS @media print cuida do layout e do print-header.
    window.print();
  }

  // ======= WHATSAPP =======
  function openWhats(e) {
    if (e) e.preventDefault();
    const url = `https://wa.me/${WHATSAPP_NUMBER}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  // ======= POPUP PROMO =======
  function setupPromo() {
    if (!promoOverlay) return;

    function lockScroll() {
      document.documentElement.classList.add("no-scroll");
      document.body.classList.add("no-scroll");
    }
    function unlockScroll() {
      document.documentElement.classList.remove("no-scroll");
      document.body.classList.remove("no-scroll");
    }

    function openPromo() {
      promoOverlay.classList.add("is-open");
      promoOverlay.setAttribute("aria-hidden", "false");
      lockScroll();
    }

    function closePromo() {
      promoOverlay.classList.remove("is-open");
      promoOverlay.setAttribute("aria-hidden", "true");
      unlockScroll();
    }

    // abre ao carregar
    window.addEventListener("load", () => {
      setTimeout(openPromo, 150);
    });

    // fecha clicando SÓ no fundo (não no conteúdo)
    promoOverlay.addEventListener("click", (ev) => {
      if (ev.target === promoOverlay) closePromo();
    });

    // botão fechar (se existir)
    if (promoClose) {
      promoClose.addEventListener("click", (ev) => {
        ev.preventDefault();
        closePromo();
      });
    }

    // ESC
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && promoOverlay.classList.contains("is-open")) {
        closePromo();
      }
    });
  }

  // ======= EVENTOS =======
  if (searchEl) searchEl.addEventListener("input", applyFilters);
  if (categoryEl) categoryEl.addEventListener("change", applyFilters);
  if (btnPrint) btnPrint.addEventListener("click", doPrint);
  if (whatsLink) whatsLink.addEventListener("click", openWhats);

  // ======= START =======
  setupPromo();
  load();
})();