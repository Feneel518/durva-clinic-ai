import {SQL} from "bun";
import "./provider-smoke";
const port=Number(Bun.env.PORT||3000);
let child=null,ready=false;
const base="http://127.0.0.1:"+port;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function check(path,status,includes,contentType){
 const r=await fetch(base+path,{signal:AbortSignal.timeout(7000)});
 if(r.status!==status)throw Error("Clinic test failed: "+path+" returned HTTP "+r.status+" instead of "+status);
 if(contentType&&!String(r.headers.get("content-type")||"").includes(contentType))throw Error("Unexpected response content type: "+path);
 if(includes){const body=await r.text();if(!body.includes(includes))throw Error("Clinic asset missing expected content: "+path);}
 console.log("Clinic route OK: "+path+" HTTP "+status);
}
try{
 child=Bun.spawn(["bun","run","src/main.ts"],{env:{...Bun.env,PORT:String(port)},stdout:"pipe",stderr:"pipe"});
 for(let i=0;i<36;i++){
  try{const r=await fetch(base+"/api/health",{signal:AbortSignal.timeout(1600)});if(r.status===200){ready=true;break;}}catch{}
  await sleep(1000);
 }
 if(!ready)throw Error("Clinic app failed to start and complete database migrations");
 await check("/api/health",200,"databaseReady", "application/json");
 await check("/clinic",200,"Durva","text/html");
 await check("/advanced",200,"Durva Clinic · OPD Management","text/html");
 await check("/legacy",200,"Durva Clinic","text/html");
 await check("/clinic.js",200,"Doctor","text/javascript");
 await check("/clinic.css",200,".sidebar","text/css");
 await check("/ui-preview",200,"Durva — Practice OS","text/html");
 await check("/ui.js",200,"newEncounter","text/javascript");
 await check("/ui-views.js",200,"Patient directory","text/javascript");
 await check("/ui-consult.js",200,"Single-screen clinician","text/javascript");
 await check("/ui.css",200,".app-layout","text/css");
 await check("/console",200,"Your everyday practice","text/html");
 await check("/console.js",200,"finishVisit","text/javascript");
 await check("/console.css",200,".hero-main","text/css");
 await check("/console-polish.css",200,".waiting-live","text/css");
 await check("/api/console/favorites",401,"Sign in required","application/json");
 await check("/api/opd/overview",401,"Sign in required","application/json");
 await check("/api/me",401,"Sign in required","application/json");
 await check("/",200,"Durva","text/html");
 const db=new SQL(Bun.env.DATABASE_URL,{max:2});
 try{
  const r=await db.unsafe("SELECT COUNT(*)::int AS n FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('clinic_opd_entries','clinic_opd_assessments','clinic_opd_prescriptions','clinic_opd_bills','clinic_opd_payments','clinic_opd_followups','clinic_opd_profile','clinic_opd_audit')");
  if(Number(r[0]?.n)!==8)throw Error("OPD database migrations incomplete");
  console.log("OPD schema OK: all eight tables present");
  const fav=await db.unsafe("SELECT COUNT(*)::int AS n FROM information_schema.tables WHERE table_schema=\'public\' AND table_name=\'clinic_console_preferences\'");
  if(Number(fav[0]?.n)!==1)throw Error("Console favorites schema incomplete");
  console.log("Console doctor preferences table verified.");
 }finally{await db.close();}
 console.log("Clinic production smoke tests completed without patient-data access.");
}finally{
 if(child){child.kill("SIGTERM");try{await child.exited;}catch{}}
}
