import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { api } from '../../api';
import { Treatment } from '../../types';

interface Props { treatment: Treatment | null; onClose: () => void; onSave: () => void; }

export default function TreatmentForm({ treatment, onClose, onSave }: Props) {
  const [fields, setFields] = useState<any[]>([]);
  const [form, setForm] = useState({ field_id: '', treatment_type: 'biological', chemical_name: '', dosage_ml_per_ha: '', scheduled_date: '', completed_date: '', status: 'scheduled', chemical_savings_pct: '0', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getFields().then(setFields).catch(console.error);
    if (treatment) {
      setForm({
        field_id: treatment.field_id?.toString() || '',
        treatment_type: treatment.treatment_type || 'biological',
        chemical_name: treatment.chemical_name || '',
        dosage_ml_per_ha: treatment.dosage_ml_per_ha?.toString() || '',
        scheduled_date: treatment.scheduled_date || '',
        completed_date: treatment.completed_date || '',
        status: treatment.status || 'scheduled',
        chemical_savings_pct: treatment.chemical_savings_pct?.toString() || '0',
        notes: treatment.notes || '',
      });
    }
  }, [treatment]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const payload = { ...form, field_id: parseInt(form.field_id), dosage_ml_per_ha: form.dosage_ml_per_ha ? parseFloat(form.dosage_ml_per_ha) : null, chemical_savings_pct: parseInt(form.chemical_savings_pct) };
      if (treatment) await api.updateTreatment(treatment.id, payload);
      else await api.createTreatment(payload);
      onSave();
    } catch (err: any) { setError(err.message); setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="font-bold text-gray-900">{treatment ? 'Edit Treatment' : 'New Treatment'}</h2>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Treatment Type</label>
              <select value={form.treatment_type} onChange={e => set('treatment_type', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none">
                {['biological','targeted_spray','organic','emergency_spray','pheromone_trap','soil_treatment','predatory_insects','monitoring'].map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chemical Name</label>
              <input value={form.chemical_name} onChange={e => set('chemical_name', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" placeholder="Leave blank if no chemical" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dosage (ml/ha)</label>
              <input type="number" step="0.01" value={form.dosage_ml_per_ha} onChange={e => set('dosage_ml_per_ha', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date</label>
              <input type="date" value={form.scheduled_date} onChange={e => set('scheduled_date', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Completed Date</label>
              <input type="date" value={form.completed_date} onChange={e => set('completed_date', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none">
                {['scheduled','in_progress','completed','cancelled'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chemical Savings %</label>
              <input type="number" min="0" max="100" value={form.chemical_savings_pct} onChange={e => set('chemical_savings_pct', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none resize-none" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">{saving ? 'Saving...' : treatment ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
