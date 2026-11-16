OYONID MAP V14.0.8 - MONITORING COMPARISON LINE

Basis: V14.0.7 Monitoring Fix.

Additional change:
- Monitoring now draws a dashed connector between the DIJ coordinate and the actual realization GPS coordinate for each visible completed customer with both coordinate pairs valid.
- The connector is a comparison indicator only, not a travel route. It is rendered in the Monitoring-only layer and follows the selected date range and distance filter.
- Existing green markers continue to represent actual realization coordinates. Existing DIJ markers remain controlled by the DIJ checkbox.

Validation performed:
- JavaScript syntax check for js/app.js and js/oyonid-video-engine-v2.js.
- ZIP integrity check.
- Reviewed the supplied workbook's Realisasi Selesai sheet: 301 data rows; 299 rows have valid DIJ and realization coordinate pairs, 2 are missing one or both pairs.
- Based on those 299 valid pairs, distance buckets are: 0-10 m: 84; 11-30 m: 154; 31-100 m: 48; 101-300 m: 11; >300 m: 2.

Not yet verified:
- Live browser rendering on Android/Chrome.
- End-to-end interaction with the app's imported workbook and IndexedDB state.
- Production deployment. Do not deploy without explicit approval.
