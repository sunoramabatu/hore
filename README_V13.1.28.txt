OYONID MAP V13.1.28 — FINAL CLOSING SCREEN

Basis: V13.1.27 LOCAL-FIRST CINEMATIC.

New feature:
- Adds a dedicated 9:16 final closing sequence lasting 6.5 seconds after selected playback duration.
- Closing composition follows the user-approved reference: premium navy/blue neon, OYONID MAP header, satellite map on the left, large full-body technician on the right, recap dashboard below.
- The map uses the original map screenshot and original GPS projection coordinates, then independently fits the full captured map into the closing map panel. It draws every GPS session separately, never inventing connectors between recording sessions.
- All customer completion markers with valid actual coordinates are numbered and displayed; start and end GPS points are identified.
- Technician is a separate large transparent full-body sprite, not the small playback actor.
- Dashboard dynamically calculates completed count, total target, pending count, percentage, GPS distance and original elapsed duration.
- Count-up animation is synchronized with the closing hold.
- Playback camera, GPS recording, IndexedDB, customer photo logic, offline-first workflow, and two-sheet Excel export are not modified.

Data calculation:
- Positive = all completion ledger records for selected date.
- Target = maximum of sourceRows length and positive + current workingRows length, never less than positive.
- Pending = target - positive.
- Percentage = positive / target * 100.
- Distance = sum of GPS segment distances at final timestamp; disconnected sessions are not joined.
- Original duration = max recorded timestamp - min recorded timestamp.

Important:
- The chosen playback duration remains the travel playback length; the final exported video is 6.5 seconds longer due to the closing screen. Example: 30-second playback exports about 36.5 seconds.
- The full-body figure uses the existing 8-frame transparent character sprite as a static hero pose. It is not a newly rigged 3D GLB model.
- Visual browser/device testing and MP4/WebM codec testing are still required. Static JavaScript syntax and ZIP integrity are checked.

Deploy only to branch v13.1.28-testing. Do not deploy to main/Production until user accepts the visual result and regression tests pass.
