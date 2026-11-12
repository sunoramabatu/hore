/* OYONID MAP - Local Backup & Restore V1
   Export/import app localStorage + IndexedDB (including customer photo blobs).
   No server upload. */
(function(){
"use strict";
const DB_NAMES=["OYONID_LOCAL_FIRST_DB","oyon_route_photo_db_v1"];
const PREFIX="OYONID_BACKUP_V1";
const $=id=>document.getElementById(id);
function bytesToB64(buf){let s="";const a=new Uint8Array(buf);for(let i=0;i<a.length;i+=0x8000)s+=String.fromCharCode(...a.subarray(i,i+0x8000));return btoa(s);}
function b64ToBytes(s){const bin=atob(s),a=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);return a.buffer;}
async function pack(v){
 if(v instanceof Blob){return {$oyonType:"Blob",type:v.type,data:bytesToB64(await v.arrayBuffer())};}
 if(v instanceof ArrayBuffer)return {$oyonType:"ArrayBuffer",data:bytesToB64(v)};
 if(ArrayBuffer.isView(v))return {$oyonType:"TypedArray",name:v.constructor.name,data:bytesToB64(v.buffer.slice(v.byteOffset,v.byteOffset+v.byteLength))};
 if(Array.isArray(v))return Promise.all(v.map(pack));
 if(v&&typeof v==="object"){const o={};for(const k of Object.keys(v))o[k]=await pack(v[k]);return o;}
 return v;
}
function unpack(v){
 if(Array.isArray(v))return v.map(unpack);
 if(v&&typeof v==="object"){
  if(v.$oyonType==="Blob")return new Blob([b64ToBytes(v.data)],{type:v.type||""});
  if(v.$oyonType==="ArrayBuffer")return b64ToBytes(v.data);
  if(v.$oyonType==="TypedArray"){const b=b64ToBytes(v.data),C=window[v.name];return typeof C==="function"?new C(b):b;}
  const o={};for(const k of Object.keys(v))o[k]=unpack(v[k]);return o;
 }return v;
}
function dbExists(name){
 return new Promise(async(resolve)=>{
  try{
   if(typeof indexedDB.databases==="function"){
    const all=await indexedDB.databases();resolve(all.some(x=>x.name===name));return;
   }
  }catch(e){}
  // Older browsers: a non-destructive probe. If DB is absent, the temporary DB is removed.
  let created=false;
  const req=indexedDB.open(name);
  req.onupgradeneeded=()=>{created=true;};
  req.onsuccess=()=>{const db=req.result;db.close();if(created){try{indexedDB.deleteDatabase(name);}catch(e){}resolve(false);}else resolve(true);};
  req.onerror=()=>resolve(false);
 });
}
function openDB(name,version){
 return new Promise((resolve,reject)=>{
  const r=version?indexedDB.open(name,version):indexedDB.open(name);
  r.onsuccess=()=>resolve(r.result);
  r.onerror=()=>reject(r.error);
  r.onblocked=()=>reject(new Error("Database masih dibuka tab lain. Tutup tab OYONID lain lalu coba lagi."));
 });
}
function storeSchema(st){
 return {name:st.name,keyPath:st.keyPath,autoIncrement:st.autoIncrement,indexes:Array.from(st.indexNames).map(n=>{
  const ix=st.index(n);return {name:ix.name,keyPath:ix.keyPath,unique:ix.unique,multiEntry:ix.multiEntry};
 })};
}
async function exportDB(name){
 if(!(await dbExists(name)))return {name,missing:true,stores:[]};
 const db=await openDB(name);
 const stores=[];
 for(const sn of Array.from(db.objectStoreNames)){
  const rows=await new Promise((resolve,reject)=>{
   const tx=db.transaction(sn,"readonly"),st=tx.objectStore(sn),kr=st.getAllKeys(),vr=st.getAll();
   tx.oncomplete=async()=>{try{const out=[];for(let i=0;i<vr.result.length;i++)out.push({key:await pack(kr.result[i]),value:await pack(vr.result[i])});resolve(out);}catch(e){reject(e);}};
   tx.onerror=()=>reject(tx.error);
  });
  const tx=db.transaction(sn,"readonly");
  stores.push({...storeSchema(tx.objectStore(sn)),rows});
 }
 const version=db.version;db.close();return {name,version,stores};
}
function createStoreFromSpec(db,storeSpec){
 const opts={};
 if(storeSpec.keyPath!==undefined&&storeSpec.keyPath!==null)opts.keyPath=storeSpec.keyPath;
 if(storeSpec.autoIncrement)opts.autoIncrement=true;
 const st=db.createObjectStore(storeSpec.name,opts);
 for(const ix of (storeSpec.indexes||[]))st.createIndex(ix.name,ix.keyPath,{unique:!!ix.unique,multiEntry:!!ix.multiEntry});
}
async function restoreDB(spec){
 if(spec.missing)return;
 const exists=await dbExists(spec.name);
 let db;
 if(!exists){
  db=await new Promise((resolve,reject)=>{
   const r=indexedDB.open(spec.name,Math.max(1,Number(spec.version)||1));
   r.onupgradeneeded=()=>{
    const d=r.result;
    for(const ss of spec.stores||[])if(!d.objectStoreNames.contains(ss.name))createStoreFromSpec(d,ss);
   };
   r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
  });
 }else{
  let current=await openDB(spec.name);const missing=(spec.stores||[]).filter(ss=>!current.objectStoreNames.contains(ss.name));
  if(missing.length){
   const next=current.version+1;current.close();
   db=await new Promise((resolve,reject)=>{
    const r=indexedDB.open(spec.name,next);
    r.onupgradeneeded=()=>{const d=r.result;for(const ss of missing)createStoreFromSpec(d,ss);};
    r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
   });
  }else db=current;
 }
 try{
  for(const storeSpec of spec.stores||[]){
   if(!db.objectStoreNames.contains(storeSpec.name))throw new Error("Object store tidak dikenal: "+storeSpec.name);
   await new Promise((resolve,reject)=>{
    const tx=db.transaction(storeSpec.name,"readwrite"),st=tx.objectStore(storeSpec.name);st.clear();
    for(const row of storeSpec.rows||[]){const key=unpack(row.key),val=unpack(row.value);if(st.keyPath===null)st.put(val,key);else st.put(val);}
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error("Restore dibatalkan"));
   });
  }
 }finally{db.close();}
}
function isAppKey(k){return /^(OYON|oyon|oyon_|oyonid|RBM_)/i.test(k)||k==="history"||k==="history_date";}
async function restoreBackup(file){
 const parsed=JSON.parse(await file.text());
 if(!parsed||parsed.format!==PREFIX||!Array.isArray(parsed.databases)||!parsed.localStorage)throw new Error("File bukan backup OYONID yang valid.");
 const info=parsed.databases.reduce((a,d)=>a+(d.stores||[]).reduce((n,s)=>n+s.rows.length,0),0);
 if(!confirm("Pulihkan backup tanggal "+parsed.createdAt+"?\n"+info+" record database akan dipulihkan.\nData OYONID yang sekarang akan diganti. Sebelum restore, browser akan mengunduh backup pengaman otomatis."))return;
 const safety=await makeBackup();download(safety,"OYONID_BACKUP_SEBELUM_RESTORE_"+new Date().toISOString().slice(0,10)+".json");
 // Restore snapshot localStorage exactly for this OYONID app origin.
 localStorage.clear();
 for(const [k,v] of Object.entries(parsed.localStorage))localStorage.setItem(k,v);
 for(const d of parsed.databases)await restoreDB(d);
 alert("Restore selesai. Halaman akan dimuat ulang agar seluruh data terbaca.");
 location.reload();
}
function init(){
 const anchor=$("downloadBtn");if(!anchor||$("oyonBackupBtn"))return;
 const btn=document.createElement("button");btn.id="oyonBackupBtn";btn.className="ui-btn small-btn";btn.type="button";btn.textContent="🛡️ Backup & Restore";
 btn.style.marginTop="6px";anchor.insertAdjacentElement("afterend",btn);
 const input=document.createElement("input");input.type="file";input.accept=".json,application/json";input.hidden=true;document.body.appendChild(input);
 btn.addEventListener("click",()=>{
  const choice=prompt("BACKUP & RESTORE OYONID\n\nKetik 1 untuk BACKUP (simpan seluruh data lokal)\nKetik 2 untuk RESTORE (pulihkan dari file backup)");
  if(choice==="1"){btn.disabled=true;btn.textContent="⏳ Membuat backup...";makeBackup().then(data=>{download(data,"OYONID_BACKUP_"+new Date().toISOString().replace(/[:.]/g,"-")+".json");alert("Backup berhasil dibuat. Simpan file JSON ini di tempat aman.");}).catch(e=>alert("Backup gagal: "+e.message)).finally(()=>{btn.disabled=false;btn.textContent="🛡️ Backup & Restore";});}
  else if(choice==="2")input.click();
 });
 input.addEventListener("change",()=>{if(input.files&&input.files[0])restoreBackup(input.files[0]).catch(e=>alert("Restore gagal: "+e.message));input.value="";});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();