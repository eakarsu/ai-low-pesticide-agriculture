import { useState } from 'react';
import { X, Edit2, Trash2, Cpu } from 'lucide-react';
import { api } from '../../api';
import { Sensor } from '../../types';

interface Props { sensor: Sensor; onClose: () => void; onRefresh: () => void; onEdit: () => void; }

export default function SensorDetail({ sensor: s, onClose, onRefresh, onEdit }: Props) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Delete this sensor?')) return;
    setDeleting(true);
    try { await api.deleteSensor(s.id); onRefresh(); }
    catch (e: any) { alert(e.message); setDeleting(false); }
  };

  const statusColor = (st: string) => ({ online: 'bg-green-100 text-green-800', offline: 'bg-red-100 text-red-800', maintenance: 'bg-yellow-100 text-yellow-800' }[st] || 'bg-gray-100');
  const battColor = (b: number) => b > 50 ? 'text-green-600' : b > 20 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="fixed inset-0 bg-black/30 z-40 flex justify-end" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-96 bg-white h-full overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-cyan-100 rounded-lg flex items-center justify-center">
              <Cpu className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-sm capitalize">{s.device_type?.replace('_',' ')}</h2>
              <p className="text-xs text-gray-500">{s.model}</p>
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
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500 mb-1">Battery</div>
              <div className={`text-2xl font-bold ${battColor(s.battery_level)}`}>{s.battery_level}%</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500 mb-1">Status</div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColor(s.status)}`}>{s.status}</span>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            {[
              ['Field', s.field_name || `#${s.field_id}`],
              ['Location', s.location_description],
              ['Readings Today', s.readings_today?.toString()],
              ['Last Reading', s.last_reading_at ? new Date(s.last_reading_at).toLocaleString() : 'Never'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <span className="text-gray-500">{k}</span>
                <span className="font-medium text-gray-900 text-right max-w-[55%]">{v || '—'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
