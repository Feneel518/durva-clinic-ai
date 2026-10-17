import {describe,test,expect} from "bun:test";
import {unitsFor,normalizeInvoice,tabularInvoiceRows} from "./invoice-import";
describe("Medicine invoice stock conversion",()=>{
 test("half box of 1000 is 500 tablets",()=>{
  expect(unitsFor({pack:"1*1000",quantityPacks:0.5,quantityLoose:0})).toEqual({per:1000,qty:500,exact:true});
 });
 test("20 strips of 10 is 200 tablets",()=>{
  expect(unitsFor({pack:"1*10",quantityPacks:20,quantityLoose:0})).toEqual({per:10,qty:200,exact:true});
 });
 test("individual test cards stay individual",()=>{
  expect(unitsFor({pack:"1",quantityPacks:5,quantityLoose:0})).toEqual({per:1,qty:5,exact:true});
 });
 test("loose units add to boxes",()=>{
  expect(unitsFor({pack:"1*10",quantityPacks:3,quantityLoose:2})).toEqual({per:10,qty:32,exact:true});
 });
 test("imprecise fractional tablet quantities must be flagged",()=>{
  expect(unitsFor({pack:"1*10",quantityPacks:0.25,quantityLoose:0}).exact).toBe(false);
 });
 test("unknown pack requires manual correction",()=>{
  const p=unitsFor({pack:"tablet",quantityPacks:3,quantityLoose:0,unitsPerPack:0});
  expect(p.qty).toBe(0);
 });
});
describe("Invoice draft preparation",()=>{
 test("does not invent strength or route",()=>{
  const d=normalizeInvoice({supplier:"Example",expectedLineCount:1,lines:[{
   lineNo:1,name:"Unknown tablets",pack:"1*1000",quantityPacks:0.5,quantityLoose:0,confidence:"medium"
  }]},[]);
  const row=d.lines[0];
  expect(row.name).toBe("Unknown tablets");
  expect(row.strength).toBe("");
  expect(row.route).toBe("");
  expect(row.quantityUnits).toBe(500);
  expect(row.confirmed).toBe(false);
  expect(row.issues).toContain("Strength missing");
  expect(row.issues).toContain("Route missing");
 });
 test("matches only identical medication strength and form",()=>{
  const cat=[{id:"stock-1",name:"Sample Med",strength:"250mg",form:"Tablet",route:"oral"}];
  const data=normalizeInvoice({lines:[{lineNo:1,name:"Sample Med",strength:"250mg",form:"Tablet",pack:"1*10",quantityPacks:1,confidence:"high"},{lineNo:2,name:"Sample Med",strength:"500mg",form:"Tablet",pack:"1*10",quantityPacks:1,confidence:"high"}]},cat);
  expect(data.lines[0].existingId).toBe("stock-1");
  expect(data.lines[1].existingId).toBe("");
 });
 test("preserves 29 separate supplier lines without inventing batch",()=>{
  const rows=Array.from({length:29},(_,i)=>({lineNo:i+1,name:"Item "+(i+1),pack:i===28?"1":i<20?"1*1000":"1*10",
   quantityPacks:i===28?5:i<20?0.5:12,quantityLoose:0,confidence:"high"}));
  const data=normalizeInvoice({expectedLineCount:29,lines:rows},[]);
  expect(data.extractedCount).toBe(29);
  expect(data.lines[0].quantityUnits).toBe(500);
  expect(data.lines[25].quantityUnits).toBe(120);
  expect(data.lines[28].quantityUnits).toBe(5);
  expect(data.lines.every(x=>x.batch==="")).toBe(true);
 });
});
describe("Invoice extraction compatibility",()=>{
 test("generic spreadsheet with Item Name and Qty columns",()=>{
  const result=tabularInvoiceRows([
   ["MEHTA MEDICAL AGENCIES"],["Item Name","Pack","Batch","Exp","Qty","Rate","Amount"],
   ["PARACETAMOL ROUND","1*1000","A123","05/29",0.50,410,205],
   ["SPASMODIC MF STRIP","1*10","B234","04/29",20,7,140],
   ["Grand Total","","","",0,0,345]
  ]);
  expect(result.lines).toHaveLength(2);
  expect(result.lines[0].name).toBe("PARACETAMOL ROUND");
  expect(result.lines[0].quantityPacks).toBe(.5);
  expect(normalizeInvoice(result).lines[0].quantityUnits).toBe(500);
  expect(normalizeInvoice(result).lines[1].quantityUnits).toBe(200);
 });
 test("unstructured spreadsheets are never silently imported",()=>{
  expect(tabularInvoiceRows([["Hello"],["unknown","6"]])).toBeNull();
 });

});
