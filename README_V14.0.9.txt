OYONID MAP V14.0.9 - MONITORING FULL MAP RESTORE FIX

Basis: V14.0.8 Monitoring Compare Line.

Changes:
- Added a dedicated, always-accessible 'Tampilkan Monitoring' control while Monitoring is in Full Map mode. This fixes the restore path that was previously inaccessible after the Monitoring panel was hidden.
- Full Map no longer reveals the unrelated floating recording/video controls.
- Leaving Monitoring resets its full-map state and hides the restore control.
- Hari Baca changes now refresh both DIJ and actual realization markers.
- Actual realization markers and comparison connectors now follow the selected Hari Baca filter as well as date range and distance filter.
- Recording and location-photo controls remain hidden on Monitoring.

Validation:
- node --check js/app.js: passed.
- node --check js/oyonid-video-engine-v2.js: passed.
- ZIP integrity: to be checked after packaging.

Not yet verified:
- Live Android/Chrome rendering and touch interaction.
- End-to-end test using imported Excel/IndexedDB data.
- Correctness of all coordinate mappings against field records.
- Do not deploy to GitHub main or Vercel Production without explicit approval.
