OYONID MAP V14.0.13 — MONITORING DATA QUALITY AUDIT

Baseline: OYONID MAP V14.0.12_MONITORING_FILTER_COMPARE_HARDENING

Update:
1. Menambahkan panel Pemeriksaan Kualitas Data pada halaman Monitoring.
2. Menampilkan jumlah record pada rentang tanggal aktif.
3. Menghitung jumlah record tanpa koordinat DIJ yang valid.
4. Menghitung jumlah record tanpa koordinat Realisasi yang valid.
5. Menghitung jumlah IDPEL yang muncul lebih dari sekali pada kumpulan record terpilih.
6. Panel mengikuti rentang tanggal dan filter Hari Baca aktif; tidak mengubah data Excel atau menghapus/menggabungkan record.
7. Definisi IDPEL duplikat: banyaknya nilai IDPEL berbeda yang memiliki kemunculan lebih dari satu.

Validasi: pemeriksaan sintaks JavaScript dan integritas ZIP. Belum dilakukan uji browser Android.
Tidak mengubah GitHub, branch, Vercel Production, atau format dua sheet Excel.
