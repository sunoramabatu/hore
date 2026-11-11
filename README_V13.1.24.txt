OYONID MAP V13.1.24 — LOCAL AREA CINEMATIC CAMERA

Dasar: V13.1.23 Wide Journey Cinematic.

Perubahan utama:
1. Kamera tidak lagi membuka seluruh rute dalam wide view yang terlalu jauh. Opening hanya overview lokal di sekitar posisi petugas.
2. Empat komposisi dalam satu video: Area View (lokal), Follow, Oblique 45° (simulasi perspektif pada snapshot peta), Arrival close-up.
3. Kamera mengikuti koordinat GPS petugas. Karakter digambar tepat di proyeksi titik GPS aktif, bukan lagi di tengah layar secara tetap.
4. Garis GPS biru lebih tebal dan tetap di bawah karakter.
5. Marker pelanggan muncul progresif setelah timestamp penyelesaian dan tetap terlihat.
6. Karakter Canvas 2.5D ditingkatkan dengan shading, detail seragam, topi MANBILL UP3, tas, dan animasi langkah. Karakter tetap tegak ketika kamera berubah angle.
7. Zoom difokuskan pada area baca agar marker pelanggan tidak menumpuk karena full-route fit.

Batasan teknis yang harus diketahui:
- Oblique 45° adalah transformasi perspektif 2.5D dari layer peta Leaflet yang sedang digunakan. Ini bukan bangunan 3D fotogrametri.
- Gambar rumah pada peta mengikuti tile provider yang dipakai aplikasi. Foto rumah pelanggan tetap tampil pada kartu foto.
- Karakter saat ini 2.5D Canvas, bukan model manusia GLB 3D rigged. Untuk 3D realistis penuh diperlukan model GLB/GLTF dan animasi tulang.
- Uji nyata pada Chrome Android tetap diperlukan untuk memeriksa framing, performa, dan codec ekspor.

GPS:
- Sesi GPS terpisah tetap digambar terpisah; tidak disambung dengan garis palsu.
- GPS petugas adalah satu-satunya sumber garis biru.
- Marker pelanggan berasal dari koordinat pelanggan.
- Format Excel tetap dua sheet.
- Fitur Backup/Pulihkan GPS V13.1.22 tetap ada.

Uji:
1. Deploy pada branch testing baru.
2. Pilih tanggal dengan beberapa sesi GPS.
3. Buat video 30 detik.
4. Periksa apakah karakter menempel pada garis GPS, angle berubah nyata, dan fokus kamera mengikuti area baca.
