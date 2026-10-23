const test = require('node:test');
const assert = require('node:assert/strict');
delete process.env.OPENROUTER_API_KEY; delete process.env.OPENAI_API_KEY;
const { filterFields, toCsv, buildInsights, parseTaskPriority, parseTaskStatus } = require('../wave59a.cjs');
const rows=[{name:"North Field",location:"A",crop_type:"Wheat",status:"active",health_score:40,hectares:0},{name:"South Field",location:"B",crop_type:"Corn",status:"fallow",health_score:90,hectares:5}];
test("filterFields search/filter",()=>{ assert.equal(filterFields(rows,{q:"north"}).length,1); assert.equal(filterFields(rows,{status:"fallow"}).length,1); assert.equal(filterFields(rows,{})[0].hectares,0); });
test("toCsv header on empty + tasks parsers",()=>{ assert.equal(toCsv([],["a","b"]),"a,b\n"); assert.equal(parseTaskPriority("HIGH"),"HIGH"); assert.equal(parseTaskPriority("x"),"NORMAL"); assert.equal(parseTaskStatus("DONE"),"DONE"); assert.equal(parseTaskStatus("X"),null); });
test("buildInsights fallback preserves false/0/empty",()=>{ const r=buildInsights(rows,[{treated:false}],"pest-risk"); assert.equal(r.aiGenerated,false); assert.equal(r.sections.find(s=>s.label.startsWith("Untreated")).value,1); const e=buildInsights([],[],"treatment-plan"); assert.equal(e.sections.find(s=>s.label==="Empty result preserved").value,true); });
