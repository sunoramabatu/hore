OYONID MAP V14.0.17 — MAS OYON AI KNOWLEDGE INTEGRATION

Baseline: OYONID MAP V14.0.16 MAS OYON NGOKO ALUS.

PERBAIKAN UTAMA
1. Mas OYON memakai Gemini melalui endpoint serverless /api/mas-oyon.
2. KNOWLEDGE_BASE_MAS_OYON_V1.txt sekarang benar-benar disertakan ke system instruction setiap permintaan Gemini. Pada versi sebelumnya file tersebut hanya ikut ZIP dan belum otomatis dibaca oleh AI.
3. Gaya jawaban tetap Bahasa Indonesia + guyon Jawa ngoko alus, praktis, bertahap, dan tidak kasar.
4. Suara jawaban tetap memakai suara bawaan HP/browser (Web Speech API), bukan Gemini TTS.
5. Kunci Gemini hanya dibaca dari environment variable server GEMINI_API_KEY. Tidak ada API key di file publik.
6. Model default: gemini-3.8-flash; dapat diganti melalui GEMINI_MODEL.
7. Mas OYON tidak otomatis membaca Excel, IndexedDB, GPS, foto, marker terpilih, atau layar. Jangan menganggap AI melihat data tersebut.

AKTIVASI AI DI VERCEL (WAJIB)
- Di Vercel Project hore-nine > Settings > Environment Variables, tambahkan:
  Name: GEMINI_API_KEY
  Value: API key dari Google AI Studio milik admin.
  Environment: Production (dan Preview bila ingin uji Preview).
- Jangan menulis key ke GitHub, ZIP, index.html, js/, atau file .env yang di-commit.
- Simpan perubahan, lalu lakukan Redeploy Production terbaru agar variable diterapkan.
- Setelah deployment selesai, buka situs, klik Mas OYON, kirim pertanyaan uji yang tidak berisi data pelanggan.
- Jika API key belum ada, endpoint mengembalikan status 503 dengan pesan admin belum mengaktifkan key.
- Jika Gemini menolak model/kuota, cek error/usage di Google AI Studio dan Vercel Function Logs.

UPLOAD MAIN
- ZIP ini berisi folder proyek `oyonid_v1320/`.
- Untuk mengganti isi repository `main`, unggah isi folder proyek (bukan folder pembungkus luarnya) ke repository melalui GitHub.
- Pastikan `api/mas-oyon.js`, `js/mas-oyon.js`, `index.html`, `css/`, `js/`, `assets/`, dan berkas aplikasi lainnya ikut terunggah.
- Vercel terhubung ke branch main dan akan membuat deployment setelah commit/push.
- Jangan upload file `.env` berisi key.

PENGUJIAN YANG DILAKUKAN PADA PAKET
- Pemeriksaan sintaks JavaScript dengan node --check.
- Simulasi request API lokal dengan mock Gemini untuk memastikan Knowledge Base ikut dikirim ke model.
- Pemeriksaan ZIP integrity.
- Belum diuji dengan Gemini API key asli, browser Android, atau deployment Vercel Production.

CATATAN KEAMANAN
- Rate limit endpoint masih best-effort per instance serverless; bukan pengganti autentikasi/WAF.
- Jangan mengirim NIK lengkap, nomor HP, alamat rinci, foto pelanggan, password, OTP, atau API key ke chat.
- Ikuti SOP resmi perusahaan untuk keselamatan dan keputusan operasional.
