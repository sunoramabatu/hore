OYONID MAP V13.1.5 — REALISASI KUMULATIF & KONTROL PLAYBACK

Basis: V13.1.4 Stabilization.

Perbaikan:
1. Kolom akurasi GPS saat ekspor dipetakan dari item.gpsAccuracy (Geolocation API coords.accuracy) untuk semua variasi nama kolom AKURASI GPS/GPT/HP. Jika tidak ada nilai sah, kolom kosong, tidak mengambil angka lama dari Excel.
2. Tombol kembali ke pelanggan tersisa dibuat selalu terlihat melalui dock kontrol tetap saat Mode Realisasi aktif.
3. Dock kontrol berisi Putar, Jeda, Ulang, slider posisi, kecepatan 1x-5x, Rekam layar, dan Simpan video.
4. Rekam layar memakai getDisplayMedia + MediaRecorder jika browser mendukung. MP4 hanya dipakai jika didukung; jika tidak, hasilnya WebM. Chrome Android tertentu mungkin tidak menyediakan getDisplayMedia.
5. Riwayat realisasi kumulatif lintas hari dipertahankan di localStorage. Ketika file RBM penuh diunggah ulang, pelanggan yang sudah tercatat selesai (IDPEL + nomor meter) otomatis dikeluarkan dari sheet/peta Pelanggan Tersisa.
6. Restore state juga menyaring ulang pelanggan yang telah selesai agar tidak muncul kembali setelah refresh.
7. Aplikasi meminta browser mempertahankan storage melalui navigator.storage.persist() jika tersedia. Persetujuan browser tidak dijamin.

Penting tentang penyimpanan:
- Realisasi disimpan di browser/perangkat/origin yang sama dan tidak memerlukan Download Excel untuk bertahan saat aplikasi dibuka lagi.
- Ini bukan cloud sync. Hapus data situs/browser, ganti perangkat, atau ganti domain/preview-production dapat menyebabkan data lokal tidak terbawa.
- Backup Excel/JSON tetap disarankan. Penyimpanan server lintas perangkat memerlukan backend.

Pengujian:
- Node.js syntax check dan pemeriksaan ID/handler dilakukan.
- Belum diuji langsung di Chrome Android; kemampuan MP4/screen capture tergantung browser dan perangkat.
