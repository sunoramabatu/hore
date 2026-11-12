OYONID MAP V13.1.27 — LOCAL-FIRST FIELD & CINEMATIC VIDEO

Base: V13.1.26 ANIMATED SATELLITE JOURNEY.

Implemented in this build:
1. History no longer clears itself at midnight. History is filtered by selected date and shows daily completion count. Existing history records remain in localStorage.
2. Floating Start Route button recalculates its bottom position against the open customer detail panel or bottom navigation so it stays above the active bottom UI.
3. Realisasi has its own 4-digit search for completed customers by IDPEL or meter number. Results zoom to the actual customer completion coordinates.
4. Existing Tagging / Realisasi panel structure remains in the same application shell; Realisasi adds a matching compact search control.
5. Existing Local-First completedRecords + workingRows export reconciliation is retained. Excel output remains two sheets; no backend is introduced.
6. Actual customer completion coordinates remain the marker source. GPS route line remains exclusively from GPS route sessions.
7. Video now adds a small animated worker at the lower-right corner; gait speed is driven by interpolated GPS speed.
8. Video adds a solar arc overlay that moves according to the original timestamp.
9. Video requests historical weather data from Open-Meteo and prayer times from Aladhan when internet is available. If unavailable/offline, weather is shown as unavailable and prayer animation is not fabricated.
10. Dhuhur/Asr prayer/rest scene is triggered only when GPS samples show <=20 m displacement over >5 minutes and that interval is within 90 minutes of calculated Dhuhur/Asr. This is an inferred scene from GPS/time, not proof of actual prayer.

Technical notes / limitations:
- External weather/prayer requests need internet during video generation; the app's local GPS, photos, history, and Excel remain local-first.
- Prayer times are requested from Aladhan method 20 (Singapore) and Asr school 0. Verify local prayer timetable if exact regional settings differ.
- GPS stops are inferred only from actual GPS samples. Missing GPS samples/gaps are not treated as stationary.
- Prayer scene is a stylized illustrative kneeling pose; it does not claim to know the officer's activity.
- V13.1.27 has passed JavaScript syntax and ZIP integrity checks only. Browser testing on Android and Excel regression tests are still required.

Test checklist:
A. Tagging: tap first customer; ensure Start Route button is above the detail bottom bar.
B. History: select dates with previous-day completions; count should persist across refresh/day change.
C. Realisasi: search last four digits of IDPEL and meter; verify map zoom to actual customer location.
D. Export: verify workbook still contains exactly two sheets and retains all completed records.
E. Video: verify lower-right worker animation follows speed, solar arc advances, weather overlay appears online, and prayer/rest scene only triggers for GPS stop >5 min near Dhuhur/Asr.
F. Offline: repeat core GPS/history/Excel workflows without network; environment labels may be unavailable.

Deploy only to v13.1.27-testing. Do not merge to main/Production until all tests pass.
