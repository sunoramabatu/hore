window.onerror = function (msg, src, line, col, err) {
  alert("JS ERROR:\n" + msg + "\nLine: " + line);
  console.error(err);
};
/* ======================
   GLOBAL STATE
====================== */
let markers = [];
let searchIndex = [];
let userLatLng = null;
let routingControl = null;
let petugasMarker = null;

let history = JSON.parse(
  localStorage.getItem("oyon_history") || "[]"
);
// Catatan realisasi kumulatif: tidak direset harian seperti panel Riwayat.
const COMPLETED_STORAGE_KEY = "oyon_completed_records_v1";
let completedRecords = (() => {
  try { return JSON.parse(localStorage.getItem(COMPLETED_STORAGE_KEY) || "[]"); }
  catch (e) { return []; }
})();
function persistCompletedRecords() {
  try {
    localStorage.setItem(COMPLETED_STORAGE_KEY, JSON.stringify(completedRecords));
    return true;
  } catch (e) {
    console.error("Gagal menyimpan realisasi lokal", e);
    showToast("⚠️ Penyimpanan lokal penuh. Download Excel Update untuk membuat cadangan.");
    return false;
  }
}
function completionIdentity(row) {
  const idpel = String(getMappedValue(row, "IDPEL") || row.IDPEL || "").trim();
  const meter = String(getNoMeter(row) || "").trim();
  return `${idpel}|${meter}`;
}
function localDateTimeParts(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return {
    date: date.toLocaleDateString("id-ID"),
    dayKey: `${yyyy}-${mm}-${dd}`,
    time: date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  };
}

let originalRows = [];
let workingRows = [];
let originalHeaders = [];
let gpsNumberFormats = (() => { try { return JSON.parse(localStorage.getItem("OYONID_GPS_NUMBER_FORMATS") || "{}"); } catch (e) { return {}; } })();
let markerOrderStyle = "circle";
let showOrderNumbers = localStorage.getItem("oyon_show_order_numbers") !== "false";
let columnMapping = JSON.parse(localStorage.getItem("oyon_column_mapping") || "{}");
const COLUMN_MAPPING_FIELDS = {
  "IDPEL": ["IDPEL", "ID PEL", "ID_PEL", "NOPEL"],
  "NAMA": ["NAMA", "NAMA PELANGGAN", "NAME"],
  "NOMOR METER": ["NOMOR METER", "NOMOR_METER", "NOMORMETER", "NOMORKWH", "NO METER", "NO_METER", "NOMET", "METER"],
  "NIK": ["NIK", "NO NIK"],
  "PETUGAS": ["PETUGAS", "NAMA PETUGAS", "KODE PETUGAS", "PETUGAS TAGGING"],
  "KDDK ACMT": ["KDDK ACMT", "KDDK_ACMT", "KDDK", "KODEDK"],
  "HARI BACA": ["HARI BACA", "HARI BACA ACMT", "HARI", "DAY"],
  "DAYA": ["DAYA", "TARIF/DAYA", "TARIF DAYA"],
  "MERK METER": ["MEREKKWH", "MEREK KWH", "MERK KWH", "MERK", "MERKMETER", "MEREK METER", "MERK METER"],
  "ALAMAT": ["ALAMAT", "ALAMAT PELANGGAN", "ADDRESS"],
  "LAT DIJ": ["LAT DIJ", "LAT", "LATITUDE", "LATITUDE DIJ"],
  "LON DIJ": ["LON DIJ", "LON", "LONGITUDE", "LONGITUDE DIJ"],
  "LAT DIL": ["LAT PEMBANDING", "LAT DIL", "LAT PETUGAS", "LAT CADANGAN", "LATTH", "LATDIL", "LATITUDE DIL", "LATITUDE PEMBANDING", "LATITUDE PETUGAS", "LATITUDE CADANGAN"],
  "LON DIL": ["LON PEMBANDING", "LON DIL", "LON PETUGAS", "LON CADANGAN", "LONTH", "LONDIL", "LONGITUDE DIL", "LONGITUDE PEMBANDING", "LONGITUDE PETUGAS", "LONGITUDE CADANGAN"]
};
function normalizeHeader(value) { return String(value ?? "").trim().toUpperCase().replace(/[\s_\-]+/g, ""); }
function getMappedValue(row, canonical) {
  const selected = columnMapping[canonical];
  const keys = [selected, canonical, ...(COLUMN_MAPPING_FIELDS[canonical] || [])].filter(Boolean);
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(row || {}, key) && String(row[key] ?? "").trim() !== "") return row[key];
    const found = Object.keys(row || {}).find(k => normalizeHeader(k) === normalizeHeader(key));
    if (found && String(row[found] ?? "").trim() !== "") return row[found];
  }
  return "";
}
const COLUMN_LABELS = { "LAT DIL": "LAT PEMBANDING", "LON DIL": "LON PEMBANDING" };
// Kompatibilitas: LAT/LON PETUGAS juga dapat menjadi koordinat Lokasi Cadangan.
// Jangan hapus mapping lama karena beberapa RBM memakai nama kolom tersebut.
function parseCoordinate(value) {
  if (value === null || value === undefined || String(value).trim() === "") return NaN;
  let s = String(value).trim().replace(/\s/g, "");
  // Dukung format desimal koma jika tidak ada titik desimal.
  if (s.includes(",") && !s.includes(".")) s = s.replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}
function firstCoordinateByHeaders(row, headers) {
  const keys = Object.keys(row || {});
  for (const name of headers) {
    const key = keys.find(k => normalizeHeader(k) === normalizeHeader(name));
    if (key && String(row[key] ?? "").trim() !== "") return parseCoordinate(row[key]);
  }
  return NaN;
}
function validCoordinatePair(lat, lon) {
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}
function renderColumnMappingOptions() {
  const host = document.getElementById("columnMappingFields");
  if (!host) return;
  const headers = [...new Set([...(originalHeaders || []), ...Object.keys(workingRows[0] || {})].filter(Boolean))];
  if (!headers.length) { host.innerHTML = '<div style="font-size:12px;color:#64748b;">Upload Excel terlebih dahulu.</div>'; return; }
  host.innerHTML = Object.keys(COLUMN_MAPPING_FIELDS).map(canonical => {
    const guesses = COLUMN_MAPPING_FIELDS[canonical];
    const auto = headers.find(h => guesses.some(g => normalizeHeader(g) === normalizeHeader(h)));
    const current = columnMapping[canonical] || auto || "";
    return `<label style="font-size:11px;color:#334155;">${COLUMN_LABELS[canonical] || canonical}<select data-map-key="${canonical}" style="display:block;width:100%;margin-top:3px;padding:6px;border:1px solid #cbd5e1;border-radius:6px;background:white;font-size:12px;"><option value="">— Otomatis / tidak dipilih —</option>${headers.map(h => `<option value="${String(h).replace(/&/g,'&amp;').replace(/"/g,'&quot;')}" ${h===current?'selected':''}>${h}</option>`).join("")}</select></label>`;
  }).join("");
}
function applyColumnMapping() {
  document.querySelectorAll("[data-map-key]").forEach(sel => {
    if (sel.value) columnMapping[sel.dataset.mapKey] = sel.value;
    else delete columnMapping[sel.dataset.mapKey];
  });
  localStorage.setItem("oyon_column_mapping", JSON.stringify(columnMapping));
  if (workingRows.length) { buildMarkers(); if (hasSelectedCustomer) { const id = String(window.currentCompareIDPEL || ""); const row = workingRows.find(r => String(getMappedValue(r,"IDPEL") || r.IDPEL) === id); if (row) openDetail(row); } }
  showToast("✅ Pemetaan judul kolom diterapkan");
}

let filterHariBacaAktif = false;
let daftarHariBaca = [];
let indexHariBaca = 0;

let showDIJ = true;
let showDIL = true;

let isFullMap = false;
let hasSelectedCustomer = false;
let historyVisible = false;

let hiddenMarkers = [];

window.isCompareMode = false;
window.compareMarkers = [];

/* ======================
   GPS COMPATIBILITY ENGINE
====================== */

function getDIJLat(row) {
  const direct = firstCoordinateByHeaders(row, ["LAT DIJ", "LATITUDE DIJ", "LATITUDE", "LAT"]);
  if (Number.isFinite(direct)) return direct;
  return parseCoordinate(getMappedValue(row, "LAT DIJ"));
}
function getDIJLon(row) {
  const direct = firstCoordinateByHeaders(row, ["LON DIJ", "LONGITUDE DIJ", "LONGITUDE", "LON"]);
  if (Number.isFinite(direct)) return direct;
  return parseCoordinate(getMappedValue(row, "LON DIJ"));
}
function getDILCoordinatePair(row) {
  // Data RBM bisa memakai beberapa nama untuk titik kedua.
  // Beberapa file memiliki nilai LAT/LON PEMBANDING tertukar:
  // LAT PEMBANDING berisi longitude (mis. 112.x) dan LON PEMBANDING
  // berisi latitude (mis. -7.x). Deteksi berdasarkan rentang koordinat,
  // lalu betulkan untuk tampilan peta dan ekspor tanpa mengubah koordinat DIJ.
  const latAliases = [
    "LAT PEMBANDING", "LAT DIL", "LAT PETUGAS", "LAT CADANGAN",
    "LATTH", "LATDIL", "LATITUDE PEMBANDING", "LATITUDE DIL",
    "LATITUDE PETUGAS", "LATITUDE CADANGAN"
  ];
  const lonAliases = [
    "LON PEMBANDING", "LON DIL", "LON PETUGAS", "LON CADANGAN",
    "LONTH", "LONDIL", "LONGITUDE PEMBANDING", "LONGITUDE DIL",
    "LONGITUDE PETUGAS", "LONGITUDE CADANGAN"
  ];

  let lat = firstCoordinateByHeaders(row, latAliases);
  let lon = firstCoordinateByHeaders(row, lonAliases);

  if (!Number.isFinite(lat)) lat = parseCoordinate(getMappedValue(row, "LAT DIL"));
  if (!Number.isFinite(lon)) lon = parseCoordinate(getMappedValue(row, "LON DIL"));

  // Jika pasangan tidak valid tetapi valid saat ditukar, label/nilai di Excel tertukar.
  if (!validCoordinatePair(lat, lon) && validCoordinatePair(lon, lat)) {
    return { lat: lon, lon: lat, swapped: true };
  }
  return { lat, lon, swapped: false };
}
function getDILLat(row) {
  return getDILCoordinatePair(row).lat;
}
function getDILLon(row) {
  return getDILCoordinatePair(row).lon;
}
/* ======================
   UTIL — HARI BACA DARI KDDK ACMT
====================== */
/* ======================
   UTIL — HARI BACA
   PRIORITAS:
   1. Kolom HARI
   2. Kolom HARI BACA
   3. KDDK ACMT / KDDK
====================== */

function getHariBaca(row) {
  const direct = getMappedValue(row, "HARI BACA");
  if (direct !== "") return String(direct).trim().toUpperCase();
  const kddk = String(getMappedValue(row, "KDDK ACMT") || row["KDDK ACMT"] || row.KDDK || row.KODEDK || "").trim();
  if (!kddk) return "-";
  return kddk.length >= 6 ? kddk.slice(-6, -5).toUpperCase() : "-";
}

/* ======================
   UTIL — URUTAN BACA DARI KDDK ACMT
====================== */

function getUrutanBaca(row) {
  // 1) Jika Excel sudah memiliki kolom URUTAN BACA, gunakan nilai itu dahulu.
  //    Ini mencegah mapping KDDK lama (misalnya tersimpan sebagai "KDDK")
  //    membuat nomor urut hilang.
  const directOrder = firstCoordinateByHeaders(row, ["URUTAN BACA", "URUTAN_BACA", "URUTAN", "NO URUTAN"]);
  if (Number.isFinite(directOrder) && directOrder >= 0) return Math.trunc(directOrder);

  // 2) Ambil KDDK ACMT yang benar dari kolom aslinya sebelum memakai mapping lama.
  const exactKddk = String(
    row["KDDK ACMT"] ?? row["KDDK_ACMT"] ?? row.KDDK_ACMT ?? ""
  ).trim();
  const mappedKddk = String(getMappedValue(row, "KDDK ACMT") || row.KDDK || row.KODEDK || "").trim();
  const candidates = [exactKddk, mappedKddk, String(row.LANGKAH ?? "").trim()];

  // Pola umum: CMAWHPL00100 → 001 → 1. LANGKAH 00100 juga didukung.
  for (const candidate of candidates) {
    if (!candidate) continue;
    const match = candidate.match(/(\d{3})\d{2}$/);
    if (match) {
      const order = Number(match[1]);
      if (Number.isFinite(order)) return order;
    }
  }
  return null;
}

function getNoMeter(row){
  const value = getMappedValue(row, "NOMOR METER");
  return String(value || "-").trim() || "-";
}

function getMerkMeter(row){
  return String(getMappedValue(row, "MERK METER") || "-").trim() || "-";
}

function getKDDK(row){

  return (
    row.KDDK ||
    row.KODEDK ||
    row.KODUK ||
    "-"
  );

}

function renderMarker(m, map) {
  if (!m || !m.marker) return;

  const marker = m.marker;

  // kalau sudah ada di map, jangan di-add lagi
  if (map.hasLayer(marker)) return;

  clusterGroup.addLayer(marker);
}


const STORAGE_KEY = "RBM_WORKING_STATE";


// Reset history setiap hari
const today = new Date().toDateString();
const savedDate = localStorage.getItem("oyon_history_date");

function closeHistory() {
  const panel = document.getElementById("historyPanel");
  if (panel) {
    panel.style.display = "none";
  }
}

if (savedDate !== today) {
  history = [];
  localStorage.setItem("oyon_history", "[]");
  localStorage.setItem("oyon_history_date", today);
  renderHistory();

}

/* ======================
   DOM
====================== */
const upload = document.getElementById("upload");
const statusText = document.getElementById("statusText");
const searchBtn = document.getElementById("searchBtn");
const searchInput = document.getElementById("searchInput");
const zoomBtn = document.getElementById("zoomBtn");
const downloadBtn = document.getElementById("downloadBtn");

/* ======================
   BARCODE SCANNER V2
   ZXing (jika CDN tersedia) + BarcodeDetector sebagai fallback.
   Kontrol zoom, fokus, dan lampu mengikuti kemampuan perangkat.
====================== */
let barcodeStream = null;
let barcodeScannerOpen = false;
let barcodeScanBusy = false;
let barcodeDetector = null;
let barcodeZXingReader = null;
let barcodeZXingControls = null;
let barcodeTorchOn = false;
let barcodeZoomValue = null;
let barcodeTrack = null;

function addBarcodeScanButton() {
  if (!searchBtn || !searchInput || document.getElementById("barcodeScanBtn")) return;
  const btn = document.createElement("button");
  btn.id = "barcodeScanBtn";
  btn.type = "button";
  btn.innerHTML = '<span class="scan-camera-icon">📷</span><span class="scan-caption">Scan Barcode</span>';
  btn.title = "Scan barcode nomor meter";
  btn.setAttribute("aria-label", "Scan barcode nomor meter");
  btn.style.cssText = 'margin-left:6px;width:50px;min-width:50px;height:42px;border:0;border-radius:10px;background:#2563eb;color:white;font-size:18px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;cursor:pointer;vertical-align:middle;box-shadow:0 2px 6px rgba(0,0,0,.18);';
  btn.onclick = openBarcodeScanner;
  searchBtn.insertAdjacentElement("afterend", btn);
}

function createBarcodeScannerUI() {
  document.getElementById("barcodeScannerModal")?.remove();
  const modal = document.createElement("div");
  modal.id = "barcodeScannerModal";
  modal.innerHTML = `
    <div style="position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.93);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:18px;box-sizing:border-box;overflow:auto;">
      <div style="width:min(92vw,460px);color:white;text-align:center;font-weight:700;font-size:20px;margin:8px 0 12px;">📷 Scan Nomor Meter</div>
      <div style="position:relative;width:min(92vw,460px);aspect-ratio:4/3;background:#111;border-radius:16px;overflow:hidden;border:2px solid rgba(255,255,255,.4);">
        <video id="barcodeVideo" autoplay muted playsinline style="width:100%;height:100%;object-fit:cover;"></video>
        <div style="position:absolute;left:8%;right:8%;top:50%;height:2px;background:#22c55e;box-shadow:0 0 12px #22c55e;pointer-events:none;"></div>
        <div style="position:absolute;left:8%;right:8%;top:25%;bottom:25%;border:2px solid rgba(255,255,255,.8);border-radius:10px;pointer-events:none;"></div>
      </div>
      <div id="barcodeScannerStatus" role="status" style="color:white;text-align:center;margin-top:12px;font-size:14px;max-width:460px;">Membuka kamera…</div>
      <div style="width:min(92vw,460px);display:flex;gap:8px;align-items:center;justify-content:center;flex-wrap:wrap;margin-top:12px;color:white;">
        <button id="barcodeZoomOut" type="button" style="padding:9px 13px;border:0;border-radius:9px;font-weight:700;">− Zoom</button>
        <input id="barcodeZoomRange" aria-label="Zoom kamera" type="range" min="1" max="1" step="0.1" value="1" style="width:min(36vw,150px);accent-color:#22c55e;" disabled>
        <button id="barcodeZoomIn" type="button" style="padding:9px 13px;border:0;border-radius:9px;font-weight:700;">+ Zoom</button>
        <button id="barcodeFocusBtn" type="button" style="padding:9px 12px;border:0;border-radius:9px;font-weight:700;">🎯 Fokus</button>
        <button id="barcodeTorchBtn" type="button" style="padding:9px 12px;border:0;border-radius:9px;font-weight:700;display:none;">🔦 Lampu</button>
      </div>
      <div style="width:min(92vw,460px);color:#ddd;text-align:center;font-size:12px;margin-top:8px;">Zoom, fokus, dan flash hanya tersedia jika didukung kamera HP. Dekatkan kamera perlahan sampai garis barcode tajam.</div>
      <button id="barcodeCloseBtn" type="button" style="margin-top:16px;width:min(92vw,460px);height:48px;border:0;border-radius:12px;background:#ef4444;color:white;font-size:17px;font-weight:700;">✕ Tutup Scanner</button>
    </div>`;
  document.body.appendChild(modal);
  document.getElementById("barcodeCloseBtn").onclick = closeBarcodeScanner;
  document.getElementById("barcodeZoomRange").oninput = e => setBarcodeZoom(Number(e.target.value));
  document.getElementById("barcodeZoomOut").onclick = () => changeBarcodeZoom(-0.5);
  document.getElementById("barcodeZoomIn").onclick = () => changeBarcodeZoom(0.5);
  document.getElementById("barcodeFocusBtn").onclick = refocusBarcodeCamera;
  document.getElementById("barcodeTorchBtn").onclick = toggleBarcodeTorch;
  return modal;
}

async function openBarcodeScanner() {
  if (barcodeScannerOpen) return;
  if (!navigator.mediaDevices?.getUserMedia) {
    showToast("⚠️ Browser tidak menyediakan akses kamera. Buka lewat HTTPS atau localhost.");
    return;
  }
  barcodeScannerOpen = true;
  barcodeScanBusy = false;
  barcodeTorchOn = false;
  createBarcodeScannerUI();
  const video = document.getElementById("barcodeVideo");
  const status = document.getElementById("barcodeScannerStatus");
  try {
    barcodeStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 }, focusMode: { ideal: "continuous" } },
      audio: false
    });
    barcodeTrack = barcodeStream.getVideoTracks()[0];
    video.srcObject = barcodeStream;
    await video.play();
    configureBarcodeCameraControls();
    status.textContent = "Arahkan barcode ke dalam kotak. Tunggu sampai gambar tajam…";

    // ZXing membaca lebih banyak format daripada BarcodeDetector di banyak perangkat.
    if (window.ZXingBrowser?.BrowserMultiFormatReader) {
      try {
        barcodeZXingReader = new window.ZXingBrowser.BrowserMultiFormatReader();
        const callback = (result, err) => {
          if (!barcodeScannerOpen || !result) return;
          const value = String(result.getText?.() || result.text || "").trim();
          if (value) handleBarcodeResult(value);
        };
        if (typeof barcodeZXingReader.decodeFromVideoElementContinuously === "function") {
          barcodeZXingControls = await barcodeZXingReader.decodeFromVideoElementContinuously(video, callback);
        } else if (typeof barcodeZXingReader.decodeFromVideoElement === "function") {
          barcodeZXingControls = await barcodeZXingReader.decodeFromVideoElement(video, callback);
        } else {
          barcodeZXingReader = null;
        }
      } catch (zxingErr) {
        console.warn("ZXing tidak bisa dimulai, mencoba BarcodeDetector", zxingErr);
        barcodeZXingReader = null;
      }
    }
    if (!barcodeZXingReader && "BarcodeDetector" in window) {
      let formats = ["code_128", "code_39", "ean_13", "ean_8", "upc_a", "upc_e", "itf", "codabar", "qr_code", "data_matrix"];
      if (BarcodeDetector.getSupportedFormats) {
        const supported = await BarcodeDetector.getSupportedFormats();
        formats = formats.filter(f => supported.includes(f));
      }
      if (formats.length) {
        barcodeDetector = new BarcodeDetector({ formats });
        scanBarcodeFrame();
      }
    }
    if (!barcodeZXingReader && !barcodeDetector) {
      status.textContent = "Mesin scan tidak tersedia. Periksa koneksi internet atau coba Chrome terbaru.";
    } else if (barcodeZXingReader) {
      status.textContent = "Mesin scan multi-format aktif. Arahkan barcode dan tahan stabil sebentar.";
    }
  } catch (err) {
    console.error("Barcode scanner error:", err);
    status.textContent = "Kamera tidak bisa digunakan. Periksa izin kamera dan tutup aplikasi kamera lain.";
    showToast("❌ Kamera tidak dapat dibuka");
  }
}

function configureBarcodeCameraControls() {
  if (!barcodeTrack) return;
  let caps = {};
  try { caps = barcodeTrack.getCapabilities?.() || {}; } catch (e) {}
  const zoomRange = document.getElementById("barcodeZoomRange");
  const zoomOut = document.getElementById("barcodeZoomOut");
  const zoomIn = document.getElementById("barcodeZoomIn");
  if (caps.zoom && zoomRange) {
    zoomRange.min = String(caps.zoom.min ?? 1);
    zoomRange.max = String(caps.zoom.max ?? 1);
    zoomRange.step = String(caps.zoom.step ?? 0.1);
    const current = barcodeTrack.getSettings?.().zoom ?? caps.zoom.min ?? 1;
    zoomRange.value = String(current);
    zoomRange.disabled = Number(zoomRange.max) <= Number(zoomRange.min);
    barcodeZoomValue = Number(current);
    zoomOut.disabled = zoomIn.disabled = zoomRange.disabled;
  } else {
    zoomRange.disabled = zoomOut.disabled = zoomIn.disabled = true;
    zoomRange.title = "Zoom hardware tidak didukung; gunakan zoom kamera HP jika tersedia.";
  }
  const torchBtn = document.getElementById("barcodeTorchBtn");
  if (torchBtn && caps.torch) torchBtn.style.display = "inline-block";
  const focusBtn = document.getElementById("barcodeFocusBtn");
  if (focusBtn && !caps.focusMode && !caps.focusDistance) focusBtn.title = "Fokus manual tidak didukung kamera; tombol mencoba fokus otomatis.";
}

async function setBarcodeZoom(value) {
  if (!barcodeTrack) return;
  const input = document.getElementById("barcodeZoomRange");
  if (!input || input.disabled) return;
  const zoom = Math.max(Number(input.min), Math.min(Number(input.max), value));
  try {
    await barcodeTrack.applyConstraints({ advanced: [{ zoom }] });
    input.value = String(zoom);
    barcodeZoomValue = zoom;
  } catch (e) {
    showToast("Zoom kamera ini tidak dapat diubah oleh browser.");
  }
}
function changeBarcodeZoom(delta) {
  const input = document.getElementById("barcodeZoomRange");
  if (input && !input.disabled) setBarcodeZoom(Number(input.value) + delta);
  else showToast("Zoom hardware tidak didukung. Coba atur jarak kamera atau zoom HP.");
}
async function refocusBarcodeCamera() {
  if (!barcodeTrack) return;
  try {
    const caps = barcodeTrack.getCapabilities?.() || {};
    if (Array.isArray(caps.focusMode) && caps.focusMode.includes("single-shot")) {
      await barcodeTrack.applyConstraints({ advanced: [{ focusMode: "single-shot" }] });
      if (caps.focusMode.includes("continuous")) {
        setTimeout(() => barcodeTrack?.applyConstraints({ advanced: [{ focusMode: "continuous" }] }).catch(()=>{}), 700);
      }
      showToast("🎯 Fokus kamera diperbarui");
    } else if (Array.isArray(caps.focusMode) && caps.focusMode.includes("continuous")) {
      await barcodeTrack.applyConstraints({ advanced: [{ focusMode: "continuous" }] });
      showToast("🎯 Fokus otomatis diaktifkan");
    } else {
      showToast("Fokus manual tidak didukung kamera ini. Jauhkan kamera sedikit lalu dekatkan perlahan.");
    }
  } catch (e) { showToast("Kamera tidak mengizinkan perubahan fokus manual."); }
}
async function toggleBarcodeTorch() {
  if (!barcodeTrack) return;
  try {
    barcodeTorchOn = !barcodeTorchOn;
    await barcodeTrack.applyConstraints({ advanced: [{ torch: barcodeTorchOn }] });
    const btn = document.getElementById("barcodeTorchBtn");
    if (btn) btn.textContent = barcodeTorchOn ? "💡 Matikan lampu" : "🔦 Lampu";
  } catch (e) {
    barcodeTorchOn = false;
    showToast("Flash tidak didukung kamera ini.");
  }
}

function handleBarcodeResult(rawValue) {
  if (!barcodeScannerOpen || barcodeScanBusy) return;
  barcodeScanBusy = true;
  const raw = String(rawValue || "").trim();
  if (!raw) { barcodeScanBusy = false; return; }
  searchInput.value = raw;
  closeBarcodeScanner();
  showToast("✅ Barcode terbaca: " + raw);
  setTimeout(() => runSearch(), 250);
}

async function scanBarcodeFrame() {
  if (!barcodeScannerOpen || !barcodeDetector || barcodeZXingReader) return;
  const video = document.getElementById("barcodeVideo");
  if (!video || video.readyState < 2 || barcodeScanBusy) {
    if (barcodeScannerOpen) requestAnimationFrame(scanBarcodeFrame);
    return;
  }
  barcodeScanBusy = true;
  try {
    const codes = await barcodeDetector.detect(video);
    if (codes?.length) {
      const raw = String(codes[0].rawValue || "").trim();
      if (raw) { barcodeScanBusy = false; handleBarcodeResult(raw); return; }
    }
  } catch (e) { console.warn("BarcodeDetector:", e); }
  finally { barcodeScanBusy = false; }
  if (barcodeScannerOpen) requestAnimationFrame(scanBarcodeFrame);
}

function closeBarcodeScanner() {
  barcodeScannerOpen = false;
  barcodeDetector = null;
  barcodeScanBusy = false;
  try { barcodeZXingControls?.stop?.(); } catch (e) {}
  barcodeZXingControls = null;
  try { barcodeZXingReader?.reset?.(); } catch (e) {}
  barcodeZXingReader = null;
  if (barcodeStream) barcodeStream.getTracks().forEach(track => track.stop());
  barcodeStream = null;
  barcodeTrack = null;
  barcodeTorchOn = false;
  const video = document.getElementById("barcodeVideo");
  if (video) video.srcObject = null;
  document.getElementById("barcodeScannerModal")?.remove();
}
addBarcodeScanButton();


/* ======================
   INIT MAP
====================== */
const map = L.map("map", {
  preferCanvas: true,
  rotate: true,
  zoomControl: false,
  touchRotate: true,
  rotateControl: true,
  maxZoom: 19,
}).setView([-7.974155,112.6181065], 12);

/* ======================
   CLUSTER ENGINE
====================== */

// Layer khusus: marker pelanggan harus selalu di atas marker lokasi petugas.
if (map && map.createPane) {
  if (!map.getPane("customerMarkerPane")) map.createPane("customerMarkerPane");
  map.getPane("customerMarkerPane").style.zIndex = 720;
  if (!map.getPane("petugasMarkerPane")) map.createPane("petugasMarkerPane");
  map.getPane("petugasMarkerPane").style.zIndex = 610;
  if (!map.getPane("customerTooltipPane")) map.createPane("customerTooltipPane");
  map.getPane("customerTooltipPane").style.zIndex = 12000;
  map.getPane("customerTooltipPane").style.pointerEvents = "none";
}

const clusterGroup = L.markerClusterGroup({

  chunkedLoading: true,
  chunkInterval: 80,
  chunkDelay: 20,

  removeOutsideVisibleBounds: true,

  spiderfyOnMaxZoom: true,

  showCoverageOnHover: false,

  zoomToBoundsOnClick: true,

  disableClusteringAtZoom: 17,

  maxClusterRadius: 18

});

map.addLayer(clusterGroup);

function addMarkerToMap(marker) {

  if (!marker) return;

  if (!clusterGroup.hasLayer(marker)) {
    clusterGroup.addLayer(marker);
  }

}

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19
}).addTo(map);

/* ======================
   AUTO VIEWPORT RENDER
====================== */

map.on("moveend", renderVisibleMarkers);
map.on("zoomend", renderVisibleMarkers);


function welcomeFieldOfficer(rows, options = {}) {
  const host = document.getElementById("welcomeMessage");
  const firstWithPetugas = (rows || []).find(row => String(getMappedValue(row, "PETUGAS") || row.PETUGAS || row["NAMA PETUGAS"] || "").trim());
  const rawPetugas = String(firstWithPetugas ? (getMappedValue(firstWithPetugas, "PETUGAS") || firstWithPetugas.PETUGAS || firstWithPetugas["NAMA PETUGAS"] || "") : "").trim();
  let namePart = rawPetugas.includes(".") ? rawPetugas.split(".").slice(1).join(".") : rawPetugas;
  namePart = namePart.replace(/\d+/g, " ").replace(/[^\p{L}\s'-]/gu, " ").replace(/\s+/g, " ").trim();
  const name = namePart ? namePart.toLowerCase().replace(/\b\p{L}/gu, c => c.toUpperCase()) : "Sobat";
  const hour = new Date().getHours();
  let daypart = "malam";
  let lines = [];
  if (hour >= 5 && hour < 11) {
    daypart = "pagi";
    lines = ["Selamat pagi, Pak {name}! Gas pelan-pelan, semoga bacaan hari ini lancar dan aman ya.", "Pagi, Pak {name}! Semangat kelilingnya. Semoga semua meter ketemu dan kerjaan beres tanpa kendala.", "Halo Pak {name}, selamat pagi! Isi tenaga dulu, tetap hati-hati di jalan dan semoga target hari ini lancar."];
  } else if (hour >= 11 && hour < 15) {
    daypart = "siang";
    lines = ["Selamat siang, Pak {name}! Tetap semangat ya, jangan lupa istirahat dan minum. Semoga bacaan lancar.", "Siang, Pak {name}! Lanjut pelan-pelan, yang penting aman dan datanya beres semua.", "Halo Pak {name}, semangat siangnya! Semoga kerjaan hari ini lancar dan cepat kelar."];
  } else if (hour >= 15 && hour < 18) {
    daypart = "sore";
    lines = ["Selamat sore, Pak {name}! Semangat menyelesaikan bacaan, tetap hati-hati sampai pulang ya.", "Sore, Pak {name}! Sedikit lagi, semoga sisa pekerjaan lancar dan cepat beres.", "Halo Pak {name}, tetap semangat sore ini. Utamakan aman, semoga semua data lengkap."];
  } else {
    daypart = "malam";
    lines = ["Selamat malam, Pak {name}! Tetap jaga keselamatan ya, semoga pekerjaan lancar dan segera selesai.", "Malam, Pak {name}! Semangat, jangan dipaksakan kalau lelah. Semoga semua bacaan beres dengan aman.", "Halo Pak {name}, selamat malam! Hati-hati di lapangan, semoga tugasnya lancar sampai selesai."];
  }
  const message = lines[Math.floor(Math.random() * lines.length)].replaceAll("{name}", name);
  if (host) {
    host.textContent = `👋 ${message}`;
    host.style.display = "block";
    host.classList.remove("welcome-visible");
    requestAnimationFrame(() => host.classList.add("welcome-visible"));
  }
  const hideAfterVoice = () => window.setTimeout(() => {
    if (host) { host.classList.remove("welcome-visible"); window.setTimeout(() => { host.style.display = "none"; }, 250); }
  }, 5000);
  if ("speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = "id-ID";
      utterance.rate = 1.02;
      utterance.pitch = 1.05;
      let hidden = false;
      const hideOnce = () => { if (!hidden) { hidden = true; hideAfterVoice(); } };
      utterance.onend = hideOnce;
      utterance.onerror = hideOnce;
      // Cadangan supaya popup tidak tertinggal jika browser tidak mengirim event selesai.
      window.setTimeout(hideOnce, Math.max(12000, message.length * 95));
      window.speechSynthesis.speak(utterance);
      return;
    } catch (e) { console.warn("Suara sambutan tidak tersedia", e); }
  }
  hideAfterVoice();
}

/* ======================
   LOAD EXCEL
====================== */
upload.onchange = e => {
  const file = e.target.files[0];
  if (!file) return;

  // Simpan nama file hanya untuk referensi; identitas petugas diambil dari kolom PETUGAS.
  localStorage.setItem("RBM_FILENAME", file.name);

  const reader = new FileReader();
  reader.onload = evt => {
    const wb = XLSX.read(new Uint8Array(evt.target.result), { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];

// Simpan seluruh nama kolom asli dan urutannya
const rawExcel = XLSX.utils.sheet_to_json(sheet, {
  header: 1,
  defval: ""
});

originalHeaders = rawExcel.length > 0
  ? rawExcel[0].map(h => String(h).trim())
  : [];
// Simpan format angka koordinat dari file sumber agar jumlah desimal GPS tetap terjaga saat diekspor.
gpsNumberFormats = {};
const gpsHeaderNames = new Set(["LATDIJ", "LONDIJ", "LATDIL", "LONDIL", "LATPEMBANDING", "LONPEMBANDING", "LATPETUGAS", "LONPETUGAS", "LATCADANGAN", "LONCADANGAN", "LATTH", "LONTH", "LATITUDEDIL", "LONGITUDEDIL", "LATITUDEPEMBANDING", "LONGITUDEPEMBANDING", "LATITUDEPETUGAS", "LONGITUDEPETUGAS", "LATITUDECADANGAN", "LONGITUDECADANGAN"]);
originalHeaders.forEach((header, colIndex) => {
  if (!gpsHeaderNames.has(normalizeHeader(header))) return;
  gpsNumberFormats[header] = [];
  for (let rowIndex = 1; rowIndex < rawExcel.length; rowIndex++) {
    const address = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
    const cell = sheet[address];
    let format = cell && cell.z && cell.z !== "General" ? cell.z : "";
    if (!format && cell && typeof cell.v === "number") {
      const str = String(cell.v);
      const decimals = str.includes(".") ? str.split(".")[1].length : 0;
      if (decimals > 0 && decimals <= 15) format = "0." + "0".repeat(decimals);
    }
    gpsNumberFormats[header].push(format);
  }
});
try { localStorage.setItem("OYONID_GPS_NUMBER_FORMATS", JSON.stringify(gpsNumberFormats)); } catch (e) {}
renderColumnMappingOptions();

localStorage.setItem(
  "OYONID_ORIGINAL_HEADERS",
  JSON.stringify(originalHeaders)
);

// Baca data seperti sebelumnya
originalRows = XLSX.utils.sheet_to_json(sheet, {
  defval: ""
});

// Salin data untuk proses kerja aplikasi
workingRows = structuredClone(originalRows);
    saveState();

    buildMarkers();
    renderHistory();
    welcomeFieldOfficer(workingRows, { force: true });

    if (statusText) {
      statusText.innerText = "✅ Peta berhasil dibuat";
    }
    zoomBtn.style.display = "block";

    // auto zoom setelah upload
    zoomToAllMarkers();
  };
  reader.readAsArrayBuffer(file);

  document.addEventListener("DOMContentLoaded", () => {
  const statusText = document.getElementById("statusText");
});

};


/* ======================
   KUMPULKAN HARI BACA
====================== */
hariBacaList = [...new Set(
  workingRows
    .map(r => String(r["HARI BACA ACMT"]).trim())
    .filter(v => v !== "")
)].sort((a,b)=>a-b);

/* ======================
   SAAT LOAD
====================== */
window.addEventListener("load", () => {

  // Restore filename
  const savedFilename = localStorage.getItem("RBM_FILENAME");
  if (savedFilename) {
    document.getElementById("fileNameLabel").innerText = "📄 " + savedFilename;
  }

  const saved = localStorage.getItem(STORAGE_KEY);

  const savedHeaders = localStorage.getItem("OYONID_ORIGINAL_HEADERS");
  if (savedHeaders) {
    try {
      originalHeaders = JSON.parse(savedHeaders);
    } catch (e) {
      originalHeaders = [];
    }
  }

  if (saved) {
    workingRows = JSON.parse(saved);

    map.whenReady(() => {
      buildMarkers();
      renderHistory();
      // Sambutan baru setiap kali aplikasi dibuka/refresh, berdasarkan isi kolom PETUGAS.
      welcomeFieldOfficer(workingRows, { force: true });

      // Tampilkan tombol zoom
      if (workingRows.length > 0) {
        zoomBtn.style.display = "block";
      }

      // Auto zoom ke marker
      zoomToAllMarkers();
    });
  }
});

function zoomToAllMarkers() {
  if (!markers.length) return;
  const group = L.featureGroup(markers.map(m => m.marker));
  map.fitBounds(group.getBounds(), { padding: [40, 40] });
}
/* ======================
   FUNGSI FILTER MARKER HARI BACA
====================== */
function applyHariBacaFilter() {

  const showDIJ = document.getElementById("chkDIJ")?.checked ?? true;
  const showDIL  = document.getElementById("chkDIL")?.checked ?? true;

  markers.forEach(m => {

    let visible = true;

    // filter jenis marker
    if (m.type === "DIJ" && !showDIJ) visible = false;
    if (m.type === "DIL"  && !showDIL)  visible = false;

    // filter 1 hari baca
    if (filterHariBacaAktif) {
      const hari = getHariBaca(m.row);
      if (hari !== daftarHariBaca[indexHariBaca]) {
        visible = false;
      }
    }

    if (visible) {
      if (!clusterGroup.hasLayer(m.marker)) clusterGroup.addLayer(m.marker);
    } else {
      if (clusterGroup.hasLayer(m.marker)) clusterGroup.removeLayer(m.marker);
    }
  });

  document.getElementById("hariBacaLabel").innerText =
    filterHariBacaAktif
      ? `HARI BACA: ${daftarHariBaca[indexHariBaca]}`
      :"HARI BACA: ALL"

  renderVisibleMarkers();
}

function showNormalMarkers() {
  markers.forEach(m => {
    if (!clusterGroup.hasLayer(m.marker)) {
      addMarkerToMap(m.marker);
    }
  });
}
/* ======================
   VIEWPORT RENDER ENGINE
====================== */

function renderVisibleMarkers() {
  if (window.isCompareMode) return;

  const bounds = map.getBounds();

  markers.forEach(m => {

    let visible = true;

    // FILTER DIJ / DIL
    const showDIJ =
      document.getElementById("chkDIJ")?.checked ?? true;

    const showDIL =
      document.getElementById("chkDIL")?.checked ?? true;

    if (m.type === "DIJ" && !showDIJ) {
      visible = false;
    }

    if (m.type === "DIL" && !showDIL) {
      visible = false;
    }

    // FILTER HARI BACA
    if (filterHariBacaAktif) {

      const hari = getHariBaca(m.row);

      if (hari !== daftarHariBaca[indexHariBaca]) {
        visible = false;
      }
    }

    // VIEWPORT CHECK
    const latlng = m.marker.getLatLng();

    const insideViewport =
      bounds.contains(latlng);

    // ===== SHOW =====
    if (visible && insideViewport) {

      if (!clusterGroup.hasLayer(m.marker)) {
        clusterGroup.addLayer(m.marker);
      }

    }

    // ===== HIDE =====
    else {

      if (clusterGroup.hasLayer(m.marker)) {
        clusterGroup.removeLayer(m.marker);
      }

    }

  });

}

/* ======================
   SIMPAN STATE
====================== */
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workingRows));
}

/* ======================
   FILTER MARKER DIJ / DIL / HARI BACA
====================== */

function applyMarkerFilter() {
  if (!markers || markers.length === 0) return;

  const showDIJ =
    document.getElementById("chkDIJ")?.checked ?? true;

  const showDIL =
    document.getElementById("chkDIL")?.checked ?? true;

  const hariAktif =
    filterHariBacaAktif
      ? daftarHariBaca[indexHariBaca]
      : null;

  markers.forEach(m => {
    if (!m || !m.marker) return;

    let visible = true;

    // FILTER JENIS MARKER
    if (m.type === "DIJ" && !showDIJ) {
      visible = false;
    }

    if (m.type === "DIL" && !showDIL) {
      visible = false;
    }

    // FILTER HARI BACA
    if (visible && filterHariBacaAktif) {
      const hariRow = getHariBaca(m.row);

      if (hariRow !== hariAktif) {
        visible = false;
      }
    }

    // Tambahkan atau hapus marker dari cluster
    if (visible) {
      addMarkerToMap(m.marker);
    } else {
      if (clusterGroup.hasLayer(m.marker)) {
        clusterGroup.removeLayer(m.marker);
      }
    }
  });

  updateHariBacaLabel();
}
/* ======================
   FILTER SATU HARI BACA
====================== */

function applyHariBacaFilter() {
  applyMarkerFilter();
}
function nextHari(){
  if (!filterHariBacaAktif) return;
  if (!daftarHariBaca.length) return;

  indexHariBaca++;

  if (indexHariBaca >= daftarHariBaca.length) {
    indexHariBaca = 0;
  }

  applyHariBacaFilter();
}

function prevHari(){
  if (!filterHariBacaAktif) return;
  if (!daftarHariBaca.length) return;

  indexHariBaca--;

  if (indexHariBaca < 0) {
    indexHariBaca = daftarHariBaca.length - 1;
  }

  applyHariBacaFilter();
}


function updateHariBacaLabel() {
  const el = document.getElementById("hariBacaLabel");
  if (!el) return;

  el.innerText = filterHariBacaAktif
    ? `HARI BACA: ${daftarHariBaca[indexHariBaca]}`
    : "HARI BACA: ALL";
}

window.addEventListener("DOMContentLoaded", () => {

  const cb = document.getElementById("oneDayCheck");

  if (cb) {
    cb.onchange = e => {
      filterHariBacaAktif = e.target.checked;

      if (filterHariBacaAktif && daftarHariBaca.length === 0) {
        showToast("⚠️ Data hari baca kosong");

        cb.checked = false;
        filterHariBacaAktif = false;

        applyMarkerFilter();
        return;
      }

      indexHariBaca = 0;

      applyHariBacaFilter();
    };
  }

  const chkDIJ = document.getElementById("chkDIJ");
  const chkDIL = document.getElementById("chkDIL");

  if (chkDIJ) {
    chkDIJ.addEventListener("change", applyMarkerFilter);
  }

  if (chkDIL) {
    chkDIL.addEventListener("change", applyMarkerFilter);
  }

});


/* ======================
   TAMPILKAN NAMA FILE SAAT REFRESH
====================== */

function makeUrutanMarkerHTML(row, color) {
  const order = getUrutanBaca(row);
  const day = getHariBaca(row);
  const num = order === null ? "—" : String(order);
  const safeDay = String(day || "-").replace(/[^A-Z0-9-]/gi, "").slice(0, 2);
  const common = `color:${color};`;
  if (markerOrderStyle === "pin") {
    return `<div style="width:34px;height:42px;position:relative;filter:drop-shadow(0 2px 3px #0005)"><div style="position:absolute;inset:0 2px 5px 2px;background:${color};border:2px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg)"></div><div style="position:absolute;top:5px;left:0;width:30px;text-align:center;color:#fff;font-weight:800;font-size:12px;line-height:14px;text-shadow:0 1px 2px #000">${num}<br>${safeDay}</div></div>`;
  }
  if (markerOrderStyle === "box") {
    return `<div style="width:35px;height:37px;box-sizing:border-box;border-radius:7px;background:${color};border:2px solid #fff;box-shadow:0 2px 5px #0006;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:800;line-height:15px;text-shadow:0 1px 2px #000"><span style="font-size:15px">${num}</span><span style="font-size:10px">${safeDay}</span></div>`;
  }
  if (markerOrderStyle === "ring") {
    return `<div style="width:35px;height:35px;box-sizing:border-box;border-radius:50%;background:#fff;border:4px solid ${color};box-shadow:0 2px 5px #0006;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#172033;font-weight:800;line-height:12px"><span style="font-size:13px">${num}</span><span style="font-size:9px">${safeDay}</span></div>`;
  }
  // Default: lingkaran warna hari baca; checkbox mengatur tampil/sembunyi nomor.
  return `<div style="width:34px;height:34px;box-sizing:border-box;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 2px 5px #0006;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;font-weight:800;line-height:12px;text-shadow:0 1px 2px #000"><span style="font-size:14px">${showOrderNumbers ? num : ''}</span><span style="font-size:9px">${safeDay}</span></div>`;
}

function setMarkerOrderStyle(value) {
  markerOrderStyle = "circle";
  localStorage.setItem("oyon_marker_order_style", markerOrderStyle);
  if (workingRows.length) buildMarkers();
}

/* ======================
   BUILD MARKERS
====================== */
function buildMarkers(){
  // 🔥 HAPUS SEMUA MARKER LAMA DARI MAP
clusterGroup.clearLayers();

markers = [];
searchIndex = [];

  workingRows.forEach(row => {
    // ==========================
    // MARKER 1 — LOKASI DIJ
    // ==========================
    const lat = getDIJLat(row);
    const lng = getDIJLon(row);

    if(validCoordinatePair(lat, lng)){
      const hariBaca = getHariBaca(row);
      const color = getColor(hariBaca);


      const markerHTML = makeUrutanMarkerHTML(row, color);
      const markerSize = [35,35];
      const iconDIJ = L.divIcon({
        html: markerHTML,
        iconSize: markerSize,
        iconAnchor: [markerSize[0] / 2, markerSize[1] / 2],
        className: "urutan-baca-marker"
      });

      const markerDIJ = L.marker([lat, lng], { icon: iconDIJ, pane: "customerMarkerPane", zIndexOffset: 1000, riseOnHover: true });

      markerDIJ.bindTooltip(getMappedValue(row, "NAMA") || row.NAMA || "Pelanggan", {
        permanent: false,
        direction: "top",
        offset: [0, -10],
        opacity: 1,
        pane: "customerTooltipPane",
        className: "marker-label marker-label-top"
      });
      markerDIJ.on("mouseover", () => { markerDIJ.setZIndexOffset(5000); markerDIJ.openTooltip(); });
      markerDIJ.on("mouseout", () => { markerDIJ.setZIndexOffset(1000); });
      markerDIJ.on("click", () => openDetail(row));

      markers.push({
        marker: markerDIJ,
        row: row,
        type: "DIJ"
      });

            searchIndex.push({

          idpel: String(
            row.IDPEL || ""
          ).replace(/\D/g,""),

          meter: String(
            getNoMeter(row) || ""
          ).replace(/\D/g,""),

          marker: markerDIJ,

          row

        });

    }


    // ==========================
// MARKER 2 — LOKASI CADANGAN (sebelumnya DIL)
// ==========================
const latDIL = getDILLat(row);
const lonDIL = getDILLon(row);

const hasDILLocation = validCoordinatePair(latDIL, lonDIL);

if (hasDILLocation) {

  // ICON Lokasi Cadangan (WAJIB DULU)
  const iconDIL = L.divIcon({
    html: `<div class="custom-marker" style="background:#111827;border:2px solid #fff;box-shadow:0 0 0 2px #111827;width:13px;height:13px;border-radius:50%;box-sizing:border-box"></div>`,
    iconSize: [17, 17],
    iconAnchor: [8, 8],
    className: ""
  });

  // MARKER Lokasi Cadangan
  const markerDIL = L.marker([latDIL, lonDIL], { icon: iconDIL, pane: "customerMarkerPane", zIndexOffset: 1800, riseOnHover: true });

  markerDIL.bindTooltip(
    `<b>${getMappedValue(row, "NAMA") || row.NAMA || "Pelanggan"}</b><br>IDPEL: ${getMappedValue(row, "IDPEL") || row.IDPEL || "-"}`,
    {
      permanent: false,
      direction: "top",
      offset: [0, -10],
      opacity: 0.8,
      className: "marker-label"
    }
  );

  markerDIL.on("click", () => openDetail(row));

  markers.push({
    marker: markerDIL,
    row,
    type: "DIL"
  });
}

  }); // ← TUTUP workingRows.forEach

  // ===== KUMPULKAN HARI BACA UNIK (SETELAH BUILD MARKER) =====
daftarHariBaca = [...new Set(
  workingRows
    .map(r => getHariBaca(r))
    .filter(v => v)
)].sort();

// ⛔ JANGAN reset index kalau filter sudah aktif
if (!filterHariBacaAktif) {
  indexHariBaca = 0;
}

updateHariBacaLabel();
applyHariBacaFilter();
renderVisibleMarkers();

setTimeout(() => {
  renderVisibleMarkers();
}, 200);
}     // ← TUTUP function buildMarkers

/* ======================
markers.forEach(m => {
  if (m.marker && m.marker.addTo) {
    clusterGroup.addLayer(m.marker);
  }
});====================== */

/* ======================
   HIGHLIGHT MARKER
====================== */
function highlightMarker(marker){
  const el = marker.getElement();
  if(!el) return;

  el.classList.add("highlight");

  setTimeout(() => {
    el.classList.remove("highlight");
  }, 1500);
}

function showLabel(marker) {
  marker.openTooltip();

  setTimeout(() => {
    marker.closeTooltip();
  }, 4000); // nama tampil 4 detik lalu hilang otomatis
}


/* ======================
   SEARCH ENGINE V2
====================== */

searchBtn.onclick = runSearch;

searchInput.addEventListener("keydown", e => {

  if(e.key === "Enter"){
    runSearch();
  }

});

function runSearch(){

  // HAPUS POPUP LAMA
  document
    .getElementById("searchPopup")
    ?.remove();

  const key = searchInput.value
    .trim()
    .replace(/\D/g,"");

  // DEBUG
  console.log("SEARCH:", key);
  console.log("INDEX:", searchIndex);

  if(key.length < 4){

    showToast("Masukkan minimal 4 digit");
    return;

  }

  if(!searchIndex.length){

    showToast("Data belum siap");
    return;

  }

  // SEARCH FLEXIBLE
  const results = searchIndex.filter(o => {

      // kalau 4 digit → cocokkan belakang
      if(key.length <= 4){

        return (
          o.idpel.endsWith(key) ||
          o.meter.endsWith(key)
        );

      }

      // kalau lebih panjang → flexible
      return (

        o.idpel.includes(key) ||
        o.meter.includes(key)

      );

    });

  console.log("RESULTS:", results);

  // TIDAK ADA
  if(results.length === 0){

    showToast("Tidak ditemukan");
    return;

  }

  // SATU HASIL
  if(results.length === 1){

    focusSearchResult(results[0]);
    return;

  }

  // MULTI RESULT
  showSearchResults(results);

}

function focusSearchResult(found) {
  if (!found || !found.marker) return;

  if (!clusterGroup.hasLayer(found.marker)) {
    clusterGroup.addLayer(found.marker);
  }

  found.marker.bringToFront?.();

  map.flyTo(
    found.marker.getLatLng(),
    Math.max(map.getZoom(), 19),
    {
      duration: 0.5
    }
  );

  setTimeout(() => {

    found.marker.openTooltip();

    highlightMarker(found.marker);

    openDetail(found.row);

  }, 400);

  // AUTO MINIMIZE
  const uiBar =
    document.getElementById("uiBar");

  const toggleBtn =
    document.getElementById("toggleBtn");

  if(
    uiBar &&
    !uiBar.classList.contains("minimized")
  ){

    uiBar.classList.add("minimized");

    if(toggleBtn){
      toggleBtn.innerText = "➕";
    }

  }

}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}

function showSearchResults(results){

  document
    .getElementById("searchPopup")
    ?.remove();

  const popup =
    document.createElement("div");

  popup.id = "searchPopup";

  popup.innerHTML = `
    <div class="searchPopupCard">
      <div class="searchPopupTitle">Pilih Pelanggan</div>
      <div class="searchPopupSub">Ditemukan ${results.length} pelanggan yang cocok. Periksa akhiran IDPEL dan nomor meter sebelum memilih.</div>
      <div id="searchPopupItems"></div>
      <button type="button" class="searchPopupClose">Tutup</button>
    </div>`;

  results.forEach((r, i) => {

    const div =
      document.createElement("div");

    div.className =
      "searchResultItem";

    const idpelFull = String(getMappedValue(r.row, "IDPEL") || r.row.IDPEL || "");
    const meterFull = String(getNoMeter(r.row) || "");
    const idpelTail = idpelFull.slice(-6) || "-";
    const meterTail = meterFull.slice(-6) || "-";
    div.innerHTML = `
      <strong>${escapeHtml(String(getMappedValue(r.row, "NAMA") || r.row.NAMA || "-"))}</strong><br>
      IDPEL akhir: <b>${escapeHtml(idpelTail)}</b> <small>(${escapeHtml(idpelFull || "-")})</small><br>
      NOMET akhir: <b>${escapeHtml(meterTail)}</b> <small>(${escapeHtml(meterFull || "-")})</small><br>
      <span style="color:#2563eb;font-weight:700;font-size:12px;">Ketuk untuk tampilkan lokasi ↗</span>
    `;

    div.onclick = () => {

      focusSearchResult(r);

      popup.remove();

    };

    popup.querySelector("#searchPopupItems").appendChild(div);

  });
  popup.querySelector(".searchPopupClose").onclick = () => popup.remove();
  popup.addEventListener("click", e => { if (e.target === popup) popup.remove(); });
  document.body.appendChild(popup);

}

/* ======================
   ZOOM ALL
====================== */
zoomBtn.onclick = () => {
  const active = markers
    .map(m => m.marker)
    .filter(m => clusterGroup.hasLayer(m));

  if (!active.length) {
    showToast("Tidak ada marker aktif");
    return;
  }

  const group = L.featureGroup(active);
  map.fitBounds(group.getBounds(), { padding: [40,40] });
};

/* ======================
   DETAIL PANEL
====================== */
function openDetail(r){
  hasSelectedCustomer = true;
  // Simpan baris yang benar-benar dipilih agar IDPEL/NOMET duplikat tidak ikut terhapus bersamaan.
  window.currentDetailRow = r;
  const panel = document.getElementById("detailPanel");
  const left = document.getElementById("detailLeft");
  const right = document.getElementById("detailRight");

  /* FORCE SHOW MARKERS FOR COMPARE */

    // simpan IDPEL yang sedang dibuka (global state kecil)
  window.currentCompareIDPEL = String(getMappedValue(r, "IDPEL") || r.IDPEL || "");

  const cardHTML = (label, lat, lon, isDIL = false) => `
  <div class="${isDIL ? "card-DIL" : ""}">
    <div style="font-size:13px;color:${isDIL ? "#9ca3af" : "#666"};margin-bottom:4px">
      ${label}
    </div>

    <div style="
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:8px;
">

  <h3 style="margin:4px 0;flex:1">
    ${getMappedValue(r, "NAMA") || r.NAMA || "-"}
  </h3>

  <button
    style="
      background:#111827;
      color:white;
      border:none;
      padding:4px 8px;
      border-radius:6px;
      font-size:11px;
      cursor:pointer;
      white-space:nowrap;
    "
    onclick="copyText('${(r.NAMA || "").replace(/'/g,"\\'")}','Nama')">

    Copy Nama

  </button>

</div>
    <div style="display:flex;align-items:center;justify-content:space-between;">
  <span>🔢 NOMET: ${getNoMeter(r)}</span>

  <button
    style="
      background:#2563eb;
      color:white;
      border:none;
      padding:4px 8px;
      border-radius:6px;
      font-size:11px;
      cursor:pointer;
    "
    onclick="copyText('${getNoMeter(r)}','Nomor Meter')">

    Copy NOMET

  </button>
</div>

<div>⚡ DAYA: ${getMappedValue(r, "DAYA") || r.DAYA || "-"}</div>

<div>🔧 MERK: ${getMerkMeter(r)}</div>

<div style="
  display:flex;
  align-items:center;
  justify-content:space-between;
  margin-top:4px;
">

  <span>📟 IDPEL: ${getMappedValue(r, "IDPEL") || r.IDPEL || "-"}</span>

  <button
    style="
      background:#059669;
      color:white;
      border:none;
      padding:4px 8px;
      border-radius:6px;
      font-size:11px;
      cursor:pointer;
    "
    onclick="copyText('${r.IDPEL}','IDPEL')">

    Copy IDPEL

  </button>

</div>

<div style="
  display:flex;
  align-items:center;
  justify-content:space-between;
  margin-top:4px;
">

  <span>🪪 NIK: ${getMappedValue(r, "NIK") || r.NIK || "-"}</span>

  <button
    style="
      background:#7c3aed;
      color:white;
      border:none;
      padding:4px 8px;
      border-radius:6px;
      font-size:11px;
      cursor:pointer;
    "
    onclick="copyText('${r.NIK || ""}','NIK')">

    Copy NIK

  </button>

</div>

<div style="
  display:flex;
  align-items:center;
  justify-content:space-between;
  margin-top:4px;
">

  <span>📱 NO HP: ${r.NO_HP || r.NOHP || "-"}</span>

  <button
    style="
      background:#ea580c;
      color:white;
      border:none;
      padding:4px 8px;
      border-radius:6px;
      font-size:11px;
      cursor:pointer;
    "
    onclick="copyText('${r.NO_HP || r.NOHP || ""}','Nomor HP')">

    Copy NO HP

  </button>

</div>

<div>📅 HARI BACA: ${getHariBaca(r)}</div>

<div style="
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:8px;
  margin-top:4px;
">

  <span style="flex:1">
    🧭 ALAMAT:
    ${getMappedValue(r, "ALAMAT") || r.ALAMAT || "-"}
  </span>

  <button
    style="
      background:#0f766e;
      color:white;
      border:none;
      padding:4px 8px;
      border-radius:6px;
      font-size:11px;
      cursor:pointer;
      white-space:nowrap;
    "
    onclick="copyText(
      \`${(r.ALAMAT || "").replace(/`/g,"")}\`,
      'Alamat'
    )">

    Copy ALAMAT

  </button>

</div>

    <div style="margin-top:10px;display:flex;gap:6px;">
      ${
        (!isDIL || (lat && lon))
          ? `<button class="btn-go" onclick="goTo(${lat},${lon})">🧭 Tampil Rute</button>`
          : ``
      }
      <button class="btn-done" onclick="markDone('${r.IDPEL}')">✅ Selesai</button>
    </div>
  </div>
`;

  // tampilkan compare hanya sekali di atas
    left.innerHTML = cardHTML(
    "📍 Lokasi DIJ",
    getDIJLat(r),
    getDIJLon(r),
    false
    );

  const dilLat = getDILLat(r);
        const dilLon = getDILLon(r);

        if (validCoordinatePair(dilLat, dilLon)) {

        right.innerHTML = cardHTML(
            "📍 Lokasi Cadangan",
            dilLat,
            dilLon,
            true
        );

        } else {

        right.innerHTML = `
            <div style="
            padding:20px;
            text-align:center;
            color:#666;
            ">
            📭 Lokasi cadangan tidak tersedia
            </div>
        `;
        }

    panel.classList.add("open");
  }


function closeDetail(){
  document.getElementById("detailPanel").classList.remove("open");
  hasSelectedCustomer = false;
}

function toggleFullMap() {
  const uiBar = document.getElementById("uiBar");
  const detailPanel = document.getElementById("detailPanel");
  const btn = document.getElementById("fullMapBtn");

  isFullMap = !isFullMap;

  if (isFullMap) {
    // 🔥 MASUK MODE FULL MAP
    if (uiBar) uiBar.style.display = "none";
    if (detailPanel) detailPanel.classList.remove("open");

    btn.innerText = "📋 SHOW MENU";
    showToast("🗺️ Mode peta penuh");

  } else {
    // 🔥 KELUAR DARI FULL MAP
    if (uiBar) uiBar.style.display = "block";

    // hanya tampilkan bottom bar jika ada pelanggan aktif
    if (hasSelectedCustomer && detailPanel) {
      detailPanel.classList.add("open");
    }

    btn.innerText = "🗺️ FULL MAP";
    showToast("📍 Mode normal");
  }
}


/* ======================



function toggleCompare(checkbox) {
  const idpel = window.currentCompareIDPEL;
  if (!idpel) return;

  if (checkbox.checked) {
    const active = [];

    // 🔥 hide semua marker
    markers.forEach(m => {
      if (map.hasLayer(m.marker)) {
        clusterGroup.removeLayer(m.marker);
      }
    });

    // 🔥 tampilkan hanya marker pelanggan ini
    markers.forEach(m => {
      if (String(m.row.IDPEL) === String(idpel)) {
        addMarkerToMap(m.marker);
        active.push(m.marker);
      }
    });

    // zoom ke 2 marker
    if (active.length > 0) {
      const group = L.featureGroup(active);
      map.fitBounds(group.getBounds(), { padding: [60, 60] });
    }

    showToast("🔍 Mode bandingkan aktif");
  } else {
    // 🔥 KEMBALIKAN SESUAI CHECKBOX
    applyHariBacaFilter();
    showToast("📍 Semua marker ditampilkan kembali");
  }
}
====================== */

/* ======================
   minimize menu saat bandingkan
====================== */

function toggleCompare(checkbox) {
  const idpel = String(window.currentCompareIDPEL || "");
  if (!idpel) return;

  const uiBar = document.getElementById("uiBar");
  const toggleBtn = document.getElementById("toggleBtn");

  if (checkbox.checked) {
    // =========================
    // MODE BANDINGKAN ON
    // =========================
    window.isCompareMode = true;

    // auto minimize menu
    if (uiBar && !uiBar.classList.contains("minimized")) {
      uiBar.classList.add("minimized");
      if (toggleBtn) toggleBtn.innerText = "➕";
    }

    // sembunyikan semua marker
    markers.forEach(m => {
      if (clusterGroup.hasLayer(m.marker)) {
        clusterGroup.removeLayer(m.marker);
      }
    });

    // ambil 2 marker milik IDPEL aktif
    const activeMarkers = markers.filter(
      m => String(getMappedValue(m.row, "IDPEL") || m.row.IDPEL || "") === idpel
    );

    // tampilkan hanya marker tsb
    activeMarkers.forEach(m => {
      clusterGroup.addLayer(m.marker);
      setTimeout(() => {
      renderVisibleMarkers();
    }, 100);
    });

    // zoom ke 2 marker
    if (activeMarkers.length) {
      const group = L.featureGroup(activeMarkers.map(m => m.marker));
      map.flyToBounds(group.getBounds(), {
        padding: [80, 80],
        maxZoom: 19,
        duration: 0.5
      });
    }

    showToast("🔍 Mode bandingkan aktif");

  } else {
    exitCompareMode();
  }
}
function exitCompareMode() {
  window.isCompareMode = false;

  // bersihkan map
  markers.forEach(m => {
    if (clusterGroup.hasLayer(m.marker)) {
      clusterGroup.removeLayer(m.marker);
    }
  });

  // tampilkan kembali marker SESUAI FILTER
  applyHariBacaFilter();

  // restore menu
  const uiBar = document.getElementById("uiBar");
  const toggleBtn = document.getElementById("toggleBtn");

  if (uiBar && uiBar.classList.contains("minimized")) {
    uiBar.classList.remove("minimized");
    if (toggleBtn) toggleBtn.innerText = "➖";
  }

  showToast("📍 Mode bandingkan selesai");
}


function onFinishCompare() {
  const checkbox = document.getElementById("compareCheckbox");
  if (checkbox) checkbox.checked = false;

  exitCompareMode();
}


function minimizeMenu() {
  const panel = document.getElementById("uiContent");
  if (!panel) return;

  panel.classList.add("minimized");
}

/* ======================
   ROUTING
====================== */
function goTo(lat,lng){
  if(!userLatLng) return alert("GPS belum aktif");

  if(routingControl) map.removeControl(routingControl);

      routingControl = L.Routing.control({
      waypoints: [L.latLng(userLatLng), L.latLng(lat,lng)],
      addWaypoints: false,
      draggableWaypoints: false,
      createMarker: () => null
    }).addTo(map);


  document.getElementById("cancelRouteBtn").style.display="block";
}


function cancelRoute(){
  if(routingControl) map.removeControl(routingControl);
  routingControl = null;
  document.getElementById("cancelRouteBtn").style.display="none";
}

/* ======================
   DONE + HISTORY
====================== */
async function markDone(idpel) {
  if (window.isCompareMode) {
    const cb = document.querySelector('#detailPanel input[type="checkbox"]');
    if (cb) cb.checked = false;
    exitCompareMode();
  }
  idpel = String(idpel);
  const selectedRow = window.currentDetailRow;
  const found = selectedRow && workingRows.includes(selectedRow) && String(getMappedValue(selectedRow, "IDPEL") || selectedRow.IDPEL) === idpel
    ? selectedRow
    : workingRows.find(r => String(getMappedValue(r, "IDPEL") || r.IDPEL) === idpel);
  if (!found) { showToast("Pelanggan tidak ditemukan di daftar tersisa."); return; }

  // Ambil GPS aktual saat pekerjaan selesai. Jika izin/lokasi gagal, minta konfirmasi sebelum simpan tanpa GPS.
  let actualLat = "", actualLon = "", gpsAccuracy = "", gpsError = "";
  if (navigator.geolocation?.getCurrentPosition) {
    try {
      const pos = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true, timeout: 10000, maximumAge: 0
      }));
      actualLat = pos.coords.latitude;
      actualLon = pos.coords.longitude;
      gpsAccuracy = Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : "";
    } catch (err) {
      gpsError = err?.message || "GPS tidak tersedia";
      const proceed = window.confirm("GPS realisasi belum berhasil diambil. Tetap tandai selesai tanpa koordinat GPS aktual?\n\nPilih Batal untuk mencoba lagi.");
      if (!proceed) { showToast("Pekerjaan belum ditandai selesai. Coba lagi saat GPS siap."); return; }
    }
  } else {
    const proceed = window.confirm("Browser tidak mendukung GPS. Tetap tandai selesai tanpa koordinat GPS aktual?");
    if (!proceed) return;
    gpsError = "Geolocation tidak didukung";
  }

  const now = new Date();
  const dt = localDateTimeParts(now);
  const identity = completionIdentity(found);
  const dayKey = dt.dayKey;
  const alreadyToday = completedRecords.find(item => item.dayKey === dayKey && item.identity === identity);
  let completionId;
  if (alreadyToday) {
    // Tidak membuat duplikat untuk pelanggan sama pada hari yang sama.
    completionId = alreadyToday.completionId;
    Object.assign(alreadyToday, {
      row: found, completedAt: now.toISOString(), date: dt.date, time: dt.time,
      actualLat, actualLon, gpsAccuracy, gpsError, status: "Selesai"
    });
  } else {
    completionId = `done_${now.getTime()}_${Math.random().toString(36).slice(2, 8)}`;
    completedRecords.push({
      completionId, identity, dayKey, row: structuredClone(found),
      completedAt: now.toISOString(), date: dt.date, time: dt.time,
      actualLat, actualLon, gpsAccuracy, gpsError, status: "Selesai"
    });
  }
  if (!persistCompletedRecords()) {
    const proceed = window.confirm("Penyimpanan permanen gagal. Tetap lanjut menghapus pelanggan dari daftar tersisa? Disarankan pilih Batal, lalu Download Excel Update.");
    if (!proceed) return;
  }

  history.push({ row: found, time: dt.time, date: dt.date, completionId });
  localStorage.setItem("oyon_history", JSON.stringify(history));
  // Hapus hanya baris yang dipilih, bukan semua pelanggan yang kebetulan punya IDPEL sama.
  workingRows = workingRows.filter(r => r !== found);
  saveState();
  markers = markers.filter(obj => {
    if (obj.row === found) {
      if (map.hasLayer(obj.marker)) clusterGroup.removeLayer(obj.marker);
      return false;
    }
    return true;
  });
  renderHistory();
  closeDetail();
  if (actualLat !== "" && actualLon !== "") {
    showToast(`✅ Selesai tersimpan • GPS realisasi akurasi ±${Math.round(gpsAccuracy || 0)} m • ${dt.time}`);
  } else {
    showToast(`✅ Selesai tersimpan tanpa GPS aktual • ${dt.time}`);
  }
}

/* ======================
   DONE + HISTORY
====================== */
function renderHistory() {
  const el = document.getElementById("historyList");
  if (!el) return;

  if (!history || history.length === 0) {
    el.innerHTML = `
      <div style="padding:10px;color:#666;text-align:center">
        📭 Belum ada pelanggan selesai hari ini
      </div>`;
    return;
  }

  el.innerHTML = history.map((item, index) => `

  <div style="
    border-bottom:1px solid #eee;
    padding:8px;
    display:flex;
    justify-content:space-between;
    align-items:center;
  ">

    <div>

      <strong>${item.row.NAMA || "-"}</strong><br>

      NOMET: ${getNoMeter(item.row)}<br>

      MERK: ${getMerkMeter(item.row)}<br>

      HARI BACA: ${getHariBaca(item.row)}<br>

      <small>${item.time}</small>

    </div>

    <button
      onclick="undoHistory(${index})"
      style="
        background:#2563eb;
        color:white;
        border:none;
        padding:6px 10px;
        border-radius:8px;
        font-size:12px;
      "
    >
      Undo
    </button>

  </div>

`).join("");
}


function undoHistory(index) {
  const item = history[index];
  if (!item) return;

  // keluar dari compare mode
  if (window.isCompareMode) {
    const cb = document.getElementById("compareCheckbox");
    if (cb) cb.checked = false;
    exitCompareMode();
  }

  // kembalikan data
  workingRows.push(item.row);
  saveState();

  // Batalkan juga catatan realisasi yang terkait, bila masih ada.
  if (item.completionId) {
    completedRecords = completedRecords.filter(rec => rec.completionId !== item.completionId);
    persistCompletedRecords();
  }
  // hapus dari history
  history.splice(index, 1);
  localStorage.setItem("oyon_history", JSON.stringify(history));

  // 🔥 REBUILD DULU (INI KUNCI)
  buildMarkers();

  // 🔁 BARU SET FILTER HARI BACA
  const hariUndo = getHariBaca(item.row);
  const idx = daftarHariBaca.indexOf(hariUndo);

  if (idx !== -1) {
    filterHariBacaAktif = true;
    indexHariBaca = idx;
  }

  // 🔥 APPLY SETELAH STATE SIAP
  applyHariBacaFilter();

  renderHistory();
  showToast(`↩️ Dikembalikan ke HARI BACA ${hariUndo}`);
}





/* ======================
   TAMPILAN KEMBALI KE AREA TAGGING
====================== */

function saveMapView() {
  const center = map.getCenter();
  const zoom = map.getZoom();

  localStorage.setItem("RBM_MAP_VIEW", JSON.stringify({
    lat: center.lat,
    lng: center.lng,
    zoom: zoom
  }));
}

function restoreMapView() {
  const savedView = localStorage.getItem("RBM_MAP_VIEW");

  if (savedView) {
    const view = JSON.parse(savedView);
    map.setView([view.lat, view.lng], view.zoom);
  } else {
    zoomToAllMarkers(); // fallback
  }
}


/* ======================
   reset history 23.00
====================== */



function copyNomet(nomet){
  if (!nomet) return;

  navigator.clipboard.writeText(nomet)
    .then(() => showToast("📋 Nomor meter disalin"))
    .catch(() => showToast("❌ Gagal menyalin"));
}

function copyIDPEL(idpel){

  if (!idpel) return;

  navigator.clipboard.writeText(idpel)
    .then(() => showToast("📋 IDPEL disalin"))
    .catch(() => showToast("❌ Gagal menyalin IDPEL"));
}

/* ======================
   COPY ENGINE
====================== */

/* ======================
   COPY ENGINE AMAN
====================== */

function copyText(text, label = "Data") {
  const value = String(text ?? "").trim();

  if (!value || value === "-") {
    showToast(`❌ ${label} kosong`);
    return;
  }

  // Clipboard API utama
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(value)
      .then(() => {
        showToast(`📋 ${label} berhasil disalin`);
      })
      .catch(() => {
        fallbackCopyText(value, label);
      });

    return;
  }

  // Fallback untuk localhost/browser lama
  fallbackCopyText(value, label);
}


function fallbackCopyText(value, label) {
  const textarea = document.createElement("textarea");

  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";

  document.body.appendChild(textarea);

  textarea.focus();
  textarea.select();

  try {
    const success = document.execCommand("copy");

    if (success) {
      showToast(`📋 ${label} berhasil disalin`);
    } else {
      showToast(`❌ Gagal menyalin ${label}`);
    }
  } catch (error) {
    showToast(`❌ Gagal menyalin ${label}`);
  }

  document.body.removeChild(textarea);
}

/* ======================
   TOAST
====================== */
function showToast(msg){
  const t = document.getElementById("toast");
  t.innerHTML = msg;
  t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"),5000);
}
/* ======================
   FINISH DAN SIMPAN RBM UPDATE
====================== */

downloadBtn.onclick = () => {
  if (workingRows.length === 0 && completedRecords.length === 0) {
    showToast("⚠️ Tidak ada pelanggan tersisa atau realisasi selesai untuk diunduh");
    return;
  }
  const sampleRow = workingRows[0] || completedRecords[completedRecords.length - 1]?.row || {};
  const namaPetugas = String(
    getMappedValue(sampleRow, "PETUGAS") || sampleRow.PETUGAS || sampleRow.Petugas || sampleRow.petugas || sampleRow["KODE PETUGAS"] || "UNKNOWN"
  ).trim().replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, "_");
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const filename = `RBM_${namaPetugas}_${dd}-${mm}_${hh}-${min}.xlsx`;

  if (!Array.isArray(originalHeaders) || originalHeaders.length === 0) {
    const headerSet = new Set();
    workingRows.forEach(row => Object.keys(row || {}).forEach(key => headerSet.add(key)));
    completedRecords.forEach(item => Object.keys(item.row || {}).forEach(key => headerSet.add(key)));
    originalHeaders = [...headerSet];
  }
  const exportHeaders = [...originalHeaders];
  const normSet = new Set(exportHeaders.map(normalizeHeader));
  const hasAnyHeader = aliases => aliases.some(alias => normSet.has(normalizeHeader(alias)));
  const LAT_COMPARE_ALIASES = ["LAT PEMBANDING", "LAT DIL", "LAT PETUGAS", "LAT CADANGAN", "LATTH", "LATDIL", "LATITUDE DIL", "LATITUDE PEMBANDING", "LATITUDE PETUGAS", "LATITUDE CADANGAN"];
  const LON_COMPARE_ALIASES = ["LON PEMBANDING", "LON DIL", "LON PETUGAS", "LON CADANGAN", "LONTH", "LONDIL", "LONGITUDE DIL", "LONGITUDE PEMBANDING", "LONGITUDE PETUGAS", "LONGITUDE CADANGAN"];
  if (!hasAnyHeader(LAT_COMPARE_ALIASES)) { exportHeaders.push("LAT PEMBANDING"); normSet.add("LATPEMBANDING"); }
  if (!hasAnyHeader(LON_COMPARE_ALIASES)) { exportHeaders.push("LON PEMBANDING"); normSet.add("LONPEMBANDING"); }

  const getRowValueForHeader = (row, header) => {
    const exact = Object.keys(row || {}).find(k => normalizeHeader(k) === normalizeHeader(header));
    if (exact !== undefined) return row[exact] ?? "";
    const norm = normalizeHeader(header);
    if (["LATPEMBANDING", "LATDIL", "LATPETUGAS", "LATCADANGAN", "LATTH", "LATITUDEDIL", "LATITUDEPEMBANDING", "LATITUDEPETUGAS", "LATITUDECADANGAN"].includes(norm)) return getDILLat(row) ?? "";
    if (["LONPEMBANDING", "LONDIL", "LONPETUGAS", "LONCADANGAN", "LONTH", "LONGITUDEDIL", "LONGITUDEPEMBANDING", "LONGITUDEPETUGAS", "LONGITUDECADANGAN"].includes(norm)) return getDILLon(row) ?? "";
    const mappedCanonical = Object.keys(COLUMN_MAPPING_FIELDS).find(c => (COLUMN_MAPPING_FIELDS[c] || []).some(a => normalizeHeader(a) === norm));
    if (mappedCanonical) return getMappedValue(row, mappedCanonical) ?? "";
    return "";
  };
  const buildSheetRows = rows => [exportHeaders, ...rows.map(row => exportHeaders.map(header => {
    const value = getRowValueForHeader(row, header);
    return value == null ? "" : value;
  }))];
  const remainingSheet = XLSX.utils.aoa_to_sheet(buildSheetRows(workingRows));

  // Sheet realisasi memakai kolom RBM + titik GPS aktual + waktu selesai.
  const completedExtraHeaders = ["LAT REALISASI", "LON REALISASI", "AKURASI GPS (M)", "TANGGAL SELESAI", "JAM SELESAI", "WAKTU SELESAI ISO", "STATUS REALISASI", "CATATAN GPS"];
  const completedHeaders = [...exportHeaders];
  completedExtraHeaders.forEach(h => { if (!completedHeaders.some(x => normalizeHeader(x) === normalizeHeader(h))) completedHeaders.push(h); });
  const completedRows = completedRecords.map(item => {
    const row = item.row || {};
    const base = completedHeaders.map(header => {
      const n = normalizeHeader(header);
      if (n === "LATREALISASI") return item.actualLat === "" || item.actualLat == null ? "" : Number(item.actualLat);
      if (n === "LONREALISASI") return item.actualLon === "" || item.actualLon == null ? "" : Number(item.actualLon);
      if (n === "AKURASIGPSM") return item.gpsAccuracy === "" || item.gpsAccuracy == null ? "" : Number(item.gpsAccuracy);
      if (n === "TANGGALSELESAI") return item.date || "";
      if (n === "JAMSELESAI") return item.time || "";
      if (n === "WAKTUSELESAIISO") return item.completedAt || "";
      if (n === "STATUSREALISASI") return item.status || "Selesai";
      if (n === "CATATANGPS") return item.gpsError || "";
      const value = getRowValueForHeader(row, header);
      return value == null ? "" : value;
    });
    return base;
  });
  const completedSheet = XLSX.utils.aoa_to_sheet([completedHeaders, ...completedRows]);

  // Pertahankan tampilan desimal GPS di Excel jika format sumber masih tersedia.
  const gpsHeaderNorms = new Set(["LATDIJ","LONDIJ","LATDIL","LONDIL","LATPEMBANDING","LONPEMBANDING","LATPETUGAS","LONPETUGAS","LATCADANGAN","LONCADANGAN","LATTH","LONTH","LATREALISASI","LONREALISASI"]);
  const applyGpsFormats = (ws, headers, sourceRows, rowOffset=1) => {
    headers.forEach((header, c) => {
      if (!gpsHeaderNorms.has(normalizeHeader(header))) return;
      const sourceFormats = gpsNumberFormats[header] || [];
      for (let r=0; r<sourceRows.length; r++) {
        const cell = ws[XLSX.utils.encode_cell({r:r+rowOffset,c})];
        if (!cell || cell.v === "" || cell.v == null || typeof cell.v !== "number") continue;
        let fmt = sourceFormats[r] || "";
        if (!fmt) {
          const s = String(cell.v);
          const decimals = s.includes(".") ? s.split(".")[1].length : 0;
          if (decimals > 0 && decimals <= 15) fmt = "0." + "0".repeat(decimals);
        }
        if (fmt) cell.z = fmt;
      }
    });
  };
  applyGpsFormats(remainingSheet, exportHeaders, workingRows);
  applyGpsFormats(completedSheet, completedHeaders, completedRecords.map(x=>x.row || {}));
  const wb = XLSX.utils.book_new();
  wb.Props = { Title: "OYONID MAP EXPORT", Subject: "RBM tersisa dan realisasi pekerjaan kumulatif" };
  XLSX.utils.book_append_sheet(wb, remainingSheet, "Pelanggan Tersisa");
  XLSX.utils.book_append_sheet(wb, completedSheet, "Realisasi Selesai");
  XLSX.writeFile(wb, filename, { compression: true });
  showToast(`✅ Excel diunduh: ${workingRows.length} pelanggan tersisa, ${completedRecords.length} catatan realisasi kumulatif.`);
};

/* ======================
   GPS
====================== */
navigator.geolocation?.watchPosition(pos => {
  userLatLng = [pos.coords.latitude, pos.coords.longitude];

  const icon = L.divIcon({
    html: `
      <div class="petugas-marker">
        <img src="https://cdn-icons-png.flaticon.com/512/4140/4140048.png" />
      </div>
    `,
    iconSize: [38,38],
    iconAnchor: [19,19],
    className: ""
  });

  if (!petugasMarker) {
    petugasMarker = L.marker(userLatLng, { icon, pane: "petugasMarkerPane", zIndexOffset: -1000, interactive: false }).addTo(map);
    petugasMarker.bindTooltip("📍 Lokasi Anda", {
      permanent: false,
      direction: "top"
    });
  } else {
    petugasMarker.setLatLng(userLatLng);
  }

}, err => {
  console.warn("GPS error:", err);
}, {
  enableHighAccuracy: true,
  maximumAge: 1000,
  timeout: 10000
});

/* ======================
   COLOR MAP
====================== */
/* ======================
   COLOR MAP — A–Z UNIK
====================== */
function getColor(v){
  const colors = [
    "#22c55e", // A
    "#f97316", // B
    "#3b82f6", // C
    "#ef4444", // D
    "#a855f7", // E
    "#14b8a6", // F
    "#eab308", // G
    "#ec4899", // H
    "#6366f1", // I
    "#84cc16", // J
    "#06b6d4", // K
    "#f43f5e", // L
    "#7c3aed", // M
    "#f59e0b", // N
    "#0ea5e9", // O
    "#10b981", // P
    "#db2777", // Q
    "#65a30d", // R
    "#0284c7", // S
    "#dc2626", // T
    "#9333ea", // U
    "#059669", // V
    "#ca8a04", // W
    "#be123c", // X
    "#2563eb", // Y
    "#0891b2"  // Z
  ];

  if (!v) return "#64748b";

  const code = v.toUpperCase().charCodeAt(0) - 65;
  return colors[code] || "#64748b";
}


renderHistory();
window.addEventListener("DOMContentLoaded", () => {

  function openHistory(){
  const panel = document.getElementById("historyPanel");
  panel.style.display = "block";
  renderHistory();
}

function closeHistory(){
  const panel = document.getElementById("historyPanel");
  panel.style.display = "none";
}

document.getElementById("historyToggleBtn").onclick = openHistory;


});
/* ======================
   minimize btn
====================== */
window.addEventListener("DOMContentLoaded", () => {
  const uiBar = document.getElementById("uiBar");
  const toggleBtn = document.getElementById("toggleBtn");

  toggleBtn.onclick = () => {
    uiBar.classList.toggle("minimized");
    toggleBtn.innerText = uiBar.classList.contains("minimized") ? "➕" : "➖";
  };

  document.getElementById("fullMapBtn").onclick = toggleFullMap;
});


// Pengaturan nomor urutan baca (tersimpan lokal di browser).
(function initUrutanBacaControl() {
  const checkbox = document.getElementById("showOrderNumbers");
  if (!checkbox) return;
  checkbox.checked = showOrderNumbers;
  checkbox.addEventListener("change", () => {
    showOrderNumbers = checkbox.checked;
    localStorage.setItem("oyon_show_order_numbers", String(showOrderNumbers));
    if (workingRows.length) buildMarkers();
  });
})();

// Pengaturan judul kolom Excel dibuka dari tombol di samping Upload Excel.
document.addEventListener("DOMContentLoaded", () => {
  const applyMapBtn = document.getElementById("applyColumnMappingBtn");
  if (applyMapBtn) applyMapBtn.addEventListener("click", () => {
    applyColumnMapping();
    document.getElementById("columnMappingPanel")?.removeAttribute("open");
  });
  const details = document.getElementById("columnMappingPanel");
  if (details) details.addEventListener("toggle", () => { if (details.open) renderColumnMappingOptions(); });
  renderColumnMappingOptions();
});
