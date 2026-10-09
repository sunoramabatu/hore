OYONID MAP LOCAL V8

Perbaikan:
- Lokasi Cadangan membaca LAT PEMBANDING/LAT DIL/LAT PETUGAS/LAT CADANGAN dan pasangan LONGITUDE yang sesuai.
- Deteksi otomatis koordinat cadangan yang nilainya tertukar antara kolom latitude dan longitude. Contoh: LAT PEMBANDING=112.x dan LON PEMBANDING=-7.x akan dipetakan sebagai lat=-7.x, lon=112.x.
- Marker DIJ tetap memakai koordinat DIJ dan tidak diubah.
- Mode Bandingkan menampilkan dua marker dari satu IDPEL jika koordinat titik kedua tersedia.
- Download Excel Update menulis nilai pembanding dalam kolom LAT PEMBANDING dan LON PEMBANDING yang benar; kolom alias yang sudah ada tetap dikenali.
- Format desimal koordinat dipertahankan sesuai nilai numerik sumber sejauh didukung oleh workbook.

Cara menjalankan:
1. Ekstrak ZIP ke folder baru.
2. Buka folder melalui VS Code.
3. Jalankan index.html dengan Live Server.
4. Upload RBM, centang Lokasi Cadangan, lalu tes Bandingkan.
5. Verifikasi titik kedua di peta dan bandingkan koordinat sebelum/sesudah ekspor.
