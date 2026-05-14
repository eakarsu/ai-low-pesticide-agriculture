import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { api } from '../../api';
import { HealthReport } from '../../types';

interface Props { report: HealthReport | null; onClose: () => void; onSave: () => void; }

export default function HealthReportForm({ report, onClose, onSave }: Props) {
  const [fields, setFields] = useState<any[]>([]);
  const [form, setForm] = useState({ field_id: '', report_date: '', health_score: '75', ndvi_index: '0.65', yield_estimate_kg_ha: '', notes: '', reporter: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getFields().then(setFields).catch(console.error);
    if (report) {
      setForm({
        field_id: report.field_id?.toString() || '',
        report_date: report.report_date || '',
        health_score: report.health_score?.toString() || '75',
        ndvi_index: report.ndvi_index?.toString() || '0.65',
        yield_estimate_kg_ha: report.yield_estimate_kg_ha?.toString() || '',
        notes: report.notes || '',
        reporter: report.reporter || '',
      });
    }
  }, [report]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const payload = { ...form, field_id: parseInt(form.field_id), health_score: parseInt(form.health_score), ndvi_index: parseFloat(form.ndvi_index), yield_estimate_kg_ha: parseFloat(form.yield_estimate_kg_ha) };
      if (report) await api.updateHealthReport(report.id, payload);
      else await api.createHealthReport(payload);
      onSave();
    } catch (err: any) { setError(err.message); setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="font-bold text-gray-900">{report ? 'Edit Report' : 'New Health Report'}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Field *</label>
              <select required value={form.field_id} onChange={e => set('field_id', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none">
                <option value="">Select field</option>
                {fields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Report Date *</label>
              <input type="date" required value={form.report_date} onChange={e => set('report_date', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Health Score (0-100)</label>
              <input type="number" min="0" max="100" value={form.health_score} onChange={e => set('health_score', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">NDVI Index (0-1)</label>
              <input type="number" step="0.001" min="0" max="1" value={form.ndvi_index} onChange={e => set('ndvi_index', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Yield Estimate (kg/ha)</label>
              <input type="number" step="0.01" value={form.yield_estimate_kg_ha} onChange={e => set('yield_estimate_kg_ha', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reporter</label>
              <input value={form.reporter} onChange={e => set('reporter', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" placeholder="Dr. Sarah Chen" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none resize-none" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">{saving ? 'Saving...' : report ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
