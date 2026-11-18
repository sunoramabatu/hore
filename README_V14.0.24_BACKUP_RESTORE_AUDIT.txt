OYONID MAP V14.0.24 — BACKUP & RESTORE FOUNDATION

Based on V14.0.23. No GitHub/Vercel deployment performed.

Added:
- Explicit full application backup JSON export from the primary OYONID IndexedDB kv store.
- Explicit restore with format/schema validation, confirmation, and pre-restore snapshot.
- Storage usage/quota audit via navigator.storage.estimate().
- Mas Dino launcher recalculates position on resize, scroll, panel mutations and layout changes.

Important scope:
- The JSON backup includes the main OYONID IndexedDB kv records and in-memory working/source/completed/history/route state.
- Separate photo Blob databases and browser-held file handles are not included in this first backup format. Keep the original Excel backup and GPS/photo backup files. Do not treat this as a complete photo archive.
- Restore replaces the primary kv store after saving a pre-restore snapshot; test on a copy/profile first.
- Android speech, physical GPS, large workbook throughput, video export, and live Gemini response are not tested here.
- No destructive storage cleanup or automatic photo deletion.
