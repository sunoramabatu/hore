OYONID MAP V13.1.32 — STATIONARY TECHNICIAN VIDEO PHASE

Basis: OYONID_MAP_V13_1_31_MONITORING_DATE_RANGE_PHASE3.

Implemented in this phase:
- Removed the map-following technician sprite that was projected onto the interpolated GPS point.
- The GPS route remains represented only by the actual recorded blue GPS track.
- Retained the separate fixed-position technician animation in the video HUD area; its walk cycle is independent of GPS coordinates.
- Bumped the video-engine cache version to 13.1.32.

Not implemented yet:
- Multi-date video in one MediaRecorder output.
- Date-range selection for video export.
- Per-day transitions and per-day recap cards.
- Combined final multi-day recap.

Preservation:
- No IndexedDB schema or records changed.
- No GPS session, customer, photo, or Excel data is modified.
- Existing single-day video flow remains in place.
- No Supabase migration and no Production deployment.

Validation:
- JavaScript syntax checks and ZIP integrity are performed at packaging time.
- Real browser/Android video export and visual regression still require user testing.
