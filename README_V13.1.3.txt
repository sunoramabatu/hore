OYONID MAP V13.1.3 — MARKER & REALISASI STABILIZATION

Basis:
- OYONID_MAP_V13_1_2_STABILIZATION.zip
- Excel contoh RBM_51311.hardhas_05-11_19-48.xlsx (dipakai untuk memverifikasi nama kolom dan koordinat; tidak dimasukkan ke paket)

Perbaikan:
1. renderVisibleMarkers tidak lagi menghapus marker hanya karena berada di luar viewport. Leaflet.markercluster mengatur tampilan/cluster.
2. Filter DIJ, lokasi cadangan, dan hari baca tetap diterapkan.
3. Upload menampilkan jumlah pelanggan, marker DIJ, marker cadangan, dan koordinat DIJ tidak valid berdasarkan hasil build sebenarnya.
4. Build fingerprint V13.1.3 dan cache-bust app.js.
5. Saat menutup mode realisasi, filter peta awal diterapkan kembali.
6. Fitur rekam rute, pemutaran rute, penyimpanan realisasi, dan ekspor dua sheet dipertahankan dari V13.1.2.

Verifikasi yang dilakukan:
- Node.js syntax check.
- Pemeriksaan keberadaan handler dan elemen HTML.
- Pemeriksaan struktur ekspor dua sheet.
- Excel contoh: 165 baris data; kolom LAT dan LON terisi dan pasangan koordinat valid.

Batasan:
- Ini bukan bukti runtime test di perangkat Android. Uji di branch testing tetap wajib.
- Lokasi Excel LAT/LON adalah DIJ. Lokasi petugas/realisasi hanya berasal dari GPS perangkat.
- Data localStorage tetap terikat pada origin/browser; preview dan production tidak otomatis berbagi data.
- Rekaman GPS dapat terhenti bila Android menangguhkan tab/browser.
