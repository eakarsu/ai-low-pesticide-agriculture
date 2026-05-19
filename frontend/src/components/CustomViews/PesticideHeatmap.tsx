import { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';

type Cell = { pest: string; pressure: number; level: string };
type Row = { field: string; cells: Cell[]; total: number };
type Resp = {
  unit: string;
  fields: string[];
  pests: string[];
  rows: Row[];
  summary: { peak: number; average: number; hot_fields: string[]; action_threshold: number };
};

function colorFor(v: number) {
  const t = Math.min(1, v / 100);
  const r = Math.round(34 + (220 - 34) * t);
  const g = Math.round(197 - (197 - 38) * t);
  const b = Math.round(94 - (94 - 38) * t);
  return `rgb(${r},${g},${b})`;
}

export default function PesticideHeatmap() {
  const [data, setData] = useState<Resp | null>(null);
  const [err, setErr] = useState<string>('');

  useEffect(() => {
    fetch('/api/custom-views/pest-pressure-heatmap', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
    })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(setData)
      .catch(e => setErr(e.message));
  }, []);

  if (err) return <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm">Error: {err}</div>;
  if (!data) return <div className="p-4 bg-white rounded-lg border border-gray-200">Loading heatmap...</div>;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5" data-testid="pest-pressure-heatmap">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-rose-600" />
          <h3 className="font-semibold text-gray-900">Pest-Pressure Field Heatmap</h3>
        </div>
        <span className="text-xs text-gray-500">{data.unit}</span>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4 text-center">
        <div className="bg-rose-50 p-2 rounded">
          <div className="text-[10px] text-rose-700 uppercase">Peak</div>
          <div className="text-base font-bold text-rose-900">{data.summary.peak}</div>
        </div>
        <div className="bg-amber-50 p-2 rounded">
          <div className="text-[10px] text-amber-700 uppercase">Avg</div>
          <div className="text-base font-bold text-amber-900">{data.summary.average}</div>
        </div>
        <div className="bg-emerald-50 p-2 rounded">
          <div className="text-[10px] text-emerald-700 uppercase">Threshold</div>
          <div className="text-base font-bold text-emerald-900">{data.summary.action_threshold}</div>
        </div>
        <div className="bg-slate-50 p-2 rounded">
          <div className="text-[10px] text-slate-700 uppercase">Hot fields</div>
          <div className="text-base font-bold text-slate-900">{data.summary.hot_fields.length}</div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left text-gray-500 font-medium py-1 pr-2">Field</th>
              {data.pests.map(p => (
                <th key={p} className="text-gray-500 font-medium px-1">{p}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map(row => (
              <tr key={row.field}>
                <td className="py-0.5 pr-2 text-gray-700 whitespace-nowrap">{row.field}</td>
                {row.cells.map(c => (
                  <td key={c.pest} className="px-0.5 py-0.5">
                    <div
                      style={{ background: colorFor(c.pressure) }}
                      className="rounded text-[10px] text-white text-center py-1 font-medium"
                      title={`${row.field} · ${c.pest}: ${c.pressure} (${c.level})`}
                    >
                      {c.pressure}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.summary.hot_fields.length > 0 && (
        <div className="mt-3 text-xs text-gray-600">
          <span className="font-semibold text-rose-700">Hot zones:</span>{' '}
          {data.summary.hot_fields.join(', ')}
        </div>
      )}
    </div>
  );
}
