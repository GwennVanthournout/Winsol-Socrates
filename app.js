const API_URL = "https://winsol-socrates.gwenn-vanthournout.workers.dev/ask";

const lang = document.getElementById("lang");
const mode = document.getElementById("mode");
const q = document.getElementById("q");
const btn = document.getElementById("btn");
const out = document.getElementById("out");
const statusEl = document.getElementById("status");
const sourcesEl = document.getElementById("sources");
const srcWrap = document.getElementById("srcWrap");

/* ---------- Helpers ---------- */

// Verwijder trailing "Bronnen:" / "Sources:"-blok uit een sectie en parse bestandsnamen
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
        files.push({ file_id: name }); // we hebben geen display-naam, toon bestandsnaam
      }
    }
  }

  return { clean, inlineSources: files };
}

// Nette weergave van bronnen uit een array met {file_id, page?, quote?}
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
    let text = s.file_id ? String(s.file_id) : (s.filename || "source");
    if (s.page !== null && s.page !== undefined) text += ` (p.${s.page})`;
    if (s.quote) text += ` – “${s.quote}”`;
    li.textContent = text;
    sourcesEl.appendChild(li);
  }
  // bronnenpaneel open bij nieuwe resultaten
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

    // ----- Strip inline bronnen uit secties en verzamel namen -----
    const inline = [];
    let comm = data.commercial || "";
    let tech = data.technical  || "";

    const s1 = stripInlineSourcesBlock(comm);
    comm = s1.clean; inline.push(...s1.inlineSources);

    const s2 = stripInlineSourcesBlock(tech);
    tech = s2.clean; inline.push(...s2.inlineSources);

    // ----- Render antwoord -----
    if ((comm && comm.length) || (tech && tech.length)) {
      const commercial = (comm && comm.trim()) ? comm : "—";
      const technical  = (tech && tech.trim())  ? tech : "—";

      out.innerHTML = `
        <div class="twoCol">
          <section><h3>Commercial</h3><div>${commercial}</div></section>
          <section><h3>Technical</h3><div>${technical}</div></section>
        </div>
      `;
    } else {
      // fallback: enkel platte 'answer'
      out.textContent = data.answer || "(No answer found based on the documents)";
    }

    // ----- Bronnen onderaan tonen: merge API-citaties + inline bestandsnamen -----
    const merged = [];
    const seen = new Set();
    const add = (arr) => {
      if (!Array.isArray(arr)) return;
      for (const s of arr) {
        const id = s.file_id || s.filename || "";
        const key = id + ":" + (s.page ?? "");
        if (id && !seen.has(key)) {
          seen.add(key);
          merged.push(s);
        }
      }
    };
    add(data.sources);
    add(inline);

    renderSources(merged);

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
