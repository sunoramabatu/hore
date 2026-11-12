OYONID MAP V13.1.26 + BACKUP & RESTORE LOKAL V1.1 (FIX)

FITUR BARU
- Tombol "Backup & Restore" muncul di bawah Download Excel Update.
- Backup menyimpan seluruh localStorage pada origin OYONID.
- Backup mengekspor IndexedDB OYONID_LOCAL_FIRST_DB (termasuk data pelanggan, realisasi, mapping, GPS route sessions) dan oyon_route_photo_db_v1 (foto sebagai Blob/binary).
- File backup berupa JSON mandiri, tidak dikirim ke server.
- Restore memvalidasi format, meminta konfirmasi, mengunduh backup pengaman otomatis sebelum mengganti data, lalu memuat ulang halaman.

PENTING
1. Backup dan restore dilakukan pada browser/perangkat yang sama atau file backup dapat dipindahkan ke perangkat/browser lain.
2. Sebelum restore, simpan file backup pengaman yang otomatis terunduh.
3. Jangan hapus data browser/site data sebelum membuat backup.
4. Backup bisa besar jika foto banyak. Pastikan ruang penyimpanan cukup.
5. Uji di Preview terlebih dahulu. Jangan deploy Production sebelum uji backup dan restore berhasil.

CARA UJI
1. Deploy ZIP ini ke branch Preview/test.
2. Buka OYONID Map di Preview, lalu klik Backup & Restore > ketik 1.
3. Pastikan file OYONID_BACKUP_*.json terunduh.
4. Untuk uji restore, lakukan hanya setelah backup aman tersimpan. Klik Backup & Restore > ketik 2, pilih file tadi, konfirmasi.
5. Setelah reload, cek data pelanggan, riwayat/realisasi, foto, dan rekaman GPS.

Catatan teknis:
- Versi dasar: V13.1.26.
- Perubahan hanya menambah js/oyonid-backup-restore.js dan satu pemanggilan script di index.html.
- Tidak mengubah app.js, CSS, skema database, atau format Excel dua sheet.

PATCH V1.1:
- Memperbaiki error "Version change transaction was aborted in upgradeneeded event handler".
- Backup sekarang memeriksa keberadaan database tanpa sengaja membatalkan transaksi upgrade.
- File backup menyimpan skema object store (keyPath, autoIncrement, indexes).
- Restore dapat membuat database IndexedDB yang belum ada di origin Preview/hostname baru, lalu memulihkan records.
- Jika object store belum ada, restore menambahkannya melalui upgrade versi yang sah.
- Tidak menghapus database sumber di perangkat lain. Restore tetap mengganti data lokal pada origin yang sedang dibuka.
