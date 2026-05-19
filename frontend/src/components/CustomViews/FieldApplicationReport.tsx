import { useState } from 'react';
import { FileSpreadsheet, Download } from 'lucide-react';

export default function FieldApplicationReport() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>('');
  const [lastBytes, setLastBytes] = useState<number | null>(null);
  const [preview, setPreview] = useState<string[][] | null>(null);

  const download = async () => {
    setBusy(true);
    setErr('');
    try {
      const r = await fetch('/api/custom-views/spray-log.csv', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const text = await r.text();
      setLastBytes(text.length);
      // Build preview from first 6 rows
      const lines = text.split(/\r?\n/).slice(0, 6);
      setPreview(lines.map(l => l.split(',')));
      // Trigger browser download
      const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'spray_log.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 500);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5" data-testid="spray-log-csv-export">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
          <h3 className="font-semibold text-gray-900">Spray Log CSV Export</h3>
        </div>
        <button
          onClick={download}
          disabled={busy}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {busy ? 'Generating...' : 'Download CSV'}
        </button>
      </div>

      <p className="text-xs text-gray-600 mb-3">
        Export structured spray-application log: date, field, crop, target pest, product,
        rate (ml/ha), application method, operator, weather, and status.
      </p>

      {err && <div className="text-xs text-red-600 mb-2">Error: {err}</div>}

      {lastBytes !== null && (
        <div className="text-xs text-emerald-700 bg-emerald-50 rounded px-3 py-2 mb-3">
          Generated {lastBytes.toLocaleString()} bytes — file: <code>spray_log.csv</code>
        </div>
      )}

      {preview && (
        <div className="overflow-x-auto border border-gray-200 rounded">
          <table className="w-full text-[11px]">
            <tbody>
              {preview.map((row, i) => (
                <tr key={i} className={i === 0 ? 'bg-gray-100 font-semibold text-gray-700' : 'border-t border-gray-100'}>
                  {row.map((cell, j) => (
                    <td key={j} className="px-2 py-1 whitespace-nowrap text-gray-600">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
