OYONID MAP V14.0.7 — MONITORING PAGE FIX + DIJ/REALISASI DISTANCE FILTER

Basis: V14.0.6_REKAP_LAYOUT. This is a local test build; it has NOT been deployed to Vercel or pushed to GitHub.

Changes:
- Monitoring now hides the Tagging UI bar completely and uses its own Monitoring header.
- Monitoring has its own Full Map control. It hides the Monitoring panel and exposes a floating restore control; it does not hide or manipulate Tagging UI.
- Route recording and location-photo controls are hidden while Monitoring is active.
- Monitoring panel is sized to leave the map visible, with responsive scrolling on mobile.
- Added DIJ vs actual Realisasi distance classification: 0–10m, 11–30m, 31–100m, 101–300m, >300m, and missing coordinates.
- Added comparison summary and a short list of customers with the largest location differences.
- Actual Realisasi marker popup now displays DIJ coordinates, actual coordinates, and the calculated distance when both coordinates are valid.
- Distance/date filters refresh both DIJ and actual marker visibility.
- When the active target count is unavailable/zero, the completion percentage displays “—” instead of a misleading 0.0%.

Important:
- The distance calculation is straight-line distance between DIJ and actual customer coordinates, not the technician's GPS route distance.
- The threshold values are initial values agreed with the user and can be tuned later.
- Visual/browser testing on the user's phone is still required. JavaScript syntax and ZIP integrity are checked.
- Existing Tagging, Realisasi, Excel, IndexedDB, offline and GPS functions are retained as the base; no Production deployment is performed.
