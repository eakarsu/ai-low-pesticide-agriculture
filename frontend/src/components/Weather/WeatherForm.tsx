import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { api } from '../../api';
import { WeatherData } from '../../types';

interface Props { weather: WeatherData | null; onClose: () => void; onSave: () => void; }

export default function WeatherForm({ weather, onClose, onSave }: Props) {
  const [form, setForm] = useState({ location: '', recorded_at: '', temp_celsius: '', humidity_pct: '', wind_speed_kmh: '', rainfall_mm: '0', pest_risk_index: '5', forecast_next_48h: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (weather) {
      setForm({
        location: weather.location || '',
        recorded_at: weather.recorded_at ? new Date(weather.recorded_at).toISOString().slice(0,16) : '',
        temp_celsius: weather.temp_celsius?.toString() || '',
        humidity_pct: weather.humidity_pct?.toString() || '',
        wind_speed_kmh: weather.wind_speed_kmh?.toString() || '',
        rainfall_mm: weather.rainfall_mm?.toString() || '0',
        pest_risk_index: weather.pest_risk_index?.toString() || '5',
        forecast_next_48h: weather.forecast_next_48h || '',
      });
    }
  }, [weather]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const payload = { ...form, temp_celsius: parseFloat(form.temp_celsius), humidity_pct: parseInt(form.humidity_pct), wind_speed_kmh: parseFloat(form.wind_speed_kmh), rainfall_mm: parseFloat(form.rainfall_mm), pest_risk_index: parseInt(form.pest_risk_index) };
      if (weather) await api.updateWeather(weather.id, payload);
      else await api.createWeather(payload);
      onSave();
    } catch (err: any) { setError(err.message); setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="font-bold text-gray-900">{weather ? 'Edit Weather Record' : 'New Weather Record'}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
              <input required value={form.location} onChange={e => set('location', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" placeholder="Iowa, USA" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Recorded At</label>
              <input type="datetime-local" value={form.recorded_at} onChange={e => set('recorded_at', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Temperature (°C)</label>
              <input type="number" step="0.1" value={form.temp_celsius} onChange={e => set('temp_celsius', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Humidity (%)</label>
              <input type="number" min="0" max="100" value={form.humidity_pct} onChange={e => set('humidity_pct', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Wind Speed (km/h)</label>
              <input type="number" step="0.1" value={form.wind_speed_kmh} onChange={e => set('wind_speed_kmh', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rainfall (mm)</label>
              <input type="number" step="0.1" value={form.rainfall_mm} onChange={e => set('rainfall_mm', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Pest Risk Index (0-10)</label>
              <input type="number" min="0" max="10" value={form.pest_risk_index} onChange={e => set('pest_risk_index', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">48h Forecast</label>
              <textarea value={form.forecast_next_48h} onChange={e => set('forecast_next_48h', e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none resize-none" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">{saving ? 'Saving...' : weather ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
