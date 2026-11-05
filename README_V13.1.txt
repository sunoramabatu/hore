OYONID MAP V13.1 — STABILIZATION
Basis: ZIP V13 yang diberikan pengguna.

Perubahan:
- Ekspos fungsi onclick ke window secara eksplisit.
- Mode realisasi: sembunyikan cluster pelanggan belum selesai, tampilkan marker pelanggan selesai pada GPS realisasi valid.
- Tombol Tutup Realisasi mengembalikan layer pelanggan tersisa.
- Ekspor Excel dua sheet: Pelanggan Tersisa dan Realisasi Selesai.
- Riwayat lama yang belum punya record realisasi dimasukkan sebagai legacy selesai; GPS kosong dan diberi catatan, tidak mengarang koordinat.
- Rekaman rute dimulai setelah GPS awal valid; filter akurasi >60m dan lonjakan >300m dalam <=5 detik.
- Playback memisahkan sesi rute.
- Perbaikan rollback ketika penyimpanan realisasi gagal.

Catatan:
- Data disimpan lokal per origin/browser; Preview dan Production tidak berbagi localStorage.
- GPS perlu HTTPS dan izin lokasi.
- Tab yang disuspensi Android dapat menghentikan GPS.
- Sudah diperiksa sintaks JS dengan Node; tetap wajib uji fungsi di Chrome Android/PC sebelum dipakai operasional.
