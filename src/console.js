"use strict";
/* Durva Console — no PHI in browser storage, and no inline JavaScript handlers. */
const app=document.getElementById("app"),toastEl=document.getElementById("toast");
const ICON={
 home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-8h6v8"/>',
 users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
 settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a2 2 0 0 1 .4 2.3l-.9 1.6a2 2 0 0 1-2.2.9l-1.2-.3a8 8 0 0 1-2 .9l-.4 1.2h-2l-.4-1.2a8 8 0 0 1-2-.9l-1.2.3a2 2 0 0 1-2.2-.9l-.9-1.6A2 2 0 0 1 4.6 15l.9-.9a8 8 0 0 1 0-2.2l-.9-.9a2 2 0 0 1-.4-2.3l.9-1.6a2 2 0 0 1 2.2-.9l1.2.3a8 8 0 0 1 2-.9l.4-1.2h2l.4 1.2a8 8 0 0 1 2 .9l1.2-.3a2 2 0 0 1 2.2.9l.9 1.6a2 2 0 0 1-.4 2.3l-.9.9a8 8 0 0 1 0 2.2z"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',mic:'<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8"/>',
 arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',search:'<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>',
 check:'<path d="m4 12 5 5L20 6"/>',back:'<path d="M19 12H5m6 6-6-6 6-6"/>',
 bolt:'<path d="M13 2 4 13h7l-1 9 10-12h-7z"/>',heart:'<path d="M20.8 5.7a5.5 5.5 0 0 0-7.8 0L12 6.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-8.5a5.5 5.5 0 0 0 0-7.8z"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',print:'<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/>'
};
const icon=(name,size=18)=>'<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(ICON[name]||ICON.file)+'</svg>';
const svgEmpty='<svg class="empty-icon" viewBox="0 0 100 100" fill="none" aria-hidden="true"><path d="M21 71V31a6 6 0 0 1 6-6h24l11 11h12a6 6 0 0 1 6 6v29a6 6 0 0 1-6 6H27a6 6 0 0 1-6-6Z" stroke="#b9aeb5" stroke-width="1.25"/><path d="M51 25v11h11M38 55h24M50 43v24" stroke="#a47c91" stroke-width="1.2"/><path d="M14 84h72" stroke="#dfd5db" stroke-width="1"/><path d="M73 17v9M68 21h9" stroke="#d8c5ce" stroke-width="1.3"/></svg>';
const FIELDS=["chiefComplaint","historyOfPresentIllness","pastHistory","examination","assessment","plan","medications","followUp","uncertainties"];
const emptyNote=()=>Object.fromEntries(FIELDS.map(k=>[k,""]));
const emptyAss=()=>({systolic:"",diastolic:"",pulse:"",tempC:"",spo2:"",weightKg:"",heightCm:"",glucoseMgDl:"",respRate:"",complaint:"",onset:"",history:"",pastHistory:"",familyHistory:"",allergies:"",examination:"",assessment:"",investigations:"",plan:""});
const emptyMed=()=>({name:"",strength:"",route:"",frequency:"",duration:"",instructions:""});
const freshRx=()=>({diagnosis:"",advice:"",investigations:"",medicines:[]});
const dateIST=()=>new Date(Date.now()+19800000).toISOString().slice(0,10);
const S={auth:false,user:null,page:"today",overlay:null,ready:false,profile:null,overview:null,patients:[],followups:[],reports:null,entry:null,visit:null,history:[],patient:null,favorites:{medicines:[],complaints:[]},draft:null,pd:{name:"",age:"",phone:"",sex:"",address:"",allergies:""},consent:false,recording:null,audio:null,audioMime:null,recordKind:null,voiceJob:null,voiceTicket:null,voiceTranscript:"",voiceUncertain:"",busy:false,loadedAt:0,search:"",searchDelay:null,lastVoiceError:"",catalog:[],voiceOrders:null,showClinical:false,existingPatient:null};
function E(t){return String(t??"").replace(/[&<>"']/g,k=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[k]));}
const money=p=>"₹"+(Number(p||0)/100).toLocaleString("en-IN",{minimumFractionDigits:0,maximumFractionDigits:2});
const dateLabel=d=>new Date(d+"T00:00:00+05:30").toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
const dayLabel=()=>new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"});
function shortName(name){return String(name||"").split(/\s+/)[0]||"Doctor";}
function toast(message){toastEl.textContent=String(message);toastEl.style.display="block";clearTimeout(toast.timer);toast.timer=setTimeout(()=>toastEl.style.display="none",6000);}
async function api(path,method="GET",body,headers={}){
 const init={method,credentials:"same-origin",cache:"no-store",headers:{"X-Clinic-Request":"1","Accept":"application/json",...headers}};
 if(body!==undefined){if(body instanceof Blob){init.body=body;init.headers["Content-Type"]=body.type||"audio/mp4";}else{init.body=JSON.stringify(body);init.headers["Content-Type"]="application/json";}}
 const r=await fetch(path,init);let data;try{data=await r.json();}catch{throw Error("The server returned an unexpected response.");}
 if(!r.ok)throw Error(data.error||("Request failed ("+r.status+")"));
 return data;
}
async function job(fn){if(S.busy)return;S.busy=true;try{await fn();}catch(e){toast(e?.message||"Could not complete action.");}finally{S.busy=false;const current=document.getElementById("app");if(current)current.classList.remove("is-busy");}}
function btn(text,action,cls="",attr=""){return '<button type="button" class="btn '+cls+'" data-action="'+action+'" '+attr+'>'+text+'</button>';}
function field(label,key,value,placeholder="",type="text",attr=""){
 return '<div class="field"><label>'+E(label)+'</label><input type="'+type+'" data-field="'+E(key)+'" value="'+E(value??"")+'" placeholder="'+E(placeholder)+'" '+attr+'></div>';
}
function area(label,key,value,placeholder=""){return '<div class="field"><label>'+E(label)+'</label><textarea rows="3" data-field="'+E(key)+'" placeholder="'+E(placeholder)+'">'+E(value||"")+'</textarea></div>';}
function status(x){return '<span class="status '+E(x||"")+'">'+E((x||"waiting").replaceAll("_"," "))+'</span>';}
function patientAvatar(p){return '<span class="pat-avatar">'+E(String(p?.name||"P").slice(0,1).toUpperCase())+'</span>';}
function navItems(){return [["today","home","Today"],["patients","users","Patients"],["followups","clock","Follow-ups"],["more","settings","More"]];}

function waitingCount(){return (S.overview?.entries||[]).filter(x=>x.status==="waiting").length;}
function waitingBadge(){
 const count=waitingCount();
 return '<button type="button" id="waiting-live" class="waiting-live '+(count?"has-waiting":"is-clear")+'" data-action="show-queue" aria-live="polite" aria-label="'+count+' patients waiting; show queue"><span class="waiting-led" aria-hidden="true"></span><span class="waiting-label">'+(count?count+' waiting':"Queue clear")+'</span></button>';
}
let queueRefreshInFlight=false;
async function refreshQueue({notify=true}={}){
 if(!S.auth||document.visibilityState==="hidden"||queueRefreshInFlight||S.busy||S.recording?.state==="recording")return;
 queueRefreshInFlight=true;
 try{
  const result=await api("/api/opd/overview?date="+dateIST());
  const before=waitingCount();
  S.overview=result;
  const after=waitingCount();
  const badge=document.getElementById("waiting-live");
  if(badge){const temp=document.createElement("span");temp.innerHTML=waitingBadge();badge.replaceWith(temp.firstElementChild);}
  if(S.page==="today"&&!S.overlay&&!S.entry&&!document.activeElement?.matches("input,textarea,select,[contenteditable]"))render();
  if(notify&&after>before)toast(after-before===1?"A patient is waiting.":(after-before)+" more patients are waiting.");
 }catch{/* Last-known queue state remains visible during transient failures. */}
 finally{queueRefreshInFlight=false;}
}

function chrome(body){
 const nav=navItems();
 return '<div class="shell"><aside class="rail"><div class="brand"><span class="brand-symbol">✳</span><span><div class="brand-name">durva<span style="color:var(--garnet)">.</span></div><div class="brand-sub">CLINIC WORKSPACE</div></span></div><div class="rail-label">Your practice</div>'+
 nav.map(x=>'<button class="nav '+(S.page===x[0]?"active":"")+'" data-action="navigate" data-to="'+x[0]+'"><span class="nav-icon">'+icon(x[1],18)+'</span>'+x[2]+'</button>').join("")+
 '<div class="rail-rule"></div><button class="nav" data-action="start"><span class="nav-icon">'+icon("plus",18)+'</span>New consultation</button>'+
 '<div class="rail-bottom"><div class="doctor-pill"><span class="avatar">Dr</span><span class="doctor-meta"><strong>'+E(S.profile?.clinicianName||S.user?.email||"Your practice")+'</strong><small>Private clinic account</small></span></div></div></aside>'+
 '<div class="main"><div class="container"><div class="topline"><span class="topline-left"><span class="live-dot"></span> Practice workspace <span style="color:#d4d1d4">/</span> '+(S.entry?"Consultation":S.page==="today"?"Today":S.page==="more"?"Settings":S.page==="followups"?"Follow-ups":"Patients")+'</span>'+
 '<span class="mobile-brand"><span class="brand-symbol">✳</span>durva.</span><span class="topline-right">'+waitingBadge()+'<span class="date">'+E(dayLabel())+'</span>'+btn(icon("plus",17)+" New visit","start","white small")+'</span></div>'+body+'</div></div></div>'+
 '<nav class="bottom-nav" aria-label="Main navigation">'+nav.map(x=>'<button data-action="navigate" data-to="'+x[0]+'" class="'+(S.page===x[0]?"active":"")+'"><span>'+icon(x[1],19)+'</span>'+x[2]+'</button>').join("")+'</nav>';
}
function overlayHtml(){
 if(!S.overlay)return "";
 let body="";
 if(S.overlay==="picker"){
  const people=S.patients.filter(x=>!S.search||String(x.name||"").toLowerCase().includes(S.search.toLowerCase())||String(x.phone||"").includes(S.search)).slice(0,12);
  body='<div class="flex between"><div><h2>Who are you seeing?</h2><p>Find an existing patient or register a new one by voice.</p></div>'+btn("✕","close","white circle")+'</div>'+
  '<div class="searchbox"><input aria-label="Search patient" data-field="search" placeholder="Name or mobile number" value="'+E(S.search)+'" autofocus></div>'+
  '<div class="patient-list">'+people.map(p=>'<div class="patient-row">'+patientAvatar(p)+'<span class="info"><strong>'+E(p.name)+'</strong><small>'+E(p.age||"Age —")+' years · '+E(p.phone||"No mobile")+'</small></span>'+'<span class="quick-actions">'+btn("Add to queue","queue-patient","soft small",'data-id="'+E(p.id)+'"')+btn("Choose","choose-patient","white small",'data-id="'+E(p.id)+'"')+'</span>'+'</div>').join("")+
  (!people.length?'<div class="empty">'+svgEmpty+'<strong>No matching patients</strong>Try another name or register a new patient.</div>':"")+'</div>'+
  '<hr class="sep">'+btn(icon("mic",16)+" Register new patient","open-register","soft full");
 }
 if(S.overlay==="register"){
  const recording=S.recording?.state==="recording"&&S.recordKind==="registration",working=!!S.voiceJob;
  body='<div class="flex between"><div><h2>New patient</h2><p>Speak once. Check the details. Start the consultation.</p></div>'+btn("✕","close","white circle")+'</div>'+
   '<div class="recorder"><div class="flex between"><span class="flex"><span class="record-dot '+(recording?"active":"")+'"></span><span><span class="rec-title">'+(recording?"Listening…":working?"Processing voice…":"Voice registration")+'</span><span class="rec-sub">Gujarati, Hindi and English supported</span></span></span>'+
   (recording?btn("Stop","stop-record","white small"):working?btn("Check status","poll-register","white small"):btn(icon("mic",15)+" Speak details","start-registration","white small"))+'</div>'+
   '<label class="checkbox" style="margin-top:15px"><input type="checkbox" data-check="consent" '+(S.consent?"checked":"")+'>Patient agrees to recording and Sarvam AI processing of registration details.</label></div>'+
   (S.voiceUncertain?'<div class="note warn" style="margin-top:13px">Please verify: '+E(S.voiceUncertain)+'</div>':"")+
   '<div class="section-head"><h2>Patient details</h2><small>Review before creating</small></div><div class="form-grid">'+
   field("Full name *","pd.name",S.pd.name,"Patient name")+field("Age","pd.age",S.pd.age,"In years","number")+
   field("Mobile","pd.phone",S.pd.phone,"10-digit mobile","tel")+field("Sex","pd.sex",S.pd.sex,"Male / Female / Other")+
   field("Area / address","pd.address",S.pd.address,"Optional")+field("Allergies reported","pd.allergies",S.pd.allergies,"Optional")+'</div>'+
   (S.existingPatient?'<div class="note good"><strong>Existing patient found:</strong> '+E(S.existingPatient.name)+' · '+E(S.existingPatient.code)+'. Confirm identity before opening the visit.</div>':"")+
   (S.voiceTranscript?'<details class="details"><summary>View original transcription</summary><p class="small">'+E(S.voiceTranscript)+'</p></details>':"")+
   '<div class="dialog-footer">'+btn("Cancel","close","white")+btn(S.existingPatient?"Confirm patient & start":"Save patient & start","register-patient")+'</div>';
 }
 if(S.overlay==="review"){
  const d=S.draft,e=S.entry,meds=d?.rx?.medicines.filter(x=>x.name?.trim())||[],total=d?.charge||S.profile?.consultationFee||"300";
  body='<div class="flex between"><div><h2>Review this visit</h2><p>One final check before saving, signing and closing.</p></div>'+btn("✕","close","white circle")+'</div>'+
  '<div class="quick-summary"><dl><dt>Patient</dt><dd>'+E(e?.patient?.name||"")+'</dd><dt>Complaint</dt><dd>'+E(d?.note?.chiefComplaint||d?.ass?.complaint||"Not recorded")+'</dd><dt>Assessment</dt><dd>'+E(d?.note?.assessment||d?.ass?.assessment||"Not recorded")+'</dd><dt>Medicines</dt><dd>'+E(meds.length+" manually entered")+'</dd><dt>Consultation fee</dt><dd>₹'+E(total)+'</dd><dt>Follow-up</dt><dd>'+E(d?.followDays?d.followDays+" days":"Not scheduled")+'</dd></dl></div>'+
  (meds.length?'<div class="note warn" style="margin-top:12px"><strong>Medication review</strong><div style="margin-top:8px">'+meds.map(m=>E([m.name,m.strength,m.frequency,m.duration].filter(Boolean).join(" · "))).join("<hr class=\"sep\">")+'</div></div>':"")+
  '<label class="checkbox" style="margin-top:18px"><input type="checkbox" id="confirmDoctor">I am the treating clinician and have reviewed the clinical details, every medicine and instruction, and the bill. I authorize signing the prescription when present.</label>'+
  '<div class="dialog-footer">'+btn("Go back","close","white")+btn("Complete visit","finish-confirm","green")+'</div>'+
  '<p class="micro muted" style="margin:9px 0 0">If processing is interrupted, saved steps remain in the encounter. The system won’t duplicate an existing bill.</p>';
 }
 if(S.overlay==="catalog-add"){
  body='<div class="flex between"><div><h2>Add medicine to your clinic</h2><p>Only medicines actually held by the clinic should be available to prescribe.</p></div>'+btn("✕","close","white circle")+'</div>'+
  '<div class="form-grid">'+field("Medicine name *","catalog.name",S.catalogDraft?.name||"","Medicine/brand name")+
  field("Strength *","catalog.strength",S.catalogDraft?.strength||"","e.g. 500 mg")+
  field("Formulation *","catalog.form",S.catalogDraft?.form||"","Tablet / syrup / drops")+
  field("Route *","catalog.route",S.catalogDraft?.route||"","Oral / topical")+
  field("Spoken aliases","catalog.aliases",S.catalogDraft?.aliases||"","Comma-separated alternate names")+
  field("Available quantity (optional)","catalog.stock",S.catalogDraft?.stock??"","Leave blank if not tracked","number")+
  '</div><div class="dialog-footer">'+btn("Cancel","close","white")+btn("Save clinic medicine","save-catalog")+'</div>';
 }
 if(S.overlay==="catalog-picker"){
  const available=(S.catalog||[]).filter(x=>x.active!==false&&x.stock!==0);
  body='<div class="flex between"><div><h2>Clinic medicines</h2><p>Choose an available medicine; verify strength and enter spoken directions.</p></div>'+btn("✕","close","white circle")+'</div>'+
  (available.length?'<div class="patient-list">'+available.map(x=>'<div class="patient-row"><span class="icon-dot">'+icon("file",16)+'</span><span class="info"><strong>'+E(x.name)+' · '+E(x.strength)+'</strong><small>'+E(x.form)+' · '+E(x.route)+(x.stock!==null?' · '+E(x.stock)+' available':'')+'</small></span>'+btn("Select","select-catalog","white small",'data-id="'+E(x.id)+'"')+'</div>').join("")+'</div>':
  '<div class="empty">Add your actual clinic medicines under More first.</div>')+
  '<div class="dialog-footer">'+btn("Close","close","white")+btn("Add to catalog","new-catalog")+'</div>';
 }
 if(S.overlay==="favorite"){
  const m=S.favoriteDraft||emptyMed();
  body='<div class="flex between"><div><h2>Save medicine favorite</h2><p>Doctor-defined template only; never automatically prescribed.</p></div>'+btn("✕","close","white circle")+'</div>'+
  '<div class="form-grid">'+
  field("Medicine name","fav.name",m.name)+field("Strength","fav.strength",m.strength)+
  field("Route","fav.route",m.route)+field("Frequency","fav.frequency",m.frequency)+
  field("Duration","fav.duration",m.duration)+field("Instructions","fav.instructions",m.instructions)+'</div><div class="dialog-footer">'+btn("Cancel","close","white")+btn("Save favorite","save-favorite")+'</div>';
 }
 return '<div class="overlay" role="presentation" data-action="overlay-bg"><section class="dialog '+(S.overlay==="register"?"wide":"")+'" role="dialog" aria-modal="true" aria-label="'+E(S.overlay)+'">'+body+'</section></div>';
}
function login(){
 return '<div class="login"><div class="login-art"><div class="flex"><span class="brand-symbol">✳</span><span class="brand-name" style="color:white;margin-left:10px">durva.</span></div><div><div class="micro" style="letter-spacing:.16em;color:#c9b8c2;margin-bottom:20px">A QUIETER WAY TO CARE</div><h1>More time for<br>your patients.</h1><p>Your entire practice in one beautifully simple place. Clinical work, without the busywork.</p></div><div class="micro" style="color:#998d97">Designed for one focused doctor.</div></div>'+
 '<div class="login-form"><form id="loginForm" class="login-card"><div class="head-eyebrow">Durva Clinic</div><h2>Welcome back.</h2><p>Sign in to your private clinic workspace.</p>'+
 '<div class="field"><label>Email</label><input type="email" name="email" autocomplete="username" value="doctor@durvaclinic.local" required></div><div class="field"><label>Password</label><input type="password" name="password" autocomplete="current-password" required></div>'+
 '<button class="btn full" type="submit">Sign in to clinic '+icon("arrow",16)+'</button><p class="micro" style="margin-top:18px;text-align:center">Authorized clinical staff only</p></form></div></div>';
}
function today(){
 const o=S.overview||{entries:[],stats:{}},n=o.stats,waiting=o.entries.filter(x=>x.status==="waiting");
 const recent=[...o.entries].sort((a,b)=>{const priority=x=>x.status==="waiting"?0:x.status==="in_consultation"?1:x.status==="scheduled"?2:3;return priority(a)-priority(b);}).slice(0,7),followups=S.followups.slice(0,5);
 return '<div class="headline"><div><div class="head-eyebrow">Good '+(new Date().getHours()<12?"morning":new Date().getHours()<17?"afternoon":"evening")+'</div><h1>Ready for the next patient?</h1><p class="head-sub">Your entire practice, without the paperwork.</p></div></div>'+
 '<div class="hero"><section class="hero-main"><div><div class="tag">A quieter way to consult</div><h2>Care first. Notes handled.</h2><p>Find a patient, record the visit, review, and finish.</p></div><div class="hero-actions">'+btn(icon("plus",17)+" Start consultation","start","")+btn(icon("mic",17)+" Voice register","open-register","alt")+'</div></section>'+
 '<section class="hero-side"><div class="side-icon">'+icon("clock",22)+'</div><div><h3>'+(waiting.length?waiting.length+" patient"+(waiting.length===1?"":"s")+" waiting":"A little breathing room.")+'</h3><p>'+(waiting.length?"Your next consultations are ready below.":"There are no patients waiting right now.")+'</p>'+btn(waiting.length?"Open next patient":"Find a patient","open-next","white small")+'</div></section></div>'+
 '<div class="stats">'+[["Waiting",n.waiting||0,"Checked in"],["Consulting",n.active||0,"Currently with doctor"],["Completed",n.completed||0,"Visits finished"],["Collected",money(n.collectedPaise),"Payments received"]].map(x=>'<div class="metric"><label>'+x[0]+'</label><strong>'+x[1]+'</strong><small>'+x[2]+'</small></div>').join("")+'</div>'+
 '<div class="columns"><section class="panel" id="today-queue"><div class="panel-header"><div><h2>Today’s patients</h2><div class="caption">Walk-ins and appointments</div></div>'+btn("See all","navigate","white small",'data-to="patients"')+'</div>'+
 (recent.length?'<div class="queue-list">'+recent.map(q=>queueRow(q)).join("")+'</div>':'<div class="empty">'+svgEmpty+'<strong>Your clinic desk is clear.</strong>Register a patient or start a consultation to begin.</div>')+'</section>'+
 '<section class="panel"><div class="panel-header"><div><h2>Follow-ups</h2><div class="caption">Upcoming reviews</div></div>'+btn("View","navigate","white small",'data-to="followups"')+'</div>'+
 (followups.length?followups.map(f=>'<div class="follow-item"><div><div class="follow-name">'+E(f.patient.name)+'</div><div class="follow-date">'+E(f.dueDate)+' · '+E(f.patient.phone||"")+'</div></div>'+btn(icon("arrow",15),"open-entry","white circle",'data-id="'+E(f.entryId)+'"')+'</div>').join(""):'<div class="empty" style="padding:20px">No pending follow-ups.</div>')+
 '<hr class="sep"><div class="flex" style="gap:12px"><span class="icon-dot">'+icon("heart",17)+'</span><span class="caption">Keep care personal.<br>Let the console handle the admin.</span></div></section></div>';
}
function queueRow(q){
 return '<div class="queue-item"><span class="queue-no">'+E(q.queueNo)+'</span><div class="queue-identity"><strong>'+E(q.patient?.name||"Patient")+'</strong><small>'+E(q.patient?.age||"—")+' yrs · '+E(q.reason||"General consultation")+'</small></div>'+status(q.status)+btn(q.status==="in_consultation"?"Resume":"Open","open-entry","white small",'data-id="'+E(q.id)+'"')+'</div>';
}
function patients(){
 const search=S.search.toLowerCase().trim(),people=S.patients.filter(p=>!search||String(p.name||"").toLowerCase().includes(search)||String(p.phone||"").includes(search)||String(p.code||"").toLowerCase().includes(search)).slice(0,60);
 return '<div class="headline"><div><div class="head-eyebrow">Patient directory</div><h1>People, not paperwork.</h1><p class="head-sub">Find someone in seconds. Everything else follows.</p></div>'+btn(icon("mic",16)+" New patient","open-register","head-btn")+'</div>'+
 '<section class="panel"><div class="searchbox"><input data-field="search" value="'+E(S.search)+'" placeholder="Search by name, mobile or patient ID" aria-label="Search patient"></div>'+
 '<div class="patient-list">'+(people.length?people.map(p=>'<div class="patient-row">'+patientAvatar(p)+'<span class="info"><strong>'+E(p.name)+'</strong><small>'+E(p.code)+' · '+E(p.age||"—")+' yrs · '+E(p.phone||"No phone")+'</small></span>'+'<span class="quick-actions">'+btn("Add to queue","queue-patient","soft small",'data-id="'+E(p.id)+'"')+btn("Start visit","choose-patient","white small",'data-id="'+E(p.id)+'"')+'</span>'+'</div>').join(""):'<div class="empty">'+svgEmpty+'<strong>No patients found</strong>Try a different name or register a new patient.</div>')+'</div></section>';
}
function followups(){
 return '<div class="headline"><div><div class="head-eyebrow">Continuity of care</div><h1>Never lose the thread.</h1><p class="head-sub">Patients who are due for a review.</p></div></div>'+
 '<section class="panel"><div class="panel-header"><h2>Pending follow-ups</h2><span class="caption">'+S.followups.length+' pending</span></div>'+
 (S.followups.length?S.followups.map(f=>'<div class="patient-row">'+patientAvatar(f.patient)+'<span class="info"><strong>'+E(f.patient.name)+'</strong><small>'+E(f.dueDate)+' · '+E(f.notes||"Review visit")+'</small></span>'+btn("Open","open-entry","white small",'data-id="'+E(f.entryId)+'"')+btn(icon("check",16),"done-followup","soft circle",'data-id="'+E(f.id)+'"')+'</div>').join(""):'<div class="empty">'+svgEmpty+'<strong>All caught up.</strong>No pending follow-up visits.</div>')+'</section>';
}
function more(){
 const p=S.profile||{},fav=S.favorites||{medicines:[],complaints:[]},r=S.reports;
 return '<div class="headline"><div><div class="head-eyebrow">Your workspace</div><h1>Make Durva yours.</h1><p class="head-sub">Set your defaults once, then spend more time with patients.</p></div></div>'+
 '<div class="columns"><div><section class="panel"><div class="panel-header"><h2>Clinic identity</h2></div><div class="form-grid">'+
 field("Clinic name","profile.clinicName",p.clinicName)+field("Doctor’s name","profile.clinicianName",p.clinicianName)+field("Medical registration number","profile.registrationNumber",p.registrationNumber)+field("Clinic phone","profile.phone",p.phone)+
 field("Default visit fee (₹)","profile.consultationFee",p.consultationFee,"300")+field("Clinic address","profile.address",p.address)+
 '</div><div class="sticky-actions">'+btn("Save clinic details","save-profile")+'</div></section>'+
 '<section class="panel"><div class="panel-header"><h2>Medicines in your clinic</h2>'+btn(icon("plus",14)+" Add medicine","new-catalog","white small")+'</div><p class="caption">This is your clinic stock list. Only these available formulations can be selected or matched from speech.</p>'+
 ((S.catalog||[]).length?(S.catalog||[]).map(x=>'<div class="patient-row"><span class="icon-dot">'+icon("file",16)+'</span><span class="info"><strong>'+E(x.name)+' · '+E(x.strength)+'</strong><small>'+E(x.form)+' · '+E(x.route)+(x.stock!==null?' · '+E(x.stock)+' available':'')+'</small></span><span class="med-tag '+(x.active!==false?'verified':'caution')+'">'+(x.active!==false?'Active':'Inactive')+'</span>'+(x.active!==false?btn("Deactivate","disable-catalog","white small",'data-id="'+E(x.id)+'"'):"")+'</div>').join(""):'<div class="empty" style="padding:20px">No medicines in the clinic catalog yet. Add products actually stocked.</div>')+'</section></div>'+
 '<div><section class="panel"><div class="panel-header"><h2>Practice overview</h2></div>'+
 (r?'<div class="quick-summary"><dl><dt>Visits today</dt><dd>'+Object.values(r.visits||{}).reduce((a,b)=>a+Number(b),0)+'</dd><dt>Billed</dt><dd>'+money(r.billedPaise)+'</dd><dt>Payments</dt><dd>'+money(Object.values(r.payments||{}).reduce((a,b)=>a+Number(b),0))+'</dd></dl></div>':'<p class="caption">View your current-day OPD and receipts.</p>')+
 '<div class="sticky-actions">'+btn("Refresh overview","load-reports","white")+'</div></section>'+
 '<section class="panel"><h2>Account & privacy</h2><p class="caption">Always lock your phone when away from the clinic. Patient notes and recordings must remain private.</p>'+
 '<div class="stack" style="margin-top:14px">'+btn("Change password","open-password","white")+btn("Sign out","logout","white")+'</div></section></div></div>';
}
function rxMedicine(m,i){
 const timing=["morning","afternoon","evening","night","bedtime","as_needed"];
 const active=Array.isArray(m.timingTokens)?m.timingTokens:[];
 const meals=[["none","No meal timing"],["before_food","Before food"],["after_food","After food"],["with_food","With food"]];
 return '<div class="medicine catalog-prescription"><div class="medicine-top"><span class="medicine-title">'+E(m.name)+' · '+E(m.strength)+'</span>'+btn("Remove","remove-med","white small",'data-index="'+i+'"')+'</div>'+
 '<div class="catalog-status">'+(m.catalogId?'<span class="med-tag verified">✓ Clinic catalog</span>':'<span class="med-tag caution">Unmatched: remove & select from catalog</span>')+
 (m.reviewRequired?'<span class="med-tag caution">Voice draft · verify</span>':'')+'</div>'+
 '<div class="med-grid">'+field("Dose","med."+i+".dose",m.dose||"","Doctor stated")+
 field("Frequency","med."+i+".frequency",m.frequency||"","Doctor stated")+
 field("Duration","med."+i+".duration",m.duration||"","Doctor stated")+
 field("Route","med."+i+".route",m.route||"","Formulation route")+
 field("Instructions","med."+i+".instructions",m.instructions||"","Optional")+'</div>'+
 '<div class="med-tag-label">Spoken time of day · select only what the doctor said</div><div class="tag-strip">'+timing.map(k=>'<button type="button" class="timing-tag '+(active.includes(k)?"selected":"")+'" data-action="timing-tag" data-index="'+i+'" data-token="'+k+'">'+E(k.replace("_"," "))+'</button>').join("")+'</div>'+
 '<div class="med-tag-label">Meal relation · optional</div><div class="tag-strip">'+meals.map(x=>'<button type="button" class="timing-tag '+((m.mealTiming||"none")===x[0]?"selected":"")+'" data-action="meal-tag" data-index="'+i+'" data-meal="'+x[0]+'">'+E(x[1])+'</button>').join("")+'</div></div>';
}
function visitView(){
 const e=S.entry,d=S.draft,vst=S.visit,canEdit=!["completed","cancelled","no_show"].includes(e.status);
 const n=d.note,a=d.ass,rx=d.rx,patient=e.patient;
 const hasSavedRx=!!e.prescription?.signedAt;
 const currentStep=e.status==="completed"?3:e.status==="waiting"||e.status==="scheduled"?0:1;
 return '<button class="back" data-action="back">'+icon("back",14)+' Back to today</button>'+
 '<div class="visit-head"><div><div class="head-eyebrow">Consultation · '+E(e.date)+' · Queue #'+E(e.queueNo)+'</div><h1>'+E(patient.name)+'</h1><span class="micro muted">'+E(patient.code)+' · '+E(patient.age||"—")+' years · '+E(patient.sex||"")+' · '+E(patient.phone||"No mobile")+'</span></div>'+
 (canEdit?btn(icon("check",17)+" Review & complete","review-visit","green"):btn("View completed visit","noop","soft"))+'</div>'+
 '<div class="progress">'+[["Patient",0],["Consultation",1],["Review",2],["Done",3]].map((x,i)=>'<div class="progress-step '+(currentStep>x[1]?"done":currentStep===x[1]?"current":"")+'"><span>'+(currentStep>x[1]?"✓":i+1)+'</span>'+x[0]+'</div>').join("")+'</div>'+
 '<div class="visit-columns"><div class="visit-main">'+
 '<section class="panel voice-first"><div class="step-head"><h2>Voice consultation</h2><small>Speak first, review after</small></div>'+
 '<div class="voice-intro"><div class="voice-orb">'+icon("mic",26)+'</div><div><h3>'+(S.recording?.state==="recording"&&S.recordKind==="consultation"?"Recording your consultation…":S.voiceJob?"Converting speech to notes…":vst?.transcript?"Voice draft ready for your review":"Everything starts with your voice")+'</h3><p>Speak with the patient naturally in Gujarati, Hindi or English. Clinical notes and catalog-matched medicines will be prepared for review.</p></div></div>'+
 '<div class="voice-cta">'+
 (S.recording?.state==="recording"&&S.recordKind==="consultation"?btn("■ Stop recording","stop-record","voice-primary"):
 S.voiceJob?btn("↻ Check transcription","poll-consult","voice-primary"):
 btn(icon("mic",19)+(vst?.transcript?" Record again":" Start recording"),"record-consult","voice-primary",canEdit?"":"disabled"))+
 '</div><label class="checkbox voice-consent"><input type="checkbox" data-check="consultConsent" '+(d.consultConsent||vst?.consentAt?"checked":"")+'>Patient consents to recording and Sarvam AI processing.</label>'+
 (vst?.transcript?'<div class="note good">Transcription received. Please review the AI draft and any proposed medicines below.</div><details class="details"><summary>Source transcript</summary><p class="small muted" style="white-space:pre-wrap;line-height:1.75">'+E(vst.transcript.slice(0,20000))+'</p></details>':'')+
 '<details class="details" '+(S.showClinical||vst?.transcript?'open':'')+'><summary>Review clinical note · AI-generated, doctor-approved</summary><div class="form-grid" style="margin-top:15px">'+
 area("Chief complaint","note.chiefComplaint",n.chiefComplaint,"Doctor/patient speech")+
 area("Assessment","note.assessment",n.assessment,"Doctor statement only")+
 area("History of present illness","note.historyOfPresentIllness",n.historyOfPresentIllness,"Symptoms and duration")+
 area("Treatment plan","note.plan",n.plan,"Doctor statement only")+'</div></details>'+
 '<details class="details"><summary>More note fields (examination, medicines and follow-up)</summary><div class="form-grid" style="margin-top:13px">'+
 area("Past medical history","note.pastHistory",n.pastHistory)+area("Examination findings","note.examination",n.examination)+area("Medicines in note","note.medications",n.medications)+area("Follow-up note","note.followUp",n.followUp)+area("Uncertainties to verify","note.uncertainties",n.uncertainties)+'</div></details></section>'+
 '<section class="panel understated"><details class="details"><summary>Vitals & examination · only if measured</summary>'+
 '<div class="form-grid">'+
 field("Blood pressure · systolic","ass.systolic",a.systolic,"mmHg","number")+field("Diastolic","ass.diastolic",a.diastolic,"mmHg","number")+
 field("Pulse","ass.pulse",a.pulse,"/min","number")+field("SpO₂","ass.spo2",a.spo2,"%","number")+
 field("Temperature °C","ass.tempC",a.tempC,"°C","number")+field("Weight kg","ass.weightKg",a.weightKg,"kg","number")+
 '</div><details class="details"><summary>Other vitals & clinical history</summary><div class="form-grid" style="margin-top:13px">'+field("Height (cm)","ass.heightCm",a.heightCm,"cm","number")+field("Glucose (mg/dL)","ass.glucoseMgDl",a.glucoseMgDl,"mg/dL","number")+field("Respiratory rate","ass.respRate",a.respRate,"/min","number")+area("History","ass.history",a.history)+area("Examination","ass.examination",a.examination)+area("Allergies","ass.allergies",a.allergies)+'</div></details></details></section>'+
 '<section class="panel"><div class="step-head"><h2><span class="num">3</span> Prescription</h2><small>'+(hasSavedRx?"Signed":"Doctor reviewed")+'</small></div>'+
 (hasSavedRx?'<div class="note good">Prescription signed and locked. It cannot be edited.</div><a class="btn white" target="_blank" rel="noopener" href="/api/opd/entries/'+E(e.id)+'/prescription/print">'+icon("print",15)+' Print prescription</a>':
 '<div><p class="caption">Only medicines in your clinic catalog can be added. Dosing and timing remain doctor-reviewed drafts.</p>'+
 ((S.catalog||[]).some(x=>x.active!==false&&x.stock!==0)?'<div class="pill-row" style="margin:13px 0">'+S.catalog.filter(x=>x.active!==false&&x.stock!==0).slice(0,8).map(x=>'<button class="pill" data-action="select-catalog" data-id="'+E(x.id)+'">+ '+E(x.name)+' '+E(x.strength)+'</button>').join("")+'</div>':'<div class="note">No medicines available yet. Add the medicines you stock under More → Medicines in your clinic.</div>')+
 ((S.voiceOrders?.unmatched||[]).length?'<div class="note warn"><strong>Voice details requiring clarification</strong><br>'+S.voiceOrders.unmatched.map(x=>E(x.spokenName||"Unclear medicine")+': '+E(x.reason)).join('<br>')+'</div>':'')+
 ((S.voiceOrders?.accepted||[]).length?'<div class="note good">Catalog-matched voice draft: '+S.voiceOrders.accepted.length+' medicine(s). Verify everything before signing.</div>':'')+
 '<div class="form-grid">'+area("Working diagnosis","rx.diagnosis",rx.diagnosis,"Your clinical impression")+area("Investigations","rx.investigations",rx.investigations,"Tests if required")+'</div>'+
 '<div class="section-head"><h2>Medicines</h2>'+btn(icon("plus",14)+" Add medicine","add-med","white small")+'</div>'+
 (rx.medicines.map(rxMedicine).join("")||'<div class="note">No medicines added. You can complete a consultation without prescribing.</div>')+
 area("Advice / instructions","rx.advice",rx.advice,"Advice given to the patient")+'</div>')+'</section>'+
 '</div><div class="visit-side">'+
 '<section class="panel"><div class="step-head"><h2>Visit summary</h2>'+status(e.status)+'</div>'+
 '<div class="quick-summary"><dl><dt>Patient</dt><dd>'+E(patient.name)+'</dd><dt>Visit fee</dt><dd>₹'+E(d.charge||S.profile?.consultationFee||"300")+'</dd><dt>Billing</dt><dd>'+(e.bill?E(money(e.bill.totalPaise)):"Not billed")+'</dd><dt>Note</dt><dd>'+(vst?.status==="approved"?"Approved":vst?.processing?"Processing":vst?.status==="draft"?"Draft":"Not started")+'</dd></dl></div>'+
 '<div class="note '+(patient.allergies?"warn":"")+'" style="margin-top:13px"><strong>Allergy history</strong><br>'+E(patient.allergies||"Not documented. Ask the patient.")+'</div>'+
 '<div class="sticky-actions">'+btn(icon("file",15)+" Save draft","save-draft","white full")+'</div></section>'+
 '<section class="panel"><div class="step-head"><h2>Finish & follow-up</h2></div>'+
 '<div class="field"><label>Default consultation fee (₹)</label><input data-field="charge" inputmode="decimal" value="'+E(d.charge)+'"></div>'+
 '<div class="section-head"><h2>Follow-up</h2><small>Optional</small></div><div class="pill-row">'+[0,3,5,7,14,30].map(x=>'<button class="pill '+(Number(d.followDays)===x?"selected":"")+'" data-action="follow-day" data-days="'+x+'">'+(x?x+" days":"None")+'</button>').join("")+'</div>'+
 '<div class="section-head"><h2>Payment</h2></div><div class="pill-row">'+[["","Later"],["CASH","Cash"],["UPI","UPI"],["CARD","Card"]].map(x=>'<button class="pill '+(d.payMode===x[0]?"selected":"")+'" data-action="pay-mode" data-mode="'+x[0]+'">'+x[1]+'</button>').join("")+'</div>'+
 '<div class="sticky-actions">'+btn(icon("check",17)+" Review & complete","review-visit","green full",canEdit?"":"disabled")+'</div>'+
 '<p class="caption" style="margin-top:13px">A final review is always required before signing prescriptions and closing the visit.</p>'+
 (e.bill?'<a class="btn white full" style="margin-top:10px" target="_blank" rel="noopener" href="/api/opd/entries/'+E(e.id)+'/bill/print">'+icon("print",15)+' Print receipt</a>':"")+
 '</section>'+
 (vst?.status==="approved"?'<div class="note good">Clinical note approved. The original is preserved.</div>':"")+
 '</div></div>';
}
function pageBody(){
 if(S.entry)return visitView();
 if(S.page==="today")return today();
 if(S.page==="patients")return patients();
 if(S.page==="followups")return followups();
 return more();
}
function render(){
 app.className="";app.innerHTML=S.auth?chrome(pageBody())+overlayHtml():login();
}
async function bootstrap(){
 try{
  const x=await api("/api/me");S.auth=true;S.user=x.user;
  const [profile,favs,meds]=await Promise.all([api("/api/opd/profile"),api("/api/console/favorites"),api("/api/clinic/medicines")]);
  S.profile=profile.profile;S.favorites=favs.favorites;S.catalog=meds.medicines;
  const id=new URLSearchParams(location.search).get("visit");
  if(id&&/^[a-f0-9-]{36}$/.test(id)){
   const rows=(await api("/api/opd/overview?date="+dateIST())).entries;
   const found=rows.find(r=>r.visitId===id);
   if(found){await openEntry(found.id);return;}
  }
  await loadHome();
 }catch(e){S.auth=false;render();}
}
async function loadHome(){
 S.entry=null;S.visit=null;S.draft=null;S.page="today";
 const [o,fl]=await Promise.all([api("/api/opd/overview?date="+dateIST()),api("/api/opd/followups")]);
 S.overview=o;S.followups=fl.followups;render();
}
async function loadPatients(){S.entry=null;S.visit=null;S.draft=null;S.page="patients";const r=await api("/api/opd/patients");S.patients=r.patients;render();}
async function navigate(to){S.overlay=null;if(to==="today"){await loadHome();return;}if(to==="patients"){await loadPatients();return;}S.entry=null;S.visit=null;S.draft=null;S.page=to;
 if(to==="followups")S.followups=(await api("/api/opd/followups")).followups;
 if(to==="more"){const [p,f,m]=await Promise.all([api("/api/opd/profile"),api("/api/console/favorites"),api("/api/clinic/medicines")]);S.profile=p.profile;S.favorites=f.favorites;S.catalog=m.medicines;}
 render();
}
async function openPicker(){
 const r=await api("/api/opd/patients");S.patients=r.patients;S.search="";S.overlay="picker";render();
}
function resetRegistration(){S.pd={name:"",age:"",phone:"",sex:"",address:"",allergies:""};S.consent=false;S.voiceJob=null;S.voiceTicket=null;S.voiceTranscript="";S.voiceUncertain="";S.audio=null;S.audioMime=null;S.existingPatient=null;}
function openRegister(){resetRegistration();S.overlay="register";render();}
async function queuePatient(id){
 const current=await api("/api/opd/overview?date="+dateIST());
 const exists=(current.entries||[]).find(x=>x.patientId===id&&["waiting","in_consultation"].includes(x.status));
 if(exists){S.overlay=null;await loadHome();toast("Patient already in the queue.");return;}
 await api("/api/opd/entries","POST",{patientId:id,reason:"Walk-in"});
 S.overlay=null;await loadHome();toast("Patient checked in — now waiting.");
}
async function choosePatient(id){
 const r=await api("/api/opd/entries","POST",{patientId:id,reason:""});
 S.overlay=null;await openEntry(r.entry.id);
 await beginConsultation();
}
function emptyDraft(e,visit){
 return {note:{...emptyNote(),...(visit?.note||{})},ass:{...emptyAss(),...(e.assessment||{})},rx:{...freshRx(),...(e.prescription||{}),medicines:(e.prescription?.medicines||[]).map(m=>({...m}))},charge:S.profile?.consultationFee||"300",followDays:0,payMode:"",consultConsent:!!visit?.consentAt};
}
async function openEntry(id,retain=false){
 const e=(await api("/api/opd/entries/"+encodeURIComponent(id))).entry;
 let v=null;if(e.visitId){const r=await api("/api/visit/"+e.visitId);v=r.visit;}
 S.entry=e;S.visit=v;S.page="consult";S.overlay=null;
 if(!retain||!S.draft)S.draft=emptyDraft(e,v);
 if(v?.status==="approved")S.draft.note={...v.note};
 S.voiceOrders=null;
 if(e.visitId){
  try{
   S.voiceOrders=await api("/api/opd/entries/"+e.id+"/voice-orders");
   if(!e.prescription?.signedAt){
    const added=new Set(S.draft.rx.medicines.map(m=>m.catalogId).filter(Boolean));
    for(const med of (S.voiceOrders.accepted||[]))if(!added.has(med.catalogId)){
     S.draft.rx.medicines.push({...med});added.add(med.catalogId);
    }
   }
  }catch{S.voiceOrders=null;}
 }
 if(e.followup?.dueDate){const ms=Date.parse(e.followup.dueDate+"T00:00:00+05:30")-Date.parse(dateIST()+"T00:00:00+05:30");S.draft.followDays=Math.max(0,Math.round(ms/86400000));}
 render();window.scrollTo({top:0,behavior:"instant"});
}
async function beginConsultation(){
 if(!S.entry)return;
 if(S.entry.status==="scheduled")await api("/api/opd/entries/"+S.entry.id+"/status","POST",{status:"waiting"});
 if(["waiting","scheduled"].includes(S.entry.status)){
  const r=await api("/api/opd/entries/"+S.entry.id+"/status","POST",{status:"in_consultation"});
  await openEntry(r.entry.id);
 }
}
async function updateDoctorNote(){
 if(!S.visit||S.visit.status!=="draft")return;
 const notes=S.draft.note;
 if(!Object.values(notes).some(x=>String(x||"").trim()))return;
 let result=await api("/api/visit/"+S.visit.id,"PATCH",{note:notes,version:S.visit.version});
 S.visit=result.visit;
}
async function saveDraft(){
 if(!S.entry)throw Error("No active consultation.");
 await api("/api/opd/entries/"+S.entry.id+"/assessment","PUT",S.draft.ass);
 if(S.visit?.status==="draft")await updateDoctorNote();
 if(!S.entry.prescription?.signedAt){
  const r=S.draft.rx;
  if(r.medicines.some(x=>x.name?.trim())||r.advice?.trim()||r.investigations?.trim()){
   const x=await api("/api/opd/entries/"+S.entry.id+"/prescription","PUT",r);S.entry.prescription=x.prescription;
  }
 }
 toast("Draft saved. You can resume this patient later.");
}
function createRegistrationId(){return String(S.pd.name||"").trim().toLowerCase();}
async function registerAndStart(){
 if(!String(S.pd.name||"").trim()||String(S.pd.name).trim().length<2)throw Error("Enter a patient name first.");
 const patientName=createRegistrationId();
 const pts=await api("/api/opd/patients?q="+encodeURIComponent(S.pd.phone||S.pd.name));
 const possible=pts.patients.find(p=>(S.pd.phone&&p.phone===S.pd.phone)||p.name?.trim().toLowerCase()===patientName);
 if(S.existingPatient){
  const patient=S.existingPatient;
  if(!confirm("Confirm patient identity: "+patient.name+" ("+patient.code+")?"))return;
  resetRegistration();S.overlay=null;await choosePatient(patient.id);return;
 }
 if(possible&&!confirm("A patient with this name or number already exists. Create a new record anyway?"))return;
 if(S.voiceTranscript&&!confirm("Have you checked the patient name, age, phone and spoken details?"))return;
 const p=await api("/api/patients","POST",S.pd);
 resetRegistration();S.overlay=null;await choosePatient(p.id);
}
function chooseAudioType(){return ["audio/mp4","audio/webm;codecs=opus","audio/webm"].find(x=>window.MediaRecorder?.isTypeSupported(x))||"";}
async function beginAudio(kind){
 if(S.recording?.state==="recording")return toast("Stop the current recording first.");
 if(kind==="registration"&&!S.consent)throw Error("Confirm the patient’s consent before recording.");
 if(kind==="consultation"&&!S.draft.consultConsent&&!S.visit?.consentAt)throw Error("Confirm patient consent before recording the consultation.");
 if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw Error("Microphone recording is unavailable in this browser.");
 const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});
 try{
  if(kind==="consultation"&&!S.visit){await beginConsultation();if(!S.visit)throw Error("Unable to start consultation.");}
  if(kind==="consultation"&&!S.visit?.consentAt){const c=await api("/api/visit/"+S.visit.id+"/consent","POST",{consent:true});S.visit=c.visit;}
 }catch(e){stream.getTracks().forEach(x=>x.stop());throw e;}
 const type=chooseAudioType();if(!type){stream.getTracks().forEach(x=>x.stop());throw Error("Your browser does not support a compatible recording format.");}
 const mr=new MediaRecorder(stream,{mimeType:type,audioBitsPerSecond:48000}),chunks=[];
 S.recording=mr;S.recordKind=kind;S.audioMime=type.split(";")[0];S.voiceJob=null;
 let guard;
 mr.ondataavailable=x=>{if(x.data.size)chunks.push(x.data);};
 mr.onerror=()=>toast("Recording was interrupted.");
 mr.onstop=async()=>{
  clearTimeout(guard);stream.getTracks().forEach(x=>x.stop());S.recording=null;
  const audio=new Blob(chunks,{type:S.audioMime});S.audio=audio;render();
  try{if(audio.size<1024)throw Error("Recording too short. Please try again.");await submitAudio(kind,audio);}
  catch(e){toast(e.message+" Recording stays available until you close this page.");}
 };
 mr.start(2500);
 guard=setTimeout(()=>{if(mr.state==="recording")mr.stop();},kind==="registration"?75000:300000);
 render();
}
async function submitAudio(kind,audio){
 if(kind==="registration"){
  const z=await api("/api/patients/voice","POST",audio,{"X-Voice-Consent":"confirmed"});
  S.voiceJob=z.job;S.voiceTicket=z.ticket;render();await pollRegistration();return;
 }
 if(!S.visit)throw Error("Consultation not available.");
 const z=await api("/api/visit/"+S.visit.id+"/transcribe","POST",audio);
 S.visit=z.visit;S.voiceJob="consult";render();await pollConsultation();
}
async function pollRegistration(){
 if(!S.voiceJob||!S.voiceTicket)return;
 const jobId=S.voiceJob,ticket=S.voiceTicket;
 for(let i=0;i<72;i++){
  const r=await api("/api/patients/voice/status?job="+encodeURIComponent(jobId)+"&ticket="+encodeURIComponent(ticket));
  if(r.state==="completed"){
   for(const k of ["name","age","phone","sex","address","allergies"])if(r.fields?.[k])S.pd[k]=r.fields[k];
   S.voiceJob=null;S.voiceTicket=null;S.voiceTranscript=r.transcript||"";S.voiceUncertain=r.uncertainties||"";
   S.existingPatient=null;
   try{
    const query=String(S.pd.phone||S.pd.name||"").trim();
    if(query){
     const search=await api("/api/opd/patients?q="+encodeURIComponent(query));
     const matches=search.patients.filter(p=>S.pd.phone?String(p.phone||"")===String(S.pd.phone):String(p.name||"").trim().toLowerCase()===String(S.pd.name||"").trim().toLowerCase());
     if(matches.length===1)S.existingPatient=matches[0];
    }
   }catch{}
   render();toast(S.existingPatient?"Existing patient matched. Verify identity before starting.":"Patient details filled. Please verify before saving.");return;
  }
  if(r.state==="failed"){S.voiceJob=null;render();throw Error("Sarvam could not transcribe the registration.");}
  await new Promise(resolve=>setTimeout(resolve,4500));
 }
 toast("Still processing. Tap Check status to resume.");
}
async function pollConsultation(){
 if(!S.visit)return;let id=S.visit.id;
 for(let i=0;i<72;i++){
  const r=await api("/api/visit/"+id+"/status");
  if(r.state==="completed"){
   S.visit=r.visit;S.draft.note={...emptyNote(),...r.visit.note};S.voiceJob=null;S.audio=null;
   try{
    S.voiceOrders=await api("/api/opd/entries/"+S.entry.id+"/voice-orders");
    const accepted=S.voiceOrders.accepted||[];
    const already=new Set(S.draft.rx.medicines.map(m=>m.catalogId).filter(Boolean));
    for(const m of accepted){if(!already.has(m.catalogId)){S.draft.rx.medicines.push({...m});already.add(m.catalogId);}}
   }catch{S.voiceOrders={accepted:[],unmatched:[],warnings:["Medicine suggestions unavailable; choose catalog medicines manually."]};}
   render();toast("Voice notes ready. Verify any matched medicines and directions.");return;
  }
  if(r.state==="failed"){S.voiceJob=null;render();throw Error("AI transcription failed. Please record again.");}
  if(r.state==="idle"){S.voiceJob=null;render();return;}
  await new Promise(resolve=>setTimeout(resolve,4800));
 }
 toast("Still processing. Tap Check status to continue.");
}
function daysFromToday(n){return new Date(Date.now()+19800000+Number(n)*86400000).toISOString().slice(0,10);}
function previewReview(){
 if(!S.entry)return;
 const d=S.draft;
 if(["completed","cancelled","no_show"].includes(S.entry.status))throw Error("This consultation is closed.");
 if(!String(d.note.chiefComplaint||d.ass.complaint||"").trim())throw Error("Add the patient’s chief complaint before completing.");
 if(!String(d.note.assessment||d.ass.assessment||"").trim())throw Error("Add the doctor’s assessment before completing.");
 if(d.rx.medicines.some(m=>!m.catalogId||!S.catalog.some(x=>x.id===m.catalogId&&x.active!==false&&x.stock!==0)))throw Error("Choose each medicine from your active clinic medicine catalog.");
 if(d.rx.medicines.some(m=>m.name?.trim()&&(!m.strength?.trim()||!m.route?.trim()||!m.dose?.trim()||!m.frequency?.trim()||!m.duration?.trim())))throw Error("Each prescribed medicine needs clinician-verified dose, strength, route, frequency and duration before signing.");
 const fee=String(d.charge||"").trim();if(!/^\d{1,7}(\.\d{1,2})?$/.test(fee)||Number(fee)<=0)throw Error("Enter a valid consultation fee.");
 S.overlay="review";render();
}
async function finishVisit(){
 if(!document.getElementById("confirmDoctor")?.checked)throw Error("Confirm that you reviewed the clinical details, prescription and charges.");
 S.overlay=null;render();
 try{
  // Each API operation is individually persisted. Reopen the encounter if a step fails.
  if(S.entry.status==="waiting"||S.entry.status==="scheduled")await beginConsultation();
  await api("/api/opd/entries/"+S.entry.id+"/assessment","PUT",{...S.draft.ass,complaint:S.draft.note.chiefComplaint,assessment:S.draft.note.assessment,plan:S.draft.note.plan});
  if(S.visit?.status==="draft"){
   await updateDoctorNote();
   if(Object.values(S.draft.note).some(x=>String(x).trim())){
    const x=await api("/api/visit/"+S.visit.id+"/approve","POST",{reviewed:true,version:S.visit.version});S.visit=x.visit;
   }
  }
  const r=S.draft.rx;
  if(!S.entry.prescription?.signedAt&&(r.medicines.some(m=>m.name?.trim())||r.advice?.trim()||r.investigations?.trim())){
   await api("/api/opd/entries/"+S.entry.id+"/prescription","PUT",r);
   const x=await api("/api/opd/entries/"+S.entry.id+"/prescription/sign","POST",{reviewed:true});S.entry=x.entry;
  }
  if(!S.entry.bill){
   const x=await api("/api/opd/entries/"+S.entry.id+"/bill","POST",{items:[{description:"OPD consultation",quantity:1,price:S.draft.charge}]});S.entry=x.entry;
  }
  if(S.draft.payMode&&S.entry.bill&&S.entry.bill.totalPaise>S.entry.bill.paidPaise){
   const amount=((S.entry.bill.totalPaise-S.entry.bill.paidPaise)/100).toFixed(2);
   const x=await api("/api/opd/entries/"+S.entry.id+"/payment","POST",{amount,mode:S.draft.payMode});S.entry=x.entry;
  }
  if(Number(S.draft.followDays)>0){
   const x=await api("/api/opd/entries/"+S.entry.id+"/followup","POST",{dueDate:daysFromToday(S.draft.followDays),notes:"Doctor requested follow-up"});
   S.entry=x.entry;
  }
  if(S.entry.status==="in_consultation"){
   const x=await api("/api/opd/entries/"+S.entry.id+"/status","POST",{status:"completed"});S.entry=x.entry;
  }
  const finishedId=S.entry.id;
  await openEntry(finishedId);
  toast("Visit completed. Prescription and receipt are ready.");
 }catch(e){
  const id=S.entry?.id;if(id){try{await openEntry(id,true);}catch{}}
  throw Error(e.message+". Completed steps were saved; review the encounter before trying again.");
 }
}
async function saveProfile(){
 const p=S.profile;const r=await api("/api/opd/profile","PUT",p);S.profile=r.profile;render();toast("Clinic settings saved.");
}
async function saveFavorite(){
 const m=S.favoriteDraft;if(!m.name?.trim())throw Error("Enter the medicine name.");
 const next={...S.favorites,medicines:[...S.favorites.medicines,m]};
 const r=await api("/api/console/favorites","PUT",next);S.favorites=r.favorites;S.overlay=null;render();toast("Added to your medicine favorites.");
}
async function removeFavorite(index){
 if(!confirm("Remove this medicine shortcut?"))return;
 const next={...S.favorites,medicines:S.favorites.medicines.filter((_,i)=>i!==Number(index))};
 const r=await api("/api/console/favorites","PUT",next);S.favorites=r.favorites;render();
}
async function action(el){
 const cmd=el.dataset.action;
 if(cmd==="overlay-bg"){S.overlay=null;render();return;}
 if(cmd==="noop")return;
 if(cmd==="navigate"){await navigate(el.dataset.to);return;}
 if(cmd==="back"){await loadHome();return;}
 if(cmd==="start"){await openPicker();return;}
 if(cmd==="open-next"){const next=S.overview?.entries.find(x=>x.status==="in_consultation"||x.status==="waiting");if(next)await openEntry(next.id);else await openPicker();return;}
 if(cmd==="open-register"){openRegister();return;}
 if(cmd==="close"){S.overlay=null;render();return;}
 if(cmd==="choose-patient"){await choosePatient(el.dataset.id);return;}
 if(cmd==="queue-patient"){await queuePatient(el.dataset.id);return;}
 if(cmd==="show-queue"){await loadHome();document.getElementById("today-queue")?.scrollIntoView({block:"start",behavior:"auto"});return;}
 if(cmd==="register-patient"){await registerAndStart();return;}
 if(cmd==="open-entry"){await openEntry(el.dataset.id);return;}
 if(cmd==="begin-consult"){await beginConsultation();return;}
 if(cmd==="start-registration"){await beginAudio("registration");return;}
 if(cmd==="record-consult"){await beginAudio("consultation");return;}
 if(cmd==="stop-record"){S.recording?.stop();return;}
 if(cmd==="poll-register"){await pollRegistration();return;}
 if(cmd==="poll-consult"){await pollConsultation();return;}
 if(cmd==="new-catalog"){S.catalogDraft={name:"",strength:"",form:"",route:"",aliases:"",stock:""};S.overlay="catalog-add";render();return;}
 if(cmd==="save-catalog"){
  const d=S.catalogDraft||{};
  const med=await api("/api/clinic/medicines","POST",{...d,aliases:String(d.aliases||"").split(",").map(x=>x.trim()).filter(Boolean)});
  S.catalog=[med.medicine,...S.catalog];S.overlay=null;render();toast("Medicine added to your clinic catalog.");return;
 }
 if(cmd==="disable-catalog"){
  if(!confirm("Deactivate this medicine? It will no longer appear in new prescriptions."))return;
  await api("/api/clinic/medicines/"+el.dataset.id,"DELETE");
  const r=await api("/api/clinic/medicines");S.catalog=r.medicines;render();return;
 }
 if(cmd==="select-catalog"){
  if(!S.entry||!S.draft)return toast("Open a consultation to select medicine.");
  const m=S.catalog.find(x=>x.id===el.dataset.id&&x.active!==false&&x.stock!==0);
  if(!m)return toast("Medicine unavailable. Refresh the catalog.");
  if(S.draft.rx.medicines.some(x=>x.catalogId===m.id))return toast("This medicine is already in the prescription.");
  S.draft.rx.medicines.push({catalogId:m.id,name:m.name,strength:m.strength,form:m.form,route:m.route,dose:"",frequency:"",duration:"",timingTokens:[],mealTiming:"none",instructions:""});
  S.overlay=null;render();toast("Medicine selected. Enter the exact doctor-prescribed directions.");return;
 }
 if(cmd==="timing-tag"){
  const med=S.draft?.rx?.medicines?.[Number(el.dataset.index)];if(!med)return;
  const token=el.dataset.token,valid=["morning","afternoon","evening","night","bedtime","as_needed"];
  if(!valid.includes(token))return;
  const arr=Array.isArray(med.timingTokens)?med.timingTokens:[];
  med.timingTokens=arr.includes(token)?arr.filter(x=>x!==token):[...arr,token];
  render();return;
 }
 if(cmd==="meal-tag"){
  const med=S.draft?.rx?.medicines?.[Number(el.dataset.index)];if(!med)return;
  const meal=el.dataset.meal;if(!["none","before_food","after_food","with_food"].includes(meal))return;
  med.mealTiming=meal;render();return;
 }
 if(cmd==="add-med"){S.overlay="catalog-picker";render();return;}
 if(cmd==="remove-med"){S.draft.rx.medicines.splice(Number(el.dataset.index),1);render();return;}
 if(cmd==="use-favorite"){toast("Only medicines in your clinic catalog can be prescribed. Open the catalog to choose.");S.overlay="catalog-picker";render();return;}
 if(cmd==="follow-day"){S.draft.followDays=Number(el.dataset.days);render();return;}
 if(cmd==="pay-mode"){S.draft.payMode=el.dataset.mode;render();return;}
 if(cmd==="save-draft"){await saveDraft();return;}
 if(cmd==="review-visit"){previewReview();return;}
 if(cmd==="finish-confirm"){await finishVisit();return;}
 if(cmd==="done-followup"){if(!confirm("Mark this follow-up as completed?"))return;await api("/api/opd/followups/"+el.dataset.id+"/done","POST",{});S.followups=(await api("/api/opd/followups")).followups;render();toast("Follow-up completed.");return;}
 if(cmd==="save-profile"){await saveProfile();return;}
 if(cmd==="new-favorite"){S.favoriteDraft=emptyMed();S.overlay="favorite";render();return;}
 if(cmd==="save-favorite"){await saveFavorite();return;}
 if(cmd==="remove-favorite"){await removeFavorite(el.dataset.index);return;}
 if(cmd==="load-reports"){S.reports=await api("/api/opd/reports?from="+dateIST()+"&to="+dateIST());render();return;}
 if(cmd==="open-password"){toast("Open the secure account settings in the legacy clinic screen.");window.location.href="/legacy";return;}
 if(cmd==="logout"){await api("/api/logout","POST",{});S.auth=false;S.entry=null;S.patient=null;S.draft=null;S.user=null;render();return;}
}
document.addEventListener("click",e=>{
 const el=e.target.closest("[data-action]");if(!el||el.disabled)return;
 if(el.dataset.action==="overlay-bg"&&el!==e.target)return;
 e.preventDefault();job(()=>action(el));
});
document.addEventListener("input",e=>{
 const el=e.target,key=el?.dataset?.field;if(!key)return;
 const value=el.value;
 if(key==="search"){S.search=value;const focused=el;const pos=el.selectionStart;const nearest=el.closest(".overlay");if(nearest?.querySelector(".patient-list")){const list=nearest.querySelector(".patient-list");list.innerHTML=S.patients.filter(x=>!value||String(x.name||"").toLowerCase().includes(value.toLowerCase())||String(x.phone||"").includes(value)).slice(0,12).map(p=>'<div class="patient-row">'+patientAvatar(p)+'<span class="info"><strong>'+E(p.name)+'</strong><small>'+E(p.phone||"")+'</small></span>'+'<span class="quick-actions">'+btn("Add to queue","queue-patient","soft small",'data-id="'+E(p.id)+'"')+btn("Choose","choose-patient","white small",'data-id="'+E(p.id)+'"')+'</span>'+'</div>').join("")||'<div class="empty">No patients found.</div>';}
 else if(S.page==="patients"){const parent=document.querySelector(".patient-list");if(parent)parent.innerHTML=S.patients.filter(x=>!value||String(x.name||"").toLowerCase().includes(value.toLowerCase())||String(x.phone||"").includes(value)).slice(0,70).map(p=>'<div class="patient-row">'+patientAvatar(p)+'<span class="info"><strong>'+E(p.name)+'</strong><small>'+E(p.phone||"")+'</small></span>'+'<span class="quick-actions">'+btn("Add to queue","queue-patient","soft small",'data-id="'+E(p.id)+'"')+btn("Start visit","choose-patient","white small",'data-id="'+E(p.id)+'"')+'</span>'+'</div>').join("")||'<div class="empty">No patients found.</div>';}return;}
 const parts=key.split(".");
 if(parts[0]==="pd"){S.pd[parts[1]]=value;if(parts[1]==="name"||parts[1]==="phone")S.existingPatient=null;}
 else if(parts[0]==="profile")S.profile[parts[1]]=value;
 else if(parts[0]==="fav")S.favoriteDraft[parts[1]]=value;
 else if(parts[0]==="catalog")S.catalogDraft[parts[1]]=value;
 else if(parts[0]==="note")S.draft.note[parts[1]]=value;
 else if(parts[0]==="ass")S.draft.ass[parts[1]]=value;
 else if(parts[0]==="rx")S.draft.rx[parts[1]]=value;
 else if(parts[0]==="med")S.draft.rx.medicines[Number(parts[1])][parts[2]]=value;
 else if(key==="charge")S.draft.charge=value;
});
document.addEventListener("change",e=>{
 const name=e.target?.dataset?.check;
 if(name==="consent")S.consent=e.target.checked;
 if(name==="consultConsent"&&S.draft)S.draft.consultConsent=e.target.checked;
});
document.addEventListener("submit",e=>{
 if(e.target.id!=="loginForm")return;e.preventDefault();
 job(async()=>{
  const d=Object.fromEntries(new FormData(e.target));await api("/api/login","POST",d);
  S.auth=true;S.user={email:d.email};const [p,f,m]=await Promise.all([api("/api/opd/profile"),api("/api/console/favorites"),api("/api/clinic/medicines")]);
  S.profile=p.profile;S.favorites=f.favorites;S.catalog=m.medicines;await loadHome();
 });
});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&S.overlay){S.overlay=null;render();}});
bootstrap();
setInterval(()=>{void refreshQueue();},30000);
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")void refreshQueue();});
window.addEventListener("focus",()=>{void refreshQueue();});
