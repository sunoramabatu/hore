OYONID MAP V13.1.18 — PHOTO + VIDEO ERROR HOTFIX

BASE
- Based on the V13.1.17 Dynamic Camera & Video package.

FIXES
1. Fixed malformed JavaScript regular expressions used to recognize Base64/data:image URLs. The malformed expression was parsed as a regex followed by an identifier `i`, causing the exact runtime error `i is not defined` during photo loading and video creation.
2. Playback photo metadata can now inspect Excel Sheet 2 photo data URLs without throwing that ReferenceError.
3. Clicking a completed customer marker in Realisasi now opens its popup and loads the matching customer house/meter photos from Excel/Base64 or local IndexedDB metadata.
4. Existing photo identity matching, GPS playback and video photo pipeline are retained.
5. Updated cache-busting versions and build identifier to V13.1.18.

VALIDATION
- `node --check js/app.js` passed.
- Confirmed the data URL regular expression matches `data:image/jpeg;base64,...`.
- ZIP integrity checked.
- Browser/Android testing is still required for actual IndexedDB photo retrieval and MediaRecorder video export.

DEPLOYMENT
- Deploy to a testing branch and Vercel Preview only.
- Do not deploy to `main` / Production until playback photos, customer popup photos and video export are confirmed working.
