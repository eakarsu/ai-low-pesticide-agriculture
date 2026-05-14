import { useState } from 'react';
import { X, Edit2, Trash2, Sparkles, FileBarChart2 } from 'lucide-react';
import { api } from '../../api';
import { HealthReport } from '../../types';
import AIResponse from '../AIResponse';

interface Props { report: HealthReport; onClose: () => void; onRefresh: () => void; onEdit: () => void; }

export default function HealthReportDetail({ report: r, onClose, onRefresh, onEdit }: Props) {
  const [deleting, setDeleting] = useState(false);
  const [aiContent, setAiContent] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Delete this report?')) return;
    setDeleting(true);
    try { await api.deleteHealthReport(r.id); onRefresh(); }
    catch (e: any) { alert(e.message); setDeleting(false); }
  };

  const runAI = async () => {
    setAiLoading(true); setAiContent('');
    try {
      const { result } = await api.yieldPrediction({ field_id: r.field_id, health_data: r });
      setAiContent(result);
    } catch (e: any) { setAiContent('AI failed: ' + e.message); }
    finally { setAiLoading(false); }
  };

  const hColor = (s: number) => s >= 80 ? 'text-green-600' : s >= 60 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="fixed inset-0 bg-black/30 z-40 flex justify-end" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-96 bg-white h-full overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center">
              <FileBarChart2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-sm">{r.field_name}</h2>
              <p className="text-xs text-gray-500">{new Date(r.report_date).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={onEdit} className="p-2 text-gray-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
            <button onClick={handleDelete} disabled={deleting} className="p-2 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500 mb-1">Health</div>
              <div className={`text-xl font-bold ${hColor(r.health_score)}`}>{r.health_score}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500 mb-1">NDVI</div>
              <div className="text-xl font-bold text-blue-600">{r.ndvi_index}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500 mb-1">Yield</div>
              <div className="text-sm font-bold text-gray-900">{r.yield_estimate_kg_ha?.toLocaleString()}</div>
              <div className="text-xs text-gray-400">kg/ha</div>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            {[
              ['Reporter', r.reporter],
              ['Report Date', new Date(r.report_date).toLocaleDateString()],
              ['Crop', r.crop_type],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <span className="text-gray-500">{k}</span>
                <span className="font-medium text-gray-900 capitalize">{v || '—'}</span>
              </div>
            ))}
          </div>
          {r.notes && <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800">{r.notes}</div>}
          <button onClick={runAI} disabled={aiLoading} className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium text-sm transition-colors">
            <Sparkles className="w-4 h-4" />
            {aiLoading ? 'Predicting...' : 'AI Yield Prediction'}
          </button>
          {(aiLoading || aiContent) && <AIResponse content={aiContent} title="Yield Prediction" isLoading={aiLoading} onRegenerate={runAI} />}
        </div>
      </div>
    </div>
  );
}
