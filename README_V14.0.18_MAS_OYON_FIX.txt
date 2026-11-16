OYONID MAP V14.0.18 — MAS OYON FIX

Berdasarkan pengujian tampilan di HP: chat diperkecil dan dinaikkan agar tidak menutupi kontrol video di bagian bawah. Tombol chat mengambang juga dipindahkan ke atas area kontrol video.

Perbaikan API: error dari Gemini sekarang dipetakan menjadi pesan yang lebih jelas untuk kasus API key/akses (401/403), format request (400), model (404), kuota (429), dan gangguan layanan (5xx). Kode status Google ikut ditampilkan untuk membantu admin memeriksa Vercel Function Logs. API key tetap hanya di environment server.

UI: saat menunggu, chat menampilkan indikator teks “Sedang menyusun jawaban…” dan menghapusnya saat jawaban/error diterima.

Model default tetap gemini-3.8-flash. Google menyebut GenerateContent API sebagai legacy dan Interactions API sebagai antarmuka default baru per Juni 2026; migrasi API tidak dilakukan dalam patch UI/diagnostik ini agar perubahan tetap kecil.

Pemeriksaan: node --check untuk JS frontend dan API, ZIP integrity. Belum diuji dengan API key asli atau browser HP langsung.
