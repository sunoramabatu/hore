OYONID MAP V13.1.34 — CUSTOMER HOUSE PHOTO + TECHNICIAN ALPHA HOTFIX

Basis: V13.1.33 MULTI-DATE VIDEO PHASE 5.

Fixes:
1. Multi-date video now resolves customer-photo metadata against all completed records, rather than only the currently selected date. This fixes customer house/meter photos being omitted on dates outside the selected day.
2. At a customer arrival, the video prefers the matching Foto Rumah, then Foto Meteran, and only then falls back to a nearby GPS/location photo. This prevents a location-camera snapshot from replacing the customer's house photo when a customer photo exists.
3. Worker walk sprites have small transparent breaks in the opaque silhouette filled to reduce see-through seams in shoes/body/hat/limb overlaps. The external transparent background is preserved.

Preservation:
- No changes to GPS recording/session data, IndexedDB schema, Excel workbook sheets/format, offline storage, or Supabase.
- No Production deployment.

Validation performed:
- JavaScript syntax check for js/app.js and js/oyonid-video-engine-v2.js.
- ZIP integrity check.
- Sprite alpha-channel morphology applied to the eight worker frames.

Still requires real-device visual test in Chrome Android, especially checking the correct house photo appears for a customer whose completion date is not the currently selected date.
