import { useEffect, useState } from 'react';
import { api } from '../api';

const nextStates: Record<string, string[]> = {
  quote_draft: ['quote_sent', 'cancelled'], quote_sent: ['booked', 'cancelled'],
  booked: ['dispatched', 'cancelled'], dispatched: ['in_progress', 'no_show', 'cancelled'],
  in_progress: ['partially_completed', 'completed', 'cancelled'],
  partially_completed: ['invoiced'], completed: ['invoiced'], paid: ['refund_pending'],
};

export default function FieldOperationsPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [error, setError] = useState('');

  async function refresh(selectId?: string) {
    try {
      const result = await api.getServiceOrders();
      setOrders(result.orders);
      if (selectId) setSelected(await api.getServiceOrder(selectId));
      setError('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load jobs'); }
  }

  useEffect(() => { void refresh(); }, []);

  async function transition(toStatus: string) {
    if (!selected) return;
    const reason = ['cancelled', 'no_show', 'refund_pending'].includes(toStatus)
      ? window.prompt(`Reason for ${toStatus.replace('_', ' ')}:`) : null;
    if (['cancelled', 'no_show', 'refund_pending'].includes(toStatus) && !reason) return;
    try {
      await api.transitionServiceOrder(selected.id, {
        expectedVersion: selected.version, toStatus, travelKm: 0, reason,
        workSummary: ['partially_completed', 'completed'].includes(toStatus)
          ? { operatorNote: 'Recorded from operations desk' } : undefined,
      });
      await refresh(selected.id);
    } catch (err) { setError(err instanceof Error ? err.message : 'Transition failed'); }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div><h2 className="text-2xl font-bold text-gray-900">Field Operations</h2><p className="text-sm text-gray-500">Versioned service jobs and provider-backed status</p></div>
        <button onClick={() => void refresh(selected?.id)} className="px-4 py-2 rounded-lg bg-green-600 text-white">Refresh</button>
      </div>
      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-red-700">{error}</div>}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white border rounded-xl overflow-hidden">
          {orders.map((order) => <button key={order.id} onClick={() => void refresh(order.id)} className="w-full text-left p-4 border-b hover:bg-gray-50">
            <div className="flex justify-between"><strong>{order.service_address_ref}</strong><span className="text-xs uppercase text-green-700">{order.status.replace(/_/g, ' ')}</span></div>
            <div className="text-sm text-gray-500 mt-1">{order.technician_id || 'Unassigned'} · {new Date(order.starts_at).toLocaleString()} · ${(Number(order.total_cents) / 100).toFixed(2)}</div>
          </button>)}
          {!orders.length && <div className="p-6 text-gray-500">No service jobs yet. Quotes are created through the authenticated field-operations API.</div>}
        </div>
        <div className="bg-white border rounded-xl p-5">
          {!selected ? <p className="text-gray-500">Select a job to inspect its immutable event trail.</p> : <>
            <div className="flex justify-between mb-4"><h3 className="font-bold">Job {selected.id.slice(0, 8)}</h3><span>v{selected.version}</span></div>
            <div className="flex flex-wrap gap-2 mb-6">{(nextStates[selected.status] || []).map((state) => <button key={state} onClick={() => void transition(state)} className="px-3 py-2 rounded bg-gray-900 text-white text-sm">{state.replace(/_/g, ' ')}</button>)}</div>
            <h4 className="font-semibold mb-2">Event trail</h4>
            <ol className="space-y-2">{selected.events?.map((entry: any) => <li key={entry.id} className="text-sm border-l-2 border-green-500 pl-3"><strong>{entry.event_type}</strong> {entry.from_status || 'new'} → {entry.to_status}<div className="text-gray-500">{new Date(entry.occurred_at).toLocaleString()} · {entry.actor_role}</div></li>)}</ol>
          </>}
        </div>
      </div>
    </div>
  );
}
