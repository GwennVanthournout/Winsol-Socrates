const API_URL = "https://winsol-socrates.gwenn-vanthournout.workers.dev/ask"

const chat = document.getElementById("chat");
const input = document.getElementById("input");
const sendBtn = document.getElementById("sendBtn");
const resetBtn = document.getElementById("resetBtn");
const statusEl = document.getElementById("status");
const lang = document.getElementById("lang");

let pending = false; // voorkomt dubbel versturen

/* ===== Conversation state ===== */
function getThreadId() { return sessionStorage.getItem("threadId") || ""; }
function setThreadId(id) { if (id) sessionStorage.setItem("threadId", id); }
function clearThread() { sessionStorage.removeItem("threadId"); }

/* ===== Rendering ===== */
function sanitize(str = "") {
  return String(str).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[ch]);
}

function renderMessage(role, html, sources = []) {
  const wrap = document.createElement("div");
  wrap.className = `msg ${role}`;

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = html;

  if (Array.isArray(sources) && sources.length) {
    const s = document.createElement("div");
    s.className = "sources";
    s.textContent = "Bronnen: " + sources.map((x) => {
      let label = x.filename || x.file_id || "bron";
      if (x.page !== undefined && x.page !== null) label += ` (p.${x.page})`;
      return label;
    }).join(" · ");
    bubble.appendChild(s);
  }

  wrap.appendChild(bubble);
  chat.appendChild(wrap);
  chat.scrollTop = chat.scrollHeight;
}

function setBusy(on) {
  pending = on;
  sendBtn.disabled = on;
  resetBtn.disabled = on;
  input.disabled = on;
}

/* ===== Actions ===== */
async function send() {
  if (pending) return; // guard tegen dubbelklik
  const q = (input.value || "").trim();
  if (!q) return;

  setBusy(true);
  statusEl.textContent = "Bezig…";
  renderMessage("user", sanitize(q).replace(/\n/g, "<br>"));

  const body = {
    query: q,
    language: (lang && lang.value) || "auto",
    threadId: getThreadId(),
  };

  const t0 = performance.now();
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    if (data.threadId) setThreadId(data.threadId);

    const text = (data.answer || "—").trim();
    const html = sanitize(text).replace(/\n/g, "<br>");
    renderMessage("assistant", html, data.sources || []);

    statusEl.textContent = `Klaar (${((performance.now() - t0) / 1000).toFixed(1)} s)`;
  } catch (e) {
    renderMessage("assistant", sanitize(`Fout: ${e?.message || e}`));
    statusEl.textContent = "Mislukt";
  } finally {
    input.value = "";
    input.focus();
    setBusy(false);
  }
}

function resetConversation() {
  if (pending) return;
  clearThread();
  chat.innerHTML = "";
  renderMessage("assistant", "Nieuwe conversatie gestart. Stel je vraag maar!");
}

/* ===== Events ===== */
sendBtn.addEventListener("click", send);
resetBtn.addEventListener("click", resetConversation);
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    send();
  }
});

/* ===== Boot ===== */
renderMessage("assistant", "Hallo! Ik beantwoord technische vragen op basis van de gekoppelde documentatie. Wat wil je weten?");
