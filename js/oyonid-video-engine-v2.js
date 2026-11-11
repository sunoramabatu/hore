/* OYONID MAP V13.1.24 — Local Area Cinematic Camera
 * GPS sessions remain separate; customer arrival events are independent and never create blue route segments.
 * Four cinematic angles are sequenced in one video: Wide, Follow, Oblique, Arrival.
 */
(function () {
  "use strict";
  const W=720,H=1280, clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const lerp=(a,b,t)=>a+(b-a)*t, smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
  const wrapAngle=a=>Math.atan2(Math.sin(a),Math.cos(a));

  function drawWorker(ctx,x,y,dirX,phase,walking=true){
    // Upright, shaded 2.5D technician. Keep screen-facing so map camera turns never flip the body.
    const bob=walking?Math.sin(phase*Math.PI*2)*2.4:0;
    const stride=walking?Math.sin(phase*Math.PI*2)*.55:0;
    ctx.save();ctx.translate(x,y+bob);
    ctx.fillStyle="rgba(3,12,24,.32)";ctx.beginPath();ctx.ellipse(0,47,23,7,0,0,Math.PI*2);ctx.fill();
    const leg=(side,angle)=>{
      ctx.save();ctx.translate(side*7,15);ctx.rotate(angle);
      const trouser=ctx.createLinearGradient(-6,0,7,31);trouser.addColorStop(0,"#526174");trouser.addColorStop(.45,"#253448");trouser.addColorStop(1,"#111b29");
      ctx.fillStyle=trouser;ctx.beginPath();ctx.moveTo(-5,0);ctx.lineTo(5,0);ctx.lineTo(7,28);ctx.lineTo(2,33);ctx.lineTo(-7,29);ctx.closePath();ctx.fill();
      ctx.fillStyle="#151b24";ctx.beginPath();ctx.roundRect(-8,27,19,8,4);ctx.fill();
      ctx.fillStyle="#596577";ctx.fillRect(-4,3,2,20);ctx.restore();
    };
    leg(-1,stride);leg(1,-stride);
    // torso and shirt
    const shirt=ctx.createLinearGradient(-19,-27,20,23);shirt.addColorStop(0,"#8be9f5");shirt.addColorStop(.25,"#21c1df");shirt.addColorStop(.72,"#0798c2");shirt.addColorStop(1,"#075e86");
    ctx.fillStyle=shirt;ctx.beginPath();ctx.moveTo(-14,-28);ctx.lineTo(13,-28);ctx.lineTo(20,15);ctx.lineTo(14,22);ctx.lineTo(-15,22);ctx.lineTo(-21,14);ctx.closePath();ctx.fill();
    ctx.fillStyle="#cbd4d7";ctx.beginPath();ctx.moveTo(-14,-28);ctx.lineTo(0,-22);ctx.lineTo(13,-28);ctx.lineTo(17,-19);ctx.lineTo(8,-14);ctx.lineTo(-8,-14);ctx.lineTo(-18,-19);ctx.closePath();ctx.fill();
    ctx.strokeStyle="rgba(255,255,255,.35)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,-20);ctx.lineTo(0,17);ctx.stroke();
    // chest pockets
    ctx.fillStyle="rgba(0,80,112,.28)";ctx.fillRect(-13,-9,9,9);ctx.fillRect(4,-9,9,9);
    ctx.strokeStyle="rgba(255,255,255,.25)";ctx.strokeRect(-13,-9,9,9);ctx.strokeRect(4,-9,9,9);
    // shoulder / arm swing
    const arm=(side,angle)=>{
      ctx.save();ctx.translate(side*17,-20);ctx.rotate(angle);
      ctx.fillStyle="#24364a";ctx.beginPath();ctx.roundRect(-5,0,10,24,5);ctx.fill();
      ctx.fillStyle="#0b8fb6";ctx.beginPath();ctx.roundRect(-6,0,12,12,4);ctx.fill();
      ctx.fillStyle="#b98264";ctx.beginPath();ctx.ellipse(0,27,4.5,6,0,0,Math.PI*2);ctx.fill();
      ctx.restore();
    };
    arm(-1,-stride*.65);arm(1,stride*.65);
    // work bag strap and side pouch
    ctx.strokeStyle="#283344";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(10,-24);ctx.lineTo(18,10);ctx.stroke();
    const bag=ctx.createLinearGradient(12,-2,28,14);bag.addColorStop(0,"#9ba5aa");bag.addColorStop(1,"#384654");
    ctx.fillStyle=bag;ctx.beginPath();ctx.roundRect(12,0,15,15,4);ctx.fill();
    ctx.fillStyle="#d3d9d9";ctx.fillRect(15,3,8,3);
    // neck, face, glasses
    ctx.fillStyle="#b98264";ctx.fillRect(-4,-36,8,10);
    ctx.fillStyle="#d9a17d";ctx.beginPath();ctx.ellipse(0,-46,10,13,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#b98264";ctx.beginPath();ctx.ellipse(-9,-45,2.5,4,0,0,Math.PI*2);ctx.ellipse(9,-45,2.5,4,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#202b38";ctx.strokeStyle="#172333";ctx.lineWidth=1.5;
    ctx.beginPath();ctx.roundRect(-9,-49,8,6,2);ctx.roundRect(1,-49,8,6,2);ctx.stroke();ctx.beginPath();ctx.moveTo(-1,-46);ctx.lineTo(1,-46);ctx.stroke();
    ctx.fillStyle="#30343a";ctx.beginPath();ctx.arc(0,-41,5,.15,Math.PI-.15);ctx.fill();
    // grey cap with small readable lettering
    ctx.fillStyle="#858d94";ctx.beginPath();ctx.ellipse(0,-57,12,6,0,Math.PI,Math.PI*2);ctx.fill();
    ctx.fillStyle="#68727c";ctx.beginPath();ctx.ellipse(1,-55,15,3,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#e8ecee";ctx.font="bold 3.4px Arial";ctx.textAlign="center";ctx.fillText("MANBILL",0,-57);ctx.fillText("UP3",0,-53);
    ctx.restore();
  }
  function loadPhoto(meta){
    return new Promise(async resolve=>{
      try{const blob=await v13LoadPlaybackPhotoBlob(meta);if(!blob)return resolve(null);
        const url=URL.createObjectURL(blob),img=new Image();
        img.onload=()=>resolve({img,url,...meta});img.onerror=()=>{URL.revokeObjectURL(url);resolve(null);};img.src=url;
      }catch(e){resolve(null);}
    });
  }
  function timestamp(p){const t=new Date(p?.at||p?.timestamp||"").getTime();return Number.isFinite(t)?t:null;}

  window.downloadRouteVideo=async function downloadRouteVideoV24(){
    const button=document.getElementById("quickVideoDownloadBtn");
    if(button){button.disabled=true;button.textContent="⏳ Menyiapkan Wide Journey…";}
    let stream=null,photoUrls=[];
    try{
      if(!window.MediaRecorder||!HTMLCanvasElement.prototype.captureStream)throw new Error("Browser belum mendukung ekspor video. Gunakan Chrome terbaru.");
      if(typeof html2canvas!=="function")throw new Error("Modul peta belum termuat.");
      const sessions=(v13RoutesForDate()||[]).map((s,i)=>{
        const pts=(s.points||[]).map((p,j)=>({lat:Number(p.lat),lon:Number(p.lon),time:timestamp(p),sourceIndex:j}))
          .filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&p.time!==null)
          .sort((a,b)=>a.time-b.time);
        return {id:String(s.id||`session_${i}`),points:pts};
      }).filter(s=>s.points.length);
      if(!sessions.length)throw new Error("Tidak ditemukan rekaman GPS petugas untuk tanggal ini. Periksa backup GPS dan tanggal yang dipilih.");
      const customerRows=v13CompletedForDate();
      if(!customerRows.length)throw new Error("Tidak ada pelanggan selesai pada tanggal ini.");
      const customers=customerRows.map((item,index)=>{
        let at=timestamp({at:item.completedAt});
        if(item.dayKey){
          const time=String(item.time||"").trim().replace(/\./g,":");
          if(/^\d{1,2}:\d{2}(?::\d{2})?$/.test(time)){const d=new Date(`${item.dayKey}T${time}`);if(!Number.isNaN(d.getTime()))at=d.getTime();}
        }
        if(at===null)at=Date.parse(`${item.dayKey||v13SelectedDate()}T12:00:00`);
        return {item,index,at:Number.isFinite(at)?at:null,identity:item.identity||completionIdentity(item.row||{})};
      }).filter(c=>c.at!==null);
      if(!customers.length)throw new Error("Tanggal/jam penyelesaian pelanggan tidak valid.");
      const trackBounds=sessions.flatMap(s=>s.points.map(p=>[p.lat,p.lon]));
      const customerBounds=customers.map(c=>[parseCoordinate(c.item.actualLat),parseCoordinate(c.item.actualLon)]).filter(p=>p.every(Number.isFinite));
      const allBounds=[...trackBounds,...customerBounds];
      if(!allBounds.length)throw new Error("Koordinat perjalanan tidak tersedia.");
      pauseRouteHistory();
      const oldCenter=map.getCenter(),oldZoom=map.getZoom(),removed=[];
      [clusterGroup,v13RealizationLayer,v13PlaybackLayer,petugasMarker].forEach(layer=>{if(layer&&map.hasLayer(layer)){map.removeLayer(layer);removed.push(layer);}});
      const controls=map.getContainer().querySelector(".leaflet-control-container"),oldVisibility=controls?.style.visibility;
      if(controls)controls.style.visibility="hidden";
      document.getElementById("locationPhotoBtn")?.style.setProperty("visibility","hidden");
      let mapShot,segments,pins;
      try{
        map.invalidateSize({animate:false});
        map.fitBounds(L.latLngBounds(allBounds).pad(.20),{animate:false,maxZoom:15});
        await new Promise(r=>setTimeout(r,450));
        mapShot=await html2canvas(map.getContainer(),{backgroundColor:"#e9e5dd",useCORS:true,allowTaint:false,scale:1,logging:false});
        segments=sessions.map(s=>s.points.map(p=>{const q=map.latLngToContainerPoint([p.lat,p.lon]);return {...p,x:q.x,y:q.y};}));
        pins=customers.map(c=>{const lat=parseCoordinate(c.item.actualLat),lon=parseCoordinate(c.item.actualLon);if(!Number.isFinite(lat)||!Number.isFinite(lon))return null;
          const q=map.latLngToContainerPoint([lat,lon]);return {...c,x:q.x,y:q.y};}).filter(Boolean);
      }finally{
        map.setView(oldCenter,oldZoom,{animate:false});removed.forEach(l=>l.addTo(map));
        if(controls)controls.style.visibility=oldVisibility||"";
        document.getElementById("locationPhotoBtn")?.style.setProperty("visibility","");
        map.invalidateSize({animate:false});
      }
      const canvas=document.createElement("canvas");canvas.width=W;canvas.height=H;
      const ctx=canvas.getContext("2d",{alpha:false});
      const fit=Math.min(W/mapShot.width,H/mapShot.height),mapW=mapShot.width*fit,mapH=mapShot.height*fit;
      const ox=(W-mapW)/2,oy=(H-mapH)/2;
      const toScreen=p=>({x:p.x*fit+ox,y:p.y*fit+oy});
      segments=segments.map(seg=>seg.map(p=>({...p,...toScreen(p)})));
      pins=pins.map(p=>({...p,...toScreen(p)}));
      const photoMetas=v13PlaybackPhotoMetadata().filter(p=>p.dayKey===v13SelectedDate());
      const photoAssets=[];for(const meta of photoMetas){const a=await loadPhoto(meta);if(a)photoAssets.push(a);}
      photoUrls=photoAssets.map(p=>p.url);
      const durationMs=Math.max(15000,Math.min(300000,Number(document.getElementById("quickVideoDuration")?.value||30)*1000));
      const allTimes=[...segments.flatMap(s=>s.map(p=>p.time)),...pins.map(p=>p.at)].filter(Number.isFinite);
      const minTime=Math.min(...allTimes),maxTime=Math.max(...allTimes);
      if(!(maxTime>minTime))throw new Error("Rentang waktu GPS dan realisasi terlalu pendek untuk membuat video.");
      const fps=24;stream=canvas.captureStream(fps);
      const candidates=["video/mp4;codecs=avc1.42E01E","video/mp4","video/webm;codecs=vp9","video/webm"];
      const mime=candidates.find(t=>MediaRecorder.isTypeSupported?.(t))||"";
      const recorder=new MediaRecorder(stream,mime?{mimeType:mime,videoBitsPerSecond:9000000}:{videoBitsPerSecond:9000000});
      const chunks=[];const finished=new Promise((resolve,reject)=>{recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};recorder.onstop=()=>resolve(new Blob(chunks,{type:recorder.mimeType||"video/webm"}));recorder.onerror=e=>reject(e.error||new Error("Perekaman video gagal."));});
      recorder.start(250);

      const durationSeconds=durationMs/1000;
      // Cinematic local-area camera: short local overview, close follow, 45-degree oblique,
      // arrival close-up, then a short local-area outro. No full-route zoom-out.
      const phaseAt=p=>p<.08?"AREA":p<.43?"FOLLOW":p<.70?"OBLIQUE":p<.92?"ARRIVAL":"AREA";
      const revealed=new Set();let reached=0,travelled=0,lastWorker=null,currentPhoto=null;
      let camX=W/2,camY=H/2,camZoom=.9,camAngle=0,camSquash=1,phaseLabel="AREA";
      const pointAtTime=t=>{
        let chosen=null,chosenSeg=-1;
        for(let si=0;si<segments.length;si++){const seg=segments[si];if(!seg.length)continue;
          if(t>=seg[0].time&&t<=seg[seg.length-1].time){chosen=seg;chosenSeg=si;break;}
        }
        if(!chosen){
          let best=Infinity;
          segments.forEach((seg,si)=>{if(!seg.length)return;[seg[0],seg[seg.length-1]].forEach(p=>{const d=Math.abs(p.time-t);if(d<best){best=d;chosen=[p];chosenSeg=si;}});});
        }
        if(!chosen)return null;
        if(chosen.length===1)return {...chosen[0],segmentIndex:chosenSeg,dirX:1,dirY:0};
        let i=0;while(i<chosen.length-2&&chosen[i+1].time<t)i++;
        const a=chosen[i],b=chosen[i+1],f=clamp((t-a.time)/Math.max(1,b.time-a.time),0,1),e=smooth(f);
        return {...a,x:lerp(a.x,b.x,e),y:lerp(a.y,b.y,e),time:t,segmentIndex:chosenSeg,dirX:b.x-a.x,dirY:b.y-a.y};
      };
      const nearestCustomer=t=>{let best=null,dt=Infinity;for(const p of pins){const d=Math.abs(p.at-t);if(d<dt){dt=d;best=p;}}return dt<Math.max(120000,(maxTime-minTime)*.025)?best:null;};
      const distanceAtTime=t=>{
        let total=0;
        segments.forEach(seg=>{
          for(let i=1;i<seg.length;i++){
            const a=seg[i-1],b=seg[i];
            if(t>=b.time) total+=v13Distance(a,b);
            else if(t>a.time&&t<b.time){total+=v13Distance(a,b)*clamp((t-a.time)/Math.max(1,b.time-a.time),0,1);break;}
            else if(t<=a.time)break;
          }
        });
        return total;
      };
      const started=performance.now();
      const draw=(now)=>{
        const elapsed=now-started,progress=clamp(elapsed/durationMs,0,1),virtualTime=lerp(minTime,maxTime,smooth(progress));
        const worker=pointAtTime(virtualTime),phase=phaseAt(progress);
        pins.forEach(pin=>{const key=`${pin.index}|${pin.identity||""}`;if(pin.at<=virtualTime&&!revealed.has(key)){revealed.add(key);reached++;}});
        const arrival=nearestCustomer(virtualTime);
        if(arrival){const photo=photoAssets.find(p=>p.identity&&p.identity===arrival.identity)||oyonNearestPlaybackPhoto({lat:arrival.item.actualLat,lon:arrival.item.actualLon,at:new Date(arrival.at).toISOString(),identity:arrival.identity},photoAssets);if(photo)currentPhoto=photo;}
        const activePoint=worker||lastWorker;
        if(worker)lastWorker=worker;
        travelled=distanceAtTime(virtualTime);

        // Camera target stays around the current reading block, never the entire city route.
        const targetZoom=phase==="AREA"?.92:phase==="FOLLOW"?1.42:phase==="OBLIQUE"?1.22:1.68;
        const targetAngle=phase==="OBLIQUE"?-.785:phase==="ARRIVAL"?-.35:0;
        const targetSquash=phase==="OBLIQUE"?.78:phase==="ARRIVAL"?.88:1;
        const desiredX=activePoint?.x??W/2,desiredY=(activePoint?.y??H/2)-((H*.10)/(targetZoom*targetSquash));
        camX=lerp(camX,desiredX,.055);camY=lerp(camY,desiredY,.055);
        camZoom=lerp(camZoom,targetZoom,.045);camAngle=lerp(camAngle,targetAngle,.035);camSquash=lerp(camSquash,targetSquash,.04);
        phaseLabel=phase==="AREA"?"AREA VIEW":phase==="FOLLOW"?"FOLLOW":phase==="OBLIQUE"?"45° OBLIQUE":"ARRIVAL";

        ctx.fillStyle="#e9e5dd";ctx.fillRect(0,0,W,H);
        const worldToScreen=p=>{
          const dx=p.x-camX,dy=p.y-camY,c=Math.cos(camAngle),s=Math.sin(camAngle);
          const rx=dx*c-dy*s,ry=dx*s+dy*c;
          return {x:W/2+rx*camZoom,y:H*.53+ry*camZoom*camSquash};
        };
        ctx.save();ctx.translate(W/2,H*.53);ctx.rotate(camAngle);ctx.scale(camZoom,camZoom*camSquash);ctx.translate(-camX,-camY);
        ctx.drawImage(mapShot,ox,oy,mapW,mapH);
        // Track only: separate GPS sessions remain visually disconnected.
        ctx.lineCap="round";ctx.lineJoin="round";ctx.strokeStyle="#075eea";ctx.lineWidth=7/camZoom;
        ctx.shadowColor="rgba(0,72,220,.68)";ctx.shadowBlur=9/camZoom;
        segments.forEach(seg=>{
          if(!seg.length)return;ctx.beginPath();let begun=false;
          for(let i=0;i<seg.length;i++){const p=seg[i];if(p.time>virtualTime)break;if(!begun){ctx.moveTo(p.x,p.y);begun=true;}else ctx.lineTo(p.x,p.y);}
          if(begun)ctx.stroke();
        });
        ctx.shadowBlur=0;
        pins.forEach(pin=>{
          const key=`${pin.index}|${pin.identity||""}`;if(!revealed.has(key))return;
          ctx.beginPath();ctx.arc(pin.x,pin.y,11/camZoom,0,Math.PI*2);ctx.fillStyle="#fff";ctx.fill();
          ctx.beginPath();ctx.arc(pin.x,pin.y,8/camZoom,0,Math.PI*2);ctx.fillStyle="#12a05a";ctx.fill();
          ctx.fillStyle="#fff";ctx.font=`bold ${8/camZoom}px Arial`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(String(pin.index+1),pin.x,pin.y);
        });
        ctx.restore();

        // Project the moving technician from the exact interpolated GPS point onto the transformed map.
        // Character stays upright on screen; its feet are anchored to the route line.
        if(activePoint){
          const projected=worldToScreen(activePoint);
          const vx=activePoint.dirX||1,vy=activePoint.dirY||0;
          const facing=(Math.abs(vx)>=Math.abs(vy)?(vx<0?-1:1):1);
          const walking=!!worker&&(!arrival||Math.abs(arrival.at-virtualTime)>18000);
          const walkPhase=worker?((worker.time-minTime)/1000*1.65)%1:(now/650)%1;
          drawWorker(ctx,projected.x,projected.y,facing,walkPhase,walking);
        }
        // HUD
        ctx.fillStyle="rgba(9,27,47,.95)";ctx.beginPath();ctx.roundRect(18,16,500,96,16);ctx.fill();
        ctx.fillStyle="#fff";ctx.font="bold 20px Arial";ctx.fillText("OYONID MAP • WIDE JOURNEY",34,46);
        ctx.fillStyle="#62e39a";ctx.font="bold 18px Arial";ctx.fillText(`Selesai ${reached}/${pins.length}`,34,79);
        ctx.fillStyle="#fff";ctx.font="bold 15px Arial";ctx.fillText(`${(travelled/1000).toFixed(2).replace(".",",")} km`,300,79);
        ctx.fillStyle="#dce8f5";ctx.font="bold 15px Arial";ctx.fillText(phaseLabel,W-155,46);
        if(currentPhoto){
          const x=18,y=H-302,w=310,ph=194;
          ctx.fillStyle="rgba(9,27,47,.96)";ctx.beginPath();ctx.roundRect(x,y,w,270,14);ctx.fill();
          ctx.save();ctx.beginPath();ctx.roundRect(x+8,y+8,w-16,ph,9);ctx.clip();ctx.fillStyle="#17283b";ctx.fillRect(x+8,y+8,w-16,ph);
          const img=currentPhoto.img,fitImg=Math.min((w-16)/img.width,ph/img.height),dw=img.width*fitImg,dh=img.height*fitImg;
          ctx.drawImage(img,x+8+(w-16-dw)/2,y+8+(ph-dh)/2,dw,dh);ctx.restore();
          const row=arrival?.item?.row||{};const name=String(getMappedValue(row,"NAMA")||row.NAMA||currentPhoto.name||"Pelanggan");
          ctx.fillStyle="#fff";ctx.font="bold 15px Arial";ctx.fillText(name.slice(0,30),x+12,y+225);
          ctx.font="12px Arial";ctx.fillText(`IDPEL ${String(getMappedValue(row,"IDPEL")||row.IDPEL||"").slice(-14)}`,x+12,y+249);
        }
        ctx.fillStyle="rgba(9,27,47,.9)";ctx.fillRect(18,H-14,W-36,5);ctx.fillStyle="#19b66d";ctx.fillRect(18,H-14,(W-36)*progress,5);
      };
      const animate=now=>{draw(now);if(now-started>=durationMs){recorder.stop();return;}requestAnimationFrame(animate);};
      requestAnimationFrame(animate);
      const blob=await finished;stream.getTracks().forEach(t=>t.stop());stream=null;
      photoUrls.forEach(u=>URL.revokeObjectURL(u));photoUrls=[];
      if(!blob.size)throw new Error("Video kosong. Coba ulangi.");
      const url=URL.createObjectURL(blob),a=document.createElement("a"),ext=blob.type.includes("mp4")?"mp4":"webm";
      a.href=url;a.download=`OYONID_WIDE_JOURNEY_${v13SelectedDate()}_${Math.round(durationSeconds)}detik.${ext}`;
      document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
      showToast(`Wide Journey berhasil dibuat • ${Math.round(durationSeconds)} detik • ${reached}/${pins.length} pelanggan ditampilkan.`);
    }catch(err){console.error("[OYONID] Wide Journey V13.1.24 failed",err);showToast("Video gagal dibuat: "+(err?.message||"coba ulangi"));}
    finally{if(stream)stream.getTracks().forEach(t=>t.stop());photoUrls.forEach(u=>URL.revokeObjectURL(u));if(button){button.disabled=false;button.textContent="⬇ Buat Ulang Video";}}
  };
  console.info("[OYONID] Local Area Cinematic V13.1.24 loaded.");
})();
