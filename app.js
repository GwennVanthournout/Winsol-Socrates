// app.js
// Zet dit naar je Worker endpoint:
const API_URL = "https://winsol-socrates.gwenn-vanthournout.workers.dev/ask";

const chat = document.getElementById("chat");
const input = document.getElementById("input");
const sendBtn = document.getElementById("sendBtn");
const resetBtn = document.getElementById("resetBtn");
const statusEl = document.getElementById("status");
const langSelect = document.getElementById("lang");
const langLabel = document.getElementById("langLabel");

let pending = false;

/* ========= Translations ========= */
const translations = {
  nl: { language: "Taal", reset: "Reset", send: "Verstuur",
    placeholder: "Typ je vraag… (Shift+Enter = nieuwe regel)",
    greeting: "Hallo! Ik beantwoord technische vragen op basis van de gekoppelde documentatie. Wat wil je weten?",
    ready: "Klaar", failed: "Mislukt" },
  fr: { language: "Langue", reset: "Réinitialiser", send: "Envoyer",
    placeholder: "Tapez votre question… (Maj+Entrée = nouvelle ligne)",
    greeting: "Bonjour ! Je réponds aux questions techniques basées sur la documentation liée. Que souhaitez-vous savoir ?",
    ready: "Terminé", failed: "Échec" },
  en: { language: "Language", reset: "Reset", send: "Send",
    placeholder: "Type your question... (Shift+Enter = new line)",
    greeting: "Hello! I answer technical questions based on the linked documentation. What would you like to know?",
    ready: "Ready", failed: "Failed" },
  de: { language: "Sprache", reset: "Zurücksetzen", send: "Senden",
    placeholder: "Gib deine Frage ein… (Umschalt+Enter = neue Zeile)",
    greeting: "Hallo! Ich beantworte technische Fragen auf Grundlage der verknüpften Dokumentation. Was möchtest du wissen?",
    ready: "Fertig", failed: "Fehlgeschlagen" },
  es: { language: "Idioma", reset: "Restablecer", send: "Enviar",
    placeholder: "Escribe tu pregunta… (Mayús+Enter = nueva línea)",
    greeting: "¡Hola! Respondo a preguntas técnicas basándome en la documentación vinculada. ¿Qué te gustaría saber?",
    ready: "Hecho", failed: "Error" },
  it: { language: "Lingua", reset: "Reimposta", send: "Invia",
    placeholder: "Scrivi la tua domanda… (Shift+Invio = nuova riga)",
    greeting: "Ciao! Rispondo a domande tecniche basate sulla documentazione collegata. Cosa vorresti sapere?",
    ready: "Pronto", failed: "Non riuscito" },
  cs: { language: "Jazyk", reset: "Resetovat", send: "Odeslat",
    placeholder: "Zadejte svou otázku… (Shift+Enter = nový řádek)",
    greeting: "Dobrý den! Odpovídám na technické otázky na základě připojené dokumentace. Co byste chtěli vědět?",
    ready: "Hotovo", failed: "Selhalo" },
  sv: { language: "Språk", reset: "Återställ", send: "Skicka",
    placeholder: "Skriv din fråga… (Skift+Enter = ny rad)",
    greeting: "Hej! Jag svarar på tekniska frågor baserat på den länkade dokumentationen. Vad vill du veta?",
    ready: "Klar", failed: "Misslyckades" },
  hr: { language: "Jezik", reset: "Poništi", send: "Pošalji",
    placeholder: "Upišite svoje pitanje… (Shift+Enter = novi red)",
    greeting: "Pozdrav! Odgovaram na tehnička pitanja temeljena na povezanoj dokumentaciji. Što želite znati?",
    ready: "Gotovo", failed: "Neuspjelo" },
  hu: { language: "Nyelv", reset: "Visszaállítás", send: "Küldés",
    placeholder: "Írd be a kérdésed… (Shift+Enter = új sor)",
    greeting: "Helló! A kapcsolt dokumentáció alapján válaszolok műszaki kérdésekre. Mit szeretnél tudni?",
    ready: "Kész", failed: "Sikertelen" },
};

/* ========= Language logic ========= */
function detectBrowserLang() {
  const list = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || "nl"];
  for (const l of list) {
    const code = (l || "").slice(0, 2).toLowerCase();
    if (translations[code]) return code;
  }
  return "nl";
}
function currentLangCode() {
  const v = (langSelect && langSelect.value) || "auto";
  if (v === "auto") return detectBrowserLang();
  return v;
}
function t() {
  const code = currentLangCode();
  return translations[code] || translations.nl;
}
function applyUIStrings() {
  const tt = t();
  if (langLabel) langLabel.textContent = tt.language;
  if (resetBtn) resetBtn.textContent = tt.reset;
  if (sendBtn) sendBtn.textContent = tt.send;
  if (input) input.placeholder = tt.placeholder;
}

/* ========= Conversation state ========= */
function getThreadId() { return sessionStorage.getItem("threadId") || ""; }
function setThreadId(id) { if (id) sessionStorage.setItem("threadId", id); }
function clearThread() { sessionStorage.removeItem("threadId"); }

/* ========= Rendering ========= */
function sanitize(str = "") {
  return String(str).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[ch]);
}
function renderMessage(role, html) {
  const wrap = document.createElement("div");
  wrap.className = `msg ${role}`;

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = html;

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

function showTypingIndicator() {
  removeTypingIndicator();
  const wrap = document.createElement("div");
  wrap.className = "msg assistant typing-indicator-wrapper";
  const bubble = document.createElement("div");
  bubble.className = "typing-indicator";
  bubble.innerHTML = "<span></span><span></span><span></span>";
  wrap.appendChild(bubble);
  chat.appendChild(wrap);
  chat.scrollTop = chat.scrollHeight;
}
function removeTypingIndicator() {
  document.querySelectorAll(".typing-indicator-wrapper").forEach(el => el.remove());
}

/* ========= Actions ========= */
async function send() {
  if (pending) return;
  const q = (input.value || "").trim();
  if (!q) return;

  // 1️⃣ Lees expliciet de geselecteerde taal uit de dropdown
  const langEl = document.getElementById("language") || document.getElementById("lang");
  const uiLang = langEl?.value || "auto";
  const uiLangLabel = langEl?.selectedOptions?.[0]?.text || uiLang;

  const tt = t();
  setBusy(true);
  statusEl.textContent = "...";
  renderMessage("user", sanitize(q).replace(/\n/g, "<br>"));
  input.value = "";

  // 2️⃣ Stuur gekozen taal mee
  const body = {
    query: q,
    language: uiLang,          // bv. "it", "es-ES", "Italiano"
    languageLabel: uiLangLabel // bv. "Italiano", "Español"
    threadId: getThreadId(),
  };

  const t0 = performance.now();
  try {
    showTypingIndicator();
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    removeTypingIndicator();

    if (data.threadId) setThreadId(data.threadId);

    const text = (data.answer || "—").trim();
    const html = sanitize(text).replace(/\n/g, "<br>");
    renderMessage("assistant", html);

    statusEl.textContent = `${tt.ready} (${((performance.now() - t0) / 1000).toFixed(1)} s)`;
  } catch (e) {
    removeTypingIndicator();
    renderMessage("assistant", sanitize(`Fout: ${e?.message || e}`));
    statusEl.textContent = t().failed;
  } finally {
    input.focus();
    setBusy(false);
  }
}


function resetConversation() {
  if (pending) return;
  clearThread();
  chat.innerHTML = "";
  renderMessage("assistant", sanitize(t().greeting));
}

/* ========= Events ========= */
sendBtn.addEventListener("click", send);
resetBtn.addEventListener("click", resetConversation);
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
});
langSelect.addEventListener("change", () => {
  applyUIStrings();
  if (!chat.querySelector(".msg.user")) {
    chat.innerHTML = "";
    renderMessage("assistant", sanitize(t().greeting));
  }
});

/* ========= Boot ========= */
applyUIStrings();
renderMessage("assistant", sanitize(t().greeting));
