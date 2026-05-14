import { useState } from 'react';
import { X, Edit2, Trash2, CloudRain } from 'lucide-react';
import { api } from '../../api';
import { WeatherData } from '../../types';

interface Props { weather: WeatherData; onClose: () => void; onRefresh: () => void; onEdit: () => void; }

export default function WeatherDetail({ weather: w, onClose, onRefresh, onEdit }: Props) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Delete this weather record?')) return;
    setDeleting(true);
    try { await api.deleteWeather(w.id); onRefresh(); }
    catch (e: any) { alert(e.message); setDeleting(false); }
  };

  const riskColor = (r: number) => r >= 8 ? 'text-red-600' : r >= 5 ? 'text-yellow-600' : 'text-green-600';

  return (
    <div className="fixed inset-0 bg-black/30 z-40 flex justify-end" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-96 bg-white h-full overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-sky-100 rounded-lg flex items-center justify-center">
              <CloudRain className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-sm">{w.location}</h2>
              <p className="text-xs text-gray-500">{new Date(w.recorded_at).toLocaleString()}</p>
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
            <div className="bg-sky-50 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500 mb-1">Temperature</div>
              <div className="text-2xl font-bold text-sky-700">{w.temp_celsius}°C</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500 mb-1">Pest Risk</div>
              <div className={`text-2xl font-bold ${riskColor(w.pest_risk_index)}`}>{w.pest_risk_index}/10</div>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            {[
              ['Humidity', `${w.humidity_pct}%`],
              ['Wind Speed', `${w.wind_speed_kmh} km/h`],
              ['Rainfall', `${w.rainfall_mm} mm`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <span className="text-gray-500">{k}</span>
                <span className="font-medium text-gray-900">{v}</span>
              </div>
            ))}
          </div>
          {w.forecast_next_48h && (
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-xs font-semibold text-blue-700 mb-1 uppercase tracking-wider">48h Forecast</div>
              <p className="text-sm text-blue-800">{w.forecast_next_48h}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
