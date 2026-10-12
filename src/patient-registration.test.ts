import {expect,test} from "bun:test";
import {validateVoicePatient} from "./patient-registration";
test("valid Gujarati numeric input",()=>{
 const r=validateVoicePatient({name:"મીનાબેન પટેલ",age:"૫૨",phone:"૯૮૭૬૫૪૩૨૧૦",sex:"મહિલા",address:"ગુંદલાવ",allergies:""});
 expect(r.name).toBe("મીનાબેન પટેલ");expect(r.age).toBe("52");expect(r.phone).toBe("9876543210");expect(r.sex).toBe("Female");
});
test("valid Hindi numeric input",()=>{
 const r=validateVoicePatient({name:"रमेश शाह",age:"३५",phone:"९८७६५४३२१०",sex:"पुरुष"});
 expect(r.age).toBe("35");expect(r.phone).toBe("9876543210");expect(r.sex).toBe("Male");
});
test("international dial code is normalized without guesswork",()=>{
 const r=validateVoicePatient({name:"Patient",phone:"+91 98765 43210",age:"42"});
 expect(r.phone).toBe("9876543210");expect(r.age).toBe("42");
});
test("uncertain or wrong-length phone and age stay blank",()=>{
 expect(validateVoicePatient({name:"Patient",phone:"98765432",age:"a few years"}).phone).toBe("");
 expect(validateVoicePatient({name:"Patient",phone:"5555555555",age:"121"}).age).toBe("");
 expect(validateVoicePatient({name:"Patient",phone:"5555555555",age:"121"}).phone).toBe("");
});
test("patient sex not inferred from names",()=>{
 const r=validateVoicePatient({name:"Sita",sex:"",address:"Valsad"});
 expect(r.sex).toBe("");
});
test("remove control characters and truncate overly long fields",()=>{
 const r=validateVoicePatient({name:" Ana<\u0001> ",address:"a".repeat(450),allergies:"b".repeat(1200)});
 expect(r.name).toBe("Ana");expect(r.address.length).toBe(300);expect(r.allergies.length).toBe(800);
});
