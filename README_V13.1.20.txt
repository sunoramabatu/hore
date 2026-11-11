OYONID MAP V13.1.20 — LOCAL-FIRST ACCUMULATIVE

Basis: V13.1.19 PHOTO FIT & QUALITY.

PERUBAHAN
1. Tombol Mulai Rekam Rute menyesuaikan posisi secara otomatis ketika Detail Pelanggan terbuka, sehingga tidak menutupi bottom bar. Posisi diperbarui saat ukuran panel berubah dan saat layar diubah ukurannya.
2. Pengaturan kolom Excel disimpan di localStorage dan dicadangkan ke IndexedDB, termasuk daftar header kolom. Setelah refresh, pengaturan kolom dapat dibuka dari data header tersimpan tanpa harus upload ulang hanya untuk membuka menu pengaturan.
3. Data sumber pelanggan, daftar kerja, header Excel, mapping kolom, format koordinat GPS, dan riwayat realisasi dicadangkan ke IndexedDB pada perangkat.
4. Riwayat pelanggan selesai tetap kumulatif lintas hari. Daftar kerja dibentuk kembali dari data sumber dikurangi pelanggan yang sudah tercatat selesai.
5. Riwayat rute GPS juga dicadangkan ke IndexedDB.
6. localStorage tetap dipakai sebagai kompatibilitas/cadangan cepat untuk versi lama; IndexedDB menjadi penyimpanan lokal utama tambahan.
7. Ekspor Excel DIKUNCI tepat dua sheet: "Pelanggan Tersisa" dan "Realisasi Selesai". Tidak ada sheet ketiga.
8. Versi cache diperbarui ke 13.1.20.

ARSITEKTUR
- Tidak menggunakan Supabase atau backend.
- Setiap petugas bekerja pada database lokal di HP/browser masing-masing.
- Data antar-HP tidak otomatis tergabung. Admin mengumpulkan hasil ekspor Excel masing-masing petugas.
- Excel sumber tidak dimodifikasi; ekspor membuat file rekap baru.

CATATAN PENTING
- Penyimpanan lokal tetap memiliki risiko jika data browser dihapus, aplikasi/browser di-reset, atau HP rusak. Backup eksternal berkala tetap diperlukan. Fitur ekspor backup/pemulihan lengkap termasuk foto perlu diuji/ditambahkan sebagai tahap berikutnya.
- Uji browser Android nyata belum dilakukan. Pemeriksaan yang dilakukan: sintaks JavaScript, struktur ZIP, cache version, dan jumlah sheet ekspor pada kode.

CARA UJI
1. Deploy ke branch testing, jangan ke main/Production.
2. Upload Excel, atur mapping kolom, refresh halaman, lalu buka Pengaturan Kolom Excel. Pastikan header tetap muncul.
3. Buka detail pelanggan. Pastikan tombol Mulai Rekam Rute berada di atas panel dan tidak menutupi isi bottom bar.
4. Selesaikan beberapa pelanggan, refresh halaman, pastikan progres selesai tetap tersimpan dan pelanggan tidak kembali ke daftar tersisa.
5. Ekspor Excel dan pastikan hanya ada dua sheet: Pelanggan Tersisa dan Realisasi Selesai.
