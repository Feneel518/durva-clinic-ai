const key=Bun.env.SARVAM_API_KEY;
if(!key)throw Error("Sarvam API credential not configured");
async function check(path:string,body:any,label:string){
 const res=await fetch("https://api.sarvam.ai"+path,{method:"POST",headers:{"api-subscription-key":key,"Content-Type":"application/json"},body:JSON.stringify(body),signal:AbortSignal.timeout(40000)});
 if(!res.ok){console.error(label+" failed: HTTP "+res.status);throw Error(label+" unavailable");}
 const data=await res.json();
 console.log(label+": OK");
 return data;
}
const chat=await check("/v1/chat/completions",{model:"sarvam-105b",messages:[{role:"user",content:"Reply ONLY with the word READY."}],max_tokens:100,temperature:0},"Sarvam clinical-note model");
if(!chat?.choices?.[0]?.message?.content)throw Error("Sarvam chat response empty");
const job=await check("/speech-to-text/job/v1",{job_parameters:{model:"saaras:v4",mode:"transcribe",with_diarization:true,num_speakers:2}},"Sarvam transcription batch job creation");
if(!job?.job_id)throw Error("Sarvam transcription returned no job reference");
console.log("Sarvam API access verified using synthetic-only requests.");
