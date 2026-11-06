OYONID MAP V13.1.6 - PERBAIKAN REALISASI

Perubahan:
1. Upload Excel membaca Sheet 1 (Pelanggan Tersisa) dan Sheet 2 (Realisasi Selesai).
2. Jumlah pelanggan selesai diambil dari Sheet 2 dan digabungkan ke catatan realisasi lokal.
3. Fungsi rekam video dipindah ke scope global; tombol tidak lagi memanggil fungsi yang tidak terdefinisi.
4. Rekaman layar langsung digunakan jika browser mendukung getDisplayMedia.
5. Jika getDisplayMedia tidak tersedia, aplikasi mencoba merekam area peta menggunakan html2canvas + MediaRecorder.
6. Video diunduh sebagai MP4 hanya jika browser mendukung MP4; selain itu disimpan sebagai WebM (format video yang didukung browser).
7. Tombol kamera melayang untuk foto lokasi; foto dikompresi dan disimpan di IndexedDB bersama koordinat GPS/waktu.
8. Foto lokasi ditampilkan sebagai marker foto saat playback mencapai waktu pengambilan foto.
9. Panel realisasi dan kontrol playback dibuat lebih ringkas agar peta tetap terlihat.

Catatan uji:
- Pemeriksaan sintaks JavaScript dengan Node.js: LULUS.
- Pemeriksaan struktur fitur dan wiring: LULUS.
- Belum dilakukan uji langsung pada perangkat Android/browser pengguna.
- MP4 bergantung pada dukungan codec MediaRecorder browser. Jika tidak didukung, file hasil adalah WebM yang dapat diputar di perangkat modern.
- Penyimpanan foto dan realisasi bersifat lokal pada browser/perangkat yang sama.
