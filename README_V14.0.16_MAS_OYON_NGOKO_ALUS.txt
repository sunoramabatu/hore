OYONID MAP V14.0.16 — MAS OYON VOICE & KNOWLEDGE UPDATE

Baseline: ZIP V14.0.15 MAS OYON GEMINI CHAT yang disediakan dalam percakapan.

Preferensi pengguna:
- Jawaban suara menggunakan suara bawaan HP/browser (Web Speech API), bukan Gemini TTS.
- Gaya bicara: guyon Jawa ngoko alus, dicampur Bahasa Indonesia agar mudah dipahami.

Perubahan:
1. Penyempurnaan pemilihan suara Indonesia pada browser; menangani daftar suara yang baru tersedia setelah event voiceschanged.
2. Pengaturan suara: bahasa id-ID, kecepatan sedikit lebih pelan, pitch netral, dan status pemutaran lebih jelas.
3. Pesan status dan umpan balik mikrofon diselaraskan dengan gaya Jawa ngoko alus.
4. System instruction Gemini diperjelas: solusi dulu, guyon secukupnya, langkah bertahap, tidak kasar, dan mengakui keterbatasan akses ke data aplikasi.
5. Ditambahkan panduan troubleshooting GPS, foto, Excel, offline, DIJ vs Realisasi, dan video.
6. Ditambahkan KNOWLEDGE_BASE_MAS_OYON_V1.txt sebagai dokumen dasar untuk pengembangan retrieval/knowledge base berikutnya.
7. Cache-busting script diperbarui ke V14.0.16.

Suara:
- Jawaban otomatis dibacakan jika checkbox aktif.
- Pengguna tetap dapat menekan tombol Putar suara di setiap jawaban.
- Suara bergantung pada voice Indonesia yang tersedia di HP/browser. Jika tidak tersedia, browser menggunakan suara fallback; kualitas dan karakter suara bisa berbeda antarperangkat.
- Input suara memakai Web Speech Recognition browser dan dapat memerlukan internet/izin mikrofon.

Gemini:
- API key tetap hanya di server melalui GEMINI_API_KEY.
- Model default tetap gemini-3.8-flash (dapat diubah melalui GEMINI_MODEL).
- Endpoint /api/mas-oyon hanya menerima chat text. Endpoint tidak otomatis membaca Excel, IndexedDB, GPS, foto, atau layar.
- Basis pengetahuan masih berupa system instruction dan dokumen panduan. File knowledge base belum otomatis diindeks/dimasukkan ke Gemini; materi SOP resmi perlu ditinjau admin sebelum dipakai.

Validasi yang harus dilakukan:
- node --check js/app.js
- node --check js/mas-oyon.js
- node --check api/mas-oyon.js
- node --check js/oyonid-video-engine-v2.js
- ZIP integrity
- Browser desktop dan Android: chat teks, input suara, transkrip, auto-speak, tombol putar, tutup/minimize.
- Uji API hanya setelah GEMINI_API_KEY dipasang di Preview environment.

Tidak mengubah GitHub, branch, Vercel Production, format dua sheet Excel, atau fitur inti Tagging/Realisasi/Monitoring.
