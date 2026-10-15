OYONID MAP LOCAL V10

Pembaruan:
- Scanner barcode V2: mencoba ZXing multi-format, dengan BarcodeDetector sebagai fallback.
- Kontrol zoom kamera, fokus otomatis/ulang fokus, dan lampu flash jika didukung HP/browser.
- Popup hasil pencarian ganda menampilkan nama, akhiran IDPEL, akhiran nomor meter, dan dapat diklik untuk membuka lokasi.
- Klik Selesai mencoba mengambil GPS aktual berakurasi tinggi, tanggal/jam, dan menyimpan catatan realisasi kumulatif di penyimpanan lokal browser.
- Download Excel Update menghasilkan dua sheet: Pelanggan Tersisa dan Realisasi Selesai. Sheet realisasi tetap mengikutkan catatan dari hari sebelumnya yang tersimpan di browser ini.

Cara menjalankan lokal (Windows):
1. Ekstrak ZIP ke folder baru.
2. Buka folder di VS Code.
3. Klik kanan index.html, pilih Open with Live Server.
4. Pastikan internet tersedia untuk library peta/Excel/ZXing yang dimuat dari CDN. Kamera dan GPS browser biasanya memerlukan localhost atau HTTPS.
5. Upload file RBM. Tes scanner, pencarian ganda, klik Selesai, lalu Download Excel Update.
6. Buka hasil Excel dan periksa kedua sheet.

Catatan penting:
- Riwayat realisasi disimpan pada browser/perangkat yang sama. Menghapus data situs/browser dapat menghapus riwayat lokal. Download Excel Update secara rutin sebagai backup.
- Jika GPS tidak bisa diambil saat klik Selesai, aplikasi meminta konfirmasi sebelum menyimpan pekerjaan tanpa GPS aktual.
- Zoom/fokus/flash tergantung dukungan kamera HP dan browser. ZXing dimuat dari internet; jika CDN tidak tersedia, aplikasi mencoba BarcodeDetector bawaan browser.
- Versi ini perlu diuji dengan RBM kerja sebelum dipakai operasional.
