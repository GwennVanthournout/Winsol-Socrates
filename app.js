const API_URL = "https://winsol-socrates.gwenn-vanthournout.workers.dev/ask"; // ongewijzigd

// UI refs
const chat = document.getElementById("chat");
const input = document.getElementById("input");
const sendBtn = document.getElementById("sendBtn");
const resetBtn = document.getElementById("resetBtn");
const statusEl = document.getElementById("status");
const lang = document.getElementById("lang");
const mode = document.getElementById("mode");

/* ========= Conversation state ========= */
function getThreadId() {
  return sessionStorage.getItem("threadId") || "";
}
function setThreadId(id) {
  if (id) sessionStorage.setItem("threadId", id);
}
function clearThread() {
  sessionStorage.removeItem("threadId");
}

/* ========= Rendering ========= */
function sanitize(str = "") {
  return String(str).replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}

function renderMessage(role, html, sources = []) {
  const wrap = document.createElement("div");
  wrap.className = `msg ${role}`;

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = html;

  // bronnen (per bericht)
  if (Array.isArray(sources) && sources.length) {
    const src = document.createElement("div");
    src.className = "sources";
    src.textContent = "Bronnen: " + sources.map(s => {
      let label = s.filename || s.file_id || "source";
      if (s.page !== undefined && s.page !== null) label += ` (p.${s.page})`;
      return label;
    }).join(" · ");
    bubble.appendChild(src);
  }

  wrap.appendChild(bubble);
  chat.appendChild(wrap);
  chat.scrollTop = chat.scrollHeight;
}

function formatAssistantAnswer(data) {
  // Hergebruik jouw twoCol weergave (bestaat al in CSS)
  const comm = (data.commercial || "").trim();
  const tech = (data.technical || "").trim();

  if (comm || tech) {
    return `
      <div class="twoCol">
        <section><h3>Commercial</h3><div>${sanitize(comm || "—").replace(/\n/g, "<br>")}</div></section>
        <section><h3>Technical</h3><div>${sanitize(tech || "—").replace(/\n/g, "<br>")}</div></section>
      </div>
    `;
  }
  // fallback: platte tekst
  const plain = (data.answer || "(No answer found based on the documents)");
  return sanitize(plain).replace(/\n/g, "<br>");
}

/* ========= Send & Reset ========= */
async function send() {
  const query = (input.value || "").trim();
  if (!query) return;

  setBusy(true);
  statusEl.textContent = "Bezig…";

  // toon eerst je eigen bericht
  renderMessage("user", sanitize(query).replace(/\n/g, "<br>"));

  const body = {
    query,
    language: lang ? (lang.value || "auto") : "auto",
    mode: mode ? (mode.value || "auto") : "auto",
    threadId: getThreadId(), // behoud conversatie-context
  };

  const t0 = performance.now();
  try {
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`HTTP ${resp.status}: ${text}`);
    }
    const data = await resp.json();
    if (data.threadId) setThreadId(data.threadId);

    const html = formatAssistantAnswer(data);
    const sources = Array.isArray(data.sources) ? data.sources : [];
    renderMessage("assistant", html, sources);

    const dt = (performance.now() - t0) / 1000;
    statusEl.textContent = `Klaar (${dt.toFixed(1)} s)`;
  } catch (e) {
    renderMessage("assistant", sanitize(`Fout: ${e?.message || e}`));
    const dt = (performance.now() - t0) / 1000;
    statusEl.textContent = `Mislukt (${dt.toFixed(1)} s)`;
  } finally {
    input.value = "";
    input.focus();
    setBusy(false);
  }
}

function resetConversation() {
  clearThread();
  chat.innerHTML = "";
  renderMessage("assistant", "Nieuwe conversatie gestart. Stel je vraag maar!");
}

function setBusy(on) {
  sendBtn.disabled = on;
  resetBtn.disabled = on;
  input.disabled = on;
}

/* ========= Events ========= */
sendBtn.addEventListener("click", send);
resetBtn.addEventListener("click", resetConversation);
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    send();
  }
});

/* ========= Boot ========= */
renderMessage("assistant", "Hallo! Ik beantwoord vragen op basis van de gekoppelde documentatie. Wat wil je weten?");
