OYONID MAP V13.1.17 — REALISASI DYNAMIC CAMERA + VIDEO DURATION

BASE
- Based on V13.1.16.
- Keep existing tagging, monitoring, Excel, GPS, calendar, customer pins and photo data features.

CHANGES
1. In Realisasi mode, hide the old OYONID Map header and Full Map control.
2. Realisasi & Rute header becomes the top header, with Kembali ke Tagging and Minimize/Maximize controls.
3. Add output video duration choices: 15, 30, 45 seconds, 1, 2 and 5 minutes.
4. Generate portrait 9:16 video for phone sharing.
5. Dynamic map camera follows the moving GPS point, smoothly zooms closer at customer completion points, and rotates toward travel direction.
6. Keep route, green numbered customer markers, moving worker marker and photo card visible in the generated video.
7. Add fixed overlay statistics: completed customer count, GPS distance, original elapsed time and progress.
8. Compress long stationary GPS runs of 30 minutes or more in the generated video. Original GPS records are not deleted or rewritten.
9. Keep photo loading from the existing Excel/Base64 and local photo metadata pipeline.
10. Replace the previous video-export routine to remove the reported `i is not defined` failure path.

IMPORTANT TESTING NOTES
- JavaScript syntax and package integrity must be checked before deployment.
- Browser testing is still required for MediaRecorder support, dynamic camera appearance, photo matching, exact output duration, and Android playback.
- The 30-minute stationary compression currently applies to consecutive GPS points within a 20-meter radius and does not compress a run containing customer-completion points.
- The export is portrait 9:16. Browser support determines MP4 vs WebM output.
- No production deployment has been performed. Deploy to the testing branch / Vercel Preview first.
