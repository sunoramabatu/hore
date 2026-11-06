OYONID MAP V13.1.7 — SMOOTH PLAYBACK & DARK GLASS UI

Perubahan:
1. Playback rute memakai animasi requestAnimationFrame dan interpolasi Smoothstep di antara titik GPS.
2. Marker petugas bergerak secara halus; garis rute tumbuh mengikuti gerakan, tidak meloncat ke setiap titik GPS.
3. Peta tidak digeser paksa setiap frame, untuk menghindari getaran/patah-patah.
4. Foto lokasi tidak lagi ditampilkan sebagai ikon kamera pada peta. Foto muncul pada kartu preview di kiri bawah mengikuti waktu playback.
5. Tampilan menu utama, header, panel realisasi, tombol melayang, dan bottom navigation memakai tema dark-glass biru.
6. Panel playback menjadi dock bawah yang lebih rapi dengan kontrol putar/jeda/ulang, slider, rekam, dan simpan.
7. Fallback rekam layar mencoba menangkap komposisi halaman penuh (peta + overlay + kontrol) dengan interval frame lebih rapat.
8. Resume setelah jeda mempertahankan posisi animasi saat ini.

Pemeriksaan:
- JavaScript Node --check: LULUS.
- Pemeriksaan elemen UI dan fungsi animasi: LULUS.
- Belum dilakukan pengujian runtime di Chrome Android perangkat pengguna.
- Kehalusan hasil video bergantung pada kemampuan perangkat dan browser. Screen capture native melalui getDisplayMedia lebih halus daripada fallback html2canvas.
- MP4 hanya dibuat jika MediaRecorder browser mendukung MP4; jika tidak, hasil WebM.
