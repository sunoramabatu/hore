OYONID MAP V14.0.15 — MAS OYON GEMINI CHAT ASSISTANT

FITUR
- Tombol chat Mas OYON mengambang di semua halaman.
- Chat teks; riwayat percakapan ditampilkan di panel selama sesi aktif.
- Input suara memakai Web Speech API browser (SpeechRecognition) dan menampilkan hasil transkrip sebelum dikirim.
- Jawaban teks dibacakan dengan speechSynthesis perangkat (tanpa API TTS tambahan). Tombol speaker juga tersedia pada tiap jawaban.
- Backend Vercel Serverless Function: /api/mas-oyon.js.
- Gemini API key hanya dibaca dari process.env.GEMINI_API_KEY di server.
- Batas pesan 1.500 karakter, riwayat konteks maksimal 8 pesan, dan pembatasan best-effort 15 request/menit per instance.

PENTING: AKTIVASI GEMINI
1. Buat API key melalui Google AI Studio: https://aistudio.google.com/app/apikey
2. Buka Vercel > Project hore-nine > Settings > Environment Variables.
3. Tambahkan GEMINI_API_KEY dengan nilai API key. Pilih Production, Preview, dan Development sesuai kebutuhan.
4. Tambahkan GEMINI_MODEL = gemini-3.8-flash (opsional; ini nilai default).
5. Save, lalu lakukan redeploy agar function membaca environment variable baru.
6. Tes endpoint melalui aplikasi yang sudah dideploy. Tanpa key, chat akan menampilkan pesan bahwa admin belum mengaktifkan Mas OYON.

JANGAN PERNAH
- Menaruh API key di index.html, js/app.js, localStorage, Excel, atau GitHub.
- Mengirim API key ke petugas atau menaruhnya di chat.
- Menganggap chat endpoint dapat membaca data Excel/IndexedDB/peta. V14.0.15 hanya menerima teks pertanyaan dan konteks percakapan pendek.

SUARA
- Input suara memakai browser SpeechRecognition bahasa id-ID. Dukungan terbaik di Chrome/Android dan memerlukan izin mikrofon serta HTTPS.
- Suara jawaban memakai speechSynthesis bahasa Indonesia yang tersedia pada perangkat. Kualitas/nama suara mengikuti Android/Chrome; tidak dijamin sama di semua HP.
- Ini tahap awal tanpa Gemini TTS agar biaya dan kompleksitas tetap rendah. Gemini TTS dapat ditambahkan sebagai opsi server setelah model/akses/billing diuji.

ATURAN JAWABAN
- Persona: rekan kerja lapangan yang santai, sedikit guyon Jawa, tetap sopan dan akurat.
- Panduan aplikasi OYONID: Tagging, Realisasi, Monitoring, Excel dua sheet, GPS, foto, playback/video, perbandingan DIJ vs Realisasi, filter jarak.
- Tidak mengarang tombol/prosedur/hasil/data. Jika tidak yakin, minta screenshot, versi aplikasi, atau rujuk admin.
- Tidak menyuruh memalsukan GPS, menyelesaikan pekerjaan yang belum dilakukan, atau melewati SOP keselamatan.
- Jangan meminta API key, OTP, password, NIK lengkap, nomor HP, alamat, atau data pelanggan sensitif.
- Gemini tidak otomatis melihat peta, Excel, foto, GPS, atau IndexedDB aplikasi.

PRIVASI & BATASAN
- Pesan chat dikirim ke Gemini melalui backend Vercel. Jangan memasukkan data pribadi pelanggan.
- Riwayat chat tidak disimpan permanen oleh UI ini; hanya disimpan di memori halaman selama tab terbuka.
- Rate limit dalam memori function bersifat best-effort dan tidak menggantikan autentikasi/WAF. Sebelum penggunaan publik luas, tambahkan autentikasi petugas, rate limit terpusat, dan monitoring biaya.
- Pengguna harus mengikuti SOP perusahaan dan arahan atasan.

PENGUJIAN
- node --check api/mas-oyon.js
- node --check js/app.js
- Uji tanpa GEMINI_API_KEY: harus menampilkan pesan admin belum mengaktifkan.
- Setelah key dipasang di Vercel dan redeploy: uji chat teks, mikrofon, transkrip, suara jawaban, close/minimize panel, dan penggunaan di HP.
