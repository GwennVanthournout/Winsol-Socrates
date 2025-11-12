// app.js — single-track (Technisch) UI
const API_URL = "https://winsol-socrates.gwenn-vanthournout.workers.dev/ask";

const lang = document.getElementById("lang");
const q = document.getElementById("q");
const btn = document.getElementById("btn");
const out = document.getElementById("out");
const statusEl = document.getElementById("status");
const sourcesEl = document.getElementById("sources");
const srcWrap = document.getElementById("srcWrap");

/* ---------- Helpers ---------- */

// Nette weergave van bronnen uit een array met {file_id, page?, quote?}
function renderSources(list) {
  if (!srcWrap || !sourcesEl) return;

  // reset
  sourcesEl.innerHTML = "";

  if (!Array.isArray(list) || list.length === 0) {
    srcWrap.open = false;   // geen bronnen → paneel dicht
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
  renderSources([]); // bronnen leegmaken

  const t0 = performance.now();

  try {
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        language: lang ? lang.value : "auto"
        // geen 'mode' meer; single-track technisch
        // threadId optioneel: kan worden toegevoegd als je sessies wil bewaren
      })
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`HTTP ${resp.status}: ${text}`);
    }

    const data = await resp.json();

    // ----- Render enkel het technische antwoord -----
    const answer = (data.answer || "").trim();
    out.textContent = answer || "(No answer found based on the documents)";

    // ----- Bronnen onderaan tonen -----
    const merged = [];
    const seen = new Set();
    const add = (arr) => {
      if (!Array.isArray(arr)) return;
      for (const s of arr) {
        const id = s.file_id || s.filename || "";
        const key = id + ":" + (s.page ?? "");
        if (id && !seen.has(key)) { seen.add(key); merged.push(s); }
      }
    };
    add(data.sources);
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
