OYONID MAP V13.1.22 — GPS RECOVERY & VIDEO COMPATIBILITY

PEMULIHAN GPS ANTAR-ALAMAT WEBSITE
1. Pada situs SUMBER tempat GPS direkam (Production), buka Mode Realisasi.
2. Tekan "Backup GPS Petugas". Simpan file OYONID_GPS_BACKUP_YYYY-MM-DD.json.
3. Pada situs TUJUAN (Preview/testing), buka Mode Realisasi.
4. Tekan "Pulihkan GPS", pilih file backup, lalu konfirmasi.
5. Pilih tanggal rekaman dan coba Play / Buat Video.

Backup mengumpulkan routeSessions dan activeRoute dari memori, LocalStorage, dan IndexedDB.
Import menggabungkan sesi berdasarkan fingerprint dan melewati duplikat.
Data pelanggan, foto, Excel, completedRecords, dan data lama tidak dihapus/ditimpa.

CATATAN PENTING:
- Untuk mengambil data Production, fitur Backup GPS harus dijalankan pada origin Production yang menyimpan rekaman.
- File backup hanya berisi sesi GPS petugas, bukan foto atau data pelanggan.
- Jangan hapus data situs sumber sampai video berhasil dibuat di Preview.
- Format ekspor Excel tetap dua sheet.
