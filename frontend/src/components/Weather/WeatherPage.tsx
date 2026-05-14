import { useState, useEffect } from 'react';
import { Plus, Search, CloudRain } from 'lucide-react';
import { api } from '../../api';
import { WeatherData } from '../../types';
import WeatherDetail from './WeatherDetail';
import WeatherForm from './WeatherForm';

export default function WeatherPage() {
  const [items, setItems] = useState<WeatherData[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<WeatherData | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try { setItems(await api.getWeather()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter(w => w.location?.toLowerCase().includes(search.toLowerCase()));
  const riskColor = (r: number) => r >= 8 ? 'bg-red-100 text-red-800' : r >= 5 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800';

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Weather Monitoring</h2>
          <p className="text-gray-500 text-sm mt-1">{items.length} weather records</p>
        </div>
        <button onClick={() => { setSelected(null); setShowForm(true); }} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors">
          <Plus className="w-4 h-4" /> New Record
        </button>
      </div>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by location..." className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? <div className="p-12 text-center text-gray-400">Loading weather data...</div> : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Location', 'Temp', 'Humidity', 'Wind', 'Rainfall', 'Pest Risk', 'Recorded'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(w => (
                <tr key={w.id} onClick={() => setSelected(w)} className="hover:bg-gray-50 cursor-pointer transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center">
                        <CloudRain className="w-4 h-4 text-sky-600" />
                      </div>
                      <span className="font-medium text-gray-900 text-sm">{w.location}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{w.temp_celsius}°C</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{w.humidity_pct}%</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{w.wind_speed_kmh} km/h</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{w.rainfall_mm} mm</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${riskColor(w.pest_risk_index)}`}>{w.pest_risk_index}/10</span>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500">{new Date(w.recorded_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {selected && !showForm && (
        <WeatherDetail weather={selected} onClose={() => setSelected(null)} onRefresh={() => { load(); setSelected(null); }} onEdit={() => setShowForm(true)} />
      )}
      {showForm && (
        <WeatherForm weather={showForm && selected ? selected : null} onClose={() => setShowForm(false)} onSave={() => { setShowForm(false); setSelected(null); load(); }} />
      )}
    </div>
  );
}
