/* OYONID MAP V14.0.20 — Mas Dino chat UI */
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
  let voiceUnlocked = false;
  let positionFrame = 0;

  function setStatus(text) { if (status) status.textContent = text; }
  function scrollBottom() { messages.scrollTop = messages.scrollHeight; }
  function addBubble(role, text, withSpeaker = false) {
    const bubble = document.createElement("div");
    bubble.className = `mas-oyon-bubble ${role === "user" ? "mas-oyon-user" : "mas-oyon-answer"}`;
    const label = document.createElement("b");
    label.textContent = role === "user" ? "ANDA · TRANSKRIP / PESAN" : "MAS DINO";
    const body = document.createElement("p");
    body.textContent = text;
    bubble.append(label, body);
    if (role === "model" && withSpeaker) {
      const play = document.createElement("button");
      play.type = "button"; play.className = "mas-oyon-play"; play.textContent = "🔊 Putar suara";
      play.addEventListener("click", () => speak(text));
      const stop = document.createElement("button");
      stop.type = "button"; stop.className = "mas-oyon-play mas-oyon-stop"; stop.textContent = "■ Hentikan";
      stop.addEventListener("click", stopSpeech);
      bubble.append(play, stop);
    }
    messages.append(bubble); scrollBottom();
    return bubble;
  }
  function stopSpeech() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setStatus("Swara dihentikan. Teks jawaban tetep ana nggih.");
  }
  function unlockSpeechFromGesture() {
    if (voiceUnlocked || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
    try {
      const warm = new SpeechSynthesisUtterance(" ");
      warm.lang = "id-ID"; warm.volume = 0;
      window.speechSynthesis.speak(warm);
      window.speechSynthesis.cancel();
      voiceUnlocked = true;
    } catch (_) {}
  }
  function pickMasculineIndonesianVoice(voices) {
    const idVoices = (voices || []).filter(v => /^id(-|_)/i.test(v.lang) || /indonesian|bahasa indonesia/i.test(v.name));
    // Browser voice metadata rarely exposes gender. Prefer an explicitly male-labelled
    // Indonesian voice when the device provides one; otherwise use its Indonesian voice.
    return idVoices.find(v => /male|pria|laki/i.test(v.name)) || idVoices[0] || null;
  }
  function splitSpeech(text, max = 230) {
    const words = String(text || "").replace(/\s+/g, " ").trim().split(" ");
    const chunks = []; let part = "";
    for (const word of words) {
      const next = part ? part + " " + word : word;
      if (next.length > max && part) { chunks.push(part); part = word; }
      else part = next;
    }
    if (part) chunks.push(part);
    return chunks;
  }
  function speak(text) {
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      setStatus("Browser iki durung ndhukung swara. Jawaban teks tetep ana nggih."); return;
    }
    const synth = window.speechSynthesis;
    synth.cancel();
    const chunks = splitSpeech(text);
    const voices = synth.getVoices();
    const voice = pickMasculineIndonesianVoice(voices);
    if (!chunks.length) return;
    let index = 0;
    const next = () => {
      if (index >= chunks.length) { setStatus("Wis rampung. Ana pitakon liyane? 😊"); return; }
      const utterance = new SpeechSynthesisUtterance(chunks[index++]);
      utterance.lang = "id-ID"; utterance.rate = 1.12; utterance.pitch = 0.88; utterance.volume = 1;
      if (voice) utterance.voice = voice;
      utterance.onstart = () => setStatus("Mas Dino lagi ngomong. Cepet, cekak, ora muter-muter 😄");
      utterance.onend = next;
      utterance.onerror = event => {
        setStatus(event?.error === "interrupted" ? "Swara dihentikan." : "Swara ora bisa diputer. Priksa setelan suara HP; jawaban teks tetep ana.");
      };
      lastUtterance = utterance;
      synth.speak(utterance);
      // Android Chrome can leave speech paused after tab visibility changes.
      if (synth.paused) synth.resume();
    };
    next();
  }
  function positionLauncher() {
    if (!launcher || !launcher.isConnected) return;
    const w = launcher.offsetWidth || 160, h = launcher.offsetHeight || 48;
    const vw = window.innerWidth, vh = window.innerHeight, gap = 10;
    const selectors = ["#realizationQuickBar", "#detailPanel.open", "#monitoringPage:not(.monitoring-collapsed)", "#realizationPanel:not(.is-minimized)", "#playbackPhotoBox.is-visible", "#routeRecordFloatBtn", "#locationPhotoBtn"];
    const obstacles = selectors.map(sel => document.querySelector(sel)).filter(el => el && el.getClientRects().length).map(el => el.getBoundingClientRect());
    const candidates = [];
    const xPositions = [vw - w - 12, 12];
    for (const x of xPositions) {
      for (let y = vh - h - 18; y >= 76; y -= 42) candidates.push({x:Math.max(6,Math.min(vw-w-6,x)),y});
    }
    let best = null;
    for (const c of candidates) {
      const r = {left:c.x,top:c.y,right:c.x+w,bottom:c.y+h};
      let overlap = 0;
      for (const o of obstacles) {
        const iw = Math.max(0, Math.min(r.right,o.right)-Math.max(r.left,o.left));
        const ih = Math.max(0, Math.min(r.bottom,o.bottom)-Math.max(r.top,o.top));
        overlap += iw*ih;
      }
      const preferRight = c.x > vw/2 ? 0 : 1800;
      const distance = Math.abs((vh-24)-(c.y+h));
      const score = overlap*20 + preferRight + distance;
      if (!best || score < best.score) best = {...c,score};
      if (overlap === 0 && c.x > vw/2 && distance < 55) break;
    }
    if (best) { launcher.style.left = `${best.x}px`; launcher.style.top = `${best.y}px`; launcher.style.right = "auto"; launcher.style.bottom = "auto"; }
  }
  function schedulePosition() {
    if (positionFrame) cancelAnimationFrame(positionFrame);
    positionFrame = requestAnimationFrame(() => { positionFrame = 0; positionLauncher(); });
  }
  window.addEventListener("resize", schedulePosition, {passive:true});
  window.addEventListener("scroll", schedulePosition, {passive:true});
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(schedulePosition);
    ["realizationQuickBar","detailPanel","monitoringPage","realizationPanel","playbackPhotoBox"].forEach(id => { const el=$(id); if(el) ro.observe(el); });
  }
  document.addEventListener("transitionend", schedulePosition, true);
  schedulePosition();
  // Browser voices often load asynchronously, especially on Android Chrome.
  if ("speechSynthesis" in window) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener?.("voiceschanged", () => window.speechSynthesis.getVoices());
  }
  function setOpen(open) {
    panel.classList.toggle("is-open", open);
    panel.setAttribute("aria-hidden", String(!open));
    launcher.style.display = open ? "none" : "block";
    if (open) { panel.classList.remove("is-minimized"); input.focus(); scrollBottom(); schedulePosition(); }
    else if (window.speechSynthesis) window.speechSynthesis.cancel();
    schedulePosition();
  }
  launcher.addEventListener("click", () => setOpen(true));
  $("masOyonClose")?.addEventListener("click", () => setOpen(false));
  $("masOyonMinimize")?.addEventListener("click", () => { panel.classList.toggle("is-minimized"); schedulePosition(); });
  $("masOyonStopSpeak")?.addEventListener("click", stopSpeech);

  async function sendMessage(overrideText) {
    const message = String(overrideText ?? input.value).trim();
    if (!message || busy) return;
    if (message.length > 1500) { setStatus("Maksimal 1.500 karakter nggih, ojo dawa-dawa dhisik 😄"); return; }
    input.value = "";
    addBubble("user", message);
    busy = true; sendBtn.disabled = true; sendBtn.textContent = "Mengirim…";
    setStatus("Mas Dino lagi mikir. Sekedap nggih…");
    const thinking = addBubble("model", "Sedang menyusun jawaban…");
    thinking.classList.add("mas-oyon-thinking");
    const prior = history.slice(-8);
    try {
      const controller = new AbortController();
      const requestTimer = setTimeout(() => controller.abort(), 56000);
      let response;
      try {
        response = await fetch("/api/mas-oyon", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, history: prior }), signal: controller.signal
        });
      } finally { clearTimeout(requestTimer); }
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = data.error || `Permintaan gagal (${response.status}).`;
        const code = data.code ? ` [${data.code}]` : "";
        throw new Error(detail + code);
      }
      const answer = String(data.answer || "").trim();
      if (!answer) throw new Error("Mas Dino belum memberi jawaban. Coba lagi.");
      thinking.remove();
      history.push({ role: "user", text: message }, { role: "model", text: answer });
      if (history.length > 12) history.splice(0, history.length - 12);
      addBubble("model", answer, true);
      if ($("masOyonAutoSpeak")?.checked) speak(answer);
      else setStatus("Jawaban diterima. Tekan Putar suara bila ingin mendengarkan.");
    } catch (error) {
      const pending = messages.querySelector(".mas-oyon-thinking");
      pending?.remove();
      const failureText = error?.name === "AbortError"
        ? "Permintaan Mas Dino melewati batas waktu. Coba lagi; bila berulang, admin perlu memeriksa durasi Vercel Function dan respons Gemini."
        : (error.message || "Koneksine lagi rewel. Coba maneh sedhela nggih.");
      addBubble("model", failureText);
      setStatus("Koneksi AI gagal. Baca pesan error di atas; bila berulang, admin periksa Vercel Function Logs.");
    } finally {
      busy = false; sendBtn.disabled = false; sendBtn.textContent = "Kirim ➤"; input.focus();
    }
  }
  sendBtn.addEventListener("click", () => { unlockSpeechFromGesture(); sendMessage(); });
  input.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); unlockSpeechFromGesture(); sendMessage(); }
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
