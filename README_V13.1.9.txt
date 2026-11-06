OYONID MAP V13.1.9 — EXCEL SHEET SELECTOR, MAP-ONLY ROUTE VIDEO & FLOATING GPS

Perubahan utama:
1. Setelah Excel diunggah, dropdown Sheet Data menampilkan semua sheet workbook. Pengguna dapat memilih sheet aktif; default memprioritaskan "Pelanggan Tersisa", jika ada. Sheet "Realisasi Selesai" tetap diimpor sebagai sumber data selesai.
2. Pengaturan Kolom Excel memakai popover fixed dengan scroll vertikal/touch scrolling, agar semua kolom dapat dipilih di HP.
3. Pesan sambutan dipusatkan di layar dengan gaya lebih jelas; durasi 3 detik tetap dipertahankan.
4. Tombol Full Map dipindah ke pojok kanan atas.
5. Tombol Mulai Rekam Rute/Akhiri Rekam Rute melayang di kiri bawah layar utama. Tombol berubah merah ketika GPS sedang direkam. Tombol lama di menu disembunyikan.
6. Mode Realisasi menyembunyikan tombol rekam utama agar tidak bertumpuk dengan kontrol playback.
7. Tombol video manual Rekam Layar/Simpan Video diganti menjadi satu tombol "Buat & Download Video Rute".
8. Video dibuat dari snapshot area peta saja, bukan seluruh layar atau menu aplikasi. Peta dasar diambil sekali, kemudian garis rute dan marker digambar pada canvas 24 FPS.
9. Garis video tersambung antar titik GPS dalam sesi yang sama, dengan interpolasi Smoothstep. Sesi terpisah tetap tidak disambung paksa.
10. Foto lokasi dari IndexedDB ditampilkan sebagai kartu foto di kiri bawah video dan berganti sesuai timestamp rute.
11. Foto pelanggan tetap diekspor ke kolom FOTO RUMAH DATA/FOTO METER DATA sebagai data:image/jpeg;base64. Saat workbook diunggah pada perangkat lain, importer membaca seluruh sheet dan memulihkan foto ke IndexedDB lokal perangkat tersebut.

Catatan penting:
- Base64 di Excel adalah teks data gambar di dalam sel, bukan objek gambar Excel yang tertanam. Excel mobile dapat menampilkan teks terpotong karena lebar kolom, tetapi nilai sel tetap dapat memuat data lengkap.
- Batas panjang sel Excel adalah sekitar 32.767 karakter. Kompresi foto aplikasi membatasi blob foto pelanggan hingga <21 KB agar data URL masih muat dalam satu sel.
- Video MP4 hanya dibuat jika MediaRecorder browser benar-benar mendukung MP4. Jika tidak, file yang diunduh WebM agar tidak memberi ekstensi MP4 palsu.
- Snapshot peta memakai html2canvas; kualitas/kelengkapan tile peta bergantung pada dukungan CORS sumber tile.
- Pemeriksaan JavaScript Node --check lulus. Belum dilakukan runtime QA di Chrome Android pengguna; uji peta, izin GPS, upload multi-sheet, foto lintas perangkat, dan video tetap wajib di Preview sebelum Production.
- Penyimpanan foto di IndexedDB bersifat lokal. Foto lintas perangkat dipulihkan dari workbook yang berisi data Base64; tidak otomatis sinkron tanpa backend.
