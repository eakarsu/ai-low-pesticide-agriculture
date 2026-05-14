import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { api } from '../../api';
import { Detection } from '../../types';

interface Props {
  detection: Detection | null;
  onClose: () => void;
  onSave: () => void;
}

export default function DetectionForm({ detection, onClose, onSave }: Props) {
  const [fields, setFields] = useState<any[]>([]);
  const [form, setForm] = useState({ field_id: '', pest_name: '', confidence: '0.85', severity: 'medium', location_in_field: '', treated: false, treatment_applied: '', detected_at: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getFields().then(setFields).catch(console.error);
    if (detection) {
      setForm({
        field_id: detection.field_id?.toString() || '',
        pest_name: detection.pest_name || '',
        confidence: detection.confidence?.toString() || '0.85',
        severity: detection.severity || 'medium',
        location_in_field: detection.location_in_field || '',
        treated: detection.treated || false,
        treatment_applied: detection.treatment_applied || '',
        detected_at: detection.detected_at ? new Date(detection.detected_at).toISOString().slice(0,16) : '',
        notes: detection.notes || '',
      });
    }
  }, [detection]);

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const payload = { ...form, field_id: parseInt(form.field_id), confidence: parseFloat(form.confidence) };
      if (detection) await api.updateDetection(detection.id, payload);
      else await api.createDetection(payload);
      onSave();
    } catch (err: any) { setError(err.message); setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="font-bold text-gray-900">{detection ? 'Edit Detection' : 'New Detection'}</h2>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Pest Name *</label>
              <input required value={form.pest_name} onChange={e => set('pest_name', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" placeholder="Aphids" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confidence (0-1)</label>
              <input type="number" step="0.01" min="0" max="1" value={form.confidence} onChange={e => set('confidence', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
              <select value={form.severity} onChange={e => set('severity', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none">
                {['low','medium','high','critical'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Location in Field</label>
              <input value={form.location_in_field} onChange={e => set('location_in_field', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" placeholder="Northeast quadrant" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Detected At</label>
              <input type="datetime-local" value={form.detected_at} onChange={e => set('detected_at', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input type="checkbox" id="treated" checked={form.treated} onChange={e => set('treated', e.target.checked)} className="w-4 h-4 accent-green-600" />
              <label htmlFor="treated" className="text-sm font-medium text-gray-700">Treated</label>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Treatment Applied</label>
              <input value={form.treatment_applied} onChange={e => set('treatment_applied', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" placeholder="Bacillus thuringiensis" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none resize-none" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">{saving ? 'Saving...' : detection ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
