import {describe,test,expect} from "bun:test";
import {todayIST,normalizeAssessment,normalizeRx,pricePaise} from "./clinic-system";
describe("Clinical input validation",()=>{
 test("local date follows India calendar",{timeout:5000},()=>{expect(todayIST()).toMatch(/^\d{4}-\d{2}-\d{2}$/);});
 test("accepts measured vitals without inventing unknown values",()=>{
  const x=normalizeAssessment({systolic:"120",diastolic:"80",pulse:"72",tempC:"36.7",spo2:"99",complaint:"Fever"});
  expect(x.systolic).toBe(120);expect(x.diastolic).toBe(80);expect(x.tempC).toBe(36.7);expect(x.weightKg).toBe(null);expect(x.complaint).toBe("Fever");
 });
 test("rejects inverted blood pressure",()=>expect(()=>normalizeAssessment({systolic:80,diastolic:120})).toThrow());
 test("rejects dangerously invalid vitals",()=>{
  expect(()=>normalizeAssessment({spo2:"200"})).toThrow();
  expect(()=>normalizeAssessment({pulse:"abc"})).toThrow();
 });
 test("medicines must be explicitly named",()=>{
  const x=normalizeRx({diagnosis:"",medicines:[{name:"",strength:"500"},{name:"Doctor entered medicine",frequency:"once daily"}]});
  expect(x.medicines.length).toBe(1);expect(x.medicines[0].name).toBe("Doctor entered medicine");
 });
 test("empty prescription rejected",()=>expect(()=>normalizeRx({})).toThrow());
 test("bill money parses paise exactly",()=>{
  expect(pricePaise("300")).toBe(30000);
  expect(pricePaise("299.50")).toBe(29950);
  expect(pricePaise("0.05")).toBe(5);
 });
 test("negative and overly precise money rejected",()=>{
  expect(()=>pricePaise("-1")).toThrow();
  expect(()=>pricePaise("2.999")).toThrow();
 });
});
