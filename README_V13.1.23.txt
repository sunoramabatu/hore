OYONID MAP V13.1.23 — WIDE JOURNEY CINEMATIC

Dasar: V13.1.22 GPS Recovery & Video Compatibility.

Perubahan:
1. Video menggabungkan seluruh sesi GPS petugas pada tanggal terpilih.
2. Setiap sesi GPS digambar sebagai segmen terpisah. Tidak ada garis biru palsu yang menyambungkan sesi yang dihentikan.
3. Customer completion events diproses terpisah dari track GPS.
4. Marker pelanggan muncul bertahap berdasarkan timestamp penyelesaian dan tetap terlihat setelah muncul.
5. Deduplikasi playback diperketat: hanya sampel GPS yang benar-benar duplikat dalam sesi yang sama yang dapat dilewati. Event pelanggan tidak pernah digabung.
6. Satu video menyusun empat angle: Wide, Follow, Oblique 2.5D, Arrival, lalu Wide outro.
7. Karakter dibuat tetap tegak dan hanya mengubah arah kiri/kanan agar tidak terbalik. Animasi langkah mengikuti waktu perjalanan.
8. Garis GPS biru dibuat lebih tebal dan kontras.
9. Format Excel tetap dua sheet. GPS Recovery V13.1.22 tetap tersedia.

Catatan batasan:
- Oblique adalah simulasi perspektif 2.5D dari snapshot peta Leaflet, bukan peta 3D bangunan.
- Karakter masih ilustrasi 2.5D Canvas, belum model GLB rigged 3D.
- Uji ekspor nyata di Chrome Android diperlukan untuk memastikan codec, performa, dan hasil visual.
- Durasi video yang sangat singkat memampatkan perjalanan; seluruh event pelanggan bertimestamp yang tersedia tetap diproses.
- Jika beberapa sesi tidak mempunyai titik GPS, tidak dibuat garis penghubung palsu.

Uji:
- Pastikan semua sesi tanggal yang sama muncul.
- Pastikan counter mencapai total pelanggan bertanggal tersebut.
- Pastikan marker muncul progresif.
- Pastikan garis biru hanya mengikuti GPS petugas.
- Pastikan empat label angle muncul sepanjang video.
