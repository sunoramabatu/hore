OYONID MAP V14.0.23 — DATA SAFETY & EXPORT DEDUPLICATION
========================================================

BASELINE
--------
Built from OYONID_MAP_V14_0_22_FIX_DOWNLOAD_EXCEL.zip.
This is a local test ZIP only. No GitHub or Vercel deployment was performed.

CHANGES
-------
1. Before an Excel upload can alter the current in-memory data, the app writes
   a pre-import checkpoint to IndexedDB (up to 3 recent checkpoints).
   The checkpoint contains working rows, source rows, completion records,
   history, column headers/mapping, and GPS route session state.
2. If that IndexedDB checkpoint cannot be written, the upload is cancelled
   before the workbook is applied. Existing in-memory data remains untouched.
3. Uploading a workbook with zero remaining customers but one or more completed
   rows now requires explicit confirmation. This helps prevent accidental
   replacement with an empty worklist.
4. localStorage quota errors for the uploaded filename and header cache no
   longer abort the Excel upload. IndexedDB remains the durable local store.
5. Completed export records are deduplicated by customer identity + local day
   + time to the nearest second. ISO millisecond differences such as .000 and
   .969 no longer create duplicate rows. Different dates/times remain separate.
6. App cache version updated to V14.0.23.

PRESERVED
---------
- Exactly two Excel sheets: Pelanggan Tersisa and Realisasi Selesai.
- Existing Tagging layout and map behavior are not intentionally changed.
- Existing GPS, photos, Monitoring, Realisasi, video, and Mas Dino features.
- Local-first architecture; no Supabase added.

IMPORTANT LIMITATIONS / TEST STATUS
-----------------------------------
- This patch creates automatic pre-import checkpoints in IndexedDB, but does
  not yet provide a user-facing full-data restore screen for those checkpoints.
- The empty-worklist warning can be confirmed if the file genuinely represents
  a completed workload. Verify the sheet contents before confirming.
- Deduplication uses customer identity + day + second. It is designed to
  collapse duplicate events differing only in ISO milliseconds while keeping
  separate visits at different times/dates.
- Syntax and ZIP integrity checks are required before distribution.
- Android Chrome live tests and a live Vercel/Gemini test were not performed.
- Do not clear site data or uninstall the browser while recovering work.
