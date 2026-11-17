OYONID MAP V14.0.20 — MAS DINO, GPS STATUS & VIDEO PROGRESS

BASELINE
- Built from the verified V14.0.19 MAS DINO package.
- Existing OYONID Map functions retained; no Supabase migration.
- No Production deployment performed.

CHANGES
1) Mas Dino model
- Default Gemini model changed to gemini-3.5-flash-lite (lighter Flash-Lite family).
- Vercel GEMINI_MODEL environment variable still overrides the default.
- This is a model selection trial, not a measured speed guarantee. Actual response time depends on API capacity, network, quota, and prompt size.
- API key remains server-side.

2) Video creation progress
- Adds a fixed progress card visible without scrolling.
- Displays progress stages for data preparation, map capture, rendering, recap, and encoding.
- Percentage tracks the render timeline and known stages; encoding stage is shown as a separate wait.
- Error message remains visible if export fails.

3) GPS recording status
- Adds a fixed status card above the lower map controls.
- States: preparing, recording, stopped, failed, interrupted.
- Start-position permission/accuracy errors are shown in the card.
- GPS watch errors are shown prominently.
- Last saved point time and number of stored points are shown while recording.
- After refresh, any active route found in local storage is finalized as an interrupted session; already saved points are preserved and a warning is shown.
- New recording creates a new session; it does not connect across interrupted sessions.

PRESERVED
- Excel two-sheet export, IDPEL-as-text correction, TAGGING/REALISASI/MONITORING, offline local storage, GPS route sessions, photos, barcode, playback and map behavior.
- No production deployment.
- No fabricated GPS points or route connections.

VALIDATION SCOPE
- JavaScript syntax checks and ZIP integrity.
- Static checks for new UI and recovery paths.
- Not yet tested on Android live browser, actual GPS refresh scenario, full video export, or real Gemini API key.
