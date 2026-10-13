import {randomUUID} from "node:crypto";

const clip=(v,n=160)=>String(v??"").trim().slice(0,n);
export const normalizeMedicineKey=v=>clip(v,190).normalize("NFKC").toLowerCase().replace(/[\s\-_.(),/]+/g,"");
export function validateCatalogItem(raw){
 const name=clip(raw?.name,130),strength=clip(raw?.strength,80),form=clip(raw?.form,65),route=clip(raw?.route,60);
 if(name.length<2||!strength||!form||!route)throw Error("Medicine name, strength, formulation and route are required");
 const aliases=[...new Set((Array.isArray(raw?.aliases)?raw.aliases:String(raw?.aliases||"").split(",")).map(x=>clip(x,130)).filter(Boolean))].slice(0,12);
 let stock=null;
 if(raw?.stock!==undefined&&raw?.stock!==null&&String(raw.stock).trim()!==""){
  if(!/^\d{1,7}$/.test(String(raw.stock)))throw Error("Stock must be a nonnegative whole number");stock=Number(raw.stock);
 }
 return {name,strength,form,route,aliases,stock,active:raw?.active!==false};
}
export function matchCatalogOrders(orders,catalog){
 const accepted=[],unmatched=[];
 const live=catalog.filter(x=>x.active!==false&&x.stock!==0);
 for(const raw of (Array.isArray(orders)?orders:[]).slice(0,15)){
  const spokenName=clip(raw?.spokenName,130),spokenStrength=clip(raw?.spokenStrength,80);
  const doctorOrdered=raw?.doctorOrdered===true&&raw?.uncertain!==true;
  if(!doctorOrdered){unmatched.push({spokenName,reason:"Doctor order or speaker unclear — review transcript"});continue;}
  const key=normalizeMedicineKey(spokenName);
  const candidates=live.filter(m=>([m.name,...(m.aliases||[])].some(v=>normalizeMedicineKey(v)===key))&&(!spokenStrength||normalizeMedicineKey(m.strength)===normalizeMedicineKey(spokenStrength)));
  if(candidates.length!==1){unmatched.push({spokenName,reason:candidates.length?"Ambiguous catalog match":"Not available in clinic catalog"});continue;}
  const m=candidates[0];
  const dose=clip(raw?.dose,90),frequency=clip(raw?.frequency,100),duration=clip(raw?.duration,90);
  const rawTokens=Array.isArray(raw?.timingTokens)?raw.timingTokens:[];
  const allowed=new Set(["morning","afternoon","evening","night","bedtime","as_needed"]);
  const timingTokens=[...new Set(rawTokens.map(t=>String(t||"").toLowerCase()).filter(t=>allowed.has(t)))].slice(0,6);
  const meal=String(raw?.mealTiming||"").toLowerCase();
  const mealTiming=["before_food","after_food","with_food","none"].includes(meal)?meal:"none";
  const item={catalogId:m.id,name:m.name,strength:m.strength,form:m.form,route:m.route,
    dose,frequency,duration,timingTokens,mealTiming,instructions:clip(raw?.instructions,220),
    reviewRequired:true,source:"doctor_spoken_draft",strengthSpoken:!!spokenStrength};
  // Incomplete directions stay in a review-only list instead of becoming a prescription line.
  if(!dose||!frequency||!duration){
   unmatched.push({spokenName,reason:"Incomplete spoken dose, frequency or duration",catalogId:m.id});
   continue;
  }
  accepted.push(item);
 }
 return {accepted,unmatched};
}
export async function ensureMedicineSchema(sql){
 await sql.unsafe("CREATE TABLE IF NOT EXISTS clinic_medicine_catalog(id uuid PRIMARY KEY,owner_id uuid NOT NULL REFERENCES clinic_users(id),data_enc text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now())");
 await sql.unsafe("CREATE INDEX IF NOT EXISTS clinic_medicine_owner_idx ON clinic_medicine_catalog(owner_id,created_at)");
 await sql.unsafe("CREATE TABLE IF NOT EXISTS clinic_voice_med_drafts(visit_id uuid PRIMARY KEY REFERENCES clinic_visits(id),data_enc text NOT NULL,created_at timestamptz NOT NULL DEFAULT now())");
}
export async function listCatalog(sql,unpack,owner){
 const rows=await sql.unsafe("SELECT id,data_enc FROM clinic_medicine_catalog WHERE owner_id=$1 ORDER BY created_at DESC LIMIT 300",[owner]);
 return rows.map(x=>({id:x.id,...unpack(x.data_enc)}));
}
export async function medicineAPI({sql,req,url,user,pack,unpack,reply,err}){
 const method=req.method,path=url.pathname;
 if(path==="/api/clinic/medicines"&&method==="GET")return reply({medicines:await listCatalog(sql,unpack,user.id)});
 if(path==="/api/clinic/medicines"&&method==="POST"){
  const b=await req.json().catch(()=>({}));let m;
  try{m=validateCatalogItem(b);}catch(e){return err(e.message,400);}
  const items=await listCatalog(sql,unpack,user.id),key=normalizeMedicineKey(m.name+" "+m.strength+" "+m.form);
  if(items.some(x=>normalizeMedicineKey(x.name+" "+x.strength+" "+x.form)===key))return err("That formulation already exists in your catalog",409);
  if(items.length>=300)return err("Catalog limit reached",400);
  const id=randomUUID();
  await sql.unsafe("INSERT INTO clinic_medicine_catalog(id,owner_id,data_enc) VALUES($1,$2,$3)",[id,user.id,pack(m)]);
  return reply({medicine:{id,...m}},201);
 }
 const hit=/^\/api\/clinic\/medicines\/([0-9a-f-]{36})$/.exec(path);
 if(hit&&method==="PUT"){
  const b=await req.json().catch(()=>({}));let m;
  try{m=validateCatalogItem(b);}catch(e){return err(e.message,400);}
  const r=await sql.unsafe("UPDATE clinic_medicine_catalog SET data_enc=$1,updated_at=now() WHERE id=$2 AND owner_id=$3 RETURNING id",[pack(m),hit[1],user.id]);
  return r.length?reply({medicine:{id:hit[1],...m}}):err("Medicine not found",404);
 }
 if(hit&&method==="DELETE"){
  // Soft delete preserves historical prescription references.
  const found=(await listCatalog(sql,unpack,user.id)).find(x=>x.id===hit[1]);if(!found)return err("Medicine not found",404);
  await sql.unsafe("UPDATE clinic_medicine_catalog SET data_enc=$1,updated_at=now() WHERE id=$2 AND owner_id=$3",[pack({...found,active:false}),hit[1],user.id]);
  return reply({ok:true});
 }
 return err("Medicine catalog endpoint not found",404);
}
export function validCatalogPrescription(meds,catalog){
 for(const med of meds){
  const m=catalog.find(x=>x.id===med.catalogId&&x.active!==false&&x.stock!==0);
  if(!m)throw Error("Prescription contains medicine outside the available clinic catalog");
  if(m.name!==med.name||m.strength!==med.strength||m.route!==med.route)throw Error("Prescription medicine does not match catalog formulation");
  if(!med.frequency||!med.duration||!med.dose)throw Error("Each medicine requires explicit dose, frequency and duration");
 }
 return true;
}
