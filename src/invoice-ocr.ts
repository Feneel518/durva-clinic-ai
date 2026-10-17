/* Offline supplier invoice extraction: Poppler text layer; Tesseract fallback on scans.
   This code never calls external services or infers medicine doses. */
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {mkdtemp,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";

const run=promisify(execFile),LIMIT_PAGES=15;
const scalar=(v,n=200)=>String(v??"").trim().slice(0,n);
const numeric=v=>{const n=Number(String(v??"").replace(/[,₹]/g,""));return Number.isFinite(n)&&n>=0&&n<1e8?n:0;};
const dateVal=v=>{
 const t=scalar(v,32),m=t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
 if(!m)return "";
 const a=Number(m[1]),b=Number(m[2]),year=Number(m[3])+(m[3].length===2?2000:0);
 if(a<1||a>31||b<1||b>12||year<2000||year>2100)return "";
 return String(year).padStart(4,"0")+"-"+String(b).padStart(2,"0")+"-"+String(a).padStart(2,"0");
};
const confidenceScore=(r)=>r.name&&r.pack&&r.quantityPacks&&r.amount?"medium":"low";
const explicitForm=name=>{
 if(/\b(?:TAB|TABLET|TABLETS)\b/i.test(name))return "Tablet";
 if(/\b(?:CAP|CAPSULE|CAPSULES)\b/i.test(name))return "Capsule";
 if(/\b(?:SYRUP|SYP)\b/i.test(name))return "Syrup";
 if(/\b(?:INJ|INJECTION)\b/i.test(name))return "Injection";
 if(/\b(?:CREAM|OINTMENT|GEL)\b/i.test(name))return "Topical";
 if(/\b(?:DROPS)\b/i.test(name))return "Drops";
 if(/\b(?:TEST|CARD)\b/i.test(name))return "Test card";
 return "";
};
const explicitStrength=name=>name.match(/(?:^|[^\w])(\d+(?:\.\d+)?\s*(?:MG|MCG|G|ML|IU|%))(?![A-Z])/i)?.[1]?.replace(/\s+/g,"")||"";
const emptyWarnings=["OCR/text extraction only; verify source invoice, medicine identity, batch, expiry and physical stock units."];
function parseFixedRow(line){
 const m=line.match(/^\s*(\d{1,3})\.\s+(.+)$/);
 if(!m)return null;
 const pieces=m[2].trim().split(/\s{2,}/).map(x=>x.trim()).filter(Boolean);
 let packIndex=pieces.findIndex((v,i)=>i>0&&/^\d+(?:\s*[x*×]\s*\d+){0,3}$/.test(v));
 if(packIndex<0)return null;
 const name=pieces.slice(0,packIndex).join(" ").trim(),pack=pieces[packIndex].replace(/\s/g,"");
 if(!name||name.length>135)return null;
 const rest=pieces.slice(packIndex+1);
 const gst=rest.findIndex(t=>/^\d{1,2}(?:\.\d+)?\s*%$/.test(t));
 if(gst<7)return null;
 // Standard MARG-style tail: qtyBox, qtyPcs, rate, discount, taxable amount, GST%, tax, gross
 const packs=numeric(rest[gst-5]),loose=numeric(rest[gst-4]),rate=numeric(rest[gst-3]),amount=numeric(rest[gst-1]);
 if(!packs&&!loose)return null;
 const prefix=rest.slice(0,gst-5); // manufacturer, HSN, MRP, batch, expiry
 const hsn=prefix.findIndex(x=>/^\d{4,8}$/.test(x));
 const manufacturer=hsn>0?prefix.slice(0,hsn).join(" "):"";
 const mrp=hsn>=0?numeric(prefix[hsn+1]):0;
 let remainder=hsn>=0?prefix.slice(hsn+2):prefix;
 let expiry="",batch="";
 const last=remainder.at(-1)||"";
 if(/^\d{1,2}[/-]\d{2,4}$/.test(last)){
  expiry=last.replace("-","/");batch=remainder.slice(0,-1).join(" ");
 }else{
  // In PDF text columns, narrow batch/expiry fields can concatenate.
  const match=last.match(/^(.*?)(\d{1,2}[/-]\d{2,4})$/);
  if(match&&match[1].length>=2){batch=remainder.slice(0,-1).concat(match[1]).join(" ");expiry=match[2].replace("-","/");}
  else batch=remainder.join(" ");
 }
 return {lineNo:Number(m[1]),name,pack,manufacturer,hsn:hsn<0?"":prefix[hsn],
  mrp,batch,expiry,quantityPacks:packs,quantityLoose:loose,unitsPerPack:0,
  purchaseRate:rate,amount,strength:explicitStrength(name),form:explicitForm(name),route:"",
  confidence:confidenceScore({name,pack,quantityPacks:packs,amount})};
}
function parseSimpleLine(line){
 // Fallback for generic invoices with simple whitespace-separated columns.
 const m=line.match(/^\s*(\d{1,3})[.)]\s+(.+?)\s{2,}(\d+(?:\s*[x*×]\s*\d+)*)\s{2,}(.+)$/);
 if(!m)return null;
 const trailing=m[4].split(/\s{2,}/).map(x=>x.trim()).filter(Boolean),name=m[2].trim();
 let expIndex=trailing.findIndex(x=>/^\d{1,2}[/-]\d{2,4}$/.test(x));
 if(expIndex<0)expIndex=trailing.findIndex(x=>/\d{1,2}[/-]\d{2,4}$/.test(x));
 const after=expIndex>=0?trailing.slice(expIndex+1):trailing;
 const qtyIdx=after.findIndex(x=>/^\d+(?:\.\d+)?$/.test(x));
 const qty=qtyIdx>=0?numeric(after[qtyIdx]):0;
 if(!qty)return null;
 const pack=m[3].replace(/\s/g,"");
 const date=expIndex>=0?trailing[expIndex].match(/(\d{1,2}[/-]\d{2,4})$/)?.[1]||"":"";
 return {lineNo:Number(m[1]),name,pack,batch:expIndex>0?trailing[expIndex-1]:"",expiry:date,
  quantityPacks:qty,quantityLoose:0,unitsPerPack:0,purchaseRate:0,mrp:0,amount:0,
  manufacturer:"",strength:explicitStrength(name),form:explicitForm(name),route:"",confidence:"low"};
}
export function invoiceFromText(text,{pages=1,wasOcr=false}={}){
 const doc=String(text||""),all=doc.split(/\r?\n/),first=all.slice(0,20);
 const seller=first.map(s=>s.trim()).find(s=>s.length>=5&&s.length<=100&&
   !/^(address|phone|GST|bill to|invoice|tax|total|original|state|D\.L|BANK)/i.test(s))||"";
 const inv=doc.match(/\b(?:Invoice|Bill)\s*(?:No\.?|Number|#)\s*[:.-]?\s*([A-Z0-9][\w/-]{2,35})/i);
 const rawDate=doc.match(/\b(?:invoice|bill)\s*(?:no\.?|number|#)?.{0,100}\bdate\s*[:.]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i)||
   doc.match(/\bDate\s*[:.]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i);
 const grand=doc.match(/\bGrand\s+Total\s*[\s:]*\r?\n\s*([\d,]+(?:\.\d{1,2})?)/i)||
   doc.match(/\bGrand\s+Total\s*[:₹ ]+([\d,]+(?:\.\d{1,2})?)/i)||
   doc.match(/\bAmount\s+(?:Payable|Due)\s*[:₹ ]+([\d,]+(?:\.\d{1,2})?)/i);
 const lines=[],seen=new Set(),warnings=[...emptyWarnings];
 for(const line of all){
  const row=parseFixedRow(line)||parseSimpleLine(line);
  if(!row)continue;
  // Item serials only; retain repeated product names when they are separate line numbers.
  if(seen.has(row.lineNo)){warnings.push("Repeated serial number "+row.lineNo+"; check that the invoice has no missing pages.");continue;}
  seen.add(row.lineNo);lines.push(row);
 }
 lines.sort((a,b)=>a.lineNo-b.lineNo);
 let expectedLineCount=Math.max(0,...lines.map(r=>r.lineNo));
 const headerSerial=(doc.match(/(?:^|\n)\s*(\d{1,3})\.\s+[A-Z][^\n]*$/gm)||[])
  .map(s=>Number(s.match(/\d+/)?.[0]||0)).filter(n=>n>0&&n<=180);
 if(headerSerial.length)expectedLineCount=Math.max(expectedLineCount,...headerSerial);
 if(!lines.length)warnings.push("Could not reliably identify medicine lines. Try an Excel export or a clearer PDF.");
 if(lines.length!==expectedLineCount)warnings.push("Identified "+lines.length+" of "+expectedLineCount+" numbered lines; missing rows require review.");
 if(wasOcr)warnings.push("Scanned pages used local Tesseract OCR; column alignment may be imperfect.");
 if(pages>1)warnings.push("Checked "+pages+" PDF pages; compare every line and invoice total before approval.");
 return {supplier:scalar(seller,160),invoiceNumber:inv?.[1]||"",invoiceDate:dateVal(rawDate?.[1]),
  invoiceTotal:grand?.[1]?.replace(/,/g,"")||"",expectedLineCount,warnings,lines};
}
const exec=async(cmd,args,timeout=15000)=>{
 const result=await run(cmd,args,{timeout,maxBuffer:5*1024*1024,encoding:"utf8",windowsHide:true});
 return result.stdout;
};
export async function readPdfInvoice(bytes){
 const dir=await mkdtemp(join(tmpdir(),"durva-invoice-"));
 const filepath=join(dir,"invoice.pdf");
 try{
  await writeFile(filepath,bytes,{mode:0o600});
  const info=await exec("pdfinfo",[filepath],10000);
  const pages=Number(info.match(/^Pages:\s*(\d+)/m)?.[1]||0);
  if(pages<1||pages>LIMIT_PAGES)throw Error("PDF invoices must contain between 1 and 15 pages.");
  let extracted="";
  try{extracted=await exec("pdftotext",["-layout","-enc","UTF-8",filepath,"-"],18000);}
  catch{ /* An image-only PDF may not have an embedded text layer. */ }
  const nativePages=extracted.split("\f"),sections=[],scanned=[];
  for(let i=1;i<=pages;i++){
   const content=nativePages[i-1]||"";
   // Some suppliers overlay a text header on a scanned table; require meaningful line data.
   if(content.length>150&&/^\s*\d{1,3}\s*[.)]\s+\S/m.test(content)){sections.push(content);continue;}
   const base=join(dir,"page-"+i);
   await exec("pdftoppm",["-f",String(i),"-l",String(i),"-singlefile","-gray","-scale-to","2100","-png",filepath,base],30000);
   const pageText=await exec("tesseract",[base+".png","stdout","-l","eng","--psm","6","-c","preserve_interword_spaces=1"],35000);
   scanned.push(i);sections.push(pageText);
  }
  return invoiceFromText(sections.join("\n"),{pages,wasOcr:scanned.length>0});
 }catch(e){
  if(e.code==="ENOENT")throw Error("Local OCR tools are not installed; contact the clinic administrator.");
  if(e.killed||e.code==="ETIMEDOUT")throw Error("OCR timed out. Upload a smaller or clearer PDF.");
  throw e;
 }finally{await rm(dir,{force:true,recursive:true});}
}
