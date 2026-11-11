/* OYONID MAP V13.1.21 — Wide Journey Video Engine V2
 * Modular replacement for video export only. Core Leaflet/GPS/Excel/IndexedDB code is untouched.
 * Track points (kind=track) draw the blue route. Customer completion coordinates are independent pins/events.
 */
(function () {
  "use strict";

  const W = 720, H = 1280;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;

  function drawWorker(ctx, x, y, heading, phase, scale) {
    // Lightweight 2.5D illustrated worker. Kept procedural so the export works offline
    // without loading a remote 3D model or changing the existing map engine.
    const bob = Math.sin(phase * Math.PI * 2) * 2.5 * scale;
    const swing = Math.sin(phase * Math.PI * 2) * 0.48;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.rotate(heading);
    ctx.scale(scale, scale);
    // Ground shadow
    ctx.fillStyle = "rgba(0,0,0,.24)";
    ctx.beginPath(); ctx.ellipse(0, 57, 29, 10, 0, 0, Math.PI * 2); ctx.fill();
    // Legs and boots
    const leg = (side, a) => {
      ctx.save(); ctx.translate(side * 8, 22); ctx.rotate(a);
      const g = ctx.createLinearGradient(-5, 0, 8, 38);
      g.addColorStop(0, "#354252"); g.addColorStop(1, "#111a26");
      ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(-6, 0, 13, 34, 5); ctx.fill();
      ctx.fillStyle = "#202a35"; ctx.beginPath(); ctx.roundRect(-8, 29, 21, 9, 4); ctx.fill();
      ctx.fillStyle = "#d7dce1"; ctx.fillRect(3, 34, 8, 2); ctx.restore();
    };
    leg(-1, swing); leg(1, -swing);
    // Torso, shirt shadow and sleeves
    const shirt = ctx.createLinearGradient(-22, -28, 24, 27);
    shirt.addColorStop(0, "#62d8ed"); shirt.addColorStop(.52, "#13a9cf"); shirt.addColorStop(1, "#087da9");
    ctx.fillStyle = shirt; ctx.beginPath(); ctx.moveTo(-18, -30); ctx.lineTo(18, -30); ctx.lineTo(23, 22); ctx.lineTo(-22, 22); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#d2d8d9"; ctx.beginPath(); ctx.moveTo(-18, -30); ctx.lineTo(0, -23); ctx.lineTo(18, -30); ctx.lineTo(13, -18); ctx.lineTo(-13, -18); ctx.closePath(); ctx.fill();
    const arm = (side, a) => {
      ctx.save(); ctx.translate(side * 19, -21); ctx.rotate(a);
      ctx.fillStyle = "#18283b"; ctx.beginPath(); ctx.roundRect(-5, 0, 10, 30, 5); ctx.fill();
      ctx.fillStyle = "#14a8ce"; ctx.beginPath(); ctx.roundRect(-6, 0, 12, 15, 5); ctx.fill();
      ctx.fillStyle = "#b97855"; ctx.beginPath(); ctx.arc(0, 33, 5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    };
    arm(-1, -swing * .75); arm(1, swing * .75);
    // Work pouch
    ctx.fillStyle = "#737b82"; ctx.beginPath(); ctx.roundRect(7, -1, 17, 13, 4); ctx.fill();
    ctx.fillStyle = "#aeb5ba"; ctx.fillRect(10, 2, 10, 2);
    // Neck and face
    ctx.fillStyle = "#bd805e"; ctx.fillRect(-5, -39, 10, 12);
    const face = ctx.createLinearGradient(-10, -63, 10, -37);
    face.addColorStop(0, "#e0ad86"); face.addColorStop(1, "#a9684d");
    ctx.fillStyle = face; ctx.beginPath(); ctx.ellipse(0, -51, 11, 14, 0, 0, Math.PI * 2); ctx.fill();
    // Glasses
    ctx.strokeStyle = "#18202a"; ctx.lineWidth = 1.8; ctx.strokeRect(-9, -55, 8, 6); ctx.strokeRect(1, -55, 8, 6); ctx.beginPath(); ctx.moveTo(-1, -52); ctx.lineTo(1, -52); ctx.stroke();
    // Grey cap with MANBILL UP3 label
    ctx.fillStyle = "#727b84"; ctx.beginPath(); ctx.ellipse(0, -64, 13, 7, 0, Math.PI, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#505a65"; ctx.beginPath(); ctx.ellipse(1, -62, 15, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "bold 3.8px Arial"; ctx.textAlign = "center"; ctx.fillText("MANBILL", 0, -64); ctx.fillText("UP3", 0, -60);
    ctx.restore();
  }

  function loadImage(photo) {
    return new Promise(async (resolve, reject) => {
      try {
        const blob = await v13LoadPlaybackPhotoBlob(photo);
        if (!blob) return resolve(null);
        const url = URL.createObjectURL(blob), img = new Image();
        img.onload = () => resolve({ img, url });
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Foto tidak dapat dibaca")); };
        img.src = url;
      } catch (e) { resolve(null); }
    });
  }

  window.downloadRouteVideo = async function downloadRouteVideoV2() {
    const button = document.getElementById("quickVideoDownloadBtn");
    if (button) { button.disabled = true; button.textContent = "⏳ Menyiapkan Wide Journey…"; }
    let stream = null, recorder = null, photoUrls = [];
    try {
      if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) throw new Error("Browser belum mendukung ekspor video. Gunakan Chrome terbaru.");
      if (typeof html2canvas !== "function") throw new Error("Modul peta belum termuat.");
      const entries = v13PlaybackBuildEntries();
      if (!entries.length) throw new Error("Belum ada rekaman GPS pada tanggal ini.");
      pauseRouteHistory();
      const validRaw = entries.map((e, i) => ({ ...e, lat: Number(e.point.lat), lon: Number(e.point.lon), time: new Date(e.point.at).getTime(), sourceIndex: i }))
        .filter(e => Number.isFinite(e.lat) && Number.isFinite(e.lon) && Number.isFinite(e.time));
      if (!validRaw.length) throw new Error("Koordinat atau timestamp GPS tidak valid.");
      // Cut stationary GPS runs of 30+ minutes from the rendered timeline only. Source records remain untouched.
      const valid = []; let stationary = [];
      const flushStationary = () => {
        if (!stationary.length) return;
        const first = stationary[0], last = stationary[stationary.length - 1];
        if (last.time - first.time >= 30 * 60 * 1000) {
          valid.push(first);
          if (last !== first) { last.cutPauseBefore = true; valid.push(last); }
        } else valid.push(...stationary);
        stationary = [];
      };
      for (const entry of validRaw) {
        if (entry.point.kind === "customer") { flushStationary(); valid.push(entry); continue; }
        const anchor = stationary[0];
        if (anchor && v13Distance(anchor.point, entry.point) <= 20) stationary.push(entry);
        else { flushStationary(); stationary.push(entry); }
      }
      flushStationary();

      // Separate GPS track from customer completion points. Customer points remain arrival events/pins only.
      const trackEntries = valid.filter(e => e.point.kind !== "customer");
      if (!trackEntries.length) throw new Error("Tanggal ini belum memiliki rekaman GPS petugas. Marker pelanggan saja tidak cukup untuk membuat garis perjalanan.");
      const customerRows = v13CompletedForDate();
      const boundsPoints = [
        ...trackEntries.map(e => [e.lat, e.lon]),
        ...customerRows.map(r => [parseCoordinate(r.actualLat), parseCoordinate(r.actualLon)]).filter(p => p.every(Number.isFinite))
      ];
      const bounds = L.latLngBounds(boundsPoints);
      const oldCenter = map.getCenter(), oldZoom = map.getZoom();
      const removed = [];
      [clusterGroup, v13RealizationLayer, v13PlaybackLayer, petugasMarker].forEach(layer => {
        if (layer && map.hasLayer(layer)) { map.removeLayer(layer); removed.push(layer); }
      });
      const controls = map.getContainer().querySelector(".leaflet-control-container");
      const oldVisibility = controls?.style.visibility;
      if (controls) controls.style.visibility = "hidden";
      document.getElementById("locationPhotoBtn")?.style.setProperty("visibility", "hidden");
      let mapShot, worldTrack, worldTimeline, customerPins;
      try {
        map.invalidateSize({ animate: false });
        map.fitBounds(bounds.pad(.42), { animate: false, maxZoom: 14 });
        await new Promise(r => setTimeout(r, 550));
        mapShot = await html2canvas(map.getContainer(), { backgroundColor: "#e9e5dd", useCORS: true, allowTaint: false, scale: 1, logging: false });
        const toPoint = e => { const p = map.latLngToContainerPoint([e.lat, e.lon]); return { ...e, x: p.x, y: p.y }; };
        worldTrack = trackEntries.map(toPoint);
        worldTimeline = valid.map(toPoint);
        customerPins = customerRows.map((item, index) => {
          const lat = parseCoordinate(item.actualLat), lon = parseCoordinate(item.actualLon);
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
          const p = map.latLngToContainerPoint([lat, lon]);
          return { x: p.x, y: p.y, index: index + 1, identity: item.identity || completionIdentity(item.row || {}), item };
        }).filter(Boolean);
      } finally {
        map.setView(oldCenter, oldZoom, { animate: false });
        removed.forEach(layer => layer.addTo(map));
        if (controls) controls.style.visibility = oldVisibility || "";
        document.getElementById("locationPhotoBtn")?.style.setProperty("visibility", "");
        map.invalidateSize({ animate: false });
      }

      const canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext("2d", { alpha: false });
      const scale = Math.min(W / mapShot.width, H / mapShot.height);
      const mapW = mapShot.width * scale, mapH = mapShot.height * scale;
      const offsetX = (W - mapW) / 2, offsetY = (H - mapH) / 2;
      const transform = p => ({ ...p, x: p.x * scale + offsetX, y: p.y * scale + offsetY });

      const photosMeta = v13PlaybackPhotoMetadata().filter(p => p.dayKey === v13SelectedDate());
      const photoAssets = [];
      for (const meta of photosMeta) { const loaded = await loadImage(meta); if (loaded) photoAssets.push({ ...meta, ...loaded }); }
      photoUrls = photoAssets.map(p => p.url);

      const durationMs = Math.max(15000, Math.min(300000, Number(document.getElementById("quickVideoDuration")?.value || 30) * 1000));
      // Adaptive timing: distance/time weighted, with a reserved arrival pause budget.
      const legs = Math.max(1, worldTimeline.length - 1);
      const weights = [];
      for (let i = 0; i < legs; i++) {
        const a = worldTimeline[i], b = worldTimeline[i + 1];
        const meters = v13Distance(a.point, b.point);
        const seconds = Math.max(1, (b.time - a.time) / 1000);
        weights.push(clamp(Math.sqrt(Math.max(1, meters)) * Math.sqrt(Math.min(seconds, 1800)), 1, 1200));
      }
      const customerEventCount = worldTimeline.filter(e => e.point?.kind === "customer").length;
      const holdTotal = Math.min(customerEventCount * 550, durationMs * .20);
      const holdEach = customerEventCount ? holdTotal / customerEventCount : 0;
      const moveBudget = Math.max(1000, durationMs - holdTotal);
      const sumWeights = weights.reduce((a, b) => a + b, 0) || legs;
      const legMs = weights.map(w => moveBudget * w / sumWeights);
      const schedule = [];
      for (let i = 0; i < legs; i++) {
        schedule.push({ type: "move", leg: i, duration: legMs[i] });
        if (worldTimeline[i + 1].point?.kind === "customer" && holdEach > 0) schedule.push({ type: "arrival", leg: i, duration: holdEach, entry: worldTimeline[i + 1] });
      }
      const totalTravelMs = schedule.reduce((sum, item) => sum + item.duration, 0);
      const streamFPS = 24; stream = canvas.captureStream(streamFPS);
      const mimeCandidates = ["video/mp4;codecs=avc1.42E01E", "video/mp4", "video/webm;codecs=vp9", "video/webm"];
      const mime = mimeCandidates.find(t => MediaRecorder.isTypeSupported?.(t)) || "";
      recorder = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 8000000 } : { videoBitsPerSecond: 8000000 });
      const chunks = [];
      const finished = new Promise((resolve, reject) => {
        recorder.ondataavailable = e => { if (e.data?.size) chunks.push(e.data); };
        recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || "video/webm" }));
        recorder.onerror = e => reject(e.error || new Error("Perekaman video gagal."));
      });
      recorder.start(250);

      const firstTime = worldTimeline[0].time, lastTime = worldTimeline[worldTimeline.length - 1].time;
      const reached = new Set(); let active = null, currentPhoto = null, travelled = 0;
      let leg = 0, legStart = 0, cameraX = worldTrack[0].x * scale + offsetX, cameraY = worldTrack[0].y * scale + offsetY;
      let cameraZoom = .92, heading = 0, lastTrackIndex = 0, arrivalHoldUntil = 0;
      const mapPoint = (x, y) => ({ x: x * scale + offsetX, y: y * scale + offsetY });
      const draw = (moving, progress, now) => {
        const p = mapPoint(moving.x, moving.y);
        const isArrival = moving.point?.kind === "customer" || now < arrivalHoldUntil;
        const wide = progress < .13 || progress > .92;
        const targetZoom = wide ? .92 : (isArrival ? 1.22 : 1.08);
        const targetX = wide ? (offsetX + mapW / 2) : p.x;
        const targetY = wide ? (offsetY + mapH / 2) : p.y;
        cameraX = lerp(cameraX, targetX, .055); cameraY = lerp(cameraY, targetY, .055); cameraZoom = lerp(cameraZoom, targetZoom, .045);
        ctx.fillStyle = "#e9e5dd"; ctx.fillRect(0, 0, W, H);
        ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(cameraZoom, cameraZoom); ctx.translate(-cameraX, -cameraY);
        ctx.drawImage(mapShot, offsetX, offsetY, mapW, mapH);
        // Draw only recorded officer GPS as the blue journey line.
        ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#1269ed"; ctx.lineWidth = 5 / cameraZoom;
        ctx.shadowColor = "rgba(0,80,220,.35)"; ctx.shadowBlur = 7 / cameraZoom;
        ctx.beginPath();
        let started = false;
        for (let i = 0; i < worldTrack.length; i++) {
          const t = worldTrack[i].time;
          if (t > moving.time) break;
          const q = mapPoint(worldTrack[i].x, worldTrack[i].y);
          if (!started) { ctx.moveTo(q.x, q.y); started = true; } else ctx.lineTo(q.x, q.y);
          lastTrackIndex = i;
        }
        const last = worldTrack[lastTrackIndex];
        if (last && moving.point?.kind !== "customer") { const q = mapPoint(moving.x, moving.y); if (started) ctx.lineTo(q.x, q.y); }
        ctx.stroke(); ctx.shadowBlur = 0;
        // Customer markers are rendered from customer coordinates, independently of the GPS track.
        customerPins.forEach(pin => {
          const q = mapPoint(pin.x, pin.y);
          ctx.beginPath(); ctx.arc(q.x, q.y, 9 / cameraZoom, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill();
          ctx.beginPath(); ctx.arc(q.x, q.y, 6.5 / cameraZoom, 0, Math.PI * 2); ctx.fillStyle = "#13a05a"; ctx.fill();
          ctx.fillStyle = "#fff"; ctx.font = `bold ${8 / cameraZoom}px Arial`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(pin.index), q.x, q.y);
        });
        ctx.restore();
        // The worker remains screen-readable while the map camera moves beneath him.
        const dx = worldTimeline[Math.min(leg + 1, worldTimeline.length - 1)].x - worldTimeline[leg].x;
        const dy = worldTimeline[Math.min(leg + 1, worldTimeline.length - 1)].y - worldTimeline[leg].y;
        if (Math.hypot(dx, dy) > 1) heading = lerp(heading, Math.atan2(dy, dx) + Math.PI / 2, .08);
        drawWorker(ctx, W / 2, H * .54, heading, (now / 460) % 1, isArrival ? .92 : 1.0);

        // Fixed information overlays.
        ctx.fillStyle = "rgba(9,27,47,.94)"; ctx.beginPath(); ctx.roundRect(18, 16, 440, 94, 16); ctx.fill();
        const elapsed = Math.max(0, moving.time - firstTime);
        ctx.fillStyle = "#fff"; ctx.font = "bold 20px Arial"; ctx.fillText("OYONID MAP • WIDE JOURNEY", 34, 45);
        ctx.fillStyle = "#62e39a"; ctx.font = "bold 18px Arial"; ctx.fillText(`Selesai ${reached.size}/${customerRows.length}`, 34, 78);
        ctx.fillStyle = "#fff"; ctx.font = "bold 16px Arial"; ctx.fillText(`${(travelled / 1000).toFixed(2).replace(".", ",")} km  •  ${oyonFormatClock(elapsed)}`, 238, 78);
        ctx.fillStyle = "#dbe8f5"; ctx.font = "13px Arial"; ctx.fillText(wide ? "WIDE VIEW" : (isArrival ? "ARRIVAL VIEW" : "FOLLOW VIEW"), W - 165, 45);
        ctx.fillStyle = "rgba(9,27,47,.88)"; ctx.fillRect(18, H - 14, W - 36, 5); ctx.fillStyle = "#19b66d"; ctx.fillRect(18, H - 14, (W - 36) * clamp(progress, 0, 1), 5);
        if (moving.cutPauseBefore) { ctx.fillStyle = "rgba(9,27,47,.92)"; ctx.beginPath(); ctx.roundRect(W - 310, 122, 292, 42, 12); ctx.fill(); ctx.fillStyle = "#fff"; ctx.font = "bold 14px Arial"; ctx.fillText("Jeda GPS 30+ menit dilewati", W - 294, 149); }
        if (active || currentPhoto) {
          const x = 18, y = H - 302, w = 310, ph = 194;
          ctx.fillStyle = "rgba(9,27,47,.96)"; ctx.beginPath(); ctx.roundRect(x, y, w, 270, 14); ctx.fill();
          ctx.save(); ctx.beginPath(); ctx.roundRect(x + 8, y + 8, w - 16, ph, 9); ctx.clip();
          if (currentPhoto?.img) {
            const img = currentPhoto.img, fit = Math.min((w - 16) / img.width, ph / img.height);
            const dw = img.width * fit, dh = img.height * fit;
            ctx.fillStyle = "#17283b"; ctx.fillRect(x + 8, y + 8, w - 16, ph);
            ctx.drawImage(img, x + 8 + ((w - 16) - dw) / 2, y + 8 + (ph - dh) / 2, dw, dh);
          } else { ctx.fillStyle = "#26384b"; ctx.fillRect(x + 8, y + 8, w - 16, ph); ctx.fillStyle = "#fff"; ctx.font = "bold 16px Arial"; ctx.fillText("Foto tidak tersedia", x + 25, y + 110); }
          ctx.restore();
          const row = active?.row || {}; const name = String(getMappedValue(row, "NAMA") || row.NAMA || "Pelanggan");
          const idpel = String(getMappedValue(row, "IDPEL") || row.IDPEL || "");
          ctx.fillStyle = "#fff"; ctx.font = "bold 15px Arial"; ctx.fillText(name.slice(0, 32), x + 12, y + 225);
          ctx.font = "12px Arial"; ctx.fillText(`IDPEL ${idpel.slice(-14)}`, x + 12, y + 249);
        }
      };

      let done = false, scheduleIndex = 0, scheduleStart = 0, lastCompletedLeg = -1;
      const processedArrivals = new Set();
      const markArrival = entry => {
        if (entry.point?.kind !== "customer") return;
        const key = entry.point.identity || entry.point.completionId || `${entry.lat},${entry.lon},${entry.time}`;
        if (processedArrivals.has(key)) return;
        processedArrivals.add(key); reached.add(key);
        active = customerRows.find(r => (r.identity || completionIdentity(r.row || {})) === entry.point.identity) || active;
        const photo = oyonNearestPlaybackPhoto(entry.point, photoAssets);
        if (photo) currentPhoto = photo;
        arrivalHoldUntil = performance.now() + holdEach;
      };
      const started = performance.now();
      const animate = now => {
        if (done) return;
        const elapsedReal = now - started;
        const filmProgress = clamp(elapsedReal / totalTravelMs, 0, 1);
        let before = 0;
        while (scheduleIndex < schedule.length - 1 && elapsedReal >= before + schedule[scheduleIndex].duration) {
          before += schedule[scheduleIndex].duration; scheduleIndex++;
        }
        const item = schedule[scheduleIndex];
        const within = clamp((elapsedReal - before) / Math.max(1, item.duration), 0, 1);
        let moving;
        if (item.type === "arrival") {
          const target = item.entry;
          if (!processedArrivals.has(target.point.identity || target.point.completionId || `${target.lat},${target.lon},${target.time}`)) markArrival(target);
          leg = item.leg;
          moving = { ...target, point: target.point, cutPauseBefore: !!target.cutPauseBefore };
        } else {
          leg = item.leg;
          const from = worldTimeline[leg], to = worldTimeline[leg + 1], e = smooth(within);
          moving = { ...from, x: lerp(from.x, to.x, e), y: lerp(from.y, to.y, e), time: lerp(from.time, to.time, e), point: e > .985 ? to.point : from.point, cutPauseBefore: !!to.cutPauseBefore };
          if (within >= 1 && lastCompletedLeg !== leg) {
            const meters = v13Distance(from.point, to.point);
            if (Number.isFinite(meters) && meters >= 3 && meters < 1000 && from.point.kind !== "customer" && to.point.kind !== "customer") travelled += meters;
            if (to.point.kind === "customer") markArrival(to);
            lastCompletedLeg = leg;
          }
        }
        draw(moving, filmProgress, now);
        if (filmProgress >= 1) { done = true; recorder.stop(); return; }
        requestAnimationFrame(animate);
      };
      if (worldTimeline[0].point?.kind === "customer") markArrival(worldTimeline[0]);
      draw(worldTimeline[0], 0, performance.now()); requestAnimationFrame(animate);
      const blob = await finished;
      stream.getTracks().forEach(t => t.stop()); stream = null;
      photoUrls.forEach(u => URL.revokeObjectURL(u)); photoUrls = [];
      if (!blob.size) throw new Error("Video kosong. Silakan coba kembali.");
      const url = URL.createObjectURL(blob), a = document.createElement("a"), ext = blob.type.includes("mp4") ? "mp4" : "webm";
      a.href = url; a.download = `OYONID_WIDE_JOURNEY_${v13SelectedDate()}_${Math.round(durationMs / 1000)}detik.${ext}`;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
      showToast(`Wide Journey berhasil dibuat • ${Math.round(durationMs / 1000)} detik • ${reached.size} pelanggan ditampilkan.`);
    } catch (err) {
      console.error("[OYONID] Wide Journey V2 failed", err);
      showToast("Video gagal dibuat: " + (err?.message || "coba ulangi"));
    } finally {
      if (stream) stream.getTracks().forEach(t => t.stop());
      photoUrls.forEach(u => URL.revokeObjectURL(u));
      if (button) { button.disabled = false; button.textContent = "⬇ Buat Ulang Video"; }
    }
  };
  console.info("[OYONID] Wide Journey Video Engine V2 loaded.");
})();
