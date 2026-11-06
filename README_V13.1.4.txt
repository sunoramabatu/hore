OYONID MAP V13.1.4 — REALISASI, EXCEL & GPS PLAYBACK

Basis:
- OYONID_MAP_V13_1_3_STABILIZATION.zip

Perbaikan:
1. Marker diagnostic kini dihitung dari array marker yang benar-benar dibuat:
   - totalRows
   - dijCreated
   - dijInvalid
   - backupCreated
   Ini memperbaiki laporan 0 marker palsu pada V13.1.3.
2. Riwayat ditampilkan paling baru di atas. Tombol Undo tetap mengacu pada indeks asli sehingga tidak salah mengembalikan pelanggan.
3. Ekspor Excel mempertahankan isi kolom LAT/LON pembanding dari sumber, termasuk sel kosong.
   Kolom pembanding kosong tidak lagi diisi hasil inferensi/NaN.
4. Tombol kembali pada panel realisasi diperjelas menjadi "Kembali ke Pelanggan Tersisa".
   Saat ditutup, layer pelanggan dipulihkan dan peta di-zoom ke marker yang tersisa.
5. Playback rute mendukung Putar, Jeda/lanjut, Ulang, kecepatan 1x-5x, dan slider posisi perjalanan.
6. Setiap sesi GPS digambar sebagai segmen terpisah; playback tidak menghubungkan akhir sesi ke awal sesi berikutnya.
7. Ditambahkan tombol Unduh Cadangan GPS (JSON), yang mengunduh sesi tersimpan dan sesi aktif dari localStorage browser.

Penyimpanan:
- Sesi GPS tetap disimpan di localStorage pada browser/perangkat/origin yang merekam.
- Backup JSON disediakan agar pengguna dapat menyimpan salinan di luar browser.
- Data GPS tidak otomatis tersinkron ke perangkat lain atau server.

Verifikasi:
- Node.js syntax check lulus.
- Pemeriksaan struktur HTML/handler dan fitur utama lulus.
- Belum dilakukan runtime test pada Chrome Android atau pengujian kamera/MP4.
- Data pelanggan dan koordinat Excel tidak dimasukkan ke ZIP ini.
