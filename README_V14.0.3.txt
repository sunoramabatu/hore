OYONID MAP V14.0.3 — RENTANG TANGGAL REALISASI

Perubahan:
- Kalender Realisasi memakai pemilihan rentang: klik tanggal awal, lalu tanggal akhir.
- Klik lagi setelah rentang terbentuk untuk memulai rentang baru.
- Ringkasan Realisasi, pelanggan GPS, dan sesi rute memakai rentang terpilih.
- Kontrol video tidak lagi memiliki input tanggal duplikat; tanggal mengikuti kalender Realisasi.
- Pengambilan foto untuk video dan pencocokan foto playback mengikuti rentang tanggal terpilih.
- Struktur data GPS dan sesi sumber tidak dimutasi atau digabung antar sesi.

Pemeriksaan:
- Jalankan node --check pada js/app.js dan js/oyonid-video-engine-v2.js.
- ZIP integrity check.

Catatan:
- Video multi-hari masih memerlukan pengujian visual dan validasi foto per tanggal.
- Belum diuji pada browser/HP dan belum di-deploy ke Vercel Production.
