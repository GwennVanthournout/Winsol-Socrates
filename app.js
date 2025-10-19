const API_URL = "https://winsol-socrates.gwenn-vanthournout.workers.dev/ask";

const lang = document.getElementById("lang");
const mode = document.getElementById("mode");
const q = document.getElementById("q");
const btn = document.getElementById("btn");
const out = document.getElementById("out");
const statusEl = document.getElementById("status");
const sourcesEl = document.getElementById("sources");   // <ul id="sources">
const srcWrap = document.getElementById("srcWrap");     // <details id="srcWrap"><summary>Bronnen</summary>...</details>

/* ---------- Helpers ---------- */

// Nette weergave van bronnen uit data.sources (array met {file_id, page?, quote?})
function renderSources(list) {
  if (!srcWrap || !sourcesEl) return;

  // reset
  sourcesEl.innerHTML = "";

  if (!Array.isArray(list) || list.length === 0) {
    // geen bronnen → paneel leeg en dicht
    srcWrap.open = false;
    return;
  }

  // vul lijst
  for (const s of list) {
    const li = document.createElement("li");
    // Basis: file_id
    let text = s.file_id ? String(s.file_id) : "source";
    // Optioneel: pagina
    if (s.page !== null && s.page !== undefined) {
      text += ` (p.${s.page})`;
    }
    // Optioneel: korte quote
    if (s.quote) {
      text += ` – “${s.quote}”`;
    }
    li.textContent = text;
    sourcesEl.appendChild(li);
  }
  // bronnenpaneel standaard openzetten bij nieuwe resultaten
  srcWrap.open = true;
}

// Verwijder trailing "Bronnen:" of "Sources:" blok uit een sectie
function stripInlineSourcesBlock(text) {
  if (!text) return { clean: "", inlineSources: [] };

  // 1) Knip een trailing blok dat begint met "Bronnen:" of "Sources:"
  const cutRe = /(^|\n)(bron(?:nen)?|sources?)\s*:\s*[\s\S]*$/i;
  const m = text.match(cutRe);
  let clean = text;
  let block = "";
  if (m) {
    block = text.slice(m.index).trim();
    clean = text.slice(0, m.index).trim();
  }

  // 2) Parse bestandsnamen uit het blok (pdf/txt/docx)
  const files = [];
  if (block) {
    const fileRe = /[A-Za-z0-9_().!\- ]+\.(pdf|txt|docx)/gi;
    const seen = new Set();
    let mk;
    while ((mk = fileRe.exec(block)) !== null) {
      const name = mk[0].trim();
      if (!seen.has(name)) {
        seen.add(name);
        files.push({ file_id: name }); // we hebben geen file_id, dus toon naam
      }
    }
  }

  return { clean, inlineSources: files };
}

// Nette weergave van bronnen in je <details id="srcWrap"><ul id="sources">
function renderSources(list) {
  if (!srcWrap || !sourcesEl) return;
  sourcesEl.innerHTML = "";

  if (!Array.isArray(list) || list.length === 0) {
    srcWrap.open = false;
    return;
  }

  for (const s of list) {
    const li = document.createElement("li");
    let text = s.filename || s.file_id || "source";
    if (s.page !== null && s.page !== undefined) text += ` (p.${s.page})`;
    if (s.quote) text += ` – “${s.quote}”`;
    li.textContent = text;
    sourcesEl.appendChild(li);
  }
  srcWrap.open = true;
}


/* ---------- UI Events ---------- */

btn.addEventListener("click", async () => {
  const query = q.value.trim();
  if (!query) {
    alert("First type a question.");
    return;
  }

  // Reset UI
  btn.disabled = true;
  statusEl.textContent = "Searching...";
  out.textContent = "";
  renderSources([]); // bronnen meteen leegmaken

  const t0 = performance.now();

  try {
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        language: lang ? lang.value : "auto",
        topK: 5,
        mode: mode ? mode.value : "auto"
      })
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`HTTP ${resp.status}: ${text}`);
    }

    const data = await resp.json();

    // Twee kolommen wanneer secties aanwezig zijn
    if ((data.commercial && data.commercial.length) || (data.technical && data.technical.length)) {
      const commercial = (data.commercial && data.commercial.trim()) ? data.commercial : "—";
      const technical  = (data.technical  && data.technical.trim())  ? data.technical  : "—";

      out.innerHTML = `
        <div class="twoCol">
          <section>
            <h3>Commercial</h3>
            <div>${commercial}</div>
          </section>
          <section>
            <h3>Technical</h3>
            <div>${technical}</div>
          </section>
        </div>
      `;
    } else {
      // fallback: enkel platte 'answer'
      out.textContent = data.answer || "(No answer found based on the documents)";
    }

    // Bronnen tonen (indien aanwezig)
    renderSources(data.sources);

    const dt = (performance.now() - t0) / 1000;
    statusEl.textContent = `Done. (${dt.toFixed(1)} s)`;
  } catch (e) {
    console.error(e);
    const dt = (performance.now() - t0) / 1000;
    statusEl.textContent = `Something went wrong. Please try again later. (${dt.toFixed(1)} s)`;
  } finally {
    btn.disabled = false;
  }
});
