/* Single-screen clinician workflow: presentation only; all clinical actions require explicit review. */
(function(){
function view(s){
 const U=window.DurvaUI,{E,I,B,F,INR,chip,wrap}=U;
 const e=s.entry;if(!e)return wrap(s,'<div class="card">No active consultation.</div>');
 const v=s.visit||{},n={...(v.note||{}),...(s.noteDraft||{})},a=e.assessment||{},b=e.bill,rx=e.prescription,follow=e.followup,prof=s.profile||{},meds=s.meds||rx?.medicines||[];
 const signed=!!rx?.signedAt,locked=v.status==='approved';
 const header='<div class="visit-head"><div><div class="eyebrow">Consultation workspace · OPD #'+E(e.queueNo)+'</div><h1>'+E(e.patient?.name||'Patient')+'</h1><div class="mini">'+E(e.patient?.code||'')+' · '+E(e.patient?.age||'Age not entered')+' years · '+E(e.patient?.sex||'')+' · '+E(e.patient?.phone||'')+'</div></div><div class="row">'+chip(e.status)+B(I('back')+' Today','today','outline small')+'</div></div>'+
 (e.patient?.allergies?'<div class="note danger">Reported allergies: '+E(e.patient.allergies)+'</div>':'');
 const steps='<div class="timeline">'+[['01','Capture'],['02','Review'],['03','Prescribe'],['04','Finish']].map((x,i)=>'<div class="step '+(i===0||i===1&&v.note?.chiefComplaint||i===2&&signed||i===3&&e.status==='completed'?'done':'on')+'">'+x[0]+' · '+x[1]+'</div>').join('')+'</div>';
 const recording=s.rec?.state==='recording',processing=s.audioJob==='processing',ready=!!s.audio;
 const voice='<section class="card"><div class="section-head"><div class="row"><span class="section-no">1</span><h2>Listen & capture</h2></div><span class="chip">'+(v.consentAt?'Consent recorded':'Consent required')+'</span></div>'+
 '<div class="recorder '+(recording?'recording':'')+'"><span class="mic-icon">'+I('mic')+'</span><div style="flex:1"><strong>'+(recording?'Recording…':processing?'Sarvam is transcribing…':ready?'Recording ready':'One tap to document the visit')+'</strong><small>Speak naturally in Gujarati, Hindi, or English. The doctor reviews the result.</small></div>'+
 B(recording?I('stop')+' Stop':processing?I('clock')+' Check AI':ready?I('spark')+' Generate':I('mic')+' Record',recording?'stopAudio':processing?'pollAudio':ready?'sendAudio':'startAudio',recording?'danger':'primary small')+'</div>'+
 (!v.consentAt?'<label class="check"><input id="consult-consent" type="checkbox"> I confirm patient consent for this visit’s voice recording and AI transcription.</label>':'')+
 (v.transcript?'<details style="margin-top:12px"><summary class="tiny-label" style="cursor:pointer">View raw transcript</summary><p class="sub" style="white-space:pre-wrap;margin-top:12px">'+E(v.transcript.slice(0,12000))+'</p></details>':'')+'</section>';
 const noteFields=[['Chief complaint','chiefComplaint'],['History of present illness','historyOfPresentIllness'],['Assessment / provisional diagnosis','assessment'],['Plan / advice','plan']];
 const note='<section class="card"><div class="section-head"><div class="row"><span class="section-no">2</span><h2>Doctor’s review</h2></div>'+chip(locked?'completed':'draft')+'</div>'+
 '<p class="sub" style="margin:-6px 0 15px">AI drafts are suggestions only. Correct errors before saving and approving.</p>'+
 '<form id="noteForm" data-form="note"><div class="fields">'+noteFields.map(([label,key])=>F(label,key,n[key]||'',{textarea:true,wide:key==='historyOfPresentIllness'})).join('')+
 '<details class="wide"><summary class="tiny-label" style="cursor:pointer">More clinical fields</summary><div class="fields" style="margin-top:12px">'+[['Past history','pastHistory'],['Examination','examination'],['Medicines mentioned','medications'],['Follow-up / safety-netting','followUp'],['Points requiring verification','uncertainties']].map(([label,key])=>F(label,key,n[key]||'',{textarea:true})).join('')+'</div></details></div>'+
 '<div class="row" style="margin-top:13px">'+(locked?'<span class="note ok">Note approved and locked.</span>':'<button type="submit" class="btn outline small">Save clinical note</button>'+B(I('check')+' Approve reviewed note','approveNote','subtle small'))+'</div></form>'+
 '<hr class="hr"><div class="row between"><h3>Measured vitals</h3>'+B(s.showVitals?'Hide':'Add / edit','toggleVitals','ghost small')+'</div>'+
 (s.showVitals?'<form data-form="vitals" class="stack" style="margin-top:13px"><div class="compact">'+[['Systolic BP','systolic'],['Diastolic BP','diastolic'],['Pulse','pulse'],['SpO₂ %','spo2'],['Temp °C','tempC'],['Weight kg','weightKg'],['Height cm','heightCm'],['Glucose mg/dL','glucoseMgDl']].map(([l,k])=>F(l,k,a[k]??'',{type:'number',step:'any'})).join('')+'</div><button type="submit" class="btn outline small" style="justify-self:start">Save vitals</button></form>':'<p class="sub" style="margin:0">Expand only when observations are measured; never auto-fill vitals.</p>')+'</section>';
 const favoriteMeds=(s.favorites||[]).filter(x=>x.kind==='medicine');
 const medications='<section class="card"><div class="section-head"><div class="row"><span class="section-no">3</span><h2>Prescription</h2></div>'+chip(signed?'completed':'draft')+'</div>'+
 '<p class="sub">Only doctor-authored medicines and directions. No automatic drug selection.</p>'+
 (favoriteMeds.length&&!signed?'<div class="favorites">'+favoriteMeds.slice(0,8).map(m=>'<button type="button" class="fav" data-act="useFav" data-id="'+E(m.id)+'">+ '+E(m.label)+'</button>').join('')+'</div>':'')+
 '<div id="medicine-list">'+meds.map((m,i)=>medRow(m,i,signed)).join('')+'</div>'+
 (!meds.length&&!signed?'<p class="sub">No medicines added. Advice-only consultations are supported.</p>':'')+
 (!signed?'<div class="row">'+B(I('plus')+' Add medicine','addMed','outline small')+B('Save prescription draft','saveRx','subtle small')+'</div>':'<div class="note ok">Prescription signed and locked. Print and provide a doctor’s signature/stamp as appropriate.</div>')+
 '<div class="fields" style="margin-top:16px">'+F('Investigations','investigations',rx?.investigations||'',{textarea:true})+F('Additional advice','advice',rx?.advice||'',{textarea:true})+'</div>'+
 (signed?'<div class="row" style="margin-top:14px"><a href="/api/opd/entries/'+E(e.id)+'/prescription/print" target="_blank" rel="noopener" class="btn outline small">'+I('print')+' Print prescription</a></div>':
 '<label class="check"><input type="checkbox" id="rx-verified"> As the treating clinician, I have verified all medicines, doses, routes, frequency, duration and advice.</label><div class="row" style="margin-top:10px">'+B(I('check')+' Sign reviewed prescription','signRx','primary small')+'</div>')+
 '</section>';
 const fee=Number(prof.consultationFee||300),balance=b?b.totalPaise-b.paidPaise:0;
 const billMarkup=b?'<div class="summary-grid"><div class="summary-cell"><small>Billed</small><strong>'+INR(b.totalPaise)+'</strong></div><div class="summary-cell"><small>Outstanding</small><strong>'+INR(balance)+'</strong></div></div>'+
 (balance>0?'<form data-form="payment" class="row" style="margin-top:13px"><div class="field" style="max-width:140px"><label>Amount (₹)</label><input name="amount" inputmode="decimal" value="'+E((balance/100).toFixed(2))+'"></div><div class="field" style="max-width:145px"><label>Payment method</label><select name="mode"><option>UPI</option><option>CASH</option><option>CARD</option><option>BANK</option></select></div><button class="btn primary small" type="submit">Record payment</button></form>':'<div class="note ok">Fully paid</div>')+
 '<a href="/api/opd/entries/'+E(e.id)+'/bill/print" target="_blank" rel="noopener" class="btn ghost small" style="margin-top:10px">'+I('print')+' Print receipt</a>'
 :'<div class="row between"><p class="sub" style="margin:0">Default consultation fee</p><strong style="font-size:21px">'+INR(fee*100)+'</strong></div><div class="row" style="margin-top:11px">'+B('Create consultation bill','createBill','outline small')+'</div>';
 const followView='<div><h3>Review date</h3><p class="sub">Optional. Tap a shortcut or choose a date.</p><div class="segmented">'+[3,5,7,14].map(d=>'<button type="button" data-act="followDays" data-days="'+d+'" class="'+(s.followDays===d?'sel':'')+'">'+d+' days</button>').join('')+'</div><div class="fields" style="margin-top:12px">'+F('Follow-up date','followDate',s.followDate||follow?.dueDate||'',{type:'date'})+F('Reason','followNotes',s.followNotes||follow?.notes||'')+'</div><div class="row" style="margin-top:11px">'+B('Save follow-up','saveFollow','outline small')+'</div></div>';
 const finish='<section class="card"><div class="section-head"><div class="row"><span class="section-no">4</span><h2>Billing & follow-up</h2></div>'+chip(e.status)+'</div>'+
 billMarkup+'<hr class="hr">'+followView+'</section>';
 const footer='<div class="footer-flow"><div class="row"><span class="chip '+E(e.status)+'">'+E(e.status.replaceAll('_',' '))+'</span><span class="tiny-label">Save your work, then finish</span></div>'+
 (e.status==='completed'?B('Visit completed '+I('check'),'today','subtle'):B('Complete visit '+I('arrow'),'complete','primary'))+'</div>';
 return wrap(s,'<div class="visit-page">'+header+steps+'<div class="stack">'+voice+note+medications+finish+'</div>'+footer+'</div>');
}
function medRow(m,i,locked){
 const U=window.DurvaUI,{E,I,B}=U;
 const f=(label,key,value)=>'<div class="field"><label>'+label+'</label><input data-med="'+key+'" value="'+E(value||'')+'" '+(locked?'readonly':'')+' placeholder="'+label+'"></div>';
 return '<div class="med-row" data-medrow="'+i+'"><div class="row between"><span class="tiny-label">MEDICINE '+(i+1)+'</span>'+(!locked?B('Remove','removeMed','ghost small','data-index="'+i+'"'):'')+'</div><div class="med-grid">'+f('Medicine name','name',m.name)+f('Strength','strength',m.strength)+f('Route','route',m.route)+f('Frequency','frequency',m.frequency)+f('Duration','duration',m.duration)+'</div><div style="margin-top:10px">'+f('Additional instructions','instructions',m.instructions)+'</div></div>';
}
window.DurvaConsult={view,medRow};
})();