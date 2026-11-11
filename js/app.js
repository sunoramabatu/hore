window.OYONID_BUILD = "V13.1.22-GPS-RECOVERY-VIDEO-COMPAT";
console.info("[OYONID]", window.OYONID_BUILD);
window.onerror = function (msg, src, line, col, err) {
  alert("JS ERROR:\n" + msg + "\nLine: " + line);
  console.error(err);
};
/* ======================
   LOCAL-FIRST DATABASE (IndexedDB)
   localStorage remains as a compatibility fallback; IndexedDB is the durable primary mirror.
====================== */
const OYON_LOCAL_DB_NAME = "OYONID_LOCAL_FIRST_DB";
const OYON_LOCAL_DB_VERSION = 1;
let oyonLocalDbPromise = null;
function oyonOpenLocalDb() {
  if (!("indexedDB" in window)) return Promise.reject(new Error("IndexedDB tidak tersedia"));
  if (oyonLocalDbPromise) return oyonLocalDbPromise;
  oyonLocalDbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(OYON_LOCAL_DB_NAME, OYON_LOCAL_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv", { keyPath: "key" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("Gagal membuka database lokal"));
    req.onblocked = () => console.warn("[OYONID] Database lokal tertahan tab lain.");
  });
  return oyonLocalDbPromise;
}
async function oyonLocalPut(key, value) {
  const db = await oyonOpenLocalDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("kv", "readwrite");
    tx.objectStore("kv").put({ key, value, updatedAt: new Date().toISOString() });
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error || new Error("Gagal menyimpan database lokal"));
    tx.onabort = () => reject(tx.error || new Error("Penyimpanan lokal dibatalkan"));
  });
}
async function oyonLocalGet(key) {
  const db = await oyonOpenLocalDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("kv", "readonly");
    const req = tx.objectStore("kv").get(key);
    req.onsuccess = () => resolve(req.result ? req.result.value : undefined);
    req.onerror = () => reject(req.error || new Error("Gagal membaca database lokal"));
  });
}
function oyonMirrorLocal(key, value) {
  // Fire-and-forget mirror; localStorage remains a quick fallback for older app versions.
  oyonLocalPut(key, value).catch(err => console.warn(`[OYONID] IndexedDB write ${key} gagal:`, err));
}
async function oyonRestoreLocalFirstState() {
  try {
    const saved = await oyonLocalGet("workingRows");
    if (Array.isArray(saved) && saved.length) workingRows = saved;
    const source = await oyonLocalGet("sourceRows");
    if (Array.isArray(source) && source.length) originalRows = source;
    const headers = await oyonLocalGet("originalHeaders");
    if (Array.isArray(headers) && headers.length) originalHeaders = headers;
    const completed = await oyonLocalGet("completedRecords");
    if (Array.isArray(completed) && (completed.length || !completedRecords.length)) completedRecords = completed;
    const mapping = await oyonLocalGet("columnMapping");
    if (mapping && typeof mapping === "object") columnMapping = mapping;
    const formats = await oyonLocalGet("gpsNumberFormats");
    if (formats && typeof formats === "object") gpsNumberFormats = formats;
    const routes = await oyonLocalGet("routeSessions");
    if (Array.isArray(routes) && (routes.length || !v13RouteSessions.length)) v13RouteSessions = routes;
    const activeRoute = await oyonLocalGet("activeRoute");
    if (activeRoute && typeof activeRoute === "object") v13ActiveRoute = activeRoute;
    // Rebuild the current worklist from the saved source plus the cumulative completion ledger.
    if (originalRows.length) workingRows = filterAlreadyCompletedRows(structuredClone(originalRows));
    try {
      if (workingRows.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(workingRows));
      localStorage.setItem(COMPLETED_STORAGE_KEY, JSON.stringify(completedRecords));
      if (originalHeaders.length) localStorage.setItem("OYONID_ORIGINAL_HEADERS", JSON.stringify(originalHeaders));
      localStorage.setItem("oyon_column_mapping", JSON.stringify(columnMapping));
    } catch (e) { console.warn("[OYONID] localStorage fallback tidak cukup ruang", e); }
    return true;
  } catch (err) {
    console.warn("[OYONID] Restore IndexedDB gagal; memakai cadangan localStorage:", err);
    return false;
  }
}

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
  let localOk = true;
  try { localStorage.setItem(COMPLETED_STORAGE_KEY, JSON.stringify(completedRecords)); }
  catch (e) {
    localOk = false;
    console.warn("localStorage penuh; realisasi tetap dicadangkan ke IndexedDB", e);
  }
  // IndexedDB is the durable primary mirror and must still be attempted when localStorage is full.
  oyonMirrorLocal("completedRecords", completedRecords);
  if (!localOk) showToast("⚠️ Ruang localStorage terbatas. Data realisasi sedang disimpan ke database lokal perangkat.");
  return true;
}
function completionIdentity(row) {
  const idpel = String(getMappedValue(row, "IDPEL") || row.IDPEL || "").trim();
  const meter = String(getNoMeter(row) || "").trim();
  return `${idpel}|${meter}`;
}
function filterAlreadyCompletedRows(rows) {
  const doneKeys = new Set();
  v131AllCompletedRecords().forEach(item => {
    const key = item.identity || completionIdentity(item.row || {});
    if (key && key !== "|") doneKeys.add(String(key).trim());
  });
  return (Array.isArray(rows) ? rows : []).filter(row => {
    const key = completionIdentity(row);
    return !key || key === "|" || !doneKeys.has(key);
  });
}
function requestPersistentOyonStorage() {
  try {
    if (navigator.storage && typeof navigator.storage.persist === "function") {
      navigator.storage.persist().then(granted => {
        console.info("[OYONID] Persistent storage:", granted ? "granted" : "not granted");
      }).catch(err => console.warn("[OYONID] Storage persistence request failed", err));
    }
  } catch (err) { console.warn("[OYONID] Storage persistence unavailable", err); }
}
function v13ParseExcelCompletionDate(dateValue, timeValue, isoValue) {
  const dateText=String(dateValue??"").trim();
  let y=0,m=0,d=0;
  let match=dateText.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if(match){d=Number(match[1]);m=Number(match[2]);y=Number(match[3]);}
  else {
    match=dateText.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if(match){y=Number(match[1]);m=Number(match[2]);d=Number(match[3]);}
  }
  if(!y && typeof dateValue==="number" && dateValue>20000 && dateValue<80000 && window.XLSX?.SSF?.parse_date_code){
    const parts=XLSX.SSF.parse_date_code(dateValue);
    if(parts){y=parts.y;m=parts.m;d=parts.d;}
  }
  const timeText=String(timeValue??"").trim().replace(/\./g,":");
  const tm=timeText.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
  const hh=tm?Number(tm[1]):12, mm=tm?Number(tm[2]):0, ss=tm?Number(tm[3]||0):0;
  if(y&&m>=1&&m<=12&&d>=1&&d<=31){
    const localDate=new Date(y,m-1,d,hh,mm,ss,0);
    if(!Number.isNaN(localDate.getTime()) && localDate.getFullYear()===y && localDate.getMonth()===m-1 && localDate.getDate()===d){
      return {dayKey:`${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`,date:localDate,iso:localDate.toISOString()};
    }
  }
  const parsed=isoValue?new Date(isoValue):null;
  if(parsed&&!Number.isNaN(parsed.getTime())){
    const parts=localDateTimeParts(parsed);
    return {dayKey:parts.dayKey,date:parsed,iso:parsed.toISOString()};
  }
  return null;
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

let oyonUploadedWorkbook = null;
let oyonSelectedSheetName = "";
function oyonPopulateWorkbookSheetSelector(workbook) {
  const select = document.getElementById("workbookSheetSelect");
  if (!select || !workbook) return;
  select.innerHTML = "";
  if (!(workbook.SheetNames || []).length) {
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = "File Excel tidak memiliki sheet";
    select.appendChild(empty);
    oyonSelectedSheetName = "";
    return;
  }
  (workbook.SheetNames || []).forEach((name, index) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = `Sheet ${index + 1} — ${name}`;
    select.appendChild(option);
  });
  const savedChoice = localStorage.getItem("OYON_SELECTED_SHEET");
  const preferred = workbook.SheetNames.includes(savedChoice) ? savedChoice :
    (workbook.SheetNames.find(name => normalizeHeader(name) === normalizeHeader("Pelanggan Tersisa")) || workbook.SheetNames[0]);
  select.value = preferred;
  oyonSelectedSheetName = preferred;
}
function oyonSelectWorkbookSheet(sheetName) {
  if (!oyonUploadedWorkbook || !oyonUploadedWorkbook.Sheets[sheetName]) return;
  const sheet = oyonUploadedWorkbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  originalHeaders = raw.length ? raw[0].map(h => String(h ?? "").trim()) : [];
  gpsNumberFormats = {};
  const gpsNames = new Set(["LATDIJ","LONDIJ","LATDIL","LONDIL","LATPEMBANDING","LONPEMBANDING","LATPETUGAS","LONPETUGAS","LATCADANGAN","LONCADANGAN"]);
  originalHeaders.forEach((header,colIndex)=>{
    if(!gpsNames.has(normalizeHeader(header)))return;
    gpsNumberFormats[header]=[];
    for(let rowIndex=1;rowIndex<raw.length;rowIndex++){
      const cell=sheet[XLSX.utils.encode_cell({r:rowIndex,c:colIndex})];
      let fmt=cell&&cell.z&&cell.z!=="General"?cell.z:"";
      if(!fmt&&cell&&typeof cell.v==="number"){
        const str=String(cell.v),dec=str.includes(".")?str.split(".")[1].length:0;
        if(dec>0&&dec<=15)fmt="0."+"0".repeat(dec);
      }
      gpsNumberFormats[header].push(fmt);
    }
  });
  try{localStorage.setItem("OYONID_GPS_NUMBER_FORMATS",JSON.stringify(gpsNumberFormats));}catch(e){}
  originalRows = XLSX.utils.sheet_to_json(sheet, { defval: "" })
    .filter(row => Object.values(row || {}).some(v => String(v ?? "").trim() !== ""));
  const isCompletedSheet = normalizeHeader(sheetName) === normalizeHeader("Realisasi Selesai");
  workingRows = isCompletedSheet ? structuredClone(originalRows) : filterAlreadyCompletedRows(structuredClone(originalRows));
  oyonSelectedSheetName = sheetName;
  try {
    localStorage.setItem("OYONID_ORIGINAL_HEADERS", JSON.stringify(originalHeaders));
    localStorage.setItem("OYON_SELECTED_SHEET", sheetName);
    localStorage.setItem("OYONID_COLUMN_HEADERS_V1", JSON.stringify(originalHeaders));
  } catch(e) {}
  renderColumnMappingOptions();
  oyonMirrorLocal("sourceRows", originalRows);
  oyonMirrorLocal("originalHeaders", originalHeaders);
  saveState();
  buildMarkers();
  renderHistory();
  updateRealizationSummary();
  const status = document.getElementById("statusText");
  if (status) {
    moveOyonOverlayOutsideMenu(status);
    status.textContent = `📄 ${sheetName}: ${originalRows.length} baris • ${workingRows.length} data ditampilkan`;
    status.classList.add("upload-status-visible");
    clearTimeout(window.oyonUploadStatusTimer);
    window.oyonUploadStatusTimer = setTimeout(() => {
      status.classList.remove("upload-status-visible");
      status.textContent = "";
    }, 4000);
  }
  zoomToAllMarkers();
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
  let rememberedHeaders = [];
  try { rememberedHeaders = JSON.parse(localStorage.getItem("OYONID_COLUMN_HEADERS_V1") || "[]"); } catch(e) {}
  const headers = [...new Set([...(originalHeaders || []), ...rememberedHeaders, ...Object.keys(workingRows[0] || {}), ...Object.values(columnMapping || {})].filter(Boolean))];
  if (!headers.length) { host.innerHTML = '<div style="font-size:12px;color:#64748b;">Upload Excel terlebih dahulu. Pengaturan kolom akan tersimpan setelah file dimuat.</div>'; return; }
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
  localStorage.setItem("OYONID_COLUMN_HEADERS_V1", JSON.stringify(originalHeaders || []));
  oyonMirrorLocal("columnMapping", columnMapping);
  oyonMirrorLocal("originalHeaders", originalHeaders || []);
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
const clearSearchBtn = document.getElementById("clearSearchBtn");
clearSearchBtn?.addEventListener("click", () => { searchInput.value=""; searchInput.focus(); document.getElementById("searchResults").innerHTML=""; });
searchInput?.addEventListener("input", () => { if(clearSearchBtn) clearSearchBtn.style.display=searchInput.value ? "grid" : "none"; });

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
  btn.style.cssText = 'width:100%;min-width:76px;height:42px;border:0;border-radius:12px;background:linear-gradient(145deg,#2563eb,#0757c8);color:white;font-size:12px;display:flex;flex-direction:row;align-items:center;justify-content:center;gap:5px;cursor:pointer;box-shadow:0 4px 10px rgba(0,0,0,.18);';
  btn.onclick = openBarcodeScanner;
  const slot=document.getElementById("barcodeButtonSlot");
  if(slot) slot.appendChild(btn); else searchBtn.insertAdjacentElement("afterend",btn);
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
        <button id="barcodeFocusBtn" type="button" style="padding:12px 16px;border:0;border-radius:10px;font-weight:700;">🎯 Fokus ulang</button>
        <button id="barcodeTorchBtn" type="button" style="padding:12px 16px;border:0;border-radius:10px;font-weight:700;">🔦 Nyalakan flash</button>
      </div>
      <div style="width:min(92vw,460px);color:#ddd;text-align:center;font-size:12px;margin-top:8px;">Zoom, fokus, dan flash hanya tersedia jika didukung kamera HP. Dekatkan kamera perlahan sampai garis barcode tajam.</div>
      <button id="barcodeCloseBtn" type="button" style="margin-top:16px;width:min(92vw,460px);height:48px;border:0;border-radius:12px;background:#ef4444;color:white;font-size:17px;font-weight:700;">✕ Tutup Scanner</button>
    </div>`;
  document.body.appendChild(modal);
  document.getElementById("barcodeCloseBtn").onclick = closeBarcodeScanner;
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
  const torchBtn = document.getElementById("barcodeTorchBtn");
  if (torchBtn) {
    torchBtn.style.display = "inline-block";
    // Some Android browsers do not report torch in getCapabilities even when applyConstraints may work.
    torchBtn.disabled = false;
    torchBtn.title = caps.torch ? "Nyalakan atau matikan lampu kamera" : "Coba lampu kamera; dukungan bergantung pada browser dan kamera yang dipilih";
    torchBtn.textContent = barcodeTorchOn ? "💡 Matikan lampu" : "🔦 Coba lampu";
  }
  const focusBtn = document.getElementById("barcodeFocusBtn");
  if (focusBtn) {
    focusBtn.style.display = "inline-block";
    focusBtn.title = (caps.focusMode || caps.focusDistance) ? "Minta kamera fokus ulang" : "Browser tidak menyediakan kontrol fokus manual untuk kamera ini";
  }
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
  const btn = document.getElementById("barcodeFocusBtn");
  try {
    const caps = barcodeTrack.getCapabilities?.() || {};
    let applied = false;
    if (Array.isArray(caps.focusMode) && caps.focusMode.includes("single-shot")) {
      await barcodeTrack.applyConstraints({ advanced: [{ focusMode: "single-shot" }] });
      applied = true;
    } else if (Array.isArray(caps.focusMode) && caps.focusMode.includes("continuous")) {
      await barcodeTrack.applyConstraints({ advanced: [{ focusMode: "continuous" }] });
      applied = true;
    } else {
      // Try continuous autofocus even if the browser's capability report is incomplete.
      try {
        await barcodeTrack.applyConstraints({ advanced: [{ focusMode: "continuous" }] });
        applied = true;
      } catch (e) { /* browser does not expose focus controls */ }
    }
    if (caps.focusDistance && Number.isFinite(caps.focusDistance.min) && Number.isFinite(caps.focusDistance.max)) {
      const current = barcodeTrack.getSettings?.().focusDistance;
      const near = Math.min(caps.focusDistance.max, Math.max(caps.focusDistance.min, current ?? caps.focusDistance.min));
      await barcodeTrack.applyConstraints({ advanced: [{ focusDistance: near }] });
      applied = true;
    }
    if (applied) {
      if (btn) { btn.textContent = "🎯 Fokus diminta"; setTimeout(() => { if (btn && barcodeScannerOpen) btn.textContent = "🎯 Fokus ulang"; }, 1200); }
      showToast("🎯 Perintah fokus dikirim ke kamera. Hasilnya tergantung dukungan HP/browser.");
    } else {
      showToast("Kamera HP/browser tidak menyediakan kontrol fokus manual. Gerakkan HP perlahan sampai barcode tajam.");
    }
  } catch (e) { showToast("Kamera menolak kontrol fokus. Coba gerakkan HP perlahan mendekat/menjauh."); }
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


function moveOyonOverlayOutsideMenu(element) {
  if (!element || !document.body) return element;
  const menu = document.getElementById("uiBar");
  if (menu && menu.contains(element)) document.body.appendChild(element);
  return element;
}

// Portal popup elements outside the scrollable menu to prevent clipping on mobile.
window.addEventListener("DOMContentLoaded", () => {
  moveOyonOverlayOutsideMenu(document.getElementById("welcomeMessage"));
  moveOyonOverlayOutsideMenu(document.getElementById("statusText"));
  moveOyonOverlayOutsideMenu(document.getElementById("toast"));
});
moveOyonOverlayOutsideMenu(document.getElementById("welcomeMessage"));
moveOyonOverlayOutsideMenu(document.getElementById("statusText"));
function welcomeFieldOfficer(rows, options = {}) {
  const host = moveOyonOverlayOutsideMenu(document.getElementById("welcomeMessage"));
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
  // Popup sambutan tampil singkat di tengah layar; suara tidak menahan popup.
  window.clearTimeout(window.oyonWelcomeTimer);
  window.oyonWelcomeTimer = window.setTimeout(() => {
    if (host) { host.classList.remove("welcome-visible"); window.setTimeout(() => { host.style.display = "none"; }, 180); }
  }, 3000);
  const hideAfterVoice = () => {};
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

let realizationMediaRecorder = null;
let realizationMediaStream = null;
let realizationMediaChunks = [];
let realizationVideoMime = "";
let realizationCaptureTimer = null;
let realizationCaptureCanvas = null;

function setRealizationVideoUI(recording) {
  const start = document.getElementById("quickVideoStartBtn");
  const stop = document.getElementById("quickVideoStopBtn");
  if (start) start.disabled = !!recording;
  if (stop) stop.disabled = !recording;
}
function chooseRealizationVideoMime() {
  if (typeof MediaRecorder === "undefined") return "";
  return ["video/mp4;codecs=avc1.42E01E", "video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"]
    .find(type => MediaRecorder.isTypeSupported(type)) || "";
}
function finishRealizationVideoDownload() {
  if (!realizationMediaChunks.length) {
    showToast("Tidak ada data video yang berhasil direkam.");
    return;
  }
  const mime = realizationMediaRecorder?.mimeType || realizationVideoMime || "video/webm";
  const isMp4 = mime.toLowerCase().includes("mp4");
  const blob = new Blob(realizationMediaChunks, { type: mime });
  if (!blob.size) { showToast("File video kosong. Coba rekam ulang."); return; }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `OYONID_Realisasi_${localDateTimeParts().dayKey}.${isMp4 ? "mp4" : "webm"}`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 15000);
  showToast(isMp4 ? "Video MP4 berhasil dibuat dan diunduh." : "Video berhasil diunduh sebagai WebM. Browser HP ini belum mendukung ekspor MP4 langsung.");
}
async function startMapCanvasRecording() {
  if (typeof html2canvas !== "function") {
    throw new Error("Perekam layar browser tidak tersedia dan modul perekam peta belum termuat.");
  }
  const stage = document.body;
  const width = Math.max(320, window.innerWidth || document.documentElement.clientWidth);
  const height = Math.max(480, window.innerHeight || document.documentElement.clientHeight);
  realizationCaptureCanvas = document.createElement("canvas");
  realizationCaptureCanvas.width = Math.min(1080, width * 1.5);
  realizationCaptureCanvas.height = Math.min(1920, height * 1.5);
  const ctx = realizationCaptureCanvas.getContext("2d");
  const stream = realizationCaptureCanvas.captureStream(15);
  realizationMediaStream = stream;
  let frameBusy = false;
  const drawFrame = async () => {
    if (frameBusy || !realizationMediaRecorder || realizationMediaRecorder.state !== "recording") return;
    frameBusy = true;
    try {
      const shot = await html2canvas(stage, {
        backgroundColor: "#e9e5dd", useCORS: true, scale: 1,
        width, height, windowWidth: width, windowHeight: height,
        scrollX: 0, scrollY: 0, logging: false
      });
      ctx.clearRect(0, 0, realizationCaptureCanvas.width, realizationCaptureCanvas.height);
      ctx.drawImage(shot, 0, 0, realizationCaptureCanvas.width, realizationCaptureCanvas.height);
      const track = stream.getVideoTracks()[0];
      track?.requestFrame?.();
    } catch (e) { console.warn("[OYONID] App frame capture failed", e); }
    finally { frameBusy = false; }
  };
  await drawFrame();
  realizationCaptureTimer = setInterval(drawFrame, 140);
}
async function startRealizationScreenRecording() {
  if (typeof MediaRecorder === "undefined") {
    showToast("Browser ini tidak menyediakan pembuat video. Gunakan Chrome terbaru atau perekam layar Android.");
    return;
  }
  try {
    realizationVideoMime = chooseRealizationVideoMime();
    realizationMediaChunks = [];
    // Desktop/browser yang mendukung screen-share merekam layar secara langsung.
    if (navigator.mediaDevices?.getDisplayMedia) {
      try {
        realizationMediaStream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 24 }, audio: false });
      } catch (screenError) {
        // Android sering menolak/ tidak menyediakan getDisplayMedia; lanjutkan dengan rekaman area peta.
        console.info("[OYONID] Screen capture unavailable; using map canvas fallback.", screenError);
        await startMapCanvasRecording();
      }
    } else {
      await startMapCanvasRecording();
    }
    if (!realizationMediaStream) throw new Error("Stream video tidak berhasil dibuat.");
    realizationMediaRecorder = new MediaRecorder(realizationMediaStream, realizationVideoMime ? { mimeType: realizationVideoMime } : undefined);
    realizationMediaRecorder.ondataavailable = event => {
      if (event.data?.size) realizationMediaChunks.push(event.data);
    };
    realizationMediaRecorder.onerror = event => {
      console.error("[OYONID] Video recorder error", event);
      stopRealizationScreenRecording(false);
      showToast("Perekaman video gagal. Coba ulangi.");
    };
    realizationMediaRecorder.onstop = () => {
      if (realizationCaptureTimer) clearInterval(realizationCaptureTimer);
      realizationCaptureTimer = null;
      finishRealizationVideoDownload();
      realizationMediaStream?.getTracks().forEach(track => track.stop());
      realizationMediaStream = null;
      realizationMediaRecorder = null;
      realizationMediaChunks = [];
      realizationCaptureCanvas = null;
      setRealizationVideoUI(false);
    };
    realizationMediaRecorder.start(800);
    setRealizationVideoUI(true);
    showToast("Perekaman dimulai. Tekan Simpan video untuk mengakhiri dan mengunduh.");
    realizationMediaStream.getVideoTracks()[0]?.addEventListener("ended", () => {
      if (realizationMediaRecorder?.state === "recording") realizationMediaRecorder.stop();
    }, { once: true });
  } catch (err) {
    console.error("[OYONID] Start video failed", err);
    if (realizationCaptureTimer) clearInterval(realizationCaptureTimer);
    realizationCaptureTimer = null;
    realizationMediaStream?.getTracks().forEach(track => track.stop());
    realizationMediaStream = null;
    realizationMediaRecorder = null;
    setRealizationVideoUI(false);
    showToast("Video tidak bisa dimulai: " + (err?.message || "izin kamera/layar ditolak."));
  }
}
function stopRealizationScreenRecording(showMessage = true) {
  if (realizationMediaRecorder && realizationMediaRecorder.state !== "inactive") {
    realizationMediaRecorder.stop();
    if (showMessage) showToast("Menyiapkan video… file akan diunduh setelah selesai.");
  } else {
    if (realizationCaptureTimer) clearInterval(realizationCaptureTimer);
    realizationCaptureTimer = null;
    realizationMediaStream?.getTracks().forEach(track => track.stop());
    realizationMediaStream = null;
    setRealizationVideoUI(false);
  }
}


// Foto lokasi: metadata di localStorage, file foto di IndexedDB agar tidak cepat memenuhi kuota.
const OYON_PHOTO_META_KEY = "oyon_route_photos_v1";
const OYON_PHOTO_DB = "oyon_route_photo_db_v1";
let v13ShownPhotoIds = new Set();
function v13OpenPhotoDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(OYON_PHOTO_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore("photos");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function v13SavePhotoBlob(id, blob) {
  const db = await v13OpenPhotoDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("photos", "readwrite");
    tx.objectStore("photos").put(blob, id);
    tx.oncomplete = () => { db.close(); resolve(true); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
async function v13GetPhotoBlob(id) {
  const db = await v13OpenPhotoDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("photos", "readonly");
    const req = tx.objectStore("photos").get(id);
    req.onsuccess = () => { const value = req.result; db.close(); resolve(value || null); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}
function v13PhotoMetadata() {
  try { return JSON.parse(localStorage.getItem(OYON_PHOTO_META_KEY) || "[]"); }
  catch (e) { return []; }
}
function v13GetCurrentGPS() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("GPS tidak didukung perangkat."));
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy || "" }),
      err => reject(err), { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}
async function v13HandleLocationPhoto(file) {
  if (!file || !file.type.startsWith("image/")) return;
  try {
    const gps = await v13GetCurrentGPS();
    const image = new Image();
    const tempUrl = URL.createObjectURL(file);
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = tempUrl; });
    const maxSide = 1920, scale = Math.min(1, maxSide / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(tempUrl);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.88));
    if (!blob) throw new Error("Foto gagal dikompres.");
    const id = "photo_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
    await v13SavePhotoBlob(id, blob);
    const now = new Date();
    const meta = v13PhotoMetadata();
    meta.push({ id, lat: gps.lat, lon: gps.lon, accuracy: gps.accuracy, at: now.toISOString(), dayKey: localDateTimeParts(now).dayKey, name: file.name || "Foto lokasi" });
    localStorage.setItem(OYON_PHOTO_META_KEY, JSON.stringify(meta));
    showToast("📸 Foto lokasi tersimpan bersama koordinat GPS.");
  } catch (err) {
    console.error("[OYONID] Save location photo failed", err);
    showToast("Foto belum tersimpan: " + (err?.message || "GPS/foto tidak tersedia."));
  }
}
function v13PlaybackPhotoMetadata() {
  const result=v13PhotoMetadata().map(photo=>({...photo,type:"Foto Lokasi"}));
  const customerMeta=oyonCustomerPhotoMeta();
  const completed=v13CompletedForDate();
  Object.entries(customerMeta||{}).forEach(([key,meta])=>{
    const match=completed.find(item=>item.identity===meta.identity ||
      (item.row && oyonCustomerPhotoIdentity(item.row)===meta.identity));
    if(!match || !v13ValidActual(match))return;
    result.push({
      id:key,dayKey:match.dayKey,at:match.completedAt||meta.at||"",
      lat:parseCoordinate(match.actualLat),lon:parseCoordinate(match.actualLon),
      accuracy:match.gpsAccuracy||"",type:meta.type==="meter"?"Foto Meteran":"Foto Rumah",
      name:meta.name||"Foto pelanggan",identity:meta.identity
    });
  });
  // The Excel data-URL is the authoritative fallback. It works even when IndexedDB metadata
  // was not restored or the browser cleared its local photo database.
  completed.forEach(item=>{
    const row=item.row||{};
    const identity=item.identity||oyonCustomerPhotoIdentity(row);
    [["FOTO RUMAH DATA","house"],["FOTO METER DATA","meter"]].forEach(([header,type])=>{
      const key=Object.keys(row).find(k=>normalizeHeader(k)===normalizeHeader(header));
      const dataUrl=key?String(row[key]||"").trim():"";
      if(!/^data:image\//i.test(dataUrl))return;
      const id=`excel_${identity}_${type}`;
      if(result.some(p=>p.id===id))return;
      result.push({
        id,dayKey:item.dayKey,at:item.completedAt||"",
        lat:parseCoordinate(item.actualLat),lon:parseCoordinate(item.actualLon),
        accuracy:item.gpsAccuracy||"",type:type==="meter"?"Foto Meteran":"Foto Rumah",
        name:type==="meter"?"Foto Meter":"Foto Rumah",identity,dataUrl
      });
    });
  });
  return result;
}
async function v13LoadPlaybackPhotoBlob(photo) {
  if(photo?.dataUrl && /^data:image\//i.test(photo.dataUrl)){
    const response=await fetch(photo.dataUrl);
    if(!response.ok)throw new Error("Foto Excel tidak dapat dibaca.");
    return await response.blob();
  }
  return await v13GetPhotoBlob(photo?.id);
}
async function v13ShowPhotosAtPlayback(entry) {
  const point = entry?.point;
  if (!point || !Number.isFinite(Number(point.lat)) || !Number.isFinite(Number(point.lon))) return;
  const playbackTime = new Date(point.at).getTime();
  if (!Number.isFinite(playbackTime)) return;
  const photos = v13PlaybackPhotoMetadata().filter(photo => {
    if (photo.dayKey !== v13SelectedDate()) return false;
    if (point.identity && photo.identity && point.identity === photo.identity) return true;
    const photoTime = new Date(photo.at).getTime();
    if (!Number.isFinite(photoTime) || photoTime > playbackTime + 5000) return false;
    const distance = v13Distance({lat:Number(point.lat),lon:Number(point.lon)}, {lat:Number(photo.lat),lon:Number(photo.lon)});
    return distance <= 250 && Math.abs(playbackTime-photoTime) <= 45*60*1000;
  }).sort((a,b) => {
    const here={lat:Number(point.lat),lon:Number(point.lon)};
    const da=v13Distance(here,{lat:Number(a.lat),lon:Number(a.lon)});
    const db=v13Distance(here,{lat:Number(b.lat),lon:Number(b.lon)});
    return da-db || Math.abs(playbackTime-new Date(a.at).getTime())-Math.abs(playbackTime-new Date(b.at).getTime());
  });
  const photo=photos[0], box=document.getElementById("playbackPhotoBox");
  if(!box)return;
  if(!photo){
    v13PlaybackPhotoRequestToken++;v13CurrentPlaybackPhotoId=null;
    const img=document.getElementById("playbackPhotoImage");
    const caption=document.getElementById("playbackPhotoCaption");
    if(img){img.removeAttribute("src");img.style.display="none";}
    if(caption)caption.textContent="Belum ada foto untuk titik pelanggan ini";
    box.classList.add("is-visible");
    return;
  }
  if(photo.id===v13CurrentPlaybackPhotoId)return;
  const requestToken=++v13PlaybackPhotoRequestToken;
  v13CurrentPlaybackPhotoId=photo.id;
  try {
    const blob=await v13LoadPlaybackPhotoBlob(photo); if(!blob||requestToken!==v13PlaybackPhotoRequestToken)return;
    if(v13PlaybackPhotoObjectUrl)URL.revokeObjectURL(v13PlaybackPhotoObjectUrl);
    v13PlaybackPhotoObjectUrl=URL.createObjectURL(blob);
    const img=document.getElementById("playbackPhotoImage");
    const caption=document.getElementById("playbackPhotoCaption");
    if(img){img.src=v13PlaybackPhotoObjectUrl;img.style.display="block";}
    if(caption)caption.textContent=`${photo.name||photo.type||"Foto pelanggan"}${photo.at?` • ${new Date(photo.at).toLocaleTimeString("id-ID")}`:""}`;
    box.classList.add("is-visible");
  } catch(e){console.warn("[OYONID] Playback photo could not be loaded",e);}
}


/* ======================
   FOTO RUMAH / METER PELANGGAN
   File disimpan di IndexedDB; versi ringkas base64 ikut diekspor ke Excel.
====================== */
const OYON_CUSTOMER_PHOTO_META_KEY = "oyon_customer_photos_v1";
let oyonPendingCustomerPhotoType = "house";
function oyonCustomerPhotoIdentity(row) {
  const id = String(getMappedValue(row, "IDPEL") || row?.IDPEL || "").trim();
  const meter = String(getNoMeter(row) || row?.NOMORKWH || row?.NOMOR_METER || "").trim();
  return `${id}|${meter}`;
}
function oyonCustomerPhotoKey(identity, type) { return `customer_${type}_${identity}`; }
function oyonCustomerPhotoMeta() {
  try { return JSON.parse(localStorage.getItem(OYON_CUSTOMER_PHOTO_META_KEY) || "{}"); }
  catch (e) { return {}; }
}
function oyonSaveCustomerPhotoMeta(meta) {
  localStorage.setItem(OYON_CUSTOMER_PHOTO_META_KEY, JSON.stringify(meta));
}
function openCustomerPhotoChooser() {
  if (!window.currentDetailRow) { showToast("Pilih pelanggan terlebih dahulu."); return; }
  document.getElementById("customerPhotoChooser")?.classList.add("open");
}
function closeCustomerPhotoChooser() { document.getElementById("customerPhotoChooser")?.classList.remove("open"); }
function startCustomerPhotoCapture(type) {
  oyonPendingCustomerPhotoType = type === "meter" ? "meter" : "house";
  closeCustomerPhotoChooser();
  const input = document.getElementById("customerPhotoInput");
  if (input) { input.value = ""; input.click(); }
}
async function oyonCompressCustomerPhoto(file) {
  const image = new Image(); const url = URL.createObjectURL(file);
  try {
    await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=url;});
    for (const maxSide of [220, 170, 130]) {
      const scale=Math.min(1,maxSide/Math.max(image.width,image.height));
      const canvas=document.createElement("canvas");
      canvas.width=Math.max(1,Math.round(image.width*scale));
      canvas.height=Math.max(1,Math.round(image.height*scale));
      canvas.getContext("2d").drawImage(image,0,0,canvas.width,canvas.height);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/jpeg",0.38));
      if(blob && blob.size<21000) return blob;
    }
    throw new Error("Ukuran foto terlalu besar untuk kolom Excel.");
  } finally { URL.revokeObjectURL(url); }
}
async function handleCustomerPhotoFile(file) {
  if (!file || !window.currentDetailRow) return;
  try {
    const row=window.currentDetailRow, identity=oyonCustomerPhotoIdentity(row);
    if (!identity || identity === "|") throw new Error("IDPEL/nomor meter pelanggan tidak ditemukan.");
    const blob=await oyonCompressCustomerPhoto(file);
    const key=oyonCustomerPhotoKey(identity,oyonPendingCustomerPhotoType);
    await v13SavePhotoBlob(key,blob);
    const meta=oyonCustomerPhotoMeta();
    meta[key]={ identity, type:oyonPendingCustomerPhotoType, idpel:String(getMappedValue(row,"IDPEL")||row.IDPEL||""),
      meter:String(getNoMeter(row)||""), at:new Date().toISOString(), name:file.name||"Foto pelanggan" };
    oyonSaveCustomerPhotoMeta(meta);
    showToast(oyonPendingCustomerPhotoType === "house" ? "📸 Foto rumah pelanggan tersimpan." : "📸 Foto meter pelanggan tersimpan.");
  } catch(err) { console.error("Customer photo:",err); showToast("Foto gagal disimpan: "+(err.message||"coba lagi")); }
}
async function oyonBlobToDataUrl(blob) {
  if (!blob) return "";
  return await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||""));r.onerror=reject;r.readAsDataURL(blob);});
}
async function oyonAttachCustomerPhotos(rows) {
  const result=[];
  for (const source of rows || []) {
    const row={...(source||{})}; const identity=oyonCustomerPhotoIdentity(row);
    for (const [type,header] of [["house","FOTO RUMAH DATA"],["meter","FOTO METER DATA"]]) {
      const key=oyonCustomerPhotoKey(identity,type);
      try { const blob=await v13GetPhotoBlob(key); row[header]=blob ? await oyonBlobToDataUrl(blob) : (row[header]||""); }
      catch(e) { row[header]=row[header]||""; }
    }
    result.push(row);
  }
  return result;
}
async function oyonImportCustomerPhotosFromWorkbook(wb) {
  const jobs=[];
  for (const sheetName of wb.SheetNames || []) {
    const rows=XLSX.utils.sheet_to_json(wb.Sheets[sheetName],{defval:""});
    for (const row of rows) {
      const identity=oyonCustomerPhotoIdentity(row); if(!identity||identity==="|") continue;
      for (const [header,type] of [["FOTO RUMAH DATA","house"],["FOTO METER DATA","meter"]]) {
        const foundKey=Object.keys(row||{}).find(k=>normalizeHeader(k)===normalizeHeader(header));
        const value=foundKey?row[foundKey]:"";
        if(typeof value!=="string" || !/^data:image\//i.test(value.trim())) continue;
        try {
          const blob=await (await fetch(value.trim())).blob();
          const key=oyonCustomerPhotoKey(identity,type); await v13SavePhotoBlob(key,blob);
          const meta=oyonCustomerPhotoMeta();
          meta[key]={identity,type,idpel:String(row.IDPEL||""),meter:String(row.NOMORKWH||row.NOMOR_METER||row.NOMOR_METER||""),at:String(row["WAKTU SELESAI ISO"]||row["WAKTU REALISASI ISO"]||new Date().toISOString()),name:type==="house"?"Foto Rumah (Excel)":"Foto Meter (Excel)"};
          oyonSaveCustomerPhotoMeta(meta);
        } catch(e) { console.warn("Foto Excel tidak dapat dipulihkan",e); }
      }
    }
  }
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
  reader.onload = async evt => {
    const wb = XLSX.read(new Uint8Array(evt.target.result), { type: "array" });
    oyonUploadedWorkbook = wb;

    // Isi daftar sheet segera setelah workbook terbaca. Impor foto berjalan
    // setelahnya agar kelambatan/kegagalan ekstraksi gambar tidak mengunci
    // selector pada placeholder "Upload Excel terlebih dahulu".
    oyonPopulateWorkbookSheetSelector(wb);
    const sheet = wb.Sheets[oyonSelectedSheetName || wb.SheetNames[0]];

    // Foto adalah proses tambahan; kegagalannya tidak membatalkan pemuatan Excel.
    try {
      await oyonImportCustomerPhotosFromWorkbook(wb);
    } catch (photoImportError) {
      console.warn("[OYONID] Impor foto dari Excel dilewati:", photoImportError);
      showToast("⚠️ Data Excel dimuat, tetapi sebagian foto gagal diimpor.");
    }

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
localStorage.setItem("OYONID_COLUMN_HEADERS_V1", JSON.stringify(originalHeaders));
oyonMirrorLocal("originalHeaders", originalHeaders);
oyonMirrorLocal("gpsNumberFormats", gpsNumberFormats);

// Sheet 1 = daftar pelanggan aktif/tersisa.
originalRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
oyonMirrorLocal("sourceRows", originalRows);

// Sheet 2 = daftar realisasi yang sudah selesai. Jangan hanya membaca sheet pertama.
const completedSheetName = wb.SheetNames.find(name =>
  normalizeHeader(name) === normalizeHeader("Realisasi Selesai")
);
const importedCompletedRows = completedSheetName
  ? XLSX.utils.sheet_to_json(wb.Sheets[completedSheetName], { defval: "" })
      .filter(row => Object.values(row || {}).some(value => String(value ?? "").trim() !== ""))
  : [];
if (importedCompletedRows.length) {
  const importedAt = new Date();
  importedCompletedRows.forEach((row, index) => {
    const identity = completionIdentity(row);
    if (!identity || identity === "|") return;
    const iso = row["WAKTU SELESAI ISO"] || row["WAKTU REALISASI ISO"] || row.completedAt || "";
    const dateText = row["TANGGAL SELESAI"] || row["TANGGAL REALISASI"] || "";
    const timeText = row["JAM SELESAI"] || row["JAM REALISASI"] || "";
    const parsedInfo = v13ParseExcelCompletionDate(dateText,timeText,iso);
    const dayKey = parsedInfo?.dayKey || localDateTimeParts(importedAt).dayKey;
    const completionId = String(row.completionId || `sheet2_${identity}_${dayKey}`);
    const importedRecord = {
      completionId, identity, dayKey, row: structuredClone(row),
      completedAt: parsedInfo?.iso || "",
      date: String(dateText || ""), time: String(timeText || ""),
      actualLat: row["LAT REALISASI"] ?? row.actualLat ?? "",
      actualLon: row["LON REALISASI"] ?? row.actualLon ?? "",
      gpsAccuracy: row["AKURASI GPS HP (M)"] ?? row.gpsAccuracy ?? "",
      gpsError: row["CATATAN GPS"] || "", status: "Selesai"
    };
    // Replace a prior imported/local copy for this customer so an old, wrong date cannot survive re-upload.
    const existingIndex = completedRecords.findIndex(item => item.identity === identity);
    if(existingIndex>=0) completedRecords[existingIndex] = {...completedRecords[existingIndex],...importedRecord};
    else completedRecords.push(importedRecord);
  });
  persistCompletedRecords();
}

// Salin daftar aktif dan singkirkan yang sudah tercatat selesai di sheet 2 atau penyimpanan HP.
workingRows = filterAlreadyCompletedRows(structuredClone(originalRows));
    saveState();

    buildMarkers();
    renderHistory();
    welcomeFieldOfficer(workingRows, { force: true });

    const diag = window.OYONID_MARKER_DIAGNOSTIC || { totalRows: workingRows.length, dijCreated: 0, dijInvalid: workingRows.length, backupCreated: 0 };
    const localMatchedDoneCount = Math.max(0, originalRows.length - workingRows.length);
    const alreadyDoneCount = Math.max(importedCompletedRows.length, localMatchedDoneCount);
    if (statusText) {
      moveOyonOverlayOutsideMenu(statusText);
      const sheet2Info = completedSheetName
        ? `${alreadyDoneCount} sudah selesai (termasuk Sheet 2)`
        : `${alreadyDoneCount} sudah selesai (riwayat HP)`;
      statusText.innerText = diag.dijCreated > 0
        ? `✅ ${originalRows.length} dibaca • ${sheet2Info} • ${workingRows.length} tersisa • ${diag.dijCreated} marker DIJ • ${diag.backupCreated} cadangan • ${diag.dijInvalid} koordinat DIJ tidak valid`
        : `⚠️ ${originalRows.length} dibaca • ${sheet2Info} • ${workingRows.length} tersisa, tetapi 0 marker DIJ dibuat. Periksa LAT/LON dan format koordinat.`;
      statusText.classList.add("upload-status-visible");
      window.clearTimeout(window.oyonUploadStatusTimer);
      window.oyonUploadStatusTimer = window.setTimeout(() => {
        statusText.classList.remove("upload-status-visible");
        statusText.textContent = "";
      }, 4000);
    }
    zoomBtn.style.display = diag.dijCreated > 0 ? "block" : "none";

    // auto zoom setelah upload
    zoomToAllMarkers();
  };
  reader.onerror = () => {
    console.error("[OYONID] Gagal membaca file Excel:", reader.error);
    showToast("❌ File Excel gagal dibaca. Coba pilih file sekali lagi.");
  };
  reader.readAsArrayBuffer(file);
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
window.addEventListener("load", async () => {
  requestPersistentOyonStorage();
  await oyonRestoreLocalFirstState();

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
    workingRows = filterAlreadyCompletedRows(JSON.parse(saved));
    saveState();

    map.whenReady(() => {
      buildMarkers();
      renderHistory();
      renderColumnMappingOptions();
      positionRouteRecordButton();
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
  // V13.1.3: viewport is managed by Leaflet.markercluster.
  // Do NOT remove off-screen customer markers here: doing so before fitBounds
  // makes them disappear permanently until another rebuild.
  if (window.isCompareMode) return;

  const showDIJ = document.getElementById("chkDIJ")?.checked ?? true;
  const showDIL = document.getElementById("chkDIL")?.checked ?? true;

  markers.forEach(item => {
    let visible = true;
    if (item.type === "DIJ" && !showDIJ) visible = false;
    if (item.type === "DIL" && !showDIL) visible = false;
    if (filterHariBacaAktif && getHariBaca(item.row) !== daftarHariBaca[indexHariBaca]) {
      visible = false;
    }

    if (visible) {
      if (!clusterGroup.hasLayer(item.marker)) clusterGroup.addLayer(item.marker);
    } else if (clusterGroup.hasLayer(item.marker)) {
      clusterGroup.removeLayer(item.marker);
    }
  });
}

/* ======================
   SIMPAN STATE
====================== */
function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(workingRows)); } catch (e) { console.warn("[OYONID] localStorage worklist penuh", e); }
  oyonMirrorLocal("workingRows", workingRows);
  if (Array.isArray(originalRows) && originalRows.length) oyonMirrorLocal("sourceRows", originalRows);
}

// Safety autosave: primary writes happen immediately; these events provide a final backup attempt.
function flushOyonidLocalState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workingRows));
    localStorage.setItem("oyon_history", JSON.stringify(history));
    localStorage.setItem(COMPLETED_STORAGE_KEY, JSON.stringify(completedRecords));
  } catch (e) { console.warn("Autosave OYONID localStorage tidak berhasil", e); }
  oyonMirrorLocal("workingRows", workingRows);
  oyonMirrorLocal("sourceRows", originalRows);
  oyonMirrorLocal("completedRecords", completedRecords);
  oyonMirrorLocal("columnMapping", columnMapping);
  oyonMirrorLocal("originalHeaders", originalHeaders);
}
window.addEventListener("pagehide", flushOyonidLocalState);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flushOyonidLocalState(); });

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

  let v1313DijCreated = 0;
  let v1313DijInvalid = 0;
  let v1313BackupCreated = 0;

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
      v1313DijCreated++;

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
  v1313BackupCreated++;
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
  const dijCount = markers.filter(item => item && item.type === "DIJ" && item.marker).length;
  const backupCount = markers.filter(item => item && item.type === "DIL" && item.marker).length;
  window.OYONID_MARKER_DIAGNOSTIC = {
    totalRows: workingRows.length,
    dijCreated: dijCount,
    dijInvalid: Math.max(0, workingRows.length - dijCount),
    backupCreated: backupCount
  };
  console.info("[OYONID] Marker diagnostic", window.OYONID_MARKER_DIAGNOSTIC);
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
function positionRouteRecordButton() {
  const btn = document.getElementById("routeRecordFloatBtn");
  const panel = document.getElementById("detailPanel");
  if (!btn) return;
  if (panel && panel.classList.contains("open")) {
    const rect = panel.getBoundingClientRect();
    const gap = 12;
    const bottom = Math.max(12, window.innerHeight - rect.top + gap);
    btn.style.setProperty("bottom", `calc(${bottom}px + env(safe-area-inset-bottom, 0px))`, "important");
  } else {
    btn.style.setProperty("bottom", "calc(16px + env(safe-area-inset-bottom, 0px))", "important");
  }
}
window.addEventListener("resize", () => requestAnimationFrame(positionRouteRecordButton));
window.addEventListener("load", () => {
  const panel = document.getElementById("detailPanel");
  if (panel && "ResizeObserver" in window) {
    const observer = new ResizeObserver(() => requestAnimationFrame(positionRouteRecordButton));
    observer.observe(panel);
    window.oyonDetailPanelObserver = observer;
  }
});

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
      ${!isDIL ? `<button class="btn-customer-photo" type="button" onclick="openCustomerPhotoChooser()">📷 Foto</button>` : ``}
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
    requestAnimationFrame(positionRouteRecordButton);
  }


function closeDetail(){
  document.getElementById("detailPanel").classList.remove("open");
  hasSelectedCustomer = false;
  requestAnimationFrame(positionRouteRecordButton);
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
      const rawAccuracy = Number(pos.coords.accuracy);
      const candidateAccuracy = Number.isFinite(rawAccuracy) && rawAccuracy > 0 ? rawAccuracy : "";
      if (candidateAccuracy !== "" && candidateAccuracy > 60) {
        gpsError = `Akurasi GPS terlalu rendah (${Math.round(candidateAccuracy)} m)`;
        const proceedWithoutGps = window.confirm(`Akurasi GPS saat ini ±${Math.round(candidateAccuracy)} meter.\n\nSimpan pekerjaan selesai TANPA koordinat realisasi? Pilih Batal untuk mencoba GPS lagi.`);
        if (!proceedWithoutGps) { showToast("Pekerjaan belum ditandai selesai. Coba lagi di area terbuka."); return; }
      } else {
        actualLat = pos.coords.latitude;
        actualLon = pos.coords.longitude;
        gpsAccuracy = candidateAccuracy;
      }
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
  const previousCompletedSnapshot = alreadyToday ? structuredClone(alreadyToday) : null;
  if (alreadyToday) {
    completionId = alreadyToday.completionId;
    Object.assign(alreadyToday, {
      row: structuredClone(found), completedAt: now.toISOString(), date: dt.date, time: dt.time,
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
    if (previousCompletedSnapshot) {
      const pos = completedRecords.findIndex(item => item.completionId === completionId);
      if (pos >= 0) completedRecords[pos] = previousCompletedSnapshot;
    } else {
      completedRecords = completedRecords.filter(item => item.completionId !== completionId);
    }
    showToast("⚠️ Realisasi gagal tersimpan di HP. Pelanggan tetap di daftar; coba lagi atau unduh cadangan.");
    return;
  }

  history.push({ row: structuredClone(found), time: dt.time, date: dt.date, completionId,
    completedAt: now.toISOString(), actualLat, actualLon, gpsAccuracy, gpsError, dayKey });
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
function historySortTimestamp(item) {
  const iso = Date.parse(item?.completedAt || "");
  if (Number.isFinite(iso)) return iso;
  const idMatch = String(item?.completionId || "").match(/^done_(\\d+)/);
  if (idMatch) return Number(idMatch[1]);
  const parsed = Date.parse(`${String(item?.dayKey || "")}T${String(item?.time || "").replace(/\\./g, ":")}`);
  return Number.isFinite(parsed) ? parsed : 0;
}
function renderHistory() {
  const el = document.getElementById("historyList");
  if (!el) return;
  if (!history || history.length === 0) {
    el.innerHTML = `<div style="padding:10px;color:#666;text-align:center">📭 Belum ada pelanggan selesai hari ini</div>`;
    return;
  }
  const newestFirst = history.map((item, originalIndex) => ({ item, originalIndex }))
    .sort((a, b) => historySortTimestamp(b.item) - historySortTimestamp(a.item));
  el.innerHTML = newestFirst.map(({ item, originalIndex }) => `
    <div style="border-bottom:1px solid #eee;padding:8px;display:flex;justify-content:space-between;align-items:center;">
      <div>
        <strong>${String(item.row?.NAMA || "-").replace(/[<>]/g, "")}</strong><br>
        NOMET: ${String(getNoMeter(item.row) || "-").replace(/[<>]/g, "")}<br>
        MERK: ${String(getMerkMeter(item.row) || "-").replace(/[<>]/g, "")}<br>
        HARI BACA: ${String(getHariBaca(item.row) || "-").replace(/[<>]/g, "")}<br>
        <small>${String(item.time || "-")}</small>
      </div>
      <button onclick="undoHistory(${originalIndex})" style="background:#2563eb;color:white;border:none;padding:6px 10px;border-radius:8px;font-size:12px;">Undo</button>
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
  if (!t) return;
  t.textContent = String(msg ?? "");
  t.classList.add("show");
  window.clearTimeout(window.oyonToastTimer);
  window.oyonToastTimer = window.setTimeout(() => t.classList.remove("show"), 4000);
}
function v131AllCompletedRecords() {
  const records = Array.isArray(completedRecords) ? completedRecords.slice() : [];
  const seen = new Set(records.map(x => x.completionId ? "id:" + x.completionId : "key:" + (x.dayKey || "") + "|" + (x.identity || "")));
  (Array.isArray(history) ? history : []).forEach((h, index) => {
    const row = h.row || h;
    const identity = completionIdentity(row);
    const dayKey = h.dayKey || (h.completedAt ? localDateTimeParts(new Date(h.completedAt)).dayKey : localDateTimeParts().dayKey);
    const completionId = h.completionId || "";
    const key = completionId ? "id:" + completionId : "key:" + dayKey + "|" + identity;
    if (seen.has(key)) return;
    seen.add(key);
    records.push({
      completionId: completionId || "legacy_" + dayKey + "_" + index,
      identity, dayKey, row: structuredClone(row), completedAt: h.completedAt || "",
      date: h.date || "", time: h.time || "", actualLat: h.actualLat ?? "",
      actualLon: h.actualLon ?? "", gpsAccuracy: h.gpsAccuracy ?? "",
      gpsError: h.gpsError || "Riwayat lama: GPS realisasi tidak tersedia", status: "Selesai"
    });
  });
  return records;
}

/* ======================
   FINISH DAN SIMPAN RBM UPDATE
====================== */

downloadBtn.onclick = async () => {
  const completedForExport = v131AllCompletedRecords();
  if (workingRows.length === 0 && completedForExport.length === 0) {
    showToast("⚠️ Tidak ada pelanggan tersisa atau realisasi selesai untuk diunduh");
    return;
  }
  const sampleRow = workingRows[0] || completedForExport[completedForExport.length - 1]?.row || {};
  const namaPetugas = String(
    getMappedValue(sampleRow, "PETUGAS") || sampleRow.PETUGAS || sampleRow.Petugas || sampleRow.petugas || sampleRow["KODE PETUGAS"] || "UNKNOWN"
  ).trim().replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, "_");
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const filename = `RBM_${namaPetugas}_${dd}-${mm}_${hh}-${min}.xlsx`;

  // Reconcile the saved header list with actual row keys. This prevents stale header
  // metadata from causing duplicate empty LAT/LON PEMBANDING columns after re-upload.
  const headerCandidates = [
    ...(Array.isArray(originalHeaders) ? originalHeaders : []),
    ...workingRows.flatMap(row => Object.keys(row || {})),
    ...completedForExport.flatMap(item => Object.keys(item.row || {}))
  ];
  const exportHeaders = [];
  const headerNorms = new Set();
  for (const candidate of headerCandidates) {
    const label = String(candidate ?? "").trim();
    const norm = normalizeHeader(label);
    if (!label || !norm || headerNorms.has(norm)) continue;
    headerNorms.add(norm);
    exportHeaders.push(label);
  }
  originalHeaders = [...exportHeaders];
  try { localStorage.setItem("OYONID_ORIGINAL_HEADERS", JSON.stringify(originalHeaders)); } catch (e) {}
  const normSet = new Set(exportHeaders.map(normalizeHeader));
  const hasAnyHeader = aliases => aliases.some(alias => normSet.has(normalizeHeader(alias)));
  const LAT_COMPARE_ALIASES = ["LAT PEMBANDING", "LAT DIL", "LAT PETUGAS", "LAT CADANGAN", "LATTH", "LATDIL", "LATITUDE DIL", "LATITUDE PEMBANDING", "LATITUDE PETUGAS", "LATITUDE CADANGAN"];
  const LON_COMPARE_ALIASES = ["LON PEMBANDING", "LON DIL", "LON PETUGAS", "LON CADANGAN", "LONTH", "LONDIL", "LONGITUDE DIL", "LONGITUDE PEMBANDING", "LONGITUDE PETUGAS", "LONGITUDE CADANGAN"];
  if (!hasAnyHeader(LAT_COMPARE_ALIASES)) { exportHeaders.push("LAT PEMBANDING"); normSet.add("LATPEMBANDING"); }
  if (!hasAnyHeader(LON_COMPARE_ALIASES)) { exportHeaders.push("LON PEMBANDING"); normSet.add("LONPEMBANDING"); }

  ["FOTO RUMAH DATA", "FOTO METER DATA"].forEach(h => {
    if (!exportHeaders.some(x => normalizeHeader(x) === normalizeHeader(h))) exportHeaders.push(h);
  });

  const compareHeaderNorms = new Set([
    "LATPEMBANDING", "LONPEMBANDING", "LATDIL", "LONDIL",
    "LATPETUGAS", "LONPETUGAS", "LATCADANGAN", "LONCADANGAN",
    "LATTH", "LONTH", "LATITUDEPEMBANDING", "LONGITUDEPEMBANDING",
    "LATITUDEDIL", "LONGITUDEDIL", "LATITUDEPETUGAS", "LONGITUDEPETUGAS",
    "LATITUDECADANGAN", "LONGITUDECADANGAN"
  ]);
  const getRowValueForHeader = (row, header) => {
    const keys = Object.keys(row || {});
    const norm = normalizeHeader(header);
    // Exact source column wins even when its cell is empty.
    const exact = keys.find(k => normalizeHeader(k) === norm);
    if (exact !== undefined) return row[exact] == null ? "" : row[exact];

    // Read an existing alias only; never infer/fill a missing comparison coordinate.
    if (compareHeaderNorms.has(norm)) {
      const latAliases = ["LAT PEMBANDING", "LAT DIL", "LAT PETUGAS", "LAT CADANGAN", "LATTH", "LATDIL", "LATITUDE PEMBANDING", "LATITUDE DIL", "LATITUDE PETUGAS", "LATITUDE CADANGAN"];
      const lonAliases = ["LON PEMBANDING", "LON DIL", "LON PETUGAS", "LON CADANGAN", "LONTH", "LONDIL", "LONGITUDE PEMBANDING", "LONGITUDE DIL", "LONGITUDE PETUGAS", "LONGITUDE CADANGAN"];
      const aliases = norm.startsWith("LAT") ? latAliases : lonAliases;
      const sourceKey = keys.find(k => aliases.some(alias => normalizeHeader(alias) === normalizeHeader(k)));
      return sourceKey === undefined || row[sourceKey] == null ? "" : row[sourceKey];
    }

    const mappedCanonical = Object.keys(COLUMN_MAPPING_FIELDS).find(c =>
      (COLUMN_MAPPING_FIELDS[c] || []).some(alias => normalizeHeader(alias) === norm)
    );
    if (mappedCanonical) {
      const value = getMappedValue(row, mappedCanonical);
      return value == null ? "" : value;
    }
    return "";
  };
  const workingRowsWithPhotos = await oyonAttachCustomerPhotos(workingRows);
  const completedForExportWithPhotos = await Promise.all(completedForExport.map(async item => ({
    ...item, row: (await oyonAttachCustomerPhotos([item.row || {}]))[0]
  })));
  const buildSheetRows = rows => [exportHeaders, ...rows.map(row => exportHeaders.map(header => {
    const value = getRowValueForHeader(row, header);
    return value == null ? "" : value;
  }))];
  const remainingSheet = XLSX.utils.aoa_to_sheet(buildSheetRows(workingRowsWithPhotos));

  // Sheet realisasi memakai kolom RBM + titik GPS aktual + waktu selesai.
  const completedExtraHeaders = ["LAT REALISASI", "LON REALISASI", "JARAK DIJ KE REALISASI (M)", "AKURASI GPS HP (M)", "TANGGAL SELESAI", "JAM SELESAI", "WAKTU SELESAI ISO", "STATUS REALISASI", "CATATAN GPS"];
  const completedHeaders = [...exportHeaders];
  completedExtraHeaders.forEach(h => {
    const norm = normalizeHeader(h);
    const exists = completedHeaders.some(x => {
      const current = normalizeHeader(x);
      if (norm === "AKURASIGPSHP(M)") return current.startsWith("AKURASI") && (current.includes("GPS") || current.includes("GPT") || current.includes("HP"));
      return current === norm;
    });
    if (!exists) completedHeaders.push(h);
  });
  const completedRows = completedForExportWithPhotos.map(item => {
    const row = item.row || {};
    const base = completedHeaders.map(header => {
      const n = normalizeHeader(header);
      if (n === "LATREALISASI") return item.actualLat === "" || item.actualLat == null ? "" : Number(item.actualLat);
      if (n === "LONREALISASI") return item.actualLon === "" || item.actualLon == null ? "" : Number(item.actualLon);
      if (n === "JARAKDIJ KEREALISASI(M)".replace(/\s/g, "")) {
        const lat1 = parseCoordinate(getDIJLat(row)), lon1 = parseCoordinate(getDIJLon(row));
        const lat2 = parseCoordinate(item.actualLat), lon2 = parseCoordinate(item.actualLon);
        if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return "";
        const rad = v => v * Math.PI / 180;
        const dLat = rad(lat2-lat1), dLon = rad(lon2-lon1);
        const a = Math.sin(dLat/2)**2 + Math.cos(rad(lat1))*Math.cos(rad(lat2))*Math.sin(dLon/2)**2;
        return Math.round(6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * 10) / 10;
      }
      if (n.startsWith("AKURASI") && (n.includes("GPS") || n.includes("GPT") || n.includes("HP"))) {
        const accuracy = Number(item.gpsAccuracy);
        return item.gpsAccuracy === "" || item.gpsAccuracy == null || !Number.isFinite(accuracy) || accuracy <= 0
          ? "" : accuracy;
      }
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
  applyGpsFormats(remainingSheet, exportHeaders, workingRowsWithPhotos);
  applyGpsFormats(completedSheet, completedHeaders, completedForExportWithPhotos.map(x=>x.row || {}));
  const wb = XLSX.utils.book_new();
  wb.Props = { Title: "OYONID MAP EXPORT", Subject: "RBM tersisa dan realisasi pekerjaan kumulatif" };
  XLSX.utils.book_append_sheet(wb, remainingSheet, "Pelanggan Tersisa");
  XLSX.utils.book_append_sheet(wb, completedSheet, "Realisasi Selesai");
  if (wb.SheetNames.length !== 2 || !wb.SheetNames.includes("Pelanggan Tersisa") || !wb.SheetNames.includes("Realisasi Selesai")) {
    showToast("❌ Gagal membuat sheet Excel realisasi. File tidak diunduh.");
    console.error("[OYONID] Workbook sheet validation failed", wb.SheetNames);
    return;
  }
  XLSX.writeFile(wb, filename, { compression: true });
  showToast(`✅ Excel V13.1.20: ${workingRows.length} tersisa • ${completedForExport.length} selesai • tepat 2 sheet.`);
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

// Pengaturan kolom Excel: popover dipasang tepat di bawah tombol dan
// posisinya diselaraskan kembali saat viewport/halaman bergulir.
document.addEventListener("DOMContentLoaded", () => {
  const applyMapBtn = document.getElementById("applyColumnMappingBtn");
  const details = document.getElementById("columnMappingPanel");
  if (applyMapBtn) applyMapBtn.addEventListener("click", () => {
    applyColumnMapping();
    if (details) details.open = false;
  });
  document.getElementById("cancelColumnMappingBtn")?.addEventListener("click", () => {
    if (details) details.open = false;
  });

  if (!details) { renderColumnMappingOptions(); return; }

  const reposition = () => {
    if (!details.open) return;
    const popover = document.querySelector(".column-mapping-popover.is-portaled");
    if (!popover) return;
    const rect = details.querySelector("summary")?.getBoundingClientRect() || details.getBoundingClientRect();
    const vv = window.visualViewport;
    const viewportTop = vv ? vv.offsetTop : 0;
    const viewportHeight = vv ? vv.height : window.innerHeight;
    const viewportWidth = vv ? vv.width : window.innerWidth;
    const margin = 8;
    const width = Math.min(420, viewportWidth - margin * 2);
    const left = Math.max(margin, Math.min(rect.left, viewportWidth - width - margin));
    const desiredTop = rect.bottom + 7;
    const top = Math.max(viewportTop + margin, Math.min(desiredTop, viewportTop + viewportHeight - 180));
    const available = Math.max(150, viewportTop + viewportHeight - top - 18);
    popover.style.setProperty("left", `${left}px`, "important");
    popover.style.setProperty("right", "auto", "important");
    popover.style.setProperty("top", `${top}px`, "important");
    popover.style.setProperty("width", `${width}px`, "important");
    popover.style.setProperty("max-height", `${available}px`, "important");
    popover.style.setProperty("--oyon-popover-max-height", `${available}px`);
  };

  details.addEventListener("toggle", () => {
    let popover = details.querySelector(".column-mapping-popover") || document.querySelector(".column-mapping-popover.is-portaled");
    if (details.open) {
      renderColumnMappingOptions();
      if (popover) {
        document.body.appendChild(popover);
        popover.classList.add("is-portaled");
        reposition();
        window.addEventListener("resize", reposition);
        window.addEventListener("scroll", reposition, true);
        window.visualViewport?.addEventListener("resize", reposition);
        window.visualViewport?.addEventListener("scroll", reposition);
      }
    } else {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
      window.visualViewport?.removeEventListener("resize", reposition);
      window.visualViewport?.removeEventListener("scroll", reposition);
      if (popover?.classList.contains("is-portaled")) {
        popover.classList.remove("is-portaled");
        popover.removeAttribute("style");
        details.appendChild(popover);
      }
    }
  });
  renderColumnMappingOptions();
});


/* ======================
   V13: MANUAL ROUTE RECORDING + REALIZATION VIEW
   Stored locally per browser origin. GPS recording runs only after user starts it.
====================== */
const V13_ROUTE_KEY = "oyon_route_sessions_v1";
const V13_ACTIVE_ROUTE_KEY = "oyon_active_route_v1";
let v13RouteSessions = (() => { try { return JSON.parse(localStorage.getItem(V13_ROUTE_KEY) || "[]"); } catch(e) { return []; } })();
let v13ActiveRoute = (() => { try { return JSON.parse(localStorage.getItem(V13_ACTIVE_ROUTE_KEY) || "null"); } catch(e) { return null; } })();
let v13RouteWatchId = null;
let v13PlaybackTimer = null;
let v13PlaybackFrame = null;
let v13PlaybackLegStart = 0;
let v13PlaybackLegDuration = 1200;
let v13PlaybackLegFrom = null;
let v13PlaybackLegTo = null;
let v13PlaybackCurrentPosition = null;
let v13PlaybackPhotoObjectUrl = null;
let v13CurrentPlaybackPhotoId = null;
let v13PlaybackPhotoRequestToken = 0;
let v13PlaybackLayer = null;
let v13PlaybackMarker = null;
let v13PlaybackIndex = 0;
let v13PlaybackEntries = [];
let v13PlaybackLines = [];
let v13PlaybackCurrentSession = null;
let v13PlaybackCurrentPoints = [];
let v13RealizationLayer = null;
function v13SaveRoutes(){
  let localOk = true;
  try {
    localStorage.setItem(V13_ROUTE_KEY, JSON.stringify(v13RouteSessions));
    if(v13ActiveRoute) localStorage.setItem(V13_ACTIVE_ROUTE_KEY, JSON.stringify(v13ActiveRoute));
    else localStorage.removeItem(V13_ACTIVE_ROUTE_KEY);
  } catch(e) { localOk = false; console.warn("localStorage rute penuh; memakai IndexedDB", e); }
  oyonMirrorLocal("routeSessions", v13RouteSessions);
  oyonMirrorLocal("activeRoute", v13ActiveRoute);
  if (!localOk) showToast("⚠️ Penyimpanan rute memakai database lokal perangkat.");
  return true;
}

/* V13.1.22 GPS BACKUP / RESTORE: transfer route sessions across website origins safely. */
function v132NormalizeRouteSession(session) {
  if (!session || typeof session !== "object" || !Array.isArray(session.points)) return null;
  const points = session.points.map(p => {
    const lat = Number(p?.lat), lon = Number(p?.lon), at = p?.at || p?.timestamp;
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180 || !at || Number.isNaN(new Date(at).getTime())) return null;
    return { ...p, lat, lon, at: new Date(at).toISOString(), kind: "track" };
  }).filter(Boolean);
  if (!points.length) return null;
  const dayKey = /^\d{4}-\d{2}-\d{2}$/.test(String(session.dayKey || "")) ? session.dayKey : points[0].at.slice(0,10);
  return { ...session, id: String(session.id || `imported_route_${dayKey}_${points.length}_${points[0].at}`), dayKey,
    startedAt: session.startedAt || points[0].at, endedAt: session.endedAt || points[points.length - 1].at, points };
}
function v132RouteSessionFingerprint(s) {
  const p=s?.points||[];
  return `${s?.id||""}|${s?.dayKey||""}|${p.length}|${p[0]?.at||""}|${p[p.length-1]?.at||""}`;
}
async function v132ExportGpsBackup() {
  try {
    let dbSessions=[], dbActive=null;
    try {
      const saved=await oyonLocalGet("routeSessions"), active=await oyonLocalGet("activeRoute");
      if(Array.isArray(saved)) dbSessions=saved;
      if(active&&typeof active==="object") dbActive=active;
    } catch(e) { console.warn("[GPS Backup] IndexedDB read failed",e); }
    let lsSessions=[],lsActive=null;
    try { lsSessions=JSON.parse(localStorage.getItem(V13_ROUTE_KEY)||"[]"); } catch(e) {}
    try { lsActive=JSON.parse(localStorage.getItem(V13_ACTIVE_ROUTE_KEY)||"null"); } catch(e) {}
    const all=[...(Array.isArray(v13RouteSessions)?v13RouteSessions:[]),...dbSessions,...(Array.isArray(lsSessions)?lsSessions:[])]
      .map(v132NormalizeRouteSession).filter(Boolean);
    const active=v132NormalizeRouteSession(v13ActiveRoute||dbActive||lsActive);
    const unique=new Map();
    all.forEach(s=>unique.set(v132RouteSessionFingerprint(s),s));
    if(active) unique.set(v132RouteSessionFingerprint(active),active);
    const sessions=[...unique.values()];
    if(!sessions.length) throw new Error("Tidak ditemukan sesi GPS pada penyimpanan situs ini.");
    const payload={format:"OYONID_GPS_BACKUP",version:1,createdAt:new Date().toISOString(),sourceOrigin:location.origin,
      sourceBuild:window.OYONID_BUILD||"unknown",sessionCount:sessions.length,
      pointCount:sessions.reduce((n,s)=>n+s.points.length,0),sessions};
    const blob=new Blob([JSON.stringify(payload)],{type:"application/json"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download=`OYONID_GPS_BACKUP_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
    showToast(`Backup GPS berhasil: ${sessions.length} sesi, ${payload.pointCount} titik. Data asli tetap aman.`);
  } catch(e) { console.error(e); showToast("Backup GPS gagal: "+(e?.message||e)); }
}
async function v132ImportGpsBackup(file) {
  try {
    if(!file)return;
    if(file.size>50*1024*1024)throw new Error("File backup terlalu besar (maksimal 50 MB).");
    const payload=JSON.parse(await file.text());
    if(payload?.format!=="OYONID_GPS_BACKUP"||!Array.isArray(payload.sessions))throw new Error("Format file bukan OYONID GPS Backup.");
    const imported=payload.sessions.map(v132NormalizeRouteSession).filter(Boolean);
    if(!imported.length)throw new Error("Tidak ada titik GPS valid dalam backup.");
    const merged=new Map((Array.isArray(v13RouteSessions)?v13RouteSessions:[]).map(s=>[v132RouteSessionFingerprint(s),s]));
    let added=0,skipped=0;
    imported.forEach(s=>{const k=v132RouteSessionFingerprint(s);if(merged.has(k)){skipped++;return;}merged.set(k,s);added++;});
    v13RouteSessions=[...merged.values()].sort((a,b)=>String(a.startedAt||"").localeCompare(String(b.startedAt||""))).slice(-240);
    v13SaveRoutes();
    await oyonLocalPut("routeSessions",v13RouteSessions);
    await oyonLocalPut("activeRoute",v13ActiveRoute||null);
    v13RenderAvailableRealizationDates();
    updateRealizationSummary();
    showToast(`GPS dipulihkan: ${added} sesi ditambahkan, ${skipped} duplikat dilewati. Data lama tidak ditimpa.`);
  } catch(e) { console.error(e); showToast("Pemulihan GPS gagal: "+(e?.message||e)); }
}
function v132InitGpsRecoveryControls() {
  document.getElementById("gpsBackupExportBtn")?.addEventListener("click",v132ExportGpsBackup);
  const input=document.getElementById("gpsBackupFileInput");
  document.getElementById("gpsBackupImportBtn")?.addEventListener("click",()=>input?.click());
  input?.addEventListener("change",async()=>{
    const file=input.files?.[0];
    if(file&&confirm("Pulihkan backup GPS ke situs ini? Data lama tidak akan dihapus atau ditimpa."))await v132ImportGpsBackup(file);
    input.value="";
  });
}
function v13SetRecordingUI(active){
  const float=document.getElementById("routeRecordFloatBtn");
  const st=document.getElementById("routeRecordStatus");
  if(float){
    float.textContent=active?"■ Akhiri Rekam Rute":"▶ Mulai Rekam Rute";
    float.classList.toggle("is-recording",!!active);
    float.setAttribute("aria-pressed",active?"true":"false");
  }
  if(st)st.textContent=active?`🔴 Merekam rute • ${v13ActiveRoute?.points?.length||0} titik GPS`:"Rute tidak sedang direkam";
}
function v13MakePoint(pos){
  const lat=Number(pos?.coords?.latitude), lon=Number(pos?.coords?.longitude), accuracy=Number(pos?.coords?.accuracy);
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat < -90||lat>90||lon < -180||lon>180||(lat===0&&lon===0))return null;
  if(Number.isFinite(accuracy)&&accuracy>60)return null;
  return {lat,lon,accuracy:Number.isFinite(accuracy)?accuracy:null,at:new Date(pos.timestamp||Date.now()).toISOString()};
}
function v13Distance(a,b){
  const R=6371000,rad=x=>x*Math.PI/180,dLat=rad(b.lat-a.lat),dLon=rad(b.lon-a.lon);
  const q=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLon/2)**2;
  return 2*R*Math.atan2(Math.sqrt(q),Math.sqrt(1-q));
}
async function startRouteRecording(){
  if(v13ActiveRoute){showToast("Rekaman sebelumnya belum diakhiri. Tekan Akhiri Rekam Rute.");v13SetRecordingUI(true);return;}
  if(!navigator.geolocation?.getCurrentPosition||!navigator.geolocation?.watchPosition){showToast("Browser tidak mendukung GPS.");return;}
  showToast("Meminta posisi GPS awal…");
  let pos;
  try{pos=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,maximumAge:0,timeout:25000}));}
  catch(e){showToast("GPS belum siap: "+(e?.message||"izin/lokasi tidak tersedia")+". Rekaman belum dimulai.");return;}
  const first=v13MakePoint(pos);
  if(!first){showToast("Akurasi GPS awal harus 60 meter atau lebih baik. Coba di area terbuka.");return;}
  v13ActiveRoute={id:`route_${Date.now()}`,dayKey:localDateTimeParts().dayKey,startedAt:new Date().toISOString(),endedAt:null,points:[first]};
  if(!v13SaveRoutes()){v13ActiveRoute=null;return;}
  v13SetRecordingUI(true);
  v13RouteWatchId=navigator.geolocation.watchPosition(p=>{
    if(!v13ActiveRoute)return;
    const point=v13MakePoint(p);if(!point)return;
    const pts=v13ActiveRoute.points,last=pts[pts.length-1];
    const seconds=last?Math.max(0,(new Date(point.at)-new Date(last.at))/1000):0;
    const meters=last?v13Distance(last,point):Infinity;
    if(last&&seconds>0&&seconds<=3&&meters>180)return;
    if(!last||meters>=4||seconds>=5){
      pts.push(point);
      if(!v13SaveRoutes()){pts.pop();return;}
      const st=document.getElementById("routeRecordStatus");if(st)st.textContent=`🔴 Merekam rute • ${pts.length} titik GPS`;
    }
  },e=>{showToast("GPS rute terputus: "+(e?.message||"lokasi tidak tersedia"));const st=document.getElementById("routeRecordStatus");if(st)st.textContent="⚠️ GPS terputus — akhiri dan mulai ulang";},
  {enableHighAccuracy:true,maximumAge:1000,timeout:20000});
  showToast("🔴 Rekam rute dimulai. Biarkan halaman tetap terbuka dan GPS aktif.");
}
function stopRouteRecording(){
  if(v13RouteWatchId!==null){try{navigator.geolocation.clearWatch(v13RouteWatchId);}catch(e){}v13RouteWatchId=null;}
  if(!v13ActiveRoute){v13SetRecordingUI(false);showToast("Tidak ada rekaman aktif.");return;}
  v13ActiveRoute.endedAt=new Date().toISOString();
  const count=v13ActiveRoute.points?.length||0;
  if(count){v13RouteSessions.push(v13ActiveRoute);v13RouteSessions=v13RouteSessions.slice(-120);}
  v13ActiveRoute=null;const saved=v13SaveRoutes();v13SetRecordingUI(false);
  showToast(saved?`Rekaman rute disimpan: ${count} titik GPS.`:"Rekaman dihentikan; periksa penyimpanan lokal.");
}
function openRealizationPanel(){
  document.body.classList.add("oyon-realization-active");
  const uiBar=document.getElementById("uiBar");
  if(uiBar){uiBar.classList.add("minimized");const toggle=document.getElementById("toggleBtn");if(toggle)toggle.textContent="＋";}
  const p=document.getElementById("realizationPanel");if(p)p.style.display="block";
  const quick = document.getElementById("realizationQuickBar"); if (quick) quick.style.display = "flex";
  const bottomNav = document.getElementById("oyonBottomNav"); if (bottomNav) bottomNav.style.display = "none";
  const d=document.getElementById("realizationDate");
  const availableDays=v131AllCompletedRecords().map(x=>x.dayKey).filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x)).sort();
  if(d && (!d.value || !availableDays.includes(d.value))) d.value=availableDays[availableDays.length-1]||localDateTimeParts().dayKey;
  v13CalendarMonth=(d?.value||localDateTimeParts().dayKey).slice(0,7);
  updateRealizationSummary();
  resetRoutePlayback();
  showRealizationOnMap();
}
function closeRealizationPanel(){
  document.body.classList.remove("oyon-realization-active");
  const uiBar=document.getElementById("uiBar");
  if(uiBar){uiBar.classList.remove("minimized");const toggle=document.getElementById("toggleBtn");if(toggle)toggle.textContent="−";}
  const p=document.getElementById("realizationPanel");if(p)p.style.display="none";
  pauseRouteHistory();
  if(v13PlaybackLayer&&map){map.removeLayer(v13PlaybackLayer);v13PlaybackLayer=null;}
  v13PlaybackMarker=null;v13PlaybackLines=[];v13PlaybackEntries=[];v13PlaybackIndex=0;
  if(v13RealizationLayer&&map){map.removeLayer(v13RealizationLayer);v13RealizationLayer=null;}
  if(v13RealizationModeActive&&map&&clusterGroup&&!map.hasLayer(clusterGroup))map.addLayer(clusterGroup);
  v13RealizationModeActive=false;
  const quick = document.getElementById("realizationQuickBar"); if (quick) quick.style.display = "none";
  const bottomNav = document.getElementById("oyonBottomNav"); if (bottomNav) bottomNav.style.display = "flex";
  const photoBox = document.getElementById("playbackPhotoBox"); if (photoBox) photoBox.classList.remove("is-visible");
  if (typeof applyHariBacaFilter === "function") applyHariBacaFilter();
  if (typeof zoomToAllMarkers === "function" && markers.length) zoomToAllMarkers();
  showToast("Kembali ke mode Tagging.");
}
function v13SelectedDate(){return document.getElementById("realizationDate")?.value||localDateTimeParts().dayKey;}
function v13ValidActual(item){
  const lat=parseCoordinate(item?.actualLat),lon=parseCoordinate(item?.actualLon);
  return Number.isFinite(lat)&&Number.isFinite(lon)&&lat>=-90&&lat<=90&&lon>=-180&&lon<=180&&!(lat===0&&lon===0)&&item.actualLat!==""&&item.actualLon!==""&&item.actualLat!=null&&item.actualLon!=null;
}
function v13CompletedForDate(){return v131AllCompletedRecords().filter(x=>x.dayKey===v13SelectedDate()&&v13ValidActual(x));}
function v13RoutesForDate(){return (v13RouteSessions||[]).filter(x=>x.dayKey===v13SelectedDate());}
let v13CalendarMonth = "";
function v13RenderAvailableRealizationDates(){
  const host=document.getElementById("realizationAvailableDates");
  if(!host)return;
  const counts=new Map();
  v131AllCompletedRecords().forEach(item=>{
    if(item?.dayKey && /^\d{4}-\d{2}-\d{2}$/.test(item.dayKey))counts.set(item.dayKey,(counts.get(item.dayKey)||0)+1);
  });
  (Array.isArray(v13RouteSessions)?v13RouteSessions:[]).forEach(item=>{
    if(item?.dayKey && /^\d{4}-\d{2}-\d{2}$/.test(item.dayKey) && !counts.has(item.dayKey))counts.set(item.dayKey,0);
  });
  const selected=v13SelectedDate();
  const monthKey=v13CalendarMonth||selected.slice(0,7);
  const [year,month]=monthKey.split("-").map(Number);
  if(!year||!month)return;
  const monthDate=new Date(year,month-1,1);
  const label=monthDate.toLocaleDateString("id-ID",{month:"long",year:"numeric"});
  const monthLabel=document.getElementById("realizationMonthLabel");
  if(monthLabel)monthLabel.textContent=label.charAt(0).toUpperCase()+label.slice(1);
  const offset=(monthDate.getDay()+6)%7;
  const daysInMonth=new Date(year,month,0).getDate();
  let html="";
  for(let i=0;i<offset;i++)html+='<span class="calendar-empty" aria-hidden="true"></span>';
  for(let day=1;day<=daysInMonth;day++){
    const key=`${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    const count=counts.get(key)||0,hasData=counts.has(key),active=key===selected;
    html+=`<button type="button" class="realization-calendar-day${hasData?' has-data':''}${active?' is-selected':''}" data-realization-date="${key}" ${hasData?'':'disabled'} aria-label="${day} ${label}${hasData?`, ${count} data selesai`:', tidak ada data'}" aria-pressed="${active?'true':'false'}"><strong>${day}</strong>${hasData?`<small>${count||'R'}</small>`:'<i></i>'}</button>`;
  }
  const trailing=(7-((offset+daysInMonth)%7))%7;
  for(let i=0;i<trailing;i++)html+='<span class="calendar-empty" aria-hidden="true"></span>';
  host.innerHTML=html;
}
function v13ShiftCalendarMonth(delta){
  const selected=v13SelectedDate();
  const current=v13CalendarMonth||selected.slice(0,7);
  const [y,m]=current.split("-").map(Number);
  const next=new Date(y,m-1+delta,1);
  v13CalendarMonth=`${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,"0")}`;
  v13RenderAvailableRealizationDates();
}
function updateRealizationSummary(){
  const all=v131AllCompletedRecords().filter(x=>x.dayKey===v13SelectedDate()),done=all.filter(v13ValidActual),routes=v13RoutesForDate(),points=routes.reduce((n,r)=>n+(r.points?.length||0),0);
  const el=document.getElementById("realizationSummary");if(el)el.textContent=`${done.length} pelanggan selesai dengan GPS • ${all.length} selesai total • ${routes.length} sesi rute • ${points} titik GPS.`;
  const readEl=document.getElementById("statReadCount");
  const doneEl=document.getElementById("statDoneCount");
  const leftEl=document.getElementById("statLeftCount");
  if(readEl)readEl.textContent=String(Array.isArray(originalRows)?originalRows.length:0);
  if(doneEl)doneEl.textContent=String(all.length);
  if(leftEl)leftEl.textContent=String(Array.isArray(workingRows)?workingRows.length:0);
  const playbackPointCount = v13PlaybackBuildEntries().length;
  const rs=document.getElementById("routePlaybackStatus");
  if(rs)rs.textContent=playbackPointCount
    ? `Tersedia ${playbackPointCount} titik GPS berurutan (rekaman rute + lokasi pelanggan selesai).`
    : "Belum ada titik GPS untuk playback pada tanggal ini.";
  v13RenderAvailableRealizationDates();
}

function v13AttachCustomerPhotosToPopup(marker,item){
  marker.on("popupopen",async event=>{
    const popup=event.popup?.getElement();
    const content=popup?.querySelector(".leaflet-popup-content");
    if(!content)return;
    let host=content.querySelector(".oyon-popup-customer-photos");
    if(!host){
      host=document.createElement("div");
      host.className="oyon-popup-customer-photos";
      host.style.cssText="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:9px;max-width:320px;width:min(320px,78vw)";
      content.appendChild(host);
    }
    host.textContent="Memuat foto pelanggan…";
    const row=item.row||{};
    const identity=item.identity||completionIdentity(row)||oyonCustomerPhotoIdentity(row);
    const photos=v13PlaybackPhotoMetadata().filter(photo=>photo.dayKey===v13SelectedDate()&&photo.identity===identity);
    if(!photos.length){host.textContent="Foto pelanggan belum tersedia di Excel atau penyimpanan perangkat.";return;}
    host.textContent="";
    for(const photo of photos){
      try{
        const blob=await v13LoadPlaybackPhotoBlob(photo);
        if(!blob||!host.isConnected)return;
        const url=URL.createObjectURL(blob);
        const card=document.createElement("div");
        const img=document.createElement("img");
        const label=document.createElement("div");
        img.src=url;img.alt=photo.name||photo.type||"Foto pelanggan";
        img.style.cssText="width:100%;height:150px;object-fit:contain;object-position:center;background:#101b2a;border-radius:7px;display:block";
        label.textContent=photo.type||photo.name||"Foto";
        label.style.cssText="font-size:11px;margin-top:3px;text-align:center";
        card.append(img,label);host.appendChild(card);
        marker.once("popupclose",()=>URL.revokeObjectURL(url));
      }catch(error){console.warn("[OYONID] Foto popup gagal dimuat",error);}
    }
    if(!host.children.length)host.textContent="Foto pelanggan tidak dapat dibaca.";
  });
}

function showRealizationOnMap(){
  if(typeof map==="undefined"||typeof L==="undefined")return;
  pauseRouteHistory();
  if(v13RealizationLayer)map.removeLayer(v13RealizationLayer);
  if(clusterGroup&&map.hasLayer(clusterGroup))map.removeLayer(clusterGroup);
  v13RealizationModeActive=true;v13RealizationLayer=L.layerGroup().addTo(map);
  const rows=v13CompletedForDate(),bounds=[];
  rows.forEach((item,i)=>{
    const lat=parseCoordinate(item.actualLat),lon=parseCoordinate(item.actualLon),row=item.row||{};
    const name=String(getMappedValue(row,"NAMA")||row.NAMA||row.nama||"Pelanggan");
    const idpel=String(getMappedValue(row,"IDPEL")||row.IDPEL||""),meter=String(getNoMeter(row)||"");
    const m=L.circleMarker([lat,lon],{radius:9,color:"#fff",weight:2,fillColor:"#16a34a",fillOpacity:.96}).addTo(v13RealizationLayer);
    m.bindPopup(`<b>${i+1}. ${name.replace(/[<>]/g,"")}</b><br>IDPEL: ${idpel.replace(/[<>]/g,"")}<br>Nomor meter: ${meter.replace(/[<>]/g,"")}<br>Selesai: ${item.time||"-"}<br>GPS realisasi: ${lat}, ${lon}`);
    v13AttachCustomerPhotosToPopup(m,item);
    bounds.push([lat,lon]);
  });
  if(bounds.length){map.fitBounds(L.latLngBounds(bounds).pad(.15));showToast(`${bounds.length} pelanggan selesai ditampilkan. Yang belum selesai disembunyikan.`);}
  else showToast("Belum ada pelanggan selesai dengan GPS realisasi pada tanggal ini.");
  updateRealizationSummary();
}
function v13RouteSegments(){
  const raw=[];
  v13RoutesForDate().forEach((session,sessionIndex)=>{
    (session.points||[]).forEach((point,pointIndex)=>{
      const lat=Number(point.lat),lon=Number(point.lon);
      if(!Number.isFinite(lat)||!Number.isFinite(lon)||!point.at)return;
      raw.push({...point,lat,lon,kind:"track",sessionKey:session.id||`route_${sessionIndex}`,sourceOrder:pointIndex});
    });
  });
  // Customer completion GPS points are also real, timestamped route waypoints.
  // This lets playback cover every completed customer even when watchPosition produced only a few samples.
  v13CompletedForDate().forEach((item,index)=>{
    const lat=parseCoordinate(item.actualLat),lon=parseCoordinate(item.actualLon);
    if(!Number.isFinite(lat)||!Number.isFinite(lon))return;
    let at="";
    if(item.dayKey){
      const time=String(item.time||"").trim().replace(/\./g,":");
      const normalized=/^\d{1,2}:\d{2}(?::\d{2})?$/.test(time)?time:"12:00:00";
      const baseTime=new Date(`${item.dayKey}T${normalized}`);
      if(!Number.isNaN(baseTime.getTime())){
        if(!time)baseTime.setSeconds(index%60);
        at=baseTime.toISOString();
      }
    }
    if(!at)at=item.completedAt||"";
    if(!at)return;
    raw.push({lat,lon,at,accuracy:Number(item.gpsAccuracy)||null,kind:"customer",completionId:item.completionId,identity:item.identity||completionIdentity(item.row||{}),sourceOrder:index});
  });
  raw.sort((a,b)=>new Date(a.at)-new Date(b.at));
  const ordered=[];
  for(const point of raw){
    const previous=ordered[ordered.length-1];
    if(previous && Math.abs(new Date(point.at)-new Date(previous.at))<5000 && v13Distance(previous,point)<3){
      if(point.kind==="customer")Object.assign(previous,{kind:"customer",completionId:point.completionId,identity:point.identity});
      continue;
    }
    ordered.push(point);
  }
  const journeys=[];
  for(const point of ordered){
    const previousJourney=journeys[journeys.length-1];
    if(!previousJourney){journeys.push({key:`journey_${journeys.length+1}`,points:[point]});continue;}
    const last=previousJourney.points[previousJourney.points.length-1];
    const gapMs=Math.max(0,new Date(point.at)-new Date(last.at));
    const gapMeters=v13Distance(last,point);
    const sameManualSession=point.sessionKey && point.sessionKey===last.sessionKey;
    const sameJourney=sameManualSession || (gapMs<=30*60*1000 && gapMeters<=2000);
    if(sameJourney)previousJourney.points.push(point);
    else journeys.push({key:`journey_${journeys.length+1}`,points:[point]});
  }
  return journeys;
}
function v13PlaybackBuildEntries() {
  return v13RouteSegments().flatMap((journey, journeyIndex) =>
    journey.points.map((point, pointIndex) => ({point,sessionIndex:journeyIndex,journeyKey:journey.key,breakBefore:pointIndex===0,pointIndex}))
  );
}
function v13PlaybackUpdateControls() {
  const max = String(Math.max(0, v13PlaybackEntries.length - 1));
  const value = String(Math.max(0, Math.min(v13PlaybackIndex - 1, v13PlaybackEntries.length - 1)));
  ["routePlaybackProgress", "quickRouteProgress"].forEach(id => {
    const slider = document.getElementById(id);
    if (!slider) return;
    slider.max = max;
    slider.value = value;
    slider.disabled = v13PlaybackEntries.length < 2;
  });
}
function v13PlaybackClearDrawing() {
  if (v13PlaybackLayer && map) map.removeLayer(v13PlaybackLayer);
  v13ShownPhotoIds = new Set();
  v13PlaybackPhotoRequestToken++;
  v13CurrentPlaybackPhotoId = null;
  const photoBox = document.getElementById("playbackPhotoBox");
  if (photoBox) {
    photoBox.classList.toggle("is-visible", document.body.classList.contains("oyon-realization-active"));
    const img=document.getElementById("playbackPhotoImage");
    const caption=document.getElementById("playbackPhotoCaption");
    if(img){img.removeAttribute("src");img.style.display="none";}
    if(caption)caption.textContent="Foto pelanggan akan muncul saat perjalanan mencapai titiknya";
  }
  v13PlaybackLayer = L.layerGroup().addTo(map);
  // Keep every completed customer location visible while the route marker moves.
  v13CompletedForDate().forEach((item,index)=>{
    const lat=parseCoordinate(item.actualLat),lon=parseCoordinate(item.actualLon);
    if(!Number.isFinite(lat)||!Number.isFinite(lon))return;
    const pin=L.circleMarker([lat,lon],{
      radius:7,color:"#ffffff",weight:2,fillColor:"#16a34a",fillOpacity:1
    }).addTo(v13PlaybackLayer);
    const row=item.row||{};
    const idpel=String(getMappedValue(row,"IDPEL")||row.IDPEL||"");
    const name=String(getMappedValue(row,"NAMA")||row.NAMA||"Pelanggan");
    pin.bindPopup(`<b>${index+1}. ${name.replace(/[<>]/g,"")}</b><br>IDPEL: ${idpel.replace(/[<>]/g,"")}<br>GPS realisasi`);
  });
  v13PlaybackMarker = null;
  v13PlaybackCurrentPosition = null;
  v13PlaybackLines = [];
  v13PlaybackCurrentSession = null;
  v13PlaybackCurrentPoints = [];
}
function v13PlaybackDrawEntry(entry, pan = true) {
  const p = entry.point, ll = [p.lat, p.lon];
  v13PlaybackCurrentPosition = ll;
  if (entry.breakBefore || v13PlaybackCurrentSession !== entry.sessionIndex) {
    v13PlaybackCurrentSession = entry.sessionIndex;
    v13PlaybackCurrentPoints = [];
    v13PlaybackLines.push(L.polyline([], { color: "#2563eb", weight: 4, opacity: .9 }).addTo(v13PlaybackLayer));
  }
  v13PlaybackCurrentPoints.push(ll);
  const line = v13PlaybackLines[v13PlaybackLines.length - 1];
  if (line) line.setLatLngs(v13PlaybackCurrentPoints);
  if (!v13PlaybackMarker) {
    v13PlaybackMarker = L.circleMarker(ll, { radius: 10, color: "#fff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 }).addTo(v13PlaybackLayer);
  } else v13PlaybackMarker.setLatLng(ll);
  if (pan) map.panTo(ll, { animate: true, duration: .2 });
  v13ShowPhotosAtPlayback(entry);
}
function v13PlaybackRenderTo(targetIndex, pan = true) {
  v13PlaybackClearDrawing();
  for (let i = 0; i <= targetIndex && i < v13PlaybackEntries.length; i++) v13PlaybackDrawEntry(v13PlaybackEntries[i], false);
  const entry = v13PlaybackEntries[targetIndex];
  if (entry && pan) map.panTo([entry.point.lat, entry.point.lon], { animate: true, duration: .2 });
}
function v13PlaybackSetTimer() {
  pauseRouteHistory();
  if (v13PlaybackIndex >= v13PlaybackEntries.length) return;

  const speed = Math.max(1, Number(document.getElementById("routePlaybackSpeed")?.value || 1));
  const duration = Math.max(520, 1050 / speed);

  const beginLeg = () => {
    if (v13PlaybackIndex >= v13PlaybackEntries.length) {
      pauseRouteHistory();
      const status = document.getElementById("routePlaybackStatus");
      if (status) status.textContent = "Playback selesai.";
      return;
    }
    const target = v13PlaybackEntries[v13PlaybackIndex];
    const previous = v13PlaybackIndex > 0 ? v13PlaybackEntries[v13PlaybackIndex - 1] : null;

    if (!previous || target.breakBefore || previous.sessionIndex !== target.sessionIndex) {
      v13PlaybackDrawEntry(target, false);
      v13PlaybackIndex++;
      v13PlaybackUpdateControls();
      const status = document.getElementById("routePlaybackStatus");
      if (status) status.textContent = `Perjalanan ${v13PlaybackIndex}/${v13PlaybackEntries.length} • sesi ${target.sessionIndex + 1}`;
      beginLeg();
      return;
    }

    v13PlaybackLegFrom = (v13PlaybackCurrentPosition && previous.sessionIndex === target.sessionIndex)
      ? [...v13PlaybackCurrentPosition]
      : [Number(previous.point.lat), Number(previous.point.lon)];
    v13PlaybackLegTo = [Number(target.point.lat), Number(target.point.lon)];
    v13PlaybackLegStart = performance.now();
    v13PlaybackLegDuration = duration;
    const frame = now => {
      if (!v13PlaybackFrame) return;
      const t = Math.min(1, (now - v13PlaybackLegStart) / v13PlaybackLegDuration);
      // Smoothstep easing: starts and stops gently, without abrupt GPS-to-GPS jumps.
      const eased = t * t * (3 - 2 * t);
      const lat = v13PlaybackLegFrom[0] + (v13PlaybackLegTo[0] - v13PlaybackLegFrom[0]) * eased;
      const lon = v13PlaybackLegFrom[1] + (v13PlaybackLegTo[1] - v13PlaybackLegFrom[1]) * eased;
      const ll = [lat, lon];
      v13PlaybackCurrentPosition = ll;
      const fromTime = new Date(previous.point.at).getTime();
      const toTime = new Date(target.point.at).getTime();
      const playbackAt = Number.isFinite(fromTime) && Number.isFinite(toTime)
        ? new Date(fromTime + (toTime-fromTime) * eased).toISOString()
        : target.point.at;
      v13ShowPhotosAtPlayback({point:{lat,lon,at:playbackAt}});

      const line = v13PlaybackLines[v13PlaybackLines.length - 1];
      if (line) {
        const path = v13PlaybackCurrentPoints;
        if (!path.length) path.push(v13PlaybackLegFrom);
        const lastPath = path[path.length-1];
        if (t >= 1) path.push(v13PlaybackLegTo);
        else if (lastPath === v13PlaybackLegFrom || (Math.abs(lastPath[0]-v13PlaybackLegFrom[0])<1e-12 && Math.abs(lastPath[1]-v13PlaybackLegFrom[1])<1e-12)) path.push(ll);
        else path[path.length-1] = ll;
        line.setLatLngs(path);
      }
      if (v13PlaybackMarker) v13PlaybackMarker.setLatLng(ll);
      else v13PlaybackMarker = L.circleMarker(ll, {
        radius: 9, color: "#fff", weight: 3, fillColor: "#1685ff", fillOpacity: 1
      }).addTo(v13PlaybackLayer);

      // Do not pan the map on every frame; that creates visual shaking on phones.
      if (t >= 1) {
        v13ShowPhotosAtPlayback(target);
        v13PlaybackIndex++;
        v13PlaybackUpdateControls();
        const status = document.getElementById("routePlaybackStatus");
        if (status) status.textContent = `Perjalanan ${v13PlaybackIndex}/${v13PlaybackEntries.length} • sesi ${target.sessionIndex + 1} • ${new Date(target.point.at).toLocaleTimeString("id-ID")}`;
        v13PlaybackFrame = requestAnimationFrame(beginLeg);
      } else {
        v13PlaybackFrame = requestAnimationFrame(frame);
      }
    };
    v13PlaybackFrame = requestAnimationFrame(frame);
  };
  beginLeg();
}
function pauseRouteHistory() {
  if (v13PlaybackTimer) { clearInterval(v13PlaybackTimer); v13PlaybackTimer = null; }
  if (v13PlaybackFrame) { cancelAnimationFrame(v13PlaybackFrame); v13PlaybackFrame = null; }
  const playBtn=document.getElementById("quickRoutePlayBtn");
  if(playBtn){playBtn.textContent="▶ Putar";playBtn.setAttribute("aria-label","Putar perjalanan");}
}
function resetRoutePlayback() {
  pauseRouteHistory();
  v13PlaybackEntries = v13PlaybackBuildEntries();
  v13PlaybackIndex = 0;
  v13PlaybackClearDrawing();
  v13PlaybackUpdateControls();
  const status = document.getElementById("routePlaybackStatus");
  if (status) status.textContent = v13PlaybackEntries.length
    ? `Siap diputar • ${v13PlaybackEntries.length} titik GPS dari ${v13RouteSegments().length} sesi.`
    : "Belum ada rekaman rute pada tanggal ini.";
}
function playRouteHistory() {
  if (!v13PlaybackEntries.length) v13PlaybackEntries = v13PlaybackBuildEntries();
  if (!v13PlaybackEntries.length) { showToast("Belum ada data rute untuk tanggal ini. Mulai rekam rute dahulu."); return; }
  if (v13PlaybackIndex >= v13PlaybackEntries.length) { v13PlaybackIndex = 0; v13PlaybackClearDrawing(); }
  if (!v13PlaybackLayer) v13PlaybackClearDrawing();
  v13PlaybackSetTimer();
  const playBtn=document.getElementById("quickRoutePlayBtn");
  if(playBtn){playBtn.textContent="Ⅱ Jeda";playBtn.setAttribute("aria-label","Jeda perjalanan");}
  const status = document.getElementById("routePlaybackStatus");
  if (status) status.textContent = `Memutar rute • ${v13PlaybackEntries.length} titik GPS.`;
}
function seekRoutePlayback(value) {
  pauseRouteHistory();
  if (!v13PlaybackEntries.length) v13PlaybackEntries = v13PlaybackBuildEntries();
  if (!v13PlaybackEntries.length) return;
  const target = Math.max(0, Math.min(Number(value) || 0, v13PlaybackEntries.length - 1));
  v13PlaybackRenderTo(target, true);
  v13PlaybackIndex = target + 1;
  v13PlaybackUpdateControls();
  const entry = v13PlaybackEntries[target];
  const status = document.getElementById("routePlaybackStatus");
  if (status) status.textContent = `Posisi ${target + 1}/${v13PlaybackEntries.length} • sesi ${entry.sessionIndex + 1} • ${new Date(entry.point.at).toLocaleTimeString("id-ID")}`;
}
function downloadRouteBackup() {
  const payload = {
    app: "OYONID Map", version: "V13.1.7", exportedAt: new Date().toISOString(),
    sessions: v13RouteSessions || [], activeSession: v13ActiveRoute || null
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `OYONID_GPS_BACKUP_${localDateTimeParts().dayKey}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast(`Cadangan GPS diunduh • ${(payload.sessions || []).length} sesi.`);
}

async function oyonLoadPlaybackPhotosForVideo(dayKey) {
  const metas=v13PlaybackPhotoMetadata().filter(p=>p.dayKey===dayKey);
  const loaded=[];
  for(const meta of metas){
    try{
      const blob=await v13LoadPlaybackPhotoBlob(meta); if(!blob)continue;
      const url=URL.createObjectURL(blob), img=new Image();
      await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});
      loaded.push({...meta,img,url});
    }catch(e){console.warn("Photo video skipped",meta.id,e);}
  }
  return loaded;
}
function oyonNearestPlaybackPhoto(point, photos) {
  const t=new Date(point.at).getTime(), here={lat:Number(point.lat),lon:Number(point.lon)};
  let best=null,bestDistance=Infinity;
  for(const photo of photos){
    const pt={lat:Number(photo.lat),lon:Number(photo.lon)};
    if(!Number.isFinite(pt.lat)||!Number.isFinite(pt.lon))continue;
    const d=v13Distance(here,pt);
    if(point.identity && photo.identity && point.identity===photo.identity){best=photo;bestDistance=-1;break;}
    const photoTime=new Date(photo.at).getTime();
    const dt=Math.abs(t-photoTime);
    if(!Number.isFinite(photoTime)||photoTime>t+5000||dt>45*60*1000)continue;
    if(d<=250&&d<bestDistance){best=photo;bestDistance=d;}
  }
  return best;
}
function oyonFormatClock(ms) {
  const total=Math.max(0,Math.floor(ms/1000));
  const h=Math.floor(total/3600),m=Math.floor((total%3600)/60),sec=total%60;
  return [h,m,sec].map(v=>String(v).padStart(2,"0")).join(":");
}
function oyonVideoDurationMs(){
  const seconds=Math.max(15,Math.min(300,Number(document.getElementById("quickVideoDuration")?.value||30)));
  return seconds*1000;
}
async function downloadRouteVideo() {
  const button=document.getElementById("quickVideoDownloadBtn");
  if(button){button.disabled=true;button.textContent="⏳ Menyiapkan video…";}
  let photoAssets=[],stream=null,recorder=null;
  try{
    if(!window.MediaRecorder||!HTMLCanvasElement.prototype.captureStream)throw new Error("Browser belum mendukung pembuatan video otomatis. Gunakan Chrome terbaru.");
    if(typeof html2canvas!=="function")throw new Error("Modul pembuat gambar peta belum termuat.");
    v13PlaybackEntries=v13PlaybackBuildEntries();
    const entries=v13PlaybackEntries;
    if(entries.length<1)throw new Error("Tanggal ini belum memiliki titik GPS realisasi. Pilih tanggal yang memiliki pelanggan selesai dengan GPS.");
    pauseRouteHistory();
    const valid=entries.map((entry,index)=>({...entry,index,lat:Number(entry.point.lat),lon:Number(entry.point.lon),time:new Date(entry.point.at).getTime()}))
      .filter(entry=>Number.isFinite(entry.lat)&&Number.isFinite(entry.lon)&&Number.isFinite(entry.time));
    if(!valid.length)throw new Error("Titik GPS tidak memiliki koordinat atau waktu yang valid.");
    // Compress stationary runs lasting 30+ minutes. Keep the boundary timestamps, never mutate source GPS.
    const compact=[];let stationaryRun=[];
    const flushStationary=()=>{
      if(!stationaryRun.length)return;
      const first=stationaryRun[0],last=stationaryRun[stationaryRun.length-1];
      const span=last.time-first.time;
      const hasCustomer=stationaryRun.some(entry=>entry.point.kind==="customer");
      if(span>=30*60*1000&&!hasCustomer){compact.push(first);if(last!==first){last.cutPauseBefore=true;compact.push(last);}}
      else compact.push(...stationaryRun);
      stationaryRun=[];
    };
    for(const item of valid){
      const anchor=stationaryRun[0];
      if(item.point.kind!=="customer"&&anchor&&v13Distance(anchor.point,item.point)<=20){stationaryRun.push(item);continue;}
      flushStationary();
      if(item.point.kind==="customer")compact.push(item);else stationaryRun.push(item);
    }
    flushStationary();
    const points=compact.map(e=>[e.lat,e.lon]);
    const bounds=L.latLngBounds(points);
    const oldCenter=map.getCenter(),oldZoom=map.getZoom();
    const removed=[];
    [clusterGroup,v13RealizationLayer,v13PlaybackLayer,petugasMarker].forEach(layer=>{
      if(layer&&map.hasLayer(layer)){map.removeLayer(layer);removed.push(layer);}
    });
    const controls=map.getContainer().querySelector(".leaflet-control-container");
    const oldControlVisibility=controls?.style.visibility;
    if(controls)controls.style.visibility="hidden";
    document.getElementById("locationPhotoBtn")?.style.setProperty("visibility","hidden");
    map.invalidateSize({animate:false});
    map.fitBounds(bounds.pad(.18),{animate:false,maxZoom:16});
    let shot,world,customerPins=[];
    try{
      await new Promise(resolve=>setTimeout(resolve,650));
      shot=await html2canvas(map.getContainer(),{backgroundColor:"#e9e5dd",useCORS:true,allowTaint:false,scale:1,logging:false});
      world=compact.map((entry,index)=>{
        const p=map.latLngToContainerPoint([entry.lat,entry.lon]);
        return {...entry,x:p.x,y:p.y,index};
      });
      customerPins=v13CompletedForDate().map((item,index)=>{
        const lat=parseCoordinate(item.actualLat),lon=parseCoordinate(item.actualLon);
        if(!Number.isFinite(lat)||!Number.isFinite(lon))return null;
        const p=map.latLngToContainerPoint([lat,lon]);
        return {x:p.x,y:p.y,index:index+1,identity:item.identity||completionIdentity(item.row||{})};
      }).filter(Boolean);
    }finally{
      map.setView(oldCenter,oldZoom,{animate:false});
      removed.forEach(layer=>layer.addTo(map));
      if(controls)controls.style.visibility=oldControlVisibility||"";
      document.getElementById("locationPhotoBtn")?.style.setProperty("visibility","");
      map.invalidateSize({animate:false});
    }
    // Portrait 9:16 export, designed for WhatsApp/phone viewing.
    const W=720,H=1280,canvas=document.createElement("canvas");
    canvas.width=W;canvas.height=H;
    const ctx=canvas.getContext("2d");
    const baseScale=Math.min(W/shot.width,H/shot.height);
    const baseOffsetX=(W-shot.width*baseScale)/2,baseOffsetY=(H-shot.height*baseScale)/2;
    const toWorld=p=>({x:p.x*baseScale+baseOffsetX,y:p.y*baseScale+baseOffsetY});
    world=world.map(p=>({...p,...toWorld(p)}));
    customerPins=customerPins.map(p=>({...p,...toWorld(p)}));
    photoAssets=await oyonLoadPlaybackPhotosForVideo(v13SelectedDate());
    const durationMs=oyonVideoDurationMs();
    const totalLegs=Math.max(1,world.length-1);
    const legDuration=durationMs/totalLegs;
    stream=canvas.captureStream(24);
    const mimeCandidates=["video/mp4;codecs=avc1.42E01E","video/mp4","video/webm;codecs=vp9","video/webm"];
    const mimeType=typeof MediaRecorder.isTypeSupported==="function"?(mimeCandidates.find(type=>MediaRecorder.isTypeSupported(type))||""):"";
    recorder=new MediaRecorder(stream,mimeType?{mimeType,videoBitsPerSecond:7000000}:{videoBitsPerSecond:7000000});
    const chunks=[];
    const finished=new Promise((resolve,reject)=>{
      recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};
      recorder.onstop=()=>resolve(new Blob(chunks,{type:recorder.mimeType||"video/webm"}));
      recorder.onerror=e=>reject(e.error||new Error("Perekaman video gagal."));
    });
    recorder.start(250);
    const firstTime=world[0].time,lastTime=world[world.length-1].time;
    const reached=new Set();
    const completedRows=v13CompletedForDate();
    let activeCustomer=null;
    let travelled=0,leg=0,legStart=0,photoNow=null,photoImage=null;
    const smooth=t=>t*t*(3-2*t);
    let cameraZoom=1.65;
    const draw=(moving,progress,angle)=>{
      const targetZoom=moving?.point?.kind==="customer" ? 2.35 : 1.75;
      cameraZoom+=(targetZoom-cameraZoom)*.075;
      const zoom=cameraZoom;
      const cx=moving?.x??world[0].x,cy=moving?.y??world[0].y;
      ctx.save();ctx.fillStyle="#e9e5dd";ctx.fillRect(0,0,W,H);
      // Soft full-bleed map backdrop fills portrait canvas; sharp map remains centered above it.
      ctx.save();ctx.filter="blur(22px) brightness(.82)";ctx.globalAlpha=.45;ctx.drawImage(shot,0,0,W,H);ctx.restore();
      ctx.translate(W/2,H/2);ctx.rotate(-angle);ctx.scale(zoom,zoom);ctx.translate(-cx,-cy);
      ctx.drawImage(shot,baseOffsetX,baseOffsetY,shot.width*baseScale,shot.height*baseScale);
      // Route and customer markers are transformed with the moving camera.
      ctx.lineCap="round";ctx.lineJoin="round";ctx.strokeStyle="#1677f2";ctx.lineWidth=4/zoom;ctx.shadowColor="rgba(0,80,220,.35)";ctx.shadowBlur=5/zoom;
      if(leg>0){ctx.beginPath();ctx.moveTo(world[0].x,world[0].y);for(let n=1;n<=Math.min(leg,world.length-1);n++)ctx.lineTo(world[n].x,world[n].y);if(moving&&leg<world.length-1)ctx.lineTo(moving.x,moving.y);ctx.stroke();}
      ctx.shadowBlur=0;
      customerPins.forEach(pin=>{
        const r=8/zoom;ctx.beginPath();ctx.arc(pin.x,pin.y,r+2/zoom,0,Math.PI*2);ctx.fillStyle="#fff";ctx.fill();
        ctx.beginPath();ctx.arc(pin.x,pin.y,r,0,Math.PI*2);ctx.fillStyle="#16a34a";ctx.fill();
        ctx.fillStyle="#fff";ctx.font=`bold ${9/zoom}px Arial`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(String(pin.index),pin.x,pin.y+.3/zoom);
      });
      if(moving){ctx.beginPath();ctx.arc(moving.x,moving.y,10/zoom,0,Math.PI*2);ctx.fillStyle="#fff";ctx.fill();ctx.beginPath();ctx.arc(moving.x,moving.y,7/zoom,0,Math.PI*2);ctx.fillStyle="#1677f2";ctx.fill();}
      ctx.restore();
      // Information overlays stay fixed on screen while the map camera moves.
      ctx.fillStyle="rgba(9,27,47,.94)";ctx.beginPath();ctx.roundRect(18,16,390,76,14);ctx.fill();
      const elapsed=Math.max(0,(moving?.time??firstTime)-firstTime);
      const km=(travelled/1000).toFixed(2).replace(".",",");
      ctx.fillStyle="#ffffff";ctx.font="bold 20px Arial";ctx.fillText("OYONID MAP • REALISASI",32,42);
      ctx.fillStyle="#63e69b";ctx.font="bold 17px Arial";ctx.fillText(`Selesai ${reached.size}/${v13CompletedForDate().length}`,32,72);
      ctx.fillStyle="#ffffff";ctx.font="bold 15px Arial";ctx.fillText(`${km} km  •  ${oyonFormatClock(elapsed)}`,205,72);
      ctx.fillStyle="#d9e7f6";ctx.font="12px Arial";ctx.fillText(`${Math.round(Math.max(0,Math.min(1,progress))*100)}% perjalanan`,W-155,42);
      ctx.fillStyle="rgba(9,27,47,.88)";ctx.fillRect(18,H-14,W-36,5);ctx.fillStyle="#19b66d";ctx.fillRect(18,H-14,(W-36)*Math.max(0,Math.min(1,progress)),5);
      if(moving?.cutPauseBefore){ctx.fillStyle="rgba(9,27,47,.92)";ctx.beginPath();ctx.roundRect(W-310,108,292,42,12);ctx.fill();ctx.fillStyle="#fff";ctx.font="bold 14px Arial";ctx.fillText("⏩ Jeda GPS 30+ menit dilewati",W-294,135);}
      if(activeCustomer||photoImage){
        const x=18,y=H-300,w=300,h=255,photoH=190;
        ctx.save();ctx.shadowColor="rgba(0,0,0,.35)";ctx.shadowBlur=12;ctx.fillStyle="#fff";ctx.beginPath();ctx.roundRect(x-5,y-5,w+10,h+10,12);ctx.fill();ctx.shadowBlur=0;
        ctx.save();ctx.beginPath();ctx.roundRect(x,y,w,photoH,8);ctx.clip();ctx.fillStyle="#101b2a";ctx.fillRect(x,y,w,photoH);
        if(photoImage){
          const fit=Math.min(w/photoImage.width,photoH/photoImage.height);
          const dw=photoImage.width*fit,dh=photoImage.height*fit;
          const dx=x+(w-dw)/2,dy=y+(photoH-dh)/2;
          ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";
          ctx.drawImage(photoImage,0,0,photoImage.width,photoImage.height,dx,dy,dw,dh);
        }else{ctx.fillStyle="#d8e0e8";ctx.fillRect(x,y,w,photoH);ctx.fillStyle="#526579";ctx.font="bold 15px Arial";ctx.fillText("Foto tidak tersedia",x+15,y+100);}
        ctx.restore();
        ctx.fillStyle="#10243b";ctx.fillRect(x,y+photoH,w,65);ctx.fillStyle="#fff";ctx.font="bold 14px Arial";ctx.fillText(photoNow?.name||photoNow?.type||"Pelanggan selesai",x+10,y+photoH+20);
        const row=activeCustomer?.row||{};const idpel=String(getMappedValue(row,"IDPEL")||row.IDPEL||"");const meter=String(getNoMeter(row)||"");
        ctx.font="12px Arial";ctx.fillText(`IDPEL ${idpel.slice(-12)}  •  Meter ${meter.slice(-10)}`,x+10,y+photoH+44);ctx.restore();
      }
    };
    let previous=world[0];
    const markCustomer=point=>{
      if(point.point?.kind!=="customer")return;
      const key=point.point.identity||point.point.completionId||`${point.lat},${point.lon},${point.time}`;
      if(!reached.has(key))reached.add(key);
      activeCustomer=completedRows.find(item=>(item.identity||completionIdentity(item.row||{}))===point.point.identity) || activeCustomer;
      const photo=oyonNearestPlaybackPhoto(point.point,photoAssets);
      if(photo&&photo.id!==photoNow?.id){photoNow=photo;photoImage=photo.img;}
    };
    markCustomer(world[0]);
    let currentAngle=0;
    const start=performance.now();
    let done=false;
    const animate=now=>{
      if(done)return;
      if(leg>=world.length-1){
        done=true;draw(world[world.length-1],1,currentAngle);recorder.stop();return;
      }
      if(!legStart)legStart=now;
      const from=world[leg],to=world[leg+1];
      const t=Math.min(1,(now-legStart)/Math.max(16,legDuration)),e=smooth(t);
      const moving={...from,x:from.x+(to.x-from.x)*e,y:from.y+(to.y-from.y)*e,time:from.time+(to.time-from.time)*e,point:e>=.98?to.point:from.point,cutPauseBefore:!!to.cutPauseBefore};
      const dx=to.x-from.x,dy=to.y-from.y;
      if(Math.hypot(dx,dy)>2)currentAngle=Math.atan2(dy,dx)+Math.PI/2;
      if(t>=1){
        const meters=v13Distance(from.point,to.point);
        if(Number.isFinite(meters)&&meters>=3&&meters<1000)travelled+=meters;
        markCustomer(to);leg++;legStart=now;previous=to;
      }
      draw(moving,(leg+e)/Math.max(1,world.length-1),currentAngle);
      requestAnimationFrame(animate);
    };
    draw(world[0],0,0);
    requestAnimationFrame(animate);
    const blob=await finished;
    stream.getTracks().forEach(track=>track.stop());stream=null;
    photoAssets.forEach(photo=>{if(photo.url)URL.revokeObjectURL(photo.url);});photoAssets=[];
    if(!blob.size)throw new Error("Video kosong. Coba ulangi setelah peta selesai dimuat.");
    const url=URL.createObjectURL(blob),a=document.createElement("a"),ext=blob.type.includes("mp4")?"mp4":"webm";
    a.href=url;a.download=`OYONID_REalisasi_${v13SelectedDate()}_${Math.round(durationMs/1000)}detik.${ext}`;
    document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
    showToast(`Video berhasil dibuat • target ${Math.round(durationMs/1000)} detik • ${reached.size} pelanggan tercapai.`);
  }catch(err){
    console.error("[OYONID] Video generation failed",err);
    showToast("Video gagal dibuat: "+(err?.message||"coba ulangi"));
  }finally{
    if(stream)stream.getTracks().forEach(track=>track.stop());
    photoAssets.forEach(photo=>{if(photo.url)URL.revokeObjectURL(photo.url);});
    if(button){button.disabled=false;button.textContent="⬇ Buat Ulang Video";}
  }
}

document.addEventListener("DOMContentLoaded",()=>{
  v13SetRecordingUI(!!v13ActiveRoute);
  if(v13ActiveRoute){const st=document.getElementById("routeRecordStatus");if(st)st.textContent=`⚠️ Rekaman sebelumnya terputus • ${v13ActiveRoute.points?.length||0} titik tersimpan. Tekan Akhiri Rekam Rute untuk menyimpan.`;}
  document.getElementById("workbookSheetSelect")?.addEventListener("change", event => {
    oyonSelectWorkbookSheet(event.target.value);
    showToast(`Menggunakan ${event.target.options[event.target.selectedIndex]?.text || event.target.value}`);
  });
  document.getElementById("realizationDate")?.addEventListener("change",()=>{updateRealizationSummary();resetRoutePlayback();if(v13RealizationModeActive)showRealizationOnMap();});
  document.getElementById("realizationAvailableDates")?.addEventListener("click",event=>{
    const dayButton=event.target.closest("[data-realization-date]");
    if(!dayButton || dayButton.disabled)return;
    const dateInput=document.getElementById("realizationDate");
    if(dateInput)dateInput.value=dayButton.dataset.realizationDate;
    v13CalendarMonth=dayButton.dataset.realizationDate.slice(0,7);
    updateRealizationSummary();
    resetRoutePlayback();
    if(v13RealizationModeActive)showRealizationOnMap();
  });
  document.getElementById("realizationMonthPrev")?.addEventListener("click",()=>v13ShiftCalendarMonth(-1));
  document.getElementById("realizationMonthNext")?.addEventListener("click",()=>v13ShiftCalendarMonth(1));
  updateRealizationSummary();

  // V13.1.2: explicit event wiring; no inline onclick dependency.
  document.getElementById("realizationOpenBtn")?.addEventListener("click", openRealizationPanel);
  document.getElementById("realizationCloseBtn")?.addEventListener("click", closeRealizationPanel);
  document.getElementById("realizationMinimizeBtn")?.addEventListener("click", () => {
    const panel=document.getElementById("realizationPanel"); if(!panel)return;
    const minimized=panel.classList.toggle("is-minimized");
    const btn=document.getElementById("realizationMinimizeBtn");
    if(btn){btn.textContent=minimized?"⛶":"−";btn.setAttribute("aria-expanded",String(!minimized));btn.setAttribute("aria-label",minimized?"Maximize kalender":"Minimize kalender");}
    setTimeout(()=>map?.invalidateSize?.({animate:false}),180);
  });
  document.getElementById("realizationRefreshBtn")?.addEventListener("click", showRealizationOnMap);
  document.getElementById("routeRecordFloatBtn")?.addEventListener("click", () => {
    if(v13ActiveRoute) stopRouteRecording(); else startRouteRecording();
  });
  document.getElementById("routePlayBtn")?.addEventListener("click", playRouteHistory);
  document.getElementById("routePauseBtn")?.addEventListener("click", pauseRouteHistory);
  document.getElementById("routeResetBtn")?.addEventListener("click", resetRoutePlayback);
  document.getElementById("routePlaybackProgress")?.addEventListener("input", event => seekRoutePlayback(event.target.value));
  document.getElementById("routeBackupBtn")?.addEventListener("click", downloadRouteBackup);
  document.getElementById("routePlaybackSpeed")?.addEventListener("change", () => {
    if (v13PlaybackFrame) { pauseRouteHistory(); v13PlaybackSetTimer(); }
  });
  document.getElementById("quickRealizationCloseBtn")?.addEventListener("click", closeRealizationPanel);
  document.getElementById("quickRoutePlayBtn")?.addEventListener("click", () => {
    if(v13PlaybackFrame || v13PlaybackTimer) pauseRouteHistory();
    else playRouteHistory();
  });
  document.getElementById("quickRouteResetBtn")?.addEventListener("click", resetRoutePlayback);
  document.getElementById("quickRouteProgress")?.addEventListener("input", event => seekRoutePlayback(event.target.value));
  document.getElementById("quickRouteSpeed")?.addEventListener("change", event => {
    const panelSpeed = document.getElementById("routePlaybackSpeed");
    if (panelSpeed) panelSpeed.value = event.target.value;
    if (v13PlaybackFrame) { pauseRouteHistory(); v13PlaybackSetTimer(); }
  });
  document.getElementById("quickVideoDownloadBtn")?.addEventListener("click", downloadRouteVideo);
  v132InitGpsRecoveryControls();
  const photoInput = document.getElementById("locationPhotoInput");
  document.getElementById("locationPhotoBtn")?.addEventListener("click", () => photoInput?.click());
  photoInput?.addEventListener("change", async event => {
    const file = event.target.files?.[0];
    if (file) await v13HandleLocationPhoto(file);
    event.target.value = "";
  });
  document.getElementById("customerPhotoInput")?.addEventListener("change", async event => {
    const file=event.target.files?.[0]; if(file) await handleCustomerPhotoFile(file); event.target.value="";
  });
  document.getElementById("customerPhotoChooser")?.addEventListener("click", event => {
    if(event.target.id === "customerPhotoChooser") closeCustomerPhotoChooser();
  });

  console.info("[OYONID] V13.1.11 route playback, GPS floating control, map-only video, and workbook sheet selector attached");
});
// Expose functions for compatibility with any older inline buttons.
Object.assign(window,{openRealizationPanel,closeRealizationPanel,showRealizationOnMap,startRouteRecording,stopRouteRecording,playRouteHistory,pauseRouteHistory,resetRoutePlayback,openCustomerPhotoChooser,closeCustomerPhotoChooser,startCustomerPhotoCapture});
window.addEventListener("beforeunload",()=>{if(v13ActiveRoute)v13SaveRoutes();});
