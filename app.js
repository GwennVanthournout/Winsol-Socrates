const API_URL = "https://winsol-socrates.gwenn-vanthournout.workers.dev/ask";

const lang = document.getElementById("lang");
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

  try {
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, language: lang.value, topK: 5 })
    });

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    out.textContent = data.answer || "(Geen antwoord gevonden op basis van de documenten)";
    if (Array.isArray(data.sources) && data.sources.length > 0) {
      data.sources.forEach(s => {
        const li = document.createElement("li");
        li.textContent = s.filename ? `${s.filename} (${s.file_id || ""})` : (s.file_id || "bron");
        sourcesEl.appendChild(li);
      });
      srcWrap.open = false;
    }
    statusEl.textContent = "Klaar.";
  } catch (e) {
    console.error(e);
    statusEl.textContent = "Er ging iets mis. Probeer later opnieuw.";
  } finally {
    btn.disabled = false;
  }
});
