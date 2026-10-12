import {randomUUID} from "node:crypto";

const statuses=["scheduled","waiting","in_consultation","completed","cancelled","no_show"];
const transitions={scheduled:["waiting","cancelled","no_show"],waiting:["in_consultation","cancelled"],in_consultation:["completed","waiting"],completed:[],cancelled:[],no_show:[]};
const validDate=s=>typeof s==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+"T00:00:00Z"));
export const todayIST=()=>new Date(Date.now()+19800000).toISOString().slice(0,10);
const int=(v,min,max)=>{if(v===""||v===null||v===undefined)return null;const n=Number(v);if(!Number.isFinite(n)||n<min||n>max)throw Error("Value outside permitted range");return n;};
const scrub=(v,max=800)=>String(v??"").trim().slice(0,max);
const obsFields={systolic:[60,280],diastolic:[30,180],pulse:[20,240],tempC:[30,45],spo2:[40,100],weightKg:[0.5,400],heightCm:[30,240],glucoseMgDl:[20,650],respRate:[5,75]};
const noteFields=["complaint","onset","history","pastHistory","familyHistory","allergies","examination","assessment","investigations","plan"];
export function normalizeAssessment(raw){
 const r={};for(const [k,[a,b]] of Object.entries(obsFields)){try{r[k]=int(raw?.[k],a,b);}catch{throw Error("Invalid "+k+" measurement");}}
 for(const k of noteFields)r[k]=scrub(raw?.[k],k==="plan"?2500:1400);
 if(r.systolic!==null&&r.diastolic!==null&&r.systolic<=r.diastolic)throw Error("Systolic BP must be above diastolic BP");
 return r;
}
export function normalizeRx(raw){
 const meds=Array.isArray(raw?.medicines)?raw.medicines:[];
 if(meds.length>15)throw Error("Maximum 15 medicines in one prescription");
 const rx={diagnosis:scrub(raw?.diagnosis,1800),advice:scrub(raw?.advice,2500),investigations:scrub(raw?.investigations,1800),
 medicines:meds.map(m=>({name:scrub(m?.name,160),strength:scrub(m?.strength,80),route:scrub(m?.route,80),frequency:scrub(m?.frequency,120),duration:scrub(m?.duration,120),instructions:scrub(m?.instructions,240)})).filter(m=>m.name)};
 if(rx.medicines.length===0&&!rx.advice&&!rx.investigations)throw Error("Enter medicine, advice, or investigations before saving a prescription");
 return rx;
}
export function pricePaise(v){
 const s=String(v??"").trim();
 if(!/^\d{1,7}(?:\.\d{1,2})?$/.test(s))throw Error("Invalid amount");
 const [rupees,dec=""]=s.split(".");return Number(rupees)*100+Number(dec.padEnd(2,"0"));
}
export async function ensureClinicSchema(sql){
 await sql.unsafe("CREATE TABLE IF NOT EXISTS clinic_opd_entries(id uuid PRIMARY KEY,patient_id uuid NOT NULL REFERENCES clinic_patients(id),visit_id uuid UNIQUE REFERENCES clinic_visits(id),queue_no bigint GENERATED ALWAYS AS IDENTITY UNIQUE,visit_date date NOT NULL,scheduled_at timestamptz,reason_enc text NOT NULL,status text NOT NULL DEFAULT 'waiting',created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),started_at timestamptz,completed_at timestamptz)");
 await sql.unsafe("CREATE INDEX IF NOT EXISTS clinic_opd_day_idx ON clinic_opd_entries(visit_date,status,created_at)");
 await sql.unsafe("CREATE INDEX IF NOT EXISTS clinic_opd_patient_idx ON clinic_opd_entries(patient_id,visit_date DESC)");
 await sql.unsafe("CREATE TABLE IF NOT EXISTS clinic_opd_assessments(entry_id uuid PRIMARY KEY REFERENCES clinic_opd_entries(id),data_enc text NOT NULL,updated_at timestamptz NOT NULL DEFAULT now())");
 await sql.unsafe("CREATE TABLE IF NOT EXISTS clinic_opd_prescriptions(entry_id uuid PRIMARY KEY REFERENCES clinic_opd_entries(id),data_enc text NOT NULL,signed_at timestamptz,signed_by uuid REFERENCES clinic_users(id),updated_at timestamptz NOT NULL DEFAULT now())");
 await sql.unsafe("CREATE TABLE IF NOT EXISTS clinic_opd_bills(id uuid PRIMARY KEY,entry_id uuid UNIQUE NOT NULL REFERENCES clinic_opd_entries(id),bill_no bigint GENERATED ALWAYS AS IDENTITY UNIQUE,items_enc text NOT NULL,total_paise bigint NOT NULL,issued_at timestamptz NOT NULL DEFAULT now())");
 await sql.unsafe("CREATE TABLE IF NOT EXISTS clinic_opd_payments(id uuid PRIMARY KEY,bill_id uuid NOT NULL REFERENCES clinic_opd_bills(id),amount_paise bigint NOT NULL,mode text NOT NULL,created_at timestamptz NOT NULL DEFAULT now())");
 await sql.unsafe("CREATE TABLE IF NOT EXISTS clinic_opd_followups(id uuid PRIMARY KEY,entry_id uuid UNIQUE NOT NULL REFERENCES clinic_opd_entries(id),due_date date NOT NULL,notes_enc text NOT NULL,status text NOT NULL DEFAULT 'pending',created_at timestamptz NOT NULL DEFAULT now())");
 await sql.unsafe("CREATE TABLE IF NOT EXISTS clinic_opd_profile(id integer PRIMARY KEY CHECK(id=1),data_enc text NOT NULL,updated_at timestamptz NOT NULL DEFAULT now())");
 await sql.unsafe("CREATE TABLE IF NOT EXISTS clinic_opd_audit(id uuid PRIMARY KEY,actor_id uuid NOT NULL REFERENCES clinic_users(id),action text NOT NULL,entity_id uuid,created_at timestamptz NOT NULL DEFAULT now())");
}
export async function clinicAPI({sql,req,url,user,pack,unpack,reply,err}){
 const method=req.method,path=url.pathname;
 const error=(msg,code=400)=>err(msg,code);
 const safe=async fn=>{try{return await fn();}catch(e){if(e?.message?.startsWith("Invalid")||e?.message?.startsWith("Enter")||e?.message?.startsWith("Maximum")||e?.message?.startsWith("Systolic")||e?.message?.startsWith("Value")||e?.message?.startsWith("Prescription"))return error(e.message);console.error("OPD request error",e?.name||"Error");return error("Unable to complete request",500);}};
 const json=()=>req.json().catch(()=>({}));
 const audit=async(action,id)=>{await sql.unsafe("INSERT INTO clinic_opd_audit(id,actor_id,action,entity_id) VALUES($1,$2,$3,$4)",[randomUUID(),user.id,action,id||null]);};
 const profile=async()=>{const r=await sql.unsafe("SELECT data_enc FROM clinic_opd_profile WHERE id=1");return r[0]?unpack(r[0].data_enc):{clinicName:"Durva Clinic",clinicianName:"",registrationNumber:"",address:"",phone:"",consultationFee:"300"};};
 const patient=async id=>{const r=await sql.unsafe("SELECT id,seq,data_enc FROM clinic_patients WHERE id=$1",[id]);return r[0]?{id:r[0].id,code:"DC-"+String(r[0].seq).padStart(5,"0"),...unpack(r[0].data_enc)}:null;};
 const entry=async id=>{const r=await sql.unsafe("SELECT * FROM clinic_opd_entries WHERE id=$1",[id]);return r[0]||null;};
 const light=r=>({id:r.id,patientId:r.patient_id,visitId:r.visit_id,queueNo:Number(r.queue_no),date:String(r.visit_date).slice(0,10),scheduledAt:r.scheduled_at,status:r.status,reason:unpack(r.reason_enc),createdAt:r.created_at});
 const full=async id=>{
  const e=await entry(id);if(!e)return null;
  const [a,rx,b,fu]=await Promise.all([
    sql.unsafe("SELECT * FROM clinic_opd_assessments WHERE entry_id=$1",[id]),
    sql.unsafe("SELECT * FROM clinic_opd_prescriptions WHERE entry_id=$1",[id]),
    sql.unsafe("SELECT * FROM clinic_opd_bills WHERE entry_id=$1",[id]),
    sql.unsafe("SELECT * FROM clinic_opd_followups WHERE entry_id=$1",[id])
  ]);
  let bill=null;
  if(b[0]){
   const pays=await sql.unsafe("SELECT amount_paise,mode,created_at FROM clinic_opd_payments WHERE bill_id=$1 ORDER BY created_at",[b[0].id]);
   bill={id:b[0].id,number:Number(b[0].bill_no),items:unpack(b[0].items_enc),totalPaise:Number(b[0].total_paise),paidPaise:pays.reduce((n,p)=>n+Number(p.amount_paise),0),payments:pays.map(p=>({amountPaise:Number(p.amount_paise),mode:p.mode,at:p.created_at}))};
  }
  return {...light(e),patient:await patient(e.patient_id),assessment:a[0]?unpack(a[0].data_enc):{},prescription:rx[0]?{...unpack(rx[0].data_enc),signedAt:rx[0].signed_at}:null,bill,followup:fu[0]?{id:fu[0].id,dueDate:String(fu[0].due_date).slice(0,10),notes:unpack(fu[0].notes_enc),status:fu[0].status}:null};
 };
 const htmlEscape=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const printHTML=(title,body)=>new Response('<!doctype html><html lang="en"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; form-action \'none\';"><title>'+htmlEscape(title)+'</title><style>body{font:15px Arial,sans-serif;max-width:790px;margin:30px auto;padding:24px;color:#262328}h1{color:#792342}h2{font-size:21px}table{border-collapse:collapse;width:100%;margin-top:20px}td,th{border:1px solid #bbb;padding:9px;text-align:left}th{background:#f6f1f2}section{margin-top:16px}footer{margin-top:65px;text-align:right}p{white-space:pre-wrap}@media print{body{margin:0;padding:6mm}}</style><body>'+body+'</body></html>',{headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store","X-Frame-Options":"DENY","Referrer-Policy":"no-referrer"}});
 if(method==="GET"&&path==="/api/opd/profile")return reply({profile:await profile()});
 if(method==="PUT"&&path==="/api/opd/profile")return safe(async()=>{
  const b=await json(),d={clinicName:scrub(b.clinicName,130)||"Durva Clinic",clinicianName:scrub(b.clinicianName,130),registrationNumber:scrub(b.registrationNumber,120),address:scrub(b.address,300),phone:scrub(b.phone,25),consultationFee:scrub(b.consultationFee,16)};
  if(d.consultationFee)pricePaise(d.consultationFee);
  await sql.unsafe("INSERT INTO clinic_opd_profile(id,data_enc) VALUES(1,$1) ON CONFLICT(id) DO UPDATE SET data_enc=EXCLUDED.data_enc,updated_at=now()",[pack(d)]);await audit("profile.updated");
  return reply({profile:d});
 });
 if(method==="GET"&&path==="/api/opd/overview")return safe(async()=>{
  const date=url.searchParams.get("date")||todayIST();if(!validDate(date))return error("Invalid date");
  const r=await sql.unsafe("SELECT e.*,p.seq,p.data_enc FROM clinic_opd_entries e JOIN clinic_patients p ON p.id=e.patient_id WHERE e.visit_date=$1 ORDER BY CASE e.status WHEN 'in_consultation' THEN 0 WHEN 'waiting' THEN 1 WHEN 'scheduled' THEN 2 ELSE 3 END,e.created_at DESC LIMIT 300",[date]);
  const entries=r.map(x=>({...light(x),patient:{name:unpack(x.data_enc).name,age:unpack(x.data_enc).age,phone:unpack(x.data_enc).phone,code:"DC-"+String(x.seq).padStart(5,"0")}}));
  const money=await sql.unsafe("SELECT COALESCE(SUM(p.amount_paise),0)::bigint AS collected FROM clinic_opd_payments p JOIN clinic_opd_bills b ON b.id=p.bill_id WHERE (p.created_at AT TIME ZONE 'Asia/Kolkata')::date=$1",[date]);
  return reply({date,entries,stats:{total:entries.length,waiting:entries.filter(x=>x.status==="waiting").length,active:entries.filter(x=>x.status==="in_consultation").length,completed:entries.filter(x=>x.status==="completed").length,collectedPaise:Number(money[0]?.collected||0)}});
 });
 if(method==="GET"&&path==="/api/opd/patients")return safe(async()=>{
  const q=scrub(url.searchParams.get("q"),60).toLowerCase();
  const r=await sql.unsafe("SELECT id,seq,data_enc,created_at FROM clinic_patients ORDER BY created_at DESC LIMIT 600");
  const patients=r.map(x=>({id:x.id,code:"DC-"+String(x.seq).padStart(5,"0"),...unpack(x.data_enc)})).filter(x=>!q||String(x.name||"").toLowerCase().includes(q)||String(x.phone||"").includes(q)||x.code.toLowerCase().includes(q)).slice(0,100);
  return reply({patients});
 });
 if(method==="GET"&&path==="/api/opd/followups")return safe(async()=>{
  const r=await sql.unsafe("SELECT f.*,e.patient_id,p.seq,p.data_enc FROM clinic_opd_followups f JOIN clinic_opd_entries e ON e.id=f.entry_id JOIN clinic_patients p ON p.id=e.patient_id WHERE f.status='pending' ORDER BY f.due_date ASC LIMIT 300");
  return reply({followups:r.map(x=>({id:x.id,entryId:x.entry_id,dueDate:String(x.due_date).slice(0,10),notes:unpack(x.notes_enc),patient:{id:x.patient_id,name:unpack(x.data_enc).name,phone:unpack(x.data_enc).phone,code:"DC-"+String(x.seq).padStart(5,"0")}}))});
 });
 if(method==="POST"&&path==="/api/opd/entries")return safe(async()=>{
  const b=await json(),p=await patient(b.patientId);if(!p)return error("Invalid patient",404);
  const appointment=!!b.appointmentAt;let scheduled=null,date=todayIST();
  if(appointment){const v=String(b.appointmentAt);if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)||!validDate(v.slice(0,10)))return error("Invalid appointment date/time");date=v.slice(0,10);const x=Date.parse(v+":00+05:30");if(Number.isNaN(x))return error("Invalid appointment time");scheduled=new Date(x).toISOString();}
  const id=randomUUID(),status=appointment?"scheduled":"waiting";
  const reason=scrub(b.reason,900);
  await sql.unsafe("INSERT INTO clinic_opd_entries(id,patient_id,visit_date,scheduled_at,reason_enc,status) VALUES($1,$2,$3,$4,$5,$6)",[id,p.id,date,scheduled,pack(reason),status]);
  await audit("entry.created",id);
  return reply({entry:await full(id)},201);
 });
 const detail=/^\/api\/opd\/entries\/([0-9a-f-]{36})$/.exec(path);
 if(method==="GET"&&detail)return safe(async()=>{const x=await full(detail[1]);return x?reply({entry:x}):error("Entry not found",404);});
 const history=/^\/api\/opd\/patients\/([0-9a-f-]{36})\/history$/.exec(path);
 if(method==="GET"&&history)return safe(async()=>{
  const p=await patient(history[1]);if(!p)return error("Patient not found",404);
  const r=await sql.unsafe("SELECT * FROM clinic_opd_entries WHERE patient_id=$1 ORDER BY visit_date DESC,created_at DESC LIMIT 100",[p.id]);
  return reply({patient:p,encounters:r.map(light)});
 });
 const status=/^\/api\/opd\/entries\/([0-9a-f-]{36})\/status$/.exec(path);
 if(method==="POST"&&status)return safe(async()=>{
  const b=await json(),e=await entry(status[1]);if(!e)return error("Entry not found",404);
  if(!statuses.includes(b.status)||!transitions[e.status]?.includes(b.status))return error("Invalid status transition");
  let visitId=e.visit_id;
  if(b.status==="in_consultation"&&!visitId){
   visitId=randomUUID();
   const blank={chiefComplaint:"",historyOfPresentIllness:"",pastHistory:"",examination:"",assessment:"",plan:"",medications:"",followUp:"",uncertainties:""};
   await sql.unsafe("INSERT INTO clinic_visits(id,patient_id,language,note_enc) VALUES($1,$2,$3,$4)",[visitId,e.patient_id,"Gujarati + Hindi + English",pack(blank)]);
  }
  await sql.unsafe("UPDATE clinic_opd_entries SET status=$1,visit_id=COALESCE(visit_id,$2),started_at=CASE WHEN $1='in_consultation' THEN now() ELSE started_at END,completed_at=CASE WHEN $1='completed' THEN now() ELSE completed_at END,updated_at=now() WHERE id=$3",[b.status,visitId]);
  await audit("entry.status."+b.status,e.id);return reply({entry:await full(e.id)});
 });
 const assess=/^\/api\/opd\/entries\/([0-9a-f-]{36})\/assessment$/.exec(path);
 if(method==="PUT"&&assess)return safe(async()=>{
  const e=await entry(assess[1]);if(!e)return error("Entry not found",404);if(["cancelled","no_show","completed"].includes(e.status))return error("Cannot edit this encounter");
  const values=normalizeAssessment(await json());
  await sql.unsafe("INSERT INTO clinic_opd_assessments(entry_id,data_enc) VALUES($1,$2) ON CONFLICT(entry_id) DO UPDATE SET data_enc=EXCLUDED.data_enc,updated_at=now()",[e.id,pack(values)]);
  await audit("assessment.saved",e.id);return reply({assessment:values});
 });
 const rx=/^\/api\/opd\/entries\/([0-9a-f-]{36})\/prescription$/.exec(path);
 if(method==="PUT"&&rx)return safe(async()=>{
  const e=await entry(rx[1]);if(!e)return error("Entry not found",404);if(["cancelled","no_show","completed"].includes(e.status))return error("Cannot edit this encounter");
  const prev=await sql.unsafe("SELECT signed_at FROM clinic_opd_prescriptions WHERE entry_id=$1",[e.id]);if(prev[0]?.signed_at)return error("Signed prescription is locked",409);
  const value=normalizeRx(await json());
  await sql.unsafe("INSERT INTO clinic_opd_prescriptions(entry_id,data_enc) VALUES($1,$2) ON CONFLICT(entry_id) DO UPDATE SET data_enc=EXCLUDED.data_enc,updated_at=now() WHERE clinic_opd_prescriptions.signed_at IS NULL",[e.id,pack(value)]);
  await audit("prescription.drafted",e.id);return reply({prescription:{...value,signedAt:null}});
 });
 const sign=/^\/api\/opd\/entries\/([0-9a-f-]{36})\/prescription\/sign$/.exec(path);
 if(method==="POST"&&sign)return safe(async()=>{
  const e=await entry(sign[1]);if(!e)return error("Entry not found",404);
  if(["cancelled","no_show"].includes(e.status))return error("Cannot sign for cancelled entry");
  const d=await profile();if(!d.clinicianName||!d.registrationNumber)return error("Configure clinician name and medical registration number in Settings before signing.");
  const b=await json();if(b.reviewed!==true)return error("Prescription requires clinician confirmation");
  const r=await sql.unsafe("UPDATE clinic_opd_prescriptions SET signed_at=now(),signed_by=$1 WHERE entry_id=$2 AND signed_at IS NULL RETURNING entry_id",[user.id,e.id]);
  if(!r.length)return error("Prescription missing or already signed",409);
  await audit("prescription.signed",e.id);return reply({entry:await full(e.id)});
 });
 const prescriptionPrint=/^\/api\/opd\/entries\/([0-9a-f-]{36})\/prescription\/print$/.exec(path);
 if(method==="GET"&&prescriptionPrint)return safe(async()=>{
  const d=await full(prescriptionPrint[1]);if(!d)return error("Entry not found",404);if(!d.prescription?.signedAt)return error("Prescription must be signed before printing",403);
  const pro=await profile(),r=d.prescription,esc=htmlEscape;
  const meds=r.medicines.map((m,i)=>'<tr><td>'+(i+1)+'</td><td>'+esc(m.name)+' '+esc(m.strength)+'</td><td>'+esc(m.route)+'</td><td>'+esc(m.frequency)+'</td><td>'+esc(m.duration)+'</td><td>'+esc(m.instructions)+'</td></tr>').join("");
  const body='<header><h1>'+esc(pro.clinicName)+'</h1><p>'+esc(pro.address)+' '+esc(pro.phone)+'</p><hr><strong>'+esc(pro.clinicianName)+'</strong> · Reg. '+esc(pro.registrationNumber)+'</header><section>Patient: '+esc(d.patient.name)+' · '+esc(d.patient.code)+' · Age: '+esc(d.patient.age)+' · Date: '+esc(d.date)+'</section><h2>Prescription</h2>'+(r.diagnosis?'<section><strong>Assessment:</strong> '+esc(r.diagnosis)+'</section>':'')+'<table><tr><th>#</th><th>Medicine</th><th>Route</th><th>Frequency</th><th>Duration</th><th>Instructions</th></tr>'+meds+'</table>'+(r.investigations?'<section><strong>Investigations:</strong><p>'+esc(r.investigations)+'</p></section>':'')+(r.advice?'<section><strong>Instructions:</strong><p>'+esc(r.advice)+'</p></section>':'')+'<footer>Reviewed and signed electronically by<br>'+esc(pro.clinicianName)+'<br>Registration '+esc(pro.registrationNumber)+'</footer>';
  return printHTML("Signed OPD Prescription",body);
 });
 const bill=/^\/api\/opd\/entries\/([0-9a-f-]{36})\/bill$/.exec(path);
 if(method==="POST"&&bill)return safe(async()=>{
  const e=await entry(bill[1]);if(!e)return error("Entry not found",404);if(e.status==="cancelled")return error("Cannot bill cancelled entry");
  const prev=await sql.unsafe("SELECT id FROM clinic_opd_bills WHERE entry_id=$1",[e.id]);if(prev.length)return error("Bill already exists",409);
  const b=await json(),items=Array.isArray(b.items)?b.items:[];
  if(items.length<1||items.length>20)return error("Enter 1–20 bill items");
  const rows=items.map(x=>({description:scrub(x?.description,160),quantity:int(x?.quantity,1,100),pricePaise:pricePaise(x?.price)}));
  if(rows.some(x=>!x.description||!Number.isInteger(x.quantity)))return error("Invalid bill description or quantity");
  const total=rows.reduce((sum,x)=>sum+x.quantity*x.pricePaise,0);
  if(total<1||total>100000000)return error("Invalid bill total");
  const id=randomUUID();await sql.unsafe("INSERT INTO clinic_opd_bills(id,entry_id,items_enc,total_paise) VALUES($1,$2,$3,$4)",[id,e.id,pack(rows),total]);
  await audit("bill.issued",e.id);return reply({entry:await full(e.id)},201);
 });
 const pay=/^\/api\/opd\/entries\/([0-9a-f-]{36})\/payment$/.exec(path);
 if(method==="POST"&&pay)return safe(async()=>{
  const e=await full(pay[1]);if(!e?.bill)return error("Bill not found",404);
  const b=await json(),mode=String(b.mode||"").toUpperCase();if(!["CASH","UPI","CARD","BANK"].includes(mode))return error("Invalid payment method");
  const amount=pricePaise(b.amount);
  if(amount<1||amount>e.bill.totalPaise-e.bill.paidPaise)return error("Payment exceeds outstanding balance");
  await sql.unsafe("INSERT INTO clinic_opd_payments(id,bill_id,amount_paise,mode) VALUES($1,$2,$3,$4)",[randomUUID(),e.bill.id,amount,mode]);
  await audit("bill.payment",e.id);return reply({entry:await full(e.id)});
 });
 const billPrint=/^\/api\/opd\/entries\/([0-9a-f-]{36})\/bill\/print$/.exec(path);
 if(method==="GET"&&billPrint)return safe(async()=>{
  const d=await full(billPrint[1]);if(!d?.bill)return error("Bill not found",404);
  const pro=await profile(),esc=htmlEscape,b=d.bill;
  const lines=b.items.map(x=>'<tr><td>'+esc(x.description)+'</td><td>'+x.quantity+'</td><td>₹'+(x.pricePaise/100).toFixed(2)+'</td><td>₹'+(x.quantity*x.pricePaise/100).toFixed(2)+'</td></tr>').join("");
  const body='<h1>'+esc(pro.clinicName)+'</h1><p>'+esc(pro.address)+' '+esc(pro.phone)+'</p><h2>Payment Receipt #'+b.number+'</h2><p>Patient: '+esc(d.patient.name)+' ('+esc(d.patient.code)+') · '+esc(d.date)+'</p><table><tr><th>Service</th><th>Qty</th><th>Rate</th><th>Amount</th></tr>'+lines+'</table><p><strong>Total: ₹'+(b.totalPaise/100).toFixed(2)+'</strong></p><p>Paid: ₹'+(b.paidPaise/100).toFixed(2)+' · Balance: ₹'+((b.totalPaise-b.paidPaise)/100).toFixed(2)+'</p><p>Payment modes: '+esc(b.payments.map(p=>p.mode).join(", ")||"Unpaid")+'</p><footer>Clinic receipt · For accounting records</footer>';
  return printHTML("Clinic Receipt",body);
 });
 const followup=/^\/api\/opd\/entries\/([0-9a-f-]{36})\/followup$/.exec(path);
 if(method==="POST"&&followup)return safe(async()=>{
  const e=await entry(followup[1]);if(!e)return error("Entry not found",404);
  const b=await json();if(!validDate(b.dueDate))return error("Invalid follow-up date");
  await sql.unsafe("INSERT INTO clinic_opd_followups(id,entry_id,due_date,notes_enc) VALUES($1,$2,$3,$4) ON CONFLICT(entry_id) DO UPDATE SET due_date=EXCLUDED.due_date,notes_enc=EXCLUDED.notes_enc,status='pending'",[randomUUID(),e.id,b.dueDate,pack(scrub(b.notes,600))]);
  await audit("followup.scheduled",e.id);return reply({entry:await full(e.id)});
 });
 const done=/^\/api\/opd\/followups\/([0-9a-f-]{36})\/done$/.exec(path);
 if(method==="POST"&&done)return safe(async()=>{
  const rows=await sql.unsafe("UPDATE clinic_opd_followups SET status='done' WHERE id=$1 AND status='pending' RETURNING entry_id",[done[1]]);
  if(!rows.length)return error("Follow-up not found",404);
  await audit("followup.completed",rows[0].entry_id);return reply({ok:true});
 });
 if(method==="GET"&&path==="/api/opd/reports")return safe(async()=>{
  const from=url.searchParams.get("from")||todayIST(),to=url.searchParams.get("to")||todayIST();
  if(!validDate(from)||!validDate(to)||from>to||Date.parse(to)-Date.parse(from)>366*86400000)return error("Invalid reporting period");
  const [visits,bills,payments]=await Promise.all([
    sql.unsafe("SELECT status,COUNT(*)::int AS n FROM clinic_opd_entries WHERE visit_date BETWEEN $1 AND $2 GROUP BY status",[from,to]),
    sql.unsafe("SELECT COALESCE(SUM(b.total_paise),0)::bigint AS billed FROM clinic_opd_bills b JOIN clinic_opd_entries e ON e.id=b.entry_id WHERE e.visit_date BETWEEN $1 AND $2",[from,to]),
    sql.unsafe("SELECT p.mode,COALESCE(SUM(p.amount_paise),0)::bigint AS paid FROM clinic_opd_payments p JOIN clinic_opd_bills b ON b.id=p.bill_id WHERE (p.created_at AT TIME ZONE 'Asia/Kolkata')::date BETWEEN $1 AND $2 GROUP BY p.mode",[from,to])
  ]);
  return reply({from,to,visits:Object.fromEntries(visits.map(x=>[x.status,x.n])),billedPaise:Number(bills[0].billed),payments:Object.fromEntries(payments.map(x=>[x.mode,Number(x.paid)]))});
 });
 return error("OPD API endpoint not found",404);
}
