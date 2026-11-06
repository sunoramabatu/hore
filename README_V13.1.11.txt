OYONID MAP V13.1.11 — GPS PLAYBACK + PHOTO TIMELINE + MAP VIDEO + SHEET PICKER

Perubahan:
1. Playback sekarang menggabungkan titik GPS dari sesi rekam rute DAN GPS realisasi pelanggan yang selesai pada tanggal terpilih. Ini membuat lokasi pelanggan yang selesai ikut menjadi waypoint playback meskipun watchPosition hanya menghasilkan sedikit titik.
2. Semua titik diurutkan menurut timestamp. Titik yang sangat berdekatan (<3 meter dan <5 detik) dideduplikasi.
3. Segmen digabung sebagai satu perjalanan jika jeda waktu <=30 menit dan jarak antartitik <=2.000 meter. Jika melewati salah satu batas, dibuat perjalanan/segmen terpisah. Titik dari sesi manual yang sama tetap dianggap satu sesi.
4. Garis biru mempertahankan setiap vertex GPS yang dilewati; marker bergerak dengan interpolasi Smoothstep.
5. Playback foto menggabungkan Foto Lokasi dari GPS photo metadata dan Foto Rumah/Foto Meteran dari metadata pelanggan yang dicocokkan dengan IDPEL/nomor meter lalu diposisikan memakai GPS realisasi pelanggan. Pergantian foto dievaluasi sepanjang interpolasi waktu/lokasi.
6. Foto playback tampil di kartu kiri bawah, di atas dock playback.
7. Tombol Mulai/Akhiri Rekam Rute dipindahkan menjadi tombol melayang kiri bawah. Sampling GPS dibuat lebih rapat: minimal 4 meter atau 5 detik; lonjakan ekstrim tetap disaring.
8. Satu tombol Buat & Download Video Rute. Video dibuat dari snapshot elemen peta saja (menu tidak ikut), lalu garis rute, marker bergerak, dan foto lokasi dirender ke canvas 24 FPS dan direkam otomatis dengan MediaRecorder.
9. MP4 dipilih jika MediaRecorder browser mendukungnya; jika tidak, unduhan WebM. Tidak mengganti ekstensi file secara palsu.
10. Full Map diposisikan di pojok kanan atas.
11. Pengaturan kolom Excel dipindahkan sementara ke document.body saat terbuka sehingga tidak terpotong oleh menu scroll. Posisi dropdown dihitung berdasarkan tombol pengaturan agar tombol utama tidak tertutup.
12. Dropdown memilih sheet sumber data untuk peta (Sheet 1/Sheet 2/semua sheet workbook). Sheet "Realisasi Selesai" tetap diimpor ke catatan selesai.
13. Cache JS/CSS dan build marker dinaikkan ke V13.1.11.

Validasi yang dilakukan:
- Node.js --check untuk js/app.js: LULUS.
- Tidak ada ID HTML duplikat.
- Pemeriksaan wiring selector sheet, tombol rekam GPS, tombol video otomatis, peta-only capture, dan foto playback: LULUS.
- Uji logika journey sintetis: sesi berdekatan + titik GPS realisasi pelanggan menghasilkan 1 perjalanan berisi 6 titik; perjalanan jauh tetap dipisah.
- Belum diuji langsung pada perangkat Android pengguna. Kualitas video, unduhan, CORS tile map, serta MediaRecorder perlu diuji di Preview.
- Video memakai satu snapshot peta yang statis sebagai latar; rute/marker/foto dianimasikan di atasnya. Menu tidak ikut terekam.
- Data GPS/foto tersimpan lokal di origin/perangkat; pindah perangkat/domain memerlukan ekspor/backup data.
