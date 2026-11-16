OYONID MAP V14.0.15 — MAS OYON BERBASIS GEMINI

Fitur baru:
- Tombol chat mengambang Mas OYON.
- Pesan teks dan transkrip input suara tampil sebagai gelembung chat.
- Jawaban Gemini tampil sebagai teks dan dapat dibacakan melalui suara Indonesia yang tersedia pada perangkat.
- Riwayat percakapan singkat dipertahankan hanya selama halaman terbuka.
- Endpoint Gemini berjalan di Vercel Serverless Function: /api/mas-oyon.
- API key hanya dibaca dari Environment Variable server GEMINI_API_KEY.

PENTING — FITUR CHAT TIDAK AKAN TERHUBUNG SEBELUM API KEY DIPASANG DI VERCEL.

Cara memasang API key:
1. Buka https://aistudio.google.com/app/apikey
2. Buat API key baru untuk Gemini API dan salin.
3. Jangan kirim key ke chat ini, jangan masukkan ke file JavaScript, dan jangan taruh di GitHub.
4. Buka Vercel > project hore-nine > Settings > Environment Variables.
5. Tambahkan nama GEMINI_API_KEY, isi dengan key tadi. Pilih environment Preview terlebih dahulu untuk uji coba. Production jangan diaktifkan sampai disetujui.
6. Tambahkan GEMINI_MODEL dengan nilai gemini-3.8-flash (opsional; model ini juga default pada function).
7. Simpan dan lakukan deployment Preview dari branch uji. Environment Variable baru berlaku setelah deployment baru.
8. Buka URL Preview dan uji tombol Mas OYON.

Pengembangan lokal:
- API serverless tidak berjalan pada file:// atau Live Server biasa.
- Gunakan Vercel CLI (`vercel dev`) setelah project di-link ke Vercel, atau uji di Preview deployment.
- Untuk lokal, simpan key pada `.env.local` (file ini jangan di-commit). Isi GEMINI_API_KEY=... .
- File `.env.example` hanya contoh; tidak berisi API key asli.

Suara:
- Input suara memakai Web Speech API browser, bahasa id-ID. Chrome Android umumnya mendukung; izin mikrofon dan HTTPS diperlukan.
- Hasil transkrip ditampilkan dan dapat diperiksa sebelum dikirim.
- Suara jawaban memakai speechSynthesis dari HP/browser. Ini bukan Gemini TTS; tidak membutuhkan API tambahan dan suara mengikuti voice pack perangkat.
- Gemini TTS bisa ditambahkan sebagai pilihan setelah akses model dan biaya diuji.

Batasan dan keamanan:
- Chat tidak membaca Excel, IndexedDB, GPS, foto, maupun peta secara otomatis.
- Jangan memasukkan NIK, nomor HP, alamat, IDPEL, foto, koordinat pribadi pelanggan, password, OTP, atau API key ke chat.
- Endpoint memeriksa Origin, membatasi ukuran pesan dan riwayat, serta memiliki rate-limit best-effort per instance. Itu bukan autentikasi kuat dan tidak cukup untuk penggunaan publik skala besar.
- Sebelum dibuka luas kepada banyak petugas, tambahkan login/otorisasi petugas, rate limit terpusat atau Vercel Firewall, batas biaya/kuota, dan monitoring.
- Gemini dapat keliru. Mas OYON tidak boleh menggantikan SOP resmi, arahan atasan, maupun keputusan keselamatan.

Pengetahuan dan aturan Mas OYON berada dalam SYSTEM_INSTRUCTION di api/mas-oyon.js.
Ia berisi konsep Tagging, Realisasi, Monitoring, DIJ vs Realisasi, filter jarak, GPS, Excel dua sheet, privasi, dan batasan fitur. Jika SOP internal berubah, admin perlu memperbarui knowledge tersebut.

Pemeriksaan lokal yang dilakukan:
- `node --check js/app.js`
- `node --check js/oyonid-video-engine-v2.js`
- `node --check js/mas-oyon.js`
- `node --check api/mas-oyon.js`
- Uji endpoint tanpa key menghasilkan pesan admin belum mengaktifkan.
- ZIP diperiksa dengan `unzip -t`.

Belum dilakukan:
- Tes request Gemini live karena API key belum disediakan (dan tidak boleh ditempel ke chat).
- Tes mikrofon/suara pada perangkat Android langsung.
- Deployment Preview/Production.
