OYONID MAP V13.1.29 — MOBILE REALISASI REFINEMENT (PHASE 1)

Basis: OYONID_MAP_V13_1_28_FINAL_CLOSING_SCREEN.

Implemented in this phase:
- Improved route-record floating button positioning. It now measures the visible customer detail panel and supported bottom navigation/bar elements, and recalculates on window/visual viewport changes and panel resize. This specifically targets the first-customer selection case.
- Refined compact mobile Realisasi panel, calendar/search sizing, and Riwayat visual hierarchy.
- Kept the existing 4-digit Realisasi search, date-filtered history count, Excel reconciliation, actual-coordinate logic, IndexedDB/local-first storage, GPS recording, and video renderer intact.
- Updated cache-busting version to 13.1.29.

Not implemented in this phase (must be developed and tested as a separate phase):
- Draggable/minimize/maximize/close unified customer information + photo card.
- Monitoring date-range aggregation UI and reports.
- Multi-date video rendering with day transitions and per-day recap.
- Rigged GLB 3D technician model; current renderer continues to use its existing procedural/sprite character assets.

Safety:
- No IndexedDB schema or GPS session format changes.
- No customer records are deleted or migrated.
- No Supabase data transfer.
- Production deployment is not included. Test this ZIP locally/Preview first.

Validation performed:
- JavaScript syntax check (node --check).
- HTML ID duplicate check.
- ZIP integrity check.
- Static diff review.

Not yet validated:
- Real Android GPS behavior, IndexedDB persistence, Excel round-trip, MP4/WebM codec output, visual browser playback, and multi-device layout.
