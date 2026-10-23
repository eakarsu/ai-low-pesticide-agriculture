// Wave 59A: field filter/export + deterministic offline agriculture insights + tasks helpers. No provider calls.
function filterFields(rows, { q = "", status = "", crop_type = "" } = {}) {
  const needle = String(q || "").trim().toLowerCase();
  return (rows || []).filter((r) => {
    if (status && String(r.status || "") !== status) return false;
    if (crop_type && String(r.crop_type || "") !== crop_type) return false;
    if (!needle) return true;
    return [r.name, r.location, r.crop_type, r.soil_type, r.status].join(" ").toLowerCase().includes(needle);
  });
}
function toCsv(rows, columns) {
  const esc = (v) => { if (v === null || v === undefined) return ""; const s = typeof v === "object" ? JSON.stringify(v) : String(v); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const head = columns.join(","); const body = (rows || []).map(r => columns.map(c => esc(r[c])).join(",")).join("\n"); return head + "\n" + body + (body ? "\n" : "");
}
const EXPORT_COLUMNS = ["id","name","location","crop_type","hectares","status","soil_type","health_score","created_at"];
function buildInsights(fields, detections, kind) {
  const rows = fields || []; const dets = detections || [];
  const low = rows.filter(f => Number(f.health_score ?? 0) < 60).length;
  const zero = rows.filter(f => Number(f.hectares || 0) === 0).length;
  const untreated = dets.filter(d => d.treated === false).length;
  const base = { aiGenerated:false, fallback:true, source:"deterministic-fallback", label:"Deterministic fallback (offline) — not AI-generated", kind, recordCount:rows.length };
  if (kind === "pest-risk") return { ...base, headline:"Low-pesticide agriculture — pest risk (deterministic fallback)", sections:[{label:"Fields in scope",value:rows.length,detail:`${rows.length} field(s).`},{label:"Low-health fields (<60)",value:low,detail:`${low} field(s) below 60.`},{label:"Untreated detections preserved (false)",value:untreated,detail:`${untreated} detection(s) with treated=false retained.`},{label:"Zero-hectare preserved",value:zero,detail:`${zero} field(s) with 0 hectares retained.`}], metrics:[{label:"Fields",value:rows.length},{label:"Low health",value:low},{label:"Untreated",value:untreated}], actions: untreated>0?["Scout untreated detections","Prefer biocontrol before chemical treatment"]:["Continue IPM monitoring"] };
  if (kind === "treatment-plan") return { ...base, headline:"Low-pesticide agriculture — treatment plan (deterministic fallback)", sections:[{label:"Fields in scope",value:rows.length,detail:`${rows.length} field(s).`},{label:"Has low-health fields",value:low>0,detail:low>0?`${low} field(s) need attention.`:"No low-health fields."},{label:"Empty result preserved",value:rows.length===0,detail:rows.length===0?"Empty set reported explicitly.":"Fields present."}], metrics:[{label:"Fields",value:rows.length},{label:"Low health",value:low}], actions: low>0?["Schedule targeted low-pesticide treatment for low-health fields"]:["No treatment action required"] };
  return { ...base, headline:"Low-pesticide agriculture — field health summary (deterministic fallback)", sections:[{label:"Fields in scope",value:rows.length,detail:`${rows.length} field(s) summarised.`},{label:"Low-health fields (<60)",value:low,detail:`${low} field(s) below threshold.`},{label:"Zero-hectare preserved",value:zero,detail:`Zero values preserved (count ${zero}).`},{label:"Detections reviewed",value:dets.length,detail:`${dets.length} detection(s); ${untreated} untreated.`}], metrics:[{label:"Fields",value:rows.length},{label:"Low health",value:low},{label:"Detections",value:dets.length}], actions:["Review low-health fields","Check untreated detections"] };
}
function parseTaskPriority(v){ return v==="LOW"||v==="HIGH"?v:"NORMAL"; }
function parseTaskStatus(v){ return v==="OPEN"||v==="DONE"||v==="CANCELLED"?v:null; }
module.exports = { filterFields, toCsv, EXPORT_COLUMNS, buildInsights, parseTaskPriority, parseTaskStatus };
