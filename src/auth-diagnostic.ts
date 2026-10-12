import { SQL } from "bun";
const env=Bun.env;
if(!env.DATABASE_URL)throw Error("DATABASE_URL missing");
const db=new SQL(env.DATABASE_URL,{max:2});
try{
const rows=await db.unsafe("SELECT email,password_hash FROM clinic_users LIMIT 10");
const configured=String(env.BOOTSTRAP_EMAIL||"doctor@durvaclinic.local").trim().toLowerCase();
const supplied=String(env.BOOTSTRAP_PASSWORD||"");
const matching=rows.find(r=>r.email.toLowerCase()===configured);
let verified=false;
if(matching&&supplied)try{verified=await Bun.password.verify(supplied,matching.password_hash)}catch(e){console.log("AUTH_DIAGNOSTIC hash verification error",String(e?.message||e).slice(0,100))}
console.log("AUTH_DIAGNOSTIC",JSON.stringify({accountCount:rows.length,configuredEmail:configured,defaultEmailMatchesConfigured:configured==="doctor@durvaclinic.local",configuredEmailExists:!!matching,configuredPasswordMatches:verified}));
}finally{await db.close();}
