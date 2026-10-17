/* Durva invoice importer. Presentation only: all writes validated server-side. */
(()=>{
"use strict";
const E=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let draft=null,busy=false;
const root=()=>document.getElementById("durva-invoice-overlay");
const action=(label,cmd,kind="")=>'<button type="button" class="btn '+kind+'" data-invoice-action="'+cmd+'">'+label+'</button>';
const fld=(label,i,key,val,type="text")=>'<label class="import-field"><span>'+E(label)+'</span><input type="'+type+'" data-invoice-row="'+i+'" data-invoice-key="'+key+'" value="'+E(val)+'"></label>';
function dialog(){
 const el=root();if(!el)return;
 const inv=draft?.invoice;
 const inner=inv?'<div class="import-head"><div><div class="head-eyebrow">Supplier invoice</div><h2>Review medicines</h2><p>Confirm product identity, stock count, and expiry against the original before saving.</p></div>'+action("✕","close","white small")+'</div>'+
  '<div class="import-summary"><div><small>Supplier</small><strong>'+E(inv.supplier||"Unknown")+'</strong></div><div><small>Invoice</small><strong>'+E(inv.invoiceNumber||"Unknown")+'</strong></div><div><small>Extracted</small><strong>'+E(inv.extractedCount)+" / "+E(inv.expectedLineCount||"—")+'</strong></div><div><small>Total</small><strong>'+E(inv.invoiceTotal||"—")+'</strong></div></div>'+
  (inv.warnings?.length?'<div class="note warn">'+inv.warnings.map(E).join(" · ")+'</div>':"")+
  '<div class="import-batch-tools"><span>'+inv.lines.length+' items · unselected rows will be skipped</span>'+action("Back to upload","reset","white small")+'</div>'+
  '<div class="import-lines">'+inv.lines.map((x,i)=>'<details class="import-line" '+(i===0?'open':'')+'><summary><span class="import-num">'+E(x.lineNo)+'</span><span class="import-product"><strong>'+E(x.name||"Unnamed product")+'</strong><small>'+E(x.pack||"Unknown pack")+' · '+E(x.quantityUnits)+' units · '+E(x.expiry||"No expiry")+'</small></span>'+(x.existingId?'<span class="med-tag verified">Existing</span>':'<span class="med-tag">New</span>')+(x.issues?.length?'<span class="med-tag caution">'+x.issues.length+' checks</span>':"")+'</summary>'+
  '<div class="import-line-content"><div class="import-edit-grid">'+fld("Product name",i,"name",x.name)+fld("Strength *",i,"strength",x.strength)+fld("Form *",i,"form",x.form)+fld("Route *",i,"route",x.route)+fld("Stock quantity *",i,"quantityUnits",x.quantityUnits,"number")+fld("Original pack",i,"pack",x.pack)+fld("Batch",i,"batch",x.batch)+fld("Expiry MM/YY",i,"expiry",x.expiry)+'</div>'+
  '<p class="caption">Printed: '+E(x.quantityPacks)+' boxes · '+E(x.quantityLoose)+' loose · '+E(x.unitsPerPack)+' units/pack · rate ₹'+E(x.purchaseRate)+' · amount ₹'+E(x.amount)+'</p>'+
  (x.issues?.length?'<p class="import-issues">'+x.issues.map(E).join(" · ")+'</p>':"")+
  '<div class="import-checks"><label><input type="checkbox" data-invoice-row="'+i+'" data-invoice-key="included" '+(x.included?"checked":"")+'> Include</label><label><input type="checkbox" data-invoice-row="'+i+'" data-invoice-key="confirmed" '+(x.confirmed?"checked":"")+'> Verified against invoice</label></div></div></details>').join("")+'</div>'+
  '<div class="import-actions">'+action("Cancel","close","white")+action("Add verified medicines","commit")+'</div>':
  '<div class="import-head"><div><div class="head-eyebrow">Medicine inventory</div><h2>Import supplier invoice</h2><p>Works with different supplier layouts. AI extracts a draft for your review.</p></div>'+action("✕","close","white small")+'</div>'+
  '<div class="import-drop"><div class="import-symbol">↥</div><label for="durvaInvoiceFile">Choose PDF, Excel, or CSV</label><input type="file" id="durvaInvoiceFile" accept=".pdf,.xlsx,.csv"><p>Up to 15 MB · scanned PDFs supported</p></div>'+
  '<label class="import-consent"><input id="durvaInvoiceConsent" type="checkbox"> I agree to send the supplier invoice to an external AI service for extraction. I will check all fields before any stock changes.</label>'+
  '<div class="note warn" style="margin-top:12px">Strength, route and medicine identity must be verified by the clinician. Unknown existing stock must be reconciled before receiving purchases. Legacy .xls must be exported to .xlsx.</div>'+
  '<div class="import-actions">'+action("Cancel","close","white")+action("Extract invoice","upload")+'</div>';
 el.innerHTML='<section class="import-dialog" role="dialog" aria-modal="true" aria-label="Import medicine invoice">'+inner+'<p id="durvaInvoiceError" role="status"></p></section>';
}
function open(){
 if(root())return;
 const el=document.createElement("div");el.id="durva-invoice-overlay";el.className="import-overlay";document.body.appendChild(el);draft=null;dialog();
}
function error(message){const el=document.getElementById("durvaInvoiceError");if(el)el.textContent=String(message||"Try again.");}
function lock(yes){busy=yes;root()?.querySelectorAll("button").forEach(x=>x.disabled=yes);}
async function call(path,body,headers={}){
 const opts={method:"POST",credentials:"same-origin",cache:"no-store",headers:{"X-Clinic-Request":"1",...headers},body};
 if(!(body instanceof Blob)){opts.body=JSON.stringify(body);opts.headers["Content-Type"]="application/json";}
 else opts.headers["Content-Type"]=body.type||(body.name?.endsWith(".pdf")?"application/pdf":"application/octet-stream");
 const res=await fetch(path,opts),data=await res.json().catch(()=>({}));
 if(!res.ok)throw Error(data.error||"Invoice request failed ("+res.status+")");
 return data;
}
document.addEventListener("click",async e=>{
 const el=e.target.closest("[data-invoice-action]");if(!el)return;
 e.preventDefault();e.stopPropagation();if(busy)return;
 const cmd=el.dataset.invoiceAction;
 if(cmd==="open"){open();return;}
 if(cmd==="close"){root()?.remove();draft=null;return;}
 if(cmd==="reset"){draft=null;dialog();return;}
 lock(true);
 try{
  if(cmd==="upload"){
   const file=document.getElementById("durvaInvoiceFile")?.files?.[0];
   if(!file)throw Error("Select an invoice PDF, XLSX or CSV.");
   if(file.size>15*1024*1024)throw Error("Maximum file size is 15 MB.");
   if(!document.getElementById("durvaInvoiceConsent")?.checked)throw Error("Confirm consent for AI invoice processing.");
   draft=await call("/api/clinic/invoices/preview",file,{"X-Invoice-Filename":encodeURIComponent(file.name),"X-Invoice-AI-Consent":"confirmed"});
   dialog();
  }
  if(cmd==="commit"){
   const lines=draft?.invoice?.lines||[],selected=lines.filter(x=>x.included);
   if(!selected.length)throw Error("Select at least one item.");
   if(selected.some(x=>!x.confirmed))throw Error("Mark every included item as Verified.");
   if(selected.some(x=>!x.name?.trim()||!x.strength?.trim()||!x.form?.trim()||!x.route?.trim()||!Number.isSafeInteger(Number(x.quantityUnits))||Number(x.quantityUnits)<1))throw Error("Complete names, strengths, forms, routes and whole-number stock quantities.");
   if(!confirm("Add "+selected.length+" reviewed item lines to clinic stock? This purchase cannot be automatically undone."))return;
   const result=await call("/api/clinic/invoices/"+draft.id+"/commit",{reviewed:true,lines});
   root()?.remove();draft=null;alert(result.count+" medicine line(s) saved. The clinic inventory will refresh.");location.reload();
  }
 }catch(ex){error(ex.message||"Unexpected invoice error.");}
 finally{lock(false);}
});
document.addEventListener("input",e=>{
 const el=e.target;if(!el?.dataset||!Object.prototype.hasOwnProperty.call(el.dataset,"invoiceRow")||!draft)return;
 const row=draft.invoice.lines[Number(el.dataset.invoiceRow)];if(!row)return;
 row[el.dataset.invoiceKey]=el.type==="checkbox"?el.checked:el.value;
});
document.addEventListener("change",e=>{
 const el=e.target;if(!el?.dataset||!Object.prototype.hasOwnProperty.call(el.dataset,"invoiceRow")||!draft)return;
 const row=draft.invoice.lines[Number(el.dataset.invoiceRow)];if(row&&el.type==="checkbox")row[el.dataset.invoiceKey]=el.checked;
});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&root()&&!busy){root().remove();draft=null;}});
})();