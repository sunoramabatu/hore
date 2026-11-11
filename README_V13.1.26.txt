OYONID MAP V13.1.26 — ANIMATED WORKER & SATELLITE JOURNEY

Dasar: V13.1.25 3D Follow Cinematic.

Perubahan:
1. Animasi karakter memakai 8 frame hasil ekstraksi dari GIF referensi yang diberikan pengguna. Frame dipisahkan dari latar GIF dan disimpan sebagai PNG transparan agar dapat ditempelkan pada peta asli.
2. Karakter lebih mirip referensi: topi abu-abu MANBILL UP3, kacamata, seragam biru cyan, celana gelap dan tas pinggang.
3. Siklus langkah berganti frame; arah kiri/kanan mengikuti arah gerak GPS. Titik kaki karakter di-anchor ke titik GPS yang diproyeksikan.
4. Saat angle 45°, karakter dan peta menggunakan transformasi koordinat yang sama sehingga posisi karakter tidak bergeser dari GPS.
5. Kamera area/follow/oblique/arrival dibuat lebih dekat dan lebih seimbang.
6. Peta video ditangkap pada skala 2x agar lebih tajam.
7. Ekspor mencoba memakai Esri World Imagery untuk tampilan aerial/satelit yang lebih estetik. Jika tile tidak berhasil dimuat, otomatis memakai peta OSM yang sudah ada. Penggunaan citra satelit memerlukan koneksi internet; fitur peta offline tetap memakai tile lokal/cache seperti biasa.
8. HUD video diperbarui menjadi header navy premium dengan tanggal, jumlah selesai, jarak dan durasi asli.
9. Durasi asli HH:MM:SS tetap berasal dari rentang timestamp GPS/realisasi.

Batasan:
- Animasi menggunakan sprite 8-frame hasil cutout GIF, bukan model mesh 3D GLB. Ini adalah animasi 2D sprite dengan tampilan karakter 3D realistis.
- GIF referensi memperlihatkan karakter tampak samping/serong, bukan tampak belakang murni. Arah horizontal sprite mengikuti arah gerak; untuk karakter 3D sungguhan yang bisa diputar penuh diperlukan model GLB ber-rig.
- Satellite imagery dapat gagal dimuat pada jaringan tertentu atau jika tile tidak tersedia; fallback OSM disediakan.
- Wajib uji di Chrome Android: kualitas tile, posisi kaki di GPS, sudut 45°, foto, durasi, dan ekspor MP4/WebM.

Ketentuan lama:
- Garis biru hanya dari GPS petugas.
- Marker pelanggan dari koordinat pelanggan.
- Sesi GPS terpisah tidak disambung palsu.
- Foto, Excel dua sheet, Local-First, IndexedDB dan backup GPS dipertahankan.

Deploy:
- Gunakan branch v13.1.26-testing.
- Jangan deploy ke main/Production sebelum pengujian.
