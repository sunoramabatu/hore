OYONID MAP V13.1.25 — 3D FOLLOW CINEMATIC

Dasar: V13.1.24 Local Area Cinematic.

Perbaikan:
1. Zoom kamera diperbesar untuk fokus pada blok pelanggan di sekitar petugas, bukan seluruh kota.
2. Mode kamera dalam satu video: Area, Follow, Oblique 45°, Arrival.
3. Follow camera menempatkan petugas pada titik GPS yang sedang diputar; peta bergerak di bawahnya.
4. Karakter digambar lebih kecil dan proporsional agar tidak mendominasi peta.
5. Karakter diperbarui menjadi ilustrasi 3D-style procedural dengan volume, shading, anggota tubuh artikulatif, langkah kaki bergantian, ayunan tangan, gerak badan, topi abu-abu MANBILL UP3, seragam cyan dan tas.
6. Karakter tetap tegak saat peta berganti angle; tampilan belakang digunakan untuk Follow dan tampilan depan untuk Arrival.
7. HUD menampilkan Durasi asli HH:MM:SS yang berjalan sesuai rentang waktu rekaman GPS/realisasi, selain jarak dan jumlah pelanggan.
8. Garis biru tetap bersumber dari GPS petugas. Marker pelanggan berasal dari koordinat pelanggan dan muncul bertahap.
9. Format Excel dua sheet dan GPS session recovery dipertahankan.

Batasan penting:
- Karakter saat ini adalah 3D-style procedural yang digambar dengan Canvas 2D memakai bentuk volume dan sendi; bukan model mesh 3D GLB/GLTF sungguhan. Untuk model manusia 3D realistis penuh diperlukan aset GLB ber-rig dan renderer WebGL/Three.js, yang harus ditambahkan sebagai modul terpisah dan diuji kompatibilitas/offline.
- Kamera follow lebih dekat dan fokus lokal. Jika ada lokasi pelanggan yang sangat berjauhan, video tetap mengikuti jalur GPS; tidak memaksa semua lokasi terlihat sekaligus.
- Oblique 45° adalah perspektif 2.5D pada snapshot peta, bukan bangunan 3D.
- Perlu pengujian nyata Chrome Android untuk memastikan framing tidak terlalu crop, gerak kamera mulus, dan MediaRecorder stabil.

Uji:
1. Deploy ke branch v13.1.25-testing, jangan ke main.
2. Pilih tanggal dengan beberapa sesi GPS.
3. Buat video 30 detik.
4. Periksa karakter kecil, kaki tepat pada GPS, kamera bergerak mengikuti perjalanan, angle berubah, dan Durasi asli bertambah.
