/* Durva unified app. Uses existing cookie auth and APIs; no secrets in browser. */
const $=id=>document.getElementById(id),U=window.DurvaUI,C=window.DurvaConsult;
const dayIST=()=>new Date(Date.now()+19800000).toISOString().slice(0,10);
const S={user:null,page:"today",day:dayIST(),search:"",busy:false,profile:null,overview:null,followups:[],patients:[],favorites:[],entry:null,visit:null,reg:{},voice:{status:"idle",consent:false},audio:null,audioMime:null,audioJob:"idle",rec:null,notes:{},meds:[],showVitals:false,followDays:null,followDate:"",followNotes:"",report:null};
let audioChunks=[],searchTimer=null,recordLimit=null;
function toast(msg){const el=$("toast");el.textContent=String(msg||"Done");el.style.display="block";clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.style.display="none",5500);}
async function api(path,method="GET",body,headers={}){
 const opt={method,credentials:"same-origin",cache:"no-store",headers:{"X-Clinic-Request":"1",...headers}};
 if(body!==undefined){
  if(body instanceof Blob){opt.body=body;opt.headers["Content-Type"]=body.type||"audio/mp4";}else{opt.body=JSON.stringify(body);opt.headers["Content-Type"]="application/json";}
 }
 const r=await fetch(path,opt);const response=await r.json().catch(()=>({error:"Invalid server response"}));
 if(!r.ok)throw Error(response.error||"Request failed");
 return response;
}
async function task(fn){
 if(S.busy)return;S.busy=true;
 try{await fn();}catch(e){toast(e?.message||"Could not complete this action");console.error("Durva action failed",e?.name||"Error");}finally{S.busy=false;}
}
function safeRender(){const el=$("app");if(!S.user){el.innerHTML=U.login();return;}
 if(S.register){el.innerHTML=U.register(S);return;}
 if(S.entry){el.innerHTML=C.view(S);return;}
 const r={today:U.today,patients:U.search,queue:U.queue,followups:U.followups,more:U.more,reports:U.reports};
 el.innerHTML=(r[S.page]||r.today)(S);
}
async function reloadOverview(){S.overview=await api("/api/opd/overview?date="+encodeURIComponent(S.day));}
async function loadPatients(){S.patients=(await api("/api/opd/patients?q="+encodeURIComponent(S.search))).patients;}
async function loadFollowups(){S.followups=(await api("/api/opd/followups")).followups;}
async function loadFavorites(){S.favorites=(await api("/api/opd/favorites")).favorites;}
async function goto(page){
 if(S.rec?.state==="recording"){toast("Stop recording before changing screens.");return;}
 S.page=page;S.entry=null;S.visit=null;S.register=false;
 if(page==="today"||page==="queue")await reloadOverview();
 if(page==="today"||page==="followups")await loadFollowups();
 if(page==="patients")await loadPatients();
 if(page==="more"){S.profile=(await api("/api/opd/profile")).profile;await loadFavorites();}
 if(page==="reports"){S.report=await api("/api/opd/reports?from="+S.day+"&to="+S.day);}
 safeRender();window.scrollTo(0,0);
}
async function init(){
 try{
  const me=await api("/api/me");S.user=me.user;
  S.profile=(await api("/api/opd/profile")).profile;
  await loadFavorites();await loadFollowups();
  const u=new URL(location.href),patientId=u.searchParams.get("patient"),entryId=u.searchParams.get("entry");
  if(entryId&&/^[a-f0-9-]{36}$/.test(entryId))await openEntry(entryId);
  else if(patientId&&/^[a-f0-9-]{36}$/.test(patientId))await newEncounter(patientId);
  else await goto("today");
 }catch(e){S.user=null;safeRender();}
}
function captureReg(){const form=document.querySelector("form[data-form=patient]");if(form)S.reg={...S.reg,...Object.fromEntries(new FormData(form))};}
function captureConsult(){
 const form=$("noteForm");if(form){S.noteDraft={...S.noteDraft,...Object.fromEntries(new FormData(form))};}
 const rows=[...document.querySelectorAll("[data-medrow]")];if(rows.length){
  S.meds=rows.map(x=>Object.fromEntries([...x.querySelectorAll("[data-med]")].map(t=>[t.dataset.med,t.value])));
 }
 const fd=document.querySelector('input[name="followDate"]'),fn=document.querySelector('input[name="followNotes"]');
 if(fd)S.followDate=fd.value;if(fn)S.followNotes=fn.value;
}
function newRegister(){S.reg={};S.voice={status:"idle",consent:false};S.register=true;S.entry=null;safeRender();}
function acceptStream({channel,duration}){
 return (async()=>{
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw Error("Microphone recording requires Safari/Chrome over HTTPS.");
  const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});
  const type=["audio/mp4","audio/webm;codecs=opus","audio/webm"].find(t=>MediaRecorder.isTypeSupported(t));
  if(!type){stream.getTracks().forEach(x=>x.stop());throw Error("Unsupported audio format on this phone.");}
  const rec=new MediaRecorder(stream,{mimeType:type,audioBitsPerSecond:48000});audioChunks=[];S.rec=rec;
  rec.ondataavailable=e=>{if(e.data.size)audioChunks.push(e.data);};
  rec.onstop=()=>{
   clearTimeout(recordLimit);stream.getTracks().forEach(x=>x.stop());
   const blob=new Blob(audioChunks,{type:type.split(";")[0]});S.rec=null;
   if(channel==="voice"){S.voice.audio=blob;S.voice.status="captured";}else{S.audio=blob;S.audioMime=blob.type;}
   safeRender();toast("Recording captured. Continue to transcription.");
  };
  rec.onerror=()=>toast("A recording error occurred. Try again.");
  rec.start(2500);
  recordLimit=setTimeout(()=>{if(rec.state==="recording")rec.stop();},duration);
  return rec;
 })();
}
async function startVoice(){
 captureReg();
 const ok=$("voice-consent")?.checked;if(!ok)throw Error("Confirm patient consent before recording.");
 S.voice.consent=true;await acceptStream({channel:"voice",duration:75000});S.voice.status="recording";safeRender();
}
function stopRecording(){if(S.rec?.state==="recording")S.rec.stop();}
async function sendVoice(){
 captureReg();if(!S.voice.audio||!S.voice.consent)throw Error("Recording and consent are required.");
 S.voice.status="processing";safeRender();
 try{
  const data=await api("/api/patients/voice","POST",S.voice.audio,{"X-Voice-Consent":"confirmed"});
  S.voice.job=data.job;S.voice.ticket=data.ticket;await pollVoice();
 }catch(e){S.voice.status="captured";safeRender();throw e;}
}
async function pollVoice(){
 if(!S.voice.job||!S.voice.ticket)throw Error("No transcription pending.");
 for(let i=0;i<45;i++){
  const d=await api("/api/patients/voice/status?job="+encodeURIComponent(S.voice.job)+"&ticket="+encodeURIComponent(S.voice.ticket));
  if(d.state==="completed"){
   S.reg={...S.reg,...Object.fromEntries(Object.entries(d.fields||{}).filter(([k,val])=>Boolean(val)))};
   S.voice.status="review";S.voice.uncertainties=d.uncertainties;S.voice.audio=null;
   safeRender();toast("Voice fields filled. Check details before saving.");return;
  }
  if(d.state==="failed")throw Error("Transcription failed. You may record again.");
  await new Promise(r=>setTimeout(r,4500));
 }
 toast("Still processing; tap Check to resume.");
}
async function savePatient(form){
 const vals=Object.fromEntries(new FormData(form));if(!vals.verified)throw Error("Please verify the patient details first.");
 if(!String(vals.name||"").trim()||String(vals.name).trim().length<2)throw Error("Enter patient's full name.");
 const duplicates=await api("/api/opd/patients?q="+encodeURIComponent(vals.phone||vals.name));
 if(duplicates.patients.some(p=>(vals.phone&&p.phone===vals.phone)||(p.name.toLowerCase()===vals.name.trim().toLowerCase()))){
  if(!confirm("Possible duplicate patient found. Continue creating a new record?"))return;
 }
 const data=await api("/api/patients","POST",vals);S.register=false;S.voice={status:"idle"};S.reg={};
 toast("Patient registered.");await newEncounter(data.id);
}
async function newEncounter(patientId){
 if(S.rec?.state==="recording")throw Error("Stop recording first.");
 const r=await api("/api/opd/entries","POST",{patientId,reason:"General consultation"});
 S.entry=r.entry;
 const t=await api("/api/opd/entries/"+S.entry.id+"/status","POST",{status:"in_consultation"});
 S.entry=t.entry;await loadVisit();S.page="consult";safeRender();window.scrollTo(0,0);
}
async function openEntry(id){
 let d=await api("/api/opd/entries/"+id);S.entry=d.entry;
 if(S.entry.status==="scheduled"||S.entry.status==="waiting"){
  if(confirm("Start consultation for "+S.entry.patient.name+"?")){
   if(S.entry.status==="scheduled"){d=await api("/api/opd/entries/"+id+"/status","POST",{status:"waiting"});S.entry=d.entry;}
   d=await api("/api/opd/entries/"+id+"/status","POST",{status:"in_consultation"});S.entry=d.entry;
  }
 }
 await loadVisit();S.page="consult";safeRender();window.scrollTo(0,0);
}
async function loadVisit(){
 S.meds=S.entry.prescription?.medicines?.map(x=>({...x}))||[];
 S.noteDraft={};S.followDate=S.entry.followup?.dueDate||"";S.followNotes=S.entry.followup?.notes||"";
 S.visit=S.entry.visitId?(await api("/api/visit/"+S.entry.visitId)).visit:null;
}
async function refreshEntry(){if(!S.entry)return;const d=await api("/api/opd/entries/"+S.entry.id);S.entry=d.entry;if(S.entry.visitId)S.visit=(await api("/api/visit/"+S.entry.visitId)).visit;safeRender();}
async function startAudio(){
 if(!S.visit){toast("Start the consultation before recording.");return;}
 if(S.visit.status==="approved")throw Error("Approved notes cannot be recorded again.");
 if(!S.visit.consentAt){
  if(!$("consult-consent")?.checked)throw Error("Confirm recording consent before starting.");
  const d=await api("/api/visit/"+S.visit.id+"/consent","POST",{consent:true});S.visit=d.visit;
 }
 await acceptStream({channel:"consult",duration:360000});safeRender();
}
async function sendAudio(){
 if(!S.audio||!S.visit)throw Error("Record a consultation first.");
 captureConsult();S.audioJob="processing";safeRender();
 try{
  const d=await api("/api/visit/"+S.visit.id+"/transcribe","POST",S.audio);
  S.visit=d.visit;await pollAudio();
 }catch(e){S.audioJob="idle";safeRender();throw e;}
}
async function pollAudio(){
 if(!S.visit)throw Error("No consultation found.");
 S.audioJob="processing";safeRender();
 for(let i=0;i<70;i++){
  const x=await api("/api/visit/"+S.visit.id+"/status");
  if(x.state==="completed"){S.visit=x.visit;S.audio=null;S.audioJob="idle";S.noteDraft={};safeRender();toast("AI note is ready. Doctor must review.");return;}
  if(x.state==="failed"){S.audioJob="idle";safeRender();throw Error("Transcription failed.");}
  if(x.state==="idle"){S.audioJob="idle";safeRender();throw Error("No active transcription job.");}
  await new Promise(r=>setTimeout(r,4500));
 }
 toast("Still processing. Check AI status again.");
}
async function saveNote(){
 if(!S.visit||S.visit.status==="approved")return;
 captureConsult();
 const n={...S.visit.note,...S.noteDraft};
 const r=await api("/api/visit/"+S.visit.id,"PATCH",{note:n,version:S.visit.version});
 S.visit=r.visit;S.noteDraft={};toast("Clinical note saved.");safeRender();
}
async function approveNote(){
 if(!S.visit||S.visit.status==="approved")return;
 captureConsult();if(!confirm("Have you reviewed the AI draft and every clinical detail? Approve and lock this note?"))return;
 const n={...S.visit.note,...S.noteDraft};
 const r=await api("/api/visit/"+S.visit.id,"PATCH",{note:n,version:S.visit.version});S.visit=r.visit;S.noteDraft={};
 const z=await api("/api/visit/"+S.visit.id+"/approve","POST",{reviewed:true,version:S.visit.version});S.visit=z.visit;safeRender();toast("Doctor-reviewed note locked.");
}
async function saveVitals(form){
 const o=Object.fromEntries(new FormData(form));await api("/api/opd/entries/"+S.entry.id+"/assessment","PUT",o);
 await refreshEntry();toast("Measured vitals saved.");
}
function collectMed(){
 captureConsult();const q=Object.fromEntries([...document.querySelectorAll('input[name="investigations"],input[name="advice"]')].map(x=>[x.name,x.value]));
 return {diagnosis:document.querySelector('textarea[name="assessment"]')?.value||S.visit?.note?.assessment||"",investigations:q.investigations||S.entry.prescription?.investigations||"",advice:q.advice||S.entry.prescription?.advice||"",medicines:S.meds.filter(x=>String(x.name||"").trim())};
}
async function saveRx({quiet=false}={}){
 if(S.entry.prescription?.signedAt)throw Error("This prescription is already signed.");
 const o=collectMed(),r=await api("/api/opd/entries/"+S.entry.id+"/prescription","PUT",o);
 S.entry.prescription=r.prescription;S.meds=r.prescription.medicines.map(x=>({...x}));
 if(!quiet){safeRender();toast("Prescription draft saved.");}
}
async function signRx(){
 if(!$("rx-verified")?.checked)throw Error("Review and tick the clinician verification checkbox.");
 if(!confirm("Sign this reviewed prescription and lock it? This cannot be undone."))return;
 await saveRx({quiet:true});
 const r=await api("/api/opd/entries/"+S.entry.id+"/prescription/sign","POST",{reviewed:true});
 S.entry=r.entry;safeRender();toast("Prescription signed. Print to provide to patient.");
}
async function createBill(){
 if(S.entry.bill)throw Error("Bill already created.");
 const fee=String(S.profile?.consultationFee||"300");
 const r=await api("/api/opd/entries/"+S.entry.id+"/bill","POST",{items:[{description:"Consultation fee",quantity:1,price:fee}]});
 S.entry=r.entry;safeRender();toast("Consultation bill created.");
}
async function recordPayment(form){
 const v=Object.fromEntries(new FormData(form));const d=await api("/api/opd/entries/"+S.entry.id+"/payment","POST",v);S.entry=d.entry;safeRender();toast("Payment recorded.");
}
function chooseDays(days){
 S.followDays=days;const d=new Date(Date.now()+19800000+days*86400000);S.followDate=d.toISOString().slice(0,10);captureConsult();safeRender();
}
async function saveFollow(){
 captureConsult();if(!S.followDate)throw Error("Choose the follow-up date.");
 const d=await api("/api/opd/entries/"+S.entry.id+"/followup","POST",{dueDate:S.followDate,notes:S.followNotes});
 S.entry=d.entry;safeRender();toast("Follow-up scheduled.");
}
async function complete(){
 if(!S.entry)return;
 captureConsult();
 if(S.visit?.status!=="approved"&&!S.entry.prescription?.signedAt)throw Error("Approve the reviewed note or sign a clinician-authored prescription before completing.");
 if(S.entry.prescription&&!S.entry.prescription.signedAt)throw Error("A prescription draft exists. Review and sign it before completing.");
 if(!confirm("Mark this visit complete? The bill will be created at your clinic’s default consultation fee if none exists."))return;
 if(!S.entry.bill)await createBill();
 const d=await api("/api/opd/entries/"+S.entry.id+"/status","POST",{status:"completed"});S.entry=d.entry;toast("Visit completed. Print receipt and prescription when ready.");safeRender();
}
async function favoriteModal(){
 const med=confirm("Add a medicine favorite? Select Cancel for a phrase.");
 let body;
 if(med)body='<form data-form="favorite"><input type="hidden" name="kind" value="medicine"><div class="fields">'+U.F("Shortcut label","label","",{required:true})+U.F("Medicine name","name","",{required:true})+U.F("Strength","strength")+U.F("Route","route")+U.F("Frequency","frequency")+U.F("Duration","duration")+U.F("Instructions","instructions","",{wide:true})+'</div><button type="submit" class="btn primary full" style="margin-top:20px">Save medicine favorite</button></form>';
 else body='<form data-form="favorite"><input type="hidden" name="kind" value="phrase"><div class="fields">'+U.F("Shortcut name","label","",{required:true})+
 '<div class="field"><label>Section</label><select name="section"><option value="chiefComplaint">Chief complaint</option><option value="assessment">Assessment</option><option value="plan">Plan</option><option value="advice">Advice</option></select></div>'+U.F("Clinician-authored text","content","",{textarea:true,wide:true})+'</div><button type="submit" class="btn primary full" style="margin-top:20px">Save phrase</button></form>';
 const el=document.createElement("div");el.id="favorite-modal";el.className="modal-layer";el.innerHTML='<div class="modal"><div class="row between"><h2>Add a shortcut</h2><button class="btn outline small" data-act="closeModal">✕ Close</button></div><p class="sub">Saved only for your account. No AI prescribing.</p>'+body+'</div>';document.body.appendChild(el);
}
async function formAction(form){
 const kind=form.dataset.form,values=Object.fromEntries(new FormData(form));
 if(kind==="login"){await api("/api/login","POST",values);await init();}
 else if(kind==="patient"){captureReg();await savePatient(form);}
 else if(kind==="note")await saveNote();
 else if(kind==="vitals")await saveVitals(form);
 else if(kind==="payment")await recordPayment(form);
 else if(kind==="profile"){S.profile=(await api("/api/opd/profile","PUT",values)).profile;safeRender();toast("Clinic settings saved.");}
 else if(kind==="report"){S.report=await api("/api/opd/reports?from="+encodeURIComponent(values.from)+"&to="+encodeURIComponent(values.to));safeRender();}
 else if(kind==="favorite"){await api("/api/opd/favorites","POST",values);$("favorite-modal")?.remove();await loadFavorites();safeRender();toast("Favorite saved.");}
}
async function action(el){
 const key=el.dataset.act,id=el.dataset.id;
 const pages=["today","patients","queue","followups","more","reports"];
 if(key==="nav"){await goto(el.dataset.page);return;}
 if(pages.includes(key)){await goto(key);return;}
 if(key==="find"){await goto("patients");return;}
 if(key==="register"){newRegister();return;}
 if(key==="openEntry"){await openEntry(id);return;}
 if(key==="newEncounter"){await newEncounter(id);return;}
 if(key==="logout"){await api("/api/logout","POST",{});S.user=null;S.entry=null;safeRender();return;}
 if(key==="startVoice"){await startVoice();return;}
 if(key==="stopVoice"||key==="stopAudio"){stopRecording();return;}
 if(key==="submitVoice"){await sendVoice();return;}
 if(key==="checkVoice"){await pollVoice();return;}
 if(key==="startAudio"){await startAudio();return;}
 if(key==="sendAudio"){await sendAudio();return;}
 if(key==="pollAudio"){await pollAudio();return;}
 if(key==="toggleVitals"){captureConsult();S.showVitals=!S.showVitals;safeRender();return;}
 if(key==="approveNote"){await approveNote();return;}
 if(key==="addMed"){captureConsult();S.meds.push({name:"",strength:"",route:"",frequency:"",duration:"",instructions:""});safeRender();return;}
 if(key==="removeMed"){captureConsult();S.meds.splice(Number(el.dataset.index),1);safeRender();return;}
 if(key==="useFav"){captureConsult();const x=S.favorites.find(f=>f.id===id);if(x?.kind==="medicine"){S.meds.push({name:x.name,strength:x.strength,route:x.route,frequency:x.frequency,duration:x.duration,instructions:x.instructions});safeRender();}return;}
 if(key==="saveRx"){await saveRx();return;}
 if(key==="signRx"){await signRx();return;}
 if(key==="createBill"){await createBill();return;}
 if(key==="followDays"){chooseDays(Number(el.dataset.days));return;}
 if(key==="saveFollow"){await saveFollow();return;}
 if(key==="complete"){await complete();return;}
 if(key==="doneFollow"){if(confirm("Mark follow-up completed?")){await api("/api/opd/followups/"+id+"/done","POST",{});await loadFollowups();safeRender();}return;}
 if(key==="addFav"){favoriteModal();return;}
 if(key==="closeModal"){$("favorite-modal")?.remove();return;}
 if(key==="deleteFav"){if(confirm("Remove this shortcut?")){await api("/api/opd/favorites/"+id,"DELETE");await loadFavorites();safeRender();}return;}
 if(key==="advanced"){location.assign("/clinic");return;}
}
document.addEventListener("submit",event=>{const form=event.target.closest("form[data-form]");if(!form)return;event.preventDefault();task(()=>formAction(form));});
document.addEventListener("click",event=>{const el=event.target.closest("[data-act]");if(!el||el.disabled)return;event.preventDefault();task(()=>action(el));});
document.addEventListener("input",event=>{if(event.target.id==="search-input"){S.search=event.target.value;clearTimeout(searchTimer);searchTimer=setTimeout(async()=>{try{await loadPatients();const r=$("patient-results");if(r)r.innerHTML=U.results(S);}catch(e){toast(e.message)}},220);}});
document.addEventListener("change",event=>{if(event.target.id==="day-picker"){S.day=event.target.value;task(()=>goto("queue"));}});
init();
