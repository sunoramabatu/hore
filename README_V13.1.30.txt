OYONID MAP V13.1.30 — FLOATING CUSTOMER CARD (PHASE 2)

Basis: OYONID_MAP_V13_1_29_MOBILE_REALISASI_PHASE1.

Implemented:
- Customer detail panel redesigned as a compact dark-navy floating card.
- Card header includes minimize, maximize, close, and drag handle.
- Dragged position is stored in localStorage under oyon_detail_card_position_v1.
- Minimize hides card content without closing the selected customer; reopening a customer restores expanded state.
- Maximize increases the available card area.
- Customer house photo is loaded from existing customer-photo IndexedDB keys; meter photo is used as fallback.
- Existing DIJ / backup location detail and compare controls are retained.
- Existing GPS, Excel, IndexedDB, offline, and video engine data formats are unchanged.

Files changed:
- index.html: detail card controls and integrated photo slot; cache-busting versions.
- css/app.css: floating card visual/layout styles and responsive behavior.
- js/app.js: drag/minimize/maximize state and loading customer photo from existing IndexedDB.

Not implemented yet:
- Monitoring date-range aggregation and reports.
- Multi-date video rendering, day separators, and per-day recap.
- Actual rigged 3D GLB model; current worker sprite/procedural asset is retained.

Validation:
- node --check js/app.js: PASS
- node --check js/oyonid-video-engine-v2.js: PASS
- Duplicate HTML id check: to be verified by package validation.
- ZIP integrity: to be verified by package validation.

Not yet validated on real Android browser:
- Drag interaction with touch and map gestures.
- Photo retrieval from an existing populated IndexedDB.
- Layout across Android screen sizes.
- GPS recording, Excel round-trip, and MP4/WebM rendering.

Safety:
- No IndexedDB schema changes.
- No GPS session format changes.
- No customer data deletion or migration.
- No production deployment.
