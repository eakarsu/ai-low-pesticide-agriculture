import { useState, useEffect } from 'react';
import { Plus, Search, Cpu } from 'lucide-react';
import { api } from '../../api';
import { Sensor } from '../../types';
import SensorDetail from './SensorDetail';
import SensorForm from './SensorForm';

export default function SensorsPage() {
  const [items, setItems] = useState<Sensor[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Sensor | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try { setItems(await api.getSensors()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter(s =>
    s.device_type?.toLowerCase().includes(search.toLowerCase()) ||
    s.model?.toLowerCase().includes(search.toLowerCase()) ||
    s.field_name?.toLowerCase().includes(search.toLowerCase())
  );

  const statusColor = (s: string) => ({ online: 'bg-green-100 text-green-800', offline: 'bg-red-100 text-red-800', maintenance: 'bg-yellow-100 text-yellow-800' }[s] || 'bg-gray-100');
  const battColor = (b: number) => b > 50 ? 'text-green-600' : b > 20 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Sensor Devices</h2>
          <p className="text-gray-500 text-sm mt-1">{items.length} devices deployed</p>
        </div>
        <button onClick={() => { setSelected(null); setShowForm(true); }} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors">
          <Plus className="w-4 h-4" /> New Sensor
        </button>
      </div>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by type, model, or field..." className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? <div className="p-12 text-center text-gray-400">Loading sensors...</div> : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Device', 'Field', 'Battery', 'Status', 'Readings Today', 'Last Reading'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(s => (
                <tr key={s.id} onClick={() => setSelected(s)} className="hover:bg-gray-50 cursor-pointer transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center">
                        <Cpu className="w-4 h-4 text-cyan-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 text-sm capitalize">{s.device_type?.replace('_',' ')}</div>
                        <div className="text-xs text-gray-500">{s.model}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{s.field_name || `#${s.field_id}`}</td>
                  <td className="px-6 py-4">
                    <span className={`text-sm font-semibold ${battColor(s.battery_level)}`}>{s.battery_level}%</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColor(s.status)}`}>{s.status}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{s.readings_today}</td>
                  <td className="px-6 py-4 text-xs text-gray-500">{s.last_reading_at ? new Date(s.last_reading_at).toLocaleString() : 'Never'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {selected && !showForm && (
        <SensorDetail sensor={selected} onClose={() => setSelected(null)} onRefresh={() => { load(); setSelected(null); }} onEdit={() => setShowForm(true)} />
      )}
      {showForm && (
        <SensorForm sensor={showForm && selected ? selected : null} onClose={() => setShowForm(false)} onSave={() => { setShowForm(false); setSelected(null); load(); }} />
      )}
    </div>
  );
}
