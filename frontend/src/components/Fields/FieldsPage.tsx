import { useState, useEffect } from 'react';
import { Plus, Search, MapPin } from 'lucide-react';
import { api } from '../../api';
import { Field } from '../../types';
import FieldDetail from './FieldDetail';
import FieldForm from './FieldForm';

export default function FieldsPage() {
  const [fields, setFields] = useState<Field[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Field | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await api.getFields();
      setFields(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = fields.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.crop_type?.toLowerCase().includes(search.toLowerCase()) ||
    f.location?.toLowerCase().includes(search.toLowerCase())
  );

  const statusColor = (s: string) => ({
    active: 'bg-green-100 text-green-800',
    monitoring: 'bg-yellow-100 text-yellow-800',
    fallow: 'bg-gray-100 text-gray-600',
  }[s] || 'bg-gray-100 text-gray-600');

  const healthColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Fields</h2>
          <p className="text-gray-500 text-sm mt-1">{fields.length} fields under management</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> New Field
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search fields by name, crop, or location..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading fields...</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Field</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Crop</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Size</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Health</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Scan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(field => (
                <tr
                  key={field.id}
                  onClick={() => setSelected(field)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{field.name}</div>
                        <div className="text-xs text-gray-500">{field.location}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm capitalize text-gray-700">{field.crop_type}</span>
                    <div className="text-xs text-gray-400 capitalize">{field.soil_type?.replace('_', ' ')}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{field.hectares} ha</td>
                  <td className="px-6 py-4">
                    <span className={`text-sm font-semibold ${healthColor(field.health_score)}`}>
                      {field.health_score}/100
                    </span>
                    <div className="w-24 bg-gray-200 rounded-full h-1.5 mt-1">
                      <div
                        className={`h-1.5 rounded-full ${field.health_score >= 80 ? 'bg-green-500' : field.health_score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${field.health_score}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColor(field.status)}`}>
                      {field.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500">
                    {field.last_scan_at ? new Date(field.last_scan_at).toLocaleString() : 'Never'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <FieldDetail
          field={selected}
          onClose={() => setSelected(null)}
          onRefresh={() => { load(); setSelected(null); }}
          onEdit={(f) => { setSelected(f); setShowForm(true); }}
        />
      )}

      {showForm && (
        <FieldForm
          field={selected}
          onClose={() => { setShowForm(false); }}
          onSave={() => { setShowForm(false); setSelected(null); load(); }}
        />
      )}
    </div>
  );
}
