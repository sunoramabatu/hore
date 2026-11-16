OYONID MAP V14.0.4 — VIDEO MULTI-HARI & REKAP HARIAN

Perubahan:
- Mesin video sekarang mengambil rentang dari kalender Realisasi (v14RealizationDateRange), bukan input tanggal video lama yang sudah dihapus.
- Video tetap mengurutkan tanggal secara kronologis dan mempertahankan sesi GPS sebagai segmen terpisah.
- Rekap penutup video menampilkan ringkasan per hari (tanggal, jumlah pelanggan selesai, dan jarak GPS hari itu; maksimum empat hari ditampilkan langsung, sisanya diringkas sebagai jumlah hari tambahan).
- Durasi pekerjaan total dihitung dari penjumlahan durasi aktual tiap hari, tanpa memasukkan jeda buatan antarhari pada timeline video.
- Pencocokan foto pelanggan dibatasi berdasarkan identitas dan tanggal yang sama; prioritas Foto Rumah, kemudian Foto Meteran, lalu Foto Lokasi sebagai fallback.
- Foto pelanggan sebelumnya dibersihkan saat playback berpindah ke pelanggan/hari berikutnya agar tidak tertampil pada pelanggan lain.

Pemeriksaan teknis:
- node --check js/app.js: lulus.
- node --check js/oyonid-video-engine-v2.js: lulus.
- Tidak ditemukan ID HTML duplikat.
- Referensi input tanggal video lama tidak ditemukan di mesin video.
- ZIP integrity check dilakukan setelah pengemasan.

Batas pengujian:
- Belum dilakukan uji browser/HP dengan workbook pelanggan nyata.
- Belum diverifikasi hasil visual video hasil render, khususnya posisi foto, layout rekap multi-hari, dan kecocokan data foto dari beberapa tanggal.
- Belum diunggah ke GitHub atau Vercel Production.
