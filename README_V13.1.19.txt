OYONID MAP V13.1.19 — PHOTO FIT + QUALITY FIX

BASE
- Based on the V13.1.18 Photo + Video Hotfix.

FIXES
1. Playback photo uses object-fit: contain so the full photo is visible without cutting off the center/edges.
2. Customer marker popup photos use contain, a larger display area, and a dark neutral background.
3. Video photo card uses proportional contain-fit rendering; the source image is not center-cropped.
4. Video photo panel is enlarged to improve readability on a 720x1280 portrait export.
5. New photos captured through the app are stored up to 1920px on the longest side at JPEG quality 0.88 (older compressed photos are not automatically recoverable).
6. Video bitrate increased from 4.5 Mbps to 7 Mbps to reduce visible compression artifacts.
7. Cache-busting and build identifier updated to V13.1.19.

IMPORTANT
- Existing Excel/Base64 photos are used at their stored source resolution. If an image was already low-resolution/compressed inside the Excel file, this patch cannot restore missing detail.
- contain may leave dark/blank bands around photos with a different aspect ratio; this is intentional to preserve the complete image.

VALIDATION
- JavaScript syntax and ZIP integrity checked.
- Browser/Android visual verification is still required.

DEPLOYMENT
- Deploy to a testing branch and Vercel Preview only. Do not deploy to main/Production until photo display and video output are confirmed.
