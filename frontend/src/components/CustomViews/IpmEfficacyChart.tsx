import { useEffect, useState } from 'react';
import { TrendingDown } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

type Point = { month: string; applied_kg: number; baseline_kg: number; saved_kg: number; reduction_pct: number };
type Resp = {
  series: Point[];
  summary: {
    total_applied_kg: number;
    total_baseline_kg: number;
    total_saved_kg: number;
    overall_reduction_pct: number;
    target_pct: number;
    ytd_target_met: boolean;
  };
};

export default function IpmEfficacyChart() {
  const [data, setData] = useState<Resp | null>(null);
  const [err, setErr] = useState<string>('');

  useEffect(() => {
    fetch('/api/custom-views/pesticide-reduction-trend', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
    })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(setData)
      .catch(e => setErr(e.message));
  }, []);

  if (err) return <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm">Error: {err}</div>;
  if (!data) return <div className="p-4 bg-white rounded-lg border border-gray-200">Loading trend...</div>;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5" data-testid="pesticide-reduction-trend">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-emerald-600" />
          <h3 className="font-semibold text-gray-900">Pesticide-Reduction Trend</h3>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded ${data.summary.ytd_target_met ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
          {data.summary.ytd_target_met ? 'Target met' : 'Below target'}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4 text-center">
        <div className="bg-rose-50 p-2 rounded">
          <div className="text-[10px] text-rose-700 uppercase">Baseline kg</div>
          <div className="text-base font-bold text-rose-900">{data.summary.total_baseline_kg.toLocaleString()}</div>
        </div>
        <div className="bg-amber-50 p-2 rounded">
          <div className="text-[10px] text-amber-700 uppercase">Applied kg</div>
          <div className="text-base font-bold text-amber-900">{data.summary.total_applied_kg.toLocaleString()}</div>
        </div>
        <div className="bg-emerald-50 p-2 rounded">
          <div className="text-[10px] text-emerald-700 uppercase">Saved kg</div>
          <div className="text-base font-bold text-emerald-900">{data.summary.total_saved_kg.toLocaleString()}</div>
        </div>
        <div className="bg-violet-50 p-2 rounded">
          <div className="text-[10px] text-violet-700 uppercase">Reduction</div>
          <div className="text-base font-bold text-violet-900">{data.summary.overall_reduction_pct}%</div>
        </div>
      </div>

      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer>
          <ComposedChart data={data.series} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} domain={[0, 100]} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar yAxisId="left" dataKey="baseline_kg" name="Baseline kg" fill="#fecaca" />
            <Bar yAxisId="left" dataKey="applied_kg" name="Applied kg" fill="#86efac" />
            <Line yAxisId="right" dataKey="reduction_pct" name="Reduction %" stroke="#7c3aed" strokeWidth={2} dot />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
