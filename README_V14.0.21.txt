OYONID MAP V14.0.21

Fokus versi ini adalah menindaklanjuti catatan bug dari pengujian HP.

PENTING
- TAGGING dipertahankan sebagai baseline. Tidak ada perubahan desain/layout TAGGING yang disengaja selain status GPS kecil di bawah judul OyonID Map.
- Tidak ada migrasi Supabase.
- Tidak ada deployment Production.

PERUBAHAN UTAMA
1. Status GPS tidak lagi menjadi kartu mengambang di Realisasi atau Monitoring. Status ringkas muncul di bawah judul OyonID Map pada TAGGING.
2. Checkbox Marker DIJ Monitoring diperiksa ulang setiap render marker dan filter viewport agar marker tidak muncul kembali setelah peta digeser/zoom.
3. Klik marker pelanggan selesai di Realisasi menampilkan nama, IDPEL, nomor meter dan foto pada kartu foto/data bawah. Tidak ada popup di atas marker.
4. Foto rumah diprioritaskan, foto meter menjadi fallback. Jika tidak ada foto, keterangan yang benar ditampilkan.
5. Tombol Mas Dino menghindari panel/kartu yang terlihat dengan menghitung ulang posisi secara otomatis.
6. Balasan Mas Dino otomatis dibacakan (checkbox aktif secara default), teks panjang dibagi menjadi bagian yang lebih pendek, tersedia tombol hentikan suara.
7. Fitur progress video, pemulihan GPS setelah refresh, Excel 2 sheet, IDPEL teks, offline, foto, barcode, dan fitur lain dari V14.0.20 dipertahankan.

CARA UJI LOKAL
1. Ekstrak ZIP.
2. Buka folder oyonid_v1320.
3. Jalankan dengan server lokal (Live Server atau server lokal yang biasa dipakai).
4. Uji TAGGING dahulu dan pastikan tampilannya sama.
5. Buka Monitoring, matikan Marker DIJ, geser/zoom peta beberapa kali. DIJ harus tetap hilang.
6. Buka Realisasi, pastikan kartu GPS tidak muncul. Klik marker selesai: data dan foto harus muncul di kartu bawah tanpa popup di atas marker.
7. Buka Mas Dino, kirim pertanyaan, pastikan suara otomatis berjalan. Uji tombol hentikan suara dan posisi tombol chat saat panel/kartu muncul.
8. Uji GPS start, stop, refresh saat merekam, dan pemulihan sesi. Pastikan sesi terputus tidak tersambung dengan sesi baru.
9. Uji Download Excel Update dan cek kedua sheet, IDPEL, koordinat desimal, serta kolom pembanding.
10. Uji pembuatan video dari rentang tanggal dan pantau persentase/tahap proses.

BATAS VALIDASI
Pemeriksaan sintaks dan integritas ZIP dilakukan. Belum ada pengujian langsung pada HP Android, GPS fisik, Gemini API aktif, atau ekspor video penuh pada perangkat. Jangan langsung mengganti Production sebelum pengujian lokal selesai.

KONFIGURASI MAS DINO
- Atur GEMINI_API_KEY di Vercel Environment Variables, bukan di file JavaScript publik.
- Model default: gemini-3.5-flash-lite. GEMINI_MODEL dapat digunakan untuk mengganti model.
- Tidak ada API key yang disertakan dalam ZIP.
