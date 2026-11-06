OYONID MAP V13.1.8 — UPLOAD POPUP, SEARCH, FOTO PELANGGAN

Perubahan:
1. Notifikasi hasil upload tampil sebagai popup di bagian atas dan hilang otomatis setelah 4 detik.
2. Sambutan petugas tampil di tengah layar dengan kontras tinggi dan hilang setelah 3 detik. Suara sambutan tetap berjalan terpisah.
3. Kolom pencarian IDPEL memiliki tombol silang untuk menghapus isi.
4. Tombol Cari dan Scan Barcode disusun vertikal di samping kolom pencarian.
5. Pada detail pelanggan ditambahkan tombol Foto. Petugas dapat memilih Foto Rumah atau Foto Meteran.
6. Foto pelanggan diikat ke IDPEL + nomor meter, disimpan pada IndexedDB perangkat, dan ikut diekspor ke kolom FOTO RUMAH DATA / FOTO METER DATA di kedua sheet Excel dalam bentuk JPEG base64 terkompresi.
7. Saat Excel yang berisi kolom foto diunggah kembali, foto dipulihkan ke penyimpanan lokal perangkat.
8. Bottom navigation yang tidak memiliki fungsi andal dihapus. Fungsi Upload, Riwayat, dan Realisasi tetap tersedia dari menu utama.
9. Scrollbar menu sedikit ditebalkan dengan warna biru gelap yang selaras.

Batasan teknis:
- Foto dikompres kecil agar dapat disimpan sebagai teks base64 dalam sel Excel (batas sel Excel sekitar 32.767 karakter).
- Foto tetap terkait pelanggan berdasarkan IDPEL dan nomor meter. Jangan menghapus atau mengubah dua kolom identitas tersebut bila ingin foto tetap cocok saat Excel diunggah kembali.
- Foto di perangkat tersimpan lokal di IndexedDB; file Excel menjadi sarana pindah/cadangan antar perangkat.
- Pemeriksaan JavaScript Node --check: LULUS.
- Pemeriksaan struktur HTML/JS dan fitur yang ditambahkan: LULUS.
- Belum dilakukan uji langsung browser/HP Android pengguna.
