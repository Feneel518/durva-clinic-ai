import {test,expect} from "bun:test";
globalThis.window=globalThis;
await import("./unified-views.js");
await import("./unified-consult.js");
const U=globalThis.DurvaUI,C=globalThis.DurvaConsult;
const base={page:"today",user:{email:"doctor@example.com"},profile:{clinicianName:"Dr Test",consultationFee:"300"},overview:{entries:[],stats:{total:0,waiting:0,active:0,collectedPaise:0}},followups:[],patients:[],favorites:[],day:"2026-10-12",voice:{status:"idle"},reg:{},register:false,search:""};
test("premium Today dashboard renders new consultation",()=>{
 const html=U.today(base);
 expect(html).toContain("Five-minute clinic mode");
 expect(html).toContain('data-act="find"');
 expect(html).toContain("Today’s queue");
 expect(html).toContain("Doctor");
});
test("patient directory has keyboard-search and voice intake",()=>{
 const html=U.search({...base,page:"patients",patients:[{id:"e",name:"Mina",code:"DC-001",phone:"9876543210",age:"52"}]});
 expect(html).toContain('id="search-input"');
 expect(html).toContain("Voice registration");
 expect(html).toContain("9876543210");
});
test("malicious patient name is escaped in cards",()=>{
 const html=U.search({...base,patients:[{id:"x",name:'<img src=x onerror="alert(1)">',code:"DC-1"}]});
 expect(html).not.toContain("<img src=x");
 expect(html).toContain("&lt;img");
});
test("voice intake contains explicit consent and verification",()=>{
 const html=U.register({...base,register:true,voice:{status:"idle",consent:false}});
 expect(html).toContain('id="voice-consent"');
 expect(html).toContain('name="verified"');
 expect(html).toContain("Save &amp; start consultation".replace("&amp;","&"));
});
const encounter={id:"11111111-2222-3333-4444-555555555555",queueNo:3,patient:{id:"22222222-2222-3333-4444-555555555555",name:"Fictional Patient",code:"DC-999",age:"35",phone:"9999999999"},status:"in_consultation",visitId:"33333333-2222-3333-4444-555555555555",bill:null,prescription:null,assessment:{},followup:null};
const consult={...base,page:"consult",entry:encounter,visit:{status:"draft",consentAt:null,version:1,note:{chiefComplaint:"Test complaint"}},noteDraft:{},meds:[],audio:null,audioJob:"idle",showVitals:false};
test("single-screen consultation has four stages",()=>{
 const html=C.view(consult);
 expect(html).toContain("Listen &amp; capture".replace("&amp;","&"));
 expect(html).toContain("Doctor’s review");
 expect(html).toContain("Prescription");
 expect(html).toContain("Billing &amp; follow-up".replace("&amp;","&"));
 expect(html).toContain("Complete visit");
});
test("prescription cannot be mistaken for auto signed",()=>{
 const html=C.view(consult);
 expect(html).toContain('id="rx-verified"');
 expect(html).toContain("Sign reviewed prescription");
 expect(html).toContain("No automatic drug selection");
});
