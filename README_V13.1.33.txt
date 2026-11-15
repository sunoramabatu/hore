OYONID MAP V13.1.33 — MULTI-DATE WIDE JOURNEY VIDEO PHASE

Basis: V13.1.32 Stationary Technician Phase 4.

Implemented in this phase:
- Added start/end date controls to video export.
- Video export reads GPS sessions and completed customer records within the chosen date range.
- Each calendar day is compressed onto a sequential video timeline with a short inter-day gap, so a multi-day range does not spend most of the video on overnight timestamp gaps.
- All days are captured into one canvas stream and one MediaRecorder output.
- GPS sessions remain separate segments; no synthetic line is drawn between sessions or days.
- Customer completion markers and matching photos are included for the selected range.
- HUD identifies the active day; closing screen summarizes the combined date range and number of days.
- Technician remains in the fixed HUD area and walks in place independently of GPS coordinates.

Preservation:
- Read-only access to GPS, customer, photo, and local records.
- No IndexedDB schema changes, no Supabase, no Excel format changes, no Production deployment.
- Existing single-day export remains available by setting the same start and end date.

Validation:
- JavaScript syntax checks and ZIP integrity checks are run during packaging.
- Actual multi-day recording, photo rendering, visual quality, and Android browser compatibility still require real-device testing.
