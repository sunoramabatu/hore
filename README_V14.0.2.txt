OYONID MAP V14.0.2 — MONITORING MARKER FOUNDATION

Berdasarkan ZIP V14.0.1 PAGE SEPARATION.

Perubahan tahap ini:
- Monitoring memiliki pencarian IDPEL / nomor meter dengan pola pencarian minimal 4 digit.
- Marker DIJ dapat ditampilkan/disembunyikan di Monitoring.
- Marker Lokasi Realisasi menggunakan actualLat/actualLon dari catatan pelanggan selesai yang tersimpan.
- Marker realisasi mengikuti rentang tanggal Monitoring.
- Filter Hari Baca tersedia di Monitoring.
- Kontrol Urutan Baca di Monitoring mengubah ikon DIJ tanpa membangun ulang seluruh data marker.
- Status filter Hari Baca dan Urutan Baca sebelum masuk Monitoring dipulihkan saat kembali ke Tagging.
- Monitoring tidak menampilkan marker Lokasi Cadangan.
- Statistik jarak/durasi tetap dihitung dari sesi GPS tersimpan; sesi tidak disambungkan antarhari.

Pemeriksaan otomatis:
- node --check js/app.js: lulus
- node --check js/oyonid-video-engine-v2.js: lulus
- ID HTML duplikat: tidak ditemukan
- ZIP integrity: diperiksa setelah dibuat

Batas pengujian:
Belum dilakukan uji visual browser/HP dan belum diuji menggunakan file Excel pelanggan nyata.
Belum diunggah ke GitHub atau Vercel. Jangan deploy Production sebelum uji lokal.
