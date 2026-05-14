import { useState } from 'react';
import { X, Edit2, Trash2, Sparkles, MapPin } from 'lucide-react';
import { api } from '../../api';
import { Field } from '../../types';
import AIResponse from '../AIResponse';

interface Props {
  field: Field;
  onClose: () => void;
  onRefresh: () => void;
  onEdit: (f: Field) => void;
}

export default function FieldDetail({ field, onClose, onRefresh, onEdit }: Props) {
  const [deleting, setDeleting] = useState(false);
  const [aiContent, setAiContent] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete field "${field.name}"?`)) return;
    setDeleting(true);
    try {
      await api.deleteField(field.id);
      onRefresh();
    } catch (e: any) {
      alert(e.message);
      setDeleting(false);
    }
  };

  const runAI = async () => {
    setAiLoading(true);
    setAiContent('');
    try {
      const { result } = await api.fieldSummary({ field_id: field.id });
      setAiContent(result);
    } catch (e: any) {
      setAiContent('AI analysis failed: ' + e.message);
    } finally {
      setAiLoading(false);
    }
  };

  const healthColor = (score: number) => score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600';
  const statusColor = (s: string) => ({ active: 'bg-green-100 text-green-800', monitoring: 'bg-yellow-100 text-yellow-800', fallow: 'bg-gray-100 text-gray-600' }[s] || 'bg-gray-100 text-gray-600');

  return (
    <div className="fixed inset-0 bg-black/30 z-40 flex justify-end" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-1/2 bg-white h-full overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">{field.name}</h2>
              <p className="text-xs text-gray-500">{field.location}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onEdit(field)} className="p-2 text-gray-400 hover:text-blue-600 transition-colors"><Edit2 className="w-4 h-4" /></button>
            <button onClick={handleDelete} disabled={deleting} className="p-2 text-gray-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 transition-colors"><X className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-1">Health Score</div>
              <div className={`text-2xl font-bold ${healthColor(field.health_score)}`}>{field.health_score}/100</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div className={`h-2 rounded-full ${field.health_score >= 80 ? 'bg-green-500' : field.health_score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${field.health_score}%` }} />
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-1">Status</div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColor(field.status)}`}>{field.status}</span>
              <div className="text-sm text-gray-600 mt-2">{field.hectares} hectares</div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-gray-900 text-sm">Field Details</h3>
            {[
              { label: 'Crop Type', value: field.crop_type, className: 'capitalize' },
              { label: 'Soil Type', value: field.soil_type?.replace('_', ' '), className: 'capitalize' },
              { label: 'Location', value: field.location },
              { label: 'Last Scan', value: field.last_scan_at ? new Date(field.last_scan_at).toLocaleString() : 'Never' },
              { label: 'Created', value: new Date(field.created_at).toLocaleDateString() },
            ].map(({ label, value, className }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-500">{label}</span>
                <span className={`font-medium text-gray-900 ${className || ''}`}>{value || '—'}</span>
              </div>
            ))}
          </div>

          <div>
            <button
              onClick={runAI}
              disabled={aiLoading}
              className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium text-sm transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              {aiLoading ? 'Analyzing...' : 'AI Field Summary'}
            </button>
          </div>

          {(aiLoading || aiContent) && (
            <AIResponse content={aiContent} title="Field Analysis" isLoading={aiLoading} onRegenerate={runAI} />
          )}
        </div>
      </div>
    </div>
  );
}
