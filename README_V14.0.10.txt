OYONID MAP V14.0.10 — MONITORING COMPARE + PHOTO QUALITY

Perbaikan:
1. Saat memilih pelanggan dari marker Realisasi atau daftar evaluasi Monitoring, peta masuk mode perbandingan satu pelanggan.
2. Marker lain disembunyikan; hanya titik DIJ dan titik GPS Realisasi pelanggan terpilih yang ditampilkan, disertai garis putus-putus dan jarak.
3. Tidak ada popup Leaflet di atas marker. Detail ditampilkan melalui bottom bar dua kolom DIJ dan Realisasi.
4. Tombol tutup bottom bar mengembalikan marker Monitoring sesuai filter.
5. Kompresi foto baru diperbaiki: resolusi maksimum 1280px, kualitas JPEG adaptif hingga 0.84 dan batas 450KB. Ini mencegah kompresi ekstrem 220px/0.38.

Catatan penting:
- Foto lama yang sudah terlanjur disimpan dalam resolusi rendah tidak dapat dipulihkan detailnya dari Base64 lama. Untuk kualitas lebih baik, foto perlu diambil ulang setelah versi ini digunakan.
- Foto baru disimpan sebagai Blob di IndexedDB; ekspor Excel tetap menambahkan kolom FOTO RUMAH DATA dan FOTO METER DATA.
- Uji visual langsung di Android/Chrome belum dilakukan. Tidak ada deployment ke GitHub/Vercel.
