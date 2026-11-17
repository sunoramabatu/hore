OYONID MAP V14.0.19 — EXPORT, DETAIL PANEL & MAS DINO

Baseline: V14.0.18 MAS OYON FIX.

PERBAIKAN
1. Download Excel Update:
   - Progress label and disabled state while export runs.
   - XLSX availability check.
   - Errors are caught and shown to the user instead of silently stopping.
   - IDPEL cells in both workbook sheets are explicitly stored as text (@), avoiding scientific notation in Excel.
   - Workbook remains exactly two sheets: Pelanggan Tersisa and Realisasi Selesai.
2. Detail Pelanggan:
   - Minimize collapses the full panel to a 48px header.
   - Mobile panel is lowered/shortened to max 46vh or 480px, with internal scrolling.
   - Closing after markDone clears stale minimized/maximized state and selected-row reference.
3. Assistant:
   - Visible assistant identity changed to Mas Dino.
   - Internal DOM IDs and /api/mas-oyon route remain unchanged for compatibility.
   - Voice remains device/browser speech synthesis in Indonesian.
4. Gemini:
   - One retry for transient 5xx / UNAVAILABLE errors.
   - 25-second timeout per attempt; Vercel maxDuration 60 seconds for api/mas-oyon.js.
   - GEMINI_API_KEY remains server-side only.

PRESERVED
- Existing TAGGING, REALISASI, MONITORING pages and current marker/search behavior.
- Existing local-first/offline, IndexedDB, GPS, photos, barcode, playback and video features are not intentionally redesigned.
- Two-sheet workbook format retained.
- GPS sessions/dates are never joined with invented lines.
- No Supabase migration.
- No production deployment was performed.

TEST SCOPE
- Syntax and JSON checks.
- ZIP integrity.
- Static validation of export error handling and IDPEL text cell formatting.
- Not tested in a live browser, on the user's live data, or with the user's real Gemini API key.
