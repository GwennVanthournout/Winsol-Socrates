const API_URL = "https://winsol-socrates.gwenn-vanthournout.workers.dev/ask";

const lang = document.getElementById("lang");
const mode = document.getElementById("mode");
const q = document.getElementById("q");
const btn = document.getElementById("btn");
const out = document.getElementById("out");
const statusEl = document.getElementById("status");
const sourcesEl = document.getElementById("sources");
const srcWrap = document.getElementById("srcWrap");

btn.addEventListener("click", async () => {
  const query = q.value.trim();
  if (!query) {
    alert("Typ eerst een vraag.");
    return;
  }
  btn.disabled = true;
  statusEl.textContent = "Bezig met zoeken…";
  out.textContent = "";
  sourcesEl.innerHTML = "";
  srcWrap.open = false;

  const t0 = performance.now(); // ⏱️ starttijd

  try {
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, language: lang.value, topK: 5, mode: mode.value })
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`HTTP ${resp.status}: ${text}`);
    }

    const data = await resp.json();
    
    if (data.commercial || data.technical) {
        out.innerHTML = `
          <div class="twoCol">
            <section>
              <h3>Commercieel</h3>
              <div>${data.commercial ? data.commercial : "—"}</div>
            </section>
            <section>
              <h3>Technisch</h3>
              <div>${data.technical ? data.technical : "—"}</div>
            </section>
          </div>
        `;
      } else {
        out.textContent = data.answer || "(Geen antwoord gevonden op basis van de documenten)";
      }  
    
    if (Array.isArray(data.sources) && data.sources.length > 0) {
      data.sources.forEach(s => {
        const li = document.createElement("li");
        li.textContent = s.filename ? `${s.filename} (${s.file_id || ""})` : (s.file_id || "bron");
        sourcesEl.appendChild(li);
      });
      srcWrap.open = false;
    }

    const dt = (performance.now() - t0) / 1000;
    statusEl.textContent = `Klaar. (${dt.toFixed(1)} s)`;
  } catch (e) {
    console.error(e);
    const dt = (performance.now() - t0) / 1000;
    statusEl.textContent = `Er ging iets mis. Probeer later opnieuw. (${dt.toFixed(1)} s)`;
  } finally {
    btn.disabled = false;
  }
});
