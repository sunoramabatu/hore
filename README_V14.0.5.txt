OYONID MAP V14.0.5 — DURASI VIDEO TOTAL & WAKTU AKTIF

Perbaikan:
- Pilihan durasi video (15 detik sampai 5 menit) sekarang menjadi durasi TOTAL file, termasuk layar rekap penutup.
- Durasi layar rekap disisihkan dari total pilihan; durasi playback utama dikurangi dengan jumlah yang sama.
- Progress playback tetap menggunakan durasi bagian perjalanan, sedangkan penghentian recorder menggunakan total durasi.
- Jam kerja yang tampil selama playback tidak lagi memasukkan jeda sintetis 8 detik yang dipakai untuk memisahkan hari pada timeline video.
- Rekap total durasi pekerjaan tetap menjumlahkan durasi aktual harian, tanpa jeda antarhari.

Pemeriksaan:
- node --check js/app.js: lulus.
- node --check js/oyonid-video-engine-v2.js: lulus.
- Pemeriksaan statis: tidak ada deklarasi durasi lama yang tertinggal.
- Belum dilakukan render video browser/HP dengan workbook pelanggan nyata.
- Belum deploy ke GitHub/Vercel Production.
