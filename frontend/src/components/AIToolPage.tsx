import { useState } from 'react';
import { Sparkles, AlertTriangle } from 'lucide-react';
import AIResponse from './AIResponse';

interface FieldSpec {
  key: string;
  label: string;
  type: string;
  placeholder?: string;
  textarea?: boolean;
}

export interface SampleSpec {
  label: string;
  values: Record<string, string>;
}

interface AIToolPageProps {
  title: string;
  description: string;
  icon: React.ElementType;
  iconColor?: string;
  fields: FieldSpec[];
  buildPayload: (values: Record<string, string>) => any;
  callApi: (payload: any) => Promise<{ result: string }>;
  samples?: SampleSpec[];
}

export default function AIToolPage({
  title,
  description,
  icon: Icon,
  iconColor = 'bg-violet-100 text-violet-600',
  fields,
  buildPayload,
  callApi,
  samples,
}: AIToolPageProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  const setField = (k: string, v: string) => setValues(prev => ({ ...prev, [k]: v }));

  const run = async () => {
    setLoading(true);
    setResult('');
    setError(null);
    setUnavailable(false);
    try {
      const payload = buildPayload(values);
      const res = await callApi(payload);
      setResult(res.result || '');
    } catch (e: any) {
      const msg = e.message || 'Request failed';
      if (/AI service unavailable|OPENROUTER_API_KEY/i.test(msg)) {
        setUnavailable(true);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <p className="text-gray-500 text-sm mt-0.5">{description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Inputs</h3>
          {samples && samples.length > 0 && (
            <div className="mb-4">
              <div className="text-xs font-medium text-gray-600 mb-2">Try a sample:</div>
              <div className="flex flex-wrap gap-2">
                {samples.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setValues(s.values)}
                    className="px-3 py-1.5 text-xs bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 rounded-full transition-colors"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-3 mb-4">
            {fields.map(f => (
              <div key={f.key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                {f.textarea ? (
                  <textarea
                    value={values[f.key] || ''}
                    onChange={e => setField(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                  />
                ) : (
                  <input
                    type={f.type}
                    value={values[f.key] || ''}
                    onChange={e => setField(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                  />
                )}
              </div>
            ))}
          </div>
          <button
            onClick={run}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium text-sm transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            {loading ? 'Generating...' : 'Generate Analysis'}
          </button>

          {unavailable && (
            <div className="mt-4 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <strong>AI service unavailable (503).</strong> The server has no <code className="px-1 bg-amber-100 rounded">OPENROUTER_API_KEY</code> configured. Set it in the backend <code className="px-1 bg-amber-100 rounded">.env</code> and restart.
              </div>
            </div>
          )}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div>
          {(loading || result) && (
            <AIResponse
              content={result}
              title={title}
              isLoading={loading}
              onRegenerate={run}
            />
          )}
          {!loading && !result && !unavailable && !error && (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center text-gray-400 text-sm">
              Output will appear here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
