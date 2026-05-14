import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { api } from '../../api';
import { Field } from '../../types';

interface Props {
  field: Field | null;
  onClose: () => void;
  onSave: () => void;
}

export default function FieldForm({ field, onClose, onSave }: Props) {
  const [form, setForm] = useState({
    name: '', location: '', crop_type: '', hectares: '', status: 'active',
    soil_type: '', last_scan_at: '', health_score: '75'
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (field) {
      setForm({
        name: field.name || '',
        location: field.location || '',
        crop_type: field.crop_type || '',
        hectares: field.hectares?.toString() || '',
        status: field.status || 'active',
        soil_type: field.soil_type || '',
        last_scan_at: field.last_scan_at ? new Date(field.last_scan_at).toISOString().slice(0,16) : '',
        health_score: field.health_score?.toString() || '75',
      });
    }
  }, [field]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, hectares: parseFloat(form.hectares), health_score: parseInt(form.health_score) };
      if (field) {
        await api.updateField(field.id, payload);
      } else {
        await api.createField(payload);
      }
      onSave();
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="font-bold text-gray-900">{field ? 'Edit Field' : 'New Field'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Field Name *</label>
              <input required value={form.name} onChange={e => set('name', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" placeholder="North Valley Farm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input value={form.location} onChange={e => set('location', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" placeholder="Iowa, USA" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Crop Type</label>
              <select value={form.crop_type} onChange={e => set('crop_type', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none">
                <option value="">Select crop</option>
                {['corn','wheat','soybean','rice','cotton','sorghum'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hectares</label>
              <input type="number" step="0.1" value={form.hectares} onChange={e => set('hectares', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" placeholder="45.5" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Soil Type</label>
              <select value={form.soil_type} onChange={e => set('soil_type', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none">
                <option value="">Select soil</option>
                {['loam','clay_loam','sandy_loam','clay','silty_clay','alluvial','sandy','silty_loam'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none">
                <option value="active">Active</option>
                <option value="monitoring">Monitoring</option>
                <option value="fallow">Fallow</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Health Score (0-100)</label>
              <input type="number" min="0" max="100" value={form.health_score} onChange={e => set('health_score', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Scan At</label>
              <input type="datetime-local" value={form.last_scan_at} onChange={e => set('last_scan_at', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">{saving ? 'Saving...' : field ? 'Update Field' : 'Create Field'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
