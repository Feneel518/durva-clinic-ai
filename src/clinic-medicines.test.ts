import {test,expect} from "bun:test";
import {validateCatalogItem,normalizeMedicineKey,matchCatalogOrders,validCatalogPrescription} from "./clinic-medicines";
const catalog=[
{id:"11111111-1111-4111-8111-111111111111",name:"DemoMed",strength:"500 mg",form:"tablet",route:"oral",aliases:["ડેમો મેડ","Demo Med"],active:true,stock:10},
{id:"22222222-2222-4222-8222-222222222222",name:"DemoMed",strength:"650 mg",form:"tablet",route:"oral",aliases:[],active:true,stock:10},
{id:"33333333-3333-4333-8333-333333333333",name:"OutOfStock",strength:"10 mg",form:"tablet",route:"oral",aliases:[],active:true,stock:0}
];
const order={spokenName:"ડેમો મેડ",spokenStrength:"500 mg",doctorOrdered:true,uncertain:false,dose:"one tablet",frequency:"twice daily",duration:"3 days",timingTokens:["morning","night"],mealTiming:"after_food"};
test("catalog normalizes Indic aliases without changing identity",()=>{expect(normalizeMedicineKey("Demo-Med")).toBe("demomed");expect(normalizeMedicineKey("ડેમો મેડ")).toBe("ડેમોમેડ");});
test("voice can only draft a unique in-stock catalog medicine",()=>{
 const r=matchCatalogOrders([order],catalog);expect(r.accepted.length).toBe(1);
 expect(r.accepted[0].catalogId).toBe(catalog[0].id);
 expect(r.accepted[0].dose).toBe("one tablet");
 expect(r.accepted[0].timingTokens).toEqual(["morning","night"]);
 expect(r.accepted[0].reviewRequired).toBe(true);
});
test("reject hallucinated or unavailable medicines",()=>{
 const r=matchCatalogOrders([{...order,spokenName:"FakeMedicine"},{...order,spokenName:"OutOfStock",spokenStrength:"10 mg"}],catalog);
 expect(r.accepted.length).toBe(0);expect(r.unmatched.length).toBe(2);
});
test("reject speaker ambiguity even with an exact name",()=>{
 const r=matchCatalogOrders([{...order,doctorOrdered:false},{...order,uncertain:true}],catalog);
 expect(r.accepted.length).toBe(0);
});
test("same name with two strengths is ambiguous without spoken strength",()=>{
 const r=matchCatalogOrders([{...order,spokenName:"DemoMed",spokenStrength:""}],catalog);
 expect(r.accepted.length).toBe(0);expect(r.unmatched[0].reason).toContain("Ambiguous");
});
test("incomplete dose or frequency never auto-adds a prescription",()=>{
 const r=matchCatalogOrders([{...order,dose:""},{...order,frequency:""}],catalog);
 expect(r.accepted.length).toBe(0);
});
test("cannot save a prescription with a medicine outside catalog",()=>{
 expect(()=>validCatalogPrescription([{...order,catalogId:"not-valid",name:"Fake",strength:"1mg",route:"oral"}],catalog)).toThrow();
});
test("cannot change strength or route of a catalog medicine at prescription save",()=>{
 const med={catalogId:catalog[0].id,name:"DemoMed",strength:"700 mg",route:"oral",dose:"one tablet",frequency:"once daily",duration:"3 days"};
 expect(()=>validCatalogPrescription([med],catalog)).toThrow();
});
test("catalog input rejects missing formulation",()=>expect(()=>validateCatalogItem({name:"Drug",strength:"1 mg",route:"oral"})).toThrow());
test("stock is optional, strict when present",()=>{
 expect(validateCatalogItem({name:"Drug",strength:"5 mg",route:"oral",form:"tablet"}).stock).toBe(null);
 expect(()=>validateCatalogItem({name:"Drug",strength:"5 mg",route:"oral",form:"tablet",stock:"-2"})).toThrow();
});
