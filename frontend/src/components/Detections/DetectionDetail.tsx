import { useState } from 'react';
import { X, Edit2, Trash2, Sparkles, Bug } from 'lucide-react';
import { api } from '../../api';
import { Detection } from '../../types';
import AIResponse from '../AIResponse';

interface Props {
  detection: Detection;
  onClose: () => void;
  onRefresh: () => void;
  onEdit: () => void;
}

export default function DetectionDetail({ detection: d, onClose, onRefresh, onEdit }: Props) {
  const [deleting, setDeleting] = useState(false);
  const [aiContent, setAiContent] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete detection for "${d.pest_name}"?`)) return;
    setDeleting(true);
    try { await api.deleteDetection(d.id); onRefresh(); }
    catch (e: any) { alert(e.message); setDeleting(false); }
  };

  const runAI = async () => {
    setAiLoading(true); setAiContent('');
    try {
      const { result } = await api.pestAnalysis({ field_id: d.field_id, detections: [d] });
      setAiContent(result);
    } catch (e: any) { setAiContent('AI failed: ' + e.message); }
    finally { setAiLoading(false); }
  };

  const severityColor = (s: string) => ({ critical: 'bg-red-100 text-red-800', high: 'bg-orange-100 text-orange-800', medium: 'bg-yellow-100 text-yellow-800', low: 'bg-green-100 text-green-800' }[s] || 'bg-gray-100');

  return (
    <div className="fixed inset-0 bg-black/30 z-40 flex justify-end" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-96 bg-white h-full overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center">
              <Bug className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-sm">{d.pest_name}</h2>
              <p className="text-xs text-gray-500">{d.field_name}</p>
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
              <div className="text-xs text-gray-500 mb-1">Confidence</div>
              <div className="text-xl font-bold text-gray-900">{Math.round(d.confidence * 100)}%</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500 mb-1">Severity</div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${severityColor(d.severity)}`}>{d.severity}</span>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            {[
              ['Field', d.field_name || `#${d.field_id}`],
              ['Location in Field', d.location_in_field],
              ['Detected At', new Date(d.detected_at).toLocaleString()],
              ['Treatment Status', d.treated ? 'Treated' : 'Untreated'],
              ['Treatment Applied', d.treatment_applied || 'None'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <span className="text-gray-500">{k}</span>
                <span className="font-medium text-gray-900 text-right max-w-[55%]">{v || '—'}</span>
              </div>
            ))}
          </div>
          {d.notes && <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800">{d.notes}</div>}
          <button onClick={runAI} disabled={aiLoading} className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium text-sm transition-colors">
            <Sparkles className="w-4 h-4" />
            {aiLoading ? 'Analyzing...' : 'AI Pest Analysis'}
          </button>
          {(aiLoading || aiContent) && <AIResponse content={aiContent} title="Pest Analysis" isLoading={aiLoading} onRegenerate={runAI} />}
        </div>
      </div>
    </div>
  );
}
