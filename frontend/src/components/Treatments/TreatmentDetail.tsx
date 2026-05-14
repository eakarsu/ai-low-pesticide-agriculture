import { useState } from 'react';
import { X, Edit2, Trash2, Sparkles, FlaskConical } from 'lucide-react';
import { api } from '../../api';
import { Treatment } from '../../types';
import AIResponse from '../AIResponse';

interface Props { treatment: Treatment; onClose: () => void; onRefresh: () => void; onEdit: () => void; }

export default function TreatmentDetail({ treatment: t, onClose, onRefresh, onEdit }: Props) {
  const [deleting, setDeleting] = useState(false);
  const [aiContent, setAiContent] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Delete this treatment?')) return;
    setDeleting(true);
    try { await api.deleteTreatment(t.id); onRefresh(); }
    catch (e: any) { alert(e.message); setDeleting(false); }
  };

  const runAI = async () => {
    setAiLoading(true); setAiContent('');
    try {
      const { result } = await api.treatmentPlan({ field_id: t.field_id, pest_detections: [t] });
      setAiContent(result);
    } catch (e: any) { setAiContent('AI failed: ' + e.message); }
    finally { setAiLoading(false); }
  };

  const statusColor = (s: string) => ({ scheduled: 'bg-blue-100 text-blue-800', in_progress: 'bg-yellow-100 text-yellow-800', completed: 'bg-green-100 text-green-800', cancelled: 'bg-gray-100 text-gray-600' }[s] || 'bg-gray-100');

  return (
    <div className="fixed inset-0 bg-black/30 z-40 flex justify-end" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-96 bg-white h-full overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-sm capitalize">{t.treatment_type?.replace('_',' ')}</h2>
              <p className="text-xs text-gray-500">{t.field_name}</p>
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={onEdit} className="p-2 text-gray-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
            <button onClick={handleDelete} disabled={deleting} className="p-2 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500 mb-1">Status</div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColor(t.status)}`}>{t.status?.replace('_',' ')}</span>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500 mb-1">Chem Savings</div>
              <div className={`text-xl font-bold ${t.chemical_savings_pct >= 70 ? 'text-green-600' : t.chemical_savings_pct >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>{t.chemical_savings_pct}%</div>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            {[
              ['Chemical', t.chemical_name || 'None'],
              ['Dosage', t.dosage_ml_per_ha ? `${t.dosage_ml_per_ha} ml/ha` : 'N/A'],
              ['Scheduled', t.scheduled_date ? new Date(t.scheduled_date).toLocaleDateString() : '—'],
              ['Completed', t.completed_date ? new Date(t.completed_date).toLocaleDateString() : 'Pending'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <span className="text-gray-500">{k}</span>
                <span className="font-medium text-gray-900">{v}</span>
              </div>
            ))}
          </div>
          {t.notes && <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800">{t.notes}</div>}
          <button onClick={runAI} disabled={aiLoading} className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium text-sm transition-colors">
            <Sparkles className="w-4 h-4" />
            {aiLoading ? 'Generating...' : 'AI Treatment Plan'}
          </button>
          {(aiLoading || aiContent) && <AIResponse content={aiContent} title="Treatment Optimization" isLoading={aiLoading} onRegenerate={runAI} />}
        </div>
      </div>
    </div>
  );
}
