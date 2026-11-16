OYONID MAP V14.0.12 — MONITORING FILTER & COMPARE DOCK HARDENING

Baseline: OYONID MAP V14.0.11_MONITORING_UX_SPRITE_FIX

Perubahan:
1. Menambahkan satu state filter jarak yang sudah diterapkan (committed filter). Peta marker DIJ, marker Realisasi, ringkasan, rata-rata, angka Jauh, dan daftar pelanggan membaca state yang sama.
2. Memilih dropdown tidak lagi diam-diam mengubah hasil. Tombol Tampilkan menerapkan pilihan dan mengembalikan label tombol ke kondisi normal.
3. Ketika filter Sangat dekat diterapkan, daftar hanya berisi selisih 0–10 m dan hitungan Jauh (>100 m) otomatis nol. Filter kategori lain juga memakai aturan bucket yang sama.
4. Jalur checkbox Bandingkan di halaman Monitoring dipisahkan tegas dari mode Bandingkan Tagging. Jika data realisasi pada rentang tanggal tidak ditemukan, checkbox dibatalkan dan pesan ditampilkan.
5. Kartu perbandingan dipaksa menjadi dock bawah yang ringkas; konten detail tetap tersembunyi saat pertama dibuka agar peta tidak tertutup. Tombol + membuka data DIJ dan Realisasi.
6. Tombol maximize kartu disembunyikan selama mode Monitoring dan dipulihkan saat kartu ditutup.
7. Kartu petunjuk foto playback tetap disembunyikan di Monitoring.

Validasi teknis:
- node --check js/app.js: lulus
- node --check js/oyonid-video-engine-v2.js: lulus
- Pemeriksaan ZIP: dilakukan setelah pengemasan
- Belum dilakukan uji visual Chrome Android atau render video langsung.

Catatan:
- Tidak mengubah data pelanggan atau struktur dua sheet Excel.
- Tidak mengubah GitHub, branch, atau Vercel Production.
