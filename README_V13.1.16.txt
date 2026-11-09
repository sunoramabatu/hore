OYONID MAP V13.1.16 — REALISASI DATE + GPS MARKER + FOTO EXCEL

Perbaikan utama:
1. Kalender realisasi khusus OYONID. Tanggal yang memiliki data selesai diberi warna hijau dan angka tebal; tanggal terpilih diberi warna biru.
2. Saat Mode Realisasi dibuka, aplikasi memilih tanggal realisasi terbaru yang memiliki data, bukan otomatis tanggal hari ini yang mungkin kosong.
3. Pembacaan tanggal Sheet 2 mengutamakan TANGGAL SELESAI + JAM SELESAI (format lokal Indonesia, misalnya 5/11/2026 dan 22.50.44), lalu memakai ISO sebagai fallback.
4. Data realisasi yang diimpor ulang memperbarui record lama berdasarkan identitas pelanggan agar tanggal yang salah dari cache lama tidak tetap tertinggal.
5. Playback menggambar marker hijau tetap pada setiap lokasi pelanggan selesai, di samping marker biru petugas yang bergerak.
6. Playback membaca FOTO RUMAH DATA dan FOTO METER DATA langsung dari data:image Base64 di Sheet 2, selain foto yang tersimpan di IndexedDB.
7. Foto yang bersumber dari Excel juga dapat dipakai pada kartu foto playback dan proses pembuatan video.
8. Video menampilkan marker pelanggan selesai sebagai pin hijau, garis rute, marker bergerak, dan foto yang cocok.
9. Label kembali ke mode utama menggunakan nama Tagging.

Hasil audit workbook contoh:
- Sheet: Pelanggan Tersisa dan Realisasi Selesai.
- Realisasi Selesai: 16 baris pelanggan.
- 5 November 2026: 7 pelanggan, 7 koordinat GPS, belum ada foto pada kolom foto.
- 6 November 2026: 9 pelanggan, 9 koordinat GPS, 7 foto rumah dan 2 foto meter.
- Format waktu ISO menggunakan UTC (akhiran Z); kalender menggunakan tanggal/jam lokal pada kolom TANGGAL SELESAI dan JAM SELESAI.

Validasi:
- Jalankan node --check js/app.js.
- ZIP integrity check.
- Perlu uji browser nyata untuk GPS, IndexedDB, rendering peta, dan MediaRecorder; jangan anggap lolos hanya dari pemeriksaan sintaks.
