OYONID MAP LOCAL V13 — REALISASI & RIWAYAT RUTE PETUGAS

Basis: OYONID Map Local V12.

FITUR BARU
1. Tombol "Lihat Realisasi" membuka panel terpisah sehingga susunan utama peta tetap dipertahankan.
2. Pilih tanggal untuk menampilkan titik GPS aktual pelanggan yang sudah selesai, beserta popup nama dan jam selesai.
3. Tombol manual "Mulai Rekam Rute" dan "Akhiri Rekam Rute".
4. Titik rute direkam hanya setelah petugas menekan Mulai. Titik disimpan ketika berpindah sekitar 8 meter atau sudah 15 detik sejak titik terakhir.
5. Playback rute dengan Putar, Jeda, Ulang, dan pengaturan kecepatan.
6. Rute dan titik disimpan pada localStorage browser/perangkat ini.

CARA MENJALANKAN
- Ekstrak ZIP ke folder baru.
- Jalankan index.html menggunakan VS Code + Live Server.
- Untuk GPS di HP, deploy sebagai Preview HTTPS Vercel.
- Berikan izin lokasi kepada browser.
- Tekan Mulai Rekam Rute saat mulai kerja dan Akhiri Rekam Rute saat selesai.
- Buka Lihat Realisasi, pilih tanggal, lalu tampilkan titik atau putar rute.

BATASAN PENTING
- Browser HP dapat menghentikan geolocation ketika tab ditutup, layar terkunci, browser masuk background, atau sistem menghemat baterai. Untuk pelacakan yang konsisten saat layar mati diperlukan aplikasi Android native/foreground service.
- Penyimpanan bersifat lokal dan terikat pada origin/domain browser. Data tidak otomatis tersinkron antar HP, antar URL Preview Vercel, atau setelah data situs dihapus. Ekspor/backup tetap diperlukan.
- Playback menggambar garis antar sampel GPS, bukan jalur jalan yang pasti dilalui. Jarak garis lurus antartitik bukan jarak perjalanan jalan.
- Pengujian sintaks JavaScript berhasil; tetap lakukan uji lapangan singkat sebelum digunakan operasional.
