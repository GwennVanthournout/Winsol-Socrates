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
    alert("First type a question.");
    return;
  }
  btn.disabled = true;
  statusEl.textContent = "Searching...";
  out.textContent = "";
  sourcesEl.innerHTML = "";
  srcWrap.open = false;

  const t0 = performance.now(); // ⏱️ starttijd

  try {
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        language: lang.value,
        topK: 5,
        mode: document.getElementById("mode").value   // <-- belangrijk
      })
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
              <h3>Commercial</h3>
              <div>${data.commercial ? data.commercial : "—"}</div>
            </section>
            <section>
              <h3>Technical</h3>
              <div>${data.technical ? data.technical : "—"}</div>
            </section>
          </div>
        `;
      } else {
        out.textContent = data.answer || "(No answer found based on the documents)";
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
    statusEl.textContent = `Done. (${dt.toFixed(1)} s)`;
  } catch (e) {
    console.error(e);
    const dt = (performance.now() - t0) / 1000;
    statusEl.textContent = `Something went wrong. Please try again later. (${dt.toFixed(1)} s)`;
  } finally {
    btn.disabled = false;
  }
});
