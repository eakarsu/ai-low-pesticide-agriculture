import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { api } from '../../api';
import { Sensor } from '../../types';

interface Props { sensor: Sensor | null; onClose: () => void; onSave: () => void; }

export default function SensorForm({ sensor, onClose, onSave }: Props) {
  const [fields, setFields] = useState<any[]>([]);
  const [form, setForm] = useState({ field_id: '', device_type: 'soil_moisture', model: '', battery_level: '100', last_reading_at: '', status: 'online', location_description: '', readings_today: '0' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getFields().then(setFields).catch(console.error);
    if (sensor) {
      setForm({
        field_id: sensor.field_id?.toString() || '',
        device_type: sensor.device_type || 'soil_moisture',
        model: sensor.model || '',
        battery_level: sensor.battery_level?.toString() || '100',
        last_reading_at: sensor.last_reading_at ? new Date(sensor.last_reading_at).toISOString().slice(0,16) : '',
        status: sensor.status || 'online',
        location_description: sensor.location_description || '',
        readings_today: sensor.readings_today?.toString() || '0',
      });
    }
  }, [sensor]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const payload = { ...form, field_id: parseInt(form.field_id), battery_level: parseInt(form.battery_level), readings_today: parseInt(form.readings_today) };
      if (sensor) await api.updateSensor(sensor.id, payload);
      else await api.createSensor(payload);
      onSave();
    } catch (err: any) { setError(err.message); setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="font-bold text-gray-900">{sensor ? 'Edit Sensor' : 'New Sensor'}</h2>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Device Type</label>
              <select value={form.device_type} onChange={e => set('device_type', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none">
                {['soil_moisture','temperature','pest_trap','camera'].map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
              <input value={form.model} onChange={e => set('model', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" placeholder="AgraSense SM-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Battery Level %</label>
              <input type="number" min="0" max="100" value={form.battery_level} onChange={e => set('battery_level', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none">
                {['online','offline','maintenance'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Readings Today</label>
              <input type="number" min="0" value={form.readings_today} onChange={e => set('readings_today', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Location Description</label>
              <input value={form.location_description} onChange={e => set('location_description', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" placeholder="Northeast corner, row 15" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">{saving ? 'Saving...' : sensor ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
