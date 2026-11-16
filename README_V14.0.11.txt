OYONID MAP V14.0.11 — MONITORING UX & VIDEO SPRITE FIX

Baseline: OYONID MAP V14.0.10_MONITORING_COMPARE_BOTTOMBAR_PHOTO

Perubahan:
1. Saat checkbox Bandingkan digunakan dari detail pelanggan ketika halaman Monitoring aktif, aplikasi mencari data realisasi pelanggan pada rentang tanggal Monitoring dan membuka perbandingan DIJ vs Realisasi, bukan menjalankan mode bandingkan Tagging.
2. Bottom bar perbandingan otomatis diringkas menjadi header kecil agar peta dan kedua titik lebih terlihat. Tombol + membuka kembali detail dua lokasi. Tombol maximize/□ dihapus dari kartu detail.
3. Menu Monitoring memiliki tombol minimize sendiri di header. Tombol ini menyembunyikan isi menu Monitoring tanpa memengaruhi kartu detail.
4. Filter selisih lokasi baru diterapkan saat tombol Tampilkan ditekan. Ringkasan, daftar evaluasi, marker Realisasi, dan marker DIJ menggunakan filter jarak yang sama.
5. Statistik Jauh (>100 m) dihitung dari hasil filter aktif; jika filter Sangat dekat dipilih, jumlah Jauh menjadi 0.
6. Kartu petunjuk foto playback disembunyikan di halaman Monitoring; tetap tersedia di halaman Realisasi.
7. PNG worker-walk diperiksa; pulau alpha transparan tertutup kecil di dalam tubuh diperbaiki dengan inpainting lokal agar tidak tampak bolong di dada/topi/sepatu. Area transparan luar tubuh dipertahankan.

Validasi:
- node --check js/app.js: lulus
- node --check js/oyonid-video-engine-v2.js: lulus
- ZIP integrity: diperiksa setelah pengemasan

Catatan:
- Belum diuji secara visual di Chrome Android.
- Belum diunggah ke GitHub atau Vercel Production.
- Foto lama yang sudah kehilangan detail tidak dapat dipulihkan hanya dengan perubahan tampilan.
