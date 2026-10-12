"use strict";
const app=document.getElementById("clinic-app"),toastEl=document.getElementById("clinic-toast");
const S={page:"dashboard",tab:"clinical",date:new Date(Date.now()+19800000).toISOString().slice(0,10),overview:null,patients:[],patient:null,patientHistory:[],entry:null,followups:[],reports:null,profile:null,search:"",busy:false};
const titles={dashboard:"Today's OPD",queue:"Queue & appointments",patients:"Patient records",followups:"Follow-up register",reports:"Clinic reports",settings:"Clinic settings"};
const nav=[["dashboard","⌂","Overview"],["queue","▤","Queue"],["patients","♙","Patients"],["followups","◷","Follow-ups"],["reports","▥","Reports"],["settings","⚙","Settings"]];
function E(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function INR(p){return "₹"+(Number(p||0)/100).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});}
function v(v){return v===null||v===undefined?"":String(v);}
function fmtDate(x){if(!x)return "—";try{return new Date(x).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});}catch{return v(x);}}
function notice(text){toastEl.textContent=text;toastEl.style.display="block";clearTimeout(notice.timer);notice.timer=setTimeout(()=>toastEl.style.display="none",5500);}
async function api(path,method="GET",data){
 const opts={method,credentials:"same-origin",cache:"no-store",headers:{"X-Clinic-Request":"1","Accept":"application/json"}};
 if(data!==undefined){opts.headers["Content-Type"]="application/json";opts.body=JSON.stringify(data);}
 const r=await fetch(path,opts);let body;try{body=await r.json();}catch{throw Error("The clinic server returned an invalid response.");}
 if(!r.ok)throw Error(body.error||"Request could not be completed");
 return body;
}
async function doWork(fn){if(S.busy)return;S.busy=true;try{await fn();}catch(e){notice(e.message||"Unable to complete action");}finally{S.busy=false;}}
function fld(label,name,value,type="text",extra=""){return '<div class="field"><label for="f_'+E(name)+'">'+E(label)+'</label><input id="f_'+E(name)+'" name="'+E(name)+'" type="'+type+'" value="'+E(v(value))+'" '+extra+'></div>';}
function area(label,name,value,extra=""){return '<div class="field '+extra+'"><label for="f_'+E(name)+'">'+E(label)+'</label><textarea id="f_'+E(name)+'" name="'+E(name)+'">'+E(v(value))+'</textarea></div>';}
function button(label,action,extra="",attrs=""){return '<button class="btn '+extra+'" type="button" data-act="'+E(action)+'" '+attrs+'>'+label+'</button>';}
function badge(status){return '<span class="status '+E(status)+'">'+E(String(status||"").replaceAll("_"," "))+'</span>';}
function sepTitle(title,subtitle){return '<div class="header"><div><div class="eyebrow">Durva Clinic · General OPD</div><h1>'+E(title)+'</h1>'+(subtitle?'<p class="sub">'+E(subtitle)+'</p>':"")+'</div><a href="/" class="btn secondary">✦ AI Scribe</a></div>';}
function entryRows(entries){
 if(!entries?.length)return '<div class="empty">No entries for this date yet.<br>Use <strong>Patients → Select patient</strong> to create a walk-in visit or appointment.</div>';
 return '<div class="table-wrap"><table class="table"><thead><tr><th>Queue</th><th>Patient</th><th>Reason</th><th>Visit</th><th>Status</th><th></th></tr></thead><tbody>'+entries.map(x=>'<tr><td><strong>#'+x.queueNo+'</strong></td><td><strong>'+E(x.patient?.name)+'</strong><div class="mini">'+E(x.patient?.code)+' · '+E(x.patient?.phone||"")+'</div></td><td>'+E(x.reason||"—")+'</td><td>'+E(x.scheduledAt?new Date(x.scheduledAt).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}):"Walk-in")+'</td><td>'+badge(x.status)+'</td><td>'+button("Open →","entry","secondary tiny",'data-id="'+E(x.id)+'"')+'</td></tr>').join("")+'</tbody></table></div>';
}
function dashboard(){
 const o=S.overview||{entries:[],stats:{}},m=o.stats;
 return sepTitle("Clinic dashboard","Appointments, patient flow and receipts for the selected day.")+
 '<div class="toolbar"><div class="row"><div class="field"><label>Date</label><input id="queueDate" type="date" value="'+E(S.date)+'"></div>'+button("Refresh","refresh","secondary")+'</div><div class="row"><a class="btn" href="/?newPatient=1">+ Voice patient registration</a>'+button("+ New OPD / appointment","patients","secondary")+'</div></div>'+
 '<div class="stats">'+[["All entries",m.total||0],["Waiting",m.waiting||0],["In consultation",m.active||0],["Completed",m.completed||0],["Collected",INR(m.collectedPaise)]].map(z=>'<div class="stat"><span>'+z[0]+'</span><strong>'+z[1]+'</strong></div>').join("")+'</div>'+
 '<div class="card"><div class="row space"><h2>Patient queue</h2>'+button("Full queue","queue","secondary tiny")+'</div>'+entryRows(o.entries)+'</div>'+
 '<div class="note success">Use the AI scribe for Gujarati, Hindi and English consultation transcription. Clinical findings, investigations and medicines must still be checked and signed by the treating clinician.</div>';
}
function queue(){return sepTitle("Queue & appointments","Manage booked appointments, arrivals and today's walk-in patients.")+
 '<div class="toolbar"><div class="field"><label>Show date</label><input type="date" id="queueDate" value="'+E(S.date)+'"></div>'+button("Search or register patient","patients","secondary")+'</div>'+
 '<div class="card">'+entryRows(S.overview?.entries||[])+'</div>';}
function patients(){
 return sepTitle("Patients","Search existing records, then start a walk-in consultation or book an appointment.")+
 '<div class="card"><form data-form="searchPatients" class="row"><input style="max-width:340px" name="q" placeholder="Search name, mobile, patient ID" value="'+E(S.search)+'" aria-label="Search patients">'+
 '<button class="btn" type="submit">Search</button><a class="btn secondary" href="/?newPatient=1">+ Register by voice</a></form></div>'+
 '<div class="card">'+(S.patients.length?'<div class="table-wrap"><table class="table"><thead><tr><th>Patient</th><th>Age</th><th>Phone</th><th></th></tr></thead><tbody>'+
 S.patients.map(p=>'<tr><td><strong>'+E(p.name)+'</strong><div class="mini">'+E(p.code)+'</div></td><td>'+E(p.age||"—")+'</td><td>'+E(p.phone||"—")+'</td><td>'+button("Open","patient","secondary tiny",'data-id="'+E(p.id)+'"')+'</td></tr>').join("")+'</tbody></table></div>':'<div class="empty">No matching patients. Use voice registration to add your first patient.</div>')+'</div>';
}
function patientView(){
 const p=S.patient;if(!p)return patients();
 return sepTitle(p.name,p.code+" · "+(p.age||"Age not recorded")+" years · "+(p.phone||"No phone"))+
 '<div class="grid"><div><div class="card"><h2>Start an OPD entry</h2><p class="mini">Walk-in creates a waiting entry. An appointment is added to the selected date; check it in when the patient arrives.</p>'+
 '<form data-form="newEntry"><div class="form-grid">'+
 '<div class="field"><label>Visit type</label><select name="visitType"><option value="walkin">Walk-in now</option><option value="appointment">Book appointment</option></select></div>'+
 fld("Appointment date and time (for bookings)","appointmentAt","","datetime-local")+
 area("Reason for visit","reason","","full")+
 '</div><p class="mini">For a walk-in, leave appointment time empty. For a scheduled appointment, set both the type and time.</p>'+
 '<button type="submit" class="btn">+ Create OPD entry</button></form></div>'+
 '<div class="card"><h2>Recent clinic visits</h2>'+(S.patientHistory.length?entryRows(S.patientHistory.map(x=>({...x,patient:{name:p.name,code:p.code,phone:p.phone}}))):'<div class="empty">No OPD history yet.</div>')+'</div></div>'+
 '<div class="card"><h2>Patient profile</h2><p><strong>Name</strong><br>'+E(p.name)+'</p><p><strong>Contact</strong><br>'+E(p.phone||"Not recorded")+'</p><p><strong>Address</strong><br>'+E(p.address||"Not recorded")+'</p><p><strong>Patient-reported allergies</strong><br>'+E(p.allergies||"Not recorded")+'</p><a href="/" class="btn secondary">View existing AI scribe records</a></div></div>';
}
function statActions(e){
 let actions=[];
 if(e.status==="scheduled")actions=[["✓ Check in","waiting"],["Cancel","cancelled"],["No show","no_show"]];
 if(e.status==="waiting")actions=[["▶ Start consultation","in_consultation"],["Cancel","cancelled"]];
 if(e.status==="in_consultation")actions=[["✓ Complete visit","completed"],["↩ Return to waiting","waiting"]];
 return actions.map(z=>button(z[0],"status",z[1]==="cancelled"?"secondary tiny":"tiny",'data-status="'+z[1]+'"')).join("");
}
function assessmentForm(e){
 const a=e.assessment||{},vitals=[["Systolic BP","systolic","number","mmHg"],["Diastolic BP","diastolic","number","mmHg"],["Pulse","pulse","number","/min"],["Temperature","tempC","number","°C"],["SpO₂","spo2","number","%"],["Weight","weightKg","number","kg"],["Height","heightCm","number","cm"],["Glucose (RBS)","glucoseMgDl","number","mg/dL"],["Respiratory rate","respRate","number","/min"]];
 return '<form data-form="assessment"><div class="card"><div class="row space"><h2>Vitals & clinical examination</h2><span class="mini">Measured values · verify accuracy</span></div>'+
 '<div class="small-row">'+vitals.map(x=>'<div class="field"><label>'+x[0]+' <span class="mini">'+x[3]+'</span></label><input name="'+x[1]+'" type="number" step="any" value="'+E(v(a[x[1]]))+'" placeholder="—"></div>').join("")+'</div>'+
 '<h3 style="margin-top:22px">History and findings</h3><div class="form-grid">'+
 [["Chief complaint","complaint"],["Onset / duration","onset"],["History of presenting illness","history"],["Medical history","pastHistory"],["Family history","familyHistory"],["Reported allergies","allergies"],["Examination findings","examination"],["Assessment / diagnosis","assessment"],["Investigations","investigations"],["Management plan","plan"]].map(x=>area(x[0],x[1],a[x[1]],"full")).join("")+
 '</div><div class="row" style="margin-top:16px"><button class="btn" type="submit">Save clinical assessment</button>'+(e.visitId?'<a class="btn secondary" href="/?visit='+E(e.visitId)+'">🎙 Open AI consultation scribe</a>':"")+'</div></div></form>';
}
function medicineRow(m){
 m=m||{};
 return '<div class="medicine"><div class="row space"><strong class="mini">Medicine entry · clinician prescribed</strong>'+button("Remove","removeMedicine","secondary tiny")+'</div><div class="med-grid">'+
 [["Medicine / generic name","name"],["Strength / formulation","strength"],["Route","route"],["Frequency / schedule","frequency"],["Duration","duration"],["Additional instructions","instructions"]].map(x=>'<div class="field"><label>'+x[0]+'</label><input data-med-field="'+x[1]+'" value="'+E(m[x[1]]||"")+'" autocomplete="off"></div>').join("")+
 '</div></div>';
}
function rxForm(e){
 const r=e.prescription||{},signed=!!r.signedAt,disabled=signed||["cancelled","no_show","completed"].includes(e.status);
 return '<div class="card"><div class="row space"><h2>Doctor\'s prescription</h2>'+(signed?'<span class="status completed">SIGNED · LOCKED</span>':'<span class="status scheduled">DRAFT · NOT VALID UNTIL SIGNED</span>')+'</div>'+
 '<p class="mini">AI never chooses medicines or doses. Enter orders manually and confirm all details before signing.</p>'+
 '<form data-form="prescription"><div class="form-grid">'+area("Assessment / impression","diagnosis",r.diagnosis,"full")+area("Investigations requested","investigations",r.investigations,"full")+area("Advice / precautions","advice",r.advice,"full")+'</div>'+
 '<div class="row space" style="margin-top:20px"><h3>Medications</h3>'+(!disabled?button("+ Add medicine","addMedicine","secondary tiny"):"")+'</div>'+
 '<div id="medicineList">'+(r.medicines?.length?r.medicines:[{}]).map(medicineRow).join("")+'</div>'+
 (disabled?'<p class="note">This prescription is read-only.</p>':'<div class="row"><button class="btn" type="submit">Save prescription draft</button>'+button("Sign after review","signRx","success")+'</div>')+
 '</form>'+(signed?'<p><a class="btn secondary" target="_blank" rel="noopener" href="/api/opd/entries/'+E(e.id)+'/prescription/print">⎙ Print signed prescription</a></p>':"")+'</div>';
}
function billingForm(e){
 const b=e.bill;
 if(!b)return '<div class="card"><h2>Billing & consultation receipt</h2><p class="mini">Add services and charges, then record cash, UPI, card or bank payments.</p>'+
 '<form data-form="bill"><div class="form-grid">'+
 [0,1,2].map((i)=>'<div class="field"><label>Service '+(i+1)+'</label><input name="item'+i+'" value="'+(i===0?'Consultation fee':'')+'"></div><div class="field"><label>Rate (₹)</label><input name="price'+i+'" inputmode="decimal" value="'+(i===0?E(S.profile?.consultationFee||"300"):"")+'"></div>').join("")+
 '</div><p class="mini">All quantities default to 1. Edit rates before issuing a receipt.</p><button class="btn" type="submit">Issue bill</button></form></div>';
 const owing=b.totalPaise-b.paidPaise;
 return '<div class="card"><div class="row space"><h2>Bill #'+b.number+'</h2><span class="status '+(owing?"waiting":"completed")+'">'+(owing?"Balance due":"Paid in full")+'</span></div>'+
 '<div class="table-wrap"><table class="table"><thead><tr><th>Service</th><th>Qty</th><th>Price</th><th>Amount</th></tr></thead><tbody>'+
 b.items.map(i=>'<tr><td>'+E(i.description)+'</td><td>'+i.quantity+'</td><td>'+INR(i.pricePaise)+'</td><td>'+INR(i.quantity*i.pricePaise)+'</td></tr>').join("")+
 '</tbody></table></div><p><strong>Total: '+INR(b.totalPaise)+'</strong> · Paid: '+INR(b.paidPaise)+' · Due: <strong>'+INR(owing)+'</strong></p>'+
 (owing?'<form data-form="payment" class="form-grid">'+fld("Payment amount (₹)","amount",(owing/100).toFixed(2),"text",'required inputmode="decimal"')+
 '<div class="field"><label>Payment method</label><select name="mode"><option value="UPI">UPI</option><option value="CASH">Cash</option><option value="CARD">Card</option><option value="BANK">Bank transfer</option></select></div>'+
 '<div><button type="submit" class="btn">Record payment</button></div></form>':"")+
 '<p><a class="btn secondary" target="_blank" rel="noopener" href="/api/opd/entries/'+E(e.id)+'/bill/print">⎙ Print receipt</a></p></div>';
}
function followupForm(e){
 const f=e.followup;
 return '<div class="card"><h2>Follow-up plan</h2><form data-form="followup" class="form-grid">'+
 fld("Review date","dueDate",f?.dueDate||"","date","required")+fld("Reason / reminder note","notes",f?.notes||"","text")+
 '<div class="field"><button class="btn" type="submit">'+(f?"Update follow-up":"Schedule follow-up")+'</button></div></form>'+
 (f?'<p class="note success">Follow-up: '+E(f.dueDate)+' · '+E(f.status)+'</p>':"")+'</div>';
}
function entryView(){
 const e=S.entry;if(!e)return dashboard();
 const tabs=[["clinical","Clinical & vitals"],["rx","Prescription"],["billing","Billing"],["followup","Follow-up"]];
 const tabContent=S.tab==="clinical"?assessmentForm(e):S.tab==="rx"?rxForm(e):S.tab==="billing"?billingForm(e):followupForm(e);
 return sepTitle("OPD #"+e.queueNo,e.patient.name+" · "+e.patient.code+" · "+e.date)+
 '<div class="card"><div class="row space"><div><strong>'+E(e.patient.name)+'</strong>　'+badge(e.status)+'<div class="sub">'+E(e.reason||"General consultation")+'</div></div><div class="row">'+statActions(e)+'</div></div><div class="row" style="margin-top:14px">'+button("← Patient history","patient","secondary tiny",'data-id="'+E(e.patient.id)+'"')+(e.visitId?'<a href="/?visit='+E(e.visitId)+'" class="btn secondary tiny">🎙 AI Scribe</a>':"")+'</div></div>'+
 '<div class="tabs">'+tabs.map(x=>'<button data-act="tab" data-tab="'+x[0]+'" class="'+(S.tab===x[0]?"selected":"")+'">'+x[1]+'</button>').join("")+'</div>'+tabContent;
}
function followups(){
 return sepTitle("Follow-ups","Patients due for review, without automatic messaging.")+
 '<div class="card">'+(S.followups.length?'<div class="table-wrap"><table class="table"><thead><tr><th>Due date</th><th>Patient</th><th>Phone</th><th>Notes</th><th></th></tr></thead><tbody>'+
 S.followups.map(f=>'<tr><td><strong>'+E(f.dueDate)+'</strong></td><td>'+E(f.patient.name)+'</td><td>'+E(f.patient.phone||"—")+'</td><td>'+E(f.notes||"—")+'</td><td><div class="row">'+button("Open","entry","secondary tiny",'data-id="'+E(f.entryId)+'"')+button("Mark done","doneFollowup","tiny",'data-id="'+E(f.id)+'"')+'</div></td></tr>').join("")+
 '</tbody></table></div>':'<div class="empty">No follow-ups pending.</div>')+'</div>';
}
function reports(){
 const r=S.reports||{from:S.date,to:S.date,visits:{},payments:{},billedPaise:0};
 const collected=Object.values(r.payments||{}).reduce((s,x)=>s+Number(x||0),0);
 return sepTitle("Clinic reports","Daily and period-level OPD and collection summaries.")+
 '<div class="card"><form data-form="reports" class="row"><div class="field"><label>From</label><input type="date" name="from" value="'+E(r.from)+'"></div><div class="field"><label>To</label><input type="date" name="to" value="'+E(r.to)+'"></div><button type="submit" class="btn">Generate</button></form></div>'+
 '<div class="stats">'+[["Total entries",Object.values(r.visits||{}).reduce((s,x)=>s+Number(x||0),0)],["Completed",r.visits?.completed||0],["Billed",INR(r.billedPaise)],["Collected",INR(collected)],["Due (period)",INR(Math.max(0,r.billedPaise-collected))]].map(x=>'<div class="stat"><span>'+x[0]+'</span><strong>'+x[1]+'</strong></div>').join("")+'</div>'+
 '<div class="grid"><div class="card"><h2>Patient flow</h2>'+Object.entries(r.visits||{}).map(x=>'<p>'+badge(x[0])+'　<strong>'+x[1]+'</strong></p>').join("")+'</div><div class="card"><h2>Payments by mode</h2>'+Object.entries(r.payments||{}).map(x=>'<p>'+E(x[0])+'　<strong>'+INR(x[1])+'</strong></p>').join("")+'</div></div>'+
 '<div class="note">For management purposes only. Review reconciliations, exemptions and tax treatment separately with your accountant.</div>';
}
function settings(){
 const p=S.profile||{};
 return sepTitle("Clinic configuration","Required clinician identity for signing and printing prescriptions.")+
 '<div class="card"><form data-form="profile"><div class="form-grid">'+
 fld("Clinic name","clinicName",p.clinicName||"Durva Clinic")+
 fld("Doctor's full name","clinicianName",p.clinicianName,"text",'required')+
 fld("Medical registration number","registrationNumber",p.registrationNumber,"text",'required')+
 fld("Clinic telephone","phone",p.phone,"tel")+
 area("Clinic address","address",p.address,"full")+
 fld("Default consultation charge (₹)","consultationFee",p.consultationFee||"300","text",'inputmode="decimal"')+
 '</div><p class="mini">Only an appropriately registered clinician should sign prescriptions. The software does not certify clinical eligibility.</p><button type="submit" class="btn">Save clinic settings</button></form></div>';
}
function pageContent(){if(S.entry)return entryView();if(S.patient)return patientView();switch(S.page){case"dashboard":return dashboard();case"queue":return queue();case"patients":return patients();case"followups":return followups();case"reports":return reports();case"settings":return settings();default:return dashboard();}}
function render(){
 app.innerHTML='<div class="topbar">'+nav.map(x=>'<button data-act="page" data-page="'+x[0]+'" class="'+(S.page===x[0]?"active":"")+'">'+x[1]+' '+x[2]+'</button>').join("")+'</div>'+
 '<div class="shell"><aside class="sidebar"><div class="brand"><div class="mark">✚</div><div><b>Durva Clinic</b><small>General OPD Manager</small></div></div>'+
 nav.map(x=>'<button class="nav '+(S.page===x[0]?"active":"")+'" data-act="page" data-page="'+x[0]+'"><span class="nav-icon">'+x[1]+'</span>'+x[2]+'</button>').join("")+
 '<div class="sidebar-bottom">Private clinical records<br>Voice intake & AI scribe<br><a href="/">↗ Open consultation studio</a></div></aside><main>'+pageContent()+'</main></div>';
}
async function openPage(p){
 S.page=p;S.entry=null;S.patient=null;
 if(p==="dashboard"||p==="queue")await getOverview();
 if(p==="patients")await getPatients();
 if(p==="followups")S.followups=(await api("/api/opd/followups")).followups;
 if(p==="reports")S.reports=await api("/api/opd/reports?from="+S.date+"&to="+S.date);
 if(p==="settings")S.profile=(await api("/api/opd/profile")).profile;
 render();window.scrollTo(0,0);
}
async function getOverview(){S.overview=await api("/api/opd/overview?date="+encodeURIComponent(S.date));}
async function getPatients(){S.patients=(await api("/api/opd/patients?q="+encodeURIComponent(S.search))).patients;}
async function openPatient(id){
 const r=await api("/api/opd/patients/"+encodeURIComponent(id)+"/history");S.patient=r.patient;S.patientHistory=r.encounters;S.entry=null;S.page="patients";render();window.scrollTo(0,0);
}
async function openEntry(id){
 const r=await api("/api/opd/entries/"+encodeURIComponent(id));S.entry=r.entry;S.patient=null;S.tab="clinical";render();window.scrollTo(0,0);
}
function payload(form){return Object.fromEntries(new FormData(form));}
async function submitForm(form){
 const kind=form.dataset.form,p=payload(form);
 if(kind==="searchPatients"){S.search=p.q||"";await getPatients();render();}
 if(kind==="newEntry"){
  const isAppt=p.visitType==="appointment",time=p.appointmentAt||"";
  if(isAppt&&!time)throw Error("Select the appointment date and time");
  const r=await api("/api/opd/entries","POST",{patientId:S.patient.id,appointmentAt:isAppt?time:undefined,reason:p.reason});
  notice(isAppt?"Appointment booked":"Walk-in added to queue");await openEntry(r.entry.id);
 }
 if(kind==="assessment"){
  await api("/api/opd/entries/"+S.entry.id+"/assessment","PUT",p);
  notice("Vitals and clinical examination saved");await openEntry(S.entry.id);
 }
 if(kind==="prescription"){
  const meds=[...form.querySelectorAll(".medicine")].map(el=>{
   const o={};for(const field of el.querySelectorAll("[data-med-field]"))o[field.dataset.medField]=field.value;return o;
  }).filter(x=>x.name?.trim());
  await api("/api/opd/entries/"+S.entry.id+"/prescription","PUT",{diagnosis:p.diagnosis,advice:p.advice,investigations:p.investigations,medicines:meds});
  notice("Prescription draft saved. Clinician must sign.");const id=S.entry.id;await openEntry(id);S.tab="rx";render();
 }
 if(kind==="bill"){
  const items=[0,1,2].map(i=>({description:p["item"+i],price:p["price"+i],quantity:1})).filter(x=>x.description?.trim());
  const r=await api("/api/opd/entries/"+S.entry.id+"/bill","POST",{items});
  S.entry=r.entry;notice("Bill issued. Record payment if received.");render();
 }
 if(kind==="payment"){
  const r=await api("/api/opd/entries/"+S.entry.id+"/payment","POST",{amount:p.amount,mode:p.mode});
  S.entry=r.entry;notice("Payment recorded.");render();
 }
 if(kind==="followup"){
  const r=await api("/api/opd/entries/"+S.entry.id+"/followup","POST",{dueDate:p.dueDate,notes:p.notes});
  S.entry=r.entry;notice("Follow-up saved.");render();
 }
 if(kind==="reports"){S.reports=await api("/api/opd/reports?from="+encodeURIComponent(p.from)+"&to="+encodeURIComponent(p.to));render();}
 if(kind==="profile"){S.profile=(await api("/api/opd/profile","PUT",p)).profile;notice("Clinician and clinic details saved");render();}
}
async function doAction(el){
 const act=el.dataset.act,id=el.dataset.id;
 if(act==="page"||act==="patients"||act==="refresh"){await openPage(act==="page"?el.dataset.page:act==="patients"?"patients":S.page);return;}
 if(act==="patient"){await openPatient(id);return;}
 if(act==="entry"){await openEntry(id);return;}
 if(act==="tab"){S.tab=el.dataset.tab;render();return;}
 if(act==="status"){
  const status=el.dataset.status;if(["cancelled","no_show","completed"].includes(status)&&!confirm("Confirm status change to "+status+"?"))return;
  const r=await api("/api/opd/entries/"+S.entry.id+"/status","POST",{status});S.entry=r.entry;render();notice("Status updated to "+status);return;
 }
 if(act==="addMedicine"){
  const container=document.getElementById("medicineList");
  if(container.querySelectorAll(".medicine").length>=15)return notice("Maximum 15 medicines.");
  container.insertAdjacentHTML("beforeend",medicineRow({}));return;
 }
 if(act==="removeMedicine"){el.closest(".medicine")?.remove();return;}
 if(act==="signRx"){
  if(!S.entry.prescription||S.entry.prescription.signedAt)return notice("Save the prescription draft first.");
  if(!confirm("I am the treating clinician and have reviewed the patient, every medicine, dose, route, schedule and instruction. Sign and lock prescription?"))return;
  const r=await api("/api/opd/entries/"+S.entry.id+"/prescription/sign","POST",{reviewed:true});S.entry=r.entry;render();notice("Prescription signed and locked.");return;
 }
 if(act==="doneFollowup"){
  if(!confirm("Mark this follow-up completed?"))return;
  await api("/api/opd/followups/"+id+"/done","POST",{});S.followups=(await api("/api/opd/followups")).followups;render();notice("Follow-up completed.");return;
 }
}
document.addEventListener("click",event=>{
 const el=event.target.closest("[data-act]");if(!el||el.disabled)return;
 event.preventDefault();doWork(()=>doAction(el));
});
document.addEventListener("submit",event=>{
 const form=event.target.closest("form[data-form]");if(!form)return;
 event.preventDefault();doWork(()=>submitForm(form));
});
document.addEventListener("change",event=>{
 if(event.target.id==="queueDate"){S.date=event.target.value;doWork(()=>openPage(S.page));}
});
(async()=>{
 try{await api("/api/me");S.profile=(await api("/api/opd/profile")).profile;await openPage("dashboard");}
 catch(e){if(/sign in/i.test(e.message))window.location.replace("/");else{app.innerHTML='<div class="loading">Could not load clinic manager. <a href="/">Return to clinic login</a></div>';notice(e.message);}}
})();
