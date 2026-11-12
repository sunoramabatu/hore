/* OYONID MAP V13.1.26 — Animated Worker & Satellite Journey
 * GPS sessions remain separate; customer arrival events are independent and never create blue route segments.
 * Four cinematic angles are sequenced in one video: Wide, Follow, Oblique, Arrival.
 */
(function () {
  "use strict";
  const W=720,H=1280, clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const lerp=(a,b,t)=>a+(b-a)*t, smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
  const wrapAngle=a=>Math.atan2(Math.sin(a),Math.cos(a));

  function drawWorker(ctx,x,y,dirX,phase,walking=true,view="FOLLOW"){
    // Procedural 3D technician built from shaded volumes and articulated limbs.
    // Feet are anchored at the GPS point; camera changes never rotate the body upside down.
    const gait=walking?phase*Math.PI*2:0, stride=walking?Math.sin(gait)*.62:0;
    const bob=walking?Math.abs(Math.sin(gait))*1.8:0, armSwing=walking?Math.sin(gait+Math.PI)*.48:0;
    const scale=.72, rear=view!=="ARRIVAL";
    ctx.save();ctx.translate(x,y+bob);ctx.scale(scale,scale);
    ctx.fillStyle="rgba(3,10,20,.34)";ctx.beginPath();ctx.ellipse(0,2,19,5,0,0,Math.PI*2);ctx.fill();
    const limb=(x1,y1,z1,x2,y2,z2,r,color1,color2)=>{
      // 3D segment projected with depth shading and a rounded joint.
      const project=(x,y,z)=>({x:x+z*.20,y:y-z*.10});
      const p1=project(x1,y1,z1),p2=project(x2,y2,z2),dx=p2.x-p1.x,dy=p2.y-p1.y;
      const len=Math.hypot(dx,dy),ang=Math.atan2(dy,dx);
      ctx.save();ctx.translate(p1.x,p1.y);ctx.rotate(ang+Math.PI/2);
      const g=ctx.createLinearGradient(-r,0,r,0);g.addColorStop(0,color2);g.addColorStop(.35,color1);g.addColorStop(1,color2);
      ctx.fillStyle=g;ctx.beginPath();ctx.roundRect(-r,0,r*2,len,Math.min(r,5));ctx.fill();
      ctx.fillStyle="rgba(255,255,255,.18)";ctx.fillRect(-r*.48,2,r*.28,Math.max(2,len-5));ctx.restore();
      ctx.fillStyle=color1;ctx.beginPath();ctx.arc(p2.x,p2.y,r*.72,0,Math.PI*2);ctx.fill();
    };
    // legs: alternating hip/knee/ankle positions
    const leg=(side,sw)=>{
      const hipX=side*5,hipY=-29,kneeX=hipX+sw*8,kneeY=-15,ankleX=hipX-sw*10,ankleY=-2;
      limb(hipX,hipY,side*2,kneeX,kneeY,side*3,4.5,"#35475c","#172638");
      limb(kneeX,kneeY,side*3,ankleX,ankleY,side*4,4.1,"#27384d","#101c2b");
      // work shoe
      ctx.fillStyle="#111b27";ctx.beginPath();ctx.ellipse(ankleX+2,ankleY+2,6,3,0,0,Math.PI*2);ctx.fill();
    };
    leg(-1,stride);leg(1,-stride);
    // torso volume with rear panel / shirt seams
    const body=ctx.createLinearGradient(-13,-70,14,-25);body.addColorStop(0,"#8ceafa");body.addColorStop(.35,"#19b6d8");body.addColorStop(.72,"#087fa8");body.addColorStop(1,"#07516f");
    ctx.fillStyle=body;ctx.beginPath();ctx.moveTo(-11,-70);ctx.lineTo(11,-70);ctx.lineTo(14,-32);ctx.lineTo(10,-27);ctx.lineTo(-10,-27);ctx.lineTo(-14,-32);ctx.closePath();ctx.fill();
    ctx.fillStyle="#cbd5d8";ctx.beginPath();ctx.moveTo(-11,-70);ctx.lineTo(0,-64);ctx.lineTo(11,-70);ctx.lineTo(14,-63);ctx.lineTo(7,-58);ctx.lineTo(-7,-58);ctx.lineTo(-14,-63);ctx.closePath();ctx.fill();
    ctx.strokeStyle="rgba(255,255,255,.35)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,-63);ctx.lineTo(0,-31);ctx.stroke();
    // shoulder and arm joints
    const arm=(side,sw)=>{
      const shoulderX=side*13,shoulderY=-65,elbowX=shoulderX+sw*7,elbowY=-47,handX=elbowX+sw*5,handY=-31;
      limb(shoulderX,shoulderY,side*3,elbowX,elbowY,side*4,4.2,"#1b2d42","#0c1929");
      limb(elbowX,elbowY,side*4,handX,handY,side*5,3.7,"#1b2d42","#0c1929");
      ctx.fillStyle="#b77f61";ctx.beginPath();ctx.arc(handX,handY,3.4,0,Math.PI*2);ctx.fill();
      // cyan sleeve cuff
      ctx.strokeStyle="#0aa5cb";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(handX-sw*1.5,handY-4);ctx.lineTo(handX+sw*1.5,handY+2);ctx.stroke();
    };
    arm(-1,armSwing);arm(1,-armSwing);
    // grey utility bag on hip, visible in rear and arrival views
    ctx.fillStyle="#4d5b68";ctx.beginPath();ctx.roundRect(8,-42,12,14,3);ctx.fill();
    ctx.fillStyle="#b9c3c8";ctx.fillRect(10,-39,7,3);
    // neck and head volume
    ctx.fillStyle="#a97055";ctx.fillRect(-3,-77,6,9);
    const face=ctx.createRadialGradient(-3,-86,2,0,-84,10);face.addColorStop(0,"#e0b08d");face.addColorStop(1,"#9b624b");
    ctx.fillStyle=face;ctx.beginPath();ctx.ellipse(0,-86,8,10,0,0,Math.PI*2);ctx.fill();
    if(rear){
      ctx.fillStyle="#3b2925";ctx.beginPath();ctx.arc(0,-88,8,Math.PI,Math.PI*2);ctx.fill();
    }else{
      ctx.fillStyle="#27313b";ctx.strokeStyle="#1a2734";ctx.lineWidth=1.2;
      ctx.beginPath();ctx.roundRect(-7,-88,6,4,1.5);ctx.roundRect(1,-88,6,4,1.5);ctx.stroke();
    }
    // grey cap with MANBILL UP3 label
    ctx.fillStyle="#858e96";ctx.beginPath();ctx.ellipse(0,-95,9,5,0,Math.PI,Math.PI*2);ctx.fill();
    ctx.fillStyle="#626d78";ctx.beginPath();ctx.ellipse(2,-93,12,2.5,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#f2f4f5";ctx.font="bold 2.7px Arial";ctx.textAlign="center";ctx.fillText("MANBILL",0,-95);ctx.fillText("UP3",0,-91);
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
  async function loadWorkerWalkFrames(){
    const base=new URL("../assets/worker-walk/",document.currentScript?.src||location.href);
    const frames=await Promise.all(Array.from({length:8},(_,i)=>new Promise(resolve=>{
      const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>resolve(null);
      img.src=new URL(`worker-${i}.png`,base).href;
    })));
    return frames.filter(Boolean);
  }
  function drawAnimatedWorker(ctx,x,y,dirX,phase,walking,frames){
    if(!frames?.length)return;
    const idx=walking?Math.floor(((phase%1)+1)%1*frames.length)%frames.length:frames.length-1;
    const img=frames[idx];if(!img)return;
    // Feet anchor exactly to the projected GPS point. The sprite is side/three-quarter view,
    // and flips with east/west direction instead of staring directly into the camera.
    const h=150,w=h*(img.width/img.height),flip=dirX<0?-1:1;
    ctx.save();ctx.translate(x,y);ctx.scale(flip,1);
    ctx.drawImage(img,-w/2,-h,w,h);
    ctx.restore();
  }

  async function loadJourneyEnvironment(lat,lon,dayKey){
    const out={weather:"Cuaca tidak tersedia",temp:null,cloud:null,prayer:[]};
    if(!Number.isFinite(lat)||!Number.isFinite(lon))return out;
    const date=dayKey||new Date().toISOString().slice(0,10);
    try{
      const u=`https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${date}&end_date=${date}&hourly=temperature_2m,weather_code,cloud_cover&timezone=Asia%2FJakarta`;
      const r=await fetch(u);if(r.ok){const j=await r.json(),hours=j.hourly?.time||[];
        const idx=Math.max(0,Math.min(hours.length-1,12));
        out.temp=j.hourly?.temperature_2m?.[idx]??null;out.cloud=j.hourly?.cloud_cover?.[idx]??null;
        const code=Number(j.hourly?.weather_code?.[idx]);
        out.weather=code===0?"Cerah":code<=3?"Berawan":code<=48?"Berkabut":code<=67?"Hujan":code<=77?"Salju":code<=82?"Hujan lokal":code<=99?"Badai petir":"Cuaca";
      }
    }catch(e){/* offline: keep graceful label */}
    try{
      const [y,m,d]=date.split("-").map(Number);
      const u=`https://api.aladhan.com/v1/timings/${d}-${m}-${y}?latitude=${lat}&longitude=${lon}&method=20&school=0`;
      const r=await fetch(u);if(r.ok){const j=await r.json(),t=j.data?.timings||{};
        ["Dhuhr","Asr"].forEach(k=>{const raw=String(t[k]||"").slice(0,5),parts=raw.split(":").map(Number);if(parts.length===2&&parts.every(Number.isFinite))out.prayer.push({name:k==="Dhuhr"?"Dhuhur":"Asar",minute:parts[0]*60+parts[1]});});
      }
    }catch(e){/* prayer scene disabled if times unavailable */}
    return out;
  }
  function detectPrayerStops(sessions,prayerTimes){
    const stops=[];
    for(const session of sessions){
      const pts=session.points||[];let start=null,anchor=null,last=null;
      for(const p of pts){
        if(!start){start=p.time;anchor=p;last=p;continue;}
        const dist=distanceMeters(anchor,p),elapsed=p.time-start;
        if(dist<=20&&elapsed>=300000){stops.push({start,end:p.time,lat:p.lat,lon:p.lon});}
        if(dist>20){start=p.time;anchor=p;}
        last=p;
      }
    }
    return stops.filter(s=>prayerTimes.some(pr=>{
      const t=new Date(s.start).getHours()*60+new Date(s.start).getMinutes();
      return Math.abs(t-pr.minute)<=90&&((s.end-s.start)>=300000);
    }));
  }
  function drawSunArc(ctx,x,y,w,virtualTime){
    const d=new Date(virtualTime),minute=d.getHours()*60+d.getMinutes();
    const daylight=(minute-360)/(18*60-360),p=clamp(daylight,0,1);
    const cx=x+w/2,base=y+36,rx=w*.43,ry=26;
    ctx.save();ctx.strokeStyle="rgba(255,224,145,.65)";ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(cx,base,rx,ry,Math.PI,Math.PI,Math.PI*2);ctx.stroke();
    const angle=Math.PI+(1-p)*Math.PI,sx=cx+Math.cos(angle)*rx,sy=base+Math.sin(angle)*ry;
    const g=ctx.createRadialGradient(sx,sy,1,sx,sy,12);g.addColorStop(0,"#fff6b2");g.addColorStop(1,"rgba(255,177,45,0)");
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(sx,sy,12,0,Math.PI*2);ctx.fill();ctx.fillStyle="#ffd35b";ctx.beginPath();ctx.arc(sx,sy,5,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  function drawPrayerPose(ctx,x,y,scale=1){
    ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
    ctx.fillStyle="rgba(4,14,28,.9)";ctx.beginPath();ctx.ellipse(0,0,22,7,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle="#162d45";ctx.lineWidth=9;ctx.lineCap="round";
    ctx.beginPath();ctx.moveTo(-5,-8);ctx.lineTo(-17,-2);ctx.lineTo(-24,-2);ctx.stroke();
    ctx.beginPath();ctx.moveTo(5,-8);ctx.lineTo(16,-2);ctx.lineTo(23,-2);ctx.stroke();
    ctx.fillStyle="#159fc4";ctx.beginPath();ctx.roundRect(-11,-34,22,25,7);ctx.fill();
    ctx.fillStyle="#b98568";ctx.beginPath();ctx.arc(0,-42,8,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#858e96";ctx.beginPath();ctx.ellipse(0,-49,9,4,0,Math.PI,Math.PI*2);ctx.fill();
    ctx.restore();
  }
  function distanceMeters(a,b){
    const R=6371000,rad=v=>v*Math.PI/180,dLat=rad(b.lat-a.lat),dLon=rad(b.lon-a.lon);
    const q=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLon/2)**2;
    return 2*R*Math.atan2(Math.sqrt(q),Math.sqrt(1-q));
  }
  function timestamp(p){const t=new Date(p?.at||p?.timestamp||"").getTime();return Number.isFinite(t)?t:null;}

  function drawClosingScreen(ctx,assets,progress,stats){
    const {mapShot,segments,pins,workerFrames,travelled,durationText,dateText}=assets;
    const {positive,pending,target,percent}=stats;
    const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,"#06172c");bg.addColorStop(.58,"#092b4d");bg.addColorStop(1,"#031426");
    ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
    // Neon frame and premium header
    ctx.save();ctx.shadowColor="#078cff";ctx.shadowBlur=18;ctx.strokeStyle="#168be8";ctx.lineWidth=2;
    ctx.beginPath();ctx.roundRect(12,12,W-24,H-24,28);ctx.stroke();ctx.restore();
    ctx.fillStyle="#f4f9ff";ctx.font="bold 34px Arial";ctx.textAlign="left";ctx.fillText("📍 OYONID MAP",28,58);
    ctx.fillStyle="#5fc5ff";ctx.font="bold 15px Arial";ctx.fillText("WIDE JOURNEY  •  REALISASI",31,83);
    ctx.fillStyle="rgba(20,65,105,.8)";ctx.beginPath();ctx.roundRect(W-174,30,145,36,18);ctx.fill();ctx.fillStyle="#eaf6ff";ctx.font="bold 13px Arial";ctx.textAlign="center";ctx.fillText(dateText,W-101,53);
    // Left satellite route board, framed; all GPS sessions remain disconnected.
    const mx=24,my=112,mw=432,mh=672;
    ctx.save();ctx.shadowColor="rgba(0,137,255,.4)";ctx.shadowBlur=16;
    ctx.fillStyle="#0b2138";ctx.beginPath();ctx.roundRect(mx,my,mw,mh,20);ctx.fill();ctx.restore();
    ctx.save();ctx.beginPath();ctx.roundRect(mx+5,my+5,mw-10,mh-10,16);ctx.clip();
    const mfit=Math.min((mw-10)/mapShot.width,(mh-10)/mapShot.height),dw=mapShot.width*mfit,dh=mapShot.height*mfit;
    const dx=mx+(mw-dw)/2,dy=my+(mh-dh)/2;
    ctx.drawImage(mapShot,dx,dy,dw,dh);
    const project=p=>({x:dx+p.x*mfit,y:dy+p.y*mfit});
    // Full recorded route, with no synthetic connector between GPS sessions.
    ctx.lineCap="round";ctx.lineJoin="round";ctx.strokeStyle="#12a8ff";ctx.lineWidth=5;ctx.shadowColor="#087dff";ctx.shadowBlur=11;
    segments.forEach(seg=>{if(!seg.length)return;ctx.beginPath();seg.forEach((p,i)=>{const q=project(p);if(i===0)ctx.moveTo(q.x,q.y);else ctx.lineTo(q.x,q.y);});ctx.stroke();});
    ctx.shadowBlur=0;
    // Numbered green customer pins. Draw all pins, not just the ones revealed during playback.
    pins.forEach((p,i)=>{const q=project(p);ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(q.x,q.y,9,0,Math.PI*2);ctx.fill();ctx.fillStyle="#0aa85a";ctx.beginPath();ctx.arc(q.x,q.y,7,0,Math.PI*2);ctx.fill();ctx.fillStyle="#fff";ctx.font="bold 7px Arial";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(String(i+1),q.x,q.y);});
    const first=segments.find(s=>s.length)?.[0],last=[...segments].reverse().find(s=>s.length)?.slice(-1)[0];
    if(first){const q=project(first);ctx.fillStyle="#00d879";ctx.beginPath();ctx.arc(q.x,q.y,12,0,Math.PI*2);ctx.fill();ctx.fillStyle="#fff";ctx.font="bold 9px Arial";ctx.textAlign="center";ctx.fillText("M",q.x,q.y+3);}
    if(last){const q=project(last);ctx.fillStyle="#ef4444";ctx.beginPath();ctx.arc(q.x,q.y,12,0,Math.PI*2);ctx.fill();ctx.fillStyle="#fff";ctx.font="bold 9px Arial";ctx.textAlign="center";ctx.fillText("S",q.x,q.y+3);}
    ctx.restore();
    // Large full-body field technician on the right, distinct from the small route-following actor.
    const hero=workerFrames?.[4]||workerFrames?.[7]||workerFrames?.[0];
    if(hero){
      const heroH=535,heroW=heroH*hero.width/hero.height,hx=390,hy=790;
      ctx.save();ctx.shadowColor="rgba(0,150,255,.6)";ctx.shadowBlur=28;
      const glow=ctx.createRadialGradient(hx+heroW*.5,hy-heroH*.42,8,hx+heroW*.5,hy-heroH*.42,heroH*.62);
      glow.addColorStop(0,"rgba(10,135,255,.28)");glow.addColorStop(1,"rgba(10,135,255,0)");
      ctx.fillStyle=glow;ctx.fillRect(455,110,260,680);
      ctx.drawImage(hero,hx,hy-heroH,heroW,heroH);ctx.restore();
    }else{
      drawWorker(ctx,590,770,1,0,false,"ARRIVAL");
    }
    // Bottom recap dashboard: exact requested order and dynamic values.
    const bx=22,by=810,bw=W-44,bh=446;
    const panel=ctx.createLinearGradient(bx,by,bx,by+bh);panel.addColorStop(0,"rgba(7,38,68,.98)");panel.addColorStop(1,"rgba(2,18,35,.99)");
    ctx.fillStyle=panel;ctx.beginPath();ctx.roundRect(bx,by,bw,bh,24);ctx.fill();
    ctx.strokeStyle="#168fe8";ctx.lineWidth=2;ctx.shadowColor="#078cff";ctx.shadowBlur=16;ctx.stroke();ctx.shadowBlur=0;
    ctx.fillStyle="#dff3ff";ctx.font="bold 25px Arial";ctx.textAlign="left";ctx.fillText("▣  REALISASI PEKERJAAN",42,855);
    ctx.fillStyle="#00c879";ctx.beginPath();ctx.roundRect(W-210,826,168,43,22);ctx.fill();
    ctx.fillStyle="#fff";ctx.font="bold 22px Arial";ctx.textAlign="center";ctx.fillText(pending===0?"✓ SELESAI":"◷ REKAP",W-126,855);
    // Main metrics grid
    ctx.strokeStyle="rgba(112,190,240,.35)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(40,974);ctx.lineTo(W-40,974);ctx.moveTo(W/2,880);ctx.lineTo(W/2,965);ctx.moveTo(W/2,990);ctx.lineTo(W/2,1080);ctx.stroke();
    const metric=(x,y,big,label,align="left")=>{ctx.textAlign=align;ctx.fillStyle="#fff";ctx.font="bold 42px Arial";ctx.fillText(big,x,y);ctx.fillStyle="#d6e8f8";ctx.font="18px Arial";ctx.fillText(label,x,y+25);};
    metric(48,925,`${positive}/${target}`,"Pelanggan selesai");
    metric(390,925,`${percent.toFixed(1).replace(".",",")}%`,"Persentase realisasi");
    metric(48,1040,`${(travelled/1000).toFixed(2).replace(".",",")} km`,"Total perjalanan");
    metric(390,1040,durationText,"Durasi pekerjaan");
    ctx.fillStyle="#fff";ctx.font="bold 21px Arial";ctx.textAlign="center";ctx.fillText("RINGKASAN HASIL",W/2,1115);
    const cards=[{x:38,w:200,color:"#087b55",big:String(positive),label:"Positif",stroke:"#21d99a"},
      {x:260,w:200,color:"#80500b",big:String(pending),label:"Belum selesai",stroke:"#ffb52e"},
      {x:482,w:200,color:"#07558c",big:String(target),label:"Total target",stroke:"#159cff"}];
    cards.forEach(c=>{ctx.fillStyle=c.color;ctx.beginPath();ctx.roundRect(c.x,1135,c.w,94,16);ctx.fill();ctx.strokeStyle=c.stroke;ctx.lineWidth=1.5;ctx.stroke();ctx.fillStyle="#fff";ctx.font="bold 38px Arial";ctx.textAlign="center";ctx.fillText(c.big,c.x+c.w/2,1177);ctx.font="bold 16px Arial";ctx.fillText(c.label,c.x+c.w/2,1208);});
    // Animated count-up/reveal is driven by closing progress.
    ctx.fillStyle="rgba(255,255,255,.72)";ctx.font="11px Arial";ctx.textAlign="center";ctx.fillText("OYONID MAP  •  WIDE JOURNEY  •  REALISASI",W/2,1244);
    ctx.fillStyle="rgba(255,255,255,.12)";ctx.beginPath();ctx.roundRect(22,1262,W-44,4,2);ctx.fill();
    ctx.fillStyle="#16b981";ctx.beginPath();ctx.roundRect(22,1262,(W-44)*clamp(progress,0,1),4,2);ctx.fill();
    ctx.globalAlpha=1;
  }
  window.downloadRouteVideo=async function downloadRouteVideoV27(){
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
      let mapShot,segments,pins,satelliteLayer=null;
      try{
        map.invalidateSize({animate:false});
        map.fitBounds(L.latLngBounds(allBounds).pad(.20),{animate:false,maxZoom:16});
        // Cinematic export prefers satellite imagery; if unavailable, the existing OSM map remains underneath.
        try{
          satelliteLayer=L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",{
            maxZoom:19,attribution:"Tiles © Esri",crossOrigin:true
          }).addTo(map);
          const loaded=await Promise.race([
            new Promise(resolve=>satelliteLayer.once("load",()=>resolve(true))),
            new Promise(resolve=>setTimeout(()=>resolve(false),2200))
          ]);
          if(!loaded){map.removeLayer(satelliteLayer);satelliteLayer=null;}
        }catch(e){if(satelliteLayer&&map.hasLayer(satelliteLayer))map.removeLayer(satelliteLayer);satelliteLayer=null;}
        await new Promise(r=>setTimeout(r,350));
        const captureScale=2;
        mapShot=await html2canvas(map.getContainer(),{backgroundColor:"#e9e5dd",useCORS:true,allowTaint:false,scale:captureScale,logging:false});
        segments=sessions.map(s=>s.points.map(p=>{const q=map.latLngToContainerPoint([p.lat,p.lon]);return {...p,x:q.x*captureScale,y:q.y*captureScale};}));
        pins=customers.map(c=>{const lat=parseCoordinate(c.item.actualLat),lon=parseCoordinate(c.item.actualLon);if(!Number.isFinite(lat)||!Number.isFinite(lon))return null;
          const q=map.latLngToContainerPoint([lat,lon]);return {...c,x:q.x*captureScale,y:q.y*captureScale};}).filter(Boolean);
      }finally{
        if(satelliteLayer&&map.hasLayer(satelliteLayer))map.removeLayer(satelliteLayer);
        map.setView(oldCenter,oldZoom,{animate:false});removed.forEach(l=>l.addTo(map));
        if(controls)controls.style.visibility=oldVisibility||"";
        document.getElementById("locationPhotoBtn")?.style.setProperty("visibility","");
        map.invalidateSize({animate:false});
      }
      const canvas=document.createElement("canvas");canvas.width=W;canvas.height=H;
      const ctx=canvas.getContext("2d",{alpha:false});
      // Keep immutable coordinates for the dedicated final full-route closing map.
      const closingSegments=segments.map(seg=>seg.map(p=>({...p})));
      const closingPins=pins.map(p=>({...p}));
      const fit=Math.min(W/mapShot.width,H/mapShot.height),mapW=mapShot.width*fit,mapH=mapShot.height*fit;
      const ox=(W-mapW)/2,oy=(H-mapH)/2;
      const toScreen=p=>({x:p.x*fit+ox,y:p.y*fit+oy});
      segments=segments.map(seg=>seg.map(p=>({...p,...toScreen(p)})));
      pins=pins.map(p=>({...p,...toScreen(p)}));
      const photoMetas=v13PlaybackPhotoMetadata().filter(p=>p.dayKey===v13SelectedDate());
      const photoAssets=[];for(const meta of photoMetas){const a=await loadPhoto(meta);if(a)photoAssets.push(a);}
      const workerFrames=await loadWorkerWalkFrames();
      photoUrls=photoAssets.map(p=>p.url);
      const durationMs=Math.max(15000,Math.min(300000,Number(document.getElementById("quickVideoDuration")?.value||30)*1000));
      const allTimes=[...segments.flatMap(s=>s.map(p=>p.time)),...pins.map(p=>p.at)].filter(Number.isFinite);
      const minTime=Math.min(...allTimes),maxTime=Math.max(...allTimes);
      if(!(maxTime>minTime))throw new Error("Rentang waktu GPS dan realisasi terlalu pendek untuk membuat video.");
      const firstGps=sessions.flatMap(s=>s.points).sort((a,b)=>a.time-b.time)[0];
      const environment=await loadJourneyEnvironment(firstGps?.lat,firstGps?.lon,v13SelectedDate());
      const prayerStops=detectPrayerStops(sessions,environment.prayer);
      const fps=24;stream=canvas.captureStream(fps);
      const candidates=["video/mp4;codecs=avc1.42E01E","video/mp4","video/webm;codecs=vp9","video/webm"];
      const mime=candidates.find(t=>MediaRecorder.isTypeSupported?.(t))||"";
      const recorder=new MediaRecorder(stream,mime?{mimeType:mime,videoBitsPerSecond:9000000}:{videoBitsPerSecond:9000000});
      const chunks=[];const finished=new Promise((resolve,reject)=>{recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};recorder.onstop=()=>resolve(new Blob(chunks,{type:recorder.mimeType||"video/webm"}));recorder.onerror=e=>reject(e.error||new Error("Perekaman video gagal."));});
      recorder.start(250);

      const durationSeconds=durationMs/1000;
      const closingDurationMs=6500;
      // Cinematic local-area camera: short local overview, close follow, 45-degree oblique,
      // arrival close-up, then a dedicated full-route closing screen.
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
        const dt=Math.max(1,(b.time-a.time)/1000),speed=distanceMeters(a,b)/dt;
        return {...a,x:lerp(a.x,b.x,e),y:lerp(a.y,b.y,e),time:t,segmentIndex:chosenSeg,dirX:b.x-a.x,dirY:b.y-a.y,speed};
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
      const formatOriginalElapsed=ms=>{
        const total=Math.max(0,Math.floor(ms/1000));
        const hh=String(Math.floor(total/3600)).padStart(2,"0");
        const mm=String(Math.floor((total%3600)/60)).padStart(2,"0");
        const ss=String(total%60).padStart(2,"0");
        return `${hh}:${mm}:${ss}`;
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
        const targetZoom=phase==="AREA"?2.35:phase==="FOLLOW"?3.35:phase==="OBLIQUE"?2.85:3.65;
        const targetAngle=phase==="OBLIQUE"?-.785:phase==="ARRIVAL"?-.22:0;
        const targetSquash=phase==="OBLIQUE"?.86:phase==="ARRIVAL"?.94:1;
        const desiredX=activePoint?.x??W/2,desiredY=(activePoint?.y??H/2)-((H*.17)/(targetZoom*targetSquash));
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
          drawAnimatedWorker(ctx,projected.x,projected.y,facing,walkPhase,walking,workerFrames);
        }
        // Premium compact HUD: brand, selected date, progress, distance and original elapsed time.
        const hx=18,hy=16,hw=W-36,hh=112;
        const hg=ctx.createLinearGradient(hx,hy,hx,hy+hh);hg.addColorStop(0,"rgba(10,39,68,.97)");hg.addColorStop(1,"rgba(5,20,39,.96)");
        ctx.fillStyle=hg;ctx.beginPath();ctx.roundRect(hx,hy,hw,hh,18);ctx.fill();
        ctx.strokeStyle="rgba(125,190,235,.35)";ctx.lineWidth=1.5;ctx.stroke();
        ctx.fillStyle="#ff9b35";ctx.beginPath();ctx.arc(hx+23,hy+25,8,0,Math.PI*2);ctx.fill();
        ctx.fillStyle="#fff";ctx.font="bold 18px Arial";ctx.textAlign="left";ctx.fillText("OYONID MAP",hx+40,hy+29);
        ctx.fillStyle="#9fc8e8";ctx.font="bold 11px Arial";ctx.fillText("WIDE JOURNEY • REALISASI",hx+40,hy+45);
        const rawDate=String(v13SelectedDate()||"");
        const dateText=rawDate.replace(/^(\d{4})-(\d{2})-(\d{2})$/,"$3/$2/$1");
        ctx.fillStyle="rgba(255,255,255,.12)";ctx.beginPath();ctx.roundRect(W-170,hy+12,132,28,14);ctx.fill();
        ctx.fillStyle="#e7f2ff";ctx.font="bold 12px Arial";ctx.textAlign="center";ctx.fillText(dateText,W-104,hy+30);
        ctx.textAlign="left";
        const statsY=hy+78;
        ctx.fillStyle="#5be39b";ctx.font="bold 16px Arial";ctx.fillText(`✓ ${reached}/${pins.length} selesai`,hx+16,statsY);
        ctx.fillStyle="#fff";ctx.font="bold 15px Arial";ctx.fillText(`${(travelled/1000).toFixed(2).replace(".",",")} km`,hx+220,statsY);
        ctx.fillStyle="#dce8f5";ctx.font="bold 14px Arial";ctx.fillText(`◷ ${formatOriginalElapsed(virtualTime-minTime)}`,hx+365,statsY);
        ctx.fillStyle="#a9c6df";ctx.font="bold 10px Arial";ctx.textAlign="right";ctx.fillText(phaseLabel,W-34,hy+48);ctx.textAlign="left";
        // Environmental cinematic overlays: solar arc and local weather.
        drawSunArc(ctx,W-166,132,130,virtualTime);
        ctx.fillStyle="rgba(7,25,44,.88)";ctx.beginPath();ctx.roundRect(W-190,174,172,42,10);ctx.fill();
        ctx.fillStyle="#fff";ctx.font="bold 11px Arial";ctx.textAlign="left";
        ctx.fillText(`${environment.weather} • ${environment.temp==null?"--":Math.round(environment.temp)+"°C"}`,W-180,190);
        ctx.fillStyle="#b9d5eb";ctx.font="10px Arial";ctx.fillText(`Awan ${environment.cloud==null?"--":Math.round(environment.cloud)+"%"}`,W-180,205);
        // Corner technician animation follows GPS speed, independently from the map marker.
        const cornerX=W-62,cornerY=H-102;
        const speed=worker?.speed||0,cornerPhase=((virtualTime-minTime)/1000*(speed>.7?2.2:speed>.15?1.1:.25))%1;
        const prayerStop=prayerStops.find(s=>virtualTime>=s.start&&virtualTime<=s.end);
        if(prayerStop){drawPrayerPose(ctx,cornerX,cornerY,.9);ctx.fillStyle="rgba(5,20,39,.9)";ctx.beginPath();ctx.roundRect(W-174,H-160,156,25,8);ctx.fill();ctx.fillStyle="#fff";ctx.font="bold 11px Arial";ctx.fillText("Waktu istirahat Dhuhur/Asar",W-166,H-143);}
        else if(workerFrames?.length){drawAnimatedWorker(ctx,cornerX,cornerY,worker?.dirX||1,cornerPhase,true,workerFrames);}
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
      const allCompletedForDay=(typeof v131AllCompletedRecords==="function"?v131AllCompletedRecords():[])
        .filter(x=>x.dayKey===v13SelectedDate());
      const positiveCount=allCompletedForDay.length;
      const totalTarget=Math.max(positiveCount,
        (Array.isArray(originalRows)?originalRows.length:0),
        positiveCount+(Array.isArray(workingRows)?workingRows.length:0));
      const pendingCount=Math.max(0,totalTarget-positiveCount);
      const completionPercent=totalTarget?positiveCount/totalTarget*100:0;
      const originalDurationText=formatOriginalElapsed(maxTime-minTime);
      const dateLabel=String(v13SelectedDate()||"").replace(/^(\d{4})-(\d{2})-(\d{2})$/,"$3/$2/$1");
      const closingAssets={mapShot,segments:closingSegments,pins:closingPins,workerFrames,travelled:distanceAtTime(maxTime),durationText:originalDurationText,dateText:dateLabel};
      const animate=now=>{
        const elapsed=now-started;
        if(elapsed<durationMs){draw(now);requestAnimationFrame(animate);return;}
        const closingProgress=clamp((elapsed-durationMs)/closingDurationMs,0,1);
        // Count-up metrics and staged reveal are synchronized with the closing hold.
        const reveal=smooth(clamp(closingProgress/.72,0,1));
        const stats={positive:Math.round(positiveCount*reveal),pending:Math.round(pendingCount*reveal),target:Math.round(totalTarget*reveal),percent:completionPercent*reveal};
        drawClosingScreen(ctx,closingAssets,closingProgress,stats);
        if(elapsed>=durationMs+closingDurationMs){recorder.stop();return;}
        requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
      const blob=await finished;stream.getTracks().forEach(t=>t.stop());stream=null;
      photoUrls.forEach(u=>URL.revokeObjectURL(u));photoUrls=[];
      if(!blob.size)throw new Error("Video kosong. Coba ulangi.");
      const url=URL.createObjectURL(blob),a=document.createElement("a"),ext=blob.type.includes("mp4")?"mp4":"webm";
      a.href=url;a.download=`OYONID_WIDE_JOURNEY_${v13SelectedDate()}_${Math.round(durationSeconds)}detik.${ext}`;
      document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
      showToast(`Wide Journey berhasil dibuat • ${Math.round(durationSeconds)} detik • ${reached}/${pins.length} pelanggan ditampilkan.`);
    }catch(err){console.error("[OYONID] Wide Journey V13.1.28 failed",err);showToast("Video gagal dibuat: "+(err?.message||"coba ulangi"));}
    finally{if(stream)stream.getTracks().forEach(t=>t.stop());photoUrls.forEach(u=>URL.revokeObjectURL(u));if(button){button.disabled=false;button.textContent="⬇ Buat Ulang Video";}}
  };
  console.info("[OYONID] Final Closing Screen V13.1.28 loaded.");
})();
