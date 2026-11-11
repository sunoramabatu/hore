OYONID MAP V13.1.21 — WIDE JOURNEY VIDEO ENGINE V2
Basis: V13.1.20 LOCAL-FIRST 2 SHEETS.

TUJUAN
Meningkatkan Video Realisasi tanpa menulis ulang mesin peta, GPS, Excel, atau penyimpanan lokal.

PERUBAHAN
1. Video export dipisahkan ke file modular js/oyonid-video-engine-v2.js.
2. Garis biru video sekarang hanya digambar dari titik GPS petugas (kind=track).
3. Koordinat pelanggan selesai tetap menjadi marker hijau terpisah dan event Arrival; tidak dicampur ke garis GPS petugas.
4. Peta direkam dengan batas area lebih lebar (padding 42%, max zoom 14) untuk mengurangi kesan peta terlalu dekat.
5. Kamera hybrid menggunakan Wide View pada pembuka/penutup, Follow View selama perjalanan, dan Arrival View saat titik pelanggan dicapai.
6. Kamera bergerak dengan interpolasi/easing dan tidak memutar peta mengikuti setiap belokan, untuk mengurangi motion sickness.
7. Timing adaptif membagi durasi berdasarkan bobot jarak dan interval waktu GPS, dengan batas agar satu segmen panjang tidak mendominasi.
8. Disediakan jeda visual singkat pada event kedatangan pelanggan.
9. Foto pelanggan tetap dibaca dari metadata playback/Base64 Excel melalui fungsi lama, lalu ditampilkan utuh (contain) pada kartu video.
10. Karakter petugas digambar secara prosedural di Canvas: seragam biru, panel bahu abu-abu, lengan dalam biru tua, celana gelap, tas pinggang, kacamata, dan topi abu-abu berlabel MANBILL UP3.
11. Statistik jumlah selesai, jarak GPS, durasi asli, dan progres tetap menjadi overlay video.
12. Output tetap portrait 9:16 agar kompatibel dengan alur video Realisasi sebelumnya.
13. Mesin video lama di js/app.js tetap ada sebagai fallback kode; fungsi ekspor aktif ditimpa oleh modul V2 setelah app.js dimuat.

BATASAN YANG DIKETAHUI
- Karakter pada versi ini adalah ilustrasi 2.5D prosedural Canvas, bukan model mesh 3D GLB penuh. Ini sengaja dipilih agar tidak menambah unduhan model 3D eksternal dan tetap ringan/offline. Model GLB rigged dapat menjadi tahap lanjutan setelah kualitas kamera dan timing V2 lulus.
- Kamera hybrid bekerja pada snapshot peta yang dirender ulang secara transformasi Canvas; bukan kamera 3D dunia nyata. Peta tetap berasal dari Leaflet.
- Jika data tanggal hanya memiliki marker pelanggan tanpa rekaman GPS petugas, video menampilkan pesan bahwa GPS track belum tersedia, karena garis biru tidak boleh direkayasa dari koordinat pelanggan.
- Ekspor MP4 tergantung dukungan MediaRecorder browser. Jika tidak didukung, Chrome dapat menghasilkan WebM.
- Uji browser Android, hasil visual, dan performa video belum dilakukan dalam lingkungan perangkat nyata.

FITUR LAMA YANG DIPERTAHANKAN
- Leaflet dan marker cluster.
- GPS dan riwayat realisasi.
- Struktur Excel dua sheet: Pelanggan Tersisa dan Realisasi Selesai.
- Foto Base64 Sheet 2 dan penyimpanan IndexedDB.
- Local-First.
- Playback GPS lama.
- Struktur data koordinat pelanggan tidak diubah.

PEMERIKSAAN YANG DILAKUKAN
- node --check js/app.js
- node --check js/oyonid-video-engine-v2.js
- Cache version CSS/JS 13.1.21
- Integritas ZIP
- Tidak ada ID HTML duplikat

CARA UJI
1. Ekstrak ZIP ke folder baru di Windows.
2. Jalankan dengan server lokal (misalnya Live Server) atau deploy ke branch testing baru.
3. Pilih tanggal yang memiliki rekaman GPS petugas dan pelanggan selesai.
4. Buat video 30 detik terlebih dahulu.
5. Periksa: garis biru hanya mengikuti GPS petugas; marker hijau tetap pada koordinat pelanggan; kamera lebih lebar; transisi tidak berputar tajam; foto muncul saat Arrival; karakter berjalan dan berhenti saat tiba.
6. Uji lagi 1 menit dan 2 menit, kemudian bandingkan hasilnya.
7. Lakukan regresi: tagging, Excel dua sheet, GPS, foto, offline, Local-First.

PENTING
Jangan deploy langsung ke Production/main. Uji di branch testing terlebih dahulu. Backup ZIP V13.1.20 tetap disimpan sebagai sumber pemulihan.
