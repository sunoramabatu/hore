OYONID MAP V14.0.6 — PERAPIAN REKAP VIDEO

Perbaikan:
- Garis pemisah pada layar rekap akhir video diturunkan agar tidak memotong/bertabrakan dengan label metrik baris pertama.
- Garis pembagi vertikal pada area metrik diselaraskan dengan posisi pemisah baru.

Audit lanjutan:
- Timeline video multi-hari menggunakan jeda sintetis antarhari, tetapi garis GPS tetap digambar per sesi dan tidak disambungkan antar sesi.
- Rekap harian menggabungkan tanggal dari sesi GPS dan pelanggan selesai; tanggal yang hanya memiliki salah satunya tetap muncul dengan nilai lainnya nol.
- Durasi pilihan video tetap mencakup layar rekap penutup.
- Foto rumah dan meter diprioritaskan berdasarkan identitas pelanggan dan hari; fallback lokasi dibatasi pada hari yang sama serta kedekatan waktu/jarak.

Pemeriksaan:
- node --check js/app.js: lulus.
- node --check js/oyonid-video-engine-v2.js: lulus.
- ZIP diuji dengan unzip -t.
- Belum dilakukan render video aktual di browser/HP; belum deploy Production.
