import {randomUUID} from "node:crypto";
const clean=(v,max=200)=>String(v??"").trim().slice(0,max);
export function normalizeFavorites(data){
 const favs=Array.isArray(data?.medicines)?data.medicines:[];
 if(favs.length>24)throw Error("Maximum 24 medicine favorites");
 const meds=favs.map(x=>({
  name:clean(x?.name,120),strength:clean(x?.strength,70),route:clean(x?.route,60),
  frequency:clean(x?.frequency,100),duration:clean(x?.duration,90),instructions:clean(x?.instructions,200)
 })).filter(x=>x.name);
 const text=Array.isArray(data?.complaints)?data.complaints:[];
 if(text.length>24)throw Error("Maximum 24 complaint shortcuts");
 const complaints=[...new Set(text.map(x=>clean(x,100)).filter(Boolean))];
 return {medicines:meds,complaints};
}
export async function ensureConsoleSchema(sql){
 await sql.unsafe("CREATE TABLE IF NOT EXISTS clinic_console_preferences(user_id uuid PRIMARY KEY REFERENCES clinic_users(id),data_enc text NOT NULL,updated_at timestamptz NOT NULL DEFAULT now())");
}
export async function consoleApi({sql,req,user,pack,unpack,reply,err}){
 if(req.method==="GET"){
  const result=await sql.unsafe("SELECT data_enc FROM clinic_console_preferences WHERE user_id=$1",[user.id]);
  return reply({favorites:result[0]?unpack(result[0].data_enc):{medicines:[],complaints:[]}});
 }
 if(req.method==="PUT"){
  const body=await req.json().catch(()=>({}));let next;
  try{next=normalizeFavorites(body);}catch(e){return err(e.message,400);}
  await sql.unsafe("INSERT INTO clinic_console_preferences(user_id,data_enc) VALUES($1,$2) ON CONFLICT (user_id) DO UPDATE SET data_enc=EXCLUDED.data_enc,updated_at=now()",[user.id,pack(next)]);
  return reply({favorites:next});
 }
 return err("Method not supported",405);
}
