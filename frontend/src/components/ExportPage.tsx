import { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { api } from '../api';

export default function ExportPage() {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastBytes, setLastBytes] = useState<number | null>(null);

  const download = async () => {
    setDownloading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(api.exportFieldsCsvUrl(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error(`Export failed: ${res.status}`);
      }
      const blob = await res.blob();
      setLastBytes(blob.size);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fields-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message || 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center">
          <Download className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Export Fields (CSV)</h2>
          <p className="text-gray-500 text-sm mt-0.5">Download a CSV snapshot of all fields under management.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-xl">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-6 h-6 text-gray-500" />
          <div>
            <div className="font-semibold text-gray-900">fields.csv</div>
            <div className="text-xs text-gray-500">Includes id, name, location, crop_type, hectares, status, soil_type, last_scan_at, health_score, created_at.</div>
          </div>
        </div>

        <button
          onClick={download}
          disabled={downloading}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
        >
          <Download className="w-4 h-4" />
          {downloading ? 'Downloading...' : 'Download CSV'}
        </button>

        {lastBytes !== null && !error && (
          <div className="mt-4 text-sm text-green-700">
            Last download: {lastBytes} bytes.
          </div>
        )}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
