/* OYONID MAP V14.0.17 — Mas OYON chat UI */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const launcher = $("masOyonLauncher"), panel = $("masOyonPanel"), messages = $("masOyonMessages");
  const input = $("masOyonInput"), status = $("masOyonStatus"), sendBtn = $("masOyonSend"), micBtn = $("masOyonMic");
  if (!launcher || !panel || !messages || !input) return;

  const history = [];
  let recognition = null;
  let busy = false;
  let lastUtterance = null;

  function setStatus(text) { if (status) status.textContent = text; }
  function scrollBottom() { messages.scrollTop = messages.scrollHeight; }
  function addBubble(role, text, withSpeaker = false) {
    const bubble = document.createElement("div");
    bubble.className = `mas-oyon-bubble ${role === "user" ? "mas-oyon-user" : "mas-oyon-answer"}`;
    const label = document.createElement("b");
    label.textContent = role === "user" ? "ANDA · TRANSKRIP / PESAN" : "MAS OYON";
    const body = document.createElement("p");
    body.textContent = text;
    bubble.append(label, body);
    if (role === "model" && withSpeaker) {
      const play = document.createElement("button");
      play.type = "button"; play.className = "mas-oyon-play"; play.textContent = "🔊 Putar suara";
      play.addEventListener("click", () => speak(text));
      bubble.append(play);
    }
    messages.append(bubble); scrollBottom();
    return bubble;
  }
  function speak(text) {
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      setStatus("Browser iki durung ndhukung swara. Jawaban teks tetep ana nggih."); return;
    }
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "id-ID";
    utterance.rate = 0.92;
    utterance.pitch = 1.0;
    utterance.volume = 1;
    const chooseIndonesianVoice = () => {
      const voices = synth.getVoices();
      return voices.find(v => /^id(-|_)/i.test(v.lang)) || voices.find(v => /bahasa indonesia|indonesian/i.test(v.name)) || null;
    };
    const voice = chooseIndonesianVoice();
    if (voice) utterance.voice = voice;
    utterance.onstart = () => setStatus("Mas OYON lagi ngomong. Dirungokna sek nggih…");
    utterance.onend = () => setStatus("Wis rampung. Ana pitakon liyane? 😊");
    utterance.onerror = () => setStatus("Swara ora bisa diputer ing HP iki. Jawaban teks tetep isa diwaca.");
    lastUtterance = utterance;
    synth.speak(utterance);
  }
  // Browser voices often load asynchronously, especially on Android Chrome.
  if ("speechSynthesis" in window) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener?.("voiceschanged", () => window.speechSynthesis.getVoices());
  }
  function setOpen(open) {
    panel.classList.toggle("is-open", open);
    panel.setAttribute("aria-hidden", String(!open));
    launcher.style.display = open ? "none" : "block";
    if (open) { panel.classList.remove("is-minimized"); input.focus(); scrollBottom(); }
    else if (window.speechSynthesis) window.speechSynthesis.cancel();
  }
  launcher.addEventListener("click", () => setOpen(true));
  $("masOyonClose")?.addEventListener("click", () => setOpen(false));
  $("masOyonMinimize")?.addEventListener("click", () => panel.classList.toggle("is-minimized"));

  async function sendMessage(overrideText) {
    const message = String(overrideText ?? input.value).trim();
    if (!message || busy) return;
    if (message.length > 1500) { setStatus("Maksimal 1.500 karakter nggih, ojo dawa-dawa dhisik 😄"); return; }
    input.value = "";
    addBubble("user", message);
    busy = true; sendBtn.disabled = true; sendBtn.textContent = "Mengirim…";
    setStatus("Mas OYON lagi mikir. Sekedap nggih…");
    const thinking = addBubble("model", "Sedang menyusun jawaban…");
    thinking.classList.add("mas-oyon-thinking");
    const prior = history.slice(-8);
    try {
      const response = await fetch("/api/mas-oyon", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history: prior })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = data.error || `Permintaan gagal (${response.status}).`;
        const code = data.code ? ` [${data.code}]` : "";
        throw new Error(detail + code);
      }
      const answer = String(data.answer || "").trim();
      if (!answer) throw new Error("Mas OYON belum memberi jawaban. Coba lagi.");
      thinking.remove();
      history.push({ role: "user", text: message }, { role: "model", text: answer });
      if (history.length > 12) history.splice(0, history.length - 12);
      addBubble("model", answer, true);
      if ($("masOyonAutoSpeak")?.checked) speak(answer);
      else setStatus("Jawaban diterima. Tekan Putar suara bila ingin mendengarkan.");
    } catch (error) {
      const pending = messages.querySelector(".mas-oyon-thinking");
      pending?.remove();
      addBubble("model", error.message || "Koneksine lagi rewel. Coba maneh sedhela nggih.");
      setStatus("Koneksi AI gagal. Baca pesan error di atas; bila berulang, admin periksa Vercel Function Logs.");
    } finally {
      busy = false; sendBtn.disabled = false; sendBtn.textContent = "Kirim ➤"; input.focus();
    }
  }
  sendBtn.addEventListener("click", () => sendMessage());
  input.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(); }
  });

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = "id-ID"; recognition.interimResults = false; recognition.continuous = false; recognition.maxAlternatives = 1;
    recognition.onstart = () => { micBtn.classList.add("is-listening"); micBtn.textContent = "⏹️"; setStatus("Mendengarkan… monggo ngomong sing jelas."); };
    recognition.onresult = event => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim() || "";
      if (transcript) { input.value = transcript; input.focus(); setStatus("Suara sudah jadi teks. Periksa transkrip, lalu tekan Kirim."); }
    };
    recognition.onerror = event => {
      const reason = event.error === "not-allowed" ? "Izin mikrofon durung diwenehake. Coba aktifna ing setelan browser nggih." : event.error === "no-speech" ? "Suarane durung keprungu. HP-ne dicedhakake sethithik nggih." : "Input suara gagal. Coba lagi atau ketik pesan.";
      setStatus(reason);
    };
    recognition.onend = () => { micBtn.classList.remove("is-listening"); micBtn.textContent = "🎙️"; };
    micBtn.addEventListener("click", () => {
      try { if (micBtn.classList.contains("is-listening")) recognition.stop(); else recognition.start(); }
      catch (_) { setStatus("Mikrofon sedang digunakan. Coba lagi sebentar."); }
    });
  } else {
    micBtn.disabled = true; micBtn.title = "Input suara belum didukung browser ini";
    setStatus("Chat siap. Input suara belum didukung browser ini; gunakan ketik.");
  }
})();
