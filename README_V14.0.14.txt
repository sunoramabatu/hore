OYONID MAP V14.0.14 — MONITORING AUDIT & REPORT

Baseline: OYONID MAP V14.0.13_DATA_QUALITY_AUDIT

Update:
1. Memperbaiki metrik "Jauh (>100 m)" agar dihitung dari kumpulan pelanggan yang sudah lolos filter jarak aktif. Jika filter Sangat dekat dipilih, jumlah Jauh menjadi 0.
2. Daftar evaluasi DIJ vs Realisasi kini menampilkan hingga 30 pelanggan dan menggunakan indeks record, bukan IDPEL saja, agar pelanggan dengan IDPEL berulang tidak salah terpilih dari daftar.
3. Menambahkan audit ketersediaan foto rumah dan foto meter berdasarkan Base64 di Excel atau Blob IndexedDB.
4. Menampilkan jumlah record tanpa foto serta format data URL foto yang perlu diperiksa.
5. Menambahkan tombol Unduh Laporan Audit CSV dengan tanggal, IDPEL, nama, Hari Baca, koordinat DIJ/Realisasi, selisih, kategori, status koordinat, dan indikasi foto di Excel.
6. Laporan CSV terpisah; format workbook utama tetap dua sheet dan tidak diubah.
7. Tidak mengubah data sumber, tidak menghapus/menggabungkan pelanggan, tidak mengubah GitHub/branch/Vercel.

Validasi yang dilakukan:
- node --check js/app.js: lulus.
- node --check js/oyonid-video-engine-v2.js: lulus.
- ZIP integrity: diperiksa setelah dibuat.

Belum dilakukan:
- Uji browser Android langsung.
- Uji unduhan CSV pada perangkat HP.
- Uji visual seluruh alur foto pada data Excel nyata.
